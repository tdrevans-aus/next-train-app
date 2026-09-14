# Jim brief — picker "Near you" group should show the nearest five stations

**Lane:** bug-fix / product mode. `tim-review: no` (behaviour already specified in the picker
brief; this completes it). **Lane lock:** none. Leave no background loops, pollers or dev servers.

## Symptom

`docs/jim-brief-country-wide-station-picker.md` section 3 asked for a *Near you* group of the
nearest 5 stations when a location fix is already cached, without triggering a new prompt.
PR #383 shipped it as a single row: the one station Near me last resolved to, because
(Jim's note) "no reusable raw lat/lng cache exists app-wide". So the group is usually one row,
and it's the station the rider already had, which is rarely what they open the picker for.

## Fix

1. Find where Near me obtains its position (`getAppGeolocationPosition` in `public/app.js` and
   the `NextTrainCitySession` GPS-follow path in `public/city-session.js`). Add a small
   last-known-position cache (lat, lng, timestamp) written by those existing call sites, stored
   in memory and in `localStorage` under one key, wrapped in try/catch, never read for anything
   safety-critical. Do **not** add a new geolocation request anywhere; the picker only reads
   the cache.
2. In `public/station-combobox.js`'s country-wide list, when the cache is present and younger
   than 30 minutes, compute the five nearest `liveFeed`-true stations by haversine distance
   from the country list (which carries lat/lng) and show them under *Near you*, nearest first,
   each row with its region tag and a short distance ("1.2 km"). When the cache is absent or
   stale, fall back to today's single-row behaviour. When the region filter is set to one
   region, restrict to that region.
3. Keep the "Your routes" group above it and the de-duplication between groups.

## Acceptance criteria

1. `qa/country-wide-picker.mjs` gains a case that seeds the position cache with a fixed
   coordinate (use a Perth or Sydney coordinate from the catalog) and asserts exactly five
   rows under *Near you*, in distance order, none with `liveFeed: false`, and no geolocation
   call made (stub `navigator.geolocation` to throw and assert it was not invoked).
2. A case with no cache asserts today's behaviour is unchanged.
3. `node qa/run-all.mjs --smoke` green (foreground, 600000 ms timeout).
4. No `lib/` changes.

## Process

Worktree from current master; copy this brief in; commit, push; PR "Picker: Near you shows the
nearest five stations from the cached position".
