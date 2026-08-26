import { applyCors } from "../lib/api-cors.js";
import { checkRateLimit } from "../lib/api-rate-limit.js";
import { assertCityLive } from "../lib/providers/registry.js";
import {
  isMultiCity,
  resolveMultiCityStation,
  getMultiCityDirections,
  getMultiCityNextTrain,
  findNearestStation,
} from "../lib/cities/live-city-api.js";
import {
  fetchTripsForStation,
} from "../lib/train-times.js";
import { resolveDirectionsForStation } from "../lib/cities/perth/static-directions.js";
import {
  getNextTrainData as getPerthNextTrainData,
  DEFAULT_LEAVE_BEFORE_MINUTES,
  DEFAULT_REFRESH_SECONDS,
} from "../lib/train-times-server.js";
import { resolveAllowedStation } from "../lib/api-station-allowlist.js";

export default async function handler(req, res) {
  if (applyCors(req, res)) {
    return;
  }

  if (!checkRateLimit(req, res)) {
    return;
  }

  try {
    const city = req.query?.city ?? "perth";
  let stationName = req.query?.station;
  const lat = req.query?.lat ? parseFloat(req.query.lat) : null;
  const lng = req.query?.lng ? parseFloat(req.query.lng) : null;

  if (!stationName && lat != null && lng != null) {
    stationName = findNearestStation(city, lat, lng);
  }

  if (!stationName) {
    res.status(400).json({ error: "Missing required parameter: station (or lat/lng)" });
    return;
  }

  const cityGate = assertCityLive(city);
  if (!cityGate.ok) {
    res.status(cityGate.status).json({
      error: cityGate.error,
      city: cityGate.city,
      integration: cityGate.integration,
    });
    return;
  }

  const now = new Date();
  const leaveBeforeMinutes = Number(req.query?.leaveBefore) || DEFAULT_LEAVE_BEFORE_MINUTES;
  const refreshSeconds = Number(req.query?.refresh) || DEFAULT_REFRESH_SECONDS;

  if (isMultiCity(city)) {
    const station = resolveMultiCityStation(city, stationName);
    if (!station) {
      res.status(400).json({ error: "Unknown station" });
      return;
    }

    const { directions } = await getMultiCityDirections(city, station);
    const now = new Date();

    // Optimize: if it's London TfL, we can fetch all arrivals in one go.
    if (city === "uk-london-tfl") {
      try {
        const { fetchStopBoard } = await import("../lib/providers/uk-tfl.js");
        const { buildNextTrainResponse, pickUpcomingProviderTrips } = await import("../lib/train-times-core.js");
        const { getCity } = await import("../lib/providers/registry.js");
        const cityData = getCity("uk-london-tfl");
        
        const board = await fetchStopBoard(station);
        const entries = directions.map(direction => {
          const upcoming = pickUpcomingProviderTrips(board.trips || [], direction, now);
          const data = buildNextTrainResponse({
            station: board.stationName,
            destination: direction,
            destinationLabel: direction,
            leaveBeforeMinutes,
            refreshSeconds,
            now,
            lastUpdated: board.lastUpdate ? new Date(board.lastUpdate) : now,
            upcomingTrips: upcoming,
            timeZone: cityData.timeZone,
          });
          return { direction, data };
        });

        res.status(200).json({
          stationName: station,
          lastUpdated: board.lastUpdate || now.toISOString(),
          entries: entries.filter(e => e.data?.next),
        });
        return;
      } catch (error) {
        console.error(`[api/board] TfL optimized fetch failed:`, error.message);
        // Fall back to sequential if optimization fails
      }
    }

    const entries = await Promise.all(
      directions.map(async (direction) => {
          try {
            const data = await getMultiCityNextTrain(city, {
              station,
              destination: direction,
              leaveBeforeMinutes,
              refreshSeconds,
              now,
            });
            return { direction, data };
          } catch (error) {
            console.warn(`[api/board] Failed to fetch ${direction} for ${station}:`, error.message);
            return null;
          }
        })
      );

      res.status(200).json({
        stationName: station,
        lastUpdated: now.toISOString(),
        entries: entries.filter(Boolean),
      });
      return;
    }

    // Perth
    const station = resolveAllowedStation(stationName);
    if (!station) {
      res.status(400).json({ error: "Unknown station" });
      return;
    }

    const { trips, lastUpdate } = await fetchTripsForStation(station);
    const { directions } = resolveDirectionsForStation(station, trips);
    const { buildNextTrainResponse, pickUpcomingTrips, parseLiveBoardTimestamp } = await import("../lib/train-times-core.js");

    const entries = directions.map((direction) => {
      const upcoming = pickUpcomingTrips(trips, direction, now);
      const data = buildNextTrainResponse({
        station,
        destination: direction,
        destinationLabel: direction,
        leaveBeforeMinutes,
        refreshSeconds,
        skipTrains: 0,
        now,
        lastUpdated: parseLiveBoardTimestamp(lastUpdate),
        upcomingTrips: upcoming,
        timeZone: "Australia/Perth",
      });
      return { direction, data };
    });

    res.status(200).json({
      stationName: station,
      lastUpdated: lastUpdate || now.toISOString(),
      entries: entries.filter(e => e.data?.next),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to fetch station board" });
  }
}
