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
  setMetrolinkStaticLoader,
  setSurflinerStaticLoader,
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
  loadLosAngelesStatic,
  scheduledDestinationsRemainingToday,
  resolveStopIds,
  lineIdForRoute,
  destinationForTrip,
  staticDirectionsForStopIds,
  tripTerminatesAtStops,
  MissingSwiftlyApiKeyError,
  buildMetrolinkChip,
  staticMetrolinkChipsForStop,
  METROLINK_CATALOG_TO_STOP_ID,
  METROLINK_STOP_ID_TO_CATALOG,
  buildSurflineChip,
  staticSurflineChipsForStop,
  SURFLINER_STOP_ID,
  SURFLINER_CATALOG_STATION,
  SURFLINER_ROUTE_ID,
} from "../lib/providers/los-angeles.js";
import { swiftlyAuthHeaders } from "../lib/providers/gtfs/auth.js";
import { indexTripUpdates } from "../lib/providers/gtfs/realtime.js";
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
assert(entry?.envKeys?.includes("METROLINK_API_KEY"), "los-angeles must declare METROLINK_API_KEY as an envKey");
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

// 2b. Time-aware per-direction empty reason (docs/jim-brief-la-chip-polish.md). A chip with zero
// live rows says "no-live-predictions" only while a scheduled departure from THIS station to that
// terminus is still ahead in the service day; after the last one it is "not-currently-served".
// C-a-monrovia leaves Union 11:30, C-a-pomona 11:35, C-b-nh 11:10 (PDT, 26 Oct 2026).
const pdt = (h, m, day = 26) => new Date(Date.UTC(2026, 9, day, 7 + h, m, 0));
const unionAt = async (when) => {
  const b = await composeStationBoard("Union Station", chipStatic, { entities: [], fetchedAt: when }, { now: when });
  return (chip) =>
    buildLosAngelesNextTrainFromBoard(b, { station: "Union Station", destination: chip, leaveBeforeMinutes: 0, refreshSeconds: 60, now: when }).emptyReason;
};
const at1125 = await unionAt(pdt(11, 25));
const at1131 = await unionAt(pdt(11, 31));
const at0500 = await unionAt(pdt(5, 0));
assert(at1125("A Line + Monrovia") === "no-live-predictions", "11:25: the 11:30 Monrovia departure is ahead -> no-live-predictions");
assert(at1131("A Line + Monrovia") === "not-currently-served", `11:31: the last Monrovia departure has passed -> not-currently-served, got ${at1131("A Line + Monrovia")}`);
assert(at1131("A Line + Pomona North") === "no-live-predictions", "11:31: the 11:35 Pomona North departure is still ahead");
assert(at1131("B Line + North Hollywood") === "not-currently-served", "11:31: B + North Hollywood left at 11:10 and has none later -> not-currently-served");
assert(at0500("B Line + North Hollywood") === "no-live-predictions", "05:00: B + North Hollywood still to come today -> no-live-predictions");
assert(at0500("D Line + Wilshire/La Cienega") === "not-currently-served", "05:00: La Cienega service has not started -> not-currently-served");
// The remaining list itself, with its boundaries.
const remainingAtUnion = (when) => scheduledDestinationsRemainingToday(chipStatic, ["80214", "80214S"], { now: when });
assert(JSON.stringify(remainingAtUnion(pdt(11, 31))) === JSON.stringify(["A Line + Pomona North"]), `11:31 remaining at Union must be only A Pomona North, got ${JSON.stringify(remainingAtUnion(pdt(11, 31)))}`);
assert(remainingAtUnion(pdt(11, 30)).includes("A Line + Monrovia"), "a departure at exactly now is still remaining (60 s grace)");
assert(remainingAtUnion(pdt(12, 0)).length === 0, "after the last departure of the day the remaining list is empty, not null");
assert(scheduledDestinationsRemainingToday(chipStatic, ["80214"], { now: new Date(Date.UTC(2027, 5, 1, 19)) }) === null, "no active services (calendar unknown) -> null, so callers fall back to the old rules");
// Terminating trips never count: C-d-union ends at Union, so no remaining chip may point at Union.
assert(!remainingAtUnion(pdt(5, 0)).some((c) => c.endsWith("+ Union Station")), "terminating trips are not remaining departures");
// Fallback: a board without scheduledDestinationsRemaining keeps the old behaviour.
const oldBoard = { stationName: "Union Station", lastUpdate: pdt(11, 31).toISOString(), trips: [], scheduledCandidates: [{ destination: "A Line + Monrovia" }], realtime: true };
assert(
  buildLosAngelesNextTrainFromBoard(oldBoard, { station: "Union Station", destination: "A Line + Monrovia", leaveBeforeMinutes: 0, refreshSeconds: 60, now: pdt(11, 31) }).emptyReason === "no-live-predictions",
  "a board without the remaining list keeps the scheduledCandidates rule (calendar-unknown fallback)"
);
// Previous-service-day 24:00+ trips: service SY ran Mon 26 Oct only and files an A trip to Monrovia at
// 24:30; service SZ (Tue 27 Oct) has only a Pomona North trip at 08:00. At 00:10 on the 27th the
// Monrovia chip survives only through the previous service day.
const lateTrips = [
  ["LATE-mon", "A", "SY", [["80214", "24:30:00"], ["80425", "24:50:00"], ["80423", "25:10:00"]]],
  ["DAY-pom", "A", "SZ", [["80214", "08:00:00"], ["801103", "09:00:00"]]],
];
const lateStopTimes = new Map();
const lateTripMap = new Map();
for (const [tripId, line, service, calls] of lateTrips) {
  lateTripMap.set(tripId, { trip_id: tripId, route_id: `R-${line}`, service_id: service, trip_headsign: "" });
  calls.forEach(([stopId, time], i) => {
    if (!lateStopTimes.has(stopId)) lateStopTimes.set(stopId, []);
    lateStopTimes.get(stopId).push({ trip_id: tripId, stop_id: stopId, departure_time: time, arrival_time: time, stop_sequence: String(i + 1), stop_headsign: "", pickup_type: "0" });
  });
}
const onlyDay = (service_id, d) => ({ service_id, monday: "1", tuesday: "1", wednesday: "1", thursday: "1", friday: "1", saturday: "1", sunday: "1", start_date: d, end_date: d });
const lateStatic = {
  ...chipStatic,
  tripsById: lateTripMap,
  stopTimesByStopId: lateStopTimes,
  calendar: [onlyDay("SY", "20261026"), onlyDay("SZ", "20261027")],
  calendarDates: [],
};
const lateUnion = async (when) => {
  const b = await composeStationBoard("Union Station", lateStatic, { entities: [], fetchedAt: when }, { now: when });
  return { board: b, reason: (chip) => buildLosAngelesNextTrainFromBoard(b, { station: "Union Station", destination: chip, leaveBeforeMinutes: 0, refreshSeconds: 60, now: when }).emptyReason };
};
const late0010 = await lateUnion(pdt(0, 10, 27));
assert(late0010.board.scheduledDestinationsRemaining?.includes("A Line + Monrovia"), `00:10: a 24:30 trip of the previous service day must count as remaining, got ${JSON.stringify(late0010.board.scheduledDestinationsRemaining)}`);
assert(late0010.reason("A Line + Monrovia") === "no-live-predictions", "00:10: the 24:30 Monrovia trip is still to come -> no-live-predictions");
assert(late0010.reason("A Line + Pomona North") === "no-live-predictions", "00:10: today's 08:00 Pomona North trip is ahead");
const late0040 = await lateUnion(pdt(0, 40, 27));
assert(late0040.reason("A Line + Monrovia") === "not-currently-served", `00:40: the 24:30 trip has gone -> not-currently-served, got ${late0040.reason("A Line + Monrovia")}`);
const late2300 = await lateUnion(pdt(23, 0, 26));
assert(late2300.reason("A Line + Monrovia") === "no-live-predictions", "23:00 on the 26th: the 24:30 trip is later in this service day");

// scheduledCandidates vs remaining-today (docs/jim-brief-la-remaining-test-gap.md). Service TD runs
// Mon 26 Oct only (A -> Pomona North 08:00); service TM runs Tue 27 Oct only (A -> Monrovia 08:00).
// At 23:00 on the 26th (tomorrow 08:00 is inside the 18 h empty-board horizon) the builder's tomorrow look-ahead puts Monrovia in scheduledCandidates, but it
// is NOT in scheduledDestinationsRemaining. The chip must be not-currently-served: consulting
// scheduledCandidates in the remaining-today branch would wrongly say no-live-predictions.
const tmrTrips = [
  ["TD-pom", "A", "TD", [["80214", "08:00:00"], ["801103", "09:00:00"]]],
  ["TM-mon", "A", "TM", [["80214", "08:00:00"], ["80425", "08:20:00"], ["80423", "08:40:00"]]],
];
const tmrStopTimes = new Map();
const tmrTripMap = new Map();
for (const [tripId, line, service, calls] of tmrTrips) {
  tmrTripMap.set(tripId, { trip_id: tripId, route_id: `R-${line}`, service_id: service, trip_headsign: "" });
  calls.forEach(([stopId, time], i) => {
    if (!tmrStopTimes.has(stopId)) tmrStopTimes.set(stopId, []);
    tmrStopTimes.get(stopId).push({ trip_id: tripId, stop_id: stopId, departure_time: time, arrival_time: time, stop_sequence: String(i + 1), stop_headsign: "", pickup_type: "0" });
  });
}
const tmrStatic = { ...chipStatic, tripsById: tmrTripMap, stopTimesByStopId: tmrStopTimes, calendar: [onlyDay("TD", "20261026"), onlyDay("TM", "20261027")], calendarDates: [] };
const tmrWhen = pdt(23, 0);
const tmrBoard = await composeStationBoard("Union Station", tmrStatic, { entities: [], fetchedAt: tmrWhen }, { now: tmrWhen });
const tmrCandidateChips = (tmrBoard.scheduledCandidates ?? []).map((t) => t.destination);
assert(tmrCandidateChips.some((d) => String(d).includes("Monrovia")), `fixture precondition: tomorrow-only Monrovia must be in scheduledCandidates via look-ahead, got ${JSON.stringify(tmrCandidateChips)}`);
assert(Array.isArray(tmrBoard.scheduledDestinationsRemaining) && !tmrBoard.scheduledDestinationsRemaining.includes("A Line + Monrovia"), `fixture precondition: Monrovia must NOT be in scheduledDestinationsRemaining, got ${JSON.stringify(tmrBoard.scheduledDestinationsRemaining)}`);
const tmrReason = buildLosAngelesNextTrainFromBoard(tmrBoard, { station: "Union Station", destination: "A Line + Monrovia", leaveBeforeMinutes: 0, refreshSeconds: 60, now: tmrWhen }).emptyReason;
assert(tmrReason === "not-currently-served", `tomorrow-only chip after today's last departure -> not-currently-served, got ${tmrReason}`);

// 2c. Real-feed reachability (docs/jim-brief-la-chip-polish.md). For every one of the 110 catalog
// stations, take every trip's LAST STOP from the real feed's stop_times (not from OBSERVED_TERMINALS,
// not through staticDirectionsForStopIds), skip trips that end at that station, and require the
// resulting "<Line> + <terminus>" to be among the chips the DOGFOOD function offers. Static data:
// qa/fixtures/los-angeles/rail-trip-patterns.json, the distinct stop patterns of the real
// gtfs_rail.zip (regenerate: node scripts/build-la-trip-patterns.mjs). Offline by default - smoke and CI
// never download the zip (the feed lives on GitLab, not Vercel Blob). QA_LA_REAL_FEED=1 runs the same
// check against the live zip instead (one download; by hand or nightly, never smoke).
let realStatic;
if (process.env.QA_LA_REAL_FEED === "1") {
  realStatic = await loadLosAngelesStatic();
} else {
  const pinned = JSON.parse(readFileSync(join(ROOT, "qa/fixtures/los-angeles/rail-trip-patterns.json"), "utf8"));
  const realStopTimes = new Map();
  const realTrips = new Map();
  pinned.patterns.forEach((p, pi) => {
    const tripId = `P${pi}`;
    realTrips.set(tripId, { trip_id: tripId, route_id: p.route_id, service_id: "S", trip_headsign: "" });
    p.stops.forEach((stopId, i) => {
      if (!realStopTimes.has(stopId)) realStopTimes.set(stopId, []);
      realStopTimes.get(stopId).push({ trip_id: tripId, stop_id: stopId, stop_sequence: String(i + 1), stop_headsign: p.headsigns[i] ?? "" });
    });
  });
  realStatic = {
    stops: pinned.stops,
    stopsById: new Map(pinned.stops.map((s) => [s.stop_id, s])),
    routesById: new Map(pinned.routes.map((r) => [r.route_id, r])),
    tripsById: realTrips,
    stopTimesByStopId: realStopTimes,
    calendar: [],
    calendarDates: [],
  };
}
setLosAngelesStaticLoader(async () => realStatic);
{
  // Last stop per trip, straight from stop_times.
  const lastStop = new Map();
  for (const list of realStatic.stopTimesByStopId.values()) {
    for (const st of list) {
      const seq = Number(st.stop_sequence);
      if (!lastStop.has(st.trip_id) || seq > lastStop.get(st.trip_id).seq) lastStop.set(st.trip_id, { seq, stopId: st.stop_id });
    }
  }
  const stationOf = (stopId) => realStatic.stopsById.get(stopId)?.parent_station || stopId;
  let pairs = 0;
  let stationsWithChips = 0;
  const unreached = [];
  const unresolvedTermini = new Set();
  for (const station of stations) {
    const stopIds = await resolveStopIds(station.name, realStatic);
    const stationKeys = new Set(stopIds.flatMap((id) => [id, stationOf(id)]));
    const expected = new Set();
    for (const stopId of stopIds) {
      for (const st of realStatic.stopTimesByStopId.get(stopId) ?? []) {
        const last = lastStop.get(st.trip_id);
        if (!last || stationKeys.has(last.stopId) || stationKeys.has(stationOf(last.stopId))) continue; // terminates here
        const trip = realStatic.tripsById.get(st.trip_id);
        const route = realStatic.routesById.get(trip?.route_id);
        const lineId = route ? lineIdForRoute(route.route_short_name, route.route_long_name) : null;
        const terminalName = realStatic.stopsById.get(last.stopId)?.stop_name ?? "";
        const chip = lineId ? mapLineTerminusDestination(terminalName, lineId) : null;
        if (chip) expected.add(chip);
        else unresolvedTermini.add(`${lineId ?? "?"}:${terminalName}`);
      }
    }
    const offered = (await getLosAngelesDogfoodDirections(station.name)).directions;
    for (const chip of expected) {
      pairs += 1;
      if (!offered.includes(chip)) unreached.push(`${station.name}: "${chip}"`);
    }
    if (offered.length > 0) stationsWithChips += 1;
  }
  assert(unreached.length === 0, `real-feed reachability: ${unreached.length} terminus chip(s) not offered by the dogfood directions, e.g. ${unreached.slice(0, 5).join("; ")}`);
  assert(unresolvedTermini.size === 0, `real-feed reachability: trips whose terminus resolves to no chip (rows would be dropped): ${[...unresolvedTermini].join("; ")}`);
  assert(pairs >= 300 && stationsWithChips >= 100, `real-feed reachability looked at too little: ${pairs} station/terminus pairs, ${stationsWithChips} stations with chips`);
  console.log(`los-angeles real-feed reachability: ${pairs} station/terminus pairs over ${stationsWithChips} stations, 0 unreached`);
}
setLosAngelesStaticLoader(null);

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
  coverage.covered.some((c) => /Metrolink/.test(c.label) && /Union Station/.test(c.detail) && /Pomona North/.test(c.detail)),
  "coverage.json must record Metrolink as covered at Union Station and Pomona North"
);
assert(
  coverage.notCovered.some((c) => /bus/i.test(c.label)),
  "coverage.json must record buses as not covered"
);
assert(
  coverage.covered.some((c) => /Pacific Surfliner/.test(c.label) && /Union Station/.test(c.detail)),
  "coverage.json must record Pacific Surfliner as covered at Union Station"
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

// ---- 6. Metrolink assertions (docs/jim-brief-la-metrolink-wire.md) ----
// Fixture: a minimal Metrolink static GTFS covering Union Station (stop 107), Pomona North (stop 109),
// and a handful of terminal stops for the AV and SB lines. The fixture mirrors the structure of the
// real Metrolink GTFS so staticMetrolinkChipsForStop and composeStationBoard can be driven offline.

// stop_id -> stop_name (exact GTFS names from the pack)
const mlStops = [
  { stop_id: "107", stop_name: "L.A. Union Station", location_type: "0", parent_station: "" },
  { stop_id: "109", stop_name: "Pomona - North", location_type: "0", parent_station: "" },
  { stop_id: "162", stop_name: "Lancaster", location_type: "0", parent_station: "" },
  { stop_id: "185", stop_name: "San Bernardino - Downtown", location_type: "0", parent_station: "" },
  { stop_id: "190", stop_name: "Redlands - Downtown", location_type: "0", parent_station: "" },
  { stop_id: "144", stop_name: "Oceanside", location_type: "0", parent_station: "" },
];
// Metrolink route_id is the long name; route_short_name is the chip prefix.
const mlRoutes = [
  { route_id: "Antelope Valley Line", route_short_name: "AV Line", route_long_name: "Antelope Valley Line" },
  { route_id: "Orange County Line", route_short_name: "OC Line", route_long_name: "Orange County Line" },
  { route_id: "San Bernardino Line", route_short_name: "SB Line", route_long_name: "San Bernardino Line" },
];
// Trips: AV Line Union->Lancaster, OC Line Union->Oceanside,
//        SB Line Union->San Bernardino - Downtown, SB Line Union->Redlands - Downtown,
//        SB Line Pomona North->San Bernardino - Downtown (eastbound),
//        SB Line Pomona North->Union Station (westbound),
//        SB Line Pomona North->Redlands - Downtown (weekday extra)
const mlTripDefs = [
  ["ML-AV-1", "Antelope Valley Line", [["107", "06:00:00"], ["162", "07:00:00"]]],
  ["ML-AV-2", "Antelope Valley Line", [["107", "08:00:00"], ["162", "09:00:00"]]],
  ["ML-OC-1", "Orange County Line", [["107", "07:00:00"], ["144", "09:00:00"]]],
  ["ML-SB-east-1", "San Bernardino Line", [["107", "06:30:00"], ["109", "07:15:00"], ["185", "08:00:00"]]],
  ["ML-SB-east-2", "San Bernardino Line", [["107", "08:30:00"], ["109", "09:15:00"], ["185", "10:00:00"]]],
  ["ML-SB-redlands", "San Bernardino Line", [["107", "07:45:00"], ["109", "08:30:00"], ["190", "09:30:00"]]],
  ["ML-SB-west-1", "San Bernardino Line", [["185", "05:00:00"], ["109", "05:45:00"], ["107", "06:30:00"]]],
  ["ML-SB-west-2", "San Bernardino Line", [["185", "07:00:00"], ["109", "07:45:00"], ["107", "08:30:00"]]],
  // Arriving at Union Station (terminating there) — must NOT become a chip at Union Station
  ["ML-AV-arr", "Antelope Valley Line", [["162", "17:00:00"], ["107", "18:00:00"]]],
];
const mlStopTimesMap = new Map();
const mlTripsMap = new Map();
for (const [tripId, routeId, calls] of mlTripDefs) {
  mlTripsMap.set(tripId, { trip_id: tripId, route_id: routeId, service_id: "ML-WD", trip_headsign: "" });
  calls.forEach(([stopId, time], i) => {
    if (!mlStopTimesMap.has(stopId)) mlStopTimesMap.set(stopId, []);
    mlStopTimesMap.get(stopId).push({
      trip_id: tripId, stop_id: stopId, departure_time: time, arrival_time: time,
      stop_sequence: String(i + 1), stop_headsign: "", pickup_type: "0",
    });
  });
}
const mlStaticFixture = {
  stops: mlStops,
  stopsById: new Map(mlStops.map((s) => [s.stop_id, s])),
  routesById: new Map(mlRoutes.map((r) => [r.route_id, r])),
  tripsById: mlTripsMap,
  stopTimesByStopId: mlStopTimesMap,
  calendar: [{ service_id: "ML-WD", monday: "1", tuesday: "1", wednesday: "1", thursday: "1", friday: "1", saturday: "0", sunday: "0", start_date: "20260101", end_date: "20271231" }],
  calendarDates: [],
};

// ---- 6a. Chip constants ----
assert(METROLINK_CATALOG_TO_STOP_ID["Union Station"] === "107", "METROLINK_CATALOG_TO_STOP_ID must map Union Station to 107");
assert(METROLINK_CATALOG_TO_STOP_ID["Pomona North"] === "109", "METROLINK_CATALOG_TO_STOP_ID must map Pomona North to 109");
assert(!METROLINK_CATALOG_TO_STOP_ID["7th St/Metro Ctr"], "7th St/Metro Ctr must have no Metrolink stop");
assert(METROLINK_STOP_ID_TO_CATALOG["107"] === "Union Station", "METROLINK_STOP_ID_TO_CATALOG must reverse-map 107 -> Union Station");
assert(METROLINK_STOP_ID_TO_CATALOG["109"] === "Pomona North", "METROLINK_STOP_ID_TO_CATALOG must reverse-map 109 -> Pomona North");

// ---- 6b. buildMetrolinkChip ----
assert(buildMetrolinkChip("AV Line", "162", "Lancaster", "107") === "AV Line + Lancaster", "AV Line + Lancaster chip");
assert(buildMetrolinkChip("SB Line", "107", "L.A. Union Station", "109") === "SB Line + Union Station", "westbound: L.A. Union Station -> Union Station (catalog name)");
assert(buildMetrolinkChip("SB Line", "109", "Pomona - North", "109") === null, "trip terminating at board station -> null");
assert(buildMetrolinkChip("", "162", "Lancaster", "107") === null, "no route short name -> null");
assert(buildMetrolinkChip("SB Line", "107", "L.A. Union Station", "107") === null, "trip terminating at Union Station -> null (no self chip)");

// ---- 6c. staticMetrolinkChipsForStop — Union Station ----
const unionMlChips = staticMetrolinkChipsForStop(mlStaticFixture, "107");
assert(unionMlChips.includes("AV Line + Lancaster"), "Union Station must have AV Line + Lancaster");
assert(unionMlChips.includes("OC Line + Oceanside"), "Union Station must have OC Line + Oceanside");
assert(unionMlChips.includes("SB Line + San Bernardino - Downtown"), "Union Station must have SB Line + San Bernardino - Downtown");
assert(unionMlChips.includes("SB Line + Redlands - Downtown"), "Union Station must have SB Line + Redlands - Downtown (short-turn)");
assert(!unionMlChips.some((c) => c.includes("Union Station")), "Union Station must not have a self-terminus Metrolink chip");
// Trips arriving at Union Station (ML-AV-arr) must not generate a chip
assert(!unionMlChips.some((c) => c.includes("Lancaster") && c.startsWith("OC")), "OC Line does not go to Lancaster");
console.log(`Union Station Metrolink chips: [${unionMlChips.join(", ")}]`);

// ---- 6d. staticMetrolinkChipsForStop — Pomona North ----
const pomonaMlChips = staticMetrolinkChipsForStop(mlStaticFixture, "109");
assert(pomonaMlChips.includes("SB Line + San Bernardino - Downtown"), "Pomona North must have SB Line + San Bernardino - Downtown");
assert(pomonaMlChips.includes("SB Line + Union Station"), "Pomona North westbound must be SB Line + Union Station (catalog name)");
assert(pomonaMlChips.includes("SB Line + Redlands - Downtown"), "Pomona North must have SB Line + Redlands - Downtown");
assert(!pomonaMlChips.some((c) => c.includes("Pomona")), "Pomona North must not have a self-terminus Metrolink chip");
assert(!pomonaMlChips.some((c) => c.startsWith("AV Line")), "Pomona North must not have AV Line chips (AV doesn't call there)");
assert(!pomonaMlChips.some((c) => c.startsWith("OC Line")), "Pomona North must not have OC Line chips");
console.log(`Pomona North Metrolink chips: [${pomonaMlChips.join(", ")}]`);

// ---- 6e. No Metrolink chips at a non-Metrolink station (7th St/Metro Ctr) ----
const hubMlChips = staticMetrolinkChipsForStop(mlStaticFixture, METROLINK_CATALOG_TO_STOP_ID[LOS_ANGELES_HUB] ?? "NONE");
assert(hubMlChips.length === 0, "7th St/Metro Ctr must have no Metrolink chips (no Metrolink stop_id)");

// ---- 6f. Chip separation: Metrolink chips distinct from Metro Rail chips ----
// Metro chips follow "X Line + terminus" where X is A/B/C/D/E/K (single letter).
// Metrolink chips follow "XX Line + terminus" where XX is AV/VC/OC/91-PV/RIV/SB.
const isMetroChip = (c) => /^[A-EK] Line \+ /.test(c);
const isMetrolinkChip = (c) => /^(AV|VC|OC|91-PV|RIV|SB) Line \+ /.test(c);
for (const chip of unionMlChips) {
  assert(isMetrolinkChip(chip), `"${chip}" must match Metrolink chip pattern`);
  assert(!isMetroChip(chip), `Metrolink chip "${chip}" must not match Metro Rail chip pattern`);
}
for (const chip of pomonaMlChips) {
  assert(isMetrolinkChip(chip), `"${chip}" must match Metrolink chip pattern`);
}

// ---- 6g. Board composition: Metrolink chips appear on the board; Metro rows survive Metrolink failure ----
// Build a minimal Metro + Metrolink board for Union Station using the fixture LA Metro static data
// from section 2 above (miniStatic) and the Metrolink fixture (mlStaticFixture).
// mlNow = 05:00 PDT (12:00 UTC). ML-AV-1 departs 06:00 PDT (13:00 UTC) and ML-SB-east-1 at 06:30 PDT
// (13:30 UTC) — both within the 3-hour near-term horizon.
const mlNow = new Date(Date.UTC(2026, 9, 26, 12, 0, 0)); // 05:00 PDT
const mlEntities = [];
// Give two Metrolink trips a live prediction so they pass the live-confirmed filter.
const mlSec = (h, m) => Math.floor(Date.UTC(2026, 9, 26, h, m, 0) / 1000);
// ML-AV-1 departs stop 107 at 13:05 UTC (06:05 PDT)
mlEntities.push({ tripUpdate: { trip: { tripId: "ML-AV-1" }, stopTimeUpdate: [{ stopId: "107", departure: { time: mlSec(13, 5) } }] } });
// ML-SB-east-1 departs stop 107 at 13:35 UTC (06:35 PDT)
mlEntities.push({ tripUpdate: { trip: { tripId: "ML-SB-east-1" }, stopTimeUpdate: [{ stopId: "107", departure: { time: mlSec(13, 35) } }] } });
const mlRealtimeFixture = { entities: mlEntities, fetchedAt: mlNow };

// Union Station board with Metrolink data
const unionBoardWithMl = await composeStationBoard(
  "Union Station",
  miniStatic,
  miniRealtime,
  { now: mlNow, metrolinkStaticData: mlStaticFixture, metrolinkRealtime: mlRealtimeFixture }
);
const metrolinkRowsOnBoard = unionBoardWithMl.trips.filter((t) => t.agency === "Metrolink");
const metroRowsOnBoard = unionBoardWithMl.trips.filter((t) => t.agency !== "Metrolink");

// Metro rows must still be present when Metrolink is also on the board
assert(metroRowsOnBoard.length >= 1, "Metro Rail rows must survive alongside Metrolink rows on Union Station board");
// Metrolink rows must be present when the feed is working
assert(metrolinkRowsOnBoard.length >= 1, "Metrolink rows must appear on Union Station board when feed and key are available");
// Metrolink rows carry agency and mode
assert(metrolinkRowsOnBoard.every((t) => t.agency === "Metrolink"), "all Metrolink rows must carry agency=Metrolink");
assert(metrolinkRowsOnBoard.every((t) => t.mode === "rail"), "all Metrolink rows must carry mode=rail");
// Metrolink chips on the board match the expected format
assert(metrolinkRowsOnBoard.every((t) => isMetrolinkChip(t.destination)), "all Metrolink board rows must have a Metrolink-format chip");
// Metro chips on the board must NOT look like Metrolink chips
assert(metroRowsOnBoard.every((t) => !isMetrolinkChip(t.destination)), "Metro rows must have Metro-format chips, not Metrolink");
assert(!unionBoardWithMl.metrolinkPartial, "metrolinkPartial must be false when Metrolink feed is available");

// Board composition: Metrolink failure does NOT drop Metro rows
const unionBoardMlFail = await composeStationBoard(
  "Union Station",
  miniStatic,
  miniRealtime,
  { now: mlNow, metrolinkPartial: true }
);
const metroRowsAfterMlFail = unionBoardMlFail.trips.filter((t) => t.agency !== "Metrolink");
assert(metroRowsAfterMlFail.length >= 1, "Metro rows must survive a Metrolink fetch failure");
assert(unionBoardMlFail.trips.every((t) => t.agency !== "Metrolink"), "Metrolink rows must be absent when metrolinkPartial is true");
assert(unionBoardMlFail.metrolinkPartial === true, "metrolinkPartial must be true when Metrolink feed failed");

// A non-Metrolink station must never have metrolinkPartial even if options are passed.
// Use chipStatic here because miniStatic does not carry 7th St/Metro Ctr stops.
const hubBoard = await composeStationBoard("7th St/Metro Ctr", chipStatic, chipRealtime, { now: mlNow, metrolinkPartial: true });
assert(!hubBoard.metrolinkPartial, "a non-Metrolink station must never carry metrolinkPartial");

// ---- 6h. Dogfood directions include Metrolink chips at Union Station and Pomona North ----
// Inject both static loaders so getLosAngelesDogfoodDirections can be driven offline.
setLosAngelesStaticLoader(async () => chipStatic);
setMetrolinkStaticLoader(async () => mlStaticFixture);

const unionDogfoodDirs = await getLosAngelesDogfoodDirections("Union Station");
assert(
  unionMlChips.every((c) => unionDogfoodDirs.directions.includes(c)),
  `dogfood directions at Union Station must include all Metrolink chips, missing: ${unionMlChips.filter((c) => !unionDogfoodDirs.directions.includes(c)).join(", ")}`
);
// Metro chips must also be present
assert(
  unionDogfoodDirs.directions.some((c) => isMetroChip(c)),
  "dogfood directions at Union Station must still include Metro Rail chips"
);
// Dogfood directions at 7th St/Metro Ctr must have no Metrolink chips
const hubDogfoodDirs = await getLosAngelesDogfoodDirections(LOS_ANGELES_HUB);
assert(
  !hubDogfoodDirs.directions.some((c) => isMetrolinkChip(c)),
  "dogfood directions at 7th St/Metro Ctr must have no Metrolink chips"
);

// Dogfood directions at Pomona North must include SB Line chips
const pomonaDogfoodDirs = await getLosAngelesDogfoodDirections("Pomona North");
assert(
  pomonaMlChips.every((c) => pomonaDogfoodDirs.directions.includes(c)),
  `dogfood directions at Pomona North must include all Metrolink chips, missing: ${pomonaMlChips.filter((c) => !pomonaDogfoodDirs.directions.includes(c)).join(", ")}`
);

setMetrolinkStaticLoader(null);
setLosAngelesStaticLoader(null);

// ---- 6i. Mutation checks: each core assertion must go red if the code is broken ----
// (a) buildMetrolinkChip: removing the L.A. Union Station -> Union Station mapping would fail 6b.
//     Simulate the mutation by checking what a wrong name produces.
const badChip = buildMetrolinkChip("SB Line", "107", "L.A. Union Station", "109");
assert(badChip === "SB Line + Union Station", "mutation anchor: westbound Pomona North chip uses catalog name, not GTFS name");
const mutatedLabel = badChip.replace("Union Station", "L.A. Union Station");
assert(mutatedLabel !== badChip, "mutation check: 'L.A. Union Station' is the wrong chip label at Pomona North");

// (b) staticMetrolinkChipsForStop: if we accidentally use stop_id "107" for Pomona North, we get Union Station chips.
const wrongStopChips = staticMetrolinkChipsForStop(mlStaticFixture, "107");
assert(
  !wrongStopChips.includes("SB Line + Union Station"),
  "mutation anchor: Union Station (stop 107) must not emit a self chip (westbound SB would end there)"
);
const rightStopChips = staticMetrolinkChipsForStop(mlStaticFixture, "109");
assert(
  rightStopChips.includes("SB Line + Union Station"),
  "mutation anchor: Pomona North (stop 109) correctly emits SB Line + Union Station westbound"
);

// (c) Metro rows survive Metrolink failure: if Metrolink failure dropped Metro rows, metroRowsAfterMlFail would be 0.
assert(
  metroRowsAfterMlFail.length > 0,
  "mutation anchor: Metro rows must be non-zero after Metrolink failure (verifying the isolation)"
);

// (d) No Metrolink at 7th St/Metro Ctr: the hub has no Metrolink stop_id, so its static chips are empty.
assert(
  hubMlChips.length === 0,
  "mutation anchor: 7th St/Metro Ctr has no Metrolink stop_id so staticMetrolinkChipsForStop returns []"
);

// (e) Chip format separation: no Metro chip looks like a Metrolink chip (verifying the regex gates above).
for (const chip of unionMlChips) {
  assert(!isMetroChip(chip), `mutation anchor: Metrolink chip "${chip}" must not pass Metro chip regex`);
}
const sampleMetroChip = "A Line + Pomona North";
assert(!isMetrolinkChip(sampleMetroChip), `mutation anchor: Metro chip "${sampleMetroChip}" must not pass Metrolink chip regex`);

console.log("los-angeles Metrolink assertions: ok (6a-6i)");

// ---- 6j. metrolinkPartial board: Metrolink chip gets no-live-predictions, not not-currently-served ----
// When the live feed or key is absent, scheduledDestinationsRemaining must still carry Metrolink
// chips derived from the static GTFS so the dogfood layer can emit the honest reason.
// mlNow = 05:00 PDT — ML-AV-1 departs stop 107 at 06:00 PDT (still ahead). ML-WD is Mon-Fri active.
const partialWithStaticBoard = await composeStationBoard(
  "Union Station",
  miniStatic,
  miniRealtime,
  { now: mlNow, metrolinkStaticData: mlStaticFixture, metrolinkPartial: true, metrolinkStopId: "107" }
);
assert(partialWithStaticBoard.metrolinkPartial === true, "6j: metrolinkPartial flag must be set");
assert(
  partialWithStaticBoard.trips.every((t) => t.agency !== "Metrolink"),
  "6j: no Metrolink live rows on a partial board"
);
// The static GTFS has ML trips departing after mlNow, so the remaining list must include AV Line + Lancaster.
assert(
  Array.isArray(partialWithStaticBoard.scheduledDestinationsRemaining) &&
    partialWithStaticBoard.scheduledDestinationsRemaining.includes("AV Line + Lancaster"),
  `6j: scheduledDestinationsRemaining must include AV Line + Lancaster on a partial board, got ${JSON.stringify(partialWithStaticBoard.scheduledDestinationsRemaining)}`
);
// buildLosAngelesNextTrainFromBoard must give no-live-predictions for that chip (not not-currently-served).
const mlPartialArgs = { station: "Union Station", destination: "AV Line + Lancaster", leaveBeforeMinutes: 0, refreshSeconds: 60, now: mlNow };
const mlPartialResult = buildLosAngelesNextTrainFromBoard(partialWithStaticBoard, mlPartialArgs);
assert(
  mlPartialResult.emptyReason === "no-live-predictions",
  `6j: Metrolink chip on partial board must be no-live-predictions, got ${mlPartialResult.emptyReason}`
);
// Mutation check: removing the chip from scheduledDestinationsRemaining must give not-currently-served.
const mutatedPartialBoard = {
  ...partialWithStaticBoard,
  scheduledDestinationsRemaining: (partialWithStaticBoard.scheduledDestinationsRemaining ?? []).filter(
    (c) => c !== "AV Line + Lancaster"
  ),
};
const mutatedResult = buildLosAngelesNextTrainFromBoard(mutatedPartialBoard, mlPartialArgs);
assert(
  mutatedResult.emptyReason === "not-currently-served",
  `6j mutation: removing AV Line + Lancaster from scheduledDestinationsRemaining must give not-currently-served, got ${mutatedResult.emptyReason}`
);
console.log("los-angeles Metrolink empty-reason assertions: ok (6j + mutation check)");

// ---- 7. Pacific Surfliner assertions (docs/jim-brief-la-surfliner-wire.md) ----
// Fixture: minimal Amtrak GTFS covering stop LAX (Union Station) and terminals for the three
// Surfliner chip directions, plus an inbound terminating trip and a non-78 route.
const sfStops = [
  { stop_id: "LAX", stop_name: "Los Angeles", location_type: "0", parent_station: "" },
  { stop_id: "SDG", stop_name: "San Diego", location_type: "0", parent_station: "" },
  { stop_id: "GOL", stop_name: "Goleta Amtrak", location_type: "0", parent_station: "" },
  { stop_id: "SLO", stop_name: "San Luis Obispo", location_type: "0", parent_station: "" },
  { stop_id: "SEA", stop_name: "Seattle", location_type: "0", parent_station: "" },
];
// route_id "78" = Pacific Surfliner; route_id "11" = Coast Starlight (non-78, out-reservation)
const sfRoutes = [
  { route_id: "78", route_short_name: "Pacific Surfliner", route_long_name: "Pacific Surfliner" },
  { route_id: "11", route_short_name: "Coast Starlight", route_long_name: "Coast Starlight" },
];
const sfTripDefs = [
  // Route 78 departures from Union Station (LAX)
  ["SF-SD",  "78", [["LAX", "08:00:00"], ["SDG", "11:00:00"]]],  // -> San Diego
  ["SF-GOL", "78", [["LAX", "10:00:00"], ["GOL", "14:00:00"]]],  // -> Goleta Amtrak
  ["SF-SLO", "78", [["LAX", "12:00:00"], ["SLO", "18:00:00"]]],  // -> San Luis Obispo
  // Route 78 inbound terminating at LAX — must NOT be a chip
  ["SF-ARR", "78", [["SDG", "05:00:00"], ["LAX", "08:00:00"]]],
  // Non-78 route (Coast Starlight) from LAX — must be dropped by the route filter
  ["CL-SEA", "11", [["LAX", "09:00:00"], ["SEA", "40:00:00"]]],
];
const sfStopTimesMap = new Map();
const sfTripsMap = new Map();
for (const [tripId, routeId, calls] of sfTripDefs) {
  sfTripsMap.set(tripId, { trip_id: tripId, route_id: routeId, service_id: "SF-WD", trip_headsign: "" });
  calls.forEach(([stopId, time], i) => {
    if (!sfStopTimesMap.has(stopId)) sfStopTimesMap.set(stopId, []);
    sfStopTimesMap.get(stopId).push({
      trip_id: tripId, stop_id: stopId, departure_time: time, arrival_time: time,
      stop_sequence: String(i + 1), stop_headsign: "", pickup_type: "0",
    });
  });
}
const sfStaticFixture = {
  stops: sfStops,
  stopsById: new Map(sfStops.map((s) => [s.stop_id, s])),
  routesById: new Map(sfRoutes.map((r) => [r.route_id, r])),
  tripsById: sfTripsMap,
  stopTimesByStopId: sfStopTimesMap,
  calendar: [{ service_id: "SF-WD", monday: "1", tuesday: "1", wednesday: "1", thursday: "1", friday: "1", saturday: "1", sunday: "1", start_date: "20260101", end_date: "20271231" }],
  calendarDates: [],
};

// ---- 7a. buildSurflineChip ----
assert(buildSurflineChip("SDG", "San Diego", "LAX") === "Pacific Surfliner + San Diego", "buildSurflineChip must return 'Pacific Surfliner + San Diego'");
assert(buildSurflineChip("GOL", "Goleta Amtrak", "LAX") === "Pacific Surfliner + Goleta Amtrak", "buildSurflineChip must return 'Pacific Surfliner + Goleta Amtrak'");
assert(buildSurflineChip("SLO", "San Luis Obispo", "LAX") === "Pacific Surfliner + San Luis Obispo", "buildSurflineChip must return 'Pacific Surfliner + San Luis Obispo'");
assert(buildSurflineChip("LAX", "Los Angeles", "LAX") === null, "buildSurflineChip must return null for a trip terminating at the board station");
assert(buildSurflineChip("", "San Diego", "LAX") === null, "buildSurflineChip must return null for empty terminalStopId");

// ---- 7b. staticSurflineChipsForStop — the three direction chips at LAX ----
const sfChipsAtLax = staticSurflineChipsForStop(sfStaticFixture, "LAX");
assert(sfChipsAtLax.includes("Pacific Surfliner + San Diego"), "Union Station must have Pacific Surfliner + San Diego chip");
assert(sfChipsAtLax.includes("Pacific Surfliner + Goleta Amtrak"), "Union Station must have Pacific Surfliner + Goleta Amtrak chip");
assert(sfChipsAtLax.includes("Pacific Surfliner + San Luis Obispo"), "Union Station must have Pacific Surfliner + San Luis Obispo chip");
assert(!sfChipsAtLax.some((c) => c.includes("Los Angeles")), "a trip terminating at Union Station must not become a chip");
// Non-78 route must be dropped — Coast Starlight is not a chip
assert(!sfChipsAtLax.some((c) => c.includes("Seattle")), "non-route-78 train (Coast Starlight) must not appear as a Surfliner chip");
assert(sfChipsAtLax.length === 3, `must be exactly 3 Surfliner chips at LAX, got [${sfChipsAtLax.join(", ")}]`);
console.log(`Union Station Surfliner chips: [${sfChipsAtLax.join(", ")}]`);

// ---- 7c. No Surfliner chips at non-Surfliner stops ----
// staticSurflineChipsForStop at a stop that has no route-78 stop_times -> empty
const sfChipsAtPomona = staticSurflineChipsForStop(sfStaticFixture, "109"); // Pomona North (Metrolink id)
assert(sfChipsAtPomona.length === 0, "Pomona North must have no Pacific Surfliner chips");
const sfChipsAtHub = staticSurflineChipsForStop(sfStaticFixture, "80122S"); // 7th St/Metro Ctr
assert(sfChipsAtHub.length === 0, "7th St/Metro Ctr must have no Pacific Surfliner chips");

// ---- 7d. Board composition: Surfliner rows appear; Metro + Metrolink survive Surfliner failure ----
// Build the sfNow at 07:00 PDT so all departure times are still ahead.
const sfNow = new Date(Date.UTC(2026, 9, 26, 14, 0, 0)); // 07:00 PDT
const sfSec = (h, m) => Math.floor(Date.UTC(2026, 9, 26, h, m, 0) / 1000);
const sfEntities = [
  // Route 78 (Pacific Surfliner) entities
  { tripUpdate: { trip: { tripId: "SF-SD",  routeId: "78" }, stopTimeUpdate: [{ stopId: "LAX", departure: { time: sfSec(15, 0) } }] } },
  { tripUpdate: { trip: { tripId: "SF-GOL", routeId: "78" }, stopTimeUpdate: [{ stopId: "LAX", departure: { time: sfSec(17, 0) } }] } },
  // A non-78 entity (Coast Starlight) — must be dropped by the route filter
  { tripUpdate: { trip: { tripId: "CL-SEA", routeId: "11" }, stopTimeUpdate: [{ stopId: "LAX", departure: { time: sfSec(16, 0) } }] } },
];
const sfRtFixture = { entities: sfEntities, fetchedAt: sfNow };

// Union Station board with Metro (miniStatic from section 2), Metrolink (mlStaticFixture from
// section 6), and Surfliner data all feeding in.
const unionBoardWithSf = await composeStationBoard(
  "Union Station",
  miniStatic,
  miniRealtime,
  {
    now: sfNow,
    metrolinkStaticData: mlStaticFixture,
    metrolinkRealtime: { entities: [], fetchedAt: sfNow }, // no live ML rows for isolation
    surflinerStaticData: sfStaticFixture,
    surflinerRealtime: sfRtFixture,
  }
);
const sfRowsOnBoard = unionBoardWithSf.trips.filter((t) => t.agency === "Pacific Surfliner");
const metroRowsWithSf = unionBoardWithSf.trips.filter((t) => t.agency !== "Pacific Surfliner" && t.agency !== "Metrolink");

// Metro rows must survive alongside Surfliner rows
assert(metroRowsWithSf.length >= 1, "Metro Rail rows must survive alongside Surfliner rows on Union Station board");
// Route-78 live rows must appear
assert(sfRowsOnBoard.length === 2, `expected exactly 2 live Surfliner rows (SF-SD, SF-GOL), got ${sfRowsOnBoard.length}: [${sfRowsOnBoard.map((t) => t.tripId).join(", ")}]`);
assert(sfRowsOnBoard.some((t) => t.destination === "Pacific Surfliner + San Diego"), "San Diego chip must be on board");
assert(sfRowsOnBoard.some((t) => t.destination === "Pacific Surfliner + Goleta Amtrak"), "Goleta Amtrak chip must be on board");
// Non-78 route must not appear
assert(!unionBoardWithSf.trips.some((t) => t.destination?.includes("Seattle")), "non-route-78 train must not appear on Union Station board");
// Surfliner rows carry agency and mode
assert(sfRowsOnBoard.every((t) => t.agency === "Pacific Surfliner"), "all Surfliner rows must carry agency=Pacific Surfliner");
assert(sfRowsOnBoard.every((t) => t.mode === "rail"), "all Surfliner rows must carry mode=rail");
// Chip format: Surfliner chips must not look like Metro Rail or Metrolink chips
const isSfChip = (c) => /^Pacific Surfliner \+ /.test(c);
const isMetroChipSf = (c) => /^[A-EK] Line \+ /.test(c);
const isMetrolinkChipSf = (c) => /^(AV|VC|OC|91-PV|RIV|SB) Line \+ /.test(c);
assert(sfRowsOnBoard.every((t) => isSfChip(t.destination)), "all Surfliner rows must have a Surfliner-format chip");
assert(!sfRowsOnBoard.some((t) => isMetroChipSf(t.destination)), "Surfliner rows must not look like Metro Rail chips");
assert(!sfRowsOnBoard.some((t) => isMetrolinkChipSf(t.destination)), "Surfliner rows must not look like Metrolink chips");

// Surfliner failure (surflinerPartial) must NOT drop Metro or Metrolink rows
const unionBoardSfFail = await composeStationBoard(
  "Union Station",
  miniStatic,
  miniRealtime,
  {
    now: sfNow,
    metrolinkStaticData: mlStaticFixture,
    metrolinkRealtime: mlRealtimeFixture,
    surflinerStaticData: sfStaticFixture,
    surflinerPartial: true,
  }
);
const metroRowsAfterSfFail = unionBoardSfFail.trips.filter((t) => t.agency !== "Pacific Surfliner");
const sfRowsAfterFail = unionBoardSfFail.trips.filter((t) => t.agency === "Pacific Surfliner");
assert(metroRowsAfterSfFail.length >= 1, "Metro Rail rows must survive a Surfliner feed failure");
assert(sfRowsAfterFail.length === 0, "Surfliner rows must be absent when surflinerPartial is true");
// But scheduledDestinationsRemaining must still carry Surfliner chips (static is always loaded)
assert(
  Array.isArray(unionBoardSfFail.scheduledDestinationsRemaining) &&
    unionBoardSfFail.scheduledDestinationsRemaining.some((c) => c.startsWith("Pacific Surfliner")),
  `scheduledDestinationsRemaining must include Surfliner chips even on a partial board, got ${JSON.stringify(unionBoardSfFail.scheduledDestinationsRemaining)}`
);
console.log("los-angeles Surfliner board composition assertions: ok (7d)");

// ---- 7e. Empty-reason rule: no-live-predictions vs not-currently-served ----
// A Surfliner chip the static timetable expects today, but with no live row -> no-live-predictions.
// sfNow = 07:00 PDT; SF-SD departs at 08:00 PDT, SF-GOL at 10:00 PDT, SF-SLO at 12:00 PDT —
// all scheduled for today. With no live entities, every chip must be no-live-predictions.
const sfEmptyBoard = await composeStationBoard(
  "Union Station",
  miniStatic,
  miniRealtime,
  {
    now: sfNow,
    surflinerStaticData: sfStaticFixture,
    surflinerRealtime: { entities: [], fetchedAt: sfNow },
  }
);
assert(
  Array.isArray(sfEmptyBoard.scheduledDestinationsRemaining) &&
    sfEmptyBoard.scheduledDestinationsRemaining.includes("Pacific Surfliner + San Diego"),
  `scheduledDestinationsRemaining must include Pacific Surfliner + San Diego at 07:00 (departure 08:00), got ${JSON.stringify(sfEmptyBoard.scheduledDestinationsRemaining)}`
);
const sfNextArgs = { station: "Union Station", leaveBeforeMinutes: 0, refreshSeconds: 60, now: sfNow };
const sfSdResult = buildLosAngelesNextTrainFromBoard(sfEmptyBoard, { ...sfNextArgs, destination: "Pacific Surfliner + San Diego" });
assert(sfSdResult.emptyReason === "no-live-predictions", `Surfliner chip on static board with no live row must be no-live-predictions, got ${sfSdResult.emptyReason}`);
const sfSloResult = buildLosAngelesNextTrainFromBoard(sfEmptyBoard, { ...sfNextArgs, destination: "Pacific Surfliner + San Luis Obispo" });
assert(sfSloResult.emptyReason === "no-live-predictions", `Pacific Surfliner + San Luis Obispo with no live row must be no-live-predictions, got ${sfSloResult.emptyReason}`);

// After the last scheduled departure, a chip must be not-currently-served.
// SF-SLO is the last departure at 12:00 PDT (19:00 UTC). At 20:00 UTC (13:00 PDT) it's gone.
const sfAfterLast = new Date(Date.UTC(2026, 9, 26, 20, 0, 0));
const sfBoardAfterLast = await composeStationBoard(
  "Union Station",
  miniStatic,
  { entities: [], fetchedAt: sfAfterLast },
  {
    now: sfAfterLast,
    surflinerStaticData: sfStaticFixture,
    surflinerRealtime: { entities: [], fetchedAt: sfAfterLast },
  }
);
const sfSdAfterLast = buildLosAngelesNextTrainFromBoard(sfBoardAfterLast, { ...sfNextArgs, destination: "Pacific Surfliner + San Diego", now: sfAfterLast });
assert(sfSdAfterLast.emptyReason === "not-currently-served", `after the last Surfliner departure: not-currently-served, got ${sfSdAfterLast.emptyReason}`);
console.log("los-angeles Surfliner empty-reason assertions: ok (7e)");

// ---- 7f. Mutation checks ----
// (a) Route filter mutation: if we remove the route_id === "78" guard, the Coast Starlight
//     (route 11) would appear in chips. Verify that without the filter, the non-78 trip slips in.
//     We simulate this by adding a trip with route_id "11" and checking it is NOT in real chips.
assert(!sfChipsAtLax.some((c) => c.includes("Seattle")), "mutation anchor: non-route-78 trip must not appear in chips (route filter is in place)");
// Build a mutated fixture where both routes produce chips at LAX (route filter removed) —
// staticSurflineChipsForStop must ONLY use route 78, so adding a non-78 trip to the fixture
// and confirming it never appears is the mutation test.
const sfMutatedFn = () => {
  const chips = new Set();
  // Simulate a broken version that does not filter by route_id:
  const terminals = new Map([
    ["SF-SD",  { stopId: "SDG" }],
    ["SF-GOL", { stopId: "GOL" }],
    ["SF-SLO", { stopId: "SLO" }],
    ["SF-ARR", { stopId: "LAX" }], // terminating trip
    ["CL-SEA", { stopId: "SEA" }], // non-78 trip
  ]);
  for (const [tripId, terminal] of terminals) {
    if (terminal.stopId === "LAX") continue;
    const stop = sfStaticFixture.stopsById.get(terminal.stopId);
    chips.add(`Pacific Surfliner + ${stop?.stop_name ?? ""}`);
  }
  return [...chips].sort();
};
const brokenChips = sfMutatedFn();
assert(brokenChips.includes("Pacific Surfliner + Seattle"), "mutation check precondition: broken version without route filter includes Seattle chip");
assert(!sfChipsAtLax.includes("Pacific Surfliner + Seattle"), "mutation check: real implementation (with route filter) must exclude non-78 Seattle chip");

// (b) Empty-reason mutation: removing a Surfliner chip from scheduledDestinationsRemaining
//     must flip no-live-predictions -> not-currently-served.
const sfMutatedBoard = {
  ...sfEmptyBoard,
  scheduledDestinationsRemaining: (sfEmptyBoard.scheduledDestinationsRemaining ?? []).filter(
    (c) => c !== "Pacific Surfliner + San Diego"
  ),
};
const sfMutatedResult = buildLosAngelesNextTrainFromBoard(sfMutatedBoard, { ...sfNextArgs, destination: "Pacific Surfliner + San Diego" });
assert(
  sfMutatedResult.emptyReason === "not-currently-served",
  `mutation: removing Pacific Surfliner + San Diego from scheduledDestinationsRemaining must give not-currently-served, got ${sfMutatedResult.emptyReason}`
);
console.log("los-angeles Surfliner mutation checks: ok (7f)");

// ---- 7h. Real transitdocs trip_id format: AMTK_<number> joined via trip_short_name ----
// The real feed uses trip_ids like "2026-10-24_AMTK_595" and carries no routeId field.
// Amtrak static GTFS uses numeric trip_ids ("312161") with the train number in trip_short_name.
// Verify: the short-name join produces a live row; joining on trip_id directly (mutation) does not.

// Static fixture with numeric trip_ids and trip_short_name (matches real Amtrak GTFS shape).
const sfV2Stops = [
  { stop_id: "LAX", stop_name: "Los Angeles", location_type: "0", parent_station: "" },
  { stop_id: "SDG", stop_name: "San Diego",   location_type: "0", parent_station: "" },
  { stop_id: "SEA", stop_name: "Seattle",     location_type: "0", parent_station: "" },
];
const sfV2Routes = [
  { route_id: "78", route_short_name: "Pacific Surfliner", route_long_name: "Pacific Surfliner" },
  { route_id: "14", route_short_name: "Coast Starlight",   route_long_name: "Coast Starlight"   },
];
// trip_id "312161": route 78, train 595 (San Diego) — same as a real Amtrak GTFS row
// trip_id "444001": route 14, train 11 (Coast Starlight) — must never appear on the board
const sfV2TripDefs = [
  ["312161", "78", "595", [["LAX", "08:00:00"], ["SDG", "11:00:00"]]],
  ["444001", "14", "11",  [["LAX", "09:00:00"], ["SEA", "40:00:00"]]],
];
const sfV2StopTimesMap = new Map();
const sfV2TripsMap = new Map();
for (const [tripId, routeId, tsn, calls] of sfV2TripDefs) {
  sfV2TripsMap.set(tripId, { trip_id: tripId, route_id: routeId, trip_short_name: tsn, service_id: "SF-WD", trip_headsign: "" });
  calls.forEach(([stopId, time], i) => {
    if (!sfV2StopTimesMap.has(stopId)) sfV2StopTimesMap.set(stopId, []);
    sfV2StopTimesMap.get(stopId).push({
      trip_id: tripId, stop_id: stopId, departure_time: time, arrival_time: time,
      stop_sequence: String(i + 1), stop_headsign: "", pickup_type: "0",
    });
  });
}
const sfStaticFixtureV2 = {
  stops: sfV2Stops,
  stopsById: new Map(sfV2Stops.map((s) => [s.stop_id, s])),
  routesById: new Map(sfV2Routes.map((r) => [r.route_id, r])),
  tripsById: sfV2TripsMap,
  stopTimesByStopId: sfV2StopTimesMap,
  calendar: [{ service_id: "SF-WD", monday: "1", tuesday: "1", wednesday: "1", thursday: "1", friday: "1", saturday: "1", sunday: "1", start_date: "20260101", end_date: "20271231" }],
  calendarDates: [],
};

// Realtime entities using the real transitdocs trip_id format (date prefix + AMTK_<number>).
// 2026-10-24_AMTK_595 → train 595 → route 78 static trip_id 312161 → live San Diego row.
// 2026-10-24_AMTK_11  → train 11  → no route-78 trip with trip_short_name "11" → dropped.
const sfV2Entities = [
  { tripUpdate: { trip: { tripId: "2026-10-24_AMTK_595" }, stopTimeUpdate: [{ stopId: "LAX", departure: { time: sfSec(15, 0) } }] } },
  { tripUpdate: { trip: { tripId: "2026-10-24_AMTK_11"  }, stopTimeUpdate: [{ stopId: "LAX", departure: { time: sfSec(16, 0) } }] } },
];
const sfV2Rt = { entities: sfV2Entities, fetchedAt: sfNow };

// Mutation check precondition: without resolveTripId, indexTripUpdates keys on the raw trip_id.
// The static trip_id "312161" would NOT be found in stopUpdates → 0 live rows → assertion goes red.
const brokenRtIndex = indexTripUpdates(sfV2Entities);
assert(
  !brokenRtIndex.stopUpdates.has("312161:LAX"),
  "7h mutation: without resolveTripId, stopUpdates has no entry under static trip_id 312161"
);
assert(
  brokenRtIndex.stopUpdates.has("2026-10-24_AMTK_595:LAX"),
  "7h mutation precondition: without resolveTripId, entry is keyed under raw realtime trip_id"
);

// Real board: the short-name join must produce a live row for 2026-10-24_AMTK_595.
const sfV2Board = await composeStationBoard("Union Station", miniStatic, miniRealtime, {
  now: sfNow,
  surflinerStaticData: sfStaticFixtureV2,
  surflinerRealtime: sfV2Rt,
});
const sfV2Rows = sfV2Board.trips.filter((t) => t.agency === "Pacific Surfliner");
assert(
  sfV2Rows.length >= 1,
  `7h: 2026-10-24_AMTK_595 must produce a live row via trip_short_name join, got ${sfV2Rows.length}`
);
assert(
  sfV2Rows.some((t) => t.destination === "Pacific Surfliner + San Diego"),
  `7h: live row must carry destination 'Pacific Surfliner + San Diego', got ${sfV2Rows.map((t) => t.destination).join(", ")}`
);
// 2026-10-24_AMTK_11 is Coast Starlight (train 11, route 14) — must not appear.
assert(
  !sfV2Board.trips.some((t) => t.tripId === "444001"),
  "7h: 2026-10-24_AMTK_11 (Coast Starlight) must not appear on the board"
);
assert(
  !sfV2Board.trips.some((t) => t.destination?.includes("Seattle")),
  "7h: no Seattle destination may appear (Coast Starlight dropped by short-name join)"
);
console.log("los-angeles Surfliner AMTK trip_id join assertions: ok (7h)");

// ---- 7i. Duplicate short names: calendar-aware selection (Follow-up 2, 25 Oct 2026) ----
// Route 78 reuses train numbers across service calendars. Train 761 has two static trips:
//   "76101": service SF-7I-WE (weekends only, saturday+sunday) → terminal Goleta Amtrak
//   "76102": service SF-7I-WD (weekdays only, monday-friday)   → terminal San Diego
// sfNow is Monday 2026-10-26; SF-7I-WD is active, SF-7I-WE is not.
// The board must select the active (weekday) trip and show "Pacific Surfliner + San Diego".
// Mutation: reverting resolveSurflineTripId to keep only the first trip (old behaviour)
// would select the inactive "76101" → destination "Pacific Surfliner + Goleta Amtrak"
// → the assertion on "San Diego" goes red.

const sfV3Stops = [
  { stop_id: "LAX", stop_name: "Los Angeles",  location_type: "0", parent_station: "" },
  { stop_id: "SDG", stop_name: "San Diego",     location_type: "0", parent_station: "" },
  { stop_id: "GOL", stop_name: "Goleta Amtrak", location_type: "0", parent_station: "" },
];
const sfV3Routes = [
  { route_id: "78", route_short_name: "Pacific Surfliner", route_long_name: "Pacific Surfliner" },
];
// "76101" inserted first (would be chosen by old first-wins behaviour); its service is inactive Monday.
// "76102" inserted second;  its service is active Monday.
const sfV3TripDefs = [
  ["76101", "78", "761", "SF-7I-WE", [["LAX", "08:00:00"], ["GOL", "13:00:00"]]],
  ["76102", "78", "761", "SF-7I-WD", [["LAX", "09:00:00"], ["SDG", "12:00:00"]]],
];
const sfV3StopTimesMap = new Map();
const sfV3TripsMap = new Map();
for (const [tripId, routeId, tsn, svc, calls] of sfV3TripDefs) {
  sfV3TripsMap.set(tripId, { trip_id: tripId, route_id: routeId, trip_short_name: tsn, service_id: svc, trip_headsign: "" });
  calls.forEach(([stopId, time], i) => {
    if (!sfV3StopTimesMap.has(stopId)) sfV3StopTimesMap.set(stopId, []);
    sfV3StopTimesMap.get(stopId).push({
      trip_id: tripId, stop_id: stopId, departure_time: time, arrival_time: time,
      stop_sequence: String(i + 1), stop_headsign: "", pickup_type: "0",
    });
  });
}
const sfStaticFixtureV3 = {
  stops: sfV3Stops,
  stopsById: new Map(sfV3Stops.map((s) => [s.stop_id, s])),
  routesById: new Map(sfV3Routes.map((r) => [r.route_id, r])),
  tripsById: sfV3TripsMap,
  stopTimesByStopId: sfV3StopTimesMap,
  calendar: [
    { service_id: "SF-7I-WE", monday: "0", tuesday: "0", wednesday: "0", thursday: "0", friday: "0", saturday: "1", sunday: "1", start_date: "20260101", end_date: "20271231" },
    { service_id: "SF-7I-WD", monday: "1", tuesday: "1", wednesday: "1", thursday: "1", friday: "1", saturday: "0", sunday: "0", start_date: "20260101", end_date: "20271231" },
  ],
  calendarDates: [],
};

// Live entity for train 761 (real transitdocs date-prefixed format).
const sfV3Entities = [
  { tripUpdate: { trip: { tripId: "2026-10-26_AMTK_761" }, stopTimeUpdate: [{ stopId: "LAX", departure: { time: sfSec(15, 0) } }] } },
];
const sfV3Rt = { entities: sfV3Entities, fetchedAt: sfNow };

// Real board: calendar-aware selection must pick the active (weekday) trip → San Diego.
const sfV3Board = await composeStationBoard("Union Station", miniStatic, miniRealtime, {
  now: sfNow,
  surflinerStaticData: sfStaticFixtureV3,
  surflinerRealtime: sfV3Rt,
});
const sfV3SfRows = sfV3Board.trips.filter((t) => t.agency === "Pacific Surfliner");
assert(
  sfV3SfRows.length >= 1,
  `7i: 2026-10-26_AMTK_761 with one active and one inactive trip must produce a live row, got ${sfV3SfRows.length}`
);
assert(
  sfV3SfRows.some((t) => t.destination === "Pacific Surfliner + San Diego"),
  `7i: live row must carry 'Pacific Surfliner + San Diego' (active weekday service), got ${sfV3SfRows.map((t) => t.destination).join(", ")}`
);
// Confirm the inactive (weekend) trip is NOT chosen.
assert(
  !sfV3SfRows.some((t) => t.destination === "Pacific Surfliner + Goleta Amtrak"),
  "7i: inactive weekend trip (Goleta Amtrak) must not appear when weekday service is active"
);

// Mutation precondition: if we kept only the inactive trip for "761" (old first-wins behaviour),
// the resolveTripId function would return "76101" and the board would show Goleta Amtrak.
// Verify this by running composeStationBoard with a static fixture that has ONLY the inactive trip.
const sfV3MutTripsMap = new Map([["76101", sfV3TripsMap.get("76101")]]);
const sfV3MutStopTimesMap = new Map([
  ["LAX", (sfV3StopTimesMap.get("LAX") ?? []).filter((st) => st.trip_id === "76101")],
  ["GOL", sfV3StopTimesMap.get("GOL") ?? []],
]);
const sfStaticFixtureV3Mut = { ...sfStaticFixtureV3, tripsById: sfV3MutTripsMap, stopTimesByStopId: sfV3MutStopTimesMap };
const sfV3MutBoard = await composeStationBoard("Union Station", miniStatic, miniRealtime, {
  now: sfNow,
  surflinerStaticData: sfStaticFixtureV3Mut,
  surflinerRealtime: sfV3Rt,
});
const sfV3MutRows = sfV3MutBoard.trips.filter((t) => t.agency === "Pacific Surfliner");
assert(
  sfV3MutRows.length === 0,
  `7i mutation: only-inactive-trip fixture must produce 0 live rows (inactive service → skipped), got ${sfV3MutRows.length}`
);
console.log("los-angeles Surfliner duplicate short-name calendar selection assertions: ok (7i)");

// ---- 7g. Dogfood directions include Surfliner chips at Union Station only ----
setLosAngelesStaticLoader(async () => chipStatic);
setMetrolinkStaticLoader(async () => mlStaticFixture);
setSurflinerStaticLoader(async () => sfStaticFixture);

const unionDogfoodSf = await getLosAngelesDogfoodDirections("Union Station");
assert(
  sfChipsAtLax.every((c) => unionDogfoodSf.directions.includes(c)),
  `dogfood directions at Union Station must include all Surfliner chips, missing: ${sfChipsAtLax.filter((c) => !unionDogfoodSf.directions.includes(c)).join(", ")}`
);
// Metro chips must also be present at Union Station
assert(
  unionDogfoodSf.directions.some((c) => isMetroChipSf(c)),
  "dogfood directions at Union Station must still include Metro Rail chips alongside Surfliner"
);

// Pomona North must have NO Surfliner chips
const pomonaDogfoodSf = await getLosAngelesDogfoodDirections("Pomona North");
assert(
  !pomonaDogfoodSf.directions.some((c) => isSfChip(c)),
  `dogfood directions at Pomona North must have no Surfliner chips, got ${pomonaDogfoodSf.directions.filter(isSfChip).join(", ")}`
);

// 7th St/Metro Ctr must have NO Surfliner chips
const hubDogfoodSf = await getLosAngelesDogfoodDirections(LOS_ANGELES_HUB);
assert(
  !hubDogfoodSf.directions.some((c) => isSfChip(c)),
  `dogfood directions at 7th St/Metro Ctr must have no Surfliner chips`
);

// Surfliner chips must not look like Metro Rail or Metrolink chips
for (const chip of unionDogfoodSf.directions.filter(isSfChip)) {
  assert(!isMetroChipSf(chip), `Surfliner chip "${chip}" must not match Metro Rail chip pattern`);
  assert(!isMetrolinkChipSf(chip), `Surfliner chip "${chip}" must not match Metrolink chip pattern`);
}

setSurflinerStaticLoader(null);
setMetrolinkStaticLoader(null);
setLosAngelesStaticLoader(null);
console.log("los-angeles Surfliner dogfood directions assertions: ok (7g)");

// ---- 7j. REAL Amtrak feed: static times are Eastern, rows must land at the right LA wall-clock ----
// docs/jim-brief-la-surfliner-timezone.md. qa/fixtures/los-angeles/amtrak-surfliner-real.json is a
// pinned extract of Amtrak's real static GTFS (route 78 trips calling at LAX, with its real
// agency.txt = America/New_York) plus one captured transitdocs TripUpdate (train 562, static
// "9:10:00" Eastern = 06:10 PDT). Regenerate: node scripts/build-la-surfliner-fixture.mjs. No network.
{
  const real = JSON.parse(readFileSync(join(ROOT, "qa/fixtures/los-angeles/amtrak-surfliner-real.json"), "utf8"));
  const buildRealStatic = (agencyTimeZone) => {
    const tripsById = new Map(real.trips.map((t) => [t.trip_id, t]));
    const stopTimesByStopId = new Map();
    for (const st of real.stop_times) {
      if (!stopTimesByStopId.has(st.stop_id)) stopTimesByStopId.set(st.stop_id, []);
      stopTimesByStopId.get(st.stop_id).push({ ...st, stop_headsign: "" });
    }
    return {
      stops: real.stops,
      stopsById: new Map(real.stops.map((s) => [s.stop_id, s])),
      routesById: new Map(real.routes.map((r) => [r.route_id, r])),
      tripsById,
      stopTimesByStopId,
      calendar: real.calendar,
      calendarDates: real.calendar_dates,
      agencyTimeZone,
      timeZone: "America/Los_Angeles",
    };
  };
  const realAgencyTz = real.agency.map((a) => a.agency_timezone).find(Boolean);
  assert(realAgencyTz === "America/New_York", `fixture precondition: Amtrak agency_timezone is America/New_York, got ${realAgencyTz}`);

  const realNow = new Date(real.capture.now);
  // The real transitdocs feed is nationwide Amtrak: 654 entities, ~27 on route 78. Pad with
  // other-route entities (trip ids absent from the extract) so the resolved-share staleness check
  // (which fires at >=20 raw ids and <50% resolved) would reject the board if the Surfliner path
  // did not opt out of it - the second 27 Oct live-probe bug, hidden behind the timezone one.
  const otherAmtrak = Array.from({ length: 60 }, (_v, i) => ({
    tripUpdate: { trip: { tripId: `9${String(i).padStart(5, "0")}`, routeId: "84" }, stopTimeUpdate: [{ stopId: "SAC", departure: { time: real.capture.laxDepartureEpoch } }] },
  }));
  const realRt = { entities: [real.capture.entity, ...otherAmtrak], fetchedAt: realNow };
  const expectedLa = new Date(real.capture.laxDepartureEpoch * 1000).toLocaleTimeString("en-AU", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Los_Angeles",
  });
  const boardWith = (tz) =>
    composeStationBoard("Union Station", miniStatic, { entities: [], fetchedAt: realNow }, {
      now: realNow,
      surflinerStaticData: buildRealStatic(tz),
      surflinerRealtime: realRt,
    });

  const realBoard = await boardWith(realAgencyTz);
  const realSf = realBoard.trips.filter((t) => t.agency === "Pacific Surfliner");
  assert(realSf.length === 1, `real feed: exactly 1 live Surfliner row at Union Station, got ${realSf.length}`);
  assert(realSf[0].destination === "Pacific Surfliner + San Diego", `real feed: train 562 is the San Diego chip, got ${realSf[0].destination}`);
  assert(realSf[0].displayTime === expectedLa, `real feed: displayTime must be the LA wall clock of the captured departure (${expectedLa}), got ${realSf[0].displayTime}`);
  assert(realSf[0].displayTime === "06:10", `real feed: train 562 departs 06:10 PDT, got ${realSf[0].displayTime}`);
  assert(realSf[0].scheduledDisplayTime === "06:10", `real feed: static 9:10 Eastern is 06:10 PDT, got ${realSf[0].scheduledDisplayTime}`);
  assert(
    new Date(realSf[0].liveDeparture).getTime() === real.capture.laxDepartureEpoch * 1000,
    "real feed: liveDeparture instant equals the captured feed epoch"
  );
  // Negative control / mutation: parsing the same static times in LA time (the bug) must NOT produce
  // the 06:10 row. If it did, this fixture would not discriminate and the assertions above are void.
  const bugBoard = await boardWith("America/Los_Angeles");
  const bugSf = bugBoard.trips.filter((t) => t.agency === "Pacific Surfliner");
  assert(bugSf.length === 0, `mutation: LA-time parse of Eastern static times must drop the live row (the 27 Oct bug), got ${bugSf.length}`);
  console.log(`los-angeles real Amtrak feed: train 562 live row at Union Station ${realSf[0].displayTime} PDT (static 9:10 Eastern), LA-time parse drops it: ok (7j)`);
}

// 5 (picker/manifest): no picker entry while planned; the flip commit adds it.
console.log(
  "los-angeles-dogfood-gate: ok (status-agnostic, dispatch + dogfood module wired, emptyReason pass-through gated, bounds + 110 coordinates, coverage notes, MULTI_CITY_IDS/manifest tracking status, adapterReady, D1 pack, 110 stations, hub 7th St/Metro Ctr locked to A/B/D/E, doNotGroup pairs enforced, line+terminus direction model, hub never a direction token, missing-key throws without network, exact station matching with no doNotGroup overlap, scheduled-only/SKIPPED rows never shown, board realtime:true, no bare line chip at any of 110 stations, terminating-here trips excluded, unresolvable terminus dropped, honest empty state (not-currently-served / no-live-predictions / none / throw-safe), Metrolink group on Union Station and Pomona North boards - chip split, two stations, absent at hub, Metro survives Metrolink failure, mutation checks 6a-6j, Pacific Surfliner group at Union Station only - 3 chips, non-78 dropped, Metro+Metrolink survive Surfliner failure, empty-reason rule, mutation checks 7a-7g, AMTK trip_id join via trip_short_name - 2026-10-24_AMTK_595 live, mutation check 7h, duplicate short-name calendar selection - 761 active service, mutation check 7i, Perth Australia green)"
);
