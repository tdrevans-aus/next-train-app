# Jim brief — unblock the Melbourne flip: gates that anchor on "Melbourne is planned", plus flip commit

Mode: **bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). `tim-review: no` — Tim has delegated
flips (22 Sep 2026) and this is release 3.0.4's critical path. Written 22 Sep 2026 by the
controller session. Copy this file into your worktree and include it in your PR (untracked in the
main checkout on purpose).

## Why

Mark's second-pass flip QA (`docs/melbourne-d1/mark-qa-note.md`, 22 Sep section) is green on every
live check but found that applying the flip commit breaks nine unrelated QA scripts, because they
hardcode Melbourne as a stable "still planned" regression anchor or assert its Coming-Soon picker
copy:

`qa/adelaide-dogfood-gate.mjs`, `qa/brisbane-dogfood-gate.mjs`, `qa/canberra-dogfood-gate.mjs`,
`qa/sydney-dogfood-gate.mjs`, `qa/canberra-line-map-conformance.mjs`,
`qa/rotterdam-line-map-conformance.mjs`, `qa/hong-kong-planned-gate.mjs`,
`qa/osaka-planned-gate.mjs`, `qa/region-selection.mjs`.

Also amber from Mark's first pass: `qa/melbourne-dogfood-gate.mjs`'s live section throws an
uncaught exception when the feed returns 401 instead of failing an assertion cleanly, and it does
not call `loadEnvLocal()` (the `.env.local` values are double-quoted; a hand-exported quoted value
produces a 401 that looks like a dead feed — this cost a QA round).

## Deliver, in ONE PR

1. **Repoint the anchors.** In each of the nine scripts, replace the Melbourne "planned" anchor
   with a city that will stay planned for a while — prefer `bart` (needs a key Tim hasn't got yet)
   or `chicago`; keep the assertion's intent identical (it exists to prove `assertCityLive` still
   fails for a planned city / a planned city stays out of the live lists). For
   `qa/region-selection.mjs`, update the picker expectation so Melbourne is a live Australian region
   (not Coming Soon) and the test still proves what it proved. Add a one-line comment at each site
   saying why the anchor moved, so the next flip does not repeat this.
2. **Gate robustness.** `qa/melbourne-dogfood-gate.mjs`: call `loadEnvLocal()` at the top (as
   `dev-server.js` does); make the live section catch fetch failures and report a clear FAIL line
   with status code, never an uncaught throw; skip the live section with an explicit SKIP line
   when no key is present (CI/smoke never carry it) so the offline assertions still run.
3. **Then the flip commit itself**, per `docs/melbourne-d1/jim-handoff.md` "Flip commit — exact
   edits": registry `status` → `"live"`, picker `comingSoon` → `false`, every list
   `qa/live-city-lists-sync.mjs` and `qa/country-regions-sync-gate.mjs` enforce. Append the nine
   gate files to that recipe section so it is complete for the record.
4. Update Melbourne's row in `docs/expansion-tracker/cities.csv` (Status → Done, Stage → 7 Live,
   Waiting on → empty; touch only that row).

## Acceptance
- With the flip applied: `node qa/live-city-lists-sync.mjs`, `node qa/country-regions-sync-gate.mjs`,
  `node qa/coverage-notes-gate.mjs`, `node qa/melbourne-dogfood-gate.mjs` (offline, and live via
  `loadEnvLocal` with the key copied in), each of the nine repointed scripts individually, and
  `node qa/run-all.mjs --smoke` all pass. Smoke must be run WITH the flip applied — that is the
  whole point.
- The live section, run with a deliberately wrong key in a throwaway env var, prints a clean FAIL
  line and exits non-zero without a stack trace.

## Mechanics
- Lane lock: `node qa/lane-lock.mjs check australia`, then `acquire australia melbourne jim <branch>`.
- Branch from up-to-date `origin/master` (at or after 969e564). Copy `.env.local` into the
  worktree for the live gate; never print or commit it; delete the copy before committing.
- Smoke in the foreground with a 600000 ms timeout, output to a file you then read; if an
  unrelated script fails, re-run that one once in the foreground with a timeout. Foreground
  commands with explicit timeouts only — no background processes, sleeps or poll loops.
- Commit, push, open a PR titled "Flip Melbourne live (Metro Trains + V/Line at shared stations)",
  labelled `flip` (`gh pr create --label flip`), body = what changed + test results + link to this
  brief and to Mark's note. Do not merge.
