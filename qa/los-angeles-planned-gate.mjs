/**
 * Los Angeles stays planned (adapter wired, not flipped live). Perth (Australia) stays live.
 * Usage: node qa/los-angeles-planned-gate.mjs
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
import {
  LOS_ANGELES_HUB,
  LOS_ANGELES_TIME_ZONE,
  LINE_LABELS,
  LINE_TERMINI,
  A_LINE_SHORT_TURNS,
  resolveCatalogEntry,
  listCatalogStations,
  fetchStationBoard,
  MissingSwiftlyApiKeyError,
} from "../lib/providers/los-angeles.js";
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

const live = assertCityLive("los-angeles");
assert(live?.ok === false, "assertCityLive(los-angeles) must fail");
assert(live?.status === 501, "los-angeles must be 501 planned");

const entry = getCity("los-angeles");
assert(entry?.status === "planned", "los-angeles registry status must be planned");
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
assert(A_LINE_SHORT_TURNS.includes("Monrovia") && A_LINE_SHORT_TURNS.includes("Wardlow"), "A Line short-turns must be recorded, not treated as termini");
assert(!LINE_TERMINI.a.includes("Monrovia"), "A Line short-turns must never leak into the termini list");

assert(resolveTerminus("Pomona North", "a") === "Pomona North", "resolveTerminus must resolve an exact terminus match");
assert(mapLineTerminusDestination("Pomona North", "a") === "A Line + Pomona North", "direction chip must be line + terminus");
assert(mapLineTerminusDestination("Atlantic", "e") === "E Line + Atlantic", "direction chip must be line + terminus");
assert(mapLineTerminusDestination("Redondo Beach", "k") === "K Line + Redondo Beach", "direction chip must be line + terminus");
// 7th St/Metro Ctr must NEVER appear as a direction — it isn't in any line's termini list, so an
// unresolvable/hub headsign always falls back to the bare line label.
assert(mapLineTerminusDestination("7th St/Metro Ctr", "a") === "A Line", "7th St/Metro Ctr must never appear as a direction token");
assert(mapLineTerminusDestination("City", "e") === "E Line", "City must never appear as a direction token");
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

console.log(
  "los-angeles-planned-gate: ok (planned/501, adapterReady, D1 pack, 110 stations, hub 7th St/Metro Ctr locked to A/B/D/E, doNotGroup pairs enforced, line+terminus direction model, hub never a direction token, missing-key throws without network, Perth Australia green)"
);
