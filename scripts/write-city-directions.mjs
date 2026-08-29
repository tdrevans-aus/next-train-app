/**
 * Write public/city-directions/{city}.json from marketing-direction chips.
 * Phone/web pickers use this when /api/directions is unknown-city on production.
 *
 * Usage: node scripts/write-city-directions.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  MULTI_CITY_IDS,
  listMultiCityStations,
  getMultiCityDirections,
} from "../lib/cities/live-city-api.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "city-directions");

/**
 * Adapter-ready cities that are still `planned` (not in MULTI_CITY_IDS).
 * Their chips are bundled ahead of the live flip; the picker never shows them.
 */
const EXTRA_BUNDLED_CITY_IDS = ["goteborg", "stockholm"];

function listBundledStations(city) {
  if (MULTI_CITY_IDS.includes(city)) {
    return listMultiCityStations(city);
  }
  const file = join(ROOT, "lib", "cities", city, "stations.json");
  const raw = JSON.parse(readFileSync(file, "utf8"));
  return Array.isArray(raw.stations) ? raw.stations : [];
}

mkdirSync(OUT_DIR, { recursive: true });

for (const city of [...MULTI_CITY_IDS, ...EXTRA_BUNDLED_CITY_IDS]) {
  const stations = listBundledStations(city);
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
