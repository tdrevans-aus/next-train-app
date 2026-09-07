import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { applyCors } from "../lib/api-cors.js";
import { checkRateLimit } from "../lib/api-rate-limit.js";
import { assertCityLive } from "../lib/providers/registry.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * "What's covered" rider prose for a live region — docs/jim-brief-help-coverage-notes.md.
 * Same shape as api/city-stations.js: gate on assertCityLive, then serve the file.
 */
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

  const file = join(ROOT, "lib", "cities", cityGate.city.id, "coverage.json");
  let notes;
  try {
    notes = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    res.status(404).json({ error: "No coverage notes for this city yet", city: cityGate.city.id });
    return;
  }

  res.setHeader("Cache-Control", "public, s-maxage=3600");
  res.status(200).json({ region: cityGate.city.id, ...notes });
}
