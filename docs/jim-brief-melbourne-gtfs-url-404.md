# Jim brief — Melbourne directions 500 everywhere: snapshot/realtime ID mismatch, PTV GTFS URL 404s

tim-review: no (restores service; no copy, IA or API-shape change)
Lane: bug-fix / product mode (CLAUDE.md "Bug-fix lane"). Written 21 Nov 2026 by the controller.

## Symptom
Production `GET /api/directions?city=melbourne&station=<any>` returns 500
`{"error":"Failed to load directions"}`. Verified at Flinders Street, Alamein and Aircraft. The
production sweep has reported this every run since **2026-11-05** (issue #514).

## Reproduction
```
curl -s "https://next-train-app.vercel.app/api/directions?city=melbourne&station=Flinders%20Street"
```

## Evidence
Vercel runtime log, 21 Nov 2026:
```
[api] 500 city=melbourne station=Flinders Street: GtfsSnapshotStaleError: GTFS static snapshot is
stale for "melbourne": only 0/244 realtime trip IDs resolved against the snapshot (< 50%) — zero
resolved suggests an ID-scheme mismatch between the realtime feed and the published static snapshot
  at checkSnapshotFreshness (lib/providers/gtfs/board.js:590)
  at fetchStationBoard (lib/providers/melbourne.js:250)
```
Refresh workflow `refresh-hand-published-gtfs.yml`, every run since 25 Oct (last success 2026-10-25):
```
melbourne | FAILED | command failed (exit 1): node scripts/publish-melbourne-gtfs-to-blob.mjs --download
statewide GTFS download failed: HTTP 404
  at resolveOuterZipBytes (scripts/trim-melbourne-gtfs.mjs:142)
```
The hard-coded URL in `scripts/trim-melbourne-gtfs.mjs:21`
(`opendata.transport.vic.gov.au/dataset/3f4e292e-…/resource/fb152201-…/download/gtfs.zip`) now 404s.

## Suspected cause
Transport Victoria moved or reissued the GTFS Schedule resource, and may also have changed its
trip-ID scheme. Zero of ~240 realtime IDs resolve, which is not ordinary staleness. Realtime feeds:
`lib/providers/melbourne.js:16-17`. Dataset landing page: `https://opendata.transport.vic.gov.au/dataset/gtfs-schedule`.

## Required changes
1. Find the current GTFS Schedule download. Prefer resolving it from the dataset's CKAN API
   (`/api/3/action/package_show?id=gtfs-schedule` or equivalent) at run time over another pinned
   resource UUID, so the next reissue doesn't break the refresh. Keep a clear error if resolution fails.
2. Republish `gtfs/melbourne.zip` **and** `gtfs/melbourne-vline.zip` with the existing trim. Check the
   zip-of-zips layout (`1/` V/Line, `2/` metro) still holds, along with the quoted calendar dates.
3. After republishing, measure the realtime trip-ID resolve rate against the new snapshot, for metro
   and V/Line. If it's still near 0%, the IDs changed scheme. Find the mapping, fix it in the join or
   the trim, and explain it in the PR. Don't loosen the 50% freshness threshold.
4. Stale eviction: say in the PR whether warm prod instances drop the old snapshot without a
   redeploy. A redeploy is the controller's call.

## Acceptance criteria
- Production Flinders Street, Alamein and a V/Line station (e.g. Geelong) directions return 200,
  and a next-train chip has a trip. Report the curl output; the controller re-verifies.
- A `refresh-hand-published-gtfs.yml` run (`workflow_dispatch`, `cities=melbourne`) goes green for
  the melbourne unit, or the local equivalent if you can't dispatch.
- A QA script proves the URL resolution: it fails for a pinned dead resource and passes for the
  resolver. Mark will mutation-check it. Network-free (fixture CKAN response) is preferred so smoke
  doesn't hit PTV.
- `node qa/melbourne-dogfood-gate.mjs` (or the Melbourne gate in run-all) and
  `node qa/run-all.mjs --smoke` pass.

## Process
Worktree, branch `fix/melbourne-gtfs-url-404`. This brief is an untracked file in the main checkout
at `C:\Users\tdrev\Projects\next-train-app\docs\jim-brief-melbourne-gtfs-url-404.md`. Copy it into
your worktree and commit it with the PR. Commit, push, and open a PR linking this brief.
