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

**Malmöringen special case:** at Malmö C (and on the ring generally), the chip needs a
line-scoped path token, not a bare destination — recommend **"Malmöringen mot Triangeln"** /
**"Malmöringen mot Östervärn"** (next-ring-side tokens, mirroring how Oslo's line 5 memo used
the ring side), with "mot Kävlinge" for the Lommabanan leg. Which exact token Skånetrafiken's
own displays use on-platform is still unverified (see open questions) — the *structure* (line +
path/far-end, never inbound/outbound, never raw headsign) is what's locked here.

## Worked §3 examples

| station | departure | chip (recommended) | why |
| --- | --- | --- | --- |
| Triangeln | line 9 toward Trelleborg | Pågatågen mot Trelleborg | plain far end works everywhere off the ring |
| Triangeln | line 6 toward Simrishamn (turning Ystad) | Pågatågen mot Ystad | short-turn trips show their actual far end; Simrishamn only when through |
| Malmö C | line 11 clockwise (via Triangeln) | Malmöringen mot Triangeln | headsign says "Malmö central" — useless; ring side token required |
| Malmö C | line 11 counter-clockwise (via Östervärn) | Malmöringen mot Östervärn | same, opposite side |
| Malmö C | line 11 ending its loop (arriving leg → continues to Kävlinge) | Malmöringen mot Kävlinge (via Lomma) | the through-run's true far end |
| Persborg | line 11 toward Hyllie | Malmöringen mot Hyllie / Kävlinge | ring-only stop; either side is unambiguous here since each is called once |
| Svågertorp | line 9 vs line 11 vs line 10 | mot Trelleborg / Malmöringen mot Persborg / Express mot Hässleholm | three continuations share one stop — line scoping mandatory |
| Hyllie | Öresundståg toward Copenhagen | **not shown** | Öresundståg out of v1; doNotGroup (map-confirmed it calls here) |

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Product + terminus, ring special-cased** (recommend) | Pågatågen mot Trelleborg; Malmöringen mot Triangeln | Matches sibling cities' surviving model; survives the confirmed Malmö C double-call; matches Swedish "mot X" signage convention | Ring tokens need a convention decision (next-side vs far-end) |
| B. Terminus only | mot Trelleborg | Shorter chip | Breaks at Svågertorp (3 lines, 3 far ends through one stop) and collapses at Malmö C where the ring's "destination" is itself |
| C. Inbound/outbound vs "City" | To City / From City | Simple | **Disproven** — Malmö C double-call + self-referential headsign make it wrong at the hub, same failure as Stortinget/Beurs |
| D. Raw feed headsign | "Malmö central" | Zero mapping work | Broken at Malmö C (self-referential); also a rename clash (no printed station is called "Malmö central") |

## Open §3 questions for Tim

1. **Platform signage wording.** "Pågatågen mot `<X>`" and the Malmöringen ring-side tokens are
   reasoned defaults consistent with Swedish signage convention and the feed's corridor
   structure, but no platform display/destination-blind source was checked. Verify the actual
   on-platform string for a ring departure at Malmö C before freezing chip copy (site copy and
   feed both dead-end at "Malmö central").
2. **Ring token convention**: next-ring-side ("mot Triangeln"/"mot Östervärn", recommended,
   Oslo-style) vs loop far-end ("mot Kävlinge" both ways once aboard the ring)? Recommend
   next-side; needs Tim's sign-off since it's invented copy, not transcription.
3. **Short-turn chips**: observed short-turn sets (Ystad, Förslöv, Hässleholm C, …) are from one
   engineering-work-fragmented GTFS week — D5 assertion tables should assert the *published far
   end per trip* from the live feed, not a fixed short-turn list.
4. ~~Per-line termini~~ / ~~line-code convention~~ / ~~Malmöringen route path~~ /
   ~~Triangeln-Hyllie Öresundståg overlap~~ — **all resolved**, see the oracle report's
   Resolutions section. Öresundståg calls Triangeln/Hyllie/Burlöv: those stations' §3 rows must
   scope to Pågatågen departures only (doNotGroup confirmed).
5. malmo is its own city picker, separate from Göteborg — unchanged, confirmed.
