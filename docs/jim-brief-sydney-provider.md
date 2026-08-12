# Jim brief: Sydney (TfNSW) provider adapter — build, don’t enable

**For:** Jim (implement)  
**From:** Simon / Tim  
**Date:** 11 Aug 2026  
**Status:** Ready after Brisbane GTFS stack exists (reuse `lib/providers/gtfs/*`)  
**Related:** `docs/multi-city-provider-design.md` · `docs/jim-brief-brisbane-provider.md`  
**Out of scope:** Enabling `sydney` live; buses/ferries/light rail; multi-city UI; Play listing

---

## 1. Why

Same leave-by product for Sydney Trains (+ Metro). Official **GTFS + GTFS-R** via TfNSW Open Data Hub.

---

## 2. Decisions (locked)

| Rule | Lock |
|------|------|
| City id | `sydney` |
| TZ | `Australia/Sydney` |
| Modes v1 | **Sydney Trains + Sydney Metro** only |
| Registry | Stay `planned` (`adapterReady` optional) |
| Public product path | Still **501** for `?city=sydney` |
| Auth | `TFNSW_API_KEY` in **Vercel env only** — never in client / git |

---

## 3. Integration

| Piece | Detail |
|-------|--------|
| Portal | https://opendata.transport.nsw.gov.au/ — Tim/Jim register → API key |
| Auth header | `Authorization: apikey <TFNSW_API_KEY>` |
| Static | `https://api.transport.nsw.gov.au/v1/gtfs/schedule/sydneytrains` (+ Metro schedule endpoint from Hub) |
| RT | `https://api.transport.nsw.gov.au/v2/gtfs/realtime/sydneytrains` (+ Metro realtime) |
| Also useful | vehiclepos / alerts — optional for v1 board |

**Adapter:** `lib/providers/sydney.js` using shared `gtfs/board.js`.  
**Catalog:** `lib/cities/sydney/stations.json` — metro + suburban rail stops (parent/child stop care).  
**Probe:** `scripts/probe-sydney-board.mjs` (skip/fail clearly if env key missing).

---

## 4. Watch-outs

- Parent vs child stops / platforms  
- Quotas on Hub key  
- Headsign → `direction` labels riders recognise (T1/T4 style vs destination)

---

## 5. Acceptance

| Check | Pass |
|-------|------|
| With key set, probe returns upcoming trips for a known stop (e.g. Central / Town Hall) | Yes |
| Without key, probe fails with clear message (no silent empty) | Yes |
| `assertCityLive("sydney")` still false | Yes |
| Reuses Brisbane GTFS helpers — no second protobuf stack | Yes |

---

## 6. Slack / Jim

> Jim — after Brisbane GTFS helpers: `docs/jim-brief-sydney-provider.md`. Adapter + catalog + probe. Needs `TFNSW_API_KEY`. **Do not** enable live.
