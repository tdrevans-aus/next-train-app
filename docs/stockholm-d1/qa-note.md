# Stockholm D1 QA note — adapter verification

Pack lives at `docs/stockholm-d1/` (promoted from Luke’s fixture research). Verifies `lib/providers/stockholm.js` against the oracle. **Do not flip live.** Flags only — no silent adapter edits.

## Checklist

| # | check | result | notes |
| --- | --- | --- | --- |
| 1 | Pack files under `docs/stockholm-d1/` | **PASS** | Incl. this qa-note |
| 2 | D1 = SL Spårtrafikkarta PNG, not GTFS-generated | **PASS** | |
| 3 | Modes: metro 10/11/13/14/17/18/19 + pendeltåg 40/41/43/48 | **PASS** | Adapter `ALLOWED_LINE_CODES` (+ nested 43X) |
| 4 | No buses in v1 filter | **PASS** | `ALLOWED_MODES` = METRO, TRAIN only |
| 5 | Hub lock **T-Centralen** ≠ **Stockholm City** ≠ **Stockholms central** | **PASS** | Catalog `boardModes` METRO vs TRAIN; SJ hub forbidden |
| 6 | Catalog siteIds: T-Centralen **9001**, Stockholm City **1080** | **PASS** | |
| 7 | Stockholms central not collapsed into metro/pendeltåg hubs | **PASS** | Forbidden collapse; not a catalog board target |
| 8 | Odenplan (metro) vs Stockholm Odenplan (pendeltåg) kept apart | **PASS** | Separate catalog rows |
| 9 | Timezone Europe/Stockholm + DST wall-clock parse | **PASS** | `parseStockholmDate` |
| 10 | Registry `planned` + `adapterReady: true`, no env key | **PASS** | SL Transport public |
| 11 | `assertCityLive("stockholm")` → 501 | **PASS** | |
| 12 | D2 fixture verbatim copy of docs pack JSON | **PASS** | Gate asserts |
| 13 | 153 unique D1 stations match catalog names | **PASS** | |
| 14 | No UI / LIVE_CITY_IDS change in this work | **PASS** | |

## Adapter flags (do not silently fix here)

| id | severity | finding |
| --- | --- | --- |
| **A** | info | Adapter correctly uses **SL Transport JSON**, not Trafiklab GTFS — matches registry. GTFS Sweden remains optional/H2-only (403 without key). |
| **B** | low | Marketing chips use colour family + terminus; live SL `destination` may still say **Alvik** on green 18 while the map far end is **Hässelby strand** (oracle C2 already notes this). Mapping layer present via `mapStockholmDestination`. |
| **C** | info | **43X** allowed in adapter as nested skip-stop of 43 — not a separate D1 colour row (correct). |
| **D** | info | Cancelled departures are dropped (`filter !cancelled`) rather than shown as cancelled chips. Fine while planned. |
| **E** | info | `Stockholms central` is intentionally absent from the station catalog; forbidden-name resolve returns null. Correct doNotGroup — do not add it as a v1 board hub. |

**Verdict:** D1 pack **PASS**. Adapter **aligned** on hubs, line allowlist, modes, TZ/DST, and SL Transport path. No silent code changes required for this documentation PR.
