# Jim brief — Göteborg: Västtågen live boards never match the direction chips (6 Sep 2026)

**Dispatched:** 6 Sep 2026 (pre-launch production sweep, after PR #312 went live) · **Lane:**
Sweden / `goteborg`, stage `adapter` · **Model:** sonnet (pinned; no override) · **Branch:**
`goteborg-vasttagen-labels` from master.

## What production shows (6 Sep 2026, ~17:35 Göteborg time, Sunday)

Every pendeltåg (Västtågen) station returns an empty board for every chip it offers:

| Station | Chips from `/api/directions` | `/api/next-train` for the Göteborg chip |
|---|---|---|
| Lerum Station | `Västtågen + Alingsås`, `Västtågen + Göteborg Central` | `next: null`, 0 upcoming |
| Alingsås Station | `Västtågen + Göteborg Central` | `next: null`, 0 upcoming |
| Kungsbacka Station | `Västtågen + Göteborg Central` | not probed, same shape |

Trams are fine: Brunnsparken `1 + Tynnered` returns a live next departure.

## Root cause (reproduced locally with real `VASTTRAFIK_CLIENT_ID`/`SECRET`)

`fetchStationBoard("Lerum Station")` from `lib/providers/goteborg.js` returns `realtime: "live"`
with 5 trips whose `destination` values are, verbatim:

- `Västtågen + Alingsås`
- `Västtågen + Göteborg`  ← chip is `Västtågen + Göteborg Central`
- `Västtågen + Floda`     ← intermediate stop on the Alingsås corridor; no such chip

`fetchStationBoard("Alingsås Station")` returns `Västtågen + Göteborg` and `Västtågen + Stockholm`
(through-running past the corridor terminus, which PR #312's handoff already flagged).

The direction chips come from the marketing-ends model (`lib/cities/goteborg/marketing-directions.js`,
`Göteborg Central` is the hub name in the catalog), while the Västtrafik path builds the label from
the feed's own `serviceJourney.direction` text (`Göteborg`, `Floda`, `Stockholm`). The Trafiklab
static path evidently normalised these; the live path does not, so `pickUpcomingProviderTrips`
matches nothing.

## What to build

1. In the Västtrafik→board mapping in `lib/providers/goteborg.js` (or `lib/providers/vasttrafik.js`
   if the label is built there), normalise every Västtågen destination to a chip the station
   actually offers, using the catalog/line-map data the adapter already loads (`line-map.json`
   per-corridor station lists, the hub name `Göteborg Central`):
   - the feed's `Göteborg` (and any Göteborg-name-family variant such as `Göteborg C`,
     `Göteborg Central`, `Göteborg Centralstation`) → `Göteborg Central`;
   - an intermediate stop on the same corridor (e.g. `Floda` from Lerum) → the corridor's outer
     terminus chip (`Alingsås`), because the train is heading that way; a train whose direction
     is *behind* the requested station (i.e. it already passed) must not be relabelled onto the
     wrong chip — use the corridor station order to decide inbound vs outbound;
   - through-running beyond the corridor terminus (`Stockholm`, `Varberg`, `Vänersborg`) →
     the corridor's outer terminus chip when outbound, `Göteborg Central` when inbound. Keep
     the original feed text in a `printedDestination`/`rawDestination` field if the board shape
     has one, so nothing is lost.
   - Apply the same normalisation on the timetable fallback path so both paths agree.
2. Do not change the chips themselves, the tram path, the registry, or any list file.
3. `qa/goteborg-dogfood-gate.mjs`: add assertions with the real credentials present that, for
   Lerum Station and Alingsås Station, every trip's `destination` on the live board is one of the
   chips `getMultiCityDirections("goteborg", station)` returns, and that
   `getMultiCityNextTrain("goteborg", { station: "Lerum Station", direction: "Västtågen + Göteborg Central", … })`
   yields a non-null `next` during service hours (skip that last one with a printed note if the
   board is genuinely empty, e.g. after the last train). Add the equivalent offline assertion
   against a fixture that contains `Göteborg`, `Floda` and `Stockholm` directions.
4. Update `docs/goteborg-d1/jim-handoff.md` with the mapping rule and note it closes the
   "through-running trains" open item from PR #312 as far as labels go (the trip-pattern data
   question can stay open).

## Verify

- `node --env-file=.env.local qa/goteborg-dogfood-gate.mjs`, `qa/goteborg-direction-match.mjs`,
  `qa/goteborg-line-map-conformance.mjs`, `qa/live-city-lists-sync.mjs` (copy `.env.local` from
  the main checkout into the worktree).
- Direct calls through `lib/cities/live-city-api.js` for Lerum, Alingsås and Kungsbacka toward
  `Västtågen + Göteborg Central`, and Lerum toward `Västtågen + Alingsås`, printing `next` and
  `upcoming.length`.
- Do not run the full smoke suite locally: port 3000 is held by an unrelated dev server. Say so in
  the PR and rely on CI's web-qa.

Lane lock: the top-level session has checked `node qa/lane-lock.mjs check sweden` (free); run
`acquire sweden goteborg jim goteborg-vasttagen-labels` before editing. Open a normal PR with the
before/after boards for Lerum and Alingsås in the description. Do not merge it.
