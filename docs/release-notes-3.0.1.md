# Release notes — 3.0.1 (versionCode 25)

**Date:** 13 September 2026
**Previous release:** 3.0.0 (24)

**Why PATCH:** `docs/release-versioning.md` reserves PATCH for fixes for what testers/users already
have — no v-next backlog features. `v3.0.0` (57b6325, versionCode 24) was tagged before the
security fixes in #367 landed; the AAB Google receives for production must be built from current
master, so this is a fixes-only bump ahead of submission, not a feature release.

---

## Play release notes (short form, for the Console)

```
3.0.1 (25) — fixes ahead of launch
- Now covering Australia, the UK, Sweden, Finland and Norway
- Faster, more reliable live boards
- Many fixes to direction and destination accuracy
- Added EU/UK ad consent (Google UMP) before showing ads
- Security hardening: release cleartext traffic disabled, test deep link removed
```

---

## What's in it

Merges since `v3.0.0` (`git log v3.0.0..origin/master --oneline`):

- **#375** — Prod sweep: alarm on any single city's GTFS refresh failure, not just all-failed.
- **#374** — Fix Task 2: `vercel.json` function memory override is silently inert.
- **#373** — Pin `api/health.js` (GTFS refresh cron) to `syd1` for Canberra 403.
- **e793043** — Cache-bust GTFS refresh status record.
- **#367** — Security: remove release cleartext + test deep link, rate-limit and honeypot
  `/api/feedback`.
- **#370** (D-01) — EU/UK ad consent (Google UMP) before native ad requests.
- **#372** — QA: one dev-server port per run, never attach to a stranger's `:3000`.
- **#365** — Brussels planned gate: drive the real `fetchStationBoard` against the fixture.
- **#369** — QA: `sydney-direction-match` reads a local fixture instead of the Blob store.

---

## Upgrade / build notes

Bumped in this release:

| File | Change |
|---|---|
| `android/app/build.gradle` | `versionCode` 24 → 25, `versionName` 3.0.0 → 3.0.1 |
| `package.json` | 3.0.0 → 3.0.1 |
| `public/site-config.json` | `appVersion` 3.0.1, `appVersionCode` 25 |
| `config/site-config.example.json` | `appVersion` 3.0.1, `appVersionCode` 25 |

Run `npm run cap:sync` before the Android release build. Tim builds and signs the AAB in Android
Studio; this branch does not build it.

Tag after merge: `v3.0.1`.
