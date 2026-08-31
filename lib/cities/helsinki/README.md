# Helsinki (HKL / HSL) city pack

Status: **planned** (adapterReady). Do not flip live — see `docs/helsinki-d1/jim-handoff.md`.

- `stations.json` — 30 metro stations, printed map strings (docs/helsinki-d1/published-network.json's
  `lines[].stations`), coordinates and `stationGtfsId` resolved live against Digitransit Routing API
  v2 HSL (`stops(name)` filtered to `vehicleMode SUBWAY`, `parentStation.gtfsId`) 30 Aug 2026 — a
  runtime id lookup, not the D1 station-list oracle. Europe/Helsinki with DST. Hub lock:
  **Rautatientori**.
- `line-map.json` — M1 (Kivenlahti–Vuosaari) and M2 (Tapiola–Mellunmäki) only, no M3/Itämetro
  (unopened). `doNotGroup` for Rautatientori (metro) vs Helsinki Central/Päärautatieasema
  (VR/commuter — different Digitransit stop-place), Kamppi metro vs Kamppi bus terminal, and
  Pasila (no metro at all). `shortTurnGroups` stays empty — no nested short-turn codes on the
  official map.
- `marketing-directions.js` — line + terminus chips ("M1 + Kivenlahti"), Stockholm's "+"
  convention (docs/helsinki-d1/direction-model-memo.md option A, locked). Rautatientori is a
  through-trunk hub called by both lines in both directions — never inbound/outbound vs "City".
  `stripViaSuffix()` strips the via-stop Digitransit appends to fork-leg headsigns ("Kivenlahti
  via Tapiola" → "Kivenlahti", confirmed live 30 Aug 2026). Two forbidden-name sets, deliberately
  different sizes: `isForbiddenCollapseName()` (narrow — blocks *station resolution*, only
  strings that are never a real metro station: Helsinki Central, Päärautatieasema, Helsingin
  keskusta, City, etc.) vs `isForbiddenTerminusToken()` (the full published-network.json
  `doNotUse` list, which also includes real boardable stations — Kamppi, Helsingin yliopisto,
  Matinkylä — that must never appear as a *direction chip terminus* even though they stay
  resolvable stations).

v1 scope (docs/helsinki-d1/hazard-pack.md): metro M1/M2 only (shortName M1|M2, vehicleMode
SUBWAY). No tram, no bus, no HSL/VR commuter rail, no Suomenlinna ferry, no M3/Itämetro. Current
west branches Kivenlahti (M1) and Tapiola (M2) — Matinkylä was the west end 2017–2 Dec 2022 and
stays a stop, not a chip. Current east branches Vuosaari (M1) and Mellunmäki (M2).

Live path: `lib/providers/helsinki.js` — Digitransit Routing API v2 HSL GraphQL
(`POST https://api.digitransit.fi/routing/v2/hsl/gtfs/v1`, header `digitransit-subscription-key`,
env `DIGITRANSIT_SUBSCRIPTION_KEY`), `station(id).stops.stoptimesWithoutPatterns` — blends
scheduled + realtime in one call, so unlike Malmö/Göteborg there is no separate static-GTFS +
GTFS-RT-protobuf merge. Confirmed live against real HSL metro departures 30 Aug 2026.
`DIGITRANSIT_SUBSCRIPTION_KEY` is in `.env.local` for local testing — **still needs to be added
to the Vercel project env before any live flip**; that's outside this pack's scope (no Vercel
access here).

Source: `docs/helsinki-d1/{oracle-clash-report,hazard-pack,direction-model-memo}.md`,
`published-network.json`, `jim-handoff.md`.
