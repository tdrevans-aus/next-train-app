# Berlin direction model memo (§3 for Tim)

Context **today (29 Aug 2026)**: **cross**, not a single hub-and-spoke. Official BVG linienuebersicht and Linienverlauf titles talk **U1 S+U Warschauer Str. ◂▸ U Uhlandstr.**, **U2 S+U Pankow ◂▸ U Ruhleben**, **U5 U Hönow ◂▸ S+U Hauptbahnhof**, **U6 U Kurt-Schumacher-Platz ◂▸ U Alt-Mariendorf**, not “to Mitte” / “to City”.

Inbound/outbound vs Mitte already dies at **Alexanderplatz** (U2/U5/U8 through-cross; U1/U3/U4/U6/U7/U9 never call it), **Nollendorfplatz** (U4 ends; U1/U2/U3 through), **Wittenbergplatz** (U1 Uhlandstr. vs U3 Krumme Lanke), **Hauptbahnhof** (U5 only; S/DB are other modes), **Warschauer Str.** (U1 and U3 both start here and leave west), and **Osloer Str.** (U9 ends; U8 through).

## Recommendation

**Line + terminus** (example: `U1 + Warschauer Str.`, or `U1 + Uhlandstr.`, or `U5 + Hauptbahnhof`, or `U6 + Kurt-Schumacher-Platz`).

Use the **official BVG folder terminus** on trains leaving a node. Use **Alexanderplatz** only as the hub *stop string*, never as a direction token (“to City” / “to Mitte” / “to Alex”). At Alexanderplatz the useful pair is line + suburban end.

Do not write D5 assertion tables until Tim locks this.

The pack prompt’s example `U1 + Warschauer Straße / Uhlandstraße` is the **format** (line + terminus). D1 locks the official BVG abbreviations **Warschauer Str.** / **Uhlandstr.**

**U6 does not go to Alt-Tegel in passenger service.** Chip is `U6 + Kurt-Schumacher-Platz` / `U6 + Alt-Mariendorf`. The March 2026 map still draws Alt-Tegel (closed).

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | U1 + Uhlandstr.; U2 + Pankow; U5 + Hauptbahnhof; U6 + Kurt-Schumacher-Platz | Matches BVG folder titles and destination blinds; splits H4 at Wittenbergplatz / Nollendorfplatz / Alexanderplatz / Osloer Str. | Must keep U1 vs U3 east-end as the same token (Warschauer Str.) and split them at Wittenbergplatz |
| **B. Terminus only** | Uhlandstr.; Pankow; Hönow | Matches some blinds | At Alexanderplatz three lines collapse to suburb names with no family. U1 and U3 both “Warschauer Str.” the other way |
| **C. Inbound/outbound vs Mitte + terminus** | To City / To Uhlandstr. | Close to English “centre” | False at Alexanderplatz (through-cross). “City” / “Mitte” is not the hub lock. Dies for U1/U3/U4/U6/U7/U9 (never call Alexanderplatz). Collapses U5 vs U8 both “not centre” toward Hönow / Hermannstr. |

## §3 examples (illustrative — not D5)

Assume model A. Locked stop string **Alexanderplatz**. Official folder termini.

### Alexanderplatz (U2/U5/U8 cross; six lines absent)

| train | label |
| --- | --- |
| U2 north-east | U2 + Pankow |
| U2 west | U2 + Ruhleben |
| U5 east | U5 + Hönow |
| U5 west | U5 + Hauptbahnhof |
| U8 north | U8 + Wittenau |
| U8 south | U8 + Hermannstr. |

S-Bahn and Regional at the same building are **out of this city**. Inbound/outbound does not work (U5 both ways is not “to City”).

### Nollendorfplatz (H4; U-Bahn-only 4-line node)

U1 + Warschauer Str. vs U1 + Uhlandstr. vs U2 + Pankow vs U2 + Ruhleben vs U3 + Warschauer Str. vs U3 + Krumme Lanke vs U4 + Innsbrucker Platz. U4 has no “other way” beyond this stop. Inbound/outbound vs Alexanderplatz does not work (none of U1/U3/U4 go there).

### Wittenbergplatz

U1 + Uhlandstr. vs U1 + Warschauer Str. vs U3 + Krumme Lanke vs U3 + Warschauer Str. vs U2 + Pankow vs U2 + Ruhleben. Terminus-only collapses U1 vs U3 both “Warschauer Str.” the east way — keep the line token.

### Hauptbahnhof (H4)

U5 + Hönow. That is the only U-Bahn direction. S / DB / FEX at the same building are **out of this city**. “To City” would point every U5 toward Alexanderplatz and then keep going to Hönow — do not use it.

### Warschauer Str. / Osloer Str. / Kurt-Schumacher-Platz

Line + the far official end (U1 Uhlandstr. vs U3 Krumme Lanke; U8 Hermannstr. vs U8 Wittenau vs U9 Rathaus Steglitz; U6 Alt-Mariendorf — not Alt-Tegel).

## Open §3 questions for Tim

1. Spoken/printed line token: map / folder `U1` vs `U-Bahn U1`. Rec: **U{1–9} + official BVG terminus**.
2. Hub far-end string: never “City” / “Mitte” / “Alex”. Lock **Alexanderplatz** as the stop; directions always the official suburban (or Hauptbahnhof) terminus.
3. U6 north-end string: folder `Kurt-Schumacher-Platz` vs map `Alt-Tegel`. Rec: **passenger folder** until the line reopens.
4. Whether testers see berlin as its own city picker (yes — do not bury under a Germany / VBB / S-Bahn city).
5. Whether U1/U3/U4/U6/U7/U9 boards still show an Alexanderplatz-shaped “to City” (they should not).
