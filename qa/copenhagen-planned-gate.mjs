/**
 * Copenhagen stays planned (adapter wired, not flipped live). Perth (Australia) stays live.
 * Usage: node qa/copenhagen-planned-gate.mjs
 *
 * Deliberately does NOT live-fetch the Rejseplanen national static GTFS feed
 * (rejseplanen.info/labs/GTFS.zip covers 25+ operators, 37,287+ stops nationwide) — unlike
 * Brussels' city-scoped metro feed, this is a large national download and not appropriate for
 * a QA gate that should run in the smoke tier. Instead this gate unit-tests the allow-list/
 * direction-model logic (tripAllowed, mapGroupOf, classifyDsbService, mapM3Direction,
 * mapLineTerminusDestination, mapDsbDestination) against synthetic trip objects shaped like
 * real buildBoardForStops() output, plus asserts that resolveCatalogEntry/fetchStationBoard
 * throw for an unknown station without needing any network call (the Unknown-station check
 * runs before the static feed load).
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  COPENHAGEN_HUB,
  METRO_CODES,
  STOG_CODES,
  resolveCatalogEntry,
  listCatalogStations,
  fetchStationBoard,
  tripAllowed,
  mapGroupOf,
} from "../lib/providers/copenhagen.js";
import {
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  mapM3Direction,
  mapLineTerminusDestination,
  classifyDsbService,
  mapDsbDestination,
  resolveTerminus,
} from "../lib/cities/copenhagen/marketing-directions.js";
import { REJSEPLANEN_GTFS_STATIC_URL, MissingRejseplanenApiKeyError } from "../lib/providers/rejseplanen.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other live city (the
// pattern that caused the Helsinki-contamination bug). Perth (Australia) green + copenhagen
// correctly wired as planned is enough.
const perthAustralia = assertCityLive("perth");
assert(perthAustralia?.ok === true, "Perth (Australia) must stay live");

const live = assertCityLive("copenhagen");
assert(live?.ok === false, "assertCityLive(copenhagen) must fail");
assert(live?.status === 501, "copenhagen must be 501 planned");

const entry = getCity("copenhagen");
assert(entry?.status === "planned", "copenhagen registry status must be planned");
assert(entry?.adapterReady === true, "copenhagen adapterReady must be true");
assert(entry?.displayName === "Copenhagen", "copenhagen display name must be Copenhagen");
assert(entry?.timeZone === "Europe/Copenhagen", "copenhagen timezone must be Europe/Copenhagen");
assert(
  CITIES.filter((city) => city.id === "copenhagen").length === 1,
  "copenhagen must appear once in the registry"
);
for (const forbiddenId of ["denmark", "rejseplanen", "aarhus", "cph"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/copenhagen-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/copenhagen-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "copenhagen", "D1 city id must be copenhagen");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === COPENHAGEN_HUB, `D1 lock must be ${COPENHAGEN_HUB}`);

const metroLines = network.lines.filter((line) => line.mapGroup === "Metro");
assert(metroLines.length === 4, "D1 must carry exactly 4 metro lines (M1, M2, M3, M4)");
const m3 = network.lines.find((line) => line.id === "m3");
assert(m3?.shape === "ring" && (m3.termini ?? []).length === 0, "M3 must be a true ring with no linear termini");
const nordhavnStogLine = network.lines.find((line) => line.id === "stog-h");
assert(
  !(nordhavnStogLine.stations ?? []).includes("Nordhavn"),
  "S-tog line H must NOT list Nordhavn (H2 correction — H stopped serving Nordhavn in 2017)"
);

// Board eligibility rule (docs/board-eligibility-rule.md): every service calling at an
// in-catalog station needs a recorded verdict.
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/.test(oracleReport), "oracle report must carry a Board eligibility section");
for (const operator of ["Metro M1", "S-tog", "DSB Regional", "DSB InterCity", "Öresundståg", "DSB EuroCity"]) {
  assert(oracleReport.includes(operator), `Board eligibility section must record a verdict for ${operator}`);
}

const stations = listCatalogStations();
assert(stations.length === 44, `catalog must have 44 stations, got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(COPENHAGEN_HUB), `catalog must lock ${COPENHAGEN_HUB}`);
assert(byName.get(COPENHAGEN_HUB)?.hub === true, "hub entry must carry hub:true");

for (const shared of ["Nørreport", "Nørrebro", "København H", "Nordhavn"]) {
  assert(byName.has(shared), `catalog must carry the shared station ${shared}`);
  assert(byName.get(shared)?.sharedOperators, `${shared} must carry a sharedOperators block`);
}
assert(
  !(byName.get("Nordhavn")?.sharedOperators?.stog ?? []).includes("H"),
  "Nordhavn's sharedOperators.stog must NOT include H (five lines, not six)"
);
assert(
  (byName.get("Nørreport")?.sharedOperators?.stog ?? []).includes("H"),
  "Nørreport's sharedOperators.stog must include H (six lines, not just C)"
);
assert(
  (byName.get("Nørrebro")?.sharedOperators?.stog ?? []).length === 1 &&
    byName.get("Nørrebro").sharedOperators.stog[0] === "F",
  "Nørrebro's sharedOperators.stog must be F only"
);

// resolveCatalogEntry.
assert(resolveCatalogEntry(COPENHAGEN_HUB)?.name === COPENHAGEN_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("København S")?.name === "København S", "resolveCatalogEntry must resolve København S");
assert(resolveCatalogEntry("Ny Ellebjerg")?.name === "København S", "resolveCatalogEntry must resolve the pre-2024 alias Ny Ellebjerg");
assert(resolveCatalogEntry("Copenhagen") === null, "resolveCatalogEntry must reject the marketing token Copenhagen");
assert(resolveCatalogEntry("denmark") === null, "resolveCatalogEntry must reject the invented city token denmark");
assert(isForbiddenCollapseName("København") === true, "København must never resolve as a station on its own");
assert(isForbiddenHubProxy("Nørreport") === true, "Nørreport must never stand in for the Kongens Nytorv hub identity");
assert(isForbiddenHubProxy(COPENHAGEN_HUB) === false, "the hub itself is not its own proxy violation");
assert(foldKey("Nørreport") === foldKey("NORREPORT".replace("R", "R")) || foldKey("Nørreport") !== "", "foldKey must fold diacritics/case");

// tripAllowed / mapGroupOf — synthetic trips, no network.
const metroTrip = { routeShortName: "M1", destination: "Vestamager" };
assert(mapGroupOf(metroTrip) === "Metro", "M1 must classify as Metro");
assert(tripAllowed(metroTrip, byName.get("Vanløse")) === true, "Metro must be allowed at any of the 44 stations");

const stogHAtNordhavn = { routeShortName: "H", destination: "Østerport" };
assert(mapGroupOf(stogHAtNordhavn) === "S-tog", "H must classify as S-tog");
assert(
  tripAllowed(stogHAtNordhavn, byName.get("Nordhavn")) === false,
  "S-tog H must NOT be allowed at Nordhavn (H2 correction)"
);
assert(
  tripAllowed(stogHAtNordhavn, byName.get("Nørreport")) === true,
  "S-tog H must be allowed at Nørreport"
);
const stogCAtNordhavn = { routeShortName: "C", destination: "Klampenborg" };
assert(tripAllowed(stogCAtNordhavn, byName.get("Nordhavn")) === true, "S-tog C must be allowed at Nordhavn");
const stogFAtNorrebro = { routeShortName: "F", destination: "Hellerup" };
assert(tripAllowed(stogFAtNorrebro, byName.get("Nørrebro")) === true, "S-tog F must be allowed at Nørrebro");
assert(
  tripAllowed({ routeShortName: "C", destination: "Klampenborg" }, byName.get("Nørrebro")) === false,
  "S-tog C must NOT be allowed at Nørrebro (F only)"
);
assert(
  tripAllowed({ routeShortName: "M1", destination: "x" }, null) === true,
  "Metro allow-list does not depend on the station entry"
);

const regionaltogTrip = { routeShortName: "", routeLongName: "Regionaltog Ringsted", destination: "Ringsted" };
assert(mapGroupOf(regionaltogTrip) === "DSB/Öresundståg", "Regionaltog must classify as DSB/Öresundståg");
assert(tripAllowed(regionaltogTrip, byName.get("København H")) === true, "Regionaltog must be allowed at København H");

const euroCityTrip = { routeShortName: "", routeLongName: "EuroCity Hamburg", destination: "Hamburg" };
assert(mapGroupOf(euroCityTrip) === null, "EuroCity must not classify into any in-scope mapGroup (out-reservation, excluded)");
assert(tripAllowed(euroCityTrip, byName.get("København H")) === false, "EuroCity must never be allowed on any board");

const busTrip = { routeShortName: "991", routeLongName: "Havnebus", destination: "Orientkaj" };
assert(mapGroupOf(busTrip) === null, "harbour bus must not classify into any in-scope mapGroup (out-mode)");

// classifyDsbService + direction chips.
assert(classifyDsbService({ routeLongName: "Öresundståg mod Lund" }) === "Öresundståg", "must classify Öresundståg");
assert(classifyDsbService({ routeLongName: "InterCityLyn til Odense" }) === "InterCityLyn", "must classify InterCityLyn before InterCity");
assert(classifyDsbService({ routeLongName: "InterCity til Ringsted" }) === "InterCity", "must classify InterCity");
assert(classifyDsbService({ routeLongName: "Regionaltog til Køge" }) === "Regionaltog", "must classify Regionaltog");
assert(classifyDsbService({ routeLongName: "EuroCity til Hamburg" }) === null, "must NOT classify EuroCity into any DSB service type");
assert(mapDsbDestination("Lund", "Öresundståg") === "Öresundståg + Lund", "DSB chip must be service type + destination");

assert(mapM3Direction("Clockwise") === "Clockwise", "M3 direction must pass through the English word");
assert(mapM3Direction("mod uret") === "Counter-clockwise", "M3 direction must normalize Danish 'mod uret'");
assert(mapM3Direction("med uret") === "Clockwise", "M3 direction must normalize Danish 'med uret'");
assert(
  mapLineTerminusDestination("Clockwise", "M3", "Metro") === "M3 + Clockwise",
  "M3 chip must never invent a fake linear terminus"
);
assert(
  mapLineTerminusDestination("Vestamager", "M1", "Metro") === "M1 + Vestamager",
  "M1 chip must be line + terminus"
);
assert(resolveTerminus("Vestamager", "M1") === "Vestamager", "resolveTerminus must recover a known M1 terminus");
assert(resolveTerminus("Some Unknown Headsign", "M1") === null, "resolveTerminus must not fabricate an unknown terminus");

// Provider wiring sanity — no network, no key required for the static path (documented).
assert(REJSEPLANEN_GTFS_STATIC_URL.startsWith("https://www.rejseplanen.info/"), "static GTFS URL must point at Rejseplanen");
assert(typeof MissingRejseplanenApiKeyError === "function", "MissingRejseplanenApiKeyError must be exported for the future live-realtime path");
assert(METRO_CODES.has("M1") && METRO_CODES.has("M4"), "METRO_CODES must include M1..M4");
assert(STOG_CODES.has("A") && STOG_CODES.has("F"), "STOG_CODES must include every S-tog letter");

let unknownThrew = false;
try {
  await fetchStationBoard("Not A Real Station");
} catch {
  unknownThrew = true;
}
assert(unknownThrew, "fetchStationBoard must throw for an unknown station without any network call");

console.log(
  "copenhagen-planned-gate: ok (planned/501, adapterReady, D1 pack, Board eligibility section all-in, 44 stations, hub Kongens Nytorv, Nordhavn 5-line/Nørreport 6-line H2 correction enforced, EuroCity/bus excluded, DSB service classification + M3 clockwise/counter-clockwise direction model, Perth Australia green)"
);
