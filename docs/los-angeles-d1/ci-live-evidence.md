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
