# Oslo direction model memo (§3 for Tim)

Context **today (29 Aug 2026)**: **through Common Tunnel**, not a single hub-and-spoke. Official Ruter folder titles talk **1 Frognerseteren - Bergkrystallen**, **2 Østerås - Ellingsrudåsen**, **3 Kolsås - Mortensrud**, **4 Vestli - Bergkrystallen**, **5 Sognsvann - Vestli**, not “to City” / “to Oslo” / “to Sentrum”.

Inbound/outbound vs City already dies at **Stortinget** (all five lines through; line 5 both ways on one trip), **Jernbanetorget** (same plus Oslo S), **Nationaltheatret** (same plus railway), **Majorstuen** (four western branches + ring), **Carl Berners plass** (line 5 ring vs Vestli), and **Økern** (line 4 Løren vs line 5 Hasle).

## Recommendation

**Line + terminus** (example: `1 + Frognerseteren`, or `2 + Ellingsrudåsen`, or `5 + Vestli`).

Use the **official Ruter folder terminus** on trains leaving a node. Use **Stortinget** only as the hub *stop string*, never as a direction token (“to City” / “to Oslo” / “to Sentrum”). At Stortinget the useful pair is line + suburban end.

Do not write D5 assertion tables until Tim locks this.

**Scope update (30 Aug 2026):** Vy regional/commuter rail and Flytoget airport express are now `in` at Jernbanetorget and Nationaltheatret per Tim's board-eligibility decision (see the oracle report's Board eligibility section and the dedicated section below). They use the same line + official terminus convention as T-bane, in their own `Vy` / `Flytoget` mapGroups, doNotGroup against T-bane and against each other.

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

## Vy regional/commuter rail and Flytoget (added 30 Aug 2026 — Tim's board-eligibility decision)

Per the oracle report's Board eligibility section, Vy regional/commuter rail and Flytoget are now `in` at **Jernbanetorget** and **Nationaltheatret** only (not the full corridor — the oracle report gives boarding-contract evidence and official terminus pairs for these two stations, not stop-level data for the rest of each route). Same **line + official terminus** convention as T-bane, using the terminus pairs printed in the oracle report's route descriptions:

| line | official terminus pair | source line in oracle report |
| --- | --- | --- |
| Vy RE10 | Drammen ↔ Lillehammer (Dovrebanen) | "Drammen–Oslo S–Lillehammer" |
| Vy RE11 | Skien ↔ Eidsvoll (Vestfoldbanen) | "Skien–Oslo S–Eidsvoll" |
| Vy R12 | Kongsberg ↔ Eidsvoll (Gardermobanen) | "Kongsberg–Oslo S–Eidsvoll" |
| Vy R13 | Drammen ↔ Dal (Hovedbanen) | "Drammen–Dal" |
| Vy R14 | Asker ↔ Kongsvinger (Kongsvingerbanen) | "Asker–Oslo S–Kongsvinger" |
| Vy R21 | Oslo S ↔ Moss (Østfoldbanen western line) | "Oslo S–Moss" |
| Vy L1 | Spikkestad ↔ Lillestrøm (Hovedbanen) | "Spikkestad–Lillestrøm via Oslo S" |
| Vy L2 | Stabekk ↔ Ski (Østfoldbanen) | "Stabekk–Ski" |
| Flytoget FLY1 | Drammen ↔ Oslo Airport (Dovrebanen) | "Drammen–Oslo Airport" |
| Flytoget FLY2 | Stabekk ↔ Oslo Airport (Østfoldbanen) | "Stabekk–Oslo Airport" |

Example chips at Jernbanetorget / Nationaltheatret (same pattern as `1 + Frognerseteren`):

- `RE10 + Drammen` / `RE10 + Lillehammer`
- `RE11 + Skien` / `RE11 + Eidsvoll`
- `R12 + Kongsberg` / `R12 + Eidsvoll`
- `R13 + Drammen` / `R13 + Dal`
- `R14 + Asker` / `R14 + Kongsvinger`
- `R21 + Moss` (outbound only — see flag below)
- `L1 + Spikkestad` / `L1 + Lillestrøm`
- `L2 + Stabekk` / `L2 + Ski`
- `FLY1 + Drammen` / `FLY1 + Oslo Airport`
- `FLY2 + Stabekk` / `FLY2 + Oslo Airport`

**Flag — R21's own terminus is Oslo S.** R21 runs Oslo S–Moss; at Jernbanetorget (the D1 string for the Oslo S cluster) a train signed toward Oslo S is the train arriving, not a valid outbound direction chip — same self-referential-hub problem already solved for T-bane at Stortinget (§ above: "never a direction token"). Rec: only `R21 + Moss` appears as an outbound chip at Jernbanetorget/Nationaltheatret; do not synthesize `R21 + Oslo S` as a direction.

**Flag — call order between Jernbanetorget and Nationaltheatret not sourced.** The oracle report's Board eligibility table lists "Jernbanetorget, Nationaltheatret" for Vy rows and "Nationaltheatret, Jernbanetorget" for Flytoget rows — this reads like table-authoring order, not a sourced stop sequence. `published-network.json` lists both stations for each Vy/Flytoget line without asserting which is called first; Jim should not infer a sequence from array order. Flagging back rather than guessing a station graph the oracle report doesn't give (the report scopes Vy/Flytoget only to these two stations, not the rest of each corridor).

**doNotGroup unchanged in kind, now three-way:** Jernbanetorget and Nationaltheatret both host T-bane (mapGroup `T-bane`) + Vy (mapGroup `Vy`) + Flytoget (mapGroup `Flytoget`) as three separate platform/board sections. Same **Stortinget-is-the-only-T-bane-hub-lock** rule as before — Vy/Flytoget do not get a "hub lock" string of their own in this pack; they are only in-scope at these two named stations.

## Open §3 questions for Tim

1. Spoken/printed line token: map / folder `1` vs `T-bane 1` vs `Linje 1`. Rec: **{1–5} + official Ruter terminus**.
2. Hub far-end string: never “City” / “Oslo” / “Sentrum” / “Oslo S”. Lock **Stortinget** as the stop; directions always the official suburban terminus.
3. Line 1 eastern string: folder `Bergkrystallen` vs short-turn `Helsfyr`. Rec: **passenger folder terminus**; Helsfyr only if a specific trip is signed that way (overlay).
4. Line 5 string: folder pair `Sognsvann` / `Vestli` vs marketing `Ringen`. Rec: **passenger folder**; Ringen is the path, not a chip.
5. Whether testers see oslo as its own city picker (yes — do not bury under a Norway / Ruter / Vy city).
6. Whether boards at Jernbanetorget still show an Oslo S-shaped “to City” (they should not — T-bane chips are the suburban ends; rail is out of this city).
