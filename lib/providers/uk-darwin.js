/**
 * UK rail — Darwin OpenLDBWS (Public) spike adapter.
 *
 * NOT REGISTERED: not in registry, dev-city-board, or /api/next-train.
 * See docs/uk-provider-design.md for the launch gate.
 *
 * WSDL: https://lite.realtime.nationalrail.co.uk/OpenLDBWS/wsdl.aspx?ver=2021-11-01
 * Env: DARWIN_LDB_TOKEN (Rail Data Marketplace)
 */

import { providerTripToInternal } from "../train-times-core.js";
import {
  listCatalogStations as listRegionCatalogStations,
  listRailStations,
  resolveRailEntry,
  isCrsInRegion,
} from "./uk/catalog.js";

export const UK_TIME_ZONE = "Europe/London";

const LDBWS_ENDPOINT = "https://lite.realtime.nationalrail.co.uk/OpenLDBWS/ldb6.asmx";
const LDBWS_NS = "http://thalesgroup.com/RTTI/2007-02-20/LDBWS/";

const TIME_PATTERN = /^\d{1,2}:\d{2}(\*)?$/;

export class MissingDarwinTokenError extends Error {
  constructor() {
    super("DARWIN_LDB_TOKEN is not set");
    this.name = "MissingDarwinTokenError";
    this.envName = "DARWIN_LDB_TOKEN";
  }
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractTag(block, tag) {
  const match = block.match(new RegExp(`<(?:[a-zA-Z0-9]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9]+:)?${tag}>`));
  return match ? match[1].trim() : "";
}

function extractTags(block, tag) {
  const pattern = new RegExp(
    `<(?:[a-zA-Z0-9]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9]+:)?${tag}>`,
    "g"
  );
  const values = [];
  let match;
  while ((match = pattern.exec(block)) !== null) {
    values.push(match[1].trim());
  }
  return values;
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
  for (const region of ["uk-west-midlands", "uk-ellesmere-port", "east-midlands"]) {
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

function extractDestinationLabel(serviceBlock) {
  const names = [];
  const locationPattern =
    /<(?:[a-zA-Z0-9]+:)?locationName[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9]+:)?locationName>/g;
  let match;
  while ((match = locationPattern.exec(serviceBlock)) !== null) {
    const name = match[1].trim();
    if (name && !names.includes(name)) {
      names.push(name);
    }
  }
  return names.join(" and ") || "Unknown";
}

function parseServiceBlock(serviceBlock, now) {
  const std = extractTag(serviceBlock, "std");
  const etd = extractTag(serviceBlock, "etd");
  const platform = extractTag(serviceBlock, "platform");
  const isCancelled = extractTag(serviceBlock, "isCancelled").toLowerCase() === "true";
  const delayReason = extractTag(serviceBlock, "delayReason");
  const cancelReason = extractTag(serviceBlock, "cancelReason");
  const length = extractTag(serviceBlock, "length");
  const serviceType = extractTag(serviceBlock, "serviceType");
  const operator = extractTag(serviceBlock, "operator");
  const filterLocationCancelled =
    extractTag(serviceBlock, "filterLocationCancelled").toLowerCase() === "true";

  if (serviceType && serviceType.toUpperCase() !== "P") {
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
    destination: extractDestinationLabel(serviceBlock),
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
 * Parse GetDepartureBoard SOAP XML into contract-shaped trips.
 * @param {string} xml
 * @param {Date} [now]
 */
export function parseDepartureBoardXml(xml, now = new Date()) {
  const boardMatch = xml.match(
    /<(?:[a-zA-Z0-9]+:)?GetStationBoardResult[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9]+:)?GetStationBoardResult>/
  );
  const boardBlock = boardMatch?.[1] ?? xml;
  const stationName = extractTag(boardBlock, "locationName") || extractTag(boardBlock, "LocationName");
  const generatedAtRaw = extractTag(boardBlock, "generatedAt");
  const generatedAt = generatedAtRaw ? new Date(generatedAtRaw) : null;

  const trainServicesBlock = extractTag(boardBlock, "trainServices");
  const serviceBlocks = extractTags(trainServicesBlock, "service");

  const trips = [];
  for (const serviceBlock of serviceBlocks) {
    const trip = parseServiceBlock(serviceBlock, now);
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

function buildGetDepartureBoardEnvelope(token, { crs, filterCrs, filterType = "to", numRows = 10 }) {
  const filterXml = filterCrs
    ? `<ldb:filterCrs>${escapeXml(filterCrs)}</ldb:filterCrs>
      <ldb:filterType>${escapeXml(filterType)}</ldb:filterType>`
    : "";

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ldb="${LDBWS_NS}">
  <soap:Header>
    <ldb:AccessToken>
      <ldb:TokenValue>${escapeXml(token)}</ldb:TokenValue>
    </ldb:AccessToken>
  </soap:Header>
  <soap:Body>
    <ldb:GetDepartureBoardRequest>
      <ldb:numRows>${Number(numRows) || 10}</ldb:numRows>
      <ldb:crs>${escapeXml(crs)}</ldb:crs>
      ${filterXml}
    </ldb:GetDepartureBoardRequest>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Low-level Darwin board fetch.
 * @param {{ crs: string, filterCrs?: string, filterType?: "to"|"from", numRows?: number }} params
 */
export async function fetchDepartureBoard(params) {
  const token = getDarwinToken();
  const body = buildGetDepartureBoardEnvelope(token, params);

  const response = await fetch(LDBWS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/soap+xml; charset=utf-8",
      SOAPAction: `${LDBWS_NS}GetDepartureBoard`,
    },
    body,
  });

  const xml = await response.text();
  if (!response.ok) {
    throw new Error(`Darwin LDBWS returned ${response.status}`);
  }

  if (xml.includes("soap:Fault") || xml.includes("Fault>")) {
    const fault = extractTag(xml, "faultstring") || extractTag(xml, "Text") || "SOAP fault";
    throw new Error(`Darwin LDBWS fault: ${fault}`);
  }

  return parseDepartureBoardXml(xml);
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
 * Contract-shaped board for a catalog station (all departures, no direction filter).
 * @param {string} stationIdOrName CRS code or catalog name
 * @param {{ regionId?: string, excludeOperators?: string[] }} [options]
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const regionId = options.regionId;
  const entry = resolveCatalogEntry(stationIdOrName, regionId);
  if (!entry?.crs) {
    throw new Error(`Unknown UK station: ${stationIdOrName}`);
  }

  const board = await fetchDepartureBoard({ crs: entry.crs, numRows: 15 });
  const trips = options.excludeOperators?.length
    ? board.trips.filter((trip) => !isExcludedOperatorTrip(trip, options.excludeOperators))
    : board.trips;
  return {
    stationName: board.stationName || entry.name,
    crs: entry.crs,
    regionId: entry.regionId,
    mode: "train",
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
 * @param {string} [regionId] uk-west-midlands | uk-ellesmere-port
 * @param {{ mode?: "train"|"metro" }} [options]
 */
export function listCatalogStations(regionId, options = {}) {
  if (!regionId) {
    return listRegionCatalogStations("uk-west-midlands", { mode: "train" });
  }
  return listRegionCatalogStations(regionId, { mode: options.mode ?? "train" });
}

export { listRailStations, isCrsInRegion, resolveRailEntry };
