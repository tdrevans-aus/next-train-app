#!/usr/bin/env node
/**
 * Trim SEQ GTFS to G:link L1 only (route_type 0). Excludes bus 70, SEQ trains, ferries.
 * Does not write published-network.json.
 *
 * Usage: node scripts/trim-gold-coast-gtfs.mjs [--zip=qa/tmp/seq-gtfs.zip]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { unzipSync } from "../lib/vendor/fflate.mjs";
import { parseCsv } from "../lib/providers/gtfs/csv.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const outArg = process.argv.find((arg) => arg.startsWith("--out="));
const OUT_DIR = outArg ? outArg.slice("--out=".length) : join(ROOT, "qa/fixtures/gold-coast/gtfs");
const DEFAULT_URL = "https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip";
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

function isGlinkRoute(row) {
  return String(row.route_type) === "0" && String(row.route_short_name || "").trim().toUpperCase() === "L1";
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

/**
 * Given a raw upstream GTFS zip buffer, return the trimmed+dieted file
 * contents keyed by filename. Statically imported by
 * api/cron/refresh-gtfs.js - keep this pure (no fs/network access).
 */
export function buildTrimmedFiles(buffer) {
  const files = unzipSync(new Uint8Array(buffer));
  const routes = parseCsv(zipText(files, "routes.txt")).filter(isGlinkRoute);
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

  const output = {
    "agency.txt": toCsv(agency, Object.keys(agency[0] ?? { agency_id: "" })),
    "routes.txt": toCsv(routes, Object.keys(routes[0])),
    "trips.txt": toCsv(trips, TRIP_COLUMNS),
    "stops.txt": toCsv(stops, Object.keys(stops[0])),
    "stop_times.txt": toCsv(stopTimes, STOP_TIME_COLUMNS),
    "calendar.txt": toCsv(calendar, Object.keys(calendar[0] ?? { service_id: "" })),
    "calendar_dates.txt": toCsv(calendarDates, Object.keys(calendarDates[0] ?? { service_id: "" })),
  };
  const feed = zipText(files, "feed_info.txt");
  if (feed) {
    output["feed_info.txt"] = feed.endsWith("\n") ? feed : `${feed}\n`;
  }

  const names = [...new Set(stops.filter((row) => !row.parent_station).map((row) => row.stop_name))].sort();
  const headsigns = [...new Set(trips.map((row) => row.trip_headsign))].sort();
  return {
    output,
    summary: `${routes.length} routes, ${trips.length} trips, ${stops.length} stops`,
    diagnostics: `headsigns: ${headsigns.join(" | ")}\n${names.join("\n")}`,
  };
}

async function main() {
  const zipArg = process.argv.find((arg) => arg.startsWith("--zip="));
  const urlArg = process.argv.find((arg) => arg.startsWith("--url="));
  const defaultZipPath = join(ROOT, "qa/tmp/seq-gtfs.zip");
  const zipPath = zipArg ? zipArg.slice("--zip=".length) : existsSync(defaultZipPath) ? defaultZipPath : "";
  const url = urlArg ? urlArg.slice("--url=".length) : DEFAULT_URL;

  const buffer = await loadZipBuffer(zipPath, url);
  const { output, summary, diagnostics } = buildTrimmedFiles(buffer);

  mkdirSync(OUT_DIR, { recursive: true });
  for (const [name, content] of Object.entries(output)) {
    writeFileSync(join(OUT_DIR, name), content);
  }

  console.log(`trim-gold-coast-gtfs: ${summary}`);
  console.log(diagnostics);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
