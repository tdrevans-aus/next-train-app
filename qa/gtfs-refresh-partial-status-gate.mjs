/**
 * Proves, by construction and without any network access, that a mid-run
 * failure in lib/gtfs-refresh.js's runGtfsRefresh() does not lose every
 * city's manifest and status record the way the 12 Sep 2026 production OOM
 * did (docs/jim-brief-seq-refresh-oom.md): the 14:20:45 UTC cron run on the
 * #356 build published Newcastle correctly, then was killed mid-SEQ-group,
 * and gtfs/_refresh-status.json was never written at all - Canberra,
 * Brisbane and Gold Coast were left with no visible record of what
 * happened, not even a failure entry, because the whole report was only
 * ever written once, at the very end.
 *
 * A real OOM kill terminates the process outright - nothing here can
 * simulate that directly. What this gate proves instead is the mechanism
 * that makes a kill survivable: runGtfsRefresh() now calls
 * writeRefreshStatus() after EVERY city (success or per-city-caught
 * failure), not just once at the end, so whatever was persisted most
 * recently at the moment of a kill already reflects every city processed
 * so far. It also proves each per-city failure is both logged to the
 * console (previously silent - see the Canberra-gap discussion in the
 * brief) and recorded in the report with an error message naming the city.
 *
 * Two checks:
 *  1. Two-STANDALONE-city run, second city's build() throws: asserts
 *     putImpl is invoked for the status blob path more than once (proving
 *     incremental persistence, not a single end-of-run write), that the
 *     FIRST such write already names city A as ok:true with
 *     `partial: true`, and that the LAST write names city A ok:true and
 *     city B ok:false with an error message, `partial: false`.
 *  2. A mixed SHARED_GROUPS entry where the second city's build() throws:
 *     same incremental-persistence + partial-record assertions, proving
 *     the same holds inside a shared group, not just across STANDALONE
 *     entries.
 *
 * Usage: node qa/gtfs-refresh-partial-status-gate.mjs
 */
import assert from "assert";
import { runGtfsRefresh, STANDALONE, SHARED_GROUPS } from "../lib/gtfs-refresh.js";
import { REFRESH_STATUS_BLOB_PATH } from "../lib/providers/gtfs/blob-fixtures.js";
import { getCity } from "../lib/providers/registry.js";

function fail(message) {
  console.error(`gtfs-refresh-partial-status-gate: FAIL - ${message}`);
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

function makeRecordingFetch() {
  const fetchImpl = async (url, opts = {}) => {
    const method = opts.method || "GET";
    if (String(url).endsWith(".json")) {
      return { ok: false }; // "no manifest on record" -> treated as changed
    }
    if (method === "HEAD") {
      return { ok: true, headers: { get: () => null } };
    }
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) };
  };
  return fetchImpl;
}

function makeStatusRecordingPut() {
  const statusWrites = [];
  const putImpl = async (pathname, body) => {
    if (pathname === REFRESH_STATUS_BLOB_PATH) {
      statusWrites.push(JSON.parse(body));
    }
    return { url: `https://example.invalid/${pathname}` };
  };
  return { putImpl, statusWrites };
}

const okBuild = () => ({
  output: { "calendar.txt": "service_id,start_date,end_date\nWD,20260101,20261231\n" },
  summary: { synthetic: true },
});

function assertIncrementalPersistence(statusWrites, { cityA, cityB, label }) {
  if (statusWrites.length < 2) {
    fail(`${label}: expected more than one status-blob write (incremental persistence), got ${statusWrites.length}`);
    return;
  }
  const first = statusWrites[0];
  if (first.partial !== true) {
    fail(`${label}: expected the first persisted report to have partial:true, got ${JSON.stringify(first.partial)}`);
  }
  const firstHasA = first.results.some((r) => r.city === cityA && r.ok === true);
  if (!firstHasA) {
    fail(
      `${label}: expected the FIRST status write (persisted right after ${cityA} completed, before ${cityB} ` +
        `ran) to already contain ${cityA} as ok:true - this is what would be on record if the process were ` +
        `killed right after ${cityA} - got: ${JSON.stringify(first.results)}`
    );
  }
  const firstHasB = first.results.some((r) => r.city === cityB);
  if (firstHasB) {
    fail(`${label}: did not expect ${cityB} in the FIRST status write - it hasn't run yet at that point`);
  }

  const last = statusWrites[statusWrites.length - 1];
  if (last.partial !== false) {
    fail(`${label}: expected the final persisted report to have partial:false, got ${JSON.stringify(last.partial)}`);
  }
  const lastA = last.results.find((r) => r.city === cityA);
  if (!lastA || lastA.ok !== true) {
    fail(`${label}: expected final report to still show ${cityA} as ok:true, got: ${JSON.stringify(lastA)}`);
  }
  const lastB = last.results.find((r) => r.city === cityB);
  if (!lastB || lastB.ok !== false || !lastB.error) {
    fail(
      `${label}: expected final report to name ${cityB} as ok:false with an error message (the "which city it ` +
        `died on" record) - got: ${JSON.stringify(lastB)}`
    );
  }
}

// --- Check 1: STANDALONE, second city's build() throws -------------------
{
  const originalFetch = global.fetch;
  try {
    const cityA = "canberra";
    const cityB = "newcastle";
    assert.strictEqual(getCity(cityA)?.status, "live", `test assumes ${cityA} is live in the registry`);
    assert.strictEqual(getCity(cityB)?.status, "live", `test assumes ${cityB} is live in the registry`);

    global.fetch = makeRecordingFetch();
    const { putImpl, statusWrites } = makeStatusRecordingPut();

    await withSyntheticLists(
      {
        standalone: [
          { city: cityA, url: "http://qa-a.invalid/gtfs.zip", build: okBuild },
          {
            city: cityB,
            url: "http://qa-b.invalid/gtfs.zip",
            build: () => {
              throw new Error(`synthetic mid-run failure for ${cityB}`);
            },
          },
        ],
      },
      () => runGtfsRefresh({ putImpl })
    );

    assertIncrementalPersistence(statusWrites, { cityA, cityB, label: "check 1 (STANDALONE)" });
  } catch (error) {
    fail(`unexpected error during check 1: ${error?.stack || error}`);
  } finally {
    global.fetch = originalFetch;
  }
}

// --- Check 2: SHARED_GROUPS, second city's build() throws ----------------
{
  const originalFetch = global.fetch;
  try {
    const cityA = "brisbane";
    const cityB = "gold-coast";
    assert.strictEqual(getCity(cityA)?.status, "live", `test assumes ${cityA} is live in the registry`);
    assert.strictEqual(getCity(cityB)?.status, "live", `test assumes ${cityB} is live in the registry`);

    global.fetch = makeRecordingFetch();
    const { putImpl, statusWrites } = makeStatusRecordingPut();

    await withSyntheticLists(
      {
        sharedGroups: [
          {
            sharedUrl: "http://qa-shared.invalid/gtfs.zip",
            headers: {},
            cities: [
              { city: cityA, build: okBuild },
              {
                city: cityB,
                build: () => {
                  throw new Error(`synthetic mid-run failure for ${cityB}`);
                },
              },
            ],
          },
        ],
      },
      () => runGtfsRefresh({ putImpl })
    );

    assertIncrementalPersistence(statusWrites, { cityA, cityB, label: "check 2 (SHARED_GROUPS)" });
  } catch (error) {
    fail(`unexpected error during check 2: ${error?.stack || error}`);
  } finally {
    global.fetch = originalFetch;
  }
}

if (process.exitCode) {
  console.error("gtfs-refresh-partial-status-gate: FAIL");
  process.exit(process.exitCode);
} else {
  console.log(
    "gtfs-refresh-partial-status-gate: ok - status blob is persisted incrementally after every city (STANDALONE " +
      "and SHARED_GROUPS), so a mid-run kill leaves a record naming the city it died on, with zero network access"
  );
}
