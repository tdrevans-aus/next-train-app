# Edinburgh hazard pack (H1–H7)

Evidence: `docs/edinburgh-d1/oracle-clash-report.md` only (this lane's sole input, per the
read-only-the-report rule). No `docs/united-kingdom-ledger.md` exists (checked before starting —
see `docs/country-lane.md`'s standing retrofit note, also flagged unresolved in the
london-se-national-rail and glasgow packs). No GTFS was fetched or parsed by this pack — the DFT
BODS Trams feed and National Rail's Transitland reference feed are both cited in the oracle report
but not independently pulled here.

## H1 — parent + child

**Unknown, not verified.** No GTFS dump was consulted, so parent/child stop relationships (e.g.
whether Edinburgh Waverley has a location_type=1 parent with platform-level children in the
National Rail Transitland feed, or whether the DFT BODS Trams GTFS nests T50 platforms under stop
parents) cannot be confirmed here. Flagged for Jim/D2 to verify against a live GTFS pull before
wiring — same posture as every prior UK region's pack (london-se-national-rail, Glasgow).

doNotGroup (established from the report, not GTFS):
- **Edinburgh Waverley — Trams (Waverley area stop) vs National Rail (EDB CRS, main station)** —
  separate platforms, separate infrastructure, no automatic interchange described in the report
  (report line 3, 17, 73). Not a merge point.
- **Falkirk High** — not in Edinburgh's catalog at all; excluded per the Glasgow-Edinburgh
  exclusive-territory boundary decision (report line 9, 87). See "Falkirk High boundary
  consistency check with Glasgow" below.
- **Edinburgh Park (Tram stop) vs Edinburgh Park (National Rail station)** — report explicitly
  scopes the National Rail station as *not* in v1 catalog (report line 20: "not listed as
  National Rail in main catalog... may have limited passenger service"). Only the Tram stop
  (Edinburgh Park Central) enters this pack's catalog. Not a doNotGroup case so much as an
  out-of-scope station on the rail side — flagged so Jim doesn't accidentally wire an NR board at
  a station this report never verdicted for board eligibility.

## H2 — clash surface

Already covered in the oracle report itself (Trams schedule-only / no RT source found vs National
Rail account-blocked at RDM). Nothing new found by this pack — no GTFS was independently pulled to
compare against the report's claims.

## H3 — thin / event / overlay

- Edinburgh Trams: no event-only overlay services in the report. Report states a 7–10 minute
  headway for T50 (line 38, 49) — unlike Glasgow Subway, a frequency figure is present here, so no
  gap to flag back to Nico on this point.
- National Rail: no thin/overlay services named beyond the six already verdicted (ScotRail, LNER,
  Avanti, CrossCountry, TransPennine, Caledonian Sleeper). No stated seasonal/event-only trains.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Edinburgh Waverley | National Rail (EDB, main station) vs Trams (Waverley area stop, separate platforms) | Report line 3, 17, 41, 73 |
| Haymarket | National Rail only — West End interchange, no Tram stop at this node | Report line 18, 42 |
| Slateford | National Rail only — Shotts Line junction, no Tram stop at this node | Report line 19, 43 |

No Trams branch — the report describes T50 as a single line (Newhaven–Edinburgh Airport), no
short-turn or branch pattern mentioned (report line 3, 23).

## H5 — nested short turns

**No official nested codes or short-turn workings found in the report.** T50 is described as one
line, 23 stops, terminating at Newhaven and Edinburgh Airport (report line 3, 23). The report gives
no indication of trams terminating mid-route or running a partial working. Absence of evidence is
not confirmation — flag to Nico for explicit confirmation (does every T50 tram run the full
Newhaven–Airport length?) before this assumption survives into a live adapter's direction logic.

## H6 — inner city (where §3 lives)

Locked hub: **Edinburgh Waverley** (National Rail, EDB CRS) — main Edinburgh station, 20 platforms
(report line 17). This is the National Rail hub-lock, not a merged NR+Trams hub — see H1
doNotGroup above and direction-model-memo.md.

Trams serve a separate "Waverley area" stop nearby with no automatic interchange described (report
line 3, 17). Unlike Glasgow (two separate NR termini, no single NR hub) and closer to the
Newcastle/Rotterdam single-hub shape on the National Rail side — Edinburgh Waverley is the one NR
hub-lock for this city. The complication here is not NR-internal (unlike Glasgow Central/Queen
Street) but cross-mode: Trams physically approach the same named area without merging into the
same board.

## H7 — DST

**Europe/London observes DST (BST/GMT).** Edinburgh is on UK civil time, not a separate Scotland
zone. Same as every other UK region packed so far (report line 91) — do not copy any no-DST
assumption from an Australian/NZ pack.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| Edinburgh Waverley (Trams, Waverley area stop) vs Edinburgh Waverley (National Rail, EDB) | Separate platforms/infrastructure, different operator, no automatic interchange described |
| Falkirk High vs Edinburgh catalog | Owned by Glasgow region per the exclusive-territory split at Falkirk High — Edinburgh's catalog begins east of the boundary and does not include Falkirk High itself |
| Caledonian Sleeper vs ScotRail/LNER/Avanti/CrossCountry/TransPennine at Edinburgh Waverley | Board-eligibility `out-reservation` vs `in` |
| Edinburgh Park (NR station) vs Edinburgh Park Central (Tram stop) | NR station explicitly out of v1 catalog per report line 20; only the Tram stop is in scope |

## Falkirk High boundary consistency check with Glasgow

Checked `docs/glasgow-d1/published-network.json` and `hazard-pack.md` per the dispatch
instruction. Glasgow's pack **excludes Falkirk High entirely** from its own catalog
("Falkirk High (owned by Edinburgh region) vs anything in this catalog — excluded entirely, not
a doNotGroup case so much as an out-of-catalog station", Glasgow hazard-pack.md H1). This
Edinburgh report (line 9, 75, 87) states the same underlying Tim-approved boundary decision:
Edinburgh owns the Waverley/Haymarket/Slateford side of the split, Glasgow owns its side, and
Falkirk High itself is named as "Glasgow's boundary station" (report line 9).

**Reading this literally:** Falkirk High is Glasgow's boundary station, i.e. it sits on Glasgow's
side of the split and is Glasgow's to own, not Edinburgh's. Edinburgh's report never lists Falkirk
High as one of its own stations in the station-name table (report lines 15–21), and the through-
running stations Edinburgh does own are named explicitly as Haymarket and Slateford only (report
line 9, 19, 87). Symmetric with Glasgow's exclusion: **this pack does not add Falkirk High to
Edinburgh's `published-network.json` either.** Both regions' packs now agree Falkirk High is
out of catalog for both — Glasgow because it belongs to Edinburgh's side of the split per its own
report's phrasing, but Edinburgh's own report never actually claims Falkirk High as an Edinburgh
station, so there is no contradiction: neither pack includes it, and neither pack claims to own
it. **Flagging this apparent phrasing mismatch between the two reports (Glasgow's report calls
Falkirk High "owned by Edinburgh region"; Edinburgh's report calls it "Glasgow's boundary
station") back to Nico/Tim rather than resolving it here** — this pack's job is not to guess which
report is right, only to note that Edinburgh's own oracle report never lists Falkirk High as an
Edinburgh station, so it is excluded from this catalog on that basis alone, independent of which
region "owns" it.

## What I did not do

No generator, no assertion tables, no live city flip, no GTFS fetch/parse, no invented Trams stop
sequence beyond transcribing the report's line 21 list, no invented Trams frequency beyond the
report's stated 7–10 minute headway, no `docs/united-kingdom-ledger.md` creation (flagged as
overdue, not this pack's job to write), no reading of any other city's in-progress pack (Glasgow's
pack is merged, not in-progress, and the dispatch explicitly instructed checking it for boundary
consistency).
