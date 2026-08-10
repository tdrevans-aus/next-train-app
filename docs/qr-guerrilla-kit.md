# QR guerrilla kit — card design + venues

**Owners:** Simon (design) · Tim (venues, print, asks)  
**Status:** Design spec ready · venue list seeded — Tim personalises  
**Related:** Business plan §3.3.1  

---

## 1. Card design (print)

**Format:** A6 postcard (105 × 148 mm) or 90 × 50 mm counter card — prefer **A6** for noticeboards, **small counter** for cafes.

### Front

```
[ Next Train wordmark ]

When to leave for your train

[ QR code — large, high contrast ]

Scan for live Transperth times
Unofficial · not affiliated with PTA
```

### Back (optional)

```
Near me — next train at the station closest to you
Journeys — save your weekday commute + leave-by time

Free app · optional one-time remove ads
```

### Design rules

- Light background, teal accent (match app) — **not** Transperth red/blue livery  
- No PTA / Transperth logos  
- QR: quiet zone, error correction M or H, test scan from 30–50 cm  
- One tracking URL per venue (see below)  

### Print

- PDF print-ready, 3 mm bleed if going to print shop  
- Stock: 300–350 gsm uncoated or soft-touch — looks helpful, not nightclub flyer  
- First run: **20–40 cards** max for test venues  

---

## 2. URLs (Tim fills)

Until store links exist, QR → **web app** with `?src=`:

| Venue code | Example URL |
| ---------- | ----------- |
| midland-cafe | `https://<domain>/?src=qr-midland-cafe` |
| ecu-mtlawley | `https://<domain>/?src=qr-ecu-mtlawley` |
| … | … |

After Play/App live: same `src` on store or smart link page that picks OS.

**Analytics:** Log `src` query on first hit (simple) or use a link shortener with per-code stats.

---

## 3. One-sentence ask (Tim)

> “Hi — I’ve made a small unofficial Perth train app that shows when to leave for your train. Could I leave a few free postcards by the counter / on your noticeboard for a couple of weeks? Happy to take any leftovers away.”

---

## 4. Seed venue list (~10) — Tim replaces with real names

Ask permission; prefer **near** stations, not on PTA property.


| # | Area (near station) | Type to try | Notes / Tim’s contact |
| - | ------------------- | ----------- | --------------------- |
| 1 | Midland | Cafe / library noticeboard | |
| 2 | Joondalup (CBD / uni edge) | Campus noticeboard / cafe | |
| 3 | Warwick / Greenwood | Suburban cafe | |
| 4 | Edgewater / Whitfords | Cafe strip | |
| 5 | Stirling | Shopping-centre community board (ask centre mgmt) | |
| 6 | Subiaco | Cafe / coworking | |
| 7 | Perth / Elizabeth Quay edge | Cafe off-station | Careful — not on station property |
| 8 | Canning Bridge / Como | Cafe | |
| 9 | Murdoch / Cockburn area | Campus or cafe | |
| 10 | Fremantle | Cafe / hostel noticeboard | Visitors = Nearby users |

**Month 2:** Test 5–10 that say yes; kill codes with zero scans.

---

## 5. Explicitly avoid

- Stickers on Transperth poles, machines, trains  
- Anything that looks official  

---

## Change log

| Date | Note |
|------|------|
| 2026-08-09 | Kit + seed venues for pre-launch |
