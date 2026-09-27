/**
 * Sweeps every catalog station's fetchStationBoard() against the live NTA GTFS-RT v2 feed and
 * asserts each one has genuine live coverage — the acceptance test for
 * docs/jim-brief-dublin-connolly-realtime-gap.md (after filtering Connolly out of the catalog,
 * see docs/dublin-d1/jim-handoff.md and lib/cities/dublin/coverage.json) plus
 * docs/jim-brief-dublin-honest-empty-state.md's sweep-semantics update: NTA's TripUpdates feed
 * intermittently omits a stop's stopTimeUpdate rows for a few minutes while service runs (Red
 * Cow/Kylemore findings, docs/dublin-d1/jim-handoff.md 27 Sep entry) — a genuinely empty poll is
 * now acceptable, but ONLY when the board itself carries the honest-empty-state signal
 * (`board.emptyReason === "no-live-predictions"`, i.e. what the rider-facing /api/board ->
 * /api/next-train path would render as "No live predictions for this stop right now" rather than
 * a bare blank board), and never for more than MAX_CONSECUTIVE_EMPTY_POLLS in a row for the same
 * station — a station that stays empty across every poll in that window looks like a real
 * per-station coverage hole (the Connolly shape), not a transient feed gap, and needs a
 * coverage.json verdict rather than silently passing behind the honest-empty banner.
 *
 * Reuses lib/providers/dublin.js's own fetchStationBoard/listCatalogStations — no reimplemented
 * fetch/decode logic. All 66 stations share one underlying NTA TripUpdates fetch per poll (the
 * 20s in-process cache in lib/providers/gtfs/ovapi-tripupdates-cache.js).
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
import { fetchStationBoard, listCatalogStations } from "../lib/providers/dublin.js";
import { readNtaApiKey } from "../lib/providers/gtfs/auth.js";

const POLL_INTERVAL_MS = 30_000;
const MAX_CONSECUTIVE_EMPTY_POLLS = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  console.log(`dublin-all-stations-live-sweep: sweeping ${stations.length} catalog stations across up to ${MAX_CONSECUTIVE_EMPTY_POLLS} polls, ${POLL_INTERVAL_MS / 1000}s apart`);

  const consecutiveEmpty = new Map(stations.map((s) => [s.name, 0]));
  const unconfirmedEmpty = []; // empty but board.emptyReason wasn't set — a bare blank board
  const staleGap = []; // empty on every poll through MAX_CONSECUTIVE_EMPTY_POLLS
  let sawAnyTrips = false;
  let lastErrored = [];

  for (let poll = 1; poll <= MAX_CONSECUTIVE_EMPTY_POLLS; poll += 1) {
    const results = await sweepOnce(stations, apiKey);
    const totalTrips = results.reduce((sum, r) => sum + r.tripCount, 0);
    const errored = results.filter((r) => r.error);
    lastErrored = errored;
    sawAnyTrips = sawAnyTrips || totalTrips > 0;

    console.log(`dublin-all-stations-live-sweep: poll ${poll}/${MAX_CONSECUTIVE_EMPTY_POLLS} — total trips ${totalTrips}`);
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
        consecutiveEmpty.set(r.name, 0);
        continue;
      }
      const nextCount = (consecutiveEmpty.get(r.name) ?? 0) + 1;
      consecutiveEmpty.set(r.name, nextCount);

      if (r.emptyReason !== "no-live-predictions") {
        unconfirmedEmpty.push({ name: r.name, poll });
      }
    }

    if (poll < MAX_CONSECUTIVE_EMPTY_POLLS) {
      await sleep(POLL_INTERVAL_MS);
    }
  }

  for (const [name, count] of consecutiveEmpty.entries()) {
    if (count >= MAX_CONSECUTIVE_EMPTY_POLLS) {
      staleGap.push(name);
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

  if (staleGap.length > 0) {
    throw new Error(
      `dublin-all-stations-live-sweep: ${staleGap.length}/${stations.length} station(s) were empty on ` +
        `every one of ${MAX_CONSECUTIVE_EMPTY_POLLS} consecutive polls (${POLL_INTERVAL_MS / 1000}s apart) ` +
        `— a real per-station coverage gap, same shape as the Connolly bug, needs a coverage.json ` +
        `verdict rather than passing behind the honest-empty banner: ${staleGap.join(", ")}`
    );
  }

  console.log(
    `dublin-all-stations-live-sweep: ok — every catalog station either had live trips or a ` +
      `properly-flagged honest empty state within ${MAX_CONSECUTIVE_EMPTY_POLLS} polls`
  );
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
