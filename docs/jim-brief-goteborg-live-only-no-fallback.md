# Jim brief — Göteborg: live-only board, no timetable fallback, no static download on the live path (7 Sep 2026)

**Dispatched:** 7 Sep 2026 (Tim: "definitely remove the fallback") · **Lane:** Sweden /
`goteborg`, stage `adapter` · **Model:** sonnet (pinned; no override) · **Branch:**
`goteborg-live-only` from master (start after `sweden-static-blob-and-redaction` has merged; both
touch `lib/providers/goteborg.js`).

## Rule this enforces

Tim, 5 Sep 2026: a city with a usable live feed must use it; a city without one gets no board.
Extension, 7 Sep 2026: when the live feed fails, the rider sees an explicit error, never a
timetable dressed as a board. The live/timetable UI marker (FB-57) does not exist yet, so a
silent timetable fallback is indistinguishable from live times to a rider.

## Current state (PR #312, #319, #321)

`lib/providers/goteborg.js` builds the board from Västtrafik Planera Resa v4 (live), but:

1. It loads the Trafiklab static GTFS (`vt.zip`, now to be served from the Vercel blob after the
   `sweden-static-blob-and-redaction` PR) **before** calling Västtrafik, to map catalog stations
   to Västtrafik stop-area GIDs. On 6 Sep a 429 on that download took every Göteborg board down
   even though the live API was healthy.
2. If the live call fails or returns no departures, it falls back to the Trafiklab timetable
   (`realtime: "timetable"`), silently.

## What to build

1. **Decouple.** Put each catalog station's Västtrafik stop-area GID(s) into
   `lib/cities/goteborg/stations.json` (a `vasttrafikStopAreaGids` field or similar), generated
   once from the current static data plus the mapping the adapter uses today, and make the live
   path read them from the catalog. The live board must not load any static GTFS. If a station
   has no GID, that is a catalog error surfaced by the gate, not a runtime fallback.
2. **No fallback.** Remove the timetable fallback from the live path. When Västtrafik fails
   (HTTP error, auth failure, timeout, malformed body) throw a named error class, e.g.
   `VasttrafikUnavailableError`, that `api/directions.js`'s `classifyDirectionsError` maps to the
   "retrying could help" reason (transient upstream), and `MissingVasttrafikCredentialsError`
   when the keys are unset (already exists; keep it). An **empty** live board during service
   hours is a valid board (no departures), not an error.
3. **Static GTFS use.** After (1) and (2) decide what still needs the Trafiklab static feed for
   Göteborg: if only the offline gates/fixtures, keep it there and delete the runtime static
   loader from `goteborg.js`; if something else (e.g. chip derivation) genuinely needs it at
   runtime, say so in the PR and keep the smallest possible use, still never on the board path.
   Set `realtime: "live"` unconditionally on returned boards.
4. **Gates.** `qa/goteborg-dogfood-gate.mjs`: assert (a) every catalog station has at least one
   stop-area GID; (b) with credentials present, a board for Brunnsparken, Lerum Station and
   Kungsbacka Station is served with `realtime: "live"` and without any static GTFS load (stub
   or spy on `loadGtfsStatic` to prove it is not called on the board path); (c) with a stubbed
   Västtrafik failure the adapter throws `VasttrafikUnavailableError` and does **not** return a
   board; (d) the existing bus-designation and Västtågen-label fixtures still pass.
5. `docs/goteborg-d1/jim-handoff.md`: record the rule and the GID field.

Do not touch chips, the registry, list files, or the other Swedish cities.

## Verify

`node --env-file=.env.local qa/goteborg-dogfood-gate.mjs`, `qa/goteborg-direction-match.mjs`,
`qa/goteborg-line-map-conformance.mjs`, `qa/live-city-lists-sync.mjs`, and a direct
`getMultiCityNextTrain("goteborg", …)` for Brunnsparken → `1 + Tynnered` and Lerum Station →
`Västtågen + Göteborg Central`. Do not run the full smoke suite locally (port 3000 is held by an
unrelated dev server); rely on CI.

Lane lock: the top-level session checks `node qa/lane-lock.mjs check sweden` before dispatch; run
`acquire sweden goteborg jim goteborg-live-only` before editing. Open a normal PR. Do not merge it.
