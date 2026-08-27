/**
 * Write public/city-directions/{city}.json from marketing-direction chips.
 * Phone/web pickers use this when /api/directions is unknown-city on production.
 *
 * Usage: node scripts/write-city-directions.mjs
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  MULTI_CITY_IDS,
  listMultiCityStations,
  getMultiCityDirections,
} from "../lib/cities/live-city-api.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "city-directions");

mkdirSync(OUT_DIR, { recursive: true });

for (const city of MULTI_CITY_IDS) {
  const stations = listMultiCityStations(city);
  const byStation = {};
  for (const row of stations) {
    const name = String(row?.name || "").trim();
    if (!name) {
      continue;
    }
    const pack = await getMultiCityDirections(city, name);
    const directions = Array.isArray(pack?.directions) ? pack.directions.filter(Boolean) : [];
    if (directions.length) {
      byStation[name] = directions;
    }
  }
  const outFile = join(OUT_DIR, `${city}.json`);
  writeFileSync(outFile, `${JSON.stringify(byStation, null, 2)}\n`);
  console.log(
    `write-city-directions: ${city} ${Object.keys(byStation).length}/${stations.length} stations with chips`
  );
}
