# Malmö hazard pack (H1–H7)

Evidence: `docs/malmo-d1/oracle-clash-report.md` only (Trafiklab GTFS Regional operator `skane`
static + GTFS-RT confirmation; Skånetrafiken linjekarta PDF access **blocked by egress policy,
unverified**). Per this pipeline's rule, no other source was fetched for this pack — gaps below
are flagged back rather than filled by guessing.

**Headline hazard, not in the H1–H7 grid below because it blocks all of them equally: the oracle
report does not contain a per-line station list, branch topology, or confirmed line-code table for
any of Pågatågen's 11 regular lines + rush-hour line 12.** It gives a 9-station "Malmö-area" list
and a line-count claim ("eleven core lines... plus line 12"), both useful, but nothing that lets
this pack build the ordered-stop / termini arrays the reference packs (Oslo, Rotterdam, Newcastle)
all have. The report itself says so: *"Do not generate published-network.json from GTFS alone —
verify station names + line structure against Trafiklab stops/routes."* This pack follows that
instruction and does **not** invent a station graph from GTFS on its own initiative. See
`coverageGaps` in `published-network.json` for the itemized list Nico/Jim need to close before D5.

## H1 — parent + child

Report confirms one clash directly: **Malmö C Pågatågen vs Malmö C Öresundståg** — same station,
different operator (Öresundståg is Skånetrafiken + DSB + Region Hovedstaden, a separate
cross-border product, not Pågatågen). doNotGroup.

**Flagged, not confirmed:** Triangeln and Hyllie are also City Tunnel (Citytunneln) stations built
in the same 2010 project as the Malmö C underground platforms, and Öresundståg services are known
to use the City Tunnel corridor generally. The oracle report does not say whether Öresundståg
calls at Triangeln and/or Hyllie. Treat this as a **likely** doNotGroup pair pending confirmation
— do not assume it collapses cleanly to Pågatågen-only at those two stops without checking.

No parent/child stop structure (GTFS `location_type`/`parent_station`) is described anywhere in
the report for any station, including Malmö C. Unlike Newcastle's Interchange (explicit
parent `229310` + child `229315`), we don't have this for Malmö C. Flag for Jim: confirm
parent/child shape directly against `stops.txt` at implementation time; do not assume single-row
stops.

## H3 — thin / event / overlay

- **Line 12 is rush-hour-only** and "may not appear in all GTFS snapshots" per the report. Overlay
  candidate — needs confirmation of whether it's a distinct route_id or a variant trip pattern on
  an existing line before deciding whether it gets its own chip.
- **Museum tram** (seasonal, Saturdays/Sundays) is out of v1 — confirmed by report, not a passenger
  network overlay to track.
- No other overlays (construction, event stops, replacement bus) are mentioned in the report. This
  is itself a gap: the report doesn't say it checked for any, so silence here should not be read as
  "confirmed none," only as "not researched."

## H4 — branches (doNotGroup candidates)

The report names a **ring line** — "Malmöringen / Malmöpendeln" — at three of the nine stations
(Svågertorp, Persborg, Östervärn are each tagged "Ring-line stop"). A ring service raises exactly
the Oslo-line-5-style hazard (a station called twice on one through-path, inbound/outbound
becoming meaningless) — **but the report gives no route path, so this table cannot be filled in**:

| node | branches | evidence |
| --- | --- | --- |
| Svågertorp | Ring-line stop (Malmöringen/Malmöpendeln) — which line(s), which direction(s) unknown | oracle report station table only |
| Persborg | Ring-line stop; reopened 2018 on Kontinentalbanan | oracle report station table only |
| Östervärn | Ring-line stop; reopened 2018 | oracle report station table only |
| Malmö C | All/most Pågatågen lines converge (report's own hub-lock rationale) | oracle report H2 hub-lock note |

Flag for Nico/Jim: **before writing any D5 assertion table, confirm whether the Malmöringen ring
service means any published line calls at a station twice** (the way Oslo's line 5 does at
Stortinget) — if so, "inbound vs outbound" direction labeling will silently be wrong at that
station exactly like the Oslo case, and line + terminus is required, not compass/inbound-outbound.

## H5 — nested short turns

Not covered by the oracle report at all. No confirmation either way of short-turn services (e.g.
some Pågatågen lines terminating early at a shared stop rather than their published end). Flag as
open — do not assume "none" the way H5 sections in other packs can when their source map/timetable
explicitly showed the full pattern.

## H6 — inner city (where §3 lives)

Locked hub: **Malmö C** (Malmö Central Station). Rationale per report: City Tunnel terminus/portal,
opened December 2010, "all or most" Pågatåg lines serve it. This is solid enough to lock — it's
the one hub claim in the report backed by a structural reason (City Tunnel), not just station-count
assertion.

Shared approaches, all City Tunnel-era (opened 2010): **Triangeln**, **Hyllie**. Both are transit
points where Öresundståg doNotGroup risk is flagged (H1) but unconfirmed. Do not treat either as a
second hub — report gives no reason to believe either is a lock candidate, only that they're
underground City Tunnel stations like Malmö C.

**Burlöv** and **Oxie** are qualified in the report itself: "keep in v1 if GTFS includes it" —
i.e. Nico did not confirm these two are actually inside the v1 GTFS filter, only that they're
plausible Malmö-area stops. Do not hard-lock them without that GTFS check.

## H7 — DST

**Europe/Stockholm observes DST (CEST/CET).** Confirmed directly in the report (same zone family
as Göteborg, Stockholm, Oslo). Wall-clock is local Malmö time; do not treat raw clock minutes as
elapsed minutes across the spring/autumn jump. No further hazard here — this is the one clean H7
in this pack.

## doNotGroup proposals

| candidate | reason | confidence |
| --- | --- | --- |
| malmo vs goteborg / vastra-gotaland | Separate city; do not merge into Västtrafik pack | confirmed (report item 1) |
| Malmö C Pågatågen vs Malmö C Öresundståg | Separate cross-border operator, same station | confirmed (report item 3) |
| Pågatågen vs seasonal museum tram | No active light rail; museum line is not v1 | confirmed (report scope note) |
| Pågatågen vs Malmö stadsbuss / regional bus | Buses out of v1 | confirmed (report station table) |
| Triangeln / Hyllie Pågatågen vs Triangeln / Hyllie Öresundståg | Same City Tunnel corridor as the confirmed Malmö C clash | **flagged, unconfirmed** — verify before wiring |
| Burlöv / Oxie inclusion | Report itself hedges "if GTFS includes it" | **flagged, unconfirmed** |
| Malmöringen double-call station(s) | Possible Oslo-line-5-style ring hazard | **flagged, unconfirmed — no route path given** |

## What I did not do

No station-graph generator from GTFS, no per-line termini/stops invented, no PDF fetch (egress
blocked — left blocked, not worked around), no Öresundståg data pulled in, no bus or light-rail
scope creep, no D5 assertion tables (blocked on the gaps above), no live city flip, no product
edit, no read of any other city's in-progress pack or prior chat transcript.
