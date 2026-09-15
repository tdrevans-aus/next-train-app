#!/usr/bin/env node
/**
 * Downloads the three raw TfNSW GTFS static zips (sydneytrains, metro, nswtrains) that
 * scripts/trim-sydney-gtfs.py merges and trims into qa/fixtures/sydney/gtfs, using the same
 * authenticated gateway URLs and header as lib/providers/sydney.js at runtime — so the
 * production Blob snapshot is trimmed from the same source the live board reads, not the
 * separate "full_greater_sydney_gtfs_static_0.zip" public bulk dataset used before Round 2
 * (docs/jim-brief-sydney-intercity-fill.md). Requires TFNSW_API_KEY.
 *
 * Usage: node scripts/download-sydney-gtfs-zips.mjs <output-dir>
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "../lib/load-env-local.js";
import { tfnswAuthHeaders, readTfnswApiKey } from "../lib/providers/gtfs/auth.js";
import {
  SYDNEY_TRAINS_STATIC_URL,
  SYDNEY_METRO_STATIC_URL,
  SYDNEY_NSWTRAINS_STATIC_URL,
} from "../lib/providers/sydney.js";

loadEnvLocal();

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = process.argv[2] || join(ROOT, ".gtfs-download-tmp");
mkdirSync(outDir, { recursive: true });

const headers = tfnswAuthHeaders(readTfnswApiKey());

async function download(url, outPath) {
  const start = Date.now();
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`${url} -> HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outPath, buf);
  console.log(`${outPath} (${(buf.length / 1024 / 1024).toFixed(2)} MB, ${Date.now() - start}ms)`);
  return buf.length;
}

const sydneytrainsPath = join(outDir, "sydneytrains-static.zip");
const metroPath = join(outDir, "metro-static.zip");
const nswtrainsPath = join(outDir, "nswtrains-static.zip");

await download(SYDNEY_TRAINS_STATIC_URL, sydneytrainsPath);
await download(SYDNEY_METRO_STATIC_URL, metroPath);
await download(SYDNEY_NSWTRAINS_STATIC_URL, nswtrainsPath);

console.log("\nNext: python scripts/trim-sydney-gtfs.py " +
  `"${sydneytrainsPath}" "${metroPath}" "${nswtrainsPath}"`);
