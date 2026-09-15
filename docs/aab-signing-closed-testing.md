# AAB / signing checklist — Play **closed testing**

**For:** Tim  
**Purpose:** Cut and upload a signed Android App Bundle to Play **closed testing** (not production).  
**When:** After you can build the app; **before** inviting 5–15 friends. Full public QA sign-off is **not** required yet.  
**App ID:** `com.tdrevans.nexttrain` · current `versionName` **3.0.2** · `versionCode` **26** ([`android/app/build.gradle`](../android/app/build.gradle))

**Related:** [launch-blockers.md](launch-blockers.md) · [play-data-safety-cheatsheet.md](play-data-safety-cheatsheet.md) · AdMob gate `docs/jim-brief-security-admob-ship-gate.md`

---

## What you’re producing

| Thing | Meaning |
| --- | --- |
| **AAB** | `app-release.aab` — upload this to Play (not a debug APK) |
| **Upload key** | Keystore **you** use to sign AABs you upload |
| **Play App Signing** | Google holds the **app signing key**; you keep the upload key safe |

Closed testing = friends install from Play. Same signing path as production; different track.

---

## 0. Once-only: keystore + Play App Signing

Do this the first time only. Store passwords in a password manager — **never commit** keystore or passwords to git.

### Create upload keystore (Android Studio)

1. Android Studio → **Build → Generate Signed App Bundle or APK** → **Android App Bundle** → **Next**.
2. **Create new…** keystore (e.g. `C:\Users\tdrev\keys\nexttrain-upload.jks` — **outside** the repo).
3. Fill alias (e.g. `nexttrain`), passwords, certificate fields (name/org; country **AU**).
4. Save the path + passwords + alias somewhere durable (1Password / Bitwarden). Losing this hurts updates if you aren’t on Play App Signing yet.

### Enroll Play App Signing

1. Play Console → your app → **Setup → App signing** (wording may vary: “App integrity”).
2. Accept **Play App Signing** if not already on.
3. First upload: Play will accept your upload-key-signed AAB and manage the app signing key.

### Repo hygiene

- Keystore path must **not** live under `Next Train App/`.
- Confirm `.gitignore` ignores `*.jks`, `*.keystore`, `keystore.properties` (see §7).

---

## 1. Pre-flight (every closed-test build)

Run from repo root:

```bash
npm run release:prep
```

This runs `test:pre-upload` (Play hygiene + version/IAP/privacy checks), web smoke, and `cap:sync`, then prints version summary and AAB path. **Before public v3**, Tim should use this every time; for quick closed bumps, `npm run test:pre-upload` alone is enough if assets are already synced.

Manual checklist:

- [ ] Web assets you care about are in `public/` (Jim’s latest synced work).
- [ ] Launcher icon: after any icon change run `npm run export:icon` (E3 Band → `mipmap-*` + `store-assets/exports/play-icon-512.png`). Confirm home-screen mipmaps exist before bundling — don’t ship Capacitor’s default foreground.
- [ ] `applicationId` is still `com.tdrevans.nexttrain`
- [ ] Bump **`versionCode`** (integer, must increase every Play upload). Current is **26**; next upload → **27**, …
- [ ] Set **`versionName`** if you want a human label (e.g. `2.3.0` or `3.0.0`)
- [ ] Also bump `appVersion` / `appVersionCode` in `public/site-config.json` to match when you bump Gradle.
- [ ] **NDK installed** for native debug symbols: Android Studio → SDK Manager → SDK Tools → **NDK (Side by side)** (AGP 9.3 defaults to **28.2.13676358**). Rebuild AAB after install.
- [ ] **Native debug symbols:** `debugSymbolLevel 'SYMBOL_TABLE'` plus `native-debug-symbols.gradle` (Sentry prefab overlay). After `bundleRelease`, the AAB must contain `BUNDLE-METADATA/com.android.tools.build.debugsymbols` — Gradle flags alone do not clear Play.
- [ ] AdMob: release/closed builds should use **prod ads path** once Jim’s ship gate lands (debug APK may stay test mode). Don’t invite friends on a build that only shows Google test banners if you’re trying to validate real ads/IAP.
- [ ] IAP product `com.tdrevans.nexttrain.adfree` exists in Play Console (can be inactive until license testers are set — create it before expecting purchases to work)
- [ ] Privacy URL ready to paste on listing: `https://next-train-app.vercel.app/privacy.html` (after deploy)

---

## 2. Build the signed AAB (Android Studio — recommended)

1. Open `android/` in Android Studio.
2. **Build → Generate Signed App Bundle or APK** → **Android App Bundle**.
3. Select your **upload** keystore + alias + passwords.
4. Build type: **release**.
5. Finish → note output path, usually:  
   `android/app/release/app-release.aab`  
   or `android/app/build/outputs/bundle/release/app-release.aab`

**Sanity:** file exists, size isn’t tiny (empty), dated “just now”.

---

## 3. Upload to closed testing

1. Play Console → **Test → Closed testing** (create track if needed).
2. **Create new release** → upload `app-release.aab`.
3. Release name / notes: e.g. `2.1.0 closed — leave-by, widget, reminders`.
4. Review any warnings (missing Data safety, privacy URL, etc.) — fix blockers before rolling out the track.

### Exact alarm declaration (blocking error)

If Play shows **“You must let us know whether your app uses any exact alarm permissions”**, complete the declaration **before** you can roll out:

1. Play Console → **Policy → App content** (or click **Go to declaration** on the release page).
2. Open **Exact alarms** → **Start** / **Manage**.
3. Answer **Yes** — the app uses `SCHEDULE_EXACT_ALARM` for leave-by reminders, commute countdown notifications, and widget refresh at scheduled times.
4. **Do not** claim the app is an alarm or calendar app — we ship `SCHEDULE_EXACT_ALARM` only (not `USE_EXACT_ALARM`; that permission is restricted to alarm/calendar apps per [Play policy](https://support.google.com/googleplay/android-developer/answer/13161072#exact_alarm)).
5. Save → return to the release → the error should clear.

**Use case text (paste if asked):** “Schedules leave-by and get-ready notifications, commute countdown strip updates, and home-screen widget refreshes at precise departure times. Users grant Alarms & reminders in system settings; the app prompts when reminders are enabled.”

### Play warnings matrix (closed + public)

| Warning | Status | Action |
|---------|--------|--------|
| **Exact alarm declaration** | **Tim — Play Console** | App content → Exact alarms → declare leave-by / widget timing use case (`SCHEDULE_EXACT_ALARM` only). See §3 above. |
| **Native debug symbols** | **Gradle flag was not enough** | Sentry ships stripped `jni/` `.so` files, so last night’s AAB had native code and **no** Play `BUNDLE-METADATA` debugsymbols. Overlay unstripped Sentry prefab libs via [`android/app/native-debug-symbols.gradle`](../android/app/native-debug-symbols.gradle), rebuild, unzip-check `BUNDLE-METADATA/com.android.tools.build.debugsymbols`. `libandroidx.graphics.path.so` has no vendor debug file. |
| **Deobfuscation file** | **N/A** | `minifyEnabled false` — no `mapping.txt` exists. Safe to ignore until R8 is enabled (`docs/jim-brief-play-hygiene.md` §4). |
| **APK size increase** | **Mitigated** | v2.4+ added Glance/Compose + Sentry native libs (expected). Removed dev `_*.txt` scratch from assets. Further shrink needs R8 (deferred). |
| **Device support drop** | **Mitigated** | Manifest marks location + touchscreen as optional so Wi‑Fi-only / non-GPS devices stay eligible. Small drops (e.g. 28 devices) can still appear when dependencies change — check Play’s device catalog diff if needed. |

5. **Save → Review → Start rollout to closed testing**.

### Testers

- [ ] Create email list or Google Group (5–15 friends).
- [ ] Add as closed testers; share the **opt-in link**.
- [ ] They need to accept the tester invite, then install from Play (not a sideloaded debug APK).

### License testers (for IAP)

- [ ] Play Console → **Settings → License testing** (or Monetization setup) — add your Gmail + 1–2 testers who will try Remove ads.
- [ ] Purchases on closed builds only work reliably with license testers / test card setup — verify Google’s current closed-test IAP rules when you try a buy.

---

## 4. Smoke after friends can install (30 min)

From the **Play closed** install (not Android Studio debug):

- [ ] App opens; Near me or Journeys loads times  
- [ ] Save a journey; leave-by looks sane  
- [ ] Pin widget; it shows something honest (not stuck forever)  
- [ ] Reminder path doesn’t crash (full schedule test can wait)  
- [ ] Menu → Privacy / About open (or load hosted pages)  
- [ ] Optional: Remove ads attempt on a **license tester** account  

Log fails in `qa/latest.md` or Slack Jim — this **is** closed-test QA.

---

## 5. Do **not** do on this checklist

- [ ] Production / open / full rollout (separate Tim go + Dwayne + Ruth)  
- [ ] Turning off closed testing  
- [ ] Committing keystore, passwords, or `keystore.properties`  
- [ ] Uploading a **debug** APK to Play  

---

## 6. Next closed upload (when Jim fixes land)

1. `npm run cap:sync`  
2. Bump `versionCode` in `android/app/build.gradle`  
3. Generate signed AAB again (same upload keystore)  
4. New release on closed track → rollout  

---

## 7. Suggested `.gitignore` entries

```
*.jks
*.keystore
keystore.properties
android/keystore.properties
```

---

## Stuck?

| Symptom | Likely fix |
| --- | --- |
| Play rejects signing | Wrong keystore, or first upload must enroll App Signing |
| versionCode error | Must be higher than any AAB already on Play for this app |
| Testers can’t find app | Opt-in link not accepted; wrong Google account on device |
| IAP fails | Product id mismatch; not a license tester; ads/IAP need Play-signed build |
| Widget missing | Must add from launcher widget picker after install |

---

## Change log

| Date | Note |
| --- | --- |
| 2026-08-11 | First closed-testing AAB/signing checklist |
| 2026-08-16 | **FB-41:** `release:prep`, native symbols gate, Play warnings matrix |
