# canberra — local calendar-only GTFS fixture

Not the whole feed — just enough for `assertSnapshotNotStaleTodayOrSkip` to exercise real
staleness-detection logic without a network fetch
(docs/jim-brief-blob-transfer-reduction.md). `stops.txt`/`routes.txt`/`trips.txt`/
`stop_times.txt` are header-only (loadGtfsStaticFromDirectory requires the file to exist,
but nothing here reads their rows). Real-snapshot freshness in production is monitored on
a schedule by qa/prod-sweep.mjs and qa/gtfs-live-blob-snapshot-integrity.mjs, not here.

**Source zip:** https://www.transport.act.gov.au/googletransit/google_transit_lr.zip (published copy https://n1sivhxcnzarmc6t.public.blob.vercel-storage.com/gtfs/canberra.zip) - fetched and extracted 2026-11-22 (PR #542); the exact local download path was not recorded
**Extracted:** 2026-11-22
**feed_version:** 20261012
**feed_publisher_name:** Canberra Metro Operations
**Real validity window:** 20260731 .. 20270729

## Regenerate

```bash
node scripts/extract-gtfs-calendar-fixture.mjs canberra <path-to-fresh-zip>
```

This fixture stops covering "today" after 20270729 — the dogfood gate will start
failing then (correctly: the logic is doing its job) and this needs a refresh with a newer
zip. That is expected maintenance, not a bug.
