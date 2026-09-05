# Geneva hazard pack (H1–H7)

Evidence: `docs/geneva-d1/oracle-clash-report.md` (Nico, 2026-09-06), including its "Station roster
(D1 transcription, 6 Sep 2026)" section, which hand-transcribed all five TPG tram lines (12, 14,
15, 17, 18) from tpg.ch official line pages, cross-checked against French Wikipedia tram-line
articles, Transit app stop sequencing, and Annemasse Agglo documentation for the French
cross-border section of line 17. Product `lib/cities/geneva/` absent. `assertCityLive("geneva")`
is Unknown city.

Like the Lausanne pack in this same wave (and unlike Zürich, which was roster-only), the oracle
report already did the station-level transcription — five lines, full ordered stop arrays, termini
named, interchange stops annotated. This pack's `published-network.json` **is** a full station
graph for all five lines. No web-fetch was available or attempted in this pass; this Luke
invocation only reshapes the oracle report's own transcription into the D1 pack format, and adds
nothing not present in that report except a from-scratch recount of line intersections (see H2/H4
below), done directly against the report's own per-line arrays.

## H1 — parent + child / doNotGroup

D1 has no stopIds. **Hub lock: Cornavin (tram)**, per explicit task instruction. **doNotGroup
Léman Express Cornavin / SBB Genève-Cornavin vs TPG tram gare Cornavin** — same address, downtown
central hub, separate operator (CFF/SNCF vs TPG), separate platforms. Léman Express is walk-up
boardable and `in` on the board-eligibility table but out of v1 scope entirely by the tram-only
mode cut; even as a transfer note it must never be merged into the tram board at Cornavin.

The same shape recurs at every Léman Express station whose name collides with a transcribed tram
stop:

- **Genève-Eaux-Vives, gare** (tram lines 12, 17) vs **Léman Express Eaux-Vives / CEVA underground
  station** — doNotGroup, oracle report names this pair explicitly.
- **Lancy-Pont-Rouge, gare/Étoile** (tram lines 15, 17) and **Lancy-Pont-Rouge, gare** (tram line
  17 only) vs **Léman Express Lancy-Pont-Rouge** — doNotGroup. Two distinct tram stop names share
  the "Lancy-Pont-Rouge" prefix; do not collapse them into each other either (see H2 arithmetic
  note below — this pair is part of why a naive name-merge undercounts unique stops).
- **Lancy-Bachet, gare** (tram lines 12, 18) vs **Léman Express Lancy-Bachet** — doNotGroup, named
  in the board-eligibility table's Léman Express station list.
- **Chêne-Bourg** — Léman Express station name is bare "Chêne-Bourg"; the tram stops in this pack
  are the more specific **Chêne-Bourg, Place Favre** and **Chêne-Bourg, Peillonnex** (lines 12,
  17). Not an exact string collision, but same physical commune/area — flagged as a lesser
  doNotGroup candidate for Jim to confirm at adapter time, not asserted as certain here.
- **Champel, Sécheron, Meyrin (Léman Express station), Genève-Aéroport** — named in the oracle
  report's Léman Express station list with no exact-name tram-stop collision found in the
  transcribed arrays (Meyrin has many `Meyrin, <suffix>` tram stops on lines 14/18 but none named
  bare "Meyrin"). No doNotGroup pair asserted for these; flagged only as a proximity note, not a
  confirmed hazard.

## H2 — who has line codes today, and an arithmetic hazard found in this pass

Restating the oracle report's H2 table (agency filtering, feed composition — not re-verified
against a live source in this pass, same as Lausanne/Zürich for the GTFS side):

| surface | tram lines? | what it actually has |
| --- | --- | --- |
| TPG official network maps / tpg.ch | yes | Tram lines 12, 14, 15, 17, 18 (5 current lines); buses; trolleybuses; cross-border line 17 to Annemasse |
| opentransportdata.swiss GTFS | yes (with filter) | Switzerland national feed; must filter agency=TPG, route_type=0 (tram) to avoid Léman Express + S-Bahn + bus bleed |
| Transitland `f-u0-switzerland` | yes (with filter) | Full Switzerland feed; same filtering requirement |
| GTFS-RT protobuf | yes (with filter) | Same mixed stream; filter per trip on TPG agency |
| Wikipedia: Trams in Geneva + per-line French articles | yes | Current line roster, routes, terminals — the transcription source for this pack |
| Product `lib/cities/geneva/` | absent | No geneva stations.json / line-map.json yet |

**Arithmetic hazard, found in this pass, not resolved:** the oracle report's own Summary section
states "Unique stops: 94," but recomputing a dedup across the five per-line arrays *exactly as
transcribed in that same report* — same station name (French, including punctuation), counted once
regardless of how many lines call there — yields **86 unique stop names** (135 total stop-line
appearances, 49 of which are repeat appearances at interchange stations). This pack's
`published-network.json` `stats.stationsTranscribed` reports **86**, computed directly from the
`stations[]` arrays in this same file, not the report's own "94" summary figure. Both numbers trace
to the same source document and cannot both be right against the same per-line arrays; flagged for
Tim/Nico follow-up, not silently reconciled. Possible explanations (not confirmed): the report's
"94" may count something outside the five transcribed arrays (e.g. a station later dropped from a
line during transcription), or may be a hand-tally error against 135 total appearances. Do not
trust either number over a fresh count against the primary TPG map.

## H3 — thin / overlay / out of scope

- **Léman Express (CFF/SNCF commuter rail)**: `out-product` on the board-eligibility table — passes
  both boarding tests (walk-up, no compulsory reservation, no check-in barrier) but excluded by the
  v1 tram-only mode cut, not by a boarding-contract failure. Deferred to phase 2 or country-wide
  Swiss rail integration.
- **TPG buses & external bus operators**: `out-mode`.
- **Trolleybuses (TPG)**: `out-mode`.
- **Boat/ferry services (Lake Geneva, Rhône)**: `out-mode`.
- **Future line 6 / Ferney-Voltaire extension** (construction Sep 2025–end 2028, exact line
  assignment unclear per oracle report): out of the v1 passenger roster. Not inserted; no station
  rows invented for an unopened extension.

## H4 — hub-lock choice + branches

**Locked: Cornavin (tram)** — per explicit task instruction. The oracle report itself is internally
inconsistent about exactly which lines converge at Cornavin, a second arithmetic-style hazard found
in this pass:

| source in the oracle report | lines claimed at Cornavin |
| --- | --- |
| Hub-lock prose (`## v1 mode cut`) | "confirmed tram stop for lines 12, 14, and 15" |
| Inline interchange annotations on individual stop rows | "major interchange: lines 14, 15, 17, 18" |
| **This pack's own recount, direct from the five transcribed `stations[]` arrays** | **14, 15, 18** — line 12 has no Cornavin stop anywhere in its own transcribed array; line 17 likewise has no Cornavin stop in its own transcribed array |

Three different claims, three different line sets, all in the same source document. This pack uses
the third figure (14, 15, 18) in `published-network.json` because it is the only one directly
computed from the actual per-line stop arrays this pack is built from — but this is flagged, not
silently resolved, and the other two claims are preserved here for Tim/Jim to check against the
primary TPG map before D2. **Do not treat "14, 15, 18" as independently re-verified against the
official map either** — it is only internally consistent with this report's own arrays.

Two larger interchange points exist by the same direct-recount method and were **not** chosen as
the hub, per task instruction locking Cornavin instead:

| station | lines (recomputed from transcribed arrays) | note |
| --- | --- | --- |
| Genève, Plainpalais | 12, 15, 17, 18 (4 lines; inline annotations claim a 5th, line 14, which is not in line 14's own transcribed array) | Larger interchange than Cornavin by line count. Not locked — task instruction names Cornavin. |
| Genève, Bel-Air | 12, 14, 17, 18 (4 lines; inline annotations claim a 5th, line 15, which is not in line 15's own transcribed array) | Same shape as Plainpalais. Not locked. |
| Genève, gare Cornavin (**locked hub**) | 14, 15, 18 by direct recount (see arithmetic hazard above) | Downtown central arrival hub; primary tram + Léman Express + SBB interchange point. doNotGroup vs Léman Express/SBB (H1). |

No fork/branch topology beyond simple interchange stops is named anywhere in the oracle report —
all five lines are reported and transcribed as single linear routes, terminus to terminus.

## H5 — nested short turns

Not sourced either way. The oracle report's station roster describes fixed 25/30/23/26/31-stop
rosters per line with no mention of peak-only short-workings, but never explicitly rules them out.
`shortTurns` is left as `[]` on every line in `published-network.json` — treat this as **not
checked**, not as "verified none," per the same caution flagged in the Zürich and Lausanne packs.

## H6 — inner city (where §3 lives)

Locked hub: **Cornavin (tram)**. Per the direct recount in H4, lines 14, 15, and 18 call there (not
12 or 17, despite the report's own inline annotations claiming a 4-line set including 17). Cornavin
is a hub *stop string*, never a direction token — same rule as every other city's hub lock in this
pipeline (Bellevue in Zürich, Lausanne-Flon in Lausanne, Arts-Loi/Kunst-Wet in Brussels).

Plainpalais and Bel-Air were **not** locked despite having a larger recomputed line count (4 lines
each vs Cornavin's 3) — the task instruction names Cornavin explicitly as the hub, and Cornavin is
also the site of the primary Léman Express/SBB doNotGroup pair, which is likely the actual reason
for the choice (a rider-facing "the big cross-mode station downtown" intuition) even though it is
not literally the largest all-tram interchange by this pass's recount. Flagged for Tim: if the
official TPG map later shows Cornavin serving more lines than 14/15/18 (e.g. if line 17 genuinely
does call there and the inline annotation is right, not the array), this hub-lock rationale should
be revisited, not silently kept.

## H7 — DST

**Europe/Zurich HAS DST** (UTC+1 standard / UTC+2 summer, last Sunday March–last Sunday October) —
Geneva shares Switzerland's national timezone with Zürich and Lausanne. Do not copy Perth/Brisbane
no-DST assumptions into this city. Note: line 17's French terminus (Annemasse) is in France, which
also observes EU-wide DST on the same schedule as Switzerland in 2026 — no split-timezone hazard
identified, but not independently verified against a French-authority source in this pass.

## Cross-border hazard — line 17 (France)

**Line 17's final four stops are in France:** Gaillard, Libération; Gaillard, Millet; Ambilly,
Croix-d'Ambilly; Annemasse, Parc Montessuit. Per the oracle report's skip-risk section, GTFS
coverage quality for this French portion is not confirmed — the Switzerland national feed
(opentransportdata.swiss) may or may not carry authoritative real-time data for stops physically in
France, and French station names/SNCF-CFF interoperability were not independently checked. This
pack transcribes these four stops into line 17's `stations[]` array (per the oracle report's own
transcription, cross-checked against Annemasse Agglo documentation) but flags GTFS-RT data quality
for this segment as unresolved — Jim should verify live trip-update coverage for the French portion
before shipping a line 17 adapter that assumes parity with the Swiss portion.

**Moillesulaz boundary — line 12 vs line 17, a shape difference, not just a shared name:** both
line 12 and line 17 call at **Thônex, Moillesulaz**, at the Switzerland–France boundary. Line 12
**terminates** there (does not cross into France). Line 17 **continues past it** into Gaillard,
Ambilly, and Annemasse. Do not model Moillesulaz as a symmetric interchange between two lines that
both go somewhere similar past it — one line stops, the other keeps going into a different country.
This asymmetry is a hazard for the direction model (see direction-model-memo.md) and for any future
line-map generation: "Moillesulaz" cannot be treated as a generic hub with a fixed line role, since
its role differs by line.

## Licence — flagged for Tim, not resolved here

opentransportdata.swiss Terms of Use has **no named licence** (not CC BY, not CC0, not ODbL) —
"Open Data" platform language only. Terms require attribution ("cite opentransportdata.swiss as the
source") and regular republishing of updated data, but do **not** explicitly address third-party
redistribution to end users of a commercial app. Oracle report's own confidence rating: `unclear`
(same wording as the Zürich and Lausanne packs — all three cities share this national feed). **This
pack does not resolve that ambiguity — it is Tim's call, recorded here as a hazard, not guessed
at.** Do not build/ship a Geneva adapter against this feed until Tim signs off on the redistribution
question. Note also: the GTFS Profile Switzerland document itself is CC BY 4.0, but that is a
separate artifact from the platform's own Terms of Use governing the live/static data itself — do
not conflate the two when resolving this.

## Feed auth — flagged for Tim, not resolved here

GTFS-RT (`https://api.opentransportdata.swiss/la/gtfs-rt`) requires a **Bearer API key**, 401
without one, registered via https://api-manager.opentransportdata.swiss/. Key is **personal and
non-transferable** per SBB terms. Rate limit **2 queries per minute** (sliding window) — the same
tight limit flagged in the Zürich and Lausanne packs, since all three cities share the national
opentransportdata.swiss feed; this is a real product-shape constraint (caching strategy, single
shared poller vs per-tester load, and now a *third* city competing for the same rate-limited key
pool if all three are eventually wired) that Jim/Tim need to plan around, not something this pack
resolves. **Never paste a key.** This pack contains no key and made no live calls.

## What I did not do

No live web fetch of the TPG official map, Wikipedia, Transit app, or opentransportdata.swiss
(station roster was already hand-transcribed into the oracle report by Nico; this pack reshapes
that transcription and independently recomputes line-intersection counts directly from the
transcribed arrays, it does not re-verify the transcription itself against a live source). No
GTFS-derived station arrays (oracle report explicitly says not to generate `published-network.json`
from GTFS). No stopIds. No future line 6 / Ferney-Voltaire station rows. No Léman Express/bus/
trolleybus/boat route integration beyond the board-eligibility carry-over and the doNotGroup notes
above. No live city flip, no product edit, no `lib/providers/` or `registry.js` edit (Jim's job).
No resolution of the licence-confidence, Bearer-key/rate-limit, unique-stop-count arithmetic
discrepancy, Cornavin line-set discrepancy, or cross-border GTFS-quality hazards above — all
recorded for Tim/Jim, not decided here.
