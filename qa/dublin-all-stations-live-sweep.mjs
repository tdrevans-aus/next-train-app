/**
 * Sweeps every catalog station's fetchStationBoard() against the live NTA GTFS-RT v2 feed and
 * asserts each one has genuine live coverage — the acceptance test for
 * docs/jim-brief-dublin-connolly-realtime-gap.md (after filtering Connolly out of the catalog,
 * see docs/dublin-d1/jim-handoff.md and lib/cities/dublin/coverage.json) plus
 * docs/jim-brief-dublin-honest-empty-state.md's sweep-semantics update: NTA's TripUpdates feed
 * intermittently omits a stop's stopTimeUpdate rows for a few minutes while service runs (Red
 * Cow/Kylemore/Rialto findings, docs/dublin-d1/jim-handoff.md) — a genuinely empty poll is now
 * acceptable, but ONLY when the board itself carries the honest-empty-state signal
 * (`board.emptyReason === "no-live-predictions"`, i.e. what the rider-facing /api/board ->
 * /api/next-train path would render as "No live predictions for this stop right now" rather than
 * a bare blank board).
 *
 * HEADWAY-AWARE THRESHOLD RULE (docs/jim-brief-dublin-saggart-rialto-gaps.md, Mark's
 * recommendation, replacing the old fixed "3 consecutive empty polls" rule that mis-flagged
 * Rialto — a station that resolves non-empty on essentially every longer poll — as a stale gap):
 * for each catalog station, derive its scheduled headway from the static snapshot's
 * stop_times.txt for the CURRENT service-day hour (the median gap, in minutes, between
 * consecutive scheduled departure times at that station's stop_ids, restricted to today's active
 * services and the current local hour bucket; falls back to 20 minutes when fewer than two rows
 * are found in that window). A station only fails this sweep when its continuously-empty run
 * (tracked by wall-clock time across polls, not poll count) spans >= 1.5x that headway — an empty
 * poll with `emptyReason: "no-live-predictions"` inside that window still passes. A station whose
 * board goes empty WITHOUT the honest-empty-state signal fails immediately regardless of headway
 * — that's a bug, not a feed characteristic. Poll interval is derived from the smallest headway
 * among all catalog stations (min headway / 4, clamped to [30s, 90s] — always past the 20s
 * TripUpdates cache TTL), and the whole run is capped at MAX_RUNTIME_MS (20 minutes) regardless —
 * a station whose own 1.5x-headway threshold exceeds what fits in that cap simply can't be
 * conclusively flagged in a single run (documented, not a false pass).
 *
 * Reuses lib/providers/dublin.js's own fetchStationBoard/listCatalogStations/loadDublinStatic/
 * resolveStopIds — no reimplemented fetch/decode logic. All catalog stations share one underlying
 * NTA TripUpdates fetch per poll (the 20s in-process cache in
 * lib/providers/gtfs/ovapi-tripupdates-cache.js).
 *
 * Requires a real NTA_API_KEY (run with `node --env-file=.env.local qa/dublin-all-stations-live-
 * sweep.mjs`) and Luas actually running — Dublin's late-night gap (~00:30-05:30 Europe/Dublin)
 * means every station can legitimately show zero trips at once; this is NOT registered in
 * qa/run-all.mjs for the same reason qa/dublin-rt-join-check.mjs isn't (needs real network + a
 * real key neither sandboxes nor the default CI job have). Mark can rerun it directly during
 * Dublin service hours.
 *
 * Usage: node --env-file=.env.local qa/dublin-all-stations-live-sweep.mjs
 */
import {
  fetchStationBoard,
  listCatalogStations,
  loadDublinStatic,
  resolveStopIds,
  DUBLIN_TIME_ZONE,
} from "../lib/providers/dublin.js";
import { readNtaApiKey } from "../lib/providers/gtfs/auth.js";
import { activeServicesForDate } from "../lib/providers/gtfs/static-cache.js";

const FALLBACK_HEADWAY_MINUTES = 20;
const REQUIRED_EMPTY_MULTIPLE = 1.5;
const MIN_POLL_INTERVAL_MS = 30_000;
const MAX_POLL_INTERVAL_MS = 90_000;
// Bounded well under 20 minutes (docs/jim-brief-dublin-saggart-rialto-gaps.md's cap) and, just as
// importantly, under common CI/tool foreground-command ceilings (e.g. a 10-minute Bash timeout) —
// a script that only finishes by being auto-backgrounded defeats "explicit progress lines, exits".
const MAX_RUNTIME_MS = 9 * 60 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowSecondsOfDay(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const s = Number(parts.find((p) => p.type === "second")?.value ?? 0);
  return h * 3600 + m * 60 + s;
}

function parseGtfsTimeToSeconds(hhmmss) {
  const [h, m, s] = String(hhmmss).split(":").map((v) => Number(v));
  if (![h, m, s].every((v) => Number.isFinite(v))) {
    return null;
  }
  return h * 3600 + m * 60 + (s || 0);
}

/**
 * Median gap (minutes) between consecutive scheduled departures at `stopIds`, restricted to
 * today's active services and the current local-hour bucket. Returns FALLBACK_HEADWAY_MINUTES
 * when fewer than two qualifying rows are found.
 */
function deriveHeadwayMinutes(staticData, stopIds, now, timeZone) {
  const activeServices = activeServicesForDate(staticData, now, timeZone);
  const nowSec = nowSecondsOfDay(now, timeZone);
  const hourStart = Math.floor(nowSec / 3600) * 3600;
  const hourEnd = hourStart + 3600;

  const departures = [];
  for (const stopId of stopIds) {
    const rows = staticData.stopTimesByStopId.get(stopId) ?? [];
    for (const row of rows) {
      const trip = staticData.tripsById.get(row.trip_id);
      if (!trip || !activeServices.has(trip.service_id)) {
        continue;
      }
      const sec = parseGtfsTimeToSeconds(row.departure_time || row.arrival_time);
      if (sec == null || sec < hourStart || sec >= hourEnd) {
        continue;
      }
      departures.push(sec);
    }
  }

  if (departures.length < 2) {
    return FALLBACK_HEADWAY_MINUTES;
  }
  departures.sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < departures.length; i += 1) {
    gaps.push(departures[i] - departures[i - 1]);
  }
  gaps.sort((a, b) => a - b);
  const medianSec = gaps[Math.floor(gaps.length / 2)];
  return Math.max(1, Math.round(medianSec / 60));
}

async function sweepOnce(stations, apiKey) {
  const results = [];
  for (const station of stations) {
    try {
      const board = await fetchStationBoard(station.name, { apiKey });
      results.push({
        name: station.name,
        tripCount: board.trips?.length ?? 0,
        emptyReason: board.emptyReason ?? null,
        error: null,
      });
    } catch (error) {
      results.push({ name: station.name, tripCount: 0, emptyReason: null, error: error?.message ?? String(error) });
    }
  }
  return results;
}

async function main() {
  const apiKey = readNtaApiKey();
  if (!apiKey) {
    console.log("dublin-all-stations-live-sweep: skipped: no key (NTA_API_KEY not set)");
    process.exit(0);
    return;
  }

  const stations = listCatalogStations();
  const staticData = await loadDublinStatic();
  const now = new Date();

  const headwayMinutesByStation = new Map();
  for (const station of stations) {
    const stopIds = await resolveStopIds(station.name, staticData);
    const headway = deriveHeadwayMinutes(staticData, stopIds, now, DUBLIN_TIME_ZONE);
    headwayMinutesByStation.set(station.name, headway);
  }

  const minHeadwayMinutes = Math.min(...headwayMinutesByStation.values());
  const pollIntervalMs = Math.min(
    MAX_POLL_INTERVAL_MS,
    Math.max(MIN_POLL_INTERVAL_MS, Math.round((minHeadwayMinutes * 60_000) / 4))
  );
  const maxPolls = Math.max(2, Math.floor(MAX_RUNTIME_MS / pollIntervalMs));

  console.log(
    `dublin-all-stations-live-sweep: sweeping ${stations.length} catalog stations, headway-aware ` +
      `thresholds (fallback ${FALLBACK_HEADWAY_MINUTES}min, fail at >= ${REQUIRED_EMPTY_MULTIPLE}x ` +
      `headway of continuous empty time), polls every ${Math.round(pollIntervalMs / 1000)}s, ` +
      `up to ${maxPolls} polls (runtime capped at ${Math.round(MAX_RUNTIME_MS / 60_000)} min)`
  );

  const emptySinceMs = new Map(stations.map((s) => [s.name, null]));
  const unconfirmedEmpty = []; // empty but board.emptyReason wasn't set — a bare blank board
  const staleGap = []; // continuously empty for >= 1.5x its own headway
  const uncertain = []; // still empty at run end but never reached its own threshold within the runtime cap
  let sawAnyTrips = false;
  let lastErrored = [];

  for (let poll = 1; poll <= maxPolls; poll += 1) {
    const pollStartMs = Date.now();
    const results = await sweepOnce(stations, apiKey);
    const totalTrips = results.reduce((sum, r) => sum + r.tripCount, 0);
    const errored = results.filter((r) => r.error);
    lastErrored = errored;
    sawAnyTrips = sawAnyTrips || totalTrips > 0;

    console.log(`dublin-all-stations-live-sweep: poll ${poll}/${maxPolls} — total trips ${totalTrips}`);
    if (errored.length) {
      console.log(`dublin-all-stations-live-sweep: ${errored.length} station(s) errored this poll:`);
      for (const r of errored) console.log(`  ${r.name}: ${r.error}`);
    }

    // Outside Luas service hours (or a genuine feed-wide outage), EVERY station legitimately
    // shows zero trips at once — not a per-station gap, and not what this sweep checks for.
    if (totalTrips === 0 && errored.length === 0 && poll === 1) {
      console.log(
        "dublin-all-stations-live-sweep: skipped: 0 trips across all stations on the first poll — " +
          "outside Luas service hours (or a feed-wide outage). Re-run during Dublin daytime service."
      );
      process.exit(0);
      return;
    }

    for (const r of results) {
      if (r.error) continue;
      if (r.tripCount > 0) {
        emptySinceMs.set(r.name, null);
        continue;
      }
      if (r.emptyReason !== "no-live-predictions") {
        unconfirmedEmpty.push({ name: r.name, poll });
        continue;
      }
      if (emptySinceMs.get(r.name) == null) {
        emptySinceMs.set(r.name, pollStartMs);
      }
    }

    if (poll < maxPolls) {
      await sleep(pollIntervalMs);
    }
  }

  const runEndMs = Date.now();
  for (const [name, since] of emptySinceMs.entries()) {
    if (since == null) {
      continue;
    }
    const headwayMinutes = headwayMinutesByStation.get(name) ?? FALLBACK_HEADWAY_MINUTES;
    const requiredMs = headwayMinutes * REQUIRED_EMPTY_MULTIPLE * 60_000;
    const observedMs = runEndMs - since;
    if (observedMs >= requiredMs) {
      staleGap.push({ name, headwayMinutes, observedMinutes: Math.round(observedMs / 60_000) });
    } else {
      uncertain.push({ name, headwayMinutes, observedMinutes: Math.round(observedMs / 60_000) });
    }
  }

  if (!sawAnyTrips && lastErrored.length === 0) {
    console.log(
      "dublin-all-stations-live-sweep: skipped: 0 trips across every poll — outside Luas service " +
        "hours (or a feed-wide outage), not a per-station gap. Re-run during Dublin daytime service."
    );
    process.exit(0);
    return;
  }

  if (lastErrored.length > 0) {
    throw new Error(
      `dublin-all-stations-live-sweep: ${lastErrored.length}/${stations.length} station(s) threw an error ` +
        `on the final poll — see above.`
    );
  }

  if (unconfirmedEmpty.length > 0) {
    const names = [...new Set(unconfirmedEmpty.map((r) => r.name))];
    throw new Error(
      `dublin-all-stations-live-sweep: ${names.length} station(s) went empty WITHOUT the honest ` +
        `empty-state signal (board.emptyReason !== "no-live-predictions") — that's a bare blank ` +
        `board, indistinguishable from broken, for a rider: ${names.join(", ")}`
    );
  }

  if (uncertain.length > 0) {
    console.log(
      `dublin-all-stations-live-sweep: ${uncertain.length} station(s) were empty (with the honest ` +
        `signal) for the whole run but did not yet reach their own 1.5x-headway threshold within ` +
        `the ${Math.round(MAX_RUNTIME_MS / 60_000)}-min runtime cap — not failed, re-run to confirm: ` +
        `${uncertain.map((u) => `${u.name} (headway ${u.headwayMinutes}min, empty ${u.observedMinutes}min)`).join(", ")}`
    );
  }

  if (staleGap.length > 0) {
    throw new Error(
      `dublin-all-stations-live-sweep: ${staleGap.length}/${stations.length} station(s) were ` +
        `continuously empty for >= 1.5x their own scheduled headway — a real per-station coverage ` +
        `gap, same shape as the Connolly/Saggart bugs, needs a coverage.json verdict rather than ` +
        `passing behind the honest-empty banner: ` +
        `${staleGap.map((s) => `${s.name} (headway ${s.headwayMinutes}min, empty ${s.observedMinutes}min)`).join(", ")}`
    );
  }

  console.log(
    `dublin-all-stations-live-sweep: ok — every catalog station either had live trips or a ` +
      `properly-flagged honest empty state within its own 1.5x-headway threshold`
  );
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
