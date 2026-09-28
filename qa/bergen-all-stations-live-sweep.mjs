/**
 * Sweeps every catalog station's fetchStationBoard() against the live Entur Journey Planner
 * v3 GraphQL endpoint and asserts each one has genuine live coverage. Modeled on
 * qa/dublin-all-stations-live-sweep.mjs (headway-aware threshold, evidence log, runtime cap)
 * but simplified for Bergen's shape:
 *
 *  - No API key gate: Entur is a keyless NLOD open service (ET-Client-Name is an identifying
 *    header, not a secret) — this sweep always attempts the live call, unlike Dublin's
 *    NTA_API_KEY-gated skip.
 *  - No "honest empty-state signal" distinction: lib/providers/bergen.js's fetchStationBoard()
 *    does not carry Dublin's `emptyReason: "no-live-predictions"` field (that exists because
 *    Dublin joins a separate static schedule against a GTFS-RT feed that can independently omit
 *    a stop's real-time rows; Entur's estimatedCalls already blends scheduled + realtime in one
 *    call, so an empty response here means no upcoming departure in the query window, full
 *    stop) — a station empty across the whole run either means outside-service-hours (handled
 *    below, same as Dublin) or a genuine per-station gap worth flagging.
 *  - No GTFS-derived headway: docs/bergen-d1/hazard-pack.md explicitly says D1 is hand-
 *    transcribed timetables, not GTFS-derived, and this pass does not fetch a static Bergen
 *    GTFS feed — every station uses the same FALLBACK_HEADWAY_MINUTES rather than a per-station
 *    derived value (a conservative choice: a real per-station headway would very likely be
 *    tighter for the busy shared trunk and looser for the airport-corridor tail, but a single
 *    shared fallback never falsely fails a station for having a flagged-early empty run).
 *
 * Requires no key. Not registered in qa/run-all.mjs — needs real network and Bybanen actually
 * running (Bergen's late-night gap, ~01:00-05:00 Europe/Oslo, means every station can
 * legitimately show zero trips at once). Mark can rerun it directly during Bergen service
 * hours: node qa/bergen-all-stations-live-sweep.mjs
 */
import { appendFileSync, existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { fetchStationBoard, listCatalogStations } from "../lib/providers/bergen.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_LOG_PATH = join(ROOT, "docs/bergen-d1/live-sweep-log.jsonl");
const EVIDENCE_WINDOW_DAYS = 7;

const FALLBACK_HEADWAY_MINUTES = 20;
const REQUIRED_EMPTY_MULTIPLE = 1.5;
const POLL_INTERVAL_MS = 60_000; // Bybanen headways are >=~5min even at the busy trunk; no need to poll faster than Dublin's floor.
// Bounded well under common CI/tool foreground-command ceilings (e.g. a 10-minute Bash timeout).
const MAX_RUNTIME_MS = 9 * 60 * 1000;
const MAX_POLLS = Math.max(2, Math.floor(MAX_RUNTIME_MS / POLL_INTERVAL_MS));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reads docs/bergen-d1/live-sweep-log.jsonl (append-only, one JSON object per run) and returns
 * the set of station names observed non-empty in any run entry timestamped within the last
 * EVIDENCE_WINDOW_DAYS days of `now`. Malformed lines are skipped rather than failing the
 * sweep — evidence memory is a refinement on top of the live poll, never a hard dependency
 * (same shape as Dublin's qa/dublin-all-stations-live-sweep.mjs).
 */
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

async function sweepOnce(stations) {
  const results = [];
  for (const station of stations) {
    try {
      const board = await fetchStationBoard(station.name);
      results.push({ name: station.name, tripCount: board.trips?.length ?? 0, error: null });
    } catch (error) {
      results.push({ name: station.name, tripCount: 0, error: error?.message ?? String(error) });
    }
  }
  return results;
}

async function main() {
  const stations = listCatalogStations();
  const now = new Date();

  console.log(
    `bergen-all-stations-live-sweep: sweeping ${stations.length} catalog stations against the ` +
      `live Entur Journey Planner v3 endpoint, fallback headway ${FALLBACK_HEADWAY_MINUTES}min ` +
      `(fail at >= ${REQUIRED_EMPTY_MULTIPLE}x continuous empty time), polling every ` +
      `${Math.round(POLL_INTERVAL_MS / 1000)}s, up to ${MAX_POLLS} polls (runtime capped at ` +
      `${Math.round(MAX_RUNTIME_MS / 60_000)} min)`
  );

  const historicalNonEmpty = readHistoricalNonEmptyStations(now);
  const requiredEmptyMs = FALLBACK_HEADWAY_MINUTES * REQUIRED_EMPTY_MULTIPLE * 60_000;

  const emptySinceMs = new Map(stations.map((s) => [s.name, null]));
  const nonEmptyPollCounts = new Map(stations.map((s) => [s.name, 0]));
  const totalPollCounts = new Map(stations.map((s) => [s.name, 0]));
  const staleGap = []; // continuously empty for >= threshold AND never observed non-empty (permanent)
  const intermittentLong = []; // continuously empty for >= threshold THIS run but seen non-empty in the evidence window
  const uncertain = []; // still empty at run end but did not yet reach the threshold within the runtime cap
  let sawAnyTrips = false;
  let lastErrored = [];

  for (let poll = 1; poll <= MAX_POLLS; poll += 1) {
    const pollStartMs = Date.now();
    const results = await sweepOnce(stations);
    const totalTrips = results.reduce((sum, r) => sum + r.tripCount, 0);
    const errored = results.filter((r) => r.error);
    lastErrored = errored;
    sawAnyTrips = sawAnyTrips || totalTrips > 0;

    console.log(`bergen-all-stations-live-sweep: poll ${poll}/${MAX_POLLS} — total trips ${totalTrips}`);
    if (errored.length) {
      console.log(`bergen-all-stations-live-sweep: ${errored.length} station(s) errored this poll:`);
      for (const r of errored) console.log(`  ${r.name}: ${r.error}`);
    }

    // Outside Bybanen service hours (~01:00-05:00 Europe/Oslo) or a genuine feed-wide outage,
    // EVERY station legitimately shows zero trips at once — not a per-station gap.
    if (totalTrips === 0 && errored.length === 0 && poll === 1) {
      console.log(
        "bergen-all-stations-live-sweep: skipped: 0 trips across all stations on the first poll " +
          "— outside Bybanen service hours (or a feed-wide outage). Re-run during Bergen daytime service."
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
        continue;
      }
      if (emptySinceMs.get(r.name) == null) {
        emptySinceMs.set(r.name, pollStartMs);
      }
    }

    if (poll < MAX_POLLS) {
      await sleep(POLL_INTERVAL_MS);
    }
  }

  const runEndMs = Date.now();
  for (const [name, since] of emptySinceMs.entries()) {
    if (since == null) {
      continue;
    }
    const observedMs = runEndMs - since;
    if (observedMs >= requiredEmptyMs) {
      const record = { name, headwayMinutes: FALLBACK_HEADWAY_MINUTES, observedMinutes: Math.round(observedMs / 60_000) };
      if (historicalNonEmpty.has(name)) {
        intermittentLong.push(record);
      } else {
        staleGap.push(record);
      }
    } else {
      uncertain.push({ name, headwayMinutes: FALLBACK_HEADWAY_MINUTES, observedMinutes: Math.round(observedMs / 60_000) });
    }
  }

  // Append this run's evidence regardless of pass/fail outcome below — the log is what lets a
  // FUTURE run tell a long intermittent gap apart from a permanent one.
  const evidenceStations = stations.map((s) => {
    const since = emptySinceMs.get(s.name);
    return {
      name: s.name,
      headwayMinutes: FALLBACK_HEADWAY_MINUTES,
      totalPolls: totalPollCounts.get(s.name) ?? 0,
      nonEmptyPolls: nonEmptyPollCounts.get(s.name) ?? 0,
      emptyRunSeconds: since == null ? 0 : Math.round((runEndMs - since) / 1000),
      observedNonEmpty: (nonEmptyPollCounts.get(s.name) ?? 0) > 0,
    };
  });
  appendEvidenceLogEntry({
    runId: `sweep-${new Date(runEndMs).toISOString()}`,
    timestamp: new Date(runEndMs).toISOString(),
    source: "qa/bergen-all-stations-live-sweep.mjs",
    stations: evidenceStations,
  });

  if (!sawAnyTrips && lastErrored.length === 0) {
    console.log(
      "bergen-all-stations-live-sweep: skipped: 0 trips across every poll — outside Bybanen " +
        "service hours (or a feed-wide outage), not a per-station gap. Re-run during Bergen daytime service."
    );
    process.exit(0);
    return;
  }

  if (lastErrored.length > 0) {
    throw new Error(
      `bergen-all-stations-live-sweep: ${lastErrored.length}/${stations.length} station(s) threw an ` +
        `error on the final poll — see above.`
    );
  }

  if (uncertain.length > 0) {
    console.log(
      `bergen-all-stations-live-sweep: ${uncertain.length} station(s) were empty the whole run but ` +
        `did not yet reach the ${REQUIRED_EMPTY_MULTIPLE}x-headway threshold within the ` +
        `${Math.round(MAX_RUNTIME_MS / 60_000)}-min runtime cap — not failed, re-run to confirm: ` +
        `${uncertain.map((u) => `${u.name} (empty ${u.observedMinutes}min)`).join(", ")}`
    );
  }

  if (intermittentLong.length > 0) {
    console.log(
      `bergen-all-stations-live-sweep: ${intermittentLong.length} station(s) were continuously ` +
        `empty for >= ${REQUIRED_EMPTY_MULTIPLE}x the fallback headway THIS run, but have been ` +
        `observed non-empty within the last ${EVIDENCE_WINDOW_DAYS} days ` +
        `(docs/bergen-d1/live-sweep-log.jsonl) — a long intermittent gap, not permanent: ` +
        `${intermittentLong.map((s) => `${s.name} (empty ${s.observedMinutes}min)`).join(", ")}`
    );
  }

  if (staleGap.length > 0) {
    throw new Error(
      `bergen-all-stations-live-sweep: ${staleGap.length}/${stations.length} station(s) were ` +
        `continuously empty for >= ${REQUIRED_EMPTY_MULTIPLE}x the fallback headway AND have never ` +
        `been observed non-empty within the last ${EVIDENCE_WINDOW_DAYS} days ` +
        `(docs/bergen-d1/live-sweep-log.jsonl) — a real per-station coverage gap, needs a ` +
        `coverage.json verdict rather than passing silently: ` +
        `${staleGap.map((s) => `${s.name} (empty ${s.observedMinutes}min)`).join(", ")}`
    );
  }

  console.log(
    "bergen-all-stations-live-sweep: ok — every catalog station either had live trips or an " +
      "evidence-backed long intermittent gap, none permanently empty"
  );
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
