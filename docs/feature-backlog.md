# Next Train — future feature backlog

**Owner:** Tim (product)  
**Purpose:** Ideas that are **not** current sprint / Jim briefs. Add here instead of mixing into live specs.  
**Related:** `docs/stickiness-ideas.md` (engagement ranked), `docs/city-2-bookmarks.md` (AU city #2 research), `docs/business-marketing-plan.md`, `docs/undecided-issues.md` (open product forks)

**How to use:** Append rows. Promote to a `docs/jim-brief-*.md` only when ready to build. Do not treat this list as committed roadmap dates. **Version targets:** patch hotfixes vs minor feature drops — see `docs/release-versioning.md`.

---

## Widget / commute glance

| ID | Idea | Notes | Status |
|----|------|-------|--------|
| **FB-06** | **Widget/app live = preferred-or-later** | **Superseded 2026-08-11 by U-11 (lock B).** Was: live face = first train at/after preferred. **New:** live face = true next train; Leave By only for preferred or user-chosen (swipe/Next). `applyPreferredOrLaterFilter` removed from app (Aug 2026); native `resolveActiveNextTrip` naming is legacy only. | Superseded — see U-11 |
| **FB-08** | ~~App Leave By vs widget preferred gate~~ | **Locked U-12 → 1** — Gate app Leave By like widget. **Promoted** → `docs/jim-brief-leave-by-preferred-gate.md` | Briefed |

---

## Appearance & chrome

| ID | Idea | Notes | Status |
|----|------|-------|--------|
| **FB-01** | **Colour scheme / theme** — System / Light / Dark | Menu setting later. Full app theme (surfaces, type, chrome, dialogs). **Widget** has separate presets — **FB-35**. **Not** “Dark strip” as a third product look — that was icon-preview only. Skip until post-launch polish; if built, follow OS (`System`) + Light + Dark only. | Backlog |
| **FB-35** | **Widget colour presets + System match** | **Widget-only** curated skins (8 presets + Match system on Android 12+). Marketing: home-screen curation. Not paywalled. Brief: `docs/jim-brief-widget-colour-presets.md`. | **Implemented** |
| **FB-36** | **Widget background opacity + transparent card** | Extends FB-35: 0–100% bg opacity, Transparent card toggle, text legibility on busy wallpapers. Brief: `docs/jim-brief-widget-appearance-opacity.md`. | Implemented (2026-08-16) |
| **FB-37** | **Widget setup on placement + wallpaper preview** | `APPWIDGET_CONFIGURE` on drag-add; hero preview on Dark/Light/Vibrant backdrops; pin-path setup parity. Brief: `docs/jim-brief-widget-configure-on-drop.md`. | Implemented (2026-08-16) |
| **FB-38** | **Match system — Material You dynamic colours** | Absorbed into **FB-40** `wallpaper` mode. Brief: `docs/jim-brief-widget-material-you-system.md`. | Superseded → **FB-40** |
| **FB-39** | **Widget style packs** | Classic / Minimal / Bold — **deferred** to Glance v2 after FB-40. Do not build on RemoteViews. Brief: `docs/jim-brief-widget-style-packs.md`. | Deferred |
| **FB-40** | **Widget — Jetpack Glance (blend-first)** | Replace RemoteViews; **Blend in / Match wallpaper / Brand teal** only (drop 8-preset grid). Brief: `docs/jim-brief-widget-glance.md`. | Implemented |
| **FB-04** | ~~Unsupported region~~ | **Promoted** → `docs/jim-brief-unsupported-region.md` (flag + block Near me; journeys OK) | Briefed |

---

## Geography / data

| ID | Idea | Notes | Status |
|----|------|-------|--------|
| **FB-02** | **Other Australian cities** | Expand beyond Perth Transperth. First candidate research: Sydney vs Melbourne — see `docs/city-2-bookmarks.md`. Same product job (leave / next train / journeys); local API + ToS + competition checks. **Depends on** station typeahead (`docs/jim-brief-station-typeahead.md`) shipping first or with city 2. | Backlog |
| **FB-03** | **Any city with a train API** | Longer-term: city pack / adapter model for any metro that exposes a reliable live (or schedule) train API. Needs multi-city architecture, station graphs, and store listing strategy per region — not a quick locale swap. | Backlog |
| **FB-05** | ~~Station type-to-filter~~ | **Promoted** → `docs/jim-brief-station-typeahead.md` (P2) | Briefed |
| **FB-07** | **Process: find + merge same-line directions** | **v8:** heuristic + Perth line map shipped (`docs/direction-collapse-heuristic.md`, `lib/cities/perth/line-map.json`). Groups now include Butler + Fremantle←Claremont. Re-run when expanding cities. | Done — **v8** (process); city-2 still backlog |

---

## Release / Play ship

| ID | Idea | Notes | Status |
|----|------|-------|--------|
| **FB-09** | **R8 + Play deobfuscation mapping** | Process when `minifyEnabled true`. **v3 public ships minify off.** Consolidated: `docs/jim-brief-play-hygiene.md` **FB-41** §4. | **Done** — absorbed by FB-41 |
| **FB-10** | **Play native debug symbols** | `debugSymbolLevel 'SYMBOL_TABLE'` in release. Consolidated: `docs/jim-brief-play-hygiene.md` **FB-41** §3. | **Done** — absorbed by FB-41 |
| **FB-41** | **Play hygiene — public launch gate** | Native symbols + `release:prep` + extended `test:pre-upload`; R8 process doc. Before public v3. Brief: `docs/jim-brief-play-hygiene.md`. | **Done** (2026-08-16) |
| **FB-11** | **v7: Nearby onboarding gate + 15s locate timeout** | v6 live but coach fires on locate error; 6s native GPS timeout too short. **Jim:** `docs/jim-brief-closed-aab-v6-ship-gate.md` §v7 addendum — commit app.js fixes, **versionCode 7**. | Briefed — Jim |

---

## Journeys / leave alerts

| ID | Idea | Notes | Status |
|----|------|-------|--------|
| **FB-12** | **Target train gap warning / smarter pick** | **v8 shipped (option A):** keep at-or-after; warn when gap ≥ 25 min (`preferredHintForJourney`). Options B/C (nearest / confirm) still open if Tim wants. | Done — **v8** (warn); B/C backlog |
| **FB-13** | **Menu Remove ads** | Shipped: one-time **Remove ads** (A$7.99); widget free; no Pro/trial/founding. | Done |
| **FB-14** | **Near me: Leave By on pinned train** | **v2.2.0.** A1 pin icon + B1 leave card/slider + C2 **Remind me when to leave** + D1 widget follows pin. Brief: `docs/jim-brief-nearby-pin-leave-by.md`. | Briefed — **v2.2.0** |
| **FB-20** | **Journey mode: pin + Preferred target as default face** | **v2.2.0.** Supersedes U-11 B for journey hero/widget: default pin = Preferred target; day override via pin; secondary **Next** line only when next ≠ pin. Keep Active hours. Brief: `docs/jim-brief-journey-pin-preferred-target.md`. | Briefed — **v2.2.0** |
| **FB-17** | ~~Target flag icon + on/off state~~ | **Superseded 2026-08-14** — pin chrome (FB-14 Near me, FB-20 journey) replaces flag. Brief archived: `docs/jim-brief-target-flag-icon.md`. | Superseded |
| **FB-22** | **Enforce Target train inside Active hours** | **Locked U-14:** target time must fall within journey Active from/until; inline hint + Save blocked (`journey-detail.js`). | Done — **Aug 2026** |
| **FB-23** | **My Journeys: Route vs Commute (two types, one tab)** | **Concept split:** Near me = next here; **Route** = saved station+direction; **Commute** = usual train + reminders/pin/widget band. **Locked (U-15):** Route→Commute upgrade if cheap; ads + lifetime remove-ads only; widget any saved route; **explicit Active from/until on commutes** (no auto-derived hidden window); two morning commutes switch at **midpoint** between target times; copy stays **Target train**. Storage: `journeys[]` + `kind`. | Backlog — **product direction**; brief when ready |
| **FB-15** | **Leave now → Live Countdown morph-in-place** | Today: Live Countdown on ⇒ skip Leave now ping (strip owns leave-by). Later: one notification that heads-up as Leave now then *updates in place* into the ongoing countdown (same ID). | Backlog — **post 2.1.1** |
| **FB-34** | **Leave alarm (stopwatch-style) instead of / as well as notification** | Optional **alarm at leave-by** — audible + persistent until dismissed (system alarm / full-screen intent), not just a heads-up notification. **Stopwatch** read: in-app countdown running toward leave time (visible while app open or as ongoing glance). **Today:** Get ready + Leave now pings + optional Live Countdown strip (`LeaveReminderScheduler`, `CommuteStripNotifier`). **Open:** alarm *replaces* notify vs user choice; commute-only (FB-23); DND/battery; Android 12+ exact-alarm + full-screen intent; iOS alarm category / Live Activity overlap with FB-16. **Related:** FB-15, FB-16, stickiness #2/#4/#8. | Backlog — **post FB-23** |
| **FB-16** | **Lock-screen / ongoing “on the way” glance** | Inspired by Google Maps lock-screen ETA while navigating. Could surface leave-by / time-to-train on lock screen (and/or richer ongoing notification). Open question (don’t design yet): do we need an explicit **Start** (I’m leaving now) to enter that mode? | Backlog — **post 2.1.1** |
| **FB-18** | **Bury Menu → Send feedback before production** | **Done Aug 2026** — **Send feedback** moved to Menu legal row (About · Privacy · Send feedback), not a primary nav link. Formspree/`/api/feedback` unchanged. | Done |

---

## Ops / monitoring

| ID | Idea | Notes | Status |
|----|------|-------|--------|
| **FB-19** | **UptimeRobot: ready + synthetic next-train monitors** | Three **KEYWORD** monitors on production (`/api/health` → `"ok":true`, `/api/ready` → `"ready":true`, synthetic next-train → `displayTime`). Alerts → **EvansAppStudio@gmail.com** (free tier; second contact skipped). Legacy HTTP health monitor paused. See `docs/go-live-ops.md` § Uptime. | Done — **Aug 2026** |

---

## Engineering / codebase health

**Inventory:** `docs/codebase-inventory.md` (14 Aug 2026). **Defer until after next product ship** (v2.2.0 pin). **FB-23 stays separate** — product backlog, not refactor.

| ID | Idea | Notes | Status |
|----|------|-------|--------|
| **FB-24** | **Code review Phase 1 — quick wins** | Dead CSS hooks + ads LS key (`docs/dead-code-inventory.md` D-03/D-04); resolve parked `preferred-hint` / `skipToTargetTrain` (D-09); doc hygiene; add `qa/pin-swipe-notify.mjs`. ~1–2 days. | **In progress** (Aug 2026) — D-03/D-04/D-09 done; `qa/pin-swipe-notify.mjs` added |
| **FB-25** | **Code review Phase 2 — split `app.js`** | One PR per module: combobox → journey-model → train-navigation → nearby-mode → template-wizard → journey-detail. **Decision (Aug 2026):** Option A — plain script files + `window.nextTrain*` globals loaded before `app.js` (not esbuild bundle yet). **Progress:** 2.1–2.6 ✅ (`station-combobox.js`, `journey-model.js`, `train-navigation.js`, `nearby-mode.js`, `template-wizard.js`, `journey-detail.js`). Branch `cursor/fb-25-split-app-js`. | **Done** (Aug 2026) — 6/6 modules |
| **FB-26** | **Code review Phase 3 — pin / display contract** | Single web `pin-state` module; shared JSON fixtures for web + Android + iOS unit tests; native naming cleanup (`resolveActiveNextTrip` vs true next). ~2–3 days. | **Done** (Aug 2026) — `pin-state.js`, 12 fixtures, `app.js` hero via `resolvePinState`, Android `PinResolutionFixtureTest` |
| **FB-27** | **Code review Phase 4 — pre major product** | Journey `kind` in model (feeds FB-23 later); split `styles.css` by domain; APK packaging (move `design/` + `.mjs` sources out of `webDir`, D-05); optional `CommuteSchedule.java` decomposition. ~1–2 weeks. | **In progress** (Aug 2026) — 4.1/4.2/4.3 on `cursor/fb-27-phase-4`; 4.4 deferred |
| **FB-28** | **Robolectric widget layout regression** | `WidgetUiBuilderRobolectricTest` builds RemoteViews from fixture snapshots (2×1 + medium); asserts bound text/visibility and layout view ids (leave twin, Updated line, Updating… ellipsis). Complements JVM string tests + manual TESTING.md **§22**. | Done — **v2.2.0** |

---

## Also parked elsewhere (pointers)

| Topic | Where |
|-------|--------|
| Stickiness / notifications / rituals | `docs/stickiness-ideas.md` |
| Widget later (Live Activity, etc.) | `docs/widget-homescreen.md` §13 |
| Widget preferred-or-later live (FB-06) | `docs/feature-backlog.md` |
| Direction line groups (one-off merges) | `docs/jim-brief-direction-line-groups.md` |
| R8 / mapping file on Play upload | `docs/jim-brief-play-hygiene.md` **FB-41** §4 |
| Native debug symbols on Play upload | `docs/jim-brief-play-hygiene.md` **FB-41** §3 |
| Play hygiene (public gate) | `docs/jim-brief-play-hygiene.md` |
| Target train large gap (FB-12) | `docs/feature-backlog.md` **FB-12** (v8) |
| Menu Remove ads (FB-13) | Done — A$7.99 one-time; widget free |
| Near me Leave By on pin (FB-14) | `docs/jim-brief-nearby-pin-leave-by.md` · **v2.2.0** |
| Journey pin + Preferred target (FB-20) | `docs/jim-brief-journey-pin-preferred-target.md` · **v2.2.0** · supersedes U-11 B face |
| Widget colour presets (FB-35) | `docs/jim-brief-widget-colour-presets.md` |
| Widget opacity + transparent (FB-36) | `docs/jim-brief-widget-appearance-opacity.md` |
| Widget configure on drop (FB-37) | `docs/jim-brief-widget-configure-on-drop.md` |
| Match system Material You (FB-38) | `docs/jim-brief-widget-material-you-system.md` |
| Widget style packs (FB-39) | `docs/jim-brief-widget-style-packs.md` — deferred Glance v2 |
| Jetpack Glance blend-first (FB-40) | `docs/jim-brief-widget-glance.md` |
| Leave now → strip morph (FB-15) | `docs/feature-backlog.md` **FB-15** |
| Leave alarm / stopwatch at leave-by (FB-34) | `docs/feature-backlog.md` **FB-34** |
| Lock-screen on-the-way glance (FB-16) | `docs/feature-backlog.md` **FB-16** |
| Bury Menu Send feedback (FB-18) | Done — legal row in Menu (`index.html`) |
| UptimeRobot ready + synthetic monitors (FB-19) | `docs/feature-backlog.md` **FB-19** · `docs/go-live-ops.md` § Uptime |
| Codebase refactor phases (FB-24–27) | `docs/codebase-inventory.md` · **after v2.2.0** · FB-27 before FB-23 / city #2 |
| Robolectric widget layout tests (FB-28) | `docs/feature-backlog.md` **FB-28** · TESTING.md **§22** |
| QA infrastructure (CI, run-all, helpers) | `docs/qa-infrastructure-plan.md` |

---

## Add next

_When something comes up in design chat (“not now”), add a row here with a one-line note and link any related brief._
