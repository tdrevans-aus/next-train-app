# Jim brief — Release 1 scope cut: retire Auckland, Wellington, Amsterdam, Rotterdam, Vancouver (7 Sep 2026)

**Dispatched:** 7 Sep 2026 (Tim's decision) · **Lane:** registry / live lists (touches NZ, NL, CA
entries; no UK, AU or SE change) · **Model:** sonnet (pinned; no override) · **Branch:**
`release-1-scope-cut` from master.

## Decision

Tim, 7 Sep 2026: "for release 1 we keep Aus but drop NZ, Rotterdam and Canada. Sweden can stay." Clarified minutes later: "When I said Rotterdam, I meant all of Netherlands."
Release-1 live set is therefore: Perth + the six Australian GTFS cities, all 20 UK regions,
Stockholm, Göteborg, Malmö, Uppsala, Helsinki, Oslo. The Netherlands is out entirely.

Cities to retire: `auckland`, `wellington`, `amsterdam`, `rotterdam`, `vancouver`.

Reason recorded for the tracker/backlog: these are static-join cities (GTFS-Realtime over a
hosted static snapshot) outside the release-1 markets; the snapshot-freshness work
(`docs/jim-brief-gtfs-snapshot-freshness.md`) is being scoped to the cities we keep.

## What "retire" means

Not "planned" — that renders as Coming Soon in the picker and implies a promise. Add a third
registry status, `retired`, with these semantics:

- `assertCityLive()` returns `ok: false` with 501 exactly as for `planned` (it already keys on
  `status !== "live"`; check `lib/providers/contract.js` and any status enum/validation and add
  `retired` there).
- The picker (`public/city-session.js` `COUNTRIES`/regions) does **not** show a retired city at
  all. If that empties a country (New Zealand, the Netherlands, Canada), the country disappears too. Do not leave
  a `comingSoon` flag on them.
- Nearby/GPS region resolution (`public/app.js` nearby lists, `city-session.js` `CITY_BOUNDS`)
  must not resolve a rider to a retired city; a rider physically in Vancouver gets the existing
  out-of-area copy (see `qa/unsupported-region.mjs`, `qa/nearby-region-preference.mjs`).
- A rider with a persisted journey/pin in a retired city must not crash: `journey-model.js`
  persisted-city lists drop the city, and loading old persisted state for it degrades the same
  way an unknown city does today (verify with a test that seeds a saved Vancouver journey and one for Amsterdam).
- Adapters, catalogs, line maps, D1 packs and their gates stay in the repo. Each retired city's
  `*-dogfood-gate.mjs` is switched to assert the retired form (status `retired`, not in any live
  list, 501 from `assertCityLive`, adapter still loads), the same way `*-planned-gate.mjs` files
  assert the planned form. Their network-sweep / attribution / line-map gates stay registered
  only if they run offline; drop any that live-probe the agency from the smoke tier and say so.

## Files (expected)

`lib/providers/registry.js` (five `status` lines → `"retired"`, notes line each: "Retired from
release 1, 7 Sep 2026 (Tim): static-join city outside launch markets; adapter kept"),
`lib/providers/contract.js` (status enum), `lib/cities/live-city-api.js` (`MULTI_CITY_IDS` +
typedef), `public/app.js` (both lists), `public/city-session.js` (lists, `COUNTRIES`,
`CITY_BOUNDS`), `public/brisbane-dogfood.js` (list + available map), `public/journey-model.js`,
`qa/live-city-lists-sync.mjs` (must still pass: live set = 33), `qa/uk-planned-gate.mjs` only if
it enumerates non-UK cities, the five dogfood gates, `qa/run-all.mjs` registrations, and
`docs/expansion-tracker/cities.csv` rows for Auckland, Wellington, Amsterdam, Rotterdam, Vancouver:
Status `Parked`, Stage `Retired (release 1 scope cut)`, Waiting on `Post-launch review: API-first
expansion / aggregator viability (FB-65, FB-66)`.

## Verify

- `node qa/live-city-lists-sync.mjs` → ok, 33 live cities.
- The five retired gates pass in their retired form; every other city's dogfood gate still passes
  (run the UK, AU and SE ones with `--env-file=.env.local` from the main checkout's `.env.local`).
- `node qa/region-selection.mjs`, `qa/unsupported-region.mjs`, `qa/nearby-region-preference.mjs`,
  `qa/dogfood-mount-race-gate.mjs` — these are browser scripts; do not run them locally (port
  3000 is held by an unrelated dev server), rely on CI's web-qa and say so in the PR.
- `curl` of `/api/city-stations?city=vancouver` on a local dev server is not required; assert
  via `assertCityLive("vancouver")` in the gate instead.

This is a scope change to the live product, so open the PR labelled `flip` (it is the reverse of a
flip and should be reviewed the same way) with the list of retired cities and the picker
before/after in the description. Do not merge it.
