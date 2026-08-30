# Copenhagen hazard pack (H1–H7)

Evidence, retrieved live during this pass (30 Aug 2026) because `oracle-clash-report.md` scoped the
station graph to two source URLs without transcribing them:

- [List of Copenhagen Metro stations](https://en.wikipedia.org/wiki/List_of_Copenhagen_Metro_stations) —
  the 44-row `wikitable` (Station / Line / Grade / Opened / Time to Nørreport / Zone / Transfer),
  with per-station line-icon `title` attributes (`M1 (Copenhagen)`, `M2 (Copenhagen)`, `City Circle
  Line` = M3, `M4 (Copenhagen)`). Cross-validated against the "Time to Nørreport (M1 and M2)" minute
  column, which independently reproduces the trunk and branch orderings below (e.g. Islands
  Brygge 5 < DR Byen 7 < Sundby 9 < Bella Center 11 < Ørestad 12 < Vestamager 14).
- [List of Copenhagen S-train lines](https://en.wikipedia.org/wiki/List_of_Copenhagen_S-train_lines) —
  southern/northern end + "runs when" table for A, B, Bx, C, E, F, H.
- Station infoboxes (each has a Wikipedia-template `"line"` field and an `Adjacent stations` table,
  both primary and independently checkable): [Nordhavn](https://en.wikipedia.org/wiki/Nordhavn_railway_station),
  [Nørrebro](https://en.wikipedia.org/wiki/N%C3%B8rrebro_railway_station),
  [Nørreport](https://en.wikipedia.org/wiki/N%C3%B8rreport_station),
  [Copenhagen Central Station / København H](https://en.wikipedia.org/wiki/Copenhagen_Central_Station).
- [H (S-train) line article](https://en.wikipedia.org/wiki/H_(S-train)) — used to resolve a
  contradiction (see H2).
- `docs/copenhagen-d1/oracle-clash-report.md` (Nico, 30 Aug 2026, second/corrected pass) — agency,
  auth, board-eligibility verdicts, hub lock, license.

Product `lib/cities/copenhagen/` absent. `assertCityLive("copenhagen")` is Unknown city.

## H1 — parent + child / doNotGroup

D1 has no stopIds. **Kongens Nytorv** is the Metro hub lock: all four lines (M1, M2, M3, M4) call
it, and — confirmed from its Metro-station-list row — it has **no** S-train/DSB transfer ("Transfer:
—"), so it stays a Metro-only doNotGroup anchor, never conflated with the three multi-operator
stations below.

doNotGroup, three-way, at the four shared stations named in the oracle report's Board eligibility
section:

- **Nørreport** — Metro (M1, M2) vs S-tog vs DSB/Öresundståg (Kystbanen/mainline platform). Station
  infobox: 3 island platforms (S-train, Metro, Kystbanen), 6 tracks, operators DSB + Skånetrafiken +
  Metro Service A/S.
- **Nørrebro** — Metro (M3) vs S-tog. Station infobox: 2 side platforms (S-train), 1 island platform
  (Metro), 4 tracks. No DSB/Öresundståg here (see H2 correction).
- **København H** — Metro (M3, M4) vs S-tog vs DSB/Öresundståg/EuroCity (mainline platforms).
- **Nordhavn** — Metro (M4) vs S-tog. Station infobox: 2 island platforms (1 S-train, 1 Metro), 6
  tracks (2 S-train, 2 Metro, **2 non-stop Kystbanen** — the Kystbanen tracks run through Nordhavn
  without stopping, so no DSB/Öresundståg row belongs here even though DSB owns the infrastructure).

All other in-catalog Metro stations: single-operator, Metro only.

## H2 — line-membership corrections (verified against primary sources, not the oracle report's prose)

The oracle report's C2/C3 section (item 4) describes Nordhavn as six S-tog lines "A, B, Bx, C, E,
H" and Nørreport as "M1/M2 vs S-tog C line" (implying C only). Both undercounts/overcounts are
wrong against the station-page primary sources pulled for this pack:

- **Nordhavn is FIVE S-tog lines (A, B, Bx, C, E), not six.** The Nordhavn infobox's `"line"`
  field and its `Adjacent stations` table (both sourced from the same page) list only A, B, Bx, C,
  E — no H. **H does not currently serve Nordhavn.** The H (S-train) article is explicit: "Following
  stations are not part of this line since 2017 ... Nordhavn, Svanemøllen, Ryparken [...]. They are
  serviced by line B." H's own stations list (Frederikssund … Ballerup … København H … Østerport)
  ends at Østerport and never reaches Nordhavn. The Nordhavn page's **prose** sentence ("The station
  is by the lines A, H, B, C, and E...") is a stale/inconsistent edit against its own infobox and
  against the H article — do not trust the prose over the infobox + adjacent-stations table + the
  H article's own history section. **This directly affects the Nordhavn direction model — see
  direction-model-memo.md. Flagging back: the oracle report's "six lines" framing for Nordhavn is
  superseded by this correction.**
- **Nørreport is SIX S-tog lines (A, B, Bx, C, E, H), not just C.** Nørreport's infobox `"line"`
  field lists all six S-tog letters plus M1, M2, plus "Boulevard Line" (the S-tog trunk). This is a
  materially bigger doNotGroup surface than the oracle report implied.
- **København H is confirmed six S-tog lines (A, B, Bx, C, E, H)** — its `Adjacent stations` table
  lists all six with `Vesterport`/`Dybbølsbro` as immediate neighbors on both sides. Matches the
  oracle report.
- **Nørrebro is S-tog line F only** (the Ring Line service letter), confirmed by its infobox
  (`"line": F, M3`) and its `Adjacent stations` table (`Fuglebakken ↔ Bispebjerg`, towards
  Hellerup / Copenhagen South). Matches the oracle report's "S-tog Ring Line" description — F is
  that line's service letter.

**H2 conclusion:** the multi-operator filtering clash the oracle report named is real, but the
per-station line rosters need this correction before Jim wires `tripAllowed()`-equivalent filters.
Do not carry the oracle report's Nordhavn "six lines" or Nørreport "C line" phrasing into the
adapter — use the tables in direction-model-memo.md instead.

## H3 — thin / overlay / out of scope (unchanged from oracle report, re-confirmed)

- **DSB EuroCity (Hamburg–Copenhagen)** at København H: `out-reservation` (compulsory reservation
  16 Jun–16 Aug). Present in the station's own `Adjacent stations` table (`ICCphHam`) but excluded
  from `published-network.json` per the oracle report's board-eligibility verdict.
- **Harbour buses (Havnebus 991/992)** at Orientkaj: `out-mode`.
- **New finding, not in the oracle report — flag, don't decide:** København H's `Adjacent stations`
  table also shows **SJ (Sweden) "Southern Main Line" toward Stockholm Central** and **České dráhy
  "RJ Copenhagen–Prague" toward Praha hl.n.**, both calling at København H. Neither service has a
  board-eligibility verdict in the oracle report's table (only Metro, S-tog, DSB Regional/IC,
  Öresundståg, and DSB EuroCity were verdicted). Per `docs/board-eligibility-rule.md`, silence is a
  QA failure — **this needs a verdict from Nico/Tim before D5**, not an assumption either way. Not
  added to `published-network.json` pending that verdict.
- **No new Metro line 5/6.** 44 stations, 4 lines, confirmed by the station-list table (44 rows).

## H4 — branches (doNotGroup candidates), Metro

| line | shape | confirmed via |
| --- | --- | --- |
| M1 | linear, Vanløse ↔ Vestamager | trunk + branch order cross-validated against "Time to Nørreport" column |
| M2 | linear, Vanløse ↔ Lufthavnen | same |
| M3 | **true ring** (Cityringen) — no linear termini; direction is clockwise / counter-clockwise | Nørrebro's own `Adjacent stations` table literally labels its two M3 neighbours "clockwise" (Skjolds Plads) and "counter-clockwise" (Nørrebros Runddel) |
| M4 | linear, Orientkaj ↔ København S (formerly "Ny Ellebjerg St.", renamed) — **not** Y-branched; one continuous through-route via København H | København H's `Adjacent stations` table: M4 neighbours are Havneholmen (south) and Rådhuspladsen (north) — a single chain, not a fork |

Kongens Nytorv, Nørreport, Nørrebro, København H, Nordhavn are the multi-line/multi-operator nodes;
see H1/H2.

**Havneholmen is M4-only**, not M3 — confirmed by its `title` attribute (`M4 (Copenhagen)` only, no
`City Circle Line`). Easy to mis-assign since it sits geographically between the M3 ring's western
arc and M4's Sydhavn branch; do not group it with M3's Enghave Plads.

**København S** (opened 2024, the renamed Ny Ellebjerg St.) is the M4 southern terminus and also an
S-train/regional interchange per its own metro-station-list row ("Transfer: S-train, regional
trains") — **not in the oracle report's four named shared stations**, and out of scope for the
doNotGroup work here since the oracle report's v1 scope names only Nørreport/Nørrebro/København
H/Nordhavn for cross-operator boarding. Flagging: if S-tog/regional service at København S needs a
board-eligibility verdict too, that's a gap for Nico, not something inferred here.

## H5 — nested short turns

- **S-tog A**: full route Hillerød ↔ Køge, but daytime trains mostly short-turn Hundige (every
  second train extended to Solrød Strand); evening trains run through to Køge. Overlay, not a
  separate line — matches the Oslo Helsfyr pattern (folder/full-route terminus stays the D1 chip
  string; short-turn is metadata).
- **S-tog Bx**: peak-hours-only short working of B (Buddinge ↔ Høje Taastrup limited-stop), not a
  separate D1 line entry beyond its own service letter (Bx already has its own official code, unlike
  Oslo's Helsfyr).
- **S-tog E**: Mon–Fri only (Holte ↔ Køge). Weekend gap is a timetable fact for Jim's realtime
  layer, not a station-graph fact.
- No nested Metro short-turns confirmed in sources (M1–M4 all run their full published route).

## H6 — inner city (where §3 lives)

Locked hub: **Kongens Nytorv** (Metro-only, all four lines, confirmed no rail transfer). Shared
approaches: Nørreport (Metro + all six S-tog + DSB/Öresundståg — the busiest doNotGroup surface in
this pack), København H (Metro + all six S-tog + DSB/Öresundståg/EuroCity — the second), Nørrebro
(Metro M3 + S-tog F only), Nordhavn (Metro M4 + five S-tog lines A/B/Bx/C/E, physically separated
onto two island platforms).

## H7 — DST

**Europe/Copenhagen observes DST (CEST/CET).** Do not copy no-DST cities. Rejseplanen API 2.0 and
SIRI-ET timestamps are the feed's concern (Jim, D2) — this pack asserts the station graph only.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| copenhagen vs denmark / rejseplanen / aarhus | Separate city; `docs/denmark-ledger.md` scopes Rejseplanen as a shared-provider-config platform — Copenhagen is a config over it, not a merge |
| Kongens Nytorv vs Nørreport / København H | Hub lock (Metro-only, 4 lines) vs the two multi-operator interchange stations |
| Nørreport: Metro (M1, M2) vs S-tog (A,B,Bx,C,E,H) vs DSB/Öresundståg (Kystbanen platform) | Three-way, confirmed via infobox `"line"` field + operator list |
| Nørrebro: Metro (M3) vs S-tog (F only) | Two-way; do not add DSB here — Nørrebro has no mainline platform |
| København H: Metro (M3, M4) vs S-tog (A,B,Bx,C,E,H) vs DSB/Öresundståg (regional/IC/Öresundståg) vs EuroCity (excluded) | Four-way; EuroCity stays out per board-eligibility verdict |
| Nordhavn: Metro (M4) vs S-tog (A,B,Bx,C,E — **not H**) | Two-way, physically two island platforms; H exclusion is the H2 correction |
| Havneholmen (M4) vs Enghave Plads (M3) | Adjacent geographically, different lines — do not conflate |
| København S vs København H vs Ny Ellebjerg (old name) | Renamed station (2024); lock the current printed name, out of the four-shared-station doNotGroup scope |
| SJ Stockholm / České dráhy Prague at København H | Not board-eligibility-verdicted by the oracle report — flagged, not included, not excluded |

## What I did not do

No generator, no live fetch of the official m.dk Metro PDF map or the Rejseplanen GTFS feed (used
Wikipedia's station list + individual station infoboxes as the D1 hand-transcription source instead,
since the oracle report pointed at these URLs but did not transcribe their contents), no assertion
tables, no live city flip, no product edit, no adapter code, no `lib/providers/` or `registry.js`
edit (Jim's job, and explicitly deferred to a supervised session per this task's instructions), no
DST deep-dive on Rejseplanen timestamps, no resolution of the SJ/České dráhy board-eligibility gap
(flagged for Nico/Tim, not decided here), no station-catalog extension for the S-tog/DSB network
beyond the four named shared stations.
