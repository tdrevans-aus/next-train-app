# Live-flip checklist: planned → tester-live

Every touchpoint required to flip a city from `planned` to tester-live, derived from the
Göteborg flip (PR #129 "Flip Göteborg tester-live", merged 29 Aug 2026: `e2867b8` plus
follow-ups `daa949e` / `58a3ea4`). The flip commit missed **three** of the list copies below
and CI caught it only via `qa/region-selection.mjs` Test 5 — hence this checklist, and the
gate that now enforces it (see "Self-enforcement" at the bottom).

Precondition: the city is adapter-ready (`adapterReady: true`, D1 pack complete, Mark's QA
pass done) and **Tim has decided to flip** — the live-flip is always a human call, never an
agent's (see CLAUDE.md).

Throughout, `<city>` is the registry city id (e.g. `goteborg`) and `<cc>` is its two-letter
picker country id (e.g. `se`).

## 1. Registry — `lib/providers/registry.js`

- [ ] `status: "planned"` → `status: "live"` on the city's entry.
- [ ] Rewrite the `notes` tail: drop "Picker Coming Soon. Do not flip live." and record the
      flip ("Testers live (flipped by Tim <date>); not a store listing.") plus any standing
      caveat that survives the flip (for Göteborg: "Boards are schedule-only until Trafiklab
      publishes vt TripUpdates.").

## 2. Server API allowlist — `lib/cities/live-city-api.js`

- [ ] Add `<city>` to the `MultiCityId` typedef union.
- [ ] Add `<city>` to `MULTI_CITY_IDS`.
- [ ] Delete the pre-flip comment in `directionsFor()`'s branch for the city ("deliberately
      NOT in MULTI_CITY_IDS … until Tim adds it"), if one was left there.

## 3. Live app — `public/app.js`

- [ ] Add `<city>` to `LIVE_CITY_IDS` (this set includes `perth`).
- [ ] Add `<city>` to `NEARBY_MULTI_CITY_IDS` (this list does not include `perth`).

## 4. Picker + session — `public/city-session.js`

This file keeps **its own copy** of `MULTI_CITY_IDS`, separate from live-city-api's.

- [ ] Add `<city>` to the file-local `MULTI_CITY_IDS`.
- [ ] Remove `comingSoon: true` from the city's entry in `COUNTRIES` → regions. Leave planned
      siblings' flags alone (Stockholm stayed `comingSoon: true` next to Göteborg).

## 5. Dogfood mount — `public/brisbane-dogfood.js`  *(missed by the Göteborg flip commit)*

Another file-local `MULTI_CITY_IDS` copy; without it the mount fails with
"City not in multi-city list: `<city>`".

- [ ] Add `<city>` to the file-local `MULTI_CITY_IDS`.
- [ ] Add `<city>: true` to the `available` map in `state`.

## 6. Settings persistence — `public/journey-model.js`  *(missed by the Göteborg flip commit)*

The settings sanitizer **silently drops** a `savedCity` / `savedCountry` not on these
allowlists — the symptom is the city reverting on every persist, not an error.

- [ ] Add `<city>` to `PERSISTED_CITY_IDS`.
- [ ] For the first live city in a new country: add `<cc>` to `PERSISTED_COUNTRY_IDS`
      (Göteborg needed `se` added).

## 7. QA gates — `qa/`

Flip the city's own gates from planned to live semantics, and fix sibling cities' gates that
assert about this city:

- [ ] **Retire `qa/<city>-planned-gate.mjs`** — delete the file and remove it from
      `SMOKE_SCRIPTS` in `qa/run-all.mjs`. First absorb its *unique* checks (registry
      identity, D1-pack file presence, catalog counts, wrong-id guards) into the dogfood
      gate — don't just delete them (see what `goteborg-dogfood-gate.mjs` gained in
      `e2867b8`).
- [ ] **`qa/<city>-dogfood-gate.mjs`**: invert the planned assertions —
      `assertCityLive(<city>)?.ok === true`, registry `status === "live"`,
      `isMultiCity(<city>) === true`, and the source-regex checks now *require* the city in
      `LIVE_CITY_IDS` / `NEARBY_MULTI_CITY_IDS` / city-session `MULTI_CITY_IDS`, and require
      the picker entry *not* comingSoon. Update the header comment and PASS line.
- [ ] **`qa/<city>-line-map-conformance.mjs`**: same inversion of its C0 block
      (`assertCityLive` passes, status live, `isMultiCity` true); update header + PASS line.
- [ ] **Sibling cities' gates**: any other gate asserting this city stays planned must flip
      that assertion. For Göteborg: `stockholm-dogfood-gate.mjs`
      (`assertCityLive("goteborg")?.ok === true`) and `stockholm-planned-gate.mjs` (its
      picker regex no longer requires `comingSoon: true` on the Göteborg entry). Find them
      with `grep -l <city> qa/*.mjs`.
- [ ] **`qa/bundled-city-directions.mjs`**: the city moves from the "bundled ahead of the
      flip" comment/tally into the `MULTI_CITY_IDS`-driven count; update the trailing
      console.log tally.
- [ ] **`qa/region-selection.mjs`**: update the picker-label expectations — country label
      loses "(Coming Soon)" if this was its first live city, the city's label loses
      "(Coming Soon)", and `applyCity(<city>)` must now *succeed* (`afterX === "<city>"`).

## 8. Verify

- [ ] `node qa/live-city-lists-sync.mjs` — the list-copy sync gate (below) is green.
- [ ] `node qa/run-all.mjs --smoke` — full smoke, including the flipped city gates and
      `region-selection.mjs` (the script that caught the Göteborg misses).

## Self-enforcement

`qa/live-city-lists-sync.mjs` (in the smoke suite, offline phase) derives the expected live
set from `lib/providers/registry.js` (`status === "live"`) and asserts all the list copies in
sections 2–6 agree: live-city-api `MULTI_CITY_IDS`, app.js `LIVE_CITY_IDS` +
`NEARBY_MULTI_CITY_IDS`, city-session `MULTI_CITY_IDS` + picker `comingSoon` flags,
brisbane-dogfood `MULTI_CITY_IDS` + `available`, and journey-model `PERSISTED_CITY_IDS` +
`PERSISTED_COUNTRY_IDS` (via the picker's city→country mapping).

So in practice: flip the registry status (step 1), run the gate, and it enumerates every list
still missing the city. Steps 7's per-city gate semantics remain manual — the sync gate
checks list membership, not QA assertions.
