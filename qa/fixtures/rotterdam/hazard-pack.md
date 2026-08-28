# Rotterdam hazard pack (H1–H7)

Evidence: RET Metrolijnenkaart PDF (2025-12-15); RET Metro A–E columns as of 28 Aug 2026; Luke Expansion brief (71 stops, hub Beurs, A–E termini).

## H1 — parent + child

OVapi `stops.txt` parents are often `City, Stop`. Passengers print map forms (Beurs, Rotterdam Centraal, Meijersplein/Airport).

doNotGroup: **Rotterdam Centraal metro vs NS Rotterdam Centraal**; **Beurs metro vs tram Beurs / Beursplein**; **Den Haag Centraal metro E vs NS/HTM**; **Hoek van Holland Strand vs Haven**; **Schiedam Centrum metro vs NS**; **Blaak metro vs NS**; **Alexander metro vs NS**; **Laan van NOI metro vs NS**.

## H3 — thin / event / overlay

- **A to Vlaardingen West** (historical peak extras) is not the printed A terminus. Printed A is Binnenhof–Schiedam Centrum.
- **B short turns** at Steendijkpolder / Hoek van Holland Haven — operational, not extra D1 lines. Strand remains the printed B end.
- **D extras toward Pijnacker** are Metro E. Printed D is Rotterdam Centraal–De Akkers.
- Night metro / weekend overlay is not a D1 line.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Beurs | A/B/C east–west vs D/E north–south | All five on the Metrolijnenkaart |
| Graskruid / Alexander | A to Binnenhof vs B to Nesselande | A does not go to Nesselande |
| Capelsebrug | C to De Terp vs A/B east | C leaves the Calandlijn |
| Schiedam Centrum | A terminus vs B to Strand vs C to Parkweg/De Akkers | Hoekse Lijn vs Calandlijn west |
| Tussenwater | C via Pernis vs D via Rhoon | Two approaches to De Akkers |
| Rotterdam Centraal | D terminus vs E through to Den Haag vs NS | doNotGroup metro vs NS |

No Hague city. Metro E to Den Haag Centraal stays on rotterdam.

## H5 — nested short turns

B: some trips end Steendijkpolder or Haven. Not passenger D1 rows. Strand stays the map terminus.

## H6 — inner city (where §3 lives)

Locked hub **Beurs**. Not Rotterdam, not CS, not Centraal Station (Amsterdam GVB hub name). Rotterdam Centraal is a different station on D/E.

Direction is **line + terminus**.

## H7 — DST

**Europe/Amsterdam observes DST** (CEST/CET). Same as Amsterdam. Agency timezone in OVapi is `Europe/Amsterdam`.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| rotterdam vs amsterdam | Separate city; shared OVapi zip; filter RET vs GVB |
| Beurs metro vs tram | Same inner-city name, different mode |
| Rotterdam Centraal metro vs NS | D terminus / E through vs Intercity |
| Den Haag Centraal metro vs NS/HTM | E stop on rotterdam; no Hague city |
| Hoek van Holland Strand vs Haven | Adjacent B stops; Strand is the map lock |
| Meijersplein vs Meijersplein/Airport | Map form is Meijersplein/Airport |
| city=nl / the-hague | Do not invent |

## What I did not do

No generator, no stopIds in published-network.json, no Perth/Amsterdam product rewrite, no GVB leak.
