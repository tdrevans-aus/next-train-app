# Stockholm direction model memo (§3 for Tim)

Context: **through-running**, not an Adelaide hub and not a Sydney City Circle. Tunnelbana T-numbers already print as **colour family + number + terminus** (Röda linjen 13 Norsborg). Pendeltåg prints **number + terminus** (40 Uppsala C) on a magenta family. Official SL Transport `destination` is the suburban (or Uppsala C / Nynäshamn) end, not “to City”.

The inner city is the hazard: a rider at **T-Centralen** is not at **Stockholm City**. Blinds that said only “Centralen” would be wrong.

## Recommendation

**Line + terminus** (example: `Röda linjen + Norsborg`, or `Pendeltåg 40 + Uppsala C`).

Use the **far** terminus on the train in front of you. Include the **colour family or T-number** because H4 branches share platforms (Gullmarsplan, Västra skogen, Älvsjö). Official SL product is already this shape — not inbound/outbound.

Do not write D5 assertion tables until Tim locks this.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | Röda linjen + Norsborg; Blå linjen + Hjulsta; Pendeltåg 40 + Uppsala C | Matches map families and live `destination`; splits H4; works at T-Centralen where every train is through | Must pick shorts (H5): Alvik vs Hässelby strand; 43X vs 43 |
| **B. Terminus only** | Norsborg; Akalla; Märsta | Matches destination blinds | At T-Centralen / Gullmarsplan the colour/number is how riders choose. Port-like confusion: Fruängen vs Norsborg both “south red” |
| **C. Inbound/outbound vs CBD + terminus** | To City / To Norsborg | Familiar from Perth/Adelaide tabs | **False** on this network. Metro and pendeltåg through-run. “Inbound” at Gamla stan is meaningless. Stockholm City is not T-Centralen |

## §3 examples (illustrative — not D5)

Assume model A. Locked metro string **T-Centralen**. Locked pendeltåg string **Stockholm City**.

### T-Centralen (metro through-station)

| train | label |
| --- | --- |
| 10 | Blå linjen + Hjulsta |
| 11 | Blå linjen + Akalla |
| 10/11 other way | Blå linjen + Kungsträdgården |
| 13 | Röda linjen + Norsborg |
| 13 other way | Röda linjen + Ropsten |
| 14 | Röda linjen + Fruängen |
| 14 other way | Röda linjen + Mörby centrum |
| 17 | Gröna linjen + Skarpnäck |
| 17 other way | Gröna linjen + Åkeshov |
| 18 | Gröna linjen + Farsta strand |
| 18 short | Gröna linjen + Alvik |
| 19 | Gröna linjen + Hagsätra |
| 19 other way | Gröna linjen + Hässelby strand |

### Stockholm City (pendeltåg through-station)

| train | label |
| --- | --- |
| 40 | Pendeltåg 40 + Uppsala C |
| 40 other way | Pendeltåg 40 + Södertälje centrum |
| 40 short | Pendeltåg 40 + Tumba |
| 41 | Pendeltåg 41 + Märsta |
| 43 | Pendeltåg 43 + Bålsta |
| 43 other way | Pendeltåg 43 + Nynäshamn |
| 43X | Pendeltåg 43 + Kallhäll (skip-stop) / Nynäshamn |

Do not label these **T-Centralen**. 48 never appears here.

### Gullmarsplan (H4)

Gröna linjen + Skarpnäck vs Farsta strand vs Hagsätra. Terminus-only still works if the number is visible; inbound/outbound does not.

### Västra skogen

Blå linjen + Hjulsta vs Blå linjen + Akalla.

### Älvsjö / Upplands Väsby

Pendeltåg 40/41 + Södertälje centrum vs Pendeltåg 43 + Nynäshamn; 40 + Uppsala C vs 41 + Märsta.

### Södertälje hamn (H5)

Pendeltåg 40/41 + Stockholm City direction vs Pendeltåg 48 + Gnesta. 48 must not be labelled as if it will serve Stockholm City.

## Open §3 questions for Tim

1. Spoken/printed line token: `Röda linjen` (map family) vs `13` (T-number) vs `Röda linjen 13`. Rec: **family + number + terminus** (`Röda linjen 13 + Norsborg`). Pendeltåg has no colour name in speech — `Pendeltåg 40 + Uppsala C`.
2. Hub strings: lock **T-Centralen** / **Stockholm City**. Never `Stockholm Central`.
3. Whether pendeltåg Odenplan blinds should say **Odenplan** (map) or **Stockholm Odenplan** (API).
4. Whether 43X is always a distinct token or folded into 43 + Kallhäll.
5. Whether v2 promotes Roslagsbanan (27–29) / Saltsjöbanan (25–26) which already sit on this PNG.
