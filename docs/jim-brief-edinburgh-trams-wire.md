# Jim brief — Edinburgh Trams: wire the tram mode into live Edinburgh (not live for riders yet)

**Mode:** expansion wiring, with product-mode authority for the edits below. **City:** edinburgh,
country united-kingdom. Acquire the lane lock: the controller checked on 24 Oct 2026 and it was free.
**Date:** 24 Oct 2026. **tim-review:** no.
**Input (the handoff):** `docs/edinburgh-trams-d1/`: `jim-handoff.md`, `hazard-pack.md`,
`direction-model-memo.md`, `published-network.json`, and `oracle-clash-report.md` for background.

## Tim's decision on flip gate G1 (24 Oct 2026, in chat)

> "Get jim to build it and I'm assuming we can use it."

Tim has accepted the Trapeze/Journeo licence risk himself. There are no published terms: the product
terms field is empty, no approval was required, and the access email states no conditions. **G1 is
closed by Tim's decision.** Record that in `docs/edinburgh-trams-d1/hazard-pack.md`, at the G1 row,
with this date and quote. Don't send or draft any email. Gates G2–G6 still stand, and they belong to
Mark at the flip.

## The hard constraint

Edinburgh is **live** (National Rail slice, #307). Riders must see **no change** until Mark's flip
PR. Put the whole tram mode behind an explicit off-by-default switch, scoped to the tram mode only.
Follow the precedent of an existing city that added a second mode after going live, if there is one;
otherwise use a single registry field such as `tramsLive: false`. With the switch off:
- Edinburgh boards are byte-identical to master.
- `/api/directions` is byte-identical to master.
- The picker and catalog output are byte-identical to master.

Prove it with a gate.

## Build

- **Adapter** for the BusTracker Open API. Base
  `https://apim-public.trapezegroupazure.co.uk/edinburgh-cec-openapi/generic/v1.2/`, header
  `Ocp-Apim-Subscription-Key`, env `EDINBURGH_BUSTRACKER_KEY`. It must fail with a typed missing-key
  error, and must throw `FeedUnavailableError` on a feed failure (the shared 503 path, see #502).
  **`StopEvents` returns a single object, not an array.**
- **Live times only:** never render `sched`. Drop events with no live value, and don't show
  `pred == sched` as live until G2 resolves it (follow the display policy in hazard-pack). Empty
  results use the honest empty state, "No live predictions for this stop right now".
- **Time zone:** parse bare `HH:MM` strings as UTC, convert explicitly to Europe/London, and handle
  midnight rollover. **Daylight saving ends tomorrow, Sun 25 Oct**, so don't infer the zone from
  samples taken after today.
- **Catalog:** 23 stops, with York Place excluded. Edinburgh Park Station needs real coordinates, so
  geocode it from an official or OSM source and cite it. Never invent coordinates.
  - Remove the stale "Edinburgh Waverley tram stop" pair from `lib/cities/edinburgh/tram-directions.js`.
  - Keep the tram stop and the rail station separate at Haymarket/HYM, Edinburgh Gateway/EGY and
    Edinburgh Park Station/EDP.
  - Edinburgh Park Central and Edinburgh Park Station are separate stops.
- **Directions:** T50 towards Edinburgh Airport and T50 towards Newhaven, with no self-terminus chip.
- **Ledger:** the United Kingdom ledger's Edinburgh Trams rows ("no confirmed real-time", parked)
  are stale. Update them to "API found 24 Oct 2026; wired, not live", and cite the oracle report.

## QA

- Add an offline gate, `qa/edinburgh-trams-planned-gate.mjs` (name it to match the repo's
  conventions):
  - single-object `StopEvents` parsing;
  - UTC→Europe/London conversion, including a BST sample and midnight rollover;
  - null and sched-equal predictions dropped;
  - York Place absent;
  - the switch-off byte-identity check.
  
  Register it in `run-all.mjs` the way other planned gates are registered.
- Run each new assertion once with its fix reverted, and confirm it fails (mutation check).
- `node qa/run-all.mjs --smoke` passes: plain, with a 600000 ms timeout, in the foreground.
- **Live probe:** fetch two or three stops with the key, at a modest rate. Never print the key.
  Record what comes back in `docs/edinburgh-trams-d1/jim-handoff.md`.

## Deliver

Open a PR that links this brief and the D1 pack. Edinburgh stays live for rail, and the tram switch
stays **off**. Leave no background sleep or poll loops running.
