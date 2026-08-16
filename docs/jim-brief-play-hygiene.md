# Jim brief: Play hygiene — public launch gate

**For:** Jim (implement) · Simon (R8 process) · Tim (upload + archive)  
**From:** Tim (product)  
**Status:** **Done** (2026-08-16) — `test:pre-upload` green; Play native-symbol warning clears on next AAB upload (Tim verify)  
**Backlog:** **FB-41** (consolidates **FB-09**, **FB-10**)  
**Target:** First **public** Play release (`versionName` **3.0.0** or Tim’s nominated public candidate)  
**Related:** `docs/aab-signing-closed-testing.md` · `docs/launch-blockers.md` · `docs/play-data-safety-cheatsheet.md` · `qa/pre-upload-check.mjs` · `docs/jim-brief-play-native-symbols-v3.md` (detail absorbed here)

**Out of scope:** iOS dSYM / App Store (Jon) · production rollout % (Tim) · Data safety form content (Tim) · enabling R8/minify in v3 unless Tim opts in (§2)

**Estimate:** 1–2 dev days (mostly symbols + `release:prep` + pre-upload extensions)

---

## 1. Problem

Play Console warns on every AAB upload. Two classes matter for **public** ship:

| Warning | Cause today | Public impact |
|---------|-------------|---------------|
| **Native debug symbols** | Capacitor `.so` libs; no `debugSymbolLevel` in release | Unreadable native crashes in Vitals |
| **Deobfuscation file** | Shown when `minifyEnabled true`; today **false** — warning absent | Required if we ever turn R8 on |

Closed testing safely ignored these. **Public launch** should clear the native-symbol warning and document the R8 path so we don’t scramble after the first obfuscated build.

---

## 2. Locked decisions

| ID | Choice |
|----|--------|
| **P1** | **`minifyEnabled` stays `false`** for first public release unless Tim explicitly approves R8 in a follow-up PR. |
| **P2** | **Native symbols required** — embed `SYMBOL_TABLE` in release AAB (§3). |
| **P3** | **No manual symbol upload** — AGP embeds symbols; Play extracts from AAB. |
| **P4** | **`npm run release:prep`** becomes the standard pre-AAB command for Tim (§5). |
| **P5** | **`npm run test:pre-upload`** must pass before every Play upload (extend checks §6). |
| **P6** | If R8 enabled later: mapping upload + archive is **Simon process, Jim Gradle** (§4). |

---

## 3. Native debug symbols (FB-10)

### 3.1 Gradle

In `android/app/build.gradle`, inside `buildTypes { release { ... } }`:

```gradle
release {
    minifyEnabled false
    proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    ndk {
        debugSymbolLevel 'SYMBOL_TABLE'
    }
    if (signingConfigs.release.storeFile != null) {
        signingConfig signingConfigs.release
    }
}
```

Use **`SYMBOL_TABLE`**, not `FULL`, unless Play still warns after upload.

Reference: [Include native symbols](https://developer.android.com/build/include-native-symbols)

### 3.2 Verify

```bash
npm run cap:sync
cd android && ./gradlew :app:bundleRelease
```

- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- Tim uploads to internal/closed → **native debug symbols** warning cleared

### 3.3 Acceptance

- [ ] `bundleRelease` green  
- [ ] Play upload: no native debug symbols warning  
- [ ] No change to app logic, signing, or `applicationId`

---

## 4. R8 / deobfuscation mapping (FB-09) — process only for v3

**v3 public ships with `minifyEnabled false`.** This section is **documented now**, implemented **only if** Tim enables R8 later.

### 4.1 If minify is enabled (future PR)

| Step | Owner |
|------|--------|
| ProGuard keep rules for Capacitor, AdMob, Billing, Glance | Jim |
| Device smoke: IAP, ads, widget, reminders, deep links | Tim (`docs/DEVICE-SMOKE.md`) |
| `./gradlew :app:bundleRelease` produces `mapping.txt` | Jim |
| Upload mapping in Play → App bundle explorer → Downloads → **Deobfuscation file** | Tim |
| Archive `mapping.txt` with release notes (`docs/releases/` or password manager attach) | Simon |

Mapping path (default):

`android/app/build/outputs/mapping/release/mapping.txt`

### 4.2 Keep rules starter

Extend `android/app/proguard-rules.pro` only when minify on — must include at minimum:

- `com.getcapacitor.**`
- `com.tdrevans.nexttrain.**`
- Google Play Billing / AdMob classes per their docs
- Glance / Compose widget classes if shrinker strips them

**Do not** enable minify in the FB-41 PR without Tim sign-off.

---

## 5. `npm run release:prep` (QA-P2-06)

Add script `scripts/release-prep.mjs` (or `qa/release-prep.mjs`) and npm entry:

```json
"release:prep": "node qa/release-prep.mjs"
```

### Behaviour

1. Run `npm run test:pre-upload` — exit non-zero on failure.  
2. Run `npm run test:smoke` (or `test:web:release` if Tim prefers — **default smoke** for speed).  
3. Run `npm run cap:sync`.  
4. Print summary:

```text
Next Train — release prep OK
  versionName: 2.3.0
  versionCode: 13
  applicationId: com.tdrevans.nexttrain
  AAB: android/app/build/outputs/bundle/release/app-release.aab
    (build with: cd android && ./gradlew :app:bundleRelease)
  Reminder: bump versionCode before upload; archive mapping.txt if minify on
```

5. **Do not** auto-bump `versionCode` in v1 — Tim bumps manually until we trust automation.

### Acceptance

- [ ] `npm run release:prep` exits 0 when gates pass  
- [ ] Documented in `docs/aab-signing-closed-testing.md` §1 as step before Studio bundle

---

## 6. Extend `qa/pre-upload-check.mjs`

Add checks (fail = exit 1):

| Check | Rule |
|-------|------|
| **Native symbols configured** | `build.gradle` release block contains `debugSymbolLevel` and `SYMBOL_TABLE` |
| **Minify documented** | If `minifyEnabled true`, warn FAIL with “mapping.txt required — see jim-brief-play-hygiene.md §4” |
| **Glance / widget** (optional) | If `NextTrainGlanceReceiver` in manifest, warn if missing (post-FB-40) |

Existing checks unchanged: `applicationId`, version sync, IAP id, privacy URL, icon mipmaps, synced permission hooks.

---

## 7. Doc updates

| File | Change |
|------|--------|
| `docs/aab-signing-closed-testing.md` | §1: `release:prep` + native symbols; §3: Play warnings matrix |
| `docs/launch-blockers.md` | Note FB-41 clears Play hygiene before public |
| `docs/feature-backlog.md` | FB-09/10 → absorbed by FB-41 |
| `docs/jim-brief-play-native-symbols-v3.md` | Header: **Superseded by §3 of `jim-brief-play-hygiene.md`** |
| `TESTING.md` | One row: pre-upload + release:prep before AAB |

### Play warnings matrix (for Tim)

| Warning | v3 public |
|---------|-----------|
| Native debug symbols | **Fixed** (§3) |
| Deobfuscation file | **N/A** while `minifyEnabled false` |
| Data safety / privacy | Tim — existing cheatsheet |
| Target API level | Keep current `targetSdk` per Gradle |

---

## 8. Tim checklist — public AAB (after Jim merges)

```bash
npm run release:prep
# Bump versionCode + versionName in build.gradle + site-config.json
npm run cap:sync
cd android && ./gradlew :app:bundleRelease
# Upload app-release.aab → Production (staged rollout)
# DEVICE-SMOKE.md on Play install
# Dwayne + Ruth sign-offs per launch-program.md
```

If R8 ever enabled: upload `mapping.txt` for that `versionCode` before promoting rollout.

---

## 9. QA / acceptance (FB-41 complete)

- [x] `debugSymbolLevel 'SYMBOL_TABLE'` in release `build.gradle`  
- [x] `npm run test:pre-upload` includes native-symbol check  
- [x] `npm run release:prep` exists and documented  
- [ ] Tim’s upload to Play shows **no native debug symbols** warning *(verify on next AAB upload)*  
- [x] `minifyEnabled` still `false` unless separate approved PR  
- [x] `docs/aab-signing-closed-testing.md` updated  

---

## 10. Files (expected)

| File | Change |
|------|--------|
| `android/app/build.gradle` | `ndk { debugSymbolLevel 'SYMBOL_TABLE' }` |
| `qa/release-prep.mjs` | New |
| `qa/pre-upload-check.mjs` | Native symbol + minify guard |
| `package.json` | `"release:prep"` script |
| `docs/aab-signing-closed-testing.md` | Pre-flight updates |
| `docs/launch-blockers.md` | FB-41 note |

---

## 11. Ship timing

| Track | Native symbols | R8 / mapping |
|-------|----------------|--------------|
| Closed test (historical) | Ignored OK | N/A |
| Next closed bump | **Recommended** early | Off |
| **Public v3.0.0** | **Required** | Off (process doc only) |

---

## One-liner for Tim → Jim

> Jim — Play hygiene before public: add `ndk { debugSymbolLevel 'SYMBOL_TABLE' }` to release, extend `test:pre-upload`, add `npm run release:prep`. Keep `minifyEnabled false`; document R8/mapping for later. Brief: `docs/jim-brief-play-hygiene.md`.
