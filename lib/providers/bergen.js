/**
 * Bergen Bybanen (Skyss light rail, lines 1 and 2) — Entur Journey Planner v3 GraphQL.
 * Adapter ready; city stays `planned` (not live) — see docs/bergen-d1/jim-handoff.md.
 * assertCityLive("bergen") must still fail until Tim flips the registry entry.
 *
 * Same provider family as Oslo (lib/providers/oslo.js) — reuses the same Entur Journey
 * Planner v3 GraphQL surface and ET-Client-Name header convention, NOT a fork of Oslo's file
 * (Bergen has its own operator, its own station catalog, its own direction model — the
 * country ledger, docs/norway-ledger.md, calls for per-city adapters over the shared Entur
 * feed, not a merged provider config).
 *
 * Live path: POST https://api.entur.io/journey-planner/v3/graphql
 * `stopPlace(id) { estimatedCalls }`, header `ET-Client-Name: next-train-app` (NLOD open
 * service; identifying header, not a secret key — no env var needed).
 *
 * v1 scope (docs/bergen-d1/hazard-pack.md, direction-model-memo.md, published-network.json
 * Board eligibility section): Bybanen lines 1 and 2 only, all 33 stations. No Skyss regional
 * bus (out-mode, even where co-located with a Bybanen stop-place), no Vy Bergensbanen/Arna
 * line (out of catalog by station-set definition — Bergen Railway Station, NSR:StopPlace:59983,
 * is a confirmed-distinct NSR stop-place from every Bybanen stop, never in this catalog under
 * any name).
 *
 * Authority filter: Entur distinguishes operators by `serviceJourney.line.authority.id`, not
 * by the GTFS `datasetId` query param the D1 pack names for static feeds — this adapter
 * filters on authority `SKY:Authority:SKY` (Skyss) + `transportMode: tram` (Bybanen registers
 * as tram mode in Entur, confirmed by every stop-place category tag pulled in the D1 pass —
 * never `metro`) + publicCode allow-list {"1","2"}.
 *
 * LIVE BOARDS ONLY, per Tim's rule (same posture as lib/providers/oslo.js/vienna.js): no
 * static-timetable fallback; fetchStationBoard() propagates any Entur fetch/GraphQL-error
 * failure rather than returning an empty/synthetic board.
 *
 * Hub lock: Bergen busstasjon (docs/bergen-d1/hazard-pack.md H6, Luke's correction of the
 * oracle report's original Byparken pick — Line 2 never calls at Byparken). Plain
 * through-station on both lines, never itself a printed terminus — no self-referential-hub
 * case exists here (contrast Oslo's R21/Jernbanetorget). Byparken and Kaigaten remain valid,
 * real, line-specific direction-chip termini for lines 1 and 2 respectively; the self-terminus
 * guard (lib/cities/bergen/marketing-directions.js's isTerminatingAtStation) drops a call whose
 * resolved terminus is the station currently being viewed, so `1 + Byparken` never appears at
 * Byparken itself, nor `2 + Kaigaten` at Kaigaten itself.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  BERGEN_HUB,
  BERGEN_TIME_ZONE,
  foldKey,
  isForbiddenCollapseName,
  isTerminatingAtStation,
  mapLineTerminusDestination,
  resolveTerminus,
  stripViaSuffix,
} from "../cities/bergen/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const BERGEN_TIMEZONE = BERGEN_TIME_ZONE;
export const ENTUR_JOURNEY_PLANNER_URL = "https://api.entur.io/journey-planner/v3/graphql";
export const ENTUR_CLIENT_NAME = "next-train-app";

/** Bybanen passenger line codes (docs/bergen-d1/hazard-pack.md H5 — no line 3 or higher). */
const ALLOWED_LINE_CODES = new Set(["1", "2"]);

const SKY_AUTHORITY = "SKY:Authority:SKY";

const catalogPath = join(__dirname, "../cities/bergen/stations.json");
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
  return date.toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: BERGEN_TIME_ZONE,
  });
}

const ESTIMATED_CALLS_FIELDS = `
  expectedDepartureTime
  aimedDepartureTime
  realtime
  cancellation
  quay {
    publicCode
  }
  destinationDisplay {
    frontText
  }
  serviceJourney {
    line {
      publicCode
      transportMode
      authority {
        id
        name
      }
    }
  }
`;

/** Same reasoning as Oslo's board-horizon fix (docs/jim-brief-oslo-board-horizon.md): cap
 * departures per line+destination combo independently rather than splitting one shared pool,
 * so a low-frequency direction isn't starved by a high-frequency one at the same stop. Bergen
 * has at most 4 directions per stop (2 lines x 2 directions), well under Oslo's busiest hubs,
 * so these defaults are generous rather than tuned against a live capture. */
const DEFAULT_NUMBER_OF_DEPARTURES = 80;
const DEFAULT_NUMBER_OF_DEPARTURES_PER_LINE_AND_DESTINATION = 8;
const DEFAULT_TIME_RANGE_SECONDS = 5400;

function buildStopPlaceQuery(stopPlaceId, options) {
  const {
    numberOfDepartures,
    numberOfDeparturesPerLineAndDestinationDisplay,
    timeRange,
  } = options;
  return {
    query: `query BergenStationBoard($id: String!, $n: Int!, $perLine: Int!, $timeRange: Int!) {
      stopPlace(id: $id) {
        id
        name
        estimatedCalls(
          numberOfDepartures: $n
          numberOfDeparturesPerLineAndDestinationDisplay: $perLine
          timeRange: $timeRange
          arrivalDeparture: departures
        ) {
          ${ESTIMATED_CALLS_FIELDS}
        }
      }
    }`,
    variables: {
      id: stopPlaceId,
      n: numberOfDepartures,
      perLine: numberOfDeparturesPerLineAndDestinationDisplay,
      timeRange,
    },
  };
}

async function fetchEnturStopPlace(stopPlaceId, options) {
  const response = await fetch(ENTUR_JOURNEY_PLANNER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "ET-Client-Name": ENTUR_CLIENT_NAME,
    },
    body: JSON.stringify(buildStopPlaceQuery(stopPlaceId, options)),
  });
  if (!response.ok) {
    throw new Error(`Entur journey-planner ${response.status} for stopPlace ${stopPlaceId}`);
  }
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(`Entur journey-planner error: ${payload.errors.map((e) => e.message).join("; ")}`);
  }
  return payload.data?.stopPlace ?? null;
}

/**
 * @param {object} call Raw estimatedCalls[i]
 * @returns {"1"|"2"|null} line code, or null if out of v1 scope (bus, other operator/line).
 */
function classifyLine(call) {
  const authorityId = call?.serviceJourney?.line?.authority?.id ?? "";
  const mode = String(call?.serviceJourney?.line?.transportMode ?? "").toLowerCase();
  const code = String(call?.serviceJourney?.line?.publicCode ?? "").trim();

  if (mode === "tram" && authorityId === SKY_AUTHORITY && ALLOWED_LINE_CODES.has(code)) {
    return code;
  }
  return null;
}

function mapEstimatedCall(call, lineCode, stationName) {
  const expected = call.expectedDepartureTime ? new Date(call.expectedDepartureTime) : null;
  const aimed = call.aimedDepartureTime ? new Date(call.aimedDepartureTime) : expected;
  if (!expected || Number.isNaN(expected.getTime())) {
    return null;
  }
  const scheduledDate = aimed && !Number.isNaN(aimed.getTime()) ? aimed : expected;

  const rawDestination = stripViaSuffix(call.destinationDisplay?.frontText ?? "");

  // Self-terminus guard (direction-model-memo.md): a call whose resolved terminus is the
  // station being viewed is the train arriving, not a valid outbound direction — never
  // synthesize "1 + Byparken" at Byparken itself, nor "2 + Kaigaten" at Kaigaten itself.
  const resolved = resolveTerminus(rawDestination, lineCode);
  if (resolved && isTerminatingAtStation(resolved, stationName)) {
    return null;
  }

  const cancelled = call.cancellation === true;

  return {
    liveDeparture: expected.toISOString(),
    scheduledDeparture: scheduledDate.toISOString(),
    displayTime: formatClock(expected),
    scheduledDisplayTime: formatClock(scheduledDate),
    destination: mapLineTerminusDestination(rawDestination, lineCode),
    routeShortName: lineCode,
    mapGroup: "Bybanen",
    operator: "Skyss",
    platform: call.quay?.publicCode ?? undefined,
    cancelled,
    status: cancelled ? "Cancelled" : undefined,
    realtime: call.realtime === true,
  };
}

/**
 * @param {string} stationIdOrName Catalog name, alias, or Entur NSR StopPlace id
 * @param {{ now?: Date, numberOfDepartures?: number, numberOfDeparturesPerLineAndDestinationDisplay?: number, timeRange?: number }} [options]
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopPlaceId = catalogEntry?.stationGtfsId ?? String(stationIdOrName);
  if (!stopPlaceId) {
    throw new Error(`Unknown Bergen station: ${stationIdOrName}`);
  }

  const stationName = catalogEntry?.name ?? stationIdOrName;
  const enturOptions = {
    numberOfDepartures: options.numberOfDepartures ?? DEFAULT_NUMBER_OF_DEPARTURES,
    numberOfDeparturesPerLineAndDestinationDisplay:
      options.numberOfDeparturesPerLineAndDestinationDisplay ??
      DEFAULT_NUMBER_OF_DEPARTURES_PER_LINE_AND_DESTINATION,
    timeRange: options.timeRange ?? DEFAULT_TIME_RANGE_SECONDS,
  };

  const stopPlace = await fetchEnturStopPlace(stopPlaceId, enturOptions);
  if (!stopPlace) {
    throw new Error(`Unknown Bergen station: ${stationIdOrName}`);
  }

  const now = options.now ?? new Date();
  const rawCalls = stopPlace.estimatedCalls ?? [];
  const trips = estimatedCallsToTrips(rawCalls, stationName, now);

  return {
    stationName,
    lastUpdate: new Date().toISOString(),
    trips,
    /** Entur estimatedCalls already blends scheduled + realtime. */
    realtime: true,
  };
}

/**
 * Shared transform from raw Entur `estimatedCalls` to board trips — used by
 * `fetchStationBoard` and exported so QA can exercise the exact production pipeline
 * (classify -> map (incl. self-terminus guard) -> drop cancelled/past -> sort) against a
 * fixture without mocking `fetch`.
 * @param {object[]} rawCalls
 * @param {string} stationName Station being viewed (for the self-terminus guard)
 * @param {Date} [now]
 */
export function estimatedCallsToTrips(rawCalls, stationName, now = new Date()) {
  const nowMs = now.getTime();
  return (rawCalls ?? [])
    .map((call) => {
      const lineCode = classifyLine(call);
      return lineCode ? mapEstimatedCall(call, lineCode, stationName) : null;
    })
    .filter(Boolean)
    .filter((trip) => !trip.cancelled)
    .filter((trip) => new Date(trip.liveDeparture).getTime() >= nowMs - 60_000)
    .sort((a, b) => new Date(a.liveDeparture) - new Date(b.liveDeparture));
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

export { BERGEN_HUB, resolveCatalogEntry, classifyLine };
