import { unzipSync } from "../../vendor/fflate.mjs";

/**
 * Shared unzip helper for the SEQ_GTFS.zip group (Brisbane rail + Gold
 * Coast G:link), added to fix an OOM confirmed locally under
 * --max-old-space-size=2048 (docs/jim-brief-seq-refresh-oom.md).
 *
 * Two things kept a single trim call - let alone two, once per city -
 * expensive enough to exceed a 2048MB heap on its own:
 *
 * 1. fflate's unzipSync decompresses every entry in the zip by default,
 *    including SEQ_GTFS.zip's bus-network files (shapes.txt, frequencies
 *    etc, if present) that neither trim script ever reads. unzipSync
 *    accepts an opts.filter callback that skips inflating any entry that
 *    fails it - NEEDED_SEQ_ENTRY_NAMES + unzipSeqEntries below apply that,
 *    so only the GTFS files either city's trim actually touches are ever
 *    inflated.
 * 2. Both trims separately called unzipSync on the full ~32MB zip - lib/
 *    gtfs-refresh.js's SHARED_GROUPS loop now unzips once per refresh run
 *    (via this module) and passes the resulting `files` map into both
 *    entry.build(buffer, { files }) calls, so the (already filtered)
 *    decompression only happens once, not once per city. The standalone
 *    CLI entry points (npm run trim:brisbane-gtfs / trim:gold-coast-gtfs)
 *    still call unzipSeqEntries themselves when no `files` is passed in,
 *    so `node scripts/trim-*-gtfs.mjs` on its own is unaffected.
 */
export const NEEDED_SEQ_ENTRY_NAMES = new Set([
  "agency.txt",
  "feed_info.txt",
  "routes.txt",
  "trips.txt",
  "stops.txt",
  "stop_times.txt",
  "calendar.txt",
  "calendar_dates.txt",
]);

function isNeededEntry(entry) {
  const base = entry.name.includes("/") ? entry.name.slice(entry.name.lastIndexOf("/") + 1) : entry.name;
  return NEEDED_SEQ_ENTRY_NAMES.has(base);
}

/**
 * @param {Buffer|Uint8Array} buffer
 * @returns {Record<string, Uint8Array>} decompressed file contents for only
 *   the GTFS files either SEQ trim reads - everything else in the zip
 *   (bus shapes, frequencies, etc) is skipped before inflation, not
 *   inflated then discarded.
 */
export function unzipSeqEntries(buffer) {
  return unzipSync(new Uint8Array(buffer), { filter: isNeededEntry });
}
