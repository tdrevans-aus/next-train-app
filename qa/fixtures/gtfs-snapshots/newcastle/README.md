# newcastle — local calendar-only GTFS fixture

Not the whole feed — just enough for `assertSnapshotNotStaleTodayOrSkip` to exercise real
staleness-detection logic without a network fetch
(docs/jim-brief-blob-transfer-reduction.md). `stops.txt`/`routes.txt`/`trips.txt`/
`stop_times.txt` are header-only (loadGtfsStaticFromDirectory requires the file to exist,
but nothing here reads their rows). Real-snapshot freshness in production is monitored on
a schedule by qa/prod-sweep.mjs and qa/gtfs-live-blob-snapshot-integrity.mjs, not here.

**Source zip:** C:\Users\tdrev\AppData\Local\Temp\claude\C--Users-tdrev-Projects-next-train-app\1bbd2b25-bfba-41a6-8789-fda413e3cdec\scratchpad/newcastle.zip
**Extracted:** 2026-09-12
**feed_version:** 10092026-010012
**feed_publisher_name:** Newcastle Light Rail
**Real validity window:** 20260907 .. 20261217

## Regenerate

```bash
node scripts/extract-gtfs-calendar-fixture.mjs newcastle <path-to-fresh-zip>
```

This fixture stops covering "today" after 20261217 — the dogfood gate will start
failing then (correctly: the logic is doing its job) and this needs a refresh with a newer
zip. That is expected maintenance, not a bug.
