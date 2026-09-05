# Lisbon hazard pack (H1–H7)

Evidence: official Metropolitano de Lisboa **network diagram** — `DiagramaRedeAgosto2026.pdf`
(PDF title `Diagrama da Rede_site_download2026`, Illustrator 30.6, creation/mod date
2026-07-27T13:27:34+01:00), linked from
https://www.metrolisboa.pt/en/travel/diagrams-and-maps/, downloaded and hand-transcribed
2026-09-06 from a 300dpi render of the single page (`pdftotext -layout` was tried first and is
layout-scrambled on this plate — station names print out of order across columns — so it was
**not** used to build `stations[]`; the render was read visually, station by station, same
method as the Brussels pack). Static GTFS (`googleTransit.zip`) empty-key 200 confirmed
2026-09-06 but **not used to generate stations[]** per the oracle report's explicit instruction.
Product `lib/cities/lisbon/` absent.

## H1 — parent + child

D1 has no stopIds — the network diagram prints stop names and icons only. Static GTFS will
later expose `stop_id`/`parent_station` pairs; that GTFS structure is Jim's D2+ concern, not
this pack's.

doNotGroup: the six interchange stations below, each a single stop shared by exactly two of the
four lines (no third line ever meets at any of them — see H4). Also doNotGroup **Roma** vs
**Areeiro** vs **Roma/Areeiro** (see H3) — three different printed circles at the same map
cluster, only two of which are Metro stops.

## H2 — who has line codes today

| surface | 4 lines? | what it actually has |
| --- | --- | --- |
| Official network diagram (D1, Aug 2026) | **yes** | Four coloured lines: Azul, Amarela, Verde, Vermelha. Termini and every stop hand-drawn with a coloured tick. |
| Static GTFS (empty-key 200, confirmed 2026-09-06) | **yes** | 4 routes per the oracle report; not used to build this pack's stations. |
| EstadoServicoML live API | line status only, and empty-key probe returned **403** (auth required) 2026-09-06 | Per-line operational state, not arrivals. Confirms oracle report: no departures data even with a key. |
| Product `lib/cities/lisbon/` | **absent** | No lisbon stations.json / line-map.json. `assertCityLive("lisbon")` is Unknown city / 400. |

## H3 — thin / event / overlay

- **CP urban commuter rail** (Cascais, Sintra, Sul, Azambuja lines) shares six *stations* with
  Metro (Oriente, Santa Apolónia, Terreiro do Paço, Cais do Sodré, São Sebastião pedestrian link,
  and Reboleira) but is a separate operator/boarding contract. Out of v1 per the oracle report.
- **Alcântara-Terra / Alcântara-Mar — correction to the oracle report.** The oracle report's
  Board-eligibility table lists "Alcântara Terra (M Vermelha): + CP Linha do Sul" as an
  overlapping-service station. **The official Aug 2026 network diagram does not show either
  Alcântara-Terra or Alcântara-Mar on any of the four Metro lines** — both print only on the
  beige CP corridor near Belém/Santos, well southwest of the Vermelha (Red) line's actual route
  (S. Sebastião ↔ Aeroporto, nowhere near the river at Alcântara). **Not inserted into
  `stations[]`.** Flagging this back rather than silently dropping or silently keeping it — Nico
  or Jim should confirm whether this was a transcription slip in the oracle report or refers to a
  different, non-D1 Metro planning document.
- **Roma / Areeiro / "Roma/Areeiro."** The diagram draws three separate circles in this cluster:
  a Metro **Roma** stop (Verde), a Metro **Areeiro** stop (Verde), and a third hollow-ring node
  printed **"Roma/Areeiro"** joined to both by a dotted pedestrian-path line (same dotted-path
  convention as Alcântara-Terra/Alcântara-Mar). The third node is the CP Roma-Areeiro railway
  station, not a Metro stop. **doNotGroup Roma ≠ Areeiro ≠ "Roma/Areeiro."** Only Roma and Areeiro
  go in `stations[]`.
- **Tram (Carris historic network) and Transtejo ferries.** Out of v1 (separate operator, no
  GTFS-RT, no boarding-contract overlap requiring a v1 decision beyond what the oracle report
  already recorded).
- **Bus (Carris Metropolitana / TUL).** Out of v1 (mode exclusion).

## H4 — branches / interchanges (doNotGroup candidates)

Six interchange stations, each shared by exactly two lines — no station on the official diagram
is shared by three or four lines (unlike Brussels' Arts-Loi/Kunst-Wet, which is a 4-way cross).
Lisbon's four lines form a complete graph: every pair of lines crosses exactly once, at a
different named station each time.

| node | lines | evidence |
| --- | --- | --- |
| **Marquês de Pombal** | Azul × Amarela | Diagram: Azul curves through it, Amarela terminates its inner run here before Rato. Icon row: bus, customer-care, wheelchair, bike, police — the richest amenity set on the diagram. |
| **Campo Grande** | Amarela × Verde | Diagram: Amarela runs straight through; Verde's Telheiras terminus feeds in immediately west. Icon row: bus, wheelchair, customer-care, bike, lost-property. |
| **Saldanha** | Amarela × Vermelha | Diagram: Amarela vertical crosses Vermelha horizontal at a single tick. Icon row: wheelchair, bike. |
| **Baixa-Chiado** | Azul × Verde | Diagram: Azul's diagonal crosses Verde's vertical descent to Cais do Sodré at a single tick. Icon row: wheelchair, bike. |
| **S. Sebastião** | Azul × Vermelha | Diagram prints the abbreviated form **"S. Sebastião"** (not "São Sebastião"). Vermelha's west terminus; Azul runs through. Icon row: wheelchair, bike. |
| **Alameda** | Verde × Vermelha | Diagram: Verde vertical crosses Vermelha's horizontal-to-diagonal bend. Icon row: baby-care, wheelchair, bike — a lighter amenity set than Marquês de Pombal. |

No station carries three or four line ticks. There is no single "central" hub the way
Arts-Loi/Kunst-Wet is for Brussels — the network reads as a diamond/cross of four lines meeting
pairwise. See the direction-model memo for why this matters for §3.

## H5 — nested short turns

No short-turn or branch codes on the official diagram. Each of the four lines is a single simple
route between two printed termini — no "via" variants, no express overlay, no night-service
short-turn codes like Adelaide's GAW/SALIS or Brussels' loop ambiguity.

`shortTurns` empty on all four lines.

## H6 — inner city (where §3 lives)

No single locked hub — see H4. The direction-model memo recommends **line + terminus** with no
hub-token concept needed, because Lisbon's four lines never form a >2-way cross the way
Brussels' 1/2/5/6 do at Arts-Loi/Kunst-Wet. Hub-lock choice for cataloguing purposes (which of
the six interchanges gets called out as *the* inner-city reference point in prose/UI copy, not a
direction token) is **Marquês de Pombal** — see the direction-model memo for the full
Marquês-de-Pombal-vs-Alameda comparison the oracle report asked Luke to resolve.

## H7 — DST

**Europe/Lisbon observes DST** (WET/UTC+0 standard, WEST/UTC+1 late Mar–late Oct). Do not copy
Perth/Brisbane/Adelaide no-DST assumptions. Portugal's DST calendar matches the EU-wide switch
dates (same as Brussels/Copenhagen's CET/CEST, offset by one hour — Lisbon is UTC+0/+1, not
UTC+1/+2).

## Printed name locks

The official diagram is monolingual (Portuguese only — no bilingual pairs, unlike Brussels
FR/NL). Names to lock exactly as printed, including abbreviation and punctuation:

| D1 string | do not use |
| --- | --- |
| S. Sebastião | São Sebastião (full form — diagram abbreviates) |
| Colégio Militar/Luz | Colégio Militar (dropping the /Luz half); Luz alone |
| Roma/Areeiro | as a station name in `stations[]` — it is the CP interchange node, not a Metro stop (see H3) |
| Alfornelos | Alfornellos, Alfarnelos |
| Cais do Sodré | Cais do Sodre (missing accent) |

## Real-time constraint (restated for the pack)

No public GTFS-RT, no public next-train API. EstadoServicoML (line-status only, OAuth-gated,
empty-key probe **403** confirmed 2026-09-06) does not carry departures. **Boards will be
schedule-based only — no live delays, no next-train countdown.** This is recorded as a hazard,
not an omission: Mark's QA checklist must confirm static-only boards are an accepted product
state before any flip, per the oracle report's C2/C3 item 7.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| lisbon vs tml / mlisboa / metrolisboa / portugal | Do not invent a second city id (oracle report explicit) |
| Marquês de Pombal vs Campo Grande vs Saldanha vs Baixa-Chiado vs S. Sebastião vs Alameda | Six distinct two-line interchanges, no three-way cross exists — never merge or treat one as covering another |
| Roma vs Areeiro vs Roma/Areeiro | Two Metro stops + one CP interchange node with a shared-looking label |
| Alcântara-Terra / Alcântara-Mar vs any Metro line | Not on the official diagram at all — CP-only; oracle report's board-eligibility table appears to have this in error (see H3) |
| Metro Azul/Amarela/Verde/Vermelha vs CP Urban (Cascais/Sintra/Sul/Azambuja) | Separate operator, separate boarding contract, out of v1 |
| Metro vs Carris tram / Transtejo ferry / Carris Metropolitana bus | Out of mode, v1 |
| S. Sebastião (this pack) vs São Sebastião (any other source) | Same station, lock the diagram's abbreviated print |

## What I did not do

No generator, no assertion tables, no live city flip, no product edit, no Perth edit, no GTFS
zip extraction to build `stations[]`, no EstadoServicoML call with a real key, no cross-city
merge, no license speculation beyond what the oracle report already established (CC0/Zenodo).
