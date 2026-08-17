# FB-23 Phase 5 — Mark QA checklist (2.4.0)

**Feature:** Route vs Commute + Q7 four-tab chrome  
**Test branch:** `cursor/fb-23-phase-4-native` (phases 1–4 + Q7 chrome)  
**Product brief:** `docs/jim-brief-fb-23-route-vs-commute.md`  
**Design:** `docs/fb-23-four-tab-chrome-design.md`  
**Ship gate:** Full `npm run test:pre-release` (2.4.0 is a minor release, not a patch)

### Build scope

| In this build | Notes |
|---------------|--------|
| Phases 1–4 | Model, list badges, route hero, native/widget |
| **Q7** | **Near me · My Routes · My Journeys · Menu** + dedicated route screen |
| **Q8** | Platform destination filter (strict; Perth ≠ Fremantle) |

### Automated script map

| Script | Covers (checklist) | Tier |
|--------|-------------------|------|
| `fb-23-phase-1-model.mjs` | Migration reset, route field strip, upgrade | Release |
| `fb-23-phase-3-hero.mjs` | Route board, commute midpoint schedule | Release |
| `fb-23-auto-selection.mjs` | §4 auto-selection (clock fixture) | Release |
| `fb-23-phase-4-native.mjs` | Android widget/reminder unit tests | Release |
| `journey-kind.mjs` | Route vs commute inference | Release |
| `add-journey-btn.mjs` | Routes library + two-field editor | Release |
| `fb-23-web.mjs` | §2a chrome/libraries, §2 create, §3 route hero, switcher split | Release |
| `fb-23-route-destination-filter.mjs` | §2.2 Q8 Fremantle/Perth filter | Release |
| `nearby-pin-notify-label.mjs` | Pin leave-card copy/layout regression | Smoke |
| `smoke-browser.mjs` | Commute regressions (§7 partial) | Smoke |

**Still manual (Mark):** widget priority table §5, reminders §6, device APK, Maestro.

---

## 0. Setup

- [ ] Pull latest: `git fetch origin && git checkout cursor/fb-23-phase-4-native && git pull`
- [ ] Build and install APK on a **physical device** (SM-S926B or equivalent)
- [ ] For web scripts: `npm start` (port 3000)
- [ ] **Expected on first launch after upgrade:** all saved journeys are wiped (`settingsSchemaVersion` 2). Not a bug.

---

## 1. Automated gates (green before device testing)

**FB-23 scripts**

```bash
node qa/fb-23-phase-1-model.mjs
node qa/fb-23-phase-3-hero.mjs
node qa/fb-23-auto-selection.mjs
node qa/fb-23-phase-4-native.mjs
node qa/journey-kind.mjs
node qa/add-journey-btn.mjs
node qa/fb-23-web.mjs
node qa/fb-23-route-destination-filter.mjs
node qa/nearby-pin-notify-label.mjs
```

- [ ] Phase 1 model — PASS
- [ ] Phase 3 hero — PASS
- [ ] Auto-selection §4 — PASS
- [ ] Phase 4 native — PASS (SKIP locally if no Java; CI must pass)
- [ ] Journey kind — PASS
- [ ] Add a route button — PASS
- [ ] FB-23 web (chrome, libraries, switcher) — PASS
- [ ] Q8 destination filter — PASS
- [ ] Near me pin remind label — PASS

**Full release gate**

```bash
npm run test:pre-release
# with device connected:
npm run test:pre-release -- --with-maestro
```

- [ ] `test:pre-release` — PASS
- [ ] Maestro smoke — PASS (if device attached)

---

## 2a. Chrome & navigation (Q7)

| # | Check |
|---|-------|
| 2a.1 | Top chrome shows **Near me · My Routes · My Journeys · Menu** (four labelled icons, LTR) |
| 2a.2 | **My Routes** — Routes library only; **Route** badge; row label `Station → Direction` (single line) |
| 2a.3 | Routes library title **Routes** — primary **Add a route** only; **no** Morning/Evening template chips |
| 2a.4 | **Add a route** opens route screen: **station + Trains to** (Q8) — **no name**, no Schedule, no Target, no Remind me |
| 2a.5 | Edit route → same two-field screen; Save / Delete work |
| 2a.6 | **My Journeys** — Journeys library only; **Journey** badge; subtitle `Station → Direction` + window/Target summary |
| 2a.7 | Journeys library title **Journeys** — **Add a journey** + Morning / Evening template chips |
| 2a.8 | No legacy **Commutes** chrome tab or `#commutes-btn` |
| 2a.9 | Switching tabs: Near me board vs route hero vs journey hero behave sensibly |
| 2a.10 | Route switcher shows **routes only**; journey switcher shows **journeys only** |

- [ ] 2a.1–2a.10 all pass

---

## 2. Create flows (per-tab)

| # | Route | Commute |
|---|-------|---------|
| 2.1 | **Add a route** — station + **Trains to** (platform sign destination) | **Set up a commute** — wizard or full form |
| 2.2 | Fremantle route **excludes** Perth-terminating trains (Q8 strict filter) | Target train, active hours, reminders work as today |
| 2.3 | Reopen route — still two fields only | Full commute form unchanged |

- [ ] 2.1–2.3 all pass

---

## 3. Hero (in-app)

| # | Route | Commute |
|---|-------|---------|
| 3.1 | Hero = **departure board** (upcoming trains) | Pin / leave-by unchanged |
| 3.2 | **No pin** button | Pin works (single-tap after swipe) |
| 3.3 | **No leave card** | Leave-by ladder (grey → amber → red) |
| 3.4 | Switcher: routes only | Switcher: commutes only |
| 3.5 | Route always selectable | Commute outside window → disabled + “Outside active hours” |

- [ ] 3.1–3.5 all pass

---

## 4. Auto-selection

Automated: `node qa/fb-23-auto-selection.mjs` (uses `?test=1&clock=HH:MM&day=1` fixture).

- [ ] Midday, no commute in window: app does **not** auto-select a route
- [ ] Commute in active window: auto-selects that commute
- [ ] Two commutes in window, both with Target train: switches at **midpoint** between targets
- [ ] Route only: manual switch shows route board; no auto-schedule

---

## 5. Widget (priority table — brief Q5)

| Priority | Scenario | Expected |
|----------|----------|----------|
| 1 | Near me pin holding | Pinned Near me train |
| 2 | Journey pin holding | Pinned journey train |
| 3 | Commute in active window | Commute leave-by / target face |
| 4 | No commute in window; **active journey is a route** | Route next train(s), **no leave-by** |
| 5 | Outside hours, commutes configured | Idle next-commute preview |

Test small + medium widget if you can.

- [ ] 5.1–5.5 all pass

---

## 6. Reminders (commute-only)

- [ ] Route: no Remind me / no alarms scheduled
- [ ] Commute with Remind me on: reminders arm as before
- [ ] Routes not treated as reminder targets anywhere in UI

---

## 7. Regression

- [ ] Near me pin + skip trains
- [ ] Commute pin + target train
- [ ] Leave-by countdown + “Leave now” grace
- [ ] Delete last route / commute → sensible empty state per tab
- [ ] Widget handoff when train departs
- [ ] Pro widget lock face (if testable)

---

## 8. Migration smoke

- [ ] Upgrade over build with existing journeys → journeys cleared on first open
- [ ] Fresh install → route + commute survive restart
- [ ] No broken layout / missing screens after `cap sync`

---

## 9. Sign-off

| Item | Mark | Date |
|------|------|------|
| Automated gates green (§1) | ☐ | |
| Chrome & navigation §2a pass | ☐ | |
| Device matrix §2–§6 pass | ☐ | |
| Regression §7–§8 pass | ☐ | |
| OK to merge FB-23 stack to `master` | ☐ | |

**Merge order (after sign-off):**  
`phase-1-model` → `phase-2-ui` → `phase-3-hero` → `phase-4-native` → one PR to `master` *(Q7 chrome on same release branch)*

**Do not merge to `master` until all rows above are complete.**

---

## Tester release notes (closed test blurb)

```
2.4.0 — Routes and journeys

Important: saved journeys were cleared — please set up again.

Routes & Journeys tabs
• Add a route — pick station and direction for a quick departure board
• Add a journey — morning/evening templates with Target train, active hours, and reminders
• Routes and journeys show a type badge in the list

Widget
• Can show a saved route when you don't have an active journey

Please try: create one route and one journey from the new tabs, check the widget,
and confirm reminders only apply to journeys.
```
