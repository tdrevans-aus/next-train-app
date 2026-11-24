# ASO pass — Next Train 3.0.5 (App Store + Google Play, AU / UK / US)

**Written:** 24 Nov 2026 by the controller session, for Tim to review and paste into the consoles.
**Status:** **approved by Tim 24 Nov 2026, with subtitle option A.** The choices are recorded in `docs/store-listing.md`
(the living listing doc), and this file holds the paste-ready text. Not yet pasted into either console. That doc's 19 Sep copy is out of date
in three ways this pass fixes:

1. It says **34 regions / 5 countries**. 44 entries are live now, across 12 countries and territories:
   Melbourne, Dublin, Copenhagen, Brussels, Vienna, Prague, Hong Kong, Boston, Washington DC and
   Los Angeles have joined.
2. It uses **one body for both stores**, and that body sells remove-ads (A$7.99). **iOS has no
   remove-ads purchase** (`public/ad-free-purchase.js` gates out iOS), so the iOS listing must not
   offer it.
3. It is **trains only**. Coverage now includes metros (Vienna, Prague, Hong Kong, Copenhagen, Boston,
   DC, LA) and light rail/trams (Dublin, Canberra, LA), and people search for those words.

Every limit below was counted by script (code points). Paste the text exactly.

---

## 1. How the stores index (why the fields are split this way)

- **Apple** searches the **name + subtitle + keyword field**. The description isn't indexed. Don't
  repeat a word in the keywords that's already in the name or subtitle. Commas, no spaces. Plurals
  aren't needed.
- **Apple storefronts read more than one locale.** The **Australian** App Store indexes **English
  (Australia) and English (UK)**, so AU effectively gets 200 keyword characters. The en-AU and en-GB
  lines below don't overlap, so none of that space is wasted. UK reads en-GB, and US reads en-US.
- **Google Play** has no keyword field. It indexes the **title, short description and full
  description**, so the city names go in the full description in plain prose. Don't keyword-stuff.
  Play penalises it.
- **No operator brands as keywords** (Transperth, TfL, MBTA, WMATA, Luas, MTR…), on either store.
  That's a trademark and "misleading" risk, and it's the existing rule in `store-listing.md`. The
  TfL line names in the UK coverage bullet are descriptive and were already accepted in the live
  listing.

---

## 2. Name and subtitle

| Field | Current (live) | Proposed | Chars |
| --- | --- | --- | ---: |
| App Store **name** | Next Train | **Next Train: Live Train Times** | 28/30 |
| App Store **subtitle** | Know when to walk out | **When to leave for your commute** | 30/30 |
| Play **title** | Next Train | **Next Train: Live Train Times** | 28/30 |
| Play **short description** | Know when to walk out. Live leave-by for your train, across 5 countries. | **Know when to walk out. Live leave-by times for trains in 40+ cities worldwide.** | 78/80 |

**The one real choice: the subtitle.**

- **A — "When to leave for your commute" (CHOSEN by Tim, 24 Nov 2026).** It adds *leave* and *commute* to Apple's
  search index, and those are the words people actually type. It still says what makes the app
  different.
- **B — keep "Know when to walk out."** It's the brand line Ruth locked, but it's worth almost
  nothing in search. Nobody searches "walk out".

With A, "Know when to walk out" still opens the Play short description, the promo text and the
description, so the line isn't lost.

**Name change note:** a new App Store name only takes effect with a new version (3.0.5 is the
right moment). On Play, the title can change at any time and is reviewed like any listing edit. The
home-screen label stays "Next Train", because that comes from the app build, not the listing.

---

## 3. Apple keyword fields (one per locale)

None of these repeat a word from the name or subtitle (next, train, live, times, when, leave, for,
your, commute).

**English (U.S.)** — 92/100
```
departures,station,rail,metro,subway,transit,schedule,tracker,delays,boston,washington,dc,la
```

**English (U.K.)** — 98/100 (indexed in the UK **and** Australia)
```
departures,station,rail,timetable,delays,platform,tube,underground,london,manchester,glasgow,leeds
```

**English (Australia)** — 100/100 (adds to en-GB in the AU storefront, with no overlap)
```
transit,metro,tram,tracker,schedule,perth,sydney,melbourne,brisbane,adelaide,canberra,gold,coast,nsw
```

App Store Connect: App Information → add the **English (Australia)**, **English (U.K.)** and
**English (U.S.)** localisations if they aren't already there. Each gets its own name, subtitle and
keywords, and you can reuse the same name and subtitle in all three.

---

## 4. App Store promotional text (170) — no new build needed to change it

164/170, same for all three locales:
```
Now on iPhone. Live leave-by times for trains, metros and trams in 40+ cities, from Perth to London to LA. Save your commute once and know exactly when to walk out.
```
Promo text isn't indexed. It's the line under the screenshots, and you can swap it at any time
(e.g. "New: Dublin and Vienna" when a city goes live).

---

## 5. Full descriptions

### 5a. App Store (iOS) — no remove-ads offer

```
Should I leave now — or do I have another minute?

Next Train is the leave-by companion for your commute. It uses live times (delays included) to tell you when to walk out the door for your train — not just another departure board to scroll.

40+ CITIES AND REGIONS
• Australia — Perth, Sydney, Melbourne, Brisbane, Adelaide, Canberra, Gold Coast, Newcastle
• United Kingdom — every National Rail station in Great Britain, plus London Underground, Elizabeth line, DLR, Overground and Tram
• Ireland — Dublin
• Europe — Stockholm, Göteborg, Malmö, Uppsala, Helsinki, Oslo, Copenhagen, Brussels, Vienna, Prague
• Hong Kong
• United States — Boston, Washington DC, Los Angeles

Trains, metros and light rail, depending on the city.

NEAR ME
Open the app and see what's leaving from the station nearest you. No account. No setup.

SAVE A JOURNEY
Add the commute you repeat: station, direction, and how long you need to get to the platform. Next Train turns that into a clear leave-by time for the "should I go yet?" moment.

BUILT FOR REAL MORNINGS
• Leave-by based on your walk or drive to the station
• Live status and delays when the operator publishes them
• Search any station in your country by name
• Home-screen widget so leave-by is always in view

FREE
A small banner ad helps cover hosting. No account, no subscription.

Unofficial — not affiliated with any transport operator or authority. Always check station displays and announcements.
```

### 5b. Google Play (Android) — adds reminders and remove-ads

Same body as 5a, with two changes:

1. In **BUILT FOR REAL MORNINGS**, replace the widget bullet with these two bullets:
```
• Home-screen widget so leave-by is always in view
• Optional leave reminders, with a live countdown in your notifications
```
2. Replace the **FREE** section with:
```
FREE, WITH OPTIONAL REMOVE ADS
A small banner helps cover hosting. Remove ads forever with a one-time purchase (A$7.99, or the local equivalent) — not a subscription.
```

**Play per-country listings (optional, worth it later):** Play Console → Grow → Store presence →
Custom store listings lets the UK and US listings put their own cities first in the coverage block.
It's a small ranking and conversion gain, so leave it until the base listing is in.

---

## 6. Screenshots — captions (both stores)

The existing frame plan in `store-listing.md` §4 still stands. Updated captions, all ≤40 characters
so they stay big on a phone:

| # | Frame | Caption |
| - | --- | --- |
| 1 | Hero — journey with big **Leave in 12 min** / leave-by time | **When to leave, not just when it departs** |
| 2 | Same journey, delay visible | **Live times, delays included** |
| 3 | Near me board | **Your nearest station in seconds** |
| 4 | Two named journeys | **Save the commute you repeat** |
| 5 | Country/region picker, or a montage of 3 boards | **40+ cities, Perth to London to LA** *(new — sells the breadth that's now true)* |
| 6 | Home-screen widget | **Leave-by on your home screen** |

**Retire** the "Ads optional — pay once" frame on iOS, because there's no purchase there. It can
stay on Play.

**Per-locale station swap (the best small win if you're recapturing):** the first two frames
convert best when the station is local to the shopper. Use **Perth** or **Sydney** for en-AU,
**London** for en-GB and **Washington DC** or **Boston** for en-US. Both consoles take separate
screenshots per localisation. If recapturing isn't worth it now, use one set everywhere and
lead with whichever city's board looks cleanest.

The iOS captures are covered by `docs/mac-brief-ios-screenshots-xcode.md`. The Play captures are
covered by `docs/jim-brief-play-screenshots-headless.md`.

---

## 7. Category

- **App Store:** Primary **Travel**, secondary **Navigation**.
- **Play:** **Maps & Navigation**, where commuter transit apps cluster. Travel & Local is crowded
  with booking apps.

---

## 8. Paste checklist (Tim)

- [x] Choose subtitle A or B → **A**
- [ ] **ASC 3.0.5 version:** name, subtitle, keywords × 3 locales, promo text, description 5a,
      screenshots (no remove-ads frame)
- [ ] **Play main listing:** title, short description, description 5b. You can do this now, with
      no build needed.
- [x] Fold the chosen copy into `docs/store-listing.md` and log it there
- [ ] Later: Play custom store listings for the UK and US; per-locale screenshots

## Things I didn't do

- **Search-volume data.** The keywords come from the coverage, the terms riders actually use
  (tube, timetable, subway, metro) and Apple's indexing rules. They're not from a paid ASO
  tool. If you want numbers, Apple Search Ads' free keyword popularity check (inside an ad
  campaign draft) shows a 5–100 score per term per storefront. After 3–4 weeks, swap the
  keywords that don't rank.
- **Other storefronts** (Sweden, Norway, Ireland, etc.). They fall back to the default
  localisation. Native-language listings for SE/NO/FI/DK are a later pass.
