# Jim brief — Sydney down since #549: TfNSW realtime times out from Vercel's US-region functions

tim-review: no. Tim chose "fix forward" over reverting #549 (chat, 24 Nov 2026).
Lane: bug-fix / product mode. Country australia, city sydney: acquire the lane lock.

## Symptom (production, since #549 merged 22 Nov 2026 — ~2 days down)
- `/api/board?city=sydney&station=Central` → 503 `PROVIDER_UNAVAILABLE` in ~6 s.
- `/api/next-train?city=sydney&station=Central&direction=T1%20Hornsby&destination=T1%20Hornsby` → 500.
- Sweep issue #551 is alerting on Sydney.
- Vercel logs: `Sydney sydneytrains|metro|nswtrains realtime feed skipped: The operation was aborted due to
  timeout`, then `Sydney realtime unavailable: all 3 TfNSW feeds failed`.

## Evidence and suspects
- `lib/providers/gtfs/realtime.js:15` — `timeoutMs` default **4000**.
- `vercel.json` pins only `api/health.js` to `syd1` (it was pinned because Canberra's feed 403'd from the default
  US region). `api/board.js` and `api/next-train.js` run in US regions — logs show `cle1`. Jim's local
  test of #549 ran from Australia (cold 2.4 s), so it never exercised this.
- Unknown: is TfNSW slow from the US, or geo-blocking/dropping non-AU traffic (Canberra's 403 suggests
  agencies do)? Find out — don't guess.

## Required work
1. **Diagnose from Vercel, not locally.** Measure TfNSW RT fetch latency/outcome from a US-region and a
   `syd1` function — e.g. a temporary diagnostic on the PR's preview deployment, or read production logs
   with timings. Report both. Remove any diagnostic code before merge.
2. **Fix, choosing by evidence** (state the choice and the numbers in the PR):
   - (A) Pin `api/board.js` and `api/next-train.js` to `syd1`. Affects every city — you must measure
     cold and warm `/api/board` for the slowest hub of each non-AU region (London Waterloo/King's Cross,
     København H, Stockholm C, Dublin Connolly, Wien, Praha, a US city in service hours) before and after,
     and show none regresses past the targets below; or
   - (B) a Sydney-only path that keeps other cities where they are (e.g. a longer TfNSW-specific
     timeout if TfNSW is merely slow from the US) — only if (1) shows the feeds do answer from the US;
   - anything else, with numbers. No new function routes (Hobby plan is at the 12-function cap).
3. Keep #549's honesty rules: per-trip `realtime`, refuse (503) when all feeds fail, no timetable
   fallback labelled live, coalescing/backoff. Never loosen `maxDuration` (memory "30 s cap is a ceiling").

## Acceptance criteria
- Production after merge: Central board 200 with `realtime:true` rows in service hours; Central → T1
  Hornsby `next` with `realtime:true`. Central `/api/board` warm < 3 s, cold < 10 s, measured on Vercel.
  The controller re-verifies.
- Measurements from item 1 (and item 2(A)'s per-region numbers if chosen) in the PR description.
- `node qa/sydney-vercel-realtime.mjs`, Sydney gates, `node qa/run-all.mjs --smoke` pass. If you change the
  timeout path, extend `qa/sydney-vercel-realtime.mjs` so a 4 s-class timeout regression goes red.

## Process
Worktree, branch `fix/sydney-rt-timeout-us-region`. Copy this brief from
`C:\Users\tdrev\Projects\next-train-app\docs\jim-brief-sydney-rt-timeout-us-region.md` (untracked in the main
checkout) into your worktree and commit it with the PR. Commit, push, open a PR linking it. Another Jim is
fixing Uppsala in parallel (lib/providers/uppsala.js) — don't touch Sweden files.
