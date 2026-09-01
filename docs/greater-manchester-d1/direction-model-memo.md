# Greater Manchester direction model memo (§3)

Context **today (1 Sep 2026)**: two agencies, two different direction-model problems, cross-linked
at one shared-building station (Manchester Victoria) and one walk-link pair (Manchester
Piccadilly / Piccadilly Gardens) — same overall two-agency shape as East Midlands' Nottingham
Station memo and South Yorkshire's Sheffield Station memo, but split across **two hub-lock pairs**
instead of one shared hub name, because Piccadilly (National Rail's own hub) and St Peter's
Square (Metrolink's own hub) are not the same station at all.

## Architecture: two agencies, each with its own hub + secondary-hub, cross-linked at Victoria

**Decision:**

- **National Rail**: hub lock = **Manchester Piccadilly (MAN)**, secondary hub = **Manchester
  Victoria (MCV)**.
- **Metrolink**: hub lock = **St Peter's Square**, secondary hub = **Manchester Victoria**.
- **Manchester Victoria** is the single physical point shared by both agencies' station graphs —
  built once, `doNotGroup: true` between its Metrolink and National Rail layers.
- **Manchester Piccadilly (NR) and Piccadilly Gardens (Metrolink)** are built as two separate
  stationGroups, `doNotGroup: true` between them — not an interchange the way Victoria is.

### Why this departs from the oracle report's literal "hub lock: Victoria" line (C2/C3 point 4)

The report's own C2/C3 point 4 recommends Victoria as "the" hub lock, reasoning from cross-mode
platform integration alone (escalator/lift, same building) — a fair basis for *that specific
question*, but the report elsewhere (line 22, board eligibility table lines 34–39) gives facts that
make Piccadilly the clear National Rail hub: **14 platforms vs Victoria's 6**, and **all six
National Rail operators call Piccadilly** (Northern, Avanti, TransPennine Express, CrossCountry,
East Midlands Railway, Transport for Wales) versus **only two at Victoria** (Northern,
TransPennine Express). Report line 22 states this plainly: "National Rail services converge at
Manchester Piccadilly (main intercity/regional hub, 14 platforms) and Manchester Victoria
(secondary hub, 6 platforms)." Treating Victoria as National Rail's *only* hub-locked station
would mean four of six operators (Avanti, CrossCountry, East Midlands Railway, Transport for
Wales) have no hub-anchored board at all — reusing the exact reasoning Thames Valley's memo used to
reject dropping Oxford: an in-scope, board-eligible station left with no board is a
board-eligibility-rule violation, not a simplification. This pack keeps Victoria as the report's
correctly-identified *cross-mode* integration point (doNotGroup layer within one stationGroup) and
adds Piccadilly as National Rail's own hub lock, rather than treating the two framings as
contradictory.

### Why not collapse Piccadilly/Piccadilly Gardens into one interchange the way Victoria is

Victoria's tram and rail platforms share one building, connected by escalator/lift, a 2–5 minute
walk within a shared concourse (report line 15). Piccadilly's tram stop is at street level in a
basement/undercroft, ~100m away, a 5–10 minute walk via moving walkways to the NR platforms
(report line 16) — a genuinely separate location, not a shared-station two-layer hub. Modelling
them as one interchange the way Victoria is would overstate the physical relationship; keeping
them as two doNotGroup'd stationGroups matches how a rider actually experiences the two stops
(same shape as West Yorkshire's Bradford Forster Square/Bradford Interchange pair, not Sheffield
Station's single-building case).

## Metrolink direction model: line (colour) + terminus

Same convention as every reference pack with a fixed-route light-rail product (Rotterdam,
Newcastle, Boston, East Midlands NET, South Yorkshire Supertram): **line + terminus** (example:
`Green + Altrincham`, `Airport + Manchester Airport`). Eight lines, per the report (C2/C3 point 10):

| line | termini |
| --- | --- |
| Green | Bury — Altrincham |
| Yellow | Bury — Piccadilly |
| Blue | Ashton-under-Lyne — Eccles |
| Red | Trafford Centre — Cornbrook — Imperial War Museum — Wharfside — Pomona |
| Purple | Altrincham — Bury |
| Orange | Altrincham — Rochdale |
| Airport | Piccadilly — Manchester Airport |
| Eccles | Manchester — Eccles |

Report line 94 gives this as termini/via-points only for the eight lines' overall shape — **not** a
full 99-stop ordered intermediate list. Real gap, same shape as South Yorkshire's Supertram gap;
see coverageGaps in `published-network.json`. Do not treat the `stations` fields as complete.

**Caveat — Green and Purple share the same terminus pair (Altrincham–Bury) with opposite line
names.** The report does not explain why two differently-coloured lines share termini (possibly a
peak/off-peak variant or a routing difference through the city centre not detailed in the report).
Flag for Jim/Nico to confirm against a live TfGM timetable or GTFS payload before shipping either
as a §3 string; do not guess which routing distinguishes them.

## National Rail direction model: destination + operator, no printed line map

Same model as every prior UK National Rail region (East Midlands, South Yorkshire, West Yorkshire,
Thames Valley, West of England, Solent, london-se-national-rail): Darwin departure boards are
destination lists, not printed line maps. No `lines` array is provided for National Rail — see
`published-network.json`.

- **Manchester Piccadilly:** destination + operator (Northern / Avanti / TransPennine Express /
  CrossCountry / East Midlands Railway / Transport for Wales) distinguishes services. No evidence
  in the report of doNotGroup-worthy platform-mixing complexity among the six operators themselves
  (unlike Oxford's GWR/Chiltern split in Thames Valley) — single flat board per hub,
  `doNotGroup: false` **among the six NR operators** (doNotGroup only applies against Metrolink's
  Piccadilly Gardens stop, per H4/H6).
- **Manchester Victoria:** destination + operator (Northern / TransPennine Express) on the
  National Rail layer; `doNotGroup: true` against the Metrolink tram layer at the same building.

### No §3 examples table for National Rail

Consistent with every prior UK NR region's posture: destination strings would need a real Darwin
payload, which is blocked (account-level, see coverageGaps in `published-network.json`). Do not
fabricate destination strings such as "London Euston (Avanti)" as verified facts — illustrative
shape only, not written into `published-network.json` as confirmed data.

## §3 examples (illustrative, Metrolink only)

Assume line+terminus model.

### St Peter's Square (Metrolink hub lock, all lines converge)

`Green + Altrincham`, `Yellow + Bury`, `Blue + Eccles`, `Purple + Bury`, `Orange + Rochdale`,
`Airport + Manchester Airport`. (Red and Eccles lines' exact St Peter's Square routing not
independently confirmed in the report's via-point summary — do not assume all eight lines call
here without a real timetable check.)

### Manchester Victoria (Metrolink secondary hub + National Rail secondary hub, doNotGroup)

Metrolink platforms: `Yellow + Piccadilly` (Bury–Piccadilly line, Victoria is a named stop en
route). National Rail platforms: destination + operator model, no verified strings yet
(Northern / TransPennine Express only, per board eligibility table).

## Options considered

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Two agency-owned hub + secondary-hub pairs, cross-linked at Victoria** (recommend) | NR: Piccadilly hub, Victoria secondary. Metrolink: St Peter's Square hub, Victoria secondary. Victoria built once, doNotGroup between layers. Piccadilly/Piccadilly Gardens built as two doNotGroup'd stationGroups. | Matches the report's own platform-count and operator-count facts (line 22) for National Rail while preserving its cross-mode integration observation at Victoria (C2/C3 point 5); reuses Thames Valley/Solent/West of England's hub+secondary shape twice, once per agency | More stationGroup entries to reason about than a single shared hub name (Sheffield-Station-style) — but the report's own facts don't support treating Piccadilly and St Peter's Square as one station |
| **B. Single hub lock at Victoria only (report's literal C2/C3 point 4)** | Victoria only for both agencies; Piccadilly and St Peter's Square treated as secondary or excluded | Matches the report's headline recommendation literally | Silently drops Piccadilly as National Rail's primary hub (14 platforms, 4 of 6 operators exclusive to it) and St Peter's Square as Metrolink's own hub (report's own C2/C3 point 2 names it as such) — board-eligibility-rule violation on both counts |
| **C. Merge Piccadilly and Piccadilly Gardens into one interchange stationGroup** | One combined "Piccadilly" entry for both modes | Simpler board | Overstates the physical relationship — ~100m/5–10 min walk, undercroft vs street level (report line 16), not the same building the way Victoria is |

## Open items for Tim

1. **Confirm the two-agency, two-hub-pair architecture** before Jim wires an adapter — this pack
   resolves an apparent tension in the report itself (C2/C3 point 4's Victoria-only framing vs.
   line 22's platform/operator-count framing) rather than picking one sentence over the other
   without explanation; worth an explicit sanity check given it diverges from the report's headline
   recommendation.
2. **Metrolink real-time feed status is unknown**, not the standard account block — TfGM's
   developer portal is deprecated and issuing no new keys. Confirm with TfGM
   (data.analytics@tfgm.com / https://tfgm.com/open-data) whether a replacement GTFS-RT feed is
   planned before assuming Metrolink stays schedule-only indefinitely.
3. **National Rail / OpenLDBWS redistribution terms are ambiguous.** Same open item as every other
   UK National Rail region. Review the signed RDM Data Sharing Agreement once EvansAppStudio
   re-registers.
4. **Walsden CRS code mismatch (WDN vs WAD)** between this report and West Yorkshire's finished
   pack — not resolved here, flagged for a human or Nico follow-up against a live Darwin response.
   See hazard-pack.md.
5. **Green/Purple line terminus overlap (Altrincham–Bury, both directions)** — not explained by
   the report; confirm against a live TfGM timetable or GTFS payload before shipping either line's
   §3 string.
