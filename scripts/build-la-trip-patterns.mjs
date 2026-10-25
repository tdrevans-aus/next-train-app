/**
 * Regenerates qa/fixtures/los-angeles/rail-trip-patterns.json from LA Metro's real static rail feed
 * (gtfs_rail.zip). The dogfood gate reads the pinned JSON offline; run this (network: one download from
 * the LACMTA GitLab, not Vercel Blob) when the feed's service pattern changes and the gate asks for it.
 * Usage: node scripts/build-la-trip-patterns.mjs
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadLosAngelesStatic } from "../lib/providers/los-angeles.js";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "qa/fixtures/los-angeles");
mkdirSync(dir, { recursive: true });
const out = join(dir, "rail-trip-patterns.json");

const data = await loadLosAngelesStatic();
const byTrip = new Map();
for (const list of data.stopTimesByStopId.values()) {
  for (const st of list) {
    if (!byTrip.has(st.trip_id)) byTrip.set(st.trip_id, []);
    byTrip.get(st.trip_id).push(st);
  }
}
const patterns = new Map();
for (const [tripId, calls] of byTrip) {
  const trip = data.tripsById.get(tripId);
  if (!trip) continue;
  calls.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
  const stops = calls.map((c) => c.stop_id);
  const headsigns = calls.map((c) => c.stop_headsign || "");
  const key = JSON.stringify([trip.route_id, stops, headsigns]);
  const p = patterns.get(key) ?? { route_id: trip.route_id, stops, headsigns, trips: 0 };
  p.trips += 1;
  patterns.set(key, p);
}
const used = new Set([...patterns.values()].flatMap((p) => p.stops));
for (const id of [...used]) {
  const parent = data.stopsById.get(id)?.parent_station;
  if (parent) used.add(parent);
}
const stops = data.stops
  .filter((s) => used.has(s.stop_id))
  .map((s) => ({
    stop_id: s.stop_id,
    stop_name: s.stop_name,
    location_type: s.location_type ?? "",
    parent_station: s.parent_station ?? "",
  }));
const routes = [...data.routesById.values()].map((r) => ({
  route_id: r.route_id,
  route_short_name: r.route_short_name ?? "",
  route_long_name: r.route_long_name ?? "",
}));
writeFileSync(
  out,
  JSON.stringify({
    generatedAt: new Date().toISOString().slice(0, 10),
    source: "gtfs_rail.zip (LACMTA)",
    routes,
    stops,
    patterns: [...patterns.values()],
  }) + "\n"
);
console.log(`patterns=${patterns.size} stops=${stops.length} routes=${routes.length}`);
