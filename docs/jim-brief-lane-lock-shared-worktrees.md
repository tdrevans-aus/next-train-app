# Jim brief — lane lock is blind across worktrees

Mode: **bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). `tim-review: no` — tooling only, no
copy/IA/API change. No lane lock needed (nothing under `lib/providers/`).

## Symptom

`qa/lane-lock.mjs` resolves its state file relative to the checkout it runs from
(`qa/lane-lock.mjs:43-45`: `REPO_ROOT = path.resolve(__dirname, "..")`, then
`docs/expansion-tracker/lane-locks.json`). The file is gitignored. Since Jim runs with
`isolation: "worktree"` (under `.claude/worktrees/<name>/`), his `acquire` writes the lock inside
his own worktree, where neither the main checkout nor any other worktree can see it. The lock
therefore protects nothing in exactly the situation it exists for.

## Evidence

20 Sep 2026: two Jims acquired locks from their worktrees (`united-states` / `bart`,
`denmark` / `copenhagen`) while `node qa/lane-lock.mjs status` in the main checkout printed
`No lanes locked.` The top-level `check <country>` that CLAUDE.md makes the primary gate would have
reported `free` for both countries.

## Reproduction

```
git worktree add ../tmp-wt -b tmp-lane-lock-repro
cd ../tmp-wt && node qa/lane-lock.mjs acquire testland region-a jim tmp-lane-lock-repro
cd <main checkout> && node qa/lane-lock.mjs check testland     # prints "testland: free." — wrong
```

## Fix

Resolve the lock file to one location shared by every worktree of the repo: the git common dir.

- `git rev-parse --git-common-dir` (run with `cwd` = the script's checkout, via `execFileSync`)
  returns the main repo's `.git` from any linked worktree, and `.git` from the main checkout.
  Resolve it to an absolute path (it can come back relative, e.g. `.git`, in the main checkout —
  resolve against the `cwd` you ran git in). New location: `<git-common-dir>/lane-locks.json`,
  with the mutex beside it (`lane-locks.json.mutex`) so the mutex is shared too — a per-worktree
  mutex would bring back the clobbered-write race the mutex comment describes.
- If git is unavailable or the command fails (not a git checkout), fall back to the old
  per-checkout path rather than crashing.
- **Backward compatibility / migration.** The old path
  `docs/expansion-tracker/lane-locks.json` in the *current checkout* is a legacy file. On any
  command, inside the mutex, if a legacy file exists: merge its entries into the shared file (an
  entry already in the shared file wins for the same country), then remove or rename the legacy
  file so it is not re-imported after a later `release`. Print one line saying what was migrated.
  Migration only needs to cover the checkout the command runs from — do not walk
  `git worktree list`.
- **Keep the self-release behaviour exactly**: `branchMerged` / `releaseMerged` via `gh`, called
  from `status`, `check`, `acquire` and `auto-release`; a `gh` failure must still never unlock.
- While in there: `cmdStatus` and `cmdCheck` call `readLocks()` *outside* the mutex and then write
  inside it (`qa/lane-lock.mjs:148-149`, `172-173`). With the file now genuinely shared between
  concurrent sessions, move the read inside the `withMutex` callback so a stale snapshot can't
  overwrite a lock another worktree just acquired.
- Keep the CLI, output strings and exit codes unchanged. Keep the `.gitignore` entries for the
  legacy path (old files may still exist) and update the comment above them.

## Docs to update

- Header comment of `qa/lane-lock.mjs` (the "Lock state lives in…" paragraph).
- `CLAUDE.md`, "One city per pipeline lane" paragraph: the sentence starting "The lock file
  (`docs/expansion-tracker/lane-locks.json`) is local and gitignored…" must name the new location
  (`<git-common-dir>/lane-locks.json`, i.e. the main repo's `.git/`, shared by all worktrees, never
  committed) and say why (Jim runs in isolated worktrees; 20 Sep 2026 incident). Keep the history
  about why it stopped being committed.
- `.claude/agents/jim.md` only if it names the file's location (lines ~11–29 mention the lock).

## QA script (new): `qa/lane-lock-shared-worktree.mjs`

Must prove a lock acquired from a linked worktree is visible from the main checkout, **without
touching the real repo's lock file or worktree list**. Build a throwaway repo in `os.tmpdir()`:

1. `git init` a temp dir, copy the real `qa/lane-lock.mjs` to `<tmp>/qa/lane-lock.mjs`, commit
   (set `user.name`/`user.email` with `-c` so it works on CI), `git worktree add <tmp-wt> -b wt`.
2. From the **worktree**: `node qa/lane-lock.mjs acquire testland region-a jim` — omit the branch
   so no `gh` lookup happens. Expect exit 0.
3. From the **main** temp checkout: `check testland` exits 1 and names `region-a`; `status` lists
   it; `acquire testland region-b jim` exits 1 ("Refusing").
4. From main: `release testland`; from the worktree: `check testland` exits 0.
5. Legacy migration: write a legacy `docs/expansion-tracker/lane-locks.json` with one entry in the
   worktree. `status` run from the worktree migrates it; afterwards `check` from **main** sees
   that entry and the legacy file no longer exists at the old path.
6. Assert the shared file sits under the temp repo's `.git/` and that nothing was written under
   either checkout's `docs/expansion-tracker/` by steps 2–4.
7. Clean up the temp dirs in a `finally`.

It needs no dev server and no network. Register it in `qa/run-all.mjs` in `SMOKE_SCRIPTS` (and in
`OFFLINE_EXTRA_SCRIPTS` if that is how server-less scripts are marked — read the comments there
and follow the existing convention). `lane-lock.mjs` itself stays in `RUNNER_EXCLUDE`.

## Acceptance criteria

1. From a linked worktree, `acquire` → the main checkout's `check`/`status` see the lock, and the
   reverse.
2. A second region's `acquire` for the same country from a *different* checkout is refused.
3. Lock + mutex live under the git common dir; nothing new is written under `docs/expansion-tracker/`.
4. A legacy per-checkout file is migrated once and not re-imported.
5. Merged-PR auto-release unchanged; `gh` failure never unlocks.
6. CLI, messages, exit codes unchanged.
7. `node qa/lane-lock-shared-worktree.mjs` passes; `node qa/run-all.mjs --smoke` passes and
   includes the new script.
8. `CLAUDE.md` and the script header name the new location.

## Process

Copy this brief into your worktree at `docs/jim-brief-lane-lock-shared-worktrees.md` and commit it
with the fix. Run the new script, then `node qa/run-all.mjs --smoke` with a tool timeout of
600000 ms in the foreground (no background sleep/poll loops — leave nothing running when you
finish). Commit, push, and open a PR against `master` that links this brief. This brief overrides
the "don't commit unless Tim asks" line in your older prompt.
