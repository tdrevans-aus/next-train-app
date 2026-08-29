# Oslo hazard pack (H1–H7)

Evidence: Oslo oracle-clash report (Nico, 29 Aug 2026) — D1 = ruter.no T-bane linjekart + timetables,
hand-transcribed, **not generated from GTFS**. H2 surfaces: Entur GTFS-RT TripUpdates
(`datasource=RUT`, `ET-Client-Name` header, no key, verified HTTP 200 28 Aug 2026), Entur
GraphQL JourneyPlanner (same header), Entur static GTFS aggregation (H2 name-clash only).

## H1 — parent + child

`doNotGroup`: **Jernbanetorget T-bane (metro) vs Oslo Central Station / Oslo S / Jernbanetorget
railway station (Vy/NSB)**. Both sit on Jernbanetorget square; the metro stop is in the tunnel,
the rail station is above ground. Report also flags bus terminals and tram present at street
level at the same square — those are separate products again, not folded into either lock.

Report does not give a GTFS `stop_name`/parent form for Jernbanetorget beyond the generic
`Jernbanetorget, Oslo` family match, so there is no confirmed second doNotGroup string pair here
beyond the metro-vs-rail split already stated — do not invent a GTFS parent string that wasn't in
the report.

## H3 — thin / event / overlay

- **Line 6 (Fornebu)**: under construction, opening expected 2029. Report explicitly warns GTFS
  "may pre-stage stops" before passenger opening — a GTFS-RT/static feed showing Line 6 trip ids
  or Blindern-branch stops is not a D1 signal. Do not insert.
- No other overlay/short-turn/partial-trip surfaces are mentioned in the oracle report (no
  equivalent of Canberra's Rapid bus overlay or Rotterdam's peak extras). Do not assume Oslo has
  none — this is an **unconfirmed absence**, not a verified "no overlays exist." Flag back to Nico
  if Jim's QA turns up short-turn trips in GTFS-RT that aren't on the Ruter map.

## H4 — branches (doNotGroup / do-not-guess candidates)

| node | branches | evidence |
| --- | --- | --- |
| Majorstuen | western terminus of the Common Tunnel (Fellestunnelen); lines 1–5 diverge west of here | oracle report, station name table |
| Tøyen | all five lines converge/diverge here; secondary transfer hub | oracle report §Hub lock |
| Skøyen | served by lines 1 & 2, west of centre | oracle report station name table row |
| Frogner | served by line 3, west of centre | oracle report station name table row |
| Blindern | Line 6 branch only — **not D1-live, do not insert** | oracle report station name table row |

**Hazard**: the report gives no ordered station list for any line west of Majorstuen or east of
Tøyen, and no termini for lines 1–5. It names Skøyen/Frogner/Blindern as *served-by* facts but not
their position in a sequence. Do not fill this gap from GTFS `stop_sequence`, from a generator, or
from general knowledge of the Oslo T-bane network — the report itself says D1 is hand-transcribed
from Ruter, not generated from GTFS, and states "Check Ruter timetable for line-specific branch
routes" as unfinished work, not a completed check. This is flagged as a **coverage gap** in
`published-network.json`, not guessed at.

## H5 — nested short turns

Not covered in the oracle report. No nested/short-turn passenger codes are documented one way or
the other. Do not assume none exist.

## H6 — inner city (where §3 lives)

Locked hub: **Stortinget** — all five T-bane lines serve it; report calls it "kilometer zero" of
the network; located beneath the Storting (Parliament). This is the strongest hub lock of any
reference city seen so far (5-of-5 lines, not 3-of-5 or fewer).

Secondary transfer hub: **Tøyen** (lines 1–5 converge, street-level interchange) — report is
explicit this is a hub but **not** the singular lock like Stortinget; handle as an interchange
node, not a fragment/collapse point.

Do not fragment Stortinget's label by line — all five lines pass through in both directions, so
any label logic that treats Stortinget as a single-line terminus or as an inbound/outbound-only
node will be wrong the moment more than one line is rendered there.

## H7 — DST

**Europe/Oslo observes DST** (CET / CEST, UTC+1 standard / UTC+2 summer). Report states this
directly. Do not copy a no-DST timezone convention from any city that doesn't observe it (e.g. do
not assume Oslo behaves like a fixed-offset city). Standard IANA `Europe/Oslo` tz handling should
cover the spring-forward/fall-back edges; no Oslo-specific transition dates were given in the
report, so use the standard EU-wide DST rule (last Sunday in March / last Sunday in October) rather
than hand-rolling dates.

## Norwegian character hazard

Ø, Å, ø, å are preserved in both the Ruter D1 print forms and in Entur GTFS `stop_name` values per
the oracle report. **Do not ASCII-fold** (Ø→O, Å→A) anywhere in the pipeline — station name
matching, display strings, or search/lookup keys. A silent fold here breaks the doNotGroup/lock
matching this pack defines, since the locked strings (Stortinget, Jernbanetorget, Grønland, Tøyen,
Nationaltheatret) rely on exact-string equality downstream.

## GTFS auth hazard

`ET-Client-Name` is a **required identifying header, not a secret key** (Entur uses NLOD — the
Norwegian License for Open Data — no auth token). Do not treat it like a rotatable API key; do not
store it as a secret. Both GTFS-RT (`https://api.entur.io/realtime/v1/gtfs-rt/trip-updates?datasource=RUT`)
and GraphQL JourneyPlanner (`https://api.entur.io/journey-planner/v3/graphql`) require it. Missing
the header is a likely first-integration failure mode (Jim should confirm the request fails
cleanly/informatively without it, not silently).

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| Jernbanetorget (T-bane) vs Oslo Central Station / Oslo S / Jernbanetorget railway | Metro stop in tunnel vs Vy/NSB long-distance rail station above ground, same square |
| Jernbanetorget (T-bane) vs street-level bus/tram terminals | Different products at the same square; report flags but does not name specific bus/tram stop strings |
| Blindern vs Line 1–5 stations | Line 6 (Fornebu) only; not D1-live; do not insert until a new D1 flip after opening (expected 2029) |
| Stortinget vs any single-line fragment of it | Hub lock — all 5 lines; do not split by line |

## What I did not do

No line-map generator from GTFS, no `stopIds` in `published-network.json`, no live city flip, no
GitHub PR, no fabricated termini/branch stations for lines 1–5, no ASCII-folding of Norwegian
characters, no tram/bus/rail rewrite, no construction-status monitor for Line 6.
