# Greater Manchester hazard pack (H1–H7)

Evidence: `docs/greater-manchester-d1/oracle-clash-report.md` (Nico) only. No
`docs/united-kingdom-ledger.md` exists yet (`docs/*-ledger.md` glob still has only
`denmark-ledger.md`) — this pack proceeds without one, same basis as every other UK region packed
so far. Per the dispatch instruction, one named adjacent region's *finished, merged* pack —
`docs/west-yorkshire-d1/` — was checked strictly for the Walsden reciprocal boundary-flag
consistency (that pack explicitly names Greater Manchester as the flag's other side and states "no
Greater Manchester D1 pack exists yet to cross-check against" — this pack closes that gap). Not
read for general context beyond that single check.

## H1 — parent + child

**Two agencies, no shared physical building at every intersection point — this is genuinely
different from East Midlands/South Yorkshire's Nottingham/Sheffield Station shape.** Metrolink
(TfGM light rail, 8 lines, 99 stops) and National Rail (Darwin/OpenLDBWS, six TOCs) intersect at
two named stations, but the two intersections are structurally different (report line 3, 15–16):

- **Manchester Victoria (MCV CRS)** — Metrolink's Victoria tram stop (4 platforms) and National
  Rail's Manchester Victoria (6 platforms) are **at the same physical location**, connected by
  escalator/lift within one shared concourse/ticketing area (report line 3, 15). This is the
  Sheffield-Station-shaped case: one building, two layers, doNotGroup between them.
- **Manchester Piccadilly (MAN CRS)** — Metrolink's Piccadilly Gardens tram stop (undercroft,
  basement level) is **~100m away at street level**, a 5–10 minute walk via moving walkways from
  NR's main platforms 13–14 (report line 16). This is **not** a one-building two-layer hub the way
  Victoria or Sheffield Station is — it is closer to West Yorkshire's Bradford Forster
  Square/Bradford Interchange pair (separate infrastructure, walk-link only, still doNotGroup but
  not a shared-building parent/child case).

Do not collapse these two cases into one "hub lock" fact — they need different treatment. See H6.

## H2 — clash surface

Restated from the report (lines 65–69, 71–96):

1. **Metrolink real-time: genuinely unknown, not the standard account block.** TfGM's developer
   portal (opendata.tfgm.com) is deprecated and no longer issues new API keys; existing keys
   continue to function on an unconfirmed timeline. No public GTFS-RT feed confirmed anywhere
   (report line 3, 65, 108–114, C2/C3 point 6). This is the same *kind* of hazard as South
   Yorkshire's Supertram/SYFTL gap — "no confirmed feed exists at all," not "Tim needs to
   re-register" — and per the task brief, it is **not** guessed around: Metrolink ships v1 as
   **schedule-only**, pending TfGM confirmation (data.analytics@tfgm.com /
   https://tfgm.com/open-data).
2. **National Rail account-level blocker (same as the rest of the UK wave).** Darwin/OpenLDBWS is
   documented and technically live, but blocked at the account level — EvansAppStudio's Rail Data
   Marketplace registration is Australian; RDM's geography check rejects AU registrations for GB
   services. Tim is re-registering with a UK address. Same blocker as East Midlands / West
   Midlands / Liverpool City Region / South Wales / West Yorkshire / South Yorkshire / Thames
   Valley / West of England / Solent / London & South East — **not a feed problem**. Build the
   catalog normally; the region stays "Coming Soon" (`status: "planned"`) until
   `DARWIN_LDB_TOKEN` exists.
3. **Structural clash at the two intersection points is asymmetric (see H1)** — Victoria is a
   true shared-building two-layer hub (doNotGroup, same as Sheffield Station); Piccadilly is a
   walk-link-only pair of separate stops (doNotGroup, but not a shared-building parent/child
   relationship, closer to Bradford Forster Square/Interchange).

## H3 — thin / event / overlay

**Gap, not resolved.** The report gives no detail on short turns, peak extras, event-only stops,
or overlay services for either Metrolink or the six National Rail operators. Nothing to report
here beyond: do not invent any.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| **Manchester Victoria (MCV)** | Metrolink tram (4 platforms) vs National Rail (6 platforms) | Report line 3, 15, 81: "escalators/lift... ~2–5 minutes" walk within one shared station; C2/C3 point 5: "doNotGroup Manchester Victoria tram vs. rail platforms... crossing requires concourse passage (no cross-platform interchange, but same-station walking distance)." **Built as doNotGroup: true**, same shape as Sheffield Station (South Yorkshire) and Nottingham Station (East Midlands). |
| **Manchester Piccadilly (MAN) vs Piccadilly Gardens (Metrolink)** | National Rail main platforms 13–14 vs Metrolink undercroft/basement stop, ~100m away | Report line 16: "tram stop is ~100m away at street level (basement); walk distance via moving walkways ~5–10 minutes to main NR platforms." **Built as two separate stationGroups, doNotGroup: true between them** — not a shared-building parent/child relationship (unlike Victoria), closer to West Yorkshire's Bradford Forster Square/Bradford Interchange pattern (separate infrastructure, walk-link only, still flagged doNotGroup so the two are never silently merged). |
| ~~**Stockport**~~ | ~~National Rail station (SMN) vs Metrolink tram-only stops nearby~~ | **Correction, 7 Sep 2026: no Metrolink stop at Stockport — the earlier "two Stockports" hazard was an error.** Manchester Metrolink has never served Stockport; a Stockport extension has only been proposed. The report's line 19 reference to a "Stockport tram stop" was built on a stop that doesn't exist. Nothing to model here; see docs/jim-brief-net-toton-lane-and-stockport-tram.md. |

## H5 — nested short turns

**Not documented in the report.** No nested/short-turn codes given for any of the eight Metrolink
lines or six National Rail operators. Flag only — nothing to encode.

## H6 — inner city (where §3 lives)

**Two-agency, dual-architecture hub structure — hub + secondary-hub inside National Rail (reusing
the Thames Valley/Solent/West of England pattern the task brief named), plus a separate hub +
secondary-hub inside Metrolink, cross-linked only at Victoria.**

### National Rail: Piccadilly is the hub lock, Victoria is the secondary hub

The oracle report's own C2/C3 point 4 frames "hub lock" as the *cross-mode* integration point
(Victoria) and doesn't separately name a National Rail-only hub. Read against the rest of the
report, that undersells Piccadilly: it has **14 platforms versus Victoria's 6** (report line 16,
79), and **all six National Rail operators call Piccadilly** (Northern, Avanti, TransPennine
Express, CrossCountry, East Midlands Railway, Transport for Wales — board eligibility table, lines
34–39) versus **only two at Victoria** (Northern, TransPennine Express). Report line 22 itself
states "National Rail services converge at Manchester Piccadilly (main intercity/regional hub, 14
platforms) and Manchester Victoria (secondary hub, 6 platforms)" — this sentence, not C2/C3 point
4's cross-mode framing, is what this pack treats as the National Rail station-graph fact. Excluding
Piccadilly from the catalog (or leaving it un-hubbed) would silently drop the busiest NR station in
the region and four of six operators found nowhere else — the same board-eligibility failure mode
Thames Valley's memo rejected for Oxford. **Built: Manchester Piccadilly = National Rail hub lock;
Manchester Victoria = National Rail secondary hub**, same hub + secondary-hub shape West of
England/Solent/Thames Valley already established, reused here across two hubs of a different
agency than those three regions' single-agency case.

### Metrolink: St Peter's Square is the hub, Victoria is the secondary hub

Report C2/C3 point 2: "Hub: St Peter's Square (most central interchange, all lines converge in
Zone 1). Secondary hub: Manchester Victoria (also connects to National Rail)." Report line 17:
St Peter's Square is "the most used stop on Metrolink network; convergence point for most lines
(serves as operational hub for tram planning)." **Built: St Peter's Square = Metrolink hub lock;
Manchester Victoria = Metrolink secondary hub.**

### Victoria is the cross-mode link, not a third hub

Manchester Victoria is the single physical point where the two agencies' station graphs touch —
it is *simultaneously* National Rail's secondary hub and Metrolink's secondary hub, sharing one
building (H1). This pack does not invent a third "combined" hub tier for it; it is built as one
stationGroup entry with `doNotGroup: true` between its two platform layers, printed once, and
referenced from both agencies' hub structures. This is the resolution to the task brief's question
of whether Piccadilly needs to be a secondary hub "rather than excluded entirely" — the answer is
Piccadilly is National Rail's *primary* hub, not a secondary one, and Victoria is secondary to
Piccadilly within National Rail while remaining Metrolink's own secondary hub.

### Piccadilly Gardens (Metrolink) — separate stationGroup, not merged into Piccadilly

Per H1/H4, the Metrolink stop near Piccadilly is a different physical location from the NR
station (~100m, 5–10 min walk, undercroft vs street-level main platforms). It is built as its own
catalog entry under Metrolink, `doNotGroup: true` against the Manchester Piccadilly NR
stationGroup, so the two are never silently presented as one interchange the way Victoria genuinely
is.

## H7 — DST

Greater Manchester is in the UK, timezone **Europe/London**, which **observes DST** (BST in
summer, GMT in winter). UK-wide fact, stated here so Jim doesn't have to re-derive it — same as
every other UK region packed so far.

## doNotGroup proposals

| candidate | status | reason |
| --- | --- | --- |
| Manchester Victoria: Metrolink tram (4 platforms) vs National Rail (6 platforms) | **Built (doNotGroup: true)** | Same building, escalator/lift connect, separate operators/infrastructure — report line 3, 15, 81, C2/C3 point 5. Same shape as Sheffield Station (South Yorkshire), Nottingham Station (East Midlands). |
| Manchester Piccadilly (NR) vs Piccadilly Gardens (Metrolink) | **Built (doNotGroup: true)** | ~100m apart, 5–10 min walk, undercroft vs street-level main platforms — report line 16. Not a shared-building case; closer to Bradford Forster Square/Bradford Interchange (West Yorkshire) than to Victoria/Sheffield Station. |
| ~~Stockport (NR) vs Stockport tram stops (Metrolink)~~ | **Not applicable (7 Sep 2026)** | No Metrolink stop at Stockport exists — the earlier "two Stockports" hazard was an error. See H4 above. |
| Walsden (WDN/WAD — CRS mismatch, see below) vs West Yorkshire | **Boundary flag only** | Through-running point, Calder Valley Line, Greater Manchester/West Yorkshire boundary — not a merge. |

## Walsden boundary consistency check — CRS code mismatch found, NOT resolved

Per the dispatch instruction, checked `docs/west-yorkshire-d1/published-network.json`
(`nationalRailStations.throughRunningOnly`) for the reciprocal Walsden flag it names. That pack
records Walsden with **CRS `WAD`** and states: "No Greater Manchester D1 pack exists yet to
cross-check against... Flagged for future de-dup once Greater Manchester is packed." This report
(line 18) gives Walsden's CRS as **`WDN`** — the two reports disagree on the three-letter code for
the same station. This pack does **not** silently pick one: it records Walsden here with the CRS
this region's own oracle report gives (`WDN`) and flags the mismatch explicitly as an open item
for Tim/Nico to resolve against a live Darwin response or National Rail's published CRS list
before either pack's Walsden entry is treated as verified. Neither `WDN` nor `WAD` is treated as
authoritative by this pack. See `published-network.json` coverageGaps and jim-handoff.md.

Both reports agree Walsden is a through-running-only point (Northern service, single operator,
same platform continuing across the boundary), not a merge — that part of the West Yorkshire
pack's framing is confirmed here, only the CRS code is inconsistent.

## What I did not do

No generator, no invented Metrolink stop order or route topology beyond the report's 8-line
via-point summary (C2/C3 point 10), no invented National Rail destination strings, no GTFS
fetch/parse (Metrolink static GTFS and the Transitland National Rail feed are cited by the report
as reference-only, not pulled here), no CRS-code verification against a live GTFS dump or Darwin
response (Walsden's WDN/WAD mismatch is flagged, not resolved — see above), no resolution of the
OpenLDBWS redistribution-terms ambiguity (open item for Tim, same as every other UK NR region), no
resolution of the Metrolink real-time feed status (open item for Tim/TfGM contact, same as South
Yorkshire's Supertram/SYFTL gap), no wiring of `DARWIN_LDB_TOKEN`, no product edit, no
`lib/providers/` edit, no reading of any other city's in-progress (unfinished) pack — West
Yorkshire's *finished, merged* `published-network.json` was read only for the specific Walsden
reciprocal-flag consistency check the dispatch instruction named, not for general context.
