# Mark QA note — Pacific Surfliner wire (LA)

**Branch:** cursor/la-metrolink-in-ruling-84bf  
**Head:** 5b9aa35 (includes 82f57d8, dc33320, 5b9aa35)  
**PR:** https://github.com/tdrevans-aus/next-train-app/pull/535  
**Date:** 2026-10-25  

## Gate result

`node qa/los-angeles-dogfood-gate.mjs` — **exit 0, all sections pass**

```
los-angeles real-feed reachability: 334 station/terminus pairs over 110 stations, 0 unreached
Union Station Metrolink chips: [AV Line + Lancaster, OC Line + Oceanside, SB Line + Redlands - Downtown, SB Line + San Bernardino - Downtown]
Pomona North Metrolink chips: [SB Line + Redlands - Downtown, SB Line + San Bernardino - Downtown, SB Line + Union Station]
los-angeles Metrolink assertions: ok (6a-6i)
los-angeles Metrolink empty-reason assertions: ok (6j + mutation check)
Union Station Surfliner chips: [Pacific Surfliner + Goleta Amtrak, Pacific Surfliner + San Diego, Pacific Surfliner + San Luis Obispo]
los-angeles Surfliner board composition assertions: ok (7d)
los-angeles Surfliner empty-reason assertions: ok (7e)
los-angeles Surfliner mutation checks: ok (7f)
los-angeles Surfliner AMTK trip_id join assertions: ok (7h)
los-angeles Surfliner duplicate short-name calendar selection assertions: ok (7i)
los-angeles Surfliner dogfood directions assertions: ok (7g)
los-angeles-dogfood-gate: ok (…full banner…)
```

## Checklist — brief items

**1. Union Station only; three chips; none at Pomona North or 7th St/Metro Ctr; terminating trip excluded**  
PASS. `staticSurflineChipsForStop` skips any trip whose `terminal.stopId === boardStopId` (line 239 of
`los-angeles.js`), so a train ending at LAX never becomes a chip there. Gate 7b confirms three chips at
LAX, 7c confirms zero at non-Surfliner stops, 7g confirms Pomona North and 7th St/Metro Ctr have no
Surfliner entry in dogfood directions.

**2. Trip-id join: 2026-10-24_AMTK_595 → static trip_short_name 595; routeId present-and-not-78 dropped; AMTK_11 absent**  
PASS. `resolveTripId` in `composeSurflineTripRows` (a) drops immediately if `descriptor.routeId` is
present and not `"78"`, (b) extracts the number from `AMTK_<number>` and calls `resolveSurflineTripId`
against the short-name index, (c) falls back to a raw static-trip-id lookup only for QA fixtures.
Gate 7h: fixture `2026-10-24_AMTK_595` produces one live San Diego row; mutation (no `resolveTripId`)
produces zero rows keyed under the raw realtime id; entity `2026-10-24_AMTK_11` (Coast Starlight,
no route-78 short-name match) never appears.

**3. Calendar-aware selection for duplicate train numbers; skip if still ambiguous after LAX filter; gate 7i mutation**  
PASS. `resolveSurflineTripId` implements the four-step rule from Follow-up 2 exactly: (1) filter by
`activeServices`, (2) if multiple survive filter to those calling at `boardStopId`, (3) if still multiple
or zero return null. Gate 7i: fixture with `761` having one active (weekday, San Diego) and one inactive
(weekend, Goleta Amtrak) trip produces a San Diego row. Mutation (inactive-only fixture) produces 0 rows —
gate goes red if the active-service filter is absent.

**4. Surfliner fetch failure does not drop Metro or Metrolink; static timetable chip with no live row → no-live-predictions**  
PASS. `surflinerPartial` flag isolates the Surfliner source; Metro and Metrolink row arrays are unaffected.
`scheduledSurflineDestinationsRemainingToday` merges into `board.scheduledDestinationsRemaining` even
when `surflinerPartial` is true, so the dogfood layer sees the scheduled chip and returns
`emptyReason: "no-live-predictions"`. Gate 7d and 7e confirm both properties.

**5. status stays planned; long-distance Amtrak excluded; no key in repo**  
PASS. `lib/providers/registry.js` line 677: `status: "planned"`. `lib/cities/los-angeles/coverage.json`
lists Amtrak long-distance trains (Coast Starlight etc.) in `notCovered` with detail "Not covered." No
`AMTRAK_KEY` or `TRANSITDOCS_KEY` constant exists; the transitdocs feed is keyless by design. The
`asm-contact@transitdocs.com` address appears in a comment (line 116) as a courtesy contact note, not
as a functional key.

## No process left running

No dev server or poll loop started. Port :3000/:3001/:3002 clear on exit.

## Verdict

**ALL ITEMS PASS. Gate green (exit 0).**  
No flip opened (as instructed — status stays planned).
