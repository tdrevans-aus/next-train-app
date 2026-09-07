#!/usr/bin/env node
/**
 * Download a real GTFS static zip from Trafiklab, strip it to the
 * route_types/agencies the matching adapter actually uses (keeping the
 * blob small), and publish it to the next-train-gtfs Vercel Blob store at
 * the same stable pathname the fixture publisher uses (gtfs/<city>.zip,
 * allowOverwrite), so loadGtfsStatic({ url: gtfsFixtureBlobUrl(city) })
 * fetches it exactly like scripts/publish-gtfs-fixture-to-blob.mjs's
 * fixture zips. Trafiklab is the *publish* source only — the running app
 * never fetches it directly.
 *
 * @see docs/jim-brief-sweden-static-429-and-key-leak.md
 * @see docs/jim-brief-gtfs-data-platform-scale.md
 *
 * Usage: node scripts/publish-gtfs-snapshot-to-blob.mjs <city>
 * Requires TRAFIKLAB_API_KEY and BLOB_READ_WRITE_TOKEN (in .env.local).
 * On a 429 from Trafiklab this exits non-zero without retrying — the
 * caller should wait for the rate-limit window rather than loop.
 */
import { put } from "@vercel/blob";
import { unzipSync, zipSync } from "fflate";
import { loadEnvLocal } from "../lib/load-env-local.js";
import { parseCsv } from "../lib/providers/gtfs/csv.js";
import { requireTrafiklabApiKey, trafiklabGtfsStaticUrl } from "../lib/providers/gtfs/auth.js";
import { GOTEBORG_OPERATOR, GOTEBORG_ROUTE_TYPES } from "../lib/providers/goteborg.js";
import { MALMO_OPERATOR, MALMO_ROUTE_TYPES } from "../lib/providers/malmo.js";
import {
  UPPSALA_OPERATOR,
  UPPSALA_ROUTE_TYPES,
  MALARDALSTRAFIK_AGENCY_ID,
} from "../lib/providers/uppsala.js";

loadEnvLocal();

/**
 * Per-city Trafiklab operator + the route_types/agencies the adapter keeps.
 * Kept as a superset filter here — loadGtfsStatic's own routeTypes/agencyIds
 * filtering at load time is still authoritative for correctness; this is
 * only to shrink the blob.
 */
const CITY_CONFIG = {
  goteborg: { operator: GOTEBORG_OPERATOR, routeTypes: GOTEBORG_ROUTE_TYPES, agencyIds: null },
  malmo: { operator: MALMO_OPERATOR, routeTypes: MALMO_ROUTE_TYPES, agencyIds: null },
  uppsala: {
    operator: UPPSALA_OPERATOR,
    routeTypes: UPPSALA_ROUTE_TYPES,
    agencyIds: [MALARDALSTRAFIK_AGENCY_ID],
  },
};

function csvField(value) {
  const raw = String(value ?? "");
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function serializeCsv(headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvField(row[header])).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

function findEntry(files, name) {
  const key = name in files ? name : Object.keys(files).find((entry) => entry.endsWith(`/${name}`));
  return key ?? null;
}

function readTable(files, name) {
  const key = findEntry(files, name);
  if (!key) {
    return null;
  }
  const text = Buffer.from(files[key]).toString("utf8");
  return parseCsv(text);
}

/**
 * Strip a downloaded GTFS zip's files dict down to the routes/agencies the
 * adapter keeps, and everything those routes reference (trips, stop_times,
 * stops incl. parent stations). Tables not touched here (agency, calendar,
 * calendar_dates, feed_info, shapes) are passed through unchanged — they're
 * small relative to stop_times/stops on a regional feed.
 */
function stripToConfig(files, config) {
  const routes = readTable(files, "routes.txt");
  const trips = readTable(files, "trips.txt");
  const stopTimes = readTable(files, "stop_times.txt");
  const stops = readTable(files, "stops.txt");
  if (!routes || !trips || !stopTimes || !stops) {
    // Missing an expected table — publish the zip unfiltered rather than guess.
    return files;
  }

  const routeTypeSet = new Set((config.routeTypes ?? []).map(String));
  const agencyIdSet = config.agencyIds ? new Set(config.agencyIds.map(String)) : null;

  const keptRoutes = routes.filter((route) => {
    if (routeTypeSet.size && !routeTypeSet.has(String(route.route_type))) {
      return false;
    }
    if (agencyIdSet && !agencyIdSet.has(String(route.agency_id))) {
      return false;
    }
    return true;
  });
  const keptRouteIds = new Set(keptRoutes.map((route) => route.route_id));

  const keptTrips = trips.filter((trip) => keptRouteIds.has(trip.route_id));
  const keptTripIds = new Set(keptTrips.map((trip) => trip.trip_id));

  const keptStopTimes = stopTimes.filter((row) => keptTripIds.has(row.trip_id));
  const keptStopIds = new Set(keptStopTimes.map((row) => row.stop_id));
  // Pull in parent stations for any kept stop, matching static-cache.js's
  // own parent_station expansion so a kept child stop's parent is never
  // dropped.
  for (const stop of stops) {
    if (keptStopIds.has(stop.stop_id) && stop.parent_station) {
      keptStopIds.add(stop.parent_station);
    }
  }
  const keptStops = stops.filter((stop) => keptStopIds.has(stop.stop_id));

  const output = { ...files };
  const routesKey = findEntry(files, "routes.txt");
  const tripsKey = findEntry(files, "trips.txt");
  const stopTimesKey = findEntry(files, "stop_times.txt");
  const stopsKey = findEntry(files, "stops.txt");
  output[routesKey] = new TextEncoder().encode(
    serializeCsv(Object.keys(routes[0] ?? { route_id: "" }), keptRoutes)
  );
  output[tripsKey] = new TextEncoder().encode(
    serializeCsv(Object.keys(trips[0] ?? { trip_id: "" }), keptTrips)
  );
  output[stopTimesKey] = new TextEncoder().encode(
    serializeCsv(Object.keys(stopTimes[0] ?? { trip_id: "" }), keptStopTimes)
  );
  output[stopsKey] = new TextEncoder().encode(
    serializeCsv(Object.keys(stops[0] ?? { stop_id: "" }), keptStops)
  );
  return output;
}

async function main() {
  const city = process.argv[2];
  const config = CITY_CONFIG[city];
  if (!config) {
    console.error(`Usage: node scripts/publish-gtfs-snapshot-to-blob.mjs <${Object.keys(CITY_CONFIG).join("|")}>`);
    process.exit(1);
  }

  const key = requireTrafiklabApiKey();
  const url = trafiklabGtfsStaticUrl(config.operator, key);
  console.log(`Downloading ${config.operator} static GTFS from Trafiklab…`);
  const response = await fetch(url, {
    headers: { Accept: "application/zip, application/octet-stream, */*" },
  });
  if (!response.ok) {
    console.error(
      `Trafiklab GTFS static download failed: HTTP ${response.status} for operator "${config.operator}". ` +
        (response.status === 429
          ? "Rate limited — wait for the window rather than retrying now."
          : "")
    );
    process.exit(1);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const files = unzipSync(new Uint8Array(buffer));
  const beforeBytes = buffer.length;

  const stripped = stripToConfig(files, config);
  const zipped = zipSync(stripped, { level: 6 });

  console.log(
    `${city}: downloaded ${(beforeBytes / 1024 / 1024).toFixed(2)} MB, publishing ${(zipped.length / 1024 / 1024).toFixed(2)} MB stripped to routeTypes=${JSON.stringify(config.routeTypes)}${config.agencyIds ? ` agencyIds=${JSON.stringify(config.agencyIds)}` : ""}`
  );

  const pathname = `gtfs/${city}.zip`;
  const blob = await put(pathname, Buffer.from(zipped), {
    access: "public",
    allowOverwrite: true,
    contentType: "application/zip",
  });

  console.log(`Published ${city}: ${blob.url}`);
}

main().catch((err) => {
  console.error(err?.stack || err);
  process.exit(1);
});
