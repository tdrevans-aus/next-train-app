# Thames Valley direction model memo (§3)

## Architecture: hub + secondary-hub, same pattern as West of England and Solent — with a
## doNotGroup twist at the secondary hub

The oracle report names Reading as the single hub-lock (line 15, C2/C3 point 2) and Oxford as a
secondary hub (line 16, C2/C3 point 3), applying the same hub+secondary-hub shape West of England
established for Bristol Temple Meads/Bath Spa and that Solent reused for Portsmouth
Harbour/Portsmouth & Southsea. This pack reuses that pattern rather than inventing a new one.

**Decision: one hub-lock (Reading), one secondary hub (Oxford), no merge between them — and,
unlike West of England's or Solent's secondary hubs, Oxford itself needs an internal doNotGroup
split.**

### Why hub + secondary-hub, not full flat Option A

Reading and Oxford are not mutually unrelated destinations the way London & South East's seven
termini are (each a genuinely different regional corridor with no shared "parent"). They sit on
the same GWR corridor 22–32 minutes apart (report line 16) — Oxford riders and Reading riders are
choosing a stop on largely the same route, not a different city entirely, and the report itself
frames Reading as "the single lock-point and primary interchange" with Oxford "secondary but
critical for north-south direction splitting" (report line 23, 70). That is the same relationship
West of England's Bristol Temple Meads/Bath Spa pair has, not the mutually-independent-hub
relationship Solent's Southampton/Portsmouth split has (~20 miles, genuinely different corridors)
or London SE's seven-terminus case.

### Why Oxford still needs doNotGroup, unlike Bath Spa or Portsmouth & Southsea

West of England's secondary hub (Bath Spa) and Solent's secondary board (Portsmouth & Southsea)
are both single-operator (GWR-only, SWR/Southern/GWR-flat respectively) — no internal split needed.
Oxford is different: GWR's main line and Chiltern Railways' Marylebone branch meet at Oxford on
**separate platforms and separate infrastructure** (report line 16, 37, C2/C3 point 4/6), and the
report explicitly calls for "separate boarding logic required per operator" — the same category of
requirement that drives London Bridge/Liverpool Street's doNotGroup:true in london-se-national-
rail, just occurring at a secondary hub instead of a primary terminus. Oxford's board must show two
operator sections (GWR toward London/Reading/Bristol; Chiltern toward Marylebone), not one flat
destination+operator list.

### Why not a single hub-lock (Reading only)

Would leave Oxford — explicitly verdicted `in` for GWR and Chiltern by the report's board-
eligibility table (report lines 32, 37, 47) — with no board at all, silently dropping an in-scope,
board-eligible secondary hub. Same failure mode `docs/board-eligibility-rule.md` exists to prevent,
and the same reason every prior UK region rejected forcing a single hub when the report names a
genuine secondary.

## National Rail direction model: destination + operator, no printed line map

Same model as every prior UK National Rail region (East Midlands, North East, West of England,
South Wales, Solent, london-se-national-rail, Glasgow's National Rail half): Darwin departure
boards are destination lists, not printed line maps. No `lines` array is provided — see
`published-network.json`.

- **Reading:** destination + operator (GWR / CrossCountry / SWR) distinguishes services. No
  evidence in the report of separate platform/boarding-section logic across the three operators
  (report line 36 explicitly rules this in favour of a flat board) — single flat board,
  `doNotGroup: false`.
- **Oxford:** destination + operator **within** each of two operator sections — GWR section (main
  line: London Paddington / Reading / Bristol direction) and Chiltern section (Marylebone branch).
  `doNotGroup: true`. The two sections are not merged into one flat list.

### No §3 examples table

Consistent with every prior UK NR region's posture: destination strings would need a real Darwin
payload, which is blocked (account-level, see coverageGaps in `published-network.json`). Do not
fabricate destination strings such as "London Paddington (GWR)" or "London Marylebone (Chiltern)"
as verified facts — they are illustrative shape only, and are not written into
`published-network.json` as confirmed data.

## Options considered

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Hub + secondary-hub, doNotGroup at Oxford only** (recommend) | Reading: flat destination+operator. Oxford: GWR section + Chiltern section, separately. | Matches the report's explicit station-graph facts exactly (Reading flat, Oxford split); reuses the established West of England/Solent hub+secondary pattern without inventing new shape | Requires the adapter to carry a doNotGroup flag correctly scoped to Oxford only, not Reading — a subtler config than West of England's uniform "no doNotGroup anywhere" |
| **B. Single hub-lock (Reading only)** | Reading only, Oxford dropped | Simplest adapter | Silently drops Oxford's board-eligible GWR and Chiltern services — board-eligibility-rule violation |
| **C. Full flat Option A (Reading, Oxford as unrelated hubs)** | Two independent hubs, no hierarchy | Simpler doNotGroup scoping (per-hub, not per-operator-within-hub) | Overstates the relationship — report frames Oxford as secondary/subordinate to Reading on the same corridor, not a genuinely separate destination the way Southampton vs Portsmouth or London SE's seven termini are |

## Open items for Tim

1. **Confirm the hub + secondary-hub-with-internal-doNotGroup shape** is the intended architecture
   for Oxford before Jim wires an adapter — this pack reuses an established pattern but the
   internal doNotGroup at a *secondary* hub (rather than at a primary terminus, as in london-se-
   national-rail) is a new combination in this pipeline and worth an explicit sanity check.
2. **Chiltern Railways operator transition (20 September 2026).** Chiltern moves from Arriva to
   DfT Operator per the report's skip risks (line 86). Verify Darwin correctly attributes Chiltern
   services and that any GTFS agency mapping (if a schedule-source is ever wired) reflects the new
   operator post-transition — a launch shortly after 20 Sept 2026 should re-check this before
   assuming the pre-transition operator string still applies.
3. **National Rail / OpenLDBWS redistribution terms are ambiguous.** Same open item as every other
   UK National Rail region. Review the signed RDM Data Sharing Agreement once EvansAppStudio
   re-registers.
