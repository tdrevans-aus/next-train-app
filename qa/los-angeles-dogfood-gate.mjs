/**
 * Los Angeles dogfood gate (replaces los-angeles-planned-gate.mjs; docs/jim-brief-la-flip-follow-through.md).
 * Status-agnostic: every assertion that depends on registry status reads `entry.status` at runtime
 * and branches (same shape as qa/prague-dogfood-gate.mjs), so Mark's flip commit never edits it.
 * Perth (Australia) stays live.
 * Usage: node qa/los-angeles-dogfood-gate.mjs
 *
 * Deliberately does NOT call the live Swiftly GTFS-RT feed (api.goswift.ly) or LA Metro's
 * static rail GTFS zip — that's real network work not appropriate for a smoke-tier gate, and
 * SWIFTLY_API_KEY was not available this session anyway (docs/los-angeles-d1/jim-handoff.md;
 * empty-key probe was HTTP 401 on the D1 pack's own research). Instead this gate unit-tests the
 * catalog/allow-list/direction-model logic (resolveCatalogEntry, listCatalogStations,
 * mapLineTerminusDestination, resolveTerminus) plus asserts that fetchStationBoard throws
 * MissingSwiftlyApiKeyError when no key is configured — all without any network call.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, getMultiCityNextTrain } from "../lib/cities/live-city-api.js";
import {
  buildLosAngelesNextTrainFromBoard,
  getLosAngelesDogfoodDirections,
  getLosAngelesDogfoodNextTrain,
  listLosAngelesDogfoodStations,
  losAngelesDirectionsFromStatic,
  setLosAngelesStaticLoader,
} from "../lib/cities/los-angeles/dogfood-next-train.js";
import { checkBoard as sweepCheckBoard, DOCUMENTED_NOT_SERVED } from "./los-angeles-all-stations-live-sweep.mjs";
import { CITY_BOUNDS } from "../lib/cities/city-bounds.js";
import { buildCityManifest } from "../lib/cities/city-manifest.js";
import {
  LOS_ANGELES_HUB,
  LOS_ANGELES_TIME_ZONE,
  LINE_LABELS,
  LINE_TERMINI,
  A_LINE_SHORT_TURNS,
  resolveCatalogEntry,
  listCatalogStations,
  fetchStationBoard,
  composeStationBoard,
  resolveStopIds,
  lineIdForRoute,
  destinationForTrip,
  staticDirectionsForStopIds,
  tripTerminatesAtStops,
  MissingSwiftlyApiKeyError,
} from "../lib/providers/los-angeles.js";
import { swiftlyAuthHeaders } from "../lib/providers/gtfs/auth.js";
import {
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  resolveTerminus,
  mapLineTerminusDestination,
  marketingLabelsForStation,
} from "../lib/cities/los-angeles/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other live city.
const perthAustralia = assertCityLive("perth");
assert(perthAustralia?.ok === true, "Perth (Australia) must stay live");

const entry = getCity("los-angeles");
assert(entry, "los-angeles must be registered");
assert(
  entry.status === "planned" || entry.status === "live",
  `los-angeles registry status must be planned or live, got ${entry.status}`
);
const laIsLive = entry.status === "live";
const live = assertCityLive("los-angeles");
if (laIsLive) {
  assert(live?.ok === true, "assertCityLive(los-angeles) must pass once los-angeles is live");
} else {
  assert(live?.ok === false, "assertCityLive(los-angeles) must fail while planned");
  assert(live?.status === 501, "los-angeles must be 501 planned while planned");
}
assert(
  isMultiCity("los-angeles") === laIsLive,
  "los-angeles MULTI_CITY_IDS membership must track registry status exactly"
);
assert(entry?.adapterReady === true, "los-angeles adapterReady must be true");
assert(entry?.displayName === "Los Angeles", "los-angeles display name must be Los Angeles");
assert(entry?.timeZone === "America/Los_Angeles", "los-angeles timezone must be America/Los_Angeles");
assert(entry?.envKeys?.includes("SWIFTLY_API_KEY"), "los-angeles must declare SWIFTLY_API_KEY as an envKey");
assert(
  CITIES.filter((city) => city.id === "los-angeles").length === 1,
  "los-angeles must appear once in the registry"
);
for (const forbiddenId of ["la", "lax", "metro", "lacmta", "us"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/los-angeles-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/los-angeles-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "los-angeles", "D1 city id must be los-angeles");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.stats?.innerCityLock?.includes(LOS_ANGELES_HUB), `D1 lock must include ${LOS_ANGELES_HUB}`);
assert(network.lines.length === 6, "D1 must carry exactly 6 lines (A/B/C/D/E/K)");

const stations = listCatalogStations();
assert(stations.length === 110, `catalog must have 110 stations, got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(LOS_ANGELES_HUB), `catalog must lock ${LOS_ANGELES_HUB}`);
assert(
  new Set(byName.get(LOS_ANGELES_HUB)?.lines ?? []).size === 4 &&
    ["A", "B", "D", "E"].every((line) => byName.get(LOS_ANGELES_HUB)?.lines.includes(line)),
  `${LOS_ANGELES_HUB} must carry exactly A/B/D/E`
);
assert(!byName.get(LOS_ANGELES_HUB)?.lines.includes("C"), `${LOS_ANGELES_HUB} must NOT carry C`);
assert(!byName.get(LOS_ANGELES_HUB)?.lines.includes("K"), `${LOS_ANGELES_HUB} must NOT carry K`);

// resolveCatalogEntry — exact-match aliasing (map printed name <-> full/clash-report form).
assert(resolveCatalogEntry(LOS_ANGELES_HUB)?.name === LOS_ANGELES_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("7th Street/Metro Center")?.name === LOS_ANGELES_HUB, "must resolve the clash-report long form to the map form");
assert(resolveCatalogEntry("Downtown") === null, "Downtown must never resolve as a station");
assert(resolveCatalogEntry("City") === null, "City must never resolve as a station");
assert(resolveCatalogEntry("la") === null, "resolveCatalogEntry must reject the invented city token la");
assert(resolveCatalogEntry("lax") === null, "resolveCatalogEntry must reject the invented city token lax");
assert(isForbiddenCollapseName("Downtown") === true, "Downtown must never resolve as a station on its own");
assert(isForbiddenHubProxy("Union Station") === true, "Union Station must never stand in for the 7th St/Metro Ctr hub identity");
assert(isForbiddenHubProxy("Civic Ctr/Grand Park") === true, "Civic Ctr/Grand Park must never stand in for the hub identity");
assert(isForbiddenHubProxy("Pershing Square") === true, "Pershing Square must never stand in for the hub identity");
assert(isForbiddenHubProxy("Historic Broadway") === true, "Historic Broadway must never stand in for the hub identity");
assert(isForbiddenHubProxy(LOS_ANGELES_HUB) === false, "the hub itself is not its own proxy violation");
assert(foldKey("7th St/Metro Ctr") !== "", "foldKey must fold case/punctuation");

// doNotGroup same-family pairs stay distinct catalog entries.
assert(byName.get("Pico") && byName.get("Pico/Aliso"), "Pico and Pico/Aliso must both exist as distinct stations");
assert(resolveCatalogEntry("Pico")?.name === "Pico", "must not collapse Pico into Pico/Aliso");
assert(byName.get("Crenshaw") && byName.get("Expo/Crenshaw"), "Crenshaw and Expo/Crenshaw must both exist as distinct stations");
assert(byName.get("Crenshaw")?.lines.includes("C") && !byName.get("Crenshaw")?.lines.includes("E"), "Crenshaw is C only");
assert(byName.get("Expo/Crenshaw")?.lines.includes("E") && byName.get("Expo/Crenshaw")?.lines.includes("K"), "Expo/Crenshaw is E x K");
assert(byName.get("Aviation/Century")?.lines.includes("C") && byName.get("Aviation/Century")?.lines.includes("K"), "Aviation/Century is C x K shared");
assert(byName.get("Aviation/Imperial")?.lines.includes("C") && !byName.get("Aviation/Imperial")?.lines.includes("K"), "Aviation/Imperial is C only");
assert(byName.get("Pacific Av")?.lines.includes("A"), "Pacific Av (A Line Long Beach loop stop) must exist");
assert(byName.get("Downtown Long Beach")?.lines.includes("A"), "Downtown Long Beach must exist distinct from Pacific Av");
assert(byName.get("Union Station")?.lines.includes("A") && byName.get("Union Station")?.lines.includes("B") && byName.get("Union Station")?.lines.includes("D"), "Union Station is A x B x D");
assert(!byName.get("Union Station")?.lines.includes("E"), "Union Station must not carry E (E's downtown string is Historic Broadway, not Union Station)");

// Line labels + termini (direction-model-memo.md §3 recommendation A — "Line" + terminus).
assert(LINE_LABELS.a === "A Line", "A line label must keep the word Line");
assert(LINE_LABELS.k === "K Line", "K line label must keep the word Line");
assert(LINE_TERMINI.a.includes("Pomona North") && LINE_TERMINI.a.includes("Downtown Long Beach"), "A termini must be Pomona North/Downtown Long Beach");
assert(!LINE_TERMINI.a.includes("Pacific Av"), "A termini must not include the Long Beach loop stop Pacific Av");
assert(LINE_TERMINI.e.includes("Downtown Santa Monica") && LINE_TERMINI.e.includes("Atlantic"), "E termini must be Downtown Santa Monica/Atlantic");
assert(LINE_TERMINI.k.includes("Expo/Crenshaw") && LINE_TERMINI.k.includes("Redondo Beach"), "K termini must be Expo/Crenshaw/Redondo Beach");
assert(A_LINE_SHORT_TURNS.includes("Monrovia") && A_LINE_SHORT_TURNS.includes("Wardlow"), "A Line short-turns must stay recorded");
// Short-turn termini real trips end at (24 Oct 2026 gtfs_rail.zip) must resolve, so no bare chip.
assert(LINE_TERMINI.a.includes("Monrovia") && LINE_TERMINI.a.includes("APU/Citrus College"), "A short-turns Monrovia/APU/Citrus College must be resolvable termini");
assert(LINE_TERMINI.c.includes("Aviation/Century"), "C short-turn Aviation/Century must be a resolvable terminus");
assert(LINE_TERMINI.d.includes("Wilshire/Western"), "D terminus Wilshire/Western must be a resolvable terminus");
assert(!LINE_TERMINI.a.includes("Wardlow"), "Wardlow has no static trip ending there, so it is not a terminus");
for (const lineId of Object.keys(LINE_TERMINI)) {
  assert(!LINE_TERMINI[lineId].some((t) => foldKey(t) === foldKey(LOS_ANGELES_HUB)), "the hub is never a direction token");
}

assert(resolveTerminus("Pomona North", "a") === "Pomona North", "resolveTerminus must resolve an exact terminus match");
assert(mapLineTerminusDestination("Pomona North", "a") === "A Line + Pomona North", "direction chip must be line + terminus");
assert(mapLineTerminusDestination("Atlantic", "e") === "E Line + Atlantic", "direction chip must be line + terminus");
assert(mapLineTerminusDestination("Redondo Beach", "k") === "K Line + Redondo Beach", "direction chip must be line + terminus");
// 7th St/Metro Ctr must NEVER appear as a direction — it isn't in any line's termini list, so an
// unresolvable/hub headsign always falls back to the bare line label.
assert(mapLineTerminusDestination("7th St/Metro Ctr", "a") === null, "7th St/Metro Ctr must never appear as a direction token (and never a bare line chip)");
assert(mapLineTerminusDestination("City", "e") === null, "City must never appear as a direction token (and never a bare line chip)");
assert(mapLineTerminusDestination("Wilshire / Western Station", "d") === "D Line + Wilshire/Western", "D trips ending at Wilshire/Western give D Line + Wilshire/Western");
assert(mapLineTerminusDestination("Monrovia Station", "a") === "A Line + Monrovia", "A short-turn Monrovia resolves");
assert(mapLineTerminusDestination("APU / Citrus College Station", "a") === "A Line + APU/Citrus College", "A short-turn APU/Citrus College resolves");
assert(mapLineTerminusDestination("Aviation / Century Station", "c") === "C Line + Aviation/Century", "C short-turn Aviation/Century resolves");
assert(mapLineTerminusDestination("Wilshire / Western Station", "a") === null, "a terminus is only valid on the line that serves it");
assert(resolveTerminus("Some Unknown Headsign", "a") === null, "resolveTerminus must not fabricate an unknown terminus");

const hubChips = marketingLabelsForStation(LOS_ANGELES_HUB);
assert(hubChips.includes("A Line + Pomona North"), "7th St/Metro Ctr must offer A Line + Pomona North");
assert(hubChips.includes("E Line + Atlantic"), "7th St/Metro Ctr must offer E Line + Atlantic");
assert(!hubChips.some((chip) => chip.includes("7th St")), "7th St/Metro Ctr chips must never reference the hub itself");

// fetchStationBoard — no network for either failure path.
let unknownThrew = false;
try {
  await fetchStationBoard("Not A Real Station");
} catch {
  unknownThrew = true;
}
assert(unknownThrew, "fetchStationBoard must throw for an unknown station without any network call");

const savedKey = process.env.SWIFTLY_API_KEY;
delete process.env.SWIFTLY_API_KEY;
let missingKeyThrew = false;
try {
  await fetchStationBoard(LOS_ANGELES_HUB);
} catch (err) {
  missingKeyThrew = err instanceof MissingSwiftlyApiKeyError;
} finally {
  if (savedKey !== undefined) {
    process.env.SWIFTLY_API_KEY = savedKey;
  }
}
assert(
  missingKeyThrew,
  "fetchStationBoard must throw MissingSwiftlyApiKeyError when no key is configured — no silent timetable fallback"
);

// Swiftly rejects "Bearer <key>" (401); the raw key is the accepted Authorization value.
const swiftlyHeaders = swiftlyAuthHeaders("k");
assert(
  JSON.stringify(swiftlyHeaders) === JSON.stringify({ Authorization: "k" }),
  "swiftlyAuthHeaders must return exactly { Authorization: <raw key> } with no Bearer prefix"
);

// gtfs_rail.zip has EMPTY route_short_name (verified live 24 Oct 2026); the line must come from route_long_name.
assert(lineIdForRoute("", "Metro A Line") === "a" && lineIdForRoute("", "Metro K Line") === "k" && lineIdForRoute("B", "") === "b", "lineIdForRoute must resolve lines from route_long_name when route_short_name is empty");

// ---- Station matcher precedence (fixture mirrors the live gtfs_rail.zip stops.txt, 24 Oct 2026:
// each station = platform stop (location_type 0) + parent (1) + entrance nodes (2) whose names embed
// neighbouring stations' names - "Washington Station - Long Beach & Washington Entrance",
// "Arcadia Station - 1st Street Ramp - North Entrance"). The old shared substring matcher merged
// doNotGroup pairs through those entrance names.
function fixtureStation(id, name, entranceNames = []) {
  return [
    { stop_id: id, stop_name: name, location_type: "0", parent_station: `${id}S` },
    { stop_id: `${id}S`, stop_name: name, location_type: "1", parent_station: "" },
    ...entranceNames.map((entranceName, i) => ({
      stop_id: `${id}${String.fromCharCode(65 + i)}`,
      stop_name: `${name} - ${entranceName}`,
      location_type: "2",
      parent_station: `${id}S`,
    })),
  ];
}
const fixtureStops = [
  ...fixtureStation("80121", "Pico Station", ["Flower & 12th Entrance", "Flower & Pico Entrance"]),
  ...fixtureStation("80407", "Pico / Aliso Station", ["Utah Entrance"]),
  ...fixtureStation("80307", "Crenshaw C-Line Station", ["East Entrance"]).map((s) =>
    s.location_type === "1" ? { ...s, stop_name: "Crenshaw Station" } : s
  ),
  ...fixtureStation("80128", "Expo / Crenshaw E-Line Station", ["Eastbound Platform Entrance"]),
  ...fixtureStation("80709", "Expo / Crenshaw K-Line Station", ["Dual Elevators"]),
  ...fixtureStation("80118", "Washington Station", ["Long Beach & Washington Entrance"]),
  ...fixtureStation("80119", "San Pedro Street Station", ["Washington & San Pedro Entrance"]),
  ...fixtureStation("80120", "Grand / LATTC Station", ["Washington & Grand Entrance"]),
  ...fixtureStation("80419", "Lake Station", ["Northbound Lake - East Entrance"]),
  ...fixtureStation("80210", "Westlake / MacArthur Park Station", ["South Entrance"]),
  ...fixtureStation("80313", "Lakewood Blvd Station", ["East Entrance"]),
  ...fixtureStation("80153", "1st Street Station", ["Long Beach & 1st Entrance"]),
  ...fixtureStation("80422", "Arcadia Station", ["1st Street Ramp - North Entrance"]),
  ...fixtureStation("81401", "Grand Ave Arts / Bunker Hill Station", ["Hope Entrance"]),
  ...fixtureStation("80412", "Heritage Square / Arroyo Station", ["East Entrance"]),
  ...fixtureStation("801103", "Pomona North Station"),
  { stop_id: "80122S", stop_name: "7th Street / Metro Center Station", location_type: "1", parent_station: "" },
  { stop_id: "80122", stop_name: "7th Street / Metro Center Station - Metro A & E Lines", location_type: "0", parent_station: "80122S" },
  { stop_id: "80211", stop_name: "7th Street / Metro Center Station - Metro B & D Lines", location_type: "0", parent_station: "80122S" },
];
const fixtureStatic = {
  stops: fixtureStops,
  stopsById: new Map(fixtureStops.map((s) => [s.stop_id, s])),
};
const resolved = async (name) => new Set(await resolveStopIds(name, fixtureStatic));
const expectIds = (set, ids, label) =>
  assert(
    set.size === ids.length && ids.every((id) => set.has(id)),
    `${label} must resolve to exactly [${ids.join(", ")}], got [${[...set].join(", ")}]`
  );
const pairs = [
  ["Pico", ["80121", "80121S"], "Pico/Aliso", ["80407", "80407S"]],
  ["Crenshaw", ["80307", "80307S"], "Expo/Crenshaw", ["80128", "80128S", "80709", "80709S"]],
  ["Washington", ["80118", "80118S"], "Grand/LATTC", ["80120", "80120S"]],
  ["Lake", ["80419", "80419S"], "Westlake/MacArthur Park", ["80210", "80210S"]],
  ["Lake", ["80419", "80419S"], "Lakewood Blvd", ["80313", "80313S"]],
  ["1st St", ["80153", "80153S"], "Arcadia", ["80422", "80422S"]],
];
for (const [nameA, idsA, nameB, idsB] of pairs) {
  const a = await resolved(nameA);
  const b = await resolved(nameB);
  expectIds(a, idsA, nameA);
  expectIds(b, idsB, nameB);
  assert(![...a].some((id) => b.has(id)), `${nameA} and ${nameB} (doNotGroup) must not share any stop_id`);
}
expectIds(await resolved("Grand Av Arts/Bunker Hill"), ["81401", "81401S"], "Grand Av Arts/Bunker Hill");
expectIds(await resolved("Heritage Sq"), ["80412", "80412S"], "Heritage Sq (unique-parent prefix fallback)");
expectIds(await resolved("7th St/Metro Ctr"), ["80122S", "80122", "80211"], "7th St/Metro Ctr (all platforms)");
{
  const hub = await resolved("7th St/Metro Ctr");
  assert(![...hub].some((id) => /^(80119|80120|80118)/.test(id)), "7th St/Metro Ctr must not pull any other station");
}

// ---- Live filter + board-level realtime: drive the real board path with synthetic Swiftly updates.
// Fixture: Pico Station, Monday 26 Oct 2026 11:00 PDT; trips scheduled 11:10 (live), 11:12 (SKIPPED),
// 11:14 (StopTimeUpdate with no times and no delay), 11:16 (arrival-only, no delay), 11:18 (not in feed).
const nowPdt = new Date(Date.UTC(2026, 9, 26, 18, 0, 0));
const sched = (min) => Math.floor(Date.UTC(2026, 9, 26, 18, min, 0) / 1000);
const tripDefs = [
  ["T-live", "11:10:00"],
  ["T-skipped", "11:12:00"],
  ["T-notimes", "11:14:00"],
  ["T-arrival-only", "11:16:00"],
  ["T-unpredicted", "11:18:00"],
];
const boardStatic = {
  ...fixtureStatic,
  routesById: new Map([["R-A", { route_id: "R-A", route_short_name: "", route_long_name: "Metro A Line" }]]),
  tripsById: new Map(tripDefs.map(([id]) => [id, { trip_id: id, route_id: "R-A", service_id: "S", trip_headsign: "" }])),
  stopTimesByStopId: new Map([
    [
      "80121",
      tripDefs.map(([id, time]) => ({ trip_id: id, stop_id: "80121", departure_time: time, arrival_time: time, stop_sequence: "1", pickup_type: "0" })),
    ],
    [
      "801103",
      tripDefs.map(([id]) => ({ trip_id: id, stop_id: "801103", departure_time: "12:00:00", arrival_time: "12:00:00", stop_sequence: "2", stop_headsign: "Metro A Line - Pomona Station", pickup_type: "0" })),
    ],
  ]),
  calendar: [
    { service_id: "S", monday: "1", tuesday: "1", wednesday: "1", thursday: "1", friday: "1", saturday: "1", sunday: "1", start_date: "20260101", end_date: "20261231" },
  ],
  calendarDates: [],
};
const stu = (tripId, event) => ({ tripUpdate: { trip: { tripId }, stopTimeUpdate: [{ stopId: "80121", ...event }] } });
const entities = [
  stu("T-live", { departure: { time: sched(11) } }),
  stu("T-skipped", { scheduleRelationship: 1, departure: { time: sched(13) } }),
  stu("T-notimes", {}),
  stu("T-arrival-only", { arrival: { time: sched(17) } }),
];
const board = await composeStationBoard("Pico", boardStatic, { entities, fetchedAt: nowPdt }, { now: nowPdt });
assert(board.realtime === true, "Los Angeles board must carry board-level realtime: true");
const shownIds = board.trips.map((t) => t.tripId);
assert(shownIds.includes("T-live"), `a trip with a real departure prediction must show, got [${shownIds.join(", ")}]`);
assert(!shownIds.includes("T-skipped"), "a SKIPPED StopTimeUpdate must never reach a rider");
assert(!shownIds.includes("T-notimes"), "a StopTimeUpdate with null departure and null delay must never reach a rider as live");
assert(!shownIds.includes("T-arrival-only"), "an arrival-only StopTimeUpdate (no departure, no delay) must not show the scheduled time as live");
assert(!shownIds.includes("T-unpredicted"), "a trip Swiftly has no update for must not show (no timetable fallback)");
assert(shownIds.length === 1, `exactly one live row expected, got [${shownIds.join(", ")}]`);

// ---- Pre-flip chips (docs/jim-brief-la-preflip-chips.md): no bare line chip, no terminating-here row.
// Terminal stops observed in LA Metro's gtfs_rail.zip (24 Oct 2026): every distinct final stop of
// every trip, with trip counts, per line. `station` is the catalog station the stop belongs to.
const OBSERVED_TERMINALS = [
  ["a", "APU / Citrus College Station", "Metro A Line - APU / Citrus College Station", "APU/Citrus College"],
  ["a", "Downtown Long Beach Station", "Metro A Line - Downtown Long Beach Station", "Downtown Long Beach"],
  ["a", "Monrovia Station", "Metro A Line - Monrovia Station", "Monrovia"],
  ["a", "Pomona North Station", "Metro A Line - Pomona Station", "Pomona North"],
  ["b", "North Hollywood Station", "Metro B Line - North Hollywood Station", "North Hollywood"],
  ["b", "Union Station - Metro B & D Lines", "Metro B Line - Union Station", "Union Station"],
  ["c", "Aviation / Century Station", "Metro C Line - Aviation / Century Station", "Aviation/Century"],
  ["c", "LAX / Metro Transit Center", "Metro C Line - LAX / Metro Transit Center", "LAX/Metro Transit Center"],
  ["c", "Norwalk Station", "Metro C Line - Norwalk Station", "Norwalk"],
  ["d", "Union Station - Metro B & D Lines", "Metro D Line - Union Station", "Union Station"],
  ["d", "Wilshire / La Cienega Station", "Metro D Line - Wilshire / La Cienega Station", "Wilshire/La Cienega"],
  ["d", "Wilshire / Western Station", "Metro D Line - Wilshire / Western Station", "Wilshire/Western"],
  ["e", "Atlantic Station", "Metro E Line - Atlantic Station", "Atlantic"],
  ["e", "Downtown Santa Monica Station", "Metro E Line - Downtown Santa Monica Station", "Downtown Santa Monica"],
  ["k", "Expo / Crenshaw K-Line Station", "Metro K Line - Expo / Crenshaw Station", "Expo/Crenshaw"],
  ["k", "Redondo Beach Station", "Metro K Line - Redondo Beach Station", "Redondo Beach"],
];
// Terminal -> the catalog station it is (so a terminal at the board's own station is "terminating here").
const bareLineChip = /^[A-EK] Line$/;

// 1. Iterate the whole catalog: for every station and every line calling there, schedule one trip to
// each terminal observed for that line (the terminal at the station's own stop when it IS that
// station). No static-derived direction may be a bare line chip, an unresolved terminus, the hub, or
// the station's own name.
let stationsChecked = 0;
for (const [index, station] of stations.entries()) {
  const stationStopId = `X${index}`;
  const stops = [
    { stop_id: stationStopId, stop_name: `${station.name} Station`, location_type: "0", parent_station: `${stationStopId}S` },
    { stop_id: `${stationStopId}S`, stop_name: `${station.name} Station`, location_type: "1", parent_station: "" },
  ];
  const stopTimes = new Map([[stationStopId, []]]);
  const trips = new Map();
  const routes = new Map();
  let n = 0;
  for (const lineId of station.lines.map((l) => l.toLowerCase())) {
    routes.set(`R-${lineId}`, { route_id: `R-${lineId}`, route_short_name: "", route_long_name: `Metro ${lineId.toUpperCase()} Line` });
    for (const [terminalLine, terminalStopName, headsign, terminalStation] of OBSERVED_TERMINALS) {
      if (terminalLine !== lineId) continue;
      const tripId = `T${index}-${n++}`;
      trips.set(tripId, { trip_id: tripId, route_id: `R-${lineId}`, service_id: "S", trip_headsign: "" });
      let terminalStopId = `${stationStopId}-term-${n}`;
      if (foldKey(terminalStation) === foldKey(station.name)) {
        terminalStopId = stationStopId; // trip ends at this very station
      } else {
        stops.push({ stop_id: terminalStopId, stop_name: terminalStopName, location_type: "0", parent_station: "" });
      }
      stopTimes.get(stationStopId).push({ trip_id: tripId, stop_id: stationStopId, stop_sequence: "1", stop_headsign: headsign });
      if (terminalStopId !== stationStopId) {
        stopTimes.set(terminalStopId, [{ trip_id: tripId, stop_id: terminalStopId, stop_sequence: "2", stop_headsign: headsign }]);
      } else {
        stopTimes.get(stationStopId).push({ trip_id: tripId, stop_id: stationStopId, stop_sequence: "2", stop_headsign: headsign });
      }
    }
  }
  const data = {
    stops,
    stopsById: new Map(stops.map((s) => [s.stop_id, s])),
    tripsById: trips,
    routesById: routes,
    stopTimesByStopId: stopTimes,
  };
  const { chips, unresolved } = staticDirectionsForStopIds(data, [stationStopId, `${stationStopId}S`]);
  assert(unresolved === 0, `${station.name}: every observed trip terminus must resolve, got ${unresolved} unresolved`);
  for (const chip of chips) {
    assert(!bareLineChip.test(chip), `${station.name}: bare line chip "${chip}" must never be offered`);
    assert(/^[A-EK] Line \+ \S/.test(chip), `${station.name}: chip "${chip}" must be "Line + terminus"`);
    const terminus = chip.split(" + ")[1];
    assert(foldKey(terminus) !== foldKey(station.name), `${station.name}: self-terminus chip "${chip}" (terminating-here trips must not be a direction)`);
    assert(foldKey(terminus) !== foldKey(LOS_ANGELES_HUB), `${station.name}: hub ${LOS_ANGELES_HUB} must never be a direction token ("${chip}")`);
  }
  // Reachability (short-turn chips): every terminus a trip from this station can end at (other than
  // the station itself) is an offered chip - independent of the implementation, from the observed table.
  for (const lineId of station.lines.map((l) => l.toLowerCase())) {
    for (const [terminalLine, , , terminalStation] of OBSERVED_TERMINALS) {
      if (terminalLine !== lineId || foldKey(terminalStation) === foldKey(station.name)) continue;
      const expected = `${LINE_LABELS[lineId]} + ${terminalStation}`;
      assert(chips.includes(expected), `${station.name}: terminus chip "${expected}" must be offered (short-turn reachability), got [${chips.join(", ")}]`);
    }
  }
  assert(
    chips.length > 0 || station.lines.length === 0 || station.lines.every((l) => OBSERVED_TERMINALS.every(([tl, , , ts]) => tl.toUpperCase() !== l.toUpperCase() || foldKey(ts) === foldKey(station.name))),
    `${station.name}: expected at least one direction chip`
  );
  stationsChecked += 1;
}
assert(stationsChecked === 110, `all 110 catalog stations must be iterated, got ${stationsChecked}`);

// 2. Targeted board fixtures at the three named failure points. A mini network with the exact stop
// shapes of the live feed: platform stops (type 0) under a parent (type 1), trips B/D/A.
function miniStop(id, name) {
  return [
    { stop_id: id, stop_name: name, location_type: "0", parent_station: `${id}S` },
    { stop_id: `${id}S`, stop_name: name.replace(/ - Metro .*$/, ""), location_type: "1", parent_station: "" },
  ];
}
const miniStops = [
  ...miniStop("80214", "Union Station - Metro B & D Lines"),
  ...miniStop("80215", "Wilshire / Vermont Station"),
  ...miniStop("80216", "Wilshire / Western Station"),
  ...miniStop("80201", "North Hollywood Station"),
  ...miniStop("80101", "Downtown Long Beach Station"),
  ...miniStop("801103", "Pomona North Station"),
  ...miniStop("80423", "Monrovia Station"),
  ...miniStop("80217", "Wilshire / La Brea Station"), // in the catalog, but no scheduled trip calls here
  ...miniStop("80000", "Wilshire / Normandie Station"), // a stop that is NOT a terminus of D
];
const miniTripDefs = [
  // [tripId, route, [[stopId, "hh:mm:ss"], ...]]
  ["TB-arrive-union", "R-B", [["80215", "11:05:00"], ["80214", "11:20:00"]]], // B terminating at Union
  ["TD-arrive-union", "R-D", [["80215", "11:06:00"], ["80214", "11:21:00"]]], // D terminating at Union
  ["TB-leave-union", "R-B", [["80214", "11:10:00"], ["80201", "11:40:00"]]], // B Union -> North Hollywood
  ["TD-leave-union-ww", "R-D", [["80214", "11:12:00"], ["80216", "11:30:00"]]], // D Union -> Wilshire/Western
  ["TD-leave-union-odd", "R-D", [["80214", "11:14:00"], ["80000", "11:32:00"]]], // D Union -> unresolvable terminus
  ["TA-arrive-dtlb", "R-A", [["801103", "10:30:00"], ["80101", "11:15:00"]]], // A terminating at Downtown Long Beach
  ["TA-leave-dtlb", "R-A", [["80101", "11:16:00"], ["801103", "12:00:00"]]], // A Downtown Long Beach -> Pomona North
  ["TA-leave-dtlb-monrovia", "R-A", [["80101", "11:18:00"], ["80423", "11:59:00"]]], // A short-turn to Monrovia
];
const miniStopTimes = new Map();
const miniTrips = new Map();
for (const [tripId, routeId, calls] of miniTripDefs) {
  miniTrips.set(tripId, { trip_id: tripId, route_id: routeId, service_id: "S", trip_headsign: "" });
  calls.forEach(([stopId, time], i) => {
    if (!miniStopTimes.has(stopId)) miniStopTimes.set(stopId, []);
    // stop_headsign deliberately empty: the terminal stop name must carry the terminus.
    miniStopTimes.get(stopId).push({ trip_id: tripId, stop_id: stopId, departure_time: time, arrival_time: time, stop_sequence: String(i + 1), stop_headsign: "", pickup_type: "0" });
  });
}
const miniStatic = {
  stops: miniStops,
  stopsById: new Map(miniStops.map((s) => [s.stop_id, s])),
  routesById: new Map(["A", "B", "D"].map((l) => [`R-${l}`, { route_id: `R-${l}`, route_short_name: "", route_long_name: `Metro ${l} Line` }])),
  tripsById: miniTrips,
  stopTimesByStopId: miniStopTimes,
  calendar: [
    { service_id: "S", monday: "1", tuesday: "1", wednesday: "1", thursday: "1", friday: "1", saturday: "1", sunday: "1", start_date: "20260101", end_date: "20261231" },
  ],
  calendarDates: [],
};
const miniEntities = [];
for (const [tripId, , calls] of miniTripDefs) {
  for (const [stopId, time] of calls) {
    const [h, m] = time.split(":").map(Number);
    miniEntities.push({
      tripUpdate: { trip: { tripId }, stopTimeUpdate: [{ stopId, departure: { time: Math.floor(Date.UTC(2026, 9, 26, 7 + h, m, 0) / 1000) } }] },
    });
  }
}
const miniRealtime = { entities: miniEntities, fetchedAt: nowPdt };
const rows = async (name) => (await composeStationBoard(name, miniStatic, miniRealtime, { now: nowPdt })).trips;

const unionRows = await rows("Union Station");
const unionById = new Map(unionRows.map((t) => [t.tripId, t.destination]));
assert(unionById.get("TB-leave-union") === "B Line + North Hollywood", `Union Station B departure must be "B Line + North Hollywood", got ${unionById.get("TB-leave-union")}`);
assert(unionById.get("TD-leave-union-ww") === "D Line + Wilshire/Western", `D trips ending at Wilshire/Western must give "D Line + Wilshire/Western", got ${unionById.get("TD-leave-union-ww")}`);
assert(!unionById.has("TB-arrive-union"), "a B trip ending at Union Station must not appear on Union Station's board");
assert(!unionById.has("TD-arrive-union"), "a D trip ending at Union Station must not appear on Union Station's board");
assert(!unionById.has("TD-leave-union-odd"), "a trip whose terminus can't be resolved must produce no row (never a bare D Line)");
assert(unionRows.length === 2, `Union Station board expected exactly 2 rows, got [${[...unionById].join(", ")}]`);
assert(unionRows.every((t) => !bareLineChip.test(t.destination)), "no bare line chip on any board row");

const dtlbRows = await rows("Downtown Long Beach");
const dtlbById = new Map(dtlbRows.map((t) => [t.tripId, t.destination]));
assert(!dtlbById.has("TA-arrive-dtlb"), "an A trip ending at Downtown Long Beach must not appear on that board");
assert(dtlbById.get("TA-leave-dtlb") === "A Line + Pomona North", "Downtown Long Beach A departure to Pomona North");
assert(dtlbById.get("TA-leave-dtlb-monrovia") === "A Line + Monrovia", "A short-turn to Monrovia shows as A Line + Monrovia");
assert(![...dtlbById.values()].some((d) => d.endsWith("+ Downtown Long Beach")), "no self-terminus row at Downtown Long Beach");

// Honest empty state (docs/jim-brief-la-honest-empty-state.md). The reason is additive and comes
// from the static feed alone.
const boardFor = (name, opts = {}) => composeStationBoard(name, miniStatic, miniRealtime, { now: nowPdt, ...opts });
const laBrea = await boardFor("Wilshire/La Brea");
assert(laBrea.trips.length === 0, "Wilshire/La Brea fixture board must be empty");
assert(laBrea.emptyReason === "not-currently-served", `no scheduled service today -> not-currently-served, got ${laBrea.emptyReason}`);
const westernBoard = await boardFor("Wilshire/Western"); // scheduled arrivals only (terminating trips are dropped)
assert(westernBoard.trips.length === 0, "Wilshire/Western fixture board must be empty (arrivals only)");
assert(westernBoard.emptyReason === "no-live-predictions", `scheduled service but no live rows -> no-live-predictions, got ${westernBoard.emptyReason}`);
const unionBoard = await boardFor("Union Station");
assert(unionBoard.trips.length > 0 && !("emptyReason" in unionBoard), "a board with live rows must carry no emptyReason");
const throwing = await boardFor("Wilshire/La Brea", { hasScheduledService: () => { throw new Error("boom"); } });
assert(throwing.trips.length === 0 && !("emptyReason" in throwing), "a throwing service check must omit emptyReason and not throw");

// tripTerminatesAtStops: the parent id also counts as "this station".
assert(tripTerminatesAtStops("TB-arrive-union", new Set(["80214S"]), miniStatic) === true, "a terminal platform whose parent is the station terminates there");
assert(tripTerminatesAtStops("TB-leave-union", new Set(["80214", "80214S"]), miniStatic) === false, "a trip that continues past the station does not terminate there");

// destinationForTrip: headsign first, then last stop; unresolvable is null, never the bare label.
assert(destinationForTrip({ lineId: "d", stopHeadsign: "Metro D Line - Wilshire / Western Station", terminalName: "" }) === "D Line + Wilshire/Western", "headsign resolves D Wilshire/Western");
assert(destinationForTrip({ lineId: "d", stopHeadsign: "", terminalName: "Wilshire / Western Station" }) === "D Line + Wilshire/Western", "last stop resolves D Wilshire/Western");
assert(destinationForTrip({ lineId: "d", stopHeadsign: "", terminalName: "Wilshire / Normandie Station" }) === null, "unresolvable terminus is null, not 'D Line'");
assert(destinationForTrip({ lineId: "a", stopHeadsign: "Metro A Line - Pomona Station", terminalName: "Pomona North Station" }) === "A Line + Pomona North", "A Pomona headsign falls through to the last stop");

// ---- Dogfood module, dispatch, bounds, coordinates, coverage, manifest ----
// 1. emptyReason pass-through (docs/jim-brief-la-flip-follow-through.md): "no-live-predictions" only
// for a direction the schedule expects (board.scheduledCandidates); "not-currently-served" always.
const fixtureBoard = await composeStationBoard("Wilshire/Western", miniStatic, miniRealtime, { now: nowPdt });
assert(Array.isArray(fixtureBoard.scheduledCandidates), "board must expose scheduledCandidates (additive)");
const nextArgs = { station: "Wilshire/Western", leaveBeforeMinutes: 0, refreshSeconds: 60, now: nowPdt };
const emptyBoard = (reason, sched) => ({
  stationName: "Wilshire/Western",
  lastUpdate: nowPdt.toISOString(),
  trips: [],
  scheduledCandidates: sched,
  ...(reason ? { emptyReason: reason } : {}),
  realtime: true,
});
const schedD = [{ destination: "D Line + Union Station" }];
const gated = buildLosAngelesNextTrainFromBoard(emptyBoard("no-live-predictions", schedD), { ...nextArgs, destination: "D Line + Union Station" });
assert(gated.emptyReason === "no-live-predictions", "no-live-predictions must pass through for a direction the schedule expects");
const ungated = buildLosAngelesNextTrainFromBoard(emptyBoard("no-live-predictions", schedD), { ...nextArgs, destination: "D Line + Wilshire/La Cienega" });
assert(!("emptyReason" in ungated), "no-live-predictions must NOT pass through for a direction the schedule does not expect");
const notServed = buildLosAngelesNextTrainFromBoard(emptyBoard("not-currently-served", []), { ...nextArgs, destination: "D Line + Union Station" });
assert(notServed.emptyReason === "not-currently-served", "not-currently-served must always pass through");
assert(!("emptyReasonMessage" in notServed), "no new rider copy: no emptyReasonMessage");
const plain = buildLosAngelesNextTrainFromBoard(emptyBoard(undefined, []), { ...nextArgs, destination: "D Line + Union Station" });
assert(!("emptyReason" in plain), "a board with no emptyReason produces none");

// 2. Short-turn chips (docs/jim-brief-la-short-turn-chips.md): fixture network, no network calls.
// Service S runs today; service S2 (D to Wilshire/La Cienega) only starts 1 Nov, like the live feed.
const cStops = [
  ...miniStop("80214", "Union Station - Metro B & D Lines"),
  ...miniStop("80122", "7th Street / Metro Center Station"),
  ...miniStop("80213", "Wilshire / Vermont Station"),
  ...miniStop("80216", "Wilshire / Western Station"),
  ...miniStop("80218", "Wilshire / La Cienega Station"),
  ...miniStop("80201", "North Hollywood Station"),
  ...miniStop("80101", "Downtown Long Beach Station"),
  ...miniStop("801103", "Pomona North Station"),
  ...miniStop("80423", "Monrovia Station"),
  ...miniStop("80425", "Arcadia Station"),
];
// [tripId, line, service, expectedChip (hand-written), [[stopId, time], ...]]
const cTrips = [
  ["C-d-west-1", "D", "S", "D Line + Wilshire/Western", [["80214", "11:12:00"], ["80213", "11:20:00"], ["80216", "11:30:00"]]],
  ["C-d-west-2", "D", "S", "D Line + Wilshire/Western", [["80122", "11:15:00"], ["80213", "11:22:00"], ["80216", "11:32:00"]]],
  ["C-d-lacienega", "D", "S2", "D Line + Wilshire/La Cienega", [["80214", "11:40:00"], ["80122", "11:45:00"], ["80213", "11:52:00"], ["80216", "12:00:00"], ["80218", "12:08:00"]]],
  ["C-d-union", "D", "S", "D Line + Union Station", [["80216", "11:05:00"], ["80213", "11:12:00"], ["80122", "11:18:00"], ["80214", "11:24:00"]]],
  ["C-b-nh", "B", "S", "B Line + North Hollywood", [["80214", "11:10:00"], ["80201", "11:40:00"]]],
  ["C-a-monrovia", "A", "S", "A Line + Monrovia", [["80122", "11:20:00"], ["80214", "11:30:00"], ["80425", "11:50:00"], ["80423", "12:00:00"]]],
  ["C-a-pomona", "A", "S", "A Line + Pomona North", [["80122", "11:25:00"], ["80214", "11:35:00"], ["80425", "12:00:00"], ["80423", "12:10:00"], ["801103", "12:40:00"]]],
  ["C-a-dtlb", "A", "S", "A Line + Downtown Long Beach", [["80425", "11:30:00"], ["80122", "11:50:00"], ["80101", "12:30:00"]]],
];
const cStopTimes = new Map();
const cTripMap = new Map();
for (const [tripId, line, service, , calls] of cTrips) {
  cTripMap.set(tripId, { trip_id: tripId, route_id: `R-${line}`, service_id: service, trip_headsign: "" });
  calls.forEach(([stopId, time], i) => {
    if (!cStopTimes.has(stopId)) cStopTimes.set(stopId, []);
    cStopTimes.get(stopId).push({ trip_id: tripId, stop_id: stopId, departure_time: time, arrival_time: time, stop_sequence: String(i + 1), stop_headsign: "", pickup_type: "0" });
  });
}
const chipStatic = {
  stops: cStops,
  stopsById: new Map(cStops.map((st) => [st.stop_id, st])),
  routesById: new Map(["A", "B", "D"].map((l) => [`R-${l}`, { route_id: `R-${l}`, route_short_name: "", route_long_name: `Metro ${l} Line` }])),
  tripsById: cTripMap,
  stopTimesByStopId: cStopTimes,
  calendar: [
    { service_id: "S", monday: "1", tuesday: "1", wednesday: "1", thursday: "1", friday: "1", saturday: "1", sunday: "1", start_date: "20260101", end_date: "20261231" },
    { service_id: "S2", monday: "1", tuesday: "1", wednesday: "1", thursday: "1", friday: "1", saturday: "1", sunday: "1", start_date: "20261101", end_date: "20261231" },
  ],
  calendarDates: [],
};
const chipEntities = [];
const livePredict = (tripId, stopId, time) => {
  const [h, m] = time.split(":").map(Number);
  chipEntities.push({ tripUpdate: { trip: { tripId }, stopTimeUpdate: [{ stopId, departure: { time: Math.floor(Date.UTC(2026, 9, 26, 7 + h, m, 0) / 1000) } }] } });
};
livePredict("C-d-west-1", "80214", "11:12:00"); // one live D -> Western row at Union Station
livePredict("C-a-pomona", "80425", "12:00:00"); // one live A -> Pomona North row at Arcadia
const chipRealtime = { entities: chipEntities, fetchedAt: nowPdt };

const chipsAt = (name) => losAngelesDirectionsFromStatic(name, chipStatic);
const unionChips = await chipsAt("Union Station");
assert(unionChips.includes("D Line + Wilshire/Western"), `Union Station must offer D Line + Wilshire/Western, got [${unionChips.join(", ")}]`);
assert(unionChips.includes("D Line + Wilshire/La Cienega"), "Union Station must still offer D Line + Wilshire/La Cienega");
assert(unionChips.includes("A Line + Monrovia"), "Union Station must offer the A Line + Monrovia short-turn");
assert(JSON.stringify(unionChips) === JSON.stringify(["A Line + Pomona North", "A Line + Downtown Long Beach", "A Line + Monrovia", "B Line + North Hollywood", "D Line + Wilshire/La Cienega", "D Line + Wilshire/Western"]), `Union Station chip set (ordered), got [${unionChips.join(", ")}]`);
const hubChipsS = await chipsAt(LOS_ANGELES_HUB);
assert(hubChipsS.includes("D Line + Wilshire/Western") && hubChipsS.includes("A Line + Monrovia"), "7th St/Metro Ctr must offer the D Western and A Monrovia short-turns");
assert(!hubChipsS.some((c) => c.includes("7th")), "7th St/Metro Ctr must never be a direction token");
const vermontChips = await chipsAt("Wilshire/Vermont");
assert(vermontChips.includes("D Line + Wilshire/Western") && vermontChips.includes("D Line + Wilshire/La Cienega"), "Wilshire/Vermont must offer both D westbound termini");
const arcadiaChips = await chipsAt("Arcadia");
assert(arcadiaChips.includes("A Line + Monrovia") && arcadiaChips.includes("A Line + Pomona North"), `Arcadia (an A station) must offer A Line + Monrovia, got [${arcadiaChips.join(", ")}]`);
assert(!(await chipsAt("Monrovia")).includes("A Line + Monrovia"), "Monrovia must not offer a self chip");
assert(!(await chipsAt("Wilshire/Western")).includes("D Line + Wilshire/Western"), "Wilshire/Western must not offer a self chip");

// Reachability: every board row / static candidate at every fixture station maps to an offered chip,
// and so does every non-terminating trip's hand-written expected chip.
const bareOrSelfOrHub = (name, chip) =>
  bareLineChip.test(chip) || foldKey(chip.split(" + ")[1] ?? "") === foldKey(name) || foldKey(chip.split(" + ")[1] ?? "") === foldKey(LOS_ANGELES_HUB);
const cStationNames = ["Union Station", LOS_ANGELES_HUB, "Wilshire/Vermont", "Wilshire/Western", "Wilshire/La Cienega", "North Hollywood", "Downtown Long Beach", "Pomona North", "Monrovia", "Arcadia"];
const chipBoards = new Map();
for (const name of cStationNames) {
  const chips = await chipsAt(name);
  const cBoard = await composeStationBoard(name, chipStatic, chipRealtime, { now: nowPdt });
  chipBoards.set(name, cBoard);
  for (const c of chips) assert(!bareOrSelfOrHub(name, c), `${name}: chip "${c}" is bare, self or hub`);
  for (const row of [...cBoard.scheduledCandidates, ...cBoard.trips]) {
    assert(chips.includes(row.destination), `${name}: board destination "${row.destination}" is not reachable through any chip [${chips.join(", ")}]`);
  }
  const stopIds = new Set(await resolveStopIds(name, chipStatic));
  for (const [tripId, , , expected, calls] of cTrips) {
    const callsHere = calls.findIndex(([stopId]) => stopIds.has(stopId));
    if (callsHere === -1 || callsHere === calls.length - 1) continue; // not served here, or terminates here
    assert(chips.includes(expected), `${name}: trip ${tripId} (${expected}) is not reachable through any chip [${chips.join(", ")}]`);
  }
}

// Every offered chip returns trips or carries an honest emptyReason (never silent).
const chipNext = (name, chip) =>
  buildLosAngelesNextTrainFromBoard(chipBoards.get(name), { station: name, destination: chip, leaveBeforeMinutes: 0, refreshSeconds: 60, now: nowPdt });
for (const name of cStationNames) {
  for (const chip of await chipsAt(name)) {
    const res = chipNext(name, chip);
    assert(res.upcoming.length > 0 || ["no-live-predictions", "not-currently-served"].includes(res.emptyReason), `${name} + "${chip}": zero rows with no emptyReason (silent empty chip)`);
  }
}
const unionWest = chipNext("Union Station", "D Line + Wilshire/Western");
assert(unionWest.next != null && !unionWest.emptyReason, "Union Station D + Wilshire/Western has a live row and no emptyReason");
const unionLaCienega = chipNext("Union Station", "D Line + Wilshire/La Cienega");
assert(unionLaCienega.emptyReason === "not-currently-served", `D + La Cienega runs only from 1 Nov: not-currently-served, got ${unionLaCienega.emptyReason}`);
const unionMonrovia = chipNext("Union Station", "A Line + Monrovia");
assert(unionMonrovia.emptyReason === "no-live-predictions", `scheduled A + Monrovia with no live row: no-live-predictions, got ${unionMonrovia.emptyReason}`);
const unionNh = chipNext("Union Station", "B Line + North Hollywood");
assert(unionNh.emptyReason === "no-live-predictions", "B + North Hollywood scheduled, other directions live: still per-direction no-live-predictions");
const arcPom = chipNext("Arcadia", "A Line + Pomona North");
assert(arcPom.next != null && !arcPom.emptyReason, "Arcadia A + Pomona North has its live row");

// Dispatch wired regardless of status (production routes gate on assertCityLive first); the static
// loader is stubbed so the gate never touches the network.
setLosAngelesStaticLoader(async () => chipStatic);
const dogfoodHubChips = await getLosAngelesDogfoodDirections(LOS_ANGELES_HUB);
assert(dogfoodHubChips.source === "los-angeles-marketing-ends", "directions source must be los-angeles-marketing-ends");
assert(JSON.stringify(dogfoodHubChips.directions) === JSON.stringify(hubChipsS), "dogfood directions must be the static-derived chips");
const dispatched = await getMultiCityDirections("los-angeles", LOS_ANGELES_HUB);
assert(JSON.stringify(dispatched.directions) === JSON.stringify(dogfoodHubChips.directions), "live-city-api dispatch must return the same chips as the dogfood harness");
setLosAngelesStaticLoader(async () => { throw new Error("static feed unavailable"); });
const warnSaved = console.warn;
console.warn = () => {};
const fallbackChips = await getLosAngelesDogfoodDirections(LOS_ANGELES_HUB);
console.warn = warnSaved;
assert(JSON.stringify(fallbackChips.directions) === JSON.stringify(marketingLabelsForStation(LOS_ANGELES_HUB)), "if the static feed is unavailable, directions degrade to the printed primary chips");
setLosAngelesStaticLoader(null);
const savedSwiftlyKey = process.env.SWIFTLY_API_KEY;
delete process.env.SWIFTLY_API_KEY;
try {
  const nextTrainCalls = [
    () => getMultiCityNextTrain("los-angeles", { station: LOS_ANGELES_HUB, destination: "A Line + Pomona North", leaveBeforeMinutes: 5, refreshSeconds: 60 }),
    () => getLosAngelesDogfoodNextTrain({ station: LOS_ANGELES_HUB, destination: "A Line + Pomona North", leaveBeforeMinutes: 5, refreshSeconds: 60 }),
  ];
  for (const call of nextTrainCalls) {
    let threw = false;
    try {
      await call();
    } catch (err) {
      threw = err instanceof MissingSwiftlyApiKeyError;
    }
    assert(threw, "next-train must surface MissingSwiftlyApiKeyError, not a silent fallback board");
  }
} finally {
  if (savedSwiftlyKey !== undefined) process.env.SWIFTLY_API_KEY = savedSwiftlyKey;
}

// 3. Coordinates (LA Metro gtfs_rail stops.txt) inside the bounds box.
assert(Boolean(CITY_BOUNDS["los-angeles"]), "lib/cities/city-bounds.js must carry a los-angeles box");
const box = CITY_BOUNDS["los-angeles"];
const dogfoodStations = listLosAngelesDogfoodStations();
assert(dogfoodStations.length === 110, "dogfood station list must carry all 110 stations");
for (const st of dogfoodStations) {
  assert(Number.isFinite(st.lat) && Number.isFinite(st.lng), `${st.name}: missing lat/lng`);
  assert(
    st.lat >= box.minLat && st.lat <= box.maxLat && st.lng >= box.minLng && st.lng <= box.maxLng,
    `${st.name}: outside the los-angeles bounds box`
  );
}

// 4. Coverage notes: Metro Rail in; the three Wilshire D stations kept in the catalog, not excluded.
const coverage = JSON.parse(readFileSync(join(ROOT, "lib/cities/los-angeles/coverage.json"), "utf8"));
assert(coverage.region === "los-angeles", "coverage.json region must be los-angeles");
assert(
  coverage.covered.some((c) => /Metro Rail/.test(c.label) && /La Brea/.test(c.detail) && /1 November/.test(c.detail)),
  "coverage.json must record the three Wilshire D stations as in-catalog, not served until 1 November"
);
assert(
  coverage.notCovered.some((c) => /Metrolink/.test(c.label)) && coverage.notCovered.some((c) => /bus/i.test(c.label)),
  "coverage.json must record Metrolink and buses as not covered"
);
for (const name of ["Wilshire/La Brea", "Wilshire/Fairfax", "Wilshire/La Cienega"]) {
  assert(byName.has(name), `${name} must stay in the catalog`);
}

// 4b. The live sweep's per-board assertions (qa/los-angeles-all-stations-live-sweep.mjs) proven on
// fixtures, since the sweep itself needs a key and LA service hours.
const okRow = { destination: "D Line + Union Station" };
assert(sweepCheckBoard("Wilshire/Western", { realtime: true, trips: [okRow] }).length === 0, "sweep: a clean live board has no violations");
assert(sweepCheckBoard("Wilshire/Western", { realtime: true, trips: [{ destination: "D Line" }] }).length > 0, "sweep: a bare line chip is a violation");
assert(sweepCheckBoard("Wilshire/Western", { realtime: true, trips: [{ destination: "D Line + Wilshire/Western" }] }).length > 0, "sweep: a self-terminus row is a violation");
assert(sweepCheckBoard("Wilshire/Western", { realtime: true, trips: [] }).length > 0, "sweep: a silent empty board (no emptyReason) is a violation");
assert(sweepCheckBoard("Wilshire/Western", { realtime: true, trips: [], emptyReason: "no-live-predictions" }).length === 0, "sweep: an honest no-live-predictions empty board is fine");
assert(sweepCheckBoard("Wilshire/Western", { realtime: true, trips: [], emptyReason: "not-currently-served" }).length > 0, "sweep: not-currently-served at an undocumented station is a violation");
assert(sweepCheckBoard("Wilshire/La Brea", { realtime: true, trips: [], emptyReason: "not-currently-served" }).length === 0, "sweep: not-currently-served at a documented station is fine");
assert(DOCUMENTED_NOT_SERVED.size === 3 && [...DOCUMENTED_NOT_SERVED].every((n) => byName.has(n)), "sweep's documented not-served set is the three in-catalog Wilshire D stations");

// 5. Picker/manifest: no picker entry while planned; the flip commit adds it.
const manifestIds = buildCityManifest().cities.map((c) => c.id);
assert(
  manifestIds.includes("los-angeles") === laIsLive,
  laIsLive ? "the /api/cities manifest must list Los Angeles now that it is live" : "the /api/cities manifest must not list Los Angeles while planned"
);

console.log(
  "los-angeles-dogfood-gate: ok (status-agnostic, dispatch + dogfood module wired, emptyReason pass-through gated, bounds + 110 coordinates, coverage notes, MULTI_CITY_IDS/manifest tracking status, adapterReady, D1 pack, 110 stations, hub 7th St/Metro Ctr locked to A/B/D/E, doNotGroup pairs enforced, line+terminus direction model, hub never a direction token, missing-key throws without network, exact station matching with no doNotGroup overlap, scheduled-only/SKIPPED rows never shown, board realtime:true, no bare line chip at any of 110 stations, terminating-here trips excluded, unresolvable terminus dropped, honest empty state (not-currently-served / no-live-predictions / none / throw-safe), Perth Australia green)"
);
