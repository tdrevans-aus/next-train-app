# Jim brief: Widget — Jetpack Glance migration (blend-first)

**For:** Jim (implement)  
**From:** Tim (product) / Simon (design)  
**Status:** Implemented  
**Backlog:** **FB-40**  
**Supersedes:** **FB-35** preset grid UX (native paint stays until cutover); **FB-39** dropped (Aug 2026)  
**Builds on:** **FB-36** (opacity / transparent), **FB-37** (configure + wallpaper preview), **FB-38** (Monet — folded into **Match wallpaper** mode)  
**Related:** `WidgetUiBuilder.java` (replace), `WidgetSyncPlugin.java`, `public/widget.js`, `CommuteRefreshService`  
**Out of scope:** iOS WidgetKit; per-widget-instance themes; Classic/Minimal/Bold layout variants in v1; re-adding 8 named colour presets; ads in widget

**Estimate:** 8–12 dev days (Glance v1 + simplified appearance + cutover QA)

---

## 1. Problem

The shipped **8-preset colour grid** (Default, Ocean, Midnight, Slate, Lavender, Rose, AMOLED, Match system) does not deliver the product ask:

> Widget background colours that **blend into the home screen**.

Users see **three greys, several off-whites**, and accent tint on digits only — not wallpaper harmony. Holly’s curation story is **blend + system**, not picking “Slate vs Lavender.”

`RemoteViews` + `WidgetUiBuilder` also blocks fast iteration on real Material surfaces.

---

## 2. Goal (one sentence)

**Replace** the `RemoteViews` widget with **Jetpack Glance**, and **replace** the 8-preset picker with a **blend-first** appearance model: **Transparent (default)**, **Match wallpaper**, optional **Brand teal** solid.

---

## 3. Locked decisions (Tim — Aug 2026)

| ID | Choice |
|----|--------|
| **G1** | **Jetpack Glance** is the only widget renderer after cutover — remove `RemoteViews` path from production. |
| **G2** | **Blend-first appearance** — three modes only (see §4). **Delete** Midnight / Slate / Lavender / Rose / Ocean / AMOLED / Default grid. |
| **G3** | **Default mode** = **Blend** (`widgetAppearanceMode: "blend"`) — transparent card + legible text (FB-36 opacity rules, default **0%** or user-tuned). |
| **G4** | **Match wallpaper** = Material You dynamic colours (API 31+); API &lt; 31 → Brand teal solid. |
| **G5** | **Brand teal** = current FB-35 Default look (white card, `#0B6E6A` accent) for users who want the app brand on the home screen. |
| **G6** | Storage: replace `widgetThemeId` with **`widgetAppearanceMode`**: `"blend"` \| `"wallpaper"` \| `"brand"`. Migrate stored `widgetThemeId` on read (see §5). |
| **G7** | **FB-39** Classic/Minimal/Bold — **dropped** (Aug 2026). Single Classic layout only. |
| **G8** | Semantic **leave / urgent / late** colours fixed across all modes. |
| **G9** | **Capacitor sync unchanged** — `WidgetSync.syncSettings` JSON blob; Glance reads same `WidgetSettingsStore`. |
| **G10** | **Not paywalled.** |

---

## 4. Appearance modes (UI)

Replace preset grid in `#widget-appearance-dialog` with **three large options** (radio cards + hero preview on wallpaper from **FB-37**):

| `widgetAppearanceMode` | Label | User-facing description |
|------------------------|-------|-------------------------|
| `blend` | **Blend in** | Transparent card; your wallpaper shows through. Adjust opacity below. **(Default)** |
| `wallpaper` | **Match wallpaper** | Colours from your wallpaper on Android 12+. |
| `brand` | **Brand teal** | White card, Next Train teal — the classic look. |

### Controls per mode

| Mode | Opacity slider | Transparent toggle |
|------|----------------|-------------------|
| **blend** | **Yes** (0–100%, default **0** or **15** — Simon pick in QA) | Yes (shortcut to 0%) |
| **wallpaper** | **No** — surface from Monet | No |
| **brand** | Optional 100% only (hide slider) | No |

**Hint (one line):** *Only the card background fades. Train times and leave alerts stay solid.*

Remove `WIDGET_THEME_PRESETS` grid from web UI entirely.

---

## 5. Settings migration

```js
// New canonical key
widgetAppearanceMode: "blend" | "wallpaper" | "brand"

// Legacy migration (widget.js + native read)
widgetThemeId "system"     → "wallpaper"
widgetThemeId "default"    → "brand"
widgetThemeId ocean|midnight|slate|lavender|rose|amoled → "blend"  // one-time; user can re-pick
```

Keep `widgetBgOpacity` + `widgetTransparentBg` for **blend** mode only (FB-36 rules).

Deprecate `widgetThemeId` in new writes; strip on save after migration.

---

## 6. Native — Glance architecture

### 6.1 Dependencies

`android/app/build.gradle`:

```gradle
implementation "androidx.glance:glance-appwidget:1.1.0"  // use latest stable at implement time
implementation "androidx.glance:glance-material3:1.1.0"
```

### 6.2 New components

| Component | Role |
|-----------|------|
| `NextTrainGlanceWidget.kt` | `GlanceAppWidget` — composes UI from snapshot + appearance mode |
| `NextTrainGlanceReceiver.kt` | `GlanceAppWidgetReceiver` — replaces `NextTrainWidgetProvider` for updates |
| `WidgetAppearance.kt` | Read `widgetAppearanceMode`, opacity, migration |
| `WidgetGlanceTheme.kt` | `GlanceTheme` + dynamic colour (wallpaper mode) |

### 6.3 Data flow (unchanged contract)

```text
JS syncSettings → WidgetSettingsStore → CommuteRefreshService snapshot
                                    → NextTrainGlanceWidget.updateAll()
```

Glance **Content** reads the same `snapshot` JSONObject as today.

### 6.4 Mode paint rules

**blend**

- `GlanceModifier.background(Color.Transparent)` or `Color` with alpha from `widgetBgOpacity`
- No border when transparent / low opacity
- Text shadow or scrim when opacity &lt; 50% (port FB-36 legibility rules to Glance)

**wallpaper** (API 31+)

- `GlanceTheme(colors = dynamicLightColorScheme(context) / dynamicDarkColorScheme(context))`
- Map: `surface` → card, `onSurface` → text, `primary` → accent digits
- `ACTION_WALLPAPER_CHANGED` + night mode → `updateAll` (port FB-38 receiver)

**brand**

- White / light surface, teal accent — match current Default preset tokens

### 6.5 Layout

Port **one** hierarchy from `docs/widget-homescreen.md` §4:

- Label · minutes + unit · clock · leave · route · updated (medium)

Use Glance `Row` / `Column` / `Text` — no separate Minimal/Bold trees in v1.

### 6.6 Manifest cutover

- Replace `NextTrainWidgetProvider` with `NextTrainGlanceReceiver` in manifest + `next_train_widget_info.xml` (Glance XML provider metadata).
- Remove or archive `widget_small.xml` / `widget_medium.xml` + `WidgetUiBuilder.java` after parity QA.
- Keep `WidgetConfigureActivity` (**FB-37**) — point at Glance receiver.

---

## 7. Web UI (`public/widget.js`)

- Remove `WIDGET_THEME_PRESETS` and theme grid renderer.
- Add `WIDGET_APPEARANCE_MODES` (3 cards) + hero preview.
- `getSystemWidgetPalette()` (**FB-38**) used only for **wallpaper** mode preview swatch.
- Configure/setup flow (**FB-37**) uses same 3-mode picker.

---

## 8. QA & parity

### Must pass before deleting RemoteViews

| Check | |
|-------|---|
| 2×1 + medium resize | Same content rules as `WidgetUiBuilder` |
| Journey / Near me idle / empty / stale / locked | All faces |
| Tap deep links | Unchanged |
| blend @ 0% on white + photo wallpaper | Legible |
| wallpaper on API 31+ Pixel | Monet shifts with wallpaper change |
| API 29 | wallpaper → brand fallback |
| Migration | Old `widgetThemeId` maps sensibly |

### Tests

- Glance unit/snapshot tests where feasible (`GlanceAppWidgetManager` test APIs)
- Keep / port critical assertions from `WidgetUiBuilderRobolectricTest`
- `qa/widget-appearance-setup.mjs` — 3 modes, blend opacity

### Device gate

Pixel + Samsung, Android 12+ and one API 29 device.

---

## 9. Sequencing

| Phase | Deliverable |
|-------|-------------|
| **FB-40 v1** | Glance widget + 3-mode appearance + migration + cutover |
| **FB-38** | Absorbed into `wallpaper` mode (do not ship separately if FB-40 ships first) |
| **FB-39** | **Dropped** (Aug 2026) — Classic layout only; no Minimal/Bold variants |

**Do not implement FB-39.**

---

## 10. Acceptance checklist

- [ ] Widget renders via Glance only in release build.  
- [ ] Appearance shows **Blend in / Match wallpaper / Brand teal** — no 8-preset grid.  
- [ ] Default for new users = **blend** (transparent-friendly).  
- [ ] Wallpaper mode uses Monet on API 31+.  
- [ ] Leave/urgent semantic colours unchanged.  
- [ ] FB-37 configure-on-drop works with new picker.  
- [ ] Legacy `widgetThemeId` migrated without crash.

---

## 11. Files (expected)

| File | Action |
|------|--------|
| `NextTrainGlanceWidget.kt` | New |
| `NextTrainGlanceReceiver.kt` | New |
| `WidgetAppearance.kt`, `WidgetGlanceTheme.kt` | New |
| `WidgetUiBuilder.java`, `widget_*.xml` | Delete after parity |
| `NextTrainWidgetProvider.java` | Replace |
| `public/widget.js`, `index.html`, `widget-appearance.css` | 3-mode UI |
| `WidgetThemePalette.java` | Slim to brand tokens + migration; Monet in Glance theme |
| `docs/jim-brief-widget-colour-presets.md` | Mark superseded by FB-40 |
| `docs/jim-brief-widget-style-packs.md` | Deferred → Glance v2 |
| `TESTING.md` | Glance + 3-mode matrix |

---

## 12. Why this fixes Tim’s screenshot problem

| Old | New |
|-----|-----|
| Pick Slate vs Lavender (same grey card) | **Blend in** — wallpaper is the background |
| Match system broken / fake swatch | **Match wallpaper** — Monet on Glance |
| 8 choices, same layout | **3 intentional jobs** + opacity for blend |

Marketing (Holly): lead with **Blend in** screenshots on curated blue wallpapers — not a preset grid.

---

## 13. Follow-up — FB-42 (background colour row)

**Aug 2026 (Tim):** Three modes stay; users also want **pickable card colours**. **FB-42** adds a **Background colour** swatch row under **Blend** only (FB-35 presets + opacity). Does not reopen the old nine-option top-level grid. See `docs/jim-brief-widget-background-colours.md`.
