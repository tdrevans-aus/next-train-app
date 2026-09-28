/**
 * Bespoke (non-GTFS) provider adapters — a failed direction must surface as "temporarily
 * unavailable", never a silent drop (docs/jim-brief-feed-unavailable-bespoke-adapters.md,
 * following Mark's Prague flip QA pass 3 finding, PR #498).
 *
 * Covers one bespoke adapter per HTTP shape named in the brief (Prague/Golemio, Vienna/Wiener
 * Linien, Washington/WMATA, Hong Kong/MTR) plus Chicago/CTA and BART/ETD (same posture,
 * united-states lock): a non-2xx response, a network error, a rate limit (429/Retry-After), and
 * an unparseable body must all become a typed FeedUnavailableError — never a bare Error api/
 * board.js's per-direction fan-out would otherwise silently drop with no rider-facing
 * explanation. Also asserts api/board.js's additive partial-board fields (`partial`,
 * `unavailableDirections`) when SOME directions fail while others succeed, the existing 503 when
 * ALL fail, Prague's per-station departure-boards cache (N directions = 1 upstream Golemio call),
 * and that every "Missing*ApiKeyError" for these adapters is itself a FeedUnavailableError.
 *
 * Never hits a real upstream API — stubs global.fetch throughout and restores it afterwards.
 *
 * Usage: node qa/bespoke-feed-unavailable-gate.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { FeedUnavailableError } from "../lib/providers/gtfs/errors.js";
import {
  MissingGolemioApiKeyError,
  MissingWmataApiKeyError,
  MissingCtaTrainTrackerKeyError,
  MissingBartApiKeyError,
} from "../lib/providers/gtfs/auth.js";
import board from "../api/board.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const failures = [];
function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

const originalFetch = global.fetch;
function restoreFetch() {
  global.fetch = originalFetch;
}

function jsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

function networkErrorFetch() {
  return async () => {
    throw new TypeError("network error: fetch failed");
  };
}

function unparseableBodyFetch(status = 200) {
  return async () => new Response("<html>rate limit page</html>", { status });
}

function mockRes() {
  return {
    statusCode: 0,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {},
  };
}

async function callBoard(query) {
  const res = mockRes();
  await board({ method: "GET", query, headers: {} }, res);
  return res;
}

async function assertRejectsWithFeedUnavailable(fn, label) {
  try {
    await fn();
    failures.push(`${label}: expected a throw, got a resolved value`);
    return null;
  } catch (error) {
    assert(
      error instanceof FeedUnavailableError,
      `${label}: expected FeedUnavailableError, got ${error?.constructor?.name}: ${error?.message}`
    );
    return error;
  }
}

/** ---------------------------------------------------------------------
 * Part 1: typed-error unit tests — 429/500/network-error/unparseable body
 * must all become FeedUnavailableError, never a bare Error, for one
 * adapter per pattern (Prague, Vienna, Washington, Hong Kong).
 * ------------------------------------------------------------------- */

async function testPrague() {
  const { fetchDepartureBoardsJson, _resetPragueDepartureBoardsCacheForTests } = await import(
    "../lib/providers/prague.js"
  );
  const stopIds = ["U1040Z101P", "U1040Z102P"];
  const apiKey = "test-golemio-key";

  global.fetch = async (url) => jsonResponse(429, { message: "Rate limit exceeded" }, { "retry-after": "3" });
  const rateLimited = await assertRejectsWithFeedUnavailable(
    () => fetchDepartureBoardsJson(stopIds, apiKey),
    "prague 429"
  );
  assert(rateLimited?.status === 429, `prague 429: expected status 429, got ${rateLimited?.status}`);
  assert(
    rateLimited?.retryAfterMs === 3000,
    `prague 429: expected retryAfterMs 3000, got ${rateLimited?.retryAfterMs}`
  );

  global.fetch = async () => jsonResponse(500, { message: "Internal error" });
  await assertRejectsWithFeedUnavailable(() => fetchDepartureBoardsJson(stopIds, apiKey), "prague 500");

  global.fetch = networkErrorFetch();
  await assertRejectsWithFeedUnavailable(() => fetchDepartureBoardsJson(stopIds, apiKey), "prague network error");

  global.fetch = unparseableBodyFetch(200);
  await assertRejectsWithFeedUnavailable(
    () => fetchDepartureBoardsJson(stopIds, apiKey),
    "prague unparseable 200 body"
  );

  // Item 3: N directions on the same station = 1 upstream Golemio call within the cache TTL.
  _resetPragueDepartureBoardsCacheForTests();
  const { fetchStationBoard } = await import("../lib/providers/prague.js");
  let requestCount = 0;
  global.fetch = async (url) => {
    const urlStr = String(url);
    if (!urlStr.startsWith("https://api.golemio.cz/v2/pid/departureboards")) {
      // A best-effort static-schedule side-load (computeScheduledCandidates) may also fire when
      // the live board is empty — never let it reach a real network call in this offline gate.
      throw new TypeError("network disabled in gate");
    }
    requestCount += 1;
    return jsonResponse(200, { departures: [] });
  };
  const results = await Promise.all([
    fetchStationBoard("Anděl", { now: new Date(), apiKey }),
    fetchStationBoard("Anděl", { now: new Date(), apiKey }),
  ]);
  assert(results.length === 2 && results.every((r) => Array.isArray(r.trips)), "prague cache: both calls resolved");
  assert(
    requestCount === 1,
    `prague cache: expected exactly 1 upstream departureboards request for 2 concurrent directions on the same station, got ${requestCount}`
  );

  restoreFetch();
  console.log("  ok prague: 429/500/network/unparseable -> FeedUnavailableError; per-station cache = 1 upstream call for N directions");
}

async function testVienna() {
  const { fetchStationBoard } = await import("../lib/providers/vienna.js");
  const station = "Aderklaaer Straße";

  global.fetch = async () => jsonResponse(429, { message: { messageCode: 316, value: "Abfragelimit erreicht!" } }, { "retry-after": "1" });
  await assertRejectsWithFeedUnavailable(() => fetchStationBoard(station, { now: new Date() }), "vienna HTTP 429");

  global.fetch = async () => jsonResponse(200, { message: { messageCode: 316, value: "Abfragelimit erreicht!" }, data: {} });
  await assertRejectsWithFeedUnavailable(
    () => fetchStationBoard(station, { now: new Date() }),
    "vienna messageCode error (200 with non-1 messageCode)"
  );

  global.fetch = networkErrorFetch();
  await assertRejectsWithFeedUnavailable(() => fetchStationBoard(station, { now: new Date() }), "vienna network error");

  global.fetch = unparseableBodyFetch(200);
  await assertRejectsWithFeedUnavailable(
    () => fetchStationBoard(station, { now: new Date() }),
    "vienna unparseable 200 body"
  );

  restoreFetch();
  console.log("  ok vienna: HTTP 429/messageCode error/network/unparseable -> FeedUnavailableError");
}

async function testWashington() {
  const { fetchStationBoard } = await import("../lib/providers/washington.js");
  const station = "Brookland-CUA";
  const apiKey = "test-wmata-key";
  const codes = ["B03"];

  global.fetch = async () => jsonResponse(429, { Message: "Too many requests" }, { "retry-after": "2" });
  const rateLimited = await assertRejectsWithFeedUnavailable(
    () => fetchStationBoard(station, { now: new Date(), apiKey, codes }),
    "washington 429"
  );
  assert(rateLimited?.status === 429, `washington 429: expected status 429, got ${rateLimited?.status}`);
  assert(
    rateLimited?.retryAfterMs === 2000,
    `washington 429: expected retryAfterMs 2000, got ${rateLimited?.retryAfterMs}`
  );

  global.fetch = async () => jsonResponse(500, { Message: "Internal error" });
  await assertRejectsWithFeedUnavailable(
    () => fetchStationBoard(station, { now: new Date(), apiKey, codes }),
    "washington 500"
  );

  global.fetch = networkErrorFetch();
  await assertRejectsWithFeedUnavailable(
    () => fetchStationBoard(station, { now: new Date(), apiKey, codes }),
    "washington network error"
  );

  global.fetch = unparseableBodyFetch(200);
  await assertRejectsWithFeedUnavailable(
    () => fetchStationBoard(station, { now: new Date(), apiKey, codes }),
    "washington unparseable 200 body"
  );

  restoreFetch();
  console.log("  ok washington: 429/500/network/unparseable -> FeedUnavailableError");
}

async function testHongKong() {
  const { fetchStationBoard, MtrScheduleError } = await import("../lib/providers/hong-kong.js");
  const station = "Admiralty";

  global.fetch = async () => jsonResponse(429, { message: "Too many requests" }, { "retry-after": "1" });
  const rateLimited = await assertRejectsWithFeedUnavailable(
    () => fetchStationBoard(station, { lineCodes: ["ISL"] }),
    "hong-kong HTTP 429"
  );
  assert(
    rateLimited instanceof MtrScheduleError,
    `hong-kong HTTP 429: expected MtrScheduleError, got ${rateLimited?.constructor?.name}`
  );

  global.fetch = async () => jsonResponse(200, { resultCode: 0, error: { errorCode: "NT-205", errorMsg: "ISL line is disabled in CMS" } });
  const nt205 = await assertRejectsWithFeedUnavailable(
    () => fetchStationBoard(station, { lineCodes: ["ISL"] }),
    "hong-kong NT-205"
  );
  assert(
    nt205 instanceof MtrScheduleError && nt205.errorCode === "NT-205",
    `hong-kong NT-205: expected MtrScheduleError with errorCode NT-205, got ${nt205?.constructor?.name}/${nt205?.errorCode}`
  );

  global.fetch = networkErrorFetch();
  await assertRejectsWithFeedUnavailable(() => fetchStationBoard(station, { lineCodes: ["ISL"] }), "hong-kong network error");

  global.fetch = unparseableBodyFetch(200);
  await assertRejectsWithFeedUnavailable(
    () => fetchStationBoard(station, { lineCodes: ["ISL"] }),
    "hong-kong unparseable 200 body"
  );

  restoreFetch();
  console.log("  ok hong-kong: HTTP 429/NT-205/network/unparseable -> MtrScheduleError extends FeedUnavailableError");
}

async function testChicagoAndBart() {
  const { fetchStationBoard: fetchChicagoBoard } = await import("../lib/providers/chicago.js");
  process.env.CTA_TRAIN_TRACKER_KEY = "test-cta-key";
  global.fetch = async () => jsonResponse(500, { errCd: "500" });
  await assertRejectsWithFeedUnavailable(
    () => fetchChicagoBoard("Clark/Lake", { mapid: "40380", apiKey: "test-cta-key" }),
    "chicago 500"
  );
  global.fetch = networkErrorFetch();
  await assertRejectsWithFeedUnavailable(
    () => fetchChicagoBoard("Clark/Lake", { mapid: "40380", apiKey: "test-cta-key" }),
    "chicago network error"
  );
  delete process.env.CTA_TRAIN_TRACKER_KEY;

  const { fetchStationBoard: fetchBartBoard } = await import("../lib/providers/bart.js");
  global.fetch = async () => jsonResponse(500, {});
  await assertRejectsWithFeedUnavailable(
    () => fetchBartBoard("Embarcadero", { apiKey: "test-bart-key" }),
    "bart 500"
  );
  global.fetch = networkErrorFetch();
  await assertRejectsWithFeedUnavailable(
    () => fetchBartBoard("Embarcadero", { apiKey: "test-bart-key" }),
    "bart network error"
  );

  restoreFetch();
  console.log("  ok chicago/bart: 500/network -> FeedUnavailableError");
}

/** ---------------------------------------------------------------------
 * Part 2: api/board.js partial-board fields — SOME directions failing
 * with FeedUnavailableError while others succeed must return the
 * succeeding entries plus `partial: true` + `unavailableDirections`,
 * never drop the failed direction silently. Washington (live, 2-direction
 * station, key-based) exercises this end to end.
 * ------------------------------------------------------------------- */
async function testPartialBoardFields() {
  const { resetStationsMetadataCacheForTests } = await import("../lib/providers/washington.js");
  resetStationsMetadataCacheForTests();
  process.env.WMATA_API_KEY = "test-wmata-key";

  let predictionCallCount = 0;
  global.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes("jStations")) {
      return jsonResponse(200, {
        Stations: [{ Code: "B03", Name: "Brookland-CUA", StationTogether1: "", StationTogether2: "" }],
      });
    }
    if (urlStr.includes("GetPrediction")) {
      predictionCallCount += 1;
      if (predictionCallCount === 1) {
        return jsonResponse(200, {
          Trains: [{ Line: "RD", DestinationName: "Shady Grove", Min: "5", Group: "A" }],
        });
      }
      return jsonResponse(429, { Message: "Too many requests" }, { "retry-after": "2" });
    }
    throw new Error(`unexpected fetch in partial-board test: ${urlStr}`);
  };

  const res = await callBoard({ city: "washington", station: "Brookland-CUA" });
  assert(res.statusCode === 200, `partial board: expected 200, got ${res.statusCode} (body: ${JSON.stringify(res.body)})`);
  assert(
    Array.isArray(res.body?.entries) && res.body.entries.length === 1,
    `partial board: expected exactly 1 successful entry, got ${JSON.stringify(res.body?.entries)}`
  );
  assert(res.body?.partial === true, `partial board: expected partial: true, got ${JSON.stringify(res.body)}`);
  assert(
    Array.isArray(res.body?.unavailableDirections) && res.body.unavailableDirections.length === 1,
    `partial board: expected exactly 1 unavailableDirections entry, got ${JSON.stringify(res.body?.unavailableDirections)}`
  );

  resetStationsMetadataCacheForTests();
  delete process.env.WMATA_API_KEY;
  restoreFetch();
  console.log(
    `  ok partial board: washington/Brookland-CUA -> 1 entry succeeded, partial:true, unavailableDirections:${JSON.stringify(res.body.unavailableDirections)}`
  );
}

/** ---------------------------------------------------------------------
 * Part 3: api/board.js all-fail case is still the existing 503, never a
 * partial board with zero entries.
 * ------------------------------------------------------------------- */
async function testAllFailStill503() {
  global.fetch = async () => jsonResponse(500, { message: { messageCode: 999, value: "boom" } });
  const res = await callBoard({ city: "vienna", station: "Aderklaaer Straße" });
  assert(res.statusCode === 503, `all-fail: expected 503, got ${res.statusCode} (body: ${JSON.stringify(res.body)})`);
  assert(
    res.body?.code === "PROVIDER_UNAVAILABLE",
    `all-fail: expected code PROVIDER_UNAVAILABLE, got ${JSON.stringify(res.body)}`
  );
  assert(res.body?.partial === undefined, `all-fail: must never carry partial:true alongside a 503`);
  restoreFetch();
  console.log("  ok all-fail: every direction failing still 503s PROVIDER_UNAVAILABLE (never a 200 partial board with 0 entries)");
}

/** ---------------------------------------------------------------------
 * Part 4: every Missing*ApiKeyError for these adapters is itself a
 * FeedUnavailableError (docs/jim-brief-feed-unavailable-bespoke-adapters.md
 * item 1) — "no key configured" is exactly a "feed unavailable right now"
 * condition for a live-boards-only city.
 * ------------------------------------------------------------------- */
function testMissingKeyErrorsAreFeedUnavailable() {
  for (const [Ctor, name] of [
    [MissingGolemioApiKeyError, "MissingGolemioApiKeyError"],
    [MissingWmataApiKeyError, "MissingWmataApiKeyError"],
    [MissingCtaTrainTrackerKeyError, "MissingCtaTrainTrackerKeyError"],
    [MissingBartApiKeyError, "MissingBartApiKeyError"],
  ]) {
    const err = new Ctor();
    assert(
      err instanceof FeedUnavailableError,
      `${name}: expected instanceof FeedUnavailableError`
    );
    assert(err.name === name, `${name}: expected error.name to stay "${name}", got "${err.name}"`);
  }
  console.log("  ok Missing*ApiKeyError (Golemio/Wmata/CtaTrainTracker/Bart) all extend FeedUnavailableError, name unchanged");
}

/** ---------------------------------------------------------------------
 * Part 5: UI fixture — public/nearby-mode.js must render the honest
 * "temporarily unavailable" copy for a direction listed in
 * unavailableDirections when it's the one focused, never silently
 * substitute another direction's data (same static-source-pattern
 * approach as qa/widget-nearby-pin-tap.mjs — no browser needed).
 * ------------------------------------------------------------------- */
function testNearbyModeUiWiring() {
  const nearby = readFileSync(join(ROOT, "public", "nearby-mode.js"), "utf8");
  assert(
    /unavailableDirections/.test(nearby),
    "public/nearby-mode.js: expected to read payload.unavailableDirections from /api/board"
  );
  assert(
    /unavailable:\s*true/.test(nearby),
    "public/nearby-mode.js: expected a synthetic unavailable marker entry in getNearbyFocusedEntry"
  );
  assert(
    /focusedEntry\?\.unavailable/.test(nearby),
    "public/nearby-mode.js: expected renderNearbyBoard to branch on focusedEntry?.unavailable"
  );
  assert(
    /temporarily unavailable for this direction/i.test(nearby),
    'public/nearby-mode.js: expected the per-direction "temporarily unavailable" rider copy'
  );
  // The focus-reassignment guard (docs/jim-brief-feed-unavailable-bespoke-adapters.md) — an
  // unavailable focused direction must not be silently bounced to a different one on refetch.
  assert(
    /unavailableDirections\.includes\(nearbySession\.focusedDirection\)/.test(nearby),
    "public/nearby-mode.js: expected the focus-reassignment check to exempt unavailableDirections"
  );
  console.log("  ok public/nearby-mode.js: partial-board fields read, honest per-direction copy wired, focus preserved");
}

async function main() {
  await testPrague();
  await testVienna();
  await testWashington();
  await testHongKong();
  await testChicagoAndBart();
  await testPartialBoardFields();
  await testAllFailStill503();
  testMissingKeyErrorsAreFeedUnavailable();
  testNearbyModeUiWiring();

  restoreFetch();

  if (failures.length) {
    console.error("bespoke-feed-unavailable-gate failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    "PASS bespoke-feed-unavailable-gate: Prague/Vienna/Washington/Hong Kong/Chicago/BART all throw typed FeedUnavailableError (never a bare Error) for HTTP failure/network error/unparseable body; api/board.js returns an honest partial board (partial:true + unavailableDirections) when some directions fail, still 503s when all fail; Missing*ApiKeyError extends FeedUnavailableError; UI renders honest per-direction copy without losing focus."
  );
}

main();
