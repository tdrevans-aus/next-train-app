# UK station fill phase 1 — source and licensing

Companion to `docs/jim-brief-uk-station-fill-phase1.md`. Covers the candidate dataset, its
licence, and why the shipped data does not simply copy it.

## Candidate dataset

`https://raw.githubusercontent.com/davwheat/uk-railway-stations/main/stations.json`, fetched
13 Sep 2026. 2,608 records of `{stationName, lat, long, crsCode, constituentCountry}` covering
every GB National Rail station the maintainer has catalogued. Confirmed it contains the stations
this brief specifically names as missing: Carlton (CTO), Burton Joyce (BUJ), Edinburgh Park (EDP).

**Licence:** the GitHub repo's own metadata (`GET /repos/davwheat/uk-railway-stations`) reports
`license.spdx_id: "ODbL-1.0"` — the Open Data Commons Open Database License, the same licence
OpenStreetMap ships under. ODbL is a share-alike database licence: redistributing a "substantial"
extraction obliges attribution and requires any derivative database to also carry ODbL (or a
compatible licence). That is a real encumbrance for this app's own catalog files, which the app
does not otherwise carry for any other city or country's station data (NaPTAN/ORR data used
everywhere else in this codebase is OGL, simple-attribution, no share-alike).

**Decision: use the dataset only as a discovery/candidate list, never as the shipped source of
record.** Concretely:
- Station *names* and *CRS codes* shipped in the four regions' `stations.json` files come from
  Darwin's own `GetDepartureBoard` response (`stationName`) for that CRS — an independent,
  government-licensed real-time feed, not copied from the ODbL file.
- Station *coordinates* come from NaPTAN `RailReferences.csv` (`scripts/lib/uk-naptan.mjs`,
  `coordsForCrs`), the same OGL source every other UK region in this codebase already uses for
  its coordinates (see e.g. edinburgh/glasgow/east-midlands's own "Coordinates:" notes).
- The davwheat file is read once, offline, to build a list of `{name, lat, long, crsCode}`
  candidates to go and look up — the same role the brief's own wording gives it ("Candidate
  dataset"). None of its content is written into any committed catalog file.
- **Two exceptions, coordinates only:** Robroyston (RRN, Glasgow, opened 2008) and Kintore (KTR,
  rest-of-scotland, reopened 2020) are missing from the NaPTAN `RailReferences.csv` snapshot
  pulled 13 Sep 2026 (both are newer than whatever snapshot the fallback gist/API currently
  serves). For these two only, the candidate dataset's own lat/long pair is used directly, flagged
  in each entry's `class` field. A single coordinate pair per station is not a "substantial"
  database extraction in any plausible reading of ODbL share-alike, but it is called out here for
  completeness and so a future NaPTAN refresh can replace it with a confirmed source.

This mirrors the brief's own fallback instruction ("if the licence is unclear, prefer ORR") in
spirit: ODbL here is not *unclear*, it is clear and simply too heavy to ship as canonical product
data, so the same practical outcome (don't ship the ODbL-licensed facts verbatim) is reached by a
different, more precise route — Darwin + NaPTAN were already the two live, low-friction,
OGL-licensed sources this codebase uses for every other UK region, so reusing them here needed no
new licensing decision at all.

## Live verification

Every candidate CRS was probed against Darwin's `GetDepartureBoard` via
`lib/providers/uk-darwin.js`'s `fetchDepartureBoard()` (the same production path
`scripts/probe-uk-board.mjs` calls), one station at a time with a ~1.6s delay between calls
(comfortably under the ~40 boards/min budget noted in `docs/united-kingdom-ledger.md` §"Push
Port ... rejected"). A station is shipped only if:
1. Darwin returns a 200 (no HTTP error), and
2. Darwin's own `stationName` matches the candidate name (case/punctuation-insensitive
   containment match — Darwin sometimes abbreviates, e.g. "Prestwick Intl Airport" for
   "Prestwick International Airport", accepted as the same station on manual review).

Any CRS that fails either check is excluded and listed in `docs/uk-station-fill/unverified.md`,
never shipped. Every shipped train entry carries `crsVerified: true` and
`crsSource: "live Darwin probe 2026-09-13"`.

## Reverse-geocoding for region assignment

Council-area lookups used for the assignment rule (`docs/uk-station-fill/assignment.md`) came
from OpenStreetMap Nominatim's reverse-geocoding endpoint (`nominatim.openstreetmap.org/reverse`,
rate-limited to ~1 req/sec per its usage policy, a descriptive `User-Agent` sent on every call).
Nominatim is used here only to classify each candidate into a council area for routing purposes —
no Nominatim-derived data (names, coordinates, or place data) is written into any shipped catalog
file.

## Counts

| Region | Before | New (this pass) | After |
|---|---|---|---|
| edinburgh | 3 rail | +34 | 37 rail (+ 22 existing tram = 59 total) |
| glasgow | 2 rail | +176 | 178 rail (+ 15 existing metro = 193 total) |
| rest-of-scotland | 9 rail | +138 | 147 rail (147 total, no metro) |
| east-midlands | 6 rail | +99 | 105 rail (+ 4 existing NET = 109 total) |
