/**
 * Snapshot manifest: a small `gtfs/<city>.json` alongside each `gtfs/<city>.zip`
 * in the Blob store, recording what upstream version the published zip came
 * from — so the daily refresh can probe (HEAD only, no download) and skip
 * republishing an unchanged feed.
 *
 * @see docs/jim-brief-gtfs-snapshot-freshness.md
 */
import { GTFS_FIXTURE_BLOB_BASE } from "./blob-fixtures.js";
import { parseCsv } from "./csv.js";

export function gtfsManifestBlobUrl(city) {
  return `${GTFS_FIXTURE_BLOB_BASE}/${city}.json`;
}

/**
 * @param {{ upstreamUrl: string, etag?: string|null, lastModified?: string|null,
 *   feedVersion?: string|null, publishedAt?: string, trimOptions?: object|null,
 *   calendarRange?: { minDate: string|null, maxDate: string|null } }} fields
 */
export function buildManifest({
  upstreamUrl,
  etag = null,
  lastModified = null,
  feedVersion = null,
  publishedAt = new Date().toISOString(),
  trimOptions = null,
  calendarRange = null,
}) {
  return {
    upstreamUrl,
    etag,
    lastModified,
    feedVersion,
    publishedAt,
    trimOptions,
    calendarRange: calendarRange ?? { minDate: null, maxDate: null },
  };
}

/**
 * Read a city's manifest from Blob. Returns null if it doesn't exist yet
 * (first-ever publish) or the fetch fails for any other reason — a probe
 * with no manifest is treated as "changed" by probeUpstreamChanged, which
 * is the safe default (publish once, then start skipping).
 */
export async function readManifest(city, { fetchImpl = fetch } = {}) {
  const url = gtfsManifestBlobUrl(city);
  try {
    const response = await fetchImpl(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * @param {string} city
 * @param {object} manifest
 * @param {{ putImpl: (pathname: string, body: string, opts: object) => Promise<{url:string}> }} options
 *   putImpl is required, not merely injectable: this file lives under lib/,
 *   which cannot resolve a bare `import "@vercel/blob"` in Vercel's deployed
 *   bundle even though the identical package resolves fine from a file
 *   under api/ (confirmed on a real preview deploy,
 *   docs/jim-brief-gtfs-refresh-cron-crash.md, 11 Sep 2026 — this file's
 *   previous `putImpl ?? (await import("@vercel/blob"))` fallback was
 *   exactly the kind of latent lib/ bare-import that class of bug is made
 *   of, even though nothing called writeManifest without putImpl in
 *   production). Every caller (api/health.js's cron branch,
 *   scripts/gtfs-refresh-large-feeds.mjs on GitHub Actions — a plain Node
 *   process, unaffected by the Vercel bundling issue but importing
 *   "@vercel/blob" itself either way — and qa/gtfs-snapshot-freshness.mjs's
 *   stub) passes it explicitly. See qa/lib-bare-import-gate.mjs, which
 *   fails the build if a bare npm import reappears in a lib/ file reachable
 *   from api/.
 * @returns {Promise<{url:string}>}
 */
export async function writeManifest(city, manifest, { putImpl }) {
  const blob = await putImpl(`gtfs/${city}.json`, JSON.stringify(manifest, null, 2), {
    access: "public",
    allowOverwrite: true,
    contentType: "application/json",
  });
  return blob;
}

/**
 * HEAD the upstream zip and compare with the manifest's recorded ETag /
 * Last-Modified. Never downloads the body — that's the whole point (option
 * 4 in the brief: "an unchanged feed costs one HEAD").
 *
 * @param {{ url: string, headers?: Record<string,string>, manifest: object|null, fetchImpl?: typeof fetch }} params
 * @returns {Promise<{ changed: boolean, etag: string|null, lastModified: string|null, reason: string }>}
 */
export async function probeUpstreamChanged({ url, headers = {}, manifest, fetchImpl = fetch }) {
  const response = await fetchImpl(url, { method: "HEAD", headers });
  const etag = response.headers?.get?.("etag") || null;
  const lastModified = response.headers?.get?.("last-modified") || null;

  if (!manifest) {
    return { changed: true, etag, lastModified, reason: "no manifest on record" };
  }
  if (etag && manifest.etag) {
    return etag === manifest.etag
      ? { changed: false, etag, lastModified, reason: `unchanged (etag ${etag})` }
      : { changed: true, etag, lastModified, reason: `changed (etag ${manifest.etag} -> ${etag})` };
  }
  if (lastModified && manifest.lastModified) {
    return lastModified === manifest.lastModified
      ? { changed: false, etag, lastModified, reason: `unchanged (last-modified ${lastModified})` }
      : {
          changed: true,
          etag,
          lastModified,
          reason: `changed (last-modified ${manifest.lastModified} -> ${lastModified})`,
        };
  }
  // Upstream gave us nothing comparable (no ETag/Last-Modified at all, or the
  // manifest predates one) — treat as changed rather than skip forever.
  return { changed: true, etag, lastModified, reason: "no comparable etag/last-modified" };
}

/**
 * Derive the calendar date range (YYYYMMDD strings) a trimmed output covers,
 * from the same `{ "calendar.txt": csvText, "calendar_dates.txt": csvText }`
 * shape scripts/trim-*-gtfs.mjs's buildTrimmedFiles() returns. Used to stamp
 * the manifest so a future brief could cross-check without re-parsing the zip.
 */
export function calendarRangeFromTrimmedOutput(output) {
  let minDate = null;
  let maxDate = null;

  const calendarText = output?.["calendar.txt"];
  if (calendarText) {
    for (const row of parseCsv(calendarText)) {
      if (row.start_date && (minDate === null || row.start_date < minDate)) {
        minDate = row.start_date;
      }
      if (row.end_date && (maxDate === null || row.end_date > maxDate)) {
        maxDate = row.end_date;
      }
    }
  }

  const calendarDatesText = output?.["calendar_dates.txt"];
  if (calendarDatesText) {
    for (const row of parseCsv(calendarDatesText)) {
      if (!row.date) {
        continue;
      }
      if (minDate === null || row.date < minDate) {
        minDate = row.date;
      }
      if (maxDate === null || row.date > maxDate) {
        maxDate = row.date;
      }
    }
  }

  return { minDate, maxDate };
}
