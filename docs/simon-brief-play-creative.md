# Simon brief — Play creative (screenshots + feature graphic)

**For:** Simon (Design)  
**From:** Ruth (Marketing) · Program: store launch  
**Date:** 11 Aug 2026  
**Book window:** **8–15 Sep 2026** — capture + polish against a **production-like** build (Tim supplies APK / clean device)  
**Ruth Play marketing sign-off:** ~**15–17 Sep** (before public ~18 Sep)  
**ASO / copy:** `docs/store-listing.md` (shippable) · demo: `docs/demo-storyboard.md` · assets checklist: `docs/launch-assets.md`

---

## Goal

Ship **Play Store creative** that sells **leave-by** (“know when to walk out”) — not another departures board. Must look like the real app. Ruth signs off before public; Tim uploads to Console.

You can **layout captions + feature graphic** now from current UI. **Final screenshot pixels** wait for Tim’s clean build in the book window (no test AdMob banners, no debug overlays).

---

## Deliverables

| # | Asset | Spec | Due (target) |
| --- | --- | --- | --- |
| 1 | **Phone screenshots** (6–8) | Portrait; frames below | Draft captions now; final set **by 15 Sep** |
| 2 | **Feature graphic** | **1024 × 500** PNG | Concept this week OK; final export **by 15 Sep** |
| 3 | **Caption overlays** | Large, few words | Match table below |
| 4 | **QR card** | `docs/qr-guerrilla-kit.md` | Lock layout; short URL placeholder until store link |
| 5 | **Demo stills** (optional) | `docs/demo-storyboard.md` | If Tim films in window |

**Don’t show:** test AdMob banners, debug overlays, Transperth / PTA logo or livery colours as branding, purple AI-slop gradients, settings spaghetti, fake delay numbers that look like marketing lies.

**Do show:** teal/mist Next Train UI; calm type; **Unofficial** where trust frame needs it; remove-ads as **A$3.99 one-time** if you include frame 7.

---

## Screenshot frames (priority order)

| # | Frame | On-screen UI | Caption overlay |
| - | ----- | ------------ | --------------- |
| 1 | **Hero** (required) | Journey: big **Leave in 12 min** / Leave by ~7:42 | When to leave — not just when it departs |
| 2 | Delay honesty | Same journey, delayed / live status visible | Live times, delays included |
| 3 | Near me | Nearby board: nearest station + soonest trains | Near you in seconds |
| 4 | Journeys | List or switcher with **2 named** journeys | Save the commute you repeat |
| 5 | Setup | Add journey — station + direction (clean) | Set up once |
| 6 | Trust | Unofficial line / About-style honesty | Unofficial · check station boards |
| 7 | Optional | Menu: Remove ads **A$3.99** one-time | Ads optional — pay once |
| 8 | Optional (Android) | Home-screen **widget** leave-in / leave-by | Leave-by on your home screen |

**Minimum ship set if time-crunched:** frames **1, 2, 3, 4, 6** (+ **8** if widget is a launch differentiator and looks good).

---

## Feature graphic (Play — 1024 × 500)

- **Left / centre:** wordmark **Next Train** (no icon lockup)  
- **Line:** **Know when to walk out.** (single line, no wrap)  
- **Right:** phone fragment mirroring the **real** Journey view (see accuracy rules below)  
- **Background:** track band echoing the app icon, low opacity  
- **Dropped 11 Aug (Tim):** the `Perth · Unofficial` badge line  
- **Locked:** V1 Rails → `store-assets/exports/play-feature-graphic-1024x500.png` (source `feature-graphic.html`)  
- **Export:** `node store-assets/export-feature-graphics.mjs`; ~48px safe margin for key type  
- **No** PTA marks

### Phone-mock accuracy rules (must match the app)

The mock may simplify, but must not imply behaviour the app doesn't have.

| Element | Real app | Use |
| --- | --- | --- |
| Route line | `formatJourneyRoute()` → `Station, towards Direction` | `Joondalup, towards Perth` — **not** `Joondalup → Perth` (centered) |
| Hero | label `Next Train`, big minutes, sub = departure clock time | `NEXT TRAIN` · `24 mins` · `7:54` |
| Leave card | label `Leave in`, big minutes, sub = leave-by clock time | `LEAVE IN` · `12 mins` · `7:42` |
| Detail strip | Platform · Status | `2` · `On time` |

Station choice: use **Joondalup** (recognisable) over Edgewater.

---

## Coordination

| Who | Does |
| --- | --- |
| **Ruth** | Signs off creative; first review of drafts |
| **Tim** | Prod-like APK / device capture window **8–15 Sep**; Console upload |
| **Simon** | Frames, overlays, feature graphic, QR layout |

Hold **press send** and **wide QR café drop** until Tim + go/no-go say fire.

**Ping Ruth** when draft feature graphic + 1–2 hero frames are ready (even pre-final build) so mid-Sep isn’t a scramble.

---

## Done when

- [x] Feature graphic exported 1024×500 — **draft** in `store-assets/exports/` (Ruth review)
- [ ] Screenshot set labeled 1–N for Play Console — **shot list ready**; final pixels **8–15 Sep**
- [ ] Ruth confirms shippable (or lists fixes)
- [ ] QR card print-ready (1–2 test prints OK; no wide drop)
- [x] App icon 512×512 — `store-assets/exports/play-icon-512.png`

---

## Change log

| Date | Note |
|------|------|
| 2026-08-11 | First Play creative brief (PM) |
| 2026-08-11 | Ruth pass: book window 8–15 Sep, full frame table, A$3.99 on remove-ads frame, minimum ship set |
| 2026-08-11 | Simon: icon + feature graphic draft exported; capture kit in `store-assets/` |
