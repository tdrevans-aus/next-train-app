/**
 * Brussels stays planned (adapter wired, not flipped live). Perth stays live.
 *
 * Offline by construction (docs/jim-brief-brussels-gate-pinned-clock.md): this gate must never
 * reach the network. `globalThis.fetch` is stubbed to throw immediately below, before any other
 * import runs a request, so a future change that reintroduces a live call fails loudly here
 * instead of passing today and expiring the next time STIB rolls its calendar. The "live schedule
 * board" assertions run against a small committed fixture
 * (qa/fixtures/brussels/gtfs-static/, see its README) via `loadGtfsStaticFromDirectory` — the
 * same swap PR #357 made for the seven dogfood gates' staleness check — rather than
 * `lib/providers/brussels.js`'s real `fetchStationBoard`/`loadBrusselsStatic`, which fetch STIB's
 * live feed and are correctly left untouched (lib/providers/gtfs/board.js's staleness check is
 * doing its job; this gate is what was wrong, not that check).
 *
 * Usage: node qa/brussels-planned-gate.mjs
 */
globalThis.fetch = async (input) => {
  throw new Error(
    `brussels-planned-gate: network access is forbidden in this gate (attempted fetch: ${
      typeof input === "string" ? input : input?.url ?? input
    }) — see docs/jim-brief-brussels-gate-pinned-clock.md`
  );
};

import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  BRUSSELS_HUB,
  resolveCatalogEntry,
  listCatalogStations,
  BRUSSELS_METRO_SHORT_NAMES,
  BRUSSELS_TIMEZONE,
} from "../lib/providers/brussels.js";
import {
  marketingLabelsForStation,
  mapBrusselsDestination,
  resolveTerminus,
  marketingLabel,
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  bilingualHalves,
} from "../lib/cities/brussels/marketing-directions.js";
import { loadGtfsStaticFromDirectory, snapshotCalendarRange } from "../lib/providers/gtfs/static-cache.js";
import { buildBoardForStops, NEAR_HORIZON_MINUTES } from "../lib/providers/gtfs/board.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");
assert(assertCityLive("stockholm")?.ok === true, "Stockholm tester-live must stay green");
assert(assertCityLive("goteborg")?.ok === true, "Göteborg tester-live must stay green");
assert(assertCityLive("malmo")?.ok === true, "Malmö tester-live must stay green");
assert(assertCityLive("uppsala")?.ok === true, "Uppsala tester-live must stay green");
// Helsinki isn't in this registry yet - it's still on its own unmerged flip-PR (#164). This
// assertion was written in a shared working tree where Helsinki appeared live; that was
// contamination, not master's actual state. No Helsinki assertion here until #164 merges.

const live = assertCityLive("brussels");
assert(live?.ok === false, "assertCityLive(brussels) must fail");
assert(live?.status === 501, "brussels must be 501 planned");

const entry = getCity("brussels");
assert(entry?.status === "planned", "brussels registry status must be planned");
assert(entry?.adapterReady === true, "brussels adapterReady must be true");
assert(entry?.displayName === "Brussels", "brussels display name must be Brussels");
assert(entry?.timeZone === "Europe/Brussels", "brussels timezone must be Europe/Brussels");
assert(CITIES.filter((city) => city.id === "brussels").length === 1, "brussels must appear once in the registry");
for (const forbiddenId of ["bru", "bruxelles", "stib", "belgium"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

const d1Dir = join(ROOT, "docs/brussels-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/brussels-d1/${name} is required`);
}

const d1Json = readFileSync(join(d1Dir, "published-network.json"), "utf8");
const fixturePath = join(ROOT, "qa/fixtures/brussels/published-network.json");
assert(existsSync(fixturePath), "qa/fixtures/brussels/published-network.json is required");
assert(
  d1Json === readFileSync(fixturePath, "utf8"),
  "qa/fixtures/brussels/published-network.json must be a verbatim copy of docs/brussels-d1"
);

const network = JSON.parse(d1Json);
assert(network.city === "brussels", "D1 city id is brussels");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === BRUSSELS_HUB, `D1 lock must be ${BRUSSELS_HUB}`);
assert(network.lines.length === 4, "D1 must carry exactly 4 metro lines (1, 2, 5, 6)");
assert(
  network.lines.every((line) => BRUSSELS_METRO_SHORT_NAMES.includes(line.number)),
  "D1 lines must be only 1, 2, 5, 6 — no passenger metro 3 or 4"
);
assert(!network.lines.some((line) => line.number === "3" || line.number === "4"), "no metro 3 or 4");

const line2 = network.lines.find((line) => line.id === "2");
assert(line2.termini.includes("Simonis") && line2.termini.includes("Elisabeth"), "line 2 far ends must be Simonis and Elisabeth");
const line6 = network.lines.find((line) => line.id === "6");
assert(
  line6.termini.includes("Roi Baudouin / Koning Boudewijn") && line6.termini.includes("Elisabeth"),
  "line 6 far ends must be Roi Baudouin / Koning Boudewijn and Elisabeth"
);

const stations = listCatalogStations();
assert(stations.length === 60, `catalog must have 60 stations, got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(BRUSSELS_HUB), `catalog must lock ${BRUSSELS_HUB}`);
assert(byName.has("Simonis") && byName.has("Elisabeth"), "catalog must carry both Simonis and Elisabeth as distinct stations");
assert(
  JSON.stringify(byName.get("Simonis").stopIds) !== JSON.stringify(byName.get("Elisabeth").stopIds),
  "Simonis and Elisabeth must not share stopIds"
);
for (const station of stations) {
  assert(Number.isFinite(station.lat) && Number.isFinite(station.lng), `${station.name} must have real coordinates`);
  assert(Array.isArray(station.stopIds) && station.stopIds.length > 0, `${station.name} must have real GTFS stopIds`);
}
assert(!byName.has("Gare du Nord / Noordstation") && !byName.has("Gare du Nord"), "catalog must not carry Gare du Nord (no metro)");
assert(!byName.has("Albert"), "catalog must not carry Albert (metro 3 frozen, not open)");

assert(resolveCatalogEntry(BRUSSELS_HUB)?.name === BRUSSELS_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("arts-loi")?.name === BRUSSELS_HUB, "resolveCatalogEntry must resolve the FR half");
assert(resolveCatalogEntry("kunst-wet")?.name === BRUSSELS_HUB, "resolveCatalogEntry must resolve the NL half");
assert(resolveCatalogEntry("Simonis")?.name === "Simonis", "resolveCatalogEntry must resolve Simonis as its own station");
assert(resolveCatalogEntry("Elisabeth")?.name === "Elisabeth", "resolveCatalogEntry must resolve Elisabeth as its own station");
assert(resolveCatalogEntry("Brussels") === null, "resolveCatalogEntry must reject the marketing token Brussels");
assert(resolveCatalogEntry("bru") === null, "resolveCatalogEntry must reject the invented id bru");
assert(resolveCatalogEntry("stib") === null, "resolveCatalogEntry must reject the invented id stib");
assert(resolveCatalogEntry("Centre") === null, "resolveCatalogEntry must reject the marketing token Centre");

// Direction model — line + terminus, hub is never a chip.
const hubLabels = marketingLabelsForStation(BRUSSELS_HUB);
assert(hubLabels.includes("1 + Stockel / Stokkel"), "hub must offer 1 + Stockel / Stokkel");
assert(hubLabels.includes("1 + Gare de l'Ouest / Weststation"), "hub must offer 1 + Gare de l'Ouest / Weststation");
assert(hubLabels.includes("2 + Simonis"), "hub must offer 2 + Simonis");
assert(hubLabels.includes("2 + Elisabeth"), "hub must offer 2 + Elisabeth");
assert(hubLabels.includes("6 + Elisabeth"), "hub must offer 6 + Elisabeth");
assert(hubLabels.includes("6 + Roi Baudouin / Koning Boudewijn"), "hub must offer 6 + Roi Baudouin / Koning Boudewijn");
assert(
  !hubLabels.some((label) => /to city|to arts-loi|to centre|inbound|outbound/i.test(label)),
  "no inbound/outbound/to City/to Arts-Loi chips"
);
assert(!hubLabels.some((label) => foldKey(label).includes(foldKey(BRUSSELS_HUB))), "the hub must never appear as its own chip terminus");

// Simonis and Elisabeth stay two distinct chip names — never collapsed into one.
const simonisLabels = marketingLabelsForStation("Simonis");
assert(simonisLabels.includes("6 + Roi Baudouin / Koning Boudewijn"), "Simonis must offer 6 + Roi Baudouin / Koning Boudewijn (line 6 continues north)");
assert(!simonisLabels.some((label) => /2 \+ Simonis/i.test(label)), "Simonis must never offer 2 + Simonis (self-referential)");

// GTFS trip_headsign -> locked terminus mapping.
assert(mapBrusselsDestination("STOCKEL", "1") === "1 + Stockel / Stokkel", "must map STOCKEL headsign to the locked bilingual terminus");
assert(mapBrusselsDestination("SIMONIS", "2") === "2 + Simonis", "must map SIMONIS headsign for line 2");
assert(mapBrusselsDestination("ELISABETH", "6") === "6 + Elisabeth", "must map ELISABETH headsign for line 6");
assert(mapBrusselsDestination("RESERVE", "2") === null, "overlay/depot headsigns must be dropped, not fabricated into a chip");
assert(mapBrusselsDestination("ARTS-LOI", "1") === null, "the hub must never resolve as a valid terminus even if a headsign said so");
assert(resolveTerminus("GARE DE L'OUEST", "1") === "Gare de l'Ouest / Weststation", "resolveTerminus must recover the locked bilingual string");

assert(isForbiddenCollapseName("Brussels") === true, "Brussels must never resolve as a station");
assert(isForbiddenCollapseName("Simonis") === false, "Simonis must stay resolvable as a station");
assert(isForbiddenHubProxy("Simonis") === true, "Simonis must never stand in for the Arts-Loi / Kunst-Wet hub identity");
assert(isForbiddenHubProxy("Gare du Midi") === true, "Gare du Midi must never stand in for the hub identity");
assert(isForbiddenHubProxy(BRUSSELS_HUB) === false, "the hub itself is not its own proxy violation");

assert(foldKey("Arts-Loi") === foldKey("ARTS-LOI"), "foldKey must normalize case");
assert(foldKey("Joséphine-Charlotte") === foldKey("josephine-charlotte"), "foldKey must normalize diacritics");

const halves = bilingualHalves("Stockel / Stokkel");
assert(halves.fr === "Stockel" && halves.nl === "Stokkel", "bilingualHalves must split FR/NL");
const singleHalves = bilingualHalves("Simonis");
assert(singleHalves.fr === "Simonis" && singleHalves.nl === "Simonis", "same-in-both-languages names fold to themselves for both halves");

// Schedule board (GTFS static, LOCAL FIXTURE — no network) — self-referential-arrival + overlay
// filtering, exercised against qa/fixtures/brussels/gtfs-static/ (real STIB/MIVB stop_ids and
// headsign conventions, trimmed). Mirrors lib/providers/brussels.js's fetchStationBoard exactly
// (tripAllowed by BRUSSELS_METRO_SHORT_NAMES, resolveTerminus, self-referential-arrival drop,
// marketingLabel) but loads staticData from the fixture directory instead of STIB's live feed —
// the actual network fetch (lib/providers/brussels.js's loadBrusselsStatic) is deliberately left
// untouched; this gate tests our logic against local data, not STIB's currently published
// calendar (docs/jim-brief-brussels-gate-pinned-clock.md).
const FIXTURE_DIR = join(ROOT, "qa/fixtures/brussels/gtfs-static");
const fixtureStatic = loadGtfsStaticFromDirectory(FIXTURE_DIR, {
  routeTypes: ["1"],
  includeRouteShortNames: BRUSSELS_METRO_SHORT_NAMES,
  agencyIds: ["STIB/MIVB"],
  timeZone: BRUSSELS_TIMEZONE,
  sourceUrl: "local-fixture:brussels",
});

/**
 * `now` is derived FROM the fixture's own calendar coverage, one day after its start_date, so
 * this gate can never again drift out of sync with a second, independently hardcoded date the
 * way the old live-fetch version did (that was exactly how it broke: a frozen "now" checked
 * against a calendar it didn't control).
 */
function deriveNowFromLocalCalendar(staticData) {
  const { minDate } = snapshotCalendarRange(staticData);
  assert(minDate, "fixture calendar must have a start_date to derive `now` from");
  const y = Number(minDate.slice(0, 4));
  const m = Number(minDate.slice(4, 6));
  const d = Number(minDate.slice(6, 8));
  // Brussels is UTC+1 (CET) in January, so a fixed +01:00 offset is exact here — no DST
  // ambiguity, since the fixture's start_date is always 1 Jan.
  return new Date(Date.UTC(y, m - 1, d + 1, 7, 0, 0)); // 08:00 local (UTC+1)
}
const now = deriveNowFromLocalCalendar(fixtureStatic);

function fetchLocalStationBoard(stationIdOrName, options = {}) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = catalogEntry?.stopIds ?? [];
  assert(stopIds.length > 0, `fixture board: unknown Brussels station ${stationIdOrName}`);
  const stationKey = foldKey(catalogEntry?.name ?? stationIdOrName);

  const trips = buildBoardForStops({
    stopIds,
    staticData: fixtureStatic,
    realtimeIndex: { tripDelaySec: new Map(), stopUpdates: new Map(), cancelledTrips: new Set() },
    timeZone: BRUSSELS_TIMEZONE,
    now: options.now,
    horizonMinutes: options.horizonMinutes ?? NEAR_HORIZON_MINUTES,
  })
    .filter((trip) => BRUSSELS_METRO_SHORT_NAMES.includes(String(trip.routeShortName).trim()))
    .map((trip) => {
      const terminus = resolveTerminus(trip.destination, trip.routeShortName);
      if (!terminus) {
        return null;
      }
      if (foldKey(terminus) === stationKey) {
        return null;
      }
      return { ...trip, destination: marketingLabel(trip.routeShortName, terminus) };
    })
    .filter(Boolean);

  return {
    stationName: catalogEntry?.name ?? String(stationIdOrName),
    lastUpdate: new Date().toISOString(),
    trips,
    realtime: false,
  };
}

const hubBoard = fetchLocalStationBoard(BRUSSELS_HUB, { now });
assert(hubBoard.trips.length > 0, "Arts-Loi / Kunst-Wet board must have upcoming trips");
assert(hubBoard.realtime === false, "board must report realtime:false — schedule-only until the live JSON path is confirmed");
assert(
  hubBoard.trips.every((trip) => !foldKey(trip.destination).includes(foldKey(BRUSSELS_HUB))),
  "no trip at the hub may show the hub itself as a destination"
);

const simonisBoard = fetchLocalStationBoard("Simonis", { now });
assert(simonisBoard.trips.length > 0, "Simonis board must have upcoming trips");
assert(
  !simonisBoard.trips.some((trip) => trip.destination === "2 + Simonis"),
  "Simonis board must never show 2 + Simonis (self-referential arrival)"
);
assert(
  simonisBoard.trips.some((trip) => trip.destination === "6 + Roi Baudouin / Koning Boudewijn"),
  "Simonis board must show line 6 continuing to Roi Baudouin / Koning Boudewijn"
);

const elisabethBoard = fetchLocalStationBoard("Elisabeth", { now });
assert(
  !elisabethBoard.trips.some((trip) => trip.destination.includes("+ Elisabeth")),
  "Elisabeth board must never show itself as a destination (self-referential arrival)"
);

console.log(
  "brussels-planned-gate: ok (planned/501, adapterReady, D1 pack + fixture, 60 stations, Simonis/Elisabeth distinct, hub never a chip, self-referential-arrival filter, offline schedule board via local fixture, Perth/Stockholm/Göteborg/Malmö/Uppsala green)"
);
