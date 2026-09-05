# Jim brief — Darwin server-side cache + King's Cross LNER exclusion removal

**Dispatched:** 5 Sep 2026 (Tim's call, recorded in `docs/united-kingdom-ledger.md` open items 4
and propagation log) · **Lane:** `united-kingdom`, stage `adapter`, region label `darwin-cache`
· **Priority:** ASAP — must land before the four open flip PRs (Solent #219/#220, Thames Valley
#222, Greater Anglia #223, West Yorkshire — already merged #217) take the live Darwin region
count past nine.

## Why

`docs/uk-architecture.md` and `docs/uk-provider-design.md` both specify a 15–30 second
server-side cache in front of Darwin. It was never built. Five regions are live on
`lib/providers/uk-darwin.js` today and every rider refresh is one Darwin call. Rail Data
Marketplace products carry request quotas; the licensing check (ledger open item 1) may also turn
up a cache/rate condition. Collapse concurrent and repeated requests for the same station into one
upstream call per window.

## Item 1 — the cache (the main job)

Implement in `lib/providers/uk-darwin.js` only. Do not touch any region adapter, `registry.js`,
or `lib/providers/uk/`.

Contract:
- **Key:** CRS code plus whatever request-shaping options reach the upstream fetch (rows/time
  window). Operator filtering (`excludeOperators` / `includeOperators`) is applied *after* the
  cache, on the cached raw payload, so King's Cross's filtered and unfiltered callers share one
  upstream fetch. Read the existing `fetchStationBoard()` flow first and put the cache boundary
  at the raw-JSON layer, before `providerTripToInternal`.
- **TTL:** 20 seconds, exported as a named constant so QA can reference it. Module-level `Map`,
  no external dependency, no disk.
- **In-flight coalescing:** concurrent callers for the same key await one shared promise; a
  rejected fetch is not cached (next caller retries).
- **Stale-on-error:** if a refresh fails and a stale entry younger than 60 seconds exists, return
  it and log once; otherwise propagate the error unchanged. Keep every existing error class
  (`MissingDarwinTokenError`, etc.) behaving exactly as today when there is no cache entry.
- **Bounded:** evict entries older than 60 seconds on insert so the map cannot grow without
  limit across 150+ CRS codes.
- **Bypass:** honour an existing fixture/test path if one already skips the network — check how
  `qa/*-dogfood-gate.mjs` scripts for UK regions drive the provider before deciding; do not
  invent a new env flag if a pattern already exists. If none exists, a `{ noCache: true }` option
  on the fetch is acceptable.

Verification (all required, report the output):
- `node qa/west-of-england-dogfood-gate.mjs` and `node qa/uk-west-midlands-dogfood-gate.mjs`
  (or whichever UK gates exist for live regions — list them with `ls qa/*dogfood-gate.mjs`)
  pass unchanged.
- A small new script `qa/uk-darwin-cache.mjs` (register it wherever UK gates are registered for
  `--smoke`): two concurrent calls for the same CRS produce one upstream fetch; a call after TTL
  produces a second; a filtered and an unfiltered call share one fetch. Stub the upstream with a
  counter — do not hit Darwin in the test.
- `node qa/run-all.mjs --smoke` green.

## Item 2 — King's Cross LNER exclusion (one-line, same PR)

Tim resolved LNER's board-eligibility verdict at King's Cross to `in` on 5 Sep 2026 (ledger §3
and propagation log). Remove `"LNER"` from King's Cross's `excludeOperators` array in
`lib/cities/london-se-national-rail/stations.json` and update the adjacent `class` prose and the
top-of-file note (line ~15) to say LNER is `in` per the UK ledger, 5 Sep 2026. Do not edit
`docs/london-se-national-rail-d1/` — the pack is immutable history; the ledger carries the
decision. Update the file-header comment in `lib/providers/london-se-national-rail.js` (the
"EXCLUDED-OPERATOR groups" paragraph) to match. London SE is still `planned`; no flip.

## Guardrails

- Run `node qa/lane-lock.mjs check united-kingdom` then
  `node qa/lane-lock.mjs acquire united-kingdom darwin-cache adapter` before touching shared
  files. Stop and report if the lane is held by someone else.
- Work only in your own worktree; another session is using the primary checkout on a flip
  branch. Branch from `origin/master`.
- Do not flip any region live, do not edit `registry.js`, do not touch the four flip branches.
- Open one PR titled "Darwin server-side cache (20s) + King's Cross LNER in" with the
  verification output in the description and the lane-lock release command
  (`node qa/lane-lock.mjs release united-kingdom darwin-cache`) noted for post-merge.
