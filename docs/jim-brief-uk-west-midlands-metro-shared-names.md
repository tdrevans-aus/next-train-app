# Jim brief — West Midlands Metro: the three stops that share a name with National Rail (6 Sep 2026)

**Dispatched:** 6 Sep 2026 (Tim: "let's do West Midlands Metro") · **Lane:** United Kingdom /
`uk-west-midlands`, stage `adapter` · **Model:** sonnet (pinned; no override) · **Branch:**
`wm-metro-shared-names` from master.

## Why

TfWM credentials reached Vercel production on 6 Sep 2026 and the Metro layer is live there:
`/api/directions?city=uk-west-midlands&station=Grand%20Central` returns the three live tram
directions and `/api/next-train` returns live departures. 32 of the 35 Metro stops work.

The other three — **Five Ways, Jewellery Quarter, The Hawthorns** — share their printed name with
a National Rail station in the same catalog. Observed on production, 6 Sep 2026 ~15:40 BST:

- `/api/city-stations?city=uk-west-midlands` lists each of the three **twice** (110 entries, name +
  lat/lng only, no mode), so the picker shows two identical "Jewellery Quarter" rows.
- Neither `/api/directions` nor `/api/next-train` accepts a `mode` parameter. Both go through
  `lib/cities/live-city-api.js` → `getUkWestMidlandsDogfoodDirections(station)` /
  `getUkWestMidlandsDogfoodNextTrain(config)` with no mode, so `resolveCatalogEntry()` falls to its
  documented rail-first default. Result: "Jewellery Quarter" always returns the LNR/WMR rail
  board; a rider can never reach the tram board at those three stops, and choosing a tram direction
  yields `next: null`.

The dogfood module's mode-aware path (`fetchBoardForMode(station, "metro")`) is correct and
gate-tested; it is simply unreachable from the API.

## Decision taken (Sash, 6 Sep 2026) — disambiguate by printed name, not by plumbing a mode

Rename the three **Metro** catalog entries so every catalog name is unique, matching how a rider
already sees them signed and how the picker must present them:

- `Five Ways` (metro) → `Five Ways (Metro)`
- `Jewellery Quarter` (metro) → `Jewellery Quarter (Metro)`
- `The Hawthorns` (metro) → `The Hawthorns (Metro)`

Keep the bare name as an alias on the Metro entry only if `resolveCatalogEntry()`'s rail-first
default still wins the bare lookup (it does today: rail is checked first) — otherwise drop it. The
National Rail entries keep their names unchanged. This is the same shape as Grand Central vs
Birmingham New Street (distinct printed names, cross-referenced via `interchange`), and it needs no
API or client change. Threading a `mode` query parameter through `api/directions.js`,
`api/next-train.js`, `live-city-api.js`, `api/city-stations.js` and `public/app.js` is the
alternative; it is the right long-term shape if a third dual-mode region appears, but it is
out of scope here — record it in `docs/feature-backlog.md` as a new FB row instead.

## What to build

1. `lib/cities/uk-west-midlands/stations.json`: rename the three Metro entries as above; keep
   `interchange.nationalRailCrs` cross-references intact; keep the bare name in `aliases` only
   under the condition stated. Update any other file that spells those Metro names literally
   (grep `docs/uk-west-midlands-d1/`, `lib/cities/uk-west-midlands/`, `qa/uk-west-midlands-*.mjs`,
   `direction-hubs.json`, `metro-stops-source.json` — the source file records what TfWM publishes
   and must **not** be renamed; add a mapping comment or field if the adapter matches on name).
2. `lib/providers/uk-metro-wm.js`: confirm stop resolution still finds the TfWM stop ids for the
   renamed entries (it resolves via the catalog entry, not the printed name — verify, do not assume).
3. `qa/uk-west-midlands-dogfood-gate.mjs`: add assertions that (a) the 110-entry catalog has no
   duplicate printed names, (b) `resolveCatalogEntry("Jewellery Quarter (Metro)")` resolves to the
   Metro entry with no mode given, (c) `resolveCatalogEntry("Jewellery Quarter")` still resolves to
   rail (crs JEQ), and (d) with `TFWM_API_APP_ID`/`TFWM_API_APP_KEY` present, a live
   `getUkWestMidlandsDogfoodDirections("Jewellery Quarter (Metro)")` returns tram directions
   (skip (d) with a printed note when the keys are absent). Keep the existing keys-stripped
   `MissingTfwmCredentialsError` check.
4. `docs/uk-west-midlands-d1/oracle-clash-report.md`: one short paragraph under the Metro section
   recording the rename and why (shared printed names; API has no mode).
5. `docs/feature-backlog.md`: new FB row "Station mode parameter through the API (dual-mode
   regions)" — Open, pointing at this brief and East Midlands' Nottingham Station (same clash,
   moot today because NET is out-product).

Do not touch `MULTI_CITY_IDS`, the registry status, or any other region.

## Verify

- `node --env-file=.env.local qa/uk-west-midlands-dogfood-gate.mjs` (the local `.env.local` has the
  TfWM keys and the Darwin token; copy it into your worktree).
- `node qa/live-city-lists-sync.mjs`, `node qa/uk-planned-gate.mjs`, `node qa/uk-region-catalog-conformance.mjs`.
- Do not run the full smoke suite locally: port 3000 is held by an unrelated dev server and the
  browser scripts will only time out. Say so in the PR and rely on CI's `web-qa`.

Lane lock: the top-level session has already checked `node qa/lane-lock.mjs check "United Kingdom"`
(free); run `acquire "United Kingdom" uk-west-midlands jim wm-metro-shared-names` before editing.
Open a normal (non-flip) PR with the gate results and a before/after of
`/api/city-stations?city=uk-west-midlands` duplicate names in the description. Do not merge it.
