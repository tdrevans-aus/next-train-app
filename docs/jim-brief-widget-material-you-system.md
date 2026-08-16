# Jim brief: Match system — Material You dynamic colours

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Implemented  
**Backlog:** **FB-38**  
**Fixes:** **FB-35 W8** — current `resolveSystem()` reads AppCompat theme attrs and looks wrong on device  
**Related:** `WidgetThemePalette.java`, `WidgetUiBuilder.java`, `WidgetSyncPlugin.java`, `NextTrainWidgetProvider.java`, `public/widget.js`  
**Out of scope:** Changing preset palettes; full app theme (**FB-01**); iOS; per-widget-instance themes; semantic leave/urgent/late colours; launcher icon-pack theming (only wallpaper-derived Monet on API 31+)

**Estimate:** 2.5–4 dev days

---

## 1. Problem

**Match system** (`widgetThemeId === "system"`) is shipped but **broken**:

- On API 31+, code reads `colorBackground` / `colorPrimary` from the app’s **AppCompat** theme — not wallpaper-derived Material You colours.
- Widget paint uses **application/receiver context** (`Theme.AppCompat.Light…`), so dark mode and Monet tokens are often wrong.
- The web swatch shows a **fake** light/dark split — not the colours the widget will use.

Users expect **wallpaper harmony** on Android 12+ (Pixel, Samsung One UI 4+, etc.). This brief makes W8 do what FB-35 promised.

**User-facing label stays:** **Match system** (no “Material You” in UI). Optional hint: *Uses your wallpaper colours on Android 12+.*

---

## 2. Goal (one sentence)

When `widgetThemeId === "system"`, resolve widget **bg / text / muted / accent / border** from **Android 12+ system dynamic colours** (Monet), refresh on wallpaper or night-mode change, with safe fallbacks and contrast guard.

---

## 3. Locked decisions

| ID | Choice |
|----|--------|
| **M1** | Dynamic extraction **only** when `widgetThemeId === "system"`. All named presets stay static. |
| **M2** | **API 31+ (Android 12):** read `android.R.color.system_*` resources (wallpaper-derived on Monet devices). **Do not** use `context.getTheme()` AppCompat attrs for system mode. |
| **M3** | **API 26–30:** `system` → **Default** preset (white / teal). No crash, no empty palette. |
| **M4** | **Semantic colours immune:** `widget_leave`, `widget_urgent`, `widget_late` stay `#B45309`, `#C2410C`, `#BE123C` in `WidgetUiBuilder` (unchanged). |
| **M5** | **FB-36 opacity** applies to resolved system **bg fill only** (same as presets). |
| **M6** | **Contrast guard:** if `textOnBg` or `accentOnBg` &lt; **4.5:1** after resolve, substitute that slot from **Midnight** (night) or **Default** (day) preset — not the whole palette. |
| **M7** | **Refresh triggers:** repaint all widgets on `ACTION_WALLPAPER_CHANGED` and on `UI_MODE_NIGHT` change (configuration). |
| **M8** | **Picker swatch:** native bridge returns **live** system palette for the Match system preview (replace fake split). |

---

## 4. Runtime palette mapping (API 31+)

Resolve in `WidgetThemePalette.resolveSystem(Context context)`.

### 4.1 Night detection

```java
boolean night = (context.getResources().getConfiguration().uiMode
    & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
```

Use `ContextThemeWrapper` with `R.style.Theme_AppCompat_DayNight` only as **fallback** if a `system_*` colour is missing (API 31+ device without token).

### 4.2 Token map (primary path)

Read with `ContextCompat.getColor(context, resId)` (API 31+). `resId` = `android.R.color.*`.

| Role | Light (`!night`) | Dark (`night`) |
|------|------------------|----------------|
| **bg** | `system_neutral1_10` | `system_neutral1_900` |
| **text** | `system_neutral1_900` | `system_neutral1_50` |
| **muted** | `system_neutral2_700` | `system_neutral2_200` |
| **accent** | `system_accent1_600` | `system_accent1_200` |
| **border** | 10% alpha of **text** | 10% alpha of **text** |

Simon may adjust tone step ±1 in QA if contrast fails; **roles and night branch are locked**.

### 4.3 Fallback chain (per slot)

For each role, if `getColor` throws or returns transparent:

1. Try alternate `system_neutral*` / `system_accent*` one step lighter/darker (Jim documents chosen alternates in code comments).  
2. Else preset fallback: **Default** (light) or **Midnight** (dark) for that slot only.  
3. Apply **M6** contrast guard last.

### 4.4 Remove broken path

Delete use of `themeColor(theme, android.R.attr.colorBackground, …)` and `R.attr.colorPrimary` for `ID_SYSTEM` — that path caused the production bug.

---

## 5. Wallpaper & night refresh (M7)

### 5.1 Receiver

Register a **manifest** `BroadcastReceiver` (e.g. `WidgetSystemThemeReceiver`):

| Intent | Action |
|--------|--------|
| Wallpaper | `android.intent.action.WALLPAPER_CHANGED` |
| Night mode | `android.intent.action.CONFIGURATION_CHANGED` — only react when `uiMode` night bit changed vs last cached value |

On match: `CommuteRefreshService.refreshAll(context)` (same as settings sync).

**Do not** register dynamically only inside `AppWidgetProvider.onEnabled` — manifest receiver survives process death.

### 5.2 Debounce

Ignore duplicate `CONFIGURATION_CHANGED` within **2s** (rotation noise). Wallpaper changes: refresh immediately.

### 5.3 OEM caveat

Some devices omit wallpaper broadcasts — acceptable. User opening app or resizing widget still repaints.

---

## 6. Native bridge — honest swatch (M8)

### `WidgetSyncPlugin.getSystemWidgetPalette()`

Returns resolved palette **as JS would paint today** (after M2 + M6):

```json
{
  "available": true,
  "api31": true,
  "night": false,
  "bg": "#F4F6F8",
  "text": "#1A1C1E",
  "muted": "#5C5F62",
  "accent": "#1A73E8",
  "border": "#1A1A1C1E"
}
```

- `available: false` on API &lt; 31 (web shows Default-style preview + hint).  
- Call on dialog open and after `visibilitychange` return to app (wallpaper may have changed).

### Web (`public/widget.js`)

- Replace hardcoded `widget-theme-preview-system` split with colours from plugin when `preset.id === "system"`.  
- While loading, show muted placeholder; on failure, Default preview + `console.warn`.

---

## 7. Code touchpoints

| File | Change |
|------|--------|
| `WidgetThemePalette.java` | Rewrite `resolveSystem()`; add `resolveSystemColor()`, contrast guard |
| `WidgetSystemThemeReceiver.java` | New — wallpaper + night refresh |
| `AndroidManifest.xml` | Register receiver |
| `WidgetSyncPlugin.java` | `getSystemWidgetPalette()` |
| `WidgetThemePaletteTest.java` | System mode on API 31 robolectric; contrast guard; API 30 → default |
| `public/widget.js` | Live system swatch via plugin |
| `docs/jim-brief-widget-colour-presets.md` | Note W8 implemented by **FB-38** |

**No change** to `widgetThemeId` storage shape.

---

## 8. QA

### Manual (`TESTING.md`)

1. API 31+ device, Monet wallpaper (e.g. blue) → **Match system** → widget accent/surface shift toward wallpaper (not AppCompat purple).  
2. Change wallpaper → widget updates within one refresh (no app open).  
3. Toggle system dark mode → widget updates.  
4. **Leave now** line still orange/red semantic colours.  
5. API 29 emulator/device → Match system = Default; no crash.  
6. Appearance dialog swatch matches home-screen widget (after sync).  
7. Match system + 50% opacity (**FB-36**) → readable on white and photo wallpaper (device gate).

### Automated

| Test | Assert |
|------|--------|
| `WidgetThemePaletteTest` | API 30 `system` === `default`; guard lowers failing slot |
| `qa/widget-theme-palettes.mjs` | Optional: mock `getSystemWidgetPalette` in fixture |

### Device gate

Pixel + Samsung, Android 12+, before ship.

---

## 9. Acceptance checklist

- [ ] API 31+ `system` uses `android.R.color.system_*`, not AppCompat theme attrs.  
- [ ] Wallpaper change triggers widget repaint.  
- [ ] Night mode toggle triggers widget repaint.  
- [ ] Semantic leave/urgent/late unchanged.  
- [ ] API &lt; 31 → Default palette.  
- [ ] Contrast guard prevents illegible accent/text (JVM test + device spot-check).  
- [ ] Match system swatch uses native live colours.  
- [ ] 100% opacity + system still passes FB-36 regression where applicable.

---

## 10. Sequencing

| Order | Item |
|-------|------|
| **Now** | **FB-38** — unblocks Match system (can ship before **FB-37** marketing) |
| **FB-37** | Configure flow can call `getSystemWidgetPalette()` for hero preview |

---

## 11. Non-goals

- `DynamicColors.applyToActivitiesIfAvailable` for the Capacitor activity (widget-only scope)  
- Per-widget `appWidgetId` themes  
- Matching third-party launcher icon packs without wallpaper change
