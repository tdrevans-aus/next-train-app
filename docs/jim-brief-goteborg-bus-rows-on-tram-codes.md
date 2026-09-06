# Jim brief — Göteborg: Kungsbacka local buses appear on the live board as tram lines (6 Sep 2026)

**Dispatched:** 6 Sep 2026 (found while verifying PR #319) · **Lane:** Sweden / `goteborg`, stage
`adapter` · **Model:** sonnet (pinned; no override) · **Branch:** `goteborg-bus-rows` from master
(after #319 has merged — start from a master that contains it).

## Symptom

`fetchStationBoard("Kungsbacka Station")` with real Västtrafik credentials (branch of PR #319, 6 Sep
2026 ~18:00 local) returns 10 trips of which 7 are Kungsbacka **town buses**, labelled as if they
were Göteborg trams:

```
2 | 2 + Hede station, Påstigning fram   | raw: Hede station, Påstigning fram
1 | 1 + Hede station, Påstigning fram
4 | 4 + Hede station, Påstigning fram
2 | 2 + Kolla, Påstigning fram
3 | 3 + Britta Lena, Påstigning fram
```

"Påstigning fram" ("board at the front") is Västtrafik bus wording. Only the three `Kungsbacka |
Västtågen + Göteborg Central` rows belong on that board. Lerum's board is clean (4 rows, all
Västtågen), so the leak is where a stop area has local buses whose line numbers collide with
Göteborg tram numbers 1–13.

## Board-eligibility rule

`docs/board-eligibility-rule.md` and the Göteborg oracle report: v1 modes are tram (1–12) and the
three city-map pendeltåg corridors; **no bus, no stombuss, no båt**. A bus row on the board is an
`out-mode` service shown to riders, a hard fail for Mark.

## Root cause (to confirm)

`lib/providers/goteborg.js` filters live rows by line designation against `ALLOWED_LINE_CODES`
(tram numbers plus the corridor codes) — see `ALLOWED` near line 65 — and only the Västtågen
corridor fallback checks `transportMode` (the `transportMode !== "train"` gate near line 178,
added in #312). A `transportMode: "bus"` departure whose `line.designation` is `2` therefore
passes as tram line 2. `mapVasttrafikDeparture` already records `transportMode` on each row
(line ~295), so the data needed for the gate is present.

## What to build

1. On the live (Västtrafik) path, a row is a tram only if `transportMode === "tram"` **and** its
   designation is an allowed tram code; a row is Västtågen only if `transportMode === "train"`
   (already gated). Everything else (`bus`, `ferry`, anything unknown) is dropped before labelling.
   Keep the timetable-fallback path consistent: it filters by GTFS `route_type`; verify it never
   admitted these buses (Trafiklab `vt` static includes Kungsbacka buses with route_type 700).
2. `qa/goteborg-dogfood-gate.mjs`: with real credentials present, assert every trip on the
   Kungsbacka Station, Lerum Station and Brunnsparken boards has `transportMode` in
   `{"tram","train"}` and no destination contains "Påstigning". Add the offline equivalent using a
   fixture that includes a `bus` departure with designation `2` at Kungsbacka; the assertion must
   fail on the current code and pass after the fix.
3. One line in `docs/goteborg-d1/jim-handoff.md` recording the rule.

Do not touch chips, the registry, or any list file.

## Verify

`node --env-file=.env.local qa/goteborg-dogfood-gate.mjs`, `qa/goteborg-direction-match.mjs`,
`qa/goteborg-line-map-conformance.mjs`, `qa/live-city-lists-sync.mjs` (copy `.env.local` from the
main checkout). Direct `fetchStationBoard("Kungsbacka Station")` before/after in the PR body. Do
not run the full smoke suite locally (port 3000 is held by an unrelated dev server); rely on CI.

Lane lock: the top-level session checks `node qa/lane-lock.mjs check sweden` before dispatch; run
`acquire sweden goteborg jim goteborg-bus-rows` before editing. Open a normal PR. Do not merge it.
