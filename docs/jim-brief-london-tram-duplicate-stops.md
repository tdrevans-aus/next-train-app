# Jim brief — London picker shows every Tramlink stop 2–3 times ("Addington Village" ×3)

**Lane:** bug-fix / product mode (CLAUDE.md "Bug-fix lane"). Authorises changes to
`scripts/build-uk-london-tfl-catalog.mjs`, `lib/cities/uk-london-tfl/stops.json`,
`lib/providers/uk/catalog.js`, `lib/providers/uk-tfl.js`, `public/station-combobox.js` and QA.
`tim-review: no`. UK lane lock checked free by the top-level session on 7 Sep 2026; this is a
catalog rebuild for an already-live region, not a new region, so no `acquire` is needed.

## Symptom (Tim, phone, 7 Sep 2026)

In London the station picker lists "Addington Village" three times with nothing to tell them
apart. The same is true for almost every London Trams stop.

## Cause (triaged)

`scripts/build-uk-london-tfl-catalog.mjs` takes every StopPoint returned by
`/Line/{id}/StopPoints` and dedupes only on `naptanId`. For tram lines TfL returns the hub
(`940GZZCR…`, stopType NaptanMetroStation) **and** each platform (`9400ZZCR…1`, `…2`,
NaptanMetroPlatform), so the catalog has 66 platform-level rows shadowing 40-odd hubs:

- 40 names appear more than once with identical `modes` (all `["tram"]`, plus Clapham Junction
  `910GCLPHMJ1` / `910GCLPHMJC`, and West Croydon which has both a 9400 platform and a 910G
  rail id alongside the 940G hub).
- `public/station-combobox.js` `disambiguationSuffixesFor()` only adds a suffix when the
  duplicates differ by mode, so same-mode duplicates render as bare identical rows.
- `lib/providers/uk-tfl.js` `fetchStopBoard()` resolves by name and fetches Arrivals for every
  matching naptanId, merging by trip id, so all three rows give the same board today.

Count check used in triage (paste into node from repo root):

```js
const s=require('./lib/cities/uk-london-tfl/stops.json');const arr=s.stops||s.stations;
const m={};for(const x of arr)(m[x.name]??=[]).push(x);
Object.entries(m).filter(([,v])=>v.length>1&&new Set(v.map(x=>x.modes.join())).size<v.length).length // 40
```

## Required behaviour

1. Each London stop name appears in the picker once per mode. Cross-mode duplicates (Bank
   tube/DLR, Paddington tube/Elizabeth line, …) keep today's ` — Tube` / ` — DLR` suffix
   behaviour; same-mode duplicates must not exist in the catalog at all.
2. The builder drops platform-level StopPoints when a hub for the same station exists
   (prefer filtering on `stopType`; fall back to the `9400…` / `…1`/`…2` id pattern if the
   endpoint omits it). Where two hub-level ids share name+mode (Clapham Junction rail pair,
   West Croydon 940G vs 910G), keep one primary row and record the others in an
   `alsoNaptanIds` (or similar) array on that row.
3. Boards must not lose trains. `fetchStopBoard()` must still fetch Arrivals for the retained
   ids **plus** any `alsoNaptanIds` / dropped platform ids if the hub Arrivals call does not
   already return both directions for trams. Verify with `TFL_APP_KEY` set:
   `node scripts/probe-uk-london-tfl-board.mjs "Addington Village"` before and after must show
   the same set of trips (both directions). If the key is missing locally, say so in the PR
   and fall back to comparing against the recorded fixture in `qa/fixtures/uk-london-tfl/`.
4. Saved routes and pins that stored a platform naptanId or the plain name keep working
   (`resolveTflStops` still resolves dropped ids to the primary row).
5. Rebuild `stops.json` with the script (needs `TFL_APP_KEY`); if the key is unavailable,
   apply the same dedupe as a post-processing pass in the script and run it over the existing
   file, and say which happened. `stopCount` and `retrievedAt` in the file header must match.

## Acceptance criteria

- A1: the node count check above returns 0.
- A2: picker search for "Addington" in London shows one Addington Village row (browser QA).
- A3: `fetchStopBoard("Addington Village")` returns trips for both directions (live probe or
  fixture, as in behaviour 3).
- A4: `resolveTflStops("9400ZZCRADV1")` resolves to the Addington Village primary row.
- A5: `qa/uk-london-tfl-network-sweep.mjs`, `qa/london-direction-match.mjs`,
  `qa/london-nearby-chips.mjs`, `qa/london-se-national-rail-dogfood-gate.mjs` pass.
- A6: `node qa/run-all.mjs --smoke` green.

## QA

New gate `qa/london-catalog-no-duplicate-stops.mjs` asserting A1 and A4 against the committed
catalog (no network), registered in the smoke tier of `qa/run-all.mjs`. Extend an existing
London browser script or add a small one for A2. Port 3000 may be held by another process;
use the dev-server helper's fallback rather than killing anything.

## Delivery

Branch `london-tram-duplicate-stops`, commit, push, open a PR linking this brief and stating
which of behaviours 3 and 5 were verified live versus from fixture. Leave no background
sleep/poll loops or dev servers running.
