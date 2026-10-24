# Edinburgh Trams - Jim handoff

Pack: `docs/edinburgh-trams-d1/{hazard-pack.md, direction-model-memo.md, published-network.json}`. Input was
`oracle-clash-report.md` (Option A, approved by Tim 24 Oct 2026), `docs/united-kingdom-ledger.md` and
`docs/edinburgh-d1/`. This pack flips nothing. Luke touched no `lib/`, `qa/`, ledger or tracker file.

## Decision: trams join the existing `edinburgh` city as a second mode

Not a new city. Same pattern as Dublin Luas / Copenhagen Metro. Tram stops are `mode: "metro"` with
`catalogId: "tram:<slug>"`, which is the shape already in `lib/cities/edinburgh/stations.json`. Existing National
Rail entries (EDB, HYM, SLA, EGY, EDP and the rest of the 37) are unchanged. No tram hub-lock.

## What is in the pack

- 23 stops, Airport to Newhaven, in `published-network.json` `stops` (sequence 1-23) and `lines[0].stations`.
- 22 of them match entries already in the live catalog (coordinates reused). **One is new: Edinburgh Park Station**
  (tram stop 7), with `lat/lng: null`; geocode from NaPTAN (StopType MET, "(Edinburgh Trams)" suffix) before wiring.
- `doNotGroup`: Haymarket, Edinburgh Gateway, Edinburgh Park (tram vs rail), plus Park Central vs Park Station.
- York Place closed (Feb 2022) and absent; recorded only under `excludedStations`.
- `displayPolicy`: live times only; never render `sched`; drop events without live values; empty state wording
  "No live predictions for this stop right now"; `pred == sched` not shown as live until G2.

## Work for you (not done by Luke)

1. **Fix `lib/cities/edinburgh/tram-directions.js`**: remove the stale `Edinburgh Waverley` metro/train
   `DO_NOT_GROUP_PAIRS` entry (no Waverley tram stop exists); add the Edinburgh Park pairs; reverse or re-key
   `TRAM_STATIONS` to the official 23 (it has 22, missing Edinburgh Park Station); `TRAM_STATION_ORDER_VERIFIED`
   stays false until G5.
2. **Add the 23rd stop** to `stations.json` and fix the catalog note that records the "22 vs 23" discrepancy.
3. **Replace `EdinburghTramsFeedUnverifiedError`** with a real tram board in `lib/providers/edinburgh.js` using the
   Trapeze API (`POST /stops/GetFilteredStops`, `GET /stops/StopEvents`, try v1.2). Resolve NaPTAN ids (platform
   suffix 1/2) at wire time and store them as `stopIds`. Key header `Ocp-Apim-Subscription-Key`, env
   `EDINBURGH_BUSTRACKER_KEY` (already set; never log, commit or echo it). `StopEvents` returns one object, not an
   array.
4. **Time handling**: parse `sched`/`pred` as UTC and convert to Europe/London (see hazard-pack H7). The DST change
   is Sun 25 Oct 2026, so the probe cannot be re-used to discriminate UTC from local until March 2027 unless you
   sample before the change. Handle midnight rollover (bare `HH:MM`).
5. **Query cap**: `maxEvents=4` / 60 min looks sparse at 7-10 minute headways. Test a larger cap.
6. **Cache and rate limits**: unknown. Do not exceed whatever G6 settles; follow the Darwin 20 s server-cache
   pattern if production use is permitted. Respect the 30 s ceiling rule; keep cold boards fast.
7. At the flip commit only: set tram `liveFeed: true`, add trams to the picker (no Coming Soon), update the ledger
   (Edinburgh row, section 4 coverage bullet, parked-modes table), and clear the "DFT BODS T50 confirmed" claim.

## Flip gates (Mark's, listed fully in hazard-pack.md)

G1 Tim confirms the Trapeze/Journeo terms in writing (paid app plus onward relay). G2 realtime sampling test
(null semantics, `pred == sched` echo, zone, countdown behaviour). G3 provenance (same data as the Edinburgh Trams
and Lothian apps). G4 Stop Services check at all 23 stops for other operators. G5 stop order and full-length running.
G6 all-stations live sweep, rate limits, production key use.

## Board eligibility

T50: `in` (contactless tap-on, no reservation, no barrier), conditional on the live-only display rule. ScotRail at
EGY and EDP: `in`, carried. "No other services call at any in-catalog tram stop - verified" is **not yet writable**
(G4).

## Open questions for Jim

1. Can the key be used from the hosted production server, and what are the per-second/day limits? (Viv questions 5, 6.)
2. Does null `departuretime` mean "no prediction" or "scheduled only"? Is `pred` UTC or local? (Viv question 4.)
3. Platform-to-direction mapping at each stop and the Newhaven 1 / Newhaven 2 behaviour; which platform is the
   departing one at each terminus.
4. Is v1.2 the supported version and what is the retirement notice for v1.1?
5. Coordinates for Edinburgh Park Station.
6. Whether a static GTFS with EDT/T50 exists at all (the earlier DFT BODS claim could not be reproduced); not needed
   for a live-only board, but it would help verify the stop order.
7. Does the ledger edit belong in your flip PR or the controller's? Luke did not touch it.
