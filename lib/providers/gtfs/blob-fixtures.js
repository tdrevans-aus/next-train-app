/**
 * Shared location for GTFS static snapshots published by
 * scripts/publish-gtfs-fixture-to-blob.mjs (Vercel Blob store: next-train-gtfs).
 * @see docs/jim-brief-gtfs-data-platform-scale.md
 */

export const GTFS_FIXTURE_BLOB_BASE =
  process.env.NEXT_TRAIN_GTFS_BLOB_BASE ||
  "https://n1sivhxcnzarmc6t.public.blob.vercel-storage.com/gtfs";

export function gtfsFixtureBlobUrl(city) {
  return `${GTFS_FIXTURE_BLOB_BASE}/${city}.zip`;
}

/**
 * Single, non-city-scoped record of the daily refresh cron's last run
 * (lib/gtfs-refresh.js writes it; qa/prod-sweep.mjs reads it).
 * @see docs/jim-brief-gtfs-refresh-cron-crash.md
 */
export const REFRESH_STATUS_BLOB_PATH = "gtfs/_refresh-status.json";

export function gtfsRefreshStatusBlobUrl() {
  return `${GTFS_FIXTURE_BLOB_BASE}/_refresh-status.json`;
}
