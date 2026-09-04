# Liverpool City Region hazard pack (H1–H7)

Evidence: `docs/liverpool-city-region-d1/oracle-clash-report.md` (Nico) only. No
`docs/united-kingdom-ledger.md` exists yet (still only `docs/denmark-ledger.md` on the
`docs/*-ledger.md` glob) — this pack proceeds without one, same basis as every other UK region
packed so far (Greater Manchester's pack flagged this as overdue; still not written). Per the
"files, not chat" rule, no other city's in-progress pack was read for context.

## RESCOPED 4 Sep 2026 — full-network rescope, 6 stations to 98

This pack originally catalogued 6 stations (2 National Rail hub/secondary-hub, 4 named Merseyrail
stations). Tim rejected that as too thin for a real launch (`docs/luke-brief-liverpool-full-network-
rescope.md`) — it was a leftover from an abandoned `uk-ellesmere-port` thin-corridor plan and never
expanded, despite the oracle report itself flagging the gap (report line 19: "Verify station count
during D1 pack stage; do not assume all 96 are in-scope"). The catalog is now **29 National Rail +
69 Merseyrail = 98 stations**, sourced from ORR Table 6329 (filtered to Combined authority =
Liverpool City Region for National Rail, Station facility owner = Merseyrail for Merseyrail, plus
Chester and Lime Street's Merseyrail presence to reach the report's confirmed 69-station total) and
NaPTAN for coordinates. Full before/after detail, sourcing, and what could not be sourced:
`docs/liverpool-city-region-d1/rescope-addendum.md`. Every hazard finding below (H1–H7) was
re-checked against the new scale and is unchanged unless explicitly noted as updated.

## H1 — parent + child

**One agency pair, one named hub station, but the report contradicts itself on whether the two
agencies share platforms or separate buildings — not resolved here.**

- Line 41 of the report: "Main National Rail terminus; **Merseyrail Northern/Wirral Lines
  interchanges at platform level**." This phrasing implies Merseyrail has its own platforms at
  Lime Street itself, a Victoria/Sheffield-Station-shaped case (one building, doNotGroup between
  layers).
- Line 73 (board eligibility section) and C2/C3 point 2: "**separate infrastructure, separate
  entrance/footbridge**" — this phrasing implies a walk-link pair, closer to the Manchester
  Piccadilly/Piccadilly Gardens or West Yorkshire Bradford Forster Square/Interchange shape
  (genuinely separate buildings, not a shared concourse).
- The report never resolves which of these two descriptions is accurate, and does not name a
  walk time or distance the way the Manchester and Bradford reports did (contrast: Manchester's
  report gave "~100m, 5–10 min" for Piccadilly/Piccadilly Gardens and "2–5 min via
  escalator/lift" for Victoria — this report gives neither figure for Lime Street).

**This pack does not silently pick one.** It builds Liverpool Lime Street as the sole National
Rail hub lock, and treats the Merseyrail interchange at/near Lime Street as a **separate
stationGroup, doNotGroup: true**, using the more conservative (separate-infrastructure) reading —
because two of the report's three mentions of the Lime Street/Merseyrail relationship (line 73,
C2/C3 point 2) use "separate infrastructure/footbridge" language, against one ("platform level")
in the station table. If the true relationship is a single shared building the way Victoria is in
Greater Manchester, this pack's doNotGroup-as-two-stationGroups treatment is still safe (it never
merges the two); if the true relationship is a walk-link pair, treating them as one stationGroup
would have been wrong. Flagged as an open item for Tim/Nico to confirm with a walk-distance figure
before Jim wires an adapter — see jim-handoff.md.

## H2 — clash surface

Restated from the report (lines 3, 90, 94):

1. **National Rail account-level blocker (same as the rest of the UK wave).** Darwin/OpenLDBWS is
   documented and technically live, but blocked at the account level — EvansAppStudio's Rail Data
   Marketplace registration is Australian; RDM's geography check rejects AU registrations for GB
   services. Tim is re-registering with a UK address. Same blocker as every other UK region packed
   this wave (report line 3, 90). Build the catalog normally; the region stays "Coming Soon"
   (`status: "planned"`) until `DARWIN_LDB_TOKEN` exists.
2. **Merseyrail real-time: genuinely unknown, not the standard account block.** No documented
   public GTFS-RT endpoint found in Transitland, Mobility Database, or Merseyrail's own developer
   documentation — only a mobile app with undocumented internal API (report lines 23, 92, 158–164).
   Same *kind* of hazard as Greater Manchester's Metrolink gap and South Yorkshire's
   Supertram/SYFTL gap — a genuine "no confirmed feed exists," not "Tim needs to re-register."
3. **Lime Street/Merseyrail structural relationship is ambiguous within the report itself** (see
   H1) — unlike Manchester Victoria (clearly one building, escalator/lift, 2–5 min) or Manchester
   Piccadilly/Piccadilly Gardens (clearly separate, ~100m, 5–10 min), this report gives no
   distance/time figure and uses contradictory language across its own sections.
4. **Merseyrail v1 scope was left as an open decision by the report** (Option A include
   schedule-only vs Option B defer to H2, report lines 29–33) — the report's own recommendation
   leans toward deferring Merseyrail, but this pack makes a different call; see
   direction-model-memo.md and jim-handoff.md for the reasoning.
5. **Ellesmere Port registry discrepancy — RESOLVED 2 Sep 2026.** Tim decided: `uk-ellesmere-port`
   was a hangover concept, not a real region — deleted. The standalone registry entry, picker row,
   and catalog file are gone; Ellesmere Port (ELP) exists only as this pack's own Merseyrail Wirral
   Line terminus, unchanged. No data was lost — this pack already carried the station.

## H3 — thin / event / overlay

**Gap, not resolved.** The report gives no detail on short turns, peak extras, event-only stops,
or overlay services for either Merseyrail or the seven National Rail operators. Nothing to report
here beyond: do not invent any.

### Northern Line vs Wirral Line membership for ~60 Merseyrail stations — real gap, recorded here, not silently dropped

**Added at the 4 Sep 2026 rescope.** The 69-station Merseyrail catalog is complete as a *station
list* (source: ORR Table 6329 + NaPTAN, see rescope-addendum.md), but it is **not** a complete
*line-membership* map. Only 8 of the 69 Merseyrail stations carry a line assignment in
`stations.json`: Liverpool Central and Moorfields (dual-line interchange, both lines, report lines
50–51), Southport, Ormskirk, and Headbolt Lane (Northern Line termini, report line 21), and
Ellesmere Port, West Kirby, and Chester (Wirral Line termini, report line 21). The remaining
**~60 stations have no `line` field at all.**

Two sources were tried and both failed, per the brief's escalation instructions (do not guess, flag
instead):

1. **ORR Table 6329** — has no route/line column. It carries station identity, facility owner, and
   local-authority district, not which line(s) call at a station.
2. **Transitland's REST API** (the source that would carry the `stop_times`/`routes` join needed to
   derive line membership from the confirmed-live `f-gc-rail~delivery~group~planar~gtfs` feed) —
   returned **401 Unauthorized** on every attempt. The feed's public browse page has no no-key
   static bulk-download link, only the authenticated API, and no `TRANSITLAND_API_KEY` (or
   equivalent) exists in this environment.

**Do not infer the remaining ~60 stations' line membership from geography, borough name, or
proximity to a named terminus** — that would be exactly the kind of invented station-graph fact
this pipeline's guardrails exist to prevent. This is a genuine sourcing gap, not a judgment call:
per the brief's section 3, it should be handed back for a short, scoped Nico follow-up (confirm
line membership only, e.g. via a Transitland API key or a transcribed public Merseyrail line
diagram) rather than resolved here by inference.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| **Liverpool Lime Street (LIV)** | National Rail platforms (Northern Trains + six through-running TOCs) vs Merseyrail Northern/Wirral Line platforms/interchange | Report lines 41, 73, C2/C3 point 2: contradictory "platform level" vs "separate infrastructure, separate entrance/footbridge" language — see H1. **Built as two separate stationGroups, doNotGroup: true**, using the more conservative separate-infrastructure reading. |
| **Liverpool Central / Moorfields** | Merseyrail Northern Line vs Wirral Line (dual-line interchange, both lines call both stations) | Report lines 50–51: both stations are Merseyrail-only, "dual-line interchange" — no National Rail service at either. Not a National Rail/Merseyrail doNotGroup pair; internal to Merseyrail only, no cross-mode split needed here. |
| **Ellesmere Port** | Merseyrail Wirral Line terminus, sole owner | Report line 52, 55, 114–117. **Resolved 2 Sep 2026:** `uk-ellesmere-port` standalone registry entry deleted; this pack's catalog entry is now the only one. Not a doNotGroup case — never was. |

## H5 — nested short turns

**Not documented in the report.** No nested/short-turn codes given for any Merseyrail branch or
National Rail operator. Flag only — nothing to encode.

## H6 — inner city (where §3 lives)

**Two-agency structure: National Rail hub lock at Lime Street with a secondary hub at South
Parkway; Merseyrail's own hub structure (if in v1 scope) sits at Liverpool Central/Moorfields, not
at Lime Street.**

### National Rail: Liverpool Lime Street is the hub lock, Liverpool South Parkway is the secondary hub

Report line 42/table row 2: Liverpool South Parkway is "National Rail station; airport connector
(Liverpool John Lennon Airport). Regional and long-distance services" — a clear second National
Rail node distinct from the terminus, reusing the hub + secondary-hub shape already established in
Thames Valley/Solent/West of England/Greater Manchester. **Built: Liverpool Lime Street = National
Rail hub lock; Liverpool South Parkway = National Rail secondary hub.**

### Merseyrail: Liverpool Central and Moorfields are the network's own interchange pair (if included in v1)

Report lines 50–51 name both as "Merseyrail dual-line interchange" stations, with no ranking
between them (unlike Greater Manchester's Metrolink report, which explicitly named St Peter's
Square as "the" hub over Victoria). **This pack does not invent a ranking the report does not
give** — Liverpool Central and Moorfields are both built as Merseyrail interchange stationGroups,
neither marked as sole hub lock over the other. Flagged as an open item for Tim/Nico: if a real
ranking exists (e.g., Central being the more central/busier interchange), it is not sourced here.

### Lime Street is not a shared-building hub the way Manchester Victoria is (this pack's working assumption)

Per H1, this pack treats Lime Street's National Rail and Merseyrail presence as two separate
stationGroups (doNotGroup: true) rather than one shared-building entry — the conservative reading
given the report's contradictory language. If future confirmation shows a genuine one-building,
escalator/lift-connected relationship (the Victoria/Sheffield Station shape), this should be
revisited; if it shows a walk-link relationship (Piccadilly/Piccadilly Gardens shape), the current
build is already correct.

## H7 — DST

Liverpool City Region is in the UK, timezone **Europe/London**, which **observes DST** (BST in
summer, GMT in winter). UK-wide fact, stated here so Jim doesn't have to re-derive it — same as
every other UK region packed so far.

## doNotGroup proposals

| candidate | status | reason |
| --- | --- | --- |
| Liverpool Lime Street: National Rail platforms vs Merseyrail interchange | **Built (doNotGroup: true), relationship ambiguous — see H1** | Report contradicts itself on "platform level" (line 41) vs "separate infrastructure, separate entrance/footbridge" (line 73, C2/C3 point 2). Built conservatively as two stationGroups pending confirmation. |
| Ellesmere Port vs `uk-ellesmere-port` registry entry | **Flagged, not a station-graph doNotGroup — registry-scope discrepancy** | Tracker says fold into Liverpool City Region; registry currently keeps it standalone. Second flag of this issue (Nico flagged first). Jim/Tim call, outside Luke's scope. |

## What I did not do

No generator, no invented Merseyrail stop order or route topology beyond the report's
line/terminus summary (Northern Line: Liverpool–Southport/Ormskirk/Headbolt Lane, 39 stations;
Wirral Line: Liverpool–Ellesmere Port/West Kirby/Chester, 34 stations), no invented National Rail
destination strings, no CRS-code verification against a live Darwin response, no resolution of the
Lime Street/Merseyrail structural ambiguity (H1, flagged not resolved), no resolution of the
Ellesmere Port registry discrepancy (Jim/Tim call), no resolution of the OpenLDBWS
redistribution-terms ambiguity (open item for Tim, same as every other UK NR region), no
resolution of the Merseyrail real-time feed status (open item for Tim/Merseyrail contact, same
shape as Greater Manchester's Metrolink gap and South Yorkshire's Supertram/SYFTL gap), no wiring
of `DARWIN_LDB_TOKEN`, no product edit, no `lib/providers/` edit, no reading of any other city's
in-progress (unfinished) pack.

**Updated at the 4 Sep 2026 rescope:** ORR Table 6329 and NaPTAN *were* pulled this pass (not a
GTFS fetch — Transitland's REST API returned 401 with no API key available, see H3) to build the
full 98-station catalog and real coordinates for every station; that is the one exception to "no
GTFS fetch/parse" above and is scoped narrowly to station identity + lat/lng, not to line
membership, route topology, or timetable order — those remain unsourced gaps (see H3, "Northern
Line vs Wirral Line membership").
