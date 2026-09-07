import { put } from "@vercel/blob";
import { zipSync } from "./vendor/fflate.mjs";
import { buildTrimmedFiles as buildBrisbane } from "../scripts/trim-brisbane-gtfs.mjs";
import { buildTrimmedFiles as buildGoldCoast } from "../scripts/trim-gold-coast-gtfs.mjs";
import { buildTrimmedFiles as buildCanberra } from "../scripts/trim-canberra-gtfs.mjs";
import { buildTrimmedFiles as buildNewcastle } from "../scripts/trim-newcastle-gtfs.mjs";
import { buildTrimmedFiles as buildVancouver } from "../scripts/trim-vancouver-gtfs.mjs";
import { readTfnswApiKey, tfnswAuthHeaders } from "./providers/gtfs/auth.js";
import {
  readManifest,
  writeManifest,
  buildManifest,
  probeUpstreamChanged,
  calendarRangeFromTrimmedOutput,
} from "./providers/gtfs/snapshot-manifest.js";
import { isCityStale } from "./providers/gtfs/staleness-registry.js";

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
 * Change-driven (docs/jim-brief-gtfs-snapshot-freshness.md, 7 Sep 2026): each
 * city is HEAD-probed against its recorded manifest (gtfs/<city>.json in the
 * same Blob store) before anything is downloaded. An unchanged ETag/
 * Last-Modified costs one HEAD and nothing else; only a changed upstream (or
 * a city the runtime staleness check has flagged, via the shared staleness
 * registry) triggers the download-trim-publish path and a manifest update.
 * This replaces the old daily-download-regardless behavior — cost is now
 * proportional to how often agencies actually revise timetables, not to
 * city count.
 *
 * NOT covered here (each for its own reason):
 * - sydney: trim is Python-only, no live-fetch path — manual only.
 * - auckland, wellington: their providers fetch live directly
 *   (loadGtfsStatic({ url: DEFAULT_URL })), no Blob dependency at
 *   runtime — their committed qa/fixtures/*.gtfs is a build-time input
 *   for line-map generation, unrelated to this pipeline.
 * - amsterdam, rotterdam: share one upstream OVapi feed (gtfs-nl.zip,
 *   ~230MB, nationwide multi-modal) that OOMs this Hobby-plan function
 *   even processing ONE of the two cities alone (confirmed live via a
 *   real "instance was killed because it ran out of available memory"
 *   error - not a pairing problem, decompressing/parsing that feed at
 *   all needs more memory than Hobby gives a function, even at the max
 *   configurable `memory`). Refreshed instead by
 *   scripts/gtfs-refresh-large-feeds.mjs on a GitHub Actions schedule
 *   (.github/workflows/gtfs-refresh.yml), which reuses the same
 *   probe-then-publish logic (refreshCityIfChanged, exported below) with
 *   more memory headroom than a Vercel Hobby function.
 *
 * @see docs/jim-brief-gtfs-data-platform-scale.md
 * @see docs/jim-brief-gtfs-snapshot-freshness.md
 */

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

/**
 * Groups of cities that share one upstream zip - only kept for pairs whose
 * shared source is small enough that holding it (plus two decompression
 * passes) doesn't risk the same OOM as the OVapi pair above. SEQ_GTFS.zip
 * is ~32MB, confirmed working in production at default memory.
 */
const SHARED_GROUPS = [
  {
    sharedUrl: "https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip",
    headers: {},
    cities: [
      { city: "brisbane", build: buildBrisbane },
      { city: "gold-coast", build: buildGoldCoast },
    ],
  },
];

export async function downloadZip(url, extraHeaders = {}) {
  const response = await fetch(url, {
    headers: { Accept: "application/zip, application/octet-stream, */*", ...extraHeaders },
  });
  if (!response.ok) {
    throw new Error(`download failed (${response.status}) for ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function publishCity(city, output) {
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

/**
 * Change-driven refresh for one city: HEAD-probe the upstream against the
 * recorded manifest and skip the download entirely when nothing changed —
 * unless the runtime staleness check has flagged this city (isCityStale),
 * in which case a refresh is forced regardless of what the probe says,
 * because a stale-but-unchanged snapshot means the *join*, not the
 * upstream, is what's wrong, and a fresh publish plus a new manifest is the
 * closest thing to a fix available here.
 *
 * Exported so scripts/gtfs-refresh-large-feeds.mjs (GitHub Actions, large
 * NL feed) reuses the identical probe-then-publish logic rather than a
 * second implementation of it.
 *
 * @param {{ city: string, url: string, headers?: Record<string,string>, build: (buffer: Buffer) => { output: object, summary?: object } }} params
 */
export async function refreshCityIfChanged({ city, url, headers = {}, build }) {
  const manifest = await readManifest(city);
  const probe = await probeUpstreamChanged({ url, headers, manifest });
  const forced = !probe.changed && isCityStale(city);

  if (!probe.changed && !forced) {
    return { city, ok: true, changed: false, reason: probe.reason };
  }

  const buffer = await downloadZip(url, headers);
  const { output, summary } = build(buffer);
  const published = await publishCity(city, output);
  await writeManifest(
    city,
    buildManifest({
      upstreamUrl: url,
      etag: probe.etag,
      lastModified: probe.lastModified,
      calendarRange: calendarRangeFromTrimmedOutput(output),
    })
  );
  return {
    city,
    ok: true,
    changed: true,
    summary,
    ...published,
    reason: forced ? `${probe.reason} (forced: city flagged stale)` : probe.reason,
  };
}

export async function runGtfsRefresh() {
  const results = [];

  for (const entry of STANDALONE) {
    try {
      const headers = entry.headers ? entry.headers() : {};
      const result = await refreshCityIfChanged({ city: entry.city, url: entry.url, headers, build: entry.build });
      console.log(`gtfs-refresh: ${entry.city}: ${result.reason}`);
      results.push({ ok: true, ...result });
    } catch (error) {
      results.push({ city: entry.city, ok: false, error: String(error?.message || error) });
    }
  }

  for (const group of SHARED_GROUPS) {
    // Probe once per city in the group (they share the upstream URL, but
    // each has its own manifest) — a download only happens if at least one
    // city in the group needs one, and it's shared across the group.
    let sharedBuffer = null;
    let downloadError = null;
    for (const entry of group.cities) {
      try {
        const manifest = await readManifest(entry.city);
        const probe = await probeUpstreamChanged({ url: group.sharedUrl, headers: group.headers, manifest });
        const forced = !probe.changed && isCityStale(entry.city);
        if (!probe.changed && !forced) {
          console.log(`gtfs-refresh: ${entry.city}: ${probe.reason}`);
          results.push({ city: entry.city, ok: true, changed: false, reason: probe.reason });
          continue;
        }
        if (!sharedBuffer && !downloadError) {
          try {
            sharedBuffer = await downloadZip(group.sharedUrl, group.headers);
          } catch (error) {
            downloadError = error;
          }
        }
        if (downloadError) {
          throw downloadError;
        }
        const { output, summary } = entry.build(sharedBuffer);
        const published = await publishCity(entry.city, output);
        await writeManifest(
          entry.city,
          buildManifest({
            upstreamUrl: group.sharedUrl,
            etag: probe.etag,
            lastModified: probe.lastModified,
            calendarRange: calendarRangeFromTrimmedOutput(output),
          })
        );
        const reason = forced ? `${probe.reason} (forced: city flagged stale)` : probe.reason;
        console.log(`gtfs-refresh: ${entry.city}: ${reason}`);
        results.push({ city: entry.city, ok: true, changed: true, summary, ...published, reason });
      } catch (error) {
        results.push({ city: entry.city, ok: false, error: String(error?.message || error) });
      }
    }
  }

  const failed = results.filter((r) => !r.ok);
  return {
    ok: failed.length !== results.length,
    ranAt: new Date().toISOString(),
    skipped: [
      "sydney (python-only trim)",
      "auckland (live-fetch, no blob)",
      "wellington (live-fetch, no blob)",
      "amsterdam (OVapi feed OOMs this function - refreshed by scripts/gtfs-refresh-large-feeds.mjs on GitHub Actions instead)",
      "rotterdam (OVapi feed OOMs this function - refreshed by scripts/gtfs-refresh-large-feeds.mjs on GitHub Actions instead)",
    ],
    succeeded: results.filter((r) => r.ok).length,
    failed: failed.length,
    results,
  };
}
