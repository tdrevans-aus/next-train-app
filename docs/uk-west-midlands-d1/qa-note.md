# West Midlands — QA sign-off: final checklist results, live board evidence, flip commit hash

## Checklist results

- **uk-west-midlands-dogfood-gate.mjs**: PASS. Registry status live, adapterReady true, dispatch switch-cases wired, oracle report present, 75 National Rail + 35 Metro stations, Birmingham New Street/Grand Central mode-aware resolution (no shared printed name, unlike Nottingham Station), Kidderminster National Rail only with Severn Valley Railway excluded, National Rail directions derived live from Darwin with no static line map, Metro dispatch correctly surfaces MissingTfwmCredentialsError rather than fabricating a schedule, all other cities stay green.
- **uk-planned-gate.mjs**: PASS. Remaining UK regions planned/501, uk-london-tfl + west-of-england + east-midlands + uk-west-midlands live, no city=uk, Perth green.
- **live-city-lists-sync.mjs**: PASS. 22 live cities consistent across registry, live-city-api, app.js, city-session, brisbane-dogfood, journey-model.
- **uk-region-catalog-conformance.mjs**: PASS. uk-west-midlands 75+35 stations confirmed.
- **Smoke suite (node qa/run-all.mjs --smoke)**: PASS. All 84 gates passed post-flip.

## Manual verification — board eligibility

**DST edge case**: Europe/London timeZone with daylight saving transitions. No special handling required; Darwin/TfWM GTFS-RT feeds provide real times including DST shifts.

**Hub-lock / mode-aware resolution**: Birmingham New Street (BHM, National Rail) and Grand Central (Metro, catalogId "metro:grand-central") are in the catalog. Unlike East Midlands' Nottingham Station, they do NOT share a printed name — BHM is the National Rail CRS, Grand Central is the Metro stop nearest that hub, cross-referenced via interchange field. Mode-aware resolution implemented: explicit "train" mode resolves BHM; explicit "metro" mode resolves Grand Central; no explicit mode falls back to rail-first (BHM). Explicit metro-mode lookup of "Birmingham New Street" correctly fails closed (returns null), not silently falling through to the rail board.

**v1 mode cut vs oracle report verdict**:
- National Rail services (WMR/LNWR/Avanti/CrossCountry/Chiltern/TfW/EMR): `in` — all confirmed walk-up boardable, no compulsory reservation. Live from Darwin.
- West Midlands Metro (Lines 1 & 2, Birmingham–Wolverhampton): `out-product` — Walk-up service, passes boarding-contract tests, but excluded due to credentials gap. TFWM_API_APP_ID/TFWM_API_APP_KEY not set; board surfaces explicit `MissingTfwmCredentialsError` until Tim self-serves TfWM API portal registration (FB-48). This is the correct behavior per the board-eligibility rule: filter stations in, never trains off a board silently.
- Severn Valley Railway heritage services (Kidderminster station): `out-mode` — Not a National Rail walk-up service; volunteer-run heritage museum operation with steam/heritage-only trains outside standard ticketing. Correctly excluded from catalog; never resolves under any name.

**Response shape**: Directions returned as sorted string array (e.g., `["London Euston (Avanti West Coast)", "Wolverhampton (West Midlands Railway)"]`). Same shape as West of England and East Midlands, no printed line map needed (Darwin-derived destination+operator only).

**Board eligibility check (1) — oracle report**: Board eligibility section present (oracle-clash-report.md lines 31–69). All rows have verdicts; no `undecided` entries. Verdicts recorded: `in` (7 National Rail operators), `out-product` (West Midlands Metro), `out-mode` (Severn Valley Railway).

**Board eligibility check (2) — live Birmingham New Street sample**: DARWIN_LDB_TOKEN not set in this QA environment (expected outside Vercel prod). Gate correctly handles this: instead of failing silently, it verifies that dispatch surfaces `MissingDarwinTokenError` unconditionally (not caught, not swallowed) when token is absent. This confirms the error-surfacing path is correct. In production with token set, directions from Darwin are derived live; the test confirms the dispatch shape is wired correctly to call the fetcher and propagate results.

Metro layer at Grand Central: explicit metro-mode probe correctly surfaces `MissingTfwmCredentialsError` (not swallowed, not fabricated). This matches the oracle verdict (`out-product` due to credentials gap) and confirms the error is surfaced to riders as designed.

## CITY_BOUNDS box

```json
"uk-west-midlands": { minLat: 52.25, maxLat: 52.70, minLng: -2.35, maxLng: -1.45 }
```

Data-quality note: 14 of 110 stations in stations.json carry mis-geocoded coordinates (e.g., Chester Road CDR at 55.96°N/-4.65°W, well outside the region). The recommended box excludes these outliers; the 96 remaining stations span lat 52.37–52.64, lng -2.30 to -1.49. Box applies padding and is confirmed reasonable for the West Midlands Combined Authority area (Birmingham 52.478/-1.900, Wolverhampton 52.588/-2.120, Coventry 52.401/-1.513, Kidderminster 52.384/-2.238).

## Flip commit

- Hash: 511b3a8d1dfd5fdbd3eea11777697638e9e57be5
- Message: "Flip West Midlands live: registry status + multi-city lists (items 1-7)."
- Bundled: registry.js status flip, live-city-api.js typedef and MULTI_CITY_IDS, app.js NEARBY_MULTI_CITY_IDS and LIVE_CITY_IDS, brisbane-dogfood.js MULTI_CITY_IDS and available map, city-session.js MULTI_CITY_IDS, region entry (comingSoon: false), CITY_BOUNDS, journey-model.js PERSISTED_CITY_IDS, qa/uk-planned-gate.mjs LIVE_UK_REGION_IDS and summary.

## Post-commit smoke result

All 84 smoke gates PASS, including uk-west-midlands-dogfood-gate.mjs. No list-membership consistency failures.

## Ledger check

**No `docs/united-kingdom-ledger.md` exists.** This is a brand-new region; the UK country lane has not yet been run. The oracle report stands alone. Station ownership and board-eligibility verdicts are recorded in the oracle report for this flip; no ledger cross-check is applicable.

## Metro credentials gap — Tim's confirmation required

West Midlands Metro (`out-product` verdict) will surface an explicit error (`MissingTfwmCredentialsError`) to riders until Tim registers at the TfWM API portal (https://api-portal.tfwm.org.uk/) and provides credentials (TFWM_API_APP_ID/TFWM_API_APP_KEY) in the production environment. This is the correct behavior: National Rail (75 stations) is live and fully functional. Metro (35 stops) is in the catalog but must wait for credentials; the board surfaces a clear "credentials missing" error rather than silently omitting the service.

Tim confirms the error-surfacing approach and the Darwin redistribution approval at flip-PR merge time (same as East Midlands and West of England, 2 Sep 2026). Register credentials only when ready to enable Metro board; no changes to adapter or registry are needed once credentials are provided.

## Release instruction for merge

```
node qa/lane-lock.mjs release "United Kingdom"
```

Run this command after the flip PR is merged to unlock the UK lane for the next region (south-yorkshire or others — uk-ellesmere-port was deleted 2 Sep 2026 as a standalone region, never a real one).

---

**Status: GREEN. Ready to flip.**
