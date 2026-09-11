/**
 * Proves, by construction and without any network access, that
 * lib/gtfs-refresh.js's runGtfsRefresh() never attempts to refresh a city
 * whose registry status isn't "live" — for both STANDALONE and every
 * SHARED_GROUPS entry.
 *
 * Added docs/jim-brief-356-rebase-and-retired-city-oom.md, 11 Sep 2026:
 * Vancouver was retired from registry.js on 7 Sep 2026 but stayed in
 * STANDALONE for 3 more days, the prime suspect for an 11 Sep OOM kill
 * mid-refresh (downloading TransLink's full GTFS for a city nobody can
 * select). The fix makes the refresh list's membership derive from the
 * registry's "live" status rather than needing a second, hand-maintained
 * edit every time a city is retired — the same class of defect Mark
 * already caught once on this PR for the blob-integrity gate's coverage
 * list (docs/jim-brief-newcastle-fixups.md).
 *
 * Two checks:
 *  1. Sanity: every city currently declared in STANDALONE/SHARED_GROUPS is
 *     registry-status "live" today (so nothing is silently being skipped
 *     right now that shouldn't be).
 *  2. Construction proof: temporarily replace STANDALONE/SHARED_GROUPS with
 *     synthetic entries for two genuinely-retired registry ids (vancouver,
 *     amsterdam), each pointing at a URL that must never be fetched and a
 *     build() that throws if ever called, then run runGtfsRefresh() with
 *     global fetch and putImpl both wired to throw the instant they're
 *     invoked. If the skip logic works, neither ever fires, no bytes are
 *     downloaded, and both cities show up in the report's `skipped` list.
 *     Restores the real arrays immediately after, whether or not it passes.
 *
 * Usage: node qa/gtfs-refresh-retired-city-skip-gate.mjs
 */
import assert from "assert";
import { runGtfsRefresh, STANDALONE, SHARED_GROUPS } from "../lib/gtfs-refresh.js";
import { getCity } from "../lib/providers/registry.js";

function fail(message) {
  console.error(`gtfs-refresh-retired-city-skip-gate: FAIL - ${message}`);
  process.exitCode = 1;
}

// --- Check 1: today's static lists are all registry-status "live" -------
const declaredCities = [
  ...STANDALONE.map((e) => e.city),
  ...SHARED_GROUPS.flatMap((g) => g.cities.map((e) => e.city)),
];

if (declaredCities.length === 0) {
  fail("STANDALONE + SHARED_GROUPS declared zero cities - refresh loop looks broken, not just narrow");
}

for (const city of declaredCities) {
  const status = getCity(city)?.status;
  if (status !== "live") {
    fail(
      `${city} is declared in the static refresh lists but registry status is "${status}", not "live" - ` +
        `this is exactly the drift that let Vancouver keep refreshing after retirement`
    );
  }
}

if (declaredCities.includes("vancouver")) {
  fail("vancouver is still declared in STANDALONE/SHARED_GROUPS - it is retired and must not be");
}

// --- Check 2: construction proof, no network, using genuinely-retired ids ---
const savedStandalone = STANDALONE.splice(0, STANDALONE.length);
const savedSharedGroups = SHARED_GROUPS.splice(0, SHARED_GROUPS.length);
const originalFetch = global.fetch;

let restoreOk = true;
try {
  assert.strictEqual(getCity("vancouver")?.status, "retired", "test assumes vancouver is retired in the registry");
  assert.strictEqual(getCity("amsterdam")?.status, "retired", "test assumes amsterdam is retired in the registry");

  STANDALONE.push({
    city: "vancouver",
    url: "http://qa-must-never-be-fetched.invalid/gtfs.zip",
    build: () => {
      throw new Error("build() called for retired city vancouver - skip logic did not fire");
    },
  });
  SHARED_GROUPS.push({
    sharedUrl: "http://qa-must-never-be-fetched.invalid/shared.zip",
    headers: {},
    cities: [
      {
        city: "amsterdam",
        build: () => {
          throw new Error("build() called for retired city amsterdam - skip logic did not fire");
        },
      },
    ],
  });

  let fetchAttempted = null;
  global.fetch = async (url) => {
    fetchAttempted = String(url);
    throw new Error(`network fetch attempted for a retired city: ${url}`);
  };

  // runGtfsRefresh always writes a final refresh-status report via putImpl
  // regardless of what it skipped - that's expected and unrelated to the
  // thing under test, so only fail if putImpl is asked to publish a city
  // zip (gtfs/<city>.zip), which is what a retired-city refresh would do.
  let cityPublishAttempted = null;
  const putImpl = async (pathname, body, opts) => {
    if (/^gtfs\/[^/]+\.zip$/.test(pathname)) {
      cityPublishAttempted = pathname;
      throw new Error(`putImpl invoked to publish a city zip for a retired city: ${pathname}`);
    }
    return { url: `https://example.invalid/${pathname}` };
  };

  const report = await runGtfsRefresh({ putImpl });

  if (fetchAttempted) {
    fail(`a network fetch was attempted for a retired city: ${fetchAttempted}`);
  }
  if (cityPublishAttempted) {
    fail(`putImpl was invoked to publish a retired city's data: ${cityPublishAttempted}`);
  }
  if (report.results.length !== 0) {
    fail(`expected zero results entries for the retired-only synthetic lists, got ${report.results.length}`);
  }
  const skippedVancouver = report.skipped.find((s) => s.startsWith("vancouver ("));
  const skippedAmsterdam = report.skipped.find((s) => s.startsWith("amsterdam ("));
  if (!skippedVancouver || !/retired/.test(skippedVancouver)) {
    fail(`expected report.skipped to record vancouver as retired, got: ${JSON.stringify(report.skipped)}`);
  }
  if (!skippedAmsterdam || !/retired/.test(skippedAmsterdam)) {
    fail(`expected report.skipped to record amsterdam as retired, got: ${JSON.stringify(report.skipped)}`);
  }
} catch (error) {
  restoreOk = false;
  fail(`unexpected error during construction proof: ${error?.stack || error}`);
} finally {
  global.fetch = originalFetch;
  STANDALONE.splice(0, STANDALONE.length, ...savedStandalone);
  SHARED_GROUPS.splice(0, SHARED_GROUPS.length, ...savedSharedGroups);
}

if (process.exitCode) {
  console.error("gtfs-refresh-retired-city-skip-gate: FAIL");
  process.exit(process.exitCode);
} else {
  console.log(
    `gtfs-refresh-retired-city-skip-gate: ok - ${declaredCities.length} declared cities all registry-live; ` +
      `retired-city construction proof confirmed zero network access${restoreOk ? "" : " (after error)"}`
  );
}
