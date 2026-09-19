# Jim brief — release prep: sync the Android assets before the gates that read them

**Lane:** bug-fix / product mode. `tim-review: no` — release tooling only; no copy, IA, or API
response shape changes. **Lane lock:** none (`qa/`, `scripts/`, `package.json`, `docs/`; nothing
under `lib/providers/`). Foreground smoke with explicit `timeout: 600000`; tail the output file in
the foreground if backgrounded; never park; leave no background sleep/poll loops running.

## Problem

`npm run release:prep` (`qa/release-prep.mjs`) runs its steps in this order:

1. `qa/pre-upload-check.mjs`
2. `qa/run-all.mjs --smoke`
3. `npm run cap:sync` (which ends with `scripts/prune-ship-assets.mjs`)

Steps 1 and 2 both inspect the **synced** Android assets in
`android/app/src/main/assets/public/`, but step 3 is what produces them. So the gates validate
whatever the *previous* sync left on disk, not the assets that will go into the AAB — and any
stale file there fails prep before the sync that would have cleaned it ever runs.
`runStep` calls `process.exit` on the first failure, so step 3 never happens.

## Reproduction / evidence (17 Sep 2026, 3.0.3 / versionCode 27 prep)

- `npm run release:prep` → `pre-upload-check PASS`, `web smoke suite FAIL (exit 1)`:
  141 PASS · 1 FAIL · 557s. The one failure:

  ```
  FAIL ship-assets-no-dogfood-origin: dogfood-origin.json found in synced release assets:
    android\app\src\main\assets\public\dogfood-origin.json
  ```

- The file was a leftover from an earlier sync (mtime 27 Aug 2026 23:42, copied from the
  gitignored `public/dogfood-origin.json` that exists on Tim's machine). Prep exited; `cap:sync`
  did not run.
- Running `npm run cap:sync` by hand printed
  `pruned android\app\src\main\assets\public\dogfood-origin.json`, after which
  `node qa/ship-assets-no-dogfood-origin.mjs` and `node qa/pre-upload-check.mjs` both passed.
  Cost: a wasted ~9-minute smoke run plus a manual recovery, on the release path.

To reproduce on any machine with an Android checkout: create
`android/app/src/main/assets/public/dogfood-origin.json` (any JSON), run
`npm run release:prep`, and watch it fail at the smoke step without syncing.

The same ordering flaw is latent in `pre-upload-check.mjs`: its "no scratch `_*.txt` in synced
assets", "synced geo-bundle ensureLocationPermission" and "synced … enterNearbyMode permission
hook" checks also read the previous sync, so they can pass on stale assets that differ from
what ships, or fail on staleness the sync would fix.

## Suspected files

- `qa/release-prep.mjs` lines 47–49 — the three `runStep` calls (the fix is mostly here).
- `scripts/prune-ship-assets.mjs` — already correct; wired at the end of `cap:sync` /
  `cap:sync:ios` in `package.json`.
- `qa/ship-assets-no-dogfood-origin.mjs` — correct as a gate; do not weaken or special-case it.
  It caught a real leak risk; the bug is that prep ran it against the wrong assets.
- `docs/aab-signing-closed-testing.md` §1 — describes prep as "`test:pre-upload` …, web smoke,
  and `cap:sync`"; update to the new order.

## Fix (decided)

Reorder `qa/release-prep.mjs` so the sync happens first and every gate checks what will ship:

1. `npm run cap:sync`
2. `qa/pre-upload-check.mjs`
3. `qa/run-all.mjs --smoke`

Also:

- On a step failure, keep printing the captured output as now, but for the smoke step print only
  the failing scripts' blocks plus the summary, not the whole 300-line log — finding the one FAIL
  on 17 Sep meant grepping a log file. If that is more than a small change, skip it and say so.
- Keep `npm run test:pre-upload` working standalone (the AAB doc tells Tim it is enough for a
  quick closed bump). When run standalone it still reads the previous sync; add one line to its
  output saying so ("checks the last `npm run cap:sync`; run that first if `public/` changed").

Out of scope — note in the PR if you have a view, but do not change:

- `cap:sync` took more than 10 minutes on 17 Sep because `scripts/write-city-directions.mjs`
  walks every live city's stations against live feeds, and it rewrites
  `public/city-directions/*.json` (dirtying the tree during a release). Whether release prep
  should regenerate directions at all is a separate decision for Tim.
- Do not make the gate auto-delete the file, and do not add `dogfood-origin.json` handling to
  Capacitor config. Prune-after-sync stays the single mechanism.

## Acceptance criteria

1. `qa/release-prep.mjs` runs `cap:sync` before `pre-upload-check` and before the smoke suite;
   the header comment and the final summary text match the new order.
2. With a planted `android/app/src/main/assets/public/dogfood-origin.json`, `npm run
   release:prep` no longer fails on `ship-assets-no-dogfood-origin` (the sync prunes it first).
   State in the PR how you verified this; if the worktree has no Android toolchain for
   `npx cap sync android`, verify the ordering with the new gate below and say the end-to-end run
   was not possible.
3. New offline QA script `qa/release-prep-step-order-gate.mjs`, registered in the smoke tier of
   `qa/run-all.mjs`: asserts that release prep's step list puts `cap:sync` ahead of every step
   that reads synced assets (`pre-upload-check`, the smoke suite). Prefer exporting the ordered
   step list from `release-prep.mjs` (guarding the run behind an is-main check) and asserting on
   that, over regex-matching source text. The script's header must say how to see it fail
   (swap two steps back).
4. `node qa/pre-upload-check.mjs` run standalone still passes on a synced checkout and prints
   the "checks the last sync" line.
5. `docs/aab-signing-closed-testing.md` §1 describes the new order. Do not touch the version
   numbers in that file.
6. `node qa/release-prep-step-order-gate.mjs`, `node qa/ship-assets-no-dogfood-origin.mjs`,
   `node qa/no-hardcoded-qa-port.mjs` and `node qa/run-all.mjs --smoke` all pass.

## Delivery

Copy this brief into your worktree (it is untracked on the controller's checkout by design),
commit it with the fix, push, and open a PR that links it. Do not bump any version numbers and do
not commit regenerated `public/city-directions/*.json` or bundle outputs if a sync rewrites them —
the PR diff should be `qa/`, `docs/`, and at most `package.json`.
