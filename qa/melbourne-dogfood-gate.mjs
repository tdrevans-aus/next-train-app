/**
 * Melbourne flip follow-through gate. Melbourne stays `status: "planned"` (Mark/Tim's flip
 * call) but the dogfood module, live-city-api.js dispatch switch-cases, and this gate are wired
 * ahead of that per the flip-follow-through guardrail (Boston/Washington shape).
 *
 * Metro Trains + V/Line walk-up services, GTFS-RT static-join over the Transport Victoria Open
 * Data Portal (docs/melbourne-d1/jim-handoff.md) — supersedes the earlier PTV Timetable API
 * path (devid/PTV_API_KEY key never arrived). VIC_OPENDATA_API_KEY was confirmed working
 * (HTTP 200) 22 Sep 2026: live verification found real-time coverage for all 16 currently-
 * running Metro line groups (Racecourse is special-events-only, zero trips at verification
 * time — a coverage gap by design, not a feed failure) and all 13 V/Line route_ids, including
 * both structurally-excluded ones (Albury, Warrnambool).
 *
 * Most assertions below are pure-function/offline (direction-label derivation, board eligibility
 * filtering, catalog/registry wiring) — no network. A handful of real end-to-end
 * fetchStationBoard() calls at the bottom prove the wiring against the real Open Data Portal
 * feeds when VIC_OPENDATA_API_KEY is set in the environment; they're skipped (not failed) when
 * it isn't, since CI doesn't carry this secret.
 *
 * Usage: node qa/melbourne-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, getMultiCityNextTrain } from "../lib/cities/live-city-api.js";
import { readVicOpenDataApiKey, vicOpenDataAuthHeaders, MissingProviderApiKeyError } from "../lib/providers/gtfs/auth.js";
import {
  MELBOURNE_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
  resolveCatalogEntry,
} from "../lib/providers/melbourne.js";
import {
  METRO_LINE_NAMES,
  METRO_TUNNEL_SPINE_CODES,
  VIA_CITY_LOOP_SUFFIX_STATIONS,
  CITY_LOOP_STATIONS,
  routeCodeFromTripId,
  stripLoopTunnelSuffix,
  buildLoopTripIdSet,
  buildMetroDirectionLabel,
  buildVlineDirectionLabel,
  isVlineTripAllowed,
  VLINE_EXCLUDED_ROUTE_CODES,
} from "../lib/cities/melbourne/direction-labels.js";
import {
  listMelbourneDogfoodStations,
  getMelbourneDogfoodDirections,
  getMelbourneDogfoodNextTrain,
} from "../lib/cities/melbourne/dogfood-next-train.js";
import { cityBoundsFor, inAnyBounds } from "./lib/city-bounds-from-picker.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — Perth (Australia) green is enough, not a hardcoded roll call.
const perthAustralia = assertCityLive("perth");
assert(perthAustralia?.ok === true, "Perth (Australia) must stay live");

// Registry identity + status — Melbourne stays planned; only the flip changes this.
const live = assertCityLive("melbourne");
assert(live?.ok === false, "assertCityLive(melbourne) must fail");
assert(live?.status === 501, "melbourne must be 501 planned");

const entry = getCity("melbourne");
assert(entry?.status === "planned", "melbourne registry status must be planned");
assert(entry?.adapterReady === true, "melbourne adapterReady must be true");
assert(entry?.displayName === "Melbourne", "melbourne display name must be Melbourne");
assert(entry?.timeZone === "Australia/Melbourne", "melbourne timezone must be Australia/Melbourne");
assert(CITIES.filter((city) => city.id === "melbourne").length === 1, "melbourne must appear once in the registry");
assert((entry?.envKeys ?? []).includes("VIC_OPENDATA_API_KEY"), "melbourne envKeys must list VIC_OPENDATA_API_KEY");
assert(!(entry?.envKeys ?? []).includes("PTV_DEVID"), "the retired PTV_DEVID key must no longer be listed");
for (const forbiddenId of ["mel", "ptv", "vic", "au"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dogfood dispatch is wired ahead of the flip — NOT in MULTI_CITY_IDS yet.
assert(isMultiCity("melbourne") === false, "melbourne must NOT be in MULTI_CITY_IDS while status stays planned");

// D1 pack presence.
const d1Dir = join(ROOT, "docs/melbourne-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
  "open-data-feed-and-eligibility.md",
  "tim-decisions-2026-09-20.md",
  "gtfs-reconciliation.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/melbourne-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "melbourne", "D1 city id must be melbourne");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.lines.length === 17, `D1 must carry exactly 17 line groups, got ${network.lines.length}`);

// Board eligibility (docs/melbourne-d1/hazard-pack.md) — no undecided rows remain.
const hazardPack = readFileSync(join(d1Dir, "hazard-pack.md"), "utf8");
assert(/## Board eligibility/.test(hazardPack), "hazard pack must carry a Board eligibility section");
assert(/No `undecided` rows remain/.test(hazardPack), "hazard pack Board eligibility section must record that no undecided rows remain");
for (const service of ["Shepparton", "Bairnsdale", "Swan Hill", "Albury", "Warrnambool"]) {
  assert(hazardPack.includes(service), `Board eligibility section must record a verdict for ${service}`);
}

// --- Station catalog ---

const stations = listCatalogStations();
assert(stations.length === 220, `catalog must have 220 stations, got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has("Flinders Street"), "catalog must include Flinders Street");
assert(byName.has("Jolimont"), "catalog must include Jolimont (printed map form)");
assert(
  (byName.get("Jolimont")?.aliases ?? []).includes("Jolimont-MCG"),
  "Jolimont must carry the GTFS spelling Jolimont-MCG as an alias, not a separate station"
);

const melbourneBoxes = cityBoundsFor("melbourne");
for (const station of stations) {
  assert(typeof station.lat === "number" && typeof station.lng === "number", `${station.name} must carry lat/lng`);
  assert(station.stopIds?.length > 0, `${station.name} must carry at least one GTFS stopId`);
  assert(
    inAnyBounds(station.lat, station.lng, melbourneBoxes),
    `${station.name} (${station.lat}, ${station.lng}) must fall inside Melbourne's CITY_BOUNDS box`
  );
}

assert(resolveCatalogEntry("Flinders Street")?.name === "Flinders Street", "resolveCatalogEntry must resolve by printed name");
assert(resolveCatalogEntry("Jolimont-MCG")?.name === "Jolimont", "resolveCatalogEntry must resolve the GTFS spelling to the printed map form");
assert(resolveCatalogEntry("Not A Real Station") === null, "resolveCatalogEntry must reject an unknown station");

// --- Direction-label pure functions (docs/melbourne-d1/direction-model-memo.md, ---
// --- tim-decisions-2026-09-20.md — every gate assertion Mark's note names) ---

assert(routeCodeFromTripId("02-FKN--67-T5_WD07-4860") === "FKN", "routeCodeFromTripId must extract the Metro route code");
assert(routeCodeFromTripId("01-ABY--10-T2-8605") === "ABY", "routeCodeFromTripId must extract the V/Line route code");
assert(routeCodeFromTripId("garbage") === "", "routeCodeFromTripId must return empty string for an unrecognized shape");

assert(stripLoopTunnelSuffix("Alamein via City Loop") === "Alamein", "stripLoopTunnelSuffix must strip the City Loop headsign suffix");
assert(stripLoopTunnelSuffix("Sunbury via Metro Tunnel") === "Sunbury", "stripLoopTunnelSuffix must strip the Metro Tunnel headsign suffix");
assert(stripLoopTunnelSuffix("Camberwell") === "Camberwell", "stripLoopTunnelSuffix must leave a plain terminus unchanged");

assert(Object.keys(METRO_LINE_NAMES).length === 17, "METRO_LINE_NAMES must cover all 17 route codes");
assert(METRO_LINE_NAMES.SUY === "Sunbury" && METRO_LINE_NAMES.CBE === "Cranbourne" && METRO_LINE_NAMES.PKM === "Pakenham", "spine line names must match the picker");
assert(JSON.stringify([...METRO_TUNNEL_SPINE_CODES].sort()) === JSON.stringify(["CBE", "PKM", "SUY"]), "Metro Tunnel spine codes must be exactly Sunbury/Cranbourne/Pakenham");
assert(JSON.stringify([...VIA_CITY_LOOP_SUFFIX_STATIONS].sort()) === JSON.stringify(["Flagstaff", "Flinders Street", "Melbourne Central", "Parliament", "Southern Cross"].sort()), "via-loop suffix stations must be exactly the five Tim named");

// (a) terminus never blank on the Sunbury/Cranbourne/Pakenham spine.
for (const code of METRO_TUNNEL_SPINE_CODES) {
  const label = buildMetroDirectionLabel({
    tripId: `02-${code}--1-T2-9999`,
    destination: "",
    stationName: "Dandenong",
    isViaLoop: false,
  });
  assert(!/\+\s*$/.test(label), `(a) terminus must never be blank on the ${code} spine — got "${label}"`);
  assert(label.includes(METRO_LINE_NAMES[code]), `(a) blank-destination fallback must still name the ${code} line`);
}

// (b) "via City Loop" only at the five named stations.
const loopTrip = { tripId: "02-FKN--67-T5-1001", destination: "Frankston via City Loop", isViaLoop: true };
for (const stationName of ["Flinders Street", "Southern Cross", "Flagstaff", "Melbourne Central", "Parliament"]) {
  const label = buildMetroDirectionLabel({ ...loopTrip, stationName });
  assert(label.includes("via City Loop"), `(b) ${stationName} must show via City Loop for a genuine loop trip`);
}
for (const stationName of ["Frankston", "Richmond", "Caulfield", "Malvern"]) {
  const label = buildMetroDirectionLabel({ ...loopTrip, stationName });
  assert(!label.includes("via City Loop"), `(b) ${stationName} must never show via City Loop — only the five named stations`);
}

// (c) "via City Loop" only when the trip's own stop sequence touches a loop station — derived
// per-trip via buildLoopTripIdSet, never applied to a whole line.
const fakeStatic = {
  stopTimesByStopId: new Map([
    ["flagstaff-stop", [{ trip_id: "loop-trip-1" }, { trip_id: "loop-trip-2" }]],
    ["parliament-stop", [{ trip_id: "loop-trip-2" }]],
    ["some-other-stop", [{ trip_id: "direct-trip-1" }]],
  ]),
};
const loopTripIds = buildLoopTripIdSet(fakeStatic, ["flagstaff-stop", "parliament-stop"]);
assert(loopTripIds.has("loop-trip-1") && loopTripIds.has("loop-trip-2"), "(c) buildLoopTripIdSet must include every trip calling at a loop stop");
assert(!loopTripIds.has("direct-trip-1"), "(c) buildLoopTripIdSet must not include a trip that never calls at a loop stop");
assert(
  buildMetroDirectionLabel({ tripId: "02-FKN--1-1", destination: "Frankston", stationName: "Flinders Street", isViaLoop: loopTripIds.has("loop-trip-1") }).includes("via City Loop"),
  "(c) a trip resolved as loop-calling must show the suffix"
);
assert(
  !buildMetroDirectionLabel({ tripId: "02-FKN--1-1", destination: "Frankston", stationName: "Flinders Street", isViaLoop: loopTripIds.has("direct-trip-1") }).includes("via City Loop"),
  "(c) a trip NOT resolved as loop-calling must not show the suffix, even at a suffix-eligible station"
);

// (d) "Metro Tunnel" must never appear anywhere in a Sunbury/Cranbourne/Pakenham label.
for (const code of METRO_TUNNEL_SPINE_CODES) {
  for (const destination of [`Sunbury via Metro Tunnel`, `Cranbourne via Metro Tunnel`, `Pakenham`]) {
    const label = buildMetroDirectionLabel({ tripId: `02-${code}--1-1`, destination, stationName: "Town Hall", isViaLoop: false });
    assert(!/metro tunnel/i.test(label), `(d) "Metro Tunnel" must never appear in a ${code} label — got "${label}"`);
  }
}
assert(CITY_LOOP_STATIONS.has("Flagstaff") && CITY_LOOP_STATIONS.has("Melbourne Central") && CITY_LOOP_STATIONS.has("Parliament"), "CITY_LOOP_STATIONS must be the three loop stations");

// V/Line board-eligibility filtering — Albury/Warrnambool excluded structurally by route,
// every other V/Line route code allowed.
assert(JSON.stringify([...VLINE_EXCLUDED_ROUTE_CODES].sort()) === JSON.stringify(["ABY", "WBL"]), "VLINE_EXCLUDED_ROUTE_CODES must be exactly Albury/Warrnambool");
assert(isVlineTripAllowed("01-ABY--10-T2-8605") === false, "Albury (ABY) must be excluded — fully reserved");
assert(isVlineTripAllowed("01-WBL--10-T2-8860") === false, "Warrnambool (WBL) must be excluded — fully reserved");
for (const code of ["GEL", "BAT", "BGO", "SER", "TRN", "ECH", "ART", "MBY", "SNH", "BDE", "SWL"]) {
  assert(isVlineTripAllowed(`01-${code}--10-T2-1`) === true, `${code} must be allowed (in) — resolved eligibility from hazard-pack.md`);
}
assert(buildVlineDirectionLabel({ destination: "Traralgon" }) === "V/Line Traralgon", "V/Line label must prefix the operator so it never collapses into a Metro Trains row");

// --- fetchStationBoard — offline failure paths, no network ---

let unknownThrew = false;
try {
  await fetchStationBoard("Not A Real Station");
} catch {
  unknownThrew = true;
}
assert(unknownThrew, "fetchStationBoard must throw for an unknown station without any network call");

const previousKey = process.env.VIC_OPENDATA_API_KEY;
delete process.env.VIC_OPENDATA_API_KEY;
let missingKeyThrew = false;
try {
  vicOpenDataAuthHeaders(readVicOpenDataApiKey());
} catch (err) {
  missingKeyThrew = err instanceof MissingProviderApiKeyError;
}
assert(missingKeyThrew, "vicOpenDataAuthHeaders must throw MissingProviderApiKeyError when no key is configured");
if (previousKey === undefined) {
  delete process.env.VIC_OPENDATA_API_KEY;
} else {
  process.env.VIC_OPENDATA_API_KEY = previousKey;
}

// --- Dogfood dispatch wiring ---

const dogfoodStations = listMelbourneDogfoodStations();
assert(dogfoodStations.length === 220, `dogfood stations must be the 220 D1 names, got ${dogfoodStations.length}`);
assert(dogfoodStations.some((row) => row.name === "Flinders Street"), "Flinders Street must be listed by the dogfood harness");

// --- End-to-end against the real Open Data Portal feeds (skipped, not failed, without a key) ---

if (!readVicOpenDataApiKey()) {
  console.log("melbourne-dogfood-gate: VIC_OPENDATA_API_KEY not set — skipping live end-to-end checks");
} else {
  const flindersBoard = await fetchStationBoard("Flinders Street");
  assert(flindersBoard.realtime === true, "Flinders Street board realtime must be true");
  assert(flindersBoard.trips.every((t) => t.realtime === true), "every trip on a live board must carry realtime:true (live-only — nothing scheduled-only reaches the board)");
  assert(
    flindersBoard.trips.every((t) => t.destination && t.destination.trim().length > 0),
    "no trip on the Flinders Street board may have a blank destination"
  );
  assert(
    !flindersBoard.trips.some((t) => /metro tunnel/i.test(t.destination)),
    '"Metro Tunnel" must never appear in a live Flinders Street board label'
  );
  const loopSuffixed = flindersBoard.trips.filter((t) => /via city loop/i.test(t.destination));
  // Not asserted > 0 — depends on what's actually running right now — but if present, every one
  // must be at a suffix-eligible station (trivially true here, Flinders Street is one of the five).
  assert(loopSuffixed.every((t) => t.destination.trim().endsWith("via City Loop")), "the via City Loop suffix must be a trailing plain suffix, never embedded mid-string");

  const frankstonBoard = await fetchStationBoard("Frankston");
  assert(frankstonBoard.realtime === true, "Frankston board realtime must be true");
  assert(
    !frankstonBoard.trips.some((t) => /via city loop/i.test(t.destination)),
    "Frankston is not one of the five suffix-eligible stations — via City Loop must never appear there"
  );

  const dispatchedDirections = await getMultiCityDirections("melbourne", "Flinders Street");
  assert(dispatchedDirections.source === "melbourne-live-board", "live-city-api dispatch source must be melbourne-live-board");
  assert(Array.isArray(dispatchedDirections.directions), "dispatched directions must be an array");

  const hubPack = await getMelbourneDogfoodDirections("Flinders Street");
  assert(JSON.stringify(hubPack.directions) === JSON.stringify(dispatchedDirections.directions), "dogfood directions must match the live-city-api dispatch");

  if (hubPack.directions.length > 0) {
    const destination = hubPack.directions[0];
    const dispatchedNextTrain = await getMultiCityNextTrain("melbourne", {
      station: "Flinders Street",
      destination,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(dispatchedNextTrain.config?.destination === destination, "dispatched next-train destination must equal the chosen chip");

    const directDogfoodNextTrain = await getMelbourneDogfoodNextTrain({
      station: "Flinders Street",
      destination,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(directDogfoodNextTrain.config?.destination === destination, "dogfood next-train destination must equal the chosen chip");
  }
}

// Persistence + dogfood-mount whitelists (journey-model PERSISTED_CITY_IDS/COUNTRY_IDS,
// brisbane-dogfood MULTI_CITY_IDS/available, app.js NEARBY_MULTI_CITY_IDS/LIVE_CITY_IDS,
// city-session.js MULTI_CITY_IDS + picker comingSoon) are deliberately NOT touched yet — same
// registry-status-derived invariant as MULTI_CITY_IDS above (qa/live-city-lists-sync.mjs
// requires them to equal exactly the live-city set). Add "melbourne"/"australia" to all of
// them in the same commit as the status flip — see docs/melbourne-d1/jim-handoff.md's
// "Flip commit — exact edits" section.

console.log(
  "melbourne-dogfood-gate: ok (planned/501, dispatch switch-cases wired ahead of flip, MULTI_CITY_IDS/mount/persistence lists deliberately deferred to the status-flip commit, D1 pack, Board eligibility section all resolved, 220 stations with lat/lng and GTFS stopIds inside CITY_BOUNDS, Jolimont/Jolimont-MCG alias, direction-label gate assertions (a)-(d) all pass, V/Line Albury/Warrnambool excluded structurally, other V/Line services allowed, missing-key throws before any fetch, Perth Australia green)"
);
