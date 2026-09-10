# Jim brief — FB-64: production sweep as a scheduled check

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises `qa/`,
`.github/workflows/`, `.github/scripts/`, `package.json` scripts, and the `docs/` updates named in
item 4.

tim-review: no — Tim approved building this ahead of release packaging on 10 Sep 2026, choosing it
over shipping with monitoring as-is.

Lane lock: not required — this touches no city's `lib/providers/` adapter. Do not acquire one.

## Why this is a launch blocker

The app is about to go public with **33 live cities and exactly one of them monitored.** All three
UptimeRobot monitors in `docs/go-live-ops.md` hit Perth: `/api/health`, `/api/ready`, and a
synthetic `Edgewater Stn → Perth` next-train call. Nothing watches the other 32.

The 6 Sep 2026 pre-launch sweep found **four silent outages that every offline gate had passed** —
Auckland/Wellington (feeds switched to JSON, #316), Newcastle (auth header sent to the public blob,
#314), Oslo (Entur schema change, #315). Each was invisible until a human swept by hand. Tim is away
**27 Sep – 9 Oct**, five days after rollout is meant to hit 100%.

## What to build

### 1. `qa/prod-sweep.mjs`

For every city with `status: "live"` in `lib/providers/registry.js` (read the registry — never a
hand-maintained list that can drift), sample production and report cities that are broken:

- Enumerate stations via `/api/city-stations` (or the city's catalog), take a small stable sample
  per city — a handful, not every station. This runs hourly; it must stay cheap and must not hammer
  upstream agencies.
- For each sampled station, get its chips from `/api/directions?city=<id>&station=<name>`.
- Call `/api/next-train` for the first chip and record the outcome.

Classify each city as **ok**, **empty** (200 but no trips), or **error** (non-200, malformed, or a
thrown parse). Default target is production (`https://next-train-app.vercel.app`), overridable via
an env var so it can be pointed at a preview deploy.

Hitting production means **no agency API keys are needed** — production holds them. Do not read
`.env.local` and do not add secrets to the workflow.

### 2. Service-hours awareness — the part that decides whether this is useful or noise

**An empty board outside service hours is not an outage.** This bit us twice in one night on 10 Sep:
a London live check at 01:20 and again at Mark's QA both returned zero trips at every station, and
both were the Underground's scheduled overnight closure (`TfL /Line/{id}/Status` reported
`Service Closed` 00:17:43Z–04:03:08Z), not a defect. A sweep that pages on that is a sweep everyone
learns to ignore — and an ignored alarm is worse than none, because it launders real outages into
background noise.

Every city in `CITIES` carries a `timeZone` (verified — all 47 entries have it). Use it to evaluate
each city in its own local time, and only treat `empty` as a finding **during that city's plausible
service hours**. A simple, conservative per-city window is fine and preferable to anything clever —
roughly 06:00–23:00 local, narrower where you have better information. Outside the window, report
the city as **skipped (outside service hours)**, explicitly, so a reader can tell "not checked" from
"checked and healthy". Never let those two collapse into one state.

An `error` (non-200, malformed response) is a finding at **any** hour — a 500 at 3am is still a 500.

### 3. Alerting — N consecutive failures, not one

FB-64 asks for alerting on any city whose sampled call errors, or whose board is empty for N
consecutive runs during service hours. Single-run flapping must not page: today's suite alone
produced two Sweden `ECONNRESET` gate failures that passed cleanly on isolated re-run, and the three
known-flaky browser scripts already get an in-runner retry for the same reason.

Add `.github/workflows/prod-sweep.yml` on an hourly `cron` plus `workflow_dispatch`. Persist enough
state between runs to count consecutive failures per city — a committed JSON state file, the
Actions cache, or re-deriving from recent run history are all acceptable; pick one and say why in
the PR. Fail the workflow (which mails Tim through normal GitHub notification) only once a city has
crossed the threshold; a single bad run should log and exit green.

This workflow must **never** gate a PR. It is not a required check, it must not be added to
`qa/run-all.mjs` at any tier, and it must not run on `push` or `pull_request`. Check
`.github/scripts/ci-scope.sh` and make sure adding it doesn't perturb the existing diff
classification.

### 4. Fix the stale monitoring docs in the same PR

`docs/go-live-ops.md` has a **"Do not monitor (until city is live)"** section still naming Brisbane
and Sydney as `planned` and returning 501. Both have been live for weeks. Update that section to
reflect reality, and add a short subsection describing this sweep, what it covers, how it alerts,
and how to run it by hand (`workflow_dispatch` or `npm run` script). Add a row to that doc's change
log.

Do not restructure the rest of `go-live-ops.md`, and do not touch `launch-blockers.md` — that doc is
badly stale and reconciling it is a separate job.

## Acceptance criteria

1. `node qa/prod-sweep.mjs` runs against production with no API keys configured and reports every
   live city as ok / empty / error / skipped-outside-service-hours.
2. The live-city list is derived from `registry.js`; retiring or flipping a city changes the sweep's
   coverage with no other edit.
3. A city outside its local service window is reported as skipped, distinctly from healthy.
4. A single failing run does not fail the workflow; N consecutive in-service failures do. State the
   chosen N and the persistence mechanism in the PR.
5. The workflow does not run on push or pull_request, is not a required check, and is not registered
   in `qa/run-all.mjs` at any tier.
6. `node qa/run-all.mjs --smoke` (explicit `timeout: 600000`) is unaffected. Do not run the full
   untiered suite.
7. `docs/go-live-ops.md`'s stale "do not monitor" list is corrected and the sweep is documented.

## Reality check before you finish

Run the sweep for real against production and put the actual output in the PR description — all 33
live cities, with their classifications. If it reports a city as broken, **that is a finding, not a
bug in your script**: say so prominently rather than tuning the sweep until everything looks green.
Finding a real outage on the first run is the best possible outcome here, and the whole point of
FB-64 is that four such outages were already sitting undetected once before.

## Handoff

Branch from master: `prod-sweep-scheduled-check`. Commit, push, and open a normal (non-flip) PR
linking this brief, with the full first-run output in the description. Copy this brief into your
branch — it is untracked on master by design. Do not merge.
