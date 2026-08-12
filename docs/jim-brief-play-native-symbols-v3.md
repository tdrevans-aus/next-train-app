# Jim brief: Play native debug symbols — ship in v3.0.0

**For:** Jim (implement)  
**From:** Tim  
**Date:** 12 Aug 2026  
**Priority:** P2 — **not** blocking closed Alpha 2.1.0; **before public v3.0.0** Play upload  
**Status:** Ready to implement  
**Related:** `docs/feature-backlog.md` **FB-09** (Java R8 mapping — separate warning) · `docs/aab-signing-closed-testing.md` · `android/app/build.gradle`

**Out of scope:** Enabling R8/minify · Maestro changes · iOS dSYM upload (Jon later)

---

## Summary

Play Console warns on AAB upload:

> *This App Bundle contains native code, and you've not uploaded debug symbols.*

Capacitor ships **native `.so` libraries** (shell + plugins) even though we don't write C/C++. Play wants **native debug symbols** so Vitals crashes in native code decode to readable stack frames.

**Closed test:** Tim ignored this safely. **v3.0.0 public build:** embed symbols in the AAB so the warning clears and future native crashes are debuggable.

This is **not** the same as FB-09 (Java **deobfuscation / mapping.txt** when `minifyEnabled true`). Today `minifyEnabled false` — FB-09 stays Simon's process if we flip minify later.

---

## Goal

| Item | Target |
|------|--------|
| Native symbol warning on Play upload | Gone (or reduced) on next AAB after fix |
| AAB size | Accept modest increase — use `SYMBOL_TABLE`, not `FULL`, unless Play still warns |
| Release behaviour | No change to app logic, signing, or `minifyEnabled` |
| Docs | Update AAB checklist so Tim knows warning is handled |

---

## Implementation

### 1. Gradle — `android/app/build.gradle`

Inside `buildTypes { release { ... } }`, add NDK debug symbol packaging (AGP 4.1+; we're on **9.3.1**):

```gradle
release {
    minifyEnabled false
    proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    ndk {
        debugSymbolLevel 'SYMBOL_TABLE'
    }
}
```

**Do not** set `FULL` unless `SYMBOL_TABLE` still triggers Play warning — `FULL` is larger.

Reference: [Android — Include native symbols in your release build](https://developer.android.com/build/include-native-symbols)

### 2. Build + verify locally

```bash
npm run cap:sync
cd android && ./gradlew :app:bundleRelease
```

Checklist:

- [ ] `bundleRelease` succeeds (no new Gradle errors).
- [ ] AAB exists: `android/app/build/outputs/bundle/release/app-release.aab`.
- [ ] Optional sanity: unzip AAB / use `bundletool` — confirm `BUNDLE-METADATA/com.android.tools.build.debugsymbols/` or native symbol metadata present (exact path varies by AGP; success on Play upload is the real gate).

### 3. Play upload verification

Tim uploads to **internal** or **closed** track (same `versionCode` bump as usual):

- [ ] Upload completes.
- [ ] **Native debug symbols** warning no longer shown (or only the FB-09 mapping warning if minify still off).

Symbols embedded in the AAB are extracted by Play automatically — **no separate manual symbol upload** step when using `debugSymbolLevel`.

### 4. Doc updates (small)

| File | Change |
|------|--------|
| `docs/aab-signing-closed-testing.md` | §1 pre-flight or §3 upload: note native symbols handled via Gradle; safe to ignore warning **only** on builds **before** v3.0.0 |
| `docs/feature-backlog.md` | Add row **FB-10** or note under FB-09: native symbols → this brief |

One line in `TESTING.md` pre-upload section optional: "Play native symbol warning — fixed v3.0.0 (Jim brief)."

---

## Acceptance criteria

1. `release` buildType includes `ndk { debugSymbolLevel 'SYMBOL_TABLE' }`.
2. `./gradlew :app:bundleRelease` green on Jim's machine.
3. Tim's next AAB upload to Play does **not** show the native debug symbols warning.
4. `minifyEnabled` remains `false`; no ProGuard/R8 changes in this PR.
5. No keystore / signing / `applicationId` changes.

---

## QA after merge

Tim:

```bash
npm run test:pre-upload    # existing gate
npm run cap:sync
# Studio or gradlew bundleRelease → upload AAB → confirm Play warnings
```

No new automated test required — build + Play Console confirmation is enough.

---

## Ship timing

| Build | Action |
|-------|--------|
| Closed Alpha 2.1.0 (`versionCode 5`) | **No change** — warning ignored |
| Next closed bump (`versionCode 6+`) | **Optional** — can land early if cheap |
| **v3.0.0 public** | **Required** — must ship with symbols |

Target **`versionName` `3.0.0`** (or first public candidate) includes this fix.

---

## One-liner for Tim → Jim

> Jim — Play warns our AAB has native code but no debug symbols (Capacitor `.so` libs). Brief: `docs/jim-brief-play-native-symbols-v3.md`. Add `ndk { debugSymbolLevel 'SYMBOL_TABLE' }` to release in `build.gradle`, verify `bundleRelease`, doc tweak. Not blocking closed test; **required before public v3.0.0**. Separate from FB-09 mapping file.

---

## Change log

| Date | Note |
|------|------|
| 2026-08-12 | Brief created — Play native symbols for v3.0.0 |
