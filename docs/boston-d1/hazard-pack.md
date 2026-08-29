# Boston hazard pack (H1–H7)

Evidence: official MBTA Subway Map (2026-06-14-subway-map-v01.pdf, Last-Modified Thu 18 Jun 2026 15:25:24 GMT) hand-transcribed from rendered map images on 29 Aug 2026; official line / stops pages as support; empty-key V3 predictions 200; product `lib/cities/boston/` absent.

## H1 — parent + child

D1 has no stopIds. MBTA transfer buildings have separate rapid-transit stop-places (Park Street ≠ Downtown Crossing ≠ Gov't Center ≠ State). V3 and the stops index already treat them as different parents.

doNotGroup: **Park Street** (Red × Green) vs **Downtown Crossing** (Red × Orange; walking concourse on the map) vs **Gov't Center** (Green × Blue; B/C inner end) vs **State** (Orange × Blue) vs **South Station** (Red + Silver Line / Commuter Rail / bus) vs **North Station** (Orange × Green D/E + Commuter Rail / Amtrak) vs **Haymarket** (Orange × Green D/E); **Ashmont** Red vs Mattapan trolley platforms (same stop string, two modes — keep one printed name, do not fold the line); **Airport** Blue vs Massport / Logan terminals / Silver Line SL1; **Back Bay / Ruggles / Forest Hills / JFK/UMass / Quincy Center / Braintree / Malden Center** subway vs Commuter Rail; **Union Sq** (Green D, Somerville) vs **Union Sq (Allston)** bus.

## H3 — thin / event / overlay

- **Orange Line suspended Oak Grove–Back Bay, 20–30 Aug 2026** (subway-hub news on 29 Aug 2026). Official passenger map still prints Oak Grove through Back Bay as open stops — **kept**. Overlay only. Do not delete them.
- **Green Line infrastructure shutdown 8–16 Aug 2026** (Government Center–Babcock / Cleveland Circle / Kenmore / Heath Street corridors) is already completed on the subway hub. Overlay, not a D1 terminus change.
- **Silver Line BRT** on the same Subway Map plate. Out of v1.
- **Frequent bus** (yellow numbered lines). Out of v1.
- **Commuter Rail / CapeFlyer / ferry / Massport shuttles.** Transfers or other modes, not D1 stops.
- **Full System Map / Downtown Map** on the same index are mixed-mode / inset twins, not a second stop oracle.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Park Street | Red NW–SE vs Green B/C/D/E west/north. Hub lock. Not a direction token | Map transfer; all four Green services call here |
| Downtown Crossing | Red vs Orange. Walking concourse to Park Street. **Not Park Street** | Map; one building east of the lock |
| Gov't Center | Blue vs Green. B/C inner end; D/E through. **Not Park Street** | Map legend Boston College / Cleveland Circle **to Gov't Center** |
| State | Orange vs Blue. **Not Park Street** | Map |
| JFK/UMass | Red Ashmont (Savin Hill–Ashmont) vs Red Braintree (North Quincy–Braintree) | Map south fork |
| Kenmore | Green B Blandford St–Boston College vs Green C St. Mary's St–Cleveland Circle vs Green D Fenway–Riverside | Map west split; E does **not** serve Kenmore |
| Copley | Green E Prudential–Heath St vs B/C/D to Hynes / Kenmore | Map E leave |
| Lechmere | Green D Union Sq vs Green E East Somerville–Medford/Tufts | Map north fork; legend D **Union Sq** / E **Medford/Tufts** |
| Ashmont | Red Ashmont terminus vs Mattapan Line | Map; legend M is its own line |
| North Station / Haymarket | Orange vs Green D/E only (not B/C) | Map. B/C end at Gov't Center |

No city loop. Red is a through trunk with a south fork. Orange and Blue are single spines. Green is four passenger services sharing a downtown trunk.

## H5 — nested short turns

No official nested codes like Adelaide GAW/SALIS. Passenger codes only: **Red Orange Blue Green-B Green-C Green-D Green-E Mattapan**.

`shortTurns` empty on every line. Green B/C ending at **Gov't Center** is a printed legend terminus, not a nested short — recorded in `termini`, not `shortTurns`.

Night extras and replacement buses are not D1 rows. Orange Oak Grove–Back Bay shuttle (20–30 Aug 2026) is H3, not a `shortTurns` row.

## H6 — inner city (where §3 lives)

Locked set: **Park Street**. Shared approaches: Downtown Crossing, Gov't Center, State, South Station, North Station, Haymarket, Boylston, Arlington, Copley, Hynes Convention Ctr, Kenmore, Lechmere, Science Park/West End, JFK/UMass, Ashmont, Back Bay.

Park Street is a **through-cross**, not a single-end hub. Inbound/outbound vs CBD is false here (Red is NW–SE; Green is west/southwest vs north). Downtown Crossing / Gov't Center / State are other transfer buildings — still not the lock.

## H7 — DST

**America/New_York observes DST (EDT/EST).** Do not copy Perth / Brisbane no-DST. Wall-clock is Eastern local. V3 `arrival_time` on 29 Aug 2026 printed `-04:00` (EDT).

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| boston vs city=bos / mbta / boston-mbta | Do not invent a second city id |
| boston vs washington / chicago / bart | Other US packs; do not merge |
| Park Street vs Downtown Crossing / Gov't Center / State / South Station | Four (plus) downtown buildings |
| Gov't Center vs Government Center | Map vs stops page |
| Harvard vs Harvard Ave | Two stations |
| Central vs Central Ave | Red vs Mattapan |
| Longwood vs Longwood Medical Area | Green D vs Green E |
| Chestnut Hill vs Chestnut Hill Ave | Green D vs Green B |
| Washington St vs Washington Sq | Green B vs Green C |
| Union Sq vs Union Sq (Allston) | Green D vs bus point |
| Medford/Tufts vs Tufts Medical Ctr | Green E vs Orange |
| Mattapan vs Red | Own legend line from Ashmont |
| Green B/C vs Green D/E north of Gov't Center | B/C do not serve Haymarket / North Station / Lechmere |
| Green E vs Hynes / Kenmore | E leaves at Copley |
| Silver Line / bus / ferry / Commuter Rail vs subway | Out of v1 |
| Orange Oak Grove–Back Bay overlay shuttle | H3; stops stay on D1 |
| Metro Center / Clark/Lake / Embarcadero / Beurs / T-Centralen / Brunnsparken / Centraal Station / Waitematā Station | Other-city hub strings. Do not copy. |

## What I did not do

No generator, no assertion tables, no live city flip, no product edit, no Perth edit, no API key, no merge of other PRs.
