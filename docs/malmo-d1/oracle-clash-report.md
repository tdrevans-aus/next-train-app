# Malmö oracle clash report

D1 (published, as of 29 Aug 2026, second pass — the egress block is gone): [Skånetrafiken kartor](https://www.skanetrafiken.se/kartor/) links **Fler resmöjligheter med tåg** ("Tåglinjer i Skåne", **Uppdaterad december 2024**) — [PDF](https://www.skanetrafiken.se/link/de1bc77203da4224945f33548db82a6c.aspx), md5 `41387ef91e51a0009e99cde9c47dbf41`, 1 page, still the train map linked from skanetrafiken.se on 29 Aug 2026. This is the official passenger map the first pass could not reach (it had it second-hand as "linjenät dated 1 Dec 2024 for June 2025" — same document). Station geography and per-station product symbols are **hand-checked from this map**. Per-line ordered stops, termini, and short-turns are from a **pattern analysis of the official Samtrafiken GTFS Sweden 3 feed** (downloaded 29 Aug 2026 with the local `TRAFIKLAB_GTFS_SWEDEN_KEY`; 3,244 Pågatåg trips, 292 distinct stop patterns), cross-checked station-by-station against the map — every station in every line array below prints a Pågatågen symbol on the map. Not generated from Wikipedia (used only as a numbering cross-check, see below).

**Scope note (revised 30 Aug 2026 — Tim's product decision under docs/board-eligibility-rule.md; see "Board eligibility" below):** the tracker's "commuter + light rail" label is still wrong — Malmö has no active light rail (trams closed 1973; seasonal museum tram only). **V1 is Pågatågen, plus Öresundståg and Krösatågen** (both pass the board-eligibility walk-up test — no compulsory reservation, fixed-price, buy-and-board — and both ride on the same skane.zip feed already wired for Pågatågen, filed under GTFS route_desc rather than route_long_name). No bus. Krösatågen-only stations on the map (Killeberg, Osby, Hästveda, Ballingslöv etc.) are still not v1 rows — the station catalog's geographic footprint stays what it was; Krösatågen is shown only where it overlaps the existing Pågatågen station catalog (Hässleholm C). Snälltåget stays excluded (`out-reservation`, compulsory seat booking).

## Resolutions of the first pass's open questions

1. **Line codes: RESOLVED — Pågatågen has no passenger-facing line codes.** The official map draws no line numbers. skanetrafiken.se names services by corridor ("Pågatågen mellan Helsingborg och Åstorp", "Kävlinge – Malmö") and individual trains by train number ("Pågatåg 1739"). GTFS route_short_name is the train number (1202, 11900, …), route_long_name "Pågatåg", route_type 106. The hedged "H3, H4, E6, etc." convention was **wrong** — no such codes exist anywhere.
2. **Line count: CORRECTED — "eleven core lines + rush-hour line 12" is withdrawn.** The network is **10 service corridors**; reference sources number them 2, 3, 4B, 5, 6, 7, 8, 9, 10, 11 (no 1, no 12), with 2+6 and 4B+9 through-run as single seats. Reference numbering (sv.wikipedia Pågatågen "Linjer") is **not passenger-facing** but its per-line station counts match the GTFS longest patterns exactly (10/14/6/14/29/4/12/23/10/11), so it's kept as `referenceLineNumber` in published-network.json for cross-referencing only.
3. **"Line 12": RESOLVED — does not exist.** The rush-hour-flavoured extra is **PågatågenExpress** (Malmö Svågertorp–Hässleholm, a few trips daily through to Älmhult; reduced in summer — official copy: "PågatågenExpress mellan Malmö Svågertorp-Hässleholm kör inte under sommaren. Avgångarna till och från Älmhult går").
4. **Öresundståg at Triangeln/Hyllie: RESOLVED — YES, and also at Burlöv.** The map's legend distinguishes "Station Pågatågen" from "Station Öresunds- och Pågatågen"; Malmö C, Triangeln, Hyllie, **Burlöv**, Lund C all print the combined symbol. doNotGroup Pågatågen vs Öresundståg at all of them — **revised 30 Aug 2026: doNotGroup now means "shown as distinct entries", not "hidden"; see Board eligibility below.**
5. **Malmöringen: RESOLVED — and the Oslo-line-5 hazard is real, at Malmö C itself.** Ring path: **Malmö C – Östervärn – Rosengård – Persborg – Svågertorp – Hyllie – Triangeln – Malmö C**, run in both directions, through-run to/from **Kävlinge via Furulund–Lomma** (Lommabanan). 142 GTFS trips call **Malmö C twice on one through-path** (Kävlinge → … → Malmö C → ring → Malmö C). No intermediate ring station is called twice on any pattern. `stop_headsign` prints **"Malmö central" at every call — including trains departing Malmö C outbound around the ring** — so destination-only direction labeling is broken on this line at the hub lock. See direction-model-memo.md.
6. **Burlöv / Oxie: RESOLVED — both in v1.** Both print Pågatågen symbols on the Dec 2024 map and both are in current GTFS service (Burlöv: lines 3/6/8/9/10; Oxie: line 6).

Same-day live-verification addendum (29 Aug 2026, via skanetrafiken.se's own journey planner + its `gw-tps/api/v2/Journey` API):

7. **Direction wording: RESOLVED.** The official API's line object carries `towards: "mot Kävlinge"` for the ring train at Malmö C (train 1420, full path Malmö C Spår 11 → ring via Östervärn → Malmö C Spår 3a → Lomma → Kävlinge) and e.g. `"mot Stenkällan via Rosengård"` for buses — the convention is "mot `<far end>`" (+ optional "via"). The self-referential "Malmö central" headsign belongs to the opposite, terminating ring direction only.
8. **Line 3's Helsingborg end: RESOLVED — running.** Hourly direct Pågatåg Vallåkra → Helsingborg C observed live (trains 1516/1518/1520/1522, 14 min); the analysed GTFS week's Gantofta truncation was an artifact. Known planned overlay: Åstorp–Helsingborg closed 9 Sep–8 Nov 2026.
9. **GTFS parent/child: RESOLVED.** All nine Malmö-area stations are parented clusters in GTFS Sweden 3 (Malmö C parent `3`, ~60 platform children incl. bus lägen; Triangeln `1587`, Hyllie `1586`, Svågertorp `1546`, Persborg `1486`, Rosengård `1621`, Östervärn `59221`, Burlöv `937`, Oxie `27087`). The site API uses a separate stop-area GID scheme (Malmö C `9021012080000000`, …) — per-feed id mapping is Jim's D2.

## Agency / feed / auth (H2 product path)

| field | value |
| --- | --- |
| Agency | Skånetrafiken (Pågatågen product) |
| D1 line data actually used | Trafiklab **GTFS Sweden 3** `sweden.zip` (works with local `TRAFIKLAB_GTFS_SWEDEN_KEY`; same product as `scripts/find-sweden-station-coords.mjs`) + the official Dec 2024 map |
| Adapter product path (Jim, D2) | Trafiklab **GTFS Regional** operator `skane`: static `https://opendata.samtrafiken.se/gtfs/skane/skane.zip?key={TRAFIKLAB_API_KEY}`; Trafiklab operator table confirms `skane` realtime **TripUpdates + VehiclePositions + occupancy** |
| GTFS-RT catalog | Mobility Database **mdb-2970 = TripUpdates, mdb-2971 = ServiceAlerts, mdb-2972 = VehiclePositions** (first pass cited mdb-2971 as TripUpdates — corrected), URL scheme `opendata.samtrafiken.se/gtfs-rt-sweden/skane/*.pb`, official entries verified 15 Jan 2026 |
| Key-scope caveat | Local `TRAFIKLAB_GTFS_SWEDEN_KEY`/`_RT_KEY` get **403 "Key does not have access to file"** on both `gtfs/skane/skane.zip` and `gtfs-rt-sweden/skane/TripUpdatesSweden.pb`. The regional `TRAFIKLAB_API_KEY` is Vercel-only. This is key scope, not feed absence — Jim verifies at D2 |
| v1 mode cut | Pågatågen (route_type 106 under the `Pågatåg` agency) plus Öresundståg and Krösatågen — both `in` under board-eligibility-rule.md, filed by Skånetrafiken under GTFS route_desc rather than route_long_name. No bus, no tram (none active) |
| Hub lock | **Malmö C** — Citytunneln portal (2010). Lines 3, 6, 8, 9, 10, 11 call it (6 of 10 corridors; the other 4 never enter Malmö) |
| Skip risks | Malmöringen double-call at Malmö C (confirmed — must be modeled, see memo); headsign string "Malmö central" ≠ printed "Malmö C"; feed stop names carry "Malmö "/" station" affixes vs printed strings (rename table below); PågatågenExpress is overlay-grade (limited daily, summer cuts) |

## Per-line detail (termini + ordered stops)

Ordered stop lists live in `published-network.json` `lines[]` (printed map strings). Summary:

| ref # | corridor | termini | calls | Malmö v1 stations touched |
| --- | --- | --- | --- | --- |
| 2 | Helsingborg–Ängelholm–Halmstad | Helsingborg C ↔ Halmstad | 10 | none (heavy short-turn Förslöv) |
| 3 | Helsingborg–Eslöv–Malmö via Marieholm | Helsingborg C ↔ Hyllie | 14 | Burlöv, Malmö C, Triangeln, Hyllie |
| 4B | Kristianstad–Karlshamn | Kristianstad C ↔ Karlshamn | 6 | none (through-runs onto 9) |
| 5 | Helsingborg–Åstorp–Hässleholm–Kristianstad | Helsingborg C ↔ Kristianstad C | 14 | none |
| 6 (2+6) | Helsingborg–Landskrona–Lund–Malmö–Ystad–Simrishamn | Helsingborg C ↔ Simrishamn | 29 | Burlöv, Malmö C, Triangeln, Hyllie, Oxie |
| 7 | Hässleholm–Markaryd | Hässleholm C ↔ Markaryd | 4 | none |
| 8 | Åstorp–Teckomatorp–Lund–Malmö (Söderåsbanan) | Åstorp ↔ Hyllie | 12 | Burlöv, Malmö C, Triangeln, Hyllie |
| 9 (4B+9) | Kristianstad–Hässleholm–Lund–Malmö–Trelleborg | Kristianstad C ↔ Trelleborg | 23 | Burlöv, Malmö C, Triangeln, Hyllie, Svågertorp |
| 10 | PågatågenExpress Svågertorp–Hässleholm(–Älmhult) | Svågertorp ↔ Älmhult | 10 | Svågertorp, Hyllie, Triangeln, Malmö C, Burlöv |
| 11 | Malmöpendeln/Malmöringen Kävlinge–Lomma–Malmö C–ring | Kävlinge ↔ Malmö C (×2) | 11 | Malmö C ×2, Triangeln, Hyllie, Svågertorp, Persborg, Rosengård, Östervärn |

Three different Malmö–Lund stop sets exist: line 6/9 call Klostergården–Hjärup–Åkarp–Burlöv; line 8 calls Burlöv + Gunnesbo only; line 3 calls Burlöv only. Do not assume a shared corridor stop set.

## Station name table (locks + known clashes)

Match rule: published D1 string (Dec 2024 official map tick) vs Trafiklab GTFS Sweden 3 `stops.txt` string vs other operators' print of the same place. `rename` = same place, different printed string.

| published (D1, map) | feed string (GTFS Sweden 3) | class |
| --- | --- | --- |
| **Malmö C** | Malmö Centralstation; headsigns print **"Malmö central"** | **lock (commuter hub) + rename.** Lines 3/6/8/9/10/11; line 11 calls it twice. doNotGroup vs Malmö C Öresundståg. |
| **Triangeln** | Malmö Triangeln | **rename.** Öresundståg also calls (map symbol) — doNotGroup. |
| **Hyllie** | Malmö Hyllie | **rename.** Öresundståg also calls — doNotGroup. Inner terminus lines 3/8; "mot Danmark" beyond is out of v1. |
| **Svågertorp** | Malmö Svågertorp | **rename.** Ring (11) + Trelleborgsbanan (9) + Express (10) — one stop, three continuations. |
| **Persborg** | Malmö Persborg | **rename.** Ring-only stop (line 11), called once per through-path. |
| **Rosengård** | Malmö Rosengård station | **rename.** Ring-only stop, opened 2018. |
| **Östervärn** | Östervärn | **match** — the one Malmö-area stop where feed and print already agree. Ring-only stop. |
| **Burlöv** | Burlöv station | **rename (suffix).** In v1 (lines 3/6/8/9/10). Öresundståg also calls — doNotGroup. |
| **Oxie** | Oxie station | **rename (suffix).** In v1 (line 6). |
| Lund C / Helsingborg C / Kristianstad C / Hässleholm C | Lund Centralstation / Helsingborg Centralstation / … | rename (out-of-Malmö termini tokens — keep printed "… C" forms). |
| Trelleborg / Sölvesborg / Karlshamn / Laholm / Gunnesbo | Trelleborg C / Sölvesborgs Resecentrum / Karlshamn Resecentrum / Laholm Station / Lund Gunnesbo station | rename (terminus/branch tokens — the map prints the short forms). |
| Öresundståg platforms at Malmö C, Triangeln, Hyllie, Burlöv | — | **doNotGroup, revised 30 Aug 2026: `in`.** Öresundståg (Skånetrafiken + DSB + Region Hovedstaden) is a separate product from Pågatågen — walk-up, no reservation, passes board-eligibility-rule.md — shown as a distinct service entry at the same physical stop, never merged into a Pågatågen chip. |
| Krösatågen-only stations (Killeberg, Osby, Hästveda, Ballingslöv, …) | — | **still out of v1** (catalog scope decision, not a boarding-eligibility exclusion — Krösatågen itself is `in` where it overlaps the existing catalog, e.g. Hässleholm C; these stations sit outside the catalog's geographic footprint and are not added). |
| Museum tram / bus terminals | — | **out of v1** (no active light rail; buses out of scope). |

## H2 — who has line codes today

| surface | line codes? | what it actually has |
| --- | --- | --- |
| Official map "Fler resmöjligheter med tåg" Dec 2024 (D1) | **no** | Full station geography + product symbols. No line numbers anywhere. |
| skanetrafiken.se copy (tidtabellsskifte, disruption notices) | **no** | Corridors by termini ("Helsingborg – Åstorp"); trains by number ("Pågatåg 1739"); product names Pågatågen / PågatågenExpress / Malmöringen. |
| Trafiklab GTFS Sweden 3 static | **no** | route_short_name = train number, route_long_name "Pågatåg". Ordered stops per trip — the per-line D1 source used here. |
| Trafiklab GTFS Regional `skane` (Jim's path) | unverified from here (key scope) | Trafiklab table: static + TripUpdates + VehiclePositions + occupancy. |
| Reference sources (sv.wikipedia "Linjer") | reference numbers 2–11 | Station counts match GTFS patterns exactly; numbering absent from every official surface. |

H2 conclusion: **there is no passenger line-code layer to lock.** Chips must be built from product + corridor termini ("Pågatågen mot Trelleborg"), and Malmöringen needs special handling at Malmö C (double-call + self-referential "Malmö central" headsign). The clash surface is **feed-vs-print renames** (Malmö-prefix and "station"-suffix strings, "Malmö central" headsigns) plus **Pågatågen vs Öresundståg at four shared stations**.

## Board eligibility (docs/board-eligibility-rule.md §4 — mandatory section)

Added 30 Aug 2026, live-investigation addendum (re-verified against a live `skane.zip` GTFS
static read and a live TripUpdates snapshot, both via the existing Trafiklab keys already used by
this adapter — no new key/feed). Verdicts use the rule doc's vocabulary. Every rail service
calling at an in-catalog Malmö station is listed; none is silently absent.

| Service | Calls at in-catalog stations | Walk-up? | Verdict | Evidence |
|---|---|---|---|---|
| **Pågatågen** (incl. PågatågenExpress, Malmöringen) | All 9 Malmö-area stations | Yes — regional card/ticket, no reservation | `in` | GTFS `route_long_name` prefix "Pågatåg"; existing v1 baseline |
| **Öresundståg** | Malmö C, Triangeln, Hyllie, Burlöv | **Yes** — fixed-price, buy-and-board, no compulsory reservation | `in` | skane.zip `agency_id` Skånetrafiken, `route_desc` "Öresundståg", `route_short_name` 802/803/804/805/806/808; live TripUpdates snapshot 30 Aug 2026 showed 22 Öresundståg trips in service |
| **Krösatågen** | Hässleholm C (shared with Pågatågen lines 5/7/9/10) | **Yes** — same fixed-price, buy-and-board model | `in` | skane.zip `route_short_name` literally "Krösatåg", `route_desc` "Krösatåg"; two routes (Hässleholm–Växjö, Kalmar–Växjö) — only the Hässleholm C end is in the Malmö catalog; live TripUpdates snapshot 30 Aug 2026 showed 1 Krösatågen trip in service |
| **Snälltåget** | Malmö C | No — compulsory seat reservation | `out-reservation` | Skånetrafiken/Snälltåget ticketing requires a booked seat; already excluded pre-rule, verdict now recorded formally |
| Öresundståg/Krösatågen realtime | — | — | — | Both already resolve on the adapter's existing `TRAFIKLAB_API_KEY_RT` — no new key/feed needed; realtime works end-to-end for both products the same as Pågatågen, subject to the same H2 key-scope caveat that applies to the whole feed |
| Buses, museum tram | Malmö-area stops | N/A | `out-mode` | v1 mode cut — trains only |
| Krösatågen-only stations (Killeberg, Osby, Hästveda, Ballingslöv, …) | Not in the Malmö catalog | N/A | (catalog cut — no verdict owed) | These stations sit outside the existing catalog's geographic footprint; Krösatågen itself is `in`, but adding its own-only stations is a scope decision, not a boarding-eligibility question. Decision: **stay out** — v1's footprint is the existing Pågatågen catalog, not extended by this change. Revisit if/when Malmö's catalog itself grows (a Krösatågen-driven catalog expansion is a separate product call, not implied by this decision). |

No services other than the ones tabled above call at any in-catalog Malmö station — verified
against the skane.zip route list for the in-catalog stop set.

## License (per docs/nico-research-sources.md §2)

- **License name:** CC0 1.0 Universal (Public Domain Dedication) — both **GTFS Sweden 3** and **GTFS Regional** (the `skane` adapter path).
- **Redistribution / rehosting:** Allowed without restriction. Trafiklab: "Data from the GTFS Sweden 3 API is available under the CC0 1.0 Universal (CC0 1.0) Public Domain Dedication license"; the GTFS Regional page carries the same CC0 1.0 dedication ("…dedicated the work to the public domain by waiving all of his or her rights…"). Serving to our users and passing to third parties is permitted.
- **Commercial use:** Allowed (CC0).
- **Attribution:** None required (CC0). (Attribution to Trafiklab/Samtrafiken is a courtesy, not an obligation.)
- **Terms URL:** <https://www.trafiklab.se/api/gtfs-datasets/gtfs-sweden/> and <https://www.trafiklab.se/api/gtfs-datasets/gtfs-regional/> (licence sections, read 29 Aug 2026).
- **Key agreement:** Keyed access (Bronze/Silver/Gold tiers with rate/monthly quotas — e.g. GTFS Regional static Bronze 10/min & 50/month; realtime Bronze 50/min & 30,000/month). Quotas constrain fetch frequency, not data redistribution; no redistribution restriction found in the tier terms read.
- **Confidence:** **clear** for the two Trafiklab GTFS products. The official map PDF itself is Skånetrafiken copyright (normal for passenger maps; we transcribe facts, don't rehost the artwork) — same posture as Oslo/Rotterdam.

## C2/C3 to put in front of Luke / Jim

1. **city=malmo**, agency Skånetrafiken / Pågatågen. Separate from Göteborg/Stockholm. (Unchanged.)
2. **Malmö C** locked hub; **called twice by line 11 through-paths** — model it like Oslo's Stortinget, not like a plain hub.
3. **doNotGroup Pågatågen vs Öresundståg at Malmö C, Triangeln, Hyllie, AND Burlöv** (map-symbol confirmed).
4. **No light rail** (unchanged). **Revised 30 Aug 2026: Öresundståg and Krösatågen are `in`** — see Board eligibility section. Krösatågen-only stations (own-network rows) stay out of the catalog.
5. **V1 scope: 10 Pågatågen corridors**, of which 6 touch Malmö (3, 6, 8, 9, 10, 11). "11 regular + line 12" is withdrawn.
6. **9 Malmö-area stations confirmed**, Burlöv and Oxie now unconditional.
7. **No line codes exist** — do not invent chip tokens like "H3"; use "Pågatågen mot `<far end>`" + special-case Malmöringen.
8. **Feed renames:** strip "Malmö " prefixes / " station" suffixes to printed strings; never surface "Malmö central" (headsign string) as a station or destination token at Malmö C.
9. **Europe/Stockholm HAS DST.** (Unchanged.)
10. **RT is catalogued live for `skane`** (TripUpdates + VehiclePositions + occupancy) but our local keys can't read the regional files — **Jim must verify TRAFIKLAB_API_KEY scope at D2** before promising a live board.

## What I did not do

No live city flip, no UI wiring, no generator committed, no invented station order (every array
is map-cross-checked GTFS or the map itself), no bus scope creep, no edits to any other city's
pack, no rehosting of the Skånetrafiken PDF artwork, no catalog extension for Krösatågen-only
stations (decided out of scope — see Board eligibility section).

**Update, 30 Aug 2026 (Tim's product decision, docs/board-eligibility-rule.md):** Öresundståg
and Krösatågen flip from "out of v1" to `in` — see the Board eligibility section above. This pack
and hazard-pack.md were updated to record it; `lib/providers/malmo.js` was updated in the same
pass to broaden `tripAllowed()` (route_desc match) and `registry.js`'s notes to match — the
original "Jim wires this D2 against an unrevised pack" sequencing assumption is superseded for
these two products specifically.
