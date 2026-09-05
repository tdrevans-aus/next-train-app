# Lisbon direction model memo (§3 for Tim)

Context **today (2026-09-06)**: Lisbon Metro is **four simple point-to-point lines**, not a
cross-and-loop system like Brussels. Each line — Azul, Amarela, Verde, Vermelha — runs between
exactly two printed termini with no branches, no loop, no "via" variants, and no short-turn codes
anywhere on the official Aug 2026 network diagram. This is the easiest direction model in the
pack set so far: there is no hub-crossing ambiguity to resolve because no station on the diagram
is shared by more than two lines (see hazard-pack H4 — Lisbon's four lines form a complete graph,
each pair crossing exactly once, at six different stations).

## Recommendation

**Line + far terminus** (example: `Azul + Santa Apolónia`, `Amarela + Odivelas`).

Use the **printed terminus in the direction of travel** as the destination chip. Because no line
loops or forks, this is unambiguous everywhere on the network — including at all six interchange
stations, where the chip only needs to disambiguate *which line*, never *which branch of the same
line* (there are no branches).

| line | termini | far ends used as direction chips |
| --- | --- | --- |
| Azul (Blue) | Reboleira ↔ Santa Apolónia | `Azul + Reboleira` / `Azul + Santa Apolónia` |
| Amarela (Yellow) | Odivelas ↔ Rato | `Amarela + Odivelas` / `Amarela + Rato` |
| Verde (Green) | Telheiras ↔ Cais do Sodré | `Verde + Telheiras` / `Verde + Cais do Sodré` |
| Vermelha (Red) | São Sebastião (printed `S. Sebastião`) ↔ Aeroporto | `Vermelha + S. Sebastião` / `Vermelha + Aeroporto` |

No "to City" / "to Centre" / "to Baixa" token is needed or supported by the map — the official
diagram never abbreviates a direction to a district name; it is always the line colour plus one
of the two printed termini.

## Hub-lock decision: Marquês de Pombal (chosen) vs Alameda

The oracle report left this open for Luke: "Marquês de Pombal (Azul × Amarela) or Alameda
(Verde × Vermelha) — both are valid interchange points."

**Decision: Marquês de Pombal.** Reasons, cited against the diagram:

1. **Geography.** Marquês de Pombal sits on Praça do Marquês de Pombal at the top of Avenida da
   Liberdade — the historic geographic and civic centre of Lisbon, at the boundary of Baixa and
   the newer northern grid. Alameda is an eastern inner-suburb junction on Avenida Almirante
   Reis, further from the historic centre.
2. **Amenity/boarding-load signal on the diagram itself.** Marquês de Pombal's icon row is the
   richest on the whole map: bus, customer-care ("Espaço Cliente"), wheelchair, bike park, **and
   police** — no other station on the diagram carries all five. Alameda's icon row is bus-free:
   baby-care, wheelchair, bike only. The diagram's own amenity density is a reasonable proxy for
   the interchange the operator treats as higher-traffic.
3. **Consistency with the oracle report's own framing.** The report describes Marquês de Pombal
   first in the hub-lock sentence and calls it "the inner-city Blue/Yellow junction," matching
   its central-grid position; Alameda is described as "the inner-city Green/Red junction,"
   accurate but peripheral relative to Marquês de Pombal.

This is a naming/reference-point decision only — it does **not** function as a direction token
(see Recommendation above; directions are always line + terminus, never "to Marquês de Pombal").
Alameda remains a valid, real interchange in `stations[]` and `branches[]` — it is simply not the
station singled out in prose/UI copy as the network's inner-city reference point.

## Why this is simpler than Brussels/Copenhagen-style memos

Those cities needed a hub-lock *because* their metro/loop lines cross more than once or share a
single station across 3–4 lines (Brussels' Arts-Loi/Kunst-Wet is 1×2×5×6). Lisbon has no such
node. The hub-lock decision above exists only because the oracle report explicitly asked Luke to
pick one for reference-point purposes — not because §3 direction logic needs it. Every
interchange (Marquês de Pombal, Campo Grande, Saldanha, Baixa-Chiado, S. Sebastião, Alameda) uses
the identical **line + terminus** pattern with no special-casing.

## Open §3 questions for Tim

1. Spoken/printed line token: diagram prints line names (`Azul`, `Amarela`, `Verde`, `Vermelha`)
   under a small pictogram, never a number or letter code. Rec: **{Azul, Amarela, Verde,
   Vermelha} + official terminus**, matching the diagram exactly (no M1/M2/M3/M4 invention).
2. Terminus print form: lock **`S. Sebastião`** (diagram's abbreviated form), not `São
   Sebastião`. Confirm Tim is fine with the abbreviation surfacing on boards, or whether product
   copy should expand it while D1 data stays locked to the abbreviated string.
3. Whether boards at any of the six interchanges need a third disambiguator beyond line + far
   terminus — recommend no, since no line branches or loops (unlike Brussels' Simonis/Elisabeth
   loop-end problem).
4. Confirm hub-lock choice (Marquês de Pombal) is acceptable as the pack's inner-city reference
   point, or whether Tim prefers Alameda for a reason not visible on the diagram (e.g. planned
   Linha Circular / Loures extension routing — out of scope for this pack, flagged not guessed).
5. Whether testers see lisbon as its own city picker entry (yes — do not invent city=tml,
   city=mlisboa, or merge into another Portuguese city, per the oracle report).
