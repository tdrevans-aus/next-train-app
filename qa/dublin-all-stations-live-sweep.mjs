/**
 * Sweeps every catalog station's fetchStationBoard() against the live NTA GTFS-RT v2 feed and
 * asserts each one returns >= 1 trip — the acceptance test for
 * docs/jim-brief-dublin-connolly-realtime-gap.md: after filtering Connolly out of the catalog
 * (no stopTimeUpdate for either of its stop_ids anywhere in the live feed, confirmed 27 Sep 2026,
 * see docs/dublin-d1/jim-handoff.md and lib/cities/dublin/coverage.json), every remaining
 * station should genuinely have live coverage.
 *
 * Reuses lib/providers/dublin.js's own fetchStationBoard/listCatalogStations — no reimplemented
 * fetch/decode logic. All 66 stations share one underlying NTA TripUpdates fetch per run (the
 * 20s in-process cache in lib/providers/gtfs/ovapi-tripupdates-cache.js), so this sweep makes at
 * most one real network call to NTA regardless of catalog size.
 *
 * Requires a real NTA_API_KEY (run with `node --env-file=.env.local qa/dublin-all-stations-live-
 * sweep.mjs`) and Luas actually running — Dublin's late-night gap (~00:30-05:30 Europe/Dublin)
 * means every station can legitimately show zero trips at once; this is NOT registered in
 * qa/run-all.mjs for the same reason qa/dublin-rt-join-check.mjs isn't (needs real network + a
 * real key neither sandboxes nor the default CI job have). Mark can rerun it directly during
 * Dublin service hours.
 *
 * Usage: node qa/dublin-all-stations-live-sweep.mjs
 */
import { fetchStationBoard, listCatalogStations } from "../lib/providers/dublin.js";
import { readNtaApiKey } from "../lib/providers/gtfs/auth.js";
import { OVAPI_TRIPUPDATES_CACHE_TTL_MS } from "../lib/providers/gtfs/ovapi-tripupdates-cache.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sweepOnce(stations, apiKey) {
  const results = [];
  for (const station of stations) {
    try {
      const board = await fetchStationBoard(station.name, { apiKey });
      results.push({ name: station.name, tripCount: board.trips?.length ?? 0, error: null });
    } catch (error) {
      results.push({ name: station.name, tripCount: 0, error: error?.message ?? String(error) });
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
  console.log(`dublin-all-stations-live-sweep: sweeping ${stations.length} catalog stations`);

  let results = await sweepOnce(stations, apiKey);
  let empty = results.filter((r) => !r.error && r.tripCount === 0);

  // A low-frequency terminus can legitimately show 0 trips on a single poll if the NTA feed
  // hasn't yet pushed a stopTimeUpdate for its next scheduled departure (confirmed live, 27 Sep
  // 2026: Brides Glen went empty -> non-empty across two polls ~2 minutes apart with no code
  // change — a normal RT-prediction-horizon effect, not a per-station gap like Connolly's, which
  // stayed at zero across every poll and every crossing trip). One retry, past the 20s
  // TripUpdates cache TTL, before treating a station as a real gap.
  if (empty.length > 0) {
    console.log(
      `dublin-all-stations-live-sweep: ${empty.length} station(s) empty on first poll ` +
        `(${empty.map((r) => r.name).join(", ")}) — waiting past the ${OVAPI_TRIPUPDATES_CACHE_TTL_MS / 1000}s ` +
        `TripUpdates cache TTL for one retry poll before judging`
    );
    await sleep(OVAPI_TRIPUPDATES_CACHE_TTL_MS + 2000);
    const retryStations = stations.filter((s) => empty.some((r) => r.name === s.name));
    const retryResults = await sweepOnce(retryStations, apiKey);
    const retryByName = new Map(retryResults.map((r) => [r.name, r]));
    results = results.map((r) => (retryByName.has(r.name) ? retryByName.get(r.name) : r));
    empty = results.filter((r) => !r.error && r.tripCount === 0);
  }

  const totalTrips = results.reduce((sum, r) => sum + r.tripCount, 0);
  const errored = results.filter((r) => r.error);

  console.log(`dublin-all-stations-live-sweep: total trips across all stations this poll: ${totalTrips}`);
  if (errored.length) {
    console.log(`dublin-all-stations-live-sweep: ${errored.length} station(s) errored:`);
    for (const r of errored) console.log(`  ${r.name}: ${r.error}`);
  }

  // Outside Luas service hours (or a genuine feed outage), EVERY station legitimately shows zero
  // trips at once — that is not this station's fault and not what this sweep is checking for.
  // Skip gracefully rather than fail in that case, per the brief.
  if (totalTrips === 0 && errored.length === 0) {
    console.log(
      "dublin-all-stations-live-sweep: skipped: 0 trips across all stations — outside Luas service " +
        "hours (or a feed-wide outage), not a per-station gap. Re-run during Dublin daytime service."
    );
    process.exit(0);
    return;
  }

  if (errored.length > 0) {
    throw new Error(
      `dublin-all-stations-live-sweep: ${errored.length}/${stations.length} station(s) threw an error ` +
        `during a live poll with real trips elsewhere in the network (total ${totalTrips}) — see above.`
    );
  }

  if (empty.length > 0) {
    throw new Error(
      `dublin-all-stations-live-sweep: ${empty.length}/${stations.length} station(s) returned an empty ` +
        `board while other stations had live trips (total ${totalTrips}) — a real per-station coverage ` +
        `gap, same shape as the Connolly bug this sweep guards against: ` +
        `${empty.map((r) => r.name).join(", ")}`
    );
  }

  console.log(
    `dublin-all-stations-live-sweep: ok — all ${stations.length} catalog stations returned >= 1 trip ` +
      `(total ${totalTrips})`
  );
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
