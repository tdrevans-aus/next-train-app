import { applyCors } from "../lib/api-cors.js";
import { checkRateLimit } from "../lib/api-rate-limit.js";
import { assertCityLive } from "../lib/providers/registry.js";
import { isMultiCity, listMultiCityStations } from "../lib/cities/live-city-api.js";

export default async function handler(req, res) {
  if (applyCors(req, res)) {
    return;
  }

  if (!checkRateLimit(req, res)) {
    return;
  }

  const city = req.query?.city ?? "";
  const cityGate = assertCityLive(city);
  if (!cityGate.ok) {
    res.status(cityGate.status).json({
      error: cityGate.error,
      city: cityGate.city,
      integration: cityGate.integration,
    });
    return;
  }

  if (!isMultiCity(city)) {
    res.status(400).json({ error: "Station catalog only available for live multi-city regions" });
    return;
  }

  const stations = listMultiCityStations(city).map((entry) => ({
    name: entry.name,
    lat: entry.lat ?? null,
    lng: entry.lng ?? null,
    // docs/jim-brief-no-live-feed-stops-out-of-picker.md: carried through as-is
    // (listMultiCityStations already defaults it to true when absent) so
    // every other live city's response is byte-identical apart from this key.
    liveFeed: entry.liveFeed,
  }));

  res.setHeader("Cache-Control", "public, s-maxage=3600");
  res.status(200).json({ city, stations });
}
