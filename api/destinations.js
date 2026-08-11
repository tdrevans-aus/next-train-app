import { fetchTripsForStation, uniqueDestinations } from "../lib/train-times.js";
import { applyCors } from "../lib/api-cors.js";
import { checkRateLimit } from "../lib/api-rate-limit.js";
import { resolveAllowedStation } from "../lib/api-station-allowlist.js";

export default async function handler(req, res) {
  if (applyCors(req, res)) {
    return;
  }

  if (!checkRateLimit(req, res)) {
    return;
  }

  const station = resolveAllowedStation(req.query?.station);

  if (!station) {
    res.status(400).json({ error: req.query?.station ? "Unknown station" : "Missing station parameter" });
    return;
  }

  try {
    const { trips } = await fetchTripsForStation(station);
    res.status(200).json({ destinations: uniqueDestinations(trips) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to fetch destinations" });
  }
}
