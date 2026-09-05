# Prague hazard pack (H1–H7)

Evidence: `docs/prague-d1/oracle-clash-report.md` (Nico, 2026-09-06) — agency, feed, auth, hub-lock
recommendation, board-eligibility verdicts, license. The oracle report cites but does not itself
transcribe the full station roster; it names only the three interchange stations (Muzeum, Můstek,
Florenc) plus verified per-line counts (A 17, B 24, C 20) sourced to the official PID map and
[List of Prague Metro stations](https://en.wikipedia.org/wiki/List_of_Prague_Metro_stations). This
lane has no live-fetch tool, so the `stations[]` orderings in `published-network.json` are built
from that cited, publicly stable topology (three lines, unchanged station count/order for several
years) rather than independently re-fetched — **flagged for Jim to cross-check station-by-station
against PID static GTFS `stops.txt` / `stop_name` at D2, before any product edit**. Do not treat
`stations[]` order as re-verified against GTFS; treat it as reproduced from the cited roster and
pending confirmation.

Product `lib/cities/prague/` absent. `assertCityLive("prague")` is Unknown city.

## H1 — parent + child

D1 has no stopIds. PID static GTFS will later expose `stop_id`/`parent_station` pairs; the oracle
report explicitly warns **do not generate `published-network.json` from `routes.txt`** — this pack
does not.

doNotGroup, three-way interchange triangle (no station serves all three lines):

- **Muzeum** (A × C) — locked hub. Beneath Wenceslas Square / National Museum. Line A opened this
  section 1978, Line C section 1974.
- **Můstek** (A × B) — secondary interchange. Central, at the foot of Wenceslas Square.
- **Florenc** (B × C) — third vertex. Bus/coach terminal above, out of scope (bus is out of v1
  mode cut).

## H3 — thin / event / overlay

- **No Line D.** Under construction; oracle report: "first section not expected until 2031–2032; no
  passenger service as of 2026." Tracker's "Metro A–C + Esko" / "Metro A/B/C/D" note is stale per
  the oracle's explicit correction — out until the metro map itself shows D open.
- **Esko (regional rail) is out of v1** despite riding the same PID GTFS zip. Tracker footnote
  "no tram, bus, funicular, Esko" is the report's followed instruction.
- **Tram, bus, trolleybus, funicular (Petřín), ferries** — all out of v1. PID GTFS is a full
  multi-mode feed; adapter must filter to metro routes only (route_type=1 / agency "DPP metro" or
  confirmed equivalent, per oracle H2).
- **Golemio real-time is not GTFS-RT** — proprietary JSON behind `X-Access-Token`. Not a D1
  generator; Jim's D2 concern, not this pack's.

## H4 — branches (doNotGroup candidates)

| node | lines | evidence |
| --- | --- | --- |
| Muzeum | A × C | Oracle report: hub lock, "major interchange beneath Wenceslas Square / National Museum building." Line A opened 1978, Line C 1974. |
| Můstek | A × B | Oracle report: "Alternative: Můstek (lines A × B), also central... Recommend Muzeum as hub-lock; Můstek as doNotGroup secondary." |
| Florenc | B × C | Oracle report: "Third vertex of triangle." Interchange with bus/coach terminus, out of scope. |

No city loop as a passenger code — Prague's three lines are straight-through trunks, not a ring
(unlike Brussels' 2/6 inner loop). Each line has two fixed printed termini; no compass-direction
("inbound"/"outbound") ambiguity comparable to Brussels' Arts-Loi cross was reported. Flag for D2:
confirm no short-turn or peak-only partial-route services exist on any of A/B/C before assuming
every train runs end to end — the oracle report does not state this explicitly (see H5).

## H5 — nested short turns

Oracle report does not mention any nested/partial-route codes for Prague Metro A/B/C (unlike
Adelaide GAW/SALIS or Sydney's suffix codes). **Gap, not a confirmed empty**: this pack sets
`shortTurns: []` on all three lines because no short-turn service was reported, but the oracle
report was scoped to line/station rosters and hub-lock, not service-pattern detail. **Flag for
Jim/D2**: verify against PID GTFS `trip_headsign` / `stop_times` whether any A/B/C trips terminate
short of the printed line ends (this is common on metro systems during off-peak or engineering
work) before treating `shortTurns: []` as verified rather than assumed.

## H6 — inner city (where §3 lives)

Locked set: **Muzeum** (A × C). Nearby but distinct: **Můstek** (A × B, doNotGroup), **Florenc**
(B × C, doNotGroup). Unlike Brussels (single 4-line cross) or Copenhagen (single multi-line hub),
Prague's interchange structure is a **triangle of three two-line nodes** — no station sees all
three lines. Muzeum is the assigned hub lock per this task's instruction and the oracle report's
"Muzeum listed first" tracker note; it is a two-line crossing (A × C) and not a "sees everything"
hub. Do not model Muzeum as if it also touches line B — it does not; B riders interchange at
Můstek or Florenc, never at Muzeum.

## H7 — DST

**Europe/Prague observes DST (CEST/CET)** — last Sunday of March (spring forward), last Sunday of
October (fall back), per oracle report. Do not copy Perth/Brisbane/Auckland no-DST timezone
handling.

## Diacritics lock (one D1 string)

Czech station names carry diacritics that are load-bearing, not decorative — a stripped-diacritic
string (`Muzeum` has none, but `Můstek`, `Malostranská`, `Náměstí Míru`, `Jiřího z Poděbrad`,
`Želivského`, `Nádraží Veleslavín`, `Bořislavka`, `Nové Butovice`, `Křižíkova`, `Vysočanská`,
`Rajská zahrada`, `Černý Most`, `Náměstí Republiky`, `Nádraží Holešovice`, `Vltavská`, `Hlavní
nádraží`, `I. P. Pavlova`, `Vyšehrad`, `Pražského povstání`, `Budějovická`, `Kačerov`, `Roztyly`)
is a **different, wrong string**, not a rename-equivalent the way Brussels' FR/NL stacking is. Lock
the full diacritic form exactly as printed on the official PID map / Wikipedia roster. Flag for
Jim: confirm PID GTFS `stop_name` uses the same diacritic forms (some feeds ASCII-fold Czech
station names) before assuming a 1:1 string match at D2.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| prague vs praha / pida / pid / any merged Czech adapter | Oracle report: "do not invent `praha`, `pida`, `pid`, or merge into another Czech city." |
| Muzeum (A × C) vs Můstek (A × B) | Two distinct two-line nodes under Wenceslas Square; not the same stop. |
| Muzeum (A × C) vs Florenc (B × C) | Third vertex of the interchange triangle; Muzeum has no line B. |
| Můstek (A × B) vs Florenc (B × C) | Both touch line B but are separate stations; do not conflate. |
| Metro A/B/C vs Line D | Under construction, no passenger service until 2031–2032 at earliest. |
| Metro A/B/C vs tram/bus/trolleybus/funicular/Esko/ferries | All out of v1 mode cut; same PID GTFS zip carries all of them. |
| Arts-Loi / Kunst-Wet / Kongens Nytorv / T-Centralen / Chicago Loop / Waitematā Station | Other-city hub strings. Do not copy. |

## What I did not do

No adapter code, no line-map generation, no GTFS extraction, no live city flip, no product edit, no
Golemio API call, no station hand-transcription against a rendered map image (no such tool
available in this lane), no research into Esko or future Line D operations, no stopIds in
published JSON.
