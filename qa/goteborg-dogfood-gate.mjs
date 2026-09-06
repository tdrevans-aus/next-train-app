/**
 * Göteborg is tester-live (flipped by Tim 29 Aug 2026). Boards are primarily
 * Västtrafik Planera Resa v4 live departures (docs/jim-brief-goteborg-vasttrafik-live.md),
 * falling back to Trafiklab GTFS Regional `vt` schedule-only (Trafiklab still
 * publishes no TripUpdates for vt) when Västtrafik departures are missing or
 * the fetch fails — surfaced honestly via realtime "live"/"timetable", never
 * asserted away. Missing VASTTRAFIK_CLIENT_ID/SECRET is a hard error.
 * Usage: node qa/goteborg-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, getMultiCityNextTrain } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import {
  fetchStationBoard,
  MissingVasttrafikCredentialsError,
  _mapAndFilterVasttrafikDepartureForTests,
} from "../lib/providers/goteborg.js";
import {
  marketingLabelsForStation,
  mapGoteborgDestination,
  TRAM_HUB,
  PENDELTÅG_HUB,
} from "../lib/cities/goteborg/marketing-directions.js";
import {
  listGoteborgDogfoodStations,
  getGoteborgDogfoodDirections,
} from "../lib/cities/goteborg/dogfood-next-train.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Tester-live (flipped by Tim 29 Aug 2026). Stockholm also live (flipped 30 Aug 2026).
const live = assertCityLive("goteborg");
assert(live?.ok === true, "assertCityLive(goteborg) must pass");
assert(getCity("goteborg")?.status === "live", "goteborg registry status must be live");
assert(getCity("goteborg")?.adapterReady === true, "goteborg adapterReady must be true");
assert(isMultiCity("goteborg") === true, "goteborg must be in MULTI_CITY_IDS");
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("rotterdam")?.ok === true, "Rotterdam stays live");
assert(assertCityLive("stockholm")?.ok === true, "Stockholm stays live");

// Registry identity + D1 pack (absorbed from the retired goteborg-planned-gate).
const entry = getCity("goteborg");
assert(entry?.displayName === "Göteborg", "goteborg display name must be Göteborg");
assert(entry?.agency === "Västtrafik", "Göteborg agency is Västtrafik");
assert((entry.envKeys ?? []).includes("TRAFIKLAB_API_KEY"), "goteborg needs TRAFIKLAB_API_KEY");
assert((entry.envKeys ?? []).includes("VASTTRAFIK_CLIENT_ID"), "goteborg needs VASTTRAFIK_CLIENT_ID");
assert((entry.envKeys ?? []).includes("VASTTRAFIK_CLIENT_SECRET"), "goteborg needs VASTTRAFIK_CLIENT_SECRET");
assert(!entry.modes?.includes("metro"), "goteborg has no metro");
assert(entry.modes?.includes("tram") && entry.modes?.includes("train"), "goteborg modes v1 are tram + train");
assert(!getCity("sweden") && !getCity("gothenburg"), "city id is goteborg — no sweden/gothenburg");
// Malmö is its own separate planned city (docs/malmo-d1/) — assert non-merger, not non-existence.
assert(!getCity("malmö"), "malmo's registry id must be ascii malmo, not malmö");
if (getCity("malmo")) {
  assert(getCity("malmo").id !== "goteborg", "malmo must be its own registry entry, not merged into goteborg");
  assert(getCity("malmo").agency !== entry.agency, "malmo (Skånetrafiken) must not share goteborg's Västtrafik agency");
}
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
  "qa-note.md",
]) {
  assert(existsSync(join(ROOT, "docs/goteborg-d1", name)), `docs/goteborg-d1/${name} is required`);
}
const catalogJson = JSON.parse(readFileSync(join(ROOT, "lib/cities/goteborg/stations.json"), "utf8"));
const tramCount = (catalogJson.stations ?? []).filter((row) => row.mode === "tram").length;
const trainCount = (catalogJson.stations ?? []).filter((row) => row.mode === "train").length;
assert(tramCount === 132, `132 unique tram names, got ${tramCount}`);
assert(trainCount === 25, `25 unique train names, got ${trainCount}`);

// Visible to the live app: picker + visibility wiring must include goteborg.
const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*goteborg/.test(appJs), "goteborg must be in LIVE_CITY_IDS");
assert(/NEARBY_MULTI_CITY_IDS = \[[^\]]*goteborg/.test(appJs), "goteborg must be in NEARBY_MULTI_CITY_IDS");
const citySession = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
assert(/MULTI_CITY_IDS = \[[^\]]*goteborg/.test(citySession), "goteborg must be in city-session MULTI_CITY_IDS");
assert(
  !/\{ id: "goteborg"[^}]*comingSoon: true/.test(citySession),
  "goteborg's city-session entry must not be comingSoon after the flip"
);

// Dogfood station list + directions come from the catalog, not GTFS parses.
const stations = listGoteborgDogfoodStations();
assert(stations.length === 157, `dogfood stations must be the 157 D1 names, got ${stations.length}`);
const names = new Set(stations.map((row) => row.name));
assert(names.has(TRAM_HUB) && names.has(PENDELTÅG_HUB), "hubs must be listed");
assert(names.has("Drottningtorget"), "Drottningtorget (renamed tram halt) must be listed");
assert(!names.has("Centralstationen"), "Centralstationen must not be a product name");

const hubPack = getGoteborgDogfoodDirections(TRAM_HUB);
assert(hubPack.source === "goteborg-marketing-ends", "directions source must be goteborg-marketing-ends");
const hub = hubPack.directions;
assert(TRAM_HUB === "Brunnsparken", "tram hub lock is Brunnsparken");
assert(PENDELTÅG_HUB === "Göteborg Central", "pendeltåg hub lock is Göteborg Central");
assert(hub.includes("1 + Tynnered"), "Brunnsparken must offer 1 + Tynnered");
assert(hub.includes("11 + Saltholmen"), "Brunnsparken must offer 11 + Saltholmen");
assert(!hub.some((label) => /^(8|12) \+ /.test(label)), "lines 8 and 12 miss Brunnsparken (Korsvägen)");
assert(!hub.some((label) => /inbound|outbound|to city/i.test(label)), "chips are line + terminus, never to City");
const central = getGoteborgDogfoodDirections(PENDELTÅG_HUB).directions;
assert(central.length === 3 && central.every((label) => label.startsWith("Västtågen + ")), "Göteborg Central is Västtågen only");
assert(getGoteborgDogfoodDirections("Centralstationen").directions.length === 0, "Centralstationen must not collapse into a hub");

// The production dispatch entry exists (unreachable until MULTI_CITY_IDS flip).
const dispatched = await getMultiCityDirections("goteborg", TRAM_HUB);
assert(
  JSON.stringify(dispatched.directions) === JSON.stringify(hub),
  "live-city-api dispatch must return the same chips as the dogfood harness"
);

// Bundled client-side data ships ahead of the flip.
const catalogFile = join(ROOT, "public/city-catalogs/goteborg.json");
assert(existsSync(catalogFile), "public/city-catalogs/goteborg.json must exist");
assert(
  readFileSync(catalogFile, "utf8") === readFileSync(join(ROOT, "lib/cities/goteborg/stations.json"), "utf8"),
  "public/city-catalogs/goteborg.json must be a verbatim copy of lib/cities/goteborg/stations.json"
);
const bundled = JSON.parse(readFileSync(join(ROOT, "public/city-directions/goteborg.json"), "utf8"));
assert(
  hub.every((chip) => (bundled[TRAM_HUB] ?? []).includes(chip)),
  "bundled hub chips must match marketingLabelsForStation"
);

// Live-board honesty: adapter uses Västtrafik as primary, still documents the
// Trafiklab vt RT gap for the timetable fallback, and still attempts the
// standard Trafiklab RT URL so nothing changes if TripUpdates appear later.
const adapterSrc = readFileSync(join(ROOT, "lib/providers/goteborg.js"), "utf8");
assert(/schedule-only/i.test(adapterSrc), "adapter must document the schedule-only fallback reality");
assert(adapterSrc.includes("trafiklabGtfsRtTripUpdatesUrl"), "adapter must still attempt the standard RT URL for the fallback");
assert(adapterSrc.includes("fetchStopAreaDepartures"), "adapter must call the Västtrafik departures cache");
assert(adapterSrc.includes("readVasttrafikCredentials()"), "missing Västtrafik credentials must be a hard error, not a silent fallback");
assert(/TripUpdates not published for vt/i.test(getCity("goteborg")?.integration ?? ""), "registry must document the vt RT gap");

// Live board (creds present) or documented hard error (creds absent) — never
// a silent timetable board when Västtrafik credentials are simply missing.
const hasVasttrafikCreds = Boolean(process.env.VASTTRAFIK_CLIENT_ID) && Boolean(process.env.VASTTRAFIK_CLIENT_SECRET);
if (hasVasttrafikCreds) {
  const liveBoard = await fetchStationBoard(TRAM_HUB);
  assert(
    liveBoard.realtime === "live" || liveBoard.realtime === "timetable",
    "board realtime marker must be live or timetable"
  );
  if (liveBoard.realtime === "live") {
    assert(
      liveBoard.trips.some((trip) => Boolean(trip.liveDeparture)),
      "a live board must carry estimated departure times"
    );
  }
} else {
  let thrown = null;
  try {
    await fetchStationBoard(TRAM_HUB);
  } catch (error) {
    thrown = error;
  }
  assert(
    thrown instanceof MissingVasttrafikCredentialsError,
    "missing VASTTRAFIK_CLIENT_ID/SECRET must throw MissingVasttrafikCredentialsError, not fall back silently"
  );
}

// Västtågen destination-label normalisation (6 Sep 2026 regression:
// docs/jim-brief-goteborg-vasttagen-destination-labels.md). serviceJourney's
// raw direction text ("Göteborg", an intermediate stop like "Floda", or a
// through-running destination beyond the corridor terminus) must be
// normalised to a chip the queried station actually offers — never left
// unmatched, and never mislabelled onto a chip the station doesn't have.
const vasttagenFixture = JSON.parse(
  readFileSync(join(ROOT, "qa/fixtures/goteborg/vasttagen-destinations.json"), "utf8")
);
for (const testCase of vasttagenFixture.cases) {
  const mapped = mapGoteborgDestination(
    testCase.rawDestination,
    testCase.corridorCode,
    testCase.queryStation
  );
  assert(
    mapped === testCase.expectedChip,
    `offline: ${testCase.rawDestination} @ ${testCase.queryStation} must map to ` +
      `${JSON.stringify(testCase.expectedChip)}, got ${JSON.stringify(mapped)}`
  );
}

// Bus rows on tram codes (6 Sep 2026 regression:
// docs/jim-brief-goteborg-bus-rows-on-tram-codes.md). A Kungsbacka town bus
// whose designation collides with a Göteborg tram number (e.g. "2") must
// never survive as a tram row — offline, no network required, must fail on
// pre-fix code and pass after the fix.
const busCollisionFixture = JSON.parse(
  readFileSync(join(ROOT, "qa/fixtures/goteborg/vasttrafik-bus-designation-collision.json"), "utf8")
);
for (const row of busCollisionFixture.rows) {
  const { trip, allowed } = _mapAndFilterVasttrafikDepartureForTests(row, busCollisionFixture.queryStation);
  const mode = row.serviceJourney.line.transportMode;
  const designation = row.serviceJourney.line.designation;
  if (row.expectDropped) {
    assert(
      allowed === false,
      `offline: ${mode} designation "${designation}" toward "${row.serviceJourney.direction}" must be ` +
        `dropped, not admitted as tram/train (got routeShortName=${JSON.stringify(trip.routeShortName)}, ` +
        `transportMode=${JSON.stringify(trip.transportMode)})`
    );
  } else {
    assert(
      allowed === true,
      `offline: genuine ${mode} designation "${designation}" must still be admitted`
    );
    assert(
      trip.transportMode === "tram" || trip.transportMode === "train",
      `offline: admitted trip must carry transportMode tram/train, got ${JSON.stringify(trip.transportMode)}`
    );
  }
}

if (hasVasttrafikCreds) {
  const modeCheckStations = ["Kungsbacka Station", "Lerum Station", TRAM_HUB];
  for (const station of modeCheckStations) {
    const board = await fetchStationBoard(station);
    for (const trip of board.trips) {
      assert(
        trip.transportMode === "tram" || trip.transportMode === "train",
        `live: ${station} board trip "${trip.routeShortName} + ${trip.destination}" must have ` +
          `transportMode tram/train, got ${JSON.stringify(trip.transportMode)} ` +
          `(raw "${trip.rawDestination}")`
      );
      assert(
        !/påstigning/i.test(trip.destination || "") && !/påstigning/i.test(trip.rawDestination || ""),
        `live: ${station} board trip destination must not contain "Påstigning" (bus wording): ` +
          `${JSON.stringify(trip.destination)} / raw ${JSON.stringify(trip.rawDestination)}`
      );
    }
  }

  for (const station of ["Lerum Station", "Alingsås Station"]) {
    const chips = new Set((await getMultiCityDirections("goteborg", station)).directions);
    const board = await fetchStationBoard(station);
    for (const trip of board.trips) {
      assert(
        chips.has(trip.destination),
        `live: ${station} board trip destination "${trip.destination}" ` +
          `(raw "${trip.rawDestination}") must be one of the offered chips: ${[...chips].join(", ")}`
      );
    }
  }

  const lerumNextTrain = await getMultiCityNextTrain("goteborg", {
    station: "Lerum Station",
    destination: "Västtågen + Göteborg Central",
    destinationLabel: "Västtågen + Göteborg Central",
    leaveBeforeMinutes: 120,
  });
  if (lerumNextTrain.next === null) {
    console.log(
      "goteborg-dogfood-gate: Lerum -> Västtågen + Göteborg Central board is genuinely empty right now (e.g. after the last train) — skipping the non-null assertion."
    );
  } else {
    assert(
      lerumNextTrain.next !== null,
      "Lerum -> Västtågen + Göteborg Central must have a non-null next during service hours"
    );
  }
}

// Probe plumbing: local express only; Vercel dev board must 404 regardless.
const previous = process.env.ALLOW_CITY_PROBES;
delete process.env.ALLOW_CITY_PROBES;
assert(isCityProbeAllowed() === false, "CI/default must not allow city probes");
process.env.ALLOW_CITY_PROBES = "1";
assert(isCityProbeAllowed() === true, "ALLOW_CITY_PROBES=1 enables local express probes only");

const res = {
  statusCode: 0,
  body: null,
  setHeader() {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
  end() {},
};
await vercelBoard({ method: "GET", query: { city: "goteborg", station: TRAM_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "goteborg-dogfood-gate: ok (tester-live, dispatch ready, bundled chips, Västtrafik live board / Trafiklab fallback documented, Brunnsparken/Göteborg Central hubs)"
);
