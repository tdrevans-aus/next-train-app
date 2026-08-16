# Jim brief: Widget style packs (layout faces)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product) / Holly (marketing)  
**Status:** Ready to code → **Deferred** — do not implement on RemoteViews; **Glance v2** after **FB-40** (`docs/jim-brief-widget-glance.md`)  
**Backlog:** **FB-39**  
**Builds on:** **FB-35** (colour presets), **FB-36** (opacity), **FB-37** (setup + hero preview), **FB-38** (Match system)  
**Related:** `WidgetUiBuilder.java`, `widget_small.xml`, `widget_medium.xml`, `public/widget.js`, `#widget-appearance-dialog`  
**Out of scope:** Jetpack Glance rewrite; iOS WidgetKit; per-widget-instance styles; animated/widget video faces; weather-style illustration art; paywall on styles; changing transit data logic

**Estimate:** 5–8 dev days

---

## 1. Problem

Colour presets and opacity help the widget **blend in**, but every user still gets the **same layout** — one utility card. Apps like Chronus, Overdrop, and Widgetsmith feel premium because users pick a **visual face** (minimal, bold, compact), not just a hex colour.

Next Train data hierarchy is strong; the **chrome** is not yet a designed product surface.

---

## 2. Goal (one sentence)

Add **three widget style packs** (layout + typography + chrome rules) that compose with existing **colour preset + opacity + Match system**, selectable in Widget appearance with live preview.

---

## 3. Locked decisions

| ID | Choice |
|----|--------|
| **S1** | **Three styles v1:** `classic`, `minimal`, `bold`. Default = `classic` (matches today’s ship). |
| **S2** | Style is **orthogonal** to colour: any style × any preset × opacity (including transparent). |
| **S3** | Storage key `widgetStyleId` on root settings JSON; sync via `WidgetSync.syncSettings`. |
| **S4** | **Semantic leave / urgent / late** colours unchanged across styles (`#B45309`, `#C2410C`, `#BE123C`). |
| **S5** | **Content hierarchy unchanged** — same fields per `docs/widget-homescreen.md` §4 (NEXT TRAIN, minutes, clock, leave, route, updated). Styles change **presentation**, not what data is shown. |
| **S6** | **Not paywalled** — all three styles free. |
| **S7** | Picker: **Widget appearance** dialog — new **Style** row **above** colour presets. |
| **S8** | Hero preview (**FB-37**) and mini swatches must reflect **style + colour + opacity**. |

---

## 4. Style definitions (Simon — locked for v1)

### 4.1 Classic (`classic`) — default

**Job:** Current shipped look. Regression baseline.

| Element | Rule |
|---------|------|
| Label | `NEXT TRAIN` — 11sp, bold, caps, muted colour |
| Minutes | Large value + small `min` unit; **accent** on digits |
| Card | 16dp radius; border when opacity &gt; 0; padding 10dp H / 3dp V |
| Leave line | Right column; semantic leave colour when urgent |
| 2×1 | Unchanged twin-column layout |

No user-visible change when `widgetStyleId` missing or `classic`.

---

### 4.2 Minimal (`minimal`)

**Job:** Ghost / curated home screen — type-led, less chrome. Pairs with transparent + presets.

| Element | Rule |
|---------|------|
| Label | **Hidden** on 2×1; **shown** on medium as small sentence case: `Next train` (not caps) |
| Minutes | **+2sp** vs classic; accent on digits; tighter letter-spacing |
| Card | **No border** (even at 100% opacity — minimal suppresses stroke); default opacity suggestion in UI hint only (do not force) |
| Padding | 8dp H; 2dp V on 2×1 |
| Route | Single line under clock on 2×1 when leave hidden; muted |
| Updated | Medium only; smaller type (9sp) |

---

### 4.3 Bold (`bold`)

**Job:** Standout legibility — inverted “poster” card for busy wallpapers.

| Element | Rule |
|---------|------|
| Card fill | **Accent colour at 100% opacity** as background (preset accent or system accent); **ignore** user bg opacity for fill only — opacity slider still affects optional outer scrim if needed, or disable opacity slider when bold (prefer **disable slider + hint**: “Bold uses a solid accent card”). |
| Minutes | **White or near-white** (`#FFFFFF` or preset `text` if contrast ≥ 4.5:1 on accent); value **+4sp** vs classic |
| Label | Hidden on 2×1; on medium: `NEXT TRAIN` in **white @ 80%** above digits |
| Muted / route / clock | White @ 70–85% opacity on accent bg |
| Leave line | **Semantic colours unchanged** (orange/red on accent bg — verify contrast; if fail, white text + coloured dot indicator — Simon sign-off in QA) |
| Border | None |

**Contrast guard:** JVM test — bold face must pass 4.5:1 for primary minutes on accent bg; fallback to classic paint if preset accent too light (e.g. Slate).

---

## 5. Settings data model

```json
{
  "widgetStyleId": "minimal",
  "widgetThemeId": "ocean",
  "widgetBgOpacity": 40
}
```

| Key | Values | Default |
|-----|--------|---------|
| `widgetStyleId` | `classic` \| `minimal` \| `bold` | omit / `classic` |

Validate in `journey-model.js`. Omit key when `classic`.

---

## 6. UI — Widget appearance

### 6.1 Style picker (new)

Above `#widget-theme-grid`:

- Section title: **Style**  
- Three **large tap targets** (not tiny swatches) — each shows a **silhouette** of that style (mock minutes + leave line) using **current** preset colours.  
- `role="radiogroup"` · `aria-label="Widget style"`  
- Tap applies immediately + `syncWidgetSettings`.

| ID | Label |
|----|-------|
| `classic` | **Classic** |
| `minimal` | **Minimal** |
| `bold` | **Bold** |

### 6.2 Bold + opacity interaction

When `widgetStyleId === "bold"`:

- Disable opacity slider + transparent toggle.  
- Hint: **Bold uses a solid accent card.**  
- Switching away from bold restores prior opacity values from settings (do not discard).

### 6.3 Hero preview (**FB-37**)

`#widget-appearance-hero-mock` must call shared `renderWidgetAppearancePreview({ styleId, themeId, opacity })`.

---

## 7. Native implementation

### 7.1 Architecture

Introduce `WidgetStyle.java` (enum + rules) alongside `WidgetThemePalette`:

```java
enum WidgetStyle { CLASSIC, MINIMAL, BOLD }
WidgetStyle readWidgetStyleId(Context context);
```

`WidgetUiBuilder.build(...)`:

1. Resolve `WidgetThemePalette` + `WidgetAppearanceSettings` (opacity).  
2. Resolve `WidgetStyle`.  
3. `applyStyleChrome(views, style, palette, appearance, size)` before/after existing bind methods.

Prefer **one layout XML per size** with style-driven visibility/margins/type sizes in Java — avoid six XML forks unless readability demands `widget_small_minimal.xml` etc.

### 7.2 Bold fill path

- Set `widget_bg_layer` / root drawable to **solid accent** (not user bg).  
- Text colours per §4.3.  
- Skip border drawable.

### 7.3 Minimal path

- `setViewVisibility(GONE)` on `widget_label` for small.  
- `setTextSize` / margin adjustments via `RemoteViews` reflection where needed.  
- Force border off in background helper.

### 7.4 Classic path

- Current code path unchanged (regression).

### 7.5 All widget states

Apply style chrome in: live, idle, empty, nearby fallback, locked, stale — same as theme/opacity today.

---

## 8. Web / plugin

| Piece | Change |
|-------|--------|
| `public/widget.js` | `WIDGET_STYLES`, style picker render, preview silhouettes, bold/opacity guard |
| `public/index.html` | Style radiogroup markup |
| `public/styles/widget-appearance.css` | Style tiles + hero mock variants |
| `WidgetSyncPlugin.getDebugState` | Optional: `widgetStyleId` |

---

## 9. QA

### Manual

1. Classic + Default + 100% → **pixel regression** vs pre-FB-39.  
2. Minimal + transparent + Ocean → ghost type on wallpaper.  
3. Bold + Midnight → white digits on dark accent; leave urgent still orange.  
4. Style × each preset smoke (3 × 7 = 21 quick checks — matrix in TESTING.md).  
5. Medium resize: label rules per style.  
6. Match system + minimal (FB-38).  

### Automated

| Test | Assert |
|------|--------|
| `WidgetStyleTest.java` | Bold contrast guard; unknown id → classic |
| `WidgetUiBuilderRobolectricTest` | Minimal hides label on small; bold sets accent bg |
| `qa/widget-appearance-setup.mjs` | Style selection persists; bold disables opacity |

### Device gate

Pixel + Samsung — Bold leave-line contrast on accent bg.

---

## 10. Acceptance checklist

- [ ] Three styles selectable; default classic unchanged.  
- [ ] Style + colour + opacity compose correctly (except bold opacity disable).  
- [ ] Native widget repaints on change without re-add.  
- [ ] Semantic leave/urgent/late colours preserved.  
- [ ] Hero preview reflects style (**FB-37**).  
- [ ] Configure-on-drop shows style picker (**FB-37**).  
- [ ] Web: appearance still native-only.

---

## 11. Sequencing

| Order | Item |
|-------|------|
| 1 | **FB-38** Match system fix (optional parallel) |
| 2 | **FB-39** Style packs — **this brief** |
| 3 | Holly screenshot pack: same data, 3 styles × 3 wallpapers |

**Future (not FB-39):** fourth style **Compact**; Jetpack Glance migration (**FB-40** backlog).

---

## 12. Files (expected)

| File | Change |
|------|--------|
| `WidgetStyle.java` | New |
| `WidgetUiBuilder.java` | `applyStyleChrome` |
| `WidgetStyleTest.java` | New |
| `public/widget.js` | Style picker + preview |
| `public/index.html` | Style section |
| `public/styles/widget-appearance.css` | Style tiles |
| `public/journey-model.js` | Validate `widgetStyleId` |
| `docs/widget-homescreen.md` | §5 visual — style packs |
| `TESTING.md` | Style matrix row |

---

## 13. Marketing note (Holly)

Deliverable after ship: 9-tile grid (3 styles × 3 wallpapers) for social / Play feature graphics — same countdown data, different faces.
