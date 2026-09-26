/**
 * Checks whether NTA GTFS-RT v2 TripUpdates trip_ids actually join to the published Luas static
 * snapshot's trip_ids — the one thing Mark's offline QA couldn't prove (no NTA_API_KEY, no blob
 * access in sandboxes). See docs/jim-brief-dublin-rt-join-check.md and
 * docs/dublin-d1/jim-handoff.md.
 *
 * Reuses lib/providers/dublin.js's own static loader and lib/providers/gtfs/{auth,realtime}.js's
 * fetch/decode path rather than reimplementing any of it — this script is deliberately thin.
 *
 * With no NTA_API_KEY set, this exits 0 with a clear "skipped: no key" line, so it is safe to run
 * (or accidentally run) in a local smoke pass. It is NOT registered in qa/run-all.mjs — it needs a
 * real key and network access neither sandboxes nor CI's default job have; it's wired instead into
 * .github/workflows/publish-gtfs-snapshot.yml where NTA_API_KEY is available as a secret.
 *
 * Usage: node qa/dublin-rt-join-check.mjs
 */
import { loadDublinStatic, DUBLIN_GTFS_RT_TRIP_UPDATES_URL } from "../lib/providers/dublin.js";
import { readNtaApiKey, ntaAuthHeaders } from "../lib/providers/gtfs/auth.js";
import { fetchTripUpdates } from "../lib/providers/gtfs/realtime.js";
import { indexTripUpdates } from "../lib/providers/gtfs/realtime.js";
import { STALE_RESOLVED_SHARE_THRESHOLD, STALE_MIN_JUDGABLE_TRIP_UPDATES } from "../lib/providers/gtfs/board.js";

function sample(iterable, n) {
  const out = [];
  for (const item of iterable) {
    if (out.length >= n) break;
    out.push(item);
  }
  return out;
}

async function main() {
  const apiKey = readNtaApiKey();
  if (!apiKey) {
    console.log("dublin-rt-join-check: skipped: no key (NTA_API_KEY not set)");
    process.exit(0);
    return;
  }

  const headers = ntaAuthHeaders(apiKey);

  const [staticData, rtResult] = await Promise.all([
    loadDublinStatic(),
    fetchTripUpdates(DUBLIN_GTFS_RT_TRIP_UPDATES_URL, { headers }),
  ]);

  const { entities } = rtResult;
  const realtimeIndex = indexTripUpdates(entities);

  // Snapshot route_ids are Luas-only (scripts/trim-dublin-gtfs.mjs), so a raw TripUpdate whose
  // trip.routeId matches one of them is tellably Luas; NTA's feed carries every Irish operator,
  // so most updates won't have a routeId that matches at all (or won't carry routeId).
  const staticRouteIds = new Set(staticData.routesById.keys());

  const luasTripIds = new Set();
  const nonLuasTripIds = new Set();
  const untellableTripIds = new Set();

  for (const entity of entities) {
    const trip = entity.tripUpdate?.trip;
    const tripId = String(trip?.tripId || "").trim();
    if (!tripId) continue;
    const routeId = trip?.routeId ? String(trip.routeId).trim() : "";
    if (!routeId) {
      untellableTripIds.add(tripId);
    } else if (staticRouteIds.has(routeId)) {
      luasTripIds.add(tripId);
    } else {
      nonLuasTripIds.add(tripId);
    }
  }

  const canTellRoute = luasTripIds.size > 0 || nonLuasTripIds.size > 0;
  const poolTripIds = canTellRoute ? luasTripIds : realtimeIndex.rawTripIds;
  const poolLabel = canTellRoute
    ? "TripUpdates whose route could be identified as Luas"
    : "ALL TripUpdates (route_id not present on any trip descriptor — could not tell Luas apart from other operators)";

  const resolvedIds = [];
  const unresolvedIds = [];
  for (const tripId of poolTripIds) {
    if (staticData.tripsById.has(tripId)) {
      resolvedIds.push(tripId);
    } else {
      unresolvedIds.push(tripId);
    }
  }

  const total = poolTripIds.size;
  const resolved = resolvedIds.length;
  const share = total > 0 ? resolved / total : null;

  console.log(`dublin-rt-join-check: total TripUpdates in feed: ${realtimeIndex.rawTripIds.size}`);
  console.log(`dublin-rt-join-check: counted over: ${poolLabel} (${total})`);
  console.log(`dublin-rt-join-check: resolved against snapshot: ${resolved}/${total}${share != null ? ` (${(share * 100).toFixed(1)}%)` : ""}`);
  console.log(`dublin-rt-join-check: sample matched trip_ids: ${sample(resolvedIds, 5).join(", ") || "(none)"}`);
  console.log(`dublin-rt-join-check: sample unmatched trip_ids: ${sample(unresolvedIds, 5).join(", ") || "(none)"}`);

  if (total < STALE_MIN_JUDGABLE_TRIP_UPDATES) {
    console.log(
      `dublin-rt-join-check: sample too small to judge (${total} < ${STALE_MIN_JUDGABLE_TRIP_UPDATES}) — not failing on share alone.`
    );
    return;
  }

  if (share != null && share < STALE_RESOLVED_SHARE_THRESHOLD) {
    throw new Error(
      `dublin-rt-join-check: only ${resolved}/${total} realtime trip IDs resolved against the published snapshot ` +
        `(< ${Math.round(STALE_RESOLVED_SHARE_THRESHOLD * 100)}%), counted over ${poolLabel}. ` +
        `The live board would come back empty or near-empty against this snapshot.`
    );
  }

  console.log("dublin-rt-join-check: ok");
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
