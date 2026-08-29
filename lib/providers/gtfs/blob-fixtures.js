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
