# Jim brief — Oslo boards show only 1–2 trains per direction

Mode: **bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Oslo is LIVE (release 1).
`tim-review: no` — no copy, IA or response-shape change; more rows of the same kind.
Written 20 Sep 2026 by the controller session; Tim's instruction in chat: "Fix Oslo". Copy this
file into your worktree and include it in your PR (it is untracked in the main checkout on
purpose).

## Symptom (production, 20 Sep 2026 ~12:00 UTC)

`/api/board?city=oslo&station=Stortinget` returns 10 directions with **1–2 trains each**, the
furthest 3–18 minutes ahead (e.g. `1 + Bergkrystallen` → one train at +5; `1 + Frognerseteren`
→ one at +10). Helsinki's equivalent shows 5 per direction, 41–48 minutes ahead. With the default
10-minute leave-before, many Oslo rows are already "late" and the leave-by job fails for any walk
over a few minutes.

## Suspected cause

`lib/providers/oslo.js` requests `estimatedCalls(numberOfDepartures: $n …)` from Entur with
`numberOfDepartures` defaulting to **15 per stop place** (line ~240) and then splits the result
across every line and direction at the stop — at Stortinget (5 T-bane lines × 2 directions, plus
any Vy rows ruled `in`) that leaves 1–2 each. Entur's JourneyPlanner supports a much larger
`numberOfDepartures`, a `timeRange`, and `numberOfDeparturesPerLineAndDestinationDisplay`, which
is purpose-built for this.

## Fix

- Make every direction at a busy hub carry a useful horizon: target ≥5 departures per direction
  or ≥45 minutes ahead (whichever the feed reaches first) at Stortinget, Jernbanetorget,
  Nationaltheatret and Majorstuen, without starving low-frequency directions (the Vy
  regional/commuter rows at Jernbanetorget / Nationaltheatret are `in` and run far less often
  than the T-bane — a plain bigger `numberOfDepartures` may still crowd them out; prefer
  `numberOfDeparturesPerLineAndDestinationDisplay` with a sensible `timeRange`, confirmed
  against Entur's live schema, not from memory).
- Still live-only: only `estimatedCalls` with realtime; keep whatever the adapter already does
  for calls where `realtime` is false (do not start presenting non-realtime calls as live —
  check what it does today and keep it; say which in the PR).
- Keep the response size and latency sane: measure `/api/board` for Stortinget before/after
  locally; stay under 3 s cold. Respect Entur's `ET-Client-Name` header etiquette already in
  the adapter and its rate limits; keep the existing cache TTL behaviour.
- Check the other API-board adapters for the same "fixed N split across directions" pattern
  while you are there — `lib/providers/helsinki.js`, `stockholm.js`, `vasttrafik.js` — and
  **report** (do not fix) any that would starve a busy hub; the controller is running a
  production horizon sweep separately.

## QA
- Extend `qa/oslo-dogfood-gate.mjs`: with a fixture shaped from a REAL Entur response for
  Stortinget (trim it; mark any synthetic rows), assert every direction present yields ≥3
  upcoming trips when the fixture contains them, and that a low-frequency direction is not
  dropped when high-frequency lines fill the response.
- Live check (a handful of calls): Stortinget, Jernbanetorget, Majorstuen, and one outer-branch
  station — list trains per direction and furthest-ahead minutes before/after in the PR.
- `node qa/oslo-dogfood-gate.mjs`, `node qa/run-all.mjs --smoke` pass.

## Mechanics
- Lane lock: `node qa/lane-lock.mjs check norway`, then `acquire norway oslo jim <branch>`.
- Branch from up-to-date `origin/master`. Do not change Oslo's `status`.
- lib/ code reached from api/ must not use bare npm imports (breaks in the Vercel bundle).
- Smoke in the foreground with a 600000 ms timeout, output to a file you then read. Foreground
  commands with explicit timeouts only — no background processes, sleeps or poll loops.
- Commit, push, open a PR that links this brief. Do not merge.
