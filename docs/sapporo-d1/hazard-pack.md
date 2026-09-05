# Sapporo hazard pack (H1–H7)

Evidence: `docs/sapporo-d1/oracle-clash-report.md` (Nico, 2026-09-06) — official city rider site
https://www.city.sapporo.jp/st/subway/ , corporate https://www.city.sapporo.jp/st/ , Hokkaido Open
Data Platform (HODA) GTFS zip (confirmed 200 empty-key 2026-09-06, dated 2020-03-24), plus the
oracle report's "Station roster (D1 transcription)" section (added 2026-09-06) giving all 49
stations with official codes (N01-N16, T01-T19, H01-H14), sourced from Wikipedia. `stations` and
`stationCodes` arrays in `published-network.json` are now **populated for all 49 stations across
all three lines**. **The roster's source is Wikipedia, not the official city site** — it must be
cross-checked against https://www.city.sapporo.jp/st/subway/ and the 2020 GTFS stops.txt before
any product edit treats it as final; this cross-check is the remaining gap, carried in
`coverageGaps` and `jim-handoff.md`.

Product `lib/cities/sapporo/` does not exist. `assertCityLive("sapporo")` is Unknown city (planned).

## H1 — parent + child / doNotGroup

D1 has no stopIds (2020 GTFS is out of scope for names; see H2). The hazard is **name-family**
across two operators sharing the same underground precinct, not feed hierarchy:

- **Ōdōri** (大通駅) — the locked hub. All three in-scope lines (Namboku N, Tōzai T, Tōhō H)
  officially interchange here. This is the only three-line node.
- **Sapporo** (札幌駅) — Namboku (N06) and Tōhō (H07) only, **no Tōzai**. Connected to **JR Sapporo
  Station** by an underground passage for rider convenience, but JR Sapporo is a separate JR
  Hokkaido station (Hakodate Main Line) and is **not** a Sapporo Municipal Subway station.
  doNotGroup Sapporo (Metro) vs JR Sapporo.
- **Susukino** (すすきの駅, Namboku N08) — Namboku and Tōhō only, **no Tōzai**. The full roster shows
  the Tōhō-side station of this same interchange precinct is officially printed as **Hōsui-Susukino**
  (豊水すすきの駅, H09) — a different station name, not a duplicate of Susukino. Treat the two as
  distinct doNotGroup entries pending an official source (Bureau site / GTFS stops.txt) confirming
  whether they should ever collapse to one combined interchange chip. No JR co-location reported for
  either; still doNotGroup against any other city's same-named entertainment-district stop if one is
  ever added.
- **Shin-Sapporo** (新札幌駅) — the eastern Tōzai terminus. Also served by JR Hokkaido's Chitose
  Line at a separate JR Shin-Sapporo station. doNotGroup Shin-Sapporo (Metro) vs JR Shin-Sapporo.

No official public GTFS stopId collapse is possible or needed here — this is a station-name
doNotGroup problem, exactly like Osaka's Hommachi/Sakaisuji-Hommachi and Umeda/JR-Osaka pattern,
not a parent/child platform-grouping problem.

## H2 — who has line codes today

Official passenger tokens on the city map and the 2020 HODA GTFS are the single letters **N / T /
H** (Namboku / Tōzai / Tōhō), plus the official English line names. Do not invent numeric route
codes, colours-as-codes, or any code from a source other than the city site / GTFS `route_short_name`
(once the feed is actually parsed — this pack does not parse it, see H3).

## H3 — thin / event / overlay

- **No streetcar (Sapporo City Tram / 札幌市電) in v1.** Separate operator, separate official page.
  Out of scope per the oracle report.
- **No bus (city bus or regional bus) in v1.** Out of mode.
- **No JR Hokkaido commuter/regional rail in v1** (Hakodate Main Line, Chitose Line, Gakuen-Toshi
  Line). JR Sapporo and JR Shin-Sapporo are separate stations reachable by underground passage —
  not Sapporo Municipal Subway platforms. See H1/doNotGroup and Board eligibility (oracle report).
- **No GTFS-RT, no next-train API, no unofficial feed.** The oracle report is explicit that
  @operation_st (X/Twitter) posts operational updates, not a machine-readable feed — do not treat
  it as a product contract.
- **Stale static GTFS (2020-03-24) is a hazard in its own right**, tracked separately in H7-adjacent
  form below and repeated in `coverageGaps` — not modelled as a "thin overlay," but flagged so Jim
  does not treat the HODA zip as current.

## H4 — branches (doNotGroup candidates)

| node | lines present | evidence |
| --- | --- | --- |
| Ōdōri | Namboku (N07) + Tōzai (T09) + Tōhō (H08) | Oracle report: "All three lines intersect at Ōdōri." Hub lock. |
| Sapporo | Namboku (N06) + Tōhō (H07) — no Tōzai | Oracle report station-name table |
| Susukino (N08) / Hōsui-Susukino (H09) | Namboku + Tōhō — no Tōzai; two officially distinct printed names for the same interchange precinct | Oracle report station-name table + station roster |
| Shin-Sapporo | Tōzai eastern terminus only (Metro side) | Oracle report Tōzai terminals row; JR Chitose Line co-location is a separate JR station |

No official "inbound/outbound" or "to City" passenger convention was found in the oracle report —
see direction-model-memo.md for why line + official terminus is recommended instead.

## H5 — nested short turns

No official nested/short-turn codes were reported (unlike Adelaide's GAW/SALIS pattern). Three
passenger line tokens only: **N, T, H**. `shortTurns` is empty on all three lines pending
confirmation from an actual parsed timetable — none was available to this pack (no GTFS parse
performed; see H3/H7).

## H6 — inner city (where §3 lives)

Locked set: **Ōdōri** (three-line hub). Secondary two-line nodes: **Sapporo**, **Susukino**/
**Hōsui-Susukino** (both Namboku × Tōhō, no Tōzai — see H1 for the distinct-name nuance). These are
the only stations shared by more than one in-scope line, per the oracle report's station-name table
and the full 49-station roster now transcribed in `published-network.json` — no other
branch/junction stations appear in the roster. The roster's source (Wikipedia) is still pending
cross-check against the official Bureau site / 2020 GTFS stops.txt (see coverageGaps); do not treat
this as foreclosing that cross-check.

## H7 — DST / stale feed

- **Asia/Tokyo does not observe DST.** Wall-clock is Japan Standard Time year-round. Do not copy a
  DST-observing city's timezone handling onto Sapporo.
- **Static GTFS is dated 2020-03-24 — 6+ years stale as of this pack (2026-09-06).** No official
  GTFS-RT exists. The oracle report calls this "the primary friction" and a clear "stale-data risk"
  short of an outright skip. Jim/Mark must reverify refresh status before any adapter or live-flip
  work — do not assume the HODA zip has been refreshed since 2020, and do not build schedule
  display logic that implicitly assumes GTFS currency this pack cannot verify.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| sapporo vs sms / sapporo-metro / any Hokkaido city id | Oracle report explicitly warns against inventing these city ids or merging into another Hokkaido city |
| Ōdōri vs any other hub string / marketing name | Hub lock; official 大通駅, macron required, not "Odori" |
| Sapporo (Metro) vs JR Sapporo | Separate JR Hokkaido station, underground-passage-connected only |
| Susukino vs any JR Susukino | No official JR Susukino co-location reported, but doNotGroup as a precaution against future name collision |
| Shin-Sapporo (Metro) vs JR Shin-Sapporo | Separate JR Hokkaido station (Chitose Line), underground-passage-connected only |
| Sapporo Municipal Subway vs Sapporo City Tram (streetcar) | Separate operator, separate official page, out of v1 |
| N / T / H vs invented numeric or colour route codes | Official passenger tokens are single letters plus English line names only |

## What I did not do

No cross-check of the Wikipedia-sourced 49-station roster against the official Bureau site or the
2020 GTFS stops.txt — that remains an open gap (see coverageGaps in `published-network.json`). No
GTFS parse of the 2020 HODA zip. No generator. No live city flip. No edit to any other city's pack,
to the Japan/Hokkaido country context, or to `lib/providers/`/`registry.js`. No invented city id,
route code, or station beyond what the oracle report's roster names.
