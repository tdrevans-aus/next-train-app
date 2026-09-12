# malmo — local calendar-only GTFS fixture

Not the whole feed — just enough for `assertSnapshotNotStaleTodayOrSkip` to exercise real
staleness-detection logic without a network fetch
(docs/jim-brief-blob-transfer-reduction.md). `stops.txt`/`routes.txt`/`trips.txt`/
`stop_times.txt` are header-only (loadGtfsStaticFromDirectory requires the file to exist,
but nothing here reads their rows). Real-snapshot freshness in production is monitored on
a schedule by qa/prod-sweep.mjs and qa/gtfs-live-blob-snapshot-integrity.mjs, not here.

**Source zip:** last-known-good `malmo.zip` preserved 10 Sep 2026 during the
`next-train-gtfs` Blob suspension (docs/jim-brief-blob-transfer-reduction.md), fetched before the
suspension from `gtfsFixtureBlobUrl("malmo")`
**Extracted:** 2026-09-10
**feed_version:** 2026-09-06
**feed_publisher_name:** Samtrafiken i Sverige AB
**Real validity window:** 20260903 .. 20261212

## Regenerate

```bash
node scripts/extract-gtfs-calendar-fixture.mjs malmo <path-to-fresh-zip>
```

This fixture stops covering "today" after 20261212 — the dogfood gate will start
failing then (correctly: the logic is doing its job) and this needs a refresh with a newer
zip. That is expected maintenance, not a bug.
