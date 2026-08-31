/**
 * Helsinki (HKL / HSL) metro — Digitransit Routing API v2 HSL GraphQL.
 * Adapter ready; city remains `planned` (not live) — see docs/helsinki-d1/jim-handoff.md.
 * assertCityLive("helsinki") must still fail until Tim flips the registry entry.
 *
 * Live path: POST https://api.digitransit.fi/routing/v2/hsl/gtfs/v1
 * `station(id) { stops { stoptimesWithoutPatterns } }`, header digitransit-subscription-key
 * (DIGITRANSIT_SUBSCRIPTION_KEY, from https://portal-api.digitransit.fi/). Confirmed live
 * 30 Aug 2026 against real HSL metro stations. Static HSL GTFS is NOT used here — the D1
 * pack (docs/helsinki-d1/jim-handoff.md item 15) is explicit that static GTFS is not a D1
 * generator, and the Digitransit routing query already returns blended scheduled/realtime
 * data in one call, so there is no separate GTFS-RT protobuf merge step the way Malmö/
 * Göteborg need. HSL GTFS-RT (realtime.hsl.fi) is documented as an alternative live path
 * but is not wired — one official source is enough for v1.
 *
 * v1 scope (docs/helsinki-d1/hazard-pack.md, direction-model-memo.md): metro only,
 * shortName M1|M2, vehicleMode SUBWAY. No tram, no bus, no HSL/VR commuter rail, no
 * Suomenlinna ferry. Rautatientori (metro) and Helsinki Central / Päärautatieasema
 * (VR/commuter) are different Digitransit stop-places — doNotGroup; they are never the
 * same `station(id)` query, since the catalog only carries metro stationGtfsIds.
 *
 * Digitransit `serviceDay` is the Unix epoch second of local midnight (Europe/Helsinki)
 * for the service day; `scheduledDeparture`/`realtimeDeparture` are seconds offset from
 * that midnight (can exceed 86400 for a late-night trip on the same service day, per
 * GTFS convention). Adding the offset to the epoch `serviceDay` gives the correct UTC
 * instant without any timezone arithmetic of our own, which is DST-safe by construction
 * (docs/helsinki-d1/hazard-pack.md H7 — Europe/Helsinki has DST).
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { digitransitAuthHeaders } from "./gtfs/auth.js";
import {
  HELSINKI_HUB,
  HELSINKI_TIME_ZONE,
  foldKey,
  isForbiddenCollapseName,
  mapHelsinkiDestination,
} from "../cities/helsinki/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const HELSINKI_TIMEZONE = HELSINKI_TIME_ZONE;
export const DIGITRANSIT_ROUTING_URL = "https://api.digitransit.fi/routing/v2/hsl/gtfs/v1";

/** Allowed metro passenger codes (docs/helsinki-d1/hazard-pack.md H5 — no M3). */
const ALLOWED_LINE_CODES = new Set(["M1", "M2"]);

const catalogPath = join(__dirname, "../cities/helsinki/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }
  if (isForbiddenCollapseName(raw)) {
    return null;
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
    if (entry.stationGtfsId === raw) {
      return entry;
    }
  }
  return null;
}

function formatClock(date) {
  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }
  // fi-FI renders HH.MM (dot separator) — use sv-SE for the HH:MM colon format the rest
  // of the product uses (same trick Stockholm/Malmö/Göteborg rely on).
  return date.toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: HELSINKI_TIME_ZONE,
  });
}

/** stoptimesWithoutPatterns() field selection, shared by the query builder below. */
const STOPTIMES_FIELDS = `
  scheduledDeparture
  realtimeDeparture
  departureDelay
  realtime
  realtimeState
  serviceDay
  headsign
  trip {
    gtfsId
    route {
      shortName
      mode
    }
  }
`;

function buildStationQuery(stationGtfsId, numberOfDepartures) {
  return {
    query: `query HelsinkiStationBoard($id: String!, $n: Int!) {
      station(id: $id) {
        gtfsId
        name
        stops {
          gtfsId
          platformCode
          stoptimesWithoutPatterns(numberOfDepartures: $n, omitCanceled: false) {
            ${STOPTIMES_FIELDS}
          }
        }
      }
    }`,
    variables: { id: stationGtfsId, n: numberOfDepartures },
  };
}

async function fetchDigitransitStation(stationGtfsId, numberOfDepartures) {
  const response = await fetch(DIGITRANSIT_ROUTING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...digitransitAuthHeaders(),
    },
    body: JSON.stringify(buildStationQuery(stationGtfsId, numberOfDepartures)),
  });
  if (!response.ok) {
    throw new Error(`Digitransit routing ${response.status} for station ${stationGtfsId}`);
  }
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(`Digitransit routing error: ${payload.errors.map((e) => e.message).join("; ")}`);
  }
  return payload.data?.station ?? null;
}

function isMetroStoptime(stoptime) {
  const mode = String(stoptime?.trip?.route?.mode ?? "").toUpperCase();
  const shortName = String(stoptime?.trip?.route?.shortName ?? "").trim().toUpperCase();
  return mode === "SUBWAY" && ALLOWED_LINE_CODES.has(shortName);
}

function mapStoptime(stoptime) {
  const serviceDay = Number(stoptime.serviceDay);
  const scheduledOffset = Number(stoptime.scheduledDeparture);
  const realtimeOffset = Number(
    Number.isFinite(stoptime.realtimeDeparture) ? stoptime.realtimeDeparture : stoptime.scheduledDeparture
  );
  if (!Number.isFinite(serviceDay) || !Number.isFinite(scheduledOffset)) {
    return null;
  }
  const scheduledDate = new Date((serviceDay + scheduledOffset) * 1000);
  const liveDate = Number.isFinite(realtimeOffset)
    ? new Date((serviceDay + realtimeOffset) * 1000)
    : scheduledDate;
  if (Number.isNaN(scheduledDate.getTime()) || Number.isNaN(liveDate.getTime())) {
    return null;
  }

  const routeShortName = String(stoptime.trip?.route?.shortName ?? "").trim().toUpperCase();
  const cancelled = String(stoptime.realtimeState ?? "").toUpperCase() === "CANCELED";

  return {
    liveDeparture: liveDate.toISOString(),
    scheduledDeparture: scheduledDate.toISOString(),
    displayTime: formatClock(liveDate),
    scheduledDisplayTime: formatClock(scheduledDate),
    destination: mapHelsinkiDestination(stoptime.headsign, routeShortName),
    routeShortName,
    cancelled,
    status: cancelled ? "Cancelled" : undefined,
    realtime: stoptime.realtime === true,
  };
}

/**
 * @param {string} stationIdOrName Catalog name, alias, or Digitransit station gtfsId
 * @param {{ now?: Date, numberOfDepartures?: number }} [options]
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stationGtfsId = catalogEntry?.stationGtfsId ?? String(stationIdOrName);
  if (!stationGtfsId) {
    throw new Error(`Unknown Helsinki station: ${stationIdOrName}`);
  }

  const stationName = catalogEntry?.name ?? stationIdOrName;
  const numberOfDepartures = options.numberOfDepartures ?? 10;
  const station = await fetchDigitransitStation(stationGtfsId, numberOfDepartures);
  if (!station) {
    throw new Error(`Unknown Helsinki station: ${stationIdOrName}`);
  }

  const now = options.now ?? new Date();
  const nowMs = now.getTime();

  const trips = (station.stops ?? [])
    .flatMap((stop) => stop.stoptimesWithoutPatterns ?? [])
    .filter(isMetroStoptime)
    .map(mapStoptime)
    .filter(Boolean)
    .filter((trip) => !trip.cancelled)
    .filter((trip) => new Date(trip.liveDeparture).getTime() >= nowMs - 60_000)
    .sort((a, b) => new Date(a.liveDeparture) - new Date(b.liveDeparture));

  return {
    stationName,
    lastUpdate: new Date().toISOString(),
    trips,
    /** Digitransit stoptimesWithoutPatterns already blends scheduled + realtime. */
    realtime: true,
  };
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

export { HELSINKI_HUB, resolveCatalogEntry };
