# Release notes — 3.0.2 (versionCode 26)

**Date:** 15 September 2026
**Previous release:** 3.0.1 (25)

**Why PATCH:** `docs/release-versioning.md` reserves PATCH for shipping to testers what's
already live on the web — no v-next backlog features. The Android app is a Capacitor shell that
bundles `public/` at build time, so everything merged to `master` since 3.0.1 is already live on
the web and reachable via the API, but absent from the installed APK until this bump.

---

## Play release notes (short form, for the Console)

```
3.0.2 (26) — country-wide picker, full UK catalogs, Sydney intercity
- Search for any station across the whole country — Region is now an optional "All" filter
- Every National Rail station in Great Britain now in the catalog
- Sydney intercity lines (NSW TrainLink) and the Hunter line added
- A clear notice on the board when a line is closed for works
```

---

## What's in it

Merges since `v3.0.1` (`git log v3.0.1..origin/master --oneline`):

- **#383** — Picker: country-wide station search, region becomes an optional filter.
- **#386** — Picker: hide no-live-feed stops from the country-wide list.
- **#389** — Add Rest of England to `country-regions.js` and gate the table against the picker.
- **#390** — Picker: Near you shows the nearest five stations from the cached position.
- **#392** — Settings: keep `regionExplicit:false` so GPS-follow stays on (fixes #383 regression).
- **#381** — Board: explain empty boards during planned closures (`nextServiceDate`).
- **#393** — Bundle city-directions for all live UK regions and gate it on flip.
- **#395** — London TfL: canonical self-reference guard in marketing directions (regenerated bundle).
- **#382** — UK station fill phase 1: Scotland + East Midlands full National Rail catalogs.
- **#384** — UK station fill phase 2a: fill remaining fifteen Darwin regions.
- **#385** / **#387** — Rest of England: planned region for the remaining Darwin stations, then
  flipped to live once QA was green.
- **#388** — QA: de-flake no-live-feed-stops gate (readiness waits, country-wide coverage).
- **#391** — QA nightly: triage and fix the 36 standing failures.
- **#394** — Sydney: NSW TrainLink intercity and Hunter lines (API-in-scope fill).
- **#396** — Sydney: register line-map gate, fix intercity coordinates, add direction-model memo.
- **#380** — Fix D-05, D-06, D-07, D-10 from Dwayne's post-launch security review.
- **#378** — Add headless Play screenshot capture script + 6 frames for review.
- **#376** — Privacy policy + Data safety copy for 3.0.0 (LB-09: D-02).

---

## Upgrade / build notes

Bumped in this release:

| File | Change |
|---|---|
| `android/app/build.gradle` | `versionCode` 25 → 26, `versionName` 3.0.1 → 3.0.2 |
| `package.json` | 3.0.1 → 3.0.2 |
| `public/site-config.json` | `appVersion` 3.0.2, `appVersionCode` 26 |
| `config/site-config.example.json` | `appVersion` 3.0.2, `appVersionCode` 26 |

Run `npm run cap:sync` before the Android release build. Tim builds and signs the AAB in Android
Studio; this branch does not build it.

Tag after merge: `v3.0.2`.
