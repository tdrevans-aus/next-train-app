# Jim brief: Canberra (Transport Canberra) provider adapter — build, don’t enable

**For:** Jim (implement)  
**From:** Simon / Tim  
**Date:** 11 Aug 2026  
**Status:** Ready after Brisbane GTFS stack exists  
**Related:** `docs/multi-city-provider-design.md` · ACT developer page · MyWay+ GTFS access guide  
**Out of scope:** Enabling `canberra` live; full bus network as primary product; multi-city UI; legacy SIRI

---

## 1. Why

ACT moved to **MyWay+ GTFS + GTFS-R** (SIRI deprecated). Good reuse of shared GTFS stack. Product angle for Next Train: **light rail** leave-by first.

---

## 2. Decisions (locked)

| Rule | Lock |
|------|------|
| City id | `canberra` |
| TZ | `Australia/Sydney` (ACT) |
| Modes v1 | **Light rail first**; bus only if cheap add-on in same catalog |
| Registry | Stay `planned` |
| Public product path | Still **501** |
| Auth | HTTP Basic — `ACT_GTFS_BASIC` (base64 client:secret) or separate id/secret env vars; **server only** |

---

## 3. Integration

| Piece | Detail |
|-------|--------|
| Developer page | https://www.transport.act.gov.au/contact-us/information-for-developers |
| Portal | MuleSoft Anypoint ACT GTFS API — request access keys |
| Prod host | `https://transport.api.act.gov.au` |
| Static example | `/gtfs/data/gtfs/v2/google_transit.zip` |
| RT example | `/gtfs/data/gtfs/v2/trip-updates.pb` (+ vehicle/alerts per portal) |
| Adapter | `lib/providers/canberra.js` via shared `gtfs/*` + Basic auth fetch wrapper |
| Catalog | `lib/cities/canberra/stations.json` — light rail stops (+ optional bus) |
| Probe | `scripts/probe-canberra-board.mjs` |

---

## 4. Watch-outs

- Portal onboarding friction (Tim may need to approve access)  
- Brand copy later (“Next Train” vs light rail) — **not this brief**  
- Don’t use deprecated SIRI URLs

---

## 5. Acceptance

| Check | Pass |
|-------|------|
| With Basic auth env set, probe returns upcoming light-rail (or documented mode) departures | Yes |
| Missing auth → clear error | Yes |
| `assertCityLive("canberra")` still false | Yes |
| Reuses shared GTFS helpers | Yes |

---

## 6. Slack / Jim

> Jim — after GTFS helpers: `docs/jim-brief-canberra-provider.md`. MyWay+ GTFS-R adapter (light rail first) + catalog + probe. Needs ACT portal keys. **Do not** enable live.
