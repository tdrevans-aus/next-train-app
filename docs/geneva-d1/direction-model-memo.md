# Geneva direction model memo (§3 for Tim)

Context: all five TPG tram lines (12, 14, 15, 17, 18) are reported and transcribed as single
**linear** lines, terminus to terminus — no loop, no ring (unlike Copenhagen's M3, unlike Brussels'
2/6 inner loop). Termini, per the oracle report's transcription:

| line | terminus A | terminus B | stop count |
| --- | --- | --- | --- |
| 12 | Lancy-Bachet, gare | Thônex, Moillesulaz | 25 |
| 14 | Bernex, Vailly | Meyrin, Gravière | 30 |
| 15 | Genève, Nations | Plan-les-Ouates, ZIPLO | 23 |
| 17 | Lancy-Pont-Rouge, gare | Annemasse, Parc Montessuit (France) | 26 |
| 18 | Grand-Lancy, Palettes | Meyrin, CERN | 31 |

## Recommendation

**Line + terminus**, matching the pattern used across this pipeline (Brussels, Zürich's provisional
recommendation, Lausanne, Malmö, Oslo): each line is a printed number (`12`, `14`, `15`, `17`,
`18`) paired with its far printed terminus.

- 12 southeast (toward Thônex): `12 + Thônex, Moillesulaz`
- 12 northwest (toward Lancy): `12 + Lancy-Bachet, gare`
- 14 northeast (toward Meyrin): `14 + Meyrin, Gravière`
- 14 southwest (toward Bernex): `14 + Bernex, Vailly`
- 15 southeast (toward Plan-les-Ouates): `15 + Plan-les-Ouates, ZIPLO`
- 15 northwest (toward Nations): `15 + Genève, Nations`
- 17 northeast (toward Annemasse, France): `17 + Annemasse, Parc Montessuit`
- 17 southwest (toward Lancy): `17 + Lancy-Pont-Rouge, gare`
- 18 northwest (toward Meyrin/CERN): `18 + Meyrin, CERN`
- 18 southeast (toward Grand-Lancy): `18 + Grand-Lancy, Palettes`

**Cornavin is the hub lock and must never be a direction token.** Do not emit "to Cornavin" / "to
City" / "to Centre" / "to Genève" as a generic direction chip at any station. Per hazard-pack.md
H4/H6, Cornavin's own recomputed line set is 14, 15, 18 (not 12 or 17) — the direction model below
only lists Cornavin as an interchange note on those three lines.

## The Moillesulaz asymmetry — a direction-model hazard, not a normal interchange

**Thônex, Moillesulaz is called by both line 12 and line 17, but plays a different role on each:**

- On **line 12**, Moillesulaz is a **terminus** (`12 + Thônex, Moillesulaz` is a valid, final
  direction label; a tram signed for Moillesulaz on line 12 stops there).
- On **line 17**, Moillesulaz is a **through-station**, not a terminus — the line continues past it
  into France (Gaillard, Ambilly, Annemasse). A line 17 tram passing Moillesulaz is never signed
  "17 + Thônex, Moillesulaz"; it is signed for its actual terminus, `17 + Annemasse, Parc
  Montessuit`.

Do not build a shared "Moillesulaz" direction-label helper that assumes the same station name means
the same thing on both lines — it doesn't. This is the reverse of a normal hub (where the hub name
itself is excluded as a direction token); here the same *non-hub* station name has two different
direction-model roles depending on line. Flag this explicitly to Jim before any line-map generation
touches Moillesulaz.

## §3 examples (illustrative — not D5)

### Cornavin (gare Cornavin) — lines 14, 15, 18 by recount (H4); doNotGroup vs Léman Express/SBB

| train | label |
| --- | --- |
| 14 toward Meyrin | 14 + Meyrin, Gravière |
| 14 toward Bernex | 14 + Bernex, Vailly |
| 15 toward Plan-les-Ouates | 15 + Plan-les-Ouates, ZIPLO |
| 15 toward Nations | 15 + Genève, Nations |
| 18 toward Meyrin/CERN | 18 + Meyrin, CERN |
| 18 toward Grand-Lancy | 18 + Grand-Lancy, Palettes |

Léman Express and SBB mainline trains calling at the co-located rail station are `out-product`
(Léman Express) or out-of-scope entirely (SBB long-distance/S-Bahn) and must appear, if at all, on
a wholly separate board — never merged with the tram board at Cornavin (H1 doNotGroup).

### Genève-Eaux-Vives, gare — lines 12, 17; doNotGroup vs Léman Express/CEVA

| train | label |
| --- | --- |
| 12 toward Thônex/Moillesulaz | 12 + Thônex, Moillesulaz |
| 12 toward Lancy | 12 + Lancy-Bachet, gare |
| 17 toward Annemasse (France) | 17 + Annemasse, Parc Montessuit |
| 17 toward Lancy-Pont-Rouge | 17 + Lancy-Pont-Rouge, gare |

Léman Express/CEVA underground station shares the address; walk-up boardable and `in` on the
eligibility table but a separate operator/platform — doNotGroup (H1).

### Thônex, Moillesulaz — lines 12 (terminus), 17 (through-station, crosses into France)

| train | label |
| --- | --- |
| 12 arriving/terminating | 12 + Thônex, Moillesulaz |
| 12 departing (only direction back) | 12 + Lancy-Bachet, gare |
| 17 continuing into France | 17 + Annemasse, Parc Montessuit |
| 17 returning toward Lancy | 17 + Lancy-Pont-Rouge, gare |

See the asymmetry note above — never surface "17 + Thônex, Moillesulaz" as a direction label; it is
not a terminus on that line.

### Lancy-Pont-Rouge (two named tram stops: "gare" and "gare/Étoile") — lines 15, 17; doNotGroup vs Léman Express

| train | label |
| --- | --- |
| 15 toward Plan-les-Ouates | 15 + Plan-les-Ouates, ZIPLO |
| 15 toward Nations | 15 + Genève, Nations |
| 17 toward Annemasse (France) | 17 + Annemasse, Parc Montessuit |
| 17 arriving/terminating at Lancy-Pont-Rouge, gare | 17 + Lancy-Pont-Rouge, gare |

Line 17's own terminus is the plain "Lancy-Pont-Rouge, gare" stop (its own transcribed array's
first entry); "Lancy-Pont-Rouge, gare/Étoile" is the next stop up the line, shared with line 15.
Do not collapse these two adjacent, similarly-named stops into one node (H1) — and note the
co-located Léman Express Lancy-Pont-Rouge station is doNotGroup'd against both.

## What is NOT known yet (open questions — no guesses made)

1. **Short turns.** Not checked at all on any of the five lines — no confirmation either way of
   peak-only short-workings. Do not assume `shortTurns: []` means "verified none"; it means "not
   checked" (see hazard-pack.md H5).
2. **Printed line-token convention.** No evidence in the oracle report of how TPG prints the line
   badge on vehicles/boards beyond the bare number (12, 14, 15, 17, 18) — assumed to match the line
   names in the report itself, not independently checked against a live map render in this pass.
3. **Cornavin's true line set.** Hazard-pack.md H4 documents three conflicting claims in the same
   report (12/14/15 in the hub-lock prose; 14/15/17/18 in inline stop annotations; 14/15/18 by this
   pack's own recount from the transcribed arrays). This memo's direction-model examples use the
   recount (14, 15, 18) but that is not independently re-verified against the official TPG map —
   confirm before locking a line-map generator to it.
4. **French-portion GTFS-RT data quality for line 17** (Gaillard, Ambilly, Annemasse stops) is
   unconfirmed — see hazard-pack.md cross-border section. If the live feed cannot reliably serve
   trip updates for these four stops, the direction labels above are still valid as *printed* labels
   but the underlying board data for those specific stops may need a fallback/degraded-mode note at
   D2, not assumed to "just work" like the Swiss portion.
5. **Whether Cornavin's own printed name ever varies** (e.g. "Cornavin" alone vs "gare Cornavin" vs
   a French/German bilingual variant) — the oracle report transcribes it consistently as "Genève,
   gare Cornavin" on all three lines that call there; no bilingual naming variant found, unlike
   Brussels' FR/NL pairing. Not independently checked against a live map render.

## doNotGroup carried into this memo (already locked, not open)

- **Cornavin (hub, tram-only)** vs **Léman Express/SBB Genève-Cornavin** (shared address, separate
  operator/platforms).
- **Genève-Eaux-Vives, gare** vs **Léman Express Eaux-Vives / CEVA**.
- **Lancy-Pont-Rouge, gare** and **Lancy-Pont-Rouge, gare/Étoile** (two distinct tram stops, do not
  collapse into each other) vs **Léman Express Lancy-Pont-Rouge**.
- **Lancy-Bachet, gare** vs **Léman Express Lancy-Bachet**.

## Open §3 questions for Tim

1. Confirm Cornavin's true tram line set against the official TPG map before any line-map generator
   is built — three conflicting claims exist in the source report (hazard-pack.md H4); this memo
   used the recomputed one (14, 15, 18) as the least-unverified option, not as a settled answer.
2. Whether the licence-confidence and Bearer-key/rate-limit hazards (hazard-pack.md) block the D5
   assertion-table work, or only the live-feed adapter build — recommend the former can proceed off
   this pack's already-transcribed station graph, same recommendation as Lausanne, but confirm
   before Jim invests D2 effort, especially given the added French cross-border data-quality
   question on line 17.
3. Whether the Moillesulaz asymmetry (terminus on 12, through-station into France on 17) needs a
   dedicated data-model flag (e.g. a per-line `terminusRole` field) rather than relying on prose
   documentation like this memo — not decided here, flagged for Jim at D2.
4. Whether Jim should independently verify GTFS-RT coverage quality for the four French stops on
   line 17 before wiring the adapter, or ship with a documented degraded-mode fallback for that
   segment — not decided here.
