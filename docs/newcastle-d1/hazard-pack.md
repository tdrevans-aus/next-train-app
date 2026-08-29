# Newcastle hazard pack (H1–H7)

Evidence: Newcastle Transport NLR map and timetable PDF retrieved 2026-08-27; TfNSW GTFS `lightrail/newcastle` Last-Modified 24 Aug 2026 (feed_version 25082026-010012).

## H1 — parent + child

NLR-only GTFS: 1 parent, 10 children. The parent **Newcastle Interchange** (`229310`) is the heavy-rail + bus + light-rail facility. Light-rail child `Newcastle Interchange Light Rail` (`229315`, platform 1). Other five stops have **no parent** — two platform rows each except Newcastle Beach (one row in this snapshot).

doNotGroup: **Newcastle Interchange** (lock) vs **Newcastle Interchange Light Rail** (child) vs Central Coast & Hunter / NSW TrainLink trains at the same interchange; **Civic Light Rail** vs Canberra Civic (different city); **Queens Wharf Light Rail** vs Stockton **ferry**; **Wickham** suburb vs the stop; **Newcastle East** suburb vs **Newcastle Beach**.

## H3 — thin / event / overlay

- **Frequency product**, not clock-face at every minute. Timetable: “operates as per frequency; all service times are approximate.” Page: 5am–1am, ~7.5 min 7am–7pm weekdays.
- **No event-only extra stops** on the official map.
- **Stadium / special buses** (Newcastle Transport stadium shuttle) are buses, out of v1.
- **Broadmeadow extension** is strategic corridor preservation, not a passenger overlay. Not on the map. Not inserted.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Newcastle Interchange | NLR east to Newcastle Beach vs Hunter / Central Coast trains | Map T+B+L icons. Train is out of v1 |
| Queens Wharf | NLR through-stop vs Stockton ferry | Map F+L icons. Ferry out of v1 |

No city loop. One line. No branch.

## H5 — nested short turns

No official nested codes. One passenger code **NLR**. Full line Newcastle Interchange–Newcastle Beach.

## H6 — inner city (where §3 lives)

Locked set: **Newcastle Interchange**. Civic is the culture precinct stop, **not** the hub lock. Queens Wharf is the ferry transfer. Newcastle Beach is the eastern terminus.

This is a **hub** at the Interchange (trains terminate / start the NLR). Inbound/outbound vs “the beach” is readable on this one line and is still worse than line + terminus once testers sit at Civic (two directions, same line).

## H7 — DST

**Australia/Sydney observes DST (AEDT/AEST).** Newcastle follows Sydney, not Brisbane. Do not copy Gold Coast / Brisbane H7. Agency timezone in NLR GTFS is `Australia/Sydney`.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| newcastle vs sydney | Separate city; shared TfNSW key |
| NLR vs NSW TrainLink / Hunter line | Light rail vs heavy rail at Newcastle Interchange |
| Newcastle Interchange vs Newcastle Interchange Light Rail | Parent vs child |
| Wickham vs Newcastle Interchange | Suburb vs stop |
| Newcastle East vs Newcastle Beach | Suburb vs terminus |
| Civic (Newcastle) vs Civic / Alinga Street (Canberra) | Two cities |
| Queens Wharf LR vs Stockton ferry | Two modes |
| Newcastle Beach vs Newcastle Beach Light Rail | Map vs GTFS |

## What I did not do

No generator, no assertion tables, no live city flip, no merge into Sydney.
