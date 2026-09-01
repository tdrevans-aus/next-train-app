# UK architecture — regions, feeds, IDs (do not enable)

**For:** Jim (keep next to city adapters)  
**From:** Zoe / Tim  
**Date:** 23 Aug 2026  
**Status:** Architecture only. Build adapters **planned**, not live.  
**Related:** `docs/uk-provider-design.md` · `docs/uk-coding-brief.md` · `docs/jim-brief-uk-london-tfl.md` · `docs/multi-city-provider-design.md`  
**Supersedes (product, not code):** treating UK as a single `city=uk` catalog of 2,500 stations.

---

## 1. Locked product rules

| Rule | Lock |
|------|------|
| Country | Great Britain only. **Northern Ireland out** (separate railway). |
| Grain | **Region** = AU “city”. Not TOC. Not Network Rail’s five regions. |
| User object | A **stop**. Search / nearby / save a stop. Never pick a train company. |
| Allow-list | Region owns a stop table. A train may continue to an OUT name; do not add that stop. |
| Overlap | A stop may later sit in two regions (Lime Street). First home region wins until then. |
| Enable | Same gate as `docs/uk-provider-design.md`: code may exist; **nothing user-facing calls UK** until Tim flips it. |
| TZ | `Europe/London` for every GB region. |

---

## 2. How this sits on today’s spike

Today: `lib/providers/uk-darwin.js` + `lib/cities/uk/stations.json`, **not** in `registry.js`.

Keep **one Darwin adapter**. Add **region configs** that pass a CRS allow-list into it.

```
lib/providers/uk-darwin.js          shared NR board (already spiked)
lib/providers/uk-tfl.js             London TfL only (new, briefed separately)
lib/providers/uk-metro-wm.js        West Midlands Metro (new, with WM region)

lib/cities/uk-west-midlands/        stations.json (CRS + Metro ids)
lib/cities/uk-ellesmere-port/       stations.json (11 CRS)
lib/cities/uk-london-tfl/           stops.json (TfL ids, not CRS-only)
```

**Do not** register `uk` as one live city. Prefer region ids:

`uk-west-midlands` · `uk-ellesmere-port` · `uk-london-tfl`

Registry status stays `planned`. `?city=` for those ids stays **501**.  
`assertCityLive` for all UK region ids must fail until Tim says otherwise.

Env (server only, never git / client):

| Variable | Who |
|----------|-----|
| `DARWIN_LDB_TOKEN` | All National Rail regions (already in uk-provider-design) |
| `TFL_APP_KEY` | London TfL only |
| Metro / TfWM key | West Midlands Metro only, when you pick the official feed |

One Darwin token feeds every NR region. Filter by that region’s CRS list. Cache `(crs, filterCrs)` 15–30s as already noted in the Darwin doc.

---

## 3. Region set (stable IDs)

Deep-briefed now: **1, 2, 3**. Everything else is an ID + feed reservation. Do not build catalogs.

| id | Display | Why it is a region | Feed | Extra mode |
|----|---------|--------------------|------|------------|
| `uk-west-midlands` | West Midlands | WMCA + family testers. See `docs/uk-coding-brief.md` | Darwin + WM Metro | Metro (35 current) |
| `uk-ellesmere-port` | Ellesmere Port | Thin family corridor. Fold into Liverpool later | Darwin | — |
| `uk-london-tfl` | London | Different API and map language. TfL **rail only** | **TfL Unified**, not Darwin | Tube, Elizabeth, DLR, Overground, Trams |
| `uk-london-se-nr` | London & South East NR | Termini + commuter belt. Split later if it hurts | Darwin | — |
| `uk-manchester` | Greater Manchester | TfGM / Bee / Metrolink | Darwin + TfGM | Metrolink |
| `uk-liverpool` | Liverpool City Region | Absorbs EP corridor | Darwin | Merseyrail brand |
| `west-yorkshire` | West Yorkshire | Leeds CA | Darwin | — |
| `south-yorkshire` | South Yorkshire | Sheffield + Supertram | Darwin + tram | Supertram |
| `north-east` | North East | Nexus Metro | Darwin + Nexus | Metro |
| `east-midlands` | East Midlands | Nottm / Derby / Leicester + NET | Darwin + NET | NET |
| `west-of-england` | West of England | Bristol / Bath CA | Darwin | — |
| `south-wales` | South Wales | Cardiff + Valleys, TfW culture | Darwin | — |
| `rest-of-wales` | Rest of Wales | Same operator, lower density | Darwin | — |
| `glasgow` | Glasgow | ScotRail + Subway | Darwin + SPT | Subway |
| `edinburgh` | Edinburgh | Second Scottish city + trams | Darwin + trams | Trams |
| `rest-of-scotland` | Rest of Scotland | One ScotRail residual | Darwin | — |
| `leftover-england` | Residual England | Catch-all until testers appear | Darwin | — |

**Naming note (updated 1 Sep 2026):** the `uk-` prefix above was the original plan but was dropped
starting with West Yorkshire/South Yorkshire/North East/East Midlands onward — every region actually
registered in `lib/providers/registry.js` since then uses a plain kebab-case id with no prefix (check
that file for ground truth, this table is a planning reference and can drift). The first five regions
(`uk-west-midlands`, `uk-ellesmere-port`, `uk-london-tfl`, `uk-manchester`, `uk-liverpool`) kept their
original prefixed ids since they were already registered before the convention changed — don't rename
them retroactively.

**Not ids:** TOC names, `eastern`, `southern`, `uk` as a dump of all CRS.

Break `uk-london-se-nr` or `uk-england-rest` only when a real tester catchment appears (Solent, Thames Valley first).

---

## 4. Launch order

1. `uk-west-midlands` — `docs/uk-coding-brief.md`
2. `uk-ellesmere-port` — same file
3. `uk-london-tfl` — `docs/jim-brief-uk-london-tfl.md`
4. `uk-manchester`
5. `uk-liverpool` (absorb EP allow-list)
6. Then Glasgow / West Yorkshire / North East by tester demand

Learn from 1–2 before writing more station lists: Darwin in-app, OUT destinations, dual feeds, whether CA is the right size.

---

## 5. What every region config must have

Same `CityConfig` as AU (`docs/multi-city-provider-design.md`):

`id` · `timeZone=Europe/London` · `displayName` · `modes` · `stationCatalog` · `directionAliases` / `lineGroups` · `auth` · `provider`

Plus UK-only:

| Field | Purpose |
|-------|---------|
| `crsAllowlist` | National Rail stops in this region (omit for TfL-only) |
| `continuesToOk` | Destinations may be outside the catalog |
| `attribution` | NRE and/or TfL / TfWM / Merseyrail as required |

---

## 6. Do not

- Enable any UK region in the registry or city picker.
- Clone a second Darwin stack.
- Generate published maps from GTFS.
- Brief 2,500 CRS into `lib/cities/uk/stations.json`.
- Put Tube arrivals through Darwin.
- Put West Midlands Metro through Darwin.
- Impersonate TfL / National Rail in the UI.

---

## Version

| Date | Change |
|------|--------|
| 2026-08-23 | First cut. Regions + shared Darwin. TfL as its own adapter. |
