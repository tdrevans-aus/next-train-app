# Jim brief: Closed-test AAB for Tim tonight (v5)

**For:** Jim  
**From:** Tim / Simon  
**Date:** 12 Aug 2026  
**Priority:** Tonight — Tim signs + uploads to Play closed testing before friend blast  
**Out:** Do **not** invite friends; do **not** need Play Console access; Tim signs with his upload keystore

---

## 1. Why

Ship **versionCode 5** so closed testers get:

1. **Location** — explicit `Geolocation.requestPermissions()` on Near me first open (not silent fail)  
2. **Icon** — Simon **E3 Band** (mist `#EEF3F2` + diagonal tracks), not old train / Capacitor placeholder  
3. Sentry DSN + other already-synced web assets

Play rejects same `versionCode` — **5** is already set in Gradle + `site-config.json`.

---

## 2. Build steps (repo root)

```powershell
cd "C:\Users\tdrev\Next Train App"

npm run export:icon
npm run cap:sync

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio1\jbr"
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path

# Release bundle (unsigned unless signing is configured in gradle)
cd android
.\gradlew.bat :app:bundleRelease
```

**Output (typical):**  
`android\app\build\outputs\bundle\release\app-release.aab`

If Gradle signing isn’t set up (usual): Tim will **re-sign / Generate Signed Bundle** in Android Studio from this synced `android/` tree — still run `export:icon` + `cap:sync` so assets are current.

---

## 3. Sanity before handing to Tim

- [ ] `public/icon.svg` is E3 Band (mist + diagonal tracks)  
- [ ] `android/app/src/main/res/mipmap-*/ic_launcher*.png` exist (from `export:icon`)  
- [ ] `values/ic_launcher_background.xml` is `#EEF3F2`  
- [ ] `android/app/build.gradle` → `versionCode 5`, `versionName "2.1.0"`  
- [ ] `public/site-config.json` → `appVersionCode: 5`  
- [ ] `geo-bundle.js` includes `ensureLocationPermission`  
- [ ] `index.html` loads `geo-bundle.js`  
- [ ] AAB file exists and is freshly dated (if Jim ran `bundleRelease`)

**Optional smoke:** uninstall app on emulator → install **debug** with `installDebug` → fresh open → system **Allow location** dialog on Near me. Icon check on launcher after release install.

---

## 4. Hand off to Tim

Tell Tim:

1. Open `android/` in Android Studio  
2. **Build → Generate Signed App Bundle** → release → his **upload** keystore  
3. Upload AAB to **Play → Closed testing** (release notes e.g. `2.1.0 (5) — location prompt + E3 icon`)  
4. Optionally refresh store listing icon: `store-assets/exports/play-icon-512.png`  
5. Then send `docs/closed-test-opt-in-blast.md`

---

## 5. Do not

- Don’t bump past 5 unless Play already has 5  
- Don’t commit keystores / passwords  
- Don’t flip cities live or change IAP product ids  

---

## Slack / one-liner

> Jim — tonight ship prep: `npm run export:icon` + `npm run cap:sync`, confirm versionCode **5** and E3 mipmaps, then `bundleRelease` or leave Tim to Generate Signed AAB in Studio. Location prompt + E3 icon must be in this closed build before friend blast.
