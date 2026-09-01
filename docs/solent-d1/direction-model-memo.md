# Solent direction model memo (§3 for Tim)

## Architecture: two-hub, not single hub-lock — and not full London-SE Option A either

The oracle report flagged this as the blocking design decision (report lines 14-31, 92-99) and
asked for Tim/Luke/Jim review before D1 proceeds. Applying the same judgment London & South East
National Rail and Glasgow already used: **is this a genuine two-(or-more)-destination city, or one
place with alternate route options?**

Southampton and Portsmouth are genuinely separate destinations — ~20 miles apart, different
dominant corridors (South West Main Line west/southwest out of Southampton Central vs Portsmouth
Direct Line/West Coastway east/north out of Portsmouth Harbour), connected only by a junction
(Fareham) that the report explicitly says is "not a regional hub" (report line 24). A rider
choosing "Southampton Central" vs "Portsmouth Harbour" is picking a different city, not an
alternate platform for the same trip. That is the same test london-se-national-rail's report used
to justify rejecting a single hub (that report's line 57) and the same test Glasgow's pack applied
to Central vs Queen Street.

**Decision: two independent hubs — Southampton Central and Portsmouth (Harbour + Southsea) — no
forced single hub-lock, and no merge between the two sides.**

This is *not* full Option A (London SE NR's 7-flat-group, no-hierarchy shape), because Solent's
Portsmouth side has an internal hub+secondary relationship that Glasgow's two groups and London
SE's seven groups didn't need to model:

- **Southampton Central (SOU)** stands alone as the west-side hub. No secondary station near it
  carries hub-adjacent significance in the report (Southampton Airport Parkway is named only in
  passing as "nearby," Eastleigh is explicitly a junction, not a hub).
- **Portsmouth Harbour (PMH)** is the east-side hub, but **Portsmouth & Southsea (PMS)** sits on
  the same corridor/waterfront and the report itself frames it as secondary rather than a third
  independent destination ("secondary station to Portsmouth Harbour... both on Portsmouth
  waterfront," report line 22, 41) while still noting real ridership significance ("key commuter
  interchange," report line 41). That is exactly the shape West of England already used for
  Bristol Temple Meads (hub) + Bath Spa (secondary hub) — a real board of its own, not merged into
  the primary hub's board, but not promoted to a fully independent architectural hub either.

So the shape is: **two hubs (Southampton Central, Portsmouth Harbour), one of which (Portsmouth)
carries a secondary board (Portsmouth & Southsea)** — "Option A at n=2, with one side using the
West-of-England hub+secondary pattern." See `published-network.json`'s `stationGroups` for the
concrete structure and `jim-handoff.md` for what this means for adapter/registry design.

### Why not full multi-group (Option A, flat n=3+)?

Nothing in the report gives PMS the independent-corridor status that would justify treating it as
a fully separate hub the way London SE's seven termini are separate from each other (each serving
a genuinely different regional corridor with no shared "parent" destination). PMS and PMH are both
"Portsmouth" to a rider — the choice between them is a walking-distance/platform-preference choice
within one destination, not a which-city choice. Modeling it as hub+secondary (one destination,
two boards) rather than two unrelated hubs (two destinations) matches the report's own language
more closely than forcing either a merge or a third fully independent hub.

### Why not single hub (Southampton Central only)?

Rejected for the same reason london-se-national-rail rejected forcing everything under one
terminus: it would leave Portsmouth-side riders (Portsmouth Harbour, Portsmouth & Southsea, and
the Portsmouth Direct Line corridor) with no board at all, despite the report explicitly verdicting
SWR/Southern/GWR services at Portsmouth Harbour and Portsmouth & Southsea as board-eligible `in`
(report lines 55-59, 66-67). Silently dropping an entire in-scope, board-eligible corridor to keep
the adapter simpler is exactly the failure mode the board-eligibility rule (`docs/board-
eligibility-rule.md`) and this pipeline's "don't force a single hub" precedent both exist to catch.

## National Rail direction model: destination + operator, no printed line map

Same model as every prior UK National Rail region (East Midlands, North East, West of England,
South Wales, Rest of Wales, Rest of Scotland, West Yorkshire, london-se-national-rail, Glasgow's
National Rail half): Darwin departure boards are destination lists, not printed line maps. No
`lines` array is provided for either hub — see `published-network.json`.

- **Southampton Central:** destination + operator (SWR / Southern / GWR / CrossCountry)
  distinguishes services. No evidence in the report of separate platform/boarding-section logic
  per operator (unlike London Bridge/Liverpool Street in london-se-national-rail) — single flat
  board, `doNotGroup: false`.
- **Portsmouth Harbour:** destination + operator (SWR / Southern / GWR). Single flat board,
  `doNotGroup: false`. Same absence-of-evidence reasoning.
- **Portsmouth & Southsea:** destination + operator (SWR / Southern / GWR). Separate board from
  Portsmouth Harbour (different physical station), but the same flat destination+operator model
  internally — `doNotGroup: false`.

### No §3 examples table

Consistent with Glasgow and london-se-national-rail's postures: destination strings would need
real Darwin data, which is blocked (account-level, see coverageGaps in `published-network.json`).
Do not fabricate destination strings.

## Boundary consistency check (Westbury, Waterloo)

Per the dispatch instruction, checked both named boundary regions' *finished* packs for
consistency (not read for general context, only for the specific reciprocal-flag check):

- **Westbury (WSB):** `docs/west-of-england-d1/published-network.json` already records Westbury
  as `"through-running only, boundary to Solent/Thames Valley regions — not a merge... De-
  duplicate at D2 if adjacent regions enter the app."` This pack is consistent: Westbury is
  recorded as a boundary-only flag in Solent's pack too, not built as a Solent stationGroup, not
  merged with Southampton Central.
- **Waterloo (WAT):** `docs/london-se-national-rail-d1/published-network.json` already records
  Waterloo's `boundaryNote` as `"SWR continues southwest past this catalog's edge (West of
  England / Solent region, not yet built). Through-running only, not a merge point — flag for D2
  ledger, not resolved here."` This pack is the reciprocal: Waterloo is recorded as a boundary-only
  flag, not duplicated as a Solent stationGroup or hub. Solent's own SWR services originate at
  Waterloo but that terminus itself belongs to the London & South East region's catalog, not
  Solent's.

Both boundaries are internally consistent across the two packs. No de-dup action is taken by
either side — that remains a D2/adapter-time concern per both packs' own coverageGaps.

## Open items for Tim

1. **Confirm the two-hub, hub+secondary shape is the intended architecture** before Jim wires an
   adapter — this pack makes the same category of judgment call Glasgow's pack made, but is not
   itself a substitute for explicit sign-off given the oracle report asked for review by name.
2. **PMS ridership/board significance** — the report calls it a "key commuter interchange" but
   gives no frequency/passenger-count evidence beyond that phrase. If PMS turns out to be
   materially busier than a typical secondary station, Tim may want to reconsider whether it
   deserves full independent-hub status rather than secondary status — flagged, not decided here.
3. **Short-turn confirmation** (H5) — whether SWR/Southern services short-terminate before the
   nominal corridor end (e.g., some Waterloo–Weymouth services actually terminating at
   Southampton) needs confirming before a live adapter's destination logic is trusted.
