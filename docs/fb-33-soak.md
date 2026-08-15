# FB-33 — CI soak (three-tier web QA)

**Doc ID:** `fb-33-soak`  
**Owner:** Tim (PM)  
**Status:** Soak in progress (Aug 2026)  
**Related:** `docs/qa-infrastructure-plan.md` (QA-P2-09) · `.github/workflows/ci.yml` · `.github/workflows/qa-nightly.yml`

---

## What shipped

Three automated web QA tiers — no single long suite on every PR:

| Tier | Trigger | Command | Scripts | ~Duration |
| --- | --- | --- | --- | --- |
| **PR smoke** | Every pull request | `npm run test:smoke` | 13 fast scripts | 2–5 min |
| **Main release** | Push to `master` | `npm run test:web:release` | Smoke + `leave-by-preferred-gate` + `pin-swipe-notify` | 5–8 min |
| **Nightly full** | 02:00 UTC daily (+ manual) | `npm run test:web:ci` | All `qa/*.mjs` except native tail | 15–30 min |

Android JVM mirrors the split: widget-only on PR, full unit on `master`.

---

## Soak goal (2.3.0 ship gate)

Before bumping to **2.3.0 (13)**, `master` should show:

1. **Release tier** — `web-qa` job green on **≥5 consecutive** `master` pushes (no `smoke-browser` flakes).
2. **Nightly tier** — `QA nightly` green on **≥3 of last 5** scheduled runs (one flake allowed during soak).
3. **No dev-server crashes** from rate-limit double-write (`gateRequest` skips limit when `CI=true` — PR #32).

Check status locally:

```bash
npm run soak:status
```

Requires [GitHub CLI](https://cli.github.com/) (`gh`) authenticated for this repo.

---

## Monitoring checklist (weekly during soak)

| Check | How |
| --- | --- |
| Master CI trend | `gh run list --workflow=ci.yml --branch=master --limit 10` |
| Nightly trend | `gh run list --workflow=qa-nightly.yml --limit 5` |
| Flaky script | Open failed log → note script name → file repro in `qa/` |
| PR smoke time | CI log should finish `web-qa` in &lt;15 min |

When soak passes, update `docs/release-versioning.md` — remove “CI soak” from the 2.3.0 blocker row.

---

## Known flakes (track here)

| Script | Symptom | Fix / PR |
| --- | --- | --- |
| `smoke-browser.mjs` tests 6–7 | Leave card urgent/late timeout in CI | `armFixtureLeaveCard` — fixture-aligned preferred pin; no `station`/`direction` in reload URL (avoids `readUrlSettings()` wipe) |
| `smoke-browser.mjs` test 8 | Empty fixture race (`—` before “No upcoming”) | `waitForDepartText` — PR #32 |

**Do not** rate-limit the QA client to “fix” CI load. Fix the dev-server handler and test waits instead.

---

## Change log

| Date | Note |
| --- | --- |
| 2026-08-15 | Soak doc + `soak:status` helper; smoke-browser 6–7 hardening for release tier stability |
