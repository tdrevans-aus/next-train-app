#!/usr/bin/env node
/**
 * Publish Melbourne's Metropolitan Train (folder 2) and V/Line (folder 1) static GTFS, trimmed by
 * scripts/trim-melbourne-gtfs.mjs from the Transport Victoria statewide zip, to the
 * next-train-gtfs Vercel Blob store at the stable pathnames lib/providers/melbourne.js reads
 * (gtfsFixtureBlobUrl("melbourne") / gtfsFixtureBlobUrl("melbourne-vline")).
 *
 * Usage:
 *   node scripts/publish-melbourne-gtfs-to-blob.mjs <outer-gtfs-zip-path>
 *   node scripts/publish-melbourne-gtfs-to-blob.mjs --download
 *
 * Requires BLOB_READ_WRITE_TOKEN (in .env.local).
 * @see docs/melbourne-d1/gtfs-reconciliation.md
 */
import { put } from "@vercel/blob";
import { zipSync } from "fflate";
import { loadEnvLocal } from "../lib/load-env-local.js";
import { buildMelbourneSnapshots, resolveOuterZipBytes } from "./trim-melbourne-gtfs.mjs";

loadEnvLocal();

async function main() {
  const snapshots = buildMelbourneSnapshots(await resolveOuterZipBytes(process.argv[2]));
  for (const [city, { files, beforeBytes }] of Object.entries(snapshots)) {
    const zipped = zipSync(files, { level: 6 });
    const blob = await put(`gtfs/${city}.zip`, Buffer.from(zipped), {
      access: "public",
      allowOverwrite: true,
      contentType: "application/zip",
    });
    console.log(
      `Published ${city}: ${(beforeBytes / 1024 / 1024).toFixed(2)} MB -> ${(zipped.length / 1024 / 1024).toFixed(2)} MB stripped -> ${blob.url}`
    );
  }
}

main().catch((err) => {
  console.error(err?.stack || err);
  process.exit(1);
});
