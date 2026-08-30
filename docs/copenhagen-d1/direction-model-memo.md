# Copenhagen direction model memo (§3 for Tim)

Three operators, three direction conventions. Do not collapse them into one token scheme — that is
exactly the mistake this memo exists to prevent, especially at Nordhavn where six-vs-five is a live
correction (see hazard-pack.md H2).

## 1. Metro (M1–M4) — line + terminus, except M3

**M1, M2, M4 are linear** — recommend **line + terminus**, matching the pattern already used in
every other city pack (Oslo, Malmö):

- `M1 + Vestamager` / `M1 + Vanløse`
- `M2 + Lufthavnen` / `M2 + Vanløse`
- `M4 + Orientkaj` / `M4 + København S`

**M3 is a true ring (Cityringen) — no linear terminus exists.** Sourced from Nørrebro's own
`Adjacent stations` table, which labels its two M3 neighbours "clockwise" and "counter-clockwise",
not by suburb name. Recommend:

- `M3 + Clockwise` / `M3 + Counter-clockwise` (or the Danish "med uret" / "mod uret" if Tim wants
  printed-Danish parity — flag for Tim, not decided here)

Do **not** invent a fake M3 terminus pair (e.g. "M3 + København H") — the ring has no such printed
concept, unlike Oslo's line 5 (which is a loop-then-spur with real spur termini). This is a
different topology from every other doNotGroup ring case in the existing packs; don't reuse the
Oslo line-5 recipe here.

**Kongens Nytorv** is the hub lock (all four lines, Metro-only). Never a direction token, only the
stop string — same rule as Oslo's Stortinget.

## 2. S-tog — line letter + terminus pair, scoped to the four shared stations only

V1 scope (oracle report + hazard-pack H1) is **Nørreport, Nørrebro, København H, Nordhavn only** —
not the full S-tog network. `stations[]` for each S-tog line entry in `published-network.json`
lists just the shared stations that line actually calls, not the whole corridor (same pattern as
Oslo's Vy/Flytoget scoping).

Recommend **line letter + official terminus**, matching the S-train livery/signage convention
(each line has one colour + one letter, destination boards show the far-end station):

| line | termini (full route) | short-turn / schedule note | calls at (in-catalog) |
| --- | --- | --- | --- |
| A | Hillerød ↔ Køge | daytime mostly short-turns Hundige (every 2nd extended Solrød Strand); evening runs through to Køge | Nørreport, København H, Nordhavn |
| B | Farum ↔ Høje Taastrup | — | Nørreport, København H, Nordhavn |
| Bx | Buddinge ↔ Høje Taastrup | peak hours only (own service letter, not a Helsfyr-style overlay) | Nørreport, København H, Nordhavn |
| C | Klampenborg ↔ Frederikssund | — | Nørreport, København H, Nordhavn |
| E | Holte ↔ Køge | Mon–Fri only | Nørreport, København H, Nordhavn |
| H | Frederikssund ↔ Østerport | **does not reach Nordhavn** — see correction below | Nørreport, København H **only** |
| F | Hellerup ↔ København S (Ny Ellebjerg) | Ring Line, all-day | Nørrebro **only** |

Example chips: `A + Hillerød`, `A + Køge`, `B + Farum`, `Bx + Buddinge`, `C + Klampenborg`,
`E + Holte` (weekday only), `H + Frederikssund`, `F + Hellerup`.

### Nordhavn — the hardest case, worked in full

**Correction from the oracle report (hazard-pack.md H2): Nordhavn is served by FIVE S-tog lines
(A, B, Bx, C, E), not six.** Line H stopped calling at Nordhavn in 2017 (moved to line B's routing)
— sourced from both Nordhavn's own infobox/adjacent-stations table (lists only A/B/Bx/C/E) and the
H line's own Wikipedia article, which explicitly lists Nordhavn under "not part of this line since
2017". Nordhavn's page has a stale prose sentence that still says "A, H, B, C, and E" — that prose
contradicts the page's own infobox and the H article; do not use it.

Nordhavn has **2 island platforms** (1 for S-train — all five lines share it, 1 for Metro M4) and
**6 tracks** (2 S-train, 2 Metro, **2 non-stop Kystbanen** — DSB/Öresundståg trains run through on
separate tracks without stopping, so they never appear on this board at all, not even as an
excluded row).

All five S-tog lines share the **same immediate neighbours** at Nordhavn — Svanemøllen one way,
Østerport the other — confirmed directly from Nordhavn's `Adjacent stations` table:

| line | towards Svanemøllen (this direction) | towards Østerport (this direction) |
| --- | --- | --- |
| A | Hillerød | Hundige (weekday) / Køge (Sat–Sun) |
| B | Farum | Høje Taastrup |
| Bx | Buddinge (peak only) | *(same platform group as B; Bx doesn't run the Østerport-ward leg past Nordhavn as a distinct signed direction — table shows Bx paired with B's Høje Taastrup row)* |
| C | Klampenborg | Frederikssund |
| E | Holte (Mon–Fri) | Køge (Mon–Fri) |

Board rule at Nordhavn: **one shared S-tog island platform, five lines, each keeping its own line
letter as the primary distinguishing token** — never collapse to "towards Svanemøllen" /
"towards Østerport" alone, since that loses which line (and which of that line's two termini) a
service actually is. The chip is always **line + far terminus**, e.g. `C + Klampenborg`,
`E + Holte`, never a bare compass/neighbour-station direction. This is the six-lines-collapsed-to-a-
token-scheme failure mode flagged in the task brief — the fix is: don't collapse at all, keep all
five line identities distinct on every departure row.

doNotGroup at Nordhavn: **S-tog board (5 lines, 1 island platform) vs M4 board (1 island platform)**
— two-way, not three-way (no DSB/Öresundståg row here; Kystbanen tracks don't stop).

### Nørreport — six S-tog lines, wider than the oracle report scoped

Nørreport's infobox lists all six letters (A, B, Bx, C, E, H) plus M1, M2, plus the Boulevard Line
(S-tog trunk) — this is the **widest** doNotGroup surface of the four shared stations, wider than
the oracle report's "S-tog C line" framing implied. Also has a DSB/Kystbanen island platform
(operators listed: DSB, Skånetrafiken, Metro Service A/S) — Skånetrafiken's presence is the
Öresundståg tell (Skånetrafiken co-brands Öresundståg), confirmed independently by København H's
`Adjacent stations` table showing Öresundståg's four route-lines with Nørreport as a named call
point (`left: Nørreport, right: Ørestad`).

doNotGroup at Nørreport: **Metro (M1, M2) vs S-tog (A, B, Bx, C, E, H) vs DSB/Öresundståg
(Kystbanen platform)** — three-way.

### København H — confirmed six S-tog lines, widest multi-operator surface

Matches the oracle report. `Adjacent stations` table confirms all six S-tog letters with
`Vesterport`/`Dybbølsbro` as shared immediate neighbours (same "single shared platform, keep the
line letter" rule as Nordhavn applies here too, just with six lines instead of five and two
neighbour stations that are themselves in-catalog... **no**, Vesterport and Dybbølsbro are **not**
in the four named shared stations and are not being added to this catalog — they're just the
S-tog's own next stops either side of København H, mentioned here only to confirm the six-line
membership, not as new catalog rows).

DSB/InterCity/Öresundståg at København H use **no line code** (unlike Metro/S-tog) — direction is
**service type + destination**:

- `Regionaltog + <destination>` (Valby, København S, Høje Taastrup, Ringsted — observed via the
  station's own adjacent-stations data)
- `InterCity + <destination>` (Valby, København S, Ringsted)
- `InterCityLyn + <destination>` (Copenhagen Airport, Odense)
- `Öresundståg + <destination>` (Lund, Gothenburg, Kalmar, Karlskrona — via Nørreport → Ørestad,
  i.e. Öresundståg also calls Nørreport, not just København H — add to Nørreport's DSB/Öresundståg
  group too)
- `EuroCity` — **excluded** (`out-reservation`, oracle report verdict). Never render.
- **SJ (Stockholm) and České dráhy (Prague)** — observed calling at København H in the source data
  but **not board-eligibility-verdicted**. Do not render either way until Nico/Tim rules. See
  hazard-pack.md H3.

doNotGroup at København H: **Metro (M3, M4) vs S-tog (A,B,Bx,C,E,H) vs DSB/Öresundståg
(Regionaltog/InterCity/InterCityLyn/Öresundståg) vs EuroCity (excluded, never rendered)** — four
board groups where three are live.

### Nørrebro — simplest case, two-way

**F (Ring Line) + M3 only.** No DSB, no other S-tog line. `F + Hellerup` / `F + København S`.
doNotGroup: Metro (M3, clockwise/counter-clockwise per §1) vs S-tog (F, line + terminus per §2).

## 3. DSB / Öresundståg — service type + destination, never a line code

Unlike Metro and S-tog, DSB regional/InterCity trains have **no passenger-facing line code** —
Wikipedia's internal route identifiers (`R51`, `ICCphEs`, etc.) are template/editorial shorthand,
not printed anywhere a rider would see them. Direction chips must be **service type + destination**
(see the København H table above). Öresundståg is nominally a fourth "operator" in the oracle
report's language but shares DSB's boarding-contract verdict (`in`, no compulsory reservation) and
the same direction convention (type + destination, using the printed corridor name as the
destination, e.g. "Öresundståg + Lund").

## Open §3 questions for Tim

1. **M3 direction token**: `Clockwise`/`Counter-clockwise` in English, or the Danish "med uret"/
   "mod uret"? No printed passenger-facing English convention found in sources — Wikipedia's own
   label is the only precedent captured here.
2. **S-tog A's short-turn handling**: fixed "Hillerød ↔ Køge" chip pair with Hundige/Solrød Strand
   as metadata (Oslo Helsfyr pattern), or per-trip far-end from the live feed? Recommend the fixed
   pair for D1/D5 lock, per-trip overlay at D2+ (same open question Malmö's pack left for its ring
   line).
3. **SJ Stockholm / České dráhy Prague at København H**: in scope or out? Not decided here — needs
   a board-eligibility verdict from Nico, added to the oracle report or the Denmark ledger, before
   Jim can filter for it either way.
4. **Öresundståg at Nørreport**: confirmed calls there (this memo, §2 København H section) but the
   oracle report's Board eligibility table only lists København H as Öresundståg's in-catalog stop.
   Recommend extending the `in` verdict to Nørreport too (same service, same boarding contract,
   just an earlier stop on the same route) — but this is a scope call for Tim, not assumed here.
5. **Regionaltog/InterCity destination list completeness**: the destinations listed above
   (Valby, København S, Høje Taastrup, Ringsted, Odense) come from one station's `Adjacent stations`
   snapshot, not a full DSB timetable — treat as indicative, not exhaustive, same caveat Malmö's
   pack applied to its short-turn lists.
