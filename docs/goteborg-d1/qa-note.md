# Göteborg D1 QA note

Checklist mirrors other Expansion `-d1` packs (Rotterdam / Auckland / Stockholm fixtures). City stays **planned**.

| # | check | result | notes |
| --- | --- | --- | --- |
| 1 | Pack files present: `oracle-clash-report.md`, `hazard-pack.md`, `direction-model-memo.md`, `published-network.json`, `jim-handoff.md` | **PASS** | `docs/goteborg-d1/` |
| 2 | D1 oracle is passenger map, not GTFS-generated | **PASS** | Spårvagn + pendeltåg PDFs 2026-06-15 |
| 3 | Modes v1: tram 1–12 + Kungsbacka/Alingsås/Ale only | **PASS** | Adapter filters; no metro/stombuss/båt/X-bus |
| 4 | Hub lock Brunnsparken; not Centralstationen | **PASS** | 8/12 miss Brunnsparken; Drottningtorget rename documented |
| 5 | Göteborg Central ≠ Drottningtorget ≠ Nils Ericsonsplatsen | **PASS** | doNotGroup in hazard-pack |
| 6 | Timezone Europe/Stockholm with DST | **PASS** | H7 |
| 7 | Registry `status: "planned"`, `adapterReady: true` | **PASS** | Do **not** flip live |
| 8 | `assertCityLive("goteborg")` → 501 | **PASS** | Gate script |
| 9 | Adapter `lib/providers/goteborg.js` uses `realtime-board.js` | **PASS** | No forked parser |
| 10 | Auth `TRAFIKLAB_API_KEY` → Trafiklab GTFS Regional `vt` static | **PASS** | Key in query string |
| 11 | GTFS-RT TripUpdates for `vt` | **FAIL (known)** | Trafiklab availability blank for Västtrafik; board is **schedule-only**. Re-check if Trafiklab adds `vt` RT; OAuth Planera Resa is the alternate live path — not wired. |
| 12 | `qa/fixtures/goteborg/published-network.json` verbatim D1 copy | **PASS** | Not GTFS-generated |
| 13 | No UI / LIVE_CITY_IDS / MULTI_CITY_IDS change | **PASS** | Adapter + docs + registry only |
| 14 | City id `goteborg` (not gothenburg / sweden) | **PASS** | |

**Verdict:** D1 pack + planned adapter **ready for human review**. Item 11 is an intentional documented gap, not a silent ignore. Do not set `status: "live"`.
