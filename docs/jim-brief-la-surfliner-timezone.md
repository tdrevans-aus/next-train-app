# Jim brief — Los Angeles: Pacific Surfliner times are 3 hours off (Amtrak static is Eastern time)

**Lane:** bug-fix / product mode. **City:** los-angeles, country united-states. Acquire the lane lock:
the controller checked on 27 Oct 2026 and it was free. **Date:** 27 Oct 2026. **tim-review:** no for the
code. The coverage-note rewrite in item 3 is a copy cleanup: flag it in the PR description.
**Input:** Mark's LA flip re-QA note on #534 (branch `flip/los-angeles`,
`docs/los-angeles-d1/mark-qa-note.md`, https://github.com/tdrevans-aus/next-train-app/pull/534).

**Tim's rulings:**
- 25 Oct: Metrolink and Pacific Surfliner `in`. Amtrak real-time via transitdocs approved.
- 27 Oct: flip with Metrolink live, accepting the EULA risk.

Work on **master**, not the flip branch. The controller re-merges master into `flip/los-angeles` afterwards.

## 1. Hard fail: no live Surfliner rows at Union Station

At Union Station, `Pacific Surfliner + San Diego` and `+ Goleta Amtrak` showed `no-live-predictions`,
although train 564 had a live 07:10 PDT prediction about 6 minutes out. The transitdocs feed was healthy:
654 entities, 27 on route 78, 34 calling at LAX.

**Cause:** Amtrak's static `stop_times` are in **Eastern** wall-clock, because the feed's agency timezone is
America/New_York. `loadAmtrakSurflineStatic` (`lib/providers/los-angeles.js:195`) and the join code parse
them as America/Los_Angeles. Every trip Mark sampled was exactly 3 hours off: train 562 has a static 9:10
against a feed time of 06:10 PDT. So the live-to-static join never matches, and the rows are dropped.

**Fix:**
- Interpret Amtrak static times in the **feed's own agency timezone**. Read `agency.txt` `agency_timezone`
  and don't hardcode a zone. Convert to absolute instants, then display in America/Los_Angeles.
- Check every place the Surfliner path uses static times:
  - the join to live trip ids (`2026-10-24_AMTK_595` style);
  - the service-day and calendar choice, since an Eastern service day differs from LA's around midnight;
  - `scheduledDestinationsToday` and `scheduledDestinationsRemaining` for Surfliner chips;
  - the honest empty-state reason.
- Metro and Metrolink are unaffected and must stay byte-identical. Metrolink static is in LA time; verify
  it from its `agency.txt` rather than assuming.

## 2. A gate that pins the real feed

The dogfood gate's Surfliner fixtures are synthetic and written in LA time, which is why this got through.
Add a fixture captured from the **real** Amtrak static data: a small pinned extract of route 78 trips
through LAX, with its `agency.txt`, plus one captured transitdocs TripUpdate for one of those trips.
Assert that the join produces a live Union Station row at the correct LA wall-clock time.
- Follow how #532 pinned LA's real trip patterns: a script to regenerate the fixture, and no network in
  CI or smoke.
- Mutation-check it: parsing in LA time again must go red.

## 3. Stale wording (Mark's list)

Fix each item:
- **`lib/cities/los-angeles/coverage.json`, which is rider-facing:**
  - remove "Requires METROLINK_API_KEY", the GTFS stop ids, the feed URL and the "Tim approved…"
    sentence;
  - rewrite the Metrolink and Surfliner entries in the same plain rider style as the Metro Rail entry
    (what's covered, where, what's excluded).
  - After the fix, the Surfliner "live departures" claim is true. Keep it only if it is.
- **`docs/united-states-ledger.md`** (~lines 13, 56, 83, 87): "Amtrak real-time unconfirmed" becomes
  "approved by Tim 25 Oct 2026 (transitdocs feed) for Pacific Surfliner at LA".
- **`docs/los-angeles-d1/oracle-clash-report.md`:** the Board eligibility correction note, and the "Modes v1:
  Metro Rail only" line around ~109. Add a dated correction; don't rewrite history.
- **`docs/los-angeles-metrolink-d1/oracle-clash-report.md`** "Skip risk": record Tim's 27 Oct decision to run
  live under the EULA risk.
- **`docs/los-angeles-d1/jim-handoff.md`** ~line 50: "out-product as PROPOSED" is superseded by the Option B
  ruling.

## QA

- `node qa/los-angeles-dogfood-gate.mjs` passes, with the new real-feed Surfliner case and the mutation check.
- `node qa/run-all.mjs --smoke` passes (plain, with a 600000 ms timeout, in the foreground). Read the full
  summary.
- **Live probe if it's LA service hours:** Union Station shows Surfliner live rows at the right LA times,
  matching the transitdocs feed. Metro and Metrolink are unchanged. `SWIFTLY_API_KEY` and
  `METROLINK_API_KEY` are in the main checkout's `.env.local`. Never print them. Swiftly must stay under
  180 requests per 15 min.

LA stays `planned` on master. Open a PR that links this brief and Mark's note, and leave no background
loops running.
