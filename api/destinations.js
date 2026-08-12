import { fetchTripsForStation, uniqueDestinations } from "../lib/train-times.js";
import { staticDirectionsForStation } from "../lib/cities/perth/static-directions.js";
import { applyCors } from "../lib/api-cors.js";
import { checkRateLimit } from "../lib/api-rate-limit.js";
import { resolveAllowedStation } from "../lib/api-station-allowlist.js";
import { assertCityLive } from "../lib/providers/registry.js";

export default async function handler(req, res) {
  if (applyCors(req, res)) {
    return;
  }

  if (!checkRateLimit(req, res)) {
    return;
  }

  const cityGate = assertCityLive(req.query?.city ?? "perth");
  if (!cityGate.ok) {
    res.status(cityGate.status).json({
      error: cityGate.error,
      city: cityGate.city,
      integration: cityGate.integration,
    });
    return;
  }

  const station = resolveAllowedStation(req.query?.station);

  if (!station) {
    res.status(400).json({ error: req.query?.station ? "Unknown station" : "Missing station parameter" });
    return;
  }

  try {
    const { trips } = await fetchTripsForStation(station);
    let destinations = uniqueDestinations(trips);
    let source = "live";
    if (!destinations.length) {
      destinations = staticDirectionsForStation(station);
      source = destinations.length ? "static-line-map" : "empty";
    }
    res.status(200).json({ destinations, source });
  } catch (error) {
    console.error(error);
    const fallback = staticDirectionsForStation(station);
    if (fallback.length) {
      res.status(200).json({ destinations: fallback, source: "static-line-map" });
      return;
    }
    res.status(500).json({ error: error.message ?? "Failed to fetch destinations" });
  }
}
