/**
 * Oslo T-bane (Ruter / Sporveien T-banen) + Vy regional/commuter rail + Flytoget airport
 * express — Entur Journey Planner v3 GraphQL.
 * Adapter ready; city remains `planned` (not live) — see docs/oslo-d1/jim-handoff.md.
 * assertCityLive("oslo") must still fail until Tim flips the registry entry.
 *
 * Live path: POST https://api.entur.io/journey-planner/v3/graphql
 * `stopPlace(id) { estimatedCalls }`, header `ET-Client-Name: next-train-app` (NLOD open
 * service; identifying header, not a secret key — no env var needed). Confirmed live
 * 30 Aug 2026 against real Entur NSR stop places.
 *
 * v1 scope (docs/oslo-d1/hazard-pack.md, direction-model-memo.md, oracle-clash-report.md
 * Board eligibility section — Tim's decision 30 Aug 2026): T-bane lines 1-5 at all 101
 * stations, PLUS Vy regional/commuter rail (RE10, RE11, R12, R13, R14, R21, L1, L2) and
 * Flytoget (FLY1, FLY2), both scoped ONLY to Jernbanetorget and Nationaltheatret. No trikk,
 * no bus, no ferry, no passenger line 6, no Fornebubanen, no other Vy/NSB service anywhere
 * else in the network.
 *
 * doNotGroup (three-way at Jernbanetorget and Nationaltheatret): T-bane / Vy / Flytoget are
 * separate mapGroup sections, never merged into one "trains" list. Confirmed live that this
 * is also a *physical* NSR StopPlace split at Jernbanetorget: the T-bane cluster
 * (NSR:StopPlace:58366, "Jernbanetorget") and the rail cluster (NSR:StopPlace:59872,
 * "Oslo S", Vy + Flytoget) are two different stopPlace ids that both print as
 * "Jernbanetorget" in this catalog — the adapter queries both and merges. Nationaltheatret
 * needs only one query: its single NSR StopPlace (58404) already returns metro + rail
 * (Vy/Flytoget) calls together, confirmed live.
 *
 * Entur distinguishes operators by `serviceJourney.line.authority.id`, not by the GTFS
 * `datasetId` query param the D1 pack names for the static feeds (RUT / VY / FLY) — those
 * datasetIds are the right filter for static GTFS or SIRI `?datasetId=`, but the Journey
 * Planner v3 GraphQL surface used here returns `authority.id` per line
 * (`RUT:Authority:RUT`, `VYG:Authority:VY`, `FLT:Authority:FLT`), confirmed live 30 Aug
 * 2026 — this adapter filters on authority + transportMode + publicCode allow-lists, which
 * is the equivalent filter for this API shape.
 *
 * R21 flag (direction-model-memo.md): R21's own official terminus is Oslo S. A call whose
 * destination is in the Oslo S name family ("Oslo S" / "Oslo Sentralstasjon") is the train
 * arriving/terminating there, not a valid outbound direction — same self-referential-hub
 * case already solved for T-bane at Stortinget. These calls are dropped from the board
 * entirely rather than shown as a false "R21 + Oslo S" direction chip.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  OSLO_HUB,
  OSLO_TIME_ZONE,
  foldKey,
  isForbiddenCollapseName,
  isOsloSNameFamily,
  mapOsloDestination,
} from "../cities/oslo/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const OSLO_TIMEZONE = OSLO_TIME_ZONE;
export const ENTUR_JOURNEY_PLANNER_URL = "https://api.entur.io/journey-planner/v3/graphql";
export const ENTUR_CLIENT_NAME = "next-train-app";

/** T-bane passenger codes (docs/oslo-d1/hazard-pack.md H5 — no line 6). */
const ALLOWED_TBANE_CODES = new Set(["1", "2", "3", "4", "5"]);
/** Vy lines in scope at Jernbanetorget/Nationaltheatret only (jim-handoff.md). */
const ALLOWED_VY_CODES = new Set(["RE10", "RE11", "R12", "R13", "R14", "R21", "L1", "L2"]);
/** Flytoget lines in scope at Jernbanetorget/Nationaltheatret only. */
const ALLOWED_FLYTOGET_CODES = new Set(["FLY1", "FLY2"]);

const RUT_AUTHORITY = "RUT:Authority:RUT";
const VY_AUTHORITY = "VYG:Authority:VY";
const FLYTOGET_AUTHORITY = "FLT:Authority:FLT";

const catalogPath = join(__dirname, "../cities/oslo/stations.json");
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
    if (entry.stationGtfsId === raw || entry.railStationGtfsId === raw) {
      return entry;
    }
  }
  return null;
}

function formatClock(date) {
  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: OSLO_TIME_ZONE,
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

function buildStopPlaceQuery(stopPlaceId, numberOfDepartures) {
  return {
    query: `query OsloStationBoard($id: String!, $n: Int!) {
      stopPlace(id: $id) {
        id
        name
        estimatedCalls(numberOfDepartures: $n, arrivalDeparture: departures) {
          ${ESTIMATED_CALLS_FIELDS}
        }
      }
    }`,
    variables: { id: stopPlaceId, n: numberOfDepartures },
  };
}

async function fetchEnturStopPlace(stopPlaceId, numberOfDepartures) {
  const response = await fetch(ENTUR_JOURNEY_PLANNER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "ET-Client-Name": ENTUR_CLIENT_NAME,
    },
    body: JSON.stringify(buildStopPlaceQuery(stopPlaceId, numberOfDepartures)),
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
 * @returns {"T-bane"|"Vy"|"Flytoget"|null} mapGroup, or null if out of v1 scope (bus, tram,
 *   other rail operators/lines, e.g. R22 Rakkestad seen live at Oslo S but not in scope).
 */
function classifyMapGroup(call) {
  const authorityId = call?.serviceJourney?.line?.authority?.id ?? "";
  const mode = String(call?.serviceJourney?.line?.transportMode ?? "").toLowerCase();
  const code = String(call?.serviceJourney?.line?.publicCode ?? "").trim().toUpperCase();

  if (mode === "metro" && authorityId === RUT_AUTHORITY && ALLOWED_TBANE_CODES.has(code)) {
    return "T-bane";
  }
  if (mode === "rail" && authorityId === VY_AUTHORITY && ALLOWED_VY_CODES.has(code)) {
    return "Vy";
  }
  if (mode === "rail" && authorityId === FLYTOGET_AUTHORITY && ALLOWED_FLYTOGET_CODES.has(code)) {
    return "Flytoget";
  }
  return null;
}

function mapEstimatedCall(call, mapGroup) {
  const expected = call.expectedDepartureTime ? new Date(call.expectedDepartureTime) : null;
  const aimed = call.aimedDepartureTime ? new Date(call.aimedDepartureTime) : expected;
  if (!expected || Number.isNaN(expected.getTime())) {
    return null;
  }
  const scheduledDate = aimed && !Number.isNaN(aimed.getTime()) ? aimed : expected;

  const routeShortName = String(call.serviceJourney?.line?.publicCode ?? "").trim().toUpperCase();
  const rawDestination = call.destinationDisplay?.frontText ?? "";

  // R21 flag: a call whose destination is the Oslo S / Jernbanetorget name family is the
  // train arriving/terminating there, not a valid outbound direction. Drop it rather than
  // synthesize a false "R21 + Oslo S" chip (docs/oslo-d1/direction-model-memo.md).
  if (mapGroup !== "T-bane" && isOsloSNameFamily(rawDestination.split(/\s+via\s+/i)[0])) {
    return null;
  }

  const cancelled = call.cancellation === true;

  return {
    liveDeparture: expected.toISOString(),
    scheduledDeparture: scheduledDate.toISOString(),
    displayTime: formatClock(expected),
    scheduledDisplayTime: formatClock(scheduledDate),
    destination: mapOsloDestination(rawDestination, routeShortName),
    routeShortName,
    mapGroup,
    operator: mapGroup === "T-bane" ? "Ruter" : mapGroup,
    platform: call.quay?.publicCode ?? undefined,
    cancelled,
    status: cancelled ? "Cancelled" : undefined,
    realtime: call.realtime === true,
  };
}

/**
 * @param {string} stationIdOrName Catalog name, alias, or Entur NSR StopPlace id
 * @param {{ now?: Date, numberOfDepartures?: number }} [options]
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const primaryId = catalogEntry?.stationGtfsId ?? String(stationIdOrName);
  if (!primaryId) {
    throw new Error(`Unknown Oslo station: ${stationIdOrName}`);
  }

  const stationName = catalogEntry?.name ?? stationIdOrName;
  const numberOfDepartures = options.numberOfDepartures ?? 15;

  // Jernbanetorget's T-bane cluster (58366) and its Vy/Flytoget rail cluster (Oslo S,
  // 59872) are two physically separate NSR StopPlace ids that both print as
  // "Jernbanetorget" here — query both and merge. Nationaltheatret needs only the one id;
  // its single stopPlace already returns metro + rail together.
  const stopPlaceIds = [primaryId];
  if (catalogEntry?.railStationGtfsId && catalogEntry.railStationGtfsId !== primaryId) {
    stopPlaceIds.push(catalogEntry.railStationGtfsId);
  }

  const stopPlaces = await Promise.all(
    stopPlaceIds.map((id) => fetchEnturStopPlace(id, numberOfDepartures))
  );
  if (!stopPlaces.some(Boolean)) {
    throw new Error(`Unknown Oslo station: ${stationIdOrName}`);
  }

  const now = options.now ?? new Date();
  const nowMs = now.getTime();

  const trips = stopPlaces
    .filter(Boolean)
    .flatMap((stopPlace) => stopPlace.estimatedCalls ?? [])
    .map((call) => {
      const mapGroup = classifyMapGroup(call);
      return mapGroup ? mapEstimatedCall(call, mapGroup) : null;
    })
    .filter(Boolean)
    .filter((trip) => !trip.cancelled)
    .filter((trip) => new Date(trip.liveDeparture).getTime() >= nowMs - 60_000)
    .sort((a, b) => new Date(a.liveDeparture) - new Date(b.liveDeparture));

  return {
    stationName,
    lastUpdate: new Date().toISOString(),
    trips,
    /** Entur estimatedCalls already blends scheduled + realtime. */
    realtime: true,
  };
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

export { OSLO_HUB, resolveCatalogEntry, classifyMapGroup };
