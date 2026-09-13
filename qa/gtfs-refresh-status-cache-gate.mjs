/**
 * Proves, by construction and without any network access, both halves of
 * the refresh-status caching fix (docs/jim-brief-refresh-status-cache-and-
 * memory.md, 13 Sep 2026):
 *
 * Observed 12 Sep right after the first complete run: gtfs/_refresh-status.json
 * came back from Blob's CDN with Cache-Control: public, max-age=2592000 (30
 * days) - a read 45s after the final write still returned the mid-run
 * snapshot. qa/prod-sweep.mjs reads that record with a plain fetch, so the
 * hourly monitor could report a month-old run as healthy while the cron had
 * actually been failing for weeks.
 *
 * Two checks, matching the brief's two acceptance criteria:
 *  1. Writer: runGtfsRefresh() -> writeRefreshStatus() -> putImpl for the
 *     status blob path passes `cacheControlMaxAge: 60` (a real
 *     writeRefreshStatus() call, not a reimplementation - only putImpl is
 *     stubbed, the same pattern qa/gtfs-refresh-partial-status-gate.mjs
 *     uses).
 *  2. Reader: qa/prod-sweep.mjs's checkRefreshStatus() fetches with a
 *     cache-busting query parameter (a value that changes call to call) and
 *     `cache: "no-store"`, so it never trusts an edge copy regardless of
 *     what the writer sends.
 *
 * Usage: node qa/gtfs-refresh-status-cache-gate.mjs
 */
import assert from "assert";
import { runGtfsRefresh, STANDALONE, SHARED_GROUPS } from "../lib/gtfs-refresh.js";
import { REFRESH_STATUS_BLOB_PATH } from "../lib/providers/gtfs/blob-fixtures.js";
import { gtfsRefreshStatusBlobUrl } from "../lib/providers/gtfs/blob-fixtures.js";
import { getCity } from "../lib/providers/registry.js";
import { checkRefreshStatus } from "./prod-sweep.mjs";

function fail(message) {
  console.error(`gtfs-refresh-status-cache-gate: FAIL - ${message}`);
  process.exitCode = 1;
}

async function withSyntheticLists({ standalone = [], sharedGroups = [] }, run) {
  const savedStandalone = STANDALONE.splice(0, STANDALONE.length);
  const savedSharedGroups = SHARED_GROUPS.splice(0, SHARED_GROUPS.length);
  try {
    STANDALONE.push(...standalone);
    SHARED_GROUPS.push(...sharedGroups);
    return await run();
  } finally {
    STANDALONE.splice(0, STANDALONE.length, ...savedStandalone);
    SHARED_GROUPS.splice(0, SHARED_GROUPS.length, ...savedSharedGroups);
  }
}

function makeFetchStub() {
  return async (url, opts = {}) => {
    const method = opts.method || "GET";
    if (String(url).endsWith(".json")) {
      return { ok: false }; // "no manifest on record" -> treated as changed
    }
    if (method === "HEAD") {
      return { ok: true, headers: { get: () => null } };
    }
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) };
  };
}

const okBuild = () => ({
  output: { "calendar.txt": "service_id,start_date,end_date\nWD,20260101,20261231\n" },
  summary: { synthetic: true },
});

// --- Check 1: writer sends cacheControlMaxAge for the status record ------
async function checkWriter() {
  const originalFetch = global.fetch;
  try {
    const city = "canberra";
    assert.strictEqual(getCity(city)?.status, "live", `test assumes ${city} is live in the registry`);

    global.fetch = makeFetchStub();
    const statusPutCalls = [];
    const putImpl = async (pathname, body, options) => {
      if (pathname === REFRESH_STATUS_BLOB_PATH) {
        statusPutCalls.push(options);
      }
      return { url: `https://example.invalid/${pathname}` };
    };

    await withSyntheticLists(
      { standalone: [{ city, url: "http://qa-writer.invalid/gtfs.zip", build: okBuild }] },
      () => runGtfsRefresh({ putImpl })
    );

    if (statusPutCalls.length === 0) {
      fail("writer: expected at least one putImpl call for the status blob path, got none");
      return;
    }
    for (const options of statusPutCalls) {
      assert.strictEqual(
        options?.cacheControlMaxAge,
        60,
        `writer: expected cacheControlMaxAge: 60 on every status-blob put, got ${JSON.stringify(options)}`
      );
    }
    console.log("gtfs-refresh-status-cache-gate: writer OK - cacheControlMaxAge: 60 reaches put for every status write");
  } catch (error) {
    fail(`unexpected error during writer check: ${error?.stack || error}`);
  } finally {
    global.fetch = originalFetch;
  }
}

// --- Check 2: reader cache-busts and disables the local fetch cache ------
async function checkReader() {
  const originalFetch = global.fetch;
  try {
    const seenUrls = [];
    const baseUrl = gtfsRefreshStatusBlobUrl();
    global.fetch = async (url, opts = {}) => {
      seenUrls.push({ url: String(url), opts });
      return {
        ok: true,
        json: async () => ({ ok: true, ranAt: new Date().toISOString(), succeeded: 1, results: [] }),
      };
    };

    await checkRefreshStatus();
    // A short delay, not a poll loop: Date.now()-based cache-busting can
    // collide within the same millisecond on two back-to-back calls, which
    // would make a false failure look like a real one below.
    await new Promise((resolve) => setTimeout(resolve, 5));
    await checkRefreshStatus();

    if (seenUrls.length < 2) {
      fail(`reader: expected checkRefreshStatus() to call fetch, got ${seenUrls.length} calls`);
      return;
    }
    for (const { url, opts } of seenUrls) {
      if (!url.startsWith(`${baseUrl}?`)) {
        fail(`reader: expected a cache-busting query parameter on ${baseUrl}, got ${url}`);
      }
      if (opts?.cache !== "no-store") {
        fail(`reader: expected { cache: "no-store" } on the fetch call, got ${JSON.stringify(opts)}`);
      }
    }
    if (seenUrls[0].url === seenUrls[1].url) {
      fail(`reader: expected the cache-busting parameter to differ call to call, got the same URL twice: ${seenUrls[0].url}`);
    }
    console.log("gtfs-refresh-status-cache-gate: reader OK - fetch cache-busts with a query param and cache: \"no-store\"");
  } catch (error) {
    fail(`unexpected error during reader check: ${error?.stack || error}`);
  } finally {
    global.fetch = originalFetch;
  }
}

await checkWriter();
await checkReader();

if (process.exitCode !== 1) {
  console.log("gtfs-refresh-status-cache-gate: PASS");
}
