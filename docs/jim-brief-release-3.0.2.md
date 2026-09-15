# Jim brief — Release 3.0.2 (versionCode 26): ship the weekend's web changes to Android

**Lane:** bug-fix / product mode, release. `tim-review: no`. Tim asked for it on 15 Sep 2026
after seeing the old picker on his phone. **Lane lock:** none. Leave no background loops,
pollers or dev servers; run suites with explicit `timeout: 600000` and tail output in the
foreground if backgrounded.

## Why

The Android app is a Capacitor shell that bundles `public/` at build time
(`android/app/build.gradle` refreshes `android/app/src/main/assets/public` every build). The
build on Tim's phone is 3.0.1 / versionCode 25 (PR #377, 13 Sep), so it still has the
region-first picker. Everything merged since is live on the web and absent from the APK:
country-wide station search with Region as an optional "All" filter (#383, #386, #389, #390,
#392), the closure notice on empty boards (#381), bundled directions (#393, #395). The
server-side pieces (full UK catalogs, Sydney intercity) already reach the old APK through the
API; the picker and the closure notice do not.

## Do exactly what 3.0.1 did

Follow `docs/jim-brief-release-3.0.1.md` and `docs/release-versioning.md` step for step, one
version further. Diff PR #377 to see every file it touched and touch the same set:

- `android/app/build.gradle`: `versionCode` 25 to 26, `versionName` "3.0.1" to "3.0.2".
- `package.json`: 3.0.1 to 3.0.2; the same `config/site-config.example.json` and
  `public/site-config.json` fields #377 changed.
- `docs/release-notes-3.0.2.md` in the shape of `docs/release-notes-3.0.1.md`: a rider-facing
  "what's new" (search for any station across the whole country; every National Rail station in
  Great Britain; Sydney intercity lines; a notice when a line is closed for works), then the PR
  list above, then the file table.
- `docs/release-versioning.md` history line.

Then `npm run build:train-times` if the bundle-freshness gate needs it, and the Android unit
tier. `docs/aab-signing-closed-testing.md` marks which steps are Tim-only: do not sign or
upload; stop where that document says Tim takes over.

## Acceptance criteria

1. `node qa/run-all.mjs --release` green (foreground, 600000 ms timeout).
2. `android-unit` CI job green on the PR.
3. Release notes present and accurate; version fields consistent in every file #377 touched.
4. No functional change in this PR beyond version bumps and notes.

## Process

Worktree from current master; copy this brief in; commit, push; PR "Release 3.0.2
(versionCode 26): country-wide picker, full UK catalogs, Sydney intercity" linking this brief.
After merge the controller tags `v3.0.2` at the merge commit as #377 was tagged. The signed AAB
and the Play upload are Tim's.
