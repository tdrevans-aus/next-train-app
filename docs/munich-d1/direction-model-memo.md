# Munich direction model memo (§3 for Tim)

Context **today (29 Aug 2026)**: **cross**, not a single hub-and-spoke. Official MVV Linienverzeichnis 2026 and Minifahrplan / Aushang titles talk **U1 Olympia-Einkaufszentrum – Mangfallplatz**, **U2 Feldmoching – Messestadt Ost**, **U3 Moosach – Marienplatz – Fürstenried West**, **U5 Laimer Platz – Neuperlach Süd**, **U6 Klinikum Großhadern – Marienplatz – Garching-Forschungszentrum**, not “to City” / “to Munich”.

Inbound/outbound vs City already dies at **Marienplatz** (U3/U6 through-cross; U1/U2/U4/U5/U7/U8 never call it), **Odeonsplatz** (U3/U6 vs U4/U5), **Hauptbahnhof** (six U-Bahn lines; U3/U6 never call it; S/DB are other modes), **Sendlinger Tor** (six U-Bahn lines; U4/U5 never call it), **Innsbrucker Ring** (U2 Messestadt Ost vs U5/U7/U8 Neuperlach), and **Implerstraße** (U3 Fürstenried West vs U6 Klinikum Großhadern).

## Recommendation

**Line + terminus** (example: `U1 + Olympia-Einkaufszentrum`, or `U1 + Mangfallplatz`, or `U5 + Laimer Platz`, or `U6 + Garching-Forschungszentrum`).

Use the **official 2026 folder terminus** on trains leaving a node. Use **Marienplatz** only as the hub *stop string*, never as a direction token (“to City” / “to Munich” / “to Marienplatz”). At Marienplatz the useful pair is line + suburban end.

Do not write D5 assertion tables until Tim locks this.

**U5 does not go to Pasing in passenger service.** Chip is `U5 + Laimer Platz` / `U5 + Neuperlach Süd`.

**U6 does not go to Martinsried in passenger service.** Chip is `U6 + Garching-Forschungszentrum` / `U6 + Klinikum Großhadern`.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | U1 + Mangfallplatz; U2 + Feldmoching; U5 + Laimer Platz; U6 + Garching-Forschungszentrum | Matches MVV folder titles and destination blinds; splits H4 at Marienplatz / Odeonsplatz / Innsbrucker Ring / Implerstraße | Must keep U7 vs U1 north-end as the same token (Olympia-Einkaufszentrum) and split them at Kolumbusplatz; U7/U8 share Neuperlach Zentrum the other way |
| **B. Terminus only** | Mangfallplatz; Feldmoching; Laimer Platz | Matches some blinds | At Hauptbahnhof six lines collapse to suburb names with no family. U1 and U7 both “Olympia-Einkaufszentrum” the north-west way; U5/U7/U8 all “Neuperlach Zentrum” unless U5 continues to Neuperlach Süd |
| **C. Inbound/outbound vs City + terminus** | To City / To Mangfallplatz | Close to English “centre” | False at Marienplatz (through-cross). “City” / “Munich” is not the hub lock. Dies for U1/U2/U4/U5/U7/U8 (never call Marienplatz). Collapses U3 vs U6 both “not centre” toward Moosach / Garching |

## §3 examples (illustrative — not D5)

Assume model A. Locked stop string **Marienplatz**. Official folder termini.

### Marienplatz (U3/U6 cross; six lines absent)

| train | label |
| --- | --- |
| U3 north-west | U3 + Moosach |
| U3 south-west | U3 + Fürstenried West |
| U6 north | U6 + Garching-Forschungszentrum |
| U6 south-west | U6 + Klinikum Großhadern |

S-Bahn at the same building is **out of this city**. Inbound/outbound does not work (U3 both ways is not “to City”).

### Odeonsplatz (H4; U-Bahn-only 4-line node)

U3 + Moosach vs U3 + Fürstenried West vs U4 + Westendstraße vs U4 + Arabellapark vs U5 + Laimer Platz vs U5 + Neuperlach Süd vs U6 + Garching-Forschungszentrum vs U6 + Klinikum Großhadern. Terminus-only collapses U3 vs U6 both ways on Stammstrecke 1 and U4 vs U5 both ways on Stammstrecke 3 — keep the line token.

### Hauptbahnhof (H4)

U1 + Olympia-Einkaufszentrum vs U1 + Mangfallplatz vs U2 + Feldmoching vs U2 + Messestadt Ost vs U4 + Westendstraße vs U4 + Arabellapark vs U5 + Laimer Platz vs U5 + Neuperlach Süd vs U7 + Olympia-Einkaufszentrum vs U7 + Neuperlach Zentrum vs U8 + Olympiazentrum vs U8 + Neuperlach Zentrum. S / DB at the same building are **out of this city**. U3/U6 never call this stop. “To City” is meaningless.

### Sendlinger Tor / Innsbrucker Ring / Implerstraße / Kolumbusplatz

Line + the far official end (U1 Mangfallplatz vs U2 Messestadt Ost vs U3 Fürstenried West vs U6 Klinikum Großhadern vs U7/U8 Neuperlach Zentrum; U2 Messestadt Ost vs U5 Neuperlach Süd).

## Open §3 questions for Tim

1. Spoken/printed line token: map / folder `U1` vs `U-Bahn U1`. Rec: **U{1–8} + official 2026 terminus**.
2. Hub far-end string: never “City” / “Munich” / “Mitte”. Lock **Marienplatz** as the stop; directions always the official suburban terminus.
3. U5 west-end string: folder `Laimer Platz` vs unopened `Pasing`. Rec: **passenger folder** until the line opens.
4. U6 south-end string: folder `Klinikum Großhadern` vs unopened `Martinsried`. Rec: **passenger folder**.
5. Whether testers see munich as its own city picker (yes — do not bury under a Germany / MVV / S-Bahn city).
6. Whether U1/U2/U4/U5/U7/U8 boards still show a Marienplatz-shaped “to City” (they should not).
7. U7/U8 Zusatzlinie chips: same `U7 + Neuperlach Zentrum` / `U8 + Olympiazentrum` on the days they run; do not invent a compass or “Verstärker” token.
