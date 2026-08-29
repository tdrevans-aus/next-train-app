# Helsinki direction model memo (§3 for Tim)

Context **today (29 Aug 2026)**: **through trunk**, not a single hub-and-spoke. Official HSL trunk copy and Tervetuloa titles talk **M1 Kivenlahti-Vuosaari**, **M2 Tapiola-Mellunmäki**, not “to City” / “to Helsinki” / “to Helsingin keskusta”.

Inbound/outbound vs City already dies at **Rautatientori** (both lines through), **Kamppi** (same plus bus terminal), **Helsingin yliopisto** (same), **Tapiola** (M1 continues west; M2 ends), and **Itäkeskus** (M1 Vuosaari vs M2 Mellunmäki).

## Recommendation

**Line + terminus** (example: `M1 + Kivenlahti`, or `M2 + Mellunmäki`).

Use the **official HSL terminus** on trains leaving a node. Use **Rautatientori** only as the hub *stop string*, never as a direction token (“to City” / “to Helsinki” / “to Central Railway Station”). At Rautatientori the useful pair is line + suburban end.

Do not write D5 assertion tables until Tim locks this.

The pack prompt’s chips are **line + official terminus**, not compass, not “to City”. D1 locks sheet strings: **Kivenlahti**, **Vuosaari**, **Tapiola**, **Mellunmäki**. **Matinkylä** is a former west end, not a chip. **Helsingin keskusta** is not a chip.

**There is no passenger M3.** No Itämetro chip.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | M1 + Kivenlahti; M2 + Mellunmäki | Matches HSL trunk titles and destination blinds; splits H4 at Rautatientori / Tapiola / Itäkeskus | Must not collapse Matinkylä (stop, former end) into a fifth chip |
| **B. Terminus only** | Kivenlahti; Vuosaari; Tapiola; Mellunmäki | Matches some blinds | At Rautatientori two lines collapse to suburb names with no family |
| **C. Inbound/outbound vs City + terminus** | To City / To Kivenlahti | Close to English “centre” | False at Rautatientori (through-trunk). “City” / “Helsingin keskusta” is the map blob, not the hub lock |

## §3 examples (illustrative — not D5)

Assume model A. Locked stop string **Rautatientori**. Official HSL termini.

### Rautatientori (both lines)

| train | label |
| --- | --- |
| M1 west | M1 + Kivenlahti |
| M1 east | M1 + Vuosaari |
| M2 west | M2 + Tapiola |
| M2 east | M2 + Mellunmäki |

VR / HSL commuter at Helsinki Central is **out of this city**. Inbound/outbound does not work (every line both ways is not “to City”). “To Central Railway Station” is false as a metro direction.

### Kamppi (H4; metro + bus terminal)

Same four chips as Rautatientori. **Kamppi bus terminal is a different mode.** doNotGroup.

### Helsingin yliopisto

Same four chips. Not a lock.

### Tapiola (H4)

M1 + Kivenlahti vs M1 + Vuosaari vs M2 + Mellunmäki. M2 does not continue west of here. Terminus-only is enough for the M2 west end; keep the line token so M1 west is not “to Tapiola”.

### Itäkeskus (H4)

M1 + Vuosaari vs M2 + Mellunmäki vs M1 + Kivenlahti vs M2 + Tapiola. Not “to City”. First-train change-for-Mellunmäki is an overlay.

## Open §3 questions for Tim

1. Spoken/printed line token: map / trunk `M1` vs `Metro M1` vs `Linja M1`. Rec: **{M1, M2} + official HSL terminus**.
2. Hub far-end string: never “City” / “Helsinki” / “Helsingin keskusta” / “Central Railway Station”. Lock **Rautatientori** as the stop; directions always the official suburban terminus.
3. M1 western string: sheet `Kivenlahti` vs stale index `Matinkylä`. Rec: **passenger sheet terminus**; Matinkylä is a stop only.
4. M2 western string: sheet `Tapiola`, not Matinkylä, not “to City”.
5. Whether testers see helsinki as its own city picker (yes — do not bury under a Finland / HSL / VR city).
6. Whether boards at Rautatientori still show a Central-Railway-Station-shaped “to City” (they should not — metro chips are the suburban ends; rail is out of this city).
