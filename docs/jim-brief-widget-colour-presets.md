# Jim brief: Widget colour presets + System match

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product) / Holly (marketing)  
**Status:** Ready to code → **Implemented** (2026-08-16)  
**Backlog:** **FB-35**  
**Related:** `android/.../WidgetUiBuilder.java`, `WidgetSettingsStore.java`, `public/widget.js`, `docs/widget-homescreen.md` §4 visual language  
**Out of scope:** Full app theme (**FB-01**); custom hue wheel / hex picker; iOS widget; Pro / paywall gating; per-widget-instance themes (v1 = one global choice); changing leave / urgent / late semantic colours; background opacity (**FB-36**)

---

## 1. Problem

The Android home-screen widget is **fixed white** with teal accent (`colors.xml`). Users who curate their home screen around a colour palette (common among younger riders) reject a white card that clashes — even when the train data is correct.

Marketing need: **widget skins** that feel native to the user’s home screen, without building a full app theme engine.

---

## 2. Goal (one sentence)

Let users pick a **widget colour preset** (or **Match system** on Android 12+) from the app; the widget repaints immediately with readable contrast while **leave / urgent colours stay semantic**.

---

## 3. Locked decisions

| ID | Choice |
|----|--------|
| **W1** | **Widget-only** for v1 — app chrome stays current teal light theme. |
| **W2** | **Curated presets** (8) + **Match system** — no free-form colour picker. |
| **W3** | **Default** preset = today’s shipped look (teal on white). Existing users migrate to `default` with no visible change. |
| **W4** | **Semantic colours fixed** across all presets: `widget_leave`, `widget_urgent`, `widget_late` unchanged (`#B45309`, `#C2410C`, `#BE123C`). Only **bg**, **text**, **muted**, **accent**, and **card border** vary. |
| **W5** | **Train number / route accent** uses preset `accent`. Leave line uses semantic leave/urgent colours only (same rule as today). |
| **W6** | **Not paywalled** — all presets free (ads-only monetization unchanged). |
| **W7** | Picker lives in app: **Menu → Widget → Widget appearance** (native only; whole **Widget** block hidden on web like today). |
| **W8** | **Match system** (API 31+): Material You / wallpaper-derived dynamic colours — **implemented per FB-38** (`docs/jim-brief-widget-material-you-system.md`). On API &lt; 31, `system` = **Default**. *(Original FB-35 `resolveSystem` via AppCompat attrs superseded.)* |
| **W9** | Storage key `widgetThemeId` on root settings object, synced via existing `WidgetSync.syncSettings` → `WidgetSettingsStore`. |
| **W10** | Future **FB-01** may add “apply to app”; keep `widgetThemeId` separate from any future `appThemeId`. |

---

## 4. Presets (locked tokens)

Implement as a single native source of truth, e.g. `WidgetThemePalette.java` (ids + ARGB). Simon may tweak hex ±1 step for contrast during QA; **ids and count are locked**.

| `widgetThemeId` | Display name | `bg` | `text` | `muted` | `accent` | `border` (stroke on card) |
|-----------------|--------------|------|--------|---------|----------|---------------------------|
| `default` | **Default** | `#FFFFFF` | `#1A2F2C` | `#5C726D` | `#0B6E6A` | `#1A132523` |
| `ocean` | **Ocean** | `#E8F4FC` | `#0F2942` | `#4A6B85` | `#0369A1` | `#1A0F2942` |
| `midnight` | **Midnight** | `#1A2332` | `#E8EDF4` | `#8B9CB3` | `#60A5FA` | `#33E8EDF4` |
| `slate` | **Slate** | `#1C1C1E` | `#F2F2F7` | `#98989D` | `#A1A1AA` | `#33F2F2F7` |
| `lavender` | **Lavender** | `#F3EEFA` | `#2D2640` | `#6B6280` | `#7C3AED` | `#1A2D2640` |
| `rose` | **Rose** | `#FDF2F4` | `#3D1F28` | `#8B6570` | `#D41D6F` | `#1A3D1F28` |
| `forest` | **Forest** | `#EEF6F0` | `#1A2E1F` | `#5A7262` | `#15803D` | `#1A1A2E1F` |
| `amoled` | **AMOLED** | `#000000` | `#F5F5F5` | `#A3A3A3` | `#14B8A6` | `#26F5F5F5` |
| `system` | **Match system** | *(runtime)* | *(runtime)* | *(runtime)* | *(runtime)* | *(runtime)* |

**Contrast floor:** every preset (including `system` resolved colours) must meet **WCAG AA** for `text` on `bg` and `accent` on `bg` (train digits). Add JVM unit test that asserts contrast ratio ≥ 4.5:1 (or document exceptions Simon signs off).

**Labels copy:** short proper nouns as above — no emoji in picker.

---

## 5. System match behaviour (W8)

When `widgetThemeId === "system"`:

1. **API 31+ (Android 12):**  
   - Read `Configuration.UI_MODE_NIGHT` for light vs dark base.  
   - Prefer Material **dynamic** colours when available (`dynamic_light` / `dynamic_dark` theme attrs, or `MaterialColors.getColor` on `colorPrimary`, `colorSurface`, `colorOnSurface`, `colorOnSurfaceVariant`).  
   - Map: `bg` ← surface, `text` ← onSurface, `muted` ← onSurfaceVariant, `accent` ← primary.  
   - `border` ← ~10% alpha of `text` on `bg`.

2. **API 26–30:** Fall back to `default` light palette (document in code comment).

3. **Re-paint:** widget refresh on theme change — register for `ACTION_CONFIGURATION_CHANGED` or re-resolve on each `WidgetUiBuilder` paint (lighter v1: resolve at paint time only).

Do **not** block ship on perfect Material You parity on every OEM; goal is “good enough on Pixel/Samsung” with safe fallback.

---

## 6. UI — Widget appearance dialog

### Entry

- **Menu → Widget appearance** (`#menu-widget-appearance-btn`) — inside **Menu → Widget** block; visible only when `Capacitor.isNativePlatform()` (same gate as `#menu-widget-block`).  
- Place **Widget** block with **Add home screen widget** and **Widget appearance** sub-rows (not two top-level menu links).

### Dialog (`#widget-appearance-dialog`)

- Title: **Widget appearance**  
- Hint (one line): **Choose how your home screen widget looks. The app stays the same.**  
- Body: **grid of preset swatches** — each cell shows a **mini widget mock** (rounded rect + accent digit “3” + muted “min”), not a flat colour dot.  
- **Match system** swatch uses a split light/dark preview or system icon + label.  
- Selected preset: `aria-checked="true"`, visible ring (`outline: 2px solid var(--accent)`).  
- Single tap selects + **applies immediately** (no separate Save).  
- Footer: **Done** (secondary) closes dialog.

### Swatch accessibility

- Each option is a `<button type="button" role="radio">` in a `radiogroup` labelled “Widget colour”.  
- `aria-label` = display name (e.g. “Ocean”).

### Persistence

```js
settings.widgetThemeId = "ocean"; // default omitted or "default"
localStorage.setItem("nextTrainSettings", …);
await syncWidgetSettings(settings);
```

On load, default missing key to `"default"`.

---

## 7. Native paint path

### Settings read

- `WidgetDataService` / `WidgetUiBuilder` reads `widgetThemeId` from settings JSON in `WidgetSettingsStore` (same blob as journeys).  
- Resolve palette → `WidgetThemePalette.resolve(context, widgetThemeId)`.

### Apply colours

Today `WidgetUiBuilder` calls `context.getColor(R.color.widget_*)` in many branches. Refactor to:

1. Accept a `WidgetThemePalette` (or colour bundle) per paint.  
2. `views.setTextColor(…)` for text/muted/accent.  
3. Background: set root layout background colour (or tinted `widget_background` drawable) from `bg` + `border`.  
4. **Leave / urgent / late** still from fixed semantic resources.

Trigger `NextTrainWidgetProvider.updateAll` after settings sync (already happens via `CommuteRefreshService.refreshAll`).

### Layout XML

Static `@color/widget_*` in `widget_small.xml` / `widget_medium.xml` may remain as fallbacks; runtime colours from `WidgetUiBuilder` win.

---

## 8. Code touchpoints

| Area | Files |
|------|--------|
| Palette + contrast | `WidgetThemePalette.java` (new), tests in `WidgetThemePaletteTest.java` |
| Paint | `WidgetUiBuilder.java` |
| Settings | Parse `widgetThemeId` wherever settings JSON is read for widget |
| Plugin | `WidgetSyncPlugin.syncSettings` — no API change if key lives in existing JSON |
| Web UI | `public/index.html` (dialog + menu item), `public/widget.js` (read/write + sync), `public/styles/dialogs.css` or new `widget-appearance.css` |
| Strings | `android/.../strings.xml` if needed for widget provider description (unchanged) |

---

## 9. QA

### Manual (`TESTING.md` — new row)

1. Native Android, widget installed.  
2. Menu → Widget appearance → pick **Midnight** → widget bg dark within one refresh.  
3. Pick **Ocean** → light blue card, blue accent on train number.  
4. **Leave now** / urgent line still orange (not recoloured to accent).  
5. Kill app, relaunch → choice persists.  
6. API 31+ device: **Match system** toggles when system dark mode changes (spot-check).  
7. Web: menu item hidden; no regression.

### Automated

| Script | Assert |
|--------|--------|
| `qa/widget-theme-palettes.mjs` (new) | Native mock or unit export: each preset id resolves; contrast helper passes |
| `WidgetThemePaletteTest.java` | All preset ids valid; contrast ≥ 4.5:1; unknown id → `default` |
| Extend `WidgetUiBuilderTest` or Robolectric snapshot | One dark + one light preset paint without crash |

Optional: add preset id to `WidgetSyncPlugin.getDebugState` for field debugging.

---

## 10. Docs / marketing handoff

| File | Update |
|------|--------|
| `docs/widget-homescreen.md` | §4 visual language: presets + system; semantic leave colours |
| `docs/feature-backlog.md` | FB-35 → briefed |
| `TESTING.md` | Widget appearance row |

**Holly (out of scope for Jim):** screenshot pack — each preset on a curated coloured wallpaper for social / Play feature graphics.

---

## 11. Non-goals (v2+)

- App-wide light/dark (**FB-01**)  
- Widget configure activity on add (Android `APPWIDGET_CONFIGURE`) — Menu path is enough for v1  
- Per-widget-instance themes when multi-instance ships  
- iOS WidgetKit tinting  

---

## 12. Acceptance checklist

1. Eight presets + Match system listed in dialog; **Default** matches pre-ship widget.  
2. Selection persists in `nextTrainSettings.widgetThemeId` and native widget store.  
3. Widget repaints without re-adding widget.  
4. Semantic leave/urgent/late colours unchanged on all presets.  
5. Contrast JVM test green.  
6. Web unchanged (no picker).  
7. No Pro gate on any preset.

---

## 13. Files (expected)

| File | Change |
|------|--------|
| `WidgetThemePalette.java` | New — ids, colours, system resolver |
| `WidgetUiBuilder.java` | Theme-aware colours |
| `WidgetThemePaletteTest.java` | Contrast + fallback |
| `public/index.html` | Menu item + dialog |
| `public/widget.js` | Theme picker logic + sync |
| `public/styles/*.css` | Swatch grid |
| `qa/widget-theme-palettes.mjs` | Smoke |
| `TESTING.md` | Manual row |
| `docs/widget-homescreen.md` | Visual language note |
