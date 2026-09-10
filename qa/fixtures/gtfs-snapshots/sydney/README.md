# sydney — local calendar-only GTFS fixture (hand-authored)

No last-known-good real zip was available for sydney when this fixture was created
(the Vercel Blob store next-train-gtfs was suspended — docs/jim-brief-blob-transfer-reduction.md).
This is a deliberately wide, hand-authored validity window (2024-01-01..2030-12-31), NOT live
agency data — it exists only so `assertSnapshotNotStaleTodayOrSkip` can exercise real
staleness-detection LOGIC in qa/sydney-dogfood-gate.mjs without a network fetch.

Real-snapshot freshness/content in production is monitored on a schedule by
qa/prod-sweep.mjs and qa/gtfs-live-blob-snapshot-integrity.mjs, not here — this fixture
makes no claim about what is actually published today.

## Replace with real data once the store/agency feed is reachable again

```bash
node scripts/extract-gtfs-calendar-fixture.mjs sydney <path-to-real-zip>
```
