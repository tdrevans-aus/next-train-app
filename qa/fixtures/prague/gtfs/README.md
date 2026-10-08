# Prague (Metro A/B/C) GTFS fixture

**Source:** https://data.pid.cz/PID_GTFS.zip
**Trimmed:** 2026-10-08
**Feed span:** 20261008 → 20261021
**Kept route_short_name(s):** A, B, C

## Regenerate

```bash
node scripts/trim-prague-gtfs.mjs
node scripts/publish-gtfs-fixture-to-blob.mjs prague
```

## Trim rules

- Routes with GTFS route_type "1" (metro) only — drops tram (0), bus (3), trolleybus (11),
  regional rail / Esko (2), funicular (7), ferry (4)
- Trips, stop_times, calendar rows restricted to included metro services
- Parent stations and all child platform stops retained for used metro stops
- Used for stop_id resolution only (lib/providers/prague.js) — live board content comes from the
  Golemio API, not this static schedule.

Data: Pražská integrovaná doprava (PID) — CC BY 4.0.
