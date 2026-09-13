import { fetchTripsForStation } from "../lib/train-times.js";
import { resolveDirectionsForStation } from "../lib/cities/perth/static-directions.js";
import { applyCors } from "../lib/api-cors.js";
import { checkRateLimit } from "../lib/api-rate-limit.js";
import { resolveAllowedStation } from "../lib/api-station-allowlist.js";
import { assertCityLive } from "../lib/providers/registry.js";
import {
  getMultiCityDirections,
  isMultiCity,
  resolveMultiCityStation,
} from "../lib/cities/live-city-api.js";
import { sendGenericServerError } from "../lib/api-error-response.js";

export default async function handler(req, res) {
  if (applyCors(req, res)) {
    return;
  }

  if (!checkRateLimit(req, res)) {
    return;
  }

  const city = req.query?.city ?? "perth";
  const cityGate = assertCityLive(city);
  if (!cityGate.ok) {
    res.status(cityGate.status).json({
      error: cityGate.error,
      city: cityGate.city,
      integration: cityGate.integration,
    });
    return;
  }

  if (isMultiCity(city)) {
    const station = resolveMultiCityStation(city, req.query?.station);
    if (!station) {
      res.status(400).json({
        error: req.query?.station ? "Unknown station" : "Missing station parameter",
      });
      return;
    }
    try {
      const pack = await getMultiCityDirections(city, station);
      res.status(200).json({ destinations: pack.directions, source: pack.source });
    } catch (error) {
      sendGenericServerError(res, {
        error,
        fallbackMessage: "Failed to load destinations",
        city,
        station,
      });
    }
    return;
  }

  const station = resolveAllowedStation(req.query?.station);

  if (!station) {
    res.status(400).json({ error: req.query?.station ? "Unknown station" : "Missing station parameter" });
    return;
  }

  try {
    const { trips } = await fetchTripsForStation(station);
    const { directions, source } = resolveDirectionsForStation(station, trips);
    res.status(200).json({ destinations: directions, source });
  } catch (error) {
    const fallback = resolveDirectionsForStation(station, []);
    if (fallback.directions.length) {
      console.warn(`[api/destinations] served fallback destinations after fetch failure city=${city} station=${station}:`, error);
      res.status(200).json({ destinations: fallback.directions, source: fallback.source });
      return;
    }
    sendGenericServerError(res, {
      error,
      fallbackMessage: "Failed to fetch destinations",
      city,
      station,
    });
  }
}
