# Hong Kong direction model memo (§3 for Tim)

Context **today (29 Aug 2026)**: **through trunk plus two Admiralty termini**, not a single hub-and-spoke. Official MTR Railway Network page and system map talk **Island Kennedy Town–Chai Wan**, **Tsuen Wan Tsuen Wan–Central**, **Tseung Kwan O Po Lam/LOHAS Park–North Point**, **East Rail Admiralty–Lo Wu/Lok Ma Chau**, not “to City” / “to Hong Kong” / “to Downtown”.

Inbound/outbound vs City already dies at **Admiralty** (Island and Tsuen Wan through; East Rail and South Island start here), **Central** (Island × Tsuen Wan, not the lock), **Hung Hom** (East Rail × Tuen Ma), and **Tsim Sha Tsui / East Tsim Sha Tsui** (two stations).

## Recommendation

**Line + official terminus** (example: `Island + Chai Wan`, or `Tseung Kwan O + Po Lam / LOHAS Park`, or `East Rail + Lo Wu / Lok Ma Chau`).

Use the **official EN terminus** on trains leaving a node. Use **Admiralty** only as the hub *stop string*, never as a direction token (“to City” / “to Hong Kong” / “to Downtown”). At Admiralty the useful pair is line + suburban end (or the other Island / Tsuen Wan end).

Do not write D5 assertion tables that invent a live board. The Next Train REST exists and is **not wired**. City stays planned.

The pack prompt’s chips are **line + official terminus**, not compass N/S/E/W, not “to City”, not inbound/outbound. D1 locks sheet strings: **Kennedy Town**, **Chai Wan**, **Tsuen Wan**, **Central**, **Whampoa**, **Tiu Keng Leng**, **North Point**, **Po Lam / LOHAS Park**, **Hong Kong**, **Tung Chung**, **Wu Kai Sha**, **Tuen Mun**, **Admiralty**, **Lo Wu / Lok Ma Chau**, **South Horizons**. **Airport / AsiaWorld-Expo / Disneyland Resort** are not chips. **Downtown** is not a chip.

**There is no Airport Express in v1.** No AEL chip. **There is no Light Rail in v1.**

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | Island + Chai Wan; East Rail + Lo Wu / Lok Ma Chau | Matches official Railway Network titles and destination blinds; splits H4 at Admiralty / Tseung Kwan O / Sheung Shui | Combined far-end strings on TKL and EAL must stay one chip |
| **B. Terminus only** | Chai Wan; Lo Wu | Matches some blinds | At Admiralty four lines collapse to suburb names with no family |
| **C. Inbound/outbound vs City + terminus** | To City / To Chai Wan | Close to English “centre” | False at Admiralty (through-trunk + two termini). “City” / “Downtown” is not the hub lock |

## §3 examples (illustrative — not D5)

Assume model A. Locked stop string **Admiralty**. Official EN termini.

### Admiralty (Tsuen Wan + Island + South Island + East Rail)

| train | label |
| --- | --- |
| Island west | Island + Kennedy Town |
| Island east | Island + Chai Wan |
| Tsuen Wan north | Tsuen Wan + Tsuen Wan |
| Tsuen Wan south | Tsuen Wan + Central |
| East Rail north | East Rail + Lo Wu / Lok Ma Chau |
| South Island south | South Island + South Horizons |

Tuen Ma / Kwun Tong / Tseung Kwan O / Tung Chung do **not** serve Admiralty. Inbound/outbound does not work (Island and Tsuen Wan both ways is not “to City”). “To Downtown” is false as a metro direction.

### Tseung Kwan O (H4 branch)

Tseung Kwan O + North Point vs Tseung Kwan O + Po Lam / LOHAS Park. One far-end chip for both branch termini.

### Sheung Shui (H4 border fork)

East Rail + Admiralty vs East Rail + Lo Wu / Lok Ma Chau. Lo Wu and Lok Ma Chau stay in as stations; they share one far-end chip.

### Central (not the hub)

Island + Kennedy Town / Chai Wan, Tsuen Wan + Tsuen Wan. **Admiralty is a different station.** doNotGroup.

## Open §3 questions for Tim

1. Spoken/printed line token: official EN `Island Line` vs short `Island` vs code `ISL`. Rec: **{Island, Tsuen Wan, Kwun Tong, Tseung Kwan O, Tung Chung, Tuen Ma, East Rail, South Island} + official EN terminus**.
2. Hub far-end string: never “City” / “Hong Kong” / “Downtown”. Lock **Admiralty** as the stop; directions always the official suburban terminus (Central is a Tsuen Wan terminus, not a city chip).
3. Whether testers see hong-kong as its own city picker (yes — country **Hong Kong** `hk`, not China, not a Light Rail sibling).
4. Whether a later AEL-on-the-same-REST adapter would leak Airport Express — do not wire. D1 stays planned.
