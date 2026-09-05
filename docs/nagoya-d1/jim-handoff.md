Nagoya D1 pack (Luke), 6 Sep 2026. City stays **planned**. Picker shows **Nagoya (Coming Soon)**
under Japan (`jp`), alongside Osaka. Existing live/planned cities untouched.
`assertCityLive("nagoya")` must still fail (city not in `lib/providers/registry.js` today).
No generator, no PR, no product edit, no `lib/providers/` or `registry.js` edit.

Pack files: `docs/nagoya-d1/{oracle-clash-report,hazard-pack,direction-model-memo}.md`,
`published-network.json`, this file.

## What's solid (cite: hazard-pack.md, direction-model-memo.md)

- **city=nagoya**, single operator (Nagoya City Transportation Bureau), six subway lines
  (Higashiyama H, Meijo M, Meiko E, Tsurumai T, Sakura-dori S, Kamiiida K), 83 unique stations by
  this pack's own count of the transcribed station roster (see the count discrepancy note below —
  the oracle report's own summary says 87). Not `city=nagoya-metro` / `nagoya-subway` / `ngy`. Not
  merged into Osaka, Tokyo, or a Keihanshin/Japan super-city.
- **Hub lock: Sakae** (H10 x M05 only, per the oracle report's explicit rider-site transfer
  statement). Do not fold in Hisaya-odori (underground-connected but a separate physical station),
  Nagoya Station (entry-point mega-hub with JR/Meitetsu/Shinkansen), Kanayama (JR/Meitetsu plus the
  Meijo loop anchor / Meiko branch origin), or Sakaemachi (Meitetsu Seto Line, out of v1).
- **Meijo (M) is a true loop, not a linear line.** No terminus pair exists — direction model is
  clockwise/anticlockwise, same topology as Copenhagen's M3 Cityringen. **Meiko (E) is a branch off
  the loop at Kanayama**, and the roster's own text says roughly every other anticlockwise Meijo
  train diverts onto it rather than continuing around — a real through-running hazard this pack
  flags but does not model (no trip-level data exists to model it against; see hazard-pack.md H4,
  direction-model-memo.md §4).
- **Two genuine through-running hazards named in the task brief, both confirmed against the
  roster**: Tsurumai↔Meitetsu (Kami Otai T01 → Meitetsu Inuyama Line; Akaike T20 → Meitetsu
  Toyota/Mikawa Line) and Kamiiida↔Meitetsu (Kamiiida K01 → Meitetsu Komaki Line, continuing to
  Komaki/Inuyama). Both v1 termini stop at the Metro station string; never chip a Meitetsu
  destination past either hinge.
- **No official public feed of any kind — the top hazard in this pack (hazard-pack.md H0), ahead
  of any name-family or loop/branch hazard.** No GTFS, no GTFS-RT, no dedicated official route-map
  PDF (Nagoya is behind Osaka here, which at least has one). Station graph is hand-transcribed from
  Wikipedia's aggregate station list and six per-line articles, one hop further from a primary
  source than every other Japan pack so far. Treat the graph as provisional until someone checks it
  against the rider site's own per-line station pages directly.
- **No license found** (same "not found" pattern as Osaka — municipal, non-ODPT, no published reuse
  terms beyond a general website copyright notice).
- **Asia/Tokyo has NO DST.**

## What is still NOT solid — resolve before/at D2, don't wire around

1. **Three internal numbering conflicts inside the oracle report itself** (hazard-pack.md H1a), none
   resolved against a live source because none exists: Kamiiida Line terminus codes (roster:
   K01=Kamiiida/K02=Heian-dori; earlier report prose: Kamiiida=K02); Meiko branch origin code
   (roster: E01=Kanayama; earlier report table: E00); Aratama-bashi's codes (roster: M23/S14,
   self-consistent across both lines' own tables; earlier report table: M07/S06).
   `published-network.json` uses the roster's values throughout — **get these checked against the
   rider site's own per-line pages before treating any of the three as settled.**
2. **Unique station count discrepancy** (hazard-pack.md H1b): oracle report's summary claims 87;
   this pack's mechanical union of the six roster tables (after merging the one spelling variant,
   Aratama-bashi/Aratamabashi) yields **83**. I did not invent 3–4 stations to force a match. Flag
   for Nico to reconcile against the official Nagoya City Transportation Bureau count.
3. **Meijo's clockwise/anticlockwise chip wording** — no official EN rider-site page was found to
   check this against (direction-model-memo.md open question 1). Recommend English
   "Clockwise"/"Anticlockwise" as a default, but this is not sourced against a primary page the way
   Copenhagen's M3 memo could cite Nørrebro's own infobox wording.
4. **Meijo/Meiko through-running board representation** — whether a single physical trip becomes
   two logical legs or one row that changes its chip partway needs real trip-level data that does
   not exist as a public feed today (direction-model-memo.md open question 2). Not decided here.
5. **The absence of any official map PDF** means the station graph itself (not just direction
   modelling) is the least-verified part of this pack among the Japan cities so far — recommend a
   dedicated pass to check every adjacency against the rider site's own per-line pages
   (https://www.kotsu.city.nagoya.jp/rp/route/) before D2, not just trusting Wikipedia's aggregate
   list a second time.

## Direction model (full detail: direction-model-memo.md)

- **Higashiyama (H), Tsurumai (T), Sakura-dori (S), Kamiiida (K)**: line + official terminus, e.g.
  `H + Fujigaoka`, `K + Heian-dori`. Both Tsurumai termini and Kamiiida's northern terminus are
  Meitetsu through-running hinges — chip stops at the Metro terminus string, never a Meitetsu
  destination beyond it.
- **Meijo (M), true loop**: `M + Clockwise` / `M + Anticlockwise`. Never a fake terminus pair.
- **Meiko (E), branch off the loop at Kanayama**: line + terminus, `E + Kanayama` / `E + Nagoyako`,
  with the through-running caveat above.
- Sakae is the only hub-lock string; never a direction token anywhere in this pack.

## What I did not do

No generator, no live city flip, no UI wiring, no D5 assertion tables, no adapter code, no
`lib/providers/` or `registry.js` edit, no live fetch of the rider site or Wikipedia during this
pass (worked entirely from `docs/nagoya-d1/oracle-clash-report.md`'s own transcription and
citations, per the task's read-only-the-oracle-report instruction), no resolution of the three
internal numbering conflicts or the unique-station-count discrepancy (both flagged, not decided),
no modelling of Meijo/Meiko through-running board behaviour (flagged, not modelled), no reading of
any other city's in-progress pack or prior chat transcript for context beyond the Osaka and
Copenhagen precedents named in the task brief itself.

## Lane status

Luke needs no lane-lock check (per CLAUDE.md — Luke's whole write set is `docs/nagoya-d1/`, which
no other lane touches). This pack is complete by the shape of every other `docs/<city>-d1/` folder
(4 files, each cross-referencing the others) and every claim in it traces to
`docs/nagoya-d1/oracle-clash-report.md`. The adapter build has not been started — that is Jim's job,
and given how thin the underlying evidence is (no official feed, no official map, three internal
numbering conflicts, a station-count mismatch), a supervised session is recommended for D2 rather
than an unattended one, same caution Copenhagen's pack gave for a different reason (board-
eligibility scope growth there vs source-thinness here).
