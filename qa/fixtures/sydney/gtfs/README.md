# Sydney GTFS fixture (T1–T9 + M1)

**Source:** https://opendata.transport.nsw.gov.au/data/dataset/d1f68d4f-b778-44df-9823-cf2fa922e47f/resource/67974f14-01bf-47b7-bfa5-c7f2f8a950ca/download/full_greater_sydney_gtfs_static_0.zip
**Trimmed:** 2026-08-23
**Feed span:** 20260823 → 20260921

Public Greater Sydney complete zip (no `TFNSW_API_KEY`). Gateway schedule/RT URLs still 401 without a key.

## Regenerate

```bash
python scripts/trim-sydney-gtfs.py /path/to/full_greater_sydney_gtfs_static_0.zip
node scripts/build-line-map.mjs --city=sydney
```

## Trim rules

- `route_short_name` in T1–T9 and M1 only (Sydney Trains + Metro)
- No light rail, ferry, bus, or NSW TrainLink regional
- M1 in this zip is `route_type` 401 (not GTFS subway 1)
- T1–T9 are `route_type` 2
- Trips, stop_times, calendar rows restricted to those routes
- Parent stations and all child platform stops retained for used stops
- `shapes.txt` omitted
