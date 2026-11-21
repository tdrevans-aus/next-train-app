# Jim brief — Sydney production next-train 500s: hand-published GTFS fixture expired 14 Oct

tim-review: no (restores service; no copy, IA or API-shape change)
Lane: bug-fix / product mode (CLAUDE.md "Bug-fix lane"). Written 21 Nov 2026 by the controller.

## Symptom
Production `GET /api/next-train?city=sydney&...` returns 500 `{"error":"Failed to fetch train times"}`
for **every** Sydney station (Central → Hornsby, Central → Parramatta, Aberdeen, Adamstown, …).
`/api/board?city=sydney&station=Central` returns 200 with `"entries":[]`. `/api/directions` is fine.
The production sweep has reported this every run since **2026-10-15** (issue #514, 100+ comments).
`/api/health` reports `ok:true, stale:[]` throughout.

## Reproduction
```
curl -s "https://next-train-app.vercel.app/api/next-train?city=sydney&station=Central&direction=Hornsby&destination=Hornsby"
```

## Evidence (Vercel runtime log, 21 Nov 2026)
```
[api] 500 city=sydney station=Central: GtfsSnapshotStaleError: GTFS static snapshot is stale for
"unknown city": calendar coverage 20240915..20261014 does not include today (20261121)
  at checkSnapshotFreshness (lib/providers/gtfs/board.js:561)
  at buildBoardForStops (lib/providers/gtfs/board.js:621)
  at boardFromFixture (lib/cities/sydney/dogfood-next-train.js:65)
```

## Root cause (controller triage)
- `lib/cities/sydney/dogfood-next-train.js` `loadSydneyBoard()`: when `VERCEL === "1"` it **always**
  uses `boardFromFixture()`, which loads `gtfsFixtureBlobUrl("sydney")` — a hand-published blob
  snapshot — with an empty realtime index.
- That snapshot's calendar ends 2026-10-14. It was never refreshed, because Sydney is **not** a unit
  in `.github/workflows/refresh-hand-published-gtfs.yml` (units: prague, dublin, copenhagen, brussels,
  melbourne, malmo, uppsala) nor in `lib/gtfs-refresh.js`. #510 (8 Oct) was meant to cover every
  hand-published `gtfsFixtureBlobUrl()` city and missed Sydney.
- `staleData` passes `cityId: null` ("unknown city"), so the staleness registry never records Sydney
  and `/api/health` `stale` stays empty.
- Existing tooling: `scripts/download-sydney-gtfs-zips.mjs` (needs `TFNSW_API_KEY`) +
  `scripts/trim-sydney-gtfs.py` build `qa/fixtures/sydney/gtfs`.

## Required changes
1. **Restore now:** rebuild the Sydney snapshot from current TfNSW static GTFS and republish it to
   the blob at the path `gtfsFixtureBlobUrl("sydney")` reads. Same route types (2, 401) and trim as today.
   After republishing, warm instances keep the cached stale snapshot (6 h TTL). Confirm whether
   #510's stale eviction now drops it. If it doesn't, say so in the PR. A prod redeploy is the
   controller's call, not yours.
2. **Never again:** add `sydney` as a unit in `refresh-hand-published-gtfs.yml` with the same
   change-driven pattern as the other units. It needs `TFNSW_API_KEY`, so wire that as a secret
   env. If the secret isn't set in Actions, the unit must fail loudly the same way malmo/uppsala do.
   Don't skip it silently.
3. **Health visibility:** pass `cityId: "sydney"` through the fixture path so the stale error lands in
   the staleness registry and `/api/health` `stale` lists Sydney when this happens.
4. Do **not** change the `VERCEL === "1"` → fixture branch (whether prod Sydney should use TfNSW
   realtime is a separate product question for Tim). Note in the PR how many other
   `gtfsFixtureBlobUrl()` cities are missing from the refresh list, if any. Report them; don't fix them.

## Acceptance criteria
- Production Central → Hornsby / Parramatta return 200 with a `next` trip after republish (Jim
  reports the curl output; the controller re-verifies).
- The refresh workflow's unit list includes sydney; a `dry_run` dispatch (or local equivalent) shows
  a sydney decision row.
- A QA script (new, or extended `qa/prod-sweep-refresh-failed-gate.mjs` or similar) fails when a
  `gtfsFixtureBlobUrl()` city used by a live city is absent from the refresh units, and goes red on
  the pre-fix workflow. Mark will run a mutation check on it.
- Sydney stale errors carry `cityId: "sydney"` (unit-level check in the same or a sibling script).
- `node qa/sydney-dogfood-gate.mjs` (or the Sydney gate in run-all) and `node qa/run-all.mjs --smoke` pass.

## Process
Worktree, branch `fix/sydney-fixture-expired`. This brief is an untracked file in the main checkout
at `C:\Users\tdrev\Projects\next-train-app\docs\jim-brief-sydney-fixture-expired.md`. Copy it into
your worktree and commit it with the PR. Commit, push, and open a PR linking this brief.
