# Jim brief: Closed-test AAB v6 — location + icon ship gate

**For:** Jim (implement + commit)  
**From:** Tim  
**Date:** 12 Aug 2026  
**Priority:** **P0** — closed Alpha 2.1.0 (versionCode **5**) shipped **without** location prompt or E3 icon; blocks friend blast  
**Status:** Shipped (Jim — commit + gate); Tim uploads v6 after pre-upload green  
**Supersedes:** `docs/jim-brief-closed-aab-v5-tonight.md` (v5 shipped broken — do not reuse v5 checklist alone)

**Related:** `docs/aab-signing-closed-testing.md` · `docs/simon-brief-app-icon.md` (E3 Band) · `qa/pre-upload-check.mjs` · `docs/closed-test-opt-in-blast.md`

**Out of scope:** Play Console upload (Tim) · keystore · multi-city · Maestro native symbols (FB-10 — separate brief)

---

## 1. What went wrong (v2 / v3 / v5)

Play shows versionCodes **2, 3, 5** all as **versionName 2.1.0**. Tim assumed v5 had fixes from v3 — it did not.

| Issue | Expected (v5 brief) | What Play got |
|-------|---------------------|---------------|
| **Location** | System **Allow location** on first Near me open | Permission never requested; Near me broken / app-killer |
| **Launcher icon** | Simon **E3 Band** (mist `#EEF3F2` + tracks) | Old / white Capacitor-style icon |

**Root cause (verified in repo):**

1. **Fixes were local / uncommitted** — committed `HEAD` still had plain `getCurrentPosition` in `geo-native.mjs` and **no** `ensureLocationPermission` call in `enterNearbyMode`.
2. **v5 AAB built before sync** — upload ~4:06 PM; `cap:sync` + `export:icon` ran ~midnight. AAB did not contain synced assets or mipmaps.
3. **`versionName` unchanged** — easy to think “new build = new fixes” when only `versionCode` moved.

**This brief:** commit the real fixes, add automated gate, bump to **versionCode 6**, hand Tim a tree that cannot ship stale again.

---

## 2. Code to commit (working tree → git)

### A. Location permission (native Near me)

**Files:** `public/geo-native.mjs` · `public/geo-bundle.js` (via `npm run build:geo`) · `public/app.js`

**Behaviour (locked):**

1. On native, **first** automatic Near me open (`enterNearbyMode` without manual station):
   - `ensureGeoBridge()` then `NextTrainGeo.ensureLocationPermission()`.
   - `checkPermissions` → if not granted and not denied, `requestPermissions` → system dialog.
2. If denied: show existing in-app message + station picker path (no silent hang).
3. `getAppGeolocationPosition` / `getCurrentPosition` also call `ensureLocationPermission` before fix.
4. Web / browser: unchanged (no Capacitor dialog).

**Do not** request location on journey-only cold start when user has a scheduled journey and `shouldDefaultToNearby()` is false.

### B. E3 launcher icon

**Files:**

- `public/icon.svg` (E3 Band — already correct)
- `android/app/src/main/res/values/ic_launcher_background.xml` → `#EEF3F2` (not `#FFFFFF`)
- All `mipmap-*/ic_launcher*.png` + `ic_launcher_foreground.png` from `npm run export:icon`
- `store-assets/exports/play-icon-512.png` (Play listing — Tim uploads separately)

**Do not** ship Capacitor default foreground or white adaptive background.

### C. Version bump

| Field | Value |
|-------|--------|
| `android/app/build.gradle` | `versionCode 6`, `versionName "2.1.0"` (or `2.1.0-closed2` if Tim wants label clarity) |
| `public/site-config.json` | `appVersionCode: 6`, `appVersion` matches `versionName` |

Play already has **5** — next upload must be **6+**.

---

## 3. Ship gate — extend `qa/pre-upload-check.mjs`

Add **FAIL** checks (not optional):

| Check | How |
|-------|-----|
| Synced `ensureLocationPermission` | `android/app/src/main/assets/public/geo-bundle.js` contains `ensureLocationPermission` |
| Synced Near me hook | `android/app/src/main/assets/public/app.js` contains `ensureLocationPermission` in `enterNearbyMode` path |
| E3 background | `ic_launcher_background.xml` contains `#EEF3F2` (case-insensitive) |
| Mipmaps exist | `mipmap-mdpi/ic_launcher_foreground.png` + `mipmap-xxxhdpi/ic_launcher_foreground.png` exist |
| versionCode | Gradle `versionCode` === `site-config.json` `appVersionCode` |

Print on failure: *Run `npm run export:icon && npm run cap:sync` then re-run pre-upload.*

Keep existing checks (applicationId, IAP id, privacy URL).

---

## 4. Build order (mandatory — every AAB)

```powershell
cd "C:\Users\tdrev\Next Train App"

git status   # confirm location + icon files committed

npm run export:icon
npm run cap:sync
npm run test:pre-upload
```

Then either:

- `cd android && .\gradlew.bat :app:bundleRelease` (unsigned), **or**
- Tim: Android Studio → **Generate Signed App Bundle** from synced `android/`

**Tim must not** sign from Studio until `test:pre-upload` is green.

---

## 5. Device acceptance (Jim or Tim before upload)

On emulator or device — **uninstall** old build first (or clear app data):

| # | Step | Pass |
|---|------|------|
| 1 | Install **debug** or release APK from this tree | App opens |
| 2 | Launcher icon | E3 Band (mist green-grey tile + diagonal tracks) |
| 3 | Cold start, no journeys / defaults to Near me | Android **location permission** dialog appears |
| 4 | Allow → board loads nearest station | Not stuck on spinner forever |
| 5 | Deny → in-app message + can pick station | Not app-killer blank |

Optional: `npm run test:maestro` (flows 1–3) after debug install.

---

## 6. Hand off to Tim

After Jim’s PR / commit:

1. Pull latest  
2. `npm run export:icon && npm run cap:sync && npm run test:pre-upload`  
3. Studio → **Generate Signed App Bundle** → upload keystore → **release**  
4. Play → **Closed testing** → new release **versionCode 6**  
5. Release notes: `2.1.0 (6) — location prompt + E3 icon (fixes v5)`  
6. **Store listing icon:** upload `store-assets/exports/play-icon-512.png` if Play listing still shows old art (separate from AAB)  
7. Wait for review → uninstall old app on test phone → install from Play → re-run §5 table  
8. Then `docs/closed-test-opt-in-blast.md`

---

## 7. Do not

- Re-upload **versionCode 5** (rejected or same bits)  
- Commit keystores / passwords  
- Skip `cap:sync` and assume `public/` changes are in the AAB  
- Change `applicationId` or IAP product id  
- Enable R8/minify in this PR (FB-09 stays separate)

---

## 8. Acceptance criteria

1. Location + icon fixes **committed** on main (not only Tim’s machine).  
2. `versionCode 6` in Gradle + `site-config.json`.  
3. `npm run test:pre-upload` passes including new sync/icon checks.  
4. Device §5 table green on fresh install.  
5. Tim’s Play upload **6** shows fixes; v5 remains inactive on track.

---

## Slack / one-liner

> Jim — v5 closed Alpha shipped **without** location prompt or E3 icon (fixes were uncommitted + AAB built before cap:sync). Brief: `docs/jim-brief-closed-aab-v6-ship-gate.md`. **Commit** geo-native + app.js + mipmaps, bump **versionCode 6**, extend `pre-upload-check` to fail if synced assets miss `ensureLocationPermission` or `#EEF3F2`. Tim uploads after `export:icon && cap:sync && test:pre-upload` green.

---

## Change log

| Date | Note |
|------|------|
| 2026-08-12 | Brief created — v6 ship gate after v5 regression |
