# Mark QA note — PR #355 "FB-64 production sweep as a scheduled check"

Reviewed: `prod-sweep-scheduled-check` branch (commit da45848), against
`docs/jim-brief-prod-sweep.md` (7 acceptance criteria) and `docs/mark-brief-prod-sweep.md`.

## Verdict: FAIL — do not merge as-is

Two of the four judgement items are real, not hypothetical, problems. Both are documented below
with evidence from actually running the code, not just reading it.

## Acceptance criteria (Jim's brief)

1. **`node qa/prod-sweep.mjs` runs against production, no keys, classifies every live city.**
   PASS. Ran it myself (see below): 33 live cities enumerated straight from `registry.js`,
   classified ok/empty/error/skipped. No `.env.local` read, no key-shaped env var referenced
   anywhere in `qa/prod-sweep.mjs` or `.github/workflows/prod-sweep.yml`.
2. **Live-city list derived from `registry.js`.** PASS. `liveCities()` filters
   `CITIES` by `status === "live"` with no separate list. Counted `CITIES` myself: 33 live,
   matches the sweep's own "33 live cities" banner.
3. **A city outside local service hours is reported as `skipped`, distinct from `ok`.** PASS.
   `sweepCity` only ever returns `skipped` from the `empty` branch when `!inServiceHours`; it can
   never coincide with `ok`. Confirmed live: `uk-london-tfl` and `uppsala` both reported `skipped`
   in my run (it was ~04:2x local for both), not `empty`.
4. **Single failing run doesn't fail the workflow; N consecutive in-service failures do; N and
   persistence stated.** PASS on the logic — `updateState` resets a city's counter to 0 the
   instant its status isn't `error`/`empty`, so one bad run never survives to the next. N=3,
   stated in the PR body and `go-live-ops.md`. *However* — see judgement item 2: Brisbane is
   already sitting **at** N=3 from noise, not from a flake, which undercuts this criterion's
   real-world value on day one.
5. **Workflow doesn't run on push/pull_request, isn't a required check, isn't registered in
   `run-all.mjs` at any tier.** PASS. `prod-sweep.yml` triggers are `schedule` + `workflow_dispatch`
   only. Checked the live ruleset via `gh api repos/.../rulesets/20885667`: only `web-qa` is
   required on master, `prod-sweep` isn't in that list. `run-all.mjs`'s `RUNNER_EXCLUDE` carries
   `"prod-sweep.mjs"`, confirmed absent from a real `--smoke` run's script list.
6. **`node qa/run-all.mjs --smoke` unaffected.** PASS. Ran it with explicit `timeout: 600000`:
   `Suite: smoke · 116 PASS · 0 FAIL · ~500s`, exit 0. `uppsala-dogfood-gate.mjs` FAILed on a
   first pass (Sweden `ECONNRESET`) and PASSed clean on immediate re-run — this is the known,
   documented, unrelated flake named in both briefs, not a regression from this PR.
7. **`go-live-ops.md`'s stale "do not monitor" note corrected, sweep documented.** PASS. Brisbane
   and Sydney no longer listed as `planned`/501; the doc now points at `registry.js` as the
   source of truth instead of a hand-copied list, adds a "Production sweep" subsection (what it
   covers, alerting, how to run by hand), and a change-log row.

**7/7 acceptance criteria pass individually.** The FAIL verdict below is about whether the design
is actually fit to run unattended for nine days, which the brief explicitly asked me to judge past
the checklist.

## The four judgement items

### 1. Committing state back to master — NOT justified as shipped, flag as high risk

The workflow does a raw `git push` of `qa/prod-sweep-state.json` straight to `master` using the
default `GITHUB_TOKEN`, every run, forever (`updateState` always stamps a fresh `lastRunAt` for
every city, so the `git diff --quiet` guard never actually skips a commit — this is 24 commits/day
on master unconditionally, not "only when state changes" as the comment implies).

More seriously: I could find **no precedent** in this repo of `github-actions[bot]` pushing
directly to `master` (`git log --all --author=github-actions` returns nothing), and master
currently carries an active ruleset (`Protect master`, id 20885667) with a `required_status_checks`
rule requiring `web-qa` to have passed, `strict_required_status_checks_policy: false`,
`bypass_actors: []`. `ci.yml`'s own header notes "merges made with GITHUB_TOKEN don't fire `push`
workflows on their own" — that's about `flip-automerge`'s PR *merges*, where the merged commit
already inherited a passed check from its PR branch. A raw direct push of a **brand-new** commit
that never went through a PR is a different code path with no check run ever recorded against that
SHA, and I could not confirm whether GitHub's ruleset lets that through. I did not want to test this
by actually triggering the real scheduled/dispatch workflow against master during a QA pass, so this
is flagged unverified rather than reproduced — but "unverified against branch protection, no
precedent, no fallback if it's rejected" is not something I can pass on a mechanism whose whole job
is reliability for a 9-day unattended window. If the push silently fails, `updateState`'s
consecutive counters never persist and criterion 4 (N-consecutive alerting) quietly stops working —
worse, a rejected push makes the job exit non-zero, which mails Tim a failure indistinguishable from
a real alert, on top of Brisbane's noise below.

Recommendation: don't ship the repo-commit mechanism as-is. Prefer deriving "N consecutive" from
recent workflow run history via the GitHub Actions API (`gh run list --workflow=prod-sweep.yml`),
which needs no writes to master at all and sidesteps both the churn and the ruleset question
entirely. If a persisted file is still wanted, `actions/cache` with a rotating key (save a new key
each run, let old ones evict on the standard 7-day/10GB policy) avoids touching the protected branch.

### 2. Brisbane false positive — confirmed live, not fit to ship

Ran `node qa/prod-sweep.mjs` myself against production just now. Result:

```
[empty  ] brisbane   Albion -> T3 towards Doomben: no upcoming trips (empty x4)
...
ALERTING (>= 3 consecutive in-service findings): brisbane, newcastle
```

The **committed** `qa/prod-sweep-state.json` in this PR already shows `brisbane` at
`consecutiveEmptyInHours: 3` — i.e. this PR, merged as-is, alerts on Brisbane the very first hour
it runs for real, stacked with the one genuine finding (Newcastle). That's the brief's own
warning realised on day zero: a monitor that cries wolf on one of 33 cities every single hour
trains the reader to skim past `prod-sweep` mail, which is exactly the failure this piece of work
exists to prevent. Weighed most heavily per the brief, and I agree with that weighting — I'm
failing the PR primarily on this.

`direction-hubs.json` (hub/interchange station data) exists only for UK regions
(`lib/cities/{east-midlands,greater-anglia,liverpool-city-region,solent,uk-west-midlands,
west-of-england}/direction-hubs.json`) — there's no equivalent for Brisbane or other AU/SE/etc.
cities today, so "prefer the hub station" isn't a drop-in fix everywhere as the brief speculated.
But it doesn't need to be universal to fix the actual bug: `sampleStations` takes
`usable.slice(0, SAMPLE_SIZE)` off whatever order `listMultiCityStations` returns (alphabetical),
which is how Albion/Alderley — both real but low-frequency branch termini — get selected every
single run. A same-shaped fix that doesn't require hub data everywhere: increase `SAMPLE_SIZE`
enough that a false-empty needs *every* sampled station to be simultaneously quiet (unlikely for a
genuine outage, still commonplace for two low-frequency branches), or hand-pick one deliberately
busy interchange per city as a small override list (the CBD/dogfood station most cities' own gates
already exercise) the way `PERTH_SAMPLE` already special-cases Perth. Either is a smaller change
than plumbing hub data through every provider. Not my call to make — flagging back to Jim.

### 3. Service-hours / DST — PASS

`isInServiceHours` uses `Intl.DateTimeFormat(..., { timeZone }).format(now)` to read the local
hour rather than doing manual UTC-offset arithmetic, so it inherits the ICU timezone database's
DST rules automatically. Verified directly:

```
2026-10-03T15:30:00Z (pre-DST Sat)  -> Australia/Sydney local hour 01
2026-10-04T15:30:00Z (DST switch)   -> Australia/Sydney local hour 02
2026-10-05T15:30:00Z (post-DST)     -> Australia/Sydney local hour 02
```

correctly reflects Sydney's AEDT clocks-forward on the first Sunday of October 2026 (during Tim's
absence, as the brief flagged). `skipped` and `ok`/`empty` cannot collapse into the same value —
confirmed by code path (mutually exclusive branches in `sweepCity`) and by the live run
(`uk-london-tfl`, `uppsala` both correctly `skipped`, not `empty` or `ok`, at their local
~04:2x hour).

### 4. Alert threshold — PASS on logic, moot in practice until item 2 is fixed

N=3 consecutive hourly in-service failures, single-run flakes reset to 0 immediately. Sensible for
an hourly cadence and Tim's 9-day absence (alerts within ~3 hours of a real sustained outage,
doesn't page on the kind of single-run `ECONNRESET`/`429` flake this suite already sees — I hit
two live `429 Too many requests` on `liverpool-city-region` and `greater-anglia` in my one test
run, single occurrences, correctly not alerting). But the threshold's value depends on the sample
not itself being a source of a permanent 3-in-a-row — which Brisbane already is. Fix item 2 first;
the threshold logic itself is fine.

## Also verified

- Live-city coverage is genuinely dynamic: counted `CITIES.filter(c=>c.status==='live')` directly
  (33), matches the sweep's own banner — not asserted, tested.
- `.github/scripts/ci-scope.sh`: `.github/workflows/prod-sweep.yml` and `qa/prod-sweep.mjs` both
  fall into existing catch-alls (`.github/*` excluded everywhere; `qa/*` excluded from pin).
  `package.json`'s one-line addition (`sweep:prod` script) does trip `run_web`/`run_pin`/`run_android`
  as any `package.json` edit does — expected, not a defect.
- No secret is read, logged, or committed: grepped both files for `process.env`/`env.` — only
  `PROD_SWEEP_BASE`, `PROD_SWEEP_THRESHOLD`, `PROD_SWEEP_TIMEOUT_MS`, none key-shaped.
- Load/rate-limit risk is real, not just theoretical: my single manual run tripped `429 Too many
  requests` on two UK regions. Didn't alert (single-run), but corroborates the brief's concern
  about hourly x 33 cities against production's own rate limiter — worth Jim/Tim keeping an eye
  on, especially if manual `workflow_dispatch` runs stack close to the hourly cron.
- `docs/go-live-ops.md` Brisbane/Sydney correction and new sweep documentation match what the code
  actually does (read diff + code side by side).
- `node qa/run-all.mjs --smoke` (`timeout: 600000`): 116 PASS / 0 FAIL, ~500s. Only the known,
  documented `uppsala-dogfood-gate.mjs` Sweden flake appeared, and passed clean on immediate
  re-run.

## Status flag

This PR lands monitoring code only, no `status:` field is touched — not a flip PR, no
dogfood-gate/live-city-list additions expected or present. Correctly scoped as a normal
bug-fix-lane PR.

## Bottom line

Do not merge #355 as-is. Two of the four judgement items need rework before this is fit to run
unattended for nine days:

1. Verify (don't assume) that `github-actions[bot]` can actually push directly to `master` under
   the active ruleset, or switch to a mechanism that doesn't touch the protected branch at all
   (GitHub Actions run-history query, or `actions/cache`).
2. Fix the Brisbane sampling artifact before merge — it's not a future risk, the committed state
   file already has Brisbane sitting at the alert threshold, which means this PR alerts falsely on
   its very first real hourly run.

Everything else (service-hours/DST correctness, alert-threshold logic, workflow trigger scoping,
`run-all.mjs` exclusion, docs correction, no-secrets) checks out clean. Send back to Jim with this
note.
