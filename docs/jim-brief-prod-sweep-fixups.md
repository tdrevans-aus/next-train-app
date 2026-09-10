# Jim brief — prod sweep fix-ups from Mark's QA fail (PR #355)

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Same authorisation as the original
brief: `qa/`, `.github/workflows/`, `.github/scripts/`, `package.json` scripts, and the
`docs/go-live-ops.md` updates.

tim-review: no — same approval as `docs/jim-brief-prod-sweep.md`. This closes out QA findings
against already-approved work.

Lane lock: not required — touches no city's `lib/providers/` adapter.

## Context

PR #355 (branch `prod-sweep-scheduled-check`, https://github.com/tdrevans-aus/next-train-app/pull/355)
implements FB-64. Mark reviewed it and returned **FAIL**.

**Read both before starting:**
- `docs/mark-note-prod-sweep.md` — Mark's full QA note (also a PR comment).
- `docs/jim-brief-prod-sweep.md` — the original brief and its seven acceptance criteria.

All seven acceptance criteria passed individually. The service-hours logic and DST handling were
verified clean, including empirically across the 4 Oct 2026 Australian boundary — **do not rework
any of that.** Two design items failed.

## Item 1 — Brisbane false positive (the blocking one)

Mark ran the sweep against production and reproduced it: Brisbane reports `empty` because the
sampled stations' *first* chip happens to be a low-frequency branch (Albion → T3 towards Doomben).
The committed `qa/prod-sweep-state.json` in this PR **already shows Brisbane at
`consecutiveEmptyInHours: 3`** — merged as-is, this alerts on Brisbane in its first hour, alongside
the genuine Newcastle alert.

A monitor that cries wolf hourly is worse than no monitor: it trains everyone to ignore it and
launders real outages into background noise. That is the exact failure this work exists to prevent,
so this must be fixed, not documented.

Two changes, and I want both:

1. **A station is only `empty` if every chip it offers is empty.** Right now one unlucky first chip
   condemns the whole city. Check up to a small number of the station's chips (three is plenty) and
   report `empty` only when none return trips. This alone kills the Brisbane artifact, because
   Alderley's second direction returns trips fine.
2. **Prefer each city's hub station over the alphabetically-first one.** Most cities have a hub-lock
   station recorded from their D1 pack, and UK regions have `direction-hubs.json`. Derive it from
   data that already exists — do not hand-maintain a 33-row table that will drift the moment a city
   flips. Where no hub is derivable, fall back to the current behaviour and say so.

Then **reset `qa/prod-sweep-state.json` to a clean state** before committing, so the PR does not
carry stale threshold counts from the old sampling strategy into production.

## Item 2 — the state mechanism must not write to master

`prod-sweep.yml` commits `qa/prod-sweep-state.json` back to master hourly with `[skip ci]`. Mark
found two problems: no `github-actions[bot]` push to master has any precedent in this repo, and
master's ruleset (`required_status_checks: web-qa`) has never been tested against a raw non-PR
push — if it rejects the push, the alerting silently breaks *and the failure looks identical to a
real alert*. Separately, it commits on every run regardless of change, because the timestamp always
differs, contradicting the "on change" behaviour documented in the PR and `go-live-ops.md`.

**Constraint: the workflow must not push to master.** Within that, pick one and justify it in the
PR:

- **Actions cache** — simplest, no repo writes at all. Note in the PR what happens when the cache is
  evicted or missing: counters reset, so an alert is delayed rather than lost. Say whether that is
  acceptable at an hourly cadence.
- **Workflow run history** — Mark's suggestion (`gh run list --workflow=prod-sweep.yml`). Needs
  per-city detail persisted somewhere (artifact or job summary), so it is more moving parts than it
  first appears. Viable if you keep it simple.
- **A dedicated non-master branch** for state. Sidesteps the ruleset entirely and keeps history, at
  the cost of a branch whose only purpose is bookkeeping.

Whichever you choose, the behaviour must match its documentation in both the PR body and
`docs/go-live-ops.md`. A monitor whose own state mechanism can fail silently is not a monitor.

## Acceptance criteria

1. A fresh run against production reports Brisbane as `ok`, not `empty`, or explains with evidence
   why Brisbane genuinely has no service at that moment.
2. A city is reported `empty` only when every sampled chip at a sampled station returns no trips.
3. Sampling prefers a derivable hub station; the derivation reads existing data, not a hand-written
   list.
4. The workflow performs no push to master. State survives normally between hourly runs, and the
   documented behaviour matches the implemented behaviour.
5. `qa/prod-sweep-state.json` (if it survives your redesign) carries no stale threshold counts.
6. Everything Mark passed stays passing — all seven original criteria, service-hours and DST logic
   untouched, `prod-sweep.mjs` still excluded from `qa/run-all.mjs` at every tier, no push or
   pull_request triggers, no secret read or echoed.
7. `node qa/prod-sweep.mjs` run for real, with the full output in the PR description. Newcastle is
   expected to still report `error` — it is being fixed separately under
   `docs/jim-brief-newcastle-stale-snapshot.md`, and it correctly staying red here is a good sign,
   not a problem to work around.
8. `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Do not run the full untiered
   suite. `malmo-dogfood-gate.mjs` and `uppsala-dogfood-gate.mjs` flake in batch runs with Sweden
   `ECONNRESET` and pass in isolation — known, unrelated.

## Handoff

Work on the existing branch `prod-sweep-scheduled-check` and push to it, updating PR #355 in place.
Do not open a second PR and do not merge. Copy this brief into the branch alongside the original.
Leave a PR comment summarising what changed, so Mark's re-review starts from it.
