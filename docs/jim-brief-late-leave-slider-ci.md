# Jim brief — PR #342 follow-up: smoke-browser step 8 fails in CI on the branch

**Lane:** bug-fix / product mode, continuation of `docs/jim-brief-late-leave-slider.md`
(already committed on branch `late-leave-slider-stays`, PR #342). Work **on that branch**,
not a new one. `tim-review: no` — Tim approved the copy; this is only making CI green.

## Evidence

CI job https://github.com/tdrevans-aus/next-train-app/actions/runs/34117874118/job/101728815623
(`web-qa`, branch `late-leave-slider-stays`): `qa/smoke-browser.mjs` fails twice with
`TimeoutError: page.waitForFunction: Timeout 30000ms exceeded` immediately after step 7
("Leave class late; strip: 19:49 train · You're 3 minutes late — leave now") passes. Master runs
34125063241 and 34117059204 pass the same script in ~30 s, so it is this diff, not a flake.
Locally the script passed for Jim and Mark, so it is timing-sensitive; do not retry CI hoping.

Step 8 (`qa/smoke-browser.mjs` ~lines 244–266) loads `?test=1&fixture=empty` after injecting
switcher journeys with `activeId: "j-in-smoke"`, then waits for **`#leave-card` to be hidden**
and the depart text to be "No upcoming…" or the label "Target train". So on the empty
fixture, after a prior late-phase render, the leave card is staying visible (or `hidden` is
being cleared again) on this branch.

## Suspects

- `updateLeaveCardReason()` / `leaveCardReasonEl` handling in `public/app.js`: check it
  never unhides `#leave-card`, and that the empty/error render branch (~line 4150, where
  `leaveCardEl.hidden = true`) also hides/clears the reason element.
- `renderPinLeaveCardContent()` in `public/nearby-mode.js` sets `deps.leaveCardEl.hidden =
  false`; make sure the new call path cannot run for an empty board.
- `public/styles/hero.css`: the `leave-card--target-departed-only` hide list and the
  `.leave-card--context` grid change — a rule that overrides `[hidden]` display would keep the
  card visible to Playwright's `isHidden()`.

## Acceptance

- `node qa/smoke-browser.mjs` passes 3 times in a row locally with `QA_NO_RETRY=1`.
- `qa/late-leave-slider-stays.mjs`, `qa/pin-behavior.mjs`, `qa/pin-swipe-notify.mjs` still pass.
- `node qa/run-all.mjs --smoke` green.
- Push to `late-leave-slider-stays`; `web-qa` on PR #342 must go green. Comment on the PR with
  the root cause in two sentences.
