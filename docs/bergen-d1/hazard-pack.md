# Bergen hazard pack (H1–H7)

Evidence, re-fetched live during this pass (28 Sep 2026) because `oracle-clash-report.md` named
the Skyss timetable PDFs and linjekart as D1 sources but did not itself transcribe the full
per-line station arrays or resolve them against a stop-place register:

- **Skyss Rutetabeller for Bybanen — line 1** (`https://www.skyss.no/globalassets/reise/rutetabellar/bybanen/1.pdf`),
  re-downloaded this pass. Currently printed "Gyldig frå 10. august 2026." Header pictogram row and
  footer diagram on every page print the full 27-station ordered list, Byparken → Bergen lufthavn,
  with per-station running minutes. Page footers read "1 Byparken › Bergen lufthavn" / "1 Bergen
  lufthavn › Byparken" (the specific station, not a "Bergen sentrum" marketing string).
- **Skyss Rutetabeller for Bybanen — line 2** (`https://www.skyss.no/globalassets/reise/rutetabellar/bybanen/2.pdf`),
  re-downloaded this pass. Same currency date. Full 9-station ordered list, Kaigaten → Fyllingsdalen
  terminal. Page footers read "2 Fyllingsdalen terminal › Bergen sentrum" / "2 Bergen sentrum ›
  Fyllingsdalen terminal" — **line 2's own printed footer uses the "Bergen sentrum" marketing
  string, not Kaigaten**, unlike line 1's footer (see H6).
- **Wikipedia "List of Bergen Light Rail stations"** (`en.wikipedia.org/wiki/List_of_Bergen_Light_Rail_stations`,
  fetched via `action=raw` this pass), a wikitable with Station / Stage / Opened / Transfers /
  Borough columns, split into Line 1, Line 2, and an unopened "Future" (Åsane extension) section.
  Used as an independent cross-check of station order, stage-opening dates, and the Line 2 count —
  not the primary source (the Skyss PDFs are), but it agrees with the PDFs' names and order once
  "Bergen busstasjon" is treated as one name (see H2).
- **Entur geocoder** (`api.entur.io/geocoder/v1/autocomplete` and `/reverse`, header
  `ET-Client-Name`), queried once per station name this pass to resolve NSR stop-place ids and
  coordinates — not used for the station *graph* (order/count), only for id/lat-lng lookup once
  each D1 name was locked from the PDFs.
- `docs/bergen-d1/oracle-clash-report.md` (Nico) — agency, mode cut, hub-lock rationale (corrected
  here, see H6), board-eligibility verdicts, license.
- `docs/norway-ledger.md` (Nico, country lane) — provider decision (Entur), stop ownership (Bergen
  owns all 33 Bybanen stops; Bergen Railway Station is Oslo-ledger-adjacent but owned by neither
  region's catalog), national-service verdicts (Vy long-distance `out-reservation` everywhere it
  calls, moot for Bergen since it doesn't call at any in-catalog stop — see Board eligibility below).

Product `lib/cities/bergen/` absent. `assertCityLive("bergen")` is Unknown city.

## H1 — parent + child / doNotGroup

D1 has no product stopIds. Single operator (Skyss, light rail mode only) in v1 scope — no
competing-operator platform conflation exists at any in-catalog Bybanen stop (see Board
eligibility). What the station graph does need is a same-operator name-collision map: several
Bybanen stop names are one keystroke apart from a *different* Bybanen stop, and one pair of
stations is one keystroke apart from the out-of-scope Vy railway station.

| candidate A | candidate B | why they must never collapse |
| --- | --- | --- |
| **Bergen busstasjon** (NSR:StopPlace:62356, tram) | **Bergen stasjon** (NSR:StopPlace:59983, `railStation`) — Vy | Different NSR stop-place ids, different mode categories, ~350m apart on foot. Bergen stasjon is the Vy/NSB railway station building; Bergen busstasjon is the Bybanen + city bus terminal. Neither is "Bergen S" or "Jernbanetorget" (those are Oslo strings) |
| **Nonneseter** (NSR:StopPlace:30862, tram) | **Bergen stasjon** (NSR:StopPlace:59983, `railStation`) — Vy | Nonneseter is the closest Bybanen stop to the railway station building (~90m by coordinate), but it is a distinct stop-place, distinct mode. This is the pair Nico's oracle report flagged in prose ("adjacent... but separate platform") — now confirmed with NSR ids and coordinates, not just prose |
| Nesttun **terminal** (NSR:StopPlace:58542) | Nesttun **sentrum** (NSR:StopPlace:58541) | Two distinct, adjacent Line-1 stations ~250m apart (stage 1, opened 2010, vs stage 2, opened 2013). Colloquial "Nesttun" alone is ambiguous between them — never collapse to a bare "Nesttun" |
| **Skjold** (NSR:StopPlace:29830) | **Skjoldskiftet** (NSR:StopPlace:59851) | Two distinct, adjacent Line-1 stations, similar names |
| **Kokstad** (NSR:StopPlace:30154) | **Kokstadflaten** (NSR:StopPlace:30159) | Two distinct, adjacent Line-1 stations, similar names |
| **Birkelandsskiftet** (NSR:StopPlace:58537, "Birkelandsskiftet terminal") | Kokstad / Kokstadflaten | Three distinct, closely-spaced Line-1 stations in the airport-corridor stretch |
| **Byparken** (NSR:StopPlace:30859) | **Kaigaten** (NSR:StopPlace:62130) | Two distinct city-centre termini, ~150m apart by coordinate (Line 1's own terminus vs Line 2's own terminus) — see H6, this is why the hub lock is neither of these two |

## H2 — station-count and name corrections (verified against primary sources, not the oracle report's prose)

The oracle report states Line 2 has **10 stations** and the **total unique count is 35**. Both are
wrong against this pass's re-fetch of the same two PDFs the oracle report itself named as D1:

- **Line 1, 27 stations, confirmed from the PDF's own pictogram header and footer diagram, Byparken
  end to airport end:** Byparken, Nonneseter, Bergen busstasjon, Nygård, Florida, Danmarks plass,
  Kronstad, Brann stadion, Wergeland, Sletten, Slettebakken, Fantoft, Paradis, Hop, Nesttun
  terminal, Nesttun sentrum, Skjoldskiftet, Mårdalen, Skjold, Lagunen terminal, Råstølen,
  Sandslivegen, Sandslimarka, Kokstad, Birkelandsskiftet, Kokstadflaten, Bergen lufthavn Flesland.
  This matches the oracle report's claimed count (27) and matches Wikipedia's Line-1 rows exactly.
- **Line 2, 9 stations, not 10, confirmed from the PDF's own pictogram header and footer diagram,
  Kaigaten end to Fyllingsdalen end:** Kaigaten, Nonneseter, Bergen busstasjon, Fløen, Haukeland
  sjukehus, Kronstad, Mindemyren, Kristianborg, Fyllingsdalen terminal. Wikipedia's Line 2 table
  independently lists the same 9 rows. Neither primary source pulled for this pack supports a
  10th Line 2 station.
- **Actual unique total is 33, not 35.** Three stations are shared between both lines — Nonneseter,
  Bergen busstasjon, Kronstad (all three appear identically named and identically positioned in
  the ordered lists of both PDFs) — so 27 + 9 − 3 = 33. The most likely source of the oracle
  report's inflated 35: its match table lists "Bystasjonen" as a station name distinct from
  "Bergen busstasjon" (next point), which would double-count the same physical stop under two
  names and also over-count Line 2 by one.
- **"Bystasjonen" (named in the oracle report's match table as a station in its own right) is not
  a name either current PDF prints.** Both PDFs — on both lines — print **"Bergen busstasjon"**
  for this stop (pictogram header, footer diagram, and every timetable row). Entur's geocoder has
  no stop-place named "Bystasjonen" in Bergen; it resolves "Bergen busstasjon" to a single
  stop-place, NSR:StopPlace:62356, tagged `busStation` + `onstreetTram` (both Bybanen lines plus
  the city bus terminal share this one stop-place). **Lock "Bergen busstasjon," not
  "Bystasjonen."**
- **"Danmarksplass" (oracle report, one word) is printed "Danmarks plass" (two words) on both the
  PDF and Entur's geocoder** (NSR:StopPlace:61380). Lock the two-word form.
- **"Sletten" (D1/PDF print, both lines' diagrams) is a name variant of NSR's "Sletten senter"**
  (NSR:StopPlace:62405, tram + bus). Same physical stop, two labels from two different registries —
  lock the Skyss/PDF print "Sletten" as the D1 published name (that's what riders see on the
  platform sign and the printed timetable), record "Sletten senter" as the NSR canonical form in
  `published-network.json` so Jim's D2 pass isn't surprised when Entur returns the longer name.
- **"Bergen lufthavn Flesland" (D1/PDF print) resolves to NSR:StopPlace:58536, which Entur itself
  labels "Bergen lufthavn"** (no "Flesland" suffix in the NSR print). Same stop, same note pattern
  as Sletten — lock the D1/PDF form, record the NSR form.

**H2 conclusion: use the 33-station total, 27/9 per-line counts, and the corrected names
transcribed in this pack's `published-network.json`, not the oracle report's 27/10/35 figures or
its "Bystasjonen"/"Danmarksplass" spellings.** Flagging back: the oracle report's total-count and
one station name are superseded by this correction (recorded as a dated note in
`oracle-clash-report.md`).

## H3 — thin / unverifiable / out of scope

- **Åsane extension (13 future stations: Torget, Sandbrogaten, Sandviken kirke, Amalie Skrams vei,
  Sandviken sykehus, NHH, Eidsvåg, Tertneskrysset, Åsane terminal, Åsane Sentrum, Nyborg,
  Langarinden, Vågsbotn)**: Wikipedia's own "Future" table section, all rows "TBD" for opening
  date. Not on either Skyss timetable PDF. Not inserted — out of v1 by construction status, same
  treatment as Oslo's Fornebubanen and Vienna's U5.
- **Vy Bergensbanen / Arna line at Bergen Railway Station**: per the country ledger and the oracle
  report, out of scope by *station-set* definition, not a service-level verdict — Bergen stasjon
  (NSR:StopPlace:59983) is never in this catalog. Confirmed this pass with hard geocoder evidence
  (H1 table) rather than taken on the oracle report's word alone: Bergen stasjon is a distinct
  NSR stop-place, `railStation` mode, from every Bybanen stop, closest being Nonneseter
  (~90m by coordinate) and Bergen busstasjon (~350m). No verdict is owed because no Vy service
  calls at any in-catalog stop-place — see Board eligibility section.
- **Buses at Bybanen stop-places**: Entur's geocoder tags `onstreetBus` alongside `onstreetTram` at
  many in-catalog stops (Bergen busstasjon, Nygård, Florida, Danmarks plass, Wergeland,
  Slettebakken, Nesttun terminal/sentrum, Skjoldskiftet, Mårdalen, Fyllingsdalen terminal, Lagunen
  terminal, Birkelandsskiftet terminal, Bergen lufthavn) — confirming Skyss buses share the same
  physical stop-place at these points. **`out-mode`** per the oracle report's original scope
  (Bybanen light rail only) — re-confirmed here with primary evidence, not re-litigated.
- **Nested short-turns / peak-only variants**: neither PDF's timetable grids show a short-turn
  notice (unlike Oslo's Helsfyr). Not yet ruled out against GTFS trip-level data (D1 explicitly
  does not use GTFS as the station-graph source) — flag for Jim's D2 pass, not decided here.

## H4 — branches (interchange topology)

Both lines are **linear with a shared trunk at each end and a shared crossing in the middle** —
neither Oslo's single through-tunnel nor Vienna's ten simple two-line pairs. Confirmed by
diffing both PDFs' own ordered station lists:

| segment | line 1 | line 2 | shared? |
| --- | --- | --- | --- |
| Byparken | terminus | — (not called) | no |
| Nonneseter | ✓ | ✓ | **yes** |
| Bergen busstasjon | ✓ | ✓ | **yes** |
| Kaigaten | — (not called) | terminus | no |
| Nygård → Danmarks plass | ✓ | — | no |
| Fløen → Haukeland sjukehus | — | ✓ | no |
| Kronstad | ✓ | ✓ | **yes** — physical interchange, both lines' separate approach tracks meet here |
| Brann stadion → Bergen lufthavn Flesland | ✓ | — | no |
| Mindemyren → Fyllingsdalen terminal | — | ✓ | no |

Three shared stations, not one: **Nonneseter** and **Bergen busstasjon** (the shared city-centre
trunk, each line's own terminus one stop further out), and **Kronstad** (the shared mid-network
crossing, reached by different intermediate stations on each line). This shape — two lines with
their own separate city-centre termini feeding a short shared trunk, diverging, then
re-converging once at a genuine interchange before diverging again permanently — doesn't match any
prior pack's topology (not Oslo's single through-tunnel, not Vienna's simple two-line pairs, not a
pure Y or ring). See H6 for what this means for the hub lock.

## H5 — nested short turns

None found in either PDF's timetable grids (H3). No official secondary codes; two passenger line
numbers only, **1** and **2**.

## H6 — inner city (hub lock — corrected from the oracle report)

**The oracle report locks Byparken**, reasoning "both lines meet in city centre; Line 1 terminus;
Line 2 departs nearby at Kaigaten." This pass's primary-source re-verification does not support
that reasoning: **Line 2 does not call at Byparken at all** — its own ordered station list (both
the PDF and Wikipedia) starts at Kaigaten and never lists Byparken. Byparken and Kaigaten are
confirmed-distinct Entur NSR stop-places (30859 vs 62130), roughly 150m apart by coordinate, each
served by exactly one line.

**This pack locks Bergen busstasjon instead**, for three reasons, all evidence-backed above:

1. It is the only city-centre station actually shared by both lines (H4) — Nonneseter is also
   shared, but Bergen busstasjon is the interchange point immediately adjacent to *both* lines' own
   termini (one stop from Byparken on line 1, one stop from Kaigaten on line 2), matching the
   "innermost shared point" role Stortinget plays in Oslo and Karlsplatz plays in Vienna.
2. Line 2's own printed page footer ("2 Bergen sentrum › Fyllingsdalen terminal") uses the
   marketing string "Bergen sentrum," not Kaigaten specifically — Skyss's own signage treats the
   city-centre area as bigger than either single terminus, which is consistent with locking a
   station that both lines actually call rather than either one's private terminus.
3. It disambiguates cleanly from the out-of-scope Vy railway station (H1: Bergen busstasjon vs
   Bergen stasjon, confirmed-distinct NSR ids) the same way Oslo's Jernbanetorget/Stortinget
   disambiguate from Oslo S.

Byparken and Kaigaten remain valid, real **direction-chip termini on their own lines** (trains
genuinely terminate there — unlike Oslo's Stortinget, which is never a direction token because no
line terminates there) — see direction-model-memo.md. **Flagging this override clearly for Tim**:
it changes the oracle report's C2/C3 guidance to Jim, on the strength of primary-source evidence
the oracle report didn't itself transcribe (the full ordered PDFs), not a stylistic preference.

Shared approaches (not the lock): Nonneseter (both lines, one stop from Bergen busstasjon towards
the two termini), Kronstad (both lines, the mid-network physical crossing, H4).

## H7 — DST (corrected from the oracle report)

**The oracle report's C2/C3 section says "Europe/Bergen uses CET with DST" — there is no IANA
timezone named `Europe/Bergen`.** Norway has exactly one IANA zone, **`Europe/Oslo`**, which
observes CEST/CET (DST). Bergen, like every other Norwegian city, uses `Europe/Oslo`. Same DST
transition dates and behaviour the oracle report described (last Sunday of March / last Sunday of
October) — only the zone identifier string is wrong and must be corrected before Jim's adapter
uses it (a bad IANA string throws or silently falls back to UTC in most runtimes, which would
break every leave-by calculation). Do not copy no-DST cities (Perth, Brisbane, Adelaide).

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| bergen vs city=norway / oslo / vy / skyss-bus | Separate city; agency Skyss Bybanen (light rail only); no merge into a national feed per the country ledger |
| Bergen busstasjon vs Bergen stasjon | Hub lock (Bybanen, tram) vs out-of-scope Vy railway station (rail) — confirmed-distinct NSR stop-places, H1 |
| Nonneseter vs Bergen stasjon | Closest Bybanen stop to the railway station building; still a distinct stop-place, H1 |
| Byparken vs Kaigaten | Two distinct per-line termini, ~150m apart — neither is the hub, H6 |
| Nesttun terminal vs Nesttun sentrum | Two distinct, adjacent line-1 stations; colloquial "Nesttun" is ambiguous, H1 |
| Skjold vs Skjoldskiftet | Two distinct, adjacent line-1 stations, similar names, H1 |
| Kokstad vs Kokstadflaten vs Birkelandsskiftet | Three distinct, closely-spaced line-1 stations, H1 |
| Bystasjonen (oracle report) vs Bergen busstasjon (current PDF print) | Same physical stop-place, one correct current name — H2 |
| Danmarksplass (oracle report) vs Danmarks plass (PDF print) | Spelling correction — H2 |
| Sletten (D1/PDF print) vs Sletten senter (NSR print) | Same physical stop-place, two registries' names — H2 |
| Bergen lufthavn Flesland (D1/PDF print) vs Bergen lufthavn (NSR print) | Same physical stop-place, two registries' names — H2 |
| Bybanen (Skyss) vs Skyss regional bus | Mode cut — buses `out-mode` even where they share a Bybanen stop-place, H3 |
| Åsane extension station names vs 1–2 current names | Unopened, all "TBD" — not inserted, H3 |

## What I did not do

No generator, no assertion tables, no live city flip, no product edit, no `lib/providers/` or
`registry.js` edit, no reopen of Oslo/London/Amsterdam/Rotterdam/Vienna/Hong Kong, no
station-graph invention for the unopened Åsane extension (H3), no GTFS fetch (the oracle report
explicitly says D1 is hand-transcribed timetables, not GTFS-derived — followed here; Entur was
used only for NSR id/coordinate lookup once each name was locked from the PDFs, never for the
station order or count).
