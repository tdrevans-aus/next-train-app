/**
 * Named error for the shared GTFS static + GTFS-RT join (board.js) refusing
 * to serve a board it believes is stale, per docs/jim-brief-gtfs-snapshot-freshness.md.
 *
 * Two independent triggers (either is sufficient):
 *  - the snapshot's calendar/calendar_dates coverage does not include today
 *    (a snapshot that was simply never refreshed, or published wrong), or
 *  - the resolved share of realtime trip IDs against the snapshot's trips.txt
 *    is below threshold on a large-enough sample (the realtime feed and the
 *    static snapshot have drifted apart — trip IDs no longer line up).
 *
 * Named (not a generic Error) so api/directions.js's classifyDirectionsError
 * can route it to the retryable "try again" treatment rather than the
 * permanent "feed_unavailable" bucket most other named adapter errors get —
 * a fresh refresh (change-driven cron, or the next GitHub Actions run for a
 * large feed) can genuinely fix this, unlike a missing credential.
 */
export class GtfsSnapshotStaleError extends Error {
  constructor(cityId, reason) {
    super(
      `GTFS static snapshot is stale for "${cityId ?? "unknown city"}"${reason ? `: ${reason}` : ""}`
    );
    this.name = "GtfsSnapshotStaleError";
    this.cityId = cityId ?? null;
    this.reason = reason ?? null;
  }
}
