# Next Train — future feature backlog

**Owner:** Tim (product)  
**Purpose:** Ideas that are **not** current sprint / Jim briefs. Add here instead of mixing into live specs.  
**Related:** `docs/stickiness-ideas.md` (engagement ranked), `docs/city-2-bookmarks.md` (AU city #2 research), `docs/business-marketing-plan.md`, `docs/undecided-issues.md` (open product forks)

**How to use:** Append rows. Promote to a `docs/jim-brief-*.md` only when ready to build. Do not treat this list as committed roadmap dates. **Version targets:** patch hotfixes vs minor feature drops — see `docs/release-versioning.md`.

---

## Widget / commute glance

| ID | Idea | Notes | Status |
|----|------|-------|--------|
| **FB-06** | **Widget/app live = preferred-or-later** | **Superseded 2026-08-11 by U-11 (lock B).** Was: live face = first train at/after preferred. **New:** live face = true next train; Leave By only for preferred or user-chosen (swipe/Next). `applyPreferredOrLaterFilter` removed from app (Aug 2026); native true-next helper is `resolveTrueNextTrip`. | Superseded — see U-11 |
| **FB-08** | ~~App Leave By vs widget preferred gate~~ | **Locked U-12 → 1** — Gate app Leave By like widget. **Promoted** → `docs/jim-brief-leave-by-preferred-gate.md` | Briefed |
| **FB-43** | **Widget real estate redesign** | Revisit layout and information hierarchy on **2×1** (default) and **medium** — twin-face columns, station placement, label density, resize behaviour. **Not** second-by-second countdown (stays minute-level; see `docs/widget-homescreen.md` non-goals). Broader trust/staleness contract: `docs/widget-redesign-v2.md`. **Phase 1 done** (22 Aug 2026): tap→NOW fix, Target/Pinned train labels, empty copy. **Phase 1.5:** live 2×1 bottom route — `docs/jim-brief-widget-2x1-live-route.md` (reverts compact route fold). Phase 2 (3×1 / 2×2) when Tim sends screenshots. | **Phase 1.5** — **Aug 2026** |

---

## Appearance & chrome

| ID | Idea | Notes | Status |
|----|------|-------|--------|
| **FB-01** | **Colour scheme / theme** — System / Light / Dark | **Shipped:** Menu → Appearance chips; default System; widget skins separate. Design: `docs/simon-brief-app-theme.md`. | **Implemented** (22 Aug 2026) |
| **FB-35** | **Widget colour presets + System match** | **Widget-only** curated skins (8 presets + Match system on Android 12+). Marketing: home-screen curation. Not paywalled. Brief: `docs/jim-brief-widget-colour-presets.md`. | **Implemented** |
| **FB-36** | **Widget background opacity + transparent card** | Extends FB-35: 0–100% bg opacity, Transparent card toggle, text legibility on busy wallpapers. Brief: `docs/jim-brief-widget-appearance-opacity.md`. | Implemented (2026-08-16) |
| **FB-37** | **Widget setup on placement + wallpaper preview** | `APPWIDGET_CONFIGURE` on drag-add; hero preview on Dark/Light/Vibrant backdrops; pin-path setup parity. Brief: `docs/jim-brief-widget-configure-on-drop.md`. | Implemented (2026-08-16) |
| **FB-38** | **Match system — Material You dynamic colours** | Absorbed into **FB-40** `wallpaper` mode. Brief: `docs/jim-brief-widget-material-you-system.md`. | Superseded → **FB-40** |
| **FB-39** | **Widget style packs** | Classic / Minimal / Bold layout faces. Brief: `docs/jim-brief-widget-style-packs.md`. | **Dropped** (Aug 2026) — Tim; one Classic face is enough |
| **FB-40** | **Widget — Jetpack Glance (blend-first)** | Replace RemoteViews; **Blend in / Match wallpaper / Brand teal** only (drop 8-preset grid). Brief: `docs/jim-brief-widget-glance.md`. | Implemented |
| **FB-42** | **Widget background colour row** | Second row under **Blend** mode — FB-35 presets (Ocean, Midnight, …) + opacity; hidden for Wallpaper/Brand. Brief: `docs/jim-brief-widget-background-colours.md`. Further widget layout in **FB-43**. | **Done** (22 Aug 2026) |
| **FB-04** | ~~Unsupported region~~ | Shipped: flag + block Near me; journeys OK. Brief: `docs/jim-brief-unsupported-region.md`. | **Done** |

---

## Geography / data

| ID | Idea | Notes | Status |
|----|------|-------|--------|
| **FB-02** | **Other Australian cities** | Expand beyond Perth Transperth. First candidate research: Sydney vs Melbourne — see `docs/city-2-bookmarks.md`. Same product job (leave / next train / journeys); local API + ToS + competition checks. Perth station picker (**FB-05**) already shipped; reuse for city-2 lists. | Backlog |
| **FB-03** | **Any city with a train API** | Longer-term: city pack / adapter model for any metro that exposes a reliable live (or schedule) train API. Needs multi-city architecture, station graphs, and store listing strategy per region — not a quick locale swap. | Backlog |
| **FB-05** | **Station type-to-filter** | Combobox on journey detail + Near me; list-first open, **Search stations** to type. Briefs: `docs/jim-brief-station-typeahead.md`, `docs/jim-brief-station-picker-list-first.md`. | **Done** (Aug 2026) |
| **FB-07** | **Process: find + merge same-line directions** | **v8:** heuristic + Perth line map shipped (`docs/direction-collapse-heuristic.md`, `lib/cities/perth/line-map.json`). Groups now include Butler + Fremantle←Claremont. Re-run when expanding cities. | Done — **v8** (process); city-2 still backlog |

---

## Release / Play ship

| ID | Idea | Notes | Status |
|----|------|-------|--------|
| **FB-09** | **R8 + Play deobfuscation mapping** | Process doc only. **v3 public ships minify off.** Implementation parked as **FB-45**. Brief: `docs/jim-brief-play-hygiene.md` §4. | **Done** — process absorbed by FB-41; enable later = FB-45 |
| **FB-10** | **Play native debug symbols** | `debugSymbolLevel 'SYMBOL_TABLE'` in release. Consolidated: `docs/jim-brief-play-hygiene.md` **FB-41** §3. | **Done** — absorbed by FB-41 |
| **FB-41** | **Play hygiene — public launch gate** | Native symbols + `release:prep` + extended `test:pre-upload`; R8 process doc. Before public v3. Brief: `docs/jim-brief-play-hygiene.md`. | **Done** (2026-08-16) |
| **FB-45** | **Enable R8 / minify after public is stable** | First public stays `minifyEnabled false` (Play deobfuscation warning is noise until then). Later dedicated PR: keep rules (Capacitor, Billing, AdMob, Glance), `minifyEnabled true`, mapping in AAB + archive, flip `test:pre-upload` minify guard, device smoke (IAP / ads / widget / reminders). Optional `shrinkResources` follow-up. Trigger: public stable for a release or two, or AAB size / Play warning becomes worth the keep-rule risk. Do not drive-by flip minify. | Backlog — **Aug 2026** |
| **FB-11** | **v7: Nearby onboarding gate + 15s locate timeout** | Coach only after settled Near me face (`isNearbyFaceReadyForOnboarding`); `clearOnboardingSchedule` on entry; 15s locate timeout + emulator error copy; stale GPS cache cleared on unsupported region. Brief: `docs/jim-brief-closed-aab-v6-ship-gate.md` §v7. | **Done** (Aug 2026) |

---

## Journeys / leave alerts

| ID | Idea | Notes | Status |
|----|------|-------|--------|
| **FB-12** | **Target train gap warning / smarter pick** | **v8 shipped (option A):** keep at-or-after; warn when gap ≥ 25 min (`preferredHintForJourney`). Options B/C (nearest / confirm) **dropped** 21 Aug 2026 — revisit only if user feedback says the at-or-after pick feels wrong. | **Done** — **v8** |
| **FB-13** | **Menu Remove ads** | Shipped: one-time **Remove ads** (A$7.99); widget free; no Pro/trial/founding. | Done |
| **FB-14** | **Near me: Leave By on pinned train** | **v2.2.0.** A1 pin icon + B1 leave card/slider + C2 **Remind me when to leave** + D1 widget follows pin. Brief: `docs/jim-brief-nearby-pin-leave-by.md`. | Briefed — **v2.2.0** |
| **FB-20** | **Journey mode: pin + Preferred target as default face** | **v2.2.0.** Supersedes U-11 B for journey hero/widget: default pin = Preferred target; day override via pin; secondary **Next** line only when next ≠ pin. Keep Active hours. Brief: `docs/jim-brief-journey-pin-preferred-target.md`. | Briefed — **v2.2.0** |
| **FB-17** | ~~Target flag icon + on/off state~~ | **Superseded 2026-08-14** — pin chrome (FB-14 Near me, FB-20 journey) replaces flag. Brief archived: `docs/jim-brief-target-flag-icon.md`. | Superseded |
| **FB-22** | **Enforce Target train inside Active hours** | **Locked U-14:** target time must fall within journey Active from/until; inline hint + Save blocked (`journey-detail.js`). | Done — **Aug 2026** |
| **FB-23** | **My Journeys: Route vs Journey (two types, one tab)** | **Route** = saved station + direction board; **Journey** = usual train + leave-by, reminders, pin, widget band. Four-tab chrome (Near me · Routes · Journeys · Menu). Storage: `journeys[]` + `kind` (`route` \| `journey`). Brief: `docs/jim-brief-fb-23-route-vs-commute.md`. | **Complete** (Aug 2026) |
| **FB-15** | ~~Leave now → Live Countdown morph-in-place~~ | **Dropped** (Tim, Aug 2026) — Leave alarm (FB-34) owns leave-by interrupt; no separate morph-into-strip path. | **Dropped** |
| **FB-34** | **Leave alarm (stopwatch-style) instead of / as well as notification** | **Leave now** is an audible ongoing alarm until dismiss (CATEGORY_ALARM + chronometer + optional full-screen activity). Scheduled with `setAlarmClock` + existing `SCHEDULE_EXACT_ALARM` — **not** `USE_EXACT_ALARM`. Get-ready stays a heads-up. Open: alarm *replaces* notify (yes for Leave now); DND/battery OEM variance; iOS / FB-16 later. | Implemented — **Aug 2026** |
| **FB-16** | **Lock-screen / ongoing “on the way” glance** | After **Leave now** (FB-34), tap **I've left** (in-app or on the alarm) → quiet ongoing shade countdown to the train (reuse `CommuteStrip*`, session persists, no FGS). Explicit confirm — not auto all morning. | **Implemented** — Aug 2026 |
| **FB-18** | **Bury Menu → Send feedback before production** | **Done Aug 2026** — **Send feedback** moved to Menu legal row (About · Privacy · Send feedback), not a primary nav link. Formspree/`/api/feedback` unchanged. | Done |
| **FB-46** | **Journey schedule simplification — derive Active hours from Target** | Hide Journey window (From/Until) on commute detail; derive `defaultFrom`/`defaultUntil` from target ±90 min on Save; remove U-14 block. **After** outside-day hero browse brief ships + device QA. Brief: `docs/jim-brief-journey-schedule-simplify.md`. Supersedes U-14/U-15 UX when implemented. | **Backlog** — **Aug 2026** |

---

## Ops / monitoring

| ID | Idea | Notes | Status |
|----|------|-------|--------|
| **FB-19** | **UptimeRobot: ready + synthetic next-train monitors** | Three **KEYWORD** monitors on production (`/api/health` → `"ok":true`, `/api/ready` → `"ready":true`, synthetic next-train → `displayTime`). Alerts → **EvansAppStudio@gmail.com** (free tier; second contact skipped). Legacy HTTP health monitor paused. See `docs/go-live-ops.md` § Uptime. | Done — **Aug 2026** |

---

## Engineering / codebase health

**Inventory:** `docs/codebase-inventory.md` (14 Aug 2026). Refactor phases **FB-24 / FB-26 / FB-27** complete. **FB-23** complete.

| ID | Idea | Notes | Status |
|----|------|-------|--------|
| **FB-24** | **Code review Phase 1 — quick wins** | Dead CSS hooks + ads LS key (`docs/dead-code-inventory.md` D-03/D-04); resolve parked `preferred-hint` / `skipToTargetTrain` (D-09); doc hygiene; add `qa/pin-swipe-notify.mjs`. ~1–2 days. | **Done** (Aug 2026) |
| **FB-25** | **Code review Phase 2 — split `app.js`** | One PR per module: combobox → journey-model → train-navigation → nearby-mode → template-wizard → journey-detail. **Decision (Aug 2026):** Option A — plain script files + `window.nextTrain*` globals loaded before `app.js` (not esbuild bundle yet). **Progress:** 2.1–2.6 ✅ (`station-combobox.js`, `journey-model.js`, `train-navigation.js`, `nearby-mode.js`, `template-wizard.js`, `journey-detail.js`). Branch `cursor/fb-25-split-app-js`. | **Done** (Aug 2026) — 6/6 modules |
| **FB-26** | **Code review Phase 3 — pin / display contract** | Single web `pin-state` module; shared JSON fixtures for web + Android + iOS unit tests. Native true-next rename finished as **FB-44**. | **Complete** (Aug 2026) — `pin-state.js`, 12 fixtures, `app.js` hero via `resolvePinState`, Android `PinResolutionFixtureTest` |
| **FB-27** | **Code review Phase 4 — pre major product** | Journey `kind` in model; split `styles.css` by domain; APK packaging (D-05: `web-sources/`, `design/`, `prune-ship-assets.mjs`); `CommuteSchedule.java` split (4.4). Design: `docs/fb-27-phase-4-design.md`. | **Done** (Aug 2026) — 4.1–4.4 |
| **FB-28** | **Robolectric widget layout regression** | `WidgetUiBuilderRobolectricTest` builds RemoteViews from fixture snapshots (2×1 + medium); asserts bound text/visibility and layout view ids (leave twin, Updated line, Updating… ellipsis). Complements JVM string tests + manual TESTING.md **§22**. | Done — **v2.2.0** |
| **FB-44** | **Naming hygiene — `resolveTrueNextTrip`** | Dropped leftover `resolveActiveNextTrip` (and unused journey arg) on Android + iOS. True next vs pin is now the method name, not a comment. Inventory §3.3. | **Done** (21 Aug 2026) |

---

## Also parked elsewhere (pointers)

| Topic | Where |
|-------|--------|
| Stickiness / notifications / rituals | `docs/stickiness-ideas.md` |
| Widget later (Live Activity, etc.) | `docs/widget-homescreen.md` §13 |
| Widget real estate redesign (FB-43) | `docs/feature-backlog.md` **FB-43** · `docs/widget-redesign-v2.md` |
| Widget preferred-or-later live (FB-06) | `docs/feature-backlog.md` |
| Direction line groups (one-off merges) | `docs/jim-brief-direction-line-groups.md` |
| R8 / mapping file on Play upload | `docs/feature-backlog.md` **FB-45** · process: `docs/jim-brief-play-hygiene.md` §4 |
| Native debug symbols on Play upload | `docs/jim-brief-play-hygiene.md` **FB-41** §3 |
| Play hygiene (public gate) | `docs/jim-brief-play-hygiene.md` |
| Target train large gap (FB-12) | `docs/feature-backlog.md` **FB-12** (v8 warn shipped; B/C dropped) |
| Menu Remove ads (FB-13) | Done — A$7.99 one-time; widget free |
| Near me Leave By on pin (FB-14) | `docs/jim-brief-nearby-pin-leave-by.md` · **v2.2.0** |
| Journey pin + Preferred target (FB-20) | `docs/jim-brief-journey-pin-preferred-target.md` · **v2.2.0** · supersedes U-11 B face |
| Widget colour presets (FB-35) | `docs/jim-brief-widget-colour-presets.md` |
| Widget opacity + transparent (FB-36) | `docs/jim-brief-widget-appearance-opacity.md` |
| Widget configure on drop (FB-37) | `docs/jim-brief-widget-configure-on-drop.md` |
| Match system Material You (FB-38) | `docs/jim-brief-widget-material-you-system.md` |
| Widget style packs (FB-39) | **Dropped** Aug 2026 — `docs/jim-brief-widget-style-packs.md` (archived) |
| Jetpack Glance blend-first (FB-40) | `docs/jim-brief-widget-glance.md` |
| Widget background colour row (FB-42) | `docs/jim-brief-widget-background-colours.md` · **Done** 22 Aug 2026 |
| Leave now → strip morph (FB-15) | **Dropped** Aug 2026 — see FB-34 / FB-16 |
| Leave alarm / stopwatch at leave-by (FB-34) | `docs/feature-backlog.md` **FB-34** · Leave now = ongoing alarm (`LeaveReminderNotifier` / `LeaveAlarmActivity`) |
| Lock-screen on-the-way glance (FB-16) | `docs/feature-backlog.md` **FB-16** · Start from Leave now → commute strip |
| Bury Menu Send feedback (FB-18) | Done — legal row in Menu (`index.html`) |
| UptimeRobot ready + synthetic monitors (FB-19) | `docs/feature-backlog.md` **FB-19** · `docs/go-live-ops.md` § Uptime |
| Route vs Commute (FB-23) | `docs/jim-brief-fb-23-route-vs-commute.md` · **Complete** Aug 2026 |
| Journey schedule simplify — hide Active hours UI (FB-46) | `docs/jim-brief-journey-schedule-simplify.md` · **Backlog** — after outside-day hero brief |
| Outside active day — preview hero + browse (brief) | `docs/jim-brief-outside-day-hero-browse.md` |
| Widget 2×1 live bottom route (FB-43 Phase 1.5) | `docs/jim-brief-widget-2x1-live-route.md` |
| Codebase refactor phases (FB-24–27) | `docs/codebase-inventory.md` · **Complete** |
| Pin / display contract (FB-26) | `docs/fb-26-pin-state-design.md` · **Complete** Aug 2026 |
| Native true-next naming (FB-44) | `docs/feature-backlog.md` **FB-44** · **Done** 21 Aug 2026 |
| Robolectric widget layout tests (FB-28) | `docs/feature-backlog.md` **FB-28** · TESTING.md **§22** |
| QA infrastructure (CI, run-all, helpers) | `docs/qa-infrastructure-plan.md` |

---

## Add next

_When something comes up in design chat (“not now”), add a row here with a one-line note and link any related brief._
