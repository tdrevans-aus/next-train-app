/**
 * GTFS static schedule cache — download zip, parse tables, index by stop.
 * First consumer: Brisbane SEQ rail (Translink).
 *
 * Static URL (pinned): https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip
 * @see docs/jim-brief-brisbane-provider.md
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { unzipSync } from "../../vendor/fflate.mjs";
import { parseCsv } from "./csv.js";

const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;
const GTFS_RAIL_ROUTE_TYPE = "2";

/** @type {Map<string, { data: object, loadedAt: number }>} */
const cacheByUrl = new Map();

function readZipText(files, name) {
  const key = name in files ? name : Object.keys(files).find((entry) => entry.endsWith(`/${name}`));
  if (!key) {
    return "";
  }
  return new TextDecoder("utf-8").decode(files[key]);
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
  const exceptions = new Map();

  for (const row of calendarDateRows) {
    exceptions.set(row.service_id, Number(row.exception_type));
  }

  for (const row of calendarRows) {
    const serviceId = row.service_id;
    const exception = exceptions.get(serviceId);
    if (exception === 1) {
      active.add(serviceId);
      continue;
    }
    if (exception === 2) {
      continue;
    }

    if (serviceDateYmd < row.start_date || serviceDateYmd > row.end_date) {
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

  return active;
}

function readGtfsTable(files, name) {
  if (typeof files === "string") {
    return parseCsv(readFileSync(join(files, name), "utf8"));
  }
  return parseCsv(readZipText(files, name));
}

function parseGtfsTables(tables, { railOnly = false, routeTypes = null } = {}) {
  const stops = tables.stops ?? [];
  const stopTimes = tables.stopTimes ?? [];
  const trips = tables.trips ?? [];
  const routes = tables.routes ?? [];
  const calendar = tables.calendar ?? [];
  const calendarDates = tables.calendarDates ?? [];

  const allowedRouteTypes =
    routeTypes?.length ? new Set(routeTypes.map(String)) : null;

  function routeIncluded(route) {
    if (allowedRouteTypes) {
      return allowedRouteTypes.has(String(route.route_type));
    }
    if (railOnly) {
      return route.route_type === GTFS_RAIL_ROUTE_TYPE;
    }
    return true;
  }

  const routesById = new Map();
  const includedRouteIds = new Set();

  for (const route of routes) {
    routesById.set(route.route_id, route);
    if (routeIncluded(route)) {
      includedRouteIds.add(route.route_id);
    }
  }

  const tripsById = new Map();
  const includedTripIds = new Set();

  for (const trip of trips) {
    tripsById.set(trip.trip_id, trip);
    if (!allowedRouteTypes && !railOnly) {
      includedTripIds.add(trip.trip_id);
      continue;
    }
    if (includedRouteIds.has(trip.route_id)) {
      includedTripIds.add(trip.trip_id);
    }
  }

  const stopTimesByStopId = new Map();
  for (const stopTime of stopTimes) {
    if ((allowedRouteTypes || railOnly) && !includedTripIds.has(stopTime.trip_id)) {
      continue;
    }
    const list = stopTimesByStopId.get(stopTime.stop_id) ?? [];
    list.push(stopTime);
    stopTimesByStopId.set(stopTime.stop_id, list);
  }

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
  return parseGtfsTables(
    {
      stops: readGtfsTable(files, "stops.txt"),
      stopTimes: readGtfsTable(files, "stop_times.txt"),
      trips: readGtfsTable(files, "trips.txt"),
      routes: readGtfsTable(files, "routes.txt"),
      calendar: readGtfsTable(files, "calendar.txt"),
      calendarDates: readGtfsTable(files, "calendar_dates.txt"),
    },
    options
  );
}

/**
 * Load parsed GTFS tables from a directory of *.txt files (fixture snapshots).
 *
 * @param {string} directory
 * @param {{ railOnly?: boolean, routeTypes?: string[], timeZone?: string, sourceUrl?: string }} options
 */
export function loadGtfsStaticFromDirectory(directory, options = {}) {
  const tables = {
    stops: readGtfsTable(directory, "stops.txt"),
    stopTimes: readGtfsTable(directory, "stop_times.txt"),
    trips: readGtfsTable(directory, "trips.txt"),
    routes: readGtfsTable(directory, "routes.txt"),
    calendar: readGtfsTable(directory, "calendar.txt"),
    calendarDates: readGtfsTable(directory, "calendar_dates.txt"),
  };
  const data = parseGtfsTables(tables, options);
  data.timeZone = options.timeZone ?? "UTC";
  data.sourceUrl = options.sourceUrl ?? directory;
  return data;
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
 * @param {{ url: string, ttlMs?: number, railOnly?: boolean, routeTypes?: string[], timeZone?: string, headers?: Record<string,string> }} options
 */
export async function loadGtfsStatic(options) {
  const url = options.url;
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const cached = cacheByUrl.get(url);
  if (cached && Date.now() - cached.loadedAt < ttlMs) {
    return cached.data;
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/zip, application/octet-stream, */*",
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`GTFS static download failed (${response.status}) for ${url}`);
  }

  const buffer = await response.arrayBuffer();
  const data = parseGtfsZip(buffer, {
    railOnly: options.railOnly ?? false,
    routeTypes: options.routeTypes ?? null,
  });
  data.timeZone = options.timeZone ?? "UTC";
  data.sourceUrl = url;

  cacheByUrl.set(url, { data, loadedAt: Date.now() });
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
