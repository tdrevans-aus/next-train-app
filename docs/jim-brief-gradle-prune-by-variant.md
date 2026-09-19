# Jim brief — Gradle prune must key off the release variant, not the requested task name

**Lane:** bug-fix / product mode. `tim-review: no` — build tooling only. **Lane lock:** none
(`android/app/build.gradle`, `qa/`, `docs/`). Foreground smoke with explicit `timeout: 600000`;
tail the output file in the foreground if backgrounded; never park; stop any Gradle daemon you
start (`gradlew --stop`); leave no background sleep/poll loops or dev servers running.

**Follows:** PR #406 (`docs/jim-brief-gradle-copy-skips-prune.md`), which Mark passed on
19 Sep 2026 with this finding:
<https://github.com/tdrevans-aus/next-train-app/pull/406#issuecomment-5740154253>. Read that
note; it is part of this handoff.

## Problem

#406 prunes dev-only files from the synced web assets only when
`gradle.startParameter.taskNames` contains the substring "release" (`isReleaseBuild` in
`android/app/build.gradle`). That covers `:app:bundleRelease`, Android Studio's Generate Signed
App Bundle, and `npm run android:bundle`.

Mark reproduced the gap: a bare `gradlew :app:bundle` (also `assemble`, `build`) has no
"release" in the requested task name but still executes `:app:bundleRelease` as a dependency,
and writes an **unpruned** `app-release.aab` to the same default output path, containing
`base/assets/public/dogfood-origin.json` (D-06, internal LAN origin). The only backstop is
`qa/aab-no-dev-assets.mjs`, which is a documented manual post-build step.

## Fix (decided)

Decide by what Gradle is actually going to **execute**, not by what was typed:

- Hook the prune to the release variant's own task graph — for example make the release
  variant's asset-merge task (`mergeReleaseAssets`, or the AGP 9.x equivalent; check what this
  project's AGP exposes) depend on a prune that runs after `capacitorCopyWebAssets`, or use
  `gradle.taskGraph.whenReady` to detect any release-variant packaging task in the graph. Any
  invocation that produces a release APK or AAB must package pruned assets.
- Mixed graphs (`gradlew build`, `gradlew assemble`) build debug and release from the **same**
  synced assets dir, so both cannot be right at once. Release safety wins: if any release
  packaging task is in the graph, prune. It is acceptable for the debug artifact of a mixed
  build to lack `dogfood-origin.json`; a debug-only invocation (`assembleDebug`,
  `npm run android:debug`, Android Studio Run) must still get it. Say in the PR exactly which
  invocations keep the file.
- A prune failure must still fail the build.
- Remove the task-name substring match rather than leaving two mechanisms.

## Acceptance criteria

1. With a planted `public/dogfood-origin.json`, each of `gradlew :app:bundleRelease`,
   `gradlew :app:bundle`, `gradlew :app:assembleRelease` and `gradlew assemble` produces release
   artifacts with no prune-list path under the packaged `assets/public/`
   (`node qa/aab-no-dev-assets.mjs <aab>` for bundles; unzip-check the release APK). Show the
   evidence per invocation in the PR. If your worktree has no Android SDK, say so plainly and do
   not claim these.
2. `gradlew :app:assembleDebug` alone still leaves `dogfood-origin.json` in the synced assets and
   the debug APK.
3. The wiring half of `qa/aab-no-dev-assets.mjs` is updated to assert the new mechanism and to
   fail if the task-name substring match comes back. Header says how to see it fail.
4. `docs/aab-signing-closed-testing.md` §2 keeps the post-build `aab-no-dev-assets` step and
   drops any wording that the prune depends on the task name. No version number changes.
5. `node qa/aab-no-dev-assets.mjs`, `node qa/ship-assets-no-dogfood-origin.mjs`,
   `node qa/release-prep-step-order-gate.mjs` and `node qa/run-all.mjs --smoke` pass.

## Delivery

Branch from up-to-date `origin/master` **after #406 has merged** (if it has not, stop and say so).
Copy this brief into your worktree (untracked on the controller's checkout by design), commit it
with the fix, push, and open a PR that links it. No `local.properties`, keystore material,
regenerated `public/city-directions/*.json` or bundle outputs in the diff.
