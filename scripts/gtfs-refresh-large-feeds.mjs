#!/usr/bin/env node
/**
 * Change-driven refresh for the GTFS cities whose upstream feed is too large
 * to decompress/parse inside a Vercel Hobby-plan function (lib/gtfs-refresh.js's
 * doc comment has the confirmed OOM detail). Reuses the same
 * probe/publish/manifest primitives as the Vercel-cron path
 * (lib/gtfs-refresh.js, lib/providers/gtfs/snapshot-manifest.js) — just run
 * somewhere with more memory headroom (GitHub Actions), on its own schedule
 * (.github/workflows/gtfs-refresh.yml).
 *
 * Manifest-driven like the Vercel path: an unchanged upstream ETag/
 * Last-Modified costs one HEAD and no download. Amsterdam and Rotterdam
 * share one upstream OVapi zip (~230MB) — probed once, downloaded once, and
 * only if at least one of the two actually needs it (each still gets its
 * own manifest and its own trim).
 *
 * Requires BLOB_READ_WRITE_TOKEN (repo secret in Actions; .env.local locally).
 * Exits non-zero if any city fails so the Actions run shows red.
 *
 * @see docs/jim-brief-gtfs-snapshot-freshness.md
 */
import { put } from "@vercel/blob";
import { loadEnvLocal } from "../lib/load-env-local.js";
import { downloadZip, publishCity } from "../lib/gtfs-refresh.js";
import {
  readManifest,
  writeManifest,
  buildManifest,
  probeUpstreamChanged,
  calendarRangeFromTrimmedOutput,
} from "../lib/providers/gtfs/snapshot-manifest.js";
import { isCityStale } from "../lib/providers/gtfs/staleness-registry.js";
import { buildTrimmedFiles as buildAmsterdam } from "./trim-amsterdam-gtfs.mjs";
import { buildTrimmedFiles as buildRotterdam } from "./trim-rotterdam-gtfs.mjs";

loadEnvLocal();

const OVAPI_URL = "https://gtfs.ovapi.nl/gtfs-nl.zip";

const CITIES = [
  { city: "amsterdam", build: buildAmsterdam },
  { city: "rotterdam", build: buildRotterdam },
];

async function main() {
  const results = [];
  let sharedBuffer = null;
  let downloadError = null;

  for (const entry of CITIES) {
    try {
      const manifest = await readManifest(entry.city);
      const probe = await probeUpstreamChanged({ url: OVAPI_URL, manifest });
      const forced = !probe.changed && isCityStale(entry.city);

      if (!probe.changed && !forced) {
        console.log(`gtfs-refresh-large-feeds: ${entry.city}: ${probe.reason}`);
        results.push({ city: entry.city, ok: true, changed: false, reason: probe.reason });
        continue;
      }

      if (!sharedBuffer && !downloadError) {
        try {
          console.log(`gtfs-refresh-large-feeds: downloading shared OVapi feed for ${entry.city}…`);
          sharedBuffer = await downloadZip(OVAPI_URL);
        } catch (error) {
          downloadError = error;
        }
      }
      if (downloadError) {
        throw downloadError;
      }

      const { output, summary } = entry.build(sharedBuffer);
      const published = await publishCity(entry.city, output, { putImpl: put });
      await writeManifest(
        entry.city,
        buildManifest({
          upstreamUrl: OVAPI_URL,
          etag: probe.etag,
          lastModified: probe.lastModified,
          calendarRange: calendarRangeFromTrimmedOutput(output),
        }),
        { putImpl: put }
      );
      const reason = forced ? `${probe.reason} (forced: city flagged stale)` : probe.reason;
      console.log(`gtfs-refresh-large-feeds: ${entry.city}: ${reason}`);
      results.push({ city: entry.city, ok: true, changed: true, summary, ...published, reason });
    } catch (error) {
      console.error(`gtfs-refresh-large-feeds: ${entry.city}: FAILED — ${error?.message || error}`);
      results.push({ city: entry.city, ok: false, error: String(error?.message || error) });
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2));
  if (failed.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
