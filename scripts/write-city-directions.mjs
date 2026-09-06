/**
 * Write public/city-directions/{city}.json from marketing-direction chips.
 * Phone/web pickers use this when /api/directions is unknown-city on production.
 *
 * Usage: node scripts/write-city-directions.mjs
 *
 * Resilience (7 Sep 2026, docs/jim-brief-write-city-directions-net-crash.md): a station's
 * board-eligibility-rule provider error (e.g. NET's unconfirmed-GTFS excluded stop) must not
 * abort the whole build. Per-station failures are warned and skipped; the city file is still
 * written from whatever stations succeeded. Only a city where *every* station failed writes
 * nothing and is counted as a failure for the process exit code.
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "../lib/load-env-local.js";
import {
  MULTI_CITY_IDS,
  listMultiCityStations,
  getMultiCityDirections,
} from "../lib/cities/live-city-api.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Adapter-ready cities that are still `planned` (not in MULTI_CITY_IDS).
 * Their chips are bundled ahead of the live flip; the picker never shows them.
 */
const EXTRA_BUNDLED_CITY_IDS = [];

function defaultListBundledStations(city) {
  if (MULTI_CITY_IDS.includes(city)) {
    return listMultiCityStations(city);
  }
  const file = join(ROOT, "lib", "cities", city, "stations.json");
  const raw = JSON.parse(readFileSync(file, "utf8"));
  return Array.isArray(raw.stations) ? raw.stations : [];
}

/**
 * Build direction-chip files for `cities` into `outDir`.
 *
 * @param {object} opts
 * @param {string[]} opts.cities
 * @param {string} opts.outDir
 * @param {(city: string) => Array<{name?: string}>} [opts.listStations]
 * @param {(city: string, name: string) => Promise<{directions?: unknown[]}>} [opts.getDirections]
 * @param {(line: string) => void} [opts.log]
 * @param {(line: string) => void} [opts.warn]
 * @returns {Promise<{failedCities: string[]}>}
 */
export async function writeCityDirections({
  cities,
  outDir,
  listStations = defaultListBundledStations,
  getDirections = getMultiCityDirections,
  log = (line) => console.log(line),
  warn = (line) => console.warn(line),
}) {
  mkdirSync(outDir, { recursive: true });

  const failedCities = [];

  for (const city of cities) {
    const stations = listStations(city);
    const byStation = {};
    let attempted = 0;
    let failed = 0;

    for (const row of stations) {
      const name = String(row?.name || "").trim();
      if (!name) {
        continue;
      }
      attempted += 1;
      let pack;
      try {
        pack = await getDirections(city, name);
      } catch (err) {
        failed += 1;
        const errName = err?.name || "Error";
        const firstLine = String(err?.message || err || "").split("\n")[0];
        warn(`write-city-directions: ${city}/${name} skipped — ${errName}: ${firstLine}`);
        continue;
      }
      const directions = Array.isArray(pack?.directions) ? pack.directions.filter(Boolean) : [];
      if (directions.length) {
        byStation[name] = directions;
      }
    }

    if (attempted > 0 && failed === attempted) {
      failedCities.push(city);
      log(`write-city-directions: ${city} FAILED (0/${attempted} stations)`);
      continue;
    }

    const outFile = join(outDir, `${city}.json`);
    writeFileSync(outFile, `${JSON.stringify(byStation, null, 2)}\n`);
    log(
      `write-city-directions: ${city} ${Object.keys(byStation).length}/${stations.length} stations with chips`
    );
  }

  return { failedCities };
}

async function main() {
  loadEnvLocal();

  const OUT_DIR = join(ROOT, "public", "city-directions");
  const args = process.argv.slice(2);
  const onlyArg = args.find((a) => a.startsWith("--only="));
  const only = onlyArg
    ? onlyArg
        .slice("--only=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  const allCities = [...MULTI_CITY_IDS, ...EXTRA_BUNDLED_CITY_IDS];
  const cities = only ? allCities.filter((c) => only.includes(c)) : allCities;

  const { failedCities } = await writeCityDirections({ cities, outDir: OUT_DIR });

  if (failedCities.length > 0) {
    console.warn(
      `write-city-directions: ${failedCities.length} city(ies) produced no file: ${failedCities.join(", ")}`
    );
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main();
}
