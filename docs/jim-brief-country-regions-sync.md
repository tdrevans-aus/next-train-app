# Jim brief — Rest of England missing from the country-wide picker; add a sync gate

**Lane:** bug-fix / product mode. `tim-review: no`. **Lane lock:** none. Leave no background
loops, pollers or dev servers running.

## Symptom (production, 14 Sep 2026 12:30 UTC)

Flip PR #387 made `rest-of-england` live (436 stations, `/api/city-stations?city=rest-of-england`
answers). But `GET /api/country-stations?country=gb-eng` still returns 15 regions and 2,221
stations — `rest-of-england` is absent — so with Region on "All" a rider searching for any of
those 436 stations gets "No match". The stations are reachable only by picking "Rest of
England" in the optional region filter, which defeats the point of the country-wide picker.

## Cause

`lib/cities/country-regions.js` (added by PR #383) is a hand-maintained city→country table.
It has every region that existed on 13 Sep but not `rest-of-england`. The flip PR updated the
six live-list copies that `qa/live-city-lists-sync.mjs` enforces, and this table isn't one of
them.

## Fix

1. Add `"rest-of-england": "gb-eng"` to `lib/cities/country-regions.js`.
2. Make it impossible to miss again: extend `qa/live-city-lists-sync.mjs` (or add a sibling
   gate in the smoke tier, whichever is cleaner) to assert that every city in the registry —
   live *and* planned, since planned regions must show as "(Coming Soon)" headers — has an
   entry in `country-regions.js`, and that no entry names a city the registry doesn't have.
   Confirm the gate fails on master before your change and passes after.
3. Check `api/country-stations.js` needs nothing else for a region added after its cache was
   built (it caches per country in memory; a cold function instance will rebuild, but make sure
   there is no long-lived process-level cache that hides a new region until redeploy).

## Acceptance criteria

1. `GET /api/country-stations?country=gb-eng` on the PR's Vercel preview returns 16 regions
   including `rest-of-england`, and a station only that region holds (pick one from
   `lib/cities/rest-of-england/stations.json`) appears in the response.
2. The new/extended gate is in the smoke tier and passes; it is proven to fail when
   `rest-of-england` is removed from the table.
3. `node qa/run-all.mjs --smoke` green (foreground, 600000 ms timeout).

## Process

Worktree from current master; copy this brief in; commit, push; PR "Picker: add Rest of England
to country-regions and gate the table against the registry".
