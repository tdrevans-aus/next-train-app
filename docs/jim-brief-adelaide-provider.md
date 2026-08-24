# Jim brief: Adelaide (Adelaide Metro) provider adapter — build, don’t enable

**For:** Jim (implement)  
**From:** Simon / Tim  
**Date:** 11 Aug 2026  
**Status:** Ready after Brisbane GTFS stack exists  
**Related:** `docs/multi-city-provider-design.md` · https://www.adelaidemetro.com.au/developer-info · https://gtfs.adelaidemetro.com.au/  
**Out of scope:** Enabling `adelaide` live; buses v1; multi-city UI; SIRI-only path unless GTFS-R blocked

---

## 1. Why

Official **GTFS + GTFS-R** (CC). Prefer GTFS-R so we reuse Brisbane helpers. SIRI is fallback only if RT GTFS is unusable.

---

## 2. Decisions (locked)

| Rule | Lock |
|------|------|
| City id | `adelaide` |
| TZ | `Australia/Adelaide` (DST — test leave-by across transition if easy) |
| Modes v1 | **Train** (tram optional later) |
| Registry | Stay `planned` |
| Public product path | Still **501** |
| Auth | **None required.** Public GTFS + GTFS-R (H2). Optional `ADELAIDE_METRO_API_KEY` (`x-api-key`) only. |

---

## 3. Integration

| Piece | Detail |
|-------|--------|
| Developer info | https://www.adelaidemetro.com.au/developer-info |
| GTFS-R portal | https://gtfs.adelaidemetro.com.au/ |
| Open data | data.sa.gov.au Adelaide Metro realtime / GTFS datasets |
| Adapter | `lib/providers/adelaide.js` via shared `gtfs/*` |
| Catalog | `lib/cities/adelaide/stations.json` — rail stops |
| Probe | `scripts/probe-adelaide-board.mjs` |

Confirm exact feed URLs + auth from portal while implementing; update this brief’s “Auth” row in a one-line PR note if different.

---

## 4. Acceptance

| Check | Pass |
|-------|------|
| Probe returns train departures for a known Adelaide rail stop | Yes |
| Reuses shared GTFS helpers | Yes |
| `assertCityLive("adelaide")` still false | Yes |
| TZ used = `Australia/Adelaide` in any leave-by sample via shared builder | Yes |

---

## 5. Slack / Jim

> Jim — after GTFS helpers: `docs/jim-brief-adelaide-provider.md`. Adelaide train adapter + catalog + probe. **Do not** enable live.
