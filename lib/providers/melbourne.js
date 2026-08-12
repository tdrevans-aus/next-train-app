/**
 * Melbourne (PTV) metro train provider — Timetable API v3.
 * Adapter ready; city remains `planned` in registry (not live).
 *
 * Departures: GET /v3/departures/route_type/0/stop/{stop_id}
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getMetroDepartures } from "./ptv/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const MELBOURNE_TIME_ZONE = "Australia/Melbourne";

const catalogPath = join(__dirname, "../cities/melbourne/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+stn$/i, "")
    .replace(/\s+station$/i, "");
}

function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }

  const numericId = Number(raw);
  if (Number.isFinite(numericId) && numericId > 0) {
    for (const entry of stationCatalog.stations ?? []) {
      if (entry.stopId === numericId) {
        return entry;
      }
    }
  }

  const needle = normalizeKey(raw);
  for (const entry of stationCatalog.stations ?? []) {
    if (normalizeKey(entry.name) === needle) {
      return entry;
    }
    for (const alias of entry.aliases ?? []) {
      if (normalizeKey(alias) === needle) {
        return entry;
      }
    }
  }

  return null;
}

function formatClock(date, timeZone) {
  return date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  });
}

function destinationLabel(route, direction) {
  const directionName = String(direction?.direction_name ?? "").trim();
  const routeNumber = String(route?.route_number ?? "").trim();
  const routeName = String(route?.route_name ?? "").trim();

  if (directionName) {
    if (routeNumber && !directionName.includes(routeNumber)) {
      return `${routeNumber} ${directionName}`;
    }
    return directionName;
  }

  if (routeNumber && routeName) {
    return `${routeNumber} ${routeName}`;
  }

  return routeName || routeNumber || "Unknown";
}

function resolveStatus(scheduledMs, liveMs) {
  const delayMinutes = Math.round((liveMs - scheduledMs) / 60000);
  if (delayMinutes >= 2) {
    return `${delayMinutes} min late`;
  }
  if (delayMinutes <= -1) {
    return "On Time";
  }
  return "On Time";
}

function mapDeparture(departure, routes, directions) {
  const scheduledIso = departure.scheduled_departure_utc;
  const liveIso = departure.estimated_departure_utc || scheduledIso;
  if (!scheduledIso || !liveIso) {
    return null;
  }

  const scheduledDate = new Date(scheduledIso);
  const liveDate = new Date(liveIso);
  if (Number.isNaN(scheduledDate.getTime()) || Number.isNaN(liveDate.getTime())) {
    return null;
  }

  const route = routes?.[String(departure.route_id)] ?? routes?.[departure.route_id];
  const direction =
    directions?.[String(departure.direction_id)] ?? directions?.[departure.direction_id];

  const flags = String(departure.flags ?? "");
  const cancelled = /\bCancelled\b/i.test(flags);

  return {
    liveDeparture: liveDate.toISOString(),
    scheduledDeparture: scheduledDate.toISOString(),
    displayTime: formatClock(liveDate, MELBOURNE_TIME_ZONE),
    scheduledDisplayTime: formatClock(scheduledDate, MELBOURNE_TIME_ZONE),
    platform: String(departure.platform_number ?? "").trim(),
    destination: destinationLabel(route, direction),
    status: resolveStatus(scheduledDate.getTime(), liveDate.getTime()),
    cancelled,
  };
}

/**
 * @param {string|number} stationIdOrName Catalog name, alias, or PTV stop_id
 */
export async function fetchStationBoard(stationIdOrName) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopId = catalogEntry?.stopId ?? Number(stationIdOrName);

  if (!Number.isFinite(stopId) || stopId <= 0) {
    throw new Error(`Unknown Melbourne station: ${stationIdOrName}`);
  }

  const payload = await getMetroDepartures(stopId);
  const routes = payload.routes ?? {};
  const directions = payload.directions ?? {};
  const now = Date.now();

  const trips = (payload.departures ?? [])
    .map((departure) => mapDeparture(departure, routes, directions))
    .filter(Boolean)
    .filter((trip) => !trip.cancelled)
    .filter((trip) => new Date(trip.liveDeparture).getTime() >= now - 60_000)
    .sort((a, b) => new Date(a.liveDeparture) - new Date(b.liveDeparture));

  return {
    stationName: catalogEntry?.name ?? String(stationIdOrName),
    lastUpdate: new Date().toISOString(),
    trips,
  };
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}
