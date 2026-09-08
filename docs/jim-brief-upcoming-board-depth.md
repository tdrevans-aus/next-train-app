# Jim brief — raise upcoming-departures depth from 8 to 12

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises changes to
`lib/train-times-core.js`, the generated `public/train-times-bundle.js`, and `qa/`.

tim-review: no — Tim approved this change in chat on 7 Sep 2026 ("raise slice(0, 8) to ~12").
It does change the API response shape, which is normally tim-review by default; the approval is
already given, so merge on a green Mark.

**Sequencing: do not start this until the PR for
`docs/jim-brief-london-overground-empty-direction.md` has merged.** That change edits
`lib/train-times-core.js` too, and this brief must be built on top of it, not alongside it.

## Change

`lib/train-times-core.js:348` — inside `buildNextTrainResponse`, `upcomingTrips.slice(0, 8)` caps
the API response at 8 departures per direction. Raise it to **12**.

Give the number a named exported constant rather than leaving a second bare literal in the file
(e.g. `UPCOMING_TRIP_LIMIT = 12`), so the next person can find it — this brief exists because the
cap was invisible.

## Why

Measured live on 7 Sep 2026. The cap is service-pattern-sensitive, and nobody noticed because it
was tuned against Australian headways:

- Perth / Adelaide (15–30 min headways): 8 departures spans 2–4 hours. Cap never bites.
- London tube (3–4 min headways): 8 departures spans ~25 min — but TfL's Arrivals feed only
  predicts ~30 min ahead anyway, so upstream is usually the binding constraint, not us.
  Per direction TfL currently returns e.g. Oxford Circus → Brixton: 5 trains over 4–17 min;
  Oxford Circus → Elephant & Castle: 8 trains over 2–27 min.
- Where our 8 *does* bite: very high-frequency stops (Stratford Jubilee returned 30 predictions
  inside 27 min) and the London Overground, whose feed predicts ~110 min ahead.

12 buys real headroom on the dense stops at negligible payload cost. It is deliberately not
"unlimited": on the tube there is nothing further upstream to show, so a lazy-load-on-swipe
scheme would add a state machine for no extra data. Do not build one.

## Must not be missed

`public/train-times-bundle.js` is **generated** from `web-sources/train-times-client.mjs` via
`npm run build:train-times`. Editing only the source leaves the shipped app on the old value.
Rebuild the bundle and commit it, and confirm the built file contains the new limit.

## Acceptance criteria

1. `buildNextTrainResponse` returns up to 12 upcoming departures; the limit is a named constant.
2. `public/train-times-bundle.js` is rebuilt and committed, and reflects 12.
3. `next`, `following` and `skipTrains` still behave correctly when `skipTrains` reaches the
   higher indices — in particular `following` must be null past the end rather than throwing, and
   swiping to index 11 must work.
4. No regression in the hero/skip/pin behaviour or the under-hero preview list
   (`UPCOMING_DEPARTURE_BOARD_LIMIT` in `public/app.js` is a separate, unrelated constant — leave
   it alone).
5. Payload growth is bounded: a station with many predictions returns 12, not more.

## QA

- Update whichever existing QA script asserts the 8-item response shape (grep `qa/` for the
  literal and for `upcoming` length assertions) — do not leave a stale expectation of 8.
- Add coverage that a feed with >12 upcoming departures is truncated to exactly 12, and that
  `skipTrains` at the last index behaves.
- Run those scripts plus `node qa/run-all.mjs --smoke`. Both must pass. Do not run the full suite.

## Handoff

Commit, push a branch, open a PR linking this brief, and note the rebuilt bundle in the
description. Leave no background sleep or poll loops running when you finish.
