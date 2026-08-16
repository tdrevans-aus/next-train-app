# FB-27: Code review Phase 4 — pre major product

**Status:** Complete (Aug 2026) — 4.4 deferred  
**Backlog:** FB-27  
**Feeds:** FB-23 (Route vs Commute product split) — **FB-23 complete** Aug 2026

---

## Scope

| # | Task | Status |
|---|------|--------|
| 4.1 | Journey `kind` (`route` \| `commute`) in model layer | **Done** — `journey-model.js`, `qa/journey-kind.mjs` |
| 4.2 | Split `styles.css` by domain | **Done** — `public/styles/*.css` + `@import` entry |
| 4.3 | D-05 packaging — move `design/` + `.mjs` sources out of `webDir` | **Done** — `web-sources/`, `design/`, `config/`, `prune-ship-assets.mjs` |
| 4.4 | `CommuteSchedule.java` decomposition | Deferred — needs dedicated PR after widget unit soak |

---

## 4.1 Journey kind

**Storage:** `journeys[].kind` — `"route"` or `"commute"`.

**Inference** (when `kind` omitted):

1. Explicit `kind` on raw object wins.
2. `templateKey` is `morning` or `evening` → `commute`.
3. Non-empty `preferredTrainTime` → `commute`.
4. `remindMe` true → `commute`.
5. Else → `route`.

**Non-goals:** No UI labels, no My Journeys tabs, no widget behaviour change. Model + persist only.

**API** (`window.nextTrainJourneyModel`):

- `JOURNEY_KIND_ROUTE` / `JOURNEY_KIND_COMMUTE`
- `inferJourneyKind(raw, context?)`
- `isCommuteJourney(journey)` / `isRouteJourney(journey)`

---

## 4.3 Packaging (D-05)

| Was | Now |
|-----|-----|
| `public/design/` | `design/` (repo root) |
| `public/*-native.mjs`, `train-times-client.mjs` | `web-sources/` |
| `public/site-config.example.json` | `config/site-config.example.json` |

`webDir` stays `public/` — bundles only ship in APK. Dev server serves `design/` at `/design/`.

---

## 4.4 CommuteSchedule (deferred)

Extract when widget tests are green on a dedicated branch:

- `CommuteScheduleResult` — data bag
- `CommuteScheduleSnapshot` — `toWidgetSnapshot` / `repaintSnapshot`
- `CommuteSchedulePreview` — `outsideHoursSnapshot`, degraded clock

Keep `CommuteSchedule.load()` as orchestrator.
