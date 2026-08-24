# Brisbane SEQ GTFS fixture (rail-only)

**Source:** https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip
**Trimmed:** 2026-08-22
**Feed span:** 20260822 → 20261021

## Regenerate

```bash
node scripts/trim-brisbane-gtfs.mjs
node scripts/build-line-map.mjs --city=brisbane
```

## Trim rules

- `route_type === 2` (rail) only
- Trips, stop_times, calendar rows restricted to included rail services
- Parent stations and all child platform stops retained for used rail stops
