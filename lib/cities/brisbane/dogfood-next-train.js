/**
 * Brisbane next-train payload for production Vercel and local dev.
 */
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  BRISBANE_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/brisbane.js";
import { loadGtfsStaticFromDirectory } from "../../providers/gtfs/static-cache.js";
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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXTURE_DIR = join(ROOT, "qa/fixtures/brisbane/gtfs");

let coordsCache = null;

function coordsFromFixture() {
  if (coordsCache) {
    return coordsCache;
  }
  const staticData = loadGtfsStaticFromDirectory(FIXTURE_DIR, {
    railOnly: true,
    timeZone: BRISBANE_TIME_ZONE,
  });
  const map = {};
  for (const station of listCatalogStations()) {
    let latSum = 0;
    let lngSum = 0;
    let count = 0;
    for (const stopId of station.stopIds ?? []) {
      const stop = staticData.stopsById.get(stopId);
      const lat = Number(stop?.stop_lat);
      const lng = Number(stop?.stop_lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        continue;
      }
      latSum += lat;
      lngSum += lng;
      count += 1;
    }
    if (count) {
      map[station.name] = { lat: latSum / count, lng: lngSum / count };
    }
  }
  coordsCache = map;
  return coordsCache;
}

export function listBrisbaneDogfoodStations() {
  const coords = coordsFromFixture();
  return listCatalogStations().map((station) => ({
    name: station.name,
    lat: coords[station.name]?.lat ?? null,
    lng: coords[station.name]?.lng ?? null,
  }));
}

function catalogEntry(station) {
  const needle = String(station || "").trim().toLowerCase();
  return (
    listCatalogStations().find((entry) => entry.name.toLowerCase() === needle) ?? null
  );
}

function boardFromFixture(station) {
  const entry = catalogEntry(station);
  const stopIds = entry?.stopIds ?? [];
  const staticData = loadGtfsStaticFromDirectory(FIXTURE_DIR, {
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
