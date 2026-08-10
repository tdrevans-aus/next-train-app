# Brief for Simon — My Journeys chrome icon (round 2)

**From:** Tim / Ruth (product + marketing)  
**Date:** 2026-08-10  
**Priority:** Medium — don’t block store submit; improve meaning before launch polish  
**Open this with the preview:** [public/design/journey-icon-chrome-brief.html](../public/design/journey-icon-chrome-brief.html)

---

## The problem

Round 1 asked for front-facing trains (`journey-icon-pick.html` V1–V5). Craft was fine; **none hit the mark** because the metaphor was wrong.

**My Journeys** must mean *my saved routes / commute*, not *train*. The whole app is already about trains. Beside **Near me** (crosshair) and **Menu** (hamburger), a train face doesn’t explain the job — it doubles the transit vibe and can make Journeys feel like “another train board.”

The old **two dots + line** was closer to the right *idea* (A → B). If it felt esoteric, refine that family so it reads at chrome size — don’t replace it with “more trains.”

---

## Job of each chrome control

| Control | Job | Icon should say |
| -------- | --- | ----------------- |
| **Near me** | What’s here now | Place / nearby *(keep as-is)* |
| **My Journeys** | My saved commute | Saved route / my trips *(this brief)* |
| **Menu** | Everything else | Menu *(keep as-is)* |

Hard rule: at a glance, someone must **not** confuse Journeys with Near me.

---

## What we need from you

Explore **three metaphor families** — **2–3 options each** (6–9 total), stroke style matching chrome (`currentColor`, ~1.75 stroke, 24×24):

1. **Route A→B** — two nodes + path (refine the old journey idea so it reads at ~22px)
2. **Saved / bookmark** — personal commute, “mine”
3. **Stack / list of trips** — multiple journeys

**Out of scope this round:** front-facing train faces (no V1–V5 redux).

---

## How to present (important)

**Do not judge icons in isolation.** Always show the **full chrome strip**:

`Near me` · `My Journeys` · `Menu`

Use [journey-icon-chrome-brief.html](../public/design/journey-icon-chrome-brief.html):

1. Open the file in a browser.
2. For each candidate, paste your SVG into a strip slot (or add a new strip block).
3. Show **idle** and **Journeys active** (accent) states.
4. Optional: dark strip check at the bottom.

Tim will pick from strips that pass the “would I tap this for my saved commute?” test next to Near me.

---

## Deliverable

- Updated HTML (or Figma export linked from that page) with strips for families 1–3  
- One-line note per option (what it means)  
- Your recommended pick + why (one sentence)

**Hard rule for anyone presenting options (Simon or Jim):** never send Tim a lone 24×24 icon. Always the full chrome strip (Near me · My Journeys · Menu), idle + Journeys-active.

Reply in chat with the option IDs (e.g. `A2`, `B1`) once Tim has browsed the strips.
