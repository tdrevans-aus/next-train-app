# Dublin hazard pack (H1–H7)

Evidence: `docs/dublin-d1/oracle-clash-report.md` (Nico, 2026-09-06) for agency/feed/mode-cut/hub-lock/board-eligibility decisions, plus the **official Luas Network Map** image fetched directly from luas.ie for this pack (Luke, 2026-09-06) for station order and city-centre topology, since the oracle report explicitly deferred the hand-transcription to the D1 pack step. Source chain: `https://www.luas.ie/luas-map/` (page linking to the asset) → Gatsby `page-data.json` for that route → image asset `https://www.datocms-assets.com/225949/1784119177-luas_networkmap.png` (800×748 PNG, "Network Map" content block, DatoCMS asset id 225949/1784119177), retrieved 2026-09-06. Not generated from GTFS, not generated from `routes.txt`, no stopIds used.

## H1 — parent + child

D1 has no stopIds. NTA static GTFS and GTFS-RT v2 will later expose Luas-operator stop/trip ids that could collapse Red and Green city-centre stops under nearby printed names — the city-centre cluster below is the doNotGroup set that matters most.

**doNotGroup: Abbey Street** (Red Line, hub lock) **vs Marlborough / O'Connell - GPO / O'Connell Upper** (Green Line). All four are distinct printed stop names in the same city-centre block, ~200 m walk apart, same operator/fare system, no platform-to-platform junction. Confirmed directly off the official map: Abbey Street's dot sits on the Red trunk (between Jervis and Busáras); Marlborough, O'Connell - GPO and O'Connell Upper all sit on the Green Line's city-centre loop track, not the Red trunk. **Do not merge any of these four into one stop.**

**doNotGroup: O'Connell Upper vs O'Connell - GPO.** Two separate printed Green Line stops in the same name family (both near O'Connell Street), each with its own dot on the map. The oracle report only named "O'Connell - GPO" as the interchange point — it did not mention O'Connell Upper. This pack found O'Connell Upper as a second, distinct stop while hand-transcribing the map; see "What the oracle report didn't have" below.

**doNotGroup: Tallaght vs Saggart.** Both are Red Line western termini forking at **Belgard**. Two different printed terminus names on the same branch point — not "Red Line West" as a single destination.

**doNotGroup: Red Cow vs Kingswood vs Belgard.** Three consecutive, distinct printed stops immediately west of the Red Line fork. Do not collapse into a single "Red Cow interchange" node — Red Cow is a P&R amenity tag on the stop name, not the fork itself (the fork is at Belgard).

## H2 — who has line codes today

| surface | Red / Green? | what it actually has |
| --- | --- | --- |
| Luas official network map (D1, this pack) | **yes** | Red (32 unique stops incl. Tallaght + Saggart branches) and Green (35 unique stops incl. the city-centre loop) drawn as two coloured tracks, no route numbers — Luas brands by colour only, not by number like a metro. |
| NTA static GTFS (all Irish operators) | **yes** (with filter) | Covers Luas as one agency among many; adapter must filter to Luas routes only. Not opened for D1 station order — the report and this pack both hold that line. |
| NTA GTFS-RT v2 | **yes** (with filter) | TripUpdates + Vehicles, verified 200 with `x-api-key`; covers Luas among other operators. Not a D1 generator. |
| Product `lib/cities/dublin/` | **absent** | No dublin stations.json / line-map.json yet. `assertCityLive("dublin")` must still fail. |

**H2 conclusion:** unchanged from the oracle report — the clash is multi-operator feed filtering (exclude Dublin Bus, Bus Éireann, Go-Ahead, DART from the NTA feeds) plus no product file yet. This pack adds: Luas has **no printed route number**, only two colour brands (Red, Green), and Red has **two branches sharing one colour**, which the D2 adapter must not collapse into a single terminus pair.

## H3 — thin / event / overlay

- **DART, Dublin Bus, Bus Éireann, Go-Ahead Ireland** — out of v1 mode cut per the oracle report. Not touched by this pack.
- **P&R / bus / bike / accessibility icons printed next to stop names** (e.g. "P&R Red Cow", "P&R Cheeverstown", "Tallaght P&R") are amenity tags, not part of the stop name. This pack strips them: the stop is **Red Cow**, **Cheeverstown**, **Tallaght** — not "P&R Red Cow" etc.
- **Zone labels** ("Zone Red 4", "Zone Green 2" …) are fare-zone overlay text on the same map plate, not stops. Not inserted.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Belgard | Saggart branch (Fettercairn – Cheeverstown – Citywest Campus – Fortunestown – Saggart) vs Tallaght branch (Cookstown – Hospital – Tallaght) | Official map: two separate track legs fork at Belgard, each with its own terminus box (Saggart / Tallaght P&R) |
| Abbey Street | Red Line trunk only (Jervis ↔ Busáras). No Green track through this dot. | Dot sits on the single Red horizontal trunk; Green loop passes nearby but does not touch this dot |
| Parnell / Trinity | Green Line city-centre loop — see H4a below, this is not a simple branch, it's a direction-dependent one-way pair | Official map: two parallel green tracks with opposite-direction arrows between Parnell and Trinity |
| Connolly | On the Red trunk between Busáras and George's Dock, drawn with a dogleg (curves up to a named terminus-style dot, then the trunk continues straight to George's Dock) | Map geometry mirrors the real street alignment (Amiens Street curve); treated as an inline stop, not a spur — **flagged for Tim to confirm**, see "Open questions" below |

### H4a — Green Line city-centre loop (one-way, direction-dependent stop set)

This is the single most important station-graph finding in this pack, and not previously called out in the oracle report.

Between **Parnell** and **Trinity**, the Green Line's official map draws **two parallel tracks with opposite-direction arrows**, not one shared track:

- **Northbound (towards Broombridge), arrows point up:** Trinity → **O'Connell - GPO** → **O'Connell Upper** → Parnell.
- **Southbound (towards Brides Glen / Sandyford), arrows point down:** Parnell → **Marlborough** → Trinity.

**O'Connell - GPO and O'Connell Upper are only served northbound. Marlborough is only served southbound.** A rider standing at O'Connell - GPO cannot board a southbound tram there — the southbound service runs via Marlborough instead, a different street. This is a real, printed feature of the official map (not this pack's inference), confirmed by dot position: both O'Connell stops sit on the same (northbound-arrowed) green track; Marlborough sits on the other (southbound-arrowed) track.

**Consequence for D1 station arrays:** the Green Line has **35 unique printed names**, but **no single ordered list is a valid path in both directions** through this bracket — 33 names are direction-independent, plus 2 northbound-only + 1 southbound-only = 35. `published-network.json` documents this explicitly via a `cityCentreLoop` object rather than silently picking one direction and dropping the other's stops. **D5 direction assertions must not treat this as a simple inbound/outbound pair** — see `direction-model-memo.md`.

## H5 — nested short turns

No official short-turn / nested codes found on the map (no "Sandyford short working" chip, no premetro-style overlay). Luas does run peak-time short workings in practice (e.g. some Green trips turn at Sandyford or Dundrum) but **none of these are printed on the official network map**, so `shortTurns` stays empty for D1. Flag for Jim/D2: NTA GTFS-RT trip headsigns may reveal short-turn patterns that this pack did not chase (out of scope for a map-only D1).

## H6 — inner city (where §3 lives)

Locked set: **Abbey Street** (per oracle report). Shared/nearby approaches on the Green side: **O'Connell Upper, O'Connell - GPO, Marlborough** (city-centre loop, ~200 m walk from Abbey Street). **Connolly** is two stops east on the Red trunk (Busáras between them) — not a walk-to interchange candidate for the hub, it's just another Red stop with DART/rail badges.

Abbey Street is a through-stop on a single Red trunk (Jervis ↔ Busáras), not a junction — inbound/outbound vs "City" is not false here the way it was at Brussels' Arts-Loi, but the Green interchange is a **walk**, not a shared platform, so Abbey Street must never be printed as if Green trains call there.

## H7 — timezone / DST

**Flag — the oracle report's DST claim looks wrong and should not be trusted as-is.** The report states: "Timezone Europe/Dublin (IST = UTC+0 / UTC+1 DST; Irish Standard Time, no daylight saving observed since 2024)". This is internally contradictory (it states a UTC+1 DST offset exists, then claims no DST is observed) and does not match this pack's understanding: Ireland's 2019 proposal to abolish the EU clock change was never enacted (it stalled at EU level), so Ireland has continued to move clocks between GMT (winter) and IST (summer, UTC+1) on the normal EU schedule through the date of this pack. Legally, Irish "Standard Time" is defined as the *summer* UTC+1 state (a naming quirk from that stalled reform), but the actual clock-change behaviour is unchanged from previous years.

**Recommendation:** do not hand-roll a fixed-offset or "no DST" rule for Dublin. Use the IANA tzdatabase identifier **`Europe/Dublin`** directly wherever the runtime does date/time math — tzdata already encodes whatever the real, current transition rule is, so this sidesteps the disputed naming question entirely. **Do not copy the report's "no DST" line into product code.** Flagged for Tim/Jim to confirm before D2 if a hand-rolled offset table is ever considered.

## Bilingual / print notes

Luas stop names are English-only on the official map (no Irish-language dual print on this asset, unlike Brussels' FR/NL). The `/ga/` Irish-language site path exists (`luas.ie/ga/luas-a-usaid`) but the network map graphic itself carries no Irish text. No bilingual-pair lock needed for D1.

## What the oracle report didn't have (gap this pack filled)

The oracle report deferred station-array transcription to this pack ("D1 pack will hand-transcribe station order from official Luas Red & Green line maps") and only listed "major central stations" plus termini — one of which (**"Terminates Malahide or Howth (north)"** for the Red Line) is **factually wrong**: Malahide and Howth are DART (Iarnród Éireann) termini, not Luas Red Line termini. The Red Line's actual termini, confirmed on the official map, are **The Point** (northeast) and **Tallaght / Saggart** (southwest, two branches). **This pack does not carry the Malahide/Howth claim forward** — flagged here so it isn't silently repeated in a future pack or by Jim. Whoever drafted that line in the oracle report likely cross-contaminated Luas Red Line with DART; worth a correction note back to Nico if DART is picked up in a v2 country/region pass.

The report also never mentioned **O'Connell Upper** as a stop name (only "O'Connell - GPO"), and never flagged the Parnell↔Trinity one-way loop. Both are now documented above (H4a) directly from the official map.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| dublin vs dub / ie / merged Irish multi-city feed | Do not invent a second city id (per report C2/C3 item 1) |
| Abbey Street vs Marlborough / O'Connell - GPO / O'Connell Upper | Hub lock (Red) vs Green city-centre loop, ~200 m walk, no shared platform |
| O'Connell - GPO vs O'Connell Upper | Two distinct Green stops, same name family, direction-exclusive (northbound only) |
| Tallaght vs Saggart | Two distinct Red termini forking at Belgard |
| Red Cow vs Kingswood vs Belgard | Three consecutive distinct stops; Belgard (not Red Cow) is the fork |
| Connolly vs Abbey Street / Busáras | Connolly has DART interchange, no Green access — not the hub |
| Marlborough (southbound-only) vs O'Connell - GPO / O'Connell Upper (northbound-only) | Direction-exclusive stops must never be merged into one "city-centre" chip |
| Arts-Loi / Kunst-Wet / Simonis / Elisabeth / T-Centralen / Waitematā Station / Chicago Loop | Other-city hub strings. Do not copy. |

## What I did not do

No generator, no GTFS station-array build, no stopIds, no live city flip, no product edit, no DART deep-dive (v2, out of scope), no bus analysis (out of mode), no adapter code, no API key used or pasted (this pack made no GTFS-RT calls — the static network-map PNG fetch used no key and is a public CC BY 4.0 asset per the oracle report's license findings).

## Correction, 27 Sep 2026 (Jim, docs/jim-brief-dublin-connolly-realtime-gap.md) — H4's Connolly flag resolved

H4's "flagged for Tim to confirm" note on Connolly (dogleg, treated as inline stop) is superseded by a
live-feed finding: **Connolly has no real-time coverage in the NTA GTFS-RT v2 feed at all**, resolved
as a genuine feed gap, not an alias/ID problem.

Investigated live against the real NTA feed during Dublin Sunday daytime service (Luas running,
~08:45-08:57 Europe/Dublin, 27 Sep 2026, multiple polls a few minutes apart, `NTA_API_KEY` from
`.env.local`):

- Both of Connolly's static stop_ids (`8220GA00423`/`8220GA00424`, confirmed from the published
  snapshot's `stops.txt`) never once appeared in a `stopTimeUpdate` anywhere in the live feed — not
  in a whole-feed scan (0 of ~9,000+ stopTimeUpdates across ~1,300-1,400 entities, checked twice a few
  minutes apart), and not for any of five sample trip_ids scheduled to call there.
- Ruled out an alias/ID mismatch directly: took a Red trip actually confirmed live in the feed
  (trip `5858_2528`) whose static stop sequence runs `… George's Dock (8220GA00427) → Connolly
  (8220GA00423) → Busáras (8220GA00420) …`. Its live `stopTimeUpdate` array goes straight from
  George's Dock to Busáras — Connolly's slot is simply absent, while both neighbours resolve
  correctly under their own stop_ids. Connolly is not reported under a different id.
- Ruled out "RT omits first/last stop of a trip": Connolly is a common-trunk stop, never a Red
  terminus (termini are Saggart/Tallaght/The Point, published-network.json) — this isn't a
  terminal-omission artifact.
- Ruled out ordinary single-poll noise: every *other* static stop that showed 0 RT coverage in a
  given poll was one direction of a same-name stop_id pair (the other direction/id for that same
  stop had live coverage in the same poll — normal timing asymmetry between inbound/outbound
  platforms). Connolly is the only stop where **both** ids were absent, every time.

Per docs/board-eligibility-rule.md ("filter stations into the app, never trains off a board silently"),
Connolly is removed from `lib/cities/dublin/stations.json` (67 → 66 catalog stations) for v1, with a
`notCovered` entry and rider copy in `lib/cities/dublin/coverage.json`. This does not change the
published-network.json historical record above (still 67 Luas stops network-wide) — the catalog is
what the product serves; Connolly remains a real, physically-served Luas stop that the NTA feed just
never confirms in real time.

## Correction, 27 Sep 2026 (Jim, docs/jim-brief-dublin-saggart-rialto-gaps.md) — Saggart filtered (out-feed, permanent); Rialto confirmed intermittent, kept in

Following the same shape as Connolly above, Mark's QA of PR #481 found **Saggart** (the Red Line's
south-western branch terminus, via Fettercairn/Cheeverstown/Citywest Campus/Fortunestown) empty on
20/20 polls over 15 minutes, 45s apart, while Fortunestown and Citywest Campus — the same branch,
same headway — carried 2-6 trips every poll. Corroborated independently this session with a further
foreground 6-poll/45s check against the same two controls (Sunday ~13:04-13:09 Europe/Dublin, Luas
running): Saggart empty 6/6 (`emptyReason: "no-live-predictions"` every poll), Fortunestown and
Citywest Campus non-empty every poll (3-5 trips each). Same Connolly shape: a real, permanent gap in
NTA's TripUpdates coverage for this stop, not a transient under-report.

Alias check (per the brief, before filtering): fetched one live TripUpdates snapshot (2,148
entities), classified 29 trips as Red via the static `trips.txt` → `routes.txt` join, and collected
every stop_id named in those trips' `stopTimeUpdate` arrays — 53 distinct stop_ids, all 53 present in
the trimmed static snapshot's `stops.txt`. **No RT-only Red stop_id found outside the static
snapshot** — this rules out a mapping/alias problem; Saggart's own static stop_ids
(`8230GA00418`/`8230GA00419`) are simply never named in any live `stopTimeUpdate`, the same shape as
Connolly, not a resolvable id mismatch.

Per docs/board-eligibility-rule.md, Saggart is removed from `lib/cities/dublin/stations.json` (66 →
65 catalog stations for v1; Red 31 → 30), with a `notCovered` entry and rider copy in
`lib/cities/dublin/coverage.json`. Because Saggart is a Red Line **terminus name**, not just a
catalog stop, `lib/cities/dublin/marketing-directions.js`'s `LINE_TERMINI.red` list still carries the
literal string `"Saggart"` — `resolveTerminus`/`mapLineTerminusDestination` classify a live trip
destined for Saggart independently of catalog membership (a substring match against `LINE_TERMINI`
when the catalog alias lookup misses), so the **"Red + Saggart" direction chip keeps appearing at
every upstream Red stop** naming where the tram is going, exactly as before — only Saggart's own
board (a place a rider could try to open) is filtered, per the brief's framing ("it names where the
tram goes, not a board you can open").

**Rialto**, flagged as empty on every poll of the automated 3-poll sweep (same shape as Saggart on
that narrower sweep), was NOT deep-dived by Mark and needed independent confirmation before any
filtering decision. A dedicated foreground 10-poll/60s loop (well past the 20s TripUpdates cache TTL)
against controls Fatima and Suir Road, Sunday ~12:54-13:04 UTC (~13:54-14:04 Europe/Dublin), found
Rialto non-empty on **10/10 polls** (5-7 trips each), same as both controls (Fatima 10/10, 3-4 trips;
Suir Road 9/10, one honest-empty-state poll). Rialto's empty appearance in the original 3-poll
automated sweep was a transient feed-gap sighting, the same shape as Red Cow/Kylemore's known
intermittent under-reporting (jim-handoff.md, 27 Sep 2026 entry) — not the permanent Connolly/Saggart
shape. **Rialto is left in the catalog**, covered by the honest empty state (PR #481) for the rare
poll where the feed briefly has nothing to say for it.

## H8 — NTA per-stop real-time dropout: three observed shapes (added 27 Sep 2026, docs/jim-brief-dublin-sweep-evidence-memory.md)

Across the Connolly/Saggart/Red Cow/Rialto/Marlborough/Broombridge investigations above, the NTA
GTFS-RT v2 TripUpdates feed's per-stop dropout behaviour resolves into exactly three shapes, and
telling them apart needs evidence across time, not a single poll:

1. **Permanent (never observed non-empty).** Connolly and Saggart: whole-feed scans and
   dedicated multi-poll checks, spanning both morning and afternoon sessions the same day, never
   once found a `stopTimeUpdate` naming either stop's static stop_ids. Filtered out of the catalog
   (`lib/cities/dublin/stations.json` + `coverage.json` `notCovered`), terminus chip kept where
   applicable (Saggart).
2. **Transient (single-poll or few-minutes gap).** Red Cow/Kylemore (~5-10 min at a time,
   resolving within the same session), Rialto (one narrow 3-poll sweep flagged it; a longer
   10-poll/60s check found it non-empty throughout). Covered by the honest empty state (PR #481);
   no catalog action.
3. **Long intermittent (10+ minutes, up to the ~20-minute shape seen at Marlborough, but observed
   working at another point the same day).** Broombridge: empty 24/24 polls over ~11 minutes in
   Mark's QA-6 run, but non-empty ~30 minutes earlier the same day. Marlborough: empty for a full
   20-minute sweep window, recovered on a 5-poll follow-up minutes later. A single sweep run's own
   1.5x-headway threshold cannot tell shape 3 apart from shape 1 — both look identical from inside
   one run. `qa/dublin-all-stations-live-sweep.mjs` now resolves this with an append-only evidence
   log (`docs/dublin-d1/live-sweep-log.jsonl`): a station is only classified permanent (shape 1) if
   it has never been observed non-empty in any run logged within the last 7 days; otherwise a
   >= 1.5x-headway empty run is classified `intermittent-long` (shape 3, passes, honest-empty-state
   signal still required) rather than failed. No catalog action for shape 3 — Broombridge keeps its
   own board and its `Green + Broombridge` terminus chip.

## H9 — Belgard: a fourth shape, direction-specific intermittent dropout at a shared-trunk fork station (added 28 Sep 2026, docs/jim-brief-dublin-belgard-saggart-direction-gap.md)

Mark's QA pass 8 (docs/dublin-d1/mark-qa-note.md) found Belgard — the Red Line's Tallaght/Saggart
fork — showing only `Red + Tallaght` and `Red + The Point` over 15+ live polls spanning ~12 minutes
(06:21-06:33 Dublin), with `Red + Saggart` never appearing, while Fortunestown and Citywest Campus
(downstream, Saggart-branch-only stations) carried live Saggart-bound trams throughout. Unlike H8's
three shapes (which are all *whole-station* dropouts), this is a **single direction dropping out at
a station whose other directions keep working fine** — a rider at Belgard would see a healthy,
non-empty board that simply never mentions one of its two genuinely-running branches, with no
`emptyReason` to explain the gap.

**Hypothesis tested first, per the brief: a missing platform stop_id.** Belgard has exactly two
stop_ids in the published NTA Luas static snapshot (`8230GA00347`/`8230GA00348`, both named plainly
"Belgard", no `parent_station`) — confirmed directly against the raw `GTFS_LUAS.zip` source
(stops.txt) and against the published blob snapshot via `qa/verify-dublin-gtfs-snapshot.mjs`'s new
station-id completeness audit (added this pass): every one of the catalog's 65 stations, Belgard
included, has all of its exact-name-matched live-snapshot stop_ids resolved correctly by
`resolveStopIds()`/`findRailStopIdsForName()`. **No third platform id exists, and the catalog's
dynamic (not hardcoded) id resolution is already complete.** stop_times.txt independently confirms
478 Saggart-headsign trips are scheduled to call at Belgard's two ids, on par with Tallaght (479)
and The Point (499) — the static schedule expects Saggart trains at Belgard as often as the other
two directions. This rules out the missing-id hypothesis entirely; it is not a catalog/adapter
defect.

**Live re-check (28 Sep 2026, ~05:44-05:58 Dublin, Monday morning service, foreground
`fetchStationBoard('Belgard', {horizonMinutes: 90})` polls plus a direct GTFS-RT TripUpdates
snapshot parse):** the first poll of the session (05:44, one raw TripUpdates fetch) found 13
stop_time_updates at Belgard's two ids, of which 2 were genuinely Saggart-headsigned trips
(`5858_2409` delay +404s, `5858_2458` delay +284s) — i.e. Saggart-bound confirmation was *already
present* at that point, contradicting a permanent/still-ongoing gap. A follow-up `fetchStationBoard`
poll sequence, 8 polls at 60s spacing from 05:50 to 05:58, found `Red + Saggart` present (1-3
confirmed trips) in 7 of 8 polls, stabilising to a consistent 2-3 confirmed Saggart trips per poll
from the second poll onward, with Tallaght/The Point unaffected throughout. This is the same shape
as H8's shape 2/3 (Red Cow/Kylemore/Rialto/Broombridge/Marlborough) — a window where the feed
under-reports, followed by recovery within the same session — but scoped to one direction at a
shared-trunk station rather than the whole station. Given Mark's original window (06:21-06:33) and
this session's window (05:44-05:58) don't overlap, and both are single-session snapshots, this is
recorded as a new intermittent shape rather than either fully confirmed-permanent or
fully-confirmed-resolved; a station that has been directly observed carrying `Red + Saggart` with
real (non-placeholder) delays this session is not filtered or downgraded.

**Verdict: direction-level intermittent NTA feed gap (new H8-adjacent shape), not a code or
catalog defect.** No catalog change. Belgard stays in the catalog with all three of its directions
(`Red + Tallaght`, `Red + Saggart`, `Red + The Point`); no coverage-note exclusion, since the
direction was directly observed live and working this session, and no per-direction empty state is
warranted for a shape that resolves within the same session (same posture as Red Cow/Kylemore under
H8 shape 2). Flag for the next Mark pass: if `Red + Saggart` at Belgard is ever found absent again
across a comparably long multi-poll window, cross-check against `docs/dublin-d1/live-sweep-log.jsonl`
and this entry's timestamps before re-opening a Jim brief — the pattern so far (present at session
start, present throughout a later 8-poll run) does not yet support a permanent, Connolly/Saggart-
shaped exclusion.
