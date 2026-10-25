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

## Lane lock

`node qa/lane-lock.mjs check united-states` currently exits 1 because this same branch already holds los-angeles. That is this work. Continue. Do not acquire another region. Do not release the lock.

## Git

Stay on `cursor/la-metrolink-in-ruling-84bf`. Commit and push. Do not open a pull request and do not use `gh`. Do not flip the city. Do not edit flip PR #534. Run `node qa/los-angeles-dogfood-gate.mjs` and `node qa/run-all.mjs --smoke` in the foreground with a 600000 ms timeout. Leave no dev server and no poll loop.
