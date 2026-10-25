# Los Angeles flip follow-through - live evidence (Jim, 24 Oct 2026 PDT)

Companion to `docs/los-angeles-d1/jim-handoff.md`. Raw evidence from real Swiftly traffic, LA still `planned`.

## All-stations live sweep

Run: Sat 24 Oct 2026, 18:42-18:51 PDT (25 Oct 01:42-01:51 UTC), evening service.

```
$ node --env-file=<main>/.env.local qa/los-angeles-all-stations-live-sweep.mjs
los-angeles-all-stations-live-sweep: 110 stations, ONE Swiftly TripUpdates request per poll (shared snapshot), polls every 60s, up to 9 polls
poll 1/9 - 932 live rows; stations live 107, not-currently-served 3, zero 0 (Swiftly requests so far: 1)
poll 2/9 - 925 live rows; stations live 107, not-currently-served 3, zero 0
poll 3/9 - 934 live rows; ... poll 9/9 - 969 live rows; stations live 107, not-currently-served 3, zero 0 (Swiftly requests so far: 9)
total Swiftly requests this run: 9
3 station(s) reported not-currently-served: Wilshire/La Brea, Wilshire/Fairfax, Wilshire/La Cienega
ok - every station was live, a documented not-currently-served station, ...
```

Result: 107 stations live on all 9 polls, 3 documented `not-currently-served` (the Wilshire D stations), 0 stations empty with
`no-live-predictions`, 0 violations (no bare line chips, no self-terminus rows, every empty board carried an honest reason).
Swiftly usage: 9 TripUpdates requests (limit 180 / 15 min). Appended to `live-sweep-log.jsonl`.

## Rider path sample (`getMultiCityNextTrain` / `getMultiCityDirections`, same run)

- Union Station, `A Line + Pomona North`: 5 upcoming, no `emptyReason`. Chips: A + Pomona North, A + Downtown Long Beach, B + North Hollywood, D + Wilshire/La Cienega.
- Wilshire/La Brea, `D Line + Union Station`: 0 upcoming, `emptyReason: "not-currently-served"`.
- Wilshire/Western, `D Line + Union Station`: 5 upcoming, no `emptyReason`.

## Flip QA re-run (Mark, Sat 24 Oct 2026 20:16-20:26 PDT, 25 Oct 03:16 UTC), master 52c49ca1

`node --env-file=<main>/.env.local qa/los-angeles-all-stations-live-sweep.mjs`, evening service, 9 polls, 9 Swiftly requests.

| Poll | Live rows | Stations live | not-currently-served | Zero / silent-empty |
|---|---|---|---|---|
| 1 | 663 | 107 | 3 | 0 |
| 2 | 674 | 107 | 3 | 0 |
| 3 | 668 | 107 | 3 | 0 |
| 4 | 663 | 107 | 3 | 0 |
| 5 | 665 | 107 | 3 | 0 |
| 6 | 655 | 107 | 3 | 0 |
| 7 | 667 | 107 | 3 | 0 |
| 8 | 666 | 107 | 3 | 0 |
| 9 | 646 | 107 | 3 | 0 |

The 3 not-currently-served are the documented Wilshire/La Brea, Wilshire/Fairfax, Wilshire/La Cienega (no D trips until the -90 timetable on 1 Nov). Result: ok, appended to `live-sweep-log.jsonl`.

Rider path sampled through `/api/board`, `/api/directions`, `/api/next-train`, `/api/cities`, `/api/coverage-notes` on a local dev server with the flip applied: 7th St/Metro Ctr (A/B/D/E chips, no hub token), Union Station (no B/D + Union Station self chips), Wilshire/La Cienega (D + Union Station = not-currently-served), Wilshire/Vermont, Expo/Crenshaw, Atlantic, Norwalk. Zero bare chips, zero self chips; every empty chip carried `emptyReason` (`no-live-predictions` for A + APU/Citrus College, `not-currently-served` for D + Wilshire/La Cienega and C + Aviation/Century off-pattern). `fetchStationBoard` returns `realtime: true`.
