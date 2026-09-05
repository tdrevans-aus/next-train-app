Geneva D1 + research pack (Luke), 2026-09-06. City stays **planned**. Existing live/planned
cities untouched. `assertCityLive("geneva")` must still fail (city not in
`lib/providers/registry.js` today). No generator committed, no PR, no product edit, no
`lib/providers/` or `registry.js` edit.

**This pack has a full five-line station graph — unlike Zürich (roster-only), it is closer to the
Lausanne shape.** The oracle report itself hand-transcribed all five TPG tram lines (12, 14, 15,
17, 18) station-by-station; this pass reshapes that transcription into D1 pack format and adds one
thing the oracle report did not do: a direct recount of line-intersection membership from the
transcribed arrays themselves, which surfaced a real internal inconsistency (see below). D2 (Jim's
adapter) and D5 (assertion tables) can proceed off this pack's station graph, **contingent on**
Tim's licence sign-off and the Cornavin line-set discrepancy being checked against the primary map.

Pack files: `docs/geneva-d1/{oracle-clash-report,hazard-pack,direction-model-memo}.md`,
`published-network.json`, this file.

## What's solid (cite: hazard-pack.md, direction-model-memo.md)

- **city=geneva**, single-operator v1: TPG (Transports publics genevois) tram only, within the
  unireso fare community. Not `city=ge`, `city=gva`, `city=tpg`, `city=lemanis`. Do not merge into
  another Swiss city (Zürich, Lausanne). Do not merge with Léman Express or bus operators.
- **Modes v1: TPG tram only.** No Léman Express (CFF/SNCF commuter rail), no buses, no
  trolleybuses, no boats. No metro exists in Geneva. Future line 6 / Ferney-Voltaire extension
  (construction Sep 2025–end 2028) excluded from the passenger roster.
- **Passenger tram line roster (5 lines, per oracle report, fully transcribed):** 12 (25 stops), 14
  (30 stops), 15 (23 stops), 17 (26 stops, 4 in France), 18 (31 stops). 135 total stop-line
  appearances.
- **Hub lock: Cornavin** (Genève, gare Cornavin) — locked per explicit task instruction. **Read
  hazard-pack.md H4 before trusting a line count for this station**: the oracle report gives three
  different, mutually inconsistent claims (hub-lock prose: 12/14/15; inline stop annotations:
  14/15/17/18; this pack's own recount from the transcribed arrays: 14/15/18). `published-network.
  json` uses the recount, but that is not independently re-verified against the official TPG map.
- **doNotGroup, four pairs, all recorded per-station in `published-network.json`:** Cornavin,
  Eaux-Vives, Lancy-Pont-Rouge (both named tram stops), Lancy-Bachet — each vs the co-located Léman
  Express station of the same/similar name. All out of v1 scope entirely by the tram-only mode cut.
- **Europe/Zurich HAS DST** (shared with Zürich, Lausanne).
- **Board eligibility**: oracle report's table already covers this (all TPG tram `in`; Léman
  Express `out-product`; bus/trolleybus/boat `out-mode`) — no board-eligibility work needed from
  this pass, no silent omissions.

## What is NOT solid — resolve before D2, don't wire around

1. **Cornavin's true line set is disputed within the source document itself** (three claims, see
   above and hazard-pack.md H4). Do not build a line-map generator that assumes any of the three
   figures is correct without checking the official TPG map first.
2. **Unique-stop-count arithmetic discrepancy.** The oracle report's Summary states 94 unique
   stops; a direct recount from its own five transcribed per-line arrays yields 86 (this pack's
   `stats.stationsTranscribed`). Not reconciled — see hazard-pack.md H2. Worth a fresh count against
   the primary TPG map before relying on either number for a station-count assertion in D5.
3. **Two more interchange-annotation-vs-array discrepancies**, same shape as Cornavin: Plainpalais
   (annotations say 5 lines including 14; recount says 4: 12/15/17/18) and Bel-Air (annotations say
   5 lines including 15; recount says 4: 12/14/17/18). Neither is locked as a hub, but both are
   larger interchanges than Cornavin by the recount — flagged in case that changes Tim's view on
   the hub-lock choice.
4. **Moillesulaz asymmetry.** Thônex, Moillesulaz is a terminus on line 12 but a through-station on
   line 17 (continuing into France). Direction-model-memo.md flags this as a data-model hazard, not
   just documentation — do not build a shared "Moillesulaz direction label" helper across both
   lines.
5. **Cross-border line 17 (French stops).** GTFS-RT data quality for Gaillard (×2), Ambilly, and
   Annemasse is unconfirmed per the oracle report's skip-risk section. Verify live trip-update
   coverage for this segment before shipping a line 17 adapter that assumes parity with the Swiss
   portion — a documented degraded-mode fallback may be needed.
6. **Licence confidence is `unclear`.** Same opentransportdata.swiss Terms of Use as Zürich and
   Lausanne — no named licence, attribution required, third-party redistribution to end users of a
   commercial app not explicitly addressed. **Get Tim's sign-off before building or shipping a
   Geneva adapter against this feed.**
7. **Bearer API key + tight rate limit.** GTFS-RT requires a Bearer key (401 without one), 2 queries
   per minute per key — same shared national feed as Zürich and Lausanne, so this is now a *third*
   city competing for the same rate-limited key pool if all three are eventually wired. Real
   product-shape constraint, not just a credential to paste in. Never paste a key.
8. **Short turns unchecked** on all five lines — not confirmed either way, don't assume none exist.
9. **Feed composition**: opentransportdata.swiss GTFS-RT mixes TPG tram + Léman Express + S-Bahn +
   buses on one protobuf stream. Adapter filtering (`agency=TPG`, `route_type=0`) must be tight to
   avoid bleed onto tram boards.
10. **Chêne-Bourg proximity** (tram stops "Chêne-Bourg, Place Favre" / "Chêne-Bourg, Peillonnex" vs
    a same-commune Léman Express "Chêne-Bourg" station) is flagged as a lesser doNotGroup candidate,
    not confirmed — no exact name collision found in the transcribed arrays, unlike Cornavin/
    Eaux-Vives/Lancy-Pont-Rouge/Lancy-Bachet. Confirm at adapter time if this matters.

## Direction model (full detail: direction-model-memo.md)

**Line + terminus** (e.g. `12 + Thônex, Moillesulaz`), matching every other city pack in this
pipeline. All five lines are linear (two termini each, no loop). Cornavin is the hub lock and must
never appear as a direction token. The Moillesulaz asymmetry (item 4 above) is the one line/
direction-model wrinkle specific to this city — read it before touching that station.

## What I did not do

No live web fetch of the TPG official map, Wikipedia, Transit app, or opentransportdata.swiss
(station roster was already hand-transcribed into the oracle report by Nico; this pack reshapes
that transcription and independently recomputes line-intersection counts and unique-stop totals
directly from the transcribed arrays, but does not re-verify the underlying transcription itself
against a live source). No GTFS-derived station arrays. No stopIds. No future line 6 / Ferney-
Voltaire station rows. No Léman Express/bus/trolleybus/boat route integration beyond the board-
eligibility carry-over and the doNotGroup notes. No live city flip, no product edit, no
`lib/providers/` or `registry.js` edit (Jim's job). No resolution of the licence-confidence,
Bearer-key/rate-limit, unique-stop-count arithmetic discrepancy, or Cornavin/Plainpalais/Bel-Air
line-set discrepancies — all flagged for Tim/Jim, not decided here. No lane-lock action taken —
Luke needs no check per `CLAUDE.md`, and this pack's whole write set is `docs/geneva-d1/`.

## Recommended next step

Before D2 adapter work: (a) Tim signs off on the licence question; (b) someone re-checks Cornavin's
(and ideally Plainpalais's/Bel-Air's) actual line set against the live TPG map to resolve the
three-way discrepancy in hazard-pack.md H4, since it affects what `printedInnerCityNames`/branch
data a line-map generator would encode; (c) Jim spot-checks GTFS-RT trip-update coverage for line
17's four French stops before assuming the adapter can treat that segment like any other stop.
