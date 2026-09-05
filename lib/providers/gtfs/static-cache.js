/**
 * GTFS static schedule cache — download zip, parse tables, index by stop.
 * First consumer: Brisbane SEQ rail (Translink).
 *
 * Static URL (pinned): https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip
 * @see docs/jim-brief-brisbane-provider.md
 */

import { openSync, readSync, closeSync } from "fs";
import { join } from "path";
import { unzipSync } from "../../vendor/fflate.mjs";
import { parseCsvLine } from "./csv.js";

const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;
const GTFS_RAIL_ROUTE_TYPE = "2";
const STREAM_CHUNK_BYTES = 4 * 1024 * 1024;

/** @type {Map<string, { data: object, loadedAt: number }>} */
const cacheByUrl = new Map();

/** @type {Map<string, { data: object, loadedAt: number }>} */
const cacheByDirectoryKey = new Map();

/** Normalize an options array (order-independent) for use in a cache key. */
function normalizeArrayOption(value) {
  if (!value || !value.length) {
    return null;
  }
  return [...value].map((entry) => String(entry)).sort();
}

/**
 * Build a stable cache key from the directory path plus only the options that
 * affect `parseGtfsTables` filtering (railOnly/routeTypes/route-name and
 * agency filters). Different callers can point at the same directory with
 * different filters (e.g. rail-only vs metro-only), so the directory alone
 * is not a safe cache key — it must be combined with the filtering options.
 * `timeZone`/`sourceUrl` are deliberately excluded: they're metadata stamped
 * onto the result, not inputs to `parseGtfsTables`, so including them would
 * only produce extra cache misses for otherwise-identical requests.
 */
function directoryCacheKey(directory, options = {}) {
  const keyOptions = {
    railOnly: options.railOnly ?? false,
    routeTypes: normalizeArrayOption(options.routeTypes),
    excludeRouteShortNames: normalizeArrayOption(options.excludeRouteShortNames),
    includeRouteShortNames: normalizeArrayOption(options.includeRouteShortNames),
    agencyIds: normalizeArrayOption(options.agencyIds),
  };
  return `${directory}::${JSON.stringify(keyOptions)}`;
}

function findZipEntry(files, name) {
  const key = name in files ? name : Object.keys(files).find((entry) => entry.endsWith(`/${name}`));
  return key ? files[key] : null;
}

/** Yield successive views over a Uint8Array without copying. */
function* chunksFromBytes(bytes, chunkBytes = STREAM_CHUNK_BYTES) {
  if (bytes.length === 0) {
    return;
  }
  for (let offset = 0; offset < bytes.length; offset += chunkBytes) {
    yield bytes.subarray(offset, Math.min(offset + chunkBytes, bytes.length));
  }
}

/** Yield fixed-size chunks read synchronously from a file, without ever materializing the whole file as one buffer or string. */
function* chunksFromFile(path, chunkBytes = STREAM_CHUNK_BYTES) {
  const fd = openSync(path, "r");
  try {
    for (;;) {
      const buffer = Buffer.alloc(chunkBytes);
      const bytesRead = readSync(fd, buffer, 0, chunkBytes, null);
      if (bytesRead === 0) {
        return;
      }
      yield bytesRead === chunkBytes ? buffer : buffer.subarray(0, bytesRead);
    }
  } finally {
    closeSync(fd);
  }
}

/**
 * Stream-decode + parse a GTFS CSV table from an iterable of byte chunks,
 * calling `onRow` for each data row as soon as it's parsed. Decoding happens
 * chunk-by-chunk (`TextDecoder#decode(chunk, { stream: true })`) and lines
 * are split incrementally, so no single JS string ever holds more than a
 * few chunks' worth of text — this is what avoids V8's per-string length
 * ceiling (Node's ERR_STRING_TOO_LONG) on multi-gigabyte GTFS tables like a
 * nationwide stop_times.txt, regardless of the caller's memory use for the
 * parsed rows themselves.
 */
function streamCsvRows(chunkIterable, onRow) {
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let headers = null;

  function handleLine(rawLine) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (headers === null) {
      headers = parseCsvLine(line);
      return;
    }
    if (!line.trim()) {
      return;
    }
    const values = parseCsvLine(line);
    const row = {};
    for (let col = 0; col < headers.length; col += 1) {
      row[headers[col]] = values[col] ?? "";
    }
    onRow(row);
  }

  for (const chunk of chunkIterable) {
    buffer += decoder.decode(chunk, { stream: true });
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      handleLine(buffer.slice(0, newlineIndex));
      buffer = buffer.slice(newlineIndex + 1);
    }
  }
  buffer += decoder.decode();
  if (buffer.length) {
    for (const line of buffer.split("\n")) {
      if (line.length) {
        handleLine(line);
      }
    }
  }
}

/**
 * Stream a named GTFS table from either a directory of *.txt fixtures or a
 * parsed zip's files dict, calling `onRow` per data row. A missing file
 * throws for the directory case (matches the old readFileSync behavior); a
 * missing entry in a zip is treated as an empty table (matches the old
 * readZipText behavior), since not every GTFS feed ships every table.
 */
function streamGtfsTable(source, name, onRow) {
  if (typeof source === "string") {
    streamCsvRows(chunksFromFile(join(source, name)), onRow);
    return;
  }
  const entry = findZipEntry(source, name);
  if (!entry) {
    return;
  }
  streamCsvRows(chunksFromBytes(entry), onRow);
}

function collectGtfsTable(source, name) {
  const rows = [];
  streamGtfsTable(source, name, (row) => rows.push(row));
  return rows;
}

function ymdInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function dayOfWeekIso(date, timeZone) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const map = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[weekday] ?? 1;
}

function activeServiceIds(serviceDateYmd, dayIso, calendarRows, calendarDateRows) {
  const active = new Set();
  const ymd = String(serviceDateYmd);

  for (const row of calendarRows) {
    const serviceId = row.service_id;
    if (ymd < row.start_date || ymd > row.end_date) {
      continue;
    }
    const dayFlags = [
      row.monday,
      row.tuesday,
      row.wednesday,
      row.thursday,
      row.friday,
      row.saturday,
      row.sunday,
    ];
    if (dayFlags[dayIso - 1] === "1") {
      active.add(serviceId);
    }
  }

  for (const row of calendarDateRows) {
    if (String(row.date) !== ymd) {
      continue;
    }
    if (Number(row.exception_type) === 1) {
      active.add(row.service_id);
    } else if (Number(row.exception_type) === 2) {
      active.delete(row.service_id);
    }
  }

  return active;
}

/**
 * Build parsed/indexed GTFS static data from a table source (a directory of
 * *.txt fixtures, or a parsed zip's files dict), applying the
 * railOnly/routeTypes/agency/route-name filters while streaming rather than
 * after the fact. stop_times.txt — by far the largest table, and the one
 * that triggered ERR_STRING_TOO_LONG on a nationwide bulk feed — is never
 * materialized as an intermediate array: each row is decided in or out (via
 * the trip-inclusion set built from routes.txt + trips.txt, which are
 * read first) and only included rows are kept, bucketed straight into
 * `stopTimesByStopId`. This mirrors the previous filter semantics exactly:
 * the trip filter only applies when `routeTypes` or `railOnly` is set,
 * same as before — an agency/route-name-only filter still narrows which
 * routes/trips are "included" for `railRouteIds`/`railTripIds`, but (as
 * before) does not by itself filter stop_times rows.
 */
function buildGtfsStaticData(source, { railOnly = false, routeTypes = null, excludeRouteShortNames = null, includeRouteShortNames = null, agencyIds = null } = {}) {
  const allowedRouteTypes =
    routeTypes?.length ? new Set(routeTypes.map(String)) : null;
  const excludedShorts = new Set(
    (excludeRouteShortNames ?? []).map((name) => String(name).trim().toUpperCase()).filter(Boolean)
  );
  const includedShorts = includeRouteShortNames?.length
    ? new Set(includeRouteShortNames.map((name) => String(name).trim().toUpperCase()).filter(Boolean))
    : null;
  const includedAgencies = agencyIds?.length
    ? new Set(agencyIds.map((id) => String(id).trim()).filter(Boolean))
    : null;

  function routeIncluded(route) {
    if (includedAgencies && !includedAgencies.has(String(route.agency_id || "").trim())) {
      return false;
    }
    const shortName = String(route.route_short_name || "").trim().toUpperCase();
    if (excludedShorts.has(shortName)) {
      return false;
    }
    if (includedShorts && !includedShorts.has(shortName)) {
      return false;
    }
    if (allowedRouteTypes) {
      return allowedRouteTypes.has(String(route.route_type));
    }
    if (railOnly) {
      return route.route_type === GTFS_RAIL_ROUTE_TYPE;
    }
    return true;
  }

  const stops = collectGtfsTable(source, "stops.txt");
  const routes = collectGtfsTable(source, "routes.txt");
  const calendar = collectGtfsTable(source, "calendar.txt");
  const calendarDates = collectGtfsTable(source, "calendar_dates.txt");

  const routesById = new Map();
  const includedRouteIds = new Set();
  for (const route of routes) {
    routesById.set(route.route_id, route);
    if (routeIncluded(route)) {
      includedRouteIds.add(route.route_id);
    }
  }

  const applyTripFilter = Boolean(allowedRouteTypes || railOnly);
  const tripsById = new Map();
  const includedTripIds = new Set();
  streamGtfsTable(source, "trips.txt", (trip) => {
    tripsById.set(trip.trip_id, trip);
    if (!applyTripFilter || includedRouteIds.has(trip.route_id)) {
      includedTripIds.add(trip.trip_id);
    }
  });

  const stopTimesByStopId = new Map();
  streamGtfsTable(source, "stop_times.txt", (stopTime) => {
    if (applyTripFilter && !includedTripIds.has(stopTime.trip_id)) {
      return;
    }
    const list = stopTimesByStopId.get(stopTime.stop_id) ?? [];
    list.push(stopTime);
    stopTimesByStopId.set(stopTime.stop_id, list);
  });

  const stopsById = new Map(stops.map((stop) => [stop.stop_id, stop]));

  return {
    stops,
    stopsById,
    stopTimesByStopId,
    tripsById,
    routesById,
    calendar,
    calendarDates,
    railRouteIds: includedRouteIds,
    railTripIds: includedTripIds,
  };
}

function parseGtfsZip(buffer, options = {}) {
  const files = unzipSync(new Uint8Array(buffer));
  return buildGtfsStaticData(files, options);
}

/**
 * Load parsed GTFS tables from a directory of *.txt files (fixture snapshots).
 * Same TTL-cache pattern as `loadGtfsStatic` so live cities that serve from
 * fixtures do not re-parse stop_times on every request.
 *
 * @param {string} directory
 * @param {{ railOnly?: boolean, routeTypes?: string[], includeRouteShortNames?: string[], agencyIds?: string[], timeZone?: string, sourceUrl?: string, ttlMs?: number }} options
 */
export function loadGtfsStaticFromDirectory(directory, options = {}) {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const cacheKey = directoryCacheKey(directory, options);
  const cached = cacheByDirectoryKey.get(cacheKey);
  if (cached && Date.now() - cached.loadedAt < ttlMs) {
    return cached.data;
  }

  const data = buildGtfsStaticData(directory, {
    railOnly: options.railOnly ?? false,
    routeTypes: options.routeTypes ?? null,
    excludeRouteShortNames: options.excludeRouteShortNames ?? null,
    includeRouteShortNames: options.includeRouteShortNames ?? null,
    agencyIds: options.agencyIds ?? null,
  });
  data.timeZone = options.timeZone ?? "UTC";
  data.sourceUrl = options.sourceUrl ?? directory;

  cacheByDirectoryKey.set(cacheKey, { data, loadedAt: Date.now() });
  return data;
}

/** Test helper — clear directory + URL caches. */
export function clearGtfsStaticCaches() {
  cacheByUrl.clear();
  cacheByDirectoryKey.clear();
}

/** Station coords from stops.txt only — skip stop_times (hundreds of thousands of rows). */
export function loadGtfsStopCoordsById(directory) {
  const rows = collectGtfsTable(directory, "stops.txt");
  const map = new Map();
  for (const row of rows) {
    const lat = Number(row.stop_lat);
    const lng = Number(row.stop_lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }
    map.set(String(row.stop_id), { lat, lng });
  }
  return map;
}

/**
 * Merge two parsed GTFS static datasets (e.g. Sydney Trains + Metro).
 */
export function mergeGtfsStaticData(primary, secondary) {
  if (!secondary) {
    return primary;
  }

  const stopTimesByStopId = new Map(primary.stopTimesByStopId);
  for (const [stopId, times] of secondary.stopTimesByStopId) {
    const list = stopTimesByStopId.get(stopId) ?? [];
    list.push(...times);
    stopTimesByStopId.set(stopId, list);
  }

  const tripsById = new Map(primary.tripsById);
  for (const [tripId, trip] of secondary.tripsById) {
    tripsById.set(tripId, trip);
  }

  const routesById = new Map(primary.routesById);
  for (const [routeId, route] of secondary.routesById) {
    routesById.set(routeId, route);
  }

  const stopsById = new Map(primary.stopsById);
  for (const [stopId, stop] of secondary.stopsById) {
    stopsById.set(stopId, stop);
  }

  return {
    stops: [...primary.stops, ...secondary.stops],
    stopsById,
    stopTimesByStopId,
    tripsById,
    routesById,
    calendar: [...primary.calendar, ...secondary.calendar],
    calendarDates: [...primary.calendarDates, ...secondary.calendarDates],
    railRouteIds: new Set([...primary.railRouteIds, ...secondary.railRouteIds]),
    railTripIds: new Set([...primary.railTripIds, ...secondary.railTripIds]),
    timeZone: primary.timeZone ?? secondary.timeZone,
    sourceUrl: `${primary.sourceUrl ?? ""}+${secondary.sourceUrl ?? ""}`,
  };
}

/**
 * @param {{ url: string, ttlMs?: number, railOnly?: boolean, routeTypes?: string[], includeRouteShortNames?: string[], agencyIds?: string[], timeZone?: string, headers?: Record<string,string>, ifModifiedSince?: boolean }} options
 */
export async function loadGtfsStatic(options) {
  const url = options.url;
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const cached = cacheByUrl.get(url);
  if (cached && Date.now() - cached.loadedAt < ttlMs) {
    return cached.data;
  }

  const headers = {
    Accept: "application/zip, application/octet-stream, */*",
    ...(options.headers ?? {}),
  };
  if (options.ifModifiedSince && cached?.lastModified) {
    headers["If-Modified-Since"] = cached.lastModified;
  }

  const response = await fetch(url, { headers });
  if (response.status === 304 && cached?.data) {
    cached.loadedAt = Date.now();
    return cached.data;
  }
  if (!response.ok) {
    throw new Error(`GTFS static download failed (${response.status}) for ${url}`);
  }

  const buffer = await response.arrayBuffer();
  const data = parseGtfsZip(buffer, {
    railOnly: options.railOnly ?? false,
    routeTypes: options.routeTypes ?? null,
    excludeRouteShortNames: options.excludeRouteShortNames ?? null,
    includeRouteShortNames: options.includeRouteShortNames ?? null,
    agencyIds: options.agencyIds ?? null,
  });
  data.timeZone = options.timeZone ?? "UTC";
  data.sourceUrl = url;

  cacheByUrl.set(url, {
    data,
    loadedAt: Date.now(),
    lastModified: response.headers.get("last-modified") || cached?.lastModified || null,
  });
  return data;
}

export function findRailStopIdsForName(staticData, query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) {
    return [];
  }

  const matches = staticData.stops.filter((stop) => {
    const name = String(stop.stop_name || "").toLowerCase();
    return name.includes(needle) || name.replace(/\s+stn$/i, "").includes(needle);
  });

  const stopIds = new Set();
  for (const stop of matches) {
    stopIds.add(stop.stop_id);
    if (stop.parent_station) {
      const children = staticData.stops.filter((entry) => entry.parent_station === stop.parent_station);
      for (const child of children) {
        stopIds.add(child.stop_id);
      }
    } else {
      const children = staticData.stops.filter((entry) => entry.parent_station === stop.stop_id);
      for (const child of children) {
        stopIds.add(child.stop_id);
      }
    }
  }

  return [...stopIds];
}

export function activeServicesForDate(staticData, date, timeZone) {
  const serviceDateYmd = ymdInTimeZone(date, timeZone).replace(/-/g, "");
  const dayIso = dayOfWeekIso(date, timeZone);
  return activeServiceIds(serviceDateYmd, dayIso, staticData.calendar, staticData.calendarDates);
}

export { ymdInTimeZone, dayOfWeekIso };
