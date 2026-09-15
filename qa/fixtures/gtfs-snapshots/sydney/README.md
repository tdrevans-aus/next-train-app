# sydney — local GTFS fixture (calendar for staleness, trimmed trips for direction-match)

Not the whole feed. Two gates read this directory via `loadGtfsStaticFromDirectory`
(`qa/lib/local-gtfs-snapshot.mjs`), and neither touches the network:

- `qa/sydney-dogfood-gate.mjs` — `assertSnapshotNotStaleTodayOrSkip` reads `calendar.txt` /
  `calendar_dates.txt` (real rows, trimmed; docs/jim-brief-blob-transfer-reduction.md).
- `qa/sydney-direction-match.mjs` (FB-62) — reads `routes.txt` / `trips.txt` / `stop_times.txt`
  to prove every FB-62 chip matches a scheduled trip at each acceptance station. Before this
  fixture existed the gate downloaded Sydney's full static zip from the Vercel Blob store on
  every smoke/CI run — the last smoke-tier consumer of the transfer allowance that #357 was
  written to protect (the 10 Sep 2026 exhaustion took seven live cities down).

## What the trip rows are

Representative, not captured: no Sydney zip was on disk when this was built and downloading one
is the traffic being removed. Every value is real in the sense the gate cares about — the
`stop_id`s are the catalog's own platform ids for Macarthur, Campbelltown, Revesby, Leppington,
Liverpool, Bankstown and Olympic Park; `route_short_name`s are the real T-line numbers;
`trip_headsign`s are verbatim members of `CHIP_HEADSIGN_GROUPS` in
`lib/cities/sydney/marketing-directions.js`, which FB-62 derived from the real GTFS headsign
population. One trip per (station, chip) pair the gate asserts on — plus a second T2 City Circle
trip at Liverpool only, so `qa/sydney-direction-match-negative.mjs` can remove Leppington's trip
and hit the per-station assertion rather than the network-wide one — nothing else. So this is a
**logic check** (does chip-matching work against the shapes the real feed uses) rather than a
reality check. Whether the CURRENTLY PUBLISHED snapshot still carries those headsigns is
`qa/prod-sweep.mjs`'s job, on a schedule.

Deliberately absent: any T6/T7 trip headed for the City Circle. The gate asserts T6/T7 must
NOT gain a City Circle chip, and that the real feed has no such trips is the finding FB-62
recorded — keep it that way here.

**14 Sep 2026 (docs/jim-brief-sydney-intercity-fill.md):** added `BMT`/`CCN`/`SCO`/`SHL`/`HUN`
routes and one trip each way for a representative acceptance station per new line — Katoomba
(BMT), Gosford (CCN), Wollongong (SCO), Moss Vale (SHL), Maitland (HUN, both branches: Dungog
and Scone). BMT has a second "Central"-headsign trip at Springwood (`BMT-CENTRAL-2`), same
reason T2 has a second City Circle trip at Liverpool: so
`qa/sydney-direction-match-negative.mjs` can drop only Katoomba's trip and hit the per-station
assertion rather than the network-wide one. The Central-side stop_id on each of those trips reuses one of Central's own real
platform ids (`2000321`) already in `lib/cities/sydney/stations.json`.

**15 Sep 2026 (Round 2, docs/jim-brief-sydney-intercity-fill.md):** `TFNSW_API_KEY` became
available and `lib/cities/sydney/stations.json`'s `nswtrains-pending-*` placeholder ids were
all resolved to real platform stop_ids. This fixture's intercity-station stop_id on each trip
was updated to match: Katoomba `2780201`, Springwood `2777191`, Gosford `2250791`, Wollongong
`2500401`, Moss Vale `2577201`, Maitland `2320311` — the catalog station's first real stopIds
entry in each case. Keep these in sync if a future stop id re-resolution changes which id is
first for a station (the gate matches by exact stop_id, not by name).

`service_id` on every trip is a real calendar row from `calendar.txt`; the gate does not
evaluate calendars, so which row is irrelevant, but the trips must reference something that
exists.

## Calendar refresh

**Source zip:** C:\Users\tdrev\AppData\Local\Temp\claude\C--Users-tdrev-Projects-next-train-app\1bbd2b25-bfba-41a6-8789-fda413e3cdec\scratchpad/sydney.zip
**Extracted:** 2026-09-12
**Real validity window:** 20260823 .. 20261121

```bash
node scripts/extract-gtfs-calendar-fixture.mjs sydney <path-to-fresh-zip>
```

The script rewrites `calendar.txt` / `calendar_dates.txt` only and preserves any
`stops`/`routes`/`trips`/`stop_times` table that already has data rows (it prints which). After
a refresh, check `trips.txt` still references a `service_id` present in the new `calendar.txt`
(only matters for tidiness — nothing joins them). The calendar stops covering "today" after
20261121 — the dogfood gate will start failing then (correctly) and needs a refresh with a
newer zip. Expected maintenance, not a bug.
