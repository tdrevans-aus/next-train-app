#!/usr/bin/env node
/**
 * D3/D4 — Trim AT GTFS to suburban TRAIN (STH/EAST/WEST/ONE). Exclude Te Huia.
 * Also writes D2 line-map + station catalog. Does not write published-network.json.
 *
 * Usage: node scripts/trim-auckland-gtfs.mjs [--url=...]
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { unzipSync } from "../lib/vendor/fflate.mjs";
import { parseCsv } from "../lib/providers/gtfs/csv.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const outArg = process.argv.find((arg) => arg.startsWith("--out="));
const OUT_DIR = outArg ? outArg.slice("--out=".length) : join(ROOT, "qa/fixtures/auckland/gtfs");
const DEFAULT_URL = "https://gtfs.at.govt.nz/gtfs.zip";
const RAIL_ROUTE_TYPE = "2";
const KEEP_SHORTS = new Set(["STH", "EAST", "WEST", "ONE"]);
const TIME_ZONE = "Pacific/Auckland";
// Explicit column allow-lists — only fields actually read anywhere in
// lib/, scripts/, or qa/ (see docs/jim-brief-gtfs-fixture-diet.md).
const STOP_TIME_COLUMNS = ["trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence", "pickup_type"];
const TRIP_COLUMNS = ["route_id", "service_id", "trip_id", "trip_headsign"];

const CANONICAL_BY_FOLD = {
  waitemata: "Waitematā Station",
  orakei: "Ōrākei",
  otahuhu: "Ōtāhuhu",
  paerata: "Paerātā",
  ranui: "Rānui",
  "te papapa": "Te Pāpapa",
};

const SUPPRESSED = new Set(["te waihorotiu", "karanga-a-hape", "maungawhau", "ngakoroa"]);

const LINE_META = {
  STH: { name: "Southern Line", termini: ["Pukekohe", "Waitematā Station"] },
  EAST: { name: "Eastern Line", termini: ["Manukau", "Waitematā Station"] },
  WEST: { name: "Western Line", termini: ["Swanson", "Waitematā Station"] },
  ONE: { name: "Onehunga Line", termini: ["Onehunga", "Newmarket"] },
};

function foldKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+train station(?:\s+\d+)?$/i, "")
    .replace(/\s+station(?:\s+\d+)?$/i, "");
}

function displayName(raw) {
  const folded = foldKey(raw);
  if (CANONICAL_BY_FOLD[folded]) {
    return CANONICAL_BY_FOLD[folded];
  }
  return String(raw || "")
    .replace(/\s+Train Station(?:\s+\d+)?$/i, "")
    .replace(/\s+Station(?:\s+\d+)?$/i, "")
    .trim();
}

function readZipText(files, name) {
  const key = name in files ? name : Object.keys(files).find((entry) => entry.endsWith(`/${name}`));
  if (!key) {
    return "";
  }
  return new TextDecoder("utf-8").decode(files[key]);
}

function toCsv(rows, columns) {
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

function uniquePreserve(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const key = foldKey(value);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(value);
  }
  return out;
}

async function main() {
  const urlArg = process.argv.find((arg) => arg.startsWith("--url="));
  const url = urlArg ? urlArg.slice("--url=".length) : DEFAULT_URL;

  const response = await fetch(url, {
    headers: { Accept: "application/zip, application/octet-stream, */*" },
  });
  if (!response.ok) {
    throw new Error(`GTFS download failed (${response.status}) for ${url}`);
  }

  const files = unzipSync(new Uint8Array(await response.arrayBuffer()));
  const routes = parseCsv(readZipText(files, "routes.txt"));
  const trips = parseCsv(readZipText(files, "trips.txt"));
  const stops = parseCsv(readZipText(files, "stops.txt"));
  const stopTimes = parseCsv(readZipText(files, "stop_times.txt"));
  const calendar = parseCsv(readZipText(files, "calendar.txt"));
  const calendarDates = parseCsv(readZipText(files, "calendar_dates.txt"));
  const feedInfo = parseCsv(readZipText(files, "feed_info.txt"));
  const agency = parseCsv(readZipText(files, "agency.txt"));
  const stopsById = new Map(stops.map((stop) => [stop.stop_id, stop]));

  const railRoutes = routes.filter(
    (route) => route.route_type === RAIL_ROUTE_TYPE && KEEP_SHORTS.has(route.route_short_name)
  );
  const railRouteIds = new Set(railRoutes.map((route) => route.route_id));
  const railTrips = trips.filter((trip) => railRouteIds.has(trip.route_id));
  const railTripIds = new Set(railTrips.map((trip) => trip.trip_id));
  const railStopTimes = stopTimes.filter((row) => railTripIds.has(row.trip_id));

  const usedStopIds = new Set(railStopTimes.map((row) => row.stop_id));
  for (const stopId of [...usedStopIds]) {
    const stop = stopsById.get(stopId);
    if (stop?.parent_station) {
      usedStopIds.add(stop.parent_station);
    }
  }
  for (const stop of stops) {
    if (usedStopIds.has(stop.parent_station) || usedStopIds.has(stop.stop_id)) {
      usedStopIds.add(stop.stop_id);
      if (stop.parent_station) {
        usedStopIds.add(stop.parent_station);
      }
    }
  }

  const railStops = stops.filter((stop) => usedStopIds.has(stop.stop_id));
  const usedServiceIds = new Set(railTrips.map((trip) => trip.service_id));
  const railCalendar = calendar.filter((row) => usedServiceIds.has(row.service_id));
  const railCalendarDates = calendarDates.filter((row) => usedServiceIds.has(row.service_id));

  mkdirSync(OUT_DIR, { recursive: true });
  const outputs = {
    "agency.txt": agency,
    "feed_info.txt": feedInfo,
    "routes.txt": railRoutes,
    "trips.txt": railTrips,
    "stops.txt": railStops,
    "stop_times.txt": railStopTimes,
    "calendar.txt": railCalendar,
    "calendar_dates.txt": railCalendarDates,
  };
  const columnsByFile = {
    "agency.txt": Object.keys(agency[0] ?? {}),
    "feed_info.txt": Object.keys(feedInfo[0] ?? {}),
    "routes.txt": Object.keys(routes[0] ?? {}),
    "trips.txt": TRIP_COLUMNS,
    "stops.txt": Object.keys(stops[0] ?? {}),
    "stop_times.txt": STOP_TIME_COLUMNS,
    "calendar.txt": Object.keys(calendar[0] ?? {}),
    "calendar_dates.txt": Object.keys(calendarDates[0] ?? {}),
  };
  for (const [filename, rows] of Object.entries(outputs)) {
    writeFileSync(join(OUT_DIR, filename), toCsv(rows, columnsByFile[filename]));
  }

  writeFileSync(
    join(OUT_DIR, "README.md"),
    `# Auckland AT GTFS fixture (suburban TRAIN)

**Source:** ${url}
**Trimmed:** ${new Date().toISOString().slice(0, 10)}
**Feed span:** ${feedInfo[0]?.feed_start_date ?? "?"} → ${feedInfo[0]?.feed_end_date ?? "?"}

## Regenerate

\`\`\`bash
node scripts/trim-auckland-gtfs.mjs
\`\`\`

## Trim rules

- \`route_type === 2\` and \`route_short_name\` in STH, EAST, WEST, ONE
- **Exclude HUIA (Te Huia)**
- Parent stations + child platforms for used rail stops
- Do **not** generate \`published-network.json\` (Tim copies Luke D1)
`
  );

  const timesByTrip = new Map();
  for (const row of railStopTimes) {
    const list = timesByTrip.get(row.trip_id) ?? [];
    list.push(row);
    timesByTrip.set(row.trip_id, list);
  }
  for (const list of timesByTrip.values()) {
    list.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
  }

  function parentStop(stop) {
    if (stop?.parent_station && stopsById.get(stop.parent_station)) {
      return stopsById.get(stop.parent_station);
    }
    return stop;
  }

  const lines = [];
  for (const code of ["STH", "EAST", "WEST", "ONE"]) {
    const routeIds = new Set(railRoutes.filter((route) => route.route_short_name === code).map((r) => r.route_id));
    const tripIds = railTrips.filter((trip) => routeIds.has(trip.route_id)).map((trip) => trip.trip_id);
    let best = [];
    const headsigns = {};
    for (const tripId of tripIds) {
      const trip = railTrips.find((row) => row.trip_id === tripId);
      const sign = String(trip?.trip_headsign || "").trim();
      if (sign) {
        headsigns[sign] = (headsigns[sign] ?? 0) + 1;
      }
      const names = (timesByTrip.get(tripId) ?? [])
        .map((row) => displayName(parentStop(stopsById.get(row.stop_id))?.stop_name))
        .filter((name) => name && !SUPPRESSED.has(foldKey(name)));
      if (names.length > best.length) {
        best = uniquePreserve(names);
      }
    }
    const meta = LINE_META[code];
    lines.push({
      id: code.toLowerCase(),
      number: code,
      name: meta.name,
      routeShortName: code,
      termini: meta.termini,
      stations: best,
      headsigns,
    });
  }

  const catalogGroups = new Map();
  for (const stopId of usedStopIds) {
    const stop = stopsById.get(stopId);
    if (!stop || !railStopTimes.some((row) => row.stop_id === stopId)) {
      continue;
    }
    const parent = parentStop(stop);
    const name = displayName(parent?.stop_name);
    const folded = foldKey(name);
    if (!name || SUPPRESSED.has(folded)) {
      continue;
    }
    const existing = catalogGroups.get(folded);
    const lat = Number(parent?.stop_lat);
    const lng = Number(parent?.stop_lon);
    if (!existing) {
      const aliases = [];
      const gtfsName = String(parent?.stop_name || "").trim();
      if (gtfsName && foldKey(gtfsName) !== folded) {
        aliases.push(gtfsName);
      }
      catalogGroups.set(folded, {
        name,
        aliases,
        stopIds: [stopId],
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
      });
      continue;
    }
    existing.stopIds = uniquePreserve([...existing.stopIds, stopId]);
  }

  const stations = [...catalogGroups.values()]
    .map((row) => ({
      ...row,
      aliases: (row.aliases ?? []).filter((alias) => foldKey(alias) !== foldKey(row.name)).sort(),
      stopIds: [...row.stopIds].sort(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));

  const hub = stations.find((row) => row.name === "Waitematā Station");
  if (hub && !hub.aliases.includes("Waitemata Train Station")) {
    hub.aliases.push("Waitemata Train Station");
    hub.aliases.sort();
  }

  const lineMap = {
    city: "auckland",
    source: `GTFS fixture qa/fixtures/auckland/gtfs (generated ${new Date().toISOString().slice(0, 10)})`,
    timeZone: TIME_ZONE,
    dst: true,
    notes: [
      "D2 from AT suburban TRAIN GTFS. D1 published-network.json is Tim-copied — never generate it from this feed.",
      "Hub product name is Waitematā Station (not Britomart, City Centre, or Waitemata Train Station).",
      "CRL stations Te Waihorotiu / Karanga-a-Hape are not inserted. Maungawhau closed. Ngākōroa not open.",
      "Onehunga Line currently ends at Newmarket.",
      "Te Huia and AirportLink out of v1.",
    ],
    shortTurnGroups: {},
    doNotGroup: [
      {
        a: "Onehunga",
        b: "Pukekohe",
        reason: "ONE currently ends at Newmarket — do not collapse onto Southern",
      },
      {
        a: "Onehunga",
        b: "Waitematā Station",
        reason: "ONE does not run to the hub",
      },
    ],
    proposedShortTurnGroups: {},
    proposedDoNotGroup: [],
    junctionStations: ["Newmarket", "Ōtāhuhu", "Penrose"].sort((a, b) => a.localeCompare(b)),
    suppressedTermini: ["Maungawhau", "Te Waihorotiu", "Karanga-a-Hape", "Ngākōroa"],
    lines,
    coverageGaps: [
      "Future CRL E-W / S-C / O-W are coverageGaps until a new D1 after passenger opening (AT: Sunday 13 Sep 2026; weekday timetable 14 Sep).",
      "Do not insert Te Waihorotiu / Karanga-a-Hape. Maungawhau closed. Ngākōroa not open.",
      "Paerātā + Drury live from 2 Aug 2026.",
    ],
  };

  mkdirSync(join(ROOT, "lib/cities/auckland"), { recursive: true });
  writeFileSync(join(ROOT, "lib/cities/auckland/line-map.json"), `${JSON.stringify(lineMap, null, 2)}\n`);
  writeFileSync(
    join(ROOT, "lib/cities/auckland/stations.json"),
    `${JSON.stringify({ stations }, null, 2)}\n`
  );

  console.log(`Wrote rail fixture to ${OUT_DIR}`);
  console.log(
    `routes=${railRoutes.length} trips=${railTrips.length} stops=${railStops.length} stop_times=${railStopTimes.length} catalog=${stations.length}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
