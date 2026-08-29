# Wellington D1 QA note — adapter verification

Pack documents what `lib/providers/wellington.js` + registry already claim. **Do not flip live.** Flags below are intentional notes — **no silent adapter edits in this pack.**

## Checklist

| # | check | result | notes |
| --- | --- | --- | --- |
| 1 | Pack files present under `docs/wellington-d1/` | **PASS** | Incl. this qa-note |
| 2 | D1 oracle is passenger map/timetable, not GTFS-generated | **PASS** | RegionalRailNetwork.pdf + KPL timetable |
| 3 | Modes v1: TRAIN KPL/HVL/MEL/JVL/WRL only | **PASS** (product) | See flag A |
| 4 | Hub lock Wellington Station | **PASS** | Catalog + adapter resolve that name |
| 5 | No bus/ferry/cable car in oracle | **PASS** | |
| 6 | Timezone Pacific/Auckland with DST | **PASS** | Adapter `WELLINGTON_TIME_ZONE` |
| 7 | Registry `planned` + `adapterReady: true` | **PASS** | Unchanged |
| 8 | `assertCityLive("wellington")` → 501 | **PASS** | |
| 9 | Auth METLINK_API_KEY → x-api-key | **PASS** | Matches adapter |
| 10 | Static URL + RT URL match adapter constants | **PASS** | |
| 11 | Catalog 47 stations == D1 unique set | **PASS** | Exact match vs line arrays |
| 12 | Melling Station not treated as live terminus | **PASS** (pack) | Catalog correctly has Western Hutt only |
| 13 | Separate from auckland | **PASS** | |
| 14 | No UI / LIVE_CITY_IDS change in this work | **PASS** | |

## Adapter flags (do not silently fix here)

| id | severity | finding |
| --- | --- | --- |
| **A** | medium | Adapter loads `railOnly: true` on the **full** Metlink zip with **no** `includeRouteShortNames: ["KPL","HVL","MEL","JVL","WRL"]`. If Capital Connection or other `route_type=2` rows appear in full.zip, they can leak onto boards. Fixture trim already excludes them; live feed may not. |
| **B** | low | No marketing-directions layer — boards emit raw GTFS headsigns, not `Kāpiti Line + Waikanae Station` chips from §3. Acceptable while planned; needed before live. |
| **C** | info | Adapter always fetches live static URL (no `qa/fixtures/wellington/gtfs` directory fallback unlike Rotterdam). Fine for planned dogfood; CI board tests need network/key. |
| **D** | info | Header comment still says “No published-network.json until Luke D1” — stale after this pack. Cosmetic. |

**Verdict:** D1 pack **PASS** for documentation. Adapter is **aligned** on hub, TZ, auth, five-line product intent, and Melling→Western Hutt live terminus. Flag **A** is the main follow-up before any live flip.
