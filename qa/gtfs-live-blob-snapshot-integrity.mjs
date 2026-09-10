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
 *  1. Content-integrity check (every covered city, no credentials needed):
 *     fetch the real published blob and refuse it if it looks synthetic —
 *     either by a known test/dogfood marker in feed_info.txt, by having no
 *     feed_info.txt at all (fails closed — see COVERAGE below), or by
 *     structural signals a synthetic fixture is unlikely to accidentally
 *     match (implausibly small zip, implausibly few trips, an implausibly
 *     long calendar span).
 *  2. Resolved-share check (only for cities with a credential-free realtime
 *     feed configured below): fetch real GTFS-RT TripUpdates and fail if
 *     fewer than lib/providers/gtfs/board.js's STALE_RESOLVED_SHARE_THRESHOLD
 *     resolve against the published static snapshot — the same join the
 *     live board itself performs.
 *
 * COVERAGE (fix-up 10 Sep 2026, docs/jim-brief-newcastle-fixups.md): the set
 * of cities this gate checks used to be a hand-maintained array, and it had
 * already drifted from reality — Malmö and Uppsala are live, blob-backed
 * cities that were silently absent, while Brisbane was checked despite not
 * being blob-backed at all (loadBrisbaneStatic() fetches live from Translink
 * every request — no Blob dependency). That drift is the same defect class
 * as the Newcastle outage itself: a curated list nobody remembers to update.
 * So coverage here is *derived*, not hand-maintained: every lib/providers/*.js
 * file is scanned for a `gtfsFixtureBlobUrl("<city>")` call (the one thing
 * that actually makes a city's runtime read from Blob), and that set is
 * intersected with `status: "live"` in registry.js. Flipping, adding, or
 * retiring a city changes this gate's coverage automatically — no second
 * edit here. The resolved-share check still needs per-city realtime wiring
 * (RESOLVED_SHARE_CONFIG below), since that's inherently URL/credential
 * shaped, not derivable from a single call site — a covered city with no
 * entry there just gets a "not configured" skip line instead of a crash.
 *
 * Usage: node qa/gtfs-live-blob-snapshot-integrity.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { unzipSync } from "../lib/vendor/fflate.mjs";
import { parseCsv } from "../lib/providers/gtfs/csv.js";
import { gtfsFixtureBlobUrl } from "../lib/providers/gtfs/blob-fixtures.js";
import { calendarRangeFromTrimmedOutput } from "../lib/providers/gtfs/snapshot-manifest.js";
import { resolvedShareForRealtime, STALE_RESOLVED_SHARE_THRESHOLD } from "../lib/providers/gtfs/board.js";
import { fetchTripUpdates, indexTripUpdates } from "../lib/providers/gtfs/realtime.js";
import { CITIES as REGISTRY_CITIES } from "../lib/providers/registry.js";
import {
  loadCanberraStatic,
  CANBERRA_GTFS_RT_TRIP_UPDATES_URL,
} from "../lib/providers/canberra.js";
import {
  loadGoldCoastStatic,
  SEQ_GTFS_RT_TRIP_UPDATES_URL,
} from "../lib/providers/gold-coast.js";
import { loadNewcastleStatic } from "../lib/providers/newcastle.js";
import { loadMalmoStatic } from "../lib/providers/malmo.js";
import { loadUppsalaStatic } from "../lib/providers/uppsala.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROVIDERS_DIR = path.join(__dirname, "..", "lib", "providers");

/**
 * Scan lib/providers/*.js (top level only — not gtfs/, ptv/, cities/
 * subfolders, which are shared helpers, not per-city adapters) for a
 * `gtfsFixtureBlobUrl("<city>")` call. That call is the one thing that
 * actually makes a provider's runtime read its static snapshot from the
 * shared Blob store, so scanning for it (rather than hand-listing cities)
 * is what keeps this gate's coverage honest as cities are added/retired.
 */
function deriveBlobBackedCityIds() {
  const ids = new Set();
  const callRe = /gtfsFixtureBlobUrl\(\s*["'`]([a-z0-9-]+)["'`]\s*\)/g;
  for (const entry of fs.readdirSync(PROVIDERS_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
    const text = fs.readFileSync(path.join(PROVIDERS_DIR, entry.name), "utf8");
    let match;
    while ((match = callRe.exec(text))) {
      ids.add(match[1]);
    }
  }
  return ids;
}

function deriveCoveredCityIds() {
  const blobBackedIds = deriveBlobBackedCityIds();
  const liveIds = new Set(
    REGISTRY_CITIES.filter((entry) => entry.status === "live").map((entry) => entry.id)
  );
  const covered = [...blobBackedIds].filter((id) => liveIds.has(id)).sort();
  if (covered.length === 0) {
    // Not a real "nothing to check" state — every release so far has had at
    // least one blob-backed live city. Zero almost certainly means the scan
    // regex stopped matching (e.g. gtfsFixtureBlobUrl got renamed/re-imported
    // under a different call shape), which would silently disable this whole
    // gate. Fail loudly instead of reporting a clean "ok (0 cities)".
    throw new Error(
      "gtfs-live-blob-snapshot-integrity: derived zero blob-backed live cities — " +
        "this looks like a bug in deriveBlobBackedCityIds()'s scan, not a real empty set"
    );
  }
  return covered;
}

const COVERED_CITY_IDS = deriveCoveredCityIds();

/**
 * Per-city realtime wiring for the resolved-share check. Not every covered
 * city needs (or can have) an entry: cities whose realtime feed needs a
 * credential (needsKey: true) are skipped there the same way
 * assertSnapshotNotStaleTodayOrSkip skips other credentialed cities
 * elsewhere in this suite, and a covered city entirely absent from this map
 * just gets a "not configured" skip line rather than a crash — the content-
 * integrity check above still runs for it either way.
 */
const RESOLVED_SHARE_CONFIG = {
  canberra: { loadStatic: loadCanberraStatic, rtUrl: CANBERRA_GTFS_RT_TRIP_UPDATES_URL, needsKey: false },
  "gold-coast": {
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
  newcastle: { loadStatic: loadNewcastleStatic, rtUrl: null, needsKey: true },
  // Malmö/Uppsala's realtime TripUpdates both need TRAFIKLAB_API_KEY_RT
  // (lib/providers/gtfs/auth.js's trafiklabGtfsRtTripUpdatesUrl) — not
  // assumed present in every environment this runs in, same reasoning as
  // newcastle. Content-integrity below still covers both unconditionally.
  malmo: { loadStatic: loadMalmoStatic, rtUrl: null, needsKey: true },
  uppsala: { loadStatic: loadUppsalaStatic, rtUrl: null, needsKey: true },
};

// Substrings that should never appear in a real transit agency's
// feed_publisher_name — deliberately narrow (our own product name, and the
// words used for test/placeholder data) to avoid false positives against a
// real agency's name.
const SYNTHETIC_PUBLISHER_MARKERS = ["next-train", "dogfood", "fixture", "placeholder", "synthetic"];

// Structural signals that don't depend on any naming convention — harder to
// fake by accident than a publisher string. Newcastle's dogfood fixture was
// 2041 bytes, 2 trips, and a calendar spanning 20260101-20271231 (~730
// days); a genuine published feed for any of these cities is comfortably
// past all three thresholds. These are deliberately conservative (a real
// feed should never be this close to the line) to avoid false positives.
const MIN_ZIP_BYTES = 5 * 1024;
const MIN_TRIP_COUNT = 5;
const MAX_CALENDAR_SPAN_DAYS = 400;

const failures = [];

function findEntry(files, name) {
  return Object.keys(files).find((entry) => entry === name || entry.endsWith(`/${name}`)) ?? null;
}

function readTableText(files, name) {
  const key = findEntry(files, name);
  return key ? Buffer.from(files[key]).toString("utf8") : null;
}

function parseYyyymmdd(value) {
  const text = String(value ?? "");
  if (!/^\d{8}$/.test(text)) return null;
  return Date.UTC(Number(text.slice(0, 4)), Number(text.slice(4, 6)) - 1, Number(text.slice(6, 8)));
}

function calendarSpanDays(calendarText, calendarDatesText) {
  const range = calendarRangeFromTrimmedOutput({
    "calendar.txt": calendarText ?? "",
    "calendar_dates.txt": calendarDatesText ?? "",
  });
  const start = parseYyyymmdd(range.minDate);
  const end = parseYyyymmdd(range.maxDate);
  if (start === null || end === null) return null;
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

/**
 * Fetch the published blob once and report every content-integrity signal
 * for it — publisher-marker match, missing feed_info.txt (fails closed:
 * absence is suspicious, not fine — a fixture without one used to sail
 * straight through), implausibly small zip, implausibly few trips, and an
 * implausibly long calendar span. Any one signal firing is a failure; the
 * `known` flag marks the one specific, already-diagnosed case (Newcastle's
 * synthetic dogfood fixture) so main() can report it distinguishably
 * without hiding it.
 */
async function checkContentIntegrity(city) {
  const url = gtfsFixtureBlobUrl(city);
  const response = await fetch(url);
  if (!response.ok) {
    failures.push({ city, known: false, message: `failed to fetch published snapshot (${url}): HTTP ${response.status}` });
    return;
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const files = unzipSync(new Uint8Array(buffer));

  const feedInfoText = readTableText(files, "feed_info.txt");
  const feedInfoRow = feedInfoText ? (parseCsv(feedInfoText)[0] ?? null) : null;
  const publisher = String(feedInfoRow?.feed_publisher_name ?? "");
  const marker = SYNTHETIC_PUBLISHER_MARKERS.find((needle) => publisher.toLowerCase().includes(needle));

  const tripsText = readTableText(files, "trips.txt");
  const tripCount = tripsText ? parseCsv(tripsText).length : null;

  const calendarText = readTableText(files, "calendar.txt");
  const calendarDatesText = readTableText(files, "calendar_dates.txt");
  const spanDays = calendarSpanDays(calendarText, calendarDatesText);

  const reasons = [];
  let known = false;

  if (marker) {
    reasons.push(`feed_info.feed_publisher_name ("${publisher}") looks like test/dogfood data (matched "${marker}")`);
    // The specific, already-diagnosed incident (docs/jim-brief-newcastle-
    // stale-snapshot.md) is Newcastle's blob carrying a publisher string
    // naming our own product/test vocabulary — the other structural
    // signals below fire alongside it for the same blob and don't change
    // that identification. Restricted to "newcastle" specifically: the
    // same marker on a DIFFERENT city's blob would be a new incident, not
    // a recurrence of this tracked one, and must not be swallowed as known.
    known = city === "newcastle";
  }
  if (!feedInfoText) {
    reasons.push("feed_info.txt is missing from the published zip entirely (failing closed — absence is not evidence of a real feed)");
  }
  if (buffer.length < MIN_ZIP_BYTES) {
    reasons.push(`published zip is only ${buffer.length} bytes (< ${MIN_ZIP_BYTES}) — implausibly small for a real feed`);
  }
  if (tripCount !== null && tripCount < MIN_TRIP_COUNT) {
    reasons.push(`trips.txt has only ${tripCount} trip(s) (< ${MIN_TRIP_COUNT}) — implausibly few for a real feed`);
  }
  if (spanDays !== null && spanDays > MAX_CALENDAR_SPAN_DAYS) {
    reasons.push(`calendar spans ${spanDays} days (> ${MAX_CALENDAR_SPAN_DAYS}) — implausibly long, characteristic of a perpetual test calendar`);
  }

  if (reasons.length) {
    failures.push({
      city,
      known,
      message:
        `published GTFS static snapshot (gtfs/${city}.zip) looks synthetic, not a real upstream feed — ` +
        reasons.join("; ") +
        ` — the production blob needs republishing with real upstream data`,
    });
  }
}

async function checkResolvedShare(city) {
  const config = RESOLVED_SHARE_CONFIG[city];
  if (!config) {
    console.log(`${city}: resolved-share check not configured (add an entry to RESOLVED_SHARE_CONFIG if a credential-free realtime feed exists)`);
    return;
  }
  const { loadStatic, rtUrl, needsKey, skipResolvedShareCheck } = config;
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
    failures.push({ city, known: false, message: `failed to load published static snapshot: ${error?.message || error}` });
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
    failures.push({
      city,
      known: false,
      message:
        `only ${share.resolved}/${share.total} realtime trip IDs resolved against the published ` +
        `static snapshot (< ${Math.round(STALE_RESOLVED_SHARE_THRESHOLD * 100)}%) — same threshold the live board itself enforces`,
    });
    return;
  }
  console.log(`${city}: resolved-share ok (${share.resolved}/${share.total})`);
}

async function main() {
  console.log(`gtfs-live-blob-snapshot-integrity: covered cities (derived from code + registry status): ${COVERED_CITY_IDS.join(", ")}`);

  for (const city of COVERED_CITY_IDS) {
    await checkContentIntegrity(city);
  }
  for (const city of COVERED_CITY_IDS) {
    await checkResolvedShare(city);
  }

  if (failures.length) {
    console.error("gtfs-live-blob-snapshot-integrity failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure.city}: ${failure.message}`);
    }
    const allKnown = failures.every((failure) => failure.known);
    if (allKnown) {
      // Every failure is the specific, already-diagnosed, already-briefed
      // issue (docs/jim-brief-newcastle-stale-snapshot.md) — still a real
      // FAIL (nothing here suppresses it), but exit 2 instead of 1 so
      // qa/run-all.mjs can report it as a distinguishable "known, tracked"
      // FAIL rather than a bare one indistinguishable from a new
      // regression. Any genuinely new or different failure (a different
      // city, a different signal, or a mix) does not set allKnown and
      // exits 1 like an ordinary failure. This self-clears automatically:
      // once Tim republishes real Newcastle data, none of these signals
      // fire and the whole gate goes green — no follow-up edit needed here.
      console.error("\n(known, tracked — see docs/jim-brief-newcastle-stale-snapshot.md; self-clears once Tim republishes real Newcastle GTFS data)");
      process.exit(2);
    }
    process.exit(1);
  }

  console.log(
    `gtfs-live-blob-snapshot-integrity: ok (${COVERED_CITY_IDS.length} live blob-backed cities: content-integrity + resolved-share where configured)`
  );
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
