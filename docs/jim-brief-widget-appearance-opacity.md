# Jim brief: Widget background opacity + transparent card

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product) / Holly (marketing)  
**Status:** Implemented (2026-08-16)  
**Backlog:** **FB-36**  
**Builds on:** **FB-35** — `docs/jim-brief-widget-colour-presets.md` (presets shipped)  
**Related:** `WidgetUiBuilder.java`, `WidgetThemePalette.java`, `public/widget.js`, `#widget-appearance-dialog`  
**Out of scope:** Opacity on text/accent/border colours; frosted-glass blur; per-widget-instance settings; iOS; full app theme (**FB-01**); configure-on-drop (**FB-37**); free-form colour picker

**Estimate:** 3–4 dev days

---

## 1. Problem

FB-35 presets help, but a **solid card** still clashes with curated wallpapers. Home-screen curators want the widget to **blend in** (ghost / frosted look) while train data and leave urgency stay readable.

---

## 2. Goal (one sentence)

Let users control **widget container background opacity** (0–100%) and a one-tap **Transparent card** mode, with legibility aids on busy wallpapers — without changing semantic leave/urgent colours or preset accent tokens.

---

## 3. Locked decisions

| ID | Choice |
|----|--------|
| **O1** | Opacity applies **only** to the widget container **background** (`widget_root` fill). Text, accents, borders (when shown), icons, and semantic status colours stay **100% opaque**. |
| **O2** | Opacity range **0–100%** (integer), default **100**. Controlled via slider in existing appearance UI. |
| **O3** | **Transparent card** toggle sets opacity to **0%** and **suppresses** card border stroke. |
| **O4** | When opacity **&lt; 50%**, apply legibility treatment on text (see §7). |
| **O5** | **Single write path (A1):** Toggle ON → `widgetBgOpacity = 0` + `widgetTransparentBg = true`. Any slider value **1–100** → `widgetTransparentBg = false`. Native reads **opacity first**; toggle is a UX shortcut, not a second paint mode. |
| **O6** | **Regression:** `widgetBgOpacity = 100`, `widgetTransparentBg = false`, `widgetThemeId = default` must **match current FB-35 widget** pixel-for-pixel. |
| **O7** | Global setting (like `widgetThemeId`) — not per widget instance. |
| **O8** | **Not paywalled.** |

---

## 4. Settings data model

Add to root settings object (same blob as `widgetThemeId`):

| Key | Type | Default | Notes |
|-----|------|---------|-------|
| `widgetBgOpacity` | integer | `100` | Clamp 0–100 inclusive |
| `widgetTransparentBg` | boolean | `false` | UX flag; see O5 |

- Validate in `public/journey-model.js` (same pattern as `widgetThemeId`).
- Sync via existing `WidgetSync.syncSettings` → `WidgetSettingsStore`.
- Missing keys on load → defaults above (no migration UI).

```js
// Write examples
// Transparent toggle ON:
{ widgetBgOpacity: 0, widgetTransparentBg: true }
// Slider at 40%:
{ widgetBgOpacity: 40, widgetTransparentBg: false }
// Solid (default):
{ widgetBgOpacity: 100, widgetTransparentBg: false }
```

---

## 5. UI — appearance dialog

Extend existing `#widget-appearance-dialog` (do not create a second screen).

### Controls (below preset swatch grid)

1. **Background opacity** — range slider `0`–`100`, step `1`, label shows current value (e.g. `Background opacity · 40%`).  
2. **Transparent card** — toggle switch. ON: slider moves to 0 (disabled or read-only while ON — pick one; prefer slider **disabled at 0 when toggle ON** so user turns toggle OFF to fine-tune).

### Behaviour

- Changing preset **keeps** current opacity (do not reset slider).  
- Changing slider **live-updates** mini swatch previews (`rgba` on preview fill).  
- On change: persist + `syncWidgetSettings` (debounce **300ms** max on slider drag).  
- Native widget refresh uses existing post-sync path (`CommuteRefreshService.refreshAll`).

### Copy (locked)

| Element | Text |
|---------|------|
| Slider label | **Background opacity** |
| Toggle | **Transparent card** |
| Hint (one line under controls) | **Only the card background fades. Train times and leave alerts stay solid.** |

### Optional for FB-36 (required for FB-37)

Large hero preview above grid — **optional** in this brief; mini swatch live update is **required**.

---

## 6. Native paint path

### Read settings

Extend settings parse (alongside `WidgetThemePalette.readWidgetThemeId`) e.g. `WidgetAppearanceSettings.readBgOpacity(context)` / `readTransparentBg(context)`.

### Background (A3, A6)

Replace flat `views.setInt(R.id.widget_root, "setBackgroundColor", palette.bg)` with runtime **`GradientDrawable`**:

- Corner radius **16dp** (match [`widget_background.xml`](android/app/src/main/res/drawable/widget_background.xml)).
- Fill colour = `palette.bg` with alpha = `round((widgetBgOpacity / 100.0) * 255)`.
- When `widgetBgOpacity === 0` **or** `widgetTransparentBg === true`: fill alpha **0**; **no stroke**.
- When opacity **&gt; 0** and not transparent toggle: stroke = `palette.border` at full opacity (stroke width 1dp).

Apply drawable via `RemoteViews.setInt(R.id.widget_root, "setBackground", drawable)` or equivalent supported API.

**Alpha formula:**

```text
alpha = round((widgetBgOpacity / 100.0) * 255)
argb = (alpha << 24) | (rgb & 0x00FFFFFF)
```

### Semantic colours

`widget_leave`, `widget_urgent`, `widget_late` — **unchanged** (full opacity). Urgent/late paint paths in `WidgetUiBuilder` stay as today.

### All bind paths

Apply background + legibility in **every** exit from `WidgetUiBuilder.build`: live, idle, empty, nearby fallback, locked.

---

## 7. Legibility when opacity &lt; 50% (O4, A2)

### Primary approach

`RemoteViews` reflection `setShadowLayer` on text views:

```java
// Example — tune radius/offset/colour in QA
views.setFloat(R.id.widget_primary_value, "setShadowLayer", 2f, 0f, 1f);
views.setInt(R.id.widget_primary_value, "setTextColor", palette.accent); // colour unchanged
// Shadow colour via setInt ... "setShadowLayer" may need combined call — use supported reflection overload
```

### Targets (A4)

Apply shadow/scrim to:

- `widget_label`
- `widget_primary_value`, `widget_primary_unit`
- `widget_train_clock`
- `widget_leave_label`, `widget_leave_value`, `widget_leave_unit` *(label uses muted; value uses semantic leave colour when urgent — shadow only, colour unchanged)*
- `widget_route`
- `widget_updated`, `widget_updated_left`
- `widget_status` (medium layout)
- `widget_preferred_hint` (medium layout)

Do **not** reduce opacity on accent or semantic leave/urgent/late **colours**.

### Required fallback (ship gate)

If device QA on **Pixel + Samsung** shows unreadable text with shadow alone:

- Add **text-column scrim** — semi-opaque rounded rect behind `widget_left_column` (and right column if needed), **not** a second full-card background.
- Jim ships **whichever passes QA**; implementing both is not required.

### Explicit non-goal

**No frosted blur** — unreliable across launchers/API levels.

---

## 8. Code touchpoints

| Area | Files |
|------|--------|
| Settings parse | `WidgetThemePalette.java` or new `WidgetAppearanceSettings.java` |
| Paint | `WidgetUiBuilder.java` — `applyWidgetBackground`, new `applyLegibilityIfNeeded` |
| Drawable helper | `WidgetBackgroundDrawable.java` (optional small helper) |
| Web UI | `public/index.html`, `public/widget.js`, `public/styles/widget-appearance.css` |
| Validation | `public/journey-model.js` |
| Plugin | `WidgetSyncPlugin.getDebugState` — optional: expose `widgetBgOpacity` for field debug |

---

## 9. QA

### Manual (`TESTING.md` — new row)

1. Default preset, 100% opacity → matches pre-FB-36 widget (regression).  
2. Transparent toggle ON → home-screen widget has **no visible card**; text readable on white, black, and busy photo wallpapers.  
3. Slider at 30% → card faint; border visible; text readable.  
4. Toggle ON then OFF at 50% → `widgetTransparentBg` false; border returns.  
5. Change preset at 40% opacity → opacity preserved.  
6. Kill app → settings persist.

### Automated

| Test | Assert |
|------|--------|
| `WidgetUiBuilderRobolectricTest` | `widget_root` background action uses expected ARGB alpha for opacity 40 and 0 |
| `WidgetThemePaletteTest` or new `WidgetAppearanceSettingsTest` | Defaults; clamp 0–100; transparent + opacity 0 equivalent |
| `qa/widget-theme-palettes.mjs` | Extend: open appearance dialog, move slider, assert preview style or settings in localStorage |

### Device gate (before ship)

- [ ] White wallpaper — 0% and 30% opacity  
- [ ] Black / AMOLED wallpaper — 0% and 30%  
- [ ] Busy photo wallpaper — 0% and 30%  

---

## 10. Acceptance checklist

- [ ] Opacity slider 0–100% updates mini swatch previews live and native widget after sync.  
- [ ] Transparent card toggle → opacity 0, no border; identical to slider at 0.  
- [ ] 100% + Default preset = FB-35 regression pass.  
- [ ] Text, accent digits, semantic leave indicators remain fully opaque.  
- [ ] 16dp corner radius preserved at all opacity levels.  
- [ ] Settings persist across reboot.  
- [ ] Web: no new controls (native only) — appearance dialog still hidden on web.

---

## 11. Files (expected)

| File | Change |
|------|--------|
| `WidgetUiBuilder.java` | GradientDrawable bg; legibility |
| `WidgetAppearanceSettings.java` | New (optional) — read opacity/toggle from JSON |
| `public/index.html` | Slider + toggle in appearance dialog |
| `public/widget.js` | Read/write opacity; live preview; sync |
| `public/styles/widget-appearance.css` | Slider + toggle layout |
| `public/journey-model.js` | Validate new keys |
| `WidgetUiBuilderRobolectricTest.java` | Alpha assertions |
| `qa/widget-theme-palettes.mjs` | Opacity smoke |
| `TESTING.md` | Manual row |
| `docs/jim-brief-widget-colour-presets.md` | Cross-link FB-36 |

---

## 12. Sequencing

Ship **FB-36 before FB-37** (configure-on-drop). FB-37 reuses this dialog with optional hero preview + wallpaper switcher.
