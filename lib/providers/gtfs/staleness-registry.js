/**
 * Per-serverless-instance record of GTFS static-snapshot staleness verdicts,
 * set by lib/providers/gtfs/board.js's checkSnapshotFreshness() whenever it
 * judges a city's snapshot stale (and cleared the next time that city's
 * board is judged fresh). Reported by /api/health so the condition is
 * visible without waiting for a rider report, and consulted by
 * lib/gtfs-refresh.js to refresh previously-stale cities first.
 *
 * Same scoping as static-cache.js's in-memory TTL cache: this resets on
 * cold start and is not shared across instances. That's fine — it's a
 * same-instance early-warning signal, not the source of truth (the
 * manifest + probe is), and /api/health is polled often enough that a
 * cold-started instance re-detects the same condition within a request or
 * two if it's still real.
 *
 * @see docs/jim-brief-gtfs-snapshot-freshness.md
 */

/** @type {Map<string, { reason: string, detectedAt: string, detail: object }>} */
const staleCities = new Map();

export function recordCityStale(cityId, detail = {}) {
  if (!cityId) {
    return;
  }
  staleCities.set(cityId, {
    reason: detail.reason ?? "unknown",
    detectedAt: new Date().toISOString(),
    detail,
  });
}

export function clearCityStale(cityId) {
  if (!cityId) {
    return;
  }
  staleCities.delete(cityId);
}

export function isCityStale(cityId) {
  return staleCities.has(cityId);
}

/** @returns {Array<{ cityId: string, reason: string, detectedAt: string, detail: object }>} */
export function getStaleCityReport() {
  return [...staleCities.entries()].map(([cityId, info]) => ({ cityId, ...info }));
}

/** Test helper — clear all recorded staleness. */
export function _resetStalenessRegistryForTests() {
  staleCities.clear();
}
