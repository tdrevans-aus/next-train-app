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

**Superseded by docs/jim-brief-registry-driven-client.md (27 Sep 2026).** Sections 3–6 below
(the `public/app.js` `LIVE_CITY_IDS`/`NEARBY_MULTI_CITY_IDS` lists, `public/city-session.js`'s
own `MULTI_CITY_IDS` + `COUNTRIES` table, `public/brisbane-dogfood.js`'s `MULTI_CITY_IDS` +
`available` map, and `public/journey-model.js`'s `PERSISTED_CITY_IDS`/`PERSISTED_COUNTRY_IDS`)
no longer exist — the client now loads all of that from the `/api/cities` manifest
(`window.CityManifest`, built by `lib/cities/city-manifest.js` from the registry,
`lib/cities/country-regions.js`, and `lib/cities/city-bounds.js`) instead of bundling its own
copy, so a flip is now just: (1) flip `status` in the registry (section 1 below, plus adding
the city's country/region and bounds-box data there if it's the country's first region —
`lib/cities/country-regions.js`'s `CITY_COUNTRY`/`COUNTRY_NAMES` and
`lib/cities/city-bounds.js`'s `CITY_BOUNDS`); (2) regenerate the seed via
`node scripts/write-city-manifest.mjs` and commit `public/city-manifest.seed.{json,js}`; (3) keep
`lib/cities/live-city-api.js`'s `MULTI_CITY_IDS` in sync (section 2 below — this one server-side
list is unchanged, it's the actual authorization gate, not a client copy). Sections 3–6's
step-by-step instructions are kept below for history/context only — do not follow them for a
flip after this date. `qa/live-city-lists-sync.mjs` (rewritten the same day) now checks the
registry, `live-city-api.js`, the built manifest, and that no hardcoded city-id list survives
in `public/*.js` outside `public/city-manifest.js`, plus that both seed files
(`public/city-manifest.seed.{json,js}`) match what the script would produce right now.

## 1. Registry — `lib/providers/registry.js`

- [ ] `status: "planned"` → `status: "live"` on the city's entry.
- [ ] Rewrite the `notes` tail: drop "Not in the picker until live. Do not flip live." (or
      any older "Picker Coming Soon" wording) and record the flip ("Testers live (flipped by
      Tim <date>); not a store listing.") plus any standing caveat that survives the flip
      (for Göteborg: "Boards are schedule-only until Trafiklab publishes vt TripUpdates.").

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
- [ ] Add the city's entry to `COUNTRIES` → regions (or, if it already has one from earlier
      flip-readiness scaffolding, drop `comingSoon: true` from it). **Since 27 Sep 2026
      (docs/jim-brief-no-coming-soon-picker.md) a planned city gets no picker entry at all —
      cities are in or out, never "Coming Soon" — so for a normal new city this is where its
      picker row is added for the first time, in this flip commit, not before it.**

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
      the picker entry to exist and not carry `comingSoon`. Update the header comment and PASS
      line.
- [ ] **`qa/<city>-line-map-conformance.mjs`**: same inversion of its C0 block
      (`assertCityLive` passes, status live, `isMultiCity` true); update header + PASS line.
- [ ] **Sibling cities' gates**: any other gate asserting this city stays planned must flip
      that assertion. For Göteborg: `stockholm-dogfood-gate.mjs`
      (`assertCityLive("goteborg")?.ok === true`) and `stockholm-planned-gate.mjs` (its
      picker regex no longer requires `comingSoon: true` on the Göteborg entry, or — since
      27 Sep 2026 — no longer expects a Göteborg picker row to exist at all pre-flip). Find
      them with `grep -l <city> qa/*.mjs`.
- [ ] **`qa/bundled-city-directions.mjs`**: the city moves from the "bundled ahead of the
      flip" comment/tally into the `MULTI_CITY_IDS`-driven count; update the trailing
      console.log tally.
- [ ] **`qa/region-selection.mjs`**: update the picker-label expectations — the city's picker
      row now exists (added in this flip commit, see section 4) and `applyCity(<city>)` must
      now *succeed* (`afterX === "<city>"`).

## 8. Verify

- [ ] `node qa/live-city-lists-sync.mjs` — the list-copy sync gate (below) is green.
- [ ] `node qa/run-all.mjs --smoke` — full smoke, including the flipped city gates and
      `region-selection.mjs` (the script that caught the Göteborg misses).

## Self-enforcement

`qa/live-city-lists-sync.mjs` (in the smoke suite, offline phase) derives the expected live
set from `lib/providers/registry.js` (`status === "live"`) and asserts all the list copies in
sections 2–6 agree: live-city-api `MULTI_CITY_IDS`, app.js `LIVE_CITY_IDS` +
`NEARBY_MULTI_CITY_IDS`, city-session `MULTI_CITY_IDS` + picker entries (present, not
`comingSoon`), brisbane-dogfood `MULTI_CITY_IDS` + `available`, and journey-model
`PERSISTED_CITY_IDS` + `PERSISTED_COUNTRY_IDS` (via the picker's city→country mapping).
`qa/country-regions-sync-gate.mjs` additionally asserts no picker region ever carries
`comingSoon` and every picker region names a `status: "live"` registry city
(docs/jim-brief-no-coming-soon-picker.md, 27 Sep 2026).

So in practice: flip the registry status (step 1), run the gate, and it enumerates every list
still missing the city. Steps 7's per-city gate semantics remain manual — the sync gate
checks list membership, not QA assertions.
