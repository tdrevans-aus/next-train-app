# Malmö direction model memo (§3 for Tim)

Context **today (29 Aug 2026)**: this memo is **more provisional than the Oslo/Rotterdam/Newcastle
equivalents.** Those cities' oracle reports hand-transcribed a full official map or timetable, so
their memos could print concrete per-line termini pairs and worked §3 examples per node. Malmö's
oracle report does not contain that: it gives a 9-station Malmö-area list and a line-count claim
(11 regular + rush-hour line 12), but no per-line termini, no ordered stop list, and no confirmed
line-code table. **This memo recommends a model in the abstract and flags what's needed before
concrete §3 examples or a D5 assertion table can be written — it does not fabricate example rows
the way the other cities' memos do**, because there is nothing solid yet to hang them on.

## Recommendation

**Line + terminus**, matching every other city in this pipeline (Oslo, Rotterdam, Newcastle,
Perth, Gold Coast, Canberra, Auckland). Swedish commuter-rail signage convention is normally "mot
`<destination>`" (toward `<destination>`) on the physical platform/train, which is itself a
line-plus-far-end pattern, not compass or inbound/outbound — so there is no reason to expect
Malmö to be the exception. This is a reasoned default, not a confirmed one: the oracle report does
not include platform signage or destination-blind wording, so treat "mot `<X>`" as the expected
shape to verify, not a locked fact.

**Do not use inbound/outbound vs "City" at Malmö C.** The report's own hub-lock rationale — City
Tunnel terminus/portal, "all or most" lines converge — is exactly the shape (through-station, not
single-ended terminus) that broke inbound/outbound in every reference city that had it (Oslo's
Stortinget, Rotterdam's Beurs). Nothing in the report suggests Malmö C is different; if anything,
"City Tunnel" strongly implies it's a through corridor, not a bay terminus.

**The ring line is the specific known risk.** The report tags Svågertorp, Persborg, and Östervärn
as "Ring-line stop (Malmöringen / Malmöpendeln)" — but gives no route path. If any single published
Pågatågen line calls at one of these (or another) station twice on its through-path, the way
Oslo's line 5 calls Stortinget twice, then inbound/outbound direction breaks exactly the way it did
in Oslo, and only line + terminus (with the correct far-end token for that specific call) survives.
**This cannot be resolved without the missing route-path data — flagged, not solved, here.**

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend, provisional) | e.g. `<line> + <destination>` | Matches every sibling city in this pipeline; matches expected Swedish "mot X" signage; survives a ring-line double-call the way Oslo's line 5 needed it to | Cannot be populated with real line numbers/termini yet — the report doesn't confirm them |
| B. Terminus only | e.g. `<destination>` | Shorter chip | At Malmö C, multiple lines plausibly share a terminus/via point (unconfirmed but likely given 11 lines through one hub) — line token needed to disambiguate, same lesson as Rotterdam's De Akkers (C vs D) |
| C. Inbound/outbound vs "City" | To City / From City | Simple | Contradicted by the City Tunnel through-station shape; would break at Malmö C the same way it broke at Stortinget/Beurs |

No worked §3 example table is included (unlike Oslo/Rotterdam/Newcastle's memos) — writing one
would require inventing termini and a route path the oracle report does not supply. That's the
gap, not a copy-paste opportunity.

## Open §3 questions for Tim

1. **Per-line termini for all 11 regular lines + rush-hour line 12.** Not in the oracle report.
   Needed before any D5 assertion table. Source options: (a) unblock and read the Skånetrafiken
   linjekarta PDF (Dec 2024, for June 2025) that egress policy currently blocks, or (b) have Jim
   read `routes.txt`/`trips.txt` from the already-confirmed-live Trafiklab GTFS Regional `skane`
   feed directly at implementation time and cross-check against whatever passenger-facing source
   becomes available — not as a D1 substitute, per the report's own caution against generating
   this file from GTFS alone.
2. **Line-code convention.** Report shows "expected format H3, H4, E6, etc." but hedges this as
   unconfirmed ("must be confirmed in GTFS"). Confirm the actual passenger-facing line token before
   picking a chip format — do not assume the H/E-prefix pattern is correct.
3. **Malmöringen route path.** Does any single line call at Svågertorp/Persborg/Östervärn (or
   elsewhere) twice on one through-path, Oslo-line-5-style? This determines whether line + terminus
   needs a same-line-twice branch note the way Oslo's memo needed one at Stortinget/Carl Berners
   plass.
4. **Triangeln / Hyllie Öresundståg overlap.** If Öresundståg also calls these two City Tunnel
   stations, direction chips there need the same doNotGroup treatment as Malmö C — confirm before
   writing station-level §3 rows for either.
5. Whether testers see malmo as its own city picker, separate from Göteborg/Västtrafik (yes — not
   in question, confirmed by the report; listed here only for parity with sibling memos).
