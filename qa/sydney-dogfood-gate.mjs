/**
 * Sydney is live on Vercel; Melbourne stays planned; /api/dev/board stays 404.
 */
import { assertCityLive } from "../lib/providers/registry.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import directionsHandler from "../api/directions.js";
import { getMultiCityDirections } from "../lib/cities/live-city-api.js";
import { marketingLabelsForStation } from "../lib/cities/sydney/marketing-directions.js";
import {
  SYDNEY_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
  loadSydneyStatic,
} from "../lib/providers/sydney.js";
import { readTfnswApiKey } from "../lib/providers/gtfs/auth.js";
import { assertSnapshotNotStaleTodayOrSkip } from "./lib/assert-not-stale.mjs";
import { loadLocalGtfsSnapshotForStaleCheck } from "./lib/local-gtfs-snapshot.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const live = assertCityLive("sydney");
assert(live && live.ok === true, "assertCityLive(sydney) must pass");

const melbourne = assertCityLive("melbourne");
assert(melbourne && melbourne.ok === false, "Melbourne must stay planned");

const perth = assertCityLive("perth");
assert(perth && perth.ok === true, "Perth live-gate must stay green");

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

await vercelBoard({ method: "GET", query: { city: "sydney", station: "Central" } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

const central = marketingLabelsForStation("Central");
assert(central.includes("T1 Emu Plains"), "Central must offer T1 Emu Plains");
// FB-62 (10 Sep 2026, tim-review): T2/T3/T8 now carry a real city-bound "City
// Circle" chip (thousands of live GTFS headsigns each) — Central is on those
// lines, so it legitimately offers e.g. "T8 City Circle". T1/T4/T5/T9/M1 never
// end at the City Circle and must never show one; see
// qa/sydney-direction-match.mjs for the full FB-62 gate.
assert(
  !central.some((label) => /^(T1|T4|T5|T9|M1) .*city circle/i.test(label)),
  "T1/T4/T5/T9/M1 must never show a City Circle chip"
);
assert(!central.some((label) => label.startsWith("M1 ")), "Central trains must not show Metro chips");

const metro = marketingLabelsForStation("Central Metro");
assert(metro.includes("M1 Tallawong") && metro.includes("M1 Sydenham"), "Central Metro is M1 only");
assert(!metro.some((label) => label.startsWith("T")), "Central Metro must not show Trains chips");

const banksia = marketingLabelsForStation("Banksia");
assert(banksia.includes("T4 Bondi Junction"), "Banksia must offer T4 Bondi Junction");
assert(
  banksia.includes("T4 Waterfall") && banksia.includes("T4 Cronulla"),
  "Banksia is T4 Illawarra"
);

const banksiaPack = await getMultiCityDirections("sydney", "Banksia");
assert(Array.isArray(banksiaPack.directions), "getMultiCityDirections must resolve to a directions array");
assert(
  banksiaPack.directions.includes("T4 Bondi Junction"),
  "Banksia directions pack includes T4 Bondi Junction"
);

const banksiaRes = {
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
await directionsHandler(
  { method: "GET", headers: {}, query: { city: "sydney", station: "Banksia" } },
  banksiaRes
);
assert(banksiaRes.statusCode === 200, `Banksia /api/directions must 200, got ${banksiaRes.statusCode}`);
assert(
  Array.isArray(banksiaRes.body?.directions) && banksiaRes.body.directions.includes("T4 Bondi Junction"),
  "Banksia /api/directions must return T4 chips, not an unresolved Promise"
);

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

// NSW TrainLink intercity + Hunter fill (14 Sep 2026,
// docs/jim-brief-sydney-intercity-fill.md): catalog must have picked up the new stations, and
// a live TfNSW board probe for four of them, skip-with-reason when TFNSW_API_KEY isn't set
// (same pattern as qa/edinburgh-dogfood-gate.mjs's Darwin-token-optional probes).
const catalogStations = new Set(listCatalogStations().map((s) => s.name));
for (const name of [
  "Gosford",
  "Wyong",
  "Newcastle Interchange",
  "Katoomba",
  "Lithgow",
  "Wollongong",
  "Kiama",
  "Moss Vale",
  "Maitland",
  "Dungog",
]) {
  assert(catalogStations.has(name), `Sydney catalog must include ${name} (NSW TrainLink intercity fill)`);
}

if (readTfnswApiKey()) {
  for (const name of ["Gosford", "Katoomba", "Wollongong", "Newcastle Interchange"]) {
    const board = await fetchStationBoard(name);
    assert(Array.isArray(board.trips), `${name} live board must return a trips array`);
  }
  console.log("sydney-dogfood-gate: TFNSW_API_KEY set — probed live intercity boards at Gosford/Katoomba/Wollongong/Newcastle Interchange");
} else {
  console.log(
    "sydney-dogfood-gate: TFNSW_API_KEY not set in this environment — Gosford/Katoomba/Wollongong/Newcastle Interchange live board probe skipped (expected outside Vercel prod)."
  );
}

// Coordinate-distance assertion (docs/jim-brief-sydney-intercity-followups.md item 2 /
// acceptance criterion 3 — the Sydney equivalent of qa/uk-catalog-coords-gate.mjs). #394's
// Newcastle Interchange entry was ~2.2km from the feed's parent-station coordinates; every
// catalog station's lat/lng must now be within 300m of the live feed's parent-station
// coordinates for at least one of its stopIds. Skip-with-reason when TFNSW_API_KEY isn't set,
// same pattern as the live board probe above.
function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

if (readTfnswApiKey()) {
  const staticData = await loadSydneyStatic();
  const rawById = new Map(staticData.stops.map((s) => [s.stop_id, s]));
  function effectiveCoords(stopId) {
    let stop = rawById.get(stopId);
    if (!stop) return null;
    let hops = 0;
    while (stop.parent_station && rawById.has(stop.parent_station) && hops < 5) {
      stop = rawById.get(stop.parent_station);
      hops += 1;
    }
    const lat = Number(stop.stop_lat);
    const lng = Number(stop.stop_lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  const COORD_CEILING_M = 300;
  const offenders = [];
  for (const station of listCatalogStations()) {
    let best = null;
    for (const stopId of station.stopIds ?? []) {
      const coords = effectiveCoords(stopId);
      if (!coords) continue;
      const dist = haversineMeters({ lat: station.lat, lng: station.lng }, coords);
      if (best === null || dist < best) {
        best = dist;
      }
    }
    if (best !== null && best > COORD_CEILING_M) {
      offenders.push(`${station.name} (${best.toFixed(0)}m)`);
    }
  }
  assert(
    offenders.length === 0,
    `Catalog stations more than ${COORD_CEILING_M}m from their feed parent-station coordinates: ${offenders.join(", ")}`
  );
  console.log(
    `sydney-dogfood-gate: TFNSW_API_KEY set — coordinate-distance check passed for ${listCatalogStations().length} catalog stations`
  );
} else {
  console.log(
    "sydney-dogfood-gate: TFNSW_API_KEY not set in this environment — coordinate-distance check skipped (expected outside Vercel prod)."
  );
}

// Local fixture, not the live TfNSW feed — see qa/lib/local-gtfs-snapshot.mjs
// and docs/jim-brief-blob-transfer-reduction.md (item 1). Real-snapshot
// freshness is monitored on a schedule by qa/prod-sweep.mjs and
// qa/gtfs-live-blob-snapshot-integrity.mjs, not per-PR here.
await assertSnapshotNotStaleTodayOrSkip("sydney", () =>
  loadLocalGtfsSnapshotForStaleCheck("sydney", SYDNEY_TIME_ZONE)
);

console.log("sydney-dogfood-gate: ok (live, Vercel board 404, City Circle not a terminus, disjoint chips, snapshot not stale today)");
