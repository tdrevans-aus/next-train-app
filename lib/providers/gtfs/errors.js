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

/**
 * Named error for a GTFS static or GTFS-RT fetch that failed before any
 * rider board could be built — a non-2xx response (rate limit, outage) or a
 * 2xx response whose body was not a parseable feed (a rate-limit/WAF HTML
 * page served with a 200 and a misleading content-type, or a truncated zip).
 * Named (not a generic Error) so api/board.js and api/next-train.js can turn
 * it into a fast, clean 503 ("live data unavailable") instead of a bare 500,
 * and never attempt to treat the failing response body as feed data.
 * @see docs/jim-brief-sydney-board-oom-on-429.md
 */
export class FeedUnavailableError extends Error {
  /**
   * @param {{ message: string, status?: number|null, retryAfterMs?: number|null, cause?: unknown }} options
   */
  constructor({ message, status = null, retryAfterMs = null, cause = null } = {}) {
    super(message);
    this.name = "FeedUnavailableError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
    if (cause) {
      this.cause = cause;
    }
  }
}
