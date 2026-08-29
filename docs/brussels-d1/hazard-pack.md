# Brussels hazard pack (H1–H7)

Evidence: official STIB/MIVB **Map for metro, CHRONO lines and SNCB-NMBS** (`Plan_Metro_Train.pdf`, PDF title `Plan_Metro_Train_240923`, HTTP Last-Modified Thu 03 Oct 2024 15:13:01 GMT) hand-transcribed from the rendered map on 29 Aug 2026; official district-map texts (Arts-Loi / Kunst-Wet, Gare du Midi, Gare Centrale, Gare du Nord, Albert, Simonis, Louise, Gare de l'Ouest, Beekkant); empty-key WaitingTimes.json 404; product `lib/cities/brussels/` absent.

## H1 — parent + child

D1 has no stopIds. STIB/BMC live JSON and the static GTFS will later expose platform / stop-place ids that collapse metro + tram + SNCB under nearby printed names.

doNotGroup: **Arts-Loi / Kunst-Wet** (metro 1/2/5/6) vs **Gare du Midi / Zuidstation** (metro 2/6 + tram 4/10/51/81/82 + SNCB) vs **Gare Centrale / Centraal Station** (metro 1/5 + SNCB) vs **De Brouckère** (metro 1/5 + North–South Axis tram) vs **Rogier** (metro 2/6 + North–South Axis tram) vs **Simonis** vs **Elisabeth**. **Gare du Nord / Noordstation** has **no metro** (official district text: tram 4, 10, 25, 55 only). **Simonis ≠ Elisabeth.**

## H3 — thin / event / overlay

- **No passenger metro 3 or 4.** Official legend prints metro **M 1 2 5 6** only. Tracker “M1–M6” is an overstatement.
- **Metro 3 Albert–Bordet** is a frozen project. Official Albert district text: “No metro lines available at this station.” Not on the 240923 plate. Out until the official metro map says open.
- **Premetro / North–South Axis** (Gare du Nord, Bourse / Beurs, Anneessens, Lemonnier, Parvis de Saint-Gilles / Sint-Gillisvoorplein, Horta, Albert) looks like metro underground. Official Gare du Nord + Albert texts print **no metro**. Out of v1.
- **CHRONO tram T 4 7 8 9 10** on the same mixed plate. Out of v1.
- **SNCB/NMBS S-lines** (S1–S10, S19, S81) and stations (Bruxelles-Congrès, Bruxelles-Chapelle, Bruxelles-Luxembourg, Tour et Taxis / Thurn en Taxis, Anderlecht, …). Transfers, not D1 stops.
- **Bus / Noctis / De Lijn / TEC.** Out of v1.
- **Brupass / Brupass XL / Noctis** PDFs on the same index are not the D1 stop oracle.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Arts-Loi / Kunst-Wet | 1/5 E–W vs 2/6 inner-ring N–S. Hub lock. Not a direction token | Map 1×2×5×6 cross; district text metro 1, 2, 5, 6; no tram |
| Beekkant | 1/5 east via Étangs Noirs vs 2/6 via Osseghem / Midi. Also 1×2×5×6 | Map western split; district text metro 1, 2, 5, 6 |
| Gare de l'Ouest / Weststation | Line 1 west end vs line 5 continuing to Erasme; also 2/6 | Map line-1 terminus box; line 5 gold continues west |
| Merode | Line 1 Montgomery–Stockel vs line 5 Thieffry–Herrmann-Debroux | Map east fork |
| Simonis | Line 2 loop end vs line 6 through to Roi Baudouin. **≠ Elisabeth** | Map two terminus boxes; Simonis district title is Simonis |
| Elisabeth | Line 2 and line 6 loop end. **≠ Simonis** | Map grey Elisabeth box; no district-map row |
| Gare du Midi / Zuidstation | Metro 2/6 vs tram 4/10/51/81/82 vs SNCB | District text; mixed-plate train icon |
| Rogier / De Brouckère / Porte de Hal | Metro vs North–South Axis premetro | Map T-coloured vertical; Midi/Nord district texts |
| Heysel / Heizel | Metro 6 vs CHRONO tram 7. De Wand is tram only | Map yellow 7 vs blue 6 |

No city loop as a passenger *code* (there is no metro “ring” number). Lines 2 and 6 *run* the inner ring between Simonis and Elisabeth. Inbound/outbound vs Centre is false at **Arts-Loi / Kunst-Wet** (four compass headings on two trunks), **Beekkant** (east vs Midi), **Merode** (Stockel vs Herrmann-Debroux), and **Simonis** (loop vs Heizel).

## H5 — nested short turns

No official nested codes like Adelaide GAW/SALIS. Four passenger numbers only: **1, 2, 5, 6**. No 3. No 4.

`shortTurns` empty on all four lines. Night / disruption shorts are overlays, not D1 rows. Replacement tram / bus out of v1.

## H6 — inner city (where §3 lives)

Locked set: **Arts-Loi / Kunst-Wet**. Shared approaches: Parc / Park, Maelbeek / Maalbeek, Trône / Troon, Madou, Gare Centrale / Centraal Station, De Brouckère, Porte de Namur / Naamsepoort, Louise / Louiza, Botanique / Kruidtuin, Rogier.

Arts-Loi / Kunst-Wet is a **through-cross**, not a single-end hub. Inbound/outbound vs CBD is false here (1/5 are E–W; 2/6 are the loop). Gare du Midi and Gare Centrale are other buildings — still not the lock.

## H7 — DST

**Europe/Brussels observes DST (CEST/CET).** Do not copy Perth / Brisbane no-DST. Wall-clock is Brussels local.

## Bilingual print (one D1 string)

Lock **FR / NL** with a slash, matching the clash report (`Arts-Loi / Kunst-Wet`, `Gare du Midi / Zuidstation`). The 240923 plate often *stacks* both languages (sometimes NL above FR: Zuidstation / Gare du Midi, Ossegem / Osseghem, Het Rad / La Roue, Kraainem / Crainhem). That stack order is a rename, not a second stop.

| D1 string (FR / NL) | other official print | note |
| --- | --- | --- |
| Arts-Loi / Kunst-Wet | district title Arts-Loi (Kunst-Wet) | lock |
| Gare du Midi / Zuidstation | map often stacks Zuidstation above | lock FR/NL |
| Gare de l'Ouest / Weststation | map often stacks Weststation above | lock FR/NL |
| Étangs Noirs / Zwarte Vijvers | map stacks Zwarte Vijvers / Étangs Noirs; index Etangs (no accent) | lock FR + accent |
| Osseghem / Ossegem | map stacks Ossegem / Osseghem | lock FR/NL |
| La Roue / Het Rad | map stacks Het Rad / La Roue | lock FR/NL |
| Veeweyde / Veeweide | map stacks Veeweide / Veeweyde | lock FR/NL |
| Crainhem / Kraainem | map stacks Kraainem / Crainhem; district Crainhem / Kraainem | lock FR/NL |
| Hôtel des Monnaies / Munthof | map stacks Munthof / Hôtel des Monnaies; index Hotel (no accent) | lock map Hôtel |
| Porte de Namur / Naamsepoort | map stacks Naamsepoort / Porte de Namur | lock FR/NL |
| Roi Baudouin / Koning Boudewijn | map terminus box stacks Koning Boudewijn / Roi Baudouin | lock FR/NL |
| Houba-Brugmann | district index **Houba Brugmann** (space) | lock **map hyphen** |
| Joséphine-Charlotte | district index Josephine-Charlotte (no accent) | lock **map accent** |
| Heysel / Heizel | map grey box prints both | lock pair |
| Simonis | district title Simonis | **≠ Elisabeth** |
| Elisabeth | no district-map row | **≠ Simonis** |

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| brussels vs city=bru / bruxelles / stib / belgium | Do not invent a second city id |
| brussels vs sweden / stockholm / goteborg / malmo / uppsala | Sweden out |
| Arts-Loi / Kunst-Wet vs Gare du Midi / Zuidstation | Hub vs SNCB + premetro cluster |
| Arts-Loi / Kunst-Wet vs Gare Centrale / Centraal Station | 1×2×5×6 vs 1/5 only |
| Arts-Loi / Kunst-Wet vs De Brouckère / Rogier | Premetro name-family |
| Simonis vs Elisabeth | Two printed loop ends, same complex |
| Gare du Nord / Noordstation vs any metro row | Official text: no metro |
| Albert vs any metro row | Official text: no metro; metro 3 frozen |
| Metro 1/2/5/6 vs tram 3/4/10 / CHRONO | Tracker M1–M6 trap |
| Metro vs SNCB at Midi / Centrale / Schuman / Merode / Bockstael | Mixed-plate train icons |
| Heysel metro vs tram 7 / De Wand | CHRONO overlay |
| Chicago Loop / Beurs / T-Centralen / Brunnsparken / Centraal Station / Waitematā Station / Metro Center / Rautatientori | Other-city hub strings. Do not copy. |

## What I did not do

No generator, no assertion tables, no live city flip, no product edit, no Perth edit, no Sweden reopen, no clone, no API key, no GTFS-derived station arrays.
