# Brief for Simon — App theme (System / Light / Dark)

**From:** Tim (product)  
**Date:** 22 Aug 2026  
**Priority:** Post-launch polish — not a ship blocker  
**Backlog:** **FB-01**  
**Related:** `public/styles/base.css` (`:root` tokens, `.atmosphere`), `public/index.html` (`#menu-dialog`, `theme-color`), `docs/jim-brief-menu-layout.md`, `docs/jim-brief-widget-colour-presets.md` **W10**, `docs/simon-brief-app-icon.md` (mist + teal)  
**Status:** **Implemented** (22 Aug 2026) — Tim locked three modes; Dark tokens shipped with the build (below). Jim brief not required.

---

## Problem

The in-app WebView is **one light mist look**. Phone in dark mode still gets `#eef3f2` boards, a light `theme-color`, and `.atmosphere` gradients hardcoded to `#f5f8f7`. Widget skins (Blend / Wallpaper / Brand) already exist and must stay a **separate** product.

We are **not** building app colour presets, Material You in the WebView, or a hue wheel. Widget already owns “curate my home screen.” The app job is a calm commute board that isn’t blinding at 6am.

---

## Goal (one sentence)

Let the rider pick **System / Light / Dark** for the **full in-app chrome**, with Light = today’s mist and Dark = a proper Next Train dark (not a third “dark strip” look).

---

## Locked decisions (Tim)

| ID | Choice |
|----|--------|
| **T1** | **Three choices only:** System, Light, Dark. No extra palettes, no hue wheel, no “Dark strip” as a product theme (that was icon-preview only). |
| **T2** | **System** follows OS light/dark (`prefers-color-scheme` / Android `UI_MODE_NIGHT`). **Light** and **Dark** are sticky overrides. |
| **T3** | **Default = System** on new installs. |
| **T4** | **Full app:** hero, boards, tabs, dialogs, Menu, coaches, `about.html` / `privacy.html`, status/nav bar, PWA `theme-color`, Android splash. |
| **T5** | **Widget appearance stays independent.** Do not bind `widgetThemeId` / `widgetAppearanceMode` to app Light/Dark. (FB-35 **W10**.) |
| **T6** | **Not paywalled.** |
| **T7** | **Semantic job colours stay job colours:** `--leave`, `--urgent`, `--bad`, `--good`. You may retune hex ±1 step for contrast on dark surfaces. Do not invent new leave/urgent meaning. |
| **T8** | **Light = current mist** (table below). Dark = **dark mist / teal family**, not AMOLED-black unless you argue it with frames. |
| **T9** | Storage key **`appTheme`**: `system` \| `light` \| `dark`. **Not** widget keys. |
| **T10** | Switcher lives in **Menu** (web + native). People change theme **only** here, plus System tracking the OS. Label copy is yours (**Appearance** vs **Theme** vs **Colour scheme**). Control: segmented **or** three rows — pick one. Suggested placement: **info tier** (with Help), not beside Reminders. |

**Later palettes** can reuse the same `data-theme` switch. Do **not** design Ocean/Midnight/etc. for the app in this round.

---

## Light tokens (shipped — do not restyle Light)

From `public/styles/base.css` / app-icon brief:

| Token | Hex / value | Use |
|-------|-------------|-----|
| `--bg` | `#eef3f2` | Mist ground |
| `--bg-mid` | `#e2ece9` | Depth |
| `--ink` | `#132523` | Strong ink |
| `--text` | `#1a2f2c` | Body |
| `--muted` | `#5c726d` | Secondary |
| `--accent` | `#0b6e6a` | Teal |
| `--accent-strong` | `#085a57` | Pressed / strong |
| `--accent-wash` | `rgba(11, 110, 106, 0.12)` | Tints |
| `--surface` | `#ffffff` | Cards |
| `--line` | `rgba(19, 37, 35, 0.1)` | Hairlines |
| Fonts | Syne + Figtree | Unchanged |

Also map in Dark: `--journey-target*`, `--hero-pinned-border`, `--surface-soft`, `--line-strong`, `--shadow-soft`, `--leave*` / `--urgent*` / `--good` / `--bad` (T7).

**Contrast floor:** WCAG AA for `--text` on `--bg` and `--accent` on `--surface` (Light already; Dark must meet the same).

---

## Shipped Dark tokens (22 Aug 2026)

| Token | Dark |
|-------|------|
| `--bg` | `#1a2422` |
| `--bg-mid` | `#141c1b` |
| `--surface` | `#24302e` |
| `--surface-tint` | `#1e2a28` |
| `--text` / `--ink` | `#e4ebe9` / `#e8eeed` |
| `--muted` | `#9aada8` |
| `--accent` | `#5ec4bf` |
| `--leave` | `#f0b429` (amber step for contrast) |
| `--urgent` / `--bad` / `--good` | `#fb923c` / `#fb7185` / `#4ade80` |

**Native outliers:** Leave alarm stays its own dark activity (`#0F1F1D`). AdMob banner and shade/lock-screen glance stay as designed (not restyled with the WebView).

**Switcher:** Menu → **Appearance** — System / Light / Dark chips. Hint: app only; widget colours stay under Widget appearance.

---

## Out of scope

- Widget Glance / Blend / Wallpaper / Brand / colour row (FB-35–42)  
- Material You / wallpaper colours **inside the app**  
- Per-journey themes, hue wheel, extra app palettes  
- iOS WidgetKit / Dynamic Type  
- Font change  

---

## Files

- `public/styles/base.css` — Light + Dark tokens, atmosphere  
- `public/app-theme.js` — resolve / persist / Menu chips  
- `public/journey-model.js` — `appTheme` on settings  
- `public/index.html` — bootstrap + Appearance chips  
- `qa/app-theme.mjs` — regression  

---

## Slack-ready (Tim → Simon)

> Simon — **FB-01** locked: in-app **System / Light / Dark** only (default System). Light stays mist `#EEF3F2` + teal `#0B6E6A`. Dark = dark mist/teal, not a third look and not widget skins. Menu switcher (you pick copy + segmented vs rows). Widget appearance stays separate. Need a Dark token table 1:1 with `base.css`, atmosphere, splash/status bar, and calls on leave-alarm / ads / shade glance. Brief: `docs/simon-brief-app-theme.md`.

---

## Change log

| Date | Note |
|------|------|
| 2026-08-22 | Brief opened. Three modes locked; extra app palettes deferred. |
| 2026-08-22 | **Shipped** — Dark mist/teal tokens + Menu Appearance chips. |
