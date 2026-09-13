# Jim brief — rebase PRs #367, #370, #368 onto master after the port sweep (#372)

Mode: bug-fix / product (CLAUDE.md "Bug-fix lane"). tim-review: no. Lane lock: not required.
One Jim per PR, each in its own worktree. Written 13 Sep 2026 by the top-level session.

## Why

PR #372 (merged 03:22 UTC) changed `qa/run-all.mjs`, switched 71 `qa/*.mjs` scripts to
`import { BASE } from "./helpers/dev-server.mjs"`, and added an offline lint gate
`qa/no-hardcoded-qa-port.mjs` (smoke tier) that fails on any `localhost:3000` literal in
`qa/*.mjs`. All three open PRs now show `DIRTY`; `git merge-tree` reports a single conflicting
file in each: `qa/run-all.mjs`, where each PR registers its new gate in the script lists.

| PR | Branch | New QA files on the branch |
|---|---|---|
| #367 | `jim/security-launch-fixes` | `qa/feedback-abuse.mjs` |
| #370 | `jim/eu-ad-consent` | `qa/ad-consent-gate.mjs` |
| #368 | `refresh-status-cache-and-memory` | `qa/gtfs-refresh-status-cache-gate.mjs`, edits to `qa/prod-sweep.mjs` |

## Task (for the one PR named in your dispatch)

1. `git fetch origin`, check out the PR branch in your worktree, `git rebase origin/master`.
2. Resolve `qa/run-all.mjs`: keep master's version of every list and add the PR's registration
   line(s) back in the same place(s) the PR originally put them. Nothing else in that file
   should change relative to master.
3. If the PR's new script(s) contain a `localhost:3000` literal, convert them exactly as #372
   did the others: `import { BASE } from "./helpers/dev-server.mjs";` and template the URL.
   No other change to the script.
4. Run, in the foreground with an explicit 600000 ms timeout, never as background tasks:
   `node qa/no-hardcoded-qa-port.mjs`, the PR's own gate(s), then `node qa/run-all.mjs --smoke`.
   Confirm the runner prints a non-3000 port and "Started dev-server.js".
5. `git push --force-with-lease`. Confirm `gh pr view <n> --json mergeStateStatus` is no longer
   `DIRTY`. Do not merge. Add a one-line PR comment: "Rebased onto master after #372; conflict
   was the run-all.mjs registration only; smoke N PASS / 0 FAIL on port <p>."

## Acceptance

- PR diff against master contains only what it contained before, plus the BASE import if step 3
  applied. Verify with `gh pr diff <n> --name-only` before and after.
- Lint gate, PR gate(s) and smoke all pass on the rebased branch.
- No dev servers, headless Chrome or poll loops left running; check `netstat -ano | findstr LISTENING`.
