#!/usr/bin/env node
/**
 * Trim CMO public light-rail GTFS to passenger route 1 (Gungahlin Place–Alinga Street).
 * Does not write published-network.json.
 *
 * Usage: node scripts/trim-canberra-gtfs.mjs [--zip=qa/tmp/canberra-lr.zip]
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { unzipSync } from "../lib/vendor/fflate.mjs";
import { parseCsv } from "../lib/providers/gtfs/csv.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "qa/fixtures/canberra/gtfs");
const DEFAULT_URL = "https://www.transport.act.gov.au/googletransit/google_transit_lr.zip";
const USER_AGENT = "next-train";

function toCsv(rows, columns) {
  if (!rows.length) {
    return `${columns.join(",")}\n`;
  }
  const header = columns.join(",");
  const body = rows
    .map((row) =>
      columns
        .map((column) => {
          const value = row[column] ?? "";
          return /[",\n]/.test(value) ? `"${String(value).replace(/"/g, '""')}"` : value;
        })
        .join(",")
    )
    .join("\n");
  return `${header}\n${body}\n`;
}

function zipText(files, name) {
  const key = Object.keys(files).find((entry) => entry.endsWith(name));
  if (!key) {
    return "";
  }
  return new TextDecoder("utf-8").decode(files[key]);
}

async function loadZipBuffer(zipPath, url) {
  if (zipPath) {
    return readFileSync(zipPath);
  }
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/zip, application/octet-stream, */*",
    },
  });
  if (!response.ok) {
    throw new Error(`GTFS download failed (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const zipArg = process.argv.find((arg) => arg.startsWith("--zip="));
  const urlArg = process.argv.find((arg) => arg.startsWith("--url="));
  const zipPath = zipArg ? zipArg.slice("--zip=".length) : join(ROOT, "qa/tmp/canberra-lr.zip");
  const url = urlArg ? urlArg.slice("--url=".length) : DEFAULT_URL;

  const buffer = await loadZipBuffer(zipPath, url);
  const files = unzipSync(new Uint8Array(buffer));
  const routes = parseCsv(zipText(files, "routes.txt")).filter((row) => String(row.route_short_name || "").trim() === "1");
  const routeIds = new Set(routes.map((row) => row.route_id));
  const trips = parseCsv(zipText(files, "trips.txt")).filter((row) => routeIds.has(row.route_id));
  const tripIds = new Set(trips.map((row) => row.trip_id));
  const serviceIds = new Set(trips.map((row) => row.service_id));
  const stopTimes = parseCsv(zipText(files, "stop_times.txt")).filter((row) => tripIds.has(row.trip_id));
  const usedStopIds = new Set(stopTimes.map((row) => row.stop_id));
  const allStops = parseCsv(zipText(files, "stops.txt"));
  const parentIds = new Set();
  for (const stop of allStops) {
    if (usedStopIds.has(stop.stop_id)) {
      parentIds.add(stop.parent_station || stop.stop_id);
    }
  }
  const stops = allStops.filter((stop) => parentIds.has(stop.stop_id) || parentIds.has(stop.parent_station));
  const calendar = parseCsv(zipText(files, "calendar.txt")).filter((row) => serviceIds.has(row.service_id));
  const calendarDates = parseCsv(zipText(files, "calendar_dates.txt")).filter((row) =>
    serviceIds.has(row.service_id)
  );
  const agency = parseCsv(zipText(files, "agency.txt"));

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "agency.txt"), toCsv(agency, Object.keys(agency[0] ?? { agency_id: "" })));
  writeFileSync(join(OUT_DIR, "routes.txt"), toCsv(routes, Object.keys(routes[0])));
  writeFileSync(join(OUT_DIR, "trips.txt"), toCsv(trips, Object.keys(trips[0])));
  writeFileSync(join(OUT_DIR, "stops.txt"), toCsv(stops, Object.keys(stops[0])));
  writeFileSync(join(OUT_DIR, "stop_times.txt"), toCsv(stopTimes, Object.keys(stopTimes[0])));
  writeFileSync(join(OUT_DIR, "calendar.txt"), toCsv(calendar, Object.keys(calendar[0] ?? { service_id: "" })));
  writeFileSync(
    join(OUT_DIR, "calendar_dates.txt"),
    toCsv(calendarDates, Object.keys(calendarDates[0] ?? { service_id: "" }))
  );
  const feed = zipText(files, "feed_info.txt");
  if (feed) {
    writeFileSync(join(OUT_DIR, "feed_info.txt"), feed.endsWith("\n") ? feed : `${feed}\n`);
  }

  console.log(`trim-canberra-gtfs: ${routes.length} routes, ${trips.length} trips, ${stops.length} stops`);
  console.log([...new Set(stops.map((row) => row.stop_name))].sort().join("\n"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
