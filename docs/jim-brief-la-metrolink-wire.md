# Jim brief — wire Metrolink onto the Los Angeles board

**Mode:** bug-fix / product mode. The brief is the authority to edit the existing Los Angeles
adapter. **City:** los-angeles, country united-states. **Date:** 25 Oct 2026. **tim-review:** no.
This brief is Tim's decision, given in chat on 25 Oct 2026 (Australia/Perth): wire Metrolink.

## The decision

Serve Metrolink live departures to riders. One server-side application key. The key stays in
the environment, is never logged, never committed, and never sent to the client. Do not
republish Metrolink's raw protobuf.

Tim's reading of the EULA, which this brief adopts: the signup page
(https://metrolinktrains.com/about/gtfs/gtfs-rt-access/) issues one private key per application
and will raise that application's rate limit. Showing departures on our boards is that use.
The EULA line about not distributing "the API Access" is treated as a ban on sharing the key
or handing out the feed, which this adapter must not do.

Los Angeles stays `status: "planned"`. Do not flip. Do not edit flip PR #534. Do not wire
Pacific Surfliner in this change.

## What to build

Merge Metrolink onto the existing LA boards. Brussels shape (`lib/providers/brussels.js`):
same station board, a separate direction group, never collapsed into `A Line + …` chips.
Metro Rail must still render when the Metrolink feed or key fails. A Metrolink failure is a
Metrolink empty state, not a blank Union Station board.

Pack (read these, they are the spec):

- `docs/los-angeles-metrolink-d1/published-network.json`
- `docs/los-angeles-metrolink-d1/hazard-pack.md` (H5 is the chip list and the trip counts)
- `docs/los-angeles-metrolink-d1/direction-model-memo.md`
- `docs/united-states-ledger.md` Los Angeles table

Stations, and only these:

- Catalog `Union Station` ← Metrolink stop_id `107`, GTFS name `L.A. Union Station`. Six lines: AV, VC, OC, 91-PV, RIV, SB, plus every short-turn final stop in the pack's chip list.
- Catalog `Pomona North` ← Metrolink stop_id `109`, GTFS name `Pomona - North`. San Bernardino Line only. Westbound chip text is `SB Line + Union Station`. Eastbound chips are `SB Line + San Bernardino - Downtown` and `SB Line + Redlands - Downtown`.
- No other catalog station gains a Metrolink row. `Pomona - Downtown` (stop 120) and the IE-OC line stay off. `Redlands - University` is not a chip at these stations.

Chip text is `route_short_name + exact GTFS stop_name` (`AV Line + Lancaster`). `route_id` is the long name (`Antelope Valley Line`, `91 Line`). A trip whose final stop is the board station is not a chip there. `7th St/Metro Ctr` is never a Metrolink direction.

## Feeds

- Static, unkeyed, stop and trip identity only, never a departure time: `https://metrolinktrains.com/globalassets/about/gtfs/gtfs.zip`
- Live trips: `https://metrolink-gtfsrt.gbsdigital.us/feed/gtfsrt-trips` with header `X-Api-Key: <METROLINK_API_KEY>`. Vehicles and alerts are not the board.
- Env name is `METROLINK_API_KEY`. Do not reuse `METLINK_API_KEY` (that is Wellington). Never paste a key. If the variable is unset, Metro boards still load and the Metrolink group says live Metrolink times are unavailable, naming the env var only in logs / the error's `detail`, not in rider copy.
- Signup URL, for the error detail only: `https://metrolinktrains.com/about/gtfs/gtfs-rt-access/`

## Files

- `lib/providers/los-angeles.js` and, if you need a header helper, `lib/providers/gtfs/auth.js`.
- `lib/providers/registry.js` notes: Metrolink is on the Union Station and Pomona North boards; the key is server-side; Surfliner is not this change.
- `lib/cities/los-angeles/coverage.json`: move Metrolink out of the "not shown yet" line. Say it is shown at Union Station and Pomona North. Leave Pacific Surfliner as not shown yet. Leave long-distance Amtrak, busways, and the people mover as they are.
- Direction generation for the dogfood module so the new chips exist where the static trips call. Follow the short-turn work already in `lib/cities/los-angeles/`.
- `qa/los-angeles-dogfood-gate.mjs`: assert the chip split, the two stations, the absence of Metrolink chips at a third station, and that a Metrolink fetch failure does not drop Metro rows. A mutation of each of those must go red.

## QA

- The dogfood gate, with a mutation check on the Metrolink assertions.
- `node qa/run-all.mjs --smoke` in the foreground with a 600000 ms timeout. Do not start a second copy. Do not leave a dev server or a poll loop running.
- `node qa/lane-lock.mjs check united-states` first. The controller saw it free on 25 Oct 2026. Then `node qa/lane-lock.mjs acquire united-states los-angeles jim cursor/la-metrolink-in-ruling-84bf` before editing `lib/providers/`.

## Follow-up (controller, 25 Oct 2026) — false empty reason

`aba910a` merges live Metrolink rows and keeps Metro rows when the key or the fetch fails. That part stands. The empty state does not.

`scheduledDestinationsToday` / `scheduledDestinationsRemaining` are built from the Metro static feed only. `buildLosAngelesNextTrainFromBoard` then treats any chip missing from those lists as `not-currently-served`. A Metrolink chip with no live row — missing `METROLINK_API_KEY`, a failed fetch, or simply no prediction this minute — is told to the rider as "not currently served". The trains are served. The feed is missing or quiet.

Required:

- A Metrolink chip at Union Station or Pomona North that the Metrolink static timetable still expects today gets `no-live-predictions` when the live row is absent, including when `metrolinkPartial` is set.
- It gets `not-currently-served` only when the Metrolink timetable itself has no remaining trip for that chip today.
- Metro chips are unchanged.
- Add a gate assertion that a Union Station Metrolink chip on a `metrolinkPartial` board is `no-live-predictions`, and that the same assertion goes red if that chip is classified `not-currently-served`.
- Do not wire Surfliner. Do not flip the city. Same branch, commit, push, no new PR.

## Git

Stay on `cursor/la-metrolink-in-ruling-84bf`. Commit your files and push that branch. Do not open a pull request and do not use `gh` to create one. PR #535 already tracks this branch. Do not commit `docs/pacific-surfliner-d1/` if you did not change it. Leave no background loops.
