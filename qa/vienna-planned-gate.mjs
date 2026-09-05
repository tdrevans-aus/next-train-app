/**
 * Vienna stays planned (adapter wired, not flipped live). Perth (Australia) stays live.
 * Usage: node qa/vienna-planned-gate.mjs
 *
 * Deliberately does NOT live-fetch the Wiener Linien OGD static GTFS feed
 * (wienerlinien.at/ogd_realtime/doku/ogd/gtfs/gtfs.zip) — that's a real network download not
 * appropriate for a smoke-tier gate. Instead this gate unit-tests the catalog/allow-list/
 * direction-model logic (resolveCatalogEntry, listCatalogStations, resolveStopIds shape,
 * lineIdForTrip, mapLineTerminusDestination, resolveTerminus) against synthetic data shaped
 * like real staticData/buildBoardForStops output, plus asserts that fetchStationBoard throws
 * for an unknown station without any network call (the Unknown-station check runs before the
 * static feed load).
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  VIENNA_HUB,
  LINE_LABELS,
  LINE_TERMINI,
  resolveCatalogEntry,
  listCatalogStations,
  resolveStopIds,
  lineIdForTrip,
  fetchStationBoard,
  MissingViennaRealtimeMonitorError,
  WIENER_LINIEN_GTFS_STATIC_URL,
} from "../lib/providers/vienna.js";
import {
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  canonicalStationName,
  resolveTerminus,
  mapLineTerminusDestination,
  WIENER_LINIEN_ROUTE_ID_TO_LINE,
} from "../lib/cities/vienna/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other live city (the
// pattern that caused the Helsinki-contamination bug). Perth (Australia) green + vienna
// correctly wired as planned is enough.
const perthAustralia = assertCityLive("perth");
assert(perthAustralia?.ok === true, "Perth (Australia) must stay live");

const live = assertCityLive("vienna");
assert(live?.ok === false, "assertCityLive(vienna) must fail");
assert(live?.status === 501, "vienna must be 501 planned");

const entry = getCity("vienna");
assert(entry?.status === "planned", "vienna registry status must be planned");
assert(entry?.adapterReady === true, "vienna adapterReady must be true");
assert(entry?.displayName === "Vienna", "vienna display name must be Vienna");
assert(entry?.timeZone === "Europe/Vienna", "vienna timezone must be Europe/Vienna");
assert(CITIES.filter((city) => city.id === "vienna").length === 1, "vienna must appear once in the registry");
for (const forbiddenId of ["wien", "at-vienna", "austria", "vie"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/vienna-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/vienna-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "vienna", "D1 city id must be vienna");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === VIENNA_HUB, `D1 lock must be ${VIENNA_HUB}`);
assert(network.lines.length === 5, "D1 must carry exactly 5 U-Bahn lines (U5 excluded)");

const stations = listCatalogStations();
assert(stations.length === 99, `catalog must have 99 stations, got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(VIENNA_HUB), `catalog must lock ${VIENNA_HUB}`);
assert(byName.get(VIENNA_HUB)?.hub === true, "hub entry must carry hub:true");
assert(
  (byName.get(VIENNA_HUB)?.aliases ?? []).length === 0,
  "Karlsplatz must not carry an alias — no doNotUse hub-proxy string may collapse into it"
);

// Karlsplatz is a triple interchange (U1 x U2 x U4); the nine two-line interchanges are also
// present with exactly two lines each (hazard-pack.md H1/H2).
assert(
  ["u1", "u2", "u4"].every((line) => byName.get(VIENNA_HUB)?.lines.includes(line)),
  "Karlsplatz must carry U1/U2/U4"
);
for (const [name, lines] of [
  ["Praterstern", ["u1", "u2"]],
  ["Stephansplatz", ["u1", "u3"]],
  ["Volkstheater", ["u2", "u3"]],
  ["Schottenring", ["u2", "u4"]],
  ["Schwedenplatz", ["u1", "u4"]],
  ["Landstraße", ["u3", "u4"]],
  ["Westbahnhof", ["u3", "u6"]],
  ["Längenfeldgasse", ["u4", "u6"]],
  ["Spittelau", ["u4", "u6"]],
]) {
  const entryLines = byName.get(name)?.lines ?? [];
  assert(
    entryLines.length === lines.length && lines.every((l) => entryLines.includes(l)),
    `${name} must carry exactly ${lines.join("/")}`
  );
}

// resolveCatalogEntry — exact-match aliasing (Kaisermühlen-VIC, hazard-pack.md H3).
assert(resolveCatalogEntry(VIENNA_HUB)?.name === VIENNA_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(
  resolveCatalogEntry("Kaisermühlen")?.name === "Kaisermühlen-VIC",
  "resolveCatalogEntry must resolve the alphabetical master table's truncated 'Kaisermühlen' to 'Kaisermühlen-VIC'"
);
assert(resolveCatalogEntry("Vienna") === null, "resolveCatalogEntry must reject the marketing token Vienna");
assert(resolveCatalogEntry("Wien") === null, "resolveCatalogEntry must reject the marketing token Wien");
assert(resolveCatalogEntry("City") === null, "resolveCatalogEntry must reject the invented token City");
assert(isForbiddenCollapseName("Zentrum") === true, "Zentrum must never resolve as a station on its own");
assert(isForbiddenHubProxy("Praterstern") === true, "Praterstern must never stand in for the Karlsplatz hub identity");
assert(isForbiddenHubProxy("Stephansplatz") === true, "Stephansplatz must never stand in for the Karlsplatz hub identity");
assert(isForbiddenHubProxy(VIENNA_HUB) === false, "the hub itself is not its own proxy violation");
assert(foldKey("Kaisermühlen-VIC") !== "", "foldKey must fold diacritics/case");

// Line labels + termini (direction-model-memo.md sections 1-2).
assert(LINE_LABELS.u1 === "U1", "U1 line label");
assert(LINE_LABELS.u2 === "U2", "U2 line label");
assert(LINE_TERMINI.u1.includes("Leopoldau") && LINE_TERMINI.u1.includes("Oberlaa"), "U1 termini must be Leopoldau/Oberlaa");
assert(
  LINE_TERMINI.u2.length === 1 && LINE_TERMINI.u2[0] === "Seestadt",
  "U2 termini must be ONLY Seestadt — Karlsplatz is U2's own terminus, not a valid outbound chip destination"
);
assert(
  WIENER_LINIEN_ROUTE_ID_TO_LINE.U1 === "u1" &&
    WIENER_LINIEN_ROUTE_ID_TO_LINE.U2 === "u2" &&
    WIENER_LINIEN_ROUTE_ID_TO_LINE.U6 === "u6",
  "WIENER_LINIEN_ROUTE_ID_TO_LINE must match D1 gtfsRouteIdsIfKnown"
);
assert(!("U5" in WIENER_LINIEN_ROUTE_ID_TO_LINE), "U5 must not be classified (unopened, service 2030)");

assert(canonicalStationName("Kaisermühlen") === "Kaisermühlen-VIC", "canonicalStationName must resolve the truncated alphabetical-table form");
assert(resolveTerminus("Leopoldau", "u1") === "Leopoldau", "resolveTerminus must resolve U1's Leopoldau terminus");
assert(mapLineTerminusDestination("Leopoldau", "u1") === "U1 + Leopoldau", "direction chip must be line + terminus");
assert(mapLineTerminusDestination("Seestadt", "u2") === "U2 + Seestadt", "U2's only live direction chip is + Seestadt");
// Karlsplatz must NEVER appear as a direction for ANY line — it isn't in any line's termini
// list, so an unresolvable/hub headsign always falls back to the bare line label. This is also
// what proves U2 never renders "U2 + Karlsplatz" (Karlsplatz is U2's own terminus).
assert(mapLineTerminusDestination("Karlsplatz", "u2") === "U2", "Karlsplatz must never appear as a U2 direction token");
assert(mapLineTerminusDestination("Karlsplatz", "u1") === "U1", "Karlsplatz must never appear as a U1 direction token");
assert(mapLineTerminusDestination("Wien", "u3") === "U3", "Wien must never appear as a direction token");
assert(resolveTerminus("Some Unknown Headsign", "u1") === null, "resolveTerminus must not fabricate an unknown terminus");

// resolveStopIds — synthetic staticData shaped like gtfs/static-cache.js output, no network.
const syntheticStaticData = {
  stops: [
    { stop_id: "at:49:5001:0:1", stop_name: "Karlsplatz", parent_station: "" },
    { stop_id: "at:49:5001:0:1:1", stop_name: "Karlsplatz", parent_station: "at:49:5001:0:1" },
    { stop_id: "at:49:5001:0:1:2", stop_name: "Karlsplatz", parent_station: "at:49:5001:0:1" },
    { stop_id: "at:49:5002:0:1", stop_name: "Kaisermühlen-VIC", parent_station: "" },
  ],
  tripsById: new Map([
    ["trip-u1-1", { route_id: "U1" }],
    ["trip-u2-1", { route_id: "U2" }],
    ["trip-u6-1", { route_id: "U6" }],
    ["trip-tram-1", { route_id: "31" }],
  ]),
};
const karlsplatzStopIds = resolveStopIds(syntheticStaticData, byName.get(VIENNA_HUB));
assert(
  karlsplatzStopIds.includes("at:49:5001:0:1") &&
    karlsplatzStopIds.includes("at:49:5001:0:1:1") &&
    karlsplatzStopIds.includes("at:49:5001:0:1:2"),
  "resolveStopIds must expand Karlsplatz to its child platform stops"
);
const kaisermuehlenStopIds = resolveStopIds(syntheticStaticData, byName.get("Kaisermühlen-VIC"));
assert(
  kaisermuehlenStopIds.length === 1 && kaisermuehlenStopIds[0] === "at:49:5002:0:1",
  "resolveStopIds(Kaisermühlen-VIC) must resolve the single stop"
);

assert(lineIdForTrip("trip-u1-1", syntheticStaticData) === "u1", "lineIdForTrip must resolve U1 from route_id");
assert(lineIdForTrip("trip-u2-1", syntheticStaticData) === "u2", "lineIdForTrip must resolve U2 from route_id");
assert(lineIdForTrip("trip-u6-1", syntheticStaticData) === "u6", "lineIdForTrip must resolve U6 from route_id");
assert(lineIdForTrip("trip-tram-1", syntheticStaticData) === null, "lineIdForTrip must reject tram route_ids (out of v1 scope)");

// Provider wiring sanity — no network, no key required for the static path (documented).
assert(
  WIENER_LINIEN_GTFS_STATIC_URL === "https://www.wienerlinien.at/ogd_realtime/doku/ogd/gtfs/gtfs.zip",
  "static GTFS URL must point at the Wiener Linien OGD GTFS zip"
);
assert(
  typeof MissingViennaRealtimeMonitorError === "function",
  "MissingViennaRealtimeMonitorError must be exported for the future live-realtime path"
);

let unknownThrew = false;
try {
  await fetchStationBoard("Not A Real Station");
} catch {
  unknownThrew = true;
}
assert(unknownThrew, "fetchStationBoard must throw for an unknown station without any network call");

console.log(
  "vienna-planned-gate: ok (planned/501, adapterReady, D1 pack, 99 stations, hub Karlsplatz triple U1/U2/U4, nine two-line interchanges, line+terminus direction model, U2 termini-only Seestadt, Karlsplatz never a direction token, exact-match stop resolution with Kaisermühlen-VIC alias, Wiener Linien route_id classification, Perth Australia green)"
);
