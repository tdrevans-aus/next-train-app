# Jim brief: Dublin flip branch, two blockers found by the directions generator

**For:** Jim (bug-fix / product mode). Continue on the existing branch `flip-dublin-live`
(`git checkout -B flip-dublin-live origin/flip-dublin-live`, then push on top; no force-push).
Ireland's lane lock is already held by `flip-dublin-live`.

## Evidence
The write-city-directions workflow, run 36281571181 (27 Sep 00:08 UTC = 01:08 Dublin, after the
last tram), with NTA_API_KEY set, printed:
```
write-city-directions: dublin/Abbey Street skipped — Error: Unknown Dublin station: Abbey Street
ovapi-tripupdates fetch ms=581 bytes=75850 entities=271 outcome=ok
... Ballyogan Wood / Broadstone - University / Citywest Campus / Leopardstown Valley /
    Mayor Square - NCI / O'Connell Upper: same "Unknown Dublin station"
write-city-directions: dublin 0/67 stations with chips
```
The published static snapshot comes from GTFS_LUAS.zip: 2 routes, agency 10000 LUAS, 128 stop rows,
plain stop names (`docs/dublin-d1/ci-snapshot-evidence.md`).

## Fix 1: station-name mismatch (blocker; the hub is affected)
7 catalog names in `lib/cities/dublin/stations.json` (and anything keyed on them) don't resolve
to the real feed. Make the station → stop_id mapping resolve against the real GTFS_LUAS stop names
and IDs. The real names can't be fetched from a sandbox. Either read them in CI (add a
`--print-stops` mode to `qa/verify-dublin-gtfs-snapshot.mjs`, and the top-level session will run
it and put the output in a docs file for you), or make the lookup tolerant of dash/space/case
variants ("Broadstone - University" vs "Broadstone – University", "Mayor Square - NCI" vs
"Mayor Square NCI", "O'Connell Upper" vs "O'Connell - Upper", "Abbey Street" vs "Abbey St").
**Prefer exact IDs from the feed.** If you need the stop list first, stop after adding
`--print-stops`, push, and report. That's a fine stopping point.

## Fix 2: direction chips must come from the static timetable, not only live trams
The new `lib/cities/dublin/dogfood-next-train.js` derives chips only from the live board, so
overnight (or during a live-feed outage) there are none. Other GTFS cities derive chips from static
trips (headsigns/route + direction_id) and use live data only for times. Derive Dublin's chips from
the static snapshot (colour + terminus, per the direction-model memo, keeping the Green-loop
direction guard), so `write-city-directions` produces chips for all 67 stations at any hour.

## Acceptance
`node qa/dublin-dogfood-gate.mjs` gains an offline assertion that every catalog station resolves
and has at least one chip against a fixture made from the real stop names (or the printed list).
live-city-lists-sync, coverage-notes-gate and `--smoke` pass apart from named environmental
failures. Push to `flip-dublin-live`. The top-level session reruns the generator afterwards.
No background loops.

## Round 3: bare line chips (27 Sep, after 79f47d9)
The generator now covers 67/67 stations (commit c494b73, `public/city-directions/dublin.json`), but
**every station also gets a bare `Red` or `Green` chip**, e.g. Abbey Street:
`["Red", "Red + Saggart", "Red + Tallaght", "Red + The Point"]`, Sandyford:
`["Green", "Green + Brides Glen", "Green + Broombridge"]`. The direction-model memo (§1, line 7)
forbids this: "Do not print a bare 'Red' or 'Green' chip without the terminus."
Do:
1. Find which static trips produce a line-only label in `directionsFromStatic()`: short-workings,
   trips whose last stop isn't a recognised terminus, blank headsigns, etc. Log counts by
   headsign / last-stop name in the gate so the cause is visible.
2. Map short-workings to the terminus of their direction (per the memo / hazard-pack), or drop
   trips whose direction genuinely can't be resolved. Never emit a bare line chip. Apply the same
   rule to the live board path, if it can produce one.
3. Add gate assertions: no chip anywhere equals just "Red"/"Green"; Belgard and every trunk
   station east of it has both `Red + Tallaght` and `Red + Saggart`; Tallaght has only
   `Red + The Point`.
4. Delete `public/city-directions/dublin.json` from the branch in the same commit (it will be
   regenerated), or leave it for the top-level session to regenerate. Say which.
Push to flip-dublin-live (no force). No background loops.
