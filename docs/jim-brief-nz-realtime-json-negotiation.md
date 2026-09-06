# Jim brief — Auckland and Wellington: realtime feeds now answer JSON unless asked for protobuf only (6 Sep 2026)

**Dispatched:** 6 Sep 2026 (pre-launch production sweep) · **Lane:** New Zealand, both live
cities · **Model:** sonnet (pinned; no override) · **Branch:** `nz-realtime-accept` from master.

## What production shows (6 Sep 2026, ~15:30 UTC)

`/api/next-train` fails with HTTP 500 for every Auckland and Wellington request:

- auckland `Avondale → Western Line Swanson`: `invalid end group tag`
- wellington `Ava Station → Hutt Valley Line Upper Hutt Station`: `index out of range: 3 + 104 > 94`

Both reproduce locally with the real `AT_API_KEY` / `METLINK_API_KEY` from `.env.local`. Both are
protobuf decode errors on a body that is not protobuf.

## Root cause (verified with raw fetches)

`lib/providers/gtfs/realtime.js` line 16 sends
`Accept: application/x-google-protobuf, application/x-protobuf, application/octet-stream`.
Both agencies now content-negotiate and answer that header with **JSON**:

| Feed | Accept sent | Status | Content-Type | Body |
|---|---|---|---|---|
| AT `api.at.govt.nz/realtime/legacy/tripupdates` | the three-value header above, or `application/octet-stream` | 200 | `application/json` | `{"status":"OK","response":{"header":…,"entity":[…]}}` (AT wraps the feed in `response`) |
| AT same | `application/x-protobuf` only | 200 | `application/protobuf` | real FeedMessage, 471 bytes |
| Metlink `api.opendata.metlink.org.nz/v1/gtfs-rt/tripupdates` | three-value header, or `application/octet-stream` | 200 | `application/json` | `{"header":{"gtfsRealtimeVersion":"2.0",…},"entity":[]}` (plain feed, no wrapper) |
| Metlink same | `application/x-protobuf` only | 200 | `application/x-protobuf` | real FeedMessage |

`GtfsRealtimeBindings.transit_realtime.FeedMessage.decode()` is then fed JSON text, hence the
two decode errors.

## What to build

1. `lib/providers/gtfs/realtime.js`: request `Accept: application/x-protobuf` only. Then make
   the decode robust regardless of what comes back: if the response `Content-Type` contains
   `json` (or the first non-whitespace byte is `{`), parse the text as JSON, unwrap an AT-style
   `{ status, response }` envelope when present, and build the feed with
   `FeedMessage.fromObject(...)` (or `FeedMessage.verify` + `fromObject`) so callers still receive
   a FeedMessage. Otherwise decode protobuf as today. Never let a JSON body reach `decode()`.
2. This file is shared by every GTFS-RT city (Sydney, Brisbane, Gold Coast, Newcastle, Canberra,
   Adelaide, Vancouver, Amsterdam, Rotterdam, …). Do not change anything else about it; do not
   touch any city adapter. Check with a grep that no adapter sets its own `Accept` that would now
   conflict.
3. Add a unit-style QA script `qa/gtfs-realtime-accept.mjs` (register it in `qa/run-all.mjs`'s
   smoke list) that feeds the decoder (a) a real protobuf FeedMessage buffer, (b) a plain JSON
   feed like Metlink's, (c) an AT-style wrapped JSON feed, and asserts all three yield the same
   header/entity shape; plus one assertion that the outgoing Accept header is exactly
   `application/x-protobuf`.

## Verify

- With `.env.local` copied into your worktree, run `node --env-file=.env.local qa/auckland-dogfood-gate.mjs`
  and `node --env-file=.env.local qa/wellington-dogfood-gate.mjs` (check the exact gate names in
  `qa/`), and a direct call through `lib/cities/live-city-api.js`:
  `getMultiCityNextTrain("auckland", { station: "Avondale", direction: "Western Line Swanson", destination: "Western Line Swanson", leaveBeforeMinutes: 10, refreshSeconds: 30, skipTrains: 0 })`
  and the Wellington equivalent (`Ava Station` → `Hutt Valley Line Upper Hutt Station`). Note it
  is the small hours in New Zealand at dispatch time, so an empty but well-formed board
  (`next: null`, no throw) is a pass; a decode error is a fail.
- Regression: run the Sydney, Brisbane, Gold Coast, Canberra, Vancouver, Amsterdam and Rotterdam
  dogfood gates with the env file (these all use the shared decoder).
- Do not run the full smoke suite locally: port 3000 is held by an unrelated dev server and the
  browser scripts only time out. Say so in the PR and rely on CI's web-qa.

Open a normal (non-flip) PR with the raw-fetch table above summarised, the gate results, and the
new QA script's output in the description. Do not merge it.
