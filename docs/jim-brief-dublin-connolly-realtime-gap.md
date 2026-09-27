# Jim brief — Dublin: Connolly has no real-time coverage in the NTA feed (flip blocker)

**Lane:** bug-fix / product mode. **City:** dublin, country ireland (acquire the lane lock — edits lib/providers/dublin.js and/or lib/cities/dublin/). **Date:** 27 Sep 2026. **tim-review:** no for branch A; branch B (removing a station) is rule-based per docs/board-eligibility-rule.md ("filter stations into the app, never trains off a board silently") and is reported to Tim by the controller — proceed, do not wait.

## Symptom (Mark's RED note, 27 Sep — `git show mark/dublin-flip-3:docs/dublin-d1/mark-qa-note.md` may not exist in the main repo; the note is at the worktree path in the controller's report; the facts are reproduced here)
- `fetchStationBoard("Connolly")` returns 0 trips on every poll while all other 66 stations are non-empty during service.
- Static snapshot (gtfs/dublin.zip on Blob): Connolly stop_ids `…00423` / `…00424` have 651/137 stop_times — the schedule serves it heavily.
- NTA GTFS-RT v2 TripUpdates (key in .env.local): 7 of 37 live trip_ids are statically scheduled to call at Connolly, but their `stopTimeUpdate` arrays list neighbouring stops (`…00420`, `…00408` Abbey St, `…00404`) and skip both Connolly ids. A search of the whole feed (1197–1313 entities, several fetches) finds ZERO stopTimeUpdates naming either Connolly id.
- `tripHasRealtimeConfirmation()` (live-only rule) therefore drops every Connolly trip. Hazard-pack H4 already flagged Connolly's dogleg as unconfirmed.

## Investigate first (branch A — alias fix)
1. Dump every distinct stop_id that appears in RT stopTimeUpdates for Red Line trips and diff against the static Red Line stop_ids. If exactly two RT-only ids exist near the Busáras/Connolly end (sequence position, or lat/lng if `stops.txt` has them under another id, or the NTA "stop_id vs stop_code" distinction), Connolly is reported under a different id → add it to the alias/stop-id resolution (`findRailStopIdsForName` / catalog `stopIds`) and re-verify Connolly's board is non-empty on 3 polls.
2. Check whether Connolly appears only as the FIRST or LAST stop of terminating trips and the RT omits terminal stops: does the feed include first/last stops for The Point, Tallaght, Saggart, Brides Glen, Broombridge? If terminals are present there but not at Connolly, that is not the explanation.
3. Check the NTA GTFS-R docs / known issues (developer.nationaltransport.ie, TFI) for Luas Connolly; record what you find with URLs in docs/dublin-d1/jim-handoff.md (appended, dated).

## Branch B — feed genuinely never covers Connolly
Apply the rule: filter the station, never a silently empty board.
1. Remove Connolly from lib/cities/dublin/stations.json (and any line-map/marketing-directions references) for v1; keep a `notCovered` entry in lib/cities/dublin/coverage.json with rider copy: "Connolly Luas stop — no real-time data from the NTA feed; use Busáras." Append a dated "Correction" to docs/dublin-d1/hazard-pack.md (H4) and oracle-clash-report.md (Board eligibility: Connolly `out-feed`, with the evidence), never rewriting existing lines.
2. Make sure a Red Line trip that TERMINATES at Connolly still shows on upstream boards with a correct terminus chip (Red + Connolly) or is folded per the direction-model memo — do not let removing the station break the chip for trains going there.
3. Update qa/dublin-dogfood-gate.mjs: 66 stations; assert Connolly is NOT in the catalog and IS in coverage notCovered.

## Either branch — acceptance
1. During Luas service (Dublin daytime), every catalog station's `fetchStationBoard()` returns ≥ 1 trip in one sweep (write the sweep as a script under qa/ that Mark can rerun: `qa/dublin-all-stations-live-sweep.mjs`, skipping gracefully outside service hours with an explicit message).
2. `node qa/dublin-dogfood-gate.mjs`, `node qa/dublin-rt-join-check.mjs`, `node qa/verify-dublin-gtfs-snapshot.mjs`, `node qa/run-all.mjs --smoke` green (known local flake: no-live-feed-stops-gate — re-run alone if only failure).
3. Status stays "planned". PR title: "Dublin: Connolly real-time gap — <alias fix | filtered out of v1 with coverage note> (flip prerequisite)". State which branch you took and why, with the evidence.
