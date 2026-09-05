# Dublin hazard pack (H1–H7)

Evidence: `docs/dublin-d1/oracle-clash-report.md` (Nico, 2026-09-06) for agency/feed/mode-cut/hub-lock/board-eligibility decisions, plus the **official Luas Network Map** image fetched directly from luas.ie for this pack (Luke, 2026-09-06) for station order and city-centre topology, since the oracle report explicitly deferred the hand-transcription to the D1 pack step. Source chain: `https://www.luas.ie/luas-map/` (page linking to the asset) → Gatsby `page-data.json` for that route → image asset `https://www.datocms-assets.com/225949/1784119177-luas_networkmap.png` (800×748 PNG, "Network Map" content block, DatoCMS asset id 225949/1784119177), retrieved 2026-09-06. Not generated from GTFS, not generated from `routes.txt`, no stopIds used.

## H1 — parent + child

D1 has no stopIds. NTA static GTFS and GTFS-RT v2 will later expose Luas-operator stop/trip ids that could collapse Red and Green city-centre stops under nearby printed names — the city-centre cluster below is the doNotGroup set that matters most.

**doNotGroup: Abbey Street** (Red Line, hub lock) **vs Marlborough / O'Connell - GPO / O'Connell Upper** (Green Line). All four are distinct printed stop names in the same city-centre block, ~200 m walk apart, same operator/fare system, no platform-to-platform junction. Confirmed directly off the official map: Abbey Street's dot sits on the Red trunk (between Jervis and Busáras); Marlborough, O'Connell - GPO and O'Connell Upper all sit on the Green Line's city-centre loop track, not the Red trunk. **Do not merge any of these four into one stop.**

**doNotGroup: O'Connell Upper vs O'Connell - GPO.** Two separate printed Green Line stops in the same name family (both near O'Connell Street), each with its own dot on the map. The oracle report only named "O'Connell - GPO" as the interchange point — it did not mention O'Connell Upper. This pack found O'Connell Upper as a second, distinct stop while hand-transcribing the map; see "What the oracle report didn't have" below.

**doNotGroup: Tallaght vs Saggart.** Both are Red Line western termini forking at **Belgard**. Two different printed terminus names on the same branch point — not "Red Line West" as a single destination.

**doNotGroup: Red Cow vs Kingswood vs Belgard.** Three consecutive, distinct printed stops immediately west of the Red Line fork. Do not collapse into a single "Red Cow interchange" node — Red Cow is a P&R amenity tag on the stop name, not the fork itself (the fork is at Belgard).

## H2 — who has line codes today

| surface | Red / Green? | what it actually has |
| --- | --- | --- |
| Luas official network map (D1, this pack) | **yes** | Red (32 unique stops incl. Tallaght + Saggart branches) and Green (35 unique stops incl. the city-centre loop) drawn as two coloured tracks, no route numbers — Luas brands by colour only, not by number like a metro. |
| NTA static GTFS (all Irish operators) | **yes** (with filter) | Covers Luas as one agency among many; adapter must filter to Luas routes only. Not opened for D1 station order — the report and this pack both hold that line. |
| NTA GTFS-RT v2 | **yes** (with filter) | TripUpdates + Vehicles, verified 200 with `x-api-key`; covers Luas among other operators. Not a D1 generator. |
| Product `lib/cities/dublin/` | **absent** | No dublin stations.json / line-map.json yet. `assertCityLive("dublin")` must still fail. |

**H2 conclusion:** unchanged from the oracle report — the clash is multi-operator feed filtering (exclude Dublin Bus, Bus Éireann, Go-Ahead, DART from the NTA feeds) plus no product file yet. This pack adds: Luas has **no printed route number**, only two colour brands (Red, Green), and Red has **two branches sharing one colour**, which the D2 adapter must not collapse into a single terminus pair.

## H3 — thin / event / overlay

- **DART, Dublin Bus, Bus Éireann, Go-Ahead Ireland** — out of v1 mode cut per the oracle report. Not touched by this pack.
- **P&R / bus / bike / accessibility icons printed next to stop names** (e.g. "P&R Red Cow", "P&R Cheeverstown", "Tallaght P&R") are amenity tags, not part of the stop name. This pack strips them: the stop is **Red Cow**, **Cheeverstown**, **Tallaght** — not "P&R Red Cow" etc.
- **Zone labels** ("Zone Red 4", "Zone Green 2" …) are fare-zone overlay text on the same map plate, not stops. Not inserted.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Belgard | Saggart branch (Fettercairn – Cheeverstown – Citywest Campus – Fortunestown – Saggart) vs Tallaght branch (Cookstown – Hospital – Tallaght) | Official map: two separate track legs fork at Belgard, each with its own terminus box (Saggart / Tallaght P&R) |
| Abbey Street | Red Line trunk only (Jervis ↔ Busáras). No Green track through this dot. | Dot sits on the single Red horizontal trunk; Green loop passes nearby but does not touch this dot |
| Parnell / Trinity | Green Line city-centre loop — see H4a below, this is not a simple branch, it's a direction-dependent one-way pair | Official map: two parallel green tracks with opposite-direction arrows between Parnell and Trinity |
| Connolly | On the Red trunk between Busáras and George's Dock, drawn with a dogleg (curves up to a named terminus-style dot, then the trunk continues straight to George's Dock) | Map geometry mirrors the real street alignment (Amiens Street curve); treated as an inline stop, not a spur — **flagged for Tim to confirm**, see "Open questions" below |

### H4a — Green Line city-centre loop (one-way, direction-dependent stop set)

This is the single most important station-graph finding in this pack, and not previously called out in the oracle report.

Between **Parnell** and **Trinity**, the Green Line's official map draws **two parallel tracks with opposite-direction arrows**, not one shared track:

- **Northbound (towards Broombridge), arrows point up:** Trinity → **O'Connell - GPO** → **O'Connell Upper** → Parnell.
- **Southbound (towards Brides Glen / Sandyford), arrows point down:** Parnell → **Marlborough** → Trinity.

**O'Connell - GPO and O'Connell Upper are only served northbound. Marlborough is only served southbound.** A rider standing at O'Connell - GPO cannot board a southbound tram there — the southbound service runs via Marlborough instead, a different street. This is a real, printed feature of the official map (not this pack's inference), confirmed by dot position: both O'Connell stops sit on the same (northbound-arrowed) green track; Marlborough sits on the other (southbound-arrowed) track.

**Consequence for D1 station arrays:** the Green Line has **35 unique printed names**, but **no single ordered list is a valid path in both directions** through this bracket — 33 names are direction-independent, plus 2 northbound-only + 1 southbound-only = 35. `published-network.json` documents this explicitly via a `cityCentreLoop` object rather than silently picking one direction and dropping the other's stops. **D5 direction assertions must not treat this as a simple inbound/outbound pair** — see `direction-model-memo.md`.

## H5 — nested short turns

No official short-turn / nested codes found on the map (no "Sandyford short working" chip, no premetro-style overlay). Luas does run peak-time short workings in practice (e.g. some Green trips turn at Sandyford or Dundrum) but **none of these are printed on the official network map**, so `shortTurns` stays empty for D1. Flag for Jim/D2: NTA GTFS-RT trip headsigns may reveal short-turn patterns that this pack did not chase (out of scope for a map-only D1).

## H6 — inner city (where §3 lives)

Locked set: **Abbey Street** (per oracle report). Shared/nearby approaches on the Green side: **O'Connell Upper, O'Connell - GPO, Marlborough** (city-centre loop, ~200 m walk from Abbey Street). **Connolly** is two stops east on the Red trunk (Busáras between them) — not a walk-to interchange candidate for the hub, it's just another Red stop with DART/rail badges.

Abbey Street is a through-stop on a single Red trunk (Jervis ↔ Busáras), not a junction — inbound/outbound vs "City" is not false here the way it was at Brussels' Arts-Loi, but the Green interchange is a **walk**, not a shared platform, so Abbey Street must never be printed as if Green trains call there.

## H7 — timezone / DST

**Flag — the oracle report's DST claim looks wrong and should not be trusted as-is.** The report states: "Timezone Europe/Dublin (IST = UTC+0 / UTC+1 DST; Irish Standard Time, no daylight saving observed since 2024)". This is internally contradictory (it states a UTC+1 DST offset exists, then claims no DST is observed) and does not match this pack's understanding: Ireland's 2019 proposal to abolish the EU clock change was never enacted (it stalled at EU level), so Ireland has continued to move clocks between GMT (winter) and IST (summer, UTC+1) on the normal EU schedule through the date of this pack. Legally, Irish "Standard Time" is defined as the *summer* UTC+1 state (a naming quirk from that stalled reform), but the actual clock-change behaviour is unchanged from previous years.

**Recommendation:** do not hand-roll a fixed-offset or "no DST" rule for Dublin. Use the IANA tzdatabase identifier **`Europe/Dublin`** directly wherever the runtime does date/time math — tzdata already encodes whatever the real, current transition rule is, so this sidesteps the disputed naming question entirely. **Do not copy the report's "no DST" line into product code.** Flagged for Tim/Jim to confirm before D2 if a hand-rolled offset table is ever considered.

## Bilingual / print notes

Luas stop names are English-only on the official map (no Irish-language dual print on this asset, unlike Brussels' FR/NL). The `/ga/` Irish-language site path exists (`luas.ie/ga/luas-a-usaid`) but the network map graphic itself carries no Irish text. No bilingual-pair lock needed for D1.

## What the oracle report didn't have (gap this pack filled)

The oracle report deferred station-array transcription to this pack ("D1 pack will hand-transcribe station order from official Luas Red & Green line maps") and only listed "major central stations" plus termini — one of which (**"Terminates Malahide or Howth (north)"** for the Red Line) is **factually wrong**: Malahide and Howth are DART (Iarnród Éireann) termini, not Luas Red Line termini. The Red Line's actual termini, confirmed on the official map, are **The Point** (northeast) and **Tallaght / Saggart** (southwest, two branches). **This pack does not carry the Malahide/Howth claim forward** — flagged here so it isn't silently repeated in a future pack or by Jim. Whoever drafted that line in the oracle report likely cross-contaminated Luas Red Line with DART; worth a correction note back to Nico if DART is picked up in a v2 country/region pass.

The report also never mentioned **O'Connell Upper** as a stop name (only "O'Connell - GPO"), and never flagged the Parnell↔Trinity one-way loop. Both are now documented above (H4a) directly from the official map.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| dublin vs dub / ie / merged Irish multi-city feed | Do not invent a second city id (per report C2/C3 item 1) |
| Abbey Street vs Marlborough / O'Connell - GPO / O'Connell Upper | Hub lock (Red) vs Green city-centre loop, ~200 m walk, no shared platform |
| O'Connell - GPO vs O'Connell Upper | Two distinct Green stops, same name family, direction-exclusive (northbound only) |
| Tallaght vs Saggart | Two distinct Red termini forking at Belgard |
| Red Cow vs Kingswood vs Belgard | Three consecutive distinct stops; Belgard (not Red Cow) is the fork |
| Connolly vs Abbey Street / Busáras | Connolly has DART interchange, no Green access — not the hub |
| Marlborough (southbound-only) vs O'Connell - GPO / O'Connell Upper (northbound-only) | Direction-exclusive stops must never be merged into one "city-centre" chip |
| Arts-Loi / Kunst-Wet / Simonis / Elisabeth / T-Centralen / Waitematā Station / Chicago Loop | Other-city hub strings. Do not copy. |

## What I did not do

No generator, no GTFS station-array build, no stopIds, no live city flip, no product edit, no DART deep-dive (v2, out of scope), no bus analysis (out of mode), no adapter code, no API key used or pasted (this pack made no GTFS-RT calls — the static network-map PNG fetch used no key and is a public CC BY 4.0 asset per the oracle report's license findings).
