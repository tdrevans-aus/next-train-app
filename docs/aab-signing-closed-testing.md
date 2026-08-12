# AAB / signing checklist — Play **closed testing**

**For:** Tim  
**Purpose:** Cut and upload a signed Android App Bundle to Play **closed testing** (not production).  
**When:** After you can build the app; **before** inviting 5–15 friends. Full public QA sign-off is **not** required yet.  
**App ID:** `com.tdrevans.nexttrain` · current `versionName` **2.1.0** · `versionCode` **5** ([`android/app/build.gradle`](../android/app/build.gradle))

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

- [ ] Web assets you care about are in `public/` (Jim’s latest synced work).
- [ ] Launcher icon: after any icon change run `npm run export:icon` (E3 Band → `mipmap-*` + `store-assets/exports/play-icon-512.png`). Confirm home-screen mipmaps exist before bundling — don’t ship Capacitor’s default foreground.
- [ ] From repo root: `npm run cap:sync`
- [ ] `applicationId` is still `com.tdrevans.nexttrain`
- [ ] Bump **`versionCode`** (integer, must increase every Play upload). Current is **5**; next upload → **6**, …
- [ ] Set **`versionName`** if you want a human label (e.g. keep `2.1.0` or `2.1.0-closed1`)
- [ ] Also bump `appVersion` / `appVersionCode` in `public/site-config.json` to match when you bump Gradle.
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
