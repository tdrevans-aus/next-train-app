/**
 * Write public/coverage-notes/{city}.json from lib/cities/{city}/coverage.json, for every
 * live region — bundled into the APK the same way scripts/write-city-directions.mjs bundles
 * direction chips (docs/jim-brief-help-coverage-notes.md). public/coverage-notes/ is
 * gitignored; the app reads the bundled file first and /api/coverage-notes second.
 *
 * Usage: node scripts/write-coverage-notes.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { CITIES } from "../lib/providers/registry.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function writeCoverageNotes({ cities, outDir, log = (line) => console.log(line), warn = (line) => console.warn(line) }) {
  mkdirSync(outDir, { recursive: true });
  const failedCities = [];

  for (const city of cities) {
    const srcFile = join(ROOT, "lib", "cities", city, "coverage.json");
    if (!existsSync(srcFile)) {
      failedCities.push(city);
      warn(`write-coverage-notes: ${city} skipped — no lib/cities/${city}/coverage.json`);
      continue;
    }
    let json;
    try {
      json = JSON.parse(readFileSync(srcFile, "utf8"));
    } catch (err) {
      failedCities.push(city);
      warn(`write-coverage-notes: ${city} skipped — invalid JSON (${err.message})`);
      continue;
    }
    const outFile = join(outDir, `${city}.json`);
    writeFileSync(outFile, `${JSON.stringify(json, null, 2)}\n`);
    log(`write-coverage-notes: ${city} written`);
  }

  return { failedCities };
}

async function main() {
  const OUT_DIR = join(ROOT, "public", "coverage-notes");
  const liveIds = CITIES.filter((city) => city.status === "live").map((city) => city.id);

  const { failedCities } = writeCoverageNotes({ cities: liveIds, outDir: OUT_DIR });

  if (failedCities.length > 0) {
    console.warn(
      `write-coverage-notes: ${failedCities.length} city(ies) produced no file: ${failedCities.join(", ")}`
    );
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main();
}
