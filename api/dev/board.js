import { applyCors } from "../lib/api-cors.js";
import { checkRateLimit } from "../lib/api-rate-limit.js";
import { isCityProbeAllowed, fetchDevCityBoard } from "../lib/dev-city-board.js";

/**
 * Internal dogfood board for planned cities. Hidden unless ALLOW_CITY_PROBES=1.
 * GET /api/dev/board?city=brisbane&station=Central
 * GET /api/dev/board?city=brisbane&list=1
 */
export default async function handler(req, res) {
  if (applyCors(req, res)) {
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!isCityProbeAllowed()) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (!checkRateLimit(req, res)) {
    return;
  }

  const city = req.query.city ?? "perth";
  const list = req.query.list === "1" || req.query.list === "true";
  const station = req.query.station;

  const result = await fetchDevCityBoard(city, station, { list });
  res.setHeader("Cache-Control", "no-store");
  res.status(result.status).json(result.body);
}
