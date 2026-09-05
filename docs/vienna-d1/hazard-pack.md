# Vienna hazard pack (H1–H7)

Evidence, retrieved live during this pass (6 Sep 2026) because `oracle-clash-report.md` named the
official Wiener Linien U-Bahn map and Wikipedia's station list as D1 sources but did not itself
transcribe per-line station order or resolve the per-line counts against them:

- [List of Vienna U-Bahn stations](https://en.wikipedia.org/wiki/List_of_Vienna_U-Bahn_stations) —
  the alphabetical master `wikitable` (Station / Photo / Lines / Opened / Character / Notes), read
  for its per-station **Lines** column (line-icon template params, e.g. `U1`, `U2`), used to
  cross-check line membership independently of the five line articles below.
- [U1 (Vienna U-Bahn)](https://en.wikipedia.org/wiki/U1_(Vienna_U-Bahn)),
  [U2 (Vienna U-Bahn)](https://en.wikipedia.org/wiki/U2_(Vienna_U-Bahn)),
  [U3 (Vienna U-Bahn)](https://en.wikipedia.org/wiki/U3_(Vienna_U-Bahn)),
  [U4 (Vienna U-Bahn)](https://en.wikipedia.org/wiki/U4_(Vienna_U-Bahn)),
  [U6 (Vienna U-Bahn)](https://en.wikipedia.org/wiki/U6_(Vienna_U-Bahn)) — each article's own
  "Stations" section is an **ordered** `<ul>` list ("Line U# currently serves the following
  stations:"), terminus to terminus. This is the D1 station-graph source (not the alphabetical
  table, which is unordered).
- `docs/vienna-d1/oracle-clash-report.md` (Nico, 6 Sep 2026) — agency, auth, mode cut, hub lock,
  board-eligibility verdicts, license.

Product `lib/cities/vienna/` absent. `assertCityLive("vienna")` is Unknown city.

## H1 — parent + child / doNotGroup

D1 has no stopIds. Single operator (Wiener Linien), single mode (U-Bahn heavy metro) in v1 scope —
per the oracle report's Board eligibility section, every overlapping rail service at a shared
U-Bahn station (S-Bahn, Badner Bahn, ÖBB) is `out-product`, not a same-platform ambiguity. **No
doNotGroup is needed for competing-operator conflation**, matching the oracle report's own
conclusion. This is unlike Copenhagen/Brussels, which mix Metro + national rail + tram at the
station level in v1.

What the station graph does need — recorded here, not a doNotGroup in the operator-conflation
sense, but a same-operator interchange map for the direction model (see
direction-model-memo.md) — is the full list of stations shared between two or three of the five
lines, confirmed by cross-checking each line's own ordered station list against every other line's:

| station | lines | note |
| --- | --- | --- |
| **Karlsplatz** | U1, U2, U4 | **Hub lock.** U1 and U4 pass through; U2 *terminates* here (its printed southern terminus, not a through-station for U2) |
| Praterstern | U1, U2 | through-station on both |
| Stephansplatz | U1, U3 | through-station on both; two lines only, not the hub |
| Volkstheater | U2, U3 | through-station on both |
| Schottenring | U2, U4 | through-station on both |
| Schwedenplatz | U1, U4 | through-station on both |
| Landstraße | U3, U4 | through-station on both |
| Westbahnhof | U3, U6 | through-station on both |
| Längenfeldgasse | U4, U6 | through-station on both |
| Spittelau | U4, U6 | through-station on both |

Ten interchange stations total (Karlsplatz plus nine two-line pairs). All confirmed by the
overlap of two independently-scraped lists (each line's own ordered "Stations" section) agreeing
on the same printed name at the same relative position, and cross-checked again against the
alphabetical master table's Lines column (same nine pairs plus Karlsplatz's triple, no others).

## H2 — station-count correction (verified against primary sources, not the oracle report's prose)

The oracle report's C2/C3 section (item 3) states per-line counts **U1 28, U2 20, U3 20, U4 19,
U6 22, total ~109**, and separately states "**109 passenger-open U-Bahn stations** (verified
across all five operational lines)". Both the per-line breakdown and the ~109 total are **wrong**
against this pass's primary-source transcription:

- **Actual per-line counts, each line's own ordered Wikipedia "Stations" list, terminus to
  terminus: U1 = 24, U2 = 21, U3 = 21, U4 = 20, U6 = 24.** Sum of line-ticks = 110 (not 109).
- **Actual unique station count = 99, not 109.** Ten stations are interchanges shared between two
  or three lines (see H1 table) — Karlsplatz counts three times in the 110 line-ticks (once per
  U1/U2/U4) but is one physical station; the other nine interchange pairs each count twice. Net:
  110 line-ticks − 11 double-counted ticks (2 for the Karlsplatz triple, 1 each for the other nine
  pairs) = **99 unique stations.**
- This was cross-checked two independent ways that agree: (1) merging the five line articles'
  own ordered station lists and de-duplicating by printed name, and (2) counting rows in the
  alphabetical master table (`List of Vienna U-Bahn stations`) that carry at least one of the
  U1/U2/U3/U4/U6 line-icon params — both give 99.
- The oracle report's "no shared tracks" claim (item 3) is still correct and is a different fact
  from station count — each line uses separate physical infrastructure/platforms at interchanges,
  it just also *shares stations* (buildings) with other lines at the ten points above. Don't let
  "no shared tracks" imply "no shared stations" when building the adapter's station catalog.

**H2 conclusion: use the 99-station, per-line counts (24/21/21/20/24) transcribed in this pack's
`published-network.json`, not the oracle report's 28/20/20/19/22/~109 figures.** Flagging back:
the oracle report's C2/C3 station-count claims are superseded by this correction.

## H3 — thin / unverifiable / out of scope

- **U5 (turquoise, Karlsplatz–Frankhplatz)**: not operational (service opens 2030 per the oracle
  report); correctly excluded from all D1 sources scraped for this pack (no U5 rows in the
  alphabetical master table's Lines column, no U5 line article "Stations" section fetched).
- **"Schedifkaplatz" (oracle report's Board eligibility table, item claiming U6 + Badner Bahn
  interchange there)**: **not found in any primary source pulled for this pack** — absent from
  the U6 line article's ordered station list, absent from the alphabetical master table. Vienna's
  actual U6/Badner-Bahn-adjacent stations in the primary sources are Bahnhof Meidling (confirmed,
  U6, matches the oracle report's separate Meidling row) — "Schedifkaplatz" appears to be either a
  misremembered/miswritten name or a non-U-Bahn tram stop not on the U-Bahn station list. Since
  Badner Bahn is `out-product` regardless of which station name is correct, this doesn't change
  v1 scope — **flagging it as an unverified claim in the oracle report, not correcting it to a
  specific alternative name, since no primary source confirms one.**
- **S-Bahn, Badner Bahn, ÖBB, tram, bus**: all `out-product` / `out-mode` per the oracle report's
  Board eligibility section; not re-litigated here, no new primary-source contradiction found for
  these verdicts.
- **Kaisermühlen naming**: the alphabetical master table's row prints "Kaisermühlen" (truncated),
  but the U1 line article's own ordered list and that station's own Wikipedia article title both
  say **"Kaisermühlen-VIC"** (VIC = Vienna International Centre, the adjacent UN office complex).
  Lock **Kaisermühlen-VIC** — the fuller, station-page-confirmed form — not the alphabetical
  table's shortened print.

## H4 — branches / interchange topology

All five lines are **linear** — no ring, no Y-branch, confirmed by each line's own ordered
station list running straight from one named terminus to the other with no forking note in any
of the five Wikipedia line articles. This matches the oracle report's "each line uses separate
physical infrastructure" framing (just corrected for the actual station count, see H2).

| line | shape | termini (confirmed both ends, ordered list start/end) |
| --- | --- | --- |
| U1 | linear | Leopoldau ↔ Oberlaa |
| U2 | linear | Karlsplatz ↔ Seestadt |
| U3 | linear | Ottakring ↔ Simmering |
| U4 | linear | Hütteldorf ↔ Heiligenstadt |
| U6 | linear | Siebenhirten ↔ Floridsdorf |

**U2's own printed terminus is Karlsplatz** — the same station locked as the v1 hub. This is a
different shape from Brussels' Arts-Loi/Kunst-Wet (a pure through-cross, no line terminates there)
or Copenhagen's Kongens Nytorv (also pure through). At Karlsplatz, U1 and U4 pass through while U2
originates/terminates — see direction-model-memo.md for how this changes the hub's direction
tokens.

## H5 — nested short turns

No nested short-turn codes found in any of the five line articles' "Stations" sections (no
mention of partial-route/peak-only variants analogous to Copenhagen's S-tog Bx or Oslo's Helsfyr
overlay). Each line's ordered list runs its full terminus-to-terminus route with no sub-notes.
Treat this as **not yet ruled out** rather than confirmed-absent — GTFS trip-level short-turn
patterns weren't checked (D1 explicitly does not use GTFS as the station-graph source, per the
oracle report's H2 conclusion) — flag for Jim's D2 timetable pass, not decided here.

## H6 — inner city (where §3 lives)

Locked hub: **Karlsplatz** (U1 × U2 × U4 — U1/U4 through, U2 terminus). Shared approaches
(two-line interchanges, not the lock): Praterstern (U1/U2), Stephansplatz (U1/U3), Volkstheater
(U2/U3), Schottenring (U2/U4), Schwedenplatz (U1/U4), Landstraße (U3/U4), Westbahnhof (U3/U6),
Längenfeldgasse (U4/U6), Spittelau (U4/U6).

## H7 — DST

**Europe/Vienna observes DST (CEST/CET)**, per the oracle report. Do not copy no-DST cities
(Perth, Brisbane, Adelaide). Last Sunday of March (spring forward), last Sunday of October (fall
back).

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| vienna vs wien / at-vienna / austria | Separate city id; oracle report is explicit this is not `wien` or `at-vienna`, and there is no country-lane ledger for Austria (only one region in scope) |
| Karlsplatz vs Stephansplatz / Meidling / Westbahnhof | Hub lock (three-line, U1×U2×U4) vs two-line interchanges vs out-of-scope S-Bahn/ÖBB/Badner-Bahn stations named in the oracle report |
| U-Bahn U1–U6 vs S-Bahn / Badner Bahn / ÖBB at any shared station | Mode/product cut per the oracle report's Board eligibility section — all `out-product`, none is a same-platform doNotGroup |
| Kaisermühlen-VIC vs "Kaisermühlen" | Rename/truncation between the alphabetical master table and the line article + station's own page; lock the fuller form |
| "Schedifkaplatz" (oracle report) | Unverified against every primary source pulled for this pack — flagged, not corrected to a specific alternative, doesn't change scope since Badner Bahn is out-product either way |

## What I did not do

No generator, no live fetch of the official Wiener Linien PDF network map (used the five
Wikipedia line articles' own ordered station lists plus the alphabetical master table as the
checkable D1 source instead, since the oracle report pointed at the Wiener Linien map and
Wikipedia but did not itself transcribe either), no assertion tables, no live city flip, no
product edit, no adapter code, no `lib/providers/` or `registry.js` edit, no wiring of the
proprietary OGD Realtime Monitor JSON schema, no U5 station-graph work (out of v1 scope, service
opens 2030), no resolution of the "Schedifkaplatz" naming gap (flagged, not decided), no GTFS
fetch (the oracle report's H2 explicitly says do not generate `published-network.json` from
GTFS — followed here).
