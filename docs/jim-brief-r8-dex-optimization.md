# Jim brief: Enable R8 — clear Play "DEX code optimization" warning

**For:** Jim (implement) · Simon (mapping archive) · Tim (device smoke + Play upload)
**From:** Tim (product)
**Status:** Ready to code — **not before Tim is back (10 Oct 2026)**
**Backlog:** **FB-45** (this brief promotes it)
**Target:** First release after 3.0.4 that Tim can smoke on device; **Play deadline Feb 2027**
**Related:** `docs/jim-brief-play-hygiene.md` §4 (mapping process, written for this moment) · `docs/aab-signing-closed-testing.md` §3 (Play warnings matrix) · `qa/pre-upload-check.mjs` · `docs/DEVICE-SMOKE.md` · `docs/sentry-integration-now.md`

**Out of scope:** `shrinkResources` (optional follow-up PR) · iOS · any app-logic change · edge-to-edge / large screens (**FB-68**, separate brief)

**Estimate:** 1–2 dev days + one device-smoke session for Tim

---

## 1. Problem

Play Console, Production → Release dashboard, release 28 (3.0.4), 26 Sep 2026:

> **DEX code optimization is below our threshold** — Obfuscation (1%). Percentages under 25% in any category may impact your visibility and publishing capabilities on Google Play. **Fix by Feb 2027.**

Cause: `android/app/build.gradle` release block has `minifyEnabled false`, so R8 never runs. The 1% is third-party code that arrives already obfuscated (Play services / AdMob).

The play-hygiene brief (FB-41, P1) chose to ship v3 public with minify off, and FB-45 parked "enable R8 after public is stable". Public has now shipped (3.0.4, 25 Sep), and Play has put a date on it. This is no longer optional noise.

---

## 2. Locked decisions

| ID | Choice |
|----|--------|
| **R1** | `minifyEnabled true` in `release` only. Debug stays unminified. |
| **R2** | Full R8 (shrink + optimize + obfuscate) using the existing `proguard-android-optimize.txt`. Don't add `-dontobfuscate`: obfuscation is the category Play flagged. |
| **R3** | `shrinkResources` stays **off** in this PR. It's a separate follow-up once R8 is proven. |
| **R4** | Keep rules go in `android/app/proguard-rules.pro`, each with a comment saying why. Rely on library consumer rules first, and add only what a failing smoke proves is needed. |
| **R5** | The mapping file goes to **both** Play and Sentry. Otherwise crash stack traces become unreadable in both places. |
| **R6** | Ship through **internal testing** first, and let Tim's device smoke gate promotion to production. |

---

## 3. Gradle

```gradle
release {
    minifyEnabled true
    proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    ndk { debugSymbolLevel 'SYMBOL_TABLE' }
    ...
}
```

- AGP bundles `mapping.txt` into the AAB (`BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map`), and Play picks it up on upload. **Verify** that the "no deobfuscation file" warning is gone after the internal upload. If it isn't, upload the mapping manually per play-hygiene §4.1.
- Mapping path: `android/app/build/outputs/mapping/release/mapping.txt`.

---

## 4. Keep rules: the risk list

The app finds a lot of code by reflection or by name. Each row below must be proven on device, not assumed.

| Area | Why R8 can break it | Expectation |
|------|---------------------|-------------|
| Capacitor bridge + our plugins (`WidgetSyncPlugin`, `LeaveReminderPlugin`, `SentryCapacitor`) | Plugins are found by `@CapacitorPlugin` annotation, and methods are called by name from JS | `capacitor-android` ships consumer rules for `@CapacitorPlugin`/`@PluginMethod`. Confirm our two in-app plugins keep their method names. If not, add `-keep @com.getcapacitor.annotation.CapacitorPlugin class * { @com.getcapacitor.PluginMethod public *; }` |
| Cordova plugins (`capacitor-cordova-android-plugins`) | Instantiated by class name from `config.xml` | Keep `org.apache.cordova.**` if any Cordova plugin is present |
| `@capacitor-community/admob` + Google Mobile Ads | Mediation / reflection | The SDK ships consumer rules, so probably nothing extra is needed |
| `@capgo/native-purchases` (Play Billing) | Billing library AIDL / reflection | Billing ships consumer rules. **Test a real purchase and a restore** |
| `@capacitor/geolocation` | Play services location | Consumer rules |
| Glance widget (`NextTrainGlanceReceiver`), `WidgetConfigureActivity`, all manifest receivers | Manifest-referenced classes are kept by AAPT rules automatically, but Glance `ActionCallback` classes are instantiated by class name | Keep `androidx.glance.appwidget.action.ActionCallback` implementers if any widget tap breaks |
| JSON (de)serialisation of widget/journey snapshots | Any field read by name via reflection (Gson/Moshi-style) is renamed | We use `org.json` by string key, which is safe. Grep for Gson/Moshi/Kotlin serialization anyway |
| Sentry (`io.sentry`) | Stack traces obfuscated | See §5 |

Starter comment block for `proguard-rules.pro`:

```proguard
# --- Next Train (FB-45) ---
# Readable crash lines in Sentry/Play once deobfuscated
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
# Add plugin/Glance keeps below ONLY when a smoke failure proves the need; note which check failed.
```

---

## 5. Sentry mapping upload

Once obfuscated, Java/Kotlin frames in Sentry will read `a.b.c` unless Sentry has the mapping.

- Preferred: Sentry Android Gradle plugin (`io.sentry.android.gradle`) with `autoUploadProguardMapping = true`, auth token from `sentry.properties` / env (never committed), and `includeProguardMapping = true` for release only.
- Alternative: run `sentry-cli upload-proguard` in `release:prep` after `bundleRelease`.
- Acceptance: trigger a test crash from an internal build, and confirm the Sentry event shows real class names.

---

## 6. Gates

| File | Change |
|------|--------|
| `qa/pre-upload-check.mjs` | Flip the minify guard: **FAIL if `minifyEnabled false`** in release (it currently warns when true). Add a check that `proguard-rules.pro` contains the `FB-45` block |
| `qa/release-prep.mjs` | Summary line: `minify: on · mapping: <path> (bundled in AAB) · Sentry mapping: uploaded/skipped` |
| `docs/aab-signing-closed-testing.md` §3 | Deobfuscation file row: **N/A → Bundled in AAB (verify on upload)** |
| `docs/jim-brief-play-hygiene.md` | Header note: §4 is now implemented by this brief |
| `docs/feature-backlog.md` | FB-45 → brief link + status |

---

## 7. Device smoke (Tim, internal track install from Play)

Run `docs/DEVICE-SMOKE.md` in full, plus these R8-sensitive paths:

- [ ] App boots, Near me and a saved journey render (Capacitor bridge alive)
- [ ] Widget: add, configure-on-drop, tap-through, refresh, wallpaper/Blend modes
- [ ] Leave reminder: get-ready notification, **Leave now** full-screen alarm, I've left strip
- [ ] Ads load (banner + any interstitial), and **Remove ads** purchase + restore
- [ ] Location permission prompt and Near me fix
- [ ] Deep links: `nexttrain://journey`, `nearby`, `reminders`, `paywall`
- [ ] Sentry test event deobfuscated (§5)

---

## 8. Acceptance

- [ ] `bundleRelease` green with minify on, and AAB size noted (expect a drop)
- [ ] `npm run test:android:unit` + `test:pre-upload` + `release:prep` green
- [ ] Internal upload: no deobfuscation-file warning
- [ ] §7 smoke all green on Tim's phone
- [ ] After production rollout: Release dashboard no longer shows "DEX code optimization below threshold" (re-check within a week; Play recomputes per release)
- [ ] Mapping archived with release notes (Simon)
