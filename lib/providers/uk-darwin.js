/**
 * UK rail — Darwin OpenLDBWS via Rail Data Marketplace's REST wrapper.
 *
 * Rewritten 2 Sep 2026: every UK region built through 30 Aug-1 Sep 2026 was coded
 * against the legacy SOAP endpoint (lite.realtime.nationalrail.co.uk) with the key
 * as a SOAP AccessToken — that endpoint doesn't recognize RDM-issued keys at all
 * (plain 401, not even a SOAP fault). Verified live against a real RDM Consumer
 * key: the actual production path is a REST/JSON wrapper on RDM's own gateway.
 *
 * Endpoint base path includes a product-specific version suffix (currently
 * "1010-live-departure-board-dep1_2") that is NOT guaranteed stable — if this
 * ever 404s, re-check the exact URL on the "Live Departure Board" product's
 * Specification tab at https://raildata.org.uk (My Subscriptions), not this
 * comment. Auth is an `x-apikey` HTTP header, not a SOAP element.
 *
 * Response is JSON with the same field names LDBWS has always used (std, etd,
 * platform, operator, destination[], origin[]) — GetDepartureBoard (not
 * -WithDetails) already includes everything this file's internal trip shape
 * needs, so calling points were never parsed and still aren't.
 *
 * Env: DARWIN_LDB_TOKEN (Rail Data Marketplace Consumer key)
 */

import { providerTripToInternal } from "../train-times-core.js";
import {
  listCatalogStations as listRegionCatalogStations,
  listRailStations,
  resolveRailEntry,
  isCrsInRegion,
} from "./uk/catalog.js";

export const UK_TIME_ZONE = "Europe/London";

const LDBWS_BASE = "https://api1.raildata.org.uk/1010-live-departure-board-dep1_2/LDBWS/api/20220120";

const TIME_PATTERN = /^\d{1,2}:\d{2}(\*)?$/;

export class MissingDarwinTokenError extends Error {
  constructor() {
    super("DARWIN_LDB_TOKEN is not set");
    this.name = "MissingDarwinTokenError";
    this.envName = "DARWIN_LDB_TOKEN";
  }
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+station$/i, "");
}

function resolveCatalogEntry(stationIdOrName, regionId) {
  if (regionId) {
    return resolveRailEntry(stationIdOrName, regionId);
  }
  for (const region of ["uk-west-midlands", "east-midlands"]) {
    const hit = resolveRailEntry(stationIdOrName, region);
    if (hit) {
      return hit;
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
  const pick = (type) => Number(parts.find((part) => part.type === type)?.value ?? 0);
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

function ukLocalTimeToDate(hhmm, now = new Date()) {
  const clean = String(hhmm).trim().replace(/\*$/, "");
  const [hourRaw, minuteRaw] = clean.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(now);
  const pick = (type) => parts.find((part) => part.type === type)?.value ?? "00";
  const year = Number(pick("year"));
  const month = Number(pick("month"));
  const day = Number(pick("day"));

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offsetMs = tzOffsetMs(utcGuess, UK_TIME_ZONE);
  let departure = new Date(utcGuess.getTime() - offsetMs);

  if (departure.getTime() < now.getTime() - 30 * 60 * 1000) {
    const nextDay = new Date(departure.getTime() + 24 * 60 * 60 * 1000);
    departure = nextDay;
  }

  return departure;
}

function formatClock(date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: UK_TIME_ZONE,
  });
}

/**
 * Map Darwin std/etd strings to departure times for leave-by math.
 * @param {string} std scheduled HH:MM
 * @param {string} etd Darwin estimated field
 * @param {Date} [now]
 */
export function normalizeEtd(std, etd, now = new Date()) {
  const scheduledDisplayTime = String(std ?? "").trim();
  const rawEtd = String(etd ?? "").trim();
  const etdKey = rawEtd.toLowerCase().replace(/\*$/, "");

  if (!scheduledDisplayTime) {
    return {
      cancelled: true,
      scheduledDisplayTime: "",
      displayTime: rawEtd || "Cancelled",
      status: rawEtd || "Cancelled",
      liveDeparture: null,
      scheduledDeparture: null,
    };
  }

  const scheduledDeparture = ukLocalTimeToDate(scheduledDisplayTime, now);

  if (etdKey === "cancelled" || etdKey === "canceled") {
    return {
      cancelled: true,
      scheduledDisplayTime,
      displayTime: "Cancelled",
      status: "Cancelled",
      liveDeparture: scheduledDeparture,
      scheduledDeparture,
    };
  }

  if (etdKey === "on time" || etdKey === "") {
    return {
      cancelled: false,
      scheduledDisplayTime,
      displayTime: scheduledDisplayTime,
      status: "On time",
      liveDeparture: scheduledDeparture,
      scheduledDeparture,
    };
  }

  if (etdKey === "delayed") {
    return {
      cancelled: false,
      scheduledDisplayTime,
      displayTime: "Delayed",
      status: "Delayed",
      liveDeparture: scheduledDeparture,
      scheduledDeparture,
    };
  }

  if (etdKey === "no report") {
    return {
      cancelled: false,
      scheduledDisplayTime,
      displayTime: scheduledDisplayTime,
      status: "No report",
      liveDeparture: scheduledDeparture,
      scheduledDeparture,
    };
  }

  if (TIME_PATTERN.test(rawEtd)) {
    const displayTime = rawEtd.replace(/\*$/, "");
    const liveDeparture = ukLocalTimeToDate(displayTime, now) ?? scheduledDeparture;
    return {
      cancelled: false,
      scheduledDisplayTime,
      displayTime,
      status: rawEtd.endsWith("*") ? `${displayTime}*` : displayTime,
      liveDeparture,
      scheduledDeparture,
    };
  }

  return {
    cancelled: false,
    scheduledDisplayTime,
    displayTime: rawEtd || scheduledDisplayTime,
    status: rawEtd || scheduledDisplayTime,
    liveDeparture: scheduledDeparture,
    scheduledDeparture,
  };
}

/**
 * @param {{locationName?: string, crs?: string}[]} [locations] origin[] or destination[]
 */
function joinLocationNames(locations) {
  if (!Array.isArray(locations) || locations.length === 0) {
    return "Unknown";
  }
  const names = [];
  for (const loc of locations) {
    const name = String(loc?.locationName ?? "").trim();
    if (name && !names.includes(name)) {
      names.push(name);
    }
  }
  return names.join(" and ") || "Unknown";
}

/**
 * @param {object} service one entry of the JSON response's trainServices[]
 * @param {Date} now
 */
function serviceToTrip(service, now) {
  const std = service?.std ?? "";
  const etd = service?.etd ?? "";
  const platform = service?.platform ?? "";
  const isCancelled = Boolean(service?.isCancelled);
  const delayReason = service?.delayReason ?? "";
  const cancelReason = service?.cancelReason ?? "";
  const length = service?.length;
  // The REST wrapper's serviceType is a word ("train"/"bus"/"ferry"), unlike the legacy
  // SOAP schema's single-letter code — a bus/ferry replacement service on the same board
  // should stay off a rail-mode city's departure board.
  const serviceType = String(service?.serviceType ?? "").toLowerCase();
  const operator = service?.operator ?? "";
  const filterLocationCancelled = Boolean(service?.filterLocationCancelled);

  if (serviceType && serviceType !== "train") {
    return null;
  }

  const timing = normalizeEtd(std, etd, now);
  if (isCancelled) {
    timing.cancelled = true;
    timing.displayTime = "Cancelled";
    timing.status = cancelReason || "Cancelled";
  }

  if (filterLocationCancelled || timing.cancelled) {
    if (timing.cancelled && !timing.liveDeparture) {
      return null;
    }
  }

  if (!timing.liveDeparture) {
    return null;
  }

  const trip = providerTripToInternal({
    scheduledDeparture: timing.scheduledDeparture,
    scheduledDisplayTime: timing.scheduledDisplayTime,
    liveDeparture: timing.liveDeparture,
    displayTime: timing.displayTime,
    platform: platform || undefined,
    destination: joinLocationNames(service?.destination),
    cars: length ? Number(length) : undefined,
    cancelled: timing.cancelled,
    status: delayReason || timing.status,
  });
  // Not part of the ProviderTrip contract typedef — carried through so an adapter can filter
  // a board by operator (e.g. a compulsory-reservation service excluded per
  // docs/board-eligibility-rule.md). See fetchStationBoard's excludeOperators option.
  trip.operator = operator || undefined;
  return trip;
}

/**
 * Parse the RDM REST wrapper's GetDepartureBoard JSON into contract-shaped trips.
 * @param {object} json parsed response body
 * @param {Date} [now]
 */
export function parseDepartureBoardJson(json, now = new Date()) {
  const stationName = json?.locationName ?? "";
  const generatedAtRaw = json?.generatedAt ?? "";
  const generatedAt = generatedAtRaw ? new Date(generatedAtRaw) : null;

  const services = Array.isArray(json?.trainServices) ? json.trainServices : [];

  const trips = [];
  for (const service of services) {
    const trip = serviceToTrip(service, now);
    if (trip) {
      trips.push(trip);
    }
  }

  trips.sort((a, b) => a.liveDeparture.getTime() - b.liveDeparture.getTime());

  return {
    stationName,
    lastUpdate: generatedAt && !Number.isNaN(generatedAt.getTime()) ? generatedAt.toISOString() : null,
    trips,
  };
}

function getDarwinToken() {
  const token = String(process.env.DARWIN_LDB_TOKEN ?? "").trim();
  if (!token) {
    throw new MissingDarwinTokenError();
  }
  return token;
}

/**
 * Low-level Darwin board fetch, via RDM's REST wrapper (GET + x-apikey header).
 * @param {{ crs: string, filterCrs?: string, filterType?: "to"|"from", numRows?: number }} params
 */
export async function fetchDepartureBoard({ crs, filterCrs, filterType = "to", numRows = 10 }) {
  const token = getDarwinToken();

  const query = new URLSearchParams({ numRows: String(Number(numRows) || 10) });
  if (filterCrs) {
    query.set("filterCrs", filterCrs);
    query.set("filterType", filterType);
  }

  const response = await fetch(`${LDBWS_BASE}/GetDepartureBoard/${encodeURIComponent(crs)}?${query}`, {
    method: "GET",
    headers: { "x-apikey": token },
  });

  const text = await response.text();
  if (!response.ok) {
    let detail = "";
    try {
      detail = JSON.parse(text)?.fault?.faultstring ?? "";
    } catch {
      // Non-JSON error body (e.g. a gateway HTML page) — fall through with no detail.
    }
    throw new Error(`Darwin LDBWS returned ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  return parseDepartureBoardJson(JSON.parse(text));
}

/**
 * True when a trip's operator matches one of the given exclusion names
 * (case-insensitive substring match, e.g. "Caledonian Sleeper").
 * @param {{ operator?: string }} trip
 * @param {string[]} excludeOperators
 */
function isExcludedOperatorTrip(trip, excludeOperators) {
  if (!excludeOperators?.length || !trip.operator) {
    return false;
  }
  const operator = trip.operator.toLowerCase();
  return excludeOperators.some((name) => operator.includes(String(name).toLowerCase()));
}

/**
 * True when a trip's operator matches one of the given allow-list names
 * (case-insensitive substring match). Symmetric to isExcludedOperatorTrip —
 * added for regions that split a single physical station's board into
 * multiple per-operator boards (e.g. London & South East National Rail's
 * London Bridge / Liverpool Street internal doNotGroup, three/two operators
 * sharing one CRS). A trip with no operator tag never matches an allow-list
 * (fails closed, unlike the exclude path which fails open).
 * @param {{ operator?: string }} trip
 * @param {string[]} includeOperators
 */
function isIncludedOperatorTrip(trip, includeOperators) {
  if (!trip.operator) {
    return false;
  }
  const operator = trip.operator.toLowerCase();
  return includeOperators.some((name) => operator.includes(String(name).toLowerCase()));
}

/**
 * Contract-shaped board for a catalog station (all departures, no direction filter).
 * @param {string} stationIdOrName CRS code or catalog name
 * @param {{ regionId?: string, excludeOperators?: string[], includeOperators?: string[], entry?: {crs: string, name?: string, regionId?: string}, mode?: "train"|"metro" }} [options]
 *   `entry` lets a caller pass a pre-resolved catalog entry (e.g. a region's
 *   own metro-mode lookup) instead of re-resolving stationIdOrName through
 *   the rail-only resolver — used so a region's non-National-Rail modes
 *   (e.g. Merseyrail, which is Darwin-served like any other TOC) can reuse
 *   this function's fetch + operator-filter logic without duplicating it.
 *   `mode` overrides the "train" label on the returned board shape to match.
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const regionId = options.regionId;
  const entry = options.entry ?? resolveCatalogEntry(stationIdOrName, regionId);
  if (!entry?.crs) {
    throw new Error(`Unknown UK station: ${stationIdOrName}`);
  }

  const board = await fetchDepartureBoard({ crs: entry.crs, numRows: 15 });
  let trips = options.excludeOperators?.length
    ? board.trips.filter((trip) => !isExcludedOperatorTrip(trip, options.excludeOperators))
    : board.trips;
  if (options.includeOperators?.length) {
    trips = trips.filter((trip) => isIncludedOperatorTrip(trip, options.includeOperators));
  }
  return {
    stationName: board.stationName || entry.name,
    crs: entry.crs,
    regionId: entry.regionId ?? regionId,
    mode: options.mode ?? "train",
    lastUpdate: board.lastUpdate,
    trips,
  };
}

/**
 * Direction-filtered board for a region allow-list station.
 * @param {string} stationIdOrName
 * @param {string} filterCrs Destination CRS
 * @param {{ regionId?: string, filterType?: "to"|"from", numRows?: number }} [options]
 */
export async function fetchRegionalDepartureBoard(stationIdOrName, filterCrs, options = {}) {
  const regionId = options.regionId;
  const entry = resolveCatalogEntry(stationIdOrName, regionId);
  if (!entry?.crs) {
    throw new Error(`Unknown UK station: ${stationIdOrName}`);
  }
  const destCrs = String(filterCrs || "").trim().toUpperCase();
  if (regionId && !isCrsInRegion(destCrs, regionId)) {
    // Destination may be out-of-region (e.g. Redditch) — still allow filter for journey chips.
  }

  const board = await fetchDepartureBoard({
    crs: entry.crs,
    filterCrs: destCrs,
    filterType: options.filterType ?? "to",
    numRows: options.numRows ?? 10,
  });

  return {
    stationName: board.stationName || entry.name,
    crs: entry.crs,
    regionId: entry.regionId,
    filterCrs: destCrs,
    mode: "train",
    lastUpdate: board.lastUpdate,
    trips: board.trips,
  };
}

/**
 * @param {string} [regionId] uk-west-midlands | east-midlands | ...
 * @param {{ mode?: "train"|"metro" }} [options]
 */
export function listCatalogStations(regionId, options = {}) {
  if (!regionId) {
    return listRegionCatalogStations("uk-west-midlands", { mode: "train" });
  }
  return listRegionCatalogStations(regionId, { mode: options.mode ?? "train" });
}

export { listRailStations, isCrsInRegion, resolveRailEntry };
