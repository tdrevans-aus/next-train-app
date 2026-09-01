West Yorkshire D1 + research pack. City stays **planned** / "Coming Soon" until National Rail is
unblocked AND Jim wires testers live — this pack does not flip anything.
**assertCityLive("west-yorkshire") must fail** (city is not in `lib/providers/registry.js` CITIES
today — Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not flip
west-yorkshire live from this pack. Do not invent city=westyorkshire, city=leeds, or
city=bradford. Do not touch West Midlands, Greater Manchester, Liverpool City Region, East
Midlands, North East, West of England, or South Wales/South Yorkshire — same account-level
National Rail blocker, but separate regions/packs.

Lane lock: acquired `United Kingdom` / `West Yorkshire` / `luke` before writing (release happens
post-merge, per CLAUDE.md country-lane rule — not run by this pack).

Research pack is docs/west-yorkshire-d1/: published-network.json, oracle-clash-report.md,
hazard-pack.md, direction-model-memo.md, jim-handoff.md (this file).

## STOP CONDITION FOR MARK: Board eligibility section is missing from the oracle report

**Read this before wiring anything.** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026)
requires every oracle-clash report to carry a **Board eligibility** section — a table of every
rail service calling at in-catalog stations with a verdict (`in` / `out-reservation` /
`out-checkin` / `out-mode` / `out-product` / `undecided`) and evidence URL, or the explicit
sentence "No services other than the in-scope operator call at any in-catalog station — verified"
if trivially empty.

`docs/west-yorkshire-d1/oracle-clash-report.md` has **neither**. It names the operators (Northern
Trains, TransPennine Express) but never tests either against the walk-up boarding contract (§2 of
the rule: compulsory reservation? check-in barrier?). This is a real gap in Nico's report, not
something this pack can quietly fill — per the rule, verdicts are Nico's research output, carried
into the D1 pack by Luke, not invented by Luke. I did not fabricate a Board eligibility table here.

**Action needed before this city can pass Mark's QA gate:** a Nico follow-up pass on
`docs/west-yorkshire-d1/oracle-clash-report.md` specifically adding the Board eligibility section
(verify Northern Trains and TransPennine Express against both tests at Leeds Station, Bradford
Forster Square, Bradford Interchange, and the regional/through-running stations below). Until that
section exists, `coverageGaps` in `published-network.json` carries this as an open item, and per
`docs/board-eligibility-rule.md` §5, Mark's checklist item "(1) the section exists and has no
`undecided` rows" will fail — correctly. Do not let this city reach a flip-PR without it.

This mirrors what the task brief flagged as having "bit us on South Wales tonight" — South Wales'
own oracle report *does* carry a Board eligibility section (line 31, summary at line 54), so if
South Wales still hit a gate issue tonight it was likely a different Board-eligibility failure mode
(e.g. adapter filtering not matching a recorded verdict, per rule §5 item 2) — not a missing
section like this one. West Yorkshire's failure mode is the section not existing at all, which is
a Nico-side gap, not a Jim-side wiring gap. Flagging the distinction so it isn't mis-diagnosed.

## Hub lock

**Leeds Station (LDS)** is the locked hub — major interchange, 18 platforms (0-17), Network Rail,
central hub for West Yorkshire Metro transit authority (report line 17, C2/C3 point 1: "rail only;
bus connections at separate interchange"). **Bradford Forster Square (BDQ)** is a secondary hub —
main Bradford rail station (report line 18). **Bradford Interchange (BDI)** is a separate station,
connected to BDQ only by walk-link, not a shared platform — doNotGroup applies between BDQ and BDI
(report line 19, C2/C3 point 2). See hazard-pack.md H1/H6.

## doNotGroup rules to carry into the adapter

1. **Leeds Station: National Rail platforms vs. bus/coach platforms** (report C2/C3 point 3).
   Forward note only — bus is out of v1 scope, so there is no bus board to group against yet, but
   do not merge one in later without a doNotGroup rule at this station.
2. **Bradford Forster Square (BDQ) vs. Bradford Interchange (BDI)** (report C2/C3 point 2). Both
   are in-catalog National Rail stations (BDI carries Northern Trains rail service, not just bus)
   — they are two distinct catalog entries, walk-link connected, not a merge.

## Boundary de-dup: Denby Dale and Walsden — NOT resolved, flag for D2

**Denby Dale (DDL)** is the South Yorkshire boundary point on the Penistone Line (report line 20).
`docs/south-yorkshire-d1/published-network.json` already carries Denby Dale in its own
`throughRunningOnly` list (CRS left `null` there, flagged as a West Yorkshire de-dup concern in
that pack's hazard-pack.md and jim-handoff.md). This pack supplies the CRS code (DDL) from this
report's own station table but does **not** resolve which region's catalog entry should survive at
D2, or whether both regions keep independent through-running-only entries permanently. Same open
shape as South Wales' Severn Tunnel Junction vs. Chepstow discrepancy — flagged, not guessed at.

**Walsden (WAD)** is the Greater Manchester boundary point on the Calder Valley Line (report line
21). No Greater Manchester D1 pack exists yet (still account-blocked/unpacked per report line 32)
— nothing to reconcile against yet; flagged for whenever that pack is written.

## Direction model recommendation (National Rail only)

**Destination + operator** (e.g. `Manchester Piccadilly (TransPennine Express)`, `Sheffield
(Northern)`), matching how National Rail departure boards actually present and identical in shape
to every other UK National Rail region packed so far. No line+terminus model — Northern Trains and
TransPennine Express do not brand these corridors with named boardable line products here either.
**Illustrative only, not verified** — no destination strings can be confirmed until
`DARWIN_LDB_TOKEN` exists and a real Darwin payload can be pulled. See direction-model-memo.md.

## Open items for Tim only — do not resolve

1. **National Rail / OpenLDBWS redistribution terms are ambiguous.** Same open item as every other
   UK National Rail region — OGL 2.0 baseline permits redistribution with attribution, but the RDM
   Platform Agreement's language on downstream redistribution to third-party rider clients isn't
   confirmed in public sources. Confidence: `unclear`. Review the signed RDM Data Sharing Agreement
   once EvansAppStudio re-registers.
2. **Bus real-time availability** — report C2/C3 point 6 asks whether First West Yorkshire /
   Arriva Yorkshire / Transdev will publish real-time; defer v1 bus to a later wave until an answer
   exists. Not a Luke or Jim action.
3. **Denby Dale / Walsden boundary de-dup** (above) — needs a human or a future Nico pass per
   corridor, not something for Jim to pick between during adapter wiring.

## H7 / license summary

Europe/London, HAS DST (BST/GMT). National Rail under OGL 2.0 + NRE amendments (unclear on
third-party redistribution — see open item above). Bus GTFS (DFT aggregator) is OGL 3.0,
confidence `clear`, reference-only since buses are out of v1 scope.

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit, no
invented National Rail route/line topology (Darwin has no printed route map), no invented
destination strings beyond illustrative placeholders explicitly marked as such, no bus or West
Yorkshire Metro station graph, direction model, or catalog entry of any kind (buses deferred, WY
Metro planning-only — see published-network.json scopeNote), no fabricated Board eligibility
verdicts (flagged above as a Nico-side gap instead), no resolution of the Denby Dale or Walsden
cross-region de-dup or the RDM redistribution ambiguity (all flagged for Tim/Nico/D2), no reading
of any other city's in-progress pack (South Yorkshire's merged, finished pack was read once for
the Denby Dale boundary check only, per this task's explicit instruction), no wiring of
`DARWIN_LDB_TOKEN`.
