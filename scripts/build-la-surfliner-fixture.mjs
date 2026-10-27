/**
 * Regenerates qa/fixtures/los-angeles/amtrak-surfliner-real.json: a small extract of Amtrak's REAL
 * static GTFS (route 78, Pacific Surfliner, trips calling at LAX) with its agency.txt row, plus one
 * captured transitdocs TripUpdate entity for one of those trips. The dogfood gate reads it offline
 * (no network in CI or smoke) to prove the live-to-static join lands a Union Station row at the
 * right Los Angeles wall-clock time - Amtrak's static times are America/New_York, not LA.
 *
 * Network: one download of content.amtrak.com GTFS.zip + one transitdocs GTFS-RT fetch. Run by
 * hand, only when the gate asks for a refresh or the feed shape changes, ideally during LA service
 * hours so a live route-78 update calling at LAX exists:
 *   node scripts/build-la-surfliner-fixture.mjs
 * The pinned "now" is derived from the capture, so the fixture stays self-consistent.
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { unzipSync } from "../lib/vendor/fflate.mjs";
import { AMTRAK_GTFS_STATIC_URL, TRANSITDOCS_TRIP_UPDATES_URL, SURFLINER_ROUTE_ID, SURFLINER_STOP_ID } from "../lib/providers/los-angeles.js";
import { fetchTripUpdates } from "../lib/providers/gtfs/realtime.js";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "qa/fixtures/los-angeles");
mkdirSync(dir, { recursive: true });

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const [head, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h.replace(/^﻿/, ""), r[i] ?? ""])));
}

const res = await fetch(AMTRAK_GTFS_STATIC_URL);
if (!res.ok) throw new Error(`Amtrak GTFS ${res.status}`);
const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
const table = (name) => parseCsv(new TextDecoder().decode(files[name]));

const agency = table("agency.txt");
const routes = table("routes.txt").filter((r) => r.route_id === SURFLINER_ROUTE_ID);
const trips = table("trips.txt").filter((t) => t.route_id === SURFLINER_ROUTE_ID);
const tripIds = new Set(trips.map((t) => t.trip_id));
const stopTimes = table("stop_times.txt").filter((s) => tripIds.has(s.trip_id));
const callsAtLax = new Set(stopTimes.filter((s) => s.stop_id === SURFLINER_STOP_ID).map((s) => s.trip_id));
const keepTrips = trips.filter((t) => callsAtLax.has(t.trip_id));
const keepIds = new Set(keepTrips.map((t) => t.trip_id));
const keepStopTimes = stopTimes.filter((s) => keepIds.has(s.trip_id));
const stopIds = new Set(keepStopTimes.map((s) => s.stop_id));
const serviceIds = new Set(keepTrips.map((t) => t.service_id));

const live = await fetchTripUpdates(TRANSITDOCS_TRIP_UPDATES_URL, { timeoutMs: 15000 });
const plain = (v) =>
  JSON.parse(
    JSON.stringify(v, (_k, x) =>
      x && typeof x === "object" && "low" in x && "high" in x ? Number((BigInt(x.high >>> 0) << 32n) + BigInt(x.low >>> 0)) : x
    )
  );
const candidates = live.entities.filter((e) => {
  const tu = e.tripUpdate;
  if (!tu || String(tu.trip?.routeId) !== SURFLINER_ROUTE_ID) return false;
  const stu = (tu.stopTimeUpdate ?? []).find((s) => s.stopId === SURFLINER_STOP_ID);
  return stu && (stu.departure?.time ?? stu.arrival?.time);
});
console.log(`route-78 updates at LAX: ${candidates.length}; sample trip ids: ${candidates.slice(0, 3).map((e) => e.tripUpdate.trip.tripId).join(", ")}`);
if (!candidates.length) throw new Error("no live route-78 TripUpdate calling at LAX (run during service hours)");
const chosen = candidates[0];
const entity = plain(chosen);
// Keep only the LAX stop_time_update so the fixture stays small.
entity.tripUpdate.stopTimeUpdate = entity.tripUpdate.stopTimeUpdate.filter((s) => s.stopId === SURFLINER_STOP_ID);
const laxUpdate = entity.tripUpdate.stopTimeUpdate[0];
const laxEpoch = Number(laxUpdate.departure?.time ?? laxUpdate.arrival?.time);

writeFileSync(
  join(dir, "amtrak-surfliner-real.json"),
  JSON.stringify({
    generatedAt: live.fetchedAt.toISOString(),
    source: "content.amtrak.com GTFS.zip (route 78 trips calling at LAX) + transitdocs GTFS-RT",
    agency,
    routes,
    trips: keepTrips,
    stop_times: keepStopTimes.map(({ trip_id, stop_id, stop_sequence, arrival_time, departure_time, pickup_type }) => ({
      trip_id,
      stop_id,
      stop_sequence,
      arrival_time,
      departure_time,
      pickup_type: pickup_type ?? "0",
    })),
    stops: table("stops.txt")
      .filter((s) => stopIds.has(s.stop_id))
      .map(({ stop_id, stop_name, location_type, parent_station }) => ({ stop_id, stop_name, location_type, parent_station })),
    calendar: table("calendar.txt").filter((c) => serviceIds.has(c.service_id)),
    calendar_dates: table("calendar_dates.txt").filter((c) => serviceIds.has(c.service_id)),
    capture: {
      // A "now" six minutes before the captured LAX departure, so the row is in-window.
      now: new Date(laxEpoch * 1000 - 6 * 60_000).toISOString(),
      laxDepartureEpoch: laxEpoch,
      entity,
    },
  }) + "\n"
);
console.log(`agency tz=${agency[0]?.agency_timezone} trips=${keepTrips.length} stop_times=${keepStopTimes.length} captured trip ${entity.tripUpdate.trip.tripId}`);
