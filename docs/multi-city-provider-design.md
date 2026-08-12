# Multi-city provider design — Australian capitals

**Status:** Design + Jim briefs ready — adapters **build, don’t enable**  
**Owner:** Tim (product) · Jim implements adapters when Tim sends briefs  
**Related:** `docs/city-2-bookmarks.md` · `docs/business-marketing-plan.md` · `lib/providers/`  
**Jim briefs:** Brisbane (start) · Sydney · Melbourne · Adelaide · Canberra  
**Rule:** Keep `/api/next-train` response shape stable. New cities = new **provider adapters** + **city config**, not UI rewrites. Hobart/Darwin **out**.

---

## 1. Shared contract (what every city must speak)

App / widget / reminders already depend on:

| In | Out |
| --- | --- |
| `station` + `direction` + `leaveBeforeMinutes` (+ optional `city`) | `next` / `following` / `upcoming` trips with `departure`, `leaveBy`, `displayTime`, `platform`, `leavePhase`, … |

**Provider adapter only owns fetch + normalize to raw trips.**  
Shared leave-by math (`buildNextTrainResponse`, phases, skip) stays city-agnostic once `timeZone` is injected.

```text
CityConfig + Provider.fetchStationBoard(stationId)
        → { stationName, lastUpdate, trips[] }
        → shared buildNextTrainResponse(timeZone, leaveBefore, directionFilter)
        → existing HTTP JSON
```

**CityConfig (minimum):**

| Field | Purpose |
| --- | --- |
| `id` | `perth`, `sydney`, … |
| `timeZone` | IANA, e.g. `Australia/Sydney` |
| `displayName` | Store / UI |
| `modes` | `train` / `metro` / `light_rail` / `bus` — product scope for v1 of that city |
| `stationCatalog` | Allowlist + coords (like today’s `stations.json`) |
| `directionAliases` / `lineGroups` | Collapse terminals → rider labels |
| `clusterRules` | e.g. Perth CBD merge |
| `auth` | env keys required (never in client) |
| `provider` | module id |

Seam stubs: `lib/providers/registry.js` + `lib/providers/contract.js`.  
Handlers may accept `?city=` (default `perth`); non-live cities → **501** until implemented.

---

## 2. Per-capital recommendation

### Perth (live) — Transperth

| | |
| --- | --- |
| **Agency** | Transperth (PTA WA) |
| **Best integration** | **Keep** current LiveTimes ASMX XML (`GetTimesForStation`) behind `providers/perth` |
| **Why** | Already works; not GTFS; rewriting to GTFS would be a downgrade for leave-by |
| **Auth** | None (public endpoint — ToS risk same as today) |
| **TZ** | `Australia/Perth` |
| **Modes for Next Train** | Suburban rail (existing) |
| **Plumbing** | Extract current `fetchTripsForStation` → `lib/providers/perth.js` without behaviour change |

---

### Sydney — Transport for NSW

| | |
| --- | --- |
| **Agency** | TfNSW (Sydney Trains + Metro in feeds) |
| **Best integration** | **GTFS Schedule (For Realtime) + GTFS-R Trip Updates** via Open Data Hub |
| **Why** | Official, documented, same pattern as many AU cities; stop departures = static stop_times ⊕ trip updates |
| **Portal** | https://opendata.transport.nsw.gov.au/ (register → API key) |
| **Key endpoints (trains)** | Schedule: `https://api.transport.nsw.gov.au/v1/gtfs/schedule/sydneytrains` · RT: `…/v2/gtfs/realtime/sydneytrains` (+ vehiclepos / alerts) · Metro: use TfNSW Metro endpoints in same hub |
| **Auth** | `Authorization: apikey <key>` (Hub) |
| **Format** | Protobuf GTFS-R + static GTFS zip |
| **TZ** | `Australia/Sydney` |
| **Modes for v1** | Sydney Trains + Sydney Metro (rail-like leave-by); defer buses/ferries/LR |
| **Adapter shape** | Shared `GtfsRtBoardProvider` + Sydney stop_id map + headsign → `direction` labels |
| **Watch-outs** | Parent/child stops; platform in stop name or RT; API key quotas; competition (TripView) |

---

### Melbourne — PTV

| | |
| --- | --- |
| **Agency** | Public Transport Victoria |
| **Best integration** | **PTV Timetable API v3** (JSON) — *not* raw GTFS-first |
| **Why** | First-party departures API with realtime where available; HMAC auth is the official path PTV apps use |
| **Base** | `https://timetableapi.ptv.vic.gov.au` |
| **Register** | Email `APIKeyRequest@ptv.vic.gov.au` subject: `PTV Timetable API – request for key` → `devid` + key |
| **Auth** | HMAC-SHA1 signature over path+query including `devid` |
| **Key routes** | `GET /v3/departures/route_type/{route_type}/stop/{stop_id}` (`route_type=0` metro train); directions via `/v3/directions/...`; disruptions optional later |
| **Swagger** | https://timetableapi.ptv.vic.gov.au/swagger/ui/index |
| **TZ** | `Australia/Melbourne` |
| **Modes for v1** | Metro train (`route_type` 0); V/Line later |
| **Adapter shape** | `PtvDeparturesProvider` — map stop_id ↔ catalog name; direction_id ↔ rider label; `estimated_departure_utc` / `scheduled_departure_utc` → trip ISO |
| **Watch-outs** | Signature bugs; stop_id stability; crowded App Store |

---

### Brisbane (SEQ) — Translink

| | |
| --- | --- |
| **Agency** | Translink (QLD) |
| **Best integration** | **GTFS (SEQ) + GTFS-R** — no key |
| **Why** | Open CC-BY; dedicated Rail RT paths exist |
| **Static** | data.qld.gov.au Translink GTFS (SEQ zip) |
| **RT base** | `https://gtfsrt.api.translink.com.au/api/realtime/SEQ/` |
| **Useful paths** | `TripUpdates`, `TripUpdates/Rail`, `VehiclePositions`, `VehiclePositions/Rail`, `ServiceAlerts` |
| **Auth** | None |
| **TZ** | `Australia/Brisbane` |
| **Modes for v1** | SEQ train (QR Citytrain); defer bus/ferry/tram |
| **Adapter shape** | Same shared `GtfsRtBoardProvider` as Sydney (config only differs) |
| **Watch-outs** | Route id delimiter quirks (`-`); stop id conventions; cache static GTFS on Vercel Blob/KV or rebuild nightly |

---

### Adelaide — Adelaide Metro

| | |
| --- | --- |
| **Agency** | Adelaide Metro / DIT SA |
| **Best integration** | **GTFS-R (+ static GTFS)** primary; **SIRI** only if stop-board UX needs it |
| **Why** | Official developer program; GTFS-R aligns with shared helper; SIRI is stop-centric but second format to maintain |
| **Portal** | https://www.adelaidemetro.com.au/developer-info · https://gtfs.adelaidemetro.com.au/ |
| **Auth** | Per Adelaide developer docs (register / keys as published on portal) |
| **TZ** | `Australia/Adelaide` (DST) |
| **Modes for v1** | Train (+ maybe tram later); buses later |
| **Adapter shape** | `GtfsRtBoardProvider` + Adelaide catalog |
| **Watch-outs** | DST edge cases in leave-by; confirm train stop_ids vs platforms |

---

### Canberra — Transport Canberra

| | |
| --- | --- |
| **Agency** | Transport Canberra (MyWay+) |
| **Best integration** | **MyWay+ GTFS + GTFS-R** on `transport.api.act.gov.au` |
| **Why** | SIRI deprecated; official path is GTFS-R with Basic auth |
| **Prod** | `https://transport.api.act.gov.au` |
| **Examples** | Static: `/gtfs/data/gtfs/v2/google_transit.zip` · RT: `/gtfs/data/gtfs/v2/trip-updates.pb` (+ vehicle / alerts per portal) |
| **Auth** | HTTP Basic (Client ID/Secret from MuleSoft Anypoint ACT portal) |
| **Guide** | https://www.transport.act.gov.au/contact-us/information-for-developers |
| **TZ** | `Australia/Sydney` (ACT uses Sydney TZ) |
| **Modes for v1** | **Light rail** first (rail-like leave-by); buses if catalog clean |
| **Adapter shape** | `GtfsRtBoardProvider` + ACT auth wrapper |
| **Watch-outs** | Portal onboarding friction; light-rail vs bus product copy (“Next Train” naming) |

---

### Hobart / Darwin — **out of plan**

Dropped (Tim 11 Aug 2026): bus-only, weak “Next Train” fit, no solid open realtime for leave-by.

---

## 3. Shared building blocks to invent once

| Module | Used by |
| --- | --- |
| `lib/providers/gtfs/static-cache.js` | Download/parse GTFS zip → stops, stop_times, trips, routes (nightly or on cold start + TTL) |
| `lib/providers/gtfs/realtime-board.js` | Merge TripUpdates → departures for `stop_id` |
| `lib/providers/ptv/client.js` | HMAC sign + departures |
| `lib/providers/perth/livetimes.js` | Existing XML (reference implementation) |
| `lib/cities/<id>.json` | Catalog + aliases + TZ + mode flags |

**Do not** put API keys in the Capacitor web bundle — server-only env on Vercel (`TFNSW_API_KEY`, `PTV_DEVID`, `PTV_KEY`, `ACT_GTFS_BASIC`, …).

---

## 4. Expansion order (engineering ease × product)

| Priority | City | Rationale |
| --- | --- | --- |
| 0 | Perth | Live |
| 1 | **Brisbane** | GTFS-R, **no key**, rail RT paths — cheapest spike |
| 2 | **Sydney** | Same GTFS stack + key; biggest market; hardest ASO |
| 3 | **Melbourne** | Different stack (PTV); big market |
| 4 | **Adelaide** | GTFS-R + register |
| 5 | **Canberra** | GTFS-R + Basic auth; light-rail story |

---

## 5. What “plumbing now” means (no city launch)

1. Document this file (done).  
2. `lib/providers/registry.js` — capitals listed; only `perth` `status: "live"`.  
3. `?city=` on API → default perth; others **501**.  
4. **Jim briefs** to build adapters without enabling:  
   - `docs/jim-brief-brisbane-provider.md` (**start**)  
   - `docs/jim-brief-sydney-provider.md`  
   - `docs/jim-brief-melbourne-provider.md`  
   - `docs/jim-brief-adelaide-provider.md`  
   - `docs/jim-brief-canberra-provider.md`  

When Tim picks city #2 to **launch**: flip registry to `live` + catalog in app UI — separate brief.

---

## 6. Change log

| Date | Note |
| --- | --- |
| 2026-08-11 | Initial capital-by-capital design + provider registry stubs |
| 2026-08-11 | Hobart/Darwin dropped; Jim adapter briefs written (build, don’t enable) |
