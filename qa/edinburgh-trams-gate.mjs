/**
 * Edinburgh Trams (T50) wiring gate — offline, no key, no network.
 * docs/jim-brief-edinburgh-trams-wire.md; D1 pack docs/edinburgh-trams-d1/.
 *
 * Edinburgh Trams went live on 25 Oct 2026 (`tramsLive: true` on the edinburgh registry entry). This gate
 * proves three things:
 *
 *  1. LIVE CONFIG. The switch is on, the city is live, the catalog carries exactly 20 tram rows live (22 rows
 *     in stations.json, liveFeed true; Haymarket, Edinburgh Gateway and Edinburgh Park Station withheld by the
 *     overlay), and the coverage text's station count equals the /api/city-stations count so it cannot drift.
 *     (The switch-off half and its 72-surface golden were retired at the flip; they no longer describe production.)

 *  2. The pure parsing/time rules: UTC "HH:MM" -> Europe/London in BST and GMT,
 *     midnight rollover, null and schedule-echo predictions dropped.
 *  3. With the switch ON (child process, stubbed fetch — qa/lib/
 *     edinburgh-trams-on-state.mjs): 20 tram stops (the shared-name Haymarket, Edinburgh
 *     Gateway and Edinburgh Park Station are withheld, with a coverage note), no tram name shadowed by a rail entry, York Place absent, Edinburgh Park
 *     Station real coordinates, single-object StopEvents, typed missing-key and
 *     FeedUnavailableError paths, no self-terminus chip, honest empty state.
 *
 * Usage: node qa/edinburgh-trams-gate.mjs
 */
import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getCity } from "../lib/providers/registry.js";
import { isEdinburghTramsLive } from "../lib/cities/edinburgh/trams-switch.js";
import { resolveBareUtcClock, formatLondonClock, liveDepartureMs } from "../lib/cities/edinburgh/trams-time.js";
import { parseStopEventsBody, tripsFromStopEvents } from "../lib/providers/edinburgh-trams.js";
import { listMultiCityStations } from "../lib/cities/live-city-api.js";

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
assert(entry.tramsLive === true, "registry edinburgh.tramsLive must be exactly true (flipped 25 Oct 2026)");
assert(isEdinburghTramsLive() === true, "isEdinburghTramsLive() must be true");
assert((entry.envKeys ?? []).includes("EDINBURGH_BUSTRACKER_KEY"), "edinburgh must declare EDINBURGH_BUSTRACKER_KEY as an envKey");

// --- 2. coverage text, and its station count tied to /api/city-stations -----
{
  const { default: coverageNotes } = await import("../api/coverage-notes.js");
  const res = { code: 0, body: null, setHeader() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, end() {} };
  await coverageNotes({ method: "GET", query: { city: "edinburgh" }, headers: { "x-forwarded-for": "10.77.0.1" } }, res);
  const fileNotes = JSON.parse(read("lib", "cities", "edinburgh", "coverage.json"));
  assert(res.code === 200 && JSON.stringify(res.body) === JSON.stringify({ region: "edinburgh", ...fileNotes }), "/api/coverage-notes?city=edinburgh must serve coverage.json byte-for-byte");
  assert(!existsSync(join(ROOT, "lib", "cities", "edinburgh", "coverage-trams.json")), "coverage-trams.json was folded into coverage.json at the flip and must not return");
  const on = fileNotes;
  assert(on.region === "edinburgh" && /^\d{4}-\d{2}-\d{2}$/.test(on.updated) && Array.isArray(on.covered) && Array.isArray(on.partial) && Array.isArray(on.notCovered) && typeof on.stations === "string" && typeof on.notes === "string", "coverage.json must have the coverage-notes shape");
  assert(JSON.stringify(on).includes("Trams at Haymarket, Edinburgh Gateway and Edinburgh Park Station aren't shown yet; their rail departures are."), "coverage.json must carry the shared-name coverage note naming all three withheld stops");
  assert(!/TODO|D1|oracle|CRS/.test(JSON.stringify(on)), "coverage.json must be rider prose");
  assert(!/no confirmed live-times feed|59 stations/.test(JSON.stringify(on)) && on.partial.length === 0 && /20 tram stops/.test(JSON.stringify(on)), "coverage.json must describe the live trams (no stale 'no confirmed feed' / '59 stations' text)");
  // F1 (Mark, 25 Oct 2026): the station count quoted in the coverage text must equal the catalog count the API serves.
  const quoted = Number(/^(\d+) stations and stops/.exec(on.stations)?.[1]);
  const served = listMultiCityStations("edinburgh").length;
  assert(Number.isInteger(quoted) && quoted === served, `coverage.json "stations" quotes ${quoted} but /api/city-stations serves ${served}`);
  assert(served === 57, `/api/city-stations must serve 57 Edinburgh entries (37 rail + 20 tram), got ${served}`);
}
// The overlay is a static JSON import (traced by the Vercel bundler), not a computed-path readFileSync.
{
  const src = read("lib", "cities", "edinburgh", "trams-catalog.js");
  assert(/import overlayJson from "\.\/trams-api\.json" with \{ type: "json" \}/.test(src), "trams-api.json must be loaded by a static JSON import so it is bundled");
  assert(!/readFileSync/.test(src), "trams-catalog.js must not readFileSync the overlay (untraced by the bundler)");
}
// stations.json: 22 tram rows, all liveFeed:true (the overlay withholds three), none for York Place or an Edinburgh Park Station.
const stops = JSON.parse(read("lib", "cities", "edinburgh", "stations.json")).stops;
const tramRows = stops.filter((s) => s.mode === "metro");
assert(tramRows.length === 22 && tramRows.every((s) => s.liveFeed === true), "stations.json must carry the 22 tram rows, all liveFeed:true (the 23rd stop arrives via the overlay)");
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
assert(results.length >= 50, `expected the switch-ON child to run its full check list, got ${results.length}`);
const failed = results.filter((r) => !r.ok);
assert(failed.length === 0, `switch-ON checks failed:\n${failed.map((r) => `  - ${r.name}: ${r.detail}`).join("\n")}`);

console.log(
  `edinburgh-trams-gate: ok (tramsLive on, status live; coverage text count == /api/city-stations (57); ` +
    `UTC->London BST/GMT + midnight rollover; null/echo predictions dropped; single-object StopEvents; 23 stops, York Place absent, ` +
    `Edinburgh Park Station coordinates cited; switch ON: 20 tram stops with Haymarket + Edinburgh Gateway + Edinburgh Park Station withheld and the coverage note, bare-name shadow guard, emptyReason no-live-predictions, 429/503 status + Retry-After propagation; ${results.length} switch-ON checks passed offline; G1 + ledger recorded)`
);
