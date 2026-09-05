# Jim brief — rebase the streaming GTFS static parser onto master and open a PR

**Dispatched:** 5 Sep 2026 (Tim's call) · **Lane:** `united-kingdom`, region label
`gtfs-streaming-parser`, stage `adapter` (the shared parser serves ~10 live cities in several
countries, but the only region-adapter change is North East, so the UK lane is the one to hold).
Copy this file into the repo as `docs/jim-brief-gtfs-streaming-parser.md` and commit it with
the change.

## What exists

Commit `d659b5b` on branch `origin/claude/affectionate-gauss-77c508` (5 Sep 2026, 04:06 +08,
never merged; the branch sits on an older history lineage so **do not merge the branch** —
cherry-pick the one commit). It rewrites `lib/providers/gtfs/static-cache.js` (+139/−56) and
touches `lib/providers/gtfs/csv.js` (one line):

> Replace the whole-buffer `TextDecoder().decode()` per GTFS table (which hits V8's ~537M-char
> string ceiling, `ERR_STRING_TOO_LONG`, on the North East Metro's ~5.4 GB `stop_times.txt`) with
> a chunked streaming decoder/line-parser for both zip entries and fixture directories, and
> filter `stop_times.txt` inline against the trip-inclusion set (built from `routes.txt` /
> `trips.txt` first) instead of materialising the full table. Filter semantics unchanged;
> verified for quoted fields, CRLF, and rows straddling a chunk boundary.

This is the fix `lib/providers/north-east.js` has been waiting for — its header (lines ~20–32,
~76–78) explains the blocker and `fetchMetroStopBoard()` throws `MetroGtfsTooLargeError` up
front rather than attempting the download.

## What to do

1. `git fetch origin && git checkout -b gtfs-streaming-parser origin/master`, then
   `git cherry-pick d659b5b`. Resolve conflicts against current master's `static-cache.js`
   (master has moved since 04:06; check `git log origin/master -- lib/providers/gtfs/` for what
   changed). Keep the commit's intent exactly; do not widen it.
2. Read the result end to end before running anything. Confirm the exported surface is unchanged
   (`loadGtfsStaticFromDirectory`, `clearGtfsStaticCaches`, `loadGtfsStopCoordsById`,
   `mergeGtfsStaticData`, `loadGtfsStatic`, `findRailStopIdsForName`, `activeServicesForDate`,
   `ymdInTimeZone`, `dayOfWeekIso`) — 23 files import from it.
3. **Do not** un-gate North East in this PR. Leave `MetroGtfsTooLargeError` and the header
   comments as they are, but add one line to the header saying the streaming parser landed in
   PR #<n> and the guard can now be lifted in a follow-up once the ~1.46 GB download is proven in
   a real run. Flipping the guard is a separate, deliberately small PR after this one merges.
4. Add the targeted assertions the commit message describes if they are not already in a QA
   script: a `qa/gtfs-static-streaming.mjs` gate that feeds a fixture directory containing a
   quoted-field row, a CRLF row, and a `stop_times.txt` large enough to span at least two decoder
   chunks, and asserts the parsed rows equal the whole-buffer parse of the same fixture. Register
   it wherever `gtfs-overnight-lookahead.mjs` is registered for `--smoke`. Keep the fixture small
   (generate it in the test, do not commit a large file).

## Verification (report the output)

- `node qa/gtfs-static-streaming.mjs` passes.
- `node qa/gtfs-overnight-lookahead.mjs` passes unchanged.
- Every live GTFS-backed city gate passes unchanged — list them with
  `grep -l "gtfs/static-cache" qa/*.mjs` and run each; at minimum Perth, Sydney, Brisbane,
  Adelaide, Stockholm, Göteborg, Malmö, Uppsala, Helsinki, Oslo, Amsterdam, Rotterdam, Vancouver,
  Wellington, Auckland, Canberra, Gold Coast, Newcastle (AU) — whichever exist.
- `node qa/north-east-planned-gate.mjs` passes unchanged (guard still in place).
- `node qa/run-all.mjs --smoke`. Before starting it run `netstat -ano | findstr :3000`
  (PowerShell) — if another project's dev server holds :3000 the browser scripts will hang; do
  not kill that server, report it, and treat the named gates above as the verification basis.
  Kill the smoke run at 12 minutes if it stalls, leaving no node/chrome processes.

## Guardrails

- `node qa/lane-lock.mjs check united-kingdom` first (top level confirmed free); acquire
  `node qa/lane-lock.mjs acquire united-kingdom gtfs-streaming-parser adapter` before editing.
  The lock self-releases on merge.
- Own worktree. No registry `status` changes, no catalog edits, no un-gating of North East.
- One PR titled "GTFS static: stream-parse tables (unblocks North East Metro)", body: the
  original commit message, the list of city gates run, and the note that the North East guard
  lift is a follow-up. Keep the original commit's authorship via cherry-pick; add your own commit
  on top for the QA gate and header note.
