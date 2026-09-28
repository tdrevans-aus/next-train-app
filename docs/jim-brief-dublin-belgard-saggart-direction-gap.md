# Jim brief — Dublin: Belgard silently drops "Red + Saggart" (fork station; probable missing platform stop_id) — flip prerequisite

**Lane:** bug-fix / product mode. **City:** dublin, country ireland (acquire the lane lock). **Date:** 28 Sep 2026. **tim-review:** no.

## Finding (Mark pass 8, origin/mark/dublin-flip-8 → docs/dublin-d1/mark-qa-note.md)
At Belgard (the Red Line fork), `/api/board` and `/api/directions` show only "Red + Tallaght" and "Red + The Point" over 15+ polls; "Red + Saggart" never appears, while Fortunestown and Citywest Campus (downstream on the Saggart branch) show live Saggart-bound trams throughout. `fetchStationBoard('Belgard')` has ~9 Saggart-bound `scheduledCandidates` but zero realtime-confirmed — every Saggart-bound trip fails `tripHasRealtimeConfirmation` for Belgard's catalog stop_ids `8230GA00347`/`8230GA00348`, while Tallaght-bound trips pass.

## Hypothesis to test FIRST
Belgard has more than two platform stop_ids in the NTA GTFS (a fork stop typically has a platform per branch/direction). Saggart-bound trams call at a Belgard platform id the catalog omits, so their stop_time_updates never match. Evidence route: dump every stops.txt row whose name folds to "Belgard" (all ids, parent_station, platform_code); for each id count Red trips in stop_times.txt split by trip terminus (Saggart vs Tallaght vs The Point); then confirm in one live TripUpdates poll which Belgard id Saggart-bound trips reference.

## Fix
- If confirmed: add the missing id(s) to Belgard's catalog entry (and audit every station for the same defect: for each catalog station, compare its listed ids with ALL stops.txt ids of that name that appear in Red/Green stop_times — report any station missing an id; fix all). Add an offline gate case: for every catalog station, every stops.txt id of that name referenced by Luas stop_times must be in the catalog (this would have caught Belgard).
- If Belgard's ids are complete and the RT feed genuinely omits Belgard for Saggart-bound trips: record it as a direction-level feed gap in docs/dublin-d1/hazard-pack.md (append) and the oracle report's Board eligibility (append), and make the honest empty state per-direction aware only if that is cheap; otherwise report and stop (controller takes it to Tim).

## Acceptance
- Live (Dublin daytime): Belgard `/api/directions` includes "Red + Saggart" with trips > 0 across 5 polls ≥ 60 s apart; Tallaght/The Point chips unchanged; `node --env-file=.env.local qa/dublin-all-stations-live-sweep.mjs` ok; `node qa/dublin-dogfood-gate.mjs` (with the new id-completeness case) green; `node qa/run-all.mjs --smoke` PLAIN green.
- Status stays "planned". PR title: "Dublin: Belgard fork platform ids — Red + Saggart restored (flip prerequisite)". Link this brief and Mark's note.
- HARD RULES: never kill a process you did not start (port 3400 is Tim's other project); PORT + QA_BASE discipline; pace NTA ≥ 5 s.
