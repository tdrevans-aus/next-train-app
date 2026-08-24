import {
  DEFAULT_LEAVE_BEFORE_MINUTES,
  DEFAULT_REFRESH_SECONDS,
  getNextTrainData,
} from "../lib/train-times-server.js";
import { applyCors } from "../lib/api-cors.js";
import { checkRateLimit } from "../lib/api-rate-limit.js";
import { resolveAllowedStation } from "../lib/api-station-allowlist.js";
import { assertCityLive } from "../lib/providers/registry.js";
import {
  getMultiCityNextTrain,
  isMultiCity,
  resolveMultiCityStation,
} from "../lib/cities/live-city-api.js";

function readParams(query = {}) {
  const station = query.station;
  const direction = query.direction ?? query.destination;
  const leaveBefore = query.leaveBefore ?? query.leaveBeforeMinutes;
  const refresh = query.refresh ?? query.refreshSeconds;
  const skipTrains = query.skipTrains ?? query.skip;
  const city = query.city ?? "perth";

  if (!station || !direction) {
    return null;
  }

  return {
    city,
    station,
    destination: direction,
    destinationLabel: direction,
    leaveBeforeMinutes: Number(leaveBefore) || DEFAULT_LEAVE_BEFORE_MINUTES,
    refreshSeconds: Number(refresh) || DEFAULT_REFRESH_SECONDS,
    skipTrains: Math.max(0, Math.floor(Number(skipTrains) || 0)),
  };
}

export default async function handler(req, res) {
  if (applyCors(req, res)) {
    return;
  }

  if (!checkRateLimit(req, res)) {
    return;
  }

  const config = readParams(req.query);

  if (!config) {
    res.status(400).json({ error: "Missing required parameters: station, direction" });
    return;
  }

  const cityGate = assertCityLive(config.city);
  if (!cityGate.ok) {
    res.status(cityGate.status).json({
      error: cityGate.error,
      city: cityGate.city,
      integration: cityGate.integration,
    });
    return;
  }

  if (isMultiCity(config.city)) {
    const station = resolveMultiCityStation(config.city, config.station);
    if (!station) {
      res.status(400).json({ error: "Unknown station" });
      return;
    }
    try {
      const data = await getMultiCityNextTrain(config.city, { ...config, station });
      res.status(200).json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message ?? "Failed to fetch train times" });
    }
    return;
  }

  const station = resolveAllowedStation(config.station);
  if (!station) {
    res.status(400).json({ error: "Unknown station" });
    return;
  }

  config.station = station;

  try {
    const data = await getNextTrainData(config);
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to fetch train times" });
  }
}
