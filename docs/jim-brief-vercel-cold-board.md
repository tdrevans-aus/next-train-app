# Jim brief — boards on a COLD Vercel instance still exceed the 30 s cap at København H (local cold is 2.5 s)

**Lane:** bug-fix / product mode. **Date:** 8 Oct 2026. **tim-review:** no. **Rule:** Tim, 8 Oct 2026 — never loosen the 30 s maxDuration; make it fast. **Locks:** denmark (copenhagen), australia (sydney) only if you edit those adapters.

## Evidence (controller, production, right after PR #509 deployed)
- First `GET /api/board?city=copenhagen&station=K%C3%B8benhavn%20H` on the new deployment → **504 at 31.9 s**; second → 200 in 6.7 s; then 0.2 s warm (6 rounds). Nørreport first call 6.2 s, then 0.2 s. Sydney Central first call 10.1 s, then 0.2–0.45 s.
- Mark's local fresh-server cold timings for the same boards: København H 2.35–3.2 s, Sydney Central 7.2–7.8 s. So Vercel's cold path is ~10× slower than local for København H.

## Investigate (measure on Vercel, not locally)
1. Create a preview deployment of current master with timing instrumentation behind an env flag (e.g. `BOARD_TIMING=1` logs per-phase ms: module import, static snapshot fetch from Blob, unzip/parse, RT fetch, per-direction fan-out, response) — `npx vercel deploy` from your worktree (preview, NOT production; never `--prod`). Hit København H, Nørreport, Sydney Central, Melbourne Flinders Street, Dublin Abbey Street as the FIRST request on fresh preview instances (new deployment = cold), then warm. Read the logs (`npx vercel logs <preview-url>`), table the phases.
2. Likely suspects: Blob fetch latency/size from the function's region to the Blob store; parse CPU on a small Vercel vCPU; 31 directions firing concurrently on a cold instance so every direction waits on the same uncached static load (in-flight coalescing exists in static-cache — confirm it's used by Copenhagen's path); multiple instances spinning up in parallel for the same burst (each cold) — Fluid Compute concurrency settings.
3. Function region vs Blob region vs upstream region (api/health.js pins syd1; board.js isn't pinned) — check where board runs and where the Blob store lives.

## Fix (whatever the measurements say; keep live-only rules)
Examples: smaller snapshot (pre-indexed/pre-filtered per station so parse is O(station) not O(feed)); serialise the cold load so the fan-out waits on ONE load; region alignment; a lightweight warm-up ping from the existing scheduled sweep/cron to the heaviest hubs (cost-check Actions minutes; prefer piggy-backing on existing schedules). Target on Vercel: first request after a new deployment < 10 s at every measured hub; warm < 1 s.

## Acceptance
- Preview-deployment evidence table before/after (first-request and warm) for the five hubs; `node qa/run-all.mjs --smoke` PLAIN green. PR title: "Cold Vercel boards under 10 s at the biggest hubs (København H, Sydney Central)".
- HARD RULES: never deploy to production; never kill a process you did not start (port 3400 and PIDs 3424/42256/83872 are off-limits); PORT + QA_BASE for local servers; remove any timing instrumentation or keep it off by default.
