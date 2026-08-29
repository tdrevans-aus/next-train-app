# Hamburg direction model memo (§3 for Tim)

Context **today (29 Aug 2026)**: **cross**, not a single hub-and-spoke. Official HVV Linienfahrplan titles talk **U1 Norderstedt Mitte – Hauptbahnhof Süd – Ohlstedt / Großhansdorf**, **U2 Niendorf Nord – Hauptbahnhof Nord – Mümmelmannsberg**, **U3 Barmbek – Schlump – Hauptbahnhof Süd – Wandsbek-Gartenstadt**, **U4 Elbbrücken – Hauptbahnhof Nord – Billstedt**, not “to City” / “to Hamburg”.

Inbound/outbound vs City already dies at **Jungfernstieg** (U1/U2/U4 through-cross; U3 never calls it), **Hauptbahnhof Süd** (U1 vs U3; Nord is a different U-Bahn station), **Hauptbahnhof Nord** (U2 vs U4), **Volksdorf** (U1 Ohlstedt vs U1 Großhansdorf), **Barmbek** (U3 ring-then-spur), and **Billstedt** (U4 ends; U2 continues).

## Recommendation

**Line + terminus** (example: `U1 + Norderstedt Mitte`, or `U1 + Ohlstedt`, or `U1 + Großhansdorf`, or `U4 + Elbbrücken`).

Use the **official HVV/Hochbahn folder terminus** on trains leaving a node. Use **Jungfernstieg** only as the hub *stop string*, never as a direction token (“to City” / “to Hamburg” / “to Hbf”). At Jungfernstieg the useful pair is line + suburban (or Elbbrücken / Billstedt) end.

Do not write D5 assertion tables until Tim locks this.

The pack prompt’s chips are **line + official terminus**, not compass, not “to City”. D1 locks folder strings: **Großhansdorf** (not Großhansd.), **Mümmelmannsberg**, **Wandsbek-Gartenstadt**, **Hauptbahnhof Süd** / **Hauptbahnhof Nord** never as a direction for the other Hbf station.

**U4 does not go to Horner Geest in passenger service.** Chip is `U4 + Billstedt` / `U4 + Elbbrücken`. The Horner Geest / Stoltenstraße ticks are unopened.

**U5 does not exist as a passenger line.** No chip.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | U1 + Ohlstedt; U2 + Niendorf Nord; U3 + Barmbek; U4 + Elbbrücken | Matches HVV folder titles and destination blinds; splits H4 at Jungfernstieg / Volksdorf / Billstedt / Barmbek | Must keep U1’s two eastern ends as separate tokens (Ohlstedt vs Großhansdorf) and not collapse them to Volksdorf |
| **B. Terminus only** | Ohlstedt; Mümmelmannsberg; Billstedt | Matches some blinds | At Jungfernstieg three lines collapse to suburb names with no family. U2 and U4 both “Billstedt” the east way until U2 continues |
| **C. Inbound/outbound vs City + terminus** | To City / To Norderstedt Mitte | Close to English “centre” | False at Jungfernstieg (through-cross). “City” is not the hub lock. Dies for U3 (never calls Jungfernstieg). Collapses U2 vs U4 both “not centre” toward Mümmelmannsberg / Billstedt |

## §3 examples (illustrative — not D5)

Assume model A. Locked stop string **Jungfernstieg**. Official folder termini.

### Jungfernstieg (U1/U2/U4 cross; U3 absent)

| train | label |
| --- | --- |
| U1 north | U1 + Norderstedt Mitte |
| U1 east (Ohlstedt branch) | U1 + Ohlstedt |
| U1 east (Großhansdorf branch) | U1 + Großhansdorf |
| U2 west | U2 + Niendorf Nord |
| U2 east | U2 + Mümmelmannsberg |
| U4 west | U4 + Elbbrücken |
| U4 east | U4 + Billstedt |

S-Bahn at the same building is **out of this city**. Inbound/outbound does not work (U1 both ways is not “to City”). U3 is not on this board.

### Hauptbahnhof Süd (H4; U1/U3)

U1 + Norderstedt Mitte vs U1 + Ohlstedt vs U1 + Großhansdorf vs U3 + Barmbek vs U3 + Wandsbek-Gartenstadt. **Hauptbahnhof Nord is a different U-Bahn stop** (U2/U4). S / DB at the same cluster are **out of this city**. “To City” / “to Hbf” is false.

### Hauptbahnhof Nord (H4; U2/U4)

U2 + Niendorf Nord vs U2 + Mümmelmannsberg vs U4 + Elbbrücken vs U4 + Billstedt.

### Berliner Tor (H4)

U2 + Niendorf Nord vs U2 + Mümmelmannsberg vs U3 + Barmbek vs U3 + Wandsbek-Gartenstadt vs U4 + Elbbrücken vs U4 + Billstedt. Terminus-only collapses U2 vs U4 both “Billstedt” until U2 continues — keep the line token.

### Volksdorf / Barmbek / Billstedt

Line + the far official end (U1 Ohlstedt vs U1 Großhansdorf vs U1 Norderstedt Mitte; U3 Wandsbek-Gartenstadt vs U3 Barmbek — not “around the ring”; U2 Mümmelmannsberg vs U4 Billstedt — not Horner Geest).

## Open §3 questions for Tim

1. Spoken/printed line token: map / folder `U1` vs `U-Bahn U1`. Rec: **U{1–4} + official HVV/Hochbahn terminus**.
2. Hub far-end string: never “City” / “Hamburg” / “Hbf”. Lock **Jungfernstieg** as the stop; directions always the official suburban (or Elbbrücken / Billstedt) terminus.
3. U1 eastern string: folder pair `Ohlstedt` / `Großhansdorf` vs short-turn `Volksdorf`. Rec: **passenger folder termini**; Volksdorf only if a specific trip is signed that way (overlay).
4. U4 east-end string: folder `Billstedt` vs construction `Horner Geest`. Rec: **passenger folder** until the line opens.
5. Whether testers see hamburg as its own city picker (yes — do not bury under a Germany / HVV / S-Bahn city).
6. Whether U3 boards still show a Jungfernstieg-shaped “to City” (they should not — U3 never calls it; use Barmbek / Wandsbek-Gartenstadt).
