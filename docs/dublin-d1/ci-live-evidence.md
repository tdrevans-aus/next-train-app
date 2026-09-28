# Dublin flip — live evidence (Mark's ninth QA pass, 28 Sep 2026)

Companion to `docs/dublin-d1/mark-qa-note.md`. Raw evidence captured against real NTA GTFS-RT v2
traffic during the flip-commit state.

## All-stations live sweep

```
$ node --env-file=.env.local qa/dublin-all-stations-live-sweep.mjs
dublin-all-stations-live-sweep: sweeping 65 catalog stations, headway-aware thresholds (fallback
20min, fail at >= 1.5x headway of continuous empty time), polls every 30s, up to 18 polls
(runtime capped at 9 min)
dublin-all-stations-live-sweep: poll 1/18 — total trips 1085
dublin-all-stations-live-sweep: poll 2/18 — total trips 1066
(one mid-run NTA feed timeout/error burst around polls 9-10, served from stale cache, no station
affected)
dublin-all-stations-live-sweep: poll 18/18 — total trips 1073
dublin-all-stations-live-sweep: ok — every catalog station either had live trips, a long
intermittent gap backed by evidence-memory, or a properly-flagged honest empty state within its
own 1.5x-headway threshold
```

Evidence appended to `docs/dublin-d1/live-sweep-log.jsonl`, run id
`sweep-2026-09-28T07:20:44.770Z`: all 65 stations at `totalPolls: 18`, `nonEmptyPolls: 18`,
`emptyRunSeconds: 0` — zero stations with any empty poll this run.

## `/api/board` sample (flip-commit state, dev server on :3411, NTA_API_KEY live)

| # | Station | Latency | Directions returned | Notes |
|---|---|---|---|---|
| 1 | Abbey Street | 3515ms (cold) | Red, Red+Saggart, Red+Tallaght, Red+The Point | hub lock holds, no self chip |
| 2 | Belgard | 220ms | Red, Red+Saggart, Red+Tallaght, Red+The Point | all three directions present, incl. H9's Saggart direction |
| 3 | Tallaght | 55ms | Red+The Point | terminus, single opposite direction |
| 4 | The Point | 62ms | Red+Saggart, Red+Tallaght | terminus, both southwest branches correctly listed |
| 5 | Brides Glen | 59ms | Green, Green+Broombridge | terminus |
| 6 | Broombridge | 51ms | Green, Green+Brides Glen | terminus, southbound-only direction correct |
| 7 | Sandyford | 147ms | Green, Green+Brides Glen, Green+Broombridge | both directions, mid-line stop |
| 8 | Marlborough | 89ms | Green, Green+Brides Glen | southbound-only loop stop — no Broombridge chip, correct |
| 9 | Rialto | 218ms | Red, Red+Saggart, Red+Tallaght, Red+The Point | confirmed in-catalog, no gap this poll |
| 10 | Red Cow | 206ms | Red, Red+Saggart, Red+Tallaght, Red+The Point | confirmed in-catalog, no gap this poll |

Every trip in every entry carried `realtime: true` (nested per-trip on next/following/upcoming) —
no schedule-only mode reachable through this rider path.

Belgard raw `Red + Saggart` entry (verbatim, trimmed to the next two trips):
```json
{"departure":"2026-09-28T07:20:45.000Z","status":"4 min late","realtime":true,"destination":"Red + Saggart"}
{"departure":"2026-09-28T07:28:45.000Z","status":"On Time","realtime":true}
```

## `/api/directions` sample

```
GET /api/directions?city=dublin&station=Belgard
{"directions":["Red","Red + Saggart","Red + Tallaght","Red + The Point"],"source":"dublin-live-board"}

GET /api/directions?city=dublin&station=Marlborough
{"directions":["Green","Green + Brides Glen"],"source":"dublin-live-board"}

GET /api/directions?city=dublin&station=Broombridge
{"directions":["Green","Green + Brides Glen"],"source":"dublin-live-board"}
```

Matches `/api/board`'s direction lists exactly for all ten sampled stations.

## Static/RT scripts

```
$ node --env-file=.env.local qa/verify-dublin-gtfs-snapshot.mjs
verify-dublin-gtfs-snapshot: ok (465806 bytes, stops.txt contains Luas stops, station-id
completeness audit passed for all 65 catalog stations)

$ node --env-file=.env.local qa/dublin-rt-join-check.mjs
dublin-rt-join-check: total TripUpdates in feed: 3392
dublin-rt-join-check: resolved against snapshot: 154/154 (100.0%)
dublin-rt-join-check: ok
```

## Post-rebase: bare-chip fix verification (#503, after PR #501 opened)

`/api/directions` sample at the four stations the controller's pre-flip check flagged with bare
chips, rerun against the rebased branch (`f3f26b58` + this flip commit):

```
GET /api/directions?city=dublin&station=Abbey Street
{"directions":["Red + Connolly","Red + Saggart","Red + Tallaght","Red + The Point"],"source":"dublin-live-board"}

GET /api/directions?city=dublin&station=Belgard
{"directions":["Red + Connolly","Red + Saggart","Red + Tallaght","Red + The Point"],"source":"dublin-live-board"}

GET /api/directions?city=dublin&station=Sandyford
{"directions":["Green + Brides Glen","Green + Broombridge"],"source":"dublin-live-board"}

GET /api/directions?city=dublin&station=Broombridge
{"directions":["Green + Brides Glen","Green + Sandyford"],"source":"dublin-live-board"}
```

No bare `"Red"`/`"Green"` entry at any of the four. `/api/board` returned identical direction
sets for all four stations. `Red + Connolly` and `Green + Sandyford` both confirmed present
where trams genuinely run, matching #503's live headsign-dump findings.
