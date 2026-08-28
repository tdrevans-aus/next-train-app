# Rotterdam direction model memo (§3)

Context **today (28 Aug 2026)**: five RET metro letters **A–E**. All five call at **Beurs**. Direction is **line + terminus**, not compass, not inbound/outbound vs CBD.

Printed termini:

| line | termini |
| --- | --- |
| Metro A | Binnenhof – Schiedam Centrum |
| Metro B | Nesselande – Hoek van Holland Strand |
| Metro C | De Terp – De Akkers |
| Metro D | Rotterdam Centraal – De Akkers |
| Metro E | Den Haag Centraal – Slinge |

A does **not** go to Nesselande. B does. Strand is in (distinct from Haven).

## Recommendation

**Line + terminus** (example: `Metro A + Binnenhof`, `Metro E + Den Haag Centraal`).

Use the **opposite printed terminus** on each line that serves the station. At a terminus, omit that end.

Do not label inbound/outbound. Do not use compass. Do not collapse C and D both as “De Akkers” without the line token.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | Metro A + Binnenhof | Matches map; splits A vs B at Graskruid/Alexander; splits C vs D at De Akkers; keeps E Hague stop on rotterdam | Longer chips at Beurs (ten ends) |
| **B. Terminus only** | Binnenhof; Nesselande | Shorter | At Beurs five lines share the well; A vs B east is lost |
| **C. Inbound/outbound vs CBD** | To Beurs / from Beurs | Beurs is the hub | False at Beurs itself; D/E run north–south through Beurs |

## §3 examples (illustrative)

Assume model A. Locked hub **Beurs**.

### Beurs (all five)

| train | label |
| --- | --- |
| A | Metro A + Binnenhof / Metro A + Schiedam Centrum |
| B | Metro B + Nesselande / Metro B + Hoek van Holland Strand |
| C | Metro C + De Terp / Metro C + De Akkers |
| D | Metro D + Rotterdam Centraal / Metro D + De Akkers |
| E | Metro E + Den Haag Centraal / Metro E + Slinge |

### Rotterdam Centraal (D terminus, E through)

Metro D + De Akkers. Metro E + Den Haag Centraal / Metro E + Slinge. No A/B/C. NS platforms are out of this city.

### Graskruid (A/B junction)

Metro A + Binnenhof / Metro A + Schiedam Centrum. Metro B + Nesselande / Metro B + Hoek van Holland Strand. A chips must not say Nesselande.

### Hoek van Holland Strand (B terminus)

Metro B + Nesselande. Do not swap with Haven.
