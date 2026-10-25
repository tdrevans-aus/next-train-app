# Jim brief — wire Pacific Surfliner onto the Los Angeles board

**Mode:** bug-fix / product mode. **City:** los-angeles, country united-states. **Date:** 25 Oct 2026.
**tim-review:** no. Tim, 25 Oct 2026 (Australia/Perth), approved serving the third-party transitdocs
feed to riders. Amtrak has not given written permission. That decision is already in
`docs/united-states-ledger.md`. Do not reopen it.

## What to build

Add Pacific Surfliner departures to the existing Union Station board, beside Metro Rail and
Metrolink. Same shape as the Metrolink merge already in `lib/providers/los-angeles.js`: one
board, a separate direction group, and a failure of this feed must not drop Metro or Metrolink
rows.

Pack (the spec):

- `docs/pacific-surfliner-d1/published-network.json`
- `docs/pacific-surfliner-d1/direction-model-memo.md`
- `docs/pacific-surfliner-d1/hazard-pack.md`

Only catalog `Union Station`. Amtrak stop_id `LAX`, stop_name `Los Angeles`. Not Pomona North.
No new stations.

Chips, exact strings: `Pacific Surfliner + San Diego`, `Pacific Surfliner + Goleta Amtrak`,
`Pacific Surfliner + San Luis Obispo`. A trip whose final stop is Los Angeles is not a chip
there. `7th St/Metro Ctr` is never a Surfliner direction. Do not collapse these into Metro or
Metrolink chips.

## Feed

- Static, unkeyed, identity only, never a departure time: `https://content.amtrak.com/content/gtfs/GTFS.zip`. Route id `78` is Pacific Surfliner.
- Live, keyless: `https://asm-backend.transitdocs.com/gtfs/amtrak`. Keep route id `78` only. Every other route in that feed is long-distance Amtrak and stays off the board (`out-reservation`).
- No API key. Do not invent one. Record in a comment that transitdocs asked to be told at asm-contact@transitdocs.com. Do not send that email.

If the live fetch fails, Metro and Metrolink still render. A Surfliner chip the Amtrak static timetable still expects today, with no live row, is `no-live-predictions`. `not-currently-served` only when that timetable has no remaining trip for the chip today. Same rule as the Metrolink follow-up in `docs/jim-brief-la-metrolink-wire.md`. Do not reuse the Metrolink flag for this; a Surfliner failure is its own flag.

## Files

- `lib/providers/los-angeles.js`
- `lib/cities/los-angeles/dogfood-next-train.js` so the three chips appear at Union Station only
- `lib/cities/los-angeles/coverage.json`: Surfliner is shown at Union Station. Long-distance Amtrak stays excluded. Metrolink text stays as it is.
- `lib/providers/registry.js` notes: one sentence that Surfliner at Union Station comes from the transitdocs feed, route 78 only, by Tim's 25 Oct 2026 decision. Status stays `planned`.
- `qa/los-angeles-dogfood-gate.mjs`: the three chips at Union Station, none at Pomona North or 7th St/Metro Ctr, a non-78 route dropped, Metro and Metrolink rows surviving a Surfliner failure, and the empty-reason rule. A mutation of the route filter and of the empty-reason rule must go red.

## Follow-up (controller, 25 Oct 2026) — live trips never join

`82f57d8` builds the right chips from the static zip and drops a fixture entity whose `routeId` is not `"78"`. Against the real transitdocs feed that filter removes every train.

Checked the same afternoon, `https://asm-backend.transitdocs.com/gtfs/amtrak` (about 30KB of protobuf):

- Trip ids look like `2026-10-24_AMTK_595`. There is no string `78` anywhere in the message, so `trip.routeId === "78"` is false for every entity and `composeSurflineTripRows` indexes an empty list.
- Amtrak static `trips.txt` for route 78 uses numeric `trip_id`s (`312161`) and puts the public train number in `trip_short_name` (`595`). Those two id spaces do not overlap, so a join on `trip_id` matches nothing.

Required:

- Parse the train number out of the realtime trip id (`AMTK_<number>`). Join it to static `trip_short_name`. A row is Surfliner only when that static trip's `route_id` is `78`.
- Do not require the realtime entity to carry `routeId` `"78"`. If the field is present and is some other route, still drop it.
- Keep the second check on the static route so a train number that is not route 78 cannot reach the board.
- Add a gate fixture whose realtime trip id is `2026-10-24_AMTK_595` and whose static `trip_short_name` is `595` / `route_id` `78`, and assert a live row appears. A mutation that joins on `trip_id` instead must go red. An entity `2026-10-24_AMTK_11` (Coast Starlight's shape) must not appear.
- Do not flip the city. Same branch. Commit and push. No new pull request.

## Follow-up 2 (controller, 25 Oct 2026) — duplicate train numbers

`dc33320` joins `AMTK_<number>` to the first static trip with that `trip_short_name`. Route 78 has 54 trips and only 37 distinct short names. Twelve numbers are reused. Train 777 is three trips (`314739` to Los Angeles, `314740` to Goleta, `314741` to San Luis Obispo) on three different `service_id`s. Keeping the first one can put the wrong terminus on the board, or attach a timetable that is not running today.

Required:

- Among route-78 trips with that `trip_short_name`, keep the ones whose `service_id` operates on the board's local date in `America/Los_Angeles` (`calendar.txt` / `calendar_dates.txt`, same helper the Metro path already uses).
- If one remains, use it.
- If several remain, keep the ones that call at the board stop (`LAX`). If one remains, use it.
- If several still remain, do not keep file order. Skip the realtime row rather than show a guessed terminus.
- Gate: two static trips share `trip_short_name` `761`, only one service is active on the fixture date, and the live row's chip is that active trip's final stop. A mutation that keeps the inactive trip must go red.

Same branch. Commit and push. No new pull request. Do not flip the city. Run `node qa/los-angeles-dogfood-gate.mjs` only.

## Lane lock

`node qa/lane-lock.mjs check united-states` currently exits 1 because this same branch already holds los-angeles. That is this work. Continue. Do not acquire another region. Do not release the lock.

## Git

Stay on `cursor/la-metrolink-in-ruling-84bf`. Commit and push. Do not open a pull request and do not use `gh`. Do not flip the city. Do not edit flip PR #534. Run `node qa/los-angeles-dogfood-gate.mjs` and `node qa/run-all.mjs --smoke` in the foreground with a 600000 ms timeout. Leave no dev server and no poll loop.
