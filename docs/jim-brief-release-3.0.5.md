# Jim brief — Release 3.0.5: iOS (build 31) and Android (versionCode 29)

**Lane:** bug-fix / product mode, release. `tim-review: no` for the version and notes PR; the store
listing copy is already Tim-approved (`docs/aso-pass-3-0-5.md`, 24 Nov 2026). Tim asked for this release
on 25 Nov 2026. **Lane lock:** none. Leave no background loops, pollers or dev servers. Run suites with an
explicit `timeout: 600000` and tail the output in the foreground if they get backgrounded.

## Preconditions (don't start until all three are true)
1. **Tim:** the new iOS AdMob app (`~4788376838`) is covered by a **published** Privacy & messaging
   message (GDPR + US states). Without it, UMP `requestConsentInfo` fails on iOS and the fail-closed gate
   shows no ads. See #550's description and `docs/mac-brief-ios-admob-ids.md`.
2. **Tim (Mac):** a debug iOS build from #550's branch, with the iOS app ID, shows Google's iOS test
   banner.
3. **PR #550** (iOS 3.0.5 build 31, FB-69 AdMob IDs) is merged to master. It sets iOS
   `MARKETING_VERSION` 3.0.5 / `CURRENT_PROJECT_VERSION` 31 and touches `public/site-config.json`, so
   this PR goes on top of it to avoid conflicts.

## Why this release
Installed apps bundle `public/` at build time (`capacitor.config.ts` `webDir: "public"`). Server-side fixes
already reach every installed app through the API. Client-side changes merged since 3.0.4 don't:
- **#558:** a saved route in a retired city (e.g. Uppsala) shows "<City> is no longer covered" plus
  "Choose a city", instead of an error.
- **#550:** iOS uses its own AdMob IDs, so iOS gets ads at all (FB-69).
- Anything else in `public/`, `web-sources/` or the native projects since the 3.0.4 release commit. Find
  that commit from `docs/release-notes-3.0.4.md` / `docs/release-versioning.md` and list every PR since
  then that touches those paths.

## Do what 3.0.2 did, one platform wider
Follow `docs/jim-brief-release-3.0.2.md` and `docs/release-versioning.md` step for step:
- `android/app/build.gradle`: `versionCode` 28 → 29, `versionName` "3.0.4" → "3.0.5".
- `package.json` and the `config/site-config.example.json` / `public/site-config.json` version fields
  the previous release PRs touched. iOS is already 3.0.5/31 from #550, so check it's consistent and don't
  bump it again.
- `docs/release-notes-3.0.5.md` in the shape of `docs/release-notes-3.0.4.md`:
  - a rider-facing "what's new". Include the retired-city message. Server-side improvements riders already
    have can go under "also improved": Sydney live times and Sydney Metro, Melbourne restored, Uppsala
    no longer covered.
  - the PR list.
  - the file table.
- `docs/release-versioning.md` history line.
- `npm run build:train-times`, and rebuild any bundles if the bundle-freshness gates need it.

`docs/aab-signing-closed-testing.md` and the iOS release docs mark the Tim-only steps (signing, the AAB
upload, Xcode archive, App Store Connect). Stop where they say Tim takes over.

## Acceptance criteria
1. `node qa/run-all.mjs --release` green, run in the foreground with timeout 600000.
2. `android-unit` CI green on the PR.
3. Version fields consistent across Android, iOS, `package.json` and site-config. The release notes are
   accurate, and every listed PR exists and is merged.
4. No functional change in this PR beyond versions, notes and regenerated bundles.

## Process
Worktree from current master (after #550). Copy this brief from
`C:\Users\tdrev\Projects\next-train-app\docs\jim-brief-release-3.0.5.md` (untracked in the main checkout)
into the worktree and commit it with the PR. Commit, push, and open PR "Release 3.0.5 (iOS 31 / Android
29): retired-city message, iOS ads" linking this brief. After merge, the controller tags `v3.0.5` at the
merge commit. Tim does the signing, uploads and console listing paste (`docs/aso-pass-3-0-5.md`).
