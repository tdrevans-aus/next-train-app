# Uppsala hazard pack (H1–H7)

Evidence: `docs/uppsala-d1/oracle-clash-report.md` (single-pass, no per-station data — no H1/H3–H7
sections, no station list, no branch/short-turn analysis) **plus a direct read of the Trafiklab
GTFS Regional operator `ul` static feed** (`ul.zip`, fetched 2026-08-30, filtered to route_type
100 + agency "Mälardalstrafik"), since the oracle report's H2 explicitly instructs generating
`published-network.json` from that feed rather than hand-transcribing the Mälartågskartan PNG.
Everything below that is not directly attributable to the oracle report is attributed to the GTFS
read instead — the oracle report gave scope and licensing, not station-level structure.

**No official print map (Mälartågskartan PNG) was obtained or transcribed by this pass** — the
oracle report only linked it and explicitly said not to hand-transcribe it. Any H1–H7 finding
below that would normally cite "map legend symbol" (as Malmö's/Göteborg's packs do) instead cites
GTFS pattern/headsign evidence, or is marked unconfirmed. This is a real gap, not an oversight —
see "What I did not do."

## H1 — parent + child

**Uppsala C is a parented cluster**: GTFS parent `9021003700600000` ("Uppsala Centralstation")
has **30 platform-coded children**, and both route_type **100** (Mälartåg + SL-pendeln) and route_type
**700** (UL bus) trips call at children of that one parent. Filter Mälartåg board rows by
route_type + agency, never by "any child of this parent" — the same lesson as Malmö C and
Göteborg Central.

Every other Mälartåg station in the `ul` feed is also a parented cluster (location_type 1 parent +
numbered platform children) — Knivsta, Arlanda C, Märsta, Sala, and the Gävle-line intermediates
all have between 4 and 25 child rows. `published-network.json`'s `stationCoordinates` uses the
**parent** row's lat/lng for every station, never an unresolved child.

## H2 — feed clash (see oracle report; not re-litigated here)

Mode filtering (rail vs UL bus) and agency scope (Mälardalstrafik vs UL vs SL) are the oracle
report's H2 finding — confirmed directly against `routes.txt`: route_type 100 has exactly 5
routes total, only 3 of which are agency "Mälardalstrafik" (the other 2 are "SL-pendeln Uppsala"
and "SL-pendeln Bålsta", agency "Storstockholms Lokaltrafik AB" — SL Line 40, already in
`docs/stockholm-d1/published-network.json`, correctly excluded). route_type 700 has 233 routes,
all agency "UL", correctly excluded.

## H3 — thin / event / overlay

**Not assessable from the sources available to this pass.** The oracle report gives no thin/
event/overlay information, and no official print map or news copy was obtained to check for
seasonal closures, engineering-work overlays, or limited-daily services (the kind Malmö's H3
found for PågatågenExpress). The GTFS static feed alone cannot distinguish "this pattern is a
permanent short-turn" from "this pattern is a temporary engineering-work truncation" — flagging
as an open gap for Nico/Jim rather than guessing. `calendar.txt`/`calendar_dates.txt` service
patterns were not analysed this pass (out of scope for a station-graph pack); if D2 assertion
tables need service-day granularity, that read still needs to happen.

## H4 — branches (doNotGroup candidates)

The real hazard this pass found, **directly from `trips.txt`, not inferred**:

| node | branches | evidence |
| --- | --- | --- |
| **Knivsta** | Arlanda C continuation vs Märsta continuation | Both are patterns on the **same GTFS route_id** (`9011313099300000`, "Mälartåg Arlanda C/Märsta"). Every Arlanda-branch and every Märsta-branch trip passes through Knivsta before splitting. |
| **Uppsala C** | Gävle line vs Sala line vs Arlanda/Märsta line, plus SL-pendeln (out of v1) and UL buses (out of v1) | Hub lock; all four Mälartåg patterns originate/terminate here. |
| **Tierp** | Gävle-line short-turn point | 33 of 115 Gävle-route trips turn here (headsign "Tierp" from Uppsala C direction). |

**The direction-collapse hazard, confirmed from raw `trips.txt` fields (this is the
Oslo-line-5 / Malmö-Malmö-C pattern, found on route_id `9011313099300000`):**
`direction_id` does **not** distinguish the Arlanda C branch from the Märsta branch.
- `direction_id=1` (outbound from Uppsala C) contains **both** Arlanda-branch trips
  (`stop_headsign` "Flemingsberg" or "Stockholm Central") **and** Märsta-branch trips
  (`stop_headsign` "Stockholm Central") in one undifferentiated bucket.
- `direction_id=0` (inbound) is uniformly headsigned "Uppsala C" regardless of which branch the
  trip is arriving from.

A board keyed on `direction_id` alone cannot tell an outbound Arlanda train from an outbound
Märsta train, and cannot tell which branch an inbound train came from. **Branch must be resolved
from `stop_headsign` or the trip's actual stop sequence (does it call `Arlanda C` or `Märsta
station`?), never from `direction_id`.** See direction-model-memo.md §3.

A second, smaller wrinkle on the same route_id: of the 41 Arlanda-branch outbound trips, 30 carry
final `stop_headsign` "Flemingsberg" and 11 carry "Stockholm Central" — two different real
destinations sharing the same in-feed physical path (Uppsala C → Knivsta → Arlanda C). This is a
destination split *within* the Arlanda branch, on top of the Arlanda/Märsta split. Do not assume
"reaches Arlanda C" implies one uniform destination beyond it.

## H5 — nested short turns

Indicative only (see H3 — this pass has no official short-turn list, only observed GTFS patterns):

- **Gävle line**: Tierp (33 of 115 trips), Mehedeby (a handful) are turn-back points, from
  `stop_headsign` values seen at Uppsala-bound stop_times.
- **Sala line**: Morgongåva appears as a `stop_headsign` on a small number of trips — a thinner
  short-turn than Tierp's.
- **Arlanda/Märsta line**: no intermediate short-turn observed within the feed's coverage (every
  outbound trip runs at least to Arlanda C or Märsta before the feed's data ends) — but see H4's
  destination split beyond that point.

Treat all of the above as **observed-indicative from one static-feed snapshot**, exactly like
Malmö's fragmented-week caveat — not a published, citable short-turn list.

## H6 — inner city (where §3 lives)

Locked hub: **Uppsala C**, per the oracle report's explicit instruction ("Do not lock other
station names at the terminus"). Confirmed as the real convergence point for all four Mälartåg
corridors in the GTFS data (every pattern above either starts or ends there).

**Shared approaches — new finding, not in the oracle report**: SL-pendeln (SL Line 40, out of
v1) runs the identical Uppsala C → Knivsta → Arlanda C stop sequence as Mälartåg's Arlanda
branch before continuing on to Stockholm. This means the doNotGroup boundary is not just at
Uppsala C — it's at **Uppsala C, Knivsta, and Arlanda C**, all three. The oracle report's line
"Uppsala C is the shared far terminus only" undersells this; Knivsta and Arlanda C are shared
too, just not called out because the oracle report didn't read GTFS at the stop level.

No second hub candidate — Knivsta is a branch node (H4), not a second lock; it is genuinely a
mid-corridor stop on both continuations, not a place two independently-legible line identities
converge the way Uppsala C does.

## H7 — DST

**Europe/Stockholm observes DST (CEST/CET)** — same as Stockholm, Göteborg, Malmö. Confirmed via
`agency_timezone` in `agency.txt` (all three agencies in the `ul` feed report `Europe/Stockholm`).

## doNotGroup proposals

| candidate | reason | confidence |
| --- | --- | --- |
| uppsala vs stockholm / sweden | Separate city; do not merge Mälartåg's Uppsala corridors into Stockholm's pack | confirmed (oracle report) |
| Mälartåg vs UL buses (route_type 700) at any shared stop | Different mode, out of v1 | confirmed (GTFS route_type filter) |
| Mälartåg vs SL-pendeln at **Uppsala C** | SL Line 40, already in stockholm-d1, out of v1 here | confirmed (oracle report) |
| **Mälartåg vs SL-pendeln at Knivsta and Arlanda C** | Same identical stop sequence as SL-pendeln's own GTFS pattern shows | **confirmed (new — not in oracle report)** |
| Mälartåg ersättningstrafik | Replacement traffic, out of v1 | confirmed (oracle report); no replacement route_ids found in the filtered set, so nothing to exclude in practice |

## What I did not do

No hand-transcription of the Mälartågskartan PNG, no live city flip, no `lib/providers/` or
`registry.js` edit, no D5 assertion tables, no `calendar.txt`/`calendar_dates.txt` service-day
analysis, no second GTFS feed pulled to close the Västerås/Eskilstuna/Örebro/Stockholm-side
station gap (see published-network.json's `coverageGaps` — that needs a second regional operator
feed or the national `sweden.zip` bundle, out of this pass's scope), no edits to any other city's
pack.
