# Release notes — 3.0.3 (versionCode 27)

**Date:** 19 September 2026
**Previous release:** 3.0.2 (26)

**Why PATCH:** `docs/release-versioning.md` reserves PATCH for shipping to testers what's
already live on the web — no v-next backlog features. The Android app is a Capacitor shell that
bundles `public/` at build time, so both changes below are already live on the web but absent
from the installed APK until this bump.

---

## Play release notes (short form, for the Console)

```
3.0.3 (27) — Near me picks the right region
- Near me now follows the station nearest you, so standing at King's Cross, Waterloo or
  Victoria shows National Rail departures instead of defaulting to the Tube
- Nine Essex stations (Chelmsford, Clacton-on-Sea, Harlow Town and others) moved to
  Greater Anglia, where riders expect them
```

---

## What's in it

Merges since `v3.0.2` (`git log v3.0.2..origin/master --oneline`):

- **#403** — Near me: hint the region of the nearest live station, not the first bounding box.
  Falls back to the box hint when no live station is within 15 km or the country list is
  unavailable; an explicit region pick still wins.
- **#402** — UK stations: Essex nine to Greater Anglia (resolves the #399 dual claim).
  greater-anglia 121 → 130, rest-of-england 321 → 312; bounds box and bundled directions updated.

No native (`android/`) code changes beyond the version bump.

---

## Upgrade / build notes

Bumped in this release:

| File | Change |
|---|---|
| `android/app/build.gradle` | `versionCode` 26 → 27, `versionName` 3.0.2 → 3.0.3 |
| `package.json` | 3.0.2 → 3.0.3 |
| `public/site-config.json` | `appVersion` 3.0.3, `appVersionCode` 27 |
| `config/site-config.example.json` | `appVersion` 3.0.3, `appVersionCode` 27 |

Release prep, 17 Sep 2026: `pre-upload-check` all PASS; smoke 141 PASS · 1 FAIL. The one failure
was `ship-assets-no-dogfood-origin`, caused by a stale synced asset that release prep checks
before it re-syncs; `npm run cap:sync` pruned it and the gate then passed. The ordering fix is
briefed in `docs/jim-brief-release-prep-sync-before-gates.md` (separate PR).

Run `npm run cap:sync` before the Android release build. Tim builds and signs the AAB in Android
Studio; this branch does not build it.

Tag after merge: `v3.0.3`.
