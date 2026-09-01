# Liverpool City Region hazard pack (H1–H7)

Evidence: `docs/liverpool-city-region-d1/oracle-clash-report.md` (Nico) only. No
`docs/united-kingdom-ledger.md` exists yet (still only `docs/denmark-ledger.md` on the
`docs/*-ledger.md` glob) — this pack proceeds without one, same basis as every other UK region
packed so far (Greater Manchester's pack flagged this as overdue; still not written). Per the
"files, not chat" rule, no other city's in-progress pack was read for context.

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
5. **Ellesmere Port registry discrepancy** — flagged a second time (Nico flagged it in research,
   this pack flags it again per the dispatch brief). `uk-ellesmere-port` exists as a standalone
   registry entry with status "planned"; the tracker says it should be folded into Liverpool City
   Region. Not resolved here — explicitly out of Luke's scope (registry edits are Jim/Tim's job) —
   see jim-handoff.md.

## H3 — thin / event / overlay

**Gap, not resolved.** The report gives no detail on short turns, peak extras, event-only stops,
or overlay services for either Merseyrail or the seven National Rail operators. Nothing to report
here beyond: do not invent any.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| **Liverpool Lime Street (LIV)** | National Rail platforms (Northern Trains + six through-running TOCs) vs Merseyrail Northern/Wirral Line platforms/interchange | Report lines 41, 73, C2/C3 point 2: contradictory "platform level" vs "separate infrastructure, separate entrance/footbridge" language — see H1. **Built as two separate stationGroups, doNotGroup: true**, using the more conservative separate-infrastructure reading. |
| **Liverpool Central / Moorfields** | Merseyrail Northern Line vs Wirral Line (dual-line interchange, both lines call both stations) | Report lines 50–51: both stations are Merseyrail-only, "dual-line interchange" — no National Rail service at either. Not a National Rail/Merseyrail doNotGroup pair; internal to Merseyrail only, no cross-mode split needed here. |
| **Ellesmere Port** | Merseyrail Wirral Line terminus vs `uk-ellesmere-port` standalone registry entry | Report line 52, 55, 114–117: tracker says Ellesmere Port should fold into Liverpool City Region, not remain a separate picker city; `uk-ellesmere-port` currently exists standalone in `registry.js`. **Not a station-graph doNotGroup — a registry-scope discrepancy.** Flagged, not resolved (Jim/Tim call). |

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
destination strings, no GTFS fetch/parse (Transitland's `f-gc-rail~delivery~group~planar~gtfs` is
cited by the report as reference-only, not pulled here), no CRS-code verification against a live
GTFS dump or Darwin response, no resolution of the Lime Street/Merseyrail structural ambiguity (H1,
flagged not resolved), no resolution of the Ellesmere Port registry discrepancy (Jim/Tim call), no
resolution of the OpenLDBWS redistribution-terms ambiguity (open item for Tim, same as every other
UK NR region), no resolution of the Merseyrail real-time feed status (open item for Tim/Merseyrail
contact, same shape as Greater Manchester's Metrolink gap and South Yorkshire's Supertram/SYFTL
gap), no wiring of `DARWIN_LDB_TOKEN`, no product edit, no `lib/providers/` edit, no reading of any
other city's in-progress (unfinished) pack.
