# Undecided issues

**Owner:** Tim (product) / Simon (design)  
**Purpose:** Open product questions — not ready for a Jim brief, not parked as “not now” on the feature backlog.  
**How to use:** Add a row when a design chat leaves a fork unresolved. Promote to `docs/jim-brief-*.md` when locked, or to `docs/feature-backlog.md` if “not now.”

---

## Open

_None._

---

## Resolved (archive)

| ID | Topic | Decision | Date |
|----|-------|----------|------|
| **U-01** | **Overlap — Fix for me: whose hours change?** | **A** — Keep the journey being saved; minimally adjust the *other* journey (current shipped behaviour). No second “adjust these hours” chip. | 2026-08-16 |
| **U-14** | **Target train must sit inside Active hours?** | **Yes** — target time must fall within journey Active from/until. Inline hint while editing; **Save blocked** if outside window (`journey-detail.js`). Routes have no target/active hours. | 2026-08-16 |
| **U-15** | **Route vs Commute — product locks (FB-23)** | **All locked — nothing open.** (1) Route→Commute upgrade **yes if cheap**. (2) Monetization: all features free + ads; lifetime remove-ads / Pro only; no route/commute count gating. (3) Widget works for **any saved route**. (4) Commutes keep **explicit Active from/until** (no hidden auto-window from target). (5) Two commutes same morning → auto-switch at **midpoint** between target times. (6) Copy stays **Target train** (not “usual train”). See `docs/jim-brief-fb-23-route-vs-commute.md`. | 2026-08-16 |
| **U-02** | **Reminders — per-journey toggle lives where?** | **A** — Reminder + Preferred train on journey setup; Menu → Reminder settings = Early Reminder / Pause / schedule only. Brief: `docs/jim-brief-reminders-on-journey.md` | 2026-08-10 |
| **U-03** | **Widget — “Leave N min ago”** | **1** — Keep Leave in / Leave now; **Leave now** for 1 min after leave-by; then **hide** leave (no “ago”). Brief: `docs/jim-brief-widget-hide-leave-when-late.md` | 2026-08-10 |
| **U-04** | **Template wizard — dismiss / resume** | **Resolved** — Scrim no dismiss; **Skip tour**; editable fields under coach. Brief: `docs/jim-brief-template-wizard-skip.md` | 2026-08-10 |
| **U-05** | **After Save, which journey on main screen?** | **Resolved B** — First Save of a **new** journey → show it now (active + manual override). Brief: `docs/jim-brief-new-journey-show-now.md` | 2026-08-10 |
| **U-08** | **Station picker — keyboard vs list** | **Resolved** — List-first (no keyboard on first tap); **Search stations** for typing; hide journey footer while open. Brief: `docs/jim-brief-station-picker-list-first.md` | 2026-08-10 |
| **U-09** | **Widget trust / staleness redesign** | **Resolved / pivoted** — A/B/C shipped; outside hours = **designed idle / next commute** (not all-day live Near me). Brief: `docs/jim-brief-widget-designed-idle.md` | 2026-08-10 |
| **U-10** | **Widget / app — live vs preferred train** | **Superseded 2026-08-11 → U-11** — was preferred-or-later (FB-06). | 2026-08-11 |
| **U-11** | **Next train vs Leave By (preferred)** | **Superseded 2026-08-14 → FB-20** — Journey hero/widget = pin (default Preferred target); secondary Next only if next ≠ pin. Brief: `docs/jim-brief-journey-pin-preferred-target.md`. Old lock B / `jim-brief-leave-by-preferred-gate.md` retired for face. | 2026-08-11 / 2026-08-14 |
| **U-12** | **App Leave By vs widget preferred gate** | **Superseded with U-11 → FB-20** — Leave by follows pin; widget follows pin in Active window. | 2026-08-11 / 2026-08-14 |
| **U-13** | **Target train UI placement + rename** | **Locked** — Always visible; Preferred→Target; idle **TARGET TRAIN**. Soft hint if Target outside Active hours while editing. **Save block** for outside window → **U-14** (Aug 2026). Brief: `docs/jim-brief-preferred-always-visible.md` | 2026-08-11 |
