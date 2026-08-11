# Store listing — Next Train (ASO)

**Marketing owner:** Ruth (sign-off)  
**Capture / console:** Tim · **Creative polish:** Simon  
**Status:** **Play copy shippable** — Ruth final pass 11 Aug 2026 (creative still needs screenshots + feature graphic)  
**Privacy policy URL:** `https://next-train-app.vercel.app/privacy.html`  
**About URL:** `https://next-train-app.vercel.app/about.html`  
**Support / contact:** `EvansAppStudio@gmail.com` (locked — also on About / Privacy)

**Related:** `docs/ruth-brief-marketing-launch.md` · `docs/simon-brief-play-creative.md` · `docs/closed-beta-invite.md`

---

## 1. Naming


| Field | Play Store | App Store |
| ----- | ---------- | --------- |
| **App name / title** | Next Train | Next Train |
| **Subtitle** (Apple, ~30 chars) | — | **Know when to walk out** |
| **Short description** (Play, 80 chars) | **Know when to walk out. Live leave-by for Perth trains.** | — |

**Why this framing (even though the app opens on Nearby):**  
Store copy sells the **niche** (leave-home / walk-out time for a saved commute). The default screen is Nearby for activation; Journeys + leave-by are why someone keeps the app and why we’re not “another departures board.” Screenshots can still lead with leave-by (marketing hero) while day-one UX is Nearby.

**Locked (Ruth — Play Console paste):**  
- Short description (**54**/80): `Know when to walk out. Live leave-by for Perth trains.`  
- Subtitle (Apple): `Know when to walk out` (**21** chars)  
- Remove-ads price in listing: **A$3.99** one-time (must match Play Console product)  
- Alt short (also fine): `Know when to walk out — leave-by for your rail train.` (53)

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

**Paste into Play Console / App Store Connect:**

```
Should I leave now — or do I have another minute?

Next Train is the leave-by companion for Perth rail. It uses live Transperth times (delays included) to tell you when to walk out the door for your train — not just another departure board to scroll.

NEAR ME
Open the app and see what’s leaving from the station nearest you. No account. No setup required.

SAVE A JOURNEY
Add the commute you repeat: station, direction, and how long you need to get to the platform. Next Train turns that into a clear leave-by time for the “should I go yet?” moment.

BUILT FOR REAL MORNINGS
• Leave-by based on your walk or drive-to-station buffer
• Live status when available
• Optional Android home-screen widget
• Optional leave reminders so you don’t watch the clock

FREE, WITH OPTIONAL REMOVE ADS
A small banner helps cover hosting. Remove ads forever with a one-time purchase (A$3.99) — not a subscription.

Unofficial — not affiliated with Transperth or the PTA. Always check station boards.
```

**Note:** Full About / privacy detail lives in-app (`about.html` / `privacy.html`) and Play Data safety — not repeated here.

**Apple “Promotional text” (optional, updatable without new build):**  
`Know when to leave for your train — leave-by for your rail commute.`

**What’s New (first release / Play release notes):**  
`First release — Nearby board, saved Journeys with leave-by, optional Android widget and leave reminders. Free with optional one-time remove ads (A$3.99). Unofficial Transperth companion.`

---

## 4. Screenshot plan (phone, portrait)

Ruth’s hero: kitchen → leave-by with delay. Aim **6–8** frames; stores need at least a few.  
**Simon brief:** `docs/simon-brief-play-creative.md` — book capture/polish **8–15 Sep**.

| # | Frame | On-screen UI | Caption (optional overlay) |
| - | ----- | ------------ | -------------------------- |
| 1 | Hero | Journey mode: big **Leave in 12 min** / Leave by 7:42 | When to leave — not just when it departs |
| 2 | Delay honesty | Same journey, delayed status visible | Live times, delays included |
| 3 | Near me | Nearby board: nearest station + soonest train | Near you in seconds |
| 4 | Journeys | Journey list or switcher with 2 named journeys | Save the commute you repeat |
| 5 | Setup simplicity | Add journey / station + direction (clean) | Set up once |
| 6 | Trust | Small unofficial line or About snippet style | Unofficial · check station boards |
| 7 | (Optional) | Menu: Remove ads **A$3.99** one-time | Ads optional — pay once |
| 8 | Widget | Android home-screen widget (leave-in / leave-by) | Leave-by on your home screen |

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
| Play category | Maps & Navigation (or Travel & Local) |
| Apple category | Travel (primary), Navigation (secondary if allowed) |
| Content rating | Everyone / low — no user-generated chat |

---

## 8. Submit checklist

### Ruth (marketing)

- [x] Play short + full description shippable (unofficial; leave-by hero; **A$3.99**)  
- [x] What’s New includes widget / leave reminders (light)  
- [ ] Screenshot set + feature graphic signed off (~15–17 Sep)  
- [x] Closed-beta invite copy ready — `docs/closed-beta-invite.md`  
- [ ] **Ruth Play marketing sign-off** recorded to Tim (~15–17 Sep)

### Tim (console / capture)

- [x] Privacy + About HTTPS live (`next-train-app.vercel.app` — swap if custom domain later)  
- [x] Contact email on About (`EvansAppStudio@gmail.com`)  
- [ ] Screenshots from **production-like** build (not test ad placeholders if avoidable) — with Simon **8–15 Sep**  
- [ ] Remove-ads IAP in Console = **A$3.99** one-time (matches listing)  
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
