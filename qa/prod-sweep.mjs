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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

export const BASE = (process.env.PROD_SWEEP_BASE || "https://next-train-app.vercel.app").replace(
  /\/$/,
  ""
);

/** Hourly cron, cheap and conservative: N consecutive in-service findings before alerting. */
export const ALERT_THRESHOLD = Number(process.env.PROD_SWEEP_THRESHOLD) || 3;

/** A small, stable sample per city — cheap enough to run hourly without hammering upstreams. */
const SAMPLE_SIZE = 2;

const STATE_PATH = path.join(REPO_ROOT, "qa", "prod-sweep-state.json");

/**
 * Perth is not a multi-city id (lib/cities/live-city-api.js MULTI_CITY_IDS), so
 * /api/city-stations 400s for it — it has its own long-standing UptimeRobot synthetic
 * (docs/go-live-ops.md monitor 3) on this exact station/direction pair.
 */
const PERTH_SAMPLE = [{ station: "Edgewater Stn", direction: "Perth" }];

function fetchTimeoutMs() {
  return Number(process.env.PROD_SWEEP_TIMEOUT_MS) || 15000;
}

async function fetchJsonSafe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), fetchTimeoutMs());
  try {
    const res = await fetch(url, { signal: controller.signal });
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
 * Stations with `liveFeed: false` never produce a board by design
 * (docs/jim-brief-no-live-feed-stops-out-of-picker.md) — sampling one would report every
 * run as "empty" for a reason that isn't a finding. Skip them.
 */
async function sampleStations(city) {
  if (city.id === "perth") {
    return PERTH_SAMPLE.map((s) => s.station);
  }
  if (!isMultiCity(city.id)) {
    return [];
  }
  const result = await fetchJsonSafe(`${BASE}/api/city-stations?city=${encodeURIComponent(city.id)}`);
  if (!result.ok || !Array.isArray(result.data?.stations)) {
    return { error: result.error ?? "city-stations returned no station list" };
  }
  const usable = result.data.stations.filter((s) => s.liveFeed !== false);
  return usable.slice(0, SAMPLE_SIZE).map((s) => s.name);
}

/** @returns {Promise<{outcome: "ok"|"empty"|"error", detail: string}>} */
async function checkStation(city, station) {
  const directionsUrl = `${BASE}/api/directions?city=${encodeURIComponent(city.id)}&station=${encodeURIComponent(
    station
  )}`;
  const directionsResult = await fetchJsonSafe(directionsUrl);
  if (!directionsResult.ok) {
    return { outcome: "error", detail: `directions: ${directionsResult.error}` };
  }
  const directions = Array.isArray(directionsResult.data?.directions)
    ? directionsResult.data.directions
    : [];
  if (directions.length === 0) {
    return { outcome: "empty", detail: `${station}: no directions returned` };
  }

  const direction = directions[0];
  const nextTrainUrl =
    `${BASE}/api/next-train?city=${encodeURIComponent(city.id)}&station=${encodeURIComponent(station)}` +
    `&direction=${encodeURIComponent(direction)}&destination=${encodeURIComponent(direction)}`;
  const nextTrainResult = await fetchJsonSafe(nextTrainUrl);
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

/** Best-of across a city's sampled stations: one working station means the city works. */
const OUTCOME_RANK = { ok: 0, empty: 1, error: 2 };

function bestOutcome(results) {
  return results.reduce((best, cur) => (OUTCOME_RANK[cur.outcome] < OUTCOME_RANK[best.outcome] ? cur : best));
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

  console.log(`prod-sweep: ${BASE} — ${cities.length} live cities, ${now.toISOString()}`);
  console.log("");
  const byStatus = { ok: 0, empty: 0, error: 0, skipped: 0 };
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
    `Summary: ok=${byStatus.ok} empty=${byStatus.empty} error=${byStatus.error} skipped=${byStatus.skipped}`
  );

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
