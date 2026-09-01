# Rest of Wales hazard pack (H1–H7)

Evidence: `docs/rest-of-wales-d1/oracle-clash-report.md` (Nico) only. No UK-country ledger exists
yet (`docs/uk-ledger.md` is a standing retrofit per `docs/country-lane.md`, not yet written; the
`docs/*-ledger.md` glob has only `docs/denmark-ledger.md`). South Wales' finished pack
(`docs/south-wales-d1/`, merged to master) was read once, per the task instruction, only to check
its treatment of shared UK National Rail facts (Darwin account block, license confidence, boundary
station handling) so this pack doesn't contradict it — not as a source of Rest of Wales
station-graph fact.

## H1 — parent + child

Single agency: **National Rail** (Darwin/OpenLDBWS), operated in-franchise by Transport for Wales
across three geographic corridors (North Wales, Mid Wales, West Wales). Unlike South Wales'
two-agency Cardiff Central case (Valley Lines + National Rail on separate infrastructure), Rest of
Wales has no second agency and no parent/child station relationship documented — every corridor
routes through the single Darwin feed (report lines 3, 7).

## H2 — clash surface

**Two distinct blockers, different in kind — same shape as South Wales, but with an added
real-time-availability unknown specific to this region:**

1. **National Rail (Darwin/OpenLDBWS): documented and technically live but blocked at the account
   level** — same EvansAppStudio AU-registration issue as South Wales / West Midlands / Greater
   Manchester / Liverpool City Region / East Midlands / North East / West of England (report lines
   3, 65, 89). Not a feed problem. Build the National Rail catalog normally; region stays
   `status: "planned"` until `DARWIN_LDB_TOKEN` exists.

2. **Real-time feed status for Transport for Wales services specifically is unconfirmed** (report
   lines 34, 67, 121–127). This is a *third* kind of gap, distinct from both South Wales' Valley
   Lines "no public feed of any kind exists" case and the plain account-level block above: static
   GTFS via Transitland is confirmed live (Onestop ID `f-gc-rail~delivery~group~planar~gtfs`,
   verified 1 Sep 2026), but whether Darwin's OpenLDBWS actually carries live TfW National Rail
   real-time data — or whether TfW publishes GTFS-RT through any other channel — is **not
   established** in the report. The report is explicit this must be confirmed with TfW
   (data@tfw.wales) before wiring; it is not an oracle-report gap this pack can resolve, since
   resolving it would mean asserting a real-time feed exists on no evidence. See "What I did not
   do" below and `jim-handoff.md`.

## H3 — thin / event / overlay

**Gap, not resolved.** The report gives no information on short turns, peak extras, or event-only
stops for any of the three corridors. Nothing to report beyond: do not invent any.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Wrexham General (WRX) | North Wales Main Line (Chester–Wrexham–Shrewsbury) vs. North Wales Coast Line (Crewe–Wrexham–Holyhead) vs. Borderlands Line (Wrexham–Bidston/Merseyside) | Report line 17, 24, 81: three distinct routes converge at Wrexham General. Report gives corridor/route names but no platform-level or service-pattern detail beyond "junction of North Wales Main Line and Borderlands Line" — recorded as a proposed doNotGroup boundary (different destinations off the same hub), not a built rule requiring platform data the report doesn't supply. |
| Whitland (WLD) | West Wales branches to Fishguard Harbour, Milford Haven, Pembroke Dock | Report line 19: "branches from Whitland to Fishguard, Milford, Pembroke." Named as a branch point but the report gives no further station-graph detail (no platform numbers, no service split pattern) — flagged as a structural fact only, not built into a doNotGroup rule. |
| Carmarthen (CMN) | West Wales lines (Whitland direction) vs. Llanelli branch vs. eastward continuation to Swansea (South Wales region, out of catalog) | Report line 19, 32: Carmarthen is the West Wales junction; the Llanelli–Carmarthen branch "stays within catalog" (not a through-running boundary) while the Swansea direction leaves Rest of Wales for South Wales region. Recorded as both a doNotGroup candidate (branch vs. eastward through-running) and a coverage-boundary fact — see H6 and doNotGroup proposals below. |
| Machynlleth (MCH) | Cambrian Line north branch to Pwllheli vs. main line to Aberystwyth | Report line 18, 82: Cambrian Line splits at Machynlleth toward Aberystwyth or Pwllheli (both termini). No platform/service-pattern detail given beyond the route name and two termini — structural note only. |

No branch/junction detail beyond route names and named termini is given for any of the four points
above; none are built into an enforced doNotGroup rule pending station-graph confirmation once
Darwin is wired (see doNotGroup proposals).

## H5 — nested short turns

**Not documented in the report.** No nested/short-turn codes given for any corridor. Flag only —
nothing to encode.

## H6 — inner city (where §3 lives)

Locked hub: **Wrexham General (WRX)** — report lines 17, 24, 78: "Junction of North Wales Main
Line (Chester–Wrexham–Shrewsbury) and Borderlands Line (Wrexham–Bidston/Merseyside); largest North
Wales station by connectivity. Recommended hub lock." Explicitly not Wrexham Central (report line
78: "Do not conflate with Wrexham Central (southern terminus of Borderlands Line, lower
connectivity)").

Secondary/tertiary candidates named but **not** hub-locked:
- **Aberystwyth (AYW)** — Mid Wales terminus, lowest connectivity of the three (terminus only);
  report line 25 marks it "secondary candidate if North Wales proves less suitable; otherwise
  planned-only." Recorded here as the Mid Wales corridor's structurally significant station, not
  promoted to hub lock — the report gives North Wales/Wrexham as the clear primary pick.
- **Carmarthen (CMN)** — West Wales junction, report line 26: "lower priority than North or Mid
  Wales hubs." Recorded as the West Wales corridor's structurally significant station only.

Unlike South Wales, all three corridor "hub" candidates here sit inside a single agency's network
with no shared-infrastructure/footbridge case to record — no doNotGroup is needed between agencies
at Wrexham, only (potentially) between destinations/branches at the same station (H4 above).

## H7 — DST

Rest of Wales is in the UK, timezone **Europe/London**, which **observes DST** (BST in summer, GMT
in winter). Same UK-wide fact as every other UK region packed so far (South Wales H7, East
Midlands H7, North East H7, West of England H7). Report line 99 confirms explicitly.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| Wrexham General (WRX): North Wales Main Line / North Wales Coast Line / Borderlands Line destinations | Three distinct route directions converge at the hub lock (report lines 17, 24). **Proposed, not built** — no platform or service-pattern data in the report to encode a rule against; flag for Jim to confirm against a live Darwin payload once unblocked, same treatment as illustrative destination strings in the direction-model-memo. |
| Carmarthen (CMN): West Wales branch (Whitland direction, in-catalog) vs. eastward continuation to Swansea (South Wales region, out of catalog) | Report lines 19, 26, 94: "Carmarthen (CMN) continues to Swansea on South Wales Main Line (South Wales region, not Rest of Wales). Through-running only, no de-dup needed at this stage (separate regions)." This is a coverage-boundary fact (H6), not a same-region doNotGroup case, but recorded here too since it governs which destinations at CMN are in-catalog stops vs. through-running-only exits. No de-dup with South Wales' own catalog is attempted in this pack — that pack does not list Carmarthen at all, so there is nothing to reconcile against today, unlike South Wales' STJ-vs-Chepstow discrepancy with West of England. |
| Whitland (WLD): three West Wales branch destinations (Fishguard Harbour, Milford Haven, Pembroke Dock) | Report line 19: named branch point, no platform/service detail. **Proposed only** — flag for Jim; do not build without a live Darwin payload confirming the branch split is presented as such on real boards. |
| Machynlleth (MCH): Cambrian Line split toward Aberystwyth vs. Pwllheli | Report line 18: two termini off one route beyond Machynlleth. **Proposed only**, same reasoning as above. |

## What I did not do

No generator, no invented station graph beyond the corridor/route/station names the report gives
directly (report H2 table, lines 17–19). No resolution of the TfW real-time-feed-status unknown
(H2 above) — that is an open item for Tim/Jim, not something this pack asserts either way. No
promotion of Aberystwyth or Carmarthen to a second hub lock — the report names Wrexham General as
the sole recommended lock (report line 24) and marks the other two as lower-priority/secondary.
No wiring of `DARWIN_LDB_TOKEN`, no product edit, no `lib/providers/` edit, no reading of any other
city's in-progress pack (South Wales' finished/merged pack was read once for the cross-UK-fact
check noted above, not for Rest of Wales station-graph fact).
