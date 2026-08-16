# FB-23 — Four-tab chrome & Routes screen (design)

**Author:** Simon  
**For:** Jim (build) · Tim (product) · Mark (QA)  
**Status:** **Locked (Tim, 15 Aug 2026)** — Q7 chrome + route screen in build  
**Product lock:** `jim-brief-fb-23-route-vs-commute.md` Q7  
**Date:** 15 Aug 2026

---

## 1. Principle

**Near me** = right now, wherever I am.  
**Routes** = boards I’ve saved (station + direction).  
**Commutes** = trains I aim for (target, leave-by, reminders).  
**Menu** = app settings, not travel.

Routes and commutes are **peers in the chrome**, not mixed in one “journeys” bucket.

---

## 2. Top chrome (four icons)

**Placement:** unchanged — top bar, icon + caption under each (Birdies clarity).  
**Order (LTR):** Near me · Routes · Commutes · Menu

```
Next Train
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  ⌖      │ │  ═▶     │ │  🕐*    │ │  ☰      │
│Near me  │ │ Routes  │ │Commutes │ │ Menu    │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

\* Commutes icon: reuse existing “two nodes + path” journeys glyph OR a simple clock-on-track — Jim picks whichever reads at 24px; caption is **Commutes** not “Journeys”.

**Routes icon suggestion:** horizontal line + arrow (departure board / line direction) — distinct from the commute “journey path” icon.

### Active state

| Tab | `aria-pressed` when… |
|-----|----------------------|
| Near me | Nearby mode (ephemeral board) |
| Routes | Routes **live** mode (viewing a saved route board) OR Routes **library** sheet open |
| Commutes | Commute **live** mode OR Commutes **library** sheet open |
| Menu | Never a live mode — `aria-expanded` while menu open only |

Accent on icon + caption for the active travel tab (same tokens as today).

### Tap behaviour

| Control | First tap | Second tap (same tab) |
|---------|-----------|------------------------|
| Near me | Enter Nearby; recenter if already there | Recenter + refresh (unchanged) |
| Routes | If ≥1 route → **live route board** (last/active route). If 0 → **Routes library** empty state | Open **Routes library** (list) |
| Commutes | If ≥1 commute → **live commute** (schedule rules). If 0 → **Commutes library** empty | Open **Commutes library** (list) |
| Menu | Open menu sheet | — |

**Retire:** “My Journeys” chrome label, second-tap-on-journeys shortcut, journeys icon pointing at combined list.

---

## 3. Routes — three surfaces only

### A. Routes library (sheet)

**Title:** Routes  
**Subtitle:** *See the next train for a station and direction you check often.*

**Empty**

- Title: **No routes yet**
- Body: *Save a station and direction to check the next trains anytime.*
- Primary: **Add a route**
- **No** Morning/Evening template chips (commutes only)

**List row**

- Line 1: **`Station → Direction`** (auto label — no user name)
- Trailing: **Route** badge
- Tap row → set active route → close sheet → **live route board**

**Footer:** **Done** (same as journeys dialog today)

**FAB / header action:** **Add a route** (primary in empty/list footer area — no template row)

### B. Route editor (full-screen sheet or dedicated view inside Routes flow)

**Not** the commute detail form. **Not** under “← Journeys”.

**Title:** Save route / Edit route  
**Back:** ← Routes

| Field | Notes |
|-------|--------|
| Departure station | Combobox + **Use nearest station** |
| **Trains to** | Select; hint: *Match the destination on the platform sign.* (Q8 — strict board filter; short-turn groups only) |

**No name field** — label derived on save as `Station → Direction`.

**Footer actions**

- Primary: **Save**
- Destructive (edit only): **Delete route** (text, bottom)

**Explicitly absent:** Active days, Active from/until, Target train, Time to station, Remind me, Upgrade to commute on this screen (upgrade lives on row overflow or Commutes tab copy — see §6).

### C. Live route board (main canvas)

Reuse shipped route hero (Phase 3):

- Context line: `Station → Direction` only
- Hero: **Next train** countdown (no pin, no leave card)
- Section: **Upcoming departures** list
- Pencil on context row → Route editor

---

## 4. Commutes — parallel structure

Rename journeys dialog → **Commutes library**. Same list patterns as today but **commute-only** rows (filter `kind: commute`).

**Empty**

- Title: **No commutes yet**
- Body: *Set up a regular trip — target train, active hours, and leave-by.*
- Primary: **Set up a commute**
- Secondary chips: Morning into town · Evening home (unchanged wizard)

**Live commute canvas:** unchanged (pin, leave card, switcher between commutes in window only).

**Edit:** existing commute detail form; back label **← Commutes**.

---

## 5. Switcher rules (live canvas)

| Mode | Switcher shows |
|------|----------------|
| Route live | Other **routes** only (+ optional “Near me” not in switcher — use chrome) |
| Commute live | Other **commutes** only; outside-window commutes disabled + hint |

Never mix route and commute in one switcher dropdown.

---

## 6. Route → Commute upgrade

Not on the minimal route editor v1.

**v1 placement:** Commutes library empty state hint: *Have a route? Open it and turn it into a commute* — **defer** if tight.

**Better v1:** overflow on route row (⋯) → **Turn into commute** → opens commute wizard with station/direction prefilled.

---

## 7. Copy cheat sheet

| Old | New |
|-----|-----|
| My Journeys | **Routes** or **Commutes** (context-specific) |
| Add journey | **Add a route** / **Set up a commute** |
| Journey (generic) | **Route** or **Commute** |
| ← Journeys | **← Routes** / **← Commutes** |

---

## 8. Visual tokens

- Reuse `journey-kind-badge--route` / `--commute` everywhere.
- Routes library + Commutes library: same sheet chrome as today’s `journeys-dialog` (backdrop, rounded sheet, Done footer).
- Route editor: same field components as journey detail **route core** block only — no new inputs.

---

## 9. QA snapshots for Mark

1. Chrome shows four labels; no “My Journeys”
2. Add route: **two fields only** (station + direction), saves, shows on Routes library as `Station → Direction`
3. Tap route → board hero, no pin/leave
4. Commute flow unchanged; lives under Commutes tab
5. Menu unchanged; no route/commute list in menu

---

## 10. Out of scope (Simon)

- Bottom tab bar
- Separate route count limits
- Map / line diagram iconography beyond simple chrome glyphs
- Renaming Target train
