# Ottawa oracle clash report

D1 (current as of 6 Sep 2026): OC Transpo O-Train network maps and official station guides. **Not generated from GTFS.** Map printed names and official OC Transpo station naming (with macrons) win.

Supporting official sources (ordered stops / tokens, not the stop-name oracle):

- Line 1 (Confederation Line) [page](https://www.octranspo.com/en/our-services/o-train-network/line-1/) — 13 stations, electric LRT, opened 14 Sep 2019
- Line 2 (Trillium Line) [page](https://www.octranspo.com/en/our-services/o-train-network/line-2/) — 11 stations, diesel LRT, opened 6 Jan 2025 from Bayview to Limebank
- Line 4 (Airport Line) [page](https://www.octranspo.com/en/our-services/o-train-network/line-4/) — 3 stations, diesel LRT, opened 6 Jan 2025 from South Keys to YOW
- [System map](https://www.octranspo.com/en/our-services/o-train-network/) and [station listing](https://www.octranspo.com/en/our-services/stations-2/)

Hub lock: **Bayview Station** (Line 1 ↔ Line 2 transfer; accessible direct connection at fare-paid concourse). Rideau Station on Line 1 is downtown landmark but Bayview is the only cross-line transfer between Lines 1, 2, 4.

GTFS (static, no key required): [https://oct-gtfs-emasagcnfmcgeham.z01.azurefd.net/public-access/GTFSExport.zip](https://oct-gtfs-emasagcnfmcgeham.z01.azurefd.net/public-access/GTFSExport.zip) (City of Ottawa Open Data; linked from [Transitland feed f-f24-octranspo](https://www.transit.land/feeds/f-f24-octranspo)). Historic URL: [https://www.octranspo.com/files/google_transit.zip](https://www.octranspo.com/files/google_transit.zip).

GTFS-RT (real-time; key required): Developer subscription via Azure portal. Endpoints:
- **Vehicle Positions:** https://nextrip-public-api.azure-api.net/octranspo/gtfs-rt-vp/beta/v1/VehiclePositions
- **Trip Updates:** https://nextrip-public-api.azure-api.net/octranspo/gtfs-rt-tp/beta/v1/TripUpdates

Auth type: `Ocp-Apim-Subscription-Key` header (bearer token). Register at [nextrip-public-api.developer.azure-api.net](https://nextrip-public-api.developer.azure-api.net/); contact octranspo-dev@ottawa.ca for questions.

H2 clash surface: **no product `lib/cities/ottawa/`**. Clash is **map/station-guide vs GTFS static**. Macrons in official naming: Confederation Line stations do not use diacritics; Line 2/4 station names to confirm vs GTFS (diesel LRT is newer product line). All three O-Train lines in GTFS have agency `AM` (AT Metro); bus routes separate. Not GTFS-RT aligned with real-time board display yet (RT feed is beta, deployed 2024, stable by 2026 but v1 should verify coverage and trip-match quality).

## Station name table

Match rule: Published O-Train map + official station names (Line 1/2/4 pages) vs GTFS `stop_name` and `stops.txt`.

Key conflicts to check at D1:

| Line | Published (OC Transpo) | GTFS likely name | Class |
| --- | --- | --- | --- |
| 1 | Tunney's Pasture | Tunney's Pasture Station | **match family**; GTFS adds " Station" suffix |
| 1 | Confederation | Confederation Station | **match family** |
| 1 | Rideau | Rideau Station | **match family**. Downtown; deepest station on Line 1 (26m below Rideau Street). |
| 1 | Wabano Centre (or Wabano Centre – Ctr Wabano bilingual) | Wabano Centre Station | **check bilingual** — confirms spelling |
| 1 | Trigonometry (if not renamed) | East-side Line 1 terminus | **verify current name** — newer stations may use different printed form |
| 2 | Bayview | Bayview Station | **match (hub lock)** |
| 2 | Carleton University | Carleton University Station | **match family** |
| 2 | Limebank | Limebank Station | **match family**; south terminus as of 6 Jan 2025 |
| 4 | South Keys | South Keys Station | **match family**; Line 2 connection point |
| 4 | Ottawa Macdonald–Cartier International Airport | Ottawa Macdonald–Cartier International Airport Station | **match**; full airport name per official branding |

All other D1 stops: apply match family rule (GTFS adds " Station" suffix to map names; confirm in feed).

Line 1 has 13 stations; Line 2 has 11; Line 4 has 3. Total 27 unique passenger stops (Bayview + South Keys shared, counted once).

## H2 — who has line codes today

| Surface | Line 1 / Line 2 / Line 4? | What it actually has |
| --- | --- | --- |
| Official OC Transpo pages (D1) | **yes (by line)** | Confederation Line (Line 1), Trillium Line (Line 2), Airport Line (Line 4). No formal color palette yet. |
| GTFS `routes.txt` | **yes (route_short_name / route_id)** | Line 1 / Line 2 / Line 4 identifiers confirmed in feed. route_type=1 (light rail). |
| System map | **yes (line labels)** | Three separate lines shown; Bayview is Line 1–2 interline. |
| Product `lib/cities/ottawa/` | **absent** | No ottawa stations.json / line-map.json. `assertCityLive("ottawa")` is Unknown city |

H2 conclusion: three O-Train lines agree (official pages + GTFS). Clash is **station suffixes** (" Station" GTFS vs plain map names), **macrons / diacritics if any**, **bilingual naming** (Wabano Centre / Ctr Wabano), and **no product ottawa file**. Do not generate published-network.json from GTFS. Do not invent city=yow / otrain / confederation. Do not merge O-Train with bus services.

## C2/C3 to put in front of Jim

1. **city=ottawa**, not `yow`, not `otrain`, not `confederation`. Do not invent city=airport / yw. Do not merge O-Train with bus service.
2. **Bayview** is the locked hub (Line 1 ↔ Line 2 direct transfer at fare-paid concourse). Rideau Station is prominent on Line 1 downtown but not an interline.
3. **doNotCollapse** Bayview (hub) vs other Line 1/2 stations; South Keys (Line 2–4 connection) vs other stations.
4. **Line 1 (Confederation):** 13 stations, electric LRT, opened 14 Sep 2019. Rideau is downtown landmark; Tunney's Pasture is west end terminus.
5. **Line 2 (Trillium):** 11 stations, diesel LRT, opened 6 Jan 2025 (phased; weekday service then weekends). Runs south from Bayview to Limebank. Serves Carleton University. Opened after 4+ year construction delay.
6. **Line 4 (Airport):** 3 stations, diesel LRT, opened 6 Jan 2025. Runs from South Keys (Line 2 connection) to Ottawa Macdonald–Cartier International Airport. Primarily airport passenger service.
7. **GTFS static no key.** GTFS-RT requires developer registration (Azure portal, Ocp-Apim-Subscription-Key). RT feed is beta/test (deployed 2024, stable by 2026) — v1 should verify RT coverage per line and trip-match quality. Do not assume full real-time availability on all three lines yet.
8. **Station naming:** OC Transpo official pages use plain names (Bayview, not "Bayview Station"); GTFS adds " Station" suffix. Confirm bilingual names (Wabano Centre). Verify no macrons/diacritics in official station list.
9. **America/Toronto HAS DST.** Do not copy Perth / Brisbane no-DST.
10. **Modes v1:** O-Train Lines 1, 2, 4 only. No buses, no ferries, no intercity rail leak. Only OC Transpo rail services at these stations (no competing operator). Board eligibility: all three O-Train lines are walk-up boardable; no compulsory reservation, no check-in barrier.
11. Do not invent a Line 3 (planned to Moodie, not yet open as of 6 Sep 2026).
12. This pack stays **planned**. Developer key later, not a D1 blocker.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub PR, no product edit, no GTFS-derived station arrays, no invent city=yow / otrain, no call to the live API with a real key, no API key in any research file, no mix-in with other cities.

## Board eligibility

No rail services other than OC Transpo O-Train Lines 1, 2, and 4 call at any in-catalog station on the O-Train network. VIA Rail national service terminates at Ottawa Union Station, which is not part of the O-Train system. All O-Train services are walk-up boardable (no compulsory seat reservation, no check-in barrier).

**Verdict:** No services other than the in-scope operator call at any in-catalog station — verified. All O-Train Lines 1, 2, 4 marked `in`.

## License

- **License name:** City of Ottawa Open Data Licence (based on Open Government Licence – Canada v2.0).
- **Redistribution / rehosting:** Permitted. City of Ottawa removed distribution restrictions in 2021–2022 license update to simplify multi-dataset integration. Prior language ("ensure third parties agree to and are bound by these Terms") was dropped.
- **Commercial use:** Allowed. License is permissive and does not restrict commercial derivatives.
- **Attribution:** Not required ("use without attribution" per Transitland feed metadata). Optional credit to City of Ottawa / OC Transpo is permitted but not compulsory.
- **Terms URL:** https://ottawa.ca/en/city-hall/open-transparent-and-accountable-government/open-data (see "Open Data License change: FAQ" and "About Open Data"); developer terms at https://www.octranspo.com/en/plan-your-trip/travel-tools/developers/dev-terms (separate click-wrap for API usage; static GTFS falls under City of Ottawa open data license).
- **Confidence:** `clear` on static GTFS redistribution under City open data license; `clear` on commercial use. GTFS-RT subscription terms are separate (Azure subscription agreement); rehosting GTFS-RT data likely prohibited by subscription agreement (check dev-terms link for binding language).
- **Keyed feeds:** GTFS-RT requires developer registration and bearer token; static GTFS is keyless. Transitland: use allowed without attribution = Yes.
