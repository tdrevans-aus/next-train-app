# Gold Coast direction model memo (§3 for Tim)

Context **today (27 Aug 2026)**: **single line**. G:link / **L1** runs **Helensvale – Burleigh Heads** (Stage 3 open 9 Aug 2026). Official frequency table talks Helensvale ↔ Burleigh Heads. There is no branch and no city loop.

Helensvale is a **mode interchange** with QR, not a through-run onto the tram. Broadbeach South is no longer a terminus.

Inbound/outbound vs CBD does not apply (there is no single CBD stop).

## Recommendation

**Line + terminus** (example: `G:link + Burleigh Heads`, or `L1 + Helensvale`).

Use **Burleigh Heads** on services leaving Helensvale. Use **Helensvale** (not Helensvale station, not GCUH) on services arriving at the rail interchange. At Broadbeach South / Surfers Paradise the useful pair is still line + far end (only one line).

Do not write D5 assertion tables until Tim locks this.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | G:link + Burleigh Heads; L1 + Helensvale | Matches map; splits Helensvale tram vs QR; survives further southern extension | Official UI mixes G:link and L1 |
| **B. Terminus only** | Burleigh Heads; Helensvale | Matches destination blinds | At Helensvale a QR train is also “not Burleigh” — need the line token |
| **C. Inbound/outbound vs CBD + terminus** | To Surfers / To Helensvale | Surfers is a midpoint, not a terminus | False at Cavill Avenue. No CBD lock |

## §3 examples (illustrative — not D5)

Assume model A. Locked interchange string **Helensvale**.

### Helensvale (rail hub)

| train | label |
| --- | --- |
| L1 | G:link + Burleigh Heads |

QR Gold Coast line at the same parent is **out of this city**.

### Broadbeach South

G:link + Helensvale vs G:link + Burleigh Heads.

### Cavill Avenue / Surfers Paradise

Same pair. Do not label “to City”.

### After a future Stage 4 (preview only — not D1)

Only if a new official tram map shows Gold Coast Airport / Palm Beach **in service**. Then the southern terminus token changes; that is a **new D1**.

## Open §3 questions for Tim

1. Spoken/printed line token: `G:link` (tram PDF) vs `L1` (Translink / GTFS) vs `Helensvale – Burleigh Heads`. Rec: **G:link / L1 + terminus**.
2. Helensvale string: map `Helensvale` vs GTFS `Helensvale station`.
3. Whether testers see gold-coast as its own city picker (yes — do not bury under Brisbane).
