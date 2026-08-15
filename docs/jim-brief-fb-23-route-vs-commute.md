# Jim brief: Route vs Commute (FB-23)

**For:** Jim (implement) · Simon (design) · Mark (QA)  
**From:** Tim (product)  
**Status:** **Locked (Tim, 15 Aug 2026)** — Jim Phase 1/2 may start  
**Release:** **v2.4.0** (after **2.3.0** ships; public go-live may slip to include this)  
**Backlog:** **FB-23**  
**Depends on:** FB-27 4.1 (`journeys[].kind` in `journey-model.js` — **done** on master)  
**Related:** `docs/feature-backlog.md` FB-21/22 (after FB-23) · `docs/fb-27-phase-4-design.md` · `docs/chrome-modes-and-labels.md` · `docs/undecided-issues.md` U-15  
**Out of scope:** Renaming **Target train** to “usual train”; monetization gating by type; second My Journeys tab; city #2; FB-01 theme

---

## 1. Product rule (one sentence)

**My Journeys** holds two intentional types — **Route** (saved station + direction board) and **Commute** (usual train + leave-by, reminders, pin, widget band) — in one list, with different create flows, detail forms, and hero behaviour.

**Why:** Today every “journey” asks for Active hours, Target train, and Remind me even when the user only wanted a saved board. That overloads one shape with two mental models and confuses first-time setup.

---

## 2. Already locked (do not re-debate in code)

| Topic | Lock |
|-------|------|
| Storage | Same `settings.journeys[]`; add/use `kind: "route"` \| `"commute"` |
| Chrome | One **My Journeys** tab (no second tab) |
| **Route** | Station + direction; board-style face; **no** Active hours, Target train, Remind me, or leave-by card |
| **Commute** | Full existing commute form: Active hours, Target train, Remind me, pin, leave-by, template wizard |
| Upgrade | Route → Commute in one action if cheap (**yes** — ship v1) |
| Widget | **Any** saved route **or** active commute (not commute-only) |
| Overlap | Two commutes same morning → auto-switch at **midpoint** between Target train times |
| Copy | Keep **Target train** in UI (not “usual train”) |
| Monetization | All features free + ads; lifetime remove-ads only; no route/commute count gating |
| Active hours UI | Keep explicit Active from/until on **commutes** for v1; hidden padding from Target (±60 / −90+45) = **FB-21 after FB-23** |
| Near me | Unchanged — ephemeral, not a journey type |

---

## 3. Kind inference & migration

### New journeys (always)

`inferJourneyKind()` in `public/journey-model.js` — used at create/save when `kind` not explicit:

| Condition | `kind` |
|-----------|--------|
| Explicit `kind` on object | Use as-is |
| `templateKey` is `morning` or `evening` | `commute` |
| Non-empty `preferredTrainTime` | `commute` |
| `remindMe` true | `commute` |
| Else | `route` |

### Existing testers (locked Q3)

**No legacy migration.** On first app load after upgrading to **2.4.0**, run a one-time settings migration that:

- Clears `settings.journeys` → `[]`
- Clears `settings.activeJourneyId`
- Clears journey-related widget snapshot / pin session keys as needed
- Bumps a `settingsMigrationVersion` (or equivalent) so it runs once

**Release notes:** tell closed testers their saved journeys were reset — set up again with **Save a route** or **Set up a commute**.

**Public launch later:** if real users exist before FB-23, revisit inference backfill (old Q3 A/B) — not needed for current closed-test cohort.

### Route normalize (locked Q4)

On save, strip commute-only fields from routes: `defaultFrom`, `defaultUntil`, `preferredTrainTime`, `remindMe` / `remindDays`, pin override fields, `templateKey`.

**API** (extend `window.nextTrainJourneyModel`):

- `isCommuteJourney(j)` / `isRouteJourney(j)` — exist today
- `upgradeRouteToCommute(j)` — new; sets `kind: "commute"`, applies morning-style defaults or opens wizard
- `normalizeJourney(raw)` — enforce kind-specific fields

---

## 4. Tim — locked decisions (15 Aug 2026)

### Q1 — Route hero: what does Journey mode show for a route?

| | Option | Implication |
|---|--------|-------------|
| ☑ | **A** — **Departure board** (list of upcoming trains, like Near me but fixed station/direction) | Clear “saved board” job; reuses board rendering; more work than single next |
| ☐ | **B** — **Single next train** only (one row + optional swipe) | Simpler; overlaps Near me — weaker reason to save a route |

**Tim’s lock:** **A**

---

### Q2 — When is a route shown in Journey mode?

| | Option | Implication |
|---|--------|-------------|
| ☑ | **A** — **Manual only** — user taps Journeys / switcher; routes never auto-steal the screen from Near me | Commutes still auto-show in Active hours; routes are on-demand |
| ☐ | **B** — Routes auto-show if `activeJourneyId` is a route and user was last on Journey mode | Slightly stickier; may surprise users leaving Near me |

**Tim’s lock:** **A**

---

### Q3 — Migration: existing tester journeys

| | Option | Implication |
|---|--------|-------------|
| ☐ | **A** — Infer `kind` on existing journeys (§3 table) | No data loss; edge cases |
| ☐ | **B** — Infer + Active hours → commute | Broader commute class |
| ☑ | **D** — **Closed-test reset** — wipe `journeys[]` on first 2.4.0 load; testers set up again | Simplest; OK for current tester cohort |

**Tim’s lock:** **D — reset all journeys on upgrade to 2.4.0**

---

### Q4 — Route save: strip commute-only fields?

| | Option | Implication |
|---|--------|-------------|
| ☑ | **A** — **Yes** — `normalizeJourney` clears commute fields on routes every save | Clean data; UI can’t leave orphan target on a route |
| ☐ | **B** — **Hide in UI only** — keep legacy fields in storage | Messier model |

**Tim’s lock:** **A**

---

### Q5 — Widget: which journey when several are saved?

Priority order (proposal — confirm or edit):

| Priority | Source | Face |
|----------|--------|------|
| 1 | Near me pin holding | Pinned Near me train (unchanged) |
| 2 | Journey pin holding | Pinned journey train (unchanged) |
| 3 | Commute in Active window | Commute leave-by / target face |
| 4 | `activeJourneyId` is a **route** | Route next train(s) per Q1 |
| 5 | Outside hours, commutes configured | Existing idle / next-commute preview (unchanged) |

| | Option | Implication |
|---|--------|-------------|
| ☑ | **A** — **Adopt priority table above** | Commute wins in window; route fills gap when user picked one |
| ☐ | **B** — Widget **never** shows routes in v1 | Contradicts “widget any route” lock |

**Tim’s lock:** **A**

---

### Q6 — Midpoint overlap: when do two commutes auto-switch?

| | Option | Implication |
|---|--------|-------------|
| ☑ | **A** — Both commutes **in Active window now** (same day) **and** both have **Target train** set → owner switches at midpoint between the two target times | Matches backlog |
| ☐ | **B** — Overlapping Active hours only | Less precise |
| ☐ | **C** — **No auto-switch v1** | Contradicts locked overlap rule |

**Tim’s lock:** **A**

---

### Sign-off

| Role | Name | Date |
|------|------|------|
| Product | Tim | 15 Aug 2026 |
| Design | Simon | |
| Android / web | Jim | |

---

## 5. UX spec (after §4 locked)

### 5.1 Create entry (replaces ambiguous template row)

**My Journeys** list header:

```
[ Save a route ]          → blank route: name, station, direction, save
[ Set up a commute ]      → Morning / Evening chips → existing template wizard
```

- Remove standalone **Custom** chip (FB-29 Add journey stays; shortcuts become commute-only).
- **Route** create: no wizard, no Active hours step.

### 5.2 List

- Badge on each row: **Route** | **Commute**
- Route subtitle: `Station → Direction` only
- Commute subtitle: window + Target summary (today’s copy)

### 5.3 Detail form

| Section | Route | Commute |
|---------|-------|---------|
| Name, station, direction | ✓ | ✓ |
| Active from / until | hidden | ✓ |
| Target train | hidden | ✓ |
| Remind me | hidden | ✓ |
| Time to station / leave sliders | hidden | ✓ |
| **Turn into a commute** | ✓ (upgrade CTA) | — |

### 5.4 Commute hero

Unchanged from v2.2.x pin + Target train + leave-by (FB-14 / FB-20).

### 5.5 Route hero

Per **Q1** lock. **No** leave card, **no** pin, **no** Remind me. Swipe/browse per existing train-navigation patterns.

### 5.6 Switcher (≥2 journeys)

- Both types listed; commute outside window shown disabled with “Outside active hours”
- Route always selectable

---

## 6. Implementation phases & parallel work

**Do not block 2.3.0.** FB-23 builds on `cursor/fb-23-*` branches off master after 2.3.0 uploads.

| Phase | Owner | Branch | Deliverable |
|-------|--------|--------|-------------|
| **0** | Tim | this doc | §4 signed |
| **1** | PC / agent | `cursor/fb-23-phase-1-model` | **2.4.0 one-time journey reset**, `normalizeJourney` enforcement, `upgradeRouteToCommute`, native kind helpers, `qa/journey-kind` extended |
| **2** | **Jim** | `cursor/fb-23-phase-2-ui` | Create buttons, list badges, conditional detail form (**parallel** after brief; **merge after Phase 1** for save/upgrade) |
| **3** | PC + Jim | `cursor/fb-23-phase-3-hero` | Route hero, `findScheduledJourneyId` + midpoint, switcher |
| **4** | Jim | `cursor/fb-23-phase-4-native` | `JourneySelector`, `CommuteSchedule`, widget route snapshot, reminders commute-only, iOS parity |
| **5** | Mark | — | `qa/fb-23-*.mjs`, device matrix, `test:pre-release` |

**Jim Phase 2 may start when:** §4 signed + use `isCommuteJourney()` / `isRouteJourney()` for show/hide. **Do not wire save/upgrade until Phase 1 merges.**

---

## 7. Files (primary touch list)

| Area | Files |
|------|--------|
| Model | `public/journey-model.js` |
| Create / edit / list | `public/journey-detail.js`, `public/index.html`, `public/styles/journey-detail.css` |
| Wizard | `public/template-wizard.js` (commute only) |
| Selection / hero | `public/app.js`, `public/train-navigation.js` |
| Android widget | `JourneySelector.java`, `CommuteSchedule.java`, `WidgetDataService.java`, `LeaveReminderScheduler.java` |
| iOS widget | `ios/Shared/JourneySelector.swift`, `CommuteSchedule.swift`, `NextCommutePreview.swift` |
| QA | `qa/journey-kind.mjs`, new `qa/fb-23-*.mjs` |
| Tests | `JourneySelectorTest.java`, `CommuteScheduleTest.java`, `WidgetUiBuilderRobolectricTest` |

---

## 8. QA exit gates (Mark)

| Check | Route | Commute |
|-------|-------|---------|
| Create | Station + direction only; no commute fields saved | Wizard + full form |
| Hero | Board per Q1; no leave/pin | Unchanged pin/leave |
| Auto-show | Per Q2 | In Active window |
| Widget | Per Q5 | In window / pin |
| Reminders dialog | Route not listed | Arms as today |
| Upgrade | Route → commute preserves station/direction | — |
| Overlap | N/A | Two commutes switch at midpoint per Q6 |
| Regression | Near me pin, commute pin, leave-by ladder, delete-last-journey | |

**Automated:** `npm run test:pre-release` + new `qa/fb-23-*.mjs` in release tier when stable.

---

## 9. Release notes (tester-facing draft)

```
2.4.0 — Routes and commutes

Important: saved journeys were cleared — please set up again.

My Journeys
• Save a route — station and direction only, for a quick departure board
• Set up a commute — morning/evening templates with Target train, active hours, and reminders (unchanged job)
• Routes and commutes show a type badge in the list
• Turn a route into a commute when you're ready

Widget
• Can show a saved route when you don't have an active commute

Please try: create one route and one commute, check the widget, and confirm reminders only apply to commutes.
```

---

## 10. Change log

| Date | Note |
|------|------|
| 2026-08-15 | Brief created — six decisions for Tim lock; phases 1–5 for 2.4.0 |
| 2026-08-15 | Tim locked Q1–Q6; Q3 = closed-test journey reset on 2.4.0 upgrade |
