# Sydney intercity direction model memo (§3, retrospective — model already locked)

Written 15 Sep 2026 per `docs/jim-brief-sydney-intercity-followups.md` item 3 (Mark's #394
review, non-blocking flag), to give Sydney's pack the same `direction-model-memo.md` shape as
every other city, and to record the citation the five NSW TrainLink intercity/Hunter lines'
chip wording was taken from.

**Status: locked, not open.** Sydney's network-wide direction model — **line + terminus**
(e.g. `T1 Emu Plains`) — was locked by Tim on 2026-08-23 for T1–T9/M1 (see the `Tim lock
2026-08-23` note in `qa/sydney-line-map-conformance.mjs`). The 14 Sep 2026 intercity fill
(`docs/jim-brief-sydney-intercity-fill.md`) extended that same model to the five walk-up
NSW TrainLink/Hunter lines rather than reopening the choice — `lib/cities/sydney/
marketing-directions.js`'s `MARKETING_ENDS` and `qa/sydney-line-map-conformance.mjs`'s
`MARKETING_ENDS` already carry BMT/CCN/SCO/SHL/HUN entries and are green. This memo documents
that extension for the record; it does not propose changing anything already shipped.

## The five lines

| Code | Line (TfNSW name) | Termini used for chips | GTFS termini (`published-network.json`) |
| --- | --- | --- | --- |
| BMT | Blue Mountains Line | Central, Lithgow | Central, Lithgow |
| CCN | Central Coast & Newcastle Line | Central, Newcastle Interchange | Central, Newcastle Interchange |
| SCO | South Coast Line | Central, Bomaderry | Central, Bomaderry |
| SHL | Southern Highlands Line | Central, Goulburn | Central, Goulburn |
| HUN | Hunter Line | Dungog, Scone | Newcastle Interchange, Dungog, Scone |

HUN is the one line + terminus needs a footnote: it is a **branched** line (Maitland/
Whittingham is the fork — Dungog via the North Coast direction, Scone via Muswellbrook/
Aberdeen), not a single spine like the other four. `line-map.json` records the two branches as
a `doNotGroup` pair (see `docs/sydney-d1/board-eligibility-intercity.md`'s HUN row), so a rider
at, say, Maitland sees two chips (`HUN Dungog` / `HUN Scone`) rather than one ambiguous `HUN`
chip — consistent with how T1's North Shore/Western fork and T5's Leppington/Richmond fork are
already handled network-wide. Newcastle Interchange is HUN's third named terminus in the
published network pack (trains also originate there), but it is not a marketing chip end in
`MARKETING_ENDS` because it coincides with CCN's own terminus at the same physical hub — a
rider there already sees `CCN Newcastle Interchange` inbound from Central; giving HUN a
redundant `HUN Newcastle Interchange` chip in the *other* direction from Dungog/Scone would
double up on the hub without adding information. This matches the pattern already used for
T-line hub stations (e.g. Central, Waitematā-style hubs elsewhere): the hub name is the
*origin* implicit in "leaving the hub", not a marketing terminus in its own right.

## Recommendation (confirming what's shipped)

**Line + terminus**, matching the network-wide lock: `BMT Lithgow`, `CCN Newcastle
Interchange`, `SCO Bomaderry`, `SHL Goulburn`, `HUN Dungog` / `HUN Scone`. Use the printed
TfNSW line-page/network-map terminus name, not a GTFS headsign variant (GTFS headsigns for
these five carry stopping-pattern noise — "Lithgow", "Mount Victoria limited", "Katoomba" short
runs, etc. — that the T-line chips already fold onto the one marketing terminus the same way,
per `marketing-directions.js`'s header comment on City Circle folding).

## Options considered (same three shapes as every other line on this network)

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (shipped) | `CCN Newcastle Interchange`, `BMT Lithgow` | Matches the network-wide lock; no special case for intercity vs suburban lines; survives HUN's branch via a doNotGroup pair, same mechanism as T1/T5 | Central-bound chips read `BMT Central` etc. even though four of the five lines don't actually enter the City Circle loop (they terminate at Central, a real terminus, not a loop pass-through — so this is not the City Circle case at all, just a normal terminus) |
| **B. Terminus only** | `Lithgow`, `Newcastle Interchange` | Shorter chip | Central's board already carries 17 chips (see `sydney-line-map-conformance.mjs`'s printed Central label count); dropping the line code loses the T-line/intercity distinction riders use to tell an all-stops T9 from an express-pattern BMT |
| **C. Inbound/outbound vs Central + terminus** | `To Central` / `To Lithgow` | Short | Same problem as every other Sydney hub already documented for T-lines: at Central every line is "outbound" to a different suburb, so "inbound" alone carries no line identity — the network-wide lock rejected this shape everywhere else, no reason to special-case intercity |

## Citation for chip wording

Terminus names and stopping order for the five lines were hand-transcribed from TfNSW's public
network map/line pages at the same sourcing standard as the rest of this D1 pack — see the
`14 Sep 2026` note in `lib/cities/sydney/line-map.json` line 11 ("station names, published
stopping order and termini are from TfNSW's public network map/line pages, same sourcing
standard as the rest of this file's D1 pack"). The top-level source for that transcription is
`published-network.json`'s own `"source": "https://transportnsw.info/routes/train"` — the same
index page the original D1 pack (T1–T9/M1) was transcribed from on 2026-08-23.

**Gap, not duplicated:** `published-network.json`'s `linePages`/`pdfTimetables` maps only list
T1–T9/M1 — BMT/CCN/SCO/SHL/HUN have no per-line page or PDF timetable URL recorded there yet,
because the 14 Sep 2026 fill transcribed termini/stopping order from the network-map index
page directly rather than each line's own subpage. This is a real gap worth closing (each of
the five lines does have its own TfNSW line page, the same as T1–T9), not something this memo
should silently duplicate by inventing a citation here instead. Left as a follow-up rather than
fixed in this pass, since the acceptance criteria for this brief are the line-map gate
registration and the coordinate audit, not a `published-network.json` rewrite — a future pass
should add `linePages.BMT`/`.CCN`/`.SCO`/`.SHL`/`.HUN` (and matching `pdfTimetables` entries)
the same way T1–T9's were recorded, then this memo's citation can point at those instead of the
index page.

## Open questions for Tim

None — the model is locked network-wide (2026-08-23) and this memo only documents its already-
shipped extension to the five intercity/Hunter lines. The one open item is the `linePages`/
`pdfTimetables` gap noted above, which is a data-completeness follow-up, not a direction-model
decision.
