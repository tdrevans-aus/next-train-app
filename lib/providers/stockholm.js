/**
 * Stockholm (SL) Tunnelbana + Pendeltåg — SL Transport JSON, no API key.
 * Adapter ready; city remains `planned` (not live).
 *
 * Sites/departures: https://transport.integration.sl.se/v1/{sites,sites/{id}/departures}
 * Trafiklab GTFS Sweden is optional later and needs a key — not used here.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  ALLOWED_LINE_CODES,
  foldKey,
  isForbiddenCollapseName,
  mapStockholmDestination,
  METRO_HUB,
  PENDELTÅG_HUB,
} from "../cities/stockholm/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const STOCKHOLM_TIME_ZONE = "Europe/Stockholm";

export const SL_TRANSPORT_BASE = "https://transport.integration.sl.se/v1";

const ALLOWED_MODES = new Set(["METRO", "TRAIN"]);
const ALLOWED_CODES = new Set(ALLOWED_LINE_CODES);

const catalogPath = join(__dirname, "../cities/stockholm/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }
  if (isForbiddenCollapseName(raw) && foldKey(raw) !== foldKey(METRO_HUB) && foldKey(raw) !== foldKey(PENDELTÅG_HUB)) {
    return null;
  }

  const numericId = Number(raw);
  if (Number.isFinite(numericId) && numericId > 0) {
    for (const entry of stationCatalog.stations ?? []) {
      if (entry.siteId === numericId) {
        return entry;
      }
    }
  }

  const needle = foldKey(raw);
  for (const entry of stationCatalog.stations ?? []) {
    if (foldKey(entry.name) === needle) {
      return entry;
    }
    for (const alias of entry.aliases ?? []) {
      if (foldKey(alias) === needle) {
        return entry;
      }
    }
  }

  return null;
}

function tzOffsetMs(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(date);
  const pick = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    pick("year"),
    pick("month") - 1,
    pick("day"),
    pick("hour"),
    pick("minute"),
    pick("second")
  );
  return asUtc - date.getTime();
}

/** SL Transport timestamps are Europe/Stockholm wall-clock without an offset. */
function parseStockholmDate(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }
  if (/Z|[+-]\d{2}:\d{2}$/.test(raw)) {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const utcGuess = new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6] ?? 0)
    )
  );
  return new Date(utcGuess.getTime() - tzOffsetMs(utcGuess, STOCKHOLM_TIME_ZONE));
}

/**
 * HH:mm in Europe/Stockholm — shared across the Swedish adapters
 * (lib/providers/goteborg.js reuses this rather than writing its own; see
 * docs/jim-brief-goteborg-display-time.md).
 */
export function formatClock(date) {
  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: STOCKHOLM_TIME_ZONE,
  });
}

function allowedDeparture(departure, catalogEntry) {
  const mode = String(departure?.line?.transport_mode ?? "").toUpperCase();
  const code = String(departure?.line?.designation ?? departure?.line?.name ?? "").trim().toUpperCase();
  if (!ALLOWED_MODES.has(mode) || !ALLOWED_CODES.has(code)) {
    return false;
  }
  const boardModes = catalogEntry?.boardModes;
  if (Array.isArray(boardModes) && boardModes.length > 0 && !boardModes.includes(mode)) {
    return false;
  }
  return true;
}

function mapDeparture(departure) {
  const scheduledDate = parseStockholmDate(departure.scheduled);
  const liveDate = parseStockholmDate(departure.expected) || scheduledDate;
  if (!liveDate) {
    return null;
  }
  const cancelled = String(departure.state ?? "").toUpperCase() === "CANCELLED";
  const code = String(departure.line?.designation ?? "").trim();
  const dest = String(departure.destination || departure.direction || "").trim();
  return {
    liveDeparture: liveDate.toISOString(),
    scheduledDeparture: (scheduledDate || liveDate).toISOString(),
    displayTime: formatClock(liveDate),
    scheduledDisplayTime: formatClock(scheduledDate || liveDate),
    platform: String(departure.stop_point?.designation ?? "").trim(),
    destination: mapStockholmDestination(dest, code),
    routeShortName: code,
    status: String(departure.state ?? "").trim() || undefined,
    cancelled,
  };
}

async function fetchDepartures(siteId) {
  const url = `${SL_TRANSPORT_BASE}/sites/${encodeURIComponent(siteId)}/departures`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`SL Transport ${response.status} for site ${siteId}`);
  }
  return response.json();
}

/**
 * @param {string|number} stationIdOrName Catalog name, alias, or SL site id
 */
export async function fetchStationBoard(stationIdOrName) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const siteId = catalogEntry?.siteId ?? Number(stationIdOrName);
  if (!Number.isFinite(siteId) || siteId <= 0) {
    throw new Error(`Unknown Stockholm station: ${stationIdOrName}`);
  }

  const payload = await fetchDepartures(siteId);
  const now = Date.now();
  const trips = (payload.departures ?? [])
    .filter((row) => allowedDeparture(row, catalogEntry))
    .map(mapDeparture)
    .filter(Boolean)
    .filter((trip) => !trip.cancelled)
    .filter((trip) => new Date(trip.liveDeparture).getTime() >= now - 60_000)
    .sort((a, b) => new Date(a.liveDeparture) - new Date(b.liveDeparture));

  return {
    stationName: catalogEntry?.name ?? stationIdOrName,
    lastUpdate: new Date().toISOString(),
    trips,
    /**
     * SL Transport departures are a realtime feed — `expected` carries live
     * times (falling back to `scheduled` per departure). Unlike Göteborg's
     * schedule-only Trafiklab vt board, this is honestly true.
     */
    realtime: true,
  };
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}
