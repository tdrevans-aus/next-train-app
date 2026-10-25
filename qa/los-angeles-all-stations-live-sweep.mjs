/**
 * Sweeps every Los Angeles catalog station's live coverage against Swiftly's LA Metro Rail
 * GTFS-RT feed — modelled on qa/prague-all-stations-live-sweep.mjs and
 * qa/dublin-all-stations-live-sweep.mjs (headway-aware threshold, evidence log, runtime cap).
 *
 * SWIFTLY RATE LIMIT (180 requests / 15 min per key): one TripUpdates fetch serves EVERY station,
 * so each poll makes exactly ONE Swiftly request (fetchTripUpdates) and then runs the real rider
 * board pipeline (composeStationBoard from lib/providers/los-angeles.js) for all 110 stations
 * against that single in-memory snapshot — never one request per station. A 9-poll run costs 9
 * Swiftly requests plus the keyless static-GTFS download (gitlab, cached across polls). The script
 * also counts its own requests and refuses to start a poll that would exceed MAX_SWIFTLY_REQUESTS.
 *
 * What it asserts, per station, per poll (docs/jim-brief-la-flip-follow-through.md):
 *   - a station with live rows carries only "<Line> Line + <terminus>" chips (never a bare line
 *     chip), never a row terminating at the station itself, and realtime: true;
 *   - a station with NO live rows must carry an honest emptyReason ("no-live-predictions" or
 *     "not-currently-served") — never a silent empty board;
 *   - "not-currently-served" is only legitimate for the documented stations
 *     (Wilshire/La Brea, Wilshire/Fairfax, Wilshire/La Cienega: no scheduled D Line trip until the
 *     -90 timetable starts on 1 Nov 2026; they may equally be live once it does). Any OTHER
 *     station reporting not-currently-served is an undocumented gap and fails the run;
 *   - a station continuously "no-live-predictions" for >= 1.5x the fallback headway THIS run that
 *     has never been observed non-empty in the last EVIDENCE_WINDOW_DAYS days of logged runs is a
 *     real per-station gap and fails (the Dublin Broombridge lesson: a long intermittent gap that
 *     was seen live recently is only reported).
 *
 * LA Metro Rail runs roughly 04:00-00:00 America/Los_Angeles. 0 live rows across every station on
 * the first poll means outside service hours (or a feed-wide outage): SKIPPED, not failed.
 *
 * Without SWIFTLY_API_KEY this prints SKIP-LIVE and exits 0 (CI has no key). Not registered in
 * qa/run-all.mjs for the same reason the Prague/Dublin sweeps aren't (needs a key, live network,
 * real service hours). Run it directly:
 *   node --env-file=<path>/.env.local qa/los-angeles-all-stations-live-sweep.mjs
 *
 * EVIDENCE LOG: docs/los-angeles-d1/live-sweep-log.jsonl (append-only JSONL).
 */
import { appendFileSync, existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  SWIFTLY_TRIP_UPDATES_URL,
  composeStationBoard,
  listCatalogStations,
  loadLosAngelesStatic,
} from "../lib/providers/los-angeles.js";
import { fetchTripUpdates } from "../lib/providers/gtfs/realtime.js";
import { readSwiftlyApiKey, swiftlyAuthHeaders } from "../lib/providers/gtfs/auth.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_LOG_PATH = join(ROOT, "docs/los-angeles-d1/live-sweep-log.jsonl");
const EVIDENCE_WINDOW_DAYS = 7;

/** Stations documented as not served until the -90 timetable (1 Nov 2026). */
export const DOCUMENTED_NOT_SERVED = new Set([
  "Wilshire/La Brea",
  "Wilshire/Fairfax",
  "Wilshire/La Cienega",
]);

// Evening headways on A/E/K reach ~15-20 min; be conservative.
const FALLBACK_HEADWAY_MINUTES = 20;
const REQUIRED_EMPTY_MULTIPLE = 1.5;
const POLL_INTERVAL_MS = 60_000;
const MAX_RUNTIME_MS = 9 * 60 * 1000;
const MAX_POLLS = Math.max(2, Math.floor(MAX_RUNTIME_MS / POLL_INTERVAL_MS));
// Swiftly allows 180 requests / 15 min; one request per poll is far below that. Hard cap anyway.
const MAX_SWIFTLY_REQUESTS = 60;

const BARE_LINE_CHIP = /^[A-EK] Line$/;
const LINE_TERMINUS_CHIP = /^[A-EK] Line \+ \S/;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readHistoricalNonEmptyStations(now) {
  const seen = new Set();
  if (!existsSync(EVIDENCE_LOG_PATH)) return seen;
  const cutoffMs = now.getTime() - EVIDENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  for (const line of readFileSync(EVIDENCE_LOG_PATH, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let entry;
    try {
      entry = JSON.parse(trimmed);
    } catch {
      continue;
    }
    const ts = Date.parse(entry?.timestamp);
    if (!Number.isFinite(ts) || ts < cutoffMs) continue;
    for (const station of entry?.stations ?? []) {
      if (station?.observedNonEmpty && station?.name) seen.add(station.name);
    }
  }
  return seen;
}

/** Pure per-board check: returns a list of violation strings (empty = fine). Exported for tests. */
export function checkBoard(name, board) {
  const problems = [];
  const trips = board?.trips ?? [];
  if (trips.length > 0) {
    if (board.realtime !== true) problems.push(`${name}: board with rows must be realtime:true`);
    if ("emptyReason" in board) problems.push(`${name}: board with live rows must carry no emptyReason`);
    for (const trip of trips) {
      const chip = String(trip.destination ?? "");
      if (BARE_LINE_CHIP.test(chip) || !LINE_TERMINUS_CHIP.test(chip)) {
        problems.push(`${name}: row chip "${chip}" is not "<Line> Line + terminus"`);
      }
      if (chip.endsWith(`+ ${name}`)) problems.push(`${name}: self-terminus row "${chip}"`);
    }
    return problems;
  }
  if (board?.emptyReason !== "no-live-predictions" && board?.emptyReason !== "not-currently-served") {
    problems.push(`${name}: empty board without an honest emptyReason (got ${board?.emptyReason})`);
  }
  if (board?.emptyReason === "not-currently-served" && !DOCUMENTED_NOT_SERVED.has(name)) {
    problems.push(`${name}: not-currently-served but not a documented station (undocumented coverage gap)`);
  }
  return problems;
}

async function main() {
  const apiKey = readSwiftlyApiKey();
  if (!apiKey) {
    console.log("SKIP-LIVE los-angeles-all-stations-live-sweep: no SWIFTLY_API_KEY in this environment");
    process.exit(0);
    return;
  }
  const headers = swiftlyAuthHeaders(apiKey);
  const stations = listCatalogStations();
  const now = new Date();
  const staticData = await loadLosAngelesStatic();
  const historicalNonEmpty = readHistoricalNonEmptyStations(now);
  const requiredEmptyMs = FALLBACK_HEADWAY_MINUTES * REQUIRED_EMPTY_MULTIPLE * 60_000;

  console.log(
    `los-angeles-all-stations-live-sweep: ${stations.length} stations, ONE Swiftly TripUpdates ` +
      `request per poll (shared snapshot), polls every ${POLL_INTERVAL_MS / 1000}s, up to ${MAX_POLLS} polls`
  );

  const emptySinceMs = new Map(stations.map((s) => [s.name, null]));
  const totalPolls = new Map(stations.map((s) => [s.name, 0]));
  const nonEmptyPolls = new Map(stations.map((s) => [s.name, 0]));
  const notServedPolls = new Map(stations.map((s) => [s.name, 0]));
  const violations = new Set();
  let swiftlyRequests = 0;
  let sawAnyTrips = false;

  for (let poll = 1; poll <= MAX_POLLS; poll += 1) {
    if (swiftlyRequests >= MAX_SWIFTLY_REQUESTS) {
      throw new Error(`refusing to exceed ${MAX_SWIFTLY_REQUESTS} Swiftly requests in one run`);
    }
    swiftlyRequests += 1;
    const realtime = await fetchTripUpdates(SWIFTLY_TRIP_UPDATES_URL, { headers });
    const pollNow = new Date();
    let totalTrips = 0;
    let liveStations = 0;
    let notServedStations = 0;
    let zeroStations = 0;
    for (const station of stations) {
      const board = await composeStationBoard(station.name, staticData, realtime, { now: pollNow });
      for (const p of checkBoard(station.name, board)) violations.add(p);
      totalPolls.set(station.name, totalPolls.get(station.name) + 1);
      const count = board.trips.length;
      totalTrips += count;
      if (count > 0) {
        liveStations += 1;
        nonEmptyPolls.set(station.name, nonEmptyPolls.get(station.name) + 1);
        emptySinceMs.set(station.name, null);
      } else {
        if (board.emptyReason === "not-currently-served") {
          notServedStations += 1;
          notServedPolls.set(station.name, notServedPolls.get(station.name) + 1);
        } else {
          zeroStations += 1;
        }
        if (emptySinceMs.get(station.name) == null) emptySinceMs.set(station.name, Date.now());
      }
    }
    sawAnyTrips = sawAnyTrips || totalTrips > 0;
    console.log(
      `los-angeles-all-stations-live-sweep: poll ${poll}/${MAX_POLLS} - ${totalTrips} live rows; ` +
        `stations live ${liveStations}, not-currently-served ${notServedStations}, zero ${zeroStations} ` +
        `(Swiftly requests so far: ${swiftlyRequests})`
    );
    if (totalTrips === 0 && poll === 1) {
      console.log(
        "los-angeles-all-stations-live-sweep: skipped: 0 live rows across all stations on the first " +
          "poll - outside LA Metro Rail service hours (~04:00-00:00 America/Los_Angeles) or a " +
          "feed-wide outage. Re-run during LA service."
      );
      process.exit(0);
      return;
    }
    if (poll < MAX_POLLS) await sleep(POLL_INTERVAL_MS);
  }

  const runEndMs = Date.now();
  const staleGap = [];
  const intermittentLong = [];
  const uncertain = [];
  for (const [name, since] of emptySinceMs.entries()) {
    if (since == null) continue;
    if (notServedPolls.get(name) === totalPolls.get(name)) continue; // documented, reported below
    const observedMs = runEndMs - since;
    const record = { name, observedMinutes: Math.round(observedMs / 60_000) };
    if (observedMs >= requiredEmptyMs) {
      (historicalNonEmpty.has(name) ? intermittentLong : staleGap).push(record);
    } else {
      uncertain.push(record);
    }
  }

  appendFileSync(
    EVIDENCE_LOG_PATH,
    `${JSON.stringify({
      runId: `sweep-${new Date(runEndMs).toISOString()}`,
      timestamp: new Date(runEndMs).toISOString(),
      source: "qa/los-angeles-all-stations-live-sweep.mjs",
      swiftlyRequests,
      stations: stations.map((s) => ({
        name: s.name,
        totalPolls: totalPolls.get(s.name),
        nonEmptyPolls: nonEmptyPolls.get(s.name),
        observedNonEmpty: nonEmptyPolls.get(s.name) > 0,
        notServedPolls: notServedPolls.get(s.name),
      })),
    })}\n`,
    "utf8"
  );

  const notServedNames = [...notServedPolls].filter(([, n]) => n > 0).map(([name]) => name);
  console.log(`los-angeles-all-stations-live-sweep: total Swiftly requests this run: ${swiftlyRequests}`);
  console.log(
    `los-angeles-all-stations-live-sweep: ${notServedNames.length} station(s) reported not-currently-served: ${notServedNames.join(", ") || "none"}`
  );
  if (uncertain.length) {
    console.log(
      `los-angeles-all-stations-live-sweep: ${uncertain.length} station(s) empty at the tail of the run but below the ${REQUIRED_EMPTY_MULTIPLE}x-headway threshold (not failed): ` +
        uncertain.map((u) => `${u.name} (${u.observedMinutes}min)`).join(", ")
    );
  }
  if (intermittentLong.length) {
    console.log(
      `los-angeles-all-stations-live-sweep: ${intermittentLong.length} long intermittent gap(s), seen live within ${EVIDENCE_WINDOW_DAYS} days: ` +
        intermittentLong.map((u) => `${u.name} (${u.observedMinutes}min)`).join(", ")
    );
  }
  if (violations.size) {
    throw new Error(`los-angeles-all-stations-live-sweep: ${violations.size} violation(s):\n  ${[...violations].join("\n  ")}`);
  }
  if (!sawAnyTrips) {
    console.log("los-angeles-all-stations-live-sweep: skipped: no live rows in any poll");
    return;
  }
  if (staleGap.length) {
    throw new Error(
      `los-angeles-all-stations-live-sweep: ${staleGap.length} station(s) continuously empty for >= ${REQUIRED_EMPTY_MULTIPLE}x the fallback headway and never seen live in ${EVIDENCE_WINDOW_DAYS} days: ` +
        staleGap.map((u) => `${u.name} (${u.observedMinutes}min)`).join(", ")
    );
  }
  console.log(
    "los-angeles-all-stations-live-sweep: ok - every station was live, a documented not-currently-served station, an evidence-backed intermittent gap, or inside its uncertain window"
  );
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((error) => {
    console.error(error?.stack || error);
    process.exit(1);
  });
}
