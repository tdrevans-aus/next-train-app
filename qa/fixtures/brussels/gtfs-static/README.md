# Brussels GTFS static fixture (offline, calendar-only + trimmed schedule)

Local, committed fixture for `qa/brussels-planned-gate.mjs`'s "live schedule board" assertions
(docs/jim-brief-brussels-gate-pinned-clock.md). It replaces a real network fetch of STIB/MIVB's
GTFS static feed with `loadGtfsStaticFromDirectory` (`lib/providers/gtfs/static-cache.js`) over
these small `.txt` tables — same pattern PR #357 established for the seven dogfood gates'
staleness check via `loadGtfsStaticFromDirectory`.

## Why this exists

The gate used to pin `now` to a fixed moment ("2026-09-01T08:00:00+02:00") and fetch STIB/MIVB's
*real, live* GTFS static feed. STIB rolled its published calendar over to 20260914..20261011
roughly 11 hours after the pin was written, and the runtime staleness check
(`lib/providers/gtfs/board.js`) correctly refused a board dated 1 Sep against it — a smoke-tier
gate depending on live upstream data, failing for reasons unrelated to the code. This fixture
moves the gate from "reality check" to "logic check": whether our board-building, terminus
resolution, and self-referential-arrival filtering are correct is testable locally; whether STIB's
*currently published* feed is fresh is a job for a scheduled/nightly live check, not a PR gate.

## Shape

Real STIB/MIVB stop_ids (from `lib/cities/brussels/stations.json`) for the hub
(Arts-Loi / Kunst-Wet: 8041/8042/8401/8402), Simonis (8763/8764), and Elisabeth (8471/8472), plus
their immediate neighbours on lines 1, 2, and 6 (Stockel, Gare de l'Ouest, Roi Baudouin). Headsigns
are the real STIB convention (FR, ALL CAPS, single station name) so `resolveTerminus`/
`mapBrusselsDestination` exercise the actual mapping table in
`lib/cities/brussels/marketing-directions.js` against `lib/cities/brussels/line-map.json`.

Trips cover: a Simonis-terminating line-2 trip (self-referential-arrival case), a line-6 trip
continuing through Simonis toward Roi Baudouin (the case that must survive filtering), and
Elisabeth-terminating trips on both line 2 and line 6 (self-referential-arrival case for
Elisabeth), plus a line-2 trip that only passes *through* Elisabeth toward Simonis (must survive
filtering).

`calendar.txt` covers a deliberately wide range (2020-01-01..2030-12-31, every day) so this
fixture does not itself expire on a foreseeable human timescale. `calendar_dates.txt` is present
but empty (header only) — no exceptions needed.

## `now` is derived from the fixture, not hardcoded twice

The gate computes `now` as one day after `calendar.txt`'s `start_date` (via
`snapshotCalendarRange`), rather than pinning a second, independent literal date that could drift
out of sync with the calendar the way the old live-fetch version did. See
`deriveNowFromLocalCalendar` in `qa/brussels-planned-gate.mjs`.

## Refreshing

This is fixture data for logic tests, not a live snapshot — it does not need "refreshing" against
STIB's real feed. If Brussels' real line/terminus set changes, update this fixture's `trips.txt`/
`routes.txt` to match `lib/cities/brussels/line-map.json`, the same way you would update any other
unit-test fixture.
