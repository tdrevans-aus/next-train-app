# Jim brief — swipe hijacks a saved Route; switcher then refuses to move

**Lane:** bug-fix / product mode (CLAUDE.md "Bug-fix lane"). This brief authorises shared-UI
changes in `public/app.js`, `public/train-navigation.js`, `public/journey-detail.js` and a new
QA script. `tim-review: no` (no copy, IA, or API-shape change).

## Symptom (Tim, phone, 7 Sep 2026)

1. Tim already had a saved route **Didcot Parkway → Cheltenham Spa** (UK). He added a new route
   **Kidderminster → Birmingham** from the Routes library.
2. The board showed a Kidderminster train (correct).
3. He swiped the hero to skip to the next train. The board switched to the **Didcot → Cheltenham**
   board instead of showing the next Kidderminster train.
4. Opening the journey switcher (`#journey-switcher`) and choosing Kidderminster → Birmingham does
   nothing: the board stays on Didcot → Cheltenham.

We do not know whether Didcot → Cheltenham is `kind: "route"` or `kind: "journey"` on Tim's phone,
nor whether it has a pinned train. The fix must hold for every combination below.

## Suspected mechanism

`fetchNextTrain()` (`public/app.js` ~5515) calls `maybeAutoSelectJourney()` on **every** refresh,
including the one triggered from `skipToNextTrain()` / `skipToEarlierTrain()`
(`public/train-navigation.js` ~1274 / ~1384). `maybeAutoSelectJourney()` (`app.js` ~2227):

- ignores `chromeTravelTab` — it will replace a Route-kind `activeJourneyId` with a Journey-kind
  id while the Routes tab is showing. `ensureActiveJourneyForTab("routes")` (~988) only applies
  the schedule/pin logic for the journeys tab, but it runs *before* `maybeAutoSelectJourney`, so
  the tab-agnostic auto-select wins.
- the `findActiveCommuteTargetPinId()` branch (~2232) returns before the manual override is
  consulted, so a pinned Journey overrides `setManualJourneyOverride()` set by `switchJourney()`
  (~2662) forever. That matches "selecting Kidderminster from the dropdown refuses to move".
- the scheduled-window branch does consult `isManualOverrideBlockingAuto()`, but the override is
  keyed to `matchingWindowIds` at save time (`journey-detail.js` ~1988); if the set of Active
  windows changed between saving and swiping the override is dropped and the scheduled Journey wins.

Also check whether a stale `lastApiData` from the previous route is re-rendered by
`render(applyClientSkip({ ...getLastApiData() }))` on swipe before the fetch resolves, and whether
`discardStaleJourneyBoard()` (~4523) is enough there.

If investigation shows a different cause (e.g. `advanceLeavePinToNextTrain` on a pinned Didcot
route, or `syncActiveJourneyForCurrentTab` flipping tab), fix that instead and say so in the PR.

## Acceptance criteria

1. With two saved Routes (A active, B not), swiping next/earlier on the hero keeps A active and
   advances A's board. `settings.activeJourneyId` never changes as a side effect of a swipe.
2. Same as 1 when B is a Journey-kind whose Active window matches the current time.
3. Same as 1 when B is a Journey-kind with a pinned target train for today.
4. Choosing a Route or Journey from the switcher always makes it the active board within one
   fetch, regardless of any scheduled window or pin on another journey. A manual choice is only
   ever displaced by a *later* schedule/pin event, never by the state that existed when the user
   chose.
5. Existing pinned-commute behaviour on the Journeys tab (auto-select to the pinned journey when
   no manual override is in play) is unchanged.
6. No regression in existing swipe/pin/journey QA scripts.

## QA

- New script: `qa/route-swipe-keeps-active-route.mjs` covering criteria 1–4 (browser script via
  the existing dev-server helper; model it on `qa/nearby-swipe-after-route-pin.mjs` and
  `qa/journey-kind.mjs`). Register it in `qa/run-all.mjs` in the smoke tier.
- Must pass: the new script, `qa/journey-kind.mjs`, `qa/nearby-swipe-after-route-pin.mjs`,
  `qa/route-pin-after-nearby-pin.mjs`, `qa/pin-swipe-notify.mjs`, `qa/journey-wizard-after-route.mjs`,
  then `node qa/run-all.mjs --smoke`.
- Port 3000 may be held by another process on this machine; use `QA_BASE` / the helper's port
  fallback rather than killing anything.

## Delivery

Work in the worktree, commit, push a branch `route-swipe-keeps-active-route`, open a PR that
links this brief, and leave no background sleep/poll loops running when you finish.
