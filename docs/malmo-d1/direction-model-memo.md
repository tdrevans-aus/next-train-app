# Malmö direction model memo (§3 for Tim)

Context **(second pass, 29 Aug 2026)**: the first pass of this memo was deliberately abstract —
no per-line termini existed to hang examples on. That gap is closed: the official Skånetrafiken
train map (Dec 2024) plus a GTFS Sweden 3 pattern analysis (cross-checked against the map) now
give all 10 corridors' termini, ordered stops, and the ring's exact path. This memo can therefore
print concrete §3 examples like the Oslo/Rotterdam/Newcastle memos. One first-pass expectation
is **overturned**: there are no line numbers to put in chips at all.

## Recommendation

**Product + terminus ("Pågatågen mot `<far end>`"), with a special-cased Malmöringen.** This is
line + terminus in spirit, matching every sibling city — but where Oslo chips carry a line code
("5 Vestli"), Malmö has **no passenger-facing line codes** (confirmed: none on the official map,
none in site copy, none in the feed — trains are "Pågatåg 1739", services are corridors). The
line token is the product name; the far end disambiguates. Reference numbers (2–11) exist in
reference sources only and must never appear in chips.

**Do not use inbound/outbound vs "City" at Malmö C — now proven, not just predicted.** The
first pass reasoned from the City Tunnel's through-station shape; the data is stronger:

- Line 11 (Malmöpendeln/Malmöringen) **calls Malmö C twice on one through-path** (Kävlinge →
  Furulund → Lomma → Malmö C → Triangeln → Hyllie → Svågertorp → Persborg → Rosengård →
  Östervärn → Malmö C; 142 trips, both ring directions). Inbound/outbound is meaningless at the
  hub, exactly like Oslo's Stortinget on line 5.
- **Destination-only is also broken there**: the feed headsign is **"Malmö central" at every
  call, including trains departing Malmö C outbound around the ring.** A raw headsign chip at
  Malmö C would read "to Malmö C" on a train leaving Malmö C.

**Malmöringen special case — now grounded in the official strings (verified 29 Aug 2026):**
Skånetrafiken's own journey API labels the outbound-through ring direction **"mot Kävlinge"** at
every call (train 1420: Malmö C Spår 11 → ring via Östervärn → Malmö C Spår 3a → Lomma →
Kävlinge), so that direction's chip is simply **"Malmöringen mot Kävlinge"** — official far end,
no invention needed. The opposite direction (Kävlinge → Malmö C → ring → terminates Malmö C) is
officially labeled toward Malmö C ("Malmö central" in GTFS headsigns), which is self-referential
mid-ring — that direction needs a via-disambiguator (open question 2). The locked structure:
line + official far end, never inbound/outbound, never a raw headsign at Malmö C.

## Worked §3 examples

| station | departure | chip (recommended) | why |
| --- | --- | --- | --- |
| Triangeln | line 9 toward Trelleborg | Pågatågen mot Trelleborg | plain far end works everywhere off the ring |
| Triangeln | line 6 toward Simrishamn (turning Ystad) | Pågatågen mot Ystad | short-turn trips show their actual far end; Simrishamn only when through |
| Malmö C | line 11 outbound-through (ring → Kävlinge; e.g. train 1420, Spår 11) | Malmöringen mot Kävlinge | the official `towards` string, verified live — works because the through-run's far end really is Kävlinge |
| Malmö C | line 11 loop-only / terminating variants | Malmöring. v `<first ring side>` (e.g. Malmöring. v Triangeln) | official label is self-referential here — Tim-approved abbreviated ring-side chip (open question 2, decided) |
| Triangeln | line 11 heading away around the loop (Kävlinge → ring → Malmö C direction) | Malmöring. v Östervärn | raw official label ("Malmö central") reads backwards at this stop — the via carries the direction; exact chip string per Tim |
| Persborg | line 11 toward Hyllie | Malmöringen mot Kävlinge | official far end; unambiguous at ring-only stops (each called once) |
| Svågertorp | line 9 vs line 11 vs line 10 | mot Trelleborg / Malmöringen mot Kävlinge / Express mot Hässleholm | three continuations share one stop — line scoping mandatory |
| Hyllie | Öresundståg toward Copenhagen | Öresundståg mot Köpenhamn C | **Revised 30 Aug 2026 (board-eligibility-rule.md):** Öresundståg is `in` — own product-label chip, distinct from "Pågatågen mot …"; doNotGroup still applies (map-confirmed it calls here) — shown as a separate service entry, not merged into the Pågatågen chip |

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Product + terminus, ring special-cased** (recommend) | Pågatågen mot Trelleborg; Malmöringen mot Triangeln | Matches sibling cities' surviving model; survives the confirmed Malmö C double-call; matches Swedish "mot X" signage convention | Ring tokens need a convention decision (next-side vs far-end) |
| B. Terminus only | mot Trelleborg | Shorter chip | Breaks at Svågertorp (3 lines, 3 far ends through one stop) and collapses at Malmö C where the ring's "destination" is itself |
| C. Inbound/outbound vs "City" | To City / From City | Simple | **Disproven** — Malmö C double-call + self-referential headsign make it wrong at the hub, same failure as Stortinget/Beurs |
| D. Raw feed headsign | "Malmö central" | Zero mapping work | Broken at Malmö C (self-referential); also a rename clash (no printed station is called "Malmö central") |

## Open §3 questions for Tim

1. ~~Platform signage wording~~ — **RESOLVED 29 Aug 2026 against Skånetrafiken's own journey API**
   (`gw-tps/api/v2/Journey`, the data behind their planner): the line object carries an official
   `towards` string in exactly the expected shape — ring train 1420 at Malmö C shows
   **"mot Kävlinge"**; buses show **"mot Stenkällan via Rosengård"** ("mot `<far end>`", optional
   "via"). Chips should follow the official far-end convention, not invented ring-side tokens.
2. ~~Ring residual~~ — **DECIDED by Tim, 29 Aug 2026.** The official convention is asymmetric on
   the ring: the outbound-through direction (Malmö C → ring → Kävlinge) reads "mot Kävlinge"
   everywhere — use it as-is. The opposite direction (Kävlinge → Malmö C → ring → *terminates*
   Malmö C) is officially labeled toward Malmö C/"Malmö central", which reads backwards mid-ring;
   Tim's signed-off chip copy for it is the abbreviated ring-side form **"Malmöring. v
   Östervärn"** (mirror **"Malmöring. v Triangeln"** where a loop departure's defining side is
   Triangeln). "Malmöring." abbreviates Malmöringen, "v" abbreviates via; no "mot Malmö C" text
   in the chip.
3. **Short-turn chips**: observed short-turn sets (Ystad, Förslöv, Hässleholm C, …) are from one
   engineering-work-fragmented GTFS week — D5 assertion tables should assert the *published far
   end per trip* from the live feed (`towards` is available per departure), not a fixed
   short-turn list. (Line 3's Helsingborg end was live-verified running hourly 29 Aug 2026 —
   its Gantofta truncation in the analysed week was an artifact.)
4. ~~Per-line termini~~ / ~~line-code convention~~ / ~~Malmöringen route path~~ /
   ~~Triangeln-Hyllie Öresundståg overlap~~ — **all resolved**, see the oracle report's
   Resolutions section. **Revised 30 Aug 2026:** Öresundståg calls Triangeln/Hyllie/Burlöv and is
   now `in` (board-eligibility-rule.md) — those stations' §3 rows carry both Pågatågen and
   Öresundståg chips, kept as distinct entries (doNotGroup still applies — never merged into one
   chip).
5. malmo is its own city picker, separate from Göteborg — unchanged, confirmed.
