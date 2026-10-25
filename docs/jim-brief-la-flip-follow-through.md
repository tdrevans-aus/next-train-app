# Jim brief — Los Angeles flip follow-through (status stays planned)

**Mode:** expansion follow-through, with bug-fix/product authority for the files below. **City:**
los-angeles, country united-states. Acquire the lane lock: the controller checked on 25 Oct 2026 and it
was free. **Date:** 25 Oct 2026. **tim-review:** no.
**Input:** Mark's flip follow-through checklist in his #527 PASS note
(https://github.com/tdrevans-aus/next-train-app/pull/527#issuecomment-6391961997), plus
`docs/los-angeles-d1/` and `docs/united-states-ledger.md`. Precedents: Prague (#488/#495/#497 → flip
#498) and Dublin (#468 → flip #501).

## Split: this PR vs the flip PR

The flip is lazy consensus. Only Mark's small `flip` PR changes `status` and the live lists. So **this
PR leaves `status: "planned"`**, and builds everything else so the flip PR is a one-line status change
plus the live-list additions:

- **Flip PR, not you:**
  - `status: "live"` in `registry.js`
  - `MULTI_CITY_IDS` / the `MultiCityId` typedef
  - `CITY_COUNTRY` `"los-angeles": "us"` in `country-regions.js`
  - regenerating `public/city-manifest.seed.{json,js}`
  
  Check how Prague's and Dublin's flip PRs split these, and match them. If a piece *must* land with the
  status change, leave it for the flip, and **list it in `docs/los-angeles-d1/jim-handoff.md` under
  "Flip PR contents"** so Mark's flip PR is mechanical.
- **This PR:**
  1. `lib/cities/los-angeles/dogfood-next-train.js`, modelled on Prague's. It passes **both**
     `emptyReason`s through (`no-live-predictions` only for a direction the schedule expects,
     `not-currently-served` always). No new rider copy.
  2. The `live-city-api.js` dispatch cases (`directionsFor`, `getMultiCityNextTrain`), if they can
     exist ahead of the flip without exposing LA. Follow the precedent.
  3. `lib/cities/city-bounds.js`: add LA bounds.
  4. All 110 catalog stations have lat/lng. Verify, and fill any gaps from GTFS `stops.txt`, citing it.
  5. Registry coverage notes: LA Metro Rail only (A, B, C, D, E, K). The Wilshire/La Brea, Fairfax and
     La Cienega D stations show "not currently served" until the `-90` timetable from 1 Nov. They're
     not excluded and stay in the catalog.
  6. `qa/los-angeles-dogfood-gate.mjs`, following other cities' dogfood gates and keeping the
     `los-angeles-planned-gate` assertions or migrating them. It must pass while LA is planned *and*
     after the flip. Check how Prague's gate handled status.
  7. `qa/los-angeles-all-stations-live-sweep.mjs`, following Prague's and Dublin's. It must respect
     **Swiftly's 180 requests per 15 min**: one TripUpdates fetch serves every station, so poll the feed,
     not one request per station. In CI it should SKIP-LIVE without a key, like other keyed cities. Run
     it now while LA is in service (until ~24:00 PDT), and commit the evidence:
     `docs/los-angeles-d1/live-sweep-log.jsonl` and `ci-live-evidence.md`.
  8. `node scripts/write-city-directions.mjs --only=los-angeles`, then commit
     `public/city-directions/los-angeles.json`.
  9. Ledger: confirm LA's board-eligibility verdicts in `docs/united-states-ledger.md`. Metrolink,
     Amtrak, buses and busways are out, with recorded verdicts.

## QA

- The new gates pass. Mutation check on at least the `emptyReason` pass-through and one sweep assertion.
- `node qa/run-all.mjs --smoke` passes (plain, with a 600000 ms timeout, in the foreground).
  `SWIFTLY_API_KEY` is in the main checkout's `.env.local`. Never print it.

Open a PR titled "Los Angeles: flip follow-through (dogfood module, gates, sweep, directions) — still
planned". Leave no background loops running.
