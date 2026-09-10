/**
 * Live, read-only check of every live city whose GTFS static snapshot is
 * served from the shared next-train-gtfs Vercel Blob store
 * (lib/providers/gtfs/blob-fixtures.js -> gtfsFixtureBlobUrl). Added
 * docs/jim-brief-newcastle-stale-snapshot.md, 10 Sep 2026, after Newcastle's
 * /api/next-train returned HTTP 500 in production for an outage the existing
 * gates could not see: the offline gtfs-snapshot-freshness.mjs only exercises
 * fixture data, and qa/lib/assert-not-stale.mjs's per-city dogfood-gate check
 * only verifies calendar coverage — neither one actually fetches the real
 * published blob and asks "is this even real upstream data?"
 *
 * Newcastle's root cause was not simple staleness: the blob published at
 * gtfs/newcastle.zip was synthetic dogfood/test fixture data (trip IDs
 * "nlr-beach-0"/"nlr-int-0", feed_info.txt feed_publisher_name "next-train
 * newcastle dogfood") — a snapshot whose calendar covered today just fine,
 * so it never tripped the calendar check, and whose trip ID scheme could
 * never resolve against the real TfNSW realtime feed no matter how often a
 * refresh ran. This gate makes that failure mode fail loudly instead of
 * silently:
 *
 *  1. Content-integrity check (all cities below, no credentials needed):
 *     fetch the real published blob and refuse any feed_info.txt whose
 *     feed_publisher_name looks like our own test/dogfood data rather than
 *     a real transit agency.
 *  2. Resolved-share check (only for cities whose realtime feed needs no
 *     API key — canberra, brisbane, gold-coast; newcastle's TfNSW feed
 *     needs TFNSW_API_KEY, not available in every environment this runs in,
 *     so it's skipped there exactly like assertSnapshotNotStaleTodayOrSkip
 *     skips other credentialed cities): fetch real GTFS-RT TripUpdates and
 *     fail if fewer than lib/providers/gtfs/board.js's
 *     STALE_RESOLVED_SHARE_THRESHOLD resolve against the published static
 *     snapshot — the same join the live board itself performs.
 *
 * This list must stay in sync with lib/gtfs-refresh.js's STANDALONE +
 * SHARED_GROUPS (the cities the refresh pipeline is responsible for) minus
 * any retired city — add a new blob-backed live city to both places.
 *
 * Usage: node qa/gtfs-live-blob-snapshot-integrity.mjs
 */
import { unzipSync } from "../lib/vendor/fflate.mjs";
import { parseCsv } from "../lib/providers/gtfs/csv.js";
import { gtfsFixtureBlobUrl } from "../lib/providers/gtfs/blob-fixtures.js";
import { resolvedShareForRealtime, STALE_RESOLVED_SHARE_THRESHOLD } from "../lib/providers/gtfs/board.js";
import { fetchTripUpdates, indexTripUpdates } from "../lib/providers/gtfs/realtime.js";
import {
  loadCanberraStatic,
  CANBERRA_GTFS_RT_TRIP_UPDATES_URL,
} from "../lib/providers/canberra.js";
import {
  loadBrisbaneStatic,
  SEQ_GTFS_RT_RAIL_URL,
} from "../lib/providers/brisbane.js";
import {
  loadGoldCoastStatic,
  SEQ_GTFS_RT_TRIP_UPDATES_URL,
} from "../lib/providers/gold-coast.js";
import { loadNewcastleStatic } from "../lib/providers/newcastle.js";

// Substrings that should never appear in a real transit agency's
// feed_publisher_name — deliberately narrow (our own product name, and the
// words used for test/placeholder data) to avoid false positives against a
// real agency's name.
const SYNTHETIC_PUBLISHER_MARKERS = ["next-train", "dogfood", "fixture", "placeholder", "synthetic"];

const CITIES = [
  { city: "canberra", loadStatic: loadCanberraStatic, rtUrl: CANBERRA_GTFS_RT_TRIP_UPDATES_URL, needsKey: false },
  { city: "brisbane", loadStatic: loadBrisbaneStatic, rtUrl: SEQ_GTFS_RT_RAIL_URL, needsKey: false },
  {
    city: "gold-coast",
    loadStatic: loadGoldCoastStatic,
    rtUrl: SEQ_GTFS_RT_TRIP_UPDATES_URL,
    needsKey: false,
    // Matches lib/providers/gold-coast.js's own buildBoardForStops call:
    // SEQ's shared TripUpdates feed carries every SEQ mode (bus, ferry,
    // rail, tram) while the published snapshot is trimmed to G:link only,
    // so most "unresolved" trip IDs are out-of-scope buses/trains, not
    // drift. Mirroring the runtime flag here avoids a false positive this
    // gate would otherwise report every run (confirmed: ~1% resolved
    // against the full SEQ feed, by design, not a real problem).
    skipResolvedShareCheck: true,
  },
  { city: "newcastle", loadStatic: loadNewcastleStatic, rtUrl: null, needsKey: true },
];

const failures = [];

function findEntry(files, name) {
  return Object.keys(files).find((entry) => entry === name || entry.endsWith(`/${name}`)) ?? null;
}

async function fetchFeedInfo(city) {
  const url = gtfsFixtureBlobUrl(city);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${city}: failed to fetch published snapshot (${url}): HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const files = unzipSync(new Uint8Array(buffer));
  const key = findEntry(files, "feed_info.txt");
  if (!key) {
    return null;
  }
  const text = Buffer.from(files[key]).toString("utf8");
  const rows = parseCsv(text);
  return rows[0] ?? null;
}

async function checkContentIntegrity(city) {
  const feedInfo = await fetchFeedInfo(city);
  const publisher = String(feedInfo?.feed_publisher_name ?? "");
  const marker = SYNTHETIC_PUBLISHER_MARKERS.find((needle) =>
    publisher.toLowerCase().includes(needle)
  );
  if (marker) {
    failures.push(
      `${city}: published GTFS static snapshot's feed_info.feed_publisher_name ("${publisher}") ` +
        `looks like test/dogfood data (matched "${marker}"), not a real upstream feed — ` +
        `the production blob (gtfs/${city}.zip) needs republishing with real upstream data`
    );
  }
}

async function checkResolvedShare({ city, loadStatic, rtUrl, needsKey, skipResolvedShareCheck }) {
  if (needsKey) {
    console.log(`${city}: resolved-share check skipped (realtime feed requires a credential not assumed present)`);
    return;
  }
  if (skipResolvedShareCheck) {
    console.log(`${city}: resolved-share check skipped (runtime uses skipResolvedShareCheck — shared multi-mode RT feed)`);
    return;
  }
  let staticData;
  try {
    staticData = await loadStatic();
  } catch (error) {
    failures.push(`${city}: failed to load published static snapshot: ${error?.message || error}`);
    return;
  }
  let realtime;
  try {
    realtime = await fetchTripUpdates(rtUrl);
  } catch (error) {
    console.log(`${city}: resolved-share check skipped (realtime fetch failed: ${error?.message || error})`);
    return;
  }
  const realtimeIndex = indexTripUpdates(realtime.entities);
  const share = resolvedShareForRealtime(realtimeIndex, staticData);
  if (!share.judgable) {
    console.log(`${city}: resolved-share not judgable (only ${share.total} realtime trip IDs) — skipped`);
    return;
  }
  if (share.share < STALE_RESOLVED_SHARE_THRESHOLD) {
    failures.push(
      `${city}: only ${share.resolved}/${share.total} realtime trip IDs resolved against the published ` +
        `static snapshot (< ${Math.round(STALE_RESOLVED_SHARE_THRESHOLD * 100)}%) — same threshold the live board itself enforces`
    );
    return;
  }
  console.log(`${city}: resolved-share ok (${share.resolved}/${share.total})`);
}

async function main() {
  for (const entry of CITIES) {
    await checkContentIntegrity(entry.city);
  }
  for (const entry of CITIES) {
    await checkResolvedShare(entry);
  }

  if (failures.length) {
    console.error("gtfs-live-blob-snapshot-integrity failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `gtfs-live-blob-snapshot-integrity: ok (${CITIES.length} live blob-backed cities: content-integrity + resolved-share where credential-free)`
  );
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
