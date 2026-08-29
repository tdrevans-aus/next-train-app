# Boston direction model memo (§3 for Tim)

Context **today (29 Aug 2026)**: **cross**, not a single hub-and-spoke. Red runs NW–SE through **Park Street** and forks at **JFK/UMass** (Ashmont vs Braintree). Green is four passenger services through **Park Street**: B/C end at **Gov't Center**; D/E continue north (Union Sq vs Medford/Tufts) and split west/south at **Kenmore** / **Copley**. Orange is Oak Grove–Forest Hills through Downtown Crossing / State (never Park Street). Blue is Wonderland–Bowdoin through State / Gov't Center (never Park Street).

Inbound/outbound vs CBD is already a bad product model at **Park Street** (Red two south ends + four Green suburban ends), **JFK/UMass** (Ashmont vs Braintree), **Kenmore** (B vs C vs D), **Copley** (E vs B/C/D), and **Lechmere** (Union Sq vs Medford/Tufts).

## Recommendation

**Line + terminus** (example: `Red Line + Alewife`, or `Green Line B + Boston College`, or `Mattapan Line + Mattapan`).

Use the **far** printed terminus on trains leaving a node. Use **Park Street** only as the hub *stop string*, never as a direction token (“to City” / “to Park Street” / “to Downtown”). At Park Street the useful pair is line + suburban end.

Do not write D5 assertion tables until Tim locks this.

Red far ends are **Alewife**, **Ashmont**, and **Braintree**. Green far ends are the legend pairs: **Boston College / Gov't Center** (B), **Cleveland Circle / Gov't Center** (C), **Riverside / Union Sq** (D), **Heath St / Medford/Tufts** (E). Mattapan far ends are **Ashmont** and **Mattapan**. Orange **Oak Grove / Forest Hills**. Blue **Wonderland / Bowdoin**.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | Red Line + Alewife; Green Line B + Boston College; Mattapan Line + Mattapan | Matches map families and Park Street blinds; splits H4 at JFK/UMass / Kenmore / Copley / Lechmere | Must keep Ashmont vs Braintree distinct; four Green letters distinct; Gov't Center is a B/C *end*, not the hub lock |
| **B. Terminus only** | Alewife; Boston College; Ashmont | Matches some destination blinds | At Park Street four Green services + Red collapse to suburb names with no family. Ashmont is both a Red end and the Mattapan start |
| **C. Inbound/outbound vs CBD + terminus** | To City / To Alewife | Close to English “centre” | False at Park Street (through-cross). “City” is not the hub lock. Orange and Blue never “arrive at City” as Park Street |

## §3 examples (illustrative — not D5)

Assume model A. Locked stop string **Park Street**.

### Park Street (Red × Green)

| train | label |
| --- | --- |
| Red NW | Red Line + Alewife |
| Red SE (Ashmont path) | Red Line + Ashmont |
| Red SE (Braintree path) | Red Line + Braintree |
| Green B west | Green Line B + Boston College |
| Green B inner | Green Line B + Gov't Center |
| Green C west | Green Line C + Cleveland Circle |
| Green C inner | Green Line C + Gov't Center |
| Green D west | Green Line D + Riverside |
| Green D north | Green Line D + Union Sq |
| Green E south | Green Line E + Heath St |
| Green E north | Green Line E + Medford/Tufts |

**Park Street is not a direction token.** Do not emit “to Park Street” / “to City” / “to Downtown”.

### Downtown Crossing / Gov't Center / State (not the hub)

Orange Line + Oak Grove / Forest Hills vs Red Line + Alewife / Ashmont / Braintree (Downtown Crossing). Blue Line + Wonderland / Bowdoin vs Green Line B/C + Gov't Center (as the B/C *end*) vs Green Line D/E through (Gov't Center). These buildings are **not** Park Street.

### JFK/UMass (H4)

Red Line + Ashmont vs Red Line + Braintree vs Red Line + Alewife. Commuter Rail out of this city.

### Kenmore / Copley (H4)

Green Line B + Boston College vs Green Line C + Cleveland Circle vs Green Line D + Riverside (Kenmore). Green Line E + Heath St vs B/C/D toward Kenmore (Copley). E does **not** get a Kenmore or Hynes Convention Ctr token.

### Lechmere (H4)

Green Line D + Union Sq vs Green Line E + Medford/Tufts vs D/E toward Riverside / Heath St the other way.

### Ashmont

Red Line + Alewife vs Mattapan Line + Mattapan. Do not emit “Red Line + Mattapan”.

## Open §3 questions for Tim

1. Spoken/printed line token: map legend `Red Line` / `Green Line B` vs circles `RL` / `GL (B)` vs V3 `Red` / `Green-B`. Rec: **{Color} Line + terminus**, with Green as **Green Line B/C/D/E**.
2. Hub far-end string: never “City” / never “Park Street” / never “Downtown” as a direction. Lock **Park Street** as the stop; directions always the suburban (or B/C inner) terminus.
3. Green B/C inner string: map `Gov't Center` vs page `Government Center`. Rec: map short form. This is a terminus chip for B/C, not the hub lock.
4. Red south string: keep **Ashmont** and **Braintree** both (map fork). A train that says Ashmont is not Braintree.
5. Whether testers see boston as its own city picker (yes — do not invent city=bos or bury under a US / MBTA city).
