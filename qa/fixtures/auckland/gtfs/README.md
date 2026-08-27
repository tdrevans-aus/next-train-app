# Auckland AT GTFS fixture (suburban TRAIN)

**Source:** https://gtfs.at.govt.nz/gtfs.zip
**Trimmed:** 2026-08-27
**Feed span:** 20260819 → 20261129

## Regenerate

```bash
node scripts/trim-auckland-gtfs.mjs
```

## Trim rules

- `route_type === 2` and `route_short_name` in STH, EAST, WEST, ONE
- **Exclude HUIA (Te Huia)**
- Parent stations + child platforms for used rail stops
- Do **not** generate `published-network.json` (Tim copies Luke D1)
