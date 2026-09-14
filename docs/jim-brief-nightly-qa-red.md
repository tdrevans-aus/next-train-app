# Jim brief — the nightly QA run has been red for a week (36 of 213 scripts)

**Lane:** bug-fix / product mode. `tim-review: no` unless a fix changes rider-facing copy or
behaviour (then mark the PR tim-review and say which item). **Lane lock:** none. Leave no
background loops, pollers or dev servers running.

## Symptom

`.github/workflows/qa-nightly.yml` (`web-full`, the untiered full glob of `qa/run-all.mjs`)
has failed every night since at least 9 Sep 2026. Last run, 14 Sep 07:33 UTC: **177 PASS · 36
FAIL**. Nobody reads it, so it no longer protects anything. The failures are spread across the
whole run (first at 07:34:07, others hours later), the dev server stays up, and there are zero
`ECONNREFUSED` lines — so this is not one systemic crash; it is 36 separate stale, misfiled or
genuinely broken scripts. The smoke and release tiers are green (138/138 three times on 14 Sep).

The failing scripts (from the 14 Sep log; `timeout` = hit the 180 s per-script limit):

```
adelaide-line-map-conformance.mjs        exit 1  (ENOENT qa/fixtures/adelaide/published-network.json)
bundled-city-directions.mjs              exit 1
journey-wizard-after-route.mjs           exit 1
lane-lock.mjs                            exit 1  (a tool, not a test — globbed by mistake)
live-region-times-probe.mjs              exit 1
london-destination-reconciliation-probe.mjs exit 1
nearby-cache-last-station.mjs            exit 1
nearby-location-hint-keeps-cache.mjs     exit 1
onboarding-got-it-no-loop.mjs            exit 1
onboarding-location-denied-timing.mjs    exit 1
onboarding-not-on-overlay.mjs            exit 1
onboarding-scrim-dismiss.mjs             exit 1
outside-hours-nearby.mjs                 timeout
pin-behavior.mjs                         exit 1 (failed twice, retry included)
preferred-always-visible.mjs             exit 1
pro-widget-access.mjs                    exit 1
probe-at-once.mjs                        exit 1
region-explicit-skips-wizard.mjs         exit 1
region-selection.mjs                     timeout
reminders-dialog.mjs                     exit 1
reminders-permission-gate.mjs            exit 1
remove-ads-check.mjs                     exit 1
run-sydney-sweep-once.mjs                exit 1
security-xss-share.mjs                   timeout
smoke-11-13.mjs                          exit 1
smoke-browser.mjs                        exit 1 (failed twice)
static-page-above-ad.mjs                 exit 1
station-typeahead.mjs                    timeout
sydney-banksia-perth-route.mjs           timeout
sydney-new-journey-not-perth.mjs         timeout
template-chip-edited-hours.mjs           timeout
template-wizard-coach-overlap.mjs        timeout
template-wizard-hours-zindex.mjs         exit 1
template-wizard-skip.mjs                 timeout
uk-london-terminus-sweep-probe.mjs       exit 1
unsupported-region.mjs                   timeout
```

Download the log yourself for the per-script error text:
`gh run view <id> --log` for the latest "QA nightly" run.

## What to do

Work through all 36 and put each into exactly one bucket, recorded in a new
`docs/qa-nightly-triage-2026-09-14.md` table (script · bucket · cause · action · PR/commit):

1. **Not a test.** Tools, one-off probes and sweeps that the untiered glob picks up
   (`lane-lock.mjs`, `run-sydney-sweep-once.mjs`, the `*-probe.mjs` scripts that need live
   tokens or production, `probe-at-once.mjs`…). Move them out of the glob the way
   `qa/run-all.mjs` line ~23 and ~253 already describe (a subfolder or an explicit exclude
   list), so they can never count as failures. Do not delete them.
2. **Stale test.** Asserts behaviour the app has since changed on purpose (several onboarding /
   template-wizard / region-selection scripts predate the 14 Sep country-wide picker and the
   `regionExplicit` migration; `pin-behavior.mjs` and `smoke-browser.mjs` may predate other
   product changes). Update the assertion to the current, intended behaviour — check the git
   history and the brief that changed it before deciding it's intended; if you can't find a
   deliberate change, it's bucket 3.
3. **Real failure.** The app does something wrong. Fix it if it's small and within
   `public/`, `api/`, `lib/` non-provider code, and add the script to the smoke tier so it's
   watched. If it's large or product-shaped, do not fix: write a one-paragraph description in
   the triage doc and stop there — the controller will brief it separately.
4. **Missing fixture / environment.** e.g. `qa/fixtures/adelaide/published-network.json` —
   restore the fixture from the Adelaide D1 pack (`docs/adelaide-d1/published-network.json` if
   it exists) or make the script skip-with-reason when the fixture is absent, whichever the
   script's own header says was intended. Timeouts on browser scripts: apply the same readiness
   pattern `docs/jim-brief-no-live-feed-stops-flake.md` established (no fixed sleeps, use the
   shared helpers), not a longer limit.

Then make the nightly meaningful: the workflow should fail only on buckets 2–4, and the
per-script limit should stay at 180 s.

## Acceptance criteria

1. Every one of the 36 scripts appears in the triage table with a bucket and an action.
2. A full run of the same command the workflow uses (`node qa/run-all.mjs` with whatever env
   `qa-nightly.yml` sets, run locally in the foreground with a 600000 ms timeout twice if it
   fits, otherwise once) reports **0 FAIL**, with bucket-3 items that you did not fix listed in
   the PR body as known-red and excluded via an explicit, commented allow-list — not by
   deleting or silently skipping them.
3. `node qa/run-all.mjs --smoke` and `--release` still pass; no script was removed from either.
4. No `lib/providers/` changes; no rider-facing copy changes without tim-review on the PR.

## Process

Worktree from current master; copy this brief in; commit in sensible chunks (glob fix, stale
tests, fixtures, real fixes), push one PR "QA nightly: triage and fix the 36 standing
failures" linking this brief and the triage doc. If the work runs long, open the PR at a clean
point with the remaining rows marked "not started" in the triage doc.
