# Gold Coast hazard pack (H1–H7)

Evidence: Translink G:link tram PDF Effective August 2026; SEQ network map Version 4 GCLR3 10 Aug 2026; Translink stations-open 9 Aug 2026; SEQ GTFS 20260822–20261021 (one tram route L1).

## H1 — parent + child

SEQ `stops.txt`: 270 `location_type=1` parents, 13125 rows whole feed (bus/train/tram/ferry mixed). G:link passengers print tram-PDF names; GTFS tram parents are `* station` and two `(Southport)` disambiguators.

doNotGroup: **Helensvale station** train platforms vs tram platforms (same parent `place_helsta`); **Queen Street station (Southport)** vs Brisbane **Queen Street bus station**; **Griffith University station (Southport)** vs Nathan busway **Griffith University station**; **Southport station** tram vs **Southport bus station** children; **Gold Coast Airport** bus vs not-a-G:link-stop; **Miami** vs **Miami North**; **Mermaid Beach** vs **Mermaid Beach South**.

## H3 — thin / event / overlay

- **Stage 3** is live from 9 Aug 2026 (not an overlay).
- **Weekday midnight–5am**: tram PDF frequency table shows a **bus icon** (tram replacement). Overlay, not a D1 line. Translink: route 70 overnight tram replacement Helensvale–Burleigh Heads.
- **Route 700** shortened to Tweed Heads–Stockland Burleigh Heads; no longer duplicates the tram. Bus, out of v1.
- **SEQ mixed map** Twenty Seventh Ave / Nineteenth Ave / Palm Beach / Gold Coast Airport: not G:link passenger. Not inserted.
- **QR Gold Coast line** at Helensvale (and Nerang / Robina / Varsity Lakes): heavy rail, Brisbane T5, out of this city.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Helensvale | G:link south vs QR Gold Coast line north/south | Tram PDF connecting-services box; SEQ diagram train + tram |
| Broadbeach South | G:link continues to Burleigh Heads (no branch). Bus 700/777 leave here | Former terminus; now through-stop |
| Burleigh Heads | G:link terminus. Bus 700 south to Tweed | Stations-open article |

No city loop. One line. Proposed Olsen Avenue / Labrador western branch is **not** on the August 2026 tram PDF.

## H5 — nested short turns

No official nested codes. Turnbacks exist in GTFS as operational (`Southport turnback`, `Cavill Avenue turnback`, `Broadbeach South turnback`, `Miami North station turnback`, …) — **not** passenger D1 rows.

G:link announcement: weekend through-running now covers Helensvale–Burleigh Heads all night (no more GCUH night short). Not a D1 line split.

## H6 — inner city (where §3 lives)

There is no Civic-style CBD hub. The useful locked interchange is **Helensvale** (tram + QR). Surfers Paradise / Cavill Avenue / Broadbeach South are busy but not the rail hub.

Inbound/outbound vs “the Coast” is meaningless. Direction is **line + terminus**.

## H7 — DST

**Australia/Brisbane does NOT observe DST.** Same as Brisbane. Agency timezone in SEQ GTFS `agency.txt` is `Australia/Brisbane`. Do not copy Sydney / Canberra / Newcastle H7.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| gold-coast vs brisbane | Separate city; shared SEQ feed |
| Helensvale tram vs Helensvale QR | Same parent, two modes |
| Queen Street (Southport) vs Queen Street (Brisbane bus) | Two cities |
| Griffith University (Southport tram) vs Griffith University (Nathan busway) | Two campuses |
| Broadbeach vs Broadbeach South vs Broadbeach North | Three stops |
| Miami vs Miami North | Adjacent new stations |
| G:link vs L1 vs Gold Coast line (train) | Tram vs QR T5 |
| GCUH vs Gold Coast University Hospital | Abbreviation vs lock |
| Christine Ave vs Christine Avenue | Diagram vs tram PDF |
| Gold Coast Airport vs Burleigh Heads | Airport is not on the tram PDF |

## What I did not do

No generator, no assertion tables, no live city flip, no merge into Brisbane.
