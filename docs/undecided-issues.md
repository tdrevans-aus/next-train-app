# Undecided issues

**Owner:** Tim (product) / Simon (design)  
**Purpose:** Open product questions — not ready for a Jim brief, not parked as “not now” on the feature backlog.  
**How to use:** Add a row when a design chat leaves a fork unresolved. Promote to `docs/jim-brief-*.md` when locked, or to `docs/feature-backlog.md` if “not now.”

---

## Open

| ID | Topic | Options / notes | Related |
|----|-------|-----------------|--------|
| **U-01** | **Overlap — Fix for me: whose hours change?** | **Two options (keep both until locked):** (A) Keep the journey being saved; minimally adjust the *other* journey (current default). (B) Offer a second control to adjust *these* hours instead (minimal trim/slide on the editing journey). May ship as two chips, e.g. **Keep these hours** / **Adjust these hours**. | `docs/jim-brief-journey-overlap-friendly.md` |
| **U-14** | **Target train must sit inside Active hours?** | **Likely superseded by FB-23** (Route vs Commute): commutes get derived window from usual train; routes have no window. Until then: U-13 soft hint only. | **FB-23**, **FB-21**, **FB-22** |
| **U-15** | **Route vs Commute — product locks** | **Locked (Tim, Aug 2026):** See **FB-23** — upgrade if cheap; ads-only monetization; widget any route. **Padding:** keep explicit Active from/until for now; revisit hidden usual-train band **after** Route/Commute split. **Overlap:** two commutes same morning → switch at **midpoint** between usual trains. **Copy:** keep **Target train** (not “usual train”) for now. | **FB-23** |

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
| **U-11** | **Next train vs Leave By (preferred)** | **Superseded 2026-08-14 → FB-20** — Journey hero/widget = pin (default Preferred target); secondary Next only if next ≠ pin. Brief: `docs/jim-brief-journey-pin-preferred-target.md`. Old lock B / `jim-brief-leave-by-preferred-gate.md` retired for face. | 2026-08-11 / 2026-08-14 |
| **U-12** | **App Leave By vs widget preferred gate** | **Superseded with U-11 → FB-20** — Leave by follows pin; widget follows pin in Active window. | 2026-08-11 / 2026-08-14 |
| **U-13** | **Target train UI placement + rename** | **Locked** — Always visible; Preferred→Target; idle **TARGET TRAIN**. Soft hint if Target outside Active hours (no Save block). Brief: `docs/jim-brief-preferred-always-visible.md` | 2026-08-11 |
