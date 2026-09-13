# Jim brief — split PR #368, then find out why `vercel.json` function memory is not applied

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises `vercel.json`,
`api/health.js`, `api/**` config, and `qa/`. Lane lock: not required.

tim-review: no — follow-through on the hardening Tim chose on 13 Sep 2026.

## Task 1 — amend PR #368 so the working half can merge now (do this first, quickly)

Mark's review of #368 (`refresh-status-cache-and-memory`) **passed** the status-record cache fix —
`cacheControlMaxAge: 60` via `putImpl`, cache-busting `no-store` fetch in the sweep, gate proven by
mutation. It **failed** the memory change: `vercel.json` declares `functions["api/health.js"].memory:
4096`, the preview built green, and `vercel inspect --json` on that deployment
(`dpl_FSz4dVfzzfHgY65o4GWt9Vp3pDfX`) shows the deployed `api/health` lambda at **`memorySize: 2048`**
— the same as every function with no override.

Revert the memory line in #368 back to `2048` and drop the related comment edit in `api/health.js`
and the PR-body claim, so the PR contains **only the cache fix**. Push to the existing branch. Note
in a PR comment that the memory change moved to a separate investigation (Task 2). I will merge
#368 on green CI without another Mark round, since the remaining delta is restoring master's value.

Mark also flagged one narrow edge case in the manifest reasoning: an exact upstream revert (a feed
republished with an ETag/Last-Modified the stale cached manifest already matches) could cause a
needed refresh to be skipped. Record it in the PR comment as a known, accepted edge case — do not
widen #368 to fix it.

## Task 2 — why is the memory override silently ignored? (separate branch and PR)

Establish the mechanism with evidence, then fix or document. Candidates, roughly by likelihood:

- **The project's framework preset is `express`** (`.vercel/project.json`). Vercel may be building
  the app through a framework path where `vercel.json`'s `functions` block does not map onto the
  emitted lambdas, or where the key must be a different path than `api/health.js`.
- **The project has a dashboard-level default memory** (Settings → Functions) that is what every
  lambda inherits — and `2048` is that default, not the `vercel.json` value. If so, the existing
  `2048` line has never done anything, which also means the pre-#366 OOM happened at the project
  default rather than at a value we chose.
- **Key mismatch**: the `functions` key must match the deployed function's path exactly, including
  extension; check what the deployment's function list actually names it.
- The in-file `memory` export in `api/health.js` is already known to be ignored (comment in that
  file); confirm the `vercel.json` route is not failing for the same reason.

**Prove it on a real deployment**, as Mark did: change the config, `vercel deploy` a preview from
your worktree, and read the applied `memorySize` from `vercel inspect --json`. Local reasoning
cannot settle this. A preview deployment must not invoke the refresh — importing is fine, running
it writes to the production blob store.

Deliverable for Task 2: either a config that provably applies (aim for the current documented Pro
maximum — Jim's read of the docs was 4096; confirm) with the `vercel inspect` evidence in the PR
body, or a clear finding that the override cannot apply for this project shape plus the concrete
alternative (e.g. setting the project default in the dashboard, which is Tim's action — say exactly
what to click). Also fix the misleading `2048` line and comment if it turns out to be inert.

Add an offline gate only if there is something deterministic to assert; do not add a gate that
needs a deployment to run.

## Acceptance criteria

1. #368 reduced to the cache fix, CI green.
2. Task 2's mechanism established from a real deployment's `memorySize`, not from docs.
3. Either memory provably applied at the documented ceiling, or a documented dashboard action for
   Tim with the reasoning.
4. `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Do not run the full untiered
   suite. Do not trigger the production cron or source `CRON_SECRET`.

## Handoff

Task 1: push to `refresh-status-cache-and-memory`. Task 2: branch from master
`vercel-memory-not-applied`, normal PR linking this brief, copy the brief into the branch. Do not
merge either.
