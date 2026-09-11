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
import { REFRESH_STATUS_BLOB_PATH } from "./providers/gtfs/blob-fixtures.js";

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
 *
 * NO top-level `import { put } from "@vercel/blob"` here (confirmed root
 * cause, docs/jim-brief-gtfs-refresh-cron-crash.md, 11 Sep 2026): a bare npm
 * import in a file under lib/ resolves to ERR_MODULE_NOT_FOUND in Vercel's
 * deployed bundle even though the identical package is declared and resolves
 * fine from a file under api/, and even via a fully static import chain
 * (confirmed live on a Vercel preview deployment, not just locally - Node
 * resolves node_modules from the repo root locally regardless, which is
 * exactly why this shipped broken and stayed green in every local/CI run).
 * `put` is threaded in as `putImpl` instead - callers under api/ (which CAN
 * resolve "@vercel/blob") import it and pass it down; callers outside Vercel
 * (scripts/gtfs-refresh-large-feeds.mjs on GitHub Actions, tests) import it
 * themselves too, since putImpl is now required, not merely injectable - see
 * qa/lib-bare-import-gate.mjs, which fails the build if a bare npm import
 * reappears in a lib/ file reachable from api/.
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

/**
 * Records the outcome of a runGtfsRefresh() call at a single, non-city-scoped
 * blob path (item 3, docs/jim-brief-gtfs-refresh-cron-crash.md): the daily
 * cron never has its own success/failure surface visible to a human, because
 * it's dispatched from /api/health, which must always return 200 for a
 * healthy platform regardless of whether the *cron branch* succeeded (it's
 * the UptimeRobot liveness check). qa/prod-sweep.mjs reads this file and
 * fails its (non-required, monitoring-only) hourly GitHub Actions run when
 * the recorded run is missing, failed, or too old — visible without ever
 * touching /api/health's response.
 *
 * Best-effort: a failure writing this file is logged, not thrown - it must
 * never turn a real refresh success/failure into a 500 from /api/health.
 *
 * putImpl is required (no dynamic-import fallback) - see publishCity's doc
 * comment below for why a lib/ file must never import "@vercel/blob" itself.
 */
async function writeRefreshStatus(report, { putImpl }) {
  try {
    await putImpl(REFRESH_STATUS_BLOB_PATH, JSON.stringify(report, null, 2), {
      access: "public",
      allowOverwrite: true,
      contentType: "application/json",
    });
  } catch (error) {
    console.error("gtfs-refresh: failed to write refresh status", error);
  }
}

export async function downloadZip(url, extraHeaders = {}) {
  const response = await fetch(url, {
    headers: { Accept: "application/zip, application/octet-stream, */*", ...extraHeaders },
  });
  if (!response.ok) {
    throw new Error(`download failed (${response.status}) for ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * @param {string} city
 * @param {object} output
 * @param {{ putImpl: (pathname: string, body: Buffer, opts: object) => Promise<{url:string}> }} options
 *   putImpl is required (no dynamic-import fallback): this file lives under
 *   lib/, which cannot resolve a bare `import "@vercel/blob"` in Vercel's
 *   deployed bundle - see the file-level note above. Every caller passes it
 *   explicitly: api/health.js's cron branch imports "@vercel/blob" itself
 *   (a file under api/ CAN resolve it) and threads `put` through
 *   runGtfsRefresh; scripts/gtfs-refresh-large-feeds.mjs (GitHub Actions,
 *   plain Node, unaffected by the Vercel bundling issue) imports it too, for
 *   consistency rather than necessity.
 */
export async function publishCity(city, output, { putImpl }) {
  const files = Object.keys(output);
  const zipInput = {};
  const encoder = new TextEncoder();
  for (const name of files) {
    zipInput[name] = encoder.encode(output[name]);
  }
  const zipped = zipSync(zipInput, { level: 6 });
  const blob = await putImpl(`gtfs/${city}.zip`, Buffer.from(zipped), {
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
 * @param {{ city: string, url: string, headers?: Record<string,string>, build: (buffer: Buffer) => { output: object, summary?: object }, putImpl: Function }} params
 *   putImpl - see publishCity's doc comment above.
 */
export async function refreshCityIfChanged({ city, url, headers = {}, build, putImpl }) {
  const manifest = await readManifest(city);
  const probe = await probeUpstreamChanged({ url, headers, manifest });
  const forced = !probe.changed && isCityStale(city);

  if (!probe.changed && !forced) {
    return { city, ok: true, changed: false, reason: probe.reason };
  }

  const buffer = await downloadZip(url, headers);
  const { output, summary } = build(buffer);
  const published = await publishCity(city, output, { putImpl });
  await writeManifest(
    city,
    buildManifest({
      upstreamUrl: url,
      etag: probe.etag,
      lastModified: probe.lastModified,
      calendarRange: calendarRangeFromTrimmedOutput(output),
    }),
    { putImpl }
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

/**
 * @param {{ putImpl?: Function }} [options] - see publishCity's doc comment
 *   above. api/health.js's cron branch imports "@vercel/blob" itself (it can
 *   resolve it; this file cannot) and passes `put` in here.
 */
export async function runGtfsRefresh({ putImpl } = {}) {
  const results = [];

  for (const entry of STANDALONE) {
    try {
      const headers = entry.headers ? entry.headers() : {};
      const result = await refreshCityIfChanged({ city: entry.city, url: entry.url, headers, build: entry.build, putImpl });
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
        const published = await publishCity(entry.city, output, { putImpl });
        await writeManifest(
          entry.city,
          buildManifest({
            upstreamUrl: group.sharedUrl,
            etag: probe.etag,
            lastModified: probe.lastModified,
            calendarRange: calendarRangeFromTrimmedOutput(output),
          }),
          { putImpl }
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
  const report = {
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
  await writeRefreshStatus(report, { putImpl });
  return report;
}
