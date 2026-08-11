# Jim brief: Collapse Whitfords under Yanchep line (Perth outbound)

**For:** Jim  
**From:** Tim (QA / product)  
**Priority:** Low–medium — journey setup clarity, not a crash  
**Related:** `lib/train-times.js`, `public/app.js` (`DIRECTION_ALIASES`, `dedupeDirections`, journey detail direction picker), `/api/directions`

---

## Problem

From **Perth**, the direction picker lists **Whitfords** and **Yanchep** as separate destinations. Both are the **Yanchep line** — some trains terminate at Whitfords, others run through to Yanchep.

Tim’s expectation: outbound direction on that line should feel like **Yanchep** (line identity), not two competing terminals.

**Screenshot:** Perth journey detail — direction list includes Whitfords (selected) and Yanchep among Byford, Claremont, Mandurah, etc.

---

## Why it happens (not an app bug)

Transperth Live Times returns **per-train terminal** strings. `uniqueDestinations()` in `lib/train-times.js` lists every distinct destination. `pickUpcomingTrips()` filters by **exact** destination match — so a journey saved as **Yanchep** never shows Whitfords-terminated trains, and vice versa.

We already collapse Perth cluster names (`Perth Underground` → `Perth`) via `DESTINATION_ALIASES` / `DIRECTION_ALIASES`. Whitfords/Yanchep is the same class of issue.

---

## Recommendation (Tim approved)

**Do not** build a growing per-train exception table.

Use a **small line-destination group** — same pattern as Perth aliases, scoped to known same-line terminals:

| Canonical direction (saved journey) | Also include trips destined |
|-------------------------------------|-----------------------------|
| **Yanchep** | **Whitfords**, **Yanchep** |

### Picker (journey detail + anywhere directions are listed)

- Collapse **Whitfords** → **Yanchep** in `dedupeDirections` / direction API response when both appear from Perth cluster (or globally for outbound: if Yanchep is in the list, drop Whitfords or alias to Yanchep).
- Optional label in picker only: **Yanchep** (no need for “incl. Whitfords” unless you want extra honesty).

### Times / API (`pickUpcomingTrips`)

When journey direction is **Yanchep**, include upcoming trips whose normalized destination is in the group `{ Yanchep, Whitfords }`.

Implement as something like `LINE_DESTINATION_GROUPS` in `lib/train-times.js` (and mirror in `public/app.js` if client-side direction normalization diverges):

```javascript
// Example — extend only when QA finds another line with split terminals
const LINE_DESTINATION_GROUPS = {
  Yanchep: ["Yanchep", "Whitfords"],
};
```

Resolve filter: `direction` → expand to all aliases in group before `pickUpcomingTrips`.

### Scope

- **Perth outbound** is the reported case; grouping is safe because Whitfords-terminated services are a **subset** of the same line (short turns).
- **Inbound** (suburbs → Perth): no change; direction stays **Perth**.
- **Suburban stations** picking direction toward Yanchep: same group logic if both strings appear.
- Add other lines **only** when Tim reports a duplicate (don’t pre-populate the whole network).

### Edge case

Someone who only wants Whitfords short trains is rare. If needed later, power users can still see both in raw API — v1 is one canonical **Yanchep** direction.

---

## Files to touch

| Area | File |
|------|------|
| Destination list from API | `lib/train-times.js` — `uniqueDestinations` or post-process before return |
| Next-train filter | `lib/train-times.js` — `pickUpcomingTrips` (expand group) |
| Client picker | `public/app.js` — `dedupeDirections` / `normalizeDirection` or shared import |
| Aliases (optional) | `DESTINATION_ALIASES` in `lib/train-times.js`, `DIRECTION_ALIASES` in `app.js` |

Keep server and client consistent so web + Capacitor + widget/reminders see the same direction string.

---

## QA acceptance

1. Configure journey **Perth** → direction **Yanchep** (Whitfords not a separate saved option from Perth picker).
2. Main screen shows next train including both through-Yanchep and Whitfords-terminated services that share the line (compare Transperth app or live board at Perth during mixed short/long period).
3. Journey saved as **Yanchep** still works after reload / widget sync.
4. Other directions unchanged (Mandurah, Midland, Fremantle, etc.).
5. Regression: `node qa/smoke-browser.mjs` — no breakage on fixture journeys.

Manual: Tim spot-check at Perth during peak — Yanchep journey should not “miss” obvious short-line trains that Whitfords-only journey used to show (if those trains still matter for his stop).

---

## Out of scope

- Full line topology / per-station “which destinations count” maps.
- Renaming Transperth API fields or station order logic.

---

## Slack-ready

> Perth direction picker: Whitfords + Yanchep duplicate same line. Tim wants canonical **Yanchep** — small `LINE_DESTINATION_GROUPS` (Whitfords + Yanchep), collapse picker, expand `pickUpcomingTrips`. No exception DB. Brief: `docs/jim-brief-yanchep-whitfords-direction.md`.
