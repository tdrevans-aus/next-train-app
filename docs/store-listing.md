# Store listing — Next Train (ASO)

**Marketing owner:** Ruth (sign-off)  
**Capture / console:** Tim · **Creative polish:** Simon  
**Status:** **3.0.5 ASO pass approved by Tim 24 Nov 2026** (`docs/aso-pass-3-0-5.md`): 40+ cities across 12 countries/territories, separate iOS/Play bodies, subtitle A. Not yet pasted into either console.  
**Privacy policy URL:** `https://next-train-app.vercel.app/privacy.html`  
**About URL:** `https://next-train-app.vercel.app/about.html`  
**Support / contact:** `EvansAppStudio@gmail.com` (locked — also on About / Privacy)

**Related:** `docs/ruth-brief-marketing-launch.md` · `docs/simon-brief-play-creative.md` · `docs/closed-beta-invite.md`

---

## 1–3. Naming, keywords, descriptions — **current: 3.0.5 ASO pass (24 Nov 2026)**

**Paste-ready text, limits counted and rationale:** `docs/aso-pass-3-0-5.md`. That file holds the exact
strings. This section records what was chosen.

| Field | Locked value (Tim, 24 Nov 2026) | Chars |
| --- | --- | ---: |
| App Store name (needs a new version, ships with 3.0.5) | Next Train: Live Train Times | 28/30 |
| App Store subtitle (**option A chosen**) | When to leave for your commute | 30/30 |
| Play title | Next Train: Live Train Times | 28/30 |
| Play short description | Know when to walk out. Live leave-by times for trains in 40+ cities worldwide. | 78/80 |
| App Store promo text | see aso-pass §4 | 164/170 |
| Apple keywords | one line each for en-US / en-GB / en-AU, see aso-pass §3 (en-GB + en-AU don't overlap, because the AU storefront indexes both) | ≤100 each |

**Descriptions:** iOS and Play now have **separate bodies** (aso-pass §5a / §5b). iOS has no
remove-ads purchase, so only the Play body offers it. Coverage reads "40+ cities and regions" with a
country-by-country block, not a count, so it doesn't go stale each time a region goes live. Update
the block when a new country goes live.

**Standing rules (unchanged):** no operator names (Transperth, TfL, MBTA, WMATA, Luas, MTR…) in the
title or as keywords; "Unofficial" stays in the description closer; "Know when to walk out" stays
as the brand line in the Play short description and the promo text.

**Superseded:** the 19 Sep 2026 copy (34 regions / 5 countries, a shared body that offered remove-ads
on iOS, subtitle "Know when to walk out"), retired by this pass.

---

## 4. Screenshot plan (phone, portrait)

Ruth’s hero: kitchen → leave-by with delay. Aim **6–8** frames; stores need at least a few.  
**Simon brief:** `docs/simon-brief-play-creative.md` — book capture/polish **8–15 Sep**.

| # | Frame | On-screen UI | Caption (optional overlay) |
| - | ----- | ------------ | -------------------------- |
| 1 | Hero | Journey mode: big **Leave in 12 min** / Leave by 7:42 | When to leave, not just when it departs |
| 2 | Delay honesty | Same journey, delayed status visible | Live times, delays included |
| 3 | Near me | Nearby board: nearest station + soonest train | Your nearest station in seconds |
| 4 | Journeys | Journey list or switcher with 2 named journeys | Save the commute you repeat |
| 5 | Setup simplicity | Add journey / station + direction (clean) | Set up once |
| 6 | Trust | Small unofficial line or About snippet style | Unofficial · check station boards |
| 7 | (Optional, **Play only**: iOS has no purchase) | Menu: Remove ads **A$7.99** one-time | Ads optional — pay once |
| 8 | Widget | Home-screen widget (leave-in / leave-by), both platforms | Leave-by on your home screen |
| 9 | Breadth (new 24 Nov 2026) | Country/region picker or a 3-board montage | 40+ cities, Perth to London to LA |

**Visual rules (Simon):** Light Next Train UI (teal accent); phone frame optional; caption type large and few words; no fake Transperth logo; no purple AI-slop gradients.

**Tablet / foldable:** Defer unless store requires; phone-first.

---

## 5. Feature graphic (Play — 1024 × 500)

**Concept:**  
Left/centre: wordmark **Next Train**.  
Supporting line: **Know when to walk out.**  
Right: phone mock of **Journey mode** — route (e.g. Joondalup → Perth), **Next Train** hero countdown, **Leave in** card underneath (matches real chrome; artistic crop OK, don’t invent a different UI).  
No PTA marks. No “Perth · Unofficial” on the graphic (unofficial lives in store description / About).

**Export:** PNG 1024×500, safe margin ~48px from edges for key type.

---

## 6. Caption for the locate control — **locked (shipped)**

**Caption:** **Near me**

### Behaviour (verified in app)

| You are on | You tap | Result |
| ---------- | ------- | ------ |
| Nearby | **Near me** | Stay on Nearby · recenter GPS + refresh (brief refresh animation) |
| Journeys | **Near me** | Switch to Nearby |
| Nearby | **Journeys** | Switch to Journeys (empty setup if none) |
| Journeys | **Journeys** | Open Journeys dialog (manage / templates if empty) |

**Near me never opens Journeys.** Contract satisfied — no longer “blocked.”

Historical note: Tim worried the label was wrong if Near me toggled to Journeys; that was a misunderstanding of an older build/model. Current build recenters.

---

## 7. Categorisation & ratings


| | Suggestion |
| -- | ---------- |
| Play category | Maps & Navigation (aso-pass §7) |
| Apple category | Travel (primary), Navigation (secondary if allowed) |
| Content rating | Everyone / low — no user-generated chat |

---

## 8. Submit checklist

### Ruth (marketing)

- [ ] Play short + full description re-passed after the 19 Sep 2026 update (unofficial; leave-by hero; 34 regions; **A$7.99**)  
- [x] What’s New includes widget / leave reminders (light)  
- [ ] Screenshot set + feature graphic signed off (~15–17 Sep)  
- [x] Closed-beta invite copy ready — `docs/closed-beta-invite.md`  
- [ ] **Ruth Play marketing sign-off** recorded to Tim (~15–17 Sep)

### Tim (console / capture)

- [x] Privacy + About HTTPS live (`next-train-app.vercel.app` — swap if custom domain later)  
- [x] Contact email on About (`EvansAppStudio@gmail.com`)  
- [ ] Screenshots from **production-like** build (not test ad placeholders if avoidable) — with Simon **8–15 Sep**  
- [ ] Remove-ads IAP in Console = **A$7.99** one-time (matches listing)  
- [x] “Unofficial” visible in description  
- [ ] App Access / login notes: no account required  

---

## Change log

| Date | Note |
|------|------|
| 2026-08-09 | First ASO draft for pre-launch |
| 2026-08-09 | Niche leave-by subtitle/short desc; Nearby caption options |
| 2026-08-09 | Synced to app: Near me caption locked; widget ships; short desc “rail train” |
| 2026-08-11 | Ruth shippable pass: ownership, A$3.99 in body, What’s New widget/reminders, checklist split |
| 2026-08-11 | Play Console paste: stronger short + full description; asset readiness for Tim |
| 2026-08-11 | Full description marketing-led; single unofficial closer (About holds the rest) |
| 2026-09-19 | First public release: short + full description rewritten from Perth-only to 34 regions across 5 countries; Remove ads A$3.99 → A$7.99 (11 Sep decision); keywords, What’s New pointer and checklist updated. Frame 7 screenshot and feature-graphic route example need re-checking against the new copy |
| 2026-11-24 | 3.0.5 ASO pass (`docs/aso-pass-3-0-5.md`): name and title "Next Train: Live Train Times", subtitle A "When to leave for your commute", per-locale Apple keywords (US/UK/AU), separate iOS body with no remove-ads, coverage moved to 40+ cities across 12 countries/territories incl. metros and light rail, new breadth screenshot frame |
