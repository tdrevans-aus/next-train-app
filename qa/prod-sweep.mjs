#!/usr/bin/env node
/**
 * FB-64 production sweep — turns the manual 6 Sep 2026 pre-launch sweep into a repeatable
 * check. Hits production (never localhost, never an agency directly — production already
 * holds every agency key) for every city with `status: "live"` in lib/providers/registry.js,
 * and classifies each as ok / empty / error / skipped (outside service hours).
 *
 * Design constraint that makes this useful rather than noisy: a station board with zero
 * trips is only a defect during the city's plausible service hours. Overnight, a quiet
 * board (e.g. the London Underground's scheduled 00:17–04:03 closure) is expected and must
 * not be reported as a finding — see docs/jim-brief-prod-sweep.md section 2. An `error`
 * (non-200, malformed body, thrown parse) is always a finding, at any hour.
 *
 * FB-64 fix-up (docs/jim-brief-prod-sweep-fixups.md, after Mark's QA FAIL on PR #355):
 * a single unlucky sampled chip must not condemn a whole city. Two changes:
 *  - `checkStation` now checks up to CHIPS_PER_STATION chips at a station and only reports
 *    the station `empty` when none of them return a trip (previously it checked only the
 *    first chip — Brisbane's Albion/Alderley "empty" was an artifact of that station's
 *    first-listed direction being a genuinely quiet branch, while its other directions run
 *    fine).
 *  - `sampleStations` now prefers each city's derivable hub station (from
 *    lib/cities/<city>/direction-hubs.json — the same data UK regions already use for chip
 *    anchoring, loaded via the shared lib/cities/uk/direction-hubs.js helper, which returns
 *    an empty hub list — not an error — for any city with no such file) ahead of whatever
 *    station happens to sort first alphabetically. Cities with no hub file (all of AU/SE/NO/FI
 *    today — see Mark's note) fall back unchanged to the previous alphabetical-first sampling.
 *
 * FB-64 second fix-up (docs/jim-brief-prod-sweep-ratelimit.md, after a repeatable error=8):
 * the sweep was tripping our own `lib/api-rate-limit.js` (60 req/60s/IP) — 33 cities x up to
 * four requests each is 100+ requests, and issuing them back-to-back is faster than the
 * limiter's window. This is structural, not flaky: the same eight UK regions failed the same
 * way on two independent runs. Two changes, deliberately *not* touching the limiter itself:
 *  - Every request this script makes against `BASE` is paced through `paceRequest`/
 *    `fetchJsonSafe`, which enforce a minimum gap between requests (`REQUEST_INTERVAL_MS`,
 *    default comfortably under 60/minute). The sweep runs every 6 hours with no deadline, so trading
 *    burst speed for headroom is free — a full run now takes a few minutes, not seconds.
 *  - A 429 is never a city finding. `fetchJsonSafe` classifies HTTP 429 distinctly (`throttled`,
 *    carrying the `Retry-After` value) rather than folding it into the generic `error` case; one
 *    automatic retry is made after waiting the server's own `Retry-After` seconds (defence in
 *    depth — pacing should already keep the sweep under the limit). `checkChip`/`checkStation`/
 *    `sweepCity` propagate `throttled` as its own outcome, `updateState` never lets it move a
 *    city's `consecutiveError`/`consecutiveEmptyInHours` counter (the previous run's counts are
 *    carried forward unchanged, since a throttled run said nothing about health either way), and
 *    a `throttled` result can never appear in the alerting set. If a run ever does end with a
 *    throttled city, that's printed as a sweep-pacing defect, not folded into the per-city table.
 *
 * This script never gates a PR: it is not registered in qa/run-all.mjs at any tier (see the
 * RUNNER_EXCLUDE entry there) and .github/workflows/prod-sweep.yml never runs on push or
 * pull_request.
 *
 * Usage:
 *   node qa/prod-sweep.mjs                 # sweep production
 *   PROD_SWEEP_BASE=https://preview... node qa/prod-sweep.mjs   # point at a preview deploy
 *   npm run sweep:prod
 *
 * No API keys are read or required — production already holds them.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CITIES } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import { loadDirectionHubs } from "../lib/cities/uk/direction-hubs.js";
import { gtfsRefreshStatusBlobUrl } from "../lib/providers/gtfs/blob-fixtures.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

export const BASE = (process.env.PROD_SWEEP_BASE || "https://next-train-app.vercel.app").replace(
  /\/$/,
  ""
);

/** Six-hourly cron (Tim, 12 Sep 2026 — hourly cost ~3,600 Actions min/month, ~2x the free tier): N consecutive in-service findings before alerting. */
export const ALERT_THRESHOLD = Number(process.env.PROD_SWEEP_THRESHOLD) || 3;

/** A small, stable sample per city — cheap enough to run hourly without hammering upstreams. */
const SAMPLE_SIZE = 2;

/**
 * A station is only reported `empty` once every one of its first few chips is checked and
 * none returns a trip — three is plenty to rule out "this one direction happens to be a
 * quiet branch right now" without turning the sweep into a full-board fetch.
 */
const CHIPS_PER_STATION = 3;

const STATE_PATH = path.join(REPO_ROOT, "qa", "prod-sweep-state.json");

/**
 * Daily GTFS refresh cron freshness (docs/jim-brief-gtfs-refresh-cron-crash.md,
 * 11 Sep 2026): the cron is dispatched from /api/health, which must always
 * return 200 for a healthy platform regardless of whether the *cron branch*
 * succeeded — that's exactly how it crashed on every run for a week (4-11
 * Sep) and stayed invisible. lib/gtfs-refresh.js records each run's outcome
 * to a single non-city-scoped blob (gtfs/_refresh-status.json); this sweep
 * — already the hourly, non-required, monitoring-only GitHub Actions run
 * that's allowed to go red without touching UptimeRobot's liveness check —
 * is the visibility surface for it, per that brief's item 3.
 *
 * The cron runs once daily (vercel.json, 03:17 UTC); 30h gives a full day
 * plus buffer before "hasn't run recently" is treated as a finding.
 */
const REFRESH_STALE_AFTER_MS = 30 * 60 * 60 * 1000;

/**
 * Exported so qa/gtfs-refresh-status-cache-gate.mjs can prove, by
 * construction and with global.fetch stubbed (no real network), that this
 * fetch always cache-busts rather than trusting an edge copy of the status
 * record (docs/jim-brief-refresh-status-cache-and-memory.md, 13 Sep 2026).
 */
export async function checkRefreshStatus() {
  let response;
  try {
    // Cache-bust: the writer sets a short cacheControlMaxAge (60s, see
    // lib/gtfs-refresh.js writeRefreshStatus) but this sweep must never trust
    // an edge copy regardless of what the writer did, so it also busts the
    // CDN with a per-call query param and disables the local fetch cache
    // (docs/jim-brief-refresh-status-cache-and-memory.md, 13 Sep 2026 - a
    // stale read here can report a weeks-failing cron as healthy).
    const url = `${gtfsRefreshStatusBlobUrl()}?_=${Date.now()}`;
    response = await fetch(url, { cache: "no-store" });
  } catch (error) {
    return { status: "unknown", detail: `refresh status fetch failed: ${error.message}` };
  }
  if (!response.ok) {
    // Most likely: this PR hasn't had its first post-merge cron run yet.
    // Not a finding — nothing to compare freshness against.
    return { status: "unknown", detail: `refresh status not found (HTTP ${response.status})` };
  }
  let report;
  try {
    report = await response.json();
  } catch (error) {
    return { status: "error", detail: `refresh status body unparsable: ${error.message}` };
  }
  const ranAt = report?.ranAt ? new Date(report.ranAt) : null;
  const ageMs = ranAt ? Date.now() - ranAt.getTime() : null;
  if (!report?.ok) {
    return {
      status: "error",
      detail: `last refresh run reported failure (ranAt=${report?.ranAt ?? "unknown"}, failed=${report?.failed ?? "?"})`,
    };
  }
  if (ageMs === null || Number.isNaN(ageMs) || ageMs > REFRESH_STALE_AFTER_MS) {
    return {
      status: "error",
      detail: `last successful refresh was ${report?.ranAt ?? "never recorded"} — over ${(
        REFRESH_STALE_AFTER_MS /
        (60 * 60 * 1000)
      ).toFixed(0)}h ago, cron may be crashing again`,
    };
  }
  return { status: "ok", detail: `last refresh ${report.ranAt}, ${report.succeeded}/${report.results?.length ?? "?"} cities ok` };
}

/**
 * Perth is not a multi-city id (lib/cities/live-city-api.js MULTI_CITY_IDS), so
 * /api/city-stations 400s for it — it has its own long-standing UptimeRobot synthetic
 * (docs/go-live-ops.md monitor 3) on this exact station/direction pair.
 */
const PERTH_SAMPLE = [{ station: "Edgewater Stn", direction: "Perth" }];

function fetchTimeoutMs() {
  return Number(process.env.PROD_SWEEP_TIMEOUT_MS) || 15000;
}

/**
 * `lib/api-rate-limit.js` allows 60 requests/60s/IP. This sweep issues 100+ requests across
 * 33 cities in one run, so every request against `BASE` is paced through this gate rather than
 * fired back-to-back. Default keeps us comfortably under the limit (well under 60/minute) with
 * margin for GitHub Actions runners sharing an egress IP with other traffic; override for local
 * testing against a preview deploy that has no rate limiter in front of it.
 */
const REQUEST_INTERVAL_MS = Number(process.env.PROD_SWEEP_REQUEST_INTERVAL_MS) || 1100;

let nextRequestAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function paceRequest() {
  const now = Date.now();
  const waitMs = nextRequestAt - now;
  nextRequestAt = Math.max(now, nextRequestAt) + REQUEST_INTERVAL_MS;
  if (waitMs > 0) {
    await sleep(waitMs);
  }
}

/**
 * A 429 from our own API is a fact about the sweep's request rate, never about the city being
 * checked — classified distinctly here (`status: 429`, `retryAfterMs`) so callers can keep it
 * out of the ok/empty/error taxonomy entirely. One retry is attempted, backed off by the
 * server's own `Retry-After` header (the limiter always sets it) rather than a guess; this is
 * defence in depth only — `paceRequest` should already keep every request under the limit.
 */
async function fetchJsonSafe(url, { retried = false } = {}) {
  await paceRequest();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), fetchTimeoutMs());
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (res.status === 429) {
      const retryAfterHeader = res.headers.get("retry-after");
      const retryAfterMs = Number(retryAfterHeader) > 0 ? Number(retryAfterHeader) * 1000 : 60_000;
      if (!retried) {
        await sleep(Math.min(retryAfterMs, 65_000));
        return fetchJsonSafe(url, { retried: true });
      }
      return {
        ok: false,
        status: 429,
        throttled: true,
        retryAfterMs,
        error: `HTTP 429: rate-limited by our own API after 1 retry`,
      };
    }
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, status: res.status, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    try {
      const data = JSON.parse(text);
      return { ok: true, status: res.status, data };
    } catch {
      return { ok: false, status: res.status, error: `malformed JSON: ${text.slice(0, 200)}` };
    }
  } catch (error) {
    return { ok: false, status: 0, error: `request failed: ${error?.message ?? error}` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Each city's derivable hub station name(s), sourced from
 * lib/cities/<city>/direction-hubs.json via the shared UK helper (which returns
 * `{ hubs: [] }` — not an error — for any city with no such file, so this is a no-op for
 * cities without one). `filterName` is the hub's real, catalog-resolvable station name
 * (e.g. "Birmingham New Street"), not the display label, so it's usable directly as a
 * sample station.
 */
function hubCandidateNames(city) {
  const { hubs } = loadDirectionHubs(city.id);
  const names = [];
  const seen = new Set();
  for (const hub of hubs) {
    const name = String(hub.filterName || "").trim();
    const key = name.toLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      names.push(name);
    }
  }
  return names;
}

/**
 * Stations with `liveFeed: false` never produce a board by design
 * (docs/jim-brief-no-live-feed-stops-out-of-picker.md) — sampling one would report every
 * run as "empty" for a reason that isn't a finding. Skip them.
 *
 * Prefers each city's derivable hub station(s) (see hubCandidateNames) ahead of whatever
 * sorts first alphabetically, since a hub is a curated, well-connected interchange and much
 * less likely to be genuinely quiet than an arbitrary branch terminus. Cities with no
 * derivable hub keep the previous alphabetical-first behaviour unchanged.
 */
async function sampleStations(city) {
  if (city.id === "perth") {
    return PERTH_SAMPLE.map((s) => s.station);
  }
  if (!isMultiCity(city.id)) {
    return [];
  }
  const result = await fetchJsonSafe(`${BASE}/api/city-stations?city=${encodeURIComponent(city.id)}`);
  if (result.throttled) {
    return { throttled: true, retryAfterMs: result.retryAfterMs, error: result.error };
  }
  if (!result.ok || !Array.isArray(result.data?.stations)) {
    return { error: result.error ?? "city-stations returned no station list" };
  }
  const usable = result.data.stations.filter((s) => s.liveFeed !== false);

  const hubNames = hubCandidateNames(city);
  const byLowerName = new Map(usable.map((s) => [String(s.name).toLowerCase(), s]));
  const hubStations = [];
  for (const name of hubNames) {
    const match = byLowerName.get(name.toLowerCase());
    if (match) {
      hubStations.push(match);
    }
  }
  const rest = usable.filter((s) => !hubStations.includes(s));
  const ordered = [...hubStations, ...rest];
  return ordered.slice(0, SAMPLE_SIZE).map((s) => s.name);
}

/**
 * Best-of across a set of results: one working chip/station means it works. `throttled` ranks
 * worse than `empty` (an inconclusive result should not masquerade as "checked and quiet") but
 * strictly better than `error` — a 429 is never allowed to read as a defect finding, only as
 * "we don't yet know."
 */
const OUTCOME_RANK = { ok: 0, empty: 1, throttled: 2, error: 3 };

function bestOutcome(results) {
  return results.reduce((best, cur) => (OUTCOME_RANK[cur.outcome] < OUTCOME_RANK[best.outcome] ? cur : best));
}

/** @returns {Promise<{outcome: "ok"|"empty"|"throttled"|"error", detail: string}>} */
async function checkChip(city, station, direction) {
  const nextTrainUrl =
    `${BASE}/api/next-train?city=${encodeURIComponent(city.id)}&station=${encodeURIComponent(station)}` +
    `&direction=${encodeURIComponent(direction)}&destination=${encodeURIComponent(direction)}`;
  const nextTrainResult = await fetchJsonSafe(nextTrainUrl);
  if (nextTrainResult.throttled) {
    return { outcome: "throttled", detail: `next-train: ${nextTrainResult.error}` };
  }
  if (!nextTrainResult.ok) {
    return { outcome: "error", detail: `next-train: ${nextTrainResult.error}` };
  }
  const data = nextTrainResult.data;
  if (!data || typeof data !== "object" || !("next" in data)) {
    return { outcome: "error", detail: "next-train: response missing expected 'next' field" };
  }
  const hasTrip = Boolean(data.next) || Boolean(data.arrivalsOnly);
  if (hasTrip) {
    return { outcome: "ok", detail: `${station} -> ${direction}: has upcoming trip` };
  }
  return { outcome: "empty", detail: `${station} -> ${direction}: no upcoming trips` };
}

/**
 * @returns {Promise<{outcome: "ok"|"empty"|"throttled"|"error", detail: string}>}
 *
 * FB-64 fix-up: checks up to CHIPS_PER_STATION chips and only reports `empty` when none of
 * them has a trip — a station is only empty if every chip it offers is empty, not just
 * whichever chip happened to be listed first.
 */
async function checkStation(city, station) {
  const directionsUrl = `${BASE}/api/directions?city=${encodeURIComponent(city.id)}&station=${encodeURIComponent(
    station
  )}`;
  const directionsResult = await fetchJsonSafe(directionsUrl);
  if (directionsResult.throttled) {
    return { outcome: "throttled", detail: `directions: ${directionsResult.error}` };
  }
  if (!directionsResult.ok) {
    return { outcome: "error", detail: `directions: ${directionsResult.error}` };
  }
  const directions = Array.isArray(directionsResult.data?.directions)
    ? directionsResult.data.directions
    : [];
  if (directions.length === 0) {
    return { outcome: "empty", detail: `${station}: no directions returned` };
  }

  const chipResults = [];
  for (const direction of directions.slice(0, CHIPS_PER_STATION)) {
    // eslint-disable-next-line no-await-in-loop
    chipResults.push(await checkChip(city, station, direction));
  }
  return bestOutcome(chipResults);
}

/**
 * Conservative, city-local service window (docs/jim-brief-prod-sweep.md section 2):
 * 06:00–23:00 local time. Simple beats clever here — the goal is "don't page on scheduled
 * overnight closures," not a per-mode timetable model.
 */
function isInServiceHours(timeZone, now = new Date()) {
  try {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hour12: false }).format(now)
    );
    return hour >= 6 && hour < 23;
  } catch {
    // Unknown/invalid tz — fail safe to "in service hours" so a bad timeZone value is a
    // finding (via empty/error), not a silent skip.
    return true;
  }
}

export async function sweepCity(city, now = new Date()) {
  const stations = await sampleStations(city);
  if (!Array.isArray(stations)) {
    // sampleStations itself failed (city-stations catalog call errored).
    if (stations.throttled) {
      return { id: city.id, displayName: city.displayName, status: "throttled", detail: stations.error };
    }
    return { id: city.id, displayName: city.displayName, status: "error", detail: stations.error };
  }
  if (stations.length === 0) {
    return {
      id: city.id,
      displayName: city.displayName,
      status: "error",
      detail: "no sampleable stations (empty catalog or no live-feed stations)",
    };
  }

  const results = [];
  for (const station of stations) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await checkStation(city, station));
  }
  const worst = bestOutcome(results);
  const inServiceHours = isInServiceHours(city.timeZone, now);

  if (worst.outcome === "error") {
    return { id: city.id, displayName: city.displayName, status: "error", detail: worst.detail };
  }
  if (worst.outcome === "throttled") {
    // Every sampled chip/station was rate-limited by our own API and none produced a real
    // ok/empty signal — this is a fact about the sweep's own request rate, not a city finding.
    // Never allowed to read as `error` or `empty`, and (see updateState) never allowed to move
    // a consecutive-failure counter.
    return { id: city.id, displayName: city.displayName, status: "throttled", detail: worst.detail };
  }
  if (worst.outcome === "empty") {
    if (!inServiceHours) {
      return {
        id: city.id,
        displayName: city.displayName,
        status: "skipped",
        detail: `outside service hours (${city.timeZone}); ${worst.detail}`,
      };
    }
    return { id: city.id, displayName: city.displayName, status: "empty", detail: worst.detail };
  }
  return { id: city.id, displayName: city.displayName, status: "ok", detail: worst.detail };
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch {
    return { cities: {} };
  }
}

function updateState(state, results, now = new Date()) {
  const cities = { ...state.cities };
  for (const result of results) {
    const prev = cities[result.id] ?? { consecutiveError: 0, consecutiveEmptyInHours: 0 };
    if (result.status === "throttled") {
      // A 429 is a fact about the sweep, not the city: never increments a counter, and never
      // resets one either — an in-progress error/empty streak survives a throttled run
      // untouched, it's simply neither confirmed nor denied this run. Only lastStatus/lastDetail/
      // lastRunAt move, so the throttled run is still visible in state for debugging.
      cities[result.id] = {
        consecutiveError: prev.consecutiveError,
        consecutiveEmptyInHours: prev.consecutiveEmptyInHours,
        lastStatus: result.status,
        lastDetail: result.detail,
        lastRunAt: now.toISOString(),
      };
      continue;
    }
    let consecutiveError = 0;
    let consecutiveEmptyInHours = 0;
    if (result.status === "error") {
      consecutiveError = prev.consecutiveError + 1;
    } else if (result.status === "empty") {
      consecutiveEmptyInHours = prev.consecutiveEmptyInHours + 1;
    }
    cities[result.id] = {
      consecutiveError,
      consecutiveEmptyInHours,
      lastStatus: result.status,
      lastDetail: result.detail,
      lastRunAt: now.toISOString(),
    };
  }
  return { updatedAt: now.toISOString(), cities };
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

function liveCities() {
  return CITIES.filter((c) => c.status === "live");
}

async function main() {
  const now = new Date();
  const cities = liveCities();
  const results = [];
  for (const city of cities) {
    // eslint-disable-next-line no-await-in-loop
    const result = await sweepCity(city, now);
    results.push(result);
  }

  const state = loadState();
  const nextState = updateState(state, results, now);
  saveState(nextState);

  const alerting = results.filter((r) => {
    const s = nextState.cities[r.id];
    return s.consecutiveError >= ALERT_THRESHOLD || s.consecutiveEmptyInHours >= ALERT_THRESHOLD;
  });

  const refreshStatus = await checkRefreshStatus();

  console.log(`prod-sweep: ${BASE} — ${cities.length} live cities, ${now.toISOString()}`);
  console.log("");
  console.log(`GTFS refresh cron: [${refreshStatus.status}] ${refreshStatus.detail}`);
  console.log("");
  const byStatus = { ok: 0, empty: 0, error: 0, skipped: 0, throttled: 0 };
  for (const r of results) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    const s = nextState.cities[r.id];
    const streak =
      s.consecutiveError > 0
        ? ` (error x${s.consecutiveError})`
        : s.consecutiveEmptyInHours > 0
          ? ` (empty x${s.consecutiveEmptyInHours})`
          : "";
    console.log(`  [${r.status.padEnd(7)}] ${r.id.padEnd(28)} ${r.detail}${streak}`);
  }
  console.log("");
  console.log(
    `Summary: ok=${byStatus.ok} empty=${byStatus.empty} error=${byStatus.error} skipped=${byStatus.skipped}` +
      (byStatus.throttled > 0 ? ` throttled=${byStatus.throttled}` : "")
  );

  if (byStatus.throttled > 0) {
    console.log("");
    console.log(
      `SWEEP PACING DEFECT: ${byStatus.throttled} ${
        byStatus.throttled === 1 ? "city was" : "cities were"
      } rate-limited by our own API (lib/api-rate-limit.js) even after pacing and one retry. ` +
        "This is a fact about the sweep, not the listed cities — none of them contributed to " +
        "any consecutive-failure counter this run. If this keeps happening, raise " +
        "REQUEST_INTERVAL_MS (qa/prod-sweep.mjs), don't raise the limiter's LIMIT."
    );
  }

  if (refreshStatus.status === "error") {
    console.log("");
    console.log(`GTFS REFRESH CRON FINDING: ${refreshStatus.detail}`);
    process.exitCode = 1;
  }

  if (alerting.length > 0) {
    console.log("");
    console.log(
      `ALERTING (>= ${ALERT_THRESHOLD} consecutive in-service findings): ${alerting
        .map((r) => r.id)
        .join(", ")}`
    );
    process.exitCode = 1;
    return;
  }

  if (process.exitCode === 1) {
    return;
  }
  console.log("");
  console.log(`No city has crossed the ${ALERT_THRESHOLD}-consecutive-run alert threshold.`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main().catch((error) => {
    console.error("prod-sweep: fatal", error);
    process.exitCode = 1;
  });
}
