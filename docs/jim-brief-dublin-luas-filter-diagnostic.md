# Jim brief: Dublin Luas trim over-matches. Step 1: make it visible and make it fail

**For:** Jim (bug-fix / product mode). This brief authorises `qa/` changes only.
**tim-review:** no

## Evidence
The first real Publish GTFS snapshot run (26 Sep 2026, run 36227899926) logged
`routes=11 trips=2371 stops=890 stop_times=123391` from `scripts/trim-dublin-gtfs.mjs`.
Luas is 2 lines (Red and Green) and about 67 stations, maybe around 140 stop rows with platforms.
The trim keeps any route whose name contains "luas", so about 9 non-Luas routes got through
(probably buses such as Luas-link services). `qa/verify-dublin-gtfs-snapshot.mjs` passed
because it only checks that Luas stops appear *somewhere* in stops.txt.
Claude sandboxes can't download the NTA file, so the real contents are only visible in CI logs.

## Do (step 1 only; do NOT change the trim filter yet)
Extend `qa/verify-dublin-gtfs-snapshot.mjs` (it already fetches the published zip) to:
1. Print every row of routes.txt: `route_id | agency_id | route_short_name | route_long_name | route_type`.
2. Print agency.txt in full (agency_id, agency_name).
3. Print the count of distinct stops that the kept trips actually use (from stop_times.txt).
4. **Fail** (exit 1, with a clear message) if there are more than 4 routes or any route_type
   other than 0 (tram/light rail). The print must come before the failure, so the log always
   shows the evidence.
No other files. Keep the existing checks. Test locally with a small synthetic zip or
unit-style inputs, since you can't reach the real blob.

## Acceptance
`node --check` passes, and `node qa/run-all.mjs --smoke` passes apart from named environmental
failures. PR links this brief. No background loops.
