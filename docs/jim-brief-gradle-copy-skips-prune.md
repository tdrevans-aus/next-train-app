# Jim brief — Gradle's pre-build asset copy skips the prune, so every AAB ships `dogfood-origin.json`

**Lane:** bug-fix / product mode. `tim-review: no` — build tooling; no copy, IA, or API response
shape changes. **Lane lock:** none (`android/app/build.gradle`, `scripts/`, `qa/`, `docs/`).
Foreground smoke with explicit `timeout: 600000`; tail the output file in the foreground if
backgrounded; never park; leave no background sleep/poll loops running.

**Related, in flight:** `docs/jim-brief-release-prep-sync-before-gates.md` (release-prep step
order). Both briefs register a new gate in `qa/run-all.mjs`; expect a trivial merge conflict
there and resolve it by keeping both registrations.

## Problem

D-06 (`docs/dwayne-security-review-play-3.0.0.md`, fixed in #380 on 13 Sep 2026) says the
gitignored dev file `public/dogfood-origin.json` must never ship, because it discloses an
internal LAN origin. The fix prunes it at the end of `npm run cap:sync`
(`scripts/prune-ship-assets.mjs`).

But `android/app/build.gradle` (~lines 112–128, added 6 Sep 2026) registers
`capacitorCopyWebAssets`, which runs `npx cap copy android` as a `preBuild` dependency on
**every** Gradle build — and does not prune afterwards. So the build itself re-copies the file
into `android/app/src/main/assets/public/` moments before packaging. The prune in `cap:sync`
and the `ship-assets-no-dogfood-origin` gate both run before the build and cannot see this.

## Evidence (19 Sep 2026)

- 17 Sep: `npm run cap:sync` printed `pruned android\app\src\main\assets\public\dogfood-origin.json`
  and `qa/ship-assets-no-dogfood-origin.mjs` passed.
- 19 Sep 14:05: Tim built the signed 3.0.3 (27) AAB in Android Studio. The synced assets dir
  mtime is 14:05:12 (the Gradle copy), the AAB 14:05:40.
- `unzip -l android/app/release/app-release.aab` lists
  `base/assets/public/dogfood-origin.json` (227 bytes) containing
  `"origin": "http://<LAN IP>:3000"`. The file is back in the synced dir too.
- Every AAB built on a machine with `public/dogfood-origin.json` since 6 Sep has the same
  exposure, which includes the 3.0.1 and 3.0.2 uploads if they were built on Tim's PC. Say so in
  the PR; do not try to verify Play artifacts.

The same applies to everything else in the prune list (`design`, `site-config.example.json`,
`lib/cities`, `*.mjs`, `*.ts`, `*.map`) if sources reappear in `public/`.

## Fix (decided)

Make the Gradle copy task prune after it copies, so the packaged assets are always pruned no
matter how the build is started:

- In `capacitorCopyWebAssets`, run `node scripts/prune-ship-assets.mjs` after
  `npx cap copy android` (a second `Exec` task finalising the first, or one command chained with
  `&&`; keep the Windows `cmd /c` branch working). A prune failure must fail the build.
- Debug builds legitimately use `dogfood-origin.json` for LAN dogfooding
  (`public/app.js` `readDogfoodOrigin`, `public/brisbane-dogfood.js`). Check how
  `npm run android:debug` / `scripts/assemble-debug.mjs` gets the file onto the device today. If
  the debug flow depends on the synced copy, prune only for release variants (`bundleRelease`,
  `assembleRelease`) and say which you chose; if it already works after `cap:sync`'s prune, prune
  unconditionally.

## Acceptance criteria

1. With `public/dogfood-origin.json` present, `cd android && gradlew :app:bundleRelease`
   (unsigned is fine) produces an AAB with no `base/assets/public/dogfood-origin.json` and none
   of the other prune-list paths. If your worktree has no Android SDK, say so plainly in the PR
   and state what you verified instead; do not claim the end-to-end check.
2. New QA script `qa/aab-no-dev-assets.mjs`: given an AAB path (default
   `android/app/build/outputs/bundle/release/app-release.aab`, then
   `android/app/release/app-release.aab`), lists the zip and fails on any prune-list path under
   `base/assets/public/`. Passes trivially with a clear "no AAB present" line when neither
   exists (CI has none). Reuse the prune list from `scripts/prune-ship-assets.mjs` by exporting
   it rather than duplicating. Header says how to see it fail. Register it in the smoke tier and
   add it to `qa/pre-upload-check.mjs`'s documented post-build steps.
3. New offline gate (can be the same script or a sibling) asserting that
   `android/app/build.gradle` wires the prune into `capacitorCopyWebAssets`, so the fix cannot be
   silently dropped.
4. `docs/aab-signing-closed-testing.md` §2 gains a post-build step: run
   `node qa/aab-no-dev-assets.mjs` before uploading. Do not touch version numbers.
5. The debug LAN-dogfood flow still works, or the PR explains the variant split.
6. `node qa/aab-no-dev-assets.mjs`, `node qa/ship-assets-no-dogfood-origin.mjs` and
   `node qa/run-all.mjs --smoke` pass.

## Delivery

Copy this brief into your worktree (untracked on the controller's checkout by design), commit it
with the fix, push, and open a PR that links it. Do not bump versions; do not commit regenerated
`public/city-directions/*.json` or bundle outputs.
