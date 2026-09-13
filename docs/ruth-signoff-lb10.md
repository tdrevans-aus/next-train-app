# LB-10 — Ruth Play listing + creative review (11 Sep 2026)

**Verdict: NOT signed off — two fixes and one capture, all doable before 17 Sep.**
This supersedes "Waiting Ruth". The 11 Aug sign-off on `docs/store-listing.md` was for a
**Perth-only** app. 3.0.0 (#358) ships **33 cities in five countries**, so the signed copy is now
wrong in the exact places that matter: title line, description, disclaimer, price.

---

## 1. What changed under the listing

| Item | Listing says | App ships (3.0.0) | Verdict |
|---|---|---|---|
| Coverage | "Live leave-by for Perth trains" | 33 cities: AU 7, UK 20 regions, SE 4, FI 1, NO 1 | **Rewrite** (below) |
| Disclaimer | "not affiliated with Transperth or the PTA" | 30+ operators | **Rewrite** — generic operator line |
| Remove-ads price | **A$3.99** (listing, Simon brief, `privacy.html`) | **A$7.99** fallback (`public/ad-free-purchase.js:3`, `site-config.json`, `captions.md` frame 7) | **Tim decides** — see §4 |
| Price in copy at all | "A$3.99" in body + What's New | Play localises: UK/SE users see £/kr | **Drop the number** from all store copy |

---

## 2. Replacement copy (Ruth — shippable, Play Console paste)

**Short description** (61/80):

```
Know when to walk out. Live leave-by for trains in 33 cities.
```

**Full description:**

```
Should I leave now — or do I have another minute?

Next Train is the leave-by companion for rail commuters. It uses live departure times — delays included — to tell you when to walk out the door for your train. Not just another departure board to scroll.

33 CITIES, FIVE COUNTRIES
• Australia — Perth, Sydney, Brisbane, Adelaide, Canberra, Gold Coast, Newcastle
• United Kingdom — London (TfL and National Rail), Manchester, Birmingham, Liverpool, Leeds, Sheffield, Bristol, Cardiff, Glasgow, Edinburgh and more
• Sweden — Stockholm, Gothenburg, Malmö, Uppsala
• Finland — Helsinki
• Norway — Oslo

NEAR ME
Open the app and see what's leaving from the station nearest you. No account. No setup required.

SAVE A JOURNEY
Add the commute you repeat: station, direction, and how long you need to get to the platform. Next Train turns that into a clear leave-by time for the "should I go yet?" moment.

BUILT FOR REAL MORNINGS
• Leave-by based on your walk or drive-to-station buffer
• Live status when available
• Optional home-screen widget
• Optional leave reminders so you don't watch the clock

FREE, WITH OPTIONAL REMOVE ADS
A small banner helps cover hosting. Remove ads forever with a one-time purchase — not a subscription.

Unofficial — not affiliated with or endorsed by any rail operator or transport authority. Times come from operators' public live feeds; always check station boards.
```

**What's New** — use the short form in `docs/release-notes-3.0.0.md` as-is (it's correct).

**Apple subtitle** `Know when to walk out` — unchanged, still fits.
**Apple keywords** — re-cut at App Store sign-off (Oct); Perth-only list is stale but not a Play blocker.

---

## 3. Creative

| Asset | Verdict | Note |
|---|---|---|
| Feature graphic 1024×500 | **Approved** | Matches Journey chrome; no city claim beyond the Joondalup route line, which is fine |
| App icon 512 | **Approved** | |
| Phone screenshots | **Missing** | `store-assets/frames/` is empty; capture window 8–15 Sep is half gone. This is the real blocker, not sign-off |
| Frame 7 (remove-ads price) | **Cut** | Shows A$ to UK/Nordic browsers; brief and capture kit disagree on price anyway |
| New frame — coverage | **Add** | City picker, caption **"33 cities. Australia, the UK and the Nordics."** |
| Frame 3 (Near me) | **Change** | Capture in **London**, not Perth: 20 of 33 regions are UK, and UK browsers need to see their city by frame 3 |

Ship set I'll sign: **1 hero (Perth) · 2 delay · 3 Near me (London) · 4 Journeys · new coverage frame · 6 trust · 8 widget**.

---

## 4. Outside my authority — flagged, blocks public

1. **Remove-ads price — DECIDED (Tim, 11 Sep 2026): A$7.99 one-time.** Follow-ups: `privacy.html:161`
   says "one-time purchase" with no number; retire A$3.99 from `store-listing.md`,
   `simon-brief-play-creative.md`, `revenue-program-20k.md`, `business-marketing-plan.md`; Tim
   confirms the Console product reads A$7.99.
   - **Support-the-developer A$1/month tier — not at launch** (Ruth recommended; **Tim chose option A, 11 Sep**).
     Launch is A$7.99 lifetime only; "support the developer" goes to the post-launch backlog. "No subscription" is
     in the locked positioning and this listing, and it's the differentiator against NextThere
     (subscription, iOS-only). `revenue-program-20k.md` rule 5 holds subs until the A$20k path is
     proven or blocked. Revisit post-launch against go/no-go data; if Tim wants a support option
     sooner, a **one-time tip** fits the brand where a subscription doesn't.
2. **Privacy policy is Perth-only** (`public/privacy.html:55,63,76,122,217`) — says live data comes
   from Transperth's service. From 3.0.0 it comes from ~30 operators across five countries. That's a
   factual misstatement of data flows in the policy Play links to — Dwayne/Tim, before public.
3. **About page is Perth-only** (`public/about.html:28,46–48,77`) — it's the listing's About URL.
   Copy change in `public/` → `tim-review` Jim brief.
4. **Release notes inconsistencies** (`docs/release-notes-3.0.0.md`) — line 8 says "six countries"
   (it's five); line 30 says "18 regions" but lists 20. Console short form is correct; fix the doc.

---

## 5. Path to sign-off

| # | Owner | Action | By |
|---|---|---|---|
| 1 | Tim | ~~Pick price option A/B~~ — **A$7.99** decided 11 Sep; confirm Console product matches | 12 Sep |
| 2 | Tim (+ Simon) | Capture 7 frames above from the 3.0.0 prod-like build | 15 Sep |
| 3 | Jim (brief, tim-review) | About + privacy copy to multi-city; price per #1 | 15 Sep |
| 4 | Ruth | Final look at frames + paste-check → sign-off one-liner to Tim | 16–17 Sep |

Copy (§2) and feature graphic are signed off as of today once §4.1 is decided. LB-10 status should
read **"Copy approved (multi-city rewrite) — waiting screenshots + privacy/About"**.
