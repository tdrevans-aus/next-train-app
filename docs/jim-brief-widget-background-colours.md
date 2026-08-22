# Jim brief: Widget background colour row

**For:** Jim (implement) · Simon (swatch QA)  
**From:** Tim (product)  
**Status:** **Done** (22 Aug 2026) — further widget work in **FB-43**  
**Backlog:** **FB-42**  
**Builds on:** **FB-35** (preset tokens), **FB-36** (opacity), **FB-40** (blend / wallpaper / brand modes + Glance)  
**Related:** `WidgetThemePalette.java`, `WidgetGlanceTheme.kt`, `public/widget.js`, `public/styles/widget-appearance.css`, `docs/jim-brief-widget-colour-presets.md`  
**Out of scope:** Free-form hex picker; per-widget-instance colours; iOS; paywall; FB-39 style packs (**dropped**)

**Estimate:** 2–3 dev days (UI row + Glance paint + preview + QA)

---

## 1. Problem

**FB-40** shipped **Blend in / Match wallpaper / Brand teal** — the right *behaviour* model — but Tim’s product ask for **pickable background colours** was lost when the preset grid was removed.

Today:

- **Blend** at opacity &gt; 0 always paints **brand white** (`#FFFFFF`) — not Midnight, Ocean, etc.
- **Brand** is white/teal only (correct).
- **Wallpaper** uses Monet (correct).

Users who want a **dark card**, **tinted glass**, or **curated palette** on their wallpaper have no colour control.

---

## 2. Goal (one sentence)

**Restore curated background colours** as a **second row** under the three appearance modes — colours apply when **Blend** opacity &gt; 0; hidden for **Match wallpaper** and **Brand teal**.

---

## 3. Locked decisions (Tim — Aug 2026)

| ID | Choice |
|----|--------|
| **C1** | **Keep row 1 unchanged** — `widgetAppearanceMode`: `blend` \| `wallpaper` \| `brand`. |
| **C2** | **Add row 2** — **Background colour** swatch grid (curated presets from **FB-35**). |
| **C3** | Storage: reintroduce **`widgetThemeId`** for colour selection. Default `ocean` for new blend users (Simon may pick — or `default` / Light). |
| **C4** | **Blend + opacity 0%** (or transparent toggle): fully transparent — **colour row ignored** for paint (wallpaper shows through). |
| **C5** | **Blend + opacity &gt; 0%**: paint `WidgetThemePalette.resolve(themeId)` at opacity (bg, text, muted, accent, border from preset). |
| **C6** | **Brand mode**: colour row **hidden** — force `widgetThemeId: "default"` (white/teal). |
| **C7** | **Wallpaper mode**: colour row **hidden** — Monet drives surface; ignore `widgetThemeId` for paint. |
| **C8** | Preset list in row 2 (no `system`, no duplicate “Default” when brand exists): **Ocean, Midnight, Slate, Lavender, Rose, AMOLED** + optional **Light** (`default`) for blend-only white card. |
| **C9** | **Semantic leave / urgent / late** colours unchanged across presets (FB-35 W4). |
| **C10** | **Not paywalled.** |
| **C11** | Hero preview (**FB-37**) must reflect **mode + colour + opacity** live. |
| **C12** | Migrate users on `blend` with no `widgetThemeId`: default to **`ocean`** or last migrated value if we stored it before FB-40 (else `default`). |

---

## 4. UI layout

Insert between **mode grid** and **opacity block** in `#widget-appearance-setup`:

```text
[ Hero preview on wallpaper ]

Row 1 — How should it sit on your home screen?
  ( ) Blend in    ( ) Match wallpaper    ( ) Brand teal

Row 2 — Background colour          ← NEW; visible only when mode === blend
  [Ocean] [Midnight] [Slate] [Lavender] [Rose] [AMOLED] [Light]

Opacity slider + transparent toggle (blend only, unchanged)
```

### Visibility rules

| Mode | Colour row | Opacity | Transparent toggle |
|------|------------|---------|-------------------|
| `blend` | **Show** | Show | Show |
| `wallpaper` | **Hide** | Show (existing) | Hide |
| `brand` | **Hide** | Show (optional 100% only — current behaviour) | Hide |

**Hint under colour row (one line):** *Pick a card colour, then fade it with opacity — or go fully transparent to show your wallpaper.*

Reuse FB-35 swatch styling (mini card: bg fill + accent digit). Section label: **Background colour**.

---

## 5. Settings JSON

```js
{
  widgetAppearanceMode: "blend" | "wallpaper" | "brand",
  widgetThemeId: "ocean" | "midnight" | "slate" | "lavender" | "rose" | "amoled" | "default",
  widgetBgOpacity: 0–100,
  widgetTransparentBg: boolean   // blend only
}
```

**Write rules:**

- On save in **brand** mode: strip or ignore `widgetThemeId` writes; native reads `default`.
- On save in **wallpaper** mode: ignore `widgetThemeId` for paint.
- On save in **blend** mode: persist selected `widgetThemeId`.

**Do not** re-add `system` as a swatch — that job is **Match wallpaper** mode.

---

## 6. Native paint

### 6.1 `WidgetGlanceTheme.kt`

Today `resolveBlend()` always uses `brandPalette()`. Change to:

```kotlin
// blend + opacity > 0
val palette = WidgetThemePalette.resolve(context, WidgetThemePalette.readWidgetThemeId(context))
// apply palette.bg/text/muted/accent/border at appearance opacity

// blend + opacity == 0
// transparent surface (existing FB-36 legibility / text-shadow rules)
```

`resolveBrand()` — unchanged (`default` preset).  
`resolveWallpaper()` — unchanged (Monet).

### 6.2 `WidgetBackgroundPainter` / RemoteViews fallback

If RemoteViews path still exists during cutover, same rule: blend uses `readWidgetThemeId`, not hard-coded brand.

### 6.3 Migration

Users who had `ocean|midnight|…` before FB-40 were mapped to `blend` mode only — **theme id was dropped**. On first read after FB-42:

- If `widgetAppearanceMode === "blend"` and `widgetThemeId` missing → default **`ocean`** (or Tim-approved default).
- If mode `brand` → `default`.
- Legacy `forest` → `default` (existing `WidgetThemePalette` rule).

---

## 7. Web — `public/widget.js`

1. Restore preset metadata array (ids, labels, bg/accent hex for preview) — mirror `WidgetThemePalette` / old `WIDGET_THEME_PRESETS`.
2. `buildWidgetColourGrid()` — radio swatches; `aria-checked` on selection.
3. `refreshWidgetAppearanceControls()` — show/hide colour row per mode.
4. `updateHeroPreview()` — blend branch uses **selected preset**, not hard-coded brand.
5. `syncWidgetSettings` / save patch includes `widgetThemeId` when mode is `blend`.
6. Debounced sync on colour tap (same as opacity — `WIDGET_OPACITY_SYNC_DEBOUNCE_MS` pattern).

---

## 8. QA

| Check | How |
|-------|-----|
| Contrast AA | Existing `WidgetThemePaletteTest` / preset contrast assertions |
| Blend + Midnight + 40% | Widget shows dark glass on wallpaper |
| Blend + 0% | Transparent regardless of selected colour |
| Brand / Wallpaper | Colour row hidden; paint unchanged from FB-40 |
| Hero preview | Swatch + slider update mock before Done |
| Settings round-trip | `WidgetSync.syncSettings` → repaint all instances |
| `qa/widget-theme-palettes.mjs` | Extend or add colour-row selection smoke |

**Manual (Tim):** DEVICE-SMOKE widget checks **7–9** with Ocean + 30% blend on Play build.

---

## 9. Acceptance

- [x] Colour swatch row visible in **Blend** mode only  
- [x] Seven presets selectable; persists `widgetThemeId`  
- [x] Glance widget paints selected preset at opacity &gt; 0  
- [x] Opacity 0% = transparent (colour ignored)  
- [x] Brand + Wallpaper modes unchanged; colour row hidden  
- [x] Hero preview matches widget paint  
- [x] FB-35 JVM contrast tests still green (`qa/widget-theme-palettes.mjs`)  
- [ ] Holly can screenshot **Blend + Midnight/Ocean** on curated wallpapers (device smoke)  

---

## 10. Files (expected)

| File | Change |
|------|--------|
| `public/widget.js` | Colour grid, save/preview wiring |
| `public/index.html` | `#widget-appearance-colour-grid` container |
| `public/styles/widget-appearance.css` | Swatch grid styles |
| `android/.../WidgetGlanceTheme.kt` | Blend resolves `widgetThemeId` |
| `android/.../WidgetBackgroundPainter.java` | Parity if still used |
| `qa/widget-appearance-setup.mjs` or `widget-theme-palettes.mjs` | Automated colour selection |
| `docs/feature-backlog.md` | FB-42 row |

---

## 11. Note on FB-40

FB-40 **G2** (“three modes only, delete preset grid”) is **refined**, not reversed: modes stay three; **colours are a sub-control under Blend**, not nine top-level choices. Update `docs/jim-brief-widget-glance.md` §12 when shipped.

---

## One-liner for Tim → Jim

> FB-42: add **Background colour** swatch row under Blend mode (FB-35 presets back); opacity tints the chosen colour; hide row for Wallpaper/Brand. `WidgetGlanceTheme` blend path must read `widgetThemeId`. Brief: `docs/jim-brief-widget-background-colours.md`.
