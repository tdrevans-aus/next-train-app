#!/usr/bin/env node
/**
 * Zip a city's qa/fixtures/<city>/gtfs directory and publish it to the
 * next-train-gtfs Vercel Blob store at a stable pathname (allowOverwrite),
 * so loadGtfsStatic({ url }) can fetch it exactly like a real GTFS static zip.
 *
 * @see docs/jim-brief-gtfs-data-platform-scale.md
 *
 * Usage: node scripts/publish-gtfs-fixture-to-blob.mjs <city>
 * Requires BLOB_READ_WRITE_TOKEN in the environment (already in .env.local).
 */
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { put } from "@vercel/blob";
import { zipSync } from "fflate";
import { loadEnvLocal } from "../lib/load-env-local.js";

loadEnvLocal();

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const city = process.argv[2];
if (!city) {
  console.error("Usage: node scripts/publish-gtfs-fixture-to-blob.mjs <city>");
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
