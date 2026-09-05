# Montreal — oracle clash report

**Lane:** Nico research. **Date:** 2026-09-06. **Status:** scoped, D1 pack not written. **city id:** `montreal` (do not invent `mtl`, `stm`, `cma`, or merge EXO commuter rail into this city id).

## Agency / feed (verified)

STM Metro, REM light metro, and EXO commuter rail are **three different operators and three different zips**. Do not treat one archive as all three. v1 is **STM Metro only**.

| field | value |
| --- | --- |
| Agency | **v1:** Société de transport de Montréal (STM) Metro. Transitland operator **o-f25d-socitdetransportdemontral**. **Out of this city id:** Réseau express métropolitain (REM, light metro — **o-reseau~express~metropolitain**, feed **f-reseau~express~metropolitain**; owned/operated by CDPQInfra/ARTM) and EXO commuter rail (**o-f25-exo~reseaudetransportmetropolitain**, feed **f-f25d-exo~reseaudetransportmetropolitain**; operated by ARTM). Transit authority coordination: ARTM (Autorité régionale de transport métropolitain) oversees regional coordination. STM operates Metro only; ARTM coordinates REM + EXO. |
| Official map | STM **Metro Map (Plan du métro)** — https://www.stm.info/en/info/maps (bilingual; official page). Printed/PDF map: SPA title **Plan du métro** (no dated footer on web printable; latest **Last-Modified Sept 2026**). Oracle standard: four-line system (Green/Orange/Yellow/Blue), 68 stations, 69.2 km, no Line 3 (cancelled 1967). Map legend separates metro (rapid transit lines) from bus; v1 is metro only. |
| Static GTFS | **STM (v1):** http://www.stm.info/sites/default/files/gtfs/gtfs_stm.zip — no key; empty-key **200** application/zip 2026-09-05; HTTP Last-Modified **Sat, 05 Sep 2026**. Transitland Onestop **f-f25d-socitdetransportdemontral**, last fetch **2026-09-05**, 100+ archived versions. Mobility Database **mdb-2126** (official; America/Toronto TZ; 211 routes covering Metro + Bus; latest download 2026-09-05, service 2026-06-15–2026-10-25). Dataset is actively maintained. **Not this zip:** Community GTFS archives exist; use the official stm.info zip only. **REM (out of v1):** https://gtfs.gpmmom.ca/gtfs/gtfs.zip — no key; empty-key **200** 2026-09-05. Transitland **f-reseau~express~metropolitain**, last fetch **2026-09-05**. Mobility Database entry unconfirmed (GPMMOM platform is official; REM is operated by CDPQInfra on behalf of ARTM). REM is light metro (automated, driverless), distinct from STM heavy-rail metro: 23 stations, 64 km, 3 branches open as of Sept 2026 (Brossard–Gare Centrale since July 2023; Gare Centrale–Deux-Montagnes since Nov 2025; Bois-Franc–Anse-à-l'Orme since May 2026). Airport branch (REM Aéroport / Trudeau) under construction, scheduled 2027. **EXO (out of v1):** https://exo.quebec/xdata/trains/google_transit.zip — no key; empty-key **200** 2026-09-05. Transitland **f-f25d-exo~reseaudetransportmetropolitain**, last fetch **2026-09-05**, 100+ archived versions. Mobility Database: EXO Trains GTFS (Transitland **f-exo~reseaudetransportmetropolitain**, regional service feed; also per-line feeds for Sorel-Varennes, Laurentides, etc.). Commuter rail: 5 lines (11 Vaudreuil–Hudson, 12 Saint-Jérôme, 13 Mont-Saint-Hilaire, 14 Candiac, 15 Mascouche), 53 stations. Static is verified; live feed is key-gated. |
| GTFS-RT / live | **STM Metro (v1):** https://api.stm.info/pub/od/gtfs-rt/ic/v2/tripUpdates + /vehiclePositions + /alerts — **requires API key** (registered developer via https://developpeurs.stm.info/ required); empty-key **401** 2026-09-05. Transitland **f-f25d-socitdetransportdemontral~rt**, last fetch **2026-09-05** (marked as "view requires Transitland subscription"; real-time bus + metro vehicle positions + trip updates + occupancy per Transitland metadata). **RTv1 is a bus-forward feed:** The STM GTFS-RT endpoint serves both bus (live positioning, arrival predictions) and metro (live vehicle positions, trip updates), returned in the same protobuf. Bus is the primary consumer; metro ride experience includes: occupancy rate on board (since v2 API), vehicle positions (real-time locations), and trip updates (schedule adherence). Transitland confirms fetch success and archived versions exist. **REM (out of v1):** Alerts only at https://storage.googleapis.com/transit-terminal-alerts-bucket-production/rem_montreal.pb — empty-key **200** 2026-09-05. Transitland **f-reseau~express~metropolitain~rt**, last fetch **2026-09-05**. Vehicle positions and trip updates feeds are not published; static GTFS is the realtime baseline for REM. Pulsar (CDPQ vendor) publishes alerts via Google Cloud; no public next-train API endpoint confirmed. **EXO (out of v1):** Vehicle position endpoint https://exo.chrono-saeiv.com/api/opendata/v1/TRAINS/vehicleposition + trip updates (Transitland **f-exo~reseaudetransportmetropolitain~rt**, last fetch **2026-09-05**). **Requires API key** — request form at https://exo.quebec/en/about/open-data. Transitland metadata shows realtime available pending auth. |
| Auth | STM GTFS zip: none. STM GTFS-RT: **API key required** (developpeurs.stm.info, registration + terms acceptance). REM GTFS zip: none. REM alerts: none. REM vehicle positions / trip updates: **not publicly available**; static is the feed. EXO GTFS zip: none (download accepts EXO terms). EXO GTFS-RT: **API key required** (request form, token-gated endpoint). Never paste a key. |
| Timezone | America/Montreal (HAS DST; same as America/Toronto) |

Do not generate a published-network.json from GTFS. D1 is the official metro / light-metro map, hand-transcribed, later.

## v1 mode cut

**STM Metro only, as printed on the official bilingual map legend "Métro" / "Metro":** Line 1 Green **Angrignon–Honoré-Beaugrand** (27 stations); Line 2 Orange **Côte-Vertu–Montmorency** (31 stations); Line 4 Yellow **Berri-UQAM–Longueuil-Université-de-Sherbrooke** (3 stations); Line 5 Blue **Snowdon–Saint-Michel** (12 stations). Four lines, 68 stations, 69.2 km total.

**Out:** REM light metro (separate operator CDPQInfra/ARTM, distinct network from STM, not a mode cut but a network/scope decision), EXO commuter rail (5 lines, operator ARTM, separate feed, walk-up but commuter rail — this is `out-product` not `out-mode`), bus, streetcar (if applicable), ARTM other services.

**Line 3 (Scarborough RT) cancelled:** Montreal Metro never had a "Line 3" — the system was built as 2 lines (Green/Orange initial), Yellow added 1966, Blue added 1966. The confusion exists only in Toronto (Line 3 Scarborough RT decommissioned July 2023); Montreal has always been a 4-line metro. Confirm on map.

Hub lock: **Berri-UQAM** (Green Line 1 × Orange Line 2 × Yellow Line 4 interchange; deepest station in network, busiest by volume, only station serving three metro lines simultaneously). Official STM station page https://www.stm.info/en/info/stations/berri-uqam-station title **Berri-UQAM Station**, multilingual name (Berri-UQAM is both French and English). Not Bonaventure (connection to bus/REM but not metro hub), not Gare Centrale (REM hub, not STM metro interchange), not Guy-Concordia, not Atwater. doNotGroup Berri-UQAM vs Gare Centrale (REM/EXO), vs Guy-Concordia (Green/Blue but not Orange).

## Skip risk

**Not a skip. REM is parallel, not a blocker; EXO is commuter rail, not a metro feed.** Tracker **To Do / Later** / "unscoped metro/urban rail" — scoping is driven by v1 network boundary, not feed availability. STM metro GTFS + GTFS-RT keys are published, no access gate on static zip. v1 as a "metro only" cut is clean; reclassifying REM to "out-product" instead of out-of-scope, and EXO commuter rail as walk-up but out-of-v1 scope, requires board verdicts (see Board eligibility section).

The complexity: (1) **three operators** — STM vs REM/ARTM vs EXO, three static Onestop IDs, do not invent city=`cma` / `gma` / `qc`; (2) **live metro GTFS-RT requires key**, but zip is open (different from Toronto where BusTime is open but subway locations not published via GTFS-RT) — D1 uses static initially, v2+ adds keyed live if key is obtained; (3) **REM is light metro, not heavy rapid transit** — it is a valid "metro" network in urban planning but architecturally distinct (automated, driverless, elevated + tunnel); (4) **hub naming** — Berri-UQAM on metro, Gare Centrale on REM, Union on GO (Toronto parallel) — do not group; (5) **French/English labelling** — STM Metro is bilingual on official maps, respect official names.

## License

**STM (v1 zip + GTFS-RT)**

- **License name:** Licence d'utilisation de données ouvertes / Open Data Use License. Transitland indexes this as "Proprietary; CC-BY-4.0 with conditions". Official source: https://www.stm.info/en/about/developers/terms-use (English) and https://www.stm.info/fr/a-propos/developpeurs/conditions-utilisation (French).
- **Redistribution / rehosting:** STM Developer Portal terms (§2 Use of Data): "You may use, copy, modify and communicate the Data for any legal purpose, including commercial purposes, without the need to obtain a license." No "do not make available to third parties" clause. Derivative works permitted. Transitland: redistribution allowed = Yes; commercial use allowed = Yes.
- **Commercial use:** Allowed ("for any legal purpose, including commercial purposes").
- **Attribution:** Required. STM Developer Portal (§3 Attribution): "You must ensure that the Data is accompanied by the following statement: **'Data provided by Société de transport de Montréal.'** You must display the Data in a manner consistent with STM's corporate identity." Wording differs slightly from CC-BY generic; use STM-specific phrasing. No logo mandate stated (unlike Metrolinx).
- **Terms URL (English):** https://www.stm.info/en/about/developers/terms-use . **Terms URL (French):** https://www.stm.info/fr/a-propos/developpeurs/conditions-utilisation . Developer portal: https://developpeurs.stm.info/. Transitland: https://www.transit.land/feeds/f-f25d-socitdetransportdemontral . Mobility Database: https://mobilitydatabase.org/feeds/gtfs/mdb-2126 .
- **Confidence:** `clear` on redistribution (STM explicitly permits) and commercial use; STM requires specific attribution wording ("Data provided by Société de transport de Montréal"), not generic CC-BY.
- **Keyed feeds:** GTFS-RT (v2 API) requires registration + API key; the key agreement does not further restrict redistribution beyond the STM Terms (developpeurs.stm.info), but implementation details (rate limits, revocation) are in the API docs. Never paste a key.

**REM (GTFS zip + alerts)**

- **License name:** Licence Creative Commons 4.0 Attribution (Données Québec standard). Official source: https://www.donneesquebec.ca/licence/#cc-by (Quebec open-data framework) and Transitland PDF link on REM feed page.
- **Redistribution / rehosting:** CC-BY-4.0: worldwide, royalty-free, perpetual, non-exclusive licence to copy, distribute, adapt, and make derivative works, with attribution. No "do not redistribute to third parties" clause. Transitland: redistribution allowed = Yes; commercial use allowed = Yes (per CC-BY).
- **Commercial use:** Allowed under CC-BY-4.0 ("including for commercial purposes").
- **Attribution:** Required. Default: "Contains information licensed under Creative Commons Attribution 4.0. Data source: Réseau express métropolitain." or localized variant from Données Québec. REM platform (rem.info) may have specific branding guidelines; verify at D1 pack stage.
- **Terms URL (English):** https://www.donneesquebec.ca/licence/ (CC-BY portal) . **Terms URL (French):** https://www.donneesquebec.ca/licence/ . REM official: https://rem.info/en . Transitland: https://www.transit.land/feeds/f-reseau~express~metropolitain . Data source: https://gtfs.gpmmom.ca/.
- **Confidence:** `clear` on CC-BY-4.0 text (redistribution, derivative works, commercial use permitted); REM feed is published on Données Québec (provincial open-data platform, standard CC-BY framework).
- **Keyed feeds:** Alerts endpoint and GTFS zip have no key gate. Vehicle positions / trip updates not publicly available; this is an operator choice, not a license issue.

**EXO (GTFS zip + GTFS-RT, commuter rail)**

- **License name:** Données ouvertes / Open Data License (EXO / ARTM). Official source: https://exo.quebec/en/about/open-data . Two texts: (1) EXO Developer Terms on open-data page, (2) ARTM coordination layer (ARTM does not host feeds directly; EXO publishes).
- **Redistribution / rehosting:** EXO open-data page states: "Data for planned data can be downloaded... [Files] are provided as-is under the [license terms]." Exact clause not fully visible on web page snapshot; Transitland indexes this as permitting redistribution. Transitland: redistribution allowed = Yes; commercial use allowed = Yes. Conservative reading: EXO permits download and use; "for any legal purpose" pattern not explicitly stated, but open-data platform implies public reuse intent.
- **Commercial use:** Transitland marks as allowed. EXO does not state prohibition; commuter rail GTFS is a public service data artifact. Recommend confirming at D1 stage via developer contact.
- **Attribution:** Not explicitly stated on web page. EXO / ARTM does not mandate a specific attribution wording like STM. Transitland: use without attribution = Yes (unclear whether this is default or EXO's explicit choice). Recommend: "Data provided by Exo (Réseau de transport métropolitain)" or variant from ARTM coordination layer.
- **Terms URL (English):** https://exo.quebec/en/about/open-data . **Terms URL (French):** https://exo.quebec/fr/a-propos/donnees-ouvertes . Request form (GTFS-RT key): https://exo.quebec/en/about/open-data (form link for realtime data access). Transitland: https://www.transit.land/feeds/f-f25d-exo~reseaudetransportmetropolitain . Mobility Database: multiple per-line feeds (Sorel-Varennes mdb-3000, Laurentides mdb-1337, etc.).
- **Confidence:** `unclear` on exact license terms — EXO open-data page is light on legal text; Transitland marks redistribution / commercial as Yes, but source clause not quoted in snapshot. Attribution wording not mandated. Recommend contacting EXO (hello@transit.land or exo contact) for exact terms before D1 pack finalizes EXO scope (if any). For v1 metro-only scope, EXO license clarity is a D2 issue, not a v1 blocker.
- **Keyed feeds:** GTFS-RT vehicle positions require API key (request form). Static GTFS zip is open. Key agreement likely follows EXO developer terms, not separate; API docs at endpoint would specify rate limits / revocation.

## Board eligibility

The rule: every rail service calling at an in-catalog station (in the v1 cut, STM Metro Green/Orange/Yellow/Blue, 68 stations) must be either shown (`in`) or excluded with a recorded verdict (`out-reservation`, `out-checkin`, `out-mode`, `out-product`).

**Within v1 scope (STM Metro):**

| Service | Operator | Tests | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Green Line (Metro) | STM | Walk-up: Yes. Check-in: No. | `in` | Heavy-rail rapid transit, standard ticketing (OPUS card, single trip, day pass), no compulsory seat reservation. Accessible by rider with valid fare. |
| Orange Line (Metro) | STM | Walk-up: Yes. Check-in: No. | `in` | Same as Green. Busiest line; no reservation requirement. |
| Yellow Line (Metro) | STM | Walk-up: Yes. Check-in: No. | `in` | Three stations only (Berri-UQAM, Jean-Drapeau, Longueuil-Université-de-Sherbrooke); shuttle service to islands. No reservation. |
| Blue Line (Metro) | STM | Walk-up: Yes. Check-in: No. | `in` | Serves downtown and plateau; no reservation requirement. |

**Out of v1 scope (REM light metro, EXO commuter rail, both in-catalog hub city boundary):**

| Service | Operator | Classification | Verdict | Notes |
| --- | --- | --- | --- | --- |
| REM (Brossard, Gare Centrale, Deux-Montagnes, Anse-à-l'Orme branches) | ARTM / CDPQInfra | Light metro; automated; walk-up boarding, no reservation. | `out-product` | REM is a separate operator network and GTFS feed (f-reseau~express~metropolitain). Passes walk-up + check-in tests (honour-system ticketing, zone-based fare, no barriers, no compulsory reservation). Excluded by v1 product scope ("STM Metro only"). Verdict recorded: not excluded due to boarding contract failure, but due to explicit v1 boundary decision. Flag for Tim if REM v2 inclusion is later considered. |
| EXO Commuter Rail (5 lines: Vaudreuil–Hudson, Saint-Jérôme, Mont-Saint-Hilaire, Candiac, Mascouche) | ARTM | Commuter rail; walk-up boardable, no compulsory reservation (unlike SJ X2000 or Snälltåget); standard fare on travel card. | `out-product` | EXO is a separate operator network and GTFS feed (f-f25d-exo~reseaudetransportmetropolitain). Passes both walk-up and check-in tests. Excluded by v1 product scope ("STM Metro only; commuter rail is later / out of v1 cut"). Verdict recorded: not excluded due to boarding contract, but due to v1 boundary. EXO stations (Lucien-L'Allier downtown, commuter hubs) are not in v1 in-catalog list, so no per-station verdict needed at v1 launch. If EXO stations are later added to catalog, verdicts must be re-evaluated. |

**Summary:** No services other than STM Metro call at the four in-scope lines' 68 stations in v1. REM and EXO are geographically separate networks (REM hubs Gare Centrale, EXO hub Lucien-L'Allier, vs STM hubs Berri-UQAM/others). Both pass the walk-up / check-in tests but are excluded by product scope, not by boarding contract failure. Verdicts are recorded as `out-product` rather than silence.

---

## C2 for a later D1 pack (not this file's job)

1. city=`montreal`. displayName Montreal.
2. Berri-UQAM hub (Green/Orange/Yellow interchange). doNotGroup Gare Centrale (REM), Lucien-L'Allier (EXO), Guy-Concordia (Green/Blue only, not Orange).
3. Modes v1: STM Metro Green/Orange/Yellow/Blue only. REM, EXO, bus out.
4. STM GTFS-RT key required at v2+ for live next-train. v1 uses static schedules + alerts initially.
5. REM is light metro (separate operator), not a mode cut. If/when REM is added to scope, it is a second operator integration, not a mode expansion (similar to London Underground + Overground / Trams, or Sweden Stockholm Metro + Pendeltåg).
6. EXO is commuter rail (separate operator + separate network). If added to scope later, it is third-operator integration. v1 cuts it by scope, not by boarding contract failure.
7. assertCityLive("montreal") must fail until wired.
8. Hand-transcribe D1 map from official STM printed/web map, not from GTFS. Confirm Line 4 Yellow is 3 stations, Green 27, Orange 31, Blue 12 (68 total).
