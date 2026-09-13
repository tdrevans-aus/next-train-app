/**
 * Proves, by construction and without any network access, that
 * qa/prod-sweep.mjs's checkRefreshStatus() surfaces an *individual* city's
 * refresh failure, not just an all-cities failure
 * (docs/jim-brief-prod-sweep-refresh-failed-alarm.md, 13 Sep 2026).
 *
 * Bug: lib/gtfs-refresh.js's writer sets `ok: failed.length !== results.length`
 * — `ok` is only false when *every* city fails. checkRefreshStatus() only
 * checked `!report.ok` and staleness, so one city failing every night (as
 * Canberra did from 12 Sep, "download failed (403)") was invisible: `ok`
 * stayed true because the other 30-odd cities kept succeeding. This gate
 * drives the real exported checkRefreshStatus() with a stubbed global.fetch
 * (the same pattern qa/gtfs-refresh-status-cache-gate.mjs uses) across three
 * cases:
 *   1. failed: 0, all results ok, fresh ranAt -> "ok".
 *   2. failed: 1, one named results[] entry with ok: false -> "error", whose
 *      detail names the failing city id and its recorded error string.
 *   3. every city failed (report.ok: false) -> still the existing "reported
 *      failure" branch, unchanged by this fix.
 *
 * Usage: node qa/prod-sweep-refresh-failed-gate.mjs
 */
import assert from "assert";
import { checkRefreshStatus } from "./prod-sweep.mjs";

function fail(message) {
  console.error(`prod-sweep-refresh-failed-gate: FAIL - ${message}`);
  process.exitCode = 1;
}

function stubFetch(report) {
  return async () => ({
    ok: true,
    json: async () => report,
  });
}

async function withFetchStub(report, run) {
  const originalFetch = global.fetch;
  global.fetch = stubFetch(report);
  try {
    return await run();
  } finally {
    global.fetch = originalFetch;
  }
}

const freshRanAt = () => new Date().toISOString();

// --- Case 1: no failures -------------------------------------------------
async function checkAllOk() {
  const report = {
    ok: true,
    ranAt: freshRanAt(),
    succeeded: 31,
    failed: 0,
    results: Array.from({ length: 31 }, (_, i) => ({ city: `city-${i}`, ok: true })),
  };
  const result = await withFetchStub(report, () => checkRefreshStatus());
  try {
    assert.strictEqual(result.status, "ok", `expected "ok" for failed: 0, got ${JSON.stringify(result)}`);
    console.log("prod-sweep-refresh-failed-gate: case 1 (failed: 0) OK - status ok");
  } catch (error) {
    fail(error.message);
  }
}

// --- Case 2: exactly one named city failed --------------------------------
async function checkOneFailed() {
  const report = {
    // Matches the real writer: ok is only false when EVERY city fails, so a
    // single failure among many still leaves ok: true — that's the bug.
    ok: true,
    ranAt: freshRanAt(),
    succeeded: 30,
    failed: 1,
    results: [
      { city: "canberra", ok: false, error: "download failed (403)" },
      ...Array.from({ length: 30 }, (_, i) => ({ city: `city-${i}`, ok: true })),
    ],
  };
  const result = await withFetchStub(report, () => checkRefreshStatus());
  try {
    assert.strictEqual(
      result.status,
      "error",
      `expected "error" for failed: 1, got ${JSON.stringify(result)}`
    );
    assert.ok(
      result.detail.includes("canberra"),
      `expected detail to name the failed city "canberra", got: ${result.detail}`
    );
    assert.ok(
      result.detail.includes("download failed (403)"),
      `expected detail to include the recorded error text, got: ${result.detail}`
    );
    console.log(
      `prod-sweep-refresh-failed-gate: case 2 (failed: 1) OK - status error, detail names city: ${result.detail}`
    );
  } catch (error) {
    fail(error.message);
  }
}

// --- Case 3: every city failed - existing branch, unchanged --------------
async function checkAllFailed() {
  const report = {
    ok: false,
    ranAt: freshRanAt(),
    succeeded: 0,
    failed: 2,
    results: [
      { city: "canberra", ok: false, error: "download failed (403)" },
      { city: "adelaide", ok: false, error: "download failed (500)" },
    ],
  };
  const result = await withFetchStub(report, () => checkRefreshStatus());
  try {
    assert.strictEqual(
      result.status,
      "error",
      `expected "error" for all-failed report, got ${JSON.stringify(result)}`
    );
    assert.ok(
      result.detail.includes("reported failure"),
      `expected the existing "reported failure" branch for report.ok: false, got: ${result.detail}`
    );
    console.log(`prod-sweep-refresh-failed-gate: case 3 (all failed) OK - existing branch unchanged: ${result.detail}`);
  } catch (error) {
    fail(error.message);
  }
}

await checkAllOk();
await checkOneFailed();
await checkAllFailed();

if (process.exitCode !== 1) {
  console.log("prod-sweep-refresh-failed-gate: PASS");
}
