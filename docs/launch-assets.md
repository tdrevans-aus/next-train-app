# Launch assets — what we need & how to get them

**Owner (marketing / art direction):** Ruth (this chat) + Tim  
**Maker (most visuals):** Simon  
**Status:** Checklist for store submit + soft launch (Perth sprint)  
**Related:** `docs/store-listing.md`, `docs/demo-storyboard.md`, `docs/qr-guerrilla-kit.md`, `docs/pre-launch-do-now.md`

---

## Principle

Sell **leave-by** (“when to walk out”), not “another departures board.”  
Visual language = calm teal / mist from the app — **not** Transperth livery, **not** purple AI-slop gradients, **no** PTA logos.

**Best workflow:** Tim locks copy + films real UI → Simon wraps frames, captions, feature graphic, QR → Tim uploads to consoles.

---

## Must-have before store submit


| Asset | Spec (practical) | Best way to get it | Owner | Status (11 Aug) |
| ----- | ---------------- | ------------------ | ----- | ---------------- |
| **App icon** | Play **512×512** PNG ≤1 MB (+ adaptive / Apple later) | From `public/icon.svg` | Simon | **Ready** — E3 Band locked · `store-assets/exports/play-icon-512.png` |
| **Screenshots (phone)** | Portrait; ≥1080 wide; **4–8** frames | Tim capture **8–15 Sep** on prod-like build; Simon captions | Tim → Simon | **Kit ready** — `store-assets/captions.md`; pixels wait for Tim |
| **Feature graphic (Play)** | **1024 × 500** PNG | `store-assets/feature-graphic-v{1,2,3}.html` → `node store-assets/export-feature-graphics.mjs` | Simon | **3 options with Tim** — `play-feature-graphic-v1-rails` / `-v2-night` / `-v3-bignumber`. Winner exports to `play-feature-graphic-1024x500.png` |
| **Store copy** | Title, subtitle, short/full description, keywords | `docs/store-listing.md` | Ruth | **Yes** |
| **Privacy / About URLs** | Live HTTPS | Production domain | Tim | Confirm |
| **iOS screenshots** | Same story when iOS exists | Same pipeline | Tim + Simon | Wait |

**Screenshot order (hero first):**  
1 Leave-by hero → 2 Delay honesty → 3 Near me → 4 Journeys saved → 5 Setup → 6 Unofficial trust → 7 (opt) Remove ads → 8 Widget (Android).

---

## Strongly want for launch week (not always required by stores)


| Asset | Why | Best way | Owner |
| ----- | --- | -------- | ----- |
| **15–30s demo video** | Store preview / social / press | Follow `docs/demo-storyboard.md`. Tim films screen (or screen + kitchen desk). Simon trims, captions, export MP4. | Tim film → Simon edit |
| **QR card / small poster** | Guerrilla near stations | `docs/qr-guerrilla-kit.md` — print PDF; unique `?src=` URLs. | Simon design → Tim print + venues |
| **Social stills** (3–5 crops) | Reddit / FB groups launch posts | Recrop screenshot set + one leave-by close-up. | Simon |
| **Widget still** | Android differentiator | Real home-screen photo or emulator + wallpaper (honest). | Tim + Simon |
| **Press kit mini** | When pitch goes out | Zip: icon, 3 screenshots, 1 para from `docs/press-pitch-draft.md`, contact. | Simon pack → Tim send |

---

## Nice-to-have (after live / if spare)


| Asset | Notes |
| ----- | ----- |
| Tablet screenshots | Defer |
| Animated feature graphic / Play promo video polish | Only if demo is strong |
| Brand style one-pager | Colours, type (Syne/Figtree), do/don’t — helps Simon stay consistent |
| City skins later | Not for Perth launch |

---

## What you already have (don’t reinvent)


| Item | Where |
| ---- | ----- |
| Listing copy + screenshot plan + feature graphic brief | `docs/store-listing.md` |
| Play creative brief | `docs/simon-brief-play-creative.md` |
| **Play exports (icon + feature graphic draft)** | `store-assets/exports/` |
| Screenshot shot list | `store-assets/captions.md` |
| Demo storyboard | `docs/demo-storyboard.md` |
| QR kit brief | `docs/qr-guerrilla-kit.md` |
| Pre-launch tracker | `docs/pre-launch-do-now.md` |
| Source icon | `public/icon.svg` |
| App visual system | `public/styles.css` (teal accent, light chrome) |

---

## Recommended production path (lean)

1. **Freeze UI** for a “listing build” (no half-finished chrome).  
2. **Tim** captures raw screenshots + optional screen recording on device.  
3. **Simon** (batch 1): feature graphic + captioned screenshot set + icon polish.  
4. **Simon** (batch 2, parallel): QR card + social crops.  
5. **Tim** uploads to Play / App Store Connect; paste store URLs into QR.  
6. **Ruth/Tim** review: every frame answers “when do I leave?” or earns trust — drop anything that looks like a generic timetable app.

**Tools (practical):** Figma or whatever Simon uses for composition; real device screenshots beat mockups; export PNG (screenshots/feature graphic), PDF (print QR), MP4 (demo). No need for a photo shoot — app UI *is* the product shot.

**Avoid:** Stock train photos as the hero; fake Transperth branding; busy multi-phone collages; keyword spam on the feature graphic.

---

## Simon brief one-liner (copy/paste)

> Please deliver: (1) Play feature graphic 1024×500, (2) captioned phone screenshots per `docs/store-listing.md` §4 from Tim’s captures, (3) app icon polish from `public/icon.svg` if needed, (4) QR card per `docs/qr-guerrilla-kit.md`. Style = live app teal/mist. Sell leave-by. No PTA marks. Show work in a strip/sheet so we judge store shelf, not isolated art.

---

## Change log

| Date | Note |
|------|------|
| 2026-08-11 | Ruth checklist — must-have / launch-week / how to produce |
| 2026-08-11 | Simon: Play icon 512 + feature graphic draft + screenshot kit under `store-assets/` |
