# Uppsala direction model memo (§3 for Tim)

Context: the oracle report gave scope (four named corridors, Mälartåg-only, Uppsala C hub lock)
but no direction/headsign detail — it explicitly deferred station-graph generation to the GTFS
feed. This memo is built from a direct read of `ul.zip`'s `trips.txt`/`stop_times.txt`
(`direction_id`, `stop_headsign`), fetched 2026-08-30.

## Recommendation

**Line + confirmed far end ("Mälartåg mot `<far end>`"), never bare `direction_id`.** Three of
the four corridors (Gävle, Sala, Märsta) are direction_id-clean — `direction_id` lines up with a
single, stable far end in each direction. The fourth (Arlanda C / Märsta, which share one
route_id) is **not** — this is where the memo earns its keep.

## The direction-collapse hazard (Arlanda/Märsta route_id 9011313099300000)

**Do not use `direction_id` to distinguish the Arlanda C branch from the Märsta branch.** Both
share Knivsta as a common stop before splitting, and both are trips on one route_id:

- `direction_id=1` (outbound from Uppsala C) contains **every** Arlanda-branch trip
  (`stop_headsign` "Flemingsberg" or "Stockholm Central") **and every** Märsta-branch trip
  (`stop_headsign` "Stockholm Central") in a single undifferentiated bucket.
- `direction_id=0` (inbound to Uppsala C) is uniformly headsigned "Uppsala C" for both branches —
  this direction is clean (no self-referential-headsign problem the way Malmö C had it), but it
  still doesn't tell you which branch a given inbound train is arriving from.

This is structurally the same class of hazard as Oslo line 5 at Stortinget and Malmö's
Malmöringen at Malmö C, but the mechanism is different: those were single-line ring topology
collapsing inbound/outbound; this is **two geographically distinct branches sharing one route_id
and one `direction_id` field**, disambiguated only by `stop_headsign` or by checking which of
Arlanda C / Märsta station the trip's stop sequence actually calls.

**Recommended resolution**: build the board/chip from `stop_headsign` (or, if GTFS-RT TripUpdates
don't carry `stop_headsign` per stop, from the trip's static stop-id path resolved once at load
time), never from `direction_id`. `direction_id` is safe to use only as a coarse inbound/outbound
filter for Uppsala C itself, not as a branch key.

## A second wrinkle within the Arlanda branch

Of the 41 Arlanda-branch outbound trips, `stop_headsign` splits further: 30 read "Flemingsberg",
11 read "Stockholm Central" — two different real destinations sharing the same in-feed physical
path (Uppsala C → Knivsta → Arlanda C; the feed's own stop rows end at Arlanda C for all of them).
Flemingsberg is south of Stockholm Central on the line toward Södertälje/Katrineholm — consistent
with, but **not confirmation of**, the oracle report's "Stockholm/Örebro-via-Arlanda" naming ("Örebro"
never appears anywhere in this feed). If a chip needs to show the true far end for these 30 trips,
"Flemingsberg" is the only string this feed actually offers — do not upgrade it to "Örebro"
without a second source.

## Worked §3 examples

| station | departure | chip (recommended) | why |
| --- | --- | --- | --- |
| Uppsala C | Gävle line outbound | Mälartåg mot Gävle | plain far end, direction_id-clean |
| Uppsala C | Gävle line outbound, short-turn at Tierp | Mälartåg mot Tierp | observed short-turn headsign — do not print "mot Gävle" on a train that turns at Tierp |
| Uppsala C | Sala line outbound | Mälartåg mot Sala | plain far end, direction_id-clean |
| Uppsala C | Arlanda/Märsta route_id, outbound, stop_headsign "Stockholm Central" | Mälartåg mot Stockholm C | headsign-derived; do not label by branch geography (e.g. "via Arlanda") unless Tim wants a via-suffix — open question below |
| Uppsala C | Arlanda/Märsta route_id, outbound, stop_headsign "Flemingsberg" | Mälartåg mot Flemingsberg | distinct real destination from the "Stockholm Central" trips on the *same* route_id and *same* in-feed stop path — headsign is the only thing that tells them apart |
| Knivsta | Arlanda/Märsta route_id, either branch | Mälartåg mot `<headsign>` | Knivsta is the shared branch stop — line-only scoping is not enough here, headsign is mandatory even mid-route, not just at the hub |
| Arlanda C | Arlanda/Märsta route_id, inbound to Uppsala | Mälartåg mot Uppsala C | direction_id=0 is uniformly "Uppsala C" — clean, no Malmö-style self-reference problem |

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + stop_headsign far end** (recommend) | Mälartåg mot Gävle / mot Stockholm C / mot Flemingsberg | Matches what this feed actually asserts per trip; correctly separates the Arlanda/Märsta route_id's mixed branches | Requires reading `stop_headsign` per departure, not caching a fixed "this route_id → this far end" table |
| B. Line + fixed corridor terminus from the oracle's 4 named corridors | Mälartåg mot Stockholm (via Arlanda) | Matches the human-legible corridor names | **Breaks**: no GTFS evidence for "Örebro"; "via Arlanda"/"via Märsta" would need a hand-authored via-suffix since the feed itself doesn't distinguish them by anything but headsign, which is exactly what option A already reads |
| C. `direction_id` inbound/outbound + line name only | Mälartåg — outbound | Simple | **Disproven** for the Arlanda/Märsta route_id — outbound collapses two branches with three distinct real destinations into one label |
| D. Raw `stop_headsign`, no line prefix | "Stockholm Central" | Zero mapping work | Ambiguous at Knivsta and Uppsala C where multiple lines' headsigns could otherwise look alike; also loses the "Mälartåg" product identity that Uppsala C's UL-bus and SL-pendeln neighbours need for doNotGroup clarity in the UI |

## Open §3 questions for Tim

1. **Via-suffix for the Arlanda/Märsta split**: should Uppsala C departures on route_id
   `9011313099300000` show a via-disambiguator ("Mälartåg mot Stockholm C via Arlanda" vs "...via
   Märsta") even though the feed's own headsign convention doesn't do this (it just gives the
   final destination)? Recommend A as-is (headsign only) unless Tim wants the extra clarity —
   flagging because Knivsta-onward, both branches say things a rider genuinely can't tell apart
   without knowing the route beforehand.
2. **Short-turn chips** (Tierp, Mehedeby, Morgongåva): this pass's short-turn list is from one
   static-feed snapshot with no calendar-day analysis (see hazard-pack.md H3/H5) — D5 assertion
   tables should assert the *actual per-trip stop_headsign*, not a fixed short-turn list, the same
   caution Malmö's memo gives.
3. **Coverage gap**: Västerås, Eskilstuna, Stockholm Central, Flemingsberg, and Örebro have no
   stop-level GTFS data in this feed (see published-network.json `coverageGaps`). If Jim's board
   needs to show a rider "your train continues to Örebro," that string cannot currently be backed
   by this feed — it would need a second regional operator feed or the national bundle. Until
   then, "Flemingsberg"/"Stockholm Central" are the only defensible far-end strings for that
   branch.
4. **No print-map cross-check performed** — unlike Malmö/Göteborg, no official Mälartågskartan
   station-name list was hand-verified against these GTFS names. If station display names need to
   match the printed map exactly, that verification is still open.

## What I did not do

No `lib/providers/` or `registry.js` edit, no live flip, no UI wiring, no D5 assertion tables, no
second Trafiklab feed pulled to close the Västerås/Eskilstuna/Örebro/Stockholm gap, no
print-map station-name verification, no edits to any other city's pack.
