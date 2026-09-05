# Nagoya hazard pack (H1–H7)

Evidence: `docs/nagoya-d1/oracle-clash-report.md` (Nico, 6 Sep 2026) — agency/feed table, hub lock,
station name table, board eligibility, license, and the report's own "Station roster (D1
transcription)" section (six per-line tables citing [List of Nagoya Municipal Subway stations —
Wikipedia](https://en.wikipedia.org/wiki/List_of_Nagoya_Municipal_Subway_stations) and each line's
own Wikipedia article). No other source read for this pack; no other city's pack read for context.

Product `lib/cities/nagoya/` absent. `assertCityLive("nagoya")` is Unknown city (planned/501).

## H0 — top hazard: no official public feed at all (record first, per task brief)

**There is no official Nagoya Metro GTFS, GTFS-RT, or route-map PDF of any kind** — confirmed by
the oracle report against Transitland (0 Onestop hits), Mobility Database `feeds_v2.csv` (0 rows),
and the ODPT member list (Nagoya absent; Tokyo Metro present, so "Japan subway = ODPT" is not a
safe generalisation). This is a **harder starting position than Osaka**, which at least has an
official EN/JP station-list page and a dated 路線図 PDF the pack could hand-transcribe against; here
the entire station graph in this pack is transcribed from Wikipedia's aggregate station list and
six per-line articles because the oracle report found no dedicated official map PDF on the rider
site as of 2026-09-06. Every station name, code, and adjacency in `published-network.json` is
therefore **one hop further from a primary source than the Osaka precedent** — treat the graph as
provisional until Jim or a later pass can check it against the rider site's own per-line station
lists (https://www.kotsu.city.nagoya.jp/rp/route/) directly, not just Wikipedia's summary of them.
This is the top hazard for this pack, ahead of any name-family or branch/loop hazard below, because
it means **no feed exists to catch a station-graph transcription error** — a wrong adjacency or
code here has no GTFS to contradict it.

## H1 — parent + child / name-family doNotGroup

D1 has no stopIds — there is no feed hierarchy to collapse, so (as in Osaka) the hazard is
**name-family**, not parent/child platforms.

doNotGroup, sourced from the oracle report's station name table and hub-lock section:

- **Sakae** (hub lock, H10 × M05) vs **Hisaya-odori** (M06 × S05, underground-connected complex,
  separate physical station) vs **Nagoya Station** (S02/H08 Metro row — separate from JR Nagoya /
  Meitetsu Nagoya, which sit at the same place under different operator branding) vs **Kanayama**
  (M01/E01 Metro row — separate from JR Kanayama / Meitetsu Kanayama) vs **Sakaemachi** (Meitetsu
  Seto Line only, underground-connected to Sakae but a different operator's station, **out of v1**).
- **Imaike** (H13 × S08) and **Aratama-bashi** (M23 × S14) are named as south/east interchange
  clusters in the oracle report but are explicitly **not** the hub lock — do not promote either to
  hub status.

## H1a — internal transcription conflicts in the oracle report itself (flag, do not silently resolve)

Two numbering conflicts exist **between the oracle report's own prose sections and its own Station
roster table** — I did not pick one side and hide the other; both are recorded here and the roster
table (the section the task brief names as the source for the ordered station arrays) is what
`published-network.json` uses, flagged for Nico/Jim to reconcile against the rider site directly:

1. **Kamiiida Line terminus codes.** The report's earlier "Hub lock" and "Skip risk" sections both
   describe Kamiiida as **K02** ("Kamiiida | EN Kamiiida K02 (terminal)", "Meitetsu Komaki Line
   through-running via Kamiiida beyond K02"). The report's own detailed **Station roster** table
   for the Kamiiida Line instead gives **K01 Kamiiida** (northern terminus, where the Meitetsu
   through-run begins) and **K02 Heian-dori** (southern terminus). `published-network.json` uses
   the roster table's K01/K02 assignment (more granular, tabulated, and matches the roster's own
   "Meitetsu Komaki Line through-run begins here" note sitting on K01). The earlier prose's "K02"
   references to Kamiiida are likely a slip, not a second valid numbering — but I have not
   confirmed this against the rider site itself, because no such official page was found. Flag for
   Nico to check the actual platform signage/rider-site numbering before D2.
2. **Kanayama's Meiko-branch code.** The station name table lists "Kanayama (Meiko) | EN Kanayama
   **E00** (Meiko branch origin)"; the Station roster's Meikō Line table instead lists **E01
   Kanayama** as the branch's own first stop. `published-network.json` uses **E01** (the roster
   table's value, consistent with Meikō's own 7-station sequence E01–E07). The E00 mention is not
   reused. Flag for Nico/Jim to confirm the printed platform code before D2 — do not treat either
   number as settled.
3. **Aratama-bashi's codes.** The station name table lists "Aratama-bashi | EN Aratama-bashi **M07
   / S06**"; the Station roster's own Meijo interchange list and per-line tables instead give
   **M23 / S14** (Meijo's own "Interchanges" line and Sakura-dori's own "Interchanges" line both
   independently agree on M23/S14, and the per-station rows in both line tables use those codes
   too — so within the roster this one is internally consistent, it only conflicts with the
   earlier station-name table). `published-network.json` uses **M23 / S14**, the roster's doubly
   self-consistent value. The M07/S06 mention is not reused. Flag for Nico to confirm which pass
   over the source produced the M07/S06 figures before treating this as fully closed.

## H1b — unique-station count discrepancy (flag, do not force to match)

The oracle report's own Summary section states **"Total unique stations: 87 (per Nagoya City
Transportation Bureau official count)."** Mechanically unioning the six per-line station-name
lists exactly as transcribed in the Station roster tables (96 raw line-ticks: H22+M28+E7+T20+S17+
K2) produces **83 unique canonical places**, after merging the one same-place spelling variant
found in transcription (**Aratama-bashi** on Meijo M23 vs **Aratamabashi** on Sakura-dori S14 — same
physical interchange per the report's own "Interchange with Sakura-dori S14" cross-reference; both
tables in the roster otherwise agree these are the same place). I have **not** invented three or
four additional stations to force a match to 87, and I have not silently trusted 87 over my own
count of the transcribed tables. `published-network.json`'s `uniqueStationCount` reflects the
83 actually present in the arrays, with this discrepancy recorded as a coverage gap — Nico should
reconcile against the rider site's own official count before this number is treated as locked.

## H3 — thin / event / overlay

- **No New Tram / no monorail / no LRT** in Nagoya (unlike Osaka's New Tram) — the oracle report
  found no such system; not applicable here.
- **Meiko Line integration with the Meijo loop is not a separate overlay — it's the loop/branch
  hazard itself**, handled in full in H4 and direction-model-memo.md §2, not as a thin overlay.
- **Sakura-dori Line's three "future extension" stations** (Takaoka → planned Kamiiida link,
  Fukiage → planned Tobu Line, Sakura-hommachi → planned Nambu Line) are printed on the roster as
  *current, already-open* Sakura-dori stops with a *future* transfer noted — they are **in v1** as
  ordinary Sakura-dori stations today; the planned transfers themselves are not overlays to model,
  just a note not to invent a connection that does not exist yet.

## H4 — branches (doNotGroup candidates) and the loop/branch pair (H4 proper)

| node | branches | evidence |
| --- | --- | --- |
| Sakae | Higashiyama (H10) + Meijo (M05), underground to Hisaya-odori (M06/S05) | Hub-lock section: "Official transfers on rider site: Meijo M05 and Higashiyama H10 only at this physical station" |
| Kanayama | Meijo loop anchor (M01) + Meikō branch origin (E01) + JR/Meitetsu (out) | Roster: "M01 Kanayama — Loop start/end. Meiko E01 junction." |
| Heian-dori | Meijo loop (M11) + Kamiiida Line origin (K02) | Roster: "M11 Heian-dori — Interchange with Kamiiida K02"; confirmed twice in roster as **M11**, not the historical M25 some sources use |
| Nagoya | Higashiyama (H08) + Sakura-dori (S02), doNotGroup vs JR/Meitetsu/Shinkansen/Aonami | Station name table + roster cross-notes on H08 and S02 |

**Meijō (M) is a true loop, not a linear line with two termini.** The roster's own "Loop
configuration" line states M01 Kanayama is the loop's start/end point and M28 Nishi Takakura is
"the final station before loop closes back to M01" — there is no linear terminus pair the way
Higashiyama/Tsurumai/Sakura-dori/Kamiiida each have one. This is the same topology as Copenhagen's
M3 Cityringen (see `docs/copenhagen-d1/direction-model-memo.md` §1) — **do not** invent a fake
Meijo terminus pair (e.g. "Meijo + Kanayama") the way a linear line would get one; direction is
clockwise/anticlockwise, worked in full in direction-model-memo.md §2.

**Meikō (E) is a branch off the loop at Kanayama, not an independent line with two free termini.**
The roster's own line note: "Roughly every other anticlockwise Meijo loop train diverts here rather
than continuing to Nagoya Daigaku; integrated service." This means a real rider-facing train can
be signed Meijo up to Kanayama and then continue as a Meiko-branded service (or vice versa) —
**this is a genuine direction-collapse hazard**, not a cosmetic branch note: if a later adapter
treats E as a fully separate line with its own closed timetable, it will miss that some physical
train runs are shared rolling stock crossing the M/E boundary at the same station. Worked in
direction-model-memo.md §2; this pack does **not** attempt to model through-running board logic,
only flags it.

## H5 — nested short turns

No printed short-turn/limited-stop workings found anywhere in the oracle report's roster or prose
for any of the six lines (unlike Perth's K/W/C/P shorts or Osaka's Kitakyu-adjacent short-runs).
`shortTurns` is empty on all six lines in `published-network.json`. If a later source finds printed
short-workings (e.g. a Higashiyama peak short at Motoyama), that is a gap to add then, not something
to invent here.

## H6 — inner city (where §3 lives)

Locked hub: **Sakae** (H10 × M05 only, per the oracle report's explicit "official transfers on
rider site: Meijo M05 and Higashiyama H10 only at this physical station"). Underground-connected
but **not folded in**: Hisaya-odori (M06 × S05, a genuine three-subway-line access point via the
underground complex, but a **separate physical station**) and Sakaemachi (Meitetsu Seto Line,
different operator, **out of v1**).

Not the hub, despite each being a real multi-line node: **Nagoya Station** (Metro H08/S02 plus
JR/Meitetsu/Shinkansen — an entry-point mega-hub, out of scope for the Metro-only hub lock),
**Kanayama** (Metro M01/E01 plus JR/Meitetsu — eastern loop anchor and Meiko branch origin, not the
lock), **Imaike** (H13/S08, south-of-hub interchange), **Aratama-bashi** (M23/S14, south-loop
interchange).

## H7 — DST

**Asia/Tokyo does not observe DST** — same as Osaka. Do not copy Europe/Copenhagen or
Australia/Sydney DST handling for this city. Wall-clock is Japan standard time year-round.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| nagoya vs nagoya-metro / nagoya-subway / ngy / japan / osaka / tokyo / keihanshin | Separate city; agency Nagoya City Transportation Bureau |
| Sakae vs Hisaya-odori | Underground-connected but two physical stations; hub lock is Sakae only |
| Sakae / Hisaya-odori vs Sakaemachi (Meitetsu) | Different operator; out of v1 |
| Nagoya (Metro H08/S02) vs JR Nagoya / Meitetsu Nagoya | Same place, different operator branding; Metro row only is D1 |
| Kanayama (Metro M01/E01) vs JR Kanayama / Meitetsu Kanayama | Same place, different operator branding; Metro row only is D1 |
| Kamiiida (K01, Metro terminus) vs Meitetsu Komaki Line through-run beyond it | Different operator beyond the Metro terminus |
| Kami Otai (T01) vs Meitetsu Inuyama Line through-run beyond it | Different operator beyond the Metro terminus |
| Akaike (T20) vs Meitetsu Toyota/Mikawa Line through-run beyond it | Different operator beyond the Metro terminus |
| Meijo loop vs Meiko branch | Same operator, integrated service, but different printed line letter/colour — doNotGroup as line identities even though some physical runs cross the boundary at Kanayama (see H4/§2) |
| Aratama-bashi (M23) vs Aratamabashi (S14) spelling variant | Same physical interchange per roster cross-reference; treat as one D1 station string, not two |

## What I did not do

No generator, no live city flip, no adapter code, no `lib/providers/` or `registry.js` edit, no
D5 assertion tables, no reconciliation of the K01/K02 or E00/E01 numbering conflicts against the
rider site directly (flagged in H1a, not resolved — no live fetch was performed for this pack), no
forcing of the unique-station count to 87 (flagged in H1b), no modelling of Meijo/Meiko
through-running board behaviour beyond flagging it as a hazard (H4, direction-model-memo.md §2), no
reading of any other city's in-progress pack or prior chat transcript for context.
