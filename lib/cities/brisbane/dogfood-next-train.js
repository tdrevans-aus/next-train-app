/**
 * Brisbane next-train payload for production Vercel and local dev.
 */
import {
  BRISBANE_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/brisbane.js";
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

export function listBrisbaneDogfoodStations() {
  // Jim brief: server must not parse large GTFS fixtures for city-stations.
  // Coords belong on stations.json.
  return listCatalogStations().map((station) => ({
    name: station.name,
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

function catalogEntry(station) {
  const needle = String(station || "").trim().toLowerCase();
  return (
    listCatalogStations().find((entry) => entry.name.toLowerCase() === needle) ?? null
  );
}

async function boardFromFixture(station) {
  const entry = catalogEntry(station);
  const stopIds = entry?.stopIds ?? [];
  const staticData = await loadGtfsStatic({
    url: gtfsFixtureBlobUrl("brisbane"),
    railOnly: true,
    timeZone: BRISBANE_TIME_ZONE,
  });
  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex: indexTripUpdates([]),
    timeZone: BRISBANE_TIME_ZONE,
  });
  return {
    stationName: entry?.name ?? station,
    lastUpdate: new Date().toISOString(),
    trips,
    source: "brisbane-gtfs-fixture",
  };
}

async function loadBrisbaneBoard(station) {
  if (process.env.VERCEL === "1") {
    return boardFromFixture(station);
  }
  return fetchStationBoard(station);
}

export async function getBrisbaneDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const board = await loadBrisbaneBoard(station);
  const matching = (board.trips ?? []).filter((trip) =>
    tripMatchesMarketingChip(trip.destination, destination)
  );
  const remapped = matching.map((trip) => ({ ...trip, destination }));
  const upcoming = pickUpcomingProviderTrips(remapped, destination, now);

  return buildNextTrainResponse({
    station: board.stationName,
    destination,
    destinationLabel: destinationLabel ?? destination,
    leaveBeforeMinutes,
    refreshSeconds,
    skipTrains,
    now,
    lastUpdated: board.lastUpdate ? new Date(board.lastUpdate) : now,
    upcomingTrips: upcoming,
    timeZone: BRISBANE_TIME_ZONE,
  });
}

export function getBrisbaneDogfoodDirections(station) {
  return {
    directions: marketingLabelsForStation(station),
    source: "brisbane-marketing-ends",
  };
}
