#!/usr/bin/env node
/**
 * Zip a city's qa/fixtures/<city>/gtfs directory and publish it to the
 * next-train-gtfs Vercel Blob store at a stable pathname (allowOverwrite),
 * so loadGtfsStatic({ url }) can fetch it exactly like a real GTFS static zip.
 *
 * @see docs/jim-brief-gtfs-data-platform-scale.md
 *
 * Usage: node scripts/publish-gtfs-fixture-to-blob.mjs <city> [--allow-live]
 * Requires BLOB_READ_WRITE_TOKEN in the environment (already in .env.local).
 *
 * Guardrail (added docs/jim-brief-newcastle-stale-snapshot.md, 10 Sep 2026):
 * this writes to the exact same pathname (gtfs/<city>.zip) the running app
 * reads at runtime via gtfsFixtureBlobUrl(city) — there is no separate
 * "test" blob. Publishing a QA/dogfood fixture for a city whose registry
 * status is already "live" overwrites the real production snapshot with
 * synthetic test data, silently, with no error until riders see a broken
 * board. This is the most likely mechanism behind Newcastle's 10 Sep outage
 * (production blob content was synthetic dogfood trip IDs, not real TfNSW
 * GTFS). Refuses to run against a live city unless --allow-live is passed.
 */
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { put } from "@vercel/blob";
import { zipSync } from "fflate";
import { loadEnvLocal } from "../lib/load-env-local.js";
import { getCity } from "../lib/providers/registry.js";

loadEnvLocal();

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const city = process.argv[2];
const allowLive = process.argv.includes("--allow-live");
if (!city) {
  console.error("Usage: node scripts/publish-gtfs-fixture-to-blob.mjs <city> [--allow-live]");
  process.exit(1);
}

const registryEntry = getCity(city);
if (registryEntry?.status === "live" && !allowLive) {
  console.error(
    `Refusing to publish a QA/dogfood fixture over "${city}" — it is status: "live" in the registry, ` +
      `and this script writes to the exact blob path the live app reads (gtfs/${city}.zip). ` +
      "This would overwrite the production snapshot with test data. " +
      "Pass --allow-live only if you are deliberately republishing this city's real production snapshot " +
      "from a fixture that genuinely contains real upstream data."
  );
  process.exit(1);
}

const gtfsDir = join(ROOT, "qa/fixtures", city, "gtfs");
const files = readdirSync(gtfsDir).filter((name) => name.endsWith(".txt"));
if (!files.length) {
  console.error(`No .txt files found in ${gtfsDir}`);
  process.exit(1);
}

const zipInput = {};
for (const name of files) {
  zipInput[name] = readFileSync(join(gtfsDir, name));
}

const zipped = zipSync(zipInput, { level: 6 });
const pathname = `gtfs/${city}.zip`;

const blob = await put(pathname, Buffer.from(zipped), {
  access: "public",
  allowOverwrite: true,
  contentType: "application/zip",
});

console.log(`Uploaded ${files.length} files (${(zipped.length / 1024 / 1024).toFixed(2)} MB zipped) for ${city}`);
console.log(blob.url);
