# Jim brief — country-wide picker must hide no-live-feed stops (regression from PR #383)

**Lane:** bug-fix / product mode. `tim-review: no` — restores documented behaviour, no copy
change. **Lane lock:** none (`public/` + `api/` only). Leave no background loops or servers.

## Symptom

Since PR #383 (country-wide picker, merged 14 Sep 2026 as commit 8d10880) the "All" station
list offers stops that can never produce a board. Production, 14 Sep 2026:
`GET /api/country-stations?country=gb-sct` returns 399 rows, 37 of them `liveFeed: false`
(Edinburgh Trams stops such as Balfour Street, Balgreen, Bankhead, Edinburgh Airport; Glasgow
Subway stops such as Kelvinhall). A rider who picks one gets the "feed unverified" error.

The per-region path never showed these: `public/app.js` around line 5527 filters
`liveFeed: false` out of the region list ("a station that can never produce a board must never
be offered"), and each region's `coverage.json` promises exactly that. The new
`renderCountryList()` in `public/station-combobox.js` renders `/api/country-stations` rows
without applying that filter. `qa/no-live-feed-stops-gate.mjs`'s browser check has been failing
on master since the merge for this reason (Jim, PR #385 description).

## Fix

1. Apply the same `liveFeed === false` exclusion to the country-wide list, at one shared point
   the region list also uses, so the two paths cannot drift again. Server-side filtering in
   `api/country-stations.js` is also acceptable **in addition**, but the client must filter
   regardless (cached lists from before the fix).
2. Keep such stops out of the "Your routes" and "Near you" groups and out of search results.
3. Do not change what the region list shows; do not touch `lib/cities/` or `lib/providers/`.

## Acceptance criteria

1. With "All" selected for Scotland, typing "kelv" or "balg" shows no result; the "No match"
   sentence appears (with its coming-soon suffix only where that country has planned regions).
2. `qa/no-live-feed-stops-gate.mjs` passes in full on this branch, including its browser check,
   with no change to its assertions other than the sample-stop swap PR #385 already made if
   that has merged first (rebase on master before running).
3. `qa/country-wide-picker.mjs` gains a case: seed the country list cache with a
   `liveFeed: false` row and assert it never renders in any group or search result.
4. `node qa/run-all.mjs --smoke` passes (foreground, 600000ms timeout, no pollers).

## Process

Worktree; copy this brief in; commit, push; PR "Picker: hide no-live-feed stops from the
country-wide list (fixes #383 regression)" linking this brief.
