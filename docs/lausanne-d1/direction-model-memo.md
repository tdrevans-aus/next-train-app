# Lausanne direction model memo (§3 for Tim)

Context: TL Métro M1 and M2 are each reported as single **linear** lines, terminus to terminus, no
loop, no ring (unlike Copenhagen's M3, unlike Brussels' 2/6 inner loop). M1 runs Lausanne-Flon –
Renens-Gare (15 stations); M2 runs Ouchy-Olympique – Croisettes (14 stations). The two lines cross
at exactly one station, **Lausanne-Flon**, which is M1's eastern terminus and a mid-line call on
M2 (between Grancy and Riponne-Maurice-Béjart).

## Recommendation

**Line + terminus**, matching the pattern used across this pipeline (Brussels, Zürich's provisional
recommendation, Malmö, Oslo): each line is a printed number/letter (`M1`, `M2`) paired with its far
printed terminus.

- M1 westbound (away from Flon): `M1 + Renens-Gare`
- M1 eastbound (toward Flon, terminating there): `M1 + Lausanne-Flon`
- M2 northbound (away from Ouchy): `M2 + Croisettes`
- M2 southbound (toward Ouchy): `M2 + Ouchy-Olympique`

**Lausanne-Flon is the hub lock and must never be a direction token** on M2 boards passing through
it (it is only a valid direction label for M1, where it is genuinely a terminus). Do not emit "to
Flon" / "to City" / "to Centre" as a generic direction chip at any station.

## §3 examples (illustrative — not D5)

### Lausanne-Flon (M1 terminus × M2 through-station; LEB R20 doNotGroup, separate board)

| train | label |
| --- | --- |
| M1 arriving/terminating | M1 + Lausanne-Flon |
| M1 departing west | M1 + Renens-Gare |
| M2 northbound (toward Croisettes) | M2 + Croisettes |
| M2 southbound (toward Ouchy) | M2 + Ouchy-Olympique |

LEB R20 calls on a separate lower platform at the same building — it is `in` on the board
eligibility table but must appear (if at all) on a distinct board, never merged with the M1/M2
metro board (H1 doNotGroup).

### Lausanne-Gare (M2 only; CFF/SBB doNotGroup)

| train | label |
| --- | --- |
| M2 northbound | M2 + Croisettes |
| M2 southbound | M2 + Ouchy-Olympique |

CFF/SBB regional trains here are walk-up boardable and `in` on the eligibility table but must stay
on a separate board from the M2 metro platform (H1 doNotGroup); S-Bahn/long-distance is `out-mode`
by the v1 metro-only cut.

### Renens-Gare (M1 only; CFF doNotGroup)

| train | label |
| --- | --- |
| M1 arriving/terminating | M1 + Renens-Gare |
| M1 departing east | M1 + Lausanne-Flon |

Same doNotGroup shape as Lausanne-Gare: CFF regional walk-up boardable and `in`, kept off the
metro board.

## What is NOT known yet (open questions — no guesses made)

1. **Short turns.** Not checked at all in either direction — no confirmation either way of
   peak-only short-workings on M1 or M2. Do not assume `shortTurns: []` means "verified none"; it
   means "not checked" (see hazard-pack.md H5).
2. **Printed line-token convention.** No evidence in the oracle report of how TL prints the line
   badge on vehicles/boards — assumed `M1`/`M2` (matching the line names in the report itself) but
   this has not been independently checked against a live map render in this pass.
3. **Whether Lausanne-Flon's M2 through-call is ever presented as a de-facto second "hub" label**
   on rider-facing signage (e.g. some TL wayfinding might show "M2 direction Flon" as an internal
   landmark even though it isn't the printed terminus) — not sourced, flag rather than assume
   either way.

## doNotGroup carried into this memo (already locked, not open)

- **Lausanne-Flon (hub, metro-only)** vs **LEB R20** (separate operator, separate lower platform).
- **Lausanne-Gare (M2 only)** vs **CFF/SBB mainline** (shared address, separate platforms; CFF
  walk-up boardable and `in`, S-Bahn `out-mode`).
- **Renens-Gare (M1 only)** vs **CFF/SBB regional** (same shape, smaller station).

## Open §3 questions for Tim

1. Confirm `M1`/`M2` as the printed line token vs an alternative badge convention — no live map
   render was checked in this pass to verify vehicle/board livery.
2. Whether the licence-confidence and Bearer-key/rate-limit hazards (hazard-pack.md) block the
   live-feed adapter build only, or also the D5 assertion-table work — recommend the latter can
   proceed off this pack's already-transcribed station graph regardless of the GTFS-RT licence
   question, but confirm before Jim invests D2 effort.
3. Whether LEB R20 at Lausanne-Flon should ever surface as a secondary board entry in the product
   (it is walk-up boardable and `in` on eligibility) or stay purely a doNotGroup note — not decided
   here, flagged for Tim/Jim.
