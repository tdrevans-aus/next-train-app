/**
 * Edinburgh Trams (T50) wiring gate — offline, no key, no network.
 * docs/jim-brief-edinburgh-trams-wire.md; D1 pack docs/edinburgh-trams-d1/.
 *
 * Edinburgh is LIVE for National Rail; the tram mode ships wired but switched
 * OFF (`tramsLive: false` on the edinburgh registry entry) until Mark's flip PR.
 * This gate proves three things:
 *
 *  1. SWITCH OFF = BYTE-IDENTICAL. Every rider-reachable Edinburgh surface
 *     (/api/city-stations, /api/country-stations, /api/cities, /api/board and
 *     /api/directions for every tram-only stop, Near me around every tram stop,
 *     the UK region catalog, the dogfood list, public/city-directions) hashes
 *     to the golden captured from unmodified master
 *     (qa/fixtures/edinburgh-trams-switch-off.golden.json, produced by
 *     qa/lib/edinburgh-trams-surface.mjs before any tram edit).
 *  2. The pure parsing/time rules: UTC "HH:MM" -> Europe/London in BST and GMT,
 *     midnight rollover, null and schedule-echo predictions dropped.
 *  3. With the switch ON (child process, stubbed fetch — qa/lib/
 *     edinburgh-trams-on-state.mjs): 23 stops, York Place absent, Edinburgh Park
 *     Station real coordinates, single-object StopEvents, typed missing-key and
 *     FeedUnavailableError paths, no self-terminus chip, honest empty state.
 *
 * Usage: node qa/edinburgh-trams-planned-gate.mjs
 */
import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getCity } from "../lib/providers/registry.js";
import { isEdinburghTramsLive } from "../lib/cities/edinburgh/trams-switch.js";
import { resolveBareUtcClock, formatLondonClock, liveDepartureMs } from "../lib/cities/edinburgh/trams-time.js";
import { parseStopEventsBody, tripsFromStopEvents } from "../lib/providers/edinburgh-trams.js";
import { captureEdinburghSurface } from "./lib/edinburgh-trams-surface.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
const read = (...parts) => readFileSync(join(ROOT, ...parts), "utf8");

// --- 1. the switch is off, and Edinburgh is still live ----------------------
const entry = getCity("edinburgh");
assert(entry?.status === "live", "edinburgh must stay live (National Rail slice)");
assert(entry.tramsLive === false, "registry edinburgh.tramsLive must be exactly false until Mark's flip PR");
assert(isEdinburghTramsLive() === false, "isEdinburghTramsLive() must be false while the registry switch is off");
assert((entry.envKeys ?? []).includes("EDINBURGH_BUSTRACKER_KEY"), "edinburgh must declare EDINBURGH_BUSTRACKER_KEY as an envKey");

// --- 2. switch off => byte-identical to master ------------------------------
const golden = JSON.parse(read("qa", "fixtures", "edinburgh-trams-switch-off.golden.json")).surface;
const surface = await captureEdinburghSurface();
const goldenKeys = Object.keys(golden);
assert(goldenKeys.length >= 70, `golden must cover the full Edinburgh surface, has ${goldenKeys.length} entries`);
for (const key of new Set([...goldenKeys, ...Object.keys(surface)])) {
  assert(surface[key] !== undefined, `switch-off surface lost "${key}" (it was captured from master)`);
  assert(golden[key] !== undefined, `switch-off surface gained "${key}" that master did not have`);
  assert(surface[key] === golden[key], `switch OFF must be byte-identical to master, but "${key}" changed`);
}
// stations.json itself is untouched: 22 tram stops, all liveFeed:false, none for York Place or an Edinburgh Park Station.
const stops = JSON.parse(read("lib", "cities", "edinburgh", "stations.json")).stops;
const tramRows = stops.filter((s) => s.mode === "metro");
assert(tramRows.length === 22 && tramRows.every((s) => s.liveFeed === false), "stations.json must still carry the 22 tram rows, all liveFeed:false (the 23rd stop arrives via the overlay)");
assert(!stops.some((s) => /york place|edinburgh park station/i.test(s.name)), "stations.json must carry neither York Place nor the overlay-only Edinburgh Park Station");

// --- 3. time handling -------------------------------------------------------
const ref = Date.parse("2026-10-24T09:37:24Z"); // BST in force
assert(new Date(resolveBareUtcClock("09:40", ref)).toISOString() === "2026-10-24T09:40:00.000Z", "bare HH:MM must be parsed as UTC");
assert(formatLondonClock(Date.parse("2026-10-24T09:47:00Z")) === "10:47", "UTC 09:47 on 24 Oct 2026 is 10:47 London (BST)");
assert(formatLondonClock(Date.parse("2026-10-25T00:30:00Z")) === "01:30", "UTC 00:30 on 25 Oct 2026 is still BST (01:30)");
assert(formatLondonClock(Date.parse("2026-10-25T01:30:00Z")) === "01:30", "UTC 01:30 on 25 Oct 2026 is GMT (01:30) after the 02:00 BST change");
assert(formatLondonClock(Date.parse("2026-11-02T09:05:00Z")) === "09:05", "GMT: UTC equals London clock");
assert(formatLondonClock(Date.parse("2027-03-28T01:30:00Z")) === "02:30", "UTC 01:30 on 28 Mar 2027 is BST (02:30)");
// midnight rollover
const late = Date.parse("2026-10-24T23:50:00Z");
assert(new Date(resolveBareUtcClock("00:05", late)).toISOString() === "2026-10-25T00:05:00.000Z", "a clock just after UTC midnight must roll to the next day");
const early = Date.parse("2026-10-25T00:02:00Z");
assert(new Date(resolveBareUtcClock("23:58", early)).toISOString() === "2026-10-24T23:58:00.000Z", "a clock just before UTC midnight, seen after it, must stay on the previous day");
assert(resolveBareUtcClock("25:00", ref) === null && resolveBareUtcClock("nope", ref) === null && resolveBareUtcClock(null, ref) === null, "malformed clocks must not resolve");
// live-value policy
const ev = (sched, pred, extra = {}) => ({ scheduledeparturetime: sched, departuretime: pred, arrivaltime: pred, ...extra });
assert(liveDepartureMs(ev("09:40", null), ref) === null, "a null prediction is no live data and must be dropped");
assert(liveDepartureMs(ev("09:40", undefined), ref) === null, "a missing prediction must be dropped");
assert(liveDepartureMs(ev("09:55", "09:55"), ref) === null, "pred == sched is indistinguishable from a schedule echo and must be dropped (G2)");
assert(liveDepartureMs(ev("09:51", "09:58"), ref) === Date.parse("2026-10-24T09:58:00Z"), "a differing HH:MM prediction is live and read as UTC");
assert(liveDepartureMs(ev("09:47", 608), ref) === ref + 608_000, "a numeric departuretime is a countdown in seconds from the response time");

// --- 4. single-object StopEvents -------------------------------------------
const single = { time: "2026-10-24T09:37:24Z", atcocode: "9400ZZEDHAY1", events: [ev("09:47", 608, { destination: "Newhaven" })] };
assert(parseStopEventsBody(single).events.length === 1, "StopEvents is ONE object (not an array) and must parse as such");
assert(parseStopEventsBody({ time: "2026-10-24T09:37:24Z" }).events.length === 0, "a closed stop (York Place) answers with no `events` and must parse to an empty list");
let threw = null;
try {
  parseStopEventsBody("nope");
} catch (error) {
  threw = error;
}
assert(threw?.name === "FeedUnavailableError", "a wrong-shaped StopEvents body must be a FeedUnavailableError");
const trips = tripsFromStopEvents(parseStopEventsBody(single), { stopName: "Haymarket", platform: "1" });
assert(trips.length === 1 && trips[0].displayTime === "10:47" && trips[0].destination === "T50 towards Newhaven", "countdown 608 s at 09:37:24Z must show 10:47 BST towards Newhaven");
assert(
  tripsFromStopEvents(
    parseStopEventsBody({ time: "2026-10-24T09:37:24Z", events: [ev("09:47", 608, { destination: "Newhaven" })] }),
    { stopName: "Newhaven", platform: "2" }
  ).length === 0,
  "no chip towards the stop itself"
);

// --- 5. D1 pack data: 23 stops, York Place out, real coordinates ------------
const overlay = JSON.parse(read("lib", "cities", "edinburgh", "trams-api.json"));
assert(overlay.stops.length === 23, `overlay must carry exactly 23 stops, got ${overlay.stops.length}`);
assert(!overlay.stops.some((s) => /york place|depot/i.test(`${s.name} ${s.parentCode}`)), "York Place and the depot must be absent from the overlay");
assert(!/9400ZZEDYOR/.test(JSON.stringify(overlay)), "no York Place API id may appear in the overlay");
const published = JSON.parse(read("docs", "edinburgh-trams-d1", "published-network.json"));
assert(
  JSON.stringify(overlay.stops.map((s) => s.name)) === JSON.stringify(published.lines[0].stations),
  "overlay stop order/names must equal the D1 pack's official 23-stop list"
);
assert(!published.stops.some((s) => /york place/i.test(s.name)), "D1 pack must not list York Place as a stop");
const added = overlay.addedStop;
assert(added.name === "Edinburgh Park Station" && added.catalogId === "tram:edinburgh-park-station", "the added 23rd stop must be Edinburgh Park Station");
assert(Number.isFinite(added.lat) && Number.isFinite(added.lng) && added.lat > 55.92 && added.lat < 55.94 && added.lng < -3.29 && added.lng > -3.33, `Edinburgh Park Station coordinates must be real and in Edinburgh Park, got ${added.lat},${added.lng}`);
assert(/NaPTAN/.test(added.coordSource) && /GetFilteredStops/.test(added.coordSource), "Edinburgh Park Station coordinates must cite their source");
for (const s of overlay.stops) {
  assert(s.towardsNewhaven || s.towardsAirport, `${s.name} must have at least one platform id`);
  assert(s.terminus !== "west" || (!s.towardsAirport && s.towardsNewhaven), "the west terminus departs on platform 1 only");
  assert(s.terminus !== "east" || (!s.towardsNewhaven && s.towardsAirport), "the east terminus departs on platform 2 only");
}

// --- 6. docs: G1 closed with Tim's quote, ledger rows updated ---------------
const hazard = read("docs", "edinburgh-trams-d1", "hazard-pack.md");
assert(
  /\| G1 \|[^\n]*24 Oct 2026[^\n]*Get jim to build it and I'm assuming we can use it\./.test(hazard),
  "hazard-pack G1 row must record Tim's 24 Oct 2026 decision with his quote"
);
const ledger = read("docs", "united-kingdom-ledger.md");
assert(
  (ledger.match(/API found 24 Oct 2026; wired, not live/g) ?? []).length >= 3,
  "the ledger's three Edinburgh Trams rows must read 'API found 24 Oct 2026; wired, not live'"
);
assert(!/no confirmed real-time successor \(TfE/.test(ledger) && !/\| Edinburgh Trams publishing a feed/.test(ledger), "stale 'no confirmed real-time' Edinburgh Trams wording must be gone from the ledger");
assert(/oracle-clash-report\.md/.test(ledger.slice(ledger.indexOf("| Edinburgh | Trams (T50)"), ledger.indexOf("| Edinburgh | Trams (T50)") + 900)), "the ledger's Edinburgh Trams row must cite the oracle report");

// --- 7. no credential in the repo -------------------------------------------
for (const file of [
  ["lib", "providers", "edinburgh-trams.js"],
  ["lib", "cities", "edinburgh", "trams-api.json"],
  ["qa", "lib", "edinburgh-trams-on-state.mjs"],
  ["docs", "edinburgh-trams-d1", "jim-handoff.md"],
]) {
  assert(!/\b[0-9a-f]{32}\b/i.test(read(...file)), `${file.join("/")} must not contain a 32-hex credential`);
}

// --- 8. switch ON, offline (child process, stubbed fetch) -------------------
const child = spawnSync(process.execPath, [join(ROOT, "qa", "lib", "edinburgh-trams-on-state.mjs")], {
  encoding: "utf8",
  env: { ...process.env, EDINBURGH_BUSTRACKER_KEY: "" },
  timeout: 120_000,
});
assert(child.status === 0, `switch-ON child process failed (exit ${child.status}): ${child.stderr?.slice(-1500)}`);
const lastLine = child.stdout.trim().split("\n").pop();
const { results } = JSON.parse(lastLine);
assert(results.length >= 40, `expected the switch-ON child to run its full check list, got ${results.length}`);
const failed = results.filter((r) => !r.ok);
assert(failed.length === 0, `switch-ON checks failed:\n${failed.map((r) => `  - ${r.name}: ${r.detail}`).join("\n")}`);

console.log(
  `edinburgh-trams-planned-gate: ok (tramsLive off, status live; ${goldenKeys.length} rider surfaces byte-identical to master; ` +
    `UTC->London BST/GMT + midnight rollover; null/echo predictions dropped; single-object StopEvents; 23 stops, York Place absent, ` +
    `Edinburgh Park Station coordinates cited; ${results.length} switch-ON checks passed offline; G1 + ledger recorded)`
);
