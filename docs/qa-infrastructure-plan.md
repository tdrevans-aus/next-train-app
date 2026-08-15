# Evans Studio — QA infrastructure plan

**Doc ID:** `qa-infrastructure-plan`  
**Owner:** Tim (product) + PM agent  
**Status:** Phase 1 **shipped** in Next Train (11 Aug 2026)  
**Purpose:** Reusable QA stack so the **next app** (and Next Train releases) ship faster with fewer manual regressions.

**Related:** `TESTING.md` · `qa/run-all.mjs` · `docs/aab-signing-closed-testing.md` · `docs/qa-leave-reminders-v2-testing.md` · `docs/launch-blockers.md` (LB-12 CI)

---

## What we built (Phase 1 — done)

| Piece | Location | Command |
| --- | --- | --- |
| **Unified web runner** | `qa/run-all.mjs` | `npm run test:smoke` / `npm run test:web` |
| **Smoke vs full** | `--smoke` = 13 scripts (~2–5 min); `--no-native` skips Maestro/native CDP tail; default = all `qa/*.mjs` |
| **Dev server helper** | `qa/helpers/dev-server.mjs` | Auto-starts `dev-server.js` if :3000 free |
| **Journeys dialog helper** | `qa/helpers/journeys-dialog.mjs` | Double-tap My Journeys + backdrop cleanup |
| **Play pre-upload checks** | `qa/pre-upload-check.mjs` | `npm run test:pre-upload` |
| **Android unit runner** | `qa/run-android-unit.mjs` | `npm run test:android:unit` |
| **GitHub Actions** | `.github/workflows/ci.yml` | PR: web smoke + widget JVM · main: full web (no native tail) + full JVM |

### npm scripts

```bash
npm run test:smoke          # fast gate (Jim commits, CI on PR)
npm run test:web            # full web regression (local; includes Maestro tail if device up)
npm run test:web:ci         # full web regression without Maestro/native CDP (nightly)
npm run test:web:release    # smoke + pin/leave gates — CI on main pushes
npm run test:android:unit   # JVM unit tests
npm run test:maestro        # Maestro Android smoke (device/emulator)
npm run test:pre-upload     # before Play AAB upload
```

### PASS* scripts (exit 1 = good)

- `custom-template-delay-repro.mjs`
- `done-double-tap-repro.mjs`

`run-all.mjs` labels these **PASS*** automatically.

---

## What already worked (keep on every app)

| Asset | Why |
| --- | --- |
| Fixture dev server (`?fixture=`, `test=1`, `reset=1`) | Deterministic web QA |
| `TESTING.md` numbered tests | Humans + agents share one playbook |
| `qa/<feature>-repro.mjs` per bug | One bug → one script → brief |
| `qa/latest.md` | Cheap audit log |
| `docs/jim-brief-*.md` | Clear eng handoff |
| Pure JVM tests for native logic | No device for schedule math |

---

## Phase 2 — in progress (FB-33)

| ID | Item | Owner | Effort | Notes |
| --- | --- | --- | --- | --- |
| **QA-P2-01** | **Repo template** `evans-capacitor-app` | Tim/PM | 1–2 days | Copy `qa/`, `TESTING.md` skeleton, fixture server, CI workflow |
| **QA-P2-02** | **Migrate more scripts** to `qa/helpers/` | Jim/QA | Ongoing | `openJourneysDialog` pattern; station combobox already shared |
| **QA-P2-03** | **CI: full suite on main** only; smoke on PR | PM | ½ day | **Done Aug 2026** — `.github/workflows/ci.yml`; `npm run test:web:ci` (`--no-native`) |
| **QA-P2-09** | **Three-tier web QA** (smoke / release / nightly full) | PM | ½ day | **In progress Aug 2026** — `test:web:release` on `master` CI; nightly `test:web:ci` |
| **QA-P2-04** | **Native reminder fast-test mode** | Jim | 1 day | Alarm ~60s after enable; doc in `qa-leave-reminders-v2-testing.md` |
| **QA-P2-05** | **`DEVICE-SMOKE.md`** one-pager | Tim | ½ day | 15 checks, 30 min, Play install only |
| **QA-P2-06** | **`npm run release:prep`** | Jim | ½ day | Bump `versionCode`, `cap:sync`, print AAB path |
| **QA-P2-07** | **R8 + mapping upload** | Simon + Jim | Backlog **FB-09** | Pre-public if minify enabled |
| **QA-P2-08** | **Maestro Android smoke** | Jim | **Shipped** | `docs/jim-brief-maestro-android-qa.md` — `npm run test:maestro` |

---

## Phase 3 — later / if pain appears

| Item | When |
| --- | --- |
| Maestro / Appium for 3–5 native flows | **Maestro shipped** — `npm run test:maestro`; Appium still skip |
| Device farm / BrowserStack | Paid UA or wide beta |
| Playwright notification wait | Not possible for Android OS notifications |
| `qa/android-dump-reminders.sh` | If debug API insufficient |

---

## Release checklist integration

Before **closed test** upload:

1. `npm run test:smoke` (or full before wider beta)
2. `npm run test:pre-upload`
3. `npm run cap:sync` + signed AAB (see `aab-signing-closed-testing.md`)

Before **public**:

1. `npm run test:web` green
2. `npm run test:android:unit`
3. Device sheet (`DEVICE-SMOKE.md` when written)
4. Dwayne + Ruth sign-offs (launch program)

---

## Principles (next app day 1)

1. **Fixture server first** — never smoke-test production API in CI.
2. **One command regression** — `npm run test:smoke` before every merge.
3. **Repro script per bug** — no “fixed in chat” without `qa/*.mjs`.
4. **Web covers UI; JVM covers schedule math; device covers notifications.**
5. **Don’t build E2E everything** — sweet spot is smoke + unit + 30 min device.

---

## Change log

| Date | Note |
| --- | --- |
| 2026-08-15 | CI smoke hang guard: per-script timeouts, verbose/heartbeat logs, force dev-server on CI (`run-all.mjs`, `dev-server.mjs`, `ci.yml`) |
| 2026-08-15 | QA-P2-03: CI smoke on PR, full web (`test:web:ci`) + full JVM on main; `run-all.mjs --no-native` |
| 2026-08-11 | Phase 1 implemented: run-all, helpers, CI, pre-upload check; plan doc created |
