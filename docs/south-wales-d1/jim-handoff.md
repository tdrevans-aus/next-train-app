# Jim handoff - South Wales re-scope (7 Sep 2026)

**Re-scope, not a fresh build.** `lib/cities/south-wales/stations.json` currently has 2 stations
(Cardiff Central, Severn Tunnel Junction) and deliberately excludes Transport for Wales Valley
Lines on a premise this pack's report corrects (see `docs/south-wales-d1/oracle-clash-report.md`'s
"Re-scope 7 Sep 2026" section). This handoff tells you exactly what to change so the catalog
matches `published-network.json`'s 16-station `stationList`. Registry `status` stays `"planned"` -
this pack does not flip anything; that is Mark/Tim's call once QA is green.

## 1. `lib/cities/south-wales/stations.json` - replace `stops` wholesale

Replace the current 2-entry `stops` array with all 16 stations from
`docs/south-wales-d1/published-network.json`'s `stationList`. Every entry needs `mode: "train"`,
`crs`, real `lat`/`lng` (below - do not ship `null`, the old file's `lat: null`/`lng: null` is
exactly the gap `docs/luke-brief-uk-catalog-geocode.md` is chasing everywhere else; this pack
closes it for south-wales directly), and a `class` string carrying forward the notes in
`stationList`.

| name | crs | lat | lng | class note |
| --- | --- | --- | --- | --- |
| Cardiff Central | CDF | 51.47602538995 | -3.17930174024 | hub lock - Valley Lines (all six lines) + National Rail mainline, single Darwin board, operator-mixed |
| Cardiff Queen Street | CDQ | 51.48196153284 | -3.17018055435 | secondary hub - Valley Lines Rhondda/Merthyr junction only, no mainline through-running |
| Pontypridd | PPD | 51.59937017229 | -3.34137470984 | third-tier local hub - Valley Lines junction (Merthyr/Rhondda) |
| Newport | NWP | 51.58878898755 | -3.00054347097 | National Rail mainline hub, east of Cardiff |
| Swansea | SWA | 51.62514582504 | -3.94154604946 | National Rail mainline hub, **boundary station** - western edge of South Wales region |
| Bridgend | BGN | 51.50697351056 | -3.57527568317 | National Rail mainline, Cardiff-Swansea corridor |
| Barry Island | BYI | 51.39241342391 | -3.27336341989 | National Rail branch terminus |
| Penarth | PEN | 51.4358891543 | -3.17444075133 | National Rail branch |
| Caerphilly | CPH | 51.57157711257 | -3.21848198941 | Valley Lines local station |
| Merthyr Tydfil | MER | 51.74462170957 | -3.37725039469 | Valley Lines terminus (Merthyr line) |
| Aberdare | ABA | 51.71505790608 | -3.44308344608 | Valley Lines terminus (Aberdare line) |
| Treherbert | TRB | 51.6722431206 | -3.53630247917 | Valley Lines terminus (Rhondda line) |
| Rhymney | RHY | 51.75883740042 | -3.28929833943 | Valley Lines terminus (Rhymney line) |
| Neath | NTH | 51.66236095463 | -3.80721896671 | National Rail mainline, Swansea-Neath-Bridgend junction |
| Port Talbot Parkway | PTA | 51.59171799928 | -3.78131427074 | National Rail mainline |
| Severn Tunnel Junction | STJ | 51.58467671176 | -2.77789143612 | through-running only, Wales-England boundary - not a merge with Chepstow (CPW) |

All 16 CRS codes carry `"crsVerified": true` (live-probed 5 Sep 2026 per the report). Coordinates
pulled 7 Sep 2026 via `scripts/lib/uk-naptan.mjs`'s `loadUkNaptanIndex()` -> `coordsForCrs(crs,
name)` - the same NaPTAN RailReferences.csv (CRS -> ATCO) join + access-nodes.csv (ATCO -> lat/lng)
method Liverpool City Region and West Midlands used. **16/16 geocoded, no exceptions** - do not
re-derive or approximate any of these coordinates; re-run the same script if you need to verify.

Update the file's top-level `notes` array to describe the 16-station catalog and drop the
"Transport for Wales Valley Lines is DELIBERATELY EXCLUDED" line (now false) - replace with a line
recording that Valley Lines is in-catalog via Darwin, termini-only direction model (see
`direction-model-memo.md`), and that Coryton/Ebbw Vale termini are not yet catalogued (no CRS
confirmed in the 16-station live probe). Also update `source`/`retrievedAt` to point at this
re-scoped pack (7 Sep 2026) rather than the 1 Sep 2026 one.

**No doNotGroup entries needed anywhere in this file** - see hazard-pack.md H4/H6: Cardiff Central
is a single Darwin CRS/board (operator-mixed, no split needed); Cardiff Queen Street is a separate
CRS ~600 m away with no shared-board evidence, built as a separate plain entry, not grouped.

## 2. Region config (`lib/providers/registry.js`, `south-wales` entry, line ~394-405)

Update the `notes` prose (do not touch `status`, which stays `"planned"`):

- Drop the "Transport for Wales Valley Lines is deliberately EXCLUDED... genuinely no public feed
  exists" language - replace with: Valley Lines is confirmed on Darwin (live-probed 5 Sep 2026, all
  16 catalog CRS codes return boards), modelled as line + terminus, termini-only (four of six named
  termini catalogued: Merthyr, Aberdare, Treherbert/Rhondda, Rhymney; Coryton and Ebbw Vale termini
  not yet catalogued - no CRS confirmed).
- Update "Hub lock Cardiff Central (CDF) - not Cardiff Queen Street..." language - Cardiff Queen
  Street is now a **secondary hub in its own right** (own catalog entry, own board), not merely a
  name to exclude. Keep the existing caution against using "Cardiff" or "Cardiff Bay" as an
  ambiguous alias for either.
- The "proposed doNotGroup not built since there is no Valley Lines board to group against" line is
  now moot for a different reason: Valley Lines *is* on Darwin now, but it shares CDF's single
  Darwin CRS/board with mainline services rather than getting a separate board - so there is still
  nothing to group against, just for a different reason than before. Update the prose to say this
  plainly rather than leaving the stale "no board exists yet" framing.
- Keep the Severn Tunnel Junction / Chepstow (CPW) note but update it: **resolved**, per
  `docs/united-kingdom-ledger.md` SS2 (Tim, 5 Sep 2026) - both stations are in Wales on different
  corridors, both home South Wales, both stay through-running-only. This is no longer an open D2
  item; it's closed.
- Update the "81 stations per an explicitly-unverified Wikipedia list" line - that figure was for
  the *excluded* full Valley Lines network under the old scope; this pack catalogues 16 stations
  total (Valley Lines termini/junctions + mainline), sourced from the report's live-probed table,
  not Wikipedia. Keep a note that the ~70 intermediate Valley Lines halts across all six lines
  remain out of catalog (report's own secondary-tier note, line 50) - a future expansion pass, not
  a gap in this pass.
- Direction model note: destination+operator for mainline (illustrative, unchanged from before -
  still no live Darwin destination-string pull done); line+terminus (termini-only) for Valley
  Lines (new).
- Licensing note is unchanged and already correct (RDM DSA permits redistribution, RDG attribution
  wired PR #235) - no edit needed there.

## 3. `lib/providers/uk/regions.json` - no change expected

`south-wales`'s entry (line ~53) already points at `../../cities/south-wales/stations.json` and
uses the shared `uk-darwin.js` provider via allow-list. Since this is a region config over a shared
provider (per `docs/uk-architecture.md`), adding 14 stations to the allow-list should require no
code change here - verify this holds the same way Liverpool City Region's rescope did (`node
qa/south-wales-dogfood-gate.mjs` if one exists, or whatever planned-gate covers south-wales today;
if none is dedicated, check `qa/uk-planned-gate.mjs`'s generic loop covers it).

## 4. QA

Run `node qa/run-all.mjs --smoke` after the catalog edit. Add/extend `qa/uk-catalog-coords-gate.mjs`
coverage if that gate (per `docs/luke-brief-uk-catalog-geocode.md`) already exists by the time you
wire this - south-wales should now show 16/16 with coordinates, not 2/0. If the coords gate doesn't
exist yet, no action needed from this pack; the gate's own PR will pick south-wales up once
`stations.json` has real lat/lng.

## Open items for Tim only - do not resolve

1. **Coryton line and Ebbw Vale line termini have no confirmed CRS** in this 16-station catalog -
   the report's D1 summary names all six Valley Lines routes but the live probe only confirmed 16
   stations total, covering four of the six termini. A future expansion pass should live-probe the
   remaining two termini and the ~70 intermediate halts across all six lines (report line 50's
   secondary tier: Pengam, Nantgarw, Taff's Well, Ebbw Vale Town, etc.) before claiming full
   Valley Lines coverage.
2. **National Rail mainline and Valley Lines destination/terminus strings are illustrative only** -
   no live Darwin payload has been pulled for exact `trip_headsign`/destination text at any of the
   16 stations (the 5 Sep 2026 probe confirmed trip *counts* per CRS, not the destination strings
   themselves). Confirm against a real Darwin response before shipping the direction model.
3. **This is a re-scope of a city that was never flipped live** - `south-wales` stays `status:
   "planned"` throughout. No flip-commit follow-through (MULTI_CITY_IDS, LIVE_CITY_IDS, CITY_BOUNDS,
   etc.) is owed by this pack; that bundle only applies once Mark's QA checklist is green and Tim
   authorizes a flip.

## Not done in this pack (by design)

No `lib/` or `registry.js` edit (Jim's job, this file only tells you what to change), no generator,
no invented Coryton/Ebbw Vale CRS codes, no invented destination/terminus display strings beyond
the illustrative placeholders already flagged, no full Valley Lines stop-order, no edit to
Rest of Wales's pack or catalog (propagation rule - the boundary decision lives in
`docs/united-kingdom-ledger.md`'s propagation log, added by this pack, not in Rest of Wales's own
files), no reading of any other city's in-progress pack, no live flip.
