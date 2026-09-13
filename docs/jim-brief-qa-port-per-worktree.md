# Jim brief — one dev-server port per QA run, never attach to a stranger's :3000

Lane: bug-fix / product mode (CLAUDE.md "Bug-fix lane"). Worktree isolation. Pinned model.
tim-review: no — tooling only, no copy/IA/API-shape change.
Written 13 Sep 2026 by the top-level session after the 09:37–09:58 incident below.

## Symptom

Six `node qa/run-all.mjs --smoke` runs, started between 09:37 and 09:54 on 13 Sep from four
different worktrees (Canberra refresh, Sydney direction-match fixture, privacy-copy-3.0.0,
vercel-memory-not-applied), all ran their Playwright scripts against **one** `dev-server.js`
on `:3000` — the one spawned by the Canberra run. The other five printed
`Using existing server on http://localhost:3000` and silently tested the Canberra worktree's
code. Six suites sharing one server plus six headless Chromes made a 1-minute script take
8 minutes, so every run looked hung for 20+ minutes. All six were killed; their results were
worthless either way.

This is the "multiple sessions, one checkout" failure the repo already knows about (memory:
shared worktree with subagents; CLAUDE.md lane-lock rationale), now reproduced through the QA
runner instead of git.

## Root cause (two halves, both must be fixed)

1. **`qa/helpers/dev-server.mjs` `ensureDevServer()` attaches to any live `:3000` when not in
   CI.** Locally (`force=false`) it probes `BASE` and, if anything answers, returns `null` and
   the runner says "Using existing server". There is no check that the server it found is
   serving *this* worktree. CI already refuses (`force=true` throws) — local runs should be
   equally strict by default.
2. **77 of the 84 browser scripts hardcode `http://localhost:3000`** instead of reading
   `QA_BASE` (only 7 do; 27 import the helper). So even if the runner picked a free port and
   exported `QA_BASE`, most scripts would still hit `:3000`. List them with:
   ```bash
   grep -lE 'localhost:3000' qa/*.mjs | xargs grep -L 'QA_BASE'
   ```

## Fix

### A. Runner picks a free port per run and refuses to attach (local default)

In `qa/helpers/dev-server.mjs`:

- If `QA_BASE` is unset, choose a free port at runtime (bind a `net` server to port 0, read
  the port, close it) and set `BASE`/`DEV_PORT` from it. Export the chosen base into
  `process.env.QA_BASE` so every child script spawned by `run-all.mjs` inherits it.
- Local default becomes: **always spawn a fresh `dev-server.js` on the chosen port**. Attaching
  to an existing server is opt-in only, via `QA_ATTACH=1` together with an explicit `QA_BASE`
  (the "another project holds :3000, I started my own server" case the helper comment already
  describes). Never attach when `QA_BASE` was not set by the user.
- CI (`force=true`) behaviour is unchanged: it still throws if the target port is busy.
- `run-all.mjs` lines ~499–505: print the actual base URL, not the literal
  `http://localhost:3000`, and pass `QA_BASE` in each child's env (it spawns with
  `process.env`, so setting it in the helper before the spawn loop is enough — verify).
- `stopDevServer()` must still kill the server this run spawned, and on Windows must kill the
  process tree (the killed runs today left `chrome-headless-shell` orphans; check whether that
  is the runner's doing or the killed scripts' and fix only if it is the runner's).

### B. Every script reads the base from one place

- Mechanically replace the literal in all 77 scripts with the helper's export:
  `import { BASE } from "./helpers/dev-server.mjs";` (adjust relative path for scripts in
  subfolders). Scripts that build the URL inline (`http://localhost:3000/?test=1…`) become
  `` `${BASE}/?test=1…` ``. Keep a script runnable standalone: the helper's fallback when
  `QA_BASE` is unset and the script is run directly (not under `run-all.mjs`) stays
  `http://localhost:3000`, so `node qa/foo.mjs` against a hand-started server keeps working.
  Distinguish the two cases by an env flag the runner sets (e.g. `QA_RUNNER=1`), not by
  guessing.
- Add an **offline lint gate** `qa/no-hardcoded-qa-port.mjs`: fails if any file under `qa/`
  other than `helpers/dev-server.mjs` contains `localhost:3000` (or `:3000` inside a URL).
  Register it in `run-all.mjs` as an offline script in the smoke tier so the regression cannot
  come back. Note in its header that the ~77-file sweep was the reason it exists.
- `dev-server.js` itself needs no change: it already honours `PORT`.

### C. Doc line

Add three lines to CLAUDE.md under "QA suite tiers": each `run-all.mjs` invocation now gets
its own dev server on a free port; parallel runs from different worktrees are safe; to point
the suite at a server you started yourself use `QA_BASE=… QA_ATTACH=1`.

## Acceptance criteria

1. Two `node qa/run-all.mjs --smoke` runs started within seconds of each other from two
   different worktrees each print a *different* base URL, each spawn their own `dev-server.js`,
   and each serve their own worktree's `public/` (prove it: temporarily differ a marker in one
   worktree's `public/index.html` and assert the right one is seen by each run's
   `smoke-browser`, or equivalent).
2. `node qa/run-all.mjs --smoke` in one worktree with nothing else running passes, in a time
   comparable to today (~2–5 min). Report the before/after wall time.
3. `CI=true` behaviour unchanged: `ensureDevServer({force:true})` still throws when the port is
   busy. `web-qa` green on the PR.
4. `node qa/no-hardcoded-qa-port.mjs` passes on the branch and fails if you reintroduce
   `localhost:3000` in any script (show the failing output once in the PR description).
5. Running a single script directly (`node qa/region-selection.mjs`) with a hand-started
   `node dev-server.js` on 3000 still works.
6. No `QA_BASE` leakage into CI workflows (`.github/workflows/*.yml` untouched apart from
   nothing; `npm run test:pin` still uses a fresh forced server).

## QA scripts that must pass

- `node qa/no-hardcoded-qa-port.mjs` (new)
- `node qa/run-all.mjs --smoke`
- the parallel-run proof from criterion 1, described in the PR (a small
  `qa/.parallel-smoke-proof.sh` under `qa/` with a leading dot is fine if it helps Mark
  re-run it; do not register it in `run-all.mjs`).

## Process

- Worktree isolation; branch `jim/qa-port-per-worktree`. No lane lock needed (nothing under
  `lib/providers/`).
- Copy this brief into the worktree and commit it with the change; the top-level session does
  not commit briefs to local master.
- Commit, push, open a PR linking this brief, with the wall-time comparison and criterion-1
  proof in the description.
- Leave no background sleep/poll loops or dev servers running when you finish. Check with
  `netstat -ano | findstr LISTENING` that your run's port is released.
