#!/usr/bin/env node
/**
 * Trim OVapi NL GTFS to GVB metro (route_type 1, lines 50–54).
 * Does not write published-network.json (official GVB rail map / Luke D1).
 *
 * Usage: node scripts/trim-amsterdam-gtfs.mjs [--zip=qa/tmp/gtfs-nl.zip]
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { unzipSync } from "../lib/vendor/fflate.mjs";
import { parseCsv } from "../lib/providers/gtfs/csv.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "qa/fixtures/amsterdam/gtfs");
const DEFAULT_URL = "https://gtfs.ovapi.nl/gtfs-nl.zip";
const KEEP_SHORTS = new Set(["50", "51", "52", "53", "54"]);
const METRO_ROUTE_TYPE = "1";
const AGENCY_ID = "GVB";
const USER_AGENT = "next-train";
// Explicit column allow-lists — only fields actually read anywhere in
// lib/, scripts/, or qa/ (see docs/jim-brief-gtfs-fixture-diet.md).
const STOP_TIME_COLUMNS = ["trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence", "pickup_type"];
const TRIP_COLUMNS = ["route_id", "service_id", "trip_id", "trip_headsign"];

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
      "Accept-Encoding": "gzip",
    },
  });
  if (!response.ok) {
    throw new Error(`GTFS download failed (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function filterStopTimesBytes(bytes, keepTrips) {
  const nl = 10;
  let start = 0;
  while (start < bytes.length && bytes[start] !== nl) {
    start += 1;
  }
  const header = Buffer.from(bytes.subarray(0, start)).toString("utf8").trim();
  start += 1;
  const kept = [];
  for (let i = start; i <= bytes.length; i += 1) {
    if (i !== bytes.length && bytes[i] !== nl) {
      continue;
    }
    if (i > start) {
      const line = Buffer.from(bytes.subarray(start, i)).toString("utf8").replace(/\r$/, "");
      const comma = line.indexOf(",");
      const tripId = comma === -1 ? line : line.slice(0, comma);
      if (keepTrips.has(tripId)) {
        kept.push(line);
      }
    }
    start = i + 1;
  }
  return `${header}\n${kept.join("\n")}\n`;
}

async function main() {
  const zipArg = process.argv.find((arg) => arg.startsWith("--zip="));
  const urlArg = process.argv.find((arg) => arg.startsWith("--url="));
  const zipPath = zipArg ? zipArg.slice("--zip=".length) : join(ROOT, "qa/tmp/gtfs-nl.zip");
  const url = urlArg ? urlArg.slice("--url=".length) : DEFAULT_URL;

  const buffer = await loadZipBuffer(zipPath, url);
  const smallFiles = unzipSync(new Uint8Array(buffer), {
    filter: (file) =>
      /\/?(agency|routes|trips|stops|calendar|calendar_dates|feed_info)\.txt$/i.test(file.name),
  });
  const routes = parseCsv(zipText(smallFiles, "routes.txt")).filter(
    (row) =>
      row.agency_id === AGENCY_ID &&
      row.route_type === METRO_ROUTE_TYPE &&
      KEEP_SHORTS.has(String(row.route_short_name || "").trim())
  );
  const routeIds = new Set(routes.map((row) => row.route_id));
  const trips = parseCsv(zipText(smallFiles, "trips.txt")).filter((row) => routeIds.has(row.route_id));
  const tripIds = new Set(trips.map((row) => row.trip_id));
  const serviceIds = new Set(trips.map((row) => row.service_id));

  const stopTimesFiles = unzipSync(new Uint8Array(buffer), {
    filter: (file) => /stop_times\.txt$/i.test(file.name),
  });
  const stopTimesKey = Object.keys(stopTimesFiles)[0];
  const stopTimesText = filterStopTimesBytes(stopTimesFiles[stopTimesKey], tripIds);
  const stopTimes = parseCsv(stopTimesText);
  const usedStopIds = new Set(stopTimes.map((row) => row.stop_id));

  const allStops = parseCsv(zipText(smallFiles, "stops.txt"));
  const stopsById = new Map(allStops.map((row) => [row.stop_id, row]));
  const stops = [];
  const seen = new Set();
  for (const stopId of usedStopIds) {
    let current = stopsById.get(stopId);
    while (current && !seen.has(current.stop_id)) {
      seen.add(current.stop_id);
      stops.push(current);
      current = current.parent_station ? stopsById.get(current.parent_station) : null;
    }
  }

  const calendar = parseCsv(zipText(smallFiles, "calendar.txt")).filter((row) =>
    serviceIds.has(row.service_id)
  );
  const calendarDates = parseCsv(zipText(smallFiles, "calendar_dates.txt")).filter((row) =>
    serviceIds.has(row.service_id)
  );
  const agency = parseCsv(zipText(smallFiles, "agency.txt")).filter((row) => row.agency_id === AGENCY_ID);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "agency.txt"), toCsv(agency, Object.keys(agency[0] ?? { agency_id: "" })));
  writeFileSync(join(OUT_DIR, "routes.txt"), toCsv(routes, Object.keys(routes[0])));
  writeFileSync(join(OUT_DIR, "trips.txt"), toCsv(trips, TRIP_COLUMNS));
  writeFileSync(join(OUT_DIR, "stops.txt"), toCsv(stops, Object.keys(stops[0])));
  writeFileSync(join(OUT_DIR, "stop_times.txt"), toCsv(stopTimes, STOP_TIME_COLUMNS));
  writeFileSync(
    join(OUT_DIR, "calendar.txt"),
    toCsv(calendar, Object.keys(calendar[0] ?? { service_id: "" }))
  );
  writeFileSync(
    join(OUT_DIR, "calendar_dates.txt"),
    toCsv(calendarDates, Object.keys(calendarDates[0] ?? { service_id: "" }))
  );
  const feed = zipText(smallFiles, "feed_info.txt");
  if (feed) {
    writeFileSync(join(OUT_DIR, "feed_info.txt"), feed.endsWith("\n") ? feed : `${feed}\n`);
  }

  const names = [...new Set(stops.map((row) => row.stop_name))].sort((a, b) => a.localeCompare(b, "nl"));
  console.log(`trim-amsterdam-gtfs: ${routes.length} routes, ${trips.length} trips, ${stops.length} stops`);
  console.log(names.join("\n"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
