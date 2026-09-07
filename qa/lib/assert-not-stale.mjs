/**
 * Shared "not stale today" assertion for city dogfood gates
 * (docs/jim-brief-gtfs-snapshot-freshness.md, item 6). Loads a city's real
 * static snapshot (Blob or agency zip, per the city's own loader) and checks
 * calendar/calendar_dates coverage of today — the same check
 * lib/providers/gtfs/board.js's checkSnapshotFreshness() runs at request
 * time. A calendar that ended in the past here means the published snapshot
 * is stale and the refresh cron (or manual publish) needs to run, not that
 * the gate itself is broken.
 */
import { snapshotCoversToday } from "../../lib/providers/gtfs/static-cache.js";

/**
 * @param {string} label City name for the failure message.
 * @param {() => Promise<object>} loadStatic The city provider's exported static loader.
 * @param {Date} [now]
 */
export async function assertSnapshotNotStaleToday(label, loadStatic, now = new Date()) {
  const staticData = await loadStatic();
  const check = snapshotCoversToday(staticData, now, staticData.timeZone ?? "UTC");
  if (check.judgable && !check.coversToday) {
    throw new Error(
      `${label}: GTFS snapshot calendar coverage (${check.minDate ?? "?"}..${check.maxDate ?? "?"}) does not include today (${check.todayYmd}) — refresh the published snapshot`
    );
  }
  return check;
}

/**
 * Same check, but skips (logs, doesn't fail) when the live loader throws for
 * a missing operator credential rather than an actual staleness problem —
 * Sydney and Adelaide's static loaders require TFNSW/Adelaide Metro API keys
 * that are not provisioned in every environment this gate runs in. A real
 * GtfsSnapshotStaleError (or any other unexpected error) still fails the
 * gate; only "Missing*" config errors are swallowed.
 */
export async function assertSnapshotNotStaleTodayOrSkip(label, loadStatic, now = new Date()) {
  try {
    return await assertSnapshotNotStaleToday(label, loadStatic, now);
  } catch (error) {
    if (String(error?.name || "").startsWith("Missing")) {
      console.log(`${label}: not-stale check skipped (${error.message})`);
      return null;
    }
    throw error;
  }
}
