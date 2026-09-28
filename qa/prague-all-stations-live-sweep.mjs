/**
 * Sweeps every catalog station's live coverage against the Golemio PID Departure Boards API and
 * asserts each one has genuine live coverage — modelled on
 * qa/dublin-all-stations-live-sweep.mjs (headway-aware threshold, evidence log, runtime cap), but
 * simplified for Prague's feed shape: there is no "unconfirmed empty" bucket here, only "empty"
 * vs "non-empty", and a fixed conservative fallback headway (10 minutes, safe for every line at
 * every time of day metro operates) rather than a per-station GTFS-derived one.
 *
 * BATCHING + PACING (docs/jim-brief-prague-flora-sweep-empty-state.md, Finding A): Mark's QA pass
 * found the previous version issued one Golemio request per station, sequentially, with no
 * pacing — 58 sequential requests every poll blew straight through Golemio's documented 20
 * requests / 8 seconds limit (18-29/58 stations 429'd per poll). This version instead batches
 * every catalog station's stop_ids into requests of <= BATCH_SIZE `ids[]` each (Golemio's own
 * endpoint accepts up to 100 combined — see lib/providers/prague.js file header) and paces every
 * request, across the whole run (not reset per poll), through a token bucket capped at
 * MAX_REQUESTS_PER_WINDOW requests per WINDOW_MS — a deliberate margin under the documented
 * 20/8s limit, not the limit itself. A batch that still gets a 429 is retried exactly once,
 * honouring the response's `Retry-After` header when present (falls back to a fixed backoff
 * otherwise) via lib/providers/prague.js's exported fetchDepartureBoardsJson(), which attaches
 * `.status`/`.retryAfterMs` to the thrown error for exactly this purpose. A batch that still
 * fails after the retry marks every station whose stop_id was in it as errored for this poll —
 * never silently reported as "empty" (a rate-limit failure must never look like "no service").
 *
 * Reuses lib/providers/prague.js's own fetchDepartureBoardsJson/tripsFromDepartures/
 * listCatalogStations — no reimplemented fetch/decode/classification logic (this is the *rider*
 * board pipeline; per-station requests to Golemio, item 2 of the brief, are unchanged — only this
 * QA sweep script fans multiple stations' stop_ids into one request, purely for QA-evidence
 * gathering, never on a rider's actual board request path).
 *
 * PRAGUE METRO OPERATING HOURS: approximately 04:40-00:00 Europe/Prague daily. Outside that
 * window every station legitimately shows zero departures at once — this is skipped, not failed,
 * same as Dublin's late-night gap handling.
 *
 * EVIDENCE LOG (docs/prague-d1/live-sweep-log.jsonl, append-only JSONL, same shape as
 * docs/dublin-d1/live-sweep-log.jsonl): a station continuously empty for >= 1.5x the fallback
 * headway THIS run is only a permanent-shape failure if it has never been observed non-empty in
 * the last EVIDENCE_WINDOW_DAYS days of logged runs — the Dublin Broombridge lesson (a long
 * intermittent gap is not the same as a permanent one). Flora was removed from the catalog
 * entirely (docs/jim-brief-prague-flora-sweep-empty-state.md, confirmed real zero-service gap,
 * not a mapping bug — see lib/providers/prague.js file header and
 * lib/cities/prague/coverage.json), so it is never swept here.
 *
 * Requires a real GOLEMIO_API_KEY (run with `node --env-file=.env.local
 * qa/prague-all-stations-live-sweep.mjs`). NOT registered in qa/run-all.mjs for the same reason
 * qa/dublin-all-stations-live-sweep.mjs isn't (needs a real key + live network + real service
 * hours, none of which a smoke/CI run can guarantee). Mark can rerun it directly during Prague
 * metro service hours.
 *
 * Usage: node --env-file=.env.local qa/prague-all-stations-live-sweep.mjs
 */
import { existsSync, readFileSync, appendFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  fetchDepartureBoardsJson,
  tripsFromDepartures,
  listCatalogStations,
} from "../lib/providers/prague.js";
import { readGolemioApiKey } from "../lib/providers/gtfs/auth.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_LOG_PATH = join(ROOT, "docs/prague-d1/live-sweep-log.jsonl");
const EVIDENCE_WINDOW_DAYS = 7;

const FALLBACK_HEADWAY_MINUTES = 10;
const REQUIRED_EMPTY_MULTIPLE = 1.5;
const POLL_INTERVAL_MS = 60_000;
// Bounded well under common CI/tool foreground-command ceilings (e.g. a 10-minute Bash timeout)
// — a script that only finishes by being auto-backgrounded defeats "explicit progress lines,
// exits" (same lesson as Dublin's sweep, per this task's brief).
const MAX_RUNTIME_MS = 9 * 60 * 1000;
const MAX_POLLS = Math.max(2, Math.floor(MAX_RUNTIME_MS / POLL_INTERVAL_MS));

// Golemio's documented limit is 20 requests / 8 seconds per key; this stays under it with margin
// so pacing jitter (system clock, GC pauses) never itself causes a 429.
const MAX_REQUESTS_PER_WINDOW = 15;
const WINDOW_MS = 8_000;
// Golemio's departureboards endpoint accepts up to 100 combined `ids[]` per request; batching
// stays under that with margin too.
const BATCH_SIZE = 50;
const DEFAULT_RETRY_BACKOFF_MS = 8_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/** Sliding-window token bucket, shared across the whole run (not reset per poll) — Golemio's rate
 * limit is a real-time window, not a per-poll allowance. */
class TokenBucket {
  constructor(maxPerWindow, windowMs) {
    this.max = maxPerWindow;
    this.windowMs = windowMs;
    this.timestamps = [];
  }

  async acquire() {
    for (;;) {
      const now = Date.now();
      this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
      if (this.timestamps.length < this.max) {
        this.timestamps.push(now);
        return;
      }
      const oldest = this.timestamps[0];
      const waitMs = this.windowMs - (now - oldest) + 10;
      await sleep(Math.max(waitMs, 10));
    }
  }
}

async function fetchChunkWithRetry(stopIds, apiKey, bucket) {
  await bucket.acquire();
  try {
    return await fetchDepartureBoardsJson(stopIds, apiKey);
  } catch (error) {
    if (error?.status !== 429) {
      throw error;
    }
    const waitMs = error.retryAfterMs ?? DEFAULT_RETRY_BACKOFF_MS;
    console.log(
      `prague-all-stations-live-sweep: 429 for a batch of ${stopIds.length} stop_id(s), retrying ` +
        `once after ${Math.round(waitMs / 1000)}s (Retry-After ${error.retryAfterMs != null ? "honoured" : "absent, using default backoff"})`
    );
    await sleep(waitMs);
    await bucket.acquire();
    return await fetchDepartureBoardsJson(stopIds, apiKey);
  }
}

/** Reads docs/prague-d1/live-sweep-log.jsonl and returns the set of station names observed
 * non-empty in any run entry timestamped within the last EVIDENCE_WINDOW_DAYS days. */
function readHistoricalNonEmptyStations(now) {
  const seen = new Set();
  if (!existsSync(EVIDENCE_LOG_PATH)) {
    return seen;
  }
  const cutoffMs = now.getTime() - EVIDENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const raw = readFileSync(EVIDENCE_LOG_PATH, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let entry;
    try {
      entry = JSON.parse(trimmed);
    } catch {
      continue;
    }
    const ts = Date.parse(entry?.timestamp);
    if (!Number.isFinite(ts) || ts < cutoffMs) {
      continue;
    }
    for (const station of entry?.stations ?? []) {
      if (station?.observedNonEmpty && station?.name) {
        seen.add(station.name);
      }
    }
  }
  return seen;
}

/** Appends one JSONL evidence record for this run — never rewrites/truncates prior entries. */
function appendEvidenceLogEntry(entry) {
  appendFileSync(EVIDENCE_LOG_PATH, `${JSON.stringify(entry)}\n`, "utf8");
}

async function sweepOnce(stations, apiKey, bucket) {
  const stopIdToStation = new Map();
  for (const station of stations) {
    for (const stopId of station.stopIds ?? []) {
      stopIdToStation.set(stopId, station.name);
    }
  }
  const allStopIds = [...stopIdToStation.keys()];
  const batches = chunk(allStopIds, BATCH_SIZE);

  const departuresByStation = new Map(stations.map((s) => [s.name, []]));
  const erroredStations = new Map();

  for (const batch of batches) {
    try {
      const departures = await fetchChunkWithRetry(batch, apiKey, bucket);
      for (const departure of departures) {
        const stopId = departure?.stop?.id;
        const stationName = stopId != null ? stopIdToStation.get(stopId) : undefined;
        if (stationName) {
          departuresByStation.get(stationName).push(departure);
        }
      }
    } catch (error) {
      const message = error?.message ?? String(error);
      for (const stopId of batch) {
        const stationName = stopIdToStation.get(stopId);
        if (stationName) {
          erroredStations.set(stationName, message);
        }
      }
    }
  }

  const results = [];
  for (const station of stations) {
    if (erroredStations.has(station.name)) {
      results.push({ name: station.name, tripCount: 0, error: erroredStations.get(station.name) });
      continue;
    }
    const departures = departuresByStation.get(station.name) ?? [];
    const trips = tripsFromDepartures(departures, station.name);
    results.push({ name: station.name, tripCount: trips.length, error: null });
  }
  return results;
}

async function main() {
  const apiKey = readGolemioApiKey();
  if (!apiKey) {
    console.log("prague-all-stations-live-sweep: skipped: no key (GOLEMIO_API_KEY not set)");
    process.exit(0);
    return;
  }

  const stations = listCatalogStations();
  const now = new Date();
  const bucket = new TokenBucket(MAX_REQUESTS_PER_WINDOW, WINDOW_MS);

  const totalStopIds = stations.reduce((sum, s) => sum + (s.stopIds?.length ?? 0), 0);
  const batchCount = Math.ceil(totalStopIds / BATCH_SIZE);
  console.log(
    `prague-all-stations-live-sweep: sweeping ${stations.length} catalog stations ` +
      `(${totalStopIds} stop_ids in ${batchCount} batch(es) of <= ${BATCH_SIZE} per poll, paced ` +
      `to <= ${MAX_REQUESTS_PER_WINDOW} requests / ${Math.round(WINDOW_MS / 1000)}s), fallback ` +
      `headway ${FALLBACK_HEADWAY_MINUTES}min (fail at >= ${REQUIRED_EMPTY_MULTIPLE}x continuous ` +
      `empty), polls every ${Math.round(POLL_INTERVAL_MS / 1000)}s, up to ${MAX_POLLS} polls ` +
      `(runtime capped at ${Math.round(MAX_RUNTIME_MS / 60_000)} min)`
  );

  const historicalNonEmpty = readHistoricalNonEmptyStations(now);
  const requiredEmptyMs = FALLBACK_HEADWAY_MINUTES * REQUIRED_EMPTY_MULTIPLE * 60_000;

  const emptySinceMs = new Map(stations.map((s) => [s.name, null]));
  const nonEmptyPollCounts = new Map(stations.map((s) => [s.name, 0]));
  const totalPollCounts = new Map(stations.map((s) => [s.name, 0]));
  let sawAnyTrips = false;
  let lastErrored = [];
  let totalRateLimitErrors = 0;

  for (let poll = 1; poll <= MAX_POLLS; poll += 1) {
    const results = await sweepOnce(stations, apiKey, bucket);
    const totalTrips = results.reduce((sum, r) => sum + r.tripCount, 0);
    const errored = results.filter((r) => r.error);
    lastErrored = errored;
    totalRateLimitErrors += errored.filter((r) => /HTTP 429/.test(r.error ?? "")).length;
    sawAnyTrips = sawAnyTrips || totalTrips > 0;

    console.log(`prague-all-stations-live-sweep: poll ${poll}/${MAX_POLLS} — total trips ${totalTrips}`);
    if (errored.length) {
      console.log(`prague-all-stations-live-sweep: ${errored.length} station(s) errored this poll:`);
      for (const r of errored) console.log(`  ${r.name}: ${r.error}`);
    }

    // Outside metro service hours (~04:40-00:00 Europe/Prague), or a genuine feed-wide outage,
    // EVERY station legitimately shows zero trips at once — not a per-station gap.
    if (totalTrips === 0 && errored.length === 0 && poll === 1) {
      console.log(
        "prague-all-stations-live-sweep: skipped: 0 trips across all stations on the first poll — " +
          "outside Prague Metro service hours (~04:40-00:00 Europe/Prague), or a feed-wide outage. " +
          "Re-run during Prague daytime/evening service."
      );
      process.exit(0);
      return;
    }

    for (const r of results) {
      if (r.error) continue;
      totalPollCounts.set(r.name, (totalPollCounts.get(r.name) ?? 0) + 1);
      if (r.tripCount > 0) {
        nonEmptyPollCounts.set(r.name, (nonEmptyPollCounts.get(r.name) ?? 0) + 1);
        emptySinceMs.set(r.name, null);
      } else if (emptySinceMs.get(r.name) == null) {
        emptySinceMs.set(r.name, Date.now());
      }
    }

    if (poll < MAX_POLLS) {
      await sleep(POLL_INTERVAL_MS);
    }
  }

  const runEndMs = Date.now();
  const staleGap = [];
  const intermittentLong = [];
  const uncertain = [];
  for (const [name, since] of emptySinceMs.entries()) {
    if (since == null) {
      continue;
    }
    const observedMs = runEndMs - since;
    if (observedMs >= requiredEmptyMs) {
      const record = { name, observedMinutes: Math.round(observedMs / 60_000) };
      if (historicalNonEmpty.has(name)) {
        intermittentLong.push(record);
      } else {
        staleGap.push(record);
      }
    } else {
      uncertain.push({ name, observedMinutes: Math.round(observedMs / 60_000) });
    }
  }

  const evidenceStations = stations.map((s) => ({
    name: s.name,
    totalPolls: totalPollCounts.get(s.name) ?? 0,
    nonEmptyPolls: nonEmptyPollCounts.get(s.name) ?? 0,
    observedNonEmpty: (nonEmptyPollCounts.get(s.name) ?? 0) > 0,
  }));
  appendEvidenceLogEntry({
    runId: `sweep-${new Date(runEndMs).toISOString()}`,
    timestamp: new Date(runEndMs).toISOString(),
    source: "qa/prague-all-stations-live-sweep.mjs",
    rateLimitErrors: totalRateLimitErrors,
    stations: evidenceStations,
  });

  console.log(`prague-all-stations-live-sweep: total rate-limit (429) errors across the run: ${totalRateLimitErrors}`);

  if (!sawAnyTrips && lastErrored.length === 0) {
    console.log(
      "prague-all-stations-live-sweep: skipped: 0 trips across every poll — outside Prague Metro " +
        "service hours, not a per-station gap. Re-run during Prague daytime/evening service."
    );
    process.exit(0);
    return;
  }

  if (lastErrored.length > 0) {
    throw new Error(
      `prague-all-stations-live-sweep: ${lastErrored.length}/${stations.length} station(s) threw ` +
        `an error on the final poll — see above.`
    );
  }

  if (uncertain.length > 0) {
    console.log(
      `prague-all-stations-live-sweep: ${uncertain.length} station(s) were empty for the whole run ` +
        `but did not yet reach the ${REQUIRED_EMPTY_MULTIPLE}x-headway threshold within the ` +
        `${Math.round(MAX_RUNTIME_MS / 60_000)}-min runtime cap — not failed, re-run to confirm: ` +
        `${uncertain.map((u) => `${u.name} (empty ${u.observedMinutes}min)`).join(", ")}`
    );
  }

  if (intermittentLong.length > 0) {
    console.log(
      `prague-all-stations-live-sweep: ${intermittentLong.length} station(s) were continuously ` +
        `empty for >= ${REQUIRED_EMPTY_MULTIPLE}x the fallback headway THIS run, but have been ` +
        `observed non-empty within the last ${EVIDENCE_WINDOW_DAYS} days ` +
        `(docs/prague-d1/live-sweep-log.jsonl) — a long intermittent gap, not permanent: ` +
        `${intermittentLong.map((s) => `${s.name} (empty ${s.observedMinutes}min)`).join(", ")}`
    );
  }

  if (staleGap.length > 0) {
    throw new Error(
      `prague-all-stations-live-sweep: ${staleGap.length}/${stations.length} station(s) were ` +
        `continuously empty for >= ${REQUIRED_EMPTY_MULTIPLE}x the fallback headway AND have never ` +
        `been observed non-empty within the last ${EVIDENCE_WINDOW_DAYS} days ` +
        `(docs/prague-d1/live-sweep-log.jsonl) — a real per-station coverage gap needs a ` +
        `coverage.json verdict rather than passing behind a silent empty board: ` +
        `${staleGap.map((s) => `${s.name} (empty ${s.observedMinutes}min)`).join(", ")}`
    );
  }

  console.log(
    "prague-all-stations-live-sweep: ok — every catalog station either had live trips, a long " +
      "intermittent gap backed by evidence-memory, or is still within its uncertain window"
  );
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
