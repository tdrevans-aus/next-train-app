# Jim brief — Göteborg: live boards via Västtrafik Planera Resa v4 (6 Sep 2026)

**Dispatched:** 6 Sep 2026 (Tim's decision) · **Lane:** `sweden`, region `goteborg`, stage `adapter`
· **Model:** sonnet (pinned; no override) · **Branch:** `goteborg-vasttrafik-live` from master.

## Why

Göteborg is live to testers but schedule-only: the adapter (`lib/providers/goteborg.js`) reads
Trafiklab GTFS Regional static for `vt` and the Trafiklab availability table still shows no
TripUpdates or VehiclePositions for Västtrafik (table dated 2026-09-05, re-checked 6 Sep). Tim's
rule (5 Sep): a city with a usable live feed must use it; a city without one gets no board.
Västtrafik publishes its own live departure API, so Göteborg must move to it rather than be
delisted.

## The feed (verified 6 Sep 2026)

- Portal: https://developer.vasttrafik.se/ — free registration, create an application at
  `/applications` to get a client key + secret, then subscribe it to **Planera Resa v4**
  (the Home Assistant integration documents exactly this flow; credentials are issued instantly).
- Auth: OAuth2 client-credentials. Token endpoint `https://ext-api.vasttrafik.se/token`
  (grant_type=client_credentials, Basic auth with key:secret; tokens are short-lived, cache them).
- Base URL: `https://ext-api.vasttrafik.se/pr/v4`
- Departures: `GET /stop-areas/{stopAreaGid}/departures` — returns per-departure `plannedTime`,
  `estimatedTime`, `estimatedOtherwisePlannedTime`, `isCancelled`, `serviceJourney.line`
  (`name`, `transportMode`, `designation`) and `stopPoint`. Stop-area GIDs are the 16-digit
  `9021014…` identifiers; they also appear in the Trafiklab GTFS `stops.txt` for `vt`, which is
  how the existing catalog maps to them (verify, do not assume).
- Not on Trafiklab: keep the Trafiklab static path for the catalog and timetable fallback only.

## Unknowns Jim must settle in the PR (and record in `docs/goteborg-d1/jim-handoff.md`)

1. **Rate limit and quota** for Planera Resa v4 on the free tier — not published on the portal
   front page; read it from the subscription page after registering. Size the shared cache
   window from that number, the way `lib/providers/gtfs/ovapi-tripupdates-cache.js` did for NL.
2. **Licence.** The only third-party review found (Clear Byte, older v2) reports Apache 2.0 on
   the portal; treat as `unclear` until the v4 subscription terms are read. Tim decides whether
   commercial redistribution via our API is covered before the flip. Do not sign anything.
3. **Tram vs pendeltåg coverage.** Confirm departures for both `transportMode: tram` and
   the city-map pendeltåg (Västtågen) stop areas the catalog includes; keep the existing
   bus/stombuss exclusion.
4. **Disruption behaviour.** Clear Byte noted departures can vanish during disruptions rather
   than show as cancelled; the board must fall back to timetable per stop, not go blank.

## What to build

1. `lib/providers/vasttrafik.js`: token cache + `fetchStopAreaDepartures(gid)` with a measured
   timeout and one shared fetch per stop area per window (copy the OVapi cache shape).
2. `lib/providers/goteborg.js`: use Västtrafik departures as the primary board, Trafiklab static
   as the fallback; set `realtime: "live" | "timetable"` per board like Amsterdam/Rotterdam.
3. Registration secrets: `VASTTRAFIK_CLIENT_ID` / `VASTTRAFIK_CLIENT_SECRET` read from env;
   absent → surface `MissingVasttrafikCredentialsError`, never a silent timetable board. Tim
   registers the application and adds the two values to Vercel and `.env.local`.
4. Update `qa/goteborg-dogfood-gate.mjs` to assert a live board (estimated times present) when
   credentials exist and the documented error class when they do not.
5. Do not touch `lib/cities/live-city-api.js`, `app.js` or the live-list files; the board-level
   live/timetable marker is a separate brief.

Run `node qa/goteborg-dogfood-gate.mjs` and `node qa/run-all.mjs --smoke`; open a normal PR with
results and the four unknowns answered. Do not merge.
