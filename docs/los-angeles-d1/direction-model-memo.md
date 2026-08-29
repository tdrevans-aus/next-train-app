# Los Angeles direction model memo (§3 for Tim)

Context **today (29 Aug 2026)**: **cross**, not a single hub-and-spoke. A runs N–S through **7th St/Metro Ctr** (Pomona North–Downtown Long Beach, with a clockwise Long Beach loop). E runs E–W through **7th St/Metro Ctr** (Downtown Santa Monica–Atlantic), sharing the Regional Connector with A. B/D share Union Station–Wilshire/Vermont then split (B to North Hollywood; D to Wilshire/La Cienega). C is Norwalk–LAX/Metro Transit Center (no 7th St). K is Expo/Crenshaw–Redondo Beach via LAX/Metro Transit Center (no 7th St).

Inbound/outbound vs CBD is already a bad product model at **7th St/Metro Ctr** (A two suburban ends + E two suburban ends + B/D Union Station / North Hollywood / Wilshire/La Cienega), **Wilshire/Vermont** (B vs D), **Pico** (A south vs E west), **Little Tokyo/Arts Dist** (A north vs E east), **LAX/Metro Transit Center** (C end vs K through), and **Expo/Crenshaw** (E vs K).

## Recommendation

**Line + terminus** (example: `A Line + Pomona North`, or `E Line + Downtown Santa Monica`, or `K Line + Redondo Beach`).

Use the **far** printed terminus on trains leaving a node. Use **7th St/Metro Ctr** only as the hub *stop string*, never as a direction token (“to City” / “to 7th Street” / “to Downtown” / “to Metro Center”). At 7th St/Metro Ctr the useful pair is line + suburban (or Union Station / Wilshire) end.

Do not write D5 assertion tables until Tim locks this.

A far ends are **Pomona North** and **Downtown Long Beach** (Pacific Av is on the Long Beach loop, not a second south terminus chip). B far ends **North Hollywood** / **Union Station**. C **Norwalk** / **LAX/Metro Transit Center**. D **Union Station** / **Wilshire/La Cienega**. E **Downtown Santa Monica** / **Atlantic**. K **Expo/Crenshaw** / **Redondo Beach**.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | A Line + Pomona North; E Line + Atlantic; K Line + Redondo Beach | Matches map families and 7th St blinds; splits H4 at Pico / Little Tokyo / Wilshire/Vermont / LAX / Expo/Crenshaw | Must keep Atlantic vs East LA distinct; LAX/Metro Transit Center vs Aviation/Century distinct; Union Station is a B/D *end*, not the hub lock |
| **B. Terminus only** | Pomona North; Atlantic; North Hollywood | Matches some destination blinds | At 7th St four letters collapse to suburb names with no family. Union Station is A *and* B *and* D. Expo/Crenshaw is E *and* K |
| **C. Inbound/outbound vs CBD + terminus** | To City / To Pomona North | Close to English “centre” | False at 7th St (through-cross). “City” / “Downtown” is not the hub lock. C and K never “arrive at City” as 7th St |

## §3 examples (illustrative — not D5)

Assume model A. Locked stop string **7th St/Metro Ctr**.

### 7th St/Metro Ctr (A × B × D × E)

| train | label |
| --- | --- |
| A north | A Line + Pomona North |
| A south | A Line + Downtown Long Beach |
| E west | E Line + Downtown Santa Monica |
| E east | E Line + Atlantic |
| B NW | B Line + North Hollywood |
| B/D east | B Line + Union Station / D Line + Union Station |
| D west | D Line + Wilshire/La Cienega |

**7th St/Metro Ctr is not a direction token.** Do not emit “to 7th Street” / “to Metro Center” / “to City” / “to Downtown”. C and K are not in this table.

### Union Station / Civic Ctr/Grand Park / Pershing Square / Historic Broadway (not the hub)

B Line + North Hollywood / Union Station vs D Line + Wilshire/La Cienega / Union Station vs A Line + Pomona North / Downtown Long Beach (Union Station). E Line + Downtown Santa Monica / Atlantic (Historic Broadway). These buildings are **not** 7th St/Metro Ctr. Metrolink / Amtrak out of this city.

### Pico / Little Tokyo/Arts Dist (H4)

A Line + Downtown Long Beach vs E Line + Downtown Santa Monica (Pico). A Line + Pomona North vs E Line + Atlantic (Little Tokyo). Pico ≠ Pico/Aliso.

### Wilshire/Vermont (H4)

B Line + North Hollywood vs D Line + Wilshire/La Cienega vs B/D toward Union Station.

### Expo/Crenshaw / LAX/Metro Transit Center (H4; not the hub)

E Line + Downtown Santa Monica / Atlantic vs K Line + Redondo Beach (Expo/Crenshaw). C Line + Norwalk vs K Line + Expo/Crenshaw / Redondo Beach (LAX/Metro Transit Center). C does **not** get an Expo/Crenshaw token. K does **not** get a 7th St token.

### Downtown Long Beach

A Line + Pomona North the other way. Loop stations (5th St / 1st St / Pacific Av) are not extra terminus chips.

## Open §3 questions for Tim

1. Spoken/printed line token: map legend `A Line` vs circle `A` vs timetable `801`. Rec: **{A,B,C,D,E,K} Line + terminus**.
2. Hub far-end string: never “City” / never “7th Street” / never “Metro Center” / never “Downtown” as a direction. Lock **7th St/Metro Ctr** as the stop; directions always the printed terminus.
3. E east string: map stop **Atlantic** vs legend/rider **East LA**. Rec: map stop **Atlantic**.
4. C west string: map **LAX/Metro Transit Center** vs legend **LAX**. Rec: map long form.
5. A south string: **Downtown Long Beach** (legend Long Beach). Pacific Av stays a loop stop, not a chip.
6. Whether testers see los-angeles as its own city picker (yes — do not invent city=la or bury under a US / Metro city).
