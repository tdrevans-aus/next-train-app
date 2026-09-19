# Store listing — Next Train (ASO)

**Marketing owner:** Ruth (sign-off)  
**Capture / console:** Tim · **Creative polish:** Simon  
**Status:** **Play copy updated 19 Sep 2026 for the first public release** — 34 regions across 5 countries, Remove ads A$7.99. Ruth's 11 Aug sign-off covered the Perth-only copy; the multi-country wording below has not had a Ruth pass.  
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
| **Short description** (Play, 80 chars) | **Know when to walk out. Live leave-by for your train, across 5 countries.** | — |

**Why this framing (even though the app opens on Nearby):**  
Store copy sells the **niche** (leave-home / walk-out time for a saved commute). The default screen is Nearby for activation; Journeys + leave-by are why someone keeps the app and why we’re not “another departures board.” Screenshots can still lead with leave-by (marketing hero) while day-one UX is Nearby.

**Play Console paste (updated 19 Sep 2026):**  
- Short description (**72**/80): `Know when to walk out. Live leave-by for your train, across 5 countries.`  
  Says "5 countries", not "34 regions", so it does not go stale each time a region flips live.  
- Subtitle (Apple): `Know when to walk out` (**21** chars)  
- Remove-ads price in listing: **A$7.99** one-time (decided 11 Sep 2026; must match Play Console product)  
- Alt short (also fine): `Know when to walk out. Live train times and leave-by for your commute.` (70)

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
| Know when to walk out. Live leave-by for Perth trains. | Locked 11 Aug 2026 when the app was Perth-only; retired 19 Sep 2026 |

**Title keyword note:** Keep **Next Train** as brand. Don’t put any operator name (Transperth, TfL, National Rail, SL…) in the title (trademark / misleading). City and country names go in the description, with “unofficial” clear.

---

## 2. Keywords

**Play — weave into short + full description (no separate keyword field):**  
train times, live departures, leave for train, commute, next train, station, plus the city and country names in the coverage block of the full description (Perth, Sydney, Brisbane, London, National Rail, Stockholm, Helsinki, Oslo…). Light touch — don’t keyword-spam, and no operator names as keywords.

**Apple — Keyword field (100 characters, comma-separated, no spaces after commas preferred):**

```
train,times,commute,departures,leave,station,rail,perth,sydney,london,uk,stockholm,oslo,helsinki
```

Trim to ≤100 characters when finalising in App Store Connect (count carefully).

---

## 3. Full description (Play + Apple — same body)

**Paste into Play Console / App Store Connect:**

```
Should I leave now — or do I have another minute?

Next Train is the leave-by companion for your rail commute. It uses live train times (delays included) to tell you when to walk out the door for your train — not just another departure board to scroll.

34 CITIES AND REGIONS, 5 COUNTRIES
• Australia — Perth, Sydney, Brisbane, Adelaide, Canberra, Gold Coast, Newcastle
• United Kingdom — every National Rail station in Great Britain, plus London Underground, Elizabeth line, DLR, Overground and Tram
• Sweden — Stockholm, Göteborg, Malmö, Uppsala
• Finland — Helsinki
• Norway — Oslo

NEAR ME
Open the app and see what’s leaving from the station nearest you. No account. No setup required.

SAVE A JOURNEY
Add the commute you repeat: station, direction, and how long you need to get to the platform. Next Train turns that into a clear leave-by time for the “should I go yet?” moment.

BUILT FOR REAL MORNINGS
• Leave-by based on your walk or drive-to-station buffer
• Live status when available
• Search any station in your country by name
• Optional Android home-screen widget
• Optional leave reminders so you don’t watch the clock

FREE, WITH OPTIONAL REMOVE ADS
A small banner helps cover hosting. Remove ads forever with a one-time purchase (A$7.99, or the local equivalent) — not a subscription.

Unofficial — not affiliated with any transport operator or authority. Always check station boards.
```

**Note:** Full About / privacy detail lives in-app (`about.html` / `privacy.html`) and Play Data safety — not repeated here.

**Apple “Promotional text” (optional, updatable without new build):**  
`Know when to leave for your train — leave-by for your rail commute.`

**What’s New (first release / Play release notes):**  
Use the 3.0.3 text in `docs/release-notes-3.0.3.md` (first public release, 492/500 characters, names no price). The 11 Aug Perth-only line is retired.

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
| 7 | (Optional) | Menu: Remove ads **A$7.99** one-time | Ads optional — pay once |
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
