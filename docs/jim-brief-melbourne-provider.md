# Jim brief: Melbourne (PTV) provider adapter — build, don’t enable

**For:** Jim (implement)  
**From:** Simon / Tim  
**Date:** 11 Aug 2026  
**Status:** Ready to code (independent of GTFS stack — different API)  
**Related:** `docs/multi-city-provider-design.md` · PTV Swagger  
**Out of scope:** Enabling `melbourne` live; trams/buses/V/Line v1; multi-city UI

---

## 1. Why

Melbourne’s best fit is **PTV Timetable API v3** (JSON + realtime fields), not GTFS-first.

---

## 2. Decisions (locked)

| Rule | Lock |
|------|------|
| City id | `melbourne` |
| TZ | `Australia/Melbourne` |
| Modes v1 | **Metro train only** (`route_type = 0`) |
| Registry | Stay `planned` |
| Public product path | Still **501** |
| Auth | `PTV_DEVID` + `PTV_API_KEY` in Vercel env only |

---

## 3. Integration

| Piece | Detail |
|-------|--------|
| Register | Email `APIKeyRequest@ptv.vic.gov.au` — subject `PTV Timetable API – request for key` (Tim or Jim) |
| Base | `https://timetableapi.ptv.vic.gov.au` |
| Auth | HMAC-SHA1 signature over request path + query including `devid` (official PTV docs / Swagger) |
| Departures | `GET /v3/departures/route_type/0/stop/{stop_id}` |
| Directions | `/v3/directions/...` as needed for labels |
| Swagger | https://timetableapi.ptv.vic.gov.au/swagger/ui/index |

**Adapter:** `lib/providers/melbourne.js` + `lib/providers/ptv/client.js` (sign + GET).  
**Catalog:** `lib/cities/melbourne/stations.json` — metro stops with PTV `stop_id` + display name + coords.  
**Map:** `estimated_departure_utc` / `scheduled_departure_utc` → ProviderTrip ISO; direction → rider label.  
**Probe:** `scripts/probe-melbourne-board.mjs`.

---

## 4. Watch-outs

- Signature encoding bugs (most common fail)  
- stop_id stability across PTV data refreshes  
- Don’t pull whole network into one cold-start without caching stop search

---

## 5. Acceptance

| Check | Pass |
|-------|------|
| With devid+key, probe returns metro departures for a known stop (e.g. Flinders Street) | Yes |
| Missing env → clear error | Yes |
| `assertCityLive("melbourne")` still false | Yes |
| No GTFS-R required for Melbourne v1 | Yes |

---

## 6. Slack / Jim

> Jim — `docs/jim-brief-melbourne-provider.md`: PTV v3 HMAC client + metro adapter + catalog + probe. **Do not** enable live. Can parallel Brisbane if keys available.
