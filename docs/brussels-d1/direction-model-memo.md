# Brussels direction model memo (§3 for Tim)

Context **today (29 Aug 2026)**: **cross**, not a single hub-and-spoke. Official STIB/MIVB metro 1 and 5 run E–W through **Arts-Loi / Kunst-Wet**. Metro 2 and 6 run the inner-ring loop N–S through the same building (Madou / Botanique / Rogier one way; Trône / Louise / Midi the other). Official Arts-Loi district-map text talks **metro lines 1, 2, 5, 6**, not “to City” / “to Centre” / “to Brussels”.

Inbound/outbound vs Centre already dies at **Arts-Loi / Kunst-Wet** (four compass headings on two trunks), **Beekkant** (1/5 east vs 2/6 Midi), **Merode** (Stockel vs Herrmann-Debroux), **Gare de l'Ouest / Weststation** (line 1 ends; line 5 continues to Erasme), and **Simonis** (line 2 ends; line 6 continues to Roi Baudouin).

## Recommendation

**Line + terminus** (example: `1 + Stockel / Stokkel`, or `6 + Roi Baudouin / Koning Boudewijn`).

Use the **far printed terminus** on trains leaving a node. Use **Arts-Loi / Kunst-Wet** only as the hub *stop string*, never as a direction token (“to City” / “to Arts-Loi” / “to Centre”). At Arts-Loi the useful pair is line + suburban (or loop) end.

Do not write D5 assertion tables until Tim locks this.

Line 2 far ends are **Simonis** and **Elisabeth** (both printed terminus boxes; neither is “the city”). Line 6 far ends are **Roi Baudouin / Koning Boudewijn** and **Elisabeth**. Line 1 far ends are **Gare de l'Ouest / Weststation** and **Stockel / Stokkel**. Line 5 far ends are **Erasme / Erasmus** and **Herrmann-Debroux**.

**There is no passenger metro 3 or 4.** No Albert–Bordet chip.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | 1 + Stockel / Stokkel; 6 + Roi Baudouin / Koning Boudewijn; 2 + Elisabeth | Matches map families and Arts-Loi blinds; splits H4 at Beekkant / Merode / Simonis | Must keep Simonis ≠ Elisabeth; bilingual terminus strings are long |
| **B. Terminus only** | Stockel / Stokkel; Elisabeth; Erasme / Erasmus | Matches some destination blinds | At Arts-Loi four numbers collapse to suburb / loop names with no family. 2 and 6 both “Elisabeth” the same way |
| **C. Inbound/outbound vs Centre + terminus** | To City / To Stockel | Close to English “centre” | False at Arts-Loi (through-cross). “City” / “Centre” / “Brussels” is not the hub lock |

## §3 examples (illustrative — not D5)

Assume model A. Locked stop string **Arts-Loi / Kunst-Wet**. Official printed termini.

### Arts-Loi / Kunst-Wet (1 × 2 × 5 × 6)

| train | label |
| --- | --- |
| 1 west | 1 + Gare de l'Ouest / Weststation |
| 1 east | 1 + Stockel / Stokkel |
| 5 west | 5 + Erasme / Erasmus |
| 5 east | 5 + Herrmann-Debroux |
| 2 via Madou / Rogier | 2 + Elisabeth |
| 2 via Trône / Midi | 2 + Simonis |
| 6 via Madou / Rogier | 6 + Elisabeth |
| 6 via Trône / Midi | 6 + Roi Baudouin / Koning Boudewijn |

**Arts-Loi / Kunst-Wet is not a direction token.** Do not emit “to Arts-Loi” / “to City” / “to Centre”.

### Beekkant (H4; not the lock)

1 + Stockel / Stokkel vs 1 + Gare de l'Ouest / Weststation vs 5 + Herrmann-Debroux vs 5 + Erasme / Erasmus vs 2 + Elisabeth vs 2 + Simonis vs 6 + Elisabeth vs 6 + Roi Baudouin / Koning Boudewijn. East via Étangs Noirs is 1/5; Midi via Osseghem is 2/6.

### Merode (H4)

1 + Stockel / Stokkel vs 5 + Herrmann-Debroux vs 1/5 west toward Arts-Loi / Gare de l'Ouest / Erasme.

### Simonis (H4; ≠ Elisabeth)

2 + Elisabeth (the other loop end) vs 6 + Elisabeth vs 6 + Roi Baudouin / Koning Boudewijn. Line 2 does **not** continue to Heizel. Do not emit “to Simonis” as the only chip when the train is a 6 toward Roi Baudouin.

### Elisabeth (≠ Simonis)

2 + Simonis vs 6 + Roi Baudouin / Koning Boudewijn. Not “to City”.

### Gare du Midi / Zuidstation (not the lock)

2 + Simonis / Elisabeth vs 6 + Roi Baudouin / Elisabeth. Tram 4/10/51/81/82 and SNCB are **out of this city**.

## Open §3 questions for Tim

1. Spoken/printed line token: map square `1` vs `Metro 1` vs `M1`. Rec: **{1, 2, 5, 6} + official FR/NL terminus**.
2. Hub far-end string: never “City” / “Centre” / “Brussels” / “Arts-Loi”. Lock **Arts-Loi / Kunst-Wet** as the stop; directions always the printed terminus.
3. Bilingual terminus string: rec the locked FR / NL pair (`Stockel / Stokkel`, not Stokkel alone). Boards that print one language are a rename.
4. Line 2 chips: rec **Simonis** and **Elisabeth** as the two ends — do not invent “via Midi” / “via Rogier” as a third family unless testers need it.
5. Whether testers see brussels as its own city picker (yes — do not invent city=bru / bruxelles / stib).
6. Whether boards at Arts-Loi still show a Centre-shaped “to City” (they should not — metro chips are the four printed ends plus the two loop ends).
