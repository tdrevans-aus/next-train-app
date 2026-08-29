import { put } from "@vercel/blob";
import { zipSync } from "./vendor/fflate.mjs";
import { buildTrimmedFiles as buildAmsterdam } from "../scripts/trim-amsterdam-gtfs.mjs";
import { buildTrimmedFiles as buildRotterdam } from "../scripts/trim-rotterdam-gtfs.mjs";
import { buildTrimmedFiles as buildBrisbane } from "../scripts/trim-brisbane-gtfs.mjs";
import { buildTrimmedFiles as buildGoldCoast } from "../scripts/trim-gold-coast-gtfs.mjs";
import { buildTrimmedFiles as buildCanberra } from "../scripts/trim-canberra-gtfs.mjs";
import { buildTrimmedFiles as buildNewcastle } from "../scripts/trim-newcastle-gtfs.mjs";
import { buildTrimmedFiles as buildVancouver } from "../scripts/trim-vancouver-gtfs.mjs";
import { readTfnswApiKey, tfnswAuthHeaders } from "./providers/gtfs/auth.js";

/**
 * Scheduled refresh: re-fetch each city's upstream GTFS static feed, apply
 * the same route/mode trim + column diet as the corresponding
 * scripts/trim-*-gtfs.mjs tool (statically imported, in-process - no
 * subprocess spawning, no filesystem writes outside /tmp), and publish
 * to the next-train-gtfs Blob store. Replaces the manual "run a script
 * locally, upload by hand" step for the cities whose runtime provider
 * actually reads from Blob (gtfsFixtureBlobUrl).
 *
 * Lives under lib/, not api/, and is invoked from api/health.js rather
 * than its own api/cron/*.js file - the Hobby plan caps a deployment at
 * 12 Serverless Functions and this project is already at that limit, so
 * adding a dedicated function file isn't free. Vercel Cron hits
 * /api/health with an Authorization: Bearer $CRON_SECRET header (which
 * only Vercel's own cron trigger sends), so health.js dispatches into
 * this refresh instead of its normal liveness check when that header
 * matches - no new function, no change to health.js's normal behavior
 * for anyone else calling it.
 *
 * NOT covered here (each for its own reason):
 * - sydney: trim is Python-only, no live-fetch path — manual only.
 * - auckland, wellington: their providers fetch live directly
 *   (loadGtfsStatic({ url: DEFAULT_URL })), no Blob dependency at
 *   runtime — their committed qa/fixtures/*.gtfs is a build-time input
 *   for line-map generation, unrelated to this pipeline.
 *
 * @see docs/jim-brief-gtfs-data-platform-scale.md
 */

/** Cities with no shared upstream source — each fetches its own zip. */
const STANDALONE = [
  { city: "canberra", url: "https://www.transport.act.gov.au/googletransit/google_transit_lr.zip", build: buildCanberra },
  { city: "vancouver", url: "https://gtfs-static.translink.ca/gtfs/google_transit.zip", build: buildVancouver },
  {
    city: "newcastle",
    url: "https://api.transport.nsw.gov.au/v1/gtfs/schedule/lightrail/newcastle",
    build: buildNewcastle,
    headers: () => tfnswAuthHeaders(readTfnswApiKey()),
  },
];

/** Groups of cities that share one upstream zip — fetch once, trim twice. */
const SHARED_GROUPS = [
  {
    sharedUrl: "https://gtfs.ovapi.nl/gtfs-nl.zip",
    headers: { "User-Agent": "next-train", "Accept-Encoding": "gzip" },
    cities: [
      { city: "amsterdam", build: buildAmsterdam },
      { city: "rotterdam", build: buildRotterdam },
    ],
  },
  {
    sharedUrl: "https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip",
    headers: {},
    cities: [
      { city: "brisbane", build: buildBrisbane },
      { city: "gold-coast", build: buildGoldCoast },
    ],
  },
];

async function downloadZip(url, extraHeaders = {}) {
  const response = await fetch(url, {
    headers: { Accept: "application/zip, application/octet-stream, */*", ...extraHeaders },
  });
  if (!response.ok) {
    throw new Error(`download failed (${response.status}) for ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function publishCity(city, output) {
  const files = Object.keys(output);
  const zipInput = {};
  const encoder = new TextEncoder();
  for (const name of files) {
    zipInput[name] = encoder.encode(output[name]);
  }
  const zipped = zipSync(zipInput, { level: 6 });
  const blob = await put(`gtfs/${city}.zip`, Buffer.from(zipped), {
    access: "public",
    allowOverwrite: true,
    contentType: "application/zip",
  });
  return { files: files.length, zippedBytes: zipped.length, url: blob.url };
}

export async function runGtfsRefresh() {
  const results = [];

  for (const entry of STANDALONE) {
    try {
      const buffer = await downloadZip(entry.url, entry.headers ? entry.headers() : {});
      const { output, summary } = entry.build(buffer);
      const published = await publishCity(entry.city, output);
      results.push({ city: entry.city, ok: true, summary, ...published });
    } catch (error) {
      results.push({ city: entry.city, ok: false, error: String(error?.message || error) });
    }
  }

  for (const group of SHARED_GROUPS) {
    let buffer;
    try {
      buffer = await downloadZip(group.sharedUrl, group.headers);
    } catch (error) {
      for (const entry of group.cities) {
        results.push({ city: entry.city, ok: false, error: String(error?.message || error) });
      }
      continue;
    }
    for (const entry of group.cities) {
      try {
        const { output, summary } = entry.build(buffer);
        const published = await publishCity(entry.city, output);
        results.push({ city: entry.city, ok: true, summary, ...published });
      } catch (error) {
        results.push({ city: entry.city, ok: false, error: String(error?.message || error) });
      }
    }
  }

  const failed = results.filter((r) => !r.ok);
  return {
    ok: failed.length !== results.length,
    ranAt: new Date().toISOString(),
    skipped: ["sydney (python-only trim)", "auckland (live-fetch, no blob)", "wellington (live-fetch, no blob)"],
    succeeded: results.filter((r) => r.ok).length,
    failed: failed.length,
    results,
  };
}
