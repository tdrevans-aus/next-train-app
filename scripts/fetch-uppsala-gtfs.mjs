#!/usr/bin/env node
/**
 * One-off tool for the Uppsala D1 pack: fetch Trafiklab GTFS Regional
 * operator `ul` (agency "Mälardalstrafik"), filter to route_type 100
 * (Mälartåg regional rail only — excludes UL buses, route_type 700),
 * and dump routes/trips/stop patterns + station coordinates so
 * published-network.json can be generated from real data, not the map.
 *
 * Writes scratch JSON to docs/uppsala-d1/_gtfs-dump.json for inspection.
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { unzipSync } from "../lib/vendor/fflate.mjs";
import { parseCsv } from "../lib/providers/gtfs/csv.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function main() {
  const key = requireEnv("TRAFIKLAB_API_KEY");
  const url = `https://opendata.samtrafiken.se/gtfs/ul/ul.zip?key=${encodeURIComponent(key)}`;
  console.log(`Fetching ${url.replace(key, "***")}`);
  const res = await fetch(url, { headers: { Accept: "application/zip, application/octet-stream, */*" } });
  console.log("status", res.status);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  console.log("bytes", buf.length);
  const files = unzipSync(buf);
  console.log("files", Object.keys(files));

  function table(name) {
    const key = Object.keys(files).find((f) => f.endsWith(name));
    if (!key) throw new Error(`${name} not found`);
    const text = new TextDecoder("utf-8").decode(files[key]);
    return parseCsv(text);
  }

  const agencies = table("agency.txt");
  const routes = table("routes.txt");
  const trips = table("trips.txt");
  const stopTimes = table("stop_times.txt");
  const stops = table("stops.txt");

  console.log("agencies", agencies.map((a) => `${a.agency_id}:${a.agency_name}`));
  const routeTypeCounts = {};
  for (const r of routes) routeTypeCounts[r.route_type] = (routeTypeCounts[r.route_type] || 0) + 1;
  console.log("route_type counts", routeTypeCounts);

  const agencyById = new Map(agencies.map((a) => [a.agency_id, a]));
  const malartagRoutes = routes.filter((r) => {
    const agency = agencyById.get(r.agency_id);
    return String(r.route_type) === "100" && agency && /m[aä]lardalstrafik/i.test(agency.agency_name);
  });
  console.log("Mälartåg routes (route_type 100, agency Mälardalstrafik):", malartagRoutes.length);
  for (const r of malartagRoutes) {
    console.log(" ", r.route_id, r.route_short_name, "|", r.route_long_name, "| agency", agencyById.get(r.agency_id)?.agency_name);
  }

  const routeIds = new Set(malartagRoutes.map((r) => r.route_id));
  const malartagTrips = trips.filter((t) => routeIds.has(t.route_id));
  console.log("Mälartåg trips:", malartagTrips.length);

  const tripIds = new Set(malartagTrips.map((t) => t.trip_id));
  const stopsById = new Map(stops.map((s) => [s.stop_id, s]));

  // Build per-route stop patterns (ordered stop_name sequences), dedup by pattern string.
  const stopTimesByTrip = new Map();
  for (const st of stopTimes) {
    if (!tripIds.has(st.trip_id)) continue;
    if (!stopTimesByTrip.has(st.trip_id)) stopTimesByTrip.set(st.trip_id, []);
    stopTimesByTrip.get(st.trip_id).push(st);
  }
  for (const arr of stopTimesByTrip.values()) arr.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));

  function stopName(stopId) {
    const s = stopsById.get(stopId);
    if (!s) return stopId;
    // resolve to parent name if this is a child platform
    if (s.parent_station && stopsById.has(s.parent_station)) {
      return stopsById.get(s.parent_station).stop_name;
    }
    return s.stop_name;
  }

  const tripsByRoute = new Map();
  for (const t of malartagTrips) {
    if (!tripsByRoute.has(t.route_id)) tripsByRoute.set(t.route_id, []);
    tripsByRoute.get(t.route_id).push(t);
  }

  const routeSummaries = [];
  for (const route of malartagRoutes) {
    const routeTrips = tripsByRoute.get(route.route_id) || [];
    const patternCounts = new Map();
    for (const t of routeTrips) {
      const sts = stopTimesByTrip.get(t.trip_id) || [];
      const names = sts.map((st) => stopName(st.stop_id));
      const key = names.join(" > ");
      if (!patternCounts.has(key)) patternCounts.set(key, { count: 0, headsigns: new Set(), example: t.trip_id });
      const p = patternCounts.get(key);
      p.count += 1;
      if (t.trip_headsign) p.headsigns.add(t.trip_headsign);
    }
    const patterns = [...patternCounts.entries()]
      .map(([pattern, meta]) => ({ pattern, count: meta.count, headsigns: [...meta.headsigns], example: meta.example }))
      .sort((a, b) => b.count - a.count);
    routeSummaries.push({
      route_id: route.route_id,
      route_short_name: route.route_short_name,
      route_long_name: route.route_long_name,
      tripCount: routeTrips.length,
      patterns,
    });
  }

  // Collect every stop name (parent-resolved) called by any Mälartåg trip, with coordinates.
  const stationCoords = new Map();
  for (const tripId of tripIds) {
    const sts = stopTimesByTrip.get(tripId) || [];
    for (const st of sts) {
      const s = stopsById.get(st.stop_id);
      if (!s) continue;
      const parent = s.parent_station && stopsById.has(s.parent_station) ? stopsById.get(s.parent_station) : s;
      const name = parent.stop_name;
      const lat = Number(parent.stop_lat);
      const lng = Number(parent.stop_lon);
      if (!stationCoords.has(name) && Number.isFinite(lat) && Number.isFinite(lng)) {
        stationCoords.set(name, { lat, lng, stop_id: parent.stop_id });
      }
    }
  }

  const out = {
    fetchedAt: new Date().toISOString(),
    agencies,
    routeTypeCounts,
    malartagRoutes: malartagRoutes.map((r) => ({ ...r, agency_name: agencyById.get(r.agency_id)?.agency_name })),
    routeSummaries,
    stationCoords: Object.fromEntries(stationCoords),
  };
  const outPath = join(ROOT, "docs/uppsala-d1/_gtfs-dump.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  console.log("Wrote", outPath);
  console.log("Distinct stations with coords:", stationCoords.size);
}

main().catch((e) => {
  console.error("FAILED", e);
  process.exit(1);
});
