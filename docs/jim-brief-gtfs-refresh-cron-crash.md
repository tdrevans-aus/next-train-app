# Jim brief — the daily GTFS refresh has crashed on every run since 4 Sep

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises `lib/gtfs-refresh.js`,
`lib/vendor/`, `api/`, `vercel.json`, `package.json`, `api/package.json`, and `qa/`.

tim-review: no — Tim approved this fix on 11 Sep 2026, choosing it over a manual Newcastle republish.

**Priority: this is the root cause of a live-data defect, days before public launch.**

Lane lock: `node qa/lane-lock.mjs check "Australia"` reported **free** at dispatch (top-level check,
11 Sep 2026). Acquire it before touching shared files.

## Symptom

Newcastle — a live city — serves a 2,041-byte synthetic test fixture from the blob store instead of
real GTFS (`feed_publisher_name: next-train newcastle dogfood`, trips `nlr-beach-0` /
`nlr-int-0`, calendar `DAILY 20260101–20271231`). Riders see an empty board at every station.

That fixture was published over production by `scripts/publish-gtfs-fixture-to-blob.mjs`. But the
*reason it was never overwritten* is the real defect, and it is not specific to Newcastle.

## Root cause (established, then one step left to confirm)

`lib/gtfs-refresh.js` is the change-driven refresh pipeline. It runs daily via the Vercel cron on
`/api/health` (`vercel.json`: `"17 3 * * *"`, 03:17 UTC). Newcastle is in its `STANDALONE` list
with the real TfNSW URL and `headers: () => tfnswAuthHeaders(readTfnswApiKey())` — and production
already holds that key, since Newcastle's realtime feed uses it.

The pipeline compares against a manifest at `gtfs/<city>.json` in the blob store. **Newcastle's
manifest does not exist** (404). With no manifest, the probe treats upstream as changed and should
download, trim and publish real data on every run. It never has.

Vercel runtime errors for `/api/health`, last 7 days:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@vercel/blob'
  imported from /var/task/lib/gtfs-refresh.js
count=7   first=2026-09-04T04:08:08Z   last=2026-09-11T03:17:23Z
lastDeployment=dpl_7486DHUfMS3U7dvDBqyi3GhvNuow
```

**Seven runs, seven crashes.** The job has never completed in production.

`@vercel/blob` is declared under `"dependencies"` in the root `package.json` (line 98) *and* in
`api/package.json`, so this is not a missing declaration. The likely mechanism: the function is
traced from `api/`, whose own `node_modules` holds `@vercel/blob`, but `lib/gtfs-refresh.js` lives
outside `api/` and resolves bare imports from a `node_modules` that isn't in the deployed bundle.
**This is the same class as the August 2026 `fflate` outage**, which was fixed by vendoring the
package into `lib/vendor/fflate.mjs` (see `docs/go-live-ops.md`, which cites it). Confirm the
mechanism rather than assuming it — that determines which fix is correct.

## Why it is bigger than Newcastle

This job refreshes **every** blob-backed city. Canberra and Gold Coast have not been refreshed since
at least 4 Sep either; they are fine today only because their calendars still cover the present.
Gold Coast's calendar runs out on **2026-10-28** and nothing would have refreshed it.

And it was invisible: the job runs inside `/api/health`, which is the UptimeRobot liveness monitor,
and **`/api/health` returned 200 on every one of those seven days.**

## What to fix

**1. Make the refresh job run in production.** Choose the fix from the confirmed mechanism and say
why in the PR. Vendoring as with `fflate` is the precedent; a Vercel function `includeFiles` config
or restructuring the import are also candidates. `@vercel/blob` pulls in more than `fflate` did, so
weigh what vendoring actually costs before defaulting to it.

**2. Guard against the class, not just this instance.** If the mechanism is "a file under `lib/`
reachable from an `api/` function imports a bare npm package that isn't in the deployed bundle", then
`fflate` in August and `@vercel/blob` now are two instances of one recurring defect, and there will
be a third. Add a check that fails when a bare npm import appears in `lib/` code reachable from an
`api/` entry point without being resolvable in the deployed bundle. Keep it offline — no network.

**3. Make a failing refresh visible.** A liveness endpoint returning 200 while its own scheduled job
crashes daily is exactly how this stayed hidden. Surface refresh failure somewhere a monitor will
see it — but **do not make `/api/health` itself fail**, because it is the liveness check and a
refresh outage is not an outage of the site. Consider recording each run's outcome where the
production sweep (`qa/prod-sweep.mjs`) or `/api/ready` can read it. Pick one and justify it.

## Verification — read this carefully

**"It passes locally" proves nothing here.** Locally, Node resolves `@vercel/blob` from the root
`node_modules` without trouble; the bug exists only in Vercel's deployed bundle. Your QA scripts will
pass before your fix as well as after it.

The honest proof is a Vercel deployment. Deploy a preview and demonstrate that the refresh code path
imports `@vercel/blob` without `ERR_MODULE_NOT_FOUND`. Two cautions:

- Preview deployments may share the production blob store credentials. If invoking the refresh on a
  preview **writes** to `gtfs/<city>.zip`, it writes to production. That is acceptable only if what it
  writes is real upstream data, and you must say plainly in the PR whether any write happened.
- Do not attempt to source or use `CRON_SECRET` to trigger the production cron. Tim can trigger it
  from the Vercel dashboard (Crons → Run) after merge, and the top-level session will verify the
  result by checking that `gtfs/newcastle.json` exists and `gtfs/newcastle.zip` no longer carries the
  dogfood publisher.

State explicitly what you verified on a real deployment and what you could not.

## Coordinate with PR #356

PR #356 (`newcastle-stale-snapshot`, Mark-approved, unmerged) **also edits `lib/gtfs-refresh.js`** —
it drops retired Vancouver from the cron list and documents the Malmö/Uppsala exclusion. Prefer a fix
that does not touch that file; if you must, keep the change minimal and say in your PR exactly which
lines overlap so the merge order is obvious.

This PR should merge **before** #356: once the refresh job works, the cron publishes real Newcastle
data, #356's integrity gate stops firing, and #356 goes green on its own.

## Acceptance criteria

1. The mechanism is confirmed, with evidence, not assumed.
2. On a real Vercel deployment, the refresh code path imports `@vercel/blob` without error.
3. An offline check fails when a bare npm import in `lib/` is unresolvable in the deployed bundle —
   proven by construction.
4. A refresh failure becomes visible to monitoring without making `/api/health` fail.
5. `/api/health` still returns 200 when healthy — it is the UptimeRobot liveness monitor.
6. The PR states whether anything was written to the production blob store.
7. `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Do not run the full untiered
   suite.

## Handoff

Branch from master: `gtfs-refresh-cron-crash`. Commit, push, and open a normal (non-flip) PR linking
this brief. Copy this brief into your branch — it is untracked on master by design. Do not merge.
