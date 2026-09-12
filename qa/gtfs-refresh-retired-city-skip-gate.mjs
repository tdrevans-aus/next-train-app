/**
 * Proves, by construction and without any network access, that
 * lib/gtfs-refresh.js's runGtfsRefresh() never attempts to refresh a city
 * whose registry status isn't "live" — for both STANDALONE and every
 * SHARED_GROUPS entry — AND that it genuinely attempts a live city rather
 * than silently skipping everything.
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
 * Extended docs/jim-brief-356-gate-positive-case.md, 11 Sep 2026: Mark's
 * re-review flagged that the construction proof (originally check 2 below)
 * only ever fed retired synthetic entries and asserted they were not
 * fetched — it would pass identically if the skip logic silently ate EVERY
 * city, live or not. That is exactly the failure this gate exists to catch,
 * and the worst kind: an over-eager skip doesn't error, it just stops a live
 * city refreshing, and nobody notices until its calendar expires. Checks 3
 * and 4 below close that gap by asserting the positive case too.
 *
 * Four checks:
 *  1. Sanity: every city currently declared in STANDALONE/SHARED_GROUPS is
 *     registry-status "live" today (so nothing is silently being skipped
 *     right now that shouldn't be).
 *  2. Retired-only construction proof: temporarily replace STANDALONE/
 *     SHARED_GROUPS with synthetic entries for two genuinely-retired
 *     registry ids (vancouver, amsterdam), each pointing at a URL that must
 *     never be fetched and a build() that throws if ever called, then run
 *     runGtfsRefresh() with global fetch and putImpl both wired to throw the
 *     instant they're invoked. If the skip logic works, neither ever fires,
 *     no bytes are downloaded, and both cities show up in the report's
 *     `skipped` list.
 *  3. Live-city positive proof: temporarily replace STANDALONE with a single
 *     synthetic entry for a genuinely-live registry id (newcastle), with
 *     global fetch and putImpl both wired to RECORD calls (never touching
 *     the network or the blob store — no real URL is ever dialled, both are
 *     in-process stubs) instead of throwing. Asserts the HEAD probe fires,
 *     the "download" fires, build() is invoked, putImpl is called to
 *     publish the city's zip, the city appears in report.results as ok, and
 *     it does NOT appear in report.skipped. This is the check that would
 *     have caught an over-eager skip (e.g. the condition inverted so it
 *     skips everyone) — check 2 alone would not have.
 *  4. Mixed shared-group proof: a single synthetic SHARED_GROUPS entry
 *     containing one genuinely-live city (brisbane) and one genuinely-
 *     retired city (amsterdam) sharing one upstream URL. Asserts the live
 *     city is processed (fetch + putImpl called, recorded in results) while
 *     the retired one is skipped (build() never called, recorded in
 *     skipped) — proving the skip is per-city within a shared group, not
 *     all-or-nothing for the group.
 *  All construction proofs restore the real STANDALONE/SHARED_GROUPS arrays
 *  immediately after, whether or not they pass.
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

/**
 * Splices STANDALONE/SHARED_GROUPS to the given synthetic arrays for the
 * duration of `run()`, restoring the real arrays in a finally block
 * regardless of outcome. Returns whatever `run()` returns.
 */
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

// --- Check 2: construction proof, no network, using genuinely-retired ids ---
{
  const originalFetch = global.fetch;
  try {
    assert.strictEqual(getCity("vancouver")?.status, "retired", "test assumes vancouver is retired in the registry");
    assert.strictEqual(getCity("amsterdam")?.status, "retired", "test assumes amsterdam is retired in the registry");

    await withSyntheticLists(
      {
        standalone: [
          {
            city: "vancouver",
            url: "http://qa-must-never-be-fetched.invalid/gtfs.zip",
            build: () => {
              throw new Error("build() called for retired city vancouver - skip logic did not fire");
            },
          },
        ],
        sharedGroups: [
          {
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
          },
        ],
      },
      async () => {
        let fetchAttempted = null;
        global.fetch = async (url) => {
          fetchAttempted = String(url);
          throw new Error(`network fetch attempted for a retired city: ${url}`);
        };

        // runGtfsRefresh always writes a final refresh-status report via
        // putImpl regardless of what it skipped - that's expected and
        // unrelated to the thing under test, so only fail if putImpl is
        // asked to publish a city zip (gtfs/<city>.zip), which is what a
        // retired-city refresh would do.
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
      }
    );
  } catch (error) {
    fail(`unexpected error during check 2 (retired-only construction proof): ${error?.stack || error}`);
  } finally {
    global.fetch = originalFetch;
  }
}

/**
 * Builds a mock global.fetch that never touches the network: it recognises
 * two call shapes runGtfsRefresh's real code makes (a manifest read, a HEAD
 * probe, and a GET download) purely from the URL/method it's called with,
 * and records every call in `calls` for assertions. No real host is ever
 * contacted - every response is synthesised in-process.
 */
function makeRecordingFetch() {
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    const method = opts.method || "GET";
    calls.push({ url: String(url), method });
    if (String(url).endsWith(".json")) {
      // Simulate "no manifest on record yet" - readManifest treats a
      // non-ok response as null, which probeUpstreamChanged treats as
      // "changed" (the safe default: publish once, then start skipping).
      return { ok: false };
    }
    if (method === "HEAD") {
      return { ok: true, headers: { get: () => null } };
    }
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) };
  };
  return { fetchImpl, calls };
}

function makeRecordingPut() {
  const calls = [];
  const putImpl = async (pathname) => {
    calls.push(pathname);
    return { url: `https://example.invalid/${pathname}` };
  };
  return { putImpl, calls };
}

const syntheticBuild = () => ({
  output: {
    "calendar.txt": "service_id,start_date,end_date\nWD,20260101,20261231\n",
  },
  summary: { synthetic: true },
});

// --- Check 3: live-city positive proof - the gate must have teeth --------
{
  const originalFetch = global.fetch;
  try {
    const liveCityId = "newcastle";
    assert.strictEqual(getCity(liveCityId)?.status, "live", `test assumes ${liveCityId} is live in the registry`);

    const { fetchImpl, calls: fetchCalls } = makeRecordingFetch();
    const { putImpl, calls: putCalls } = makeRecordingPut();
    global.fetch = fetchImpl;

    const entryUrl = "http://qa-synthetic-live-city.invalid/gtfs.zip";

    const report = await withSyntheticLists(
      {
        standalone: [{ city: liveCityId, url: entryUrl, build: syntheticBuild }],
      },
      () => runGtfsRefresh({ putImpl })
    );

    const headProbed = fetchCalls.some((c) => c.url === entryUrl && c.method === "HEAD");
    if (!headProbed) {
      fail(`live city ${liveCityId} was not HEAD-probed - it should have been attempted, not skipped`);
    }
    const downloaded = fetchCalls.some((c) => c.url === entryUrl && c.method === "GET");
    if (!downloaded) {
      fail(`live city ${liveCityId} was not downloaded - it should have been attempted, not skipped`);
    }
    const published = putCalls.includes(`gtfs/${liveCityId}.zip`);
    if (!published) {
      fail(
        `live city ${liveCityId} was never published via putImpl - the skip logic ate a live city ` +
          `(this is the exact failure this check exists to catch)`
      );
    }
    const resultEntry = report.results.find((r) => r.city === liveCityId);
    if (!resultEntry || resultEntry.ok !== true) {
      fail(`expected report.results to contain an ok:true entry for live city ${liveCityId}, got: ${JSON.stringify(report.results)}`);
    }
    const wronglySkipped = report.skipped.some((s) => s.startsWith(`${liveCityId} (`));
    if (wronglySkipped) {
      fail(`live city ${liveCityId} appeared in report.skipped - it should have been refreshed, not skipped`);
    }
  } catch (error) {
    fail(`unexpected error during check 3 (live-city positive proof): ${error?.stack || error}`);
  } finally {
    global.fetch = originalFetch;
  }
}

// --- Check 4: mixed shared group - live processed, retired skipped -------
{
  const originalFetch = global.fetch;
  try {
    const liveCityId = "brisbane";
    const retiredCityId = "amsterdam";
    assert.strictEqual(getCity(liveCityId)?.status, "live", `test assumes ${liveCityId} is live in the registry`);
    assert.strictEqual(getCity(retiredCityId)?.status, "retired", `test assumes ${retiredCityId} is retired in the registry`);

    const { fetchImpl, calls: fetchCalls } = makeRecordingFetch();
    const { putImpl, calls: putCalls } = makeRecordingPut();
    global.fetch = fetchImpl;

    const sharedUrl = "http://qa-synthetic-shared-group.invalid/shared.zip";
    let retiredBuildCalled = false;

    const report = await withSyntheticLists(
      {
        sharedGroups: [
          {
            sharedUrl,
            headers: {},
            cities: [
              { city: liveCityId, build: syntheticBuild },
              {
                city: retiredCityId,
                build: () => {
                  retiredBuildCalled = true;
                  throw new Error(`build() called for retired city ${retiredCityId} in a mixed shared group - skip logic did not fire`);
                },
              },
            ],
          },
        ],
      },
      () => runGtfsRefresh({ putImpl })
    );

    if (retiredBuildCalled) {
      fail(`retired city ${retiredCityId}'s build() was invoked inside a mixed shared group - it should have been skipped`);
    }
    const retiredSkipped = report.skipped.find((s) => s.startsWith(`${retiredCityId} (`));
    if (!retiredSkipped || !/retired/.test(retiredSkipped)) {
      fail(
        `expected ${retiredCityId} to appear in report.skipped as retired even inside a mixed shared group, ` +
          `got: ${JSON.stringify(report.skipped)}`
      );
    }

    const liveDownloaded = fetchCalls.some((c) => c.url === sharedUrl && c.method === "GET");
    if (!liveDownloaded) {
      fail(`live city ${liveCityId}'s shared group was never downloaded - it should have been attempted, not skipped`);
    }
    const livePublished = putCalls.includes(`gtfs/${liveCityId}.zip`);
    if (!livePublished) {
      fail(
        `live city ${liveCityId} was never published via putImpl inside its mixed shared group - the skip ` +
          `logic ate a live city sharing a group with a retired one`
      );
    }
    const resultEntry = report.results.find((r) => r.city === liveCityId);
    if (!resultEntry || resultEntry.ok !== true) {
      fail(
        `expected report.results to contain an ok:true entry for live city ${liveCityId} in the mixed group, ` +
          `got: ${JSON.stringify(report.results)}`
      );
    }
    const liveWronglySkipped = report.skipped.some((s) => s.startsWith(`${liveCityId} (`));
    if (liveWronglySkipped) {
      fail(`live city ${liveCityId} appeared in report.skipped inside its mixed shared group - it should have been refreshed`);
    }
  } catch (error) {
    fail(`unexpected error during check 4 (mixed shared-group proof): ${error?.stack || error}`);
  } finally {
    global.fetch = originalFetch;
  }
}

if (process.exitCode) {
  console.error("gtfs-refresh-retired-city-skip-gate: FAIL");
  process.exit(process.exitCode);
} else {
  console.log(
    `gtfs-refresh-retired-city-skip-gate: ok - ${declaredCities.length} declared cities all registry-live; ` +
      `retired-only, live-positive, and mixed-shared-group construction proofs all confirmed correct ` +
      `per-city skip behaviour with zero network access`
  );
}
