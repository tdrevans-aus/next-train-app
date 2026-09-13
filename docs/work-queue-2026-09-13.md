# Work queue — 13 Sep 2026 (single controller: this session)

Written 10:15 WAST after Tim stopped every other session. Six concurrent smoke suites had
collided on one `:3000` dev server (see `docs/jim-brief-qa-port-per-worktree.md`). Until that
brief lands, **no two smoke runs may overlap**, so nothing that needs `--smoke` is dispatched
while Jim's port PR is in flight. Concurrency cap after it lands: two Sonnet agents.

## Done during the cleanup
- PR #369 (Sydney direction-match local fixture) — merged 02:03 UTC by its own session.
- PR #365 (Brussels planned gate, real fetchStationBoard) — Mark PASS 12 Sep, CI green,
  merged 02:10 UTC by this session under the standing rule.
- `docs/expansion-tracker/lane-locks.json` on the master checkout shows `{}` (a stale UK
  lock dropped); `node qa/lane-lock.mjs status` reports no lanes locked. Leave as is.

## Step 0 — DONE 03:22 UTC
**PR #372 QA port per worktree** merged (Mark PASS on all six criteria, CI green). Parallel
smoke runs from different worktrees are now safe.

## Step 0.5 — rebases (brief `docs/jim-brief-rebase-after-372.md`)
#372's sweep made #367, #370 and #368 `DIRTY` (gate registration in `qa/run-all.mjs`).
- #370 rebased, Mark PASS (8/8), **merged 03:45 UTC**.
- #367 rebased twice (second time after #370), Mark PASS, **merged 04:05 UTC**.
- #368 rebased once (03:55), auto-merged cleanly after #367, Mark re-review PASS, **merged
  ~04:25 UTC**.

## Step 2 — in flight 04:25 UTC (two Jims)
- Canberra syd1 pin: Jim finishing from branch `canberra-refresh-syd1-pin` (rebase, gates,
  smoke, open PR). Brief now at `docs/jim-brief-canberra-refresh-region.md` on the main checkout.
- Vercel memory Task 2: Jim carrying the uncommitted work out of worktree
  `agent-a4f359be6ac617352` onto branch `jim/vercel-memory-not-applied`, finishing, opening PR.
Each PR then gets Mark, then merge.
Every PR that adds a run-all.mjs registration line dirties the others when it merges: expect
one cheap re-rebase per remaining PR after each merge.

## Step 1 — reviews of already-green PRs (Mark, two at a time)
1. **PR #367** `jim/security-launch-fixes` — D-03 cleartext removal + D-04 feedback
   rate-limit/honeypot. Brief `docs/jim-brief-security-launch-fixes.md`, tim-review: no.
   CI green, no Mark note yet. Mark → merge.
2. **PR #370** `jim/eu-ad-consent` — D-01 Google UMP consent before native ad requests.
   Brief `docs/jim-brief-eu-ad-consent.md`, tim-review: no. CI green, no Mark note yet.
   Mark → merge. **Privacy copy (step 3.3) depends on this merging first.**
3. **PR #368** `refresh-status-cache-and-memory` — Mark FAILED the 4 GB memory half (not
   applied on the deployed lambda, proven with `vercel inspect`); Jim reverted the memory
   change at 01:45 UTC and the PR is now cache-bust only, CI green. Worktree
   `agent-a01377310c982eb00` is clean. Mark re-review (brief
   `docs/jim-brief-vercel-memory-not-applied.md` Task 1 describes the split) → merge.

## Step 2 — Jim work that was mid-smoke when killed (finish, don't restart)
1. **Canberra 403 → pin `api/health.js` to syd1.** Brief
   `.claude/worktrees/wizardly-almeida-bb4af4/docs/jim-brief-canberra-refresh-region.md`
   (untracked there; copy to `docs/` on the master checkout first). Work is committed and
   pushed on `canberra-refresh-syd1-pin` (commit 16281e8, worktree `agent-a1490eae96c5b9236`):
   per-function `regions` override, `cf-mitigated` surfaced in `downloadZip` errors, new
   `qa/vercel-health-region-gate.mjs`. **No PR yet** — Jim was running `--smoke` before opening
   it. Dispatch: fresh Jim, bug-fix mode, reuse that branch, run the gate + `--smoke`, open PR.
   Lane: Australia/canberra — run `node qa/lane-lock.mjs check Australia` first (free at
   10:15). Then Mark → merge. tim-review: no.
2. **Why `vercel.json` function memory is not applied** (Task 2 of
   `docs/jim-brief-vercel-memory-not-applied.md`). Uncommitted in worktree
   `agent-a4f359be6ac617352`, branch `vercel-memory-not-applied`: edits to `api/health.js`,
   `qa/run-all.mjs`, `vercel.json`, new `qa/vercel-json-no-inert-memory-gate.mjs`. Jim was
   running `--smoke`. Dispatch: fresh Jim in that worktree (or diff it into a new one), finish
   smoke, commit, push, PR → Mark → merge. tim-review: no.

## Step 2.5 — added 04:50 UTC (Tim chose option 1: alarm instead of memory)
- PR #373 Canberra syd1 — Mark PASS, **merged 04:39 UTC**. Proof: next 03:17 UTC cron.
- PR #374 Vercel memory — Mark PASS, re-rebased after #373, **merged ~05:20 UTC**. Dashboard
  Performance tier remains Tim's lever if a refresh ever fails at 2 GB.
- **PR #375 prod-sweep alarm** — Mark PASS (4/4), clean, **merged ~05:25 UTC**. The next
  scheduled sweep will go red naming canberra until #373's first successful 03:17 UTC cron;
  that is expected, not a regression.
- **Privacy copy D-02** — draft PR #376 on `jim/privacy-copy-3.0.0-v2`, Mark green with one
  ambiguity for Tim: the consent sentence should be scoped to Android/iOS because the web
  AdSense path has no consent gate (harmless today, AdSense unconfigured). **Waits for Tim.**

## Launch day — path 1 chosen 06:10 UTC (submit Play production today, staged rollout)
Agent lane — all done by 07:40 UTC:
1. Dwayne: **conditional sign-off** written into `docs/dwayne-security-review-play-3.0.0.md`
   (main checkout). Conditions: #376 merges as reviewed; Tim confirms EEA consent form on a
   device and the D-09 Play Console declarations around rollout.
2. Release 3.0.1 / code 25: PR #377 Mark PASS, **merged, tagged `v3.0.1` at af94418**. Tim
   builds the AAB from this tag.
3. #376 privacy copy: consent sentence scoped to Android/iOS, PR ready for review. **Waits for
   Tim's approval**, then top-level merges (Vercel deploys privacy/about).
4. Play screenshots: PR #378, six frames. Top-level view: 01 and 03 shippable, 05 coverage
   should be rejected (unstyled listboxes), 02 shows On Time, 06 from the unmerged #376 branch.
   Tim/Ruth pick. Side finding: non-Perth boards show the "Updated" time as a raw ISO string —
   post-launch Jim brief.
Tim lane: build+sign AAB from `v3.0.1` (Android Studio; `npm run release:prep` first); device
checks (widget LB-02, reminders LB-03, EEA consent form); Play Console (D-09 declarations,
Data safety per cheat-sheet, Ruth §2 copy, feature graphic+icon, screenshots, A$7.99 product,
production upload with staged rollout, release notes); optional Sentry→GitHub alert.

## Earlier queue empty as of ~05:50 UTC
Everything from the stopped sessions is merged except #376 (Tim's review). Watch: next
03:17 UTC cron for Canberra; the sweep is red on canberra until then by design.

## Step 3 — Tim-gated
3. **Privacy policy + Data safety copy for 3.0.0 (D-02).** Brief
   `docs/jim-brief-privacy-copy-3.0.0.md`, **tim-review: yes**. Uncommitted in worktree
   `agent-a8bd7bc0b6f35a12d`, branch `jim/privacy-copy-3.0.0`: `public/privacy.html`,
   `public/about.html`, `docs/play-data-safety-cheatsheet.md`. Jim reported two suite
   failures that passed individually (contention) and was re-running smoke. **Do not dispatch
   until #370 has merged** (policy text must describe the consent flow). Then Jim finishes →
   Mark → hand PR to Tim; never merged by an agent.

## Not ours, flagged only
- `npx vercel integration add upstash` from 21:46 last night is still alive, almost certainly
  waiting on an interactive prompt in Tim's terminal.
- Two Codex `scripts/simulate-tournament.mjs` processes from 21:55 last night, another project.
- Dwayne's Play sign-off (`docs/dwayne-security-review-play-3.0.0.md`) is unblocked only when
  D-01 to D-04 above are all merged and Tim has reviewed D-02.
