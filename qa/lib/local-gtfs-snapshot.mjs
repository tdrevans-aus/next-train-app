/**
 * Local, committed calendar-only GTFS fixtures for a city dogfood gate's
 * staleness check (docs/jim-brief-blob-transfer-reduction.md, item 1).
 *
 * Each `qa/*-dogfood-gate.mjs`'s `assertSnapshotNotStaleTodayOrSkip` call
 * used to load a city's REAL, LIVE static snapshot — a full zip fetch from
 * the shared Vercel Blob store (`next-train-gtfs`) or, for Sydney/Brisbane,
 * directly from the agency — just to check whether calendar.txt/
 * calendar_dates.txt cover today. That made every `qa/run-all.mjs --smoke`
 * run pull ~100MB of Blob/agency transfer (Malmö 28MB, Uppsala 19MB, plus
 * Sydney/Brisbane/Canberra/Gold Coast/Newcastle) on every CI push and every
 * local run — the exact test traffic that exhausted the Hobby plan's Blob
 * Data Transfer allowance 29 Aug – 10 Sep 2026.
 *
 * `loadLocalGtfsSnapshotForStaleCheck` swaps the network fetch for
 * `loadGtfsStaticFromDirectory` (lib/providers/gtfs/static-cache.js) over a
 * small directory of real-or-representative calendar data at
 * qa/fixtures/gtfs-snapshots/<city>/ — see that directory's own README for
 * how each city's fixture was built and how to refresh it. This is a
 * deliberate move from "reality check" to "logic check": whether our
 * staleness-detection code correctly reads a calendar is testable locally;
 * whether the CURRENTLY PUBLISHED production snapshot is actually fresh is
 * qa/prod-sweep.mjs's and qa/gtfs-live-blob-snapshot-integrity.mjs's job,
 * both scheduled rather than per-PR (CLAUDE.md's "CI tests our logic against
 * local data; the prod sweep and the integrity gate test reality on a
 * schedule").
 */
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadGtfsStaticFromDirectory } from "../../lib/providers/gtfs/static-cache.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = join(__dirname, "../fixtures/gtfs-snapshots");

/**
 * @param {string} cityId Matches the fixture directory name under qa/fixtures/gtfs-snapshots/.
 * @param {string} [timeZone]
 * @returns {object} Same shape `loadGtfsStatic`/city providers return (calendar,
 *   calendarDates, timeZone, ...) — enough for `assertSnapshotNotStaleTodayOrSkip`.
 */
export function loadLocalGtfsSnapshotForStaleCheck(cityId, timeZone = "UTC") {
  const directory = join(FIXTURES_ROOT, cityId);
  return loadGtfsStaticFromDirectory(directory, {
    timeZone,
    sourceUrl: `local-fixture:${cityId}`,
  });
}
