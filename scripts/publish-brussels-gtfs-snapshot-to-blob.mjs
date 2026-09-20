#!/usr/bin/env node
/**
 * Download STIB/MIVB's real, unkeyed GTFS static zip from the Belgian
 * Mobility open-data discovery host, strip it to metro (route_type "1",
 * lines 1/2/5/6) only, and publish it to the next-train-gtfs Vercel Blob
 * store at the same stable pathname loadGtfsStatic({ url }) reads
 * (gtfs/brussels.zip, allowOverwrite) — the pattern
 * scripts/publish-gtfs-snapshot-to-blob.mjs uses for the Swedish cities.
 * The running app (lib/providers/brussels.js's scheduled metro tail) never
 * downloads or parses the upstream zip itself; it only ever reads this
 * published, pre-trimmed snapshot.
 *
 * @see docs/jim-brief-brussels-scheduled-tail-and-sncb-grouping.md
 *
 * Usage: node scripts/publish-brussels-gtfs-snapshot-to-blob.mjs
 * Requires BLOB_READ_WRITE_TOKEN (in .env.local). The discovery URL below
 * is unauthenticated (confirmed 200 application/zip, no key needed).
 */
import { put } from "@vercel/blob";
import { unzipSync, zipSync } from "fflate";
import { loadEnvLocal } from "../lib/load-env-local.js";
import { parseCsv } from "../lib/providers/gtfs/csv.js";
import { BRUSSELS_METRO_SHORT_NAMES } from "../lib/providers/brussels.js";

loadEnvLocal();

const STIB_STATIC_DISCOVERY_URL =
  "https://opendata-discovery-gtfs-static.api.production.belgianmobility.io/api/gtfs/feed/stibmivb/static";

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
 * Keep only routes.txt/trips.txt/stop_times.txt/stops.txt rows reachable
 * from route_type "1" (metro) — same shape as
 * scripts/publish-gtfs-snapshot-to-blob.mjs's stripToConfig, generalized
 * to a single route_type filter since Brussels' route_short_name ("1",
 * "2", "5", "6") isn't unique across route_types in this feed (route_id
 * is the only reliable key). shapes.txt/translations.txt/agency.txt/
 * feed_info.txt are dropped entirely — lib/providers/gtfs/static-cache.js
 * never reads them (only stops/routes/calendar/calendar_dates/trips/
 * stop_times). calendar.txt/calendar_dates.txt are kept unfiltered (small,
 * and activeServicesForDate() needs every service_id trips.txt references).
 */
function stripToMetro(files) {
  const routes = readTable(files, "routes.txt");
  const trips = readTable(files, "trips.txt");
  const stopTimes = readTable(files, "stop_times.txt");
  const stops = readTable(files, "stops.txt");
  const calendar = readTable(files, "calendar.txt");
  const calendarDates = readTable(files, "calendar_dates.txt");
  if (!routes || !trips || !stopTimes || !stops || !calendar) {
    throw new Error("Downloaded STIB GTFS zip is missing an expected table — refusing to publish a guess.");
  }

  const keptRoutes = routes.filter((route) => String(route.route_type) === "1");
  const keptRouteShortNames = new Set(keptRoutes.map((route) => String(route.route_short_name)));
  for (const name of BRUSSELS_METRO_SHORT_NAMES) {
    if (!keptRouteShortNames.has(name)) {
      throw new Error(
        `Downloaded STIB GTFS zip's route_type=1 routes don't include line "${name}" (found: ${[...keptRouteShortNames].join(", ")}) — refusing to publish, this looks like an upstream schema change.`
      );
    }
  }
  const keptRouteIds = new Set(keptRoutes.map((route) => route.route_id));

  const keptTrips = trips.filter((trip) => keptRouteIds.has(trip.route_id));
  const keptTripIds = new Set(keptTrips.map((trip) => trip.trip_id));

  const keptStopTimes = stopTimes.filter((row) => keptTripIds.has(row.trip_id));
  const keptStopIds = new Set(keptStopTimes.map((row) => row.stop_id));
  for (const stop of stops) {
    if (keptStopIds.has(stop.stop_id) && stop.parent_station) {
      keptStopIds.add(stop.parent_station);
    }
  }
  const keptStops = stops.filter((stop) => keptStopIds.has(stop.stop_id));

  const keptServiceIds = new Set(keptTrips.map((trip) => trip.service_id));
  const keptCalendar = calendar.filter((row) => keptServiceIds.has(row.service_id));
  const keptCalendarDates = (calendarDates ?? []).filter((row) => keptServiceIds.has(row.service_id));

  const output = {};
  output["routes.txt"] = new TextEncoder().encode(
    serializeCsv(Object.keys(routes[0] ?? { route_id: "" }), keptRoutes)
  );
  output["trips.txt"] = new TextEncoder().encode(
    serializeCsv(Object.keys(trips[0] ?? { trip_id: "" }), keptTrips)
  );
  output["stop_times.txt"] = new TextEncoder().encode(
    serializeCsv(Object.keys(stopTimes[0] ?? { trip_id: "" }), keptStopTimes)
  );
  output["stops.txt"] = new TextEncoder().encode(
    serializeCsv(Object.keys(stops[0] ?? { stop_id: "" }), keptStops)
  );
  output["calendar.txt"] = new TextEncoder().encode(
    serializeCsv(Object.keys(calendar[0] ?? { service_id: "" }), keptCalendar)
  );
  if (calendarDates?.length) {
    output["calendar_dates.txt"] = new TextEncoder().encode(
      serializeCsv(Object.keys(calendarDates[0] ?? { service_id: "" }), keptCalendarDates)
    );
  }
  return output;
}

async function main() {
  console.log(`Downloading STIB/MIVB static GTFS from ${STIB_STATIC_DISCOVERY_URL} …`);
  const response = await fetch(STIB_STATIC_DISCOVERY_URL, {
    headers: { Accept: "application/zip, application/octet-stream, */*" },
  });
  if (!response.ok) {
    console.error(`STIB GTFS static download failed: HTTP ${response.status}`);
    process.exit(1);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const files = unzipSync(new Uint8Array(buffer));
  const beforeBytes = buffer.length;

  const stripped = stripToMetro(files);
  const zipped = zipSync(stripped, { level: 6 });

  console.log(
    `brussels: downloaded ${(beforeBytes / 1024 / 1024).toFixed(2)} MB, publishing ${(zipped.length / 1024).toFixed(0)} KB stripped to metro (route_type=1, lines ${BRUSSELS_METRO_SHORT_NAMES.join("/")})`
  );

  const pathname = "gtfs/brussels.zip";
  const blob = await put(pathname, Buffer.from(zipped), {
    access: "public",
    allowOverwrite: true,
    contentType: "application/zip",
  });

  console.log(`Published brussels: ${blob.url}`);
}

main().catch((err) => {
  console.error(err?.stack || err);
  process.exit(1);
});
