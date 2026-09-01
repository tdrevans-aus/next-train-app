Greater Manchester D1 + research pack. City stays **planned** / "Coming Soon" until (a) National
Rail is unblocked (`DARWIN_LDB_TOKEN`) and (b) Metrolink's real-time feed status is confirmed with
TfGM (or explicitly accepted as permanently schedule-only) and (c) Jim wires testers live — this
pack does not flip anything. **assertCityLive("greater-manchester") must fail** (city is not in
`lib/providers/registry.js` CITIES today — Unknown city / 400). No generator, no product edit. Jim
owns D2–D6. Do not flip greater-manchester live from this pack. Do not touch West Yorkshire, South
Yorkshire, Thames Valley, or any other UK region — same account-level National Rail blocker, but
separate regions/packs.

Lane lock: acquired `United Kingdom` / `Greater Manchester` / `luke` before writing (checked free
first — Thames Valley's lock released post-merge, PR #182). Release happens post-merge, per
CLAUDE.md country-lane rule — not run by this pack.

Research pack is docs/greater-manchester-d1/: published-network.json, oracle-clash-report.md,
hazard-pack.md, direction-model-memo.md, jim-handoff.md (this file). This was a fresh from-scratch
build 1 Sep 2026 — the tracker's prior "Packed 2026-08-28" claim was false; no trace of an earlier
Greater Manchester pack existed anywhere in the codebase before this one.

## Hub architecture decision — READ THIS BEFORE WIRING

**This pack builds a different architecture than the oracle report's own headline recommendation
(C2/C3 point 4: "hub lock: Manchester Victoria"). Do not wire against that line alone — read the
reasoning below and in direction-model-memo.md first.**

The report's C2/C3 point 4 recommends Victoria as "the" hub lock, reasoning only from cross-mode
platform integration (Metrolink + National Rail share one building at Victoria, escalator/lift
connect, unlike Piccadilly's 5-10 min walk). That's a correct fact about Victoria specifically, but
the report elsewhere gives facts that make Piccadilly National Rail's real primary hub:

- **Manchester Piccadilly: 14 platforms, all six TOCs** (Northern, Avanti West Coast,
  TransPennine Express, CrossCountry, East Midlands Railway, Transport for Wales).
- **Manchester Victoria: 6 platforms, only two TOCs** (Northern, TransPennine Express).
- Report line 22 itself: "National Rail services converge at Manchester Piccadilly (main
  intercity/regional hub, 14 platforms) and Manchester Victoria (secondary hub, 6 platforms)."

Building Victoria as National Rail's *only* hub-locked station would leave four of six operators
(Avanti, CrossCountry, East Midlands Railway, Transport for Wales) with no hub-anchored board
anywhere — a board-eligibility-rule violation (all seven verdicted `in` by the report's own board
eligibility table, lines 34-39), the same failure mode Thames Valley's memo rejected when
considering whether to drop Oxford.

**What this pack builds instead — two agencies, each with its own hub + secondary-hub pair:**

- **National Rail:** hub lock = **Manchester Piccadilly (MAN)**. Secondary hub = **Manchester
  Victoria (MCV)**. Reuses the Thames Valley/Solent/West of England hub+secondary-hub pattern.
- **Metrolink:** hub lock = **St Peter's Square** (report's own C2/C3 point 2 names this as
  Metrolink's hub — "most central interchange, all lines converge in Zone 1"). Secondary hub =
  **Manchester Victoria**.
- **Manchester Victoria** is the single shared-building point where both agencies' secondary hubs
  coincide — built once as one stationGroup, `doNotGroup: true` between its Metrolink (4 platforms)
  and National Rail (6 platforms) layers. Same shape as Sheffield Station in South Yorkshire's
  pack (tram viaduct vs NR main platforms, footbridge connects) and Nottingham Station in East
  Midlands' pack.
- **Manchester Piccadilly (NR) and Piccadilly Gardens (Metrolink)** are built as **two separate
  stationGroups**, `doNotGroup: true` between them — this is a walk-link pair (~100m, 5-10 min via
  moving walkways, undercroft vs street-level main platforms 13-14), not a shared-building
  interchange the way Victoria is. Closer in shape to West Yorkshire's Bradford Forster
  Square/Bradford Interchange pair than to Victoria/Sheffield Station.

**This is a deliberate deviation from the report's single headline sentence, using the report's own
supporting facts (line 22, board eligibility table, C2/C3 point 2) rather than contradicting it
outright — flagged as open item 1 for Tim below and in direction-model-memo.md. Confirm this
architecture makes sense before wiring; do not default back to "Victoria only" without re-reading
the reasoning above.**

## Through-running / regional stations

- **Walsden** — Calder Valley Line, Greater Manchester/West Yorkshire boundary, through-running
  only (single operator, Northern, continuing across the boundary at the same platform — not a
  merge). **CRS code mismatch, NOT resolved**: this report gives `WDN`; West Yorkshire's finished
  pack (`docs/west-yorkshire-d1/published-network.json`) gives `WAD` for the same station. That
  pack had explicitly flagged Walsden as "no Greater Manchester pack exists yet to cross-check
  against" — this pack closes that gap for the through-running framing, but surfaces a new,
  unresolved CRS discrepancy. Do not pick one code over the other without checking a live Darwin
  response or National Rail's published CRS list first.
- **Stockport (SMN)** — National Rail only. Metrolink does NOT serve Stockport rail station;
  separate tram-only stops exist ~0.5km away on the Altrincham/Ashton lines. Do not conflate the
  two in an adapter's station lookup.

## Direction model recommendation

**Metrolink: line (colour) + terminus** — same model as every reference light-rail pack
(Rotterdam, Newcastle, Boston, East Midlands NET, South Yorkshire Supertram). Eight lines, termini
only given by the report (not a full 99-stop order — real gap). Green and Purple share a terminus
pair (Altrincham-Bury) with no explained routing difference — flag for confirmation before shipping
either as a §3 string.

**National Rail: destination + operator**, no line+terminus model — same as every prior UK
National Rail region. At Piccadilly this applies across all six operators in one flat board
(no evidence of platform-mixing complexity requiring an internal doNotGroup, unlike Oxford's
GWR/Chiltern split in Thames Valley). At Victoria, across the two operators present. **Illustrative
only, not verified** — no destination strings can be confirmed until `DARWIN_LDB_TOKEN` exists and
a real Darwin payload can be pulled. See direction-model-memo.md for full reasoning and options
considered.

## Skip risk — Metrolink real-time feed status (genuine unknown, not the standard account block)

TfGM's developer portal (opendata.tfgm.com) is deprecated and no longer issuing new API keys;
existing keys continue to function on an unconfirmed timeline. No public GTFS-RT feed confirmed
anywhere. This is a different *kind* of hazard than the National Rail account block — it is not
"Tim needs to re-register," it may genuinely be "no real-time feed will ever exist again for
Metrolink." Same shape as South Yorkshire's Supertram/SYFTL gap. **Metrolink ships v1
schedule-only.** Whoever wires this adapter should first contact TfGM
(data.analytics@tfgm.com / https://tfgm.com/open-data) to confirm whether a replacement is planned
before assuming this is a temporary state.

## Open items for Tim only — do not resolve

1. **Confirm the two-agency, two-hub-pair architecture** (Piccadilly + Victoria for National Rail;
   St Peter's Square + Victoria for Metrolink) rather than the report's literal single-sentence
   "hub lock: Victoria" recommendation. This pack's own judgment call, using the report's own
   supporting platform/operator-count facts — worth an explicit sanity check since it diverges from
   the report's headline framing.
2. **Metrolink real-time feed status** — genuinely unknown, TfGM contact needed. See skip risk
   above.
3. **National Rail / OpenLDBWS redistribution terms are ambiguous.** OGL 2.0 baseline permits
   redistribution with attribution, but the Rail Data Marketplace Platform Agreement may restrict
   downstream redistribution to third-party rider clients — the operative clause isn't confirmed
   in public sources. Oracle report confidence: `unclear`. Tim needs to review the signed RDM Data
   Sharing Agreement once EvansAppStudio re-registers and receives a token.
4. **Walsden CRS code mismatch (WDN vs WAD)** between this report and West Yorkshire's finished
   pack — not resolved here, needs a human or Nico follow-up against a live Darwin response or
   National Rail's published CRS list before either pack's Walsden entry is used in an adapter.
5. **Green/Purple Metrolink line terminus overlap (Altrincham-Bury, opposite line names)** — not
   explained by the report; confirm against a live TfGM timetable or GTFS payload.
6. **UK country ledger retrofit** — still overdue (no `docs/united-kingdom-ledger.md` exists as of
   this pack, despite being named as required before the next NR region across multiple prior
   regions' packs). Should run before the region after this one, not indefinitely deferred. The
   Walsden CRS mismatch found here is exactly the kind of cross-region fact that ledger exists to
   hold — should migrate there once it exists rather than being re-derived by a future region.

## H7 / license summary

Europe/London, HAS DST (BST/GMT). National Rail under OGL 2.0 + NRE amendments (unclear on
third-party redistribution — same open item as every other UK NR region). National Rail static
GTFS (Transitland) is CC-BY-2.0 UK, confidence `clear`, reference-only. Metrolink static GTFS is
dual OGL 3.0 + ODbL 1.0, confidence `clear`, verified live, no key required. Metrolink real-time
has no license because no confirmed feed exists — confidence `not found`.

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit,
no GTFS fetch/parse (Metrolink static GTFS and the National Rail Transitland feed are both
verified live and cited, but not pulled — station names/lines come from the oracle report's own
tables), no invented station-graph or stop-order facts beyond what the report's tables/C2/C3 points
state (Metrolink's 99-stop full order is a real gap, not filled), no invented destination strings,
no CRS verification against a live feed or Darwin response (Walsden's WDN/WAD mismatch is flagged,
not resolved), no `docs/united-kingdom-ledger.md` creation (flagged as overdue, not this pack's job
to write), no wiring of `DARWIN_LDB_TOKEN`, no reading of any other city's in-progress (unfinished)
pack — West Yorkshire's finished, merged `published-network.json` was read only for the specific
Walsden reciprocal-flag consistency check the dispatch instruction named, not for general context.
