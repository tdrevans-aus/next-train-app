# Jim brief — riders with a saved route in a retired city get an honest message, not Perth

tim-review: **yes** (rider-facing copy and behaviour). Lane: bug-fix / product mode. No lane lock needed
(`public/` client code only).

## Problem
Found by Mark in the #556 QA (https://github.com/tdrevans-aus/next-train-app/pull/556#issuecomment-7132792613),
reading the code; not yet browser-tested.
- **Saved city:** a rider whose saved city is now retired (Uppsala since 24 Nov 2026; also Auckland,
  Wellington, Amsterdam, Rotterdam, Vancouver) gets `readSavedCity()` in `public/city-session.js` returning
  "". They fall through to the default city (Perth) with no explanation.
- **Saved journey (worse):** `public/journey-model.js` keeps the retired `cityId`, but `resolveJourneyCity`
  in `public/app.js` normalises it through `normalizeCityId`, which only accepts live cities. It falls back to
  "perth", so the board queries **Perth with an Uppsala station name**.

Tim's rules: cities are in or out, and empty states are honest (memory "Honest empty state").

## Required change
1. Detect a saved city or journey whose `cityId` is a known retired city. Use the registry or manifest's
   retired list; don't hard-code names.
2. Show a clear, short message instead of a wrong board. Suggested copy, for Tim to approve in the PR:
   "**Uppsala is no longer covered.** Live train data for this area stopped being available. Choose another
   city." Then give one action that opens the city picker. Use the city's display name and the existing
   empty-state or banner styling. Don't add a new visual pattern.
3. Never query another city's board with the retired city's station name.
4. Keep the saved data: don't delete the rider's saved journeys. If the city comes back, they work again.
5. Same behaviour on web and in the Android/iOS shells. The shells share `public/`, but confirm that.

## Acceptance criteria
- A browser QA script (follow existing `qa/*-browser*.mjs` patterns, `PORT`/`QA_BASE` discipline):
  - seed localStorage with a saved Uppsala city and a saved Uppsala journey;
  - assert the message shows, the picker action works, no Perth board request carries an Uppsala station
    name, and the saved journey still exists afterwards.
  - It must go red on current master. Mark will mutation-check it.
- Screenshots of the message (mobile width) in the PR, for Tim's copy review.
- `node qa/run-all.mjs --smoke` passes.

## Process
Worktree, branch `fix/retired-city-saved-route`. Copy this brief from
`C:\Users\tdrev\Projects\next-train-app\docs\jim-brief-retired-city-saved-route-message.md` (untracked in the
main checkout) into your worktree and commit it with the PR. Commit, push, open a PR linking it, and mark it
`tim-review` in the description. Another Jim is working on QA scripts in parallel. Register your new script
in `qa/run-all.mjs` with a one-line change only.
