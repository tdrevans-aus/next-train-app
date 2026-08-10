# Store listing — Next Train (ASO draft)

**Owners:** Tim + Simon  
**Status:** Draft — Tim to lock before submit  
**Privacy policy URL:** `https://<your-domain>/privacy.html` (replace with production URL)  
**Support / contact:** From About page once email is set  

---

## 1. Naming


| Field | Play Store | App Store |
| ----- | ---------- | --------- |
| **App name / title** | Next Train | Next Train |
| **Subtitle** (Apple, ~30 chars) | — | **Know when to walk out** |
| **Short description** (Play, 80 chars) | **Know when to walk out — leave-by for your rail train.** | — |

**Why this framing (even though the app opens on Nearby):**  
Store copy sells the **niche** (leave-home / walk-out time for a saved commute). The default screen is Nearby for activation; Journeys + leave-by are why someone keeps the app and why we’re not “another departures board.” Screenshots can still lead with leave-by (marketing hero) while day-one UX is Nearby.

**Locked (Tim):**  
- Short description: `Know when to walk out — leave-by for your rail train.`  
- Subtitle: `Know when to walk out` (**21** chars)

**Apple subtitle length check**

| Candidate | Chars | Fits ≤30? |
| --------- | ----: | --------- |
| Know when to walk out | 21 | Yes — **locked** |
| Know when to leave for your train | **34** | **No** — too long for App Store subtitle |
| Leave-by for your commute | 25 | Yes (alt) |
| Leave-by for your train | 23 | Yes (alt) |

Do **not** use `Know when to leave for your train` as the Apple subtitle — App Store Connect will reject / truncate. Put that longer line in promotional text or full description instead.

**Rejected / weaker lines**

| Line | Issue |
| ---- | ----- |
| When to leave for your next Transperth train — live times, delays included | Generic train-times app |

**Title keyword note:** Keep **Next Train** as brand. Don’t stuff “Transperth” into the title (trademark / misleading). Put Transperth in description + keywords only, with “unofficial” clear.

---

## 2. Keywords

**Play — weave into short + full description (no separate keyword field):**  
Perth train, Transperth, train times Perth, leave for train, train departures, commute, next train, station, Fremantle line, Joondalup, Mandurah, Midland, Armadale (light touch — don’t keyword-spam).

**Apple — Keyword field (100 characters, comma-separated, no spaces after commas preferred):**

```
perth,train,transperth,commute,departures,leave,times,station,rail,joondalup,mandurah
```

Trim to ≤100 characters when finalising in App Store Connect (count carefully).

---

## 3. Full description (Play + Apple — same body)

```
Next Train is the leave-by companion for Perth rail — it tells you when to walk out the door for your train, using live Transperth times (delays included).

OPEN ON NEARBY
See what’s leaving from the station nearest you — instantly. No setup required.

SAVE A JOURNEY
Add your weekday commute (station, direction, how long you need to get to the platform). Next Train turns that into a leave-by time — not just another departure board.

WHY IT’S DIFFERENT
• Leave-by based on your walk/drive-to-station buffer
• Live status when available
• Calm UI built for the “should I go yet?” moment

FREE WITH OPTIONAL REMOVE ADS
Small banner on the free app. Remove ads forever with a one-time purchase. No subscription.

UNOFFICIAL
Not affiliated with Transperth or the PTA. Always check platform displays and announcements at the station.

Privacy-light: your journeys stay on your device.
```

**Apple “Promotional text” (optional, updatable without new build):**  
`Know when to leave for your train — leave-by for your rail commute.`

**What’s New (first release):**  
`First release — Nearby station board, saved Journeys, leave-by times for Perth Transperth rail.`

---

## 4. Screenshot plan (phone, portrait)

Ruth’s hero: kitchen → leave-by with delay. Aim **6–8** frames; stores need at least a few.

| # | Frame | On-screen UI | Caption (optional overlay) |
| - | ----- | ------------ | -------------------------- |
| 1 | Hero | Journey mode: big **Leave in 12 min** / Leave by 7:42 | When to leave — not just when it departs |
| 2 | Delay honesty | Same journey, delayed status visible | Live times, delays included |
| 3 | Near me | Nearby board: nearest station + soonest train | Near you in seconds |
| 4 | Journeys | Journey list or switcher with 2 named journeys | Save the commute you repeat |
| 5 | Setup simplicity | Add journey / station + direction (clean) | Set up once |
| 6 | Trust | Small unofficial line or About snippet style | Unofficial · check station boards |
| 7 | (Optional) | Menu: Remove ads one-time | Ads optional — pay once |
| 8 | Widget | Android home-screen widget (leave-in / leave-by) | Leave-by on your home screen |

**Visual rules (Simon):** Light Next Train UI (teal accent); phone frame optional; caption type large and few words; no fake Transperth logo; no purple AI-slop gradients.

**Tablet / foldable:** Defer unless store requires; phone-first.

---

## 5. Feature graphic (Play — 1024 × 500)

**Concept:**  
Left/centre: wordmark **Next Train**.  
Supporting line: **Know when to walk out.** / **Leave-by for your rail commute.**  
Right or background: simplified phone showing leave-by number (e.g. `12 min`) + soft Perth-morning wash (teal/mist — match app, not Transperth livery).  
No PTA marks. Small: `Perth · Unofficial`.

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
| Play category | Maps & Navigation (or Travel & Local) |
| Apple category | Travel (primary), Navigation (secondary if allowed) |
| Content rating | Everyone / low — no user-generated chat |

---

## 8. Tim checklist before submit

- [ ] Production privacy + about URLs live HTTPS  
- [ ] Contact email on About  
- [ ] Screenshots from **production-like** build (not test ad placeholders if avoidable)  
- [ ] Remove-ads price matches listing copy (A$3.99 one-time)  
- [ ] “Unofficial” visible in description  
- [ ] App Access / login notes: no account required  

---

## Change log

| Date | Note |
|------|------|
| 2026-08-09 | First ASO draft for pre-launch |
| 2026-08-09 | Niche leave-by subtitle/short desc; Nearby caption options |
| 2026-08-09 | Synced to app: Near me caption locked; widget ships; short desc “rail train” |
