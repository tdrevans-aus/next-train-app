Edinburgh D1 + research pack. City stays **planned** / "Coming Soon" until both (a) National Rail is
unblocked (DARWIN_LDB_TOKEN) and (b) Jim wires testers live — this pack does not flip anything.
**assertCityLive("edinburgh") must fail** (city is not in `lib/providers/registry.js` CITIES today —
Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not flip edinburgh live from
this pack. Do not touch Glasgow, Rest of Scotland, or any other UK region — same account-level
National Rail blocker, but separate regions/packs.

Lane lock: acquired `United Kingdom` / `Edinburgh` / `luke` before writing (lock was free — Glasgow
merged as PR #179 and released it before this pack started; release for this pack happens
post-merge, per CLAUDE.md country-lane rule — not run by this pack).

Research pack is docs/edinburgh-d1/: published-network.json, oracle-clash-report.md,
hazard-pack.md, direction-model-memo.md, jim-handoff.md (this file).

## Single National Rail hub, unlike Glasgow's two

Glasgow needed "Option A at n=2" treatment (two independent National Rail `stationGroups`, no
forced single hub) because Glasgow Central and Glasgow Queen Street are separate buildings, not
rail-connected, serving genuinely different corridors. **Edinburgh does not need that treatment.**
Edinburgh Waverley is the one National Rail hub; Haymarket and Slateford are through-running
satellite stations on the same route network, not independent termini serving different corridors.
Three `stationGroups` entries exist in `published-network.json` (`edinburgh-waverley`, `haymarket`,
`slateford`) because each is a distinct physical station with its own CRS code and its own board,
but conceptually this is a single-hub city on the National Rail side — closer to Newcastle/
Rotterdam's single-hub shape than to Glasgow's or london-se-national-rail's multi-hub shape.

### What this means for adapter/registry design

- `published-network.json`'s `stationGroups` array (3 entries: `edinburgh-waverley`, `haymarket`,
  `slateford`) is the unit of NR adapter work — same pattern as `docs/uk-architecture.md`'s "one
  Darwin adapter + region config passing a CRS allow-list," with three CRS allow-lists (`EDB`,
  `HYM`, `SLA`) inside one region config.
- None of the three groups need internal doNotGroup logic on the National Rail side — a single CRS
  query per group, filtered by destination + operator for display, is sufficient per the evidence
  available (no separate platform/boarding-section language in the report for any of the three).
- **Edinburgh Waverley DOES need cross-mode doNotGroup**: the Trams line's hub-lock is also
  "Edinburgh Waverley" in name, but it is a separate physical stop (Waverley area, separate
  platforms) from the National Rail station. `stationGroups[0].doNotGroup: true` with an explicit
  `doNotGroupReason` is set for exactly this reason — do not let a name-matching heuristic in an
  adapter merge the Trams T50 hub-lock and the `edinburgh-waverley` National Rail stationGroup into
  one board.

## Edinburgh Trams: standard line+terminus model, unlike Glasgow Subway's loop

Separately from the NR question — Edinburgh Trams T50 is a normal point-to-point line with two
confirmed termini (Newhaven, Edinburgh Airport) and a stated 7-10 minute headway. This is NOT the
circular-loop-with-no-termini problem Glasgow Subway posed (see Glasgow's direction-model-memo.md
Part 1) — no new direction model needed, use the standard line+terminus label. See this pack's own
direction-model-memo.md Part 1.

## Trams stop order is UNVERIFIED — do not wire direction logic on it as-is

`published-network.json`'s `lines[0].stations` array is transcribed from the oracle report's line
21 list, which reads as a plausible end-to-end sequence but was never confirmed by the report to
BE an ordered stop sequence, and was never checked against an official Edinburgh Trams map or the
DFT BODS GTFS's `stop_times`/`stop_sequence` columns (neither Nico's report nor this pack pulled
that GTFS file). `stationOrderVerified: false` is set explicitly on the line entry. **Confirm this
before using the array to compute next-station logic in a live adapter.**

## Edinburgh Trams real-time: still unknown, still schedule-only

No GTFS-RT feed found by Nico for Edinburgh Trams (report line 61, 79-81, 103-109; TFE Open Data
API inactive). This pack does not resolve it. Schedule-only v1 remains the working plan; skip risk
carried forward unresolved. Contact trams@tfe.scot before assuming RT will ever exist for this
mode.

## National Rail: still blocked at account level

Same blocker as every other UK region — EvansAppStudio's RDM registration is AU, needs UK
re-registration before DARWIN_LDB_TOKEN can be provisioned. Not a feed problem, don't treat it as
one.

## Falkirk High boundary — checked against Glasgow's merged pack, discrepancy flagged not resolved

The dispatch instruction asked this pack to check consistency with Glasgow's just-merged pack on
the Falkirk High boundary treatment. Both packs independently exclude Falkirk High from their own
catalogs, so there is **no functional contradiction** — neither region's `published-network.json`
contains a Falkirk High station or stationGroup. However, the two oracle reports' PROSE disagrees
on which region "owns" the station:

- Glasgow's oracle report / pack: "Falkirk High (owned by Edinburgh region) vs anything in this
  catalog — excluded entirely" (Glasgow hazard-pack.md H1).
- Edinburgh's oracle report (this pack's own source, line 9): "Falkirk High is the exclusive-
  territory split point on Glasgow-Edinburgh corridor... Falkirk High is Glasgow's boundary
  station."

Read literally, these two statements assign Falkirk High to opposite regions. This pack does NOT
resolve the discrepancy or add Falkirk High to Edinburgh's catalog either way — it stays excluded
here regardless of which reading is correct, because Edinburgh's own report never lists it as one
of Edinburgh's stations in the station-name table (report lines 15-21). **Flagging this back to
Nico/Tim for a single authoritative statement** (ideally landing in a future
`docs/united-kingdom-ledger.md`) rather than guessing which report's phrasing is the typo.

## Missing UK country ledger — flagged again

`docs/country-lane.md`'s "Standing retrofits" section names the UK ledger as required **before the
next NR region**. Checked again at the start of this pack (`docs/*ledger*.md` glob) — still does
not exist. Edinburgh is another NR region shipped without it (East Midlands, North East, West of
England, South Wales, Rest of Wales, Rest of Scotland, West Yorkshire, london-se-national-rail,
Glasgow, now Edinburgh — none of them have triggered the retrofit). This pack proceeds on the
oracle report alone per the dispatch instruction, plus the one explicitly-requested cross-check
against Glasgow's already-merged pack. This gap keeps compounding and should be raised to Tim/Nico
directly rather than re-flagged silently by every region forever — the Falkirk High phrasing
discrepancy above is a direct symptom of not having a ledger to hold this fact once, centrally.

## Open items for Tim only — do not resolve

1. **National Rail / OpenLDBWS redistribution terms are ambiguous.** Same open item as every other
   UK National Rail region. Review the signed RDM Data Sharing Agreement once EvansAppStudio
   re-registers.
2. **Falkirk High ownership discrepancy** between Glasgow's and Edinburgh's oracle reports (see
   above) — needs a single authoritative statement, ideally in the still-missing UK ledger.
3. **Edinburgh Trams stop order** — needs independent verification (official Trams map or DFT BODS
   GTFS stop_sequence) before next-station direction logic can be wired correctly.
4. **Edinburgh Trams real-time feed confirmation** — contact trams@tfe.scot to confirm whether TFE
   will ever publish a successor to the closed Open Data API (report line 79-83).
5. **UK country ledger retrofit** — overdue across ten+ NR regions now; should run before the
   region after this one, not indefinitely deferred.

## H7 / license summary

Europe/London, HAS DST (BST/GMT). National Rail under OGL 2.0 + NRE amendments (unclear on
third-party redistribution — same open item as every other UK NR region). Edinburgh Trams static
GTFS (DFT BODS) is OGL 3.0, confidence `clear`; Trams real-time confidence `not found` (no feed
confirmed). National Rail static GTFS (Transitland) is CC-BY-2.0 UK, confidence `clear`,
reference-only, not used to derive this catalog.

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit, no
GTFS fetch/parse (DFT BODS or Transitland), no invented Trams stop order beyond flagging the
report's list order as an unverified candidate, no invented Trams frequency beyond the report's
stated 7-10 minute headway, no invented National Rail destination strings, no CRS verification
against a live feed, no `docs/united-kingdom-ledger.md` creation (flagged as overdue, not this
pack's job to write), no wiring of `DARWIN_LDB_TOKEN`, no reading of any other city's in-progress
pack (Glasgow's pack is merged, not in-progress — read only for the specific boundary-consistency
check the dispatch instruction requested).
