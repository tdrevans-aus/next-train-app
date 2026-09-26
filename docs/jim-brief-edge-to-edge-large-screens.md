# Jim brief: Edge-to-edge + large screens (Android 15/16)

**For:** Jim (implement) · Tim (device + tablet/foldable check)
**From:** Tim (product)
**Status:** Ready to code — **not before Tim is back (10 Oct 2026)**
**Backlog:** **FB-68**
**Target:** Next minor release after 3.0.4
**Related:** `android/app/src/main/AndroidManifest.xml` · `android/app/src/main/res/values/styles.xml` · `public/styles/base.css` (`--safe-top` / `--safe-bottom`) · `docs/jim-brief-widget-configure-on-drop.md` · `docs/DEVICE-SMOKE.md`

**Out of scope:** Tablet-specific layouts (two-pane etc.) · widget sizing (FB-43) · R8 (**FB-45**, separate brief) · iOS

**Estimate:** 1–2 dev days + emulator matrix

---

## 1. Problem

Play Console, Production → Release dashboard, release 28 (3.0.4), 26 Sep 2026, "3 actions recommended":

| # | Play says | What it means for us |
|---|-----------|----------------------|
| **A** | *Edge-to-edge may not display for all users.* Apps targeting SDK 35 display edge-to-edge by default on Android 15+; handle insets, or call `EdgeToEdge.enable()` for backward compatibility. | We target **SDK 36** (`android/variables.gradle`), so Android 15+ users already get forced edge-to-edge, and on 16 the opt-out attribute is ignored. Devices on Android 14 and below don't draw edge-to-edge, so the app looks different by OS version. |
| **B** | *Deprecated edge-to-edge APIs:* `LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES`, starting in `com.google.android.gms.ads.internal.overlay.zzm.zzJ` | This is the **Google Mobile Ads SDK's** full-screen ad overlay, not our code. Our own `AppTheme.LeaveAlarm` also sets `android:statusBarColor` / `navigationBarColor` / `windowFullscreen`, which are deprecated or ignored on 15+. |
| **C** | *Remove resizability and orientation restrictions.* From Android 16, these are ignored on large screens (sw ≥ 600dp). Detected `screenOrientation="PORTRAIT"` on `MainActivity`, `WidgetConfigureActivity`, `LeaveAlarmActivity`. | With targetSdk 36, **Android 16 tablets and unfolded foldables already ignore our portrait lock today.** Anyone on one is seeing landscape layouts we've never tested. |

None of these blocks publishing. **C** is a live UX exposure right now, and **A** is a consistency and polish issue.

**Good news:** the web layer already uses `env(safe-area-inset-*)` (`public/styles/base.css` `--safe-top`/`--safe-bottom`, plus dialogs, ads toast, widget-appearance, journey-detail). Most of the inset work may already be done. This brief is mostly verify, then fill the gaps.

---

## 2. Locked decisions

| ID | Choice |
|----|--------|
| **E1** | Edge-to-edge on **all** API levels. Call `EdgeToEdge.enable(this)` (androidx.activity) in `MainActivity`, `WidgetConfigureActivity` and `LeaveAlarmActivity` before `super.onCreate` / `setContentView`, so Android 14 and below match 15+. First check what Capacitor 8's `BridgeActivity` / SystemBars already does, so we don't double-apply. |
| **E2** | Insets are handled **in CSS** via `env(safe-area-inset-*)`, which we already use. Check Capacitor 8's SystemBars / safe-area handling on older Android System WebView versions, where `env()` can report 0. Use whatever Capacitor 8 provides (config or CSS variables) rather than hand-rolled native padding. |
| **E3** | **Remove `android:screenOrientation="portrait"`** from all three activities. Phones may stay portrait-feeling via layout, but the manifest lock goes. Don't swap it for `resizeableActivity="false"` or another restriction; Play will flag that too. |
| **E4** | Large screens get **"doesn't break"**, not "designed for tablet": content column centred with a max width, nothing clipped, no overlapping fixed elements, dialogs usable in landscape. |
| **E5** | **B (AdMob `SHORT_EDGES`)** is not ours to fix. Bump `@capacitor-community/admob` / Google Mobile Ads SDK to latest in this PR. If Play still lists it, record it as known third-party in `docs/aab-signing-closed-testing.md` §3 and move on. |
| **E6** | `AppTheme.LeaveAlarm`: drop the deprecated `statusBarColor` / `navigationBarColor` / `windowFullscreen`. Draw the `#0F1F1D` background edge-to-edge and pad content by the system-bar insets. Hide the system bars via `WindowInsetsControllerCompat` if we still want the full-screen alarm feel. |

---

## 3. Work

### 3.1 Native

- `MainActivity.onCreate`: `EdgeToEdge.enable(this)` (subject to the E1 check). The `androidx.activity` version is already pinned (`androidxActivityVersion 1.11.0`).
- `WidgetConfigureActivity`, `LeaveAlarmActivity`: same. Apply `ViewCompat.setOnApplyWindowInsetsListener` to the root view where the layout is native (not WebView).
- `styles.xml`: remove the deprecated bar-colour and fullscreen items from `AppTheme.LeaveAlarm` (E6). Check that `AppTheme.NoActionBarLaunch` (splash) looks right edge-to-edge.
- Manifest: remove `screenOrientation` ×3 (E3). `MainActivity` already declares `configChanges` for orientation/screenSize, so rotation won't recreate the WebView. **Verify** that the JS layout reflows on `resize`.

### 3.2 Web (only where the matrix in §4 shows a gap)

- Bottom tab bar, ad banner and toasts must sit above the gesture/nav bar in **both** 3-button and gesture navigation.
- Hero/header must sit below the status bar and any display cutout, in portrait **and landscape** (left/right insets matter in landscape: use `safe-area-inset-left/right`).
- Large widths: centre the main column with a `max-width` (≈ 560–640px), and make sure fixed/absolute elements (coach cards, toasts, dialogs) position against that column, not the viewport edge.
- Landscape phone (short height): dialogs keep their `max-height` with `dvh` and stay scrollable. Check `.journeys-dialog` and widget-appearance.

### 3.3 Deps

- Bump `@capacitor-community/admob` to latest 8.x and `npx cap sync`. Record the Mobile Ads SDK version before and after in the PR.

---

## 4. Test matrix (emulator + Tim's phone)

| Device / AVD | Orientation | Nav mode | Screens to check |
|--------------|-------------|----------|------------------|
| Tim's phone (Play internal install) | Portrait | His default | Full `DEVICE-SMOKE.md` |
| Pixel 8, API 34 | Portrait | 3-button | Near me, Journeys, Menu, dialogs, ad banner |
| Pixel 8, API 35 | Portrait + landscape | Gesture | Same + Leave alarm + widget configure |
| Pixel Tablet, API 36 | Landscape + portrait | Gesture | Same. No clipped/overlapping UI, centred column |
| Pixel Fold, API 36 | Folded ↔ unfolded while on Near me | Gesture | State survives the fold/unfold, and the layout reflows |

Screenshot each and attach to the PR. Before/after for the tablet row.

---

## 5. Gates / docs

| File | Change |
|------|--------|
| `qa/pre-upload-check.mjs` | FAIL if any `<activity>` declares `screenOrientation` or `resizeableActivity="false"` |
| `docs/aab-signing-closed-testing.md` §3 | Add rows: edge-to-edge (fixed), large-screen restrictions (fixed), AdMob `SHORT_EDGES` (third-party, if it persists) |
| `docs/jim-brief-widget-configure-on-drop.md` | Its manifest snippet shows `screenOrientation="portrait"`. Add a note that FB-68 removed it |
| `docs/feature-backlog.md` | FB-68 status |

---

## 6. Acceptance

- [ ] No `screenOrientation` restrictions in the merged manifest (`bundleRelease` → check the merged manifest in the AAB)
- [ ] §4 matrix screenshots attached, with no content under system bars or cutouts, and nothing clipped on tablet or unfolded
- [ ] Leave alarm renders edge-to-edge on API 34 and 36, with no deprecated theme attrs left
- [ ] `test:smoke`, `test:android:unit`, `test:pre-upload` green
- [ ] After production release, the Release dashboard no longer lists recommendations **A** and **C**. **B** is either gone or documented as third-party
