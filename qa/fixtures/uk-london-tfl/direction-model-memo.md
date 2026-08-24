# §3 direction model — decision memo (London TfL)

**Pack:** Zoe / London D1 Oracle  
**Status:** LOCKED 2026-08-24  
**Region:** `uk-london-tfl` only (not WM, not EP, not NR)

## Decision

**Use line + terminus.** Same lock as Brisbane / Sydney.

Examples:

- `Victoria Brixton`
- `Victoria Walthamstow Central`
- `Northern Morden`
- `Elizabeth Abbey Wood`
- `Mildmay Richmond`
- `DLR Lewisham`

Not compass (Northbound). Not terminus-only. Not inbound/outbound.

Chip string must match the board filter. Today `uk-tfl.js` sets `destination` to `lineName + " " + towards` (e.g. `Victoria Walthamstow Central`). Leave-by chips are that same string, with shorts nested under the published terminus (Penrith under Emu Plains, Seven Sisters under Walthamstow Central).

## Why

London is through-running and multi-line at almost every useful stop. King’s Cross without a line name is six unrelated far ends. Compass labels never match `towards`.

| Model | King’s Cross example | Verdict |
|-------|----------------------|---------|
| **Line + terminus** *(locked)* | `Victoria Brixton` | Matches Tube map and CIS `towards` |
| Terminus only | `Brixton` (+ many others) | Collides across lines |
| Compass | `Southbound` | Does not match the board; Jim stub; banned |

## Loops (like City Circle)

- **Circle:** not a terminus chip. Do not invent `Circle Edgware Road` as the product model until we lock a via-label. Nearby can still list Circle arrivals.
- **Waterloo & City:** two ends only: `Waterloo & City Bank` and `Waterloo & City Waterloo`.

## Modes in this oracle

Tube, Elizabeth, DLR, Overground (six named lines), London Trams. No buses. No National Rail that is not a TfL mode.

## Jim

Replace the stub in `lib/cities/live-city-api.js` (`All trains` / North / South / East / West). Directions for a stop = chips for the **lines that serve that stop** in `published-network.json`, excluding the terminus you are already at. Filter leave-by with the existing destination match, plus short-turn groups from the oracle. Do not generate chips from GTFS or from compass.

Nearby “what’s next” may still show every trip. Saved journeys must pick a line+terminus chip.
