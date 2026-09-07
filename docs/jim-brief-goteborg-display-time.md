# Jim brief — Göteborg: live-only board rows have no `displayTime`, so the app shows a blank time (7 Sep 2026)

**Dispatched:** 7 Sep 2026 (post-merge production sweep) · **Lane:** Sweden / `goteborg` ·
**Model:** sonnet (pinned; no override) · **Branch:** `goteborg-display-time` from master.

## Symptom (production and local, 7 Sep 2026 ~11:20 UTC)

`/api/next-train?city=goteborg&station=Alingsås Station&direction=Västtågen + Göteborg Central`
returns a `next` object with `departure`, `scheduledDeparture`, `minutesUntilDeparture` … but
**`displayTime` and `scheduledDisplayTime` are `undefined`**. Every other city returns them
(Malmö Åkarp: `displayTime: "13:18"`). The web/Android client renders `displayTime` as the big
time on the card, so Göteborg riders get a blank.

Same through `lib/cities/live-city-api.js` locally:

```
goteborg Alingsås Station | next keys: departure,scheduledDeparture,displayTime,scheduledDisplayTime,minutesUntilDeparture | displayTime: undefined
malmo    Åkarp            | ... | displayTime: 13:18
```

## Root cause

`lib/providers/goteborg.js` `fetchStationBoard()` (rewritten live-only in PR #332) emits trips
with keys `routeShortName, transportMode, destination, rawDestination, liveDeparture,
scheduledDeparture, cancelled` — no `displayTime` / `scheduledDisplayTime` / `platform`. The
shared `buildNextTrainResponse` / `pickUpcomingProviderTrips` in `lib/train-times-core.js` copy
`displayTime` from the trip rather than deriving it, so the field is passed through as undefined.
Before #332 the Trafiklab path produced these fields via the shared GTFS board builder
(`lib/providers/gtfs/board.js`), which formats them with the city time zone.

## What to build

1. In the Västtrafik → trip mapping in `lib/providers/goteborg.js`, emit the same shape the GTFS
   board builder does: `displayTime` (from `liveDeparture ?? scheduledDeparture`, `HH:mm` in
   `Europe/Stockholm`), `scheduledDisplayTime` (from `scheduledDeparture`), `platform`
   (Västtrafik `stopPoint.platform` / `stopPoint.designation` if present, else `""`), and
   `realtime: true|false` per row (`estimatedTime` present). Reuse the existing time formatter
   the other Swedish adapters use rather than writing a new one.
2. Add a shared provider-contract check so this cannot recur: in `lib/providers/contract.js` (or
   the nearest existing contract assertion used by the dogfood gates) assert every trip on a live
   board has string `displayTime` and `scheduledDisplayTime`. Wire it into
   `qa/goteborg-dogfood-gate.mjs` with real credentials (Brunnsparken, Lerum Station, Alingsås
   Station) and, if the contract helper is generic, into `qa/live-city-lists-sync.mjs`'s
   neighbour gates only if cheap; otherwise a one-line assertion in each Swedish gate.
3. `docs/goteborg-d1/jim-handoff.md`: one line recording the trip shape the live path must emit.

Do not touch chips, the registry, list files, or other cities.

## Verify

`node --env-file=.env.local qa/goteborg-dogfood-gate.mjs`, `qa/goteborg-direction-match.mjs`,
`qa/goteborg-line-map-conformance.mjs`, `qa/live-city-lists-sync.mjs`; a direct
`getMultiCityNextTrain("goteborg", { station: "Alingsås Station", direction: "Västtågen + Göteborg Central", destination: same, leaveBeforeMinutes: 10, refreshSeconds: 30, skipTrains: 0 })`
printing `next.displayTime` and `next.scheduledDisplayTime` as `HH:mm` strings, and the same for
Brunnsparken → `1 + Tynnered`. Do not run the full smoke suite locally (port 3000 is held by an
unrelated dev server); rely on CI. Open a normal PR with before/after payloads. Do not merge it.
