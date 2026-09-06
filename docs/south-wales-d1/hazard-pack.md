# South Wales hazard pack (H1-H7)

**Rewritten 7 Sep 2026** against the re-scoped `docs/south-wales-d1/oracle-clash-report.md`
("Re-scope 7 Sep 2026" section). Supersedes the 1 Sep 2026 two-station version of this file in
full — the premise that gap was built on ("no confirmed public feed for Valley Lines") is
corrected in the report: Valley Lines are Darwin-served heavy rail with CRS codes, live-probed
5 Sep 2026. Evidence used: the oracle report only, plus `docs/united-kingdom-ledger.md` SS2 (stop
ownership) and SS4 (coverage boundaries) per the country-lane rule, and `docs/board-eligibility-rule.md`.
No other city's in-progress pack was read.

## H1 - parent + child

Two agencies, one shared feed. **Transport for Wales Valley Lines** (six commuter routes, heavy
rail, CRS-coded) and **National Rail mainline/through-running** (GWR, CrossCountry, TfW
through-running) are both carried on the single National Rail Darwin/OpenLDBWS feed - there is no
separate TfW real-time product to build against or reconcile with. At Cardiff Central (CDF) both
"sides" call at the same CRS code, i.e. the same single Darwin board - this is not a parent/child
station relationship and not a two-board hub the way East Midlands' tram-over-rail is; it is one
board with mixed operators, exactly like every other UK National Rail interchange with multiple
train operating companies. Cardiff Queen Street (CDQ) is a separate CRS code (its own Darwin
board), ~600 m from CDF by report line 34 - two plain catalog entries, not a merge, not a
doNotGroup pair (see H4/H6 and doNotGroup proposals below).

## H2 - clash surface

**Resolved, not a live blocker.** The report's "Clash" section (lines 87-93) and Re-scope section
(lines 3-13) record that the prior exclusion of Valley Lines was a scoping error, not a feed gap:
TfW does not publish GTFS static or GTFS-RT, but the walk-up rule (`docs/board-eligibility-rule.md`)
only requires Darwin coverage, which the 5 Sep 2026 live probe confirmed at all 16 catalog CRS
codes (report line 9: CDF 15 trips, CDQ 15, PPD 14, NWP 15, SWA 7, BGN 12, BYI 4, PEN 2, CPH 9,
MER 2, ABA 2, TRB 2, RHY 2, NTH 9, PTA 10, STJ 8). `DARWIN_LDB_TOKEN` is provisioned (ledger SS1,
2 Sep 2026) - the only remaining blocker before this pack was the scope decision itself, not
account/token access.

## H3 - thin / event / overlay

**Gap, not resolved.** The report gives no information on short turns, peak extras, or
event-only stops for either Valley Lines or mainline services. Nothing to encode; flag only.

## H4 - branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Cardiff Central (CDF) | Valley Lines (six line termini) + National Rail through-running, single Darwin board (CRS CDF) | Report table row for CDF: "hub lock ... interchange between Valley Lines and National Rail mainline." Same CRS for both - not a doNotGroup case, one board, operator-mixed like any multi-TOC UK hub. |
| Cardiff Queen Street (CDQ) | Valley Lines Rhondda/Merthyr junction only, separate CRS from CDF | Report table row for CDQ + C2/C3 point 6: "Both are separate, distinct in Darwin output ... two plain entries, not grouped." No shared-board evidence found; not a doNotGroup pair with CDF. |
| Pontypridd (PPD) | Valley Lines hub, junction of Merthyr and Rhondda lines | Report table row for PPD. No National Rail mainline through-running here - single-agency junction, no doNotGroup basis. |
| Six Valley Lines termini (MER, ABA, TRB, RHY, plus CDQ/PPD as junctions) | Each is a single-line terminus, single CRS, single Darwin board | Report table rows for MER/ABA/TRB/RHY: each named as the sole terminus of one named line, "TfW Valley Lines (X line only)." No branching/junction structure at the termini themselves - nothing to encode a doNotGroup rule against. |

No doNotGroup pair is built in this pack. The only two candidates considered (CDF-vs-CDQ,
CDF Valley-Lines-vs-mainline) both resolve to "not a group" - see H6.

## H5 - nested short turns

**Not documented in the report.** No nested/short-turn codes given for either Valley Lines or
mainline services. Flag only - nothing to encode.

## H6 - inner city (where SS3 lives)

**Hub lock: Cardiff Central (CDF).** Report line 33 and C2/C3 point 2: interchange between Valley
Lines (six lines) and National Rail mainline (London/Bristol via Severn Tunnel; North Wales via
Wrexham; West Wales via Swansea). Single Darwin CRS (CDF) - one board, all operators (TfW Valley
Lines, TfW through-running, GWR, CrossCountry) shown together, no internal split needed absent
report evidence of platform-specific filtering.

**Secondary hub: Cardiff Queen Street (CDQ).** Report line 34 and C2/C3 point 2: Valley Lines
junction only (Rhondda/Merthyr lines meet), no National Rail mainline through-running, ~600 m
walk-link to CDF. Own CRS, own Darwin board - built as a **separate plain catalog entry**, not
grouped with CDF. The report's own recommendation (C2/C3 point 6: "No doNotGroup at Cardiff
Central or Queen Street. Both are separate, distinct in Darwin output... two plain entries, not
grouped") is followed as written; no live-probe evidence surfaced a shared board between the two
CRS codes, so the "unless Darwin shows them merged" condition does not trigger.

**Third-tier local hub: Pontypridd (PPD).** Valley Lines junction of Merthyr and Rhondda lines,
no through-running to adjacent regions (report table row, line 35). Own CRS, own board, plain
catalog entry - not grouped with CDF or CDQ.

No doNotGroup rule is built at CDF between Valley Lines and mainline services either - see H4:
both ride the same single Darwin CRS/board, so there is nothing to group against (a doNotGroup
rule needs two distinguishable boards or platform-groups to keep apart; this hub has exactly one
board, operator-mixed, matching every other multi-TOC UK National Rail hub already shipped, e.g.
London Bridge, Peterborough).

## H7 - DST

South Wales is in the UK, timezone **Europe/London**, which observes DST (BST in summer, GMT in
winter). Same UK-wide fact as every other UK region packed so far.

## doNotGroup proposals

| candidate | verdict | reason |
| --- | --- | --- |
| Cardiff Central (CDF): Valley Lines vs. National Rail mainline | **not built - no basis** | Single Darwin CRS (CDF), single board, operator-mixed. The 1 Sep 2026 pack had proposed but not built a doNotGroup here on the premise that Valley Lines might one day get its own separate board; that premise is now moot - Valley Lines is on the same Darwin board as mainline services at CDF, not a separate one. There is nothing to keep apart. |
| Cardiff Central (CDF) vs. Cardiff Queen Street (CDQ) | **not built - two plain entries** | Separate CRS codes, ~600 m apart (report line 34), no live-probe evidence of a shared board. Per the report's own recommendation (C2/C3 point 6) and this pack's task instruction: build as two plain catalog entries, not a doNotGroup pair, unless a shared Darwin board is found - none was. |
| Severn Tunnel Junction (STJ) vs. Chepstow (CPW) - Wales-England boundary | **resolved, not a doNotGroup case** | The 1 Sep 2026 pack flagged this as an unresolved discrepancy with West of England's pack. `docs/united-kingdom-ledger.md` SS2 (Chepstow row, decided 5 Sep 2026, Tim) closes it: STJ and CPW are both in Wales, on **different corridors** (STJ = South Wales Main Line via the tunnel; CPW = Gloucester-Newport/Wye Valley line, no Bristol routing). Neither is promoted; both stay through-running-only, both home South Wales per the ledger. No further action owed by this pack. |

## Catalog boundary (report lines 25, 37; ledger SS2)

South Wales extends from Severn Tunnel Junction (Wales-England border, South Wales Main Line)
westward to **Swansea (SWA)**, the westernmost mainline commuter hub in this catalog. Neath (NTH)
and Port Talbot Parkway (PTA) are the westernmost mainline stations short of Swansea. **Llanelli
(LLE) and Carmarthen (CMN) are Rest of Wales's**, per `docs/united-kingdom-ledger.md` SS2 stop
ownership and the report's own boundary statement (line 25) - neither enters this catalog, and
Rest of Wales's own pack is not touched by this rescope (propagation rule, `docs/country-lane.md`).

## Coordinates - NaPTAN RailReferences by CRS

Pulled 7 Sep 2026 via `scripts/lib/uk-naptan.mjs` (`loadUkNaptanIndex()` -> `coordsForCrs(crs,
name)`), the same NaPTAN RailReferences.csv (CRS -> ATCO) + access-nodes.csv (ATCO -> lat/lng)
join Liverpool City Region's pack used (`docs/liverpool-city-region-d1/jim-handoff.md`). All 16
catalog CRS codes resolved successfully - 16/16 geocoded, no exceptions, no `null` coordinates.
See `published-network.json`'s `notes` for the full coordinate table and the exact pull method.

## What I did not do

No generator, no invented station graph or line topology beyond the report's named termini/junctions,
no doNotGroup rule built without report or live-probe evidence, no resolution of the National Rail
OpenLDBWS redistribution-terms question beyond what the report/ledger already record (resolved -
see the report's License section and ledger SS "Open items for Tim" item 1), no edit to
Rest of Wales's pack or catalog, no reading of any other city's in-progress pack, no `lib/` or
`registry.js` edit.
