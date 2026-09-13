# Jim brief — release 3.0.1 (versionCode 25) for Play public

Mode: bug-fix / product (CLAUDE.md "Bug-fix lane"). tim-review: no — mechanical release bump,
Tim decided path 1 (submit production today, 13 Sep 2026). Lane lock: not required.

## Why

`v3.0.0` (57b6325, versionCode 24) was tagged before today's security fixes. #367 changed the
release Android manifest (cleartext off, test deep link removed), so the AAB Google receives must
be built from current master. Per `docs/release-versioning.md` a fixes-only bump is PATCH.

## Task

1. Branch `jim/release-3.0.1` from current `origin/master`.
2. `android/app/build.gradle`: `versionCode 25`, `versionName "3.0.1"`. Grep the repo for any
   other place the version is recorded (release-versioning.md's table, site-config example if it
   exists, `package.json` version if it tracks the app) and update them consistently.
3. `docs/release-notes-3.0.1.md`: short Play "What's New" block (start from 3.0.0's, add one line
   for the EU/UK ad consent and one for security hardening) plus a "what's in it" list of the
   merges since v3.0.0 (`git log v3.0.0..origin/master --oneline`).
4. Fix the two inconsistencies Ruth flagged in `docs/release-notes-3.0.0.md`: line 8 says "six
   countries" (it is five); line 30 says "18 regions" but the row lists 20 — make the number match
   the list.
5. Add the 3.0.1 row to the release table in `docs/release-versioning.md` and update the stale
   `versionName 2.3.0 · versionCode 13` header in `docs/aab-signing-closed-testing.md` to 3.0.1 · 25.
6. Run `npm run test:pre-upload` and `node qa/run-all.mjs --smoke`, each as a foreground Bash
   call with an explicit timeout of 600000 ms, never in the background; do not end the turn while
   a run is in progress. Do not build the AAB — Tim builds and signs it in Android Studio.
7. Commit, push, open a PR linking this brief. Do not merge and do not tag; the top-level session
   tags `v3.0.1` after merge.

## Acceptance

- `test:pre-upload` passes with version 3.0.1 / 25 reported.
- Smoke green on a non-3000 port.
- Diff touches only version fields, the two release-notes files, release-versioning.md,
  aab-signing-closed-testing.md, and this brief.
- No dev servers, headless Chrome or poll loops left running; confirm with
  `netstat -ano | findstr LISTENING`.
