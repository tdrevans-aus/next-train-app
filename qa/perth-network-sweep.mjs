/**
 * D6 live Perth network sweep (every line-map station).
 * Anomaly report, not a CI gate. Transperth LiveTimes XML, not GTFS.
 * Keep out of run-all. City stays live.
 * Flags: time, day, station, limit. Windows am-peak 6-9, midday 9-15, pm-peak 15-19, late 19-26 AWST.
 * Refuse am-peak plus weekday unless Perth clock is weekday 06:00-09:00.
 * Report: qa/reports/perth-sweep-<timestamp>.json
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive } from "../lib/providers/registry.js";
import { fetchStationBoard, isPerthCluster } from "../lib/providers/perth.js";
import { staticDirectionsForStation, getPerthLineMap, getShortTurnGroups } from "../lib/cities/perth/static-directions.js";
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PERTH_TIME_ZONE = "Australia/Perth";
const S5_TOLERANCE_SEC = 120;
const STATION_DELAY_MS = 280;
const TIME_WINDOWS = { "am-peak": { start: 6 * 60, end: 9 * 60 }, midday: { start: 9 * 60, end: 15 * 60 }, "pm-peak": { start: 15 * 60, end: 19 * 60 }, late: { start: 19 * 60, end: 26 * 60 } };
function loadJson(rel) { return JSON.parse(readFileSync(join(ROOT, rel), "utf8")); }
function parseArgs(argv) { const out = { time: null, day: null, station: null, limit: null }; for (const arg of argv) { if (arg.startsWith("--time=")) out.time = arg.slice(7); else if (arg.startsWith("--day=")) out.day = arg.slice(6); else if (arg.startsWith("--station=")) out.station = arg.slice(10); else if (arg.startsWith("--limit=")) out.limit = Number(arg.slice(8)); } if (out.time && !TIME_WINDOWS[out.time]) throw new Error("--time must be am-peak|midday|pm-peak|late"); if (out.day && !["weekday", "sat", "sun"].includes(out.day)) throw new Error("--day must be weekday|sat|sun"); return out; }
function normalizeKey(value) { return String(value || "").trim().toLowerCase().replace(/\s+station$/i, "").replace(/\s+stn$/i, ""); }
function perthParts(date) { const dtf = new Intl.DateTimeFormat("en-AU", { timeZone: PERTH_TIME_ZONE, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit" }); const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value])); const weekday = parts.weekday; const dayType = weekday === "Sat" ? "sat" : weekday === "Sun" ? "sun" : "weekday"; const minutes = Number(parts.hour) * 60 + Number(parts.minute); return { dayType, minutes, weekday, clock: parts.hour + ":" + parts.minute }; }
function inWindow(minutes, first, last) { if (first == null || last == null) return false; if (last >= first) return minutes >= first && minutes <= last; return minutes >= first || minutes <= last; }
function actualTimeBucket(minutes) { for (const [name, window] of Object.entries(TIME_WINDOWS)) { if (inWindow(minutes, window.start, window.end)) return name; } return "overnight"; }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function listLineMapStations(lineMap) { const seen = new Set(); const stations = []; for (const line of lineMap.lines ?? []) { for (const name of line.stations ?? []) { const key = normalizeKey(name); if (!key || seen.has(key)) continue; seen.add(key); stations.push({ name, key }); } } return stations; }
function linesServingStation(lineMap, stationKey) { return (lineMap.lines ?? []).filter((line) => (line.stations ?? []).some((name) => normalizeKey(name) === stationKey)); }
function knownDestinationsForStation(lineMap, stationName) { const stationKey = normalizeKey(stationName); const names = new Set(); for (const dest of staticDirectionsForStation(stationName)) names.add(normalizeKey(dest)); const groups = getShortTurnGroups(); for (const [canonical, members] of Object.entries(groups)) { if (names.has(normalizeKey(canonical))) { for (const member of members ?? []) names.add(normalizeKey(member)); } if ((members ?? []).some((m) => normalizeKey(m) === stationKey)) { names.add(normalizeKey(canonical)); for (const member of members ?? []) names.add(normalizeKey(member)); } } for (const line of linesServingStation(lineMap, stationKey)) { for (const terminus of line.termini ?? []) names.add(normalizeKey(terminus)); for (const station of line.stations ?? []) names.add(normalizeKey(station)); } names.add("perth"); names.add("perth underground"); return names; }
function destinationMatchesKnown(destKey, known) { if (!destKey) return true; if (known.has(destKey)) return true; for (const name of known) { if (destKey.includes(name) || name.includes(destKey)) return true; } return false; }
function mapDestToTermini(destKey, terminiKeys) { return terminiKeys.filter((key) => destKey.includes(key) || key.includes(destKey)); }
function isThroughStation(lineMap, stationKey) { let onAny = false; let intermediate = false; for (const line of lineMap.lines ?? []) { const stations = (line.stations ?? []).map(normalizeKey); if (!stations.includes(stationKey)) continue; onAny = true; const termini = new Set((line.termini ?? []).map(normalizeKey)); if (!termini.has(stationKey) && stationKey !== "perth" && stationKey !== "perth underground") intermediate = true; } if (stationKey === "perth" || stationKey === "perth underground") return false; return onAny && intermediate; }
function platformLooksWeird(platform) { const raw = String(platform ?? "").trim(); if (!raw) return true; if (/^(n\/a|na|unknown|-)$/i.test(raw)) return true; if (!/^[0-9]{1,2}[A-Za-z]?$/.test(raw)) return true; return false; }
function mainSummary(anomalies) { const counts = {}; for (const row of anomalies) counts[row.check] = (counts[row.check] ?? 0) + 1; return counts; }
function listUniqueStations(lineMap, args) { let stations = listLineMapStations(lineMap); if (args.station) { const needle = normalizeKey(args.station); stations = stations.filter((s) => s.key === needle); if (stations.length === 0) throw new Error("Unknown line-map station: " + args.station); } if (args.limit) stations = stations.slice(0, args.limit); return stations; }
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = new Date();
  const clock = perthParts(now);
  const dayType = args.day ?? clock.dayType;
  const timeBucket = args.time ?? actualTimeBucket(clock.minutes);
  const actualBucket = actualTimeBucket(clock.minutes);
  const flagsMatchClock = dayType === clock.dayType && (!args.time || args.time === actualBucket);
  if (args.time === "am-peak" && args.day === "weekday" && !flagsMatchClock) {
    console.error("perth-network-sweep: refused --time=am-peak --day=weekday. Australia/Perth is now " + clock.weekday + " " + clock.clock + " (" + actualBucket + "). Sunday late is not weekday peak. Use --time=late --day=sun tonight.");
    process.exit(1);
  }
  if ((args.day || args.time) && !flagsMatchClock) {
    console.warn("perth-network-sweep: flags do not match Perth now (" + clock.weekday + " " + clock.clock + ", " + actualBucket + "). Commit gate is a real weekday am-peak run.");
  }
  const liveGate = assertCityLive("perth");
  if (!liveGate || liveGate.ok !== true) {
    throw new Error("assertCityLive(perth) must succeed — perth is the working city for testers");
  }
  const lineMap = getPerthLineMap();
  const stations = listUniqueStations(lineMap, args);
  console.log("perth-network-sweep: " + stations.length + " stations via LiveTimes (delay " + STATION_DELAY_MS + "ms)");
  const anomalies = [];
  const stationRows = [];
  let clusterBoard = null;
  let fetchedCount = 0;
  for (let i = 0; i < stations.length; i += 1) {
    const station = stations[i];
    const serving = linesServingStation(lineMap, station.key);
    const known = knownDestinationsForStation(lineMap, station.name);
    const terminiKeys = [...new Set(serving.flatMap((line) => (line.termini ?? []).map(normalizeKey)))];
    const through = isThroughStation(lineMap, station.key);
    const inHours = actualBucket !== "overnight";
    let board; let fetchError = null;
    if (isPerthCluster(station.name) && clusterBoard) { board = clusterBoard; }
    else {
      if (fetchedCount > 0) await sleep(STATION_DELAY_MS);
      try { board = await fetchStationBoard(station.name); fetchedCount += 1; if (isPerthCluster(station.name)) clusterBoard = board; }
      catch (error) { fetchError = error; fetchedCount += 1; }
    }
    if (fetchError) {
      anomalies.push({ check: "S1", station: station.name, detail: "fetch fail: " + (fetchError && fetchError.message ? fetchError.message : fetchError) });
      stationRows.push({ station: station.name, tripCount: 0, destinations: [], through, inPublishedHours: inHours, fetchFailed: true, clustered: isPerthCluster(station.name) });
      continue;
    }
    const trips = board.trips ?? [];
    const destinations = [...new Set(trips.map((t) => t.destination).filter(Boolean))];
    const unknown = destinations.filter((dest) => { const destKey = normalizeKey(dest); if (destKey === station.key) return false; return !destinationMatchesKnown(destKey, known); });
    for (const dest of unknown) anomalies.push({ check: "S3", station: station.name, detail: "destination " + JSON.stringify(dest) + " does not match staticDirectionsForStation / short-turns / serving line" });
    if (through && trips.length > 0 && terminiKeys.length >= 2) { const matchedTermini = new Set(); for (const dest of destinations) { for (const terminus of mapDestToTermini(normalizeKey(dest), terminiKeys)) matchedTermini.add(terminus); } if (matchedTermini.size < 2) anomalies.push({ check: "S2", station: station.name, detail: "through station only matched " + matchedTermini.size + " terminus direction(s): " + (destinations.join("; ") || "-") }); }
    const seenPlatKeys = new Set(); const weird = []; const dupes = [];
    for (const trip of trips) { if (platformLooksWeird(trip.platform)) weird.push(String(trip.platform ?? "")); const platKey = [normalizeKey(trip.destination), trip.liveDeparture, String(trip.platform ?? "").trim()].join("|"); if (seenPlatKeys.has(platKey)) dupes.push(platKey); seenPlatKeys.add(platKey); }
    if (weird.length || dupes.length) { const bits = []; if (weird.length) bits.push("weird platforms: " + [...new Set(weird)].join(", ")); if (dupes.length) bits.push(dupes.length + " duplicate dest+time+platform rows"); anomalies.push({ check: "S4", station: station.name, detail: bits.join("; ") }); }
    let stale = 0; for (const trip of trips) { if (!trip.liveDeparture) continue; const liveMs = new Date(trip.liveDeparture).getTime(); if (Number.isFinite(liveMs) && liveMs < now.getTime() - S5_TOLERANCE_SEC * 1000) stale += 1; }
    if (stale > 0) anomalies.push({ check: "S5", station: station.name, detail: stale + " live departure(s) already past now by >" + S5_TOLERANCE_SEC + "s" });
    const windowOk = args.time ? timeBucket === args.time && inHours : inHours;
    if (windowOk && trips.length === 0) anomalies.push({ check: "S6", station: station.name, detail: "empty LiveTimes board in service hours (" + dayType + " " + clock.clock + ", window " + timeBucket + ")" });
    stationRows.push({ station: station.name, tripCount: trips.length, destinations, through, inPublishedHours: inHours, clustered: isPerthCluster(station.name), lastUpdate: board.lastUpdate ?? null });
  }
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const reportDir = join(ROOT, "qa", "reports");
  mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, "perth-sweep-" + timestamp + ".json");
  const report = { generatedAt: now.toISOString(), timeZone: PERTH_TIME_ZONE, feed: "Transperth LiveTimes XML (not GTFS)", dayType, requestedDay: args.day, actualDayType: clock.dayType, time: timeBucket, requestedTime: args.time, actualClock: clock.clock, commitGate: { required: "--time=am-peak --day=weekday on a real weekday morning 06:00-09:00 Australia/Perth", flagsMatchClock, refusedIfMismatchedAmPeakWeekday: true }, cityStatus: liveGate.city && liveGate.city.status ? liveGate.city.status : "live", assertCityLiveOk: liveGate.ok === true, stationCount: stations.length, liveFetches: fetchedCount, anomalyCounts: mainSummary(anomalies), anomalies, stations: stationRows };
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log("perth-network-sweep: " + stations.length + " stations, " + anomalies.length + " anomalies");
  console.log("  day=" + dayType + " time=" + timeBucket + " clock=" + clock.clock + " " + PERTH_TIME_ZONE);
  console.log("  city gate: " + report.cityStatus + " (live — expected succeed)");
  const counts = report.anomalyCounts;
  for (const check of ["S1", "S2", "S3", "S4", "S5", "S6"]) console.log("  " + check + ": " + (counts[check] ?? 0));
  for (const row of anomalies.slice(0, 40)) console.log("  - " + row.check + " " + row.station + ": " + row.detail);
  if (anomalies.length > 40) console.log("  … " + (anomalies.length - 40) + " more (see report)");
  console.log("  report: " + reportPath);
  if (!flagsMatchClock) console.log("  commit gate: not satisfied (run weekday am-peak on a real Monday-Friday morning)");
}
main().catch((error) => { console.error(error); process.exit(1); });
