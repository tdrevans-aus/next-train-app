# Sydney (nswtrains feed) — board eligibility verdicts

Per `docs/board-eligibility-rule.md`: every route in the `nswtrains` GTFS feed needs a recorded
verdict — `in` (walk-up, shown on boards) or `out-reservation` (compulsory reservation/check-in,
excluded by route in `lib/providers/sydney.js`, never by dropping a station). Written 14 Sep 2026
as part of `docs/jim-brief-sydney-intercity-fill.md` (Tim's API-in-scope rule, 13 Sep 2026).

**Round 2 update (15 Sep 2026):** `TFNSW_API_KEY` is now available and this has been verified
against the live feeds. Two corrections to Round 1's best-guess:

1. The five walk-up codes (BMT/CCN/SCO/SHL/HUN) and the four booked-reservation corridor codes
   below are **all published under the `sydneytrains` static feed** (`agency_id: "NSWTrains"`,
   `route_type: "2"`), not the standalone `nswtrains` feed. In the standalone `nswtrains` feed,
   BMT/HUN/SCO/SHL exist but at `route_type: "100"` (excluded by the adapter's `railOnly` filter,
   which only keeps `"2"`) and CCN is absent entirely. `lib/providers/sydney.js`'s
   `loadSydneyStatic()` now applies `excludeRouteShortNames` to the `sydneytrains` load (it
   previously only applied it to the `nswtrains` load, which — given the above — meant it was
   excluding routes from a feed that contributed no matching trips anyway. The booked corridors
   were not actually being filtered out of what reached a board).
2. The real booked-reservation `route_short_name` values, read directly from `routes.txt`, are
   **NRC / NRW / STH / WST** (below) — Round 1's guessed CAN/MEL/BRI/GRF/DBB/ARM do not exist in
   either feed and have been replaced in `NSWTRAINS_EXCLUDED_ROUTE_SHORT_NAMES`.

## Walk-up (`in`)

| Route | Corridor | Verdict | Reason |
|---|---|---|---|
| BMT | Blue Mountains Line (Central–Lithgow) | `in` | No reservation, no check-in; Opal walk-up like any Sydney Trains service. |
| CCN | Central Coast & Newcastle Line (Central–Newcastle Interchange) | `in` | Walk-up Opal service. |
| SCO | South Coast Line (Central–Bomaderry) | `in` | Walk-up Opal service. Also legitimises Helensburgh, previously suppressed only because it fell outside modes v1's T4-only scope (see `published-network.json` note). |
| SHL | Southern Highlands Line (Central–Goulburn) | `in` | Walk-up Opal service. |
| HUN | Hunter Line (Newcastle Interchange–Dungog / –Scone via Maitland) | `in` | "Hunter" railcar services are walk-up per the brief; no reservation. Two branches at Maitland/Whittingham (Dungog via the North Coast direction, Scone via Muswellbrook/Aberdeen) — both `in`, recorded as a `doNotGroup` pair in `line-map.json` (H4 HUN branch), not two separate route verdicts. |

## Compulsory reservation (`out-reservation`)

| Route (verified `route_short_name`) | Corridor | Verdict | Reason |
|---|---|---|---|
| NRC | NSW TrainLink North Coast — Sydney (Central)↔Brisbane (Roma Street) (XPT) | `out-reservation` | XPT requires a booked, allocated seat; not a walk-up Opal service. |
| NRW | NSW TrainLink North Western — Sydney (Central)↔Moree / Armidale (Xplorer) | `out-reservation` | Compulsory reservation. |
| STH | NSW TrainLink Southern — Sydney (Central)↔Canberra / Griffith / Melbourne (Southern Cross) (XPT) | `out-reservation` | Compulsory reservation; only the Southern Highlands portion up to Goulburn is walk-up (SHL, above). |
| WST | NSW TrainLink Western — Sydney (Central)↔Dubbo / Broken Hill (Xplorer) | `out-reservation` | Compulsory reservation. |
| NSW TrainLink coach routes (numeric route_short_names, e.g. `135`/`223`/`2301` — replacement/feeder coaches such as Bathurst/Cooma/Griffith connections) | various | `out-reservation` | Coach seats are allocated at booking; also excluded structurally — these are `route_type` 106/204/205 (extended GTFS bus/coach types) in the `nswtrains` feed, not `2` (rail), so the adapter's `railOnly` filter drops them regardless. |

## Excluded stations

None. Per the board-eligibility rule, exclusion is by route, never by dropping a station — every
station the walk-up routes above call at is in the catalog (see the PR body for the full list).
No station is served *only* by an excluded route, so none had to be dropped from the catalog on
that basis. Three catalog entries added in Round 1 were removed in Round 2 for an unrelated
reason — no real GTFS stop, not even a booked/excluded one, corresponds to them: "Brooklyn" was a
duplicate of the existing "Hawkesbury River" entry (same physical station, ~0.5km apart), and
"Farley"/"Sutton Forest" are not present in any of the three feeds (closed/unserved stations).

## Code enforcement

`lib/providers/sydney.js`: `NSWTRAINS_EXCLUDED_ROUTE_SHORT_NAMES` is passed as
`excludeRouteShortNames` to `loadGtfsStatic` for the `sydneytrains` source (Round 2 correction —
see above) with `railOnly: true`, so excluded routes' trips are absent from `stopTimesByStopId`
at the static-parse stage — they can never reach a board regardless of what the realtime feed
reports for those trip ids. Verified live 15 Sep 2026: `NRC`/`NRW`/`STH`/`WST` do not appear in
`loadSydneyStatic()`'s resulting `railRouteIds`, and boards at Gosford/Katoomba/Wollongong/
Newcastle Interchange return only BMT/CCN/SCO/SHL/HUN departures.
