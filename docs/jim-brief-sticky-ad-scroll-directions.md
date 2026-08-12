# Jim brief: Sticky ad + scrollable Other directions

**For:** Jim (implement)  
**From:** Simon / Tim  
**Date:** 12 Aug 2026  
**Priority:** Medium — Perth (many directions) pushes the ad off-screen  
**Status:** Ready  
**Related:** `public/index.html` (`#nearby-directions`, `#ad-container`, `.app-body`) · `public/styles.css` · `public/ads.js` / AdMob banner · Founding Pro (free = ads)

**Out of scope:** Changing ad network / IAP · redesigning journey-mode layout · hiding ads for free users

---

## 1. Product lock (Tim)

| Priority | Rule |
|----------|------|
| **1 — Task** | Directions / board stay usable. Never put ads *above* the direction list or shrink the hero to “protect” the banner. |
| **2 — Ads** | Free users should still **see** the ad when the list is long. Don’t hide the slot just because Perth has many directions. |

**Pattern:** Pin the ad to the **bottom of the app viewport**. Let **Other directions** (and overflow board chrome) **scroll** in the middle above it. Optional: cap visible direction rows + “More…”.

---

## 2. Problem

Near me at a hub (e.g. **Perth**) renders a long `#nearby-directions-list`. Content grows; `#ad-container` sits below in document flow (`margin-top: auto` on `.ad-slot`) and is **scrolled/pushed off** the first viewport. Ad inventory drops exactly when the screen is busiest.

Journey mode already hides Other directions (`docs/jim-brief-other-directions-in-journey-mode.md`) — this brief is **Near me** (and any mode where `#nearby-directions` is shown).

---

## 3. Layout acceptance

### Must

1. **Ad slot sticky/fixed to the bottom of `.app` / safe area** when ads are enabled and `#ad-container` is visible (not Pro / not hidden).  
2. **Scrollable region** above the ad: at least `#nearby-directions` (and preferably the rest of `.app-body` content that currently competes for height — hero + meta can stay visible; list scrolls).  
3. On a short phone with **6+** directions: user can scroll the list **without** the ad leaving the viewport.  
4. Pro / no-ads: no empty reserved strip; reclaim space (existing hide behaviour).  
5. **Unlock Pro** link stays with the ad cluster (above or immediately under the banner), not stranded mid-scroll.  
6. Near me only — journey mode unchanged (Other directions still hidden).

### Nice (do in same PR if cheap)

7. **Cap** direction rows: show first **4** (or 5), then a single **More directions** control that expands the full list (still scrolling above sticky ad).  
8. Expanded state remembered only for the session (or until station changes) — don’t persist forever.

### Do not

- Move ad above Other directions  
- Shrink countdown/hero to keep ad visible  
- Use a floating ad that covers direction tap targets  
- Break AdMob banner sizing (keep banner height reserved so layout doesn’t jump)

---

## 4. Implementation sketch

Likely structure (Jim may adjust):

```text
.app (column, 100dvh / safe)
  header.topbar (fixed height)
  .app-body (flex 1, min-height 0, overflow-y auto)   ← scrolls
    context, hero, nearby-directions, train-meta, …
  .ad-dock (flex-shrink 0)                             ← sticky bottom
    #ad-container
    #ad-remove-link-wrap
```

CSS: `.app` already column-ish — ensure `.app-body` gets `flex: 1; min-height: 0; overflow-y: auto` and ad dock is **sibling below** `.app-body`, not inside the scrolling block.

Confirm native AdMob / `ads.js` still mounts into `#ad-container` after DOM move.

**Cap (optional):** in `renderNearbyBoard` (or directions render), slice list to `N` unless `directionsExpanded`; render a button row for More.

---

## 5. Test plan

| # | Steps | Pass |
|---|--------|------|
| 1 | Near me → station with **many** directions (Perth) | Ad visible at bottom without scrolling the whole page away |
| 2 | Scroll Other directions | List moves; ad stays pinned |
| 3 | Station with **1–2** directions | No weird empty gap; ad still bottom |
| 4 | Pro / remove-ads | No ad dock; body uses full height |
| 5 | Near me → Journeys | Other directions hidden; ad behaviour OK |
| 6 | If More cap shipped | First N shown; More reveals rest; taps still select direction |

Device: phone-sized viewport + `npm run cap:sync` after web changes.

---

## 6. Files (expected)

- `public/index.html` — structure: ad dock sibling under scroll body  
- `public/styles.css` — flex/scroll/sticky safe-area  
- `public/app.js` and/or nearby board render — optional More cap  
- `public/ads.js` — only if mount target / resize needs a nudge  

---

## Slack / one-liner

> Jim — Perth’s long **Other directions** list pushes the ad off-screen. Brief: `docs/jim-brief-sticky-ad-scroll-directions.md`. **Sticky ad dock at bottom**; scroll directions above. Task > ads, but ads stay visible. Optional cap (4 + More). Don’t put ads above the list.
