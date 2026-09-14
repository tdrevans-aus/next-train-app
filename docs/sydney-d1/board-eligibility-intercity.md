# Sydney (nswtrains feed) — board eligibility verdicts

Per `docs/board-eligibility-rule.md`: every route in the `nswtrains` GTFS feed needs a recorded
verdict — `in` (walk-up, shown on boards) or `out-reservation` (compulsory reservation/check-in,
excluded by route in `lib/providers/sydney.js`, never by dropping a station). Written 14 Sep 2026
as part of `docs/jim-brief-sydney-intercity-fill.md` (Tim's API-in-scope rule, 13 Sep 2026).

**Caveat on route_short_name values below:** this environment has no `TFNSW_API_KEY` (checked in
both the main checkout's `.env.local` and this worktree — absent from both, despite the brief's
assumption it was present), so the live `nswtrains` static feed could not be pulled to read
`routes.txt` directly. The five walk-up codes (BMT/CCN/SCO/SHL/HUN) are TfNSW's own published
line codes (transportnsw.info route pages) and are high-confidence. The excluded long-distance
codes are this session's best recollection of TfNSW's GTFS route_short_name convention for each
corridor, not a value read from the feed — `NSWTRAINS_EXCLUDED_ROUTE_SHORT_NAMES` in
`lib/providers/sydney.js` is the single place to correct them once a real pull is possible.
`qa/sydney-network-sweep.mjs` (live, requires the key, not a CI gate) and `qa/prod-sweep.mjs` are
where that confirmation should happen next — flagging this explicitly rather than shipping it
silently as fact.

## Walk-up (`in`)

| Route | Corridor | Verdict | Reason |
|---|---|---|---|
| BMT | Blue Mountains Line (Central–Lithgow) | `in` | No reservation, no check-in; Opal walk-up like any Sydney Trains service. |
| CCN | Central Coast & Newcastle Line (Central–Newcastle Interchange) | `in` | Walk-up Opal service. |
| SCO | South Coast Line (Central–Bomaderry) | `in` | Walk-up Opal service. Also legitimises Helensburgh, previously suppressed only because it fell outside modes v1's T4-only scope (see `published-network.json` note). |
| SHL | Southern Highlands Line (Central–Goulburn) | `in` | Walk-up Opal service. |
| HUN | Hunter Line (Newcastle Interchange–Dungog / –Scone via Maitland) | `in` | "Hunter" railcar services are walk-up per the brief; no reservation. Two branches at Maitland/Whittingham (Dungog via the North Coast direction, Scone via Muswellbrook/Aberdeen) — both `in`, recorded as a `doNotGroup` pair in `line-map.json` (H4 HUN branch), not two separate route verdicts. |

## Compulsory reservation (`out-reservation`)

| Route (best-effort code, see caveat) | Corridor | Verdict | Reason |
|---|---|---|---|
| CAN | XPT — Sydney–Canberra | `out-reservation` | XPT requires a booked, allocated seat; not a walk-up Opal service. |
| MEL | XPT — Sydney–Melbourne (via Albury) | `out-reservation` | Same — compulsory reservation. |
| BRI | XPT — Sydney–Brisbane (via Casino) | `out-reservation` | Same — compulsory reservation. |
| GRF | Xplorer/XPT — North Coast beyond Dungog (Grafton/Casino) | `out-reservation` | Compulsory reservation; only the Hunter-line portion up to Dungog is walk-up (HUN, above). |
| DBB | Xplorer — Sydney–Dubbo | `out-reservation` | Compulsory reservation. |
| ARM | Xplorer — Sydney–Armidale/Moree | `out-reservation` | Compulsory reservation. |
| NSW TrainLink coach routes (replacement/feeder coaches, e.g. Bathurst/Cooma/Griffith connections) | various | `out-reservation` | Coach seats are allocated at booking; also excluded structurally if published as `route_type=3` (bus) rather than rail, since the adapter only loads `route_type=2`. |

## Excluded stations

None. Per the board-eligibility rule, exclusion is by route, never by dropping a station — every
station the walk-up routes above call at is in the catalog (see the PR body for the full list).
No station in the `nswtrains` feed is served *only* by an excluded route, so none had to be
dropped from the catalog on that basis.

## Code enforcement

`lib/providers/sydney.js`: `NSWTRAINS_EXCLUDED_ROUTE_SHORT_NAMES` is passed as
`excludeRouteShortNames` to `loadGtfsStatic` for the `nswtrains` source with `railOnly: true`, so
excluded routes' trips are absent from `stopTimesByStopId` at the static-parse stage — they can
never reach a board regardless of what the realtime feed reports for those trip ids.
