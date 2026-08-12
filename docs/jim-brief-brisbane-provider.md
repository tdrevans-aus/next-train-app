# Jim brief: Brisbane (Translink) provider adapter — build, don’t enable

**For:** Jim (implement)  
**From:** Simon / Tim  
**Date:** 11 Aug 2026  
**Status:** Ready to code — **start here** (first city adapter)  
**Related:** `docs/multi-city-provider-design.md` · `lib/providers/` · `lib/train-times.js`  
**Out of scope:** Flipping Brisbane to `live`; multi-city UI / Play listing / Near me outside Perth; bus/ferry/tram; enabling `?city=brisbane` on production product paths

---

## 1. Why

Tim wants adapters written **before** expansion so city #2 is a flip, not a rewrite. Brisbane is cheapest: **GTFS + GTFS-R, no API key**, SEQ **Rail** feeds.

**Locked:** Ship code that can fetch a Brisbane station board and map to our trip contract. **Do not** turn the city on for the app.

---

## 2. Decisions (locked)

| Rule | Lock |
|------|------|
| City id | `brisbane` |
| TZ | `Australia/Brisbane` |
| Modes | **Train only** (QR Citytrain / SEQ rail) |
| Registry | Keep `status: "planned"` (or add `adapterReady: true` **without** making `assertCityLive` pass) |
| Public `/api/next-train?city=brisbane` | Still **501** |
| Shared leave-by | Reuse `buildNextTrainResponse` / enrich helpers — inject TZ; don’t fork leave phases |
| Secrets | None for Brisbane |
| Hobart / Darwin | **Out of plan** — ignore |

---

## 3. Architecture

### 3.0 Optional but recommended — Perth extract

Move current Transperth fetch into `lib/providers/perth.js` exporting `fetchStationBoard(stationName)` matching `lib/providers/contract.js`. `lib/train-times.js` calls Perth by default. **No behaviour change.** Establishes the pattern Brisbane follows.

### 3.1 Shared GTFS stack (invent once — Brisbane is first consumer)

| Module | Job |
|--------|-----|
| `lib/providers/gtfs/static-cache.js` | Download SEQ GTFS zip → parse `stops`, `stop_times`, `trips`, `routes`, `calendar`(+exceptions). Cache in memory with TTL (e.g. 6–24h) or refresh daily. |
| `lib/providers/gtfs/realtime.js` | Fetch protobuf TripUpdates; decode (use a small `gtfs-realtime-bindings` or equivalent dep). |
| `lib/providers/gtfs/board.js` | Given `stop_id` + now: scheduled departures ⊕ RT updates → `ProviderTrip[]` |

### 3.2 Brisbane adapter

`lib/providers/brisbane.js`:

- `fetchStationBoard(stationIdOrName)` → `{ stationName, lastUpdate, trips }` per contract  
- Catalog: `lib/cities/brisbane/stations.json` (rail stops only — name, `stop_id`, lat/lng). Build from SEQ GTFS; filter train. Start with major SEQ rail stations (enough for dogfood), not every bus stop.  
- Direction labels: use trip headsign / route long name; add `directionAliases` / line groups only where riders need collapse (document in catalog README).  
- Prefer RT paths:  
  - `https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates/Rail`  
  - (optional) `…/VehiclePositions/Rail`  
- Static: Queensland Open Data **SEQ GTFS** zip (pin URL in code comments + design doc).  
- Watch: route id delimiter `-` quirks called out in design doc.

### 3.3 How to exercise without enabling the city

Pick **one**:

- **A (preferred):** `node scripts/probe-brisbane-board.mjs "Central"` (or stop_id) — prints JSON board  
- **B:** Internal-only `GET /api/dev/board?city=brisbane&station=…` that **must not** be linked from the app; return 404 unless `process.env.ALLOW_CITY_PROBES=1`

Do **not** open Brisbane through `assertCityLive`.

---

## 4. Acceptance

| Check | Pass |
|-------|------|
| Probe returns ≥1 upcoming rail trip for a known station (e.g. Central / Roma Street) in local evening/morning | Yes |
| Trips have ISO `liveDeparture` / `scheduledDeparture`, `destination`, optional `platform` | Yes |
| `assertCityLive("brisbane")` still fails (not live) | Yes |
| Perth `/api/next-train` unchanged | Yes |
| No API keys required | Yes |
| Docs: short “how to probe” in brief or `TESTING.md` | Yes |

---

## 5. Slack / Jim

> Jim — start `docs/jim-brief-brisbane-provider.md`. Build shared GTFS helpers + Brisbane rail adapter + probe script. **Do not** set Brisbane live / wire product UI. Perth behaviour unchanged.
