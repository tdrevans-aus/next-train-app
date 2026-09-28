# Prague flip — live evidence (Mark's third QA pass, 28 Sep 2026)

Companion to `docs/prague-d1/mark-qa-note.md`. Raw evidence captured against real Golemio traffic
during the flip-commit state, so the PR isn't just a claim of "green" with no artifact trail.

## All-stations live sweep

```
$ node --env-file=.env.local qa/prague-all-stations-live-sweep.mjs
prague-all-stations-live-sweep: sweeping 58 catalog stations (122 stop_ids in 3 batch(es) of <= 50
per poll, paced to <= 15 requests / 8s), fallback headway 10min (fail at >= 1.5x continuous empty),
polls every 60s, up to 9 polls (runtime capped at 9 min)
prague-all-stations-live-sweep: poll 1/9 — total trips 60
prague-all-stations-live-sweep: poll 2/9 — total trips 60
prague-all-stations-live-sweep: poll 3/9 — total trips 60
prague-all-stations-live-sweep: poll 4/9 — total trips 60
prague-all-stations-live-sweep: poll 5/9 — total trips 60
prague-all-stations-live-sweep: poll 6/9 — total trips 60
prague-all-stations-live-sweep: poll 7/9 — total trips 60
prague-all-stations-live-sweep: poll 8/9 — total trips 60
prague-all-stations-live-sweep: poll 9/9 — total trips 60
prague-all-stations-live-sweep: total rate-limit (429) errors across the run: 0
prague-all-stations-live-sweep: 5 station(s) reported not-currently-served (documented in
lib/cities/prague/stations.json's notServed field — expected empty, a pass, not a coverage gap):
Budějovická (empty 8min), Flora (empty 8min), Kačerov (empty 8min), Pankrác (empty 8min),
Roztyly (empty 8min)
prague-all-stations-live-sweep: 16 station(s) were empty for the whole run but did not yet reach
the 1.5x-headway threshold within the 9-min runtime cap — not failed, re-run to confirm: [16
stations, all 0-3min empty streaks at the tail of the run]
prague-all-stations-live-sweep: ok — every catalog station either had live trips, was a documented
not-currently-served station, a long intermittent gap backed by evidence-memory, or is still
within its uncertain window
```

Evidence appended to `docs/prague-d1/live-sweep-log.jsonl`, run id
`sweep-2026-09-28T05:51:13.460Z`: 58/58 stations at `totalPolls: 9`; exactly the 5 documented
`notServed: true` stations at `nonEmptyPolls: 0`; every other station at `nonEmptyPolls >= 3`
(most 5-9).

## `/api/board` sample (flip-commit state, dev server on :3455, GOLEMIO_API_KEY live)

Paced one station at a time (2s apart) to avoid self-inflicted rate-limiting from the sampling
itself:

| # | Station | Latency | Directions returned | Notes |
|---|---|---|---|---|
| 1 | Muzeum | 762ms | A+Nemocnice Motol, A+Depo Hostivař, C+Letňany, C+Pražského povstání, C+Háje | hub lock holds, no self chip |
| 2 | Můstek | 721ms | A+Nemocnice Motol, A+Depo Hostivař, B+Zličín, B+Černý Most | no self/Muzeum chip |
| 3 | Florenc | 714ms | B+Zličín, B+Černý Most, C+Letňany, C+Pražského povstání, C+Háje | no self/Muzeum/Můstek chip |
| 4 | Háje | 699ms | C+Letňany, C+Chodov | short-turn reachability correct (no Pražského povstání) |
| 5 | Letňany | 670ms | C+Pražského povstání, C+Háje | short-turn reachability correct (no Chodov) |
| 6 | Pražského povstání | 675ms | C+Letňany, C+Háje | self-terminus excluded |
| 7 | Chodov | 890ms | C+Letňany, C+Háje | self-terminus excluded |
| 8 | Nemocnice Motol | 700ms | A+Depo Hostivař | terminus, single opposite direction |
| 9 | Depo Hostivař | 660ms | A+Nemocnice Motol | terminus, single opposite direction |
| 10 | Zličín | 670ms | B+Černý Most | terminus, single opposite direction |
| 11 | Černý Most | 660ms | B+Zličín | terminus, single opposite direction |
| 12 | Kobylisy | 687ms | C+Letňany, C+Pražského povstání, C+Háje | correctly excludes Chodov (unreachable) |
| 13 | Kačerov | 1230ms | C+Letňany (not-currently-served), C+Háje (not-currently-served) | inside closed section, honest empty state both directions |
| 14 | Flora | 658ms | A+Nemocnice Motol (not-currently-served), A+Depo Hostivař (not-currently-served) | long-term reconstruction, honest empty state both directions |

Kačerov raw `emptyReasonMessage` (verbatim, both directions):
> No metro service at this station at the moment — Line C section closure for track repair
> (Pražského povstání – Chodov); replacement bus XC runs Pražského povstání – Pankrác –
> Budějovická – Kačerov – Roztyly – Dědinova – Chodov.

## `/api/directions` sample

```
GET /api/directions?city=prague&station=Muzeum
{"directions":["A + Nemocnice Motol","A + Depo Hostivař","C + Letňany","C + Pražského povstání","C + Háje"],"source":"prague-marketing-ends"}

GET /api/directions?city=prague&station=Kačerov
{"directions":["C + Letňany","C + Háje"],"source":"prague-marketing-ends"}

GET /api/directions?city=prague&station=Háje
{"directions":["C + Letňany","C + Chodov"],"source":"prague-marketing-ends"}
```

Matches `/api/board`'s direction lists exactly for all three stations.

## `/api/cities` manifest entry (flip-commit state)

```
{
  "id": "prague", "displayName": "Prague", "status": "live",
  "country": { "id": "cz", "name": "Czechia" },
  "timeZone": "Europe/Prague",
  "bounds": { "minLat": 50, "maxLat": 50.15, "minLng": 14.27, "maxLng": 14.6 },
  "modes": ["metro"], "nearbyEligible": true, "directionsVersion": "8a0be7c6"
}
```

## Smoke suite (flip-commit state, PLAIN)

```
$ node qa/run-all.mjs --smoke
...
--- Summary ---
Suite: smoke · 165 PASS · 0 FAIL · 599s
```

Full run completed within the 600000ms tool timeout ceiling — not backgrounded or truncated.
`prague-dogfood-gate.mjs`, `honest-empty-state.mjs`, `registry-driven-client.mjs`,
`country-wide-picker.mjs`, `bundled-city-directions.mjs`, `lane-lock-shared-worktree.mjs` all
appear PASS in the run.

## Concurrency probe (see mark-qa-note.md item 4 for full discussion)

- 14 stations fired back-to-back with no pacing: real Golemio 429s, affected directions silently
  dropped from `entries` rather than surfaced as an error.
- 3 concurrent single-station requests (Muzeum + Můstek + Florenc simultaneously, 14 total
  Golemio calls in <1s): 0 errors, all directions present in all 3 responses.
- Not a flip blocker (see mark-qa-note.md and the PR's "Decisions for Tim" section) — flagged as a
  post-flip follow-up item, not resolved here.

