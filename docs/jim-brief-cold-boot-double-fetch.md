# Jim brief — cold-boot double fetch race, and reason-line regression coverage

**Lane:** bug-fix / product mode. Follow-up to PR #342 (merged 90491e4), from Mark's delta note
https://github.com/tdrevans-aus/next-train-app/pull/342#issuecomment-5572902643. `tim-review: no`
(no copy, IA, or API change). Authorises `public/app.js`, `qa/smoke-browser.mjs`, and a new QA script.

## Two items

1. **Race.** On cold boot, `fetchNextTrain()` is triggered twice: once by init and once by
   `enterJourneyMode()` (via `ensureJourneyMode()` in tests, and by the equivalent real path).
   The `journeyBoardFetchId` staleness guard (`public/app.js` ~5635) renders only the winner,
   but on a slow runner the losing cycle's paint can lag and leave the board in the wrong state
   for up to one refresh interval. PR #342 worked around this in `qa/smoke-browser.mjs` step 8
   by forcing one extra settled `fetchNextTrain()`. Fix the app so a second trigger while a
   fetch is in flight coalesces (reuse the in-flight promise or schedule one follow-up, never
   two concurrent boards), then **remove the forced fetch from step 8** so the test proves the
   real behaviour again.
2. **Coverage.** No script asserts that `#leave-card-reason` is cleared/hidden when the leave
   card hides after a late render. Add that assertion to `qa/late-leave-slider-stays.mjs` (a
   late render → empty fixture → reason element hidden and empty) and, if cheap, to step 8 of
   `qa/smoke-browser.mjs`.

Also, per Mark: `updateLeaveCardReason()`'s try/catch (~2930) swallows errors silently; add a
`console.warn` inside it. Do not change any rider copy.

## Acceptance

- Coalescing verified by a test that fires two `fetchNextTrain()` calls back to back on the
  empty fixture and sees exactly one `/api/next-train` request (network count via Playwright).
- `QA_NO_RETRY=1 node qa/smoke-browser.mjs` passes 3/3 with the forced fetch removed.
- `qa/late-leave-slider-stays.mjs`, `qa/pin-behavior.mjs`, `qa/pin-swipe-notify.mjs`,
  `qa/journey-kind.mjs`, `qa/route-swipe-keeps-active-route.mjs` pass.
- `node qa/run-all.mjs --smoke` green. Port 3000 is contended on this machine: start your own
  dev server on a free port and set `QA_BASE`; where a script hardcodes 3000, confirm with a
  content check that the server you hit is yours before trusting a result.

## Delivery

Branch `cold-boot-fetch-coalesce`, commit (include this brief), push, open a PR linking it.
Leave no background sleep/poll loops or dev servers running.
