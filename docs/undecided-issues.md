# Undecided issues

**Owner:** Tim (product) / Simon (design)  
**Purpose:** Open product questions — not ready for a Jim brief, not parked as “not now” on the feature backlog.  
**How to use:** Add a row when a design chat leaves a fork unresolved. Promote to `docs/jim-brief-*.md` when locked, or to `docs/feature-backlog.md` if “not now.”

---

## Open

| ID | Topic | Options / notes | Related |
|----|-------|-----------------|--------|
| **U-01** | **Overlap — Fix for me: whose hours change?** | **Two options (keep both until locked):** (A) Keep the journey being saved; minimally adjust the *other* journey (current default). (B) Offer a second control to adjust *these* hours instead (minimal trim/slide on the editing journey). May ship as two chips, e.g. **Keep these hours** / **Adjust these hours**. | `docs/jim-brief-journey-overlap-friendly.md` |

---

## Resolved (archive)

| ID | Topic | Decision | Date |
|----|-------|----------|------|
| **U-02** | **Reminders — per-journey toggle lives where?** | **A** — Reminder + Preferred train on journey setup; Menu → Reminder settings = Early Reminder / Pause / schedule only. Brief: `docs/jim-brief-reminders-on-journey.md` | 2026-08-10 |
| **U-03** | **Widget — “Leave N min ago”** | **1** — Keep Leave in / Leave now; **Leave now** for 1 min after leave-by; then **hide** leave (no “ago”). Brief: `docs/jim-brief-widget-hide-leave-when-late.md` | 2026-08-10 |
| **U-04** | **Template wizard — dismiss / resume** | **Resolved** — Scrim no dismiss; **Skip tour**; editable fields under coach. Brief: `docs/jim-brief-template-wizard-skip.md` | 2026-08-10 |
| **U-05** | **After Save, which journey on main screen?** | **Resolved B** — First Save of a **new** journey → show it now (active + manual override). Brief: `docs/jim-brief-new-journey-show-now.md` | 2026-08-10 |
| **U-08** | **Station picker — keyboard vs list** | **Resolved** — List-first (no keyboard on first tap); **Search stations** for typing; hide journey footer while open. Brief: `docs/jim-brief-station-picker-list-first.md` | 2026-08-10 |
| **U-09** | **Widget trust / staleness redesign** | **Resolved / pivoted** — A/B/C shipped; outside hours = **designed idle / next commute** (not all-day live Near me). Brief: `docs/jim-brief-widget-designed-idle.md` | 2026-08-10 |
| **U-10** | **Widget / app — live vs preferred train** | **Superseded 2026-08-11 → U-11** — was preferred-or-later (FB-06). | 2026-08-11 |
| **U-11** | **Next train vs Leave By (preferred)** | **Locked B** — Hero = **true next**; Leave By only for preferred or after swipe/Next. Brief: `docs/jim-brief-leave-by-preferred-gate.md` | 2026-08-11 |
| **U-12** | **App Leave By vs widget preferred gate** | **Locked 1** — Gate app Leave By like widget (no Catch this train). Same brief as U-11: `docs/jim-brief-leave-by-preferred-gate.md`. FB-08 promoted. | 2026-08-11 |
| **U-13** | **Target train UI placement + rename** | **Locked** — Always visible; Preferred→Target; idle **TARGET TRAIN**. Soft hint if Target outside Active hours (no Save block). Brief: `docs/jim-brief-preferred-always-visible.md` | 2026-08-11 |
