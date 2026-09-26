# Jim brief: point Dublin's trim at the dedicated Luas GTFS feed

**For:** Jim (bug-fix / product mode). This brief authorises `scripts/` and `docs/dublin-d1/` changes.
**tim-review:** no

## Evidence
The CI diagnostic run 36228663901 (26 Sep) showed that `GTFS_All.zip` contains **no Luas routes**,
only 11 Dublin Bus routes whose names mention Luas stops. Nico's research
(`docs/dublin-d1/luas-static-source.md`) points to the dedicated feed
`https://www.transportforireland.ie/transitData/google_transit_luas.zip` (no key, CC BY 4.0,
listed on Transitland and the Mobility Database). Its contents are **unverified**: sandboxes
can't download it. `qa/verify-dublin-gtfs-snapshot.mjs` (merged in #458) will verify it in CI.
It fails unless the upload holds at most 4 routes, all route_type 0, and it prints the evidence.

## Do
1. In `scripts/trim-dublin-gtfs.mjs`, change the source URL to `google_transit_luas.zip`, and let
   an env var `DUBLIN_GTFS_URL` override it. Replace the "name contains luas" filter with:
   keep routes with route_type 0 (tram), or 900 (the extended tram code). Keep the trim small.
   Since the feed should be Luas-only, keep all of its tram routes. Update the header comment:
   GTFS_All.zip excludes Luas, and the operator has been KeolisAmey since 1 Sep 2026.
2. Update `docs/dublin-d1/jim-handoff.md` with the new source, and add CC BY 4.0 attribution
   text to its notes. Don't add UI copy.
3. Also relax the verify script to accept route_type 900 as well as 0, if it doesn't already.
4. Don't touch `lib/providers/`. The adapter reads the published blob, not this URL.

## Acceptance
`node --check` passes on both files. `node qa/run-all.mjs --smoke` passes apart from named
environmental failures. The top-level session then runs the Publish GTFS snapshot workflow from
this branch, and the verify step must pass (2 tram routes, about 67 stations) before merging.
PR links this brief. No background loops.
