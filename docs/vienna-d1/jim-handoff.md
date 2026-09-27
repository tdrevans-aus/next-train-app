Vienna D1 + research pack (Luke), 6 Sep 2026. City stays **planned**. Existing live/planned
cities untouched. `assertCityLive("vienna")` must still fail (city not in
`lib/providers/registry.js` today). No generator committed, no PR, no product edit, no
`lib/providers/` or `registry.js` edit.

Pack files: `docs/vienna-d1/{oracle-clash-report,hazard-pack,direction-model-memo}.md`,
`published-network.json`, this file.

## What's solid (cite: hazard-pack.md, direction-model-memo.md)

- **city=vienna**, single-operator v1: Wiener Linien GmbH, U-Bahn heavy metro only (U1, U2, U3,
  U4, U6 — U5 excluded, service opens 2030). Not `city=wien`, not `city=at-vienna`. No Austria
  country-lane ledger exists or is needed (single-region country).
- **Hub lock: Karlsplatz** (U1 × U2 × U4). Confirmed from all five line articles' own ordered
  station lists. **U1 and U4 pass through Karlsplatz; U2 terminates there** — this is a different
  hub shape from every prior pack (Brussels' Arts-Loi/Kunst-Wet and Copenhagen's Kongens Nytorv
  are both pure through-crosses, no line terminates at either). See direction-model-memo.md
  section 2 for how this changes U2's direction chip at Karlsplatz (only one live outbound
  direction there, not two).
- **Station graph for all five lines (99 unique stations) is hand-transcribed from each line's own
  ordered Wikipedia "Stations" section** (`U1 (Vienna U-Bahn)` through `U6 (Vienna U-Bahn)`,
  terminus to terminus), cross-checked against the alphabetical master station-list table's Lines
  column for membership and total-count verification two independent ways. All five lines are
  **linear** — no ring, no branch, confirmed by every line article.
- **Station-count correction against the oracle report (hazard-pack.md H2, evidence-backed):**
  actual per-line counts are **U1=24, U2=21, U3=21, U4=20, U6=24** (oracle report claimed
  28/20/20/19/22). Actual **unique station total is 99, not ~109** — ten stations are two-or-
  three-line interchanges (Karlsplatz is a triple; nine others are two-line pairs: Praterstern,
  Stephansplatz, Volkstheater, Schottenring, Schwedenplatz, Landstraße, Westbahnhof,
  Längenfeldgasse, Spittelau). **Use the counts and station arrays in `published-network.json`,
  not the oracle report's C2/C3 figures.**
- **Ten interchange stations, all same-operator/same-mode** (no doNotGroup needed for competing-
  operator conflation, unlike Copenhagen/Brussels) — full list and per-station line pairing in
  hazard-pack.md H1/H4 and mirrored in each line's `branches[]` array in
  `published-network.json`.
- **License: CC BY 4.0** per the oracle report (Vienna Open Government Data portal / Wiener
  Linien OGD publication). Attribution required, commercial reuse permitted. Not re-verified in
  this pass — the oracle report's license table is treated as settled.
- **Europe/Vienna HAS DST.**

## What is still NOT solid — resolve before/at D2, don't wire around

1. **"Schedifkaplatz"** — the oracle report's Board eligibility table names this as a U6 ×
   Badner Bahn interchange, but **no primary source pulled for this pack confirms the name** (not
   in the U6 line article's ordered station list, not in the alphabetical master table). Doesn't
   change v1 scope (Badner Bahn is `out-product` regardless of which station name is correct), but
   if Jim's D2 pass or a later station-graph check finds the real name, that's new information
   this pack didn't have — see hazard-pack.md H3.
2. **No nested short-turn codes found at D1** for any of the five lines (hazard-pack.md H5) — but
   this was checked against Wikipedia's per-line prose only, not GTFS trip patterns or the live
   OGD Monitor feed. If Jim's D2 timetable pass finds peak-only/partial-route U-Bahn services,
   that's new information, not assumed here.
3. **Real-time feed is proprietary JSON (OGD Monitor), not GTFS-RT** —
   https://www.wienerlinien.at/ogd_realtime/monitor (no key; remove/ignore the `SENDER` parameter
   per the official docs). Do not assume the shared `gtfs/realtime-board.js` path works unmodified
   — this needs its own parsing path, per the oracle report's H2. Community GTFS-RT bridge
   projects exist but are unofficial and were not evaluated here.
4. **U2's single-direction chip at Karlsplatz** (direction-model-memo.md section 2, open question
   1) — flagged for Tim to confirm the "only one live direction, not two" framing before D5
   assertion tables are written.

## Direction model (full detail: direction-model-memo.md)

- **All five lines**: line + terminus, e.g. `U1 + Leopoldau`, `U6 + Siebenhirten`. No ring
  topology exists (unlike Copenhagen's M3 or Brussels' inner loop) — don't reuse either recipe.
- **Karlsplatz**: U1 and U4 render the ordinary two-direction chip pair each; **U2 renders only
  one direction** (`U2 + Seestadt`) since Karlsplatz is U2's own terminus, not a through-station
  for it. Karlsplatz itself is never a direction token.
- **Nine two-line interchange stations** (Praterstern, Stephansplatz, Volkstheater, Schottenring,
  Schwedenplatz, Landstraße, Westbahnhof, Längenfeldgasse, Spittelau): both lines are through-
  stations there, ordinary line + terminus chips on each, no special handling needed.
- No service-type/destination-only chips needed anywhere in v1 scope — all five lines have a
  single, stable, printed passenger-facing code (unlike Copenhagen's DSB Regional/InterCity or
  Brussels' premetro naming questions).

## What I did not do

No live flip, no UI wiring, no D5 assertion tables, no adapter code, no `lib/providers/` or
`registry.js` edit, no live fetch of the official Wiener Linien PDF network map (used the five
Wikipedia line articles' own ordered station lists plus the alphabetical master table as the
checkable D1 source instead, per hazard-pack.md), no GTFS fetch (oracle report's H2 explicitly
says do not generate `published-network.json` from GTFS), no U5 station-graph work (out of v1
scope, service opens 2030), no resolution of the "Schedifkaplatz" naming gap (flagged, not
decided), no wiring of the proprietary OGD Realtime Monitor JSON schema, no edits to any other
city's pack.

## Lane status

Luke needs no lane-lock check (per CLAUDE.md: "Luke needs no check" — his whole write set is
`docs/vienna-d1/`, which no other lane touches). The pack is complete by the shape of every other
`docs/<city>-d1/` folder (4 files) and every claim in it is sourced. **The adapter build is
intentionally NOT started** — that's Jim's job (D2–D6), not this pack's.

## Jim (D2 adapter build), 27 Sep 2026 — Live verification

Wired `lib/providers/vienna.js` against the real Wiener Linien OGD Realtime Monitor
(https://www.wienerlinien.at/ogd_realtime/monitor). No key required — every claim below is a
genuine live HTTP call made this session, not a fixture or a documentation read.

**Method** (station -> RBL stopId resolution — the monitor takes RBL numbers, not GTFS
stop_ids and not DIVA station codes, neither of which this pack's D1 sources used):

1. Downloaded Wiener Linien's own public `wienerlinien-ogd-haltepunkte.csv`
   (StopID;DIVA;StopText;Municipality;MunicipalityID;Longitude;Latitude — a keyless static
   reference download, not the live feed itself) and folded-name-matched every candidate row
   against each of the 99 D1 station names/aliases from `published-network.json`.
2. Queried every candidate RBL against the real monitor endpoint (batched, multiple `stopId`
   params per request — confirmed the endpoint supports this), and kept a candidate only when
   the live response's own `lines[].type === "ptMetro"` and `lines[].name` matched that
   station's expected U1/U2/U3/U4/U6 line(s). This is what filters out the tram/bus/night-bus
   rows the monitor also returns at several shared-name stops.
3. Hit a transient rate limit partway through (`messageCode: 316`, `"Abfragelimit erreicht!"`
   — "query limit reached") — backed off and retried; two stations (Südtiroler
   Platz-Hauptbahnhof, Messe-Prater) needed a second, narrower pass after the CSV's folded-name
   match returned only non-metro candidates for them. Both resolved cleanly on retry.
4. Also captured each RBL's own `locationStop.geometry.coordinates` from the live response
   (not a separate geocoding source) to populate `lib/cities/vienna/stations.json`'s `lat`/`lng`.

**Result: all 99 D1 stations, all five lines, fully confirmed live** — every catalogued
station carries at least one RBL whose live response returned a `ptMetro` row for one of its
expected lines. No station was left partially or wholly unconfirmed.

**Karlsplatz (the hub lock) — independently reconfirmed live**, not just per the D1 pack's
Wikipedia-sourced claim: its RBL set resolved to exactly 5 platforms — 2 for U1 (rbl 4109
towards Leopoldau, 4120 towards Oberlaa), 2 for U4 (4416 towards Hütteldorf, 4421 towards
Heiligenstadt), and exactly **1** for U2 (4202, towards Seestadt — no Karlsplatz-bound U2
platform exists). This is the live-data confirmation of direction-model-memo.md section 2's
claim that Karlsplatz is U2's own terminus, not a through-station for it, and that only one
live U2 direction chip (`U2 + Seestadt`) can ever appear there. Sample live capture, 27 Sep 2026
~02:00 CEST (Vienna time; DST in effect):

```
rbl 4109  Karlsplatz  U1  towards Leopoldau  (ptMetro)
rbl 4120  Karlsplatz  U1  towards Oberlaa    (ptMetro)
rbl 4202  Karlsplatz  U2  towards Seestadt   (ptMetro)
rbl 4416  Karlsplatz  U4  towards Hütteldorf (ptMetro)
rbl 4421  Karlsplatz  U4  towards Heiligenstadt (ptMetro)
rbl 1680  Karlsplatz U  N46/N62 (ptBusNight — dropped, not U-Bahn)
rbl 1756  Karlsplatz U  WLB towards Wien Oper (ptTramWLB — dropped, not U-Bahn)
rbl 5943  Karlsplatz  WLB towards Wiener Neudorf (ptTramWLB — dropped, not U-Bahn)
```

**Two further stations sampled live via `fetchStationBoard()` itself** (not just the RBL
resolution pass), confirming the full adapter path end to end, not just URL construction:

- **Stephansplatz** (U1/U3 two-line interchange, not the hub): 19 live trips returned, all
  U1/U3, first row `U1 + Leopoldau` at display time 02:11 CEST.
- **Floridsdorf** (U6 north terminus): 5 live trips returned, all `U6 + Siebenhirten`, first
  row at display time 02:19 CEST.

**RBL candidates that were NOT kept** (tram/bus at a shared name, confirmed live, not
inferred): at Karlsplatz, `WLB` (Wiener Lokalbahnen tram, `ptTramWLB`) and `N46`/`N62` (night
buses, `ptBusNight`) both appeared in live monitor responses for RBLs whose `StopText` also
read "Karlsplatz"/"Karlsplatz U" — none of these were included in the catalog's `rbl` arrays,
per the oracle report's mode cut (U-Bahn only).

**Not done this session**: no live confirmation of Wiener Linien's static GTFS zip against a
real payload beyond the route_short_name check already reported in hazard-pack.md (the static
GTFS is not used as a live-boards source by this adapter at all — see
`lib/providers/vienna.js` file header); no live confirmation of every one of the 210 unique
RBL ids' coordinates independently cross-checked against a second geocoding source (all were
taken from the monitor's own `locationStop.geometry.coordinates`, which is Wiener Linien's own
data, not third-party); no resolution of the "Schedifkaplatz" naming gap (hazard-pack.md H3 —
still unresolved, doesn't affect scope since Badner Bahn is out-product regardless).

## Correction, 27 Sep 2026 (docs/jim-brief-vienna-u2-hub-bound-direction.md)

Mark's flip QA (docs/vienna-d1/mark-qa-note.md) found `/api/board` and `/api/directions` returned
zero entries for Seestadt despite six real live U2 departures there. Root cause: U2's
`LINE_TERMINI` in `lib/cities/vienna/marketing-directions.js` previously listed only Seestadt, so
Seestadt (U2's own terminus) had no other terminus to offer as a chip, and every Karlsplatz-bound
trip elsewhere on U2 fell back to the unmatched bare "U2" label. Fixed by adding Karlsplatz to
U2's `LINE_TERMINI` as a second, line-qualified, hub-bound chip ("U2 + Karlsplatz") — this does
not violate the hub lock, which forbids only a bare/generic hub token, not a line-qualified
hub-bound direction. Karlsplatz itself is unaffected (self-terminus skip still applies; only one
live U2 platform there, `towards: "Seestadt"`); U1/U4 are untouched. Full detail in
docs/vienna-d1/direction-model-memo.md's own "Correction, 27 Sep 2026" section.
