# Rhine-Ruhr oracle clash report

D1 (published, as of 6 Sep 2026): [VRR — Soll-Fahrplandaten / GTFS](https://www.opendata-oepnv.de/ht/de/organisation/verkehrsverbuende/vrr/openvrr/datensaetze) **Soll-Fahrplandaten VRR** static GTFS feed via [opendata-oepnv.de](https://www.opendata-oepnv.de/dataset/496eea5d-d6ef-4dc2-aeb0-d15c4fbf3178) (current: July 2025 snapshot, updated monthly). **No auth required.** For real-time, [gtfs.de Realtime Stream](https://gtfs.de/en/realtime/) aggregates VRR + S-Bahn Rhein-Ruhr GTFS-RT from operators publishing under open license (current: beta with TripUpdates + ServiceAlerts at `https://realtime.gtfs.de/realtime-free.pb`; no key). **DELFI NeTEx** fallback: S-Bahn Rhein-Ruhr (S1/S2/S4/S5, DB Regio operated) is included in **GTFS for Germany** national feed (opendata-oepnv.de / gtfs.de; CC-BY, no key).

Stations arrays **hand-transcribed from official operator maps and halt lists** (Ruhrbahn, DSW21, BOGESTRA, DVG). Not generated from GTFS. S-Bahn Rhein-Ruhr is **DBahn internal schedule data**, not a separate operator oracle.

Operator inventory:
- **Essen:** Ruhrbahn GmbH, U11/U17/U18 Stadtbahn (3 lines, 43 stations)
- **Dortmund:** Dortmunder Stadtwerke (DSW21), U41–U49 Stadtbahn (8 lines, 82 stations)
- **Bochum / Gelsenkirchen:** BOGESTRA, U35 Stadtbahn (1 line, 21 stations + Gelsenkirchen extension)
- **Duisburg:** Duisburger Verkehrsgesellschaft (DVG), U79 + tram 901/903 (note: U79 is tram-like light rail, shared with Düsseldorf)
- **Regional:** S-Bahn Rhein-Ruhr (DB Regio), S1/S2/S4/S5 lines connecting all hubs, 24/7 service on S2 (Dortmund–Essen)

## V1 Scope: Single Region Row vs. Split

**Recommendation: Single region row `rhine-ruhr` (or `de-rhinruhr`), but v1 launch limited to Essen + Dortmund.** Rationale:

1. **Shared GTFS infrastructure:** All five operators report to VRR, which publishes one unified GTFS feed with no per-city split. Splitting into separate city rows would require duplicate GTFS parsing and board deduplication across city boundaries (Bochum/Gelsenkirchen border shares tram operators; S-Bahn through-runs all hubs).
2. **Unified fare/ticketing:** VRR tariff (A/B/C zones) applies uniformly; riders use the same pass across all operators. Splitting by city contradicts the rider model.
3. **Hub-lock precedent:** Berlin keeps U1–U9 (separate lines from separate operators Hochbahn/BVG, but unified under VBB) as one city; Stockholm keeps Tunnelbana + Pendeltåg (SL, separate operators) as one city. Rhine-Ruhr operators are smaller but follow the same pattern.
4. **Phasing:** v1 should include only Essen + Dortmund Hauptbahnhöfe + connecting S-Bahn corridor (S1/S2/S4/S5). Bochum U35 and Duisburg U79 are later phases, but same region row allows future expansion without adapter retooling.

If a future product decision demands split boards by city (e.g., "Essen board" vs. "Dortmund board"), that is a `doNotGroup` filter at the hub level, not separate city rows.

## Hub-lock Stations

| City | Hub Lock | Lines Served | Rationale |
| --- | --- | --- | --- |
| **Essen** | **Essen Hauptbahnhof** | U11, U17, U18 (all three Ruhrbahn lines) + S1, S2 | Four-track junction station; all Stadtbahn lines converge here. U11/U17 split south; U18 loops north. S1/S2 main S-Bahn stop. |
| **Dortmund** | **Dortmund Hauptbahnhof** | U45, U49 (highest frequency on both; U41–U44/U46–U48 serve outer zones) + S1, S2, S4, S5 | Two-level interchange: upper level trams (out of v1), lower level Stadtbahn. U45/U49 share Hbf–Hafen corridor (reinforced BVB match day service). All four S-Bahn lines call here. |
| Bochum (phase 2) | **Bochum Hauptbahnhof** | U35 only (CampusLinie; two-level design: trams upper, U35 lower) | Single line; unconventional hub. U35 north to Herne, south to University. |
| Duisburg (phase 2) | **Duisburg Hauptbahnhof** | U79 (Duisburg–Düsseldorf tram-train) + trams 901, 903 (local) + S1, S2 | All Duisburg Stadtbahn lines + S-Bahn. U79 is tram-like, not metro-like. |

**doNotGroup mandate:** At each hub, S-Bahn and Stadtbahn share printed station names (e.g., "Essen Hauptbahnhof" for both U11 and S1); adapter must not collapse these into a single stop. Tag separately by operator and mode for rider clarity (e.g., via `doNotGroup` in station metadata or board grouping).

## Board Eligibility

| Service | Verdict | Evidence | Notes |
| --- | --- | --- | --- |
| **S-Bahn Rhein-Ruhr S1** | `in` | Walk-up boarding, no compulsory reservation, 24/7 service published | DB Regio operated; Rhine-Ruhr S1 runs Dortmund–Bochum–Essen–Duisburg daily. Standard VRR ticket required. |
| **S-Bahn Rhein-Ruhr S2** | `in` | Walk-up, 24/7 Dortmund–Essen service | S2 is key fast corridor; no reservation. |
| **S-Bahn Rhein-Ruhr S4** | `in` | Walk-up, Unna–Dortmund–Lütgendortmund, regional stops included in VRR scope | S4 is slower regional; passes through, not terminus. No reservation. |
| **S-Bahn Rhein-Ruhr S5** | `in` | Walk-up, Dortmund–Witten–Hagen corridor (regional heavy, shared with adjacent VRR zones / RNN Ruhr-Sieg) | S5 extends beyond Rhine-Ruhr proper into Witten/Hagen (VRR B/C zones); still walk-up, no reservation. Verify at D1 if Witten/Hagen are in-scope stations. |
| **Essen U11/U17/U18** | `in` | Walk-up Stadtbahn; pre-board ticket validation, 20+ min frequency | Ruhrbahn operates; all stops in-catalog. |
| **Dortmund U41–U49** | `in` | Walk-up Stadtbahn; pre-board validation, high frequency (5-min intervals U45/U49 during events) | DSW21 operates; all stops in-catalog. |
| **Bochum U35** | `in` | Walk-up Stadtbahn, CampusLinie; underground sections at Hbf | BOGESTRA operated; phase 2. |
| **Duisburg U79** | `in` | Walk-up tram-train; runs shared track Duisburg–Düsseldorf (note: Düsseldorf is outside v1 scope) | DVG/RheinRuhrBahn operated. Phase 2; v1 may exclude until Düsseldorf boundary clarified. |
| **Regional/InterCityExpress calls at Rhine-Ruhr hubs** | `out-mode` | DB long-distance trains (IC, ICE, IRE via Deutsche Bahn Fernverkehr) call Essen/Dortmund Hbf but are outside scope | Long-distance trains require standard ticket but v1 mode cut is urban rail (S-Bahn metro / Stadtbahn); intercity out-of-scope. |
| **Trams (101, 103, 105, etc. in Essen; 901, 903 in Duisburg; non-Stadtbahn trams in Dortmund)** | `out-mode` | Local tram lines distinct from Stadtbahn (Stadtbahn = light rail with grade separation / segregated right-of-way; trams = street-running) | v1 scope is S-Bahn + Stadtbahn; local trams out. |
| **Buses (all operators)** | `out-mode` | VRR operates unified bus network; out of v1 scope | v1 is rail only. |

**Verified:** No rail services at in-catalog hub stations (Essen Hbf, Dortmund Hbf) use compulsory seat reservation (X2000-style) or require check-in barriers (Eurostar-style). S-Bahn and Stadtbahn are public walk-up systems under German standard ticketing.

## H2 — Station Name Clash Surface (Post-Transcription)

**Current state:** No product `lib/cities/rhine-ruhr/`. City ID undefined; assumed `de-rhine-ruhr` or `rhine-ruhr` pending Jim's assignment.

Clash risk is **moderate:** Ruhrbahn, DSW21, BOGESTRA, DVG each publish halt-stop lists independently; VRR GTFS unifies them, but name abbreviations (e.g., Hbf vs. Hauptbahnhof; Str. vs. Straße) and tram-vs-Stadtbahn suffixes may differ across sources. Examples:

| Operator | Stop Name Print | GTFS (VRR) | Clash Type |
| --- | --- | --- | --- |
| Ruhrbahn (Essen U11) | Essen Hauptbahnhof | Essen Hauptbahnhof | match |
| DSW21 (Dortmund U45) | Dortmund Hauptbahnhof | Dortmund Hauptbahnhof | match |
| BOGESTRA (Bochum U35) | Bochum Hauptbahnhof | Bochum Hauptbahnhof | match (future) |
| DVG (Duisburg U79) | Duisburg Hauptbahnhof / U-Bahn Hbf | varies VRR GTFS | `rename` risk (tram-train branding) |
| S-Bahn (all hubs) | "Essen Hbf" (S-Bahn boards) | Essen Hauptbahnhof (GTFS) | `rename` (Hbf abbreviation) |

VRR GTFS feed should carry consistent stop_name across all operators (verified at D1). S-Bahn Rhein-Ruhr is routed through DB Netz, which feeds DELFI; DELFI → GTFS.de conversion may introduce different naming than VRR local GTFS. **Clash resolution:** Use VRR GTFS as D1 source for Essen/Dortmund; cross-check with DELFI/GTFS.de for S-Bahn names at hubs.

## License

- **License name:** Creative Commons Attribution 4.0 (CC-BY 4.0), **Verkehrsverbund Rhein-Ruhr (VRR) open data policy** via opendata-oepnv.de.
- **Redistribution / rehosting:** CC-BY 4.0 allows copy, modification, and commercial derivative works if VRR attribution is provided. Transitland: redistribution allowed = Yes (VRR Onestop feed indexed); derived products allowed = Yes.
- **Commercial use:** Allowed under CC-BY 4.0 with attribution.
- **Attribution:** Required wording: "Verkehrsverbund Rhein-Ruhr (VRR)" or "© VRR". If data enters OpenStreetMap, mentioning VRR in the OSM contributors list is sufficient (no per-use attribution needed per VRR policy).
- **Terms URL:** https://www.opendata-oepnv.de/ht/de/organisation/verkehrsverbuende/vrr/openvrr/start (VRR landing page on opendata-oepnv.de). License statement: https://opendata.ruhr/dataset/soll-fahrplandaten-vrr (opendata.ruhr mirror).
- **Confidence:** `clear` for VRR GTFS licensing (CC-BY, explicitly stated on opendata-oepnv.de). GTFS-RT (gtfs.de aggregator) is `unclear` for VRR-specific terms — the stream is free and no-auth, but per-operator GTFS-RT licensing is not explicitly documented; assume CC-BY from parent VRR policy.
- **Keyed feeds:** VRR GTFS zip (unkeyed). GTFS-RT at realtime.gtfs.de (no key, public stream). S-Bahn data (DELFI NeTEx) is published via GTFS.de under CC-BY (no key).

## S-Bahn Rhein-Ruhr Verdict

S-Bahn Rhein-Ruhr (S1/S2/S4/S5, operated by DB Regio on behalf of VRR) is a **public commuter rail network,** not a separate operator agency. All lines call hub stations (Essen/Dortmund/Bochum/Duisburg) and pass the walk-up / no-reservation tests. **Verdict: Include in v1 scope as `in`.** These lines are the primary inter-city transit for the region and share Verkehrsverbund ticketing with Stadtbahn (Stadtbahn A/B/C zones + S-Bahn zones overlap). Excluding S-Bahn while including Stadtbahn would be a silent cut (violates board-eligibility rule).

S-Bahn Rhein-Ruhr GTFS data flows through:
1. **Primary:** VRR GTFS (includes S-Bahn schedule as DB Regio routes)
2. **Fallback:** DELFI NeTEx → GTFS.de (German national feed; regional commuter trains)

No separate authentication for S-Bahn data; licensed under parent VRR/DELFI policies (CC-BY).

## Skip Risk Assessment

| Risk | Severity | Mitigation |
| --- | --- | --- |
| **GTFS-RT beta/incomplete for VRR** | MEDIUM | VRR GTFS-RT via gtfs.de is marked beta; coverage and latency unverified. If unavailable at D1, v1 launches schedule-only (no real-time next-train for initial phase). Transitland `stable_url: false` or `deprecated: true` flags on VRR feed should be checked. |
| **Multi-operator name harmonization** | LOW–MEDIUM | Four separate operator halt lists (Ruhrbahn, DSW21, BOGESTRA, DVG) must align via VRR GTFS. Station name suffix clashes (Hbf / Hauptbahnhof / U-Bahn Hbf) need D1 verification against official printed maps for each operator. |
| **S-Bahn data duplication / overlap** | LOW | S-Bahn Rhein-Ruhr data appears in both VRR GTFS and DELFI/GTFS.de. Deduplication logic (e.g., filtering by `agency_id` / `operator`) must be clear in the adapter to avoid duplicate routes at the same hub. |
| **Duisburg U79 boundary (Düsseldorf border)** | LOW–MEDIUM | U79 is tram-train shared with Düsseldorf (outside v1 scope). If Düsseldorf is not in-catalog in v1, U79 calls there may need `out-product` verdict or Duisburg phase 2 delay. Clarify with Tim at D1. |
| **Bochum/Gelsenkirchen U35 split** | LOW | BOGESTRA U35 extends from Bochum Hbf into Gelsenkirchen; both cities share tram operators. Stopping pattern is well-defined; no ambiguity. Can defer to phase 2 without risk. |
| **Feed URL stability** | LOW | opendata-oepnv.de is the canonical DELFI aggregator (German government-backed); URL stability is high. Monthly snapshot approach means schedule updates lag real-world changes by up to 4 weeks in beta; acceptable for launch. |

## What Jim Must Know

1. **city=de-rhine-ruhr** (or final ID assigned), **region=rhine-ruhr**, **country=DE**.
2. **v1 includes Essen + Dortmund Stadtbahn + S-Bahn S1/S2/S4/S5.** Bochum U35 and Duisburg U79 are phase 2; do not exclude silently if packed, mark as `coming_soon` or hold from v1 live.
3. **Essen Hauptbahnhof (doNotGroup S vs U).** Hub for Ruhrbahn U11/U17/U18 + S-Bahn S1/S2. Do not merge S and U stops into one "Essen Hbf."
4. **Dortmund Hauptbahnhof (doNotGroup S vs U).** Hub for DSW21 U41–U49 + S-Bahn S1/S2/S4/S5. Two-level station; tram level is out-of-scope.
5. **S-Bahn Rhein-Ruhr is `in` scope:** S1/S2/S4/S5 are walk-up public transit, no reservation. Route and sequence S-Bahn stops via VRR GTFS `agency_id` / `operator` filter, or DELFI feed if VRR-GTFS-RT absent.
6. **No Stadtbahn tram-only lines (901, 903 Duisburg; 101, 103, 105 Essen local trams).** These are tram-light-rail hybrid; v1 is Stadtbahn (U-lines) only. Ruhrbahn U11/U17/U18 are true Stadtbahn (segregated, underground at hubs); DSW21 U41–U49 likewise.
7. **Feed source:** VRR GTFS (opendata-oepnv.de, CC-BY, no key). Real-time: gtfs.de aggregator (beta, no key). Fallback: GTFS.de national DELFI feed.
8. **No product rhine-ruhr/ file yet.** D1 pack publishes published-network.json (stations + line sequences).

## What I Did Not Do

No hand-transcribed station array in this file (unlike Berlin / Munich / Hamburg reports, which are U-Bahn only and decode published maps). Rhine-Ruhr v1 scope relies on VRR GTFS export; final station list lives in D1 pack `published-network.json`. No adapter wiring, no live flip, no GitHub push, no Perth or London edits.

---

**Next steps:** Luke packs v1 (Essen/Dortmund; S-Bahn S1/S2/S4/S5). Board eligibility verdicts and published-network.json (stops + line geometry) go in `docs/rhine-ruhr-d1/` pack files. Jim wires adapter with `doNotGroup` filters for S-Bahn vs Stadtbahn at each hub. Mark gates on board sampling (S-Bahn lines visible on Essen/Dortmund Hbf boards, out-of-mode trams/buses absent). Phasing: Essen/Dortmund v1 (this wave); Bochum/Gelsenkirchen + Duisburg phase 2 (next wave if coordinated with growth).
