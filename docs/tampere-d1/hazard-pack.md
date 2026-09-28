# Tampere hazard pack (H1–H7)

Evidence, re-fetched live during this pass (28 Sep 2026) because the oracle report named the
official route page and the ITS Factory GTFS feed as D1 sources but transcribed only a summary
table, not the full ordered per-line stop arrays, and (see H3) got one structural fact wrong:

- **`tampereenratikka.fi/en/tram-routes/`** (official Tampereen Ratikka Oy site), fetched this pass.
  Page metadata `dateModified: 2026-01-19`. Prints both lines' full ordered stop lists in one
  paragraph: **"Line 1 Kaupin kampus/Tays-Keskustori-Pyhällönpuisto includes 20 stops"** and
  **"Line 3 Hervanta-Hakametsä-Sorin aukio includes 17 stops"**, each followed by the literal
  ordered stop-name list. Also states plainly: **"Tampere Tram runs on two lines."**
- **ITS Factory static GTFS zip** (`http://data.itsfactory.fi/journeys/files/gtfs/latest/gtfs_tampere.zip`),
  downloaded whole this pass (17.4 MB, `Last-Modified: 21 Sep 2026`). `stops.txt`, `routes.txt`,
  `trips.txt`, and `stop_times.txt` (153 MB, queried by trip_id, not loaded wholesale into any
  product path) used to (a) resolve stop_ids and lat/lng for every D1 station, and (b) verify the
  two lines' printed stop order against real trip-level `stop_times` sequences, not just the route
  page's prose — this is what surfaced the H3/H5 findings below. Not used as the *source* of the
  station graph (the official page is), only as a cross-check and id/coordinate lookup, matching
  the pattern in the Bergen/Oslo packs (Entur geocoder used the same way).
- **`en.wikipedia.org/wiki/Tampere_railway_station`** ("Tampere Central Station"), fetched this
  pass — confirms "The Rautatieasema tram stop is located near the railway station, used by Tampere
  light rail lines 1 and 3," i.e. a separate, nearby stop, not the same stop-place as the VR
  station building (H1, Board eligibility).
- **`en.wikipedia.org/wiki/Tampere_light_rail`**, fetched this pass — used only as a secondary
  cross-check of line history/opening dates, not as a station-graph source (its infobox route table
  is stale/abbreviated — see H3).
- `docs/tampere-d1/oracle-clash-report.md` (Nico) — agency, feeds, license, board-eligibility
  scaffolding. Two corrections made against it this pass (H3, dated correction note appended to the
  report itself).

Product `lib/cities/tampere/` absent. `assertCityLive("tampere")` is Unknown city.

## H1 — parent + child / doNotGroup

D1 has no product stopIds beyond the reference `stationRegistry` in `published-network.json`.
Single operator in v1 scope (Nysse tram, operated by VR under contract) — the one cross-mode
conflict is the railway station; the rest are same-operator, similar-name pairs.

| candidate A | candidate B | why they must never collapse |
| --- | --- | --- |
| **Rautatieasema** (tram, hub lock, GTFS stop_ids 0809/0810) | **Tampere railway station / Tampere asema** (VR, out of catalog) | Confirmed via Wikipedia's own "Tampere Central Station" article: "The Rautatieasema tram stop is located near the railway station" — a separate, nearby stop, not the same stop-place. VR platforms never appear in the ITS Factory GTFS (Nysse-only feed); no VR stop_id exists to conflate with. |
| **Keskustori** (Line 1 only) | **Rautatieasema** (both lines, the lock) | Live GTFS confirms Line 3 does not call at Keskustori at all (Koskipuisto → Sorin aukio directly) — Keskustori was never a real alternate hub candidate despite being a large, heavily-used central stop; see H6. |
| **Kalevan kirkko** (Line 1, Kaupin kampus/TAYS branch) | **Kalevanrinne** / **Kaleva** (both Line 3, Hervanta branch) | Three stops share the "Kalev-" prefix, sit within ~1.5 km of each other on the two different eastern branches, and are easy to keystroke-confuse. Never on the same line. |
| **Tikkutehdas** (Line 1) | **Tehdas** (Line 1, further west) | Both contain "tehdas" (factory); adjacent-ish stops on the same line, easy to truncate-confuse. |
| **Niemen kartano** (Line 1) | **Niemenranta** (Line 1, adjacent) | Both "Niemen-" prefixed, immediately adjacent stops. |
| **Hervannan kampus** / **Hervantakeskus** / **Etelä-Hervanta** / **Pohjois-Hervanta** / **Hervantajärvi** (all Line 3, Hervanta corridor) | each other | Five distinct, closely-spaced Hervanta-prefixed stops — colloquial "Hervanta" alone (used as the GTFS trip_headsign, see H5) is ambiguous between all five; never collapse to a bare "Hervanta". |
| **Sorin aukio** (Line 3 terminus) | **Sammonaukio** (both lines, shared trunk) | Both end in "-aukio" (square); physically ~2.5 km apart, different roles (one a terminus, one mid-trunk). |
| **TAYS** (Line 1, hospital stop) | **Kaupin kampus** (Line 1, adjacent, the line's own printed terminus) | Adjacent, both hospital-campus-area stops; GTFS `trip_headsign` for this end of Line 1 is literally "TAYS", not "Kaupin kampus" — see H5. Do not collapse the headsign string into the terminus station name. |

## H2 — station-count and name check (confirmed, not corrected)

Unlike the Bergen pass, this pass's GTFS/official-page cross-check **confirms** the oracle
report's line-level figures rather than correcting them:

- **Line 1, 20 stops, Kaupin kampus/TAYS ↔ Pyhällönpuisto**: Kaupin kampus, TAYS, Hippos, Kalevan
  kirkko, Sammonaukio, Tulli, Rautatieasema, Koskipuisto, Keskustori, Tuulensuu, Pyynikintori,
  Särkänniemi, Tikkutehdas, Santalahti, Hiedanranta, Tehdas, Niemen kartano, Niemenranta,
  Lentävänniemi, Pyhällönpuisto. Confirmed identically from the official page's printed ordered
  list and from live GTFS `stop_times` sequences for the two "clean" trip patterns (2,184 trips
  starting at Kaupin kampus A, ending at Pyhällönpuisto A/B, and vice versa — see H5 for the
  minority that don't).
- **Line 3, 17 stops, Hervantajärvi ↔ Sorin aukio**: Hervantajärvi, Etelä-Hervanta, Hervannan
  kampus, Hervantakeskus, Opiskelija, Pohjois-Hervanta, Hallila, Turtola, Hakametsä, Kalevanrinne,
  Uintikeskus, Kaleva, Sammonaukio, Tulli, Rautatieasema, Koskipuisto, Sorin aukio. Same
  confirmation method.
- **4 shared stops** (Sammonaukio, Tulli, Rautatieasema, Koskipuisto) — confirmed identical in
  both lines' GTFS stop_id sets (e.g. Rautatieasema A = stop_id 0809 on both routes' trips).
- **33 unique stations total** (20 + 17 − 4). Matches the oracle report's count exactly, and
  matches Wikipedia's infobox `stops = 33` field (the only figure in that article's infobox that
  is current — its route *table*, by contrast, is stale/abbreviated, see H3).
- **GTFS `stops.txt` gives every station two stop_ids**, suffixed `A`/`B` for the two running
  directions (e.g. Rautatieasema A = `0809`, Rautatieasema B = `0810`). Both recorded in
  `published-network.json`'s `stationRegistry`. Never invented — every id/lat/lng in this pack
  comes directly from the downloaded `stops.txt`.
- **`routes.txt`'s `route_long_name` fields are shortened marketing strings, not the real
  termini** — route `1`'s long_name is "Kaupin kampus - Keskustori - Lentävänniemi" (omits
  Pyhällönpuisto entirely) and route `3`'s is "Hervanta - Hakametsä - Sorin aukio" (says "Hervanta"
  not "Hervantajärvi"). Do not use `route_long_name` as a station-graph or direction-chip source —
  it undercuts both lines' actual printed/operated termini. Use the official page's stop lists
  (confirmed above) instead.

## H3 — thin / event / overlay / corrected

- **No passenger Line 2 exists** (corrected in the oracle report via a dated note, appended this
  pass — full detail there). The oracle report's claimed "Line 2 Santalahti – Lentävänniemi,
  opened 7 Jan 2025, 13 stops, further extensions to Partola/Ruotila target Aug 2028" is a
  misreading of the tramway's internal construction-phase labels ("Part 2" / "Section 2A/2B" of
  Line 1's own Pyynikintori→Lentävänniemi extension, built and opened in stages 2023/2025) as if
  they named a third passenger line. Confirmed wrong two independent ways: (1) the official page
  states "Tampere Tram runs on two lines"; (2) live GTFS `routes.txt` has exactly two
  `route_type=0` rows, `"1"` and `"3"` — no `"2"` of any route_type exists in the entire feed
  (bus routes use `route_type=3` and non-tram numbers). Santalahti and Lentävänniemi are both
  ordinary intermediate/near-terminus stops on **Line 1**, already correctly present in Line 1's
  20-stop list (H2). **No station-graph change results** — v1 scope was always "tram lines 1 and
  3 only, no buses, no VR" and remains exactly that; there was simply never a Line 2 to omit.
- **Pirkkala/Linnainmaa extension (2028–2032, two further phases)**: under construction, not
  reflected in any live GTFS trip and not on the current official stop list. New stops named on
  the official page for the *first* phase (~2028): Viinikanlahti, Hatanpää, Arboretum, Rantaperkiö,
  Härmälä, Härmälänranta, Partola (south of Sorin aukio) and Ruotula (north of Kaupin kampus). A
  *second* phase (~2032, state-funding-dependent) adds Pakkalankulma, Killo, Haikka, Pirkkala,
  Kaupinlaakso, Pappila, Linnainmaa. None open during v1. Not inserted, same treatment as Bergen's
  Åsane extension and Oslo's Fornebubanen.
- **Niihama extension (Kauppi campus end, ~2028)**: also under construction per the same council
  decision (Oct 2024) as the Pirkkala/Linnainmaa work above. Not open, not inserted.
- **Nysse buses**: dozens of numbered bus routes (`route_type=3`) share the same GTFS feed and, at
  several tram stops (Keskustori, Rautatieasema, Sorin aukio in particular), share the same
  printed place-name across many lettered platforms (Keskustori has platforms A–M; only A/B are
  tram). **`out-mode`** — v1 is tram-only, consistent with the oracle report's original scope.
  See Board eligibility.
- **VR trains at Tampere railway station**: never appear in this GTFS feed at all (Nysse-only
  feed) and are a confirmed-separate, nearby stop-place from the tram's Rautatieasema (H1). No
  per-service board-eligibility verdict is owed — the station is not in this catalog under any
  name (see Board eligibility, following the Bergen/Oslo precedent for out-of-catalog national
  rail).

## H4 — branches (interchange topology)

Both lines are linear, sharing one short mid-route trunk — no ring, no Y-branch *as printed*.
Confirmed from both lines' own ordered GTFS/official-page stop lists:

| segment | line 1 | line 3 | shared? |
| --- | --- | --- | --- |
| Kaupin kampus → Kalevan kirkko | ✓ | — | no |
| Sammonaukio → Koskipuisto | ✓ | ✓ | **yes** (4 stops: Sammonaukio, Tulli, Rautatieasema, Koskipuisto) |
| Keskustori → Pyhällönpuisto | ✓ | — | no |
| Hervantajärvi → Kaleva | — | ✓ | no |
| Sorin aukio | — | ✓ (own terminus) | no |

This is the simplest topology in the pipeline so far for a two-line system — closer to Vienna's
simple pairs than Bergen's three-shared-station crossing. **However** (H5) the *printed* topology
above is not the whole live-operations picture.

## H5 — nested short turns / through-running (open question, not resolved here)

**Not visible on the official page or in any printed material** — found only by querying live
GTFS trip-level `stop_times`, which the oracle report did not do. This is new information this
pass surfaces for Jim's D2, not something this pack resolves:

- Of **9,758** total tram trips in the current GTFS (routes `1` and `3` combined), the large
  majority start/end cleanly at one of the four printed termini (Hervantajärvi, Pyhällönpuisto,
  Kaupin kampus, Sorin aukio) and never cross between the Kaupin kampus/TAYS branch and the
  Hervanta branch.
- **A minority do cross.** 217 of 2,401 trips (~9%) that start at Pyhällönpuisto end at
  Hervantajärvi instead of Kaupin kampus — i.e. they run the entire western Line-1 corridor
  (Pyhällönpuisto → ... → Sammonaukio) and then continue directly onto the entire Hervanta Line-3
  corridor (Kaleva → ... → Hervantajärvi), **never visiting Kaupin kampus/TAYS/Hippos/Kalevan
  kirkko or Sorin aukio at all**, despite being tagged `route_id` `"1"` in the feed. A
  smaller reverse set (53 of 2,489 Hervantajärvi-starting trips, ~2%) does the same thing in the
  other direction. A third pattern (210 trips) starts partway along the Hervanta corridor, at
  Hervannan kampus rather than Hervantajärvi — a short-turn on top of the through-running.
- **GTFS `trip_headsign` for these does not disambiguate cleanly either.** Route `1` trips use
  exactly two headsigns in the whole feed: `"TAYS"` (short for the Kaupin kampus/TAYS branch
  direction) and `"Lentävänniemi"` (used for *both* the ordinary Line-1-west direction *and* the
  through-to-Hervanta trips above — the headsign does not change even though the physical route
  taken does). Route `3` trips use `"Hervanta"` and `"Sorin aukio"` the same way.
- **What this means for Jim, unresolved**: a live vehicle whose GTFS `route_id` says `"1"` and
  whose headsign says `"Lentävänniemi"` is *usually* headed for Pyhällönpuisto via the printed
  Line-1 route, but in a real, non-trivial minority of cases is actually headed for Hervantajärvi
  via a route that never touches Kaupin kampus/TAYS at all. Building a direction chip or leave-by
  calculation that assumes `route_id` + `headsign` implies the full printed stop sequence will be
  wrong for this minority. **Flagging this for Jim's D2 pass to verify against live GTFS-RT
  (trip_id-level `stop_time_update`s, not just route_id/headsign) before building direction-chip
  logic** — not resolved or guessed at here. It's possible this is a scheduled peak/off-peak
  service pattern (the sampled anomalous trip started 07:46, early-morning), a genuine
  physical-track alternative at a junction near Sammonaukio/Kaleva, or a feed quirk; this pack did
  not have the scope to determine which.
- No official page, timetable PDF, or passenger-facing signage names this pattern — it is not
  drawn on the tram map, and the official page's prose describes exactly the two clean 20/17-stop
  lines (H2). **This pack's `published-network.json` station graph is the printed two-line model,
  confirmed above** — this H5 finding is a flag for D2, not a station-graph change.

## H6 — inner city (hub lock)

**Rautatieasema**, confirmed and strengthened (not just repeated) from the oracle report's
original pick:

1. It is the only central stop genuinely shared by both lines' printed routes (H2, H4) — along
   with Sammonaukio, Tulli, and Koskipuisto, but Rautatieasema is the interchange point with the
   confirmed VR/national-rail adjacency (Wikipedia evidence, H1) that makes it the natural anchor,
   matching the role Jernbanetorget/Bergen busstasjon/Rautatientori play in prior packs.
2. **Keskustori is explicitly NOT an alternate candidate** — live GTFS confirms Line 3 never calls
   there at all (Line 3 runs Koskipuisto → Sorin aukio directly, skipping Keskustori). The oracle
   report already named Rautatieasema as the lock and Keskustori as a "less formal" alternate; this
   pass's GTFS check shows Keskustori isn't even a real alternate by the shared-stop test, not
   just a weaker one.
3. Both lines' GTFS stop_ids at Rautatieasema (`0809`/`0810`, platforms A/B) are consistent across
   every trip on both routes that passes through — no ambiguity in which physical stop-id pair is
   "the" tram Rautatieasema.

Shared approaches (not the lock): Sammonaukio, Tulli, Koskipuisto — the rest of the 4-stop shared
trunk (H4).

## H7 — DST

**Europe/Helsinki observes DST (EEST/EET)** — confirmed directly from the GTFS `agency.txt`
(`agency_timezone = "Europe/Helsinki"`), consistent with the oracle report and with Helsinki's own
pack. Same wall-clock/DST-jump caveats as Helsinki's H7 apply (do not treat raw GTFS-RT clock
offsets as elapsed minutes across the spring jump without epoch-based arithmetic). Do not copy
no-DST cities (Perth, Brisbane, Adelaide).

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| tampere vs helsinki / city=finland | Separate city, separate agency (Nysse, not HSL); per-region adapters justified per the Finland light-pass guidance in `docs/expansion-tracker/countries.csv` (HSL/Digitransit and Tampere/Waltti diverge at the realtime layer — separate GTFS-RT hosts, separate brokers) |
| Rautatieasema (tram) vs Tampere railway station / Tampere asema (VR) | Hub lock vs out-of-catalog national rail — confirmed-separate, nearby stop-place (H1, Wikipedia evidence) |
| Keskustori vs Rautatieasema | Line-1-only stop vs the true shared hub lock (H2, H6) |
| Kalevan kirkko vs Kalevanrinne vs Kaleva | Similar "Kalev-" names, different lines/branches, H1 |
| Tikkutehdas vs Tehdas | Similar "-tehdas" suffix, adjacent-ish, same line, H1 |
| Niemen kartano vs Niemenranta | Similar "Niemen-" prefix, adjacent, same line, H1 |
| Hervannan kampus / Hervantakeskus / Etelä-Hervanta / Pohjois-Hervanta / Hervantajärvi | Five closely-spaced Hervanta-prefixed stops; bare "Hervanta" (the GTFS headsign) is ambiguous between them, H1/H5 |
| Sorin aukio vs Sammonaukio | Both "-aukio" suffix, different roles (terminus vs mid-trunk), H1 |
| TAYS vs Kaupin kampus | Adjacent stops; TAYS is the GTFS headsign, not the printed terminus name, H1/H5 |
| "Line 2" (oracle report's original claim) vs Line 1's own Santalahti/Lentävänniemi stops | No such passenger line exists — corrected, H3 |
| Nysse tram vs Nysse bus | Mode cut, even where co-located at the same named hub (Keskustori, Rautatieasema, Sorin aukio all have bus platforms under the same printed name) |
| Pirkkala/Linnainmaa and Niihama extension stops vs current 33 | Unopened (2028+), not inserted, H3 |

## What I did not do

No generator, no assertion tables, no live city flip, no product edit, no `lib/providers/` or
`registry.js` edit, no reopen of Helsinki or any other city's pack, no resolution of the H5
through-running/short-turn finding (flagged for Jim's D2 live-GTFS-RT verification, not guessed
at), no station-graph invention for the unopened Pirkkala/Linnainmaa/Niihama extensions, no
independent re-verification of the GTFS-RT trip-updates host beyond what's in jim-handoff.md (the
`dev.publictransport.tampere.fi` site is a client-rendered SPA that returned an identical shell for
every guessed path this pass tried — flagged as unverified, not asserted).
