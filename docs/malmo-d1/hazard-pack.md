# Malmö hazard pack (H1–H7)

Evidence: `docs/malmo-d1/oracle-clash-report.md` **second pass (29 Aug 2026)** — official Skånetrafiken
train map "Fler resmöjligheter med tåg" (Uppdaterad december 2024, obtained; md5
`41387ef91e51a0009e99cde9c47dbf41`) + GTFS Sweden 3 pattern analysis (3,244 Pågatåg trips)
cross-checked against that map + skanetrafiken.se corridor copy. The first pass's headline
blocker — *no per-line station list, branch topology, or confirmed line-code table* — is
**resolved**: `published-network.json` now carries all 10 corridors with ordered stops, termini,
and short-turns. What remains open is listed in that file's `coverageGaps` (reference-numbering
status, regional key scope, line 3's Helsingborg end, platform signage wording).

## H1 — parent + child

Confirmed doNotGroup set (was one confirmed + two flagged; now four confirmed):
**Malmö C, Triangeln, Hyllie, and Burlöv** each print the map legend's "Öresunds- och Pågatågen"
symbol — Öresundståg (Skånetrafiken + DSB + Region Hovedstaden, separate cross-border product,
not v1) calls at all four. doNotGroup the Pågatågen stop vs the Öresundståg stop at each.

Feed-name clash layer (new, from the GTFS read): feed strings carry "Malmö " prefixes and
" station" suffixes vs the printed map strings (`Malmö Triangeln` vs **Triangeln**, `Malmö
Rosengård station` vs **Rosengård**, etc. — full rename table in the oracle report), and
headsigns print **"Malmö central"**, which matches no printed station string. Lock the printed
strings; treat the feed forms as renames, and never surface "Malmö central" as a token.

GTFS parent/child (`location_type`/`parent_station`) — **resolved 29 Aug 2026** from GTFS
Sweden 3 `stops.txt`: every Malmö-area station is a parented cluster (location_type 1 parent +
platform-coded children). Malmö C = parent `3` with ~60 children (train spår AND bus lägen under
one parent — filter by served mode, not by parent membership); Triangeln `1587`, Hyllie `1586`,
Svågertorp `1546`, Persborg `1486`, Rosengård `1621`, Östervärn `59221`, Burlöv `937` (11
children), Oxie `27087`. Do not assume single-row stops. Extra wrinkle from live verification:
the ring train uses **two different Malmö C platform groups on one trip** (departs surface
Spår 11 onto Kontinentalbanan, returns via Citytunneln Spår 3a) — both children of the same
parent. Skånetrafiken's own site API uses a separate stop-area GID scheme (Malmö C
`9021012080000000`, Triangeln `9021012080140000`, …) — per-feed id mapping is a D2 task.

## H3 — thin / event / overlay

- **"Line 12" is withdrawn — the overlay is PågatågenExpress** (reference line 10): Malmö
  Svågertorp–Hässleholm limited-stop express, a few trips daily through to Älmhult, **suspended
  in summer except the Älmhult trips** (official tidtabellsskifte copy). Overlay-grade: do not
  give it a terminus chip that outranks the regular lines at shared stops.
- It is a **distinct service pattern**, not a trip-variant of line 9 — different stop set
  (skips Åkarp/Hjärup/Klostergården/Stångby/Örtofta/Stehag) and its own Svågertorp far end.
- **Engineering-work overlays are routine** on this network (skanetrafiken.se lists rolling
  weekend closures: Helsingborg–Åstorp, Helsingborg–Gantofta, Hässleholm–Markaryd, Malmö–Lund
  night work). Stations stay in D1; replacement buses out of v1. The analysed GTFS week is
  visibly fragmented by these (see H5).
- **Museum tram** (seasonal) still out of v1 — confirmed, unchanged.

## H4 — branches (doNotGroup candidates)

The ring is resolved. The table the first pass couldn't fill:

| node | branches | evidence |
| --- | --- | --- |
| **Malmö C** | Line 11 through-path calls it **twice** (Kävlinge → Lomma → Malmö C → ring → Malmö C, both ring directions, 142 trips). Lines 3/6/8/9/10 call it once. | GTFS patterns + map ring topology |
| **Svågertorp** | Three continuations: line 11 ring (→ Persborg), line 9 Trelleborgsbanan (→ Västra Ingelstad), line 10 express terminus | GTFS patterns + map junction south of Svågertorp |
| **Hyllie** | Inner terminus for lines 3 and 8; through for 6/9/10/11; "mot Danmark" (Öresund) leaves west — out of v1 | map + patterns |
| **Burlöv** | Lines 3/8 run Malmö C–Burlöv–Lund C (skipping Åkarp/Hjärup/Klostergården); lines 6/9 call the full set — three different Malmö–Lund stop sets | GTFS patterns |
| **Östervärn / Rosengård / Persborg** | Ring-only stops (line 11), each called **once** per through-path — the double-call is at Malmö C only | GTFS patterns |
| Teckomatorp / Åstorp / Hässleholm C / Kristianstad C | Out-of-Malmö junctions (lines 3×8, 5×8, 5/7/9/10, 4B×9) — recorded in `lines[].branches` | map + patterns |

**The Oslo-line-5 hazard is confirmed, and it lands on the hub lock itself:** inbound/outbound
direction labeling at Malmö C is meaningless for line 11, and destination labeling is *also*
broken there because the headsign is "Malmö central" in every direction including outbound.
Line + far-end/path token required — see direction-model-memo.md §3.

## H5 — nested short turns

Now observable (was fully open). From the analysed week's termini pairs, indicative short-turn
sets — fragmented by engineering work, so treat as overlays, not chips:

- Line 2: **Förslöv** dominates (68 Förslöv→Helsingborg trips vs 7 through to Halmstad).
- Line 6: Ystad (heavy), Skurup, Svedala, Kävlinge, Landskrona, Lund C, Malmö C.
- Line 9: Hässleholm C, Höör, Lund C, Malmö C.
- Line 3: Gantofta / Vallåkra / Teckomatorp / Eslöv (the Helsingborg end did not run through in
  the analysed week — flagged in coverageGaps; do not chip Gantofta as a terminus).
- Line 11: Lomma; plus pure-ring trips (Malmö C → ring → Malmö C without the Kävlinge leg).

Official folder-grade confirmation of the *published* short-turn pattern (à la Oslo's
Stoppestedsliste) still doesn't exist as a single document — the timetable is per-departure.
Keep `shortTurns` as observed-indicative.

## H6 — inner city (where §3 lives)

Locked hub: **Malmö C** — unchanged, now with concrete backing: 6 of 10 corridors call it
(3, 6, 8, 9, 10, 11); Citytunneln portal (2010). The new wrinkle: it is also the network's one
double-call station (H4), so the hub lock and the ring hazard are the same place.

Shared approaches: **Triangeln**, **Hyllie** (City Tunnel — all six Malmö-serving corridors call
both; line 11 reaches them clockwise via Malmö C and counter-clockwise via the Kontinentalbanan
leg, so its two directions arrive from opposite sides), plus **Svågertorp** and
**Burlöv** as branch/product-overlap stops. None is a second hub candidate.

**Burlöv and Oxie are hard-confirmed v1 rows** (map symbol + current GTFS service) — the first
pass's "if GTFS includes it" condition is discharged.

## H7 — DST

**Europe/Stockholm observes DST (CEST/CET).** Unchanged, still the one clean H7.

## doNotGroup proposals

| candidate | reason | confidence |
| --- | --- | --- |
| malmo vs goteborg / vastra-gotaland | Separate city; do not merge into Västtrafik pack | confirmed |
| Malmö C Pågatågen vs Malmö C Öresundståg | Separate cross-border product, same station | confirmed |
| **Triangeln / Hyllie / Burlöv Pågatågen vs Öresundståg** | Map legend symbol "Öresunds- och Pågatågen" at all three | **confirmed (was flagged)** |
| Pågatågen vs seasonal museum tram | No active light rail | confirmed |
| Pågatågen vs Malmö stadsbuss / regional bus | Buses out of v1 | confirmed |
| Pågatågen vs Krösatågen | Different product on the same map (Killeberg/Osby/… rows are not v1) | confirmed (new) |
| Burlöv / Oxie inclusion | Map symbol + current GTFS service | **confirmed in v1 (was flagged)** |
| Malmöringen double-call station | **Malmö C, confirmed** — not Svågertorp/Persborg/Östervärn as first suspected | **confirmed (was flagged)** |
| printed strings vs feed strings ("Malmö Triangeln", "Malmö central", "… station") | rename layer, lock printed forms | confirmed (new) |

## What I did not do

No live city flip, no `lib/providers/`/`registry.js` edit, no D5 assertion tables (that's Luke/Jim
against this now-complete pack), no Öresundståg/Krösatågen/bus data pulled into v1 rows, no
rehosting of the Skånetrafiken PDF, no edits to any other city's pack.
