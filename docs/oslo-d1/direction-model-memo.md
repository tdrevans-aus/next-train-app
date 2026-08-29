# Oslo direction model memo (§3 for Tim)

Context **today (29 Aug 2026)**: **through Common Tunnel**, not a single hub-and-spoke. Official Ruter folder titles talk **1 Frognerseteren - Bergkrystallen**, **2 Østerås - Ellingsrudåsen**, **3 Kolsås - Mortensrud**, **4 Vestli - Bergkrystallen**, **5 Sognsvann - Vestli**, not “to City” / “to Oslo” / “to Sentrum”.

Inbound/outbound vs City already dies at **Stortinget** (all five lines through; line 5 both ways on one trip), **Jernbanetorget** (same plus Oslo S), **Nationaltheatret** (same plus railway), **Majorstuen** (four western branches + ring), **Carl Berners plass** (line 5 ring vs Vestli), and **Økern** (line 4 Løren vs line 5 Hasle).

## Recommendation

**Line + terminus** (example: `1 + Frognerseteren`, or `2 + Ellingsrudåsen`, or `5 + Vestli`).

Use the **official Ruter folder terminus** on trains leaving a node. Use **Stortinget** only as the hub *stop string*, never as a direction token (“to City” / “to Oslo” / “to Sentrum”). At Stortinget the useful pair is line + suburban end.

Do not write D5 assertion tables until Tim locks this.

The pack prompt’s chips are **line + official terminus**, not compass, not “to City”. D1 locks folder strings: **Frognerseteren**, **Bergkrystallen**, **Østerås**, **Ellingsrudåsen**, **Kolsås**, **Mortensrud**, **Sognsvann**, **Vestli**. **Helsfyr** is a line-1 short-turn, not a chip. **Ringen** is not a chip.

**There is no passenger line 6.** No Fornebu chip.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | 1 + Frognerseteren; 2 + Ellingsrudåsen; 5 + Vestli | Matches Ruter folder titles and destination blinds; splits H4 at Stortinget / Majorstuen / Økern / Hellerud | Must keep Vestli as a token on both 4 and 5 (line prefix does the work) and not collapse line 1’s Helsfyr short-turn into a third chip |
| **B. Terminus only** | Frognerseteren; Ellingsrudåsen; Vestli | Matches some blinds | At Stortinget five lines collapse to suburb names with no family. Line 4 and line 5 both “Vestli” the north-east way |
| **C. Inbound/outbound vs City + terminus** | To City / To Frognerseteren | Close to English “centre” | False at Stortinget (through-tunnel). “City” / “Sentrum” is the map blob, not the hub lock. Dies for line 5 (one trip is both inbound and outbound) |

## §3 examples (illustrative — not D5)

Assume model A. Locked stop string **Stortinget**. Official folder termini.

### Stortinget (all five lines; line 5 twice)

| train | label |
| --- | --- |
| 1 west | 1 + Frognerseteren |
| 1 east | 1 + Bergkrystallen |
| 2 west | 2 + Østerås |
| 2 east | 2 + Ellingsrudåsen |
| 3 west | 3 + Kolsås |
| 3 east | 3 + Mortensrud |
| 4 west/north | 4 + Vestli |
| 4 east | 4 + Bergkrystallen |
| 5 toward Sognsvann | 5 + Sognsvann |
| 5 toward Vestli | 5 + Vestli |

Vy / NSB at Oslo S is **out of this city**. Inbound/outbound does not work (every line both ways is not “to City”). Line 5 on this board can be *both* directions on the same published through-path.

### Jernbanetorget (H4; T-bane + Oslo S)

Same ten chips as Stortinget. **Oslo S / Vy / NSB / bussterminal are a different mode.** “To Oslo S” is false as a T-bane direction. doNotGroup.

### Nationaltheatret (H4; T-bane + railway)

Same chips. Railway platforms are **out of this city**.

### Majorstuen (H4)

1 + Frognerseteren vs 1 + Bergkrystallen vs 2 + Østerås vs 2 + Ellingsrudåsen vs 3 + Kolsås vs 3 + Mortensrud vs 4 + Vestli vs 4 + Bergkrystallen vs 5 + Sognsvann vs 5 + Vestli. Terminus-only collapses 4 vs 5 both “Vestli” — keep the line token.

### Carl Berners plass / Økern / Hellerud / Helsfyr

Line + the far official end (5 + Sognsvann vs 5 + Vestli, not “around the ring”; 4 + Vestli vs 5 + Vestli — line token required; 2 + Ellingsrudåsen vs 3 + Mortensrud; 1 + Bergkrystallen vs 1 + Frognerseteren — not Helsfyr unless that specific trip is signed that way).

## Open §3 questions for Tim

1. Spoken/printed line token: map / folder `1` vs `T-bane 1` vs `Linje 1`. Rec: **{1–5} + official Ruter terminus**.
2. Hub far-end string: never “City” / “Oslo” / “Sentrum” / “Oslo S”. Lock **Stortinget** as the stop; directions always the official suburban terminus.
3. Line 1 eastern string: folder `Bergkrystallen` vs short-turn `Helsfyr`. Rec: **passenger folder terminus**; Helsfyr only if a specific trip is signed that way (overlay).
4. Line 5 string: folder pair `Sognsvann` / `Vestli` vs marketing `Ringen`. Rec: **passenger folder**; Ringen is the path, not a chip.
5. Whether testers see oslo as its own city picker (yes — do not bury under a Norway / Ruter / Vy city).
6. Whether boards at Jernbanetorget still show an Oslo S-shaped “to City” (they should not — T-bane chips are the suburban ends; rail is out of this city).
