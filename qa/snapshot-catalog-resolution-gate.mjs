/**
 * Offline gate (docs/jim-brief-uppsala-unknown-station-after-refresh.md): every catalog station of the
 * Trafiklab runtime-resolved cities (Uppsala, Malmö) must resolve against the snapshot's stops, and the
 * publisher must refuse to publish a snapshot where they do not.
 *
 * Incident: on 22 Nov 2026 the Trafiklab `ul` feed dropped every rail route; the daily refresh stripped
 * it to rail only, published an empty snapshot over the good one, and Uppsala answered 500 "Unknown
 * Uppsala station" until 24 Nov while /api/directions and /api/city-stations stayed 200.
 *
 * Why offline + publish-time rather than a live-blob check alone: the publish-time assertion
 * (scripts/publish-gtfs-snapshot-to-blob.mjs -> lib/providers/gtfs/catalog-resolution.js) is what keeps
 * the OLD blob in place, and it needs no network to prove. The cases here run the real stripToConfig +
 * assertion over (1) a rail-less raw feed shaped like the 22 Nov `ul` feed, (2) a healthy feed, (3) a
 * feed whose rail stops were renamed, plus Malmö's real published stops (committed fixture).
 * No network, no Blob.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { stripToConfig, CITY_CONFIG, catalogStationsFor } from "../scripts/publish-gtfs-snapshot-to-blob.mjs";
import { assertSnapshotResolvesCatalog, unresolvedCatalogStations } from "../lib/providers/gtfs/catalog-resolution.js";
import { parseCsv } from "../lib/providers/gtfs/csv.js";
import { FeedUnavailableError } from "../lib/providers/gtfs/errors.js";
import { fetchStationBoard as uppsalaBoard } from "../lib/providers/uppsala.js";
import { fetchStationBoard as malmoBoard } from "../lib/providers/malmo.js";

const enc = (t) => new TextEncoder().encode(t);
const table = (files, name) => parseCsv(Buffer.from(files[name]).toString("utf8"));

/** A raw operator feed: one bus route plus (optionally) a rail route calling at every stop name. */
function rawFeed({ agencyId, railRouteType, railStopNames }) {
  const routes = ["route_id,agency_id,route_short_name,route_long_name,route_type,route_desc", `B1,UL,1,,700,Stadsbuss`];
  const trips = ["route_id,service_id,trip_id", "B1,1,BT1"];
  const stopTimes = ["trip_id,stop_id,stop_sequence,arrival_time,departure_time", "BT1,BUS1,1,08:00:00,08:00:00"];
  const stops = ["stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station", "BUS1,Busstopp,59.0,17.0,0,"];
  if (railStopNames) {
    routes.push(`R1,${agencyId},9,,${railRouteType},Tag`);
    trips.push("R1,1,RT1");
    railStopNames.forEach((name, i) => {
      stops.push(`S${i},${name},59.0,17.0,0,`);
      stopTimes.push(`RT1,S${i},${i + 1},09:00:00,09:00:00`);
    });
  }
  return {
    "routes.txt": enc(routes.join("\r\n") + "\r\n"),
    "trips.txt": enc(trips.join("\r\n") + "\r\n"),
    "stop_times.txt": enc(stopTimes.join("\r\n") + "\r\n"),
    "stops.txt": enc(stops.join("\r\n") + "\r\n"),
    "agency.txt": enc("agency_id,agency_name\r\nUL,UL\r\n"),
  };
}

function publishCheck(city, files) {
  const stripped = stripToConfig(files, CITY_CONFIG[city]);
  assertSnapshotResolvesCatalog({
    city,
    trips: table(stripped, "trips.txt"),
    stops: table(stripped, "stops.txt"),
    catalogStations: catalogStationsFor(city),
  });
}

const uppsalaCatalog = catalogStationsFor("uppsala");
assert.ok(uppsalaCatalog.length >= 15, "uppsala catalog should have its stations");
const agency = CITY_CONFIG.uppsala.agencyIds[0];

// 1. The 22 Nov state: raw feed with buses only -> stripped snapshot empty -> publisher refuses.
assert.throws(
  () => publishCheck("uppsala", rawFeed({ agencyId: agency, railRouteType: 100, railStopNames: null })),
  /Refusing to publish; the existing blob is left in place/,
  "a rail-less ul feed must be refused at publish time"
);

// 2. Healthy: every catalog name present as a rail stop -> publishes.
const healthy = rawFeed({
  agencyId: agency,
  railRouteType: 100,
  railStopNames: uppsalaCatalog.map((s) => `${s.name} (Uppsala)`),
});
publishCheck("uppsala", healthy);

// 3. Renamed stops (feed restructure): rail present, Uppsala C gone -> names the unresolved station.
const renamed = rawFeed({
  agencyId: agency,
  railRouteType: 100,
  railStopNames: uppsalaCatalog.map((s) => (s.name === "Uppsala C" ? "Uppsala Resecentrum" : s.name)),
});
assert.throws(() => publishCheck("uppsala", renamed), /Uppsala C/, "renamed hub must be named in the failure");

// 4. Wrong agency -> routes dropped by the strip -> refused (SL-pendeln-only feed must not pass).
assert.throws(
  () => publishCheck("uppsala", rawFeed({ agencyId: "33010000000547186", railRouteType: 100, railStopNames: uppsalaCatalog.map((s) => s.name) })),
  /Refusing to publish/
);

// 5. Malmö: every catalog station resolves against the real published stops (healthy 24 Nov 2026).
const malmoFixture = JSON.parse(
  readFileSync(fileURLToPath(new URL("./fixtures/malmo/published-stops-2026-11-24.json", import.meta.url)), "utf8")
);
const malmoCatalog = catalogStationsFor("malmo");
assert.deepEqual(unresolvedCatalogStations(malmoFixture.stops, malmoCatalog), [], "Malmö catalog must resolve");
// ... and the same fixture with the rail stops removed goes red.
assert.ok(
  unresolvedCatalogStations(malmoFixture.stops.slice(0, 0), malmoCatalog).length === malmoCatalog.length,
  "empty stops -> every Malmö station unresolved"
);

// 6. Runtime: an empty published snapshot is a 503-class FeedUnavailableError, not "Unknown station" (500).
const emptyStatic = {
  stops: [],
  stopsById: new Map(),
  routes: [],
  routesById: new Map(),
  trips: [],
  tripsById: new Map(),
  calendar: [],
  calendarDates: [],
  stopTimesByStopId: new Map(),
};
for (const [name, board, station] of [
  ["uppsala", uppsalaBoard, "Uppsala C"],
  ["malmo", malmoBoard, "Malmö C"],
]) {
  await assert.rejects(
    () => board(station, { loadStatic: async () => emptyStatic, now: new Date("2026-11-25T08:00:00Z") }),
    (err) => err instanceof FeedUnavailableError,
    `${name}: empty snapshot must surface as FeedUnavailableError`
  );
}

console.log("snapshot-catalog-resolution-gate: PASS");
