Sapporo D1 pack (Luke), 2026-09-06. City stays **planned**. Picker shows **Sapporo (Coming Soon)**
under Japan (`jp`), alongside Osaka. No other city's picker entry, gate, or registry line touched.
`assertCityLive("sapporo")` must still fail (city not in `lib/providers/registry.js` today).
No generator, no PR, no product edit, no `lib/providers/` or `registry.js` edit.

Pack files: `docs/sapporo-d1/{oracle-clash-report,hazard-pack,direction-model-memo}.md`,
`published-network.json`, this file.

## The one thing to know: full roster is transcribed, but from Wikipedia, not the official site yet

**The oracle report now carries a full "Station roster (D1 transcription)" section** (added
2026-09-06) giving all 49 stations with official codes (N01-N16, T01-T19, H01-H14). This has been
folded into `published-network.json`: `stations` and `stationCodes` are populated for all three
lines (Namboku 16, Tozai 19, Tohou 14 — total 49, collapsing to 46 unique station names once the
shared hub/secondary interchanges are counted once).

**The roster's source is Wikipedia, not the official city site.** It must be cross-checked against
https://www.city.sapporo.jp/st/subway/ and the 2020 GTFS stops.txt before this file is treated as
final for a per-station allow-list, D5 assertion table, or UI station picker. This cross-check is
flagged in `hazard-pack.md`, `direction-model-memo.md`, and `published-network.json`'s
`coverageGaps`/`coverageNote` fields on every line — don't build product edits around exact
spelling, ordering, or code assignment until it's done.

One nuance the roster surfaced: the Tohou-side station of the Susukino interchange is officially
printed as **Hosui-Susukino** (H09) — a different name from Namboku's **Susukino** (N08), not a
duplicate. Both are carried as distinct doNotGroup entries; see hazard-pack.md H1.

## What's solid (cite: hazard-pack.md, direction-model-memo.md)

- **city=sapporo**, single-operator v1: Sapporo City Transportation Bureau / Sapporo Municipal
  Subway Co., Ltd., three lines Namboku (N) / Tozai (T) / Tohou (H). Not `sms`, not
  `sapporo-metro`, not merged into another Hokkaido city — oracle report is explicit on this.
- **Hub lock: Odori** (大通駅), all three lines. Secondary two-line nodes **Sapporo** (N06 × H07)
  and **Susukino** (N08) / **Hosui-Susukino** (H09) — two officially distinct printed names for the
  same Namboku × Tohou interchange precinct; neither is served by Tozai. doNotGroup Sapporo (Metro)
  vs JR Sapporo, Susukino vs Hosui-Susukino (pending official confirmation of combined treatment),
  and Shin-Sapporo (Metro, Tozai eastern terminus) vs JR Shin-Sapporo (Chitose Line) — both JR
  stations are separate stations reached by underground passage only, not Metro platforms.
- **Direction model: line + official terminus** (`Namboku + Makomanai`, `Tozai + Shin-Sapporo`,
  `Tohou + Fukuzumi`), same recipe as Osaka/Copenhagen's linear lines. Never a "to City" /
  "Downtown" token — none is printed in any source for this city.
- **Board eligibility: verified single-operator.** No other rail operator calls at any in-catalog
  station at platform level; JR Hokkaido services at JR Sapporo / JR Shin-Sapporo are separate
  stations and don't trigger a board-eligibility verdict (oracle report's Board eligibility
  section, already resolved — nothing further needed from Mark on this point).
- **License: CC BY 4.0**, HODA-published static GTFS (Regional Revitalization Mobility Consortium
  / Sapporo City Transportation Bureau as creators). Attribution required; commercial reuse and
  redistribution to end-users both permitted. No "do not pass to third parties" clause found.
- **Asia/Tokyo, no DST.**

## What is NOT solid — resolve before/at D2, don't wire around

1. **49-station official list is transcribed, but from Wikipedia, not the official city site**
   (see above — the headline remaining gap). Cross-check against
   https://www.city.sapporo.jp/st/subway/ and the 2020 GTFS stops.txt before any per-station
   allow-list, stopId mapping, or D5 assertion table relies on exact spelling/order/codes.
2. **Static GTFS on HODA is dated 2020-03-24 — 6+ years stale.** Confirmed empty-key 200 by the
   oracle report, but **not parsed or used to generate this pack**. Re-verify refresh status
   before treating it as a usable schedule source. No official GTFS-RT exists; no next-train API
   exists. `envKeys: none`, `adapterReady: false`. (It is also a future cross-check target for the
   roster, per point 1.)
3. **Official station codes are transcribed** (N01-N16, T01-T19, H01-H14 in `stationCodes` on all
   three lines in `published-network.json`) — sourced from the same Wikipedia roster as point 1,
   so subject to the same cross-check before being treated as final.
4. **`shortTurns` is empty on all three lines, unconfirmed** — no timetable was parsed to check
   for nested short-turn patterns (hazard-pack.md H5).
5. **M3-style ring/loop topology does not apply here** — all three lines are confirmed linear
   (two named termini each) per the oracle report, but this hasn't been cross-checked against an
   actual timetable or route map image, only the oracle report's prose. Flag if a later pass finds
   otherwise.

## Direction model (full detail: direction-model-memo.md)

- **Namboku (N), Tozai (T), Tohou (H)** — all linear: line + official terminus, e.g.
  `Namboku + Asabu`, `Tozai + Miyanosawa`, `Tohou + Sakaemachi`.
- **Odori** is the only hub-lock string; never a direction token.
- **Sapporo** and **Susukino/Hosui-Susukino** are two-line nodes (Namboku + Tohou only) —
  doNotGroup vs any JR co-located station, even though only Sapporo has a confirmed JR co-location
  in this pack, and doNotGroup Susukino vs Hosui-Susukino pending official confirmation of a
  combined interchange treatment.

## What I did not do

No live flip, no UI wiring, no D5 assertion tables, no adapter code, no `lib/providers/` or
`registry.js` edit, no GTFS parse of the HODA zip, no cross-check of the Wikipedia-sourced roster
against the official city site or the 2020 GTFS stops.txt (that cross-check is the headline
remaining gap, repeated across this pack on purpose so it isn't missed), no invented station
names, codes, or route colours beyond what the oracle report's roster gave, no edit to any other
city's pack, and no edit to a Japan/Hokkaido country ledger (none exists per
`docs/country-lane.md` — AU/NZ/CA-style countries, and Japan is not listed as needing a country
lane).

## Lane status

Luke's write set is `docs/sapporo-d1/` only — no lane lock needed or taken (per CLAUDE.md, "Luke
needs no check"). This pack is complete by folder shape (4 files matching Osaka/Copenhagen) and now
carries the full 49-station roster, but **is not yet cross-checked against the official city site
or 2020 GTFS stops.txt** — that cross-check should happen before/at D2 adapter work, not be wired
around.
