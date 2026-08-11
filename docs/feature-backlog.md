# Next Train — future feature backlog

**Owner:** Tim (product)  
**Purpose:** Ideas that are **not** current sprint / Jim briefs. Add here instead of mixing into live specs.  
**Related:** `docs/stickiness-ideas.md` (engagement ranked), `docs/city-2-bookmarks.md` (AU city #2 research), `docs/business-marketing-plan.md`, `docs/undecided-issues.md` (open product forks)

**How to use:** Append rows. Promote to a `docs/jim-brief-*.md` only when ready to build. Do not treat this list as committed roadmap dates.

---

## Widget / commute glance

| ID | Idea | Notes | Status |
|----|------|-------|--------|
| **FB-06** | **Widget/app live = preferred-or-later** | **Superseded 2026-08-11 by U-11 (lock B).** Was: live face = first train at/after preferred. **New:** live face = true next train; Leave By only for preferred or user-chosen (swipe/Next). Revert/replace `resolveActiveNextTrip` / `applyPreferredOrLaterFilter` when briefed. | Superseded — see U-11 |
| **FB-08** | ~~App Leave By vs widget preferred gate~~ | **Locked U-12 → 1** — Gate app Leave By like widget. **Promoted** → `docs/jim-brief-leave-by-preferred-gate.md` | Briefed |

---

## Appearance & chrome

| ID | Idea | Notes | Status |
|----|------|-------|--------|
| **FB-01** | **Colour scheme / theme** — System / Light / Dark | Menu setting later. Full app theme (surfaces, type, chrome, dialogs; consider widget). **Not** “Dark strip” as a third product look — that was icon-preview only. Skip until post-launch polish; if built, follow OS (`System`) + Light + Dark only. | Backlog |
| **FB-04** | ~~Unsupported region~~ | **Promoted** → `docs/jim-brief-unsupported-region.md` (flag + block Near me; journeys OK) | Briefed |

---

## Geography / data

| ID | Idea | Notes | Status |
|----|------|-------|--------|
| **FB-02** | **Other Australian cities** | Expand beyond Perth Transperth. First candidate research: Sydney vs Melbourne — see `docs/city-2-bookmarks.md`. Same product job (leave / next train / journeys); local API + ToS + competition checks. **Depends on** station typeahead (`docs/jim-brief-station-typeahead.md`) shipping first or with city 2. | Backlog |
| **FB-03** | **Any city with a train API** | Longer-term: city pack / adapter model for any metro that exposes a reliable live (or schedule) train API. Needs multi-city architecture, station graphs, and store listing strategy per region — not a quick locale swap. | Backlog |
| **FB-05** | ~~Station type-to-filter~~ | **Promoted** → `docs/jim-brief-station-typeahead.md` (P2) | Briefed |
| **FB-07** | **Process: find + merge same-line directions** | Transperth returns **per-train terminals** (e.g. Whitfords / Clarkson / Butler / Yanchep), so pickers show duplicate “directions” that are one line. We already patch via `LINE_DESTINATION_GROUPS` / briefs (`jim-brief-yanchep-whitfords-direction.md`, `jim-brief-direction-line-groups.md`). **Need a repeatable process:** audit live `/api/directions` per major hub; detect co-listed terminals on the same corridor; decide canonical label + members; update server + client groups + QA; revisit when lines extend or short-works change. Without this, journey setup and live filters keep confusing riders. | Backlog |

---

## Also parked elsewhere (pointers)

| Topic | Where |
|-------|--------|
| Stickiness / notifications / rituals | `docs/stickiness-ideas.md` |
| Widget later (Live Activity, etc.) | `docs/widget-homescreen.md` §13 |
| Widget preferred-or-later live (FB-06) | `docs/feature-backlog.md` |
| Direction line groups (one-off merges) | `docs/jim-brief-direction-line-groups.md` |
| City #2 research links | `docs/city-2-bookmarks.md` |

---

## Add next

_When something comes up in design chat (“not now”), add a row here with a one-line note and link any related brief._
