/**
 * Sydney next-train payload for production Vercel and local dev.
 */
import {
  SYDNEY_TIME_ZONE,
  fetchStationBoard,
  fetchStationBoardFromSnapshot,
  listCatalogStations,
  loadSydneyRealtime,
} from "../../providers/sydney.js";
import { loadGtfsStatic } from "../../providers/gtfs/static-cache.js";
import { gtfsFixtureBlobUrl } from "../../providers/gtfs/blob-fixtures.js";
import { buildBoardForStops } from "../../providers/gtfs/board.js";
import { indexTripUpdates } from "../../providers/gtfs/realtime.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";
import {
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "./marketing-directions.js";

function toProviderTrip(trip, destination) {
  return {
    scheduledDeparture: trip.scheduledDeparture ?? trip.scheduledDeparture,
    liveDeparture: trip.liveDeparture ?? trip.liveDeparture,
    scheduledDisplayTime: trip.scheduledDisplayTime ?? trip.scheduledDisplayTime,
    displayTime: trip.displayTime ?? trip.displayTime,
    platform: trip.platform ?? trip.platform ?? "",
    destination,
    cars: trip.cars,
    routeShortName: trip.routeShortName ?? trip.route_short_name,
    // Honest freshness (contract.js): false = timetable row, shown as "Scheduled".
    realtime: trip.realtime,
  };
}

function fixtureStatic() {
  return loadGtfsStatic({
    url: gtfsFixtureBlobUrl("sydney"),
    routeTypes: ["2", "401"],
    timeZone: SYDNEY_TIME_ZONE,
  });
}

function catalogEntry(station) {
  const needle = String(station || "")
    .trim()
    .toLowerCase()
    .replace(/\s+station$/i, "")
    .replace(/\s+stn$/i, "");
  return (
    listCatalogStations().find((entry) => {
      if (String(entry.name || "").trim().toLowerCase() === needle) {
        return true;
      }
      return (entry.aliases ?? []).some(
        (alias) => String(alias).trim().toLowerCase() === needle
      );
    }) ?? null
  );
}

async function boardFromFixture(station) {
  const entry = catalogEntry(station);
  const stopIds = entry?.stopIds ?? [];
  const staticData = await fixtureStatic();
  const trips = buildBoardForStops({
    // Without a cityId a stale snapshot is reported as "unknown city" and never reaches the staleness
    // registry, so /api/health stayed green while every Sydney board 500'd (docs/jim-brief-sydney-fixture-expired.md).
    cityId: "sydney",
    stopIds,
    staticData,
    realtimeIndex: indexTripUpdates([]),
    timeZone: SYDNEY_TIME_ZONE,
  }).map((trip) => ({ ...trip, realtime: false }));
  return {
    stationName: entry?.name ?? station,
    lastUpdate: new Date().toISOString(),
    trips,
    source: "sydney-gtfs-fixture",
  };
}

async function loadSydneyBoard(station) {
  if (process.env.VERCEL === "1") {
    // Trimmed blob snapshot + live TfNSW TripUpdates. No timetable fallback: if every RT feed
    // fails this throws FeedUnavailableError (-> 503), the way Melbourne refuses (live-only).
    // The RT fetch is deliberately NOT started alongside the static load. Decoding the snapshot is
    // synchronous CPU work that blocks the event loop for seconds on a Vercel function; a TfNSW
    // fetch in flight meanwhile has its 4 s AbortSignal.timeout fire the moment the loop resumes,
    // so all three feeds "timed out" on every cold board even though TfNSW answers in ~1.2 s from
    // the US (docs/jim-brief-sydney-rt-timeout-us-region.md). The join fetches RT once the loop is free.
    const staticData = await fixtureStatic();
    return {
      ...(await fetchStationBoardFromSnapshot(station, { staticData })),
      source: "sydney-gtfs-snapshot+rt",
    };
  }
  try {
    return await fetchStationBoard(station);
  } catch (error) {
    const message = String(error?.message || error);
    if (/401|403|TFNSW_API_KEY|not set/i.test(message)) {
      console.warn(`Sydney live board unavailable (${message}) — using local GTFS fixture (timetable rows, realtime:false)`);
      return boardFromFixture(station);
    }
    throw error;
  }
}

/**
 * One board computation (static join + realtime fetch) per station per ~15 s, shared by every
 * direction. api/board.js fans out one getSydneyDogfoodNextTrain() per direction and each used to
 * redo the full buildBoardForStops (and, off Vercel, three TfNSW realtime fetches) — at Central
 * that was 10x the work (cold 12 s, warm 3 s locally). The in-flight promise is cached so
 * concurrent directions share a single computation; failures are evicted immediately.
 */
const BOARD_REUSE_MS = 15_000;
const boardCache = new Map();
function sharedSydneyBoard(station, now) {
  const key = String(station ?? "").trim().toLowerCase();
  const hit = boardCache.get(key);
  const t = now instanceof Date ? now.getTime() : Date.now();
  if (hit && Math.abs(t - hit.at) < BOARD_REUSE_MS) {
    return hit.promise;
  }
  const promise = loadSydneyBoard(station);
  boardCache.set(key, { at: t, promise });
  promise.catch(() => {
    if (boardCache.get(key)?.promise === promise) boardCache.delete(key);
  });
  if (boardCache.size > 64) boardCache.delete(boardCache.keys().next().value);
  return promise;
}

export function listSydneyDogfoodStations() {
  // Jim brief: server must not parse large GTFS fixtures for city-stations.
  // Coords belong on stations.json.
  return listCatalogStations().map((station) => ({
    name: station.name,
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

export async function getSydneyDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const board = await sharedSydneyBoard(station, now);
  const matching = (board.trips ?? []).filter((trip) => tripMatchesMarketingChip(trip, destination));
  const remapped = matching.map((trip) => toProviderTrip(trip, destination));
  const upcoming = pickUpcomingProviderTrips(remapped, destination, now);

  return buildNextTrainResponse({
    station: board.stationName ?? board.stationName,
    destination,
    destinationLabel: destinationLabel ?? destination,
    leaveBeforeMinutes,
    refreshSeconds,
    skipTrains,
    now,
    lastUpdated: board.lastUpdate
      ? new Date(board.lastUpdate)
      : board.lastUpdate
        ? new Date(board.lastUpdate)
        : now,
    upcomingTrips: upcoming,
    timeZone: SYDNEY_TIME_ZONE,
  });
}

export function getSydneyDogfoodDirections(station) {
  return {
    directions: marketingLabelsForStation(station),
    source: "sydney-marketing-ends",
  };
}
