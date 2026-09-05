# Prague direction model memo (§3 for Tim)

Context **today (6 Sep 2026)**: Prague Metro A/B/C are three straight-through trunk lines, each with
two fixed printed termini — **no inner-ring loop** (unlike Brussels' 2/6) and **no single station
that sees all three lines** (unlike Brussels' Arts-Loi cross or Copenhagen's Kongens Nytorv hub).
The interchange structure is a **triangle**: Muzeum (A × C), Můstek (A × B), Florenc (B × C). Per
this task's instruction, the hub lock is **Muzeum**.

Line A: **Nemocnice Motol – Depo Hostivař** (17 stations). Line B: **Zličín – Černý Most** (24
stations, longest). Line C: **Letňany – Háje** (20 stations, oldest, opened 1974).

## Recommendation

**Line + terminus** (example: `A + Depo Hostivař`, `C + Letňany`), matching the pattern recommended
for Brussels and Copenhagen. Use the printed far terminus for trains leaving a node. Use **Muzeum**
only as the hub *stop string*, never as a direction token ("to City" / "to Muzeum" / "to Centre").

Because each line is a simple through-trunk with exactly two ends and no loop, this is a much
simpler case than Brussels: there is no compass-heading collapse to solve, and no line splits into
branches partway (no Beekkant/Merode-style fork was reported). The only direction-model hazard is
the **triangle of interchanges** — riders changing lines at Muzeum, Můstek, or Florenc must see the
correct *other* line's two termini, not a generic "change here" chip, and the three nodes must never
be merged into one hub string.

Do not write D5 assertion tables until Tim locks this.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | `A + Depo Hostivař`; `B + Zličín`; `C + Háje` | Matches official line-page framing (line + terminus pair per oracle H2); simple two-end trunks make this unambiguous | Bilingual/diacritic strings must be typed exactly (see hazard pack); no shortening without losing line identity |
| **B. Terminus only** | `Depo Hostivař`; `Zličín`; `Háje` | Shorter | At Muzeum, Můstek, Florenc a terminus-only chip loses the line identity a rider needs to pick the right platform (e.g. at Můstek, "Zličín" alone doesn't say line B) |
| **C. Inbound/outbound vs Centre + terminus** | "To City" / "To Depo Hostivař" | Familiar English framing | No official "to Centre" concept on PID maps; false at Muzeum/Můstek/Florenc since none is a single, all-lines "city centre" node the way some systems have one |

## §3 examples (illustrative — not D5)

Assume model A. Hub lock **Muzeum**. Official printed termini per line.

### Muzeum (A × C — the hub lock)

| train | label |
| --- | --- |
| A toward Nemocnice Motol | A + Nemocnice Motol |
| A toward Depo Hostivař | A + Depo Hostivař |
| C toward Letňany | C + Letňany |
| C toward Háje | C + Háje |

**Muzeum is not a direction token.** Do not emit "to Muzeum" / "to City" / "to Centre." Line B does
**not** call at Muzeum — do not show B chips here.

### Můstek (A × B; doNotGroup vs Muzeum)

| train | label |
| --- | --- |
| A toward Nemocnice Motol | A + Nemocnice Motol |
| A toward Depo Hostivař | A + Depo Hostivař |
| B toward Zličín | B + Zličín |
| B toward Černý Most | B + Černý Most |

Line C does **not** call at Můstek.

### Florenc (B × C; doNotGroup vs Muzeum and Můstek)

| train | label |
| --- | --- |
| B toward Zličín | B + Zličín |
| B toward Černý Most | B + Černý Most |
| C toward Letňany | C + Letňany |
| C toward Háje | C + Háje |

Line A does **not** call at Florenc.

## Open §3 questions for Tim

1. Spoken/printed line token: map letter `A`/`B`/`C` vs "Metro A" vs "Line A". Rec: **{A, B, C} +
   official terminus** (single letter, matching PID's own line lettering — no numeral system here,
   unlike Brussels' 1/2/5/6).
2. Hub far-end string: never "City" / "Centre" / "Muzeum" as a direction. Lock **Muzeum** as the
   stop; directions always the printed terminus.
3. Diacritic form: rec the full-diacritic official form (`Můstek`, not `Mustek`; `Náměstí Míru`,
   not `Namesti Miru`). Confirm PID GTFS `stop_name` matches before D5 (see hazard pack).
4. Whether testers see prague as its own city picker (yes — do not invent city=praha / pida / pid).
5. Whether any A/B/C service is a short-turn/partial route not running end to end (oracle report
   silent on this — flagged as a hazard-pack gap, verify at D2 before assuming `shortTurns: []`
   holds for the live product, not just this pack).
