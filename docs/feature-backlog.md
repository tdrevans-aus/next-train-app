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

## Release / Play ship

| ID | Idea | Notes | Status |
|----|------|-------|--------|
| **FB-09** | **R8 + Play deobfuscation mapping (release hygiene)** | **For:** Simon (process) + Jim (Gradle/ProGuard when enabled). Play warns on AAB upload: no deobfuscation file. Today `minifyEnabled false` — safe to ignore for closed test. **Before public launch or if we enable R8:** (1) decide minify on/off; (2) if on — Capacitor/AdMob/IAP keep rules + device smoke; (3) each `versionCode` upload `android/app/build/outputs/mapping/release/mapping.txt` in Play → App bundle explorer → Downloads; (4) archive mapping with release notes (decode old crashes). Add to Tim AAB checklist / launch-program when promoted. | Backlog — **Simon to track** |
| **FB-10** | **Play native debug symbols (Capacitor `.so`)** | Play warns: native code in AAB, no debug symbols. **Not** FB-09 (Java mapping). **Jim:** `ndk { debugSymbolLevel 'SYMBOL_TABLE' }` in release — `docs/jim-brief-play-native-symbols-v3.md`. Safe to ignore closed Alpha 2.1.0; **required v3.0.0 public**. | Briefed — Jim |
| **FB-11** | **v7: Nearby onboarding gate + 15s locate timeout** | v6 live but coach fires on locate error; 6s native GPS timeout too short. **Jim:** `docs/jim-brief-closed-aab-v6-ship-gate.md` §v7 addendum — commit app.js fixes, **versionCode 7**. | Briefed — Jim |

---

## Journeys / leave alerts

| ID | Idea | Notes | Status |
|----|------|-------|--------|
| **FB-12** | **Target train gap warning / smarter pick** | Today: first live train **at or after** target time (e.g. 7:00 → 7:40). Usually fine; painful when the gap is large (user thinks “7am train”, app arms 7:40). **v8 candidate:** warn when next-at-or-after is ≫ N min past target, and/or offer “nearest to target” / confirm train. Touches journey detail, leave reminders, Live countdown, widget leave-by gate. **Not v7.** | Backlog — **v8** |
| **FB-13** | **Menu Try Pro CTA** | Free-state Menu teal CTA (**Try Pro free**) hidden for v7 — open path was a no-op (nested dialog / widget sheet). **v8:** fix open (close Menu → widget help or trial sheet), de-dupe vs **Add home screen widget**, drop “full widget” copy. Re-enable `free_no_trial` CTA in `renderMenuPro`. | Backlog — **v8** |

---

## Also parked elsewhere (pointers)

| Topic | Where |
|-------|--------|
| Stickiness / notifications / rituals | `docs/stickiness-ideas.md` |
| Widget later (Live Activity, etc.) | `docs/widget-homescreen.md` §13 |
| Widget preferred-or-later live (FB-06) | `docs/feature-backlog.md` |
| Direction line groups (one-off merges) | `docs/jim-brief-direction-line-groups.md` |
| R8 / mapping file on Play upload | `docs/feature-backlog.md` **FB-09** · `docs/aab-signing-closed-testing.md` |
| Native debug symbols on Play upload | `docs/feature-backlog.md` **FB-10** · `docs/jim-brief-play-native-symbols-v3.md` |
| Target train large gap (FB-12) | `docs/feature-backlog.md` **FB-12** (v8) |
| Menu Try Pro CTA (FB-13) | `docs/feature-backlog.md` **FB-13** (v8) |
| QA infrastructure (CI, run-all, helpers) | `docs/qa-infrastructure-plan.md` |

---

## Add next

_When something comes up in design chat (“not now”), add a row here with a one-line note and link any related brief._
