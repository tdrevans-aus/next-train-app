# Nico brief — United Kingdom country lane (retrofit)

**Dispatched:** 5 Sep 2026 · **Output:** `docs/united-kingdom-ledger.md` · **Spec:** `docs/country-lane.md`

This is a **country-scoped** Nico invocation, not a city run. The deliverable is one file,
`docs/united-kingdom-ledger.md`, in the four-section shape defined in `docs/country-lane.md`. It is a
**full pass** (triggers 1 and 2 both apply: Darwin is a national feed and UK regions overlap
heavily), not the Denmark-style light pass. Read `docs/denmark-ledger.md` only for tone; do not
copy its scope.

## Why now

The tracker's Countries sheet (`docs/expansion-tracker/countries.csv`, United Kingdom row,
`Country lane` column) says: *"To do — required before next NR region: one-Darwin-provider
decision, stop-ownership ledger (fold in glasgow/edinburgh/east-midlands boundary sections),
Eurostar/sleeper verdicts."* Four regions (West Yorkshire, Solent, Thames Valley, Greater Anglia)
have flip PRs open, and more National Rail regions are queued. The ledger must exist before the
next one enters the pipeline.

## Inputs to read (all in-repo; web only to verify a service's ticketing rule)

1. `docs/country-lane.md` — the output contract. Follow its four sections exactly.
2. `docs/board-eligibility-rule.md` — the verdict vocabulary (`in`, `out-reservation`,
   `out-checkin`, `out-product`, etc.). Use only those terms.
3. `docs/uk-architecture.md` — the existing "first home region wins" stop-ownership rule and the
   region ID set. The ledger formalises this; do not contradict it without saying so explicitly.
4. `docs/uk-provider-design.md`, `docs/uk-build-out-recommendation.md` — prior provider thinking.
5. `lib/providers/uk-darwin.js` (file header only), `lib/providers/uk/regions.json`,
   `lib/providers/uk/catalog.js` (header only) — what the shared provider actually is today.
6. `lib/providers/registry.js` — every entry whose `timeZone` is `Europe/London`. The `notes`
   fields carry most of the cross-region boundary facts (Tamworth, Chesterfield, Darlington,
   Denby Dale, Walsden, Taunton, Chepstow vs Severn Tunnel Junction, Berwick-upon-Tweed,
   Gloucester, Westbury, Lockerbie/Preston/Wigan/Settle, Fareham, Peterborough, Meadowhall,
   Sunderland shared platform, Rotherham Central inconsistency).
7. Every UK `docs/<region>-d1/oracle-clash-report.md` — specifically their Cross-Region
   Boundary and Board eligibility sections. UK region folders: cumbria, east-midlands, edinburgh,
   glasgow, greater-anglia, greater-manchester, leftover-england, liverpool-city-region,
   london-se-national-rail, north-east, rest-of-scotland, rest-of-wales, solent, south-wales,
   south-yorkshire, southwest, thames-valley, uk-west-midlands, west-of-england, west-yorkshire.
   Also read each region's `published-network.json` where it exists, for the actual catalogued
   station lists — stop ownership must be derived from what is *in catalogs*, not from prose.
8. `docs/expansion-tracker/cities.csv` United Kingdom rows — current status per region.

## Section-by-section requirements

### 1. Provider decision
- State the decision plainly: one shared Darwin (OpenLDBWS via Rail Data Marketplace REST)
  provider, `lib/providers/uk-darwin.js`; every National Rail region is a config (allow-list +
  direction model) over it, never a fork. TfL stays its own provider/city. Record what Metro,
  tram and subway feeds exist per region as *secondary* providers (TfWM Metro, Metrolink,
  Merseyrail, NET, Supertram, Tyne and Wear Metro, Edinburgh Trams, Glasgow Subway) with their
  current status — do not re-research these, cite the region pack.
- Auth and licensing: DARWIN_LDB_TOKEN status (live since 2 Sep 2026 per registry), and the
  standing open item that OpenLDBWS/RDM redistribution terms to third-party riders are
  unconfirmed against the signed Data Sharing Agreement. Record it once here as the single
  source; region packs should cite this, not repeat it.
- Northern Ireland: out of UK v1 (NIR is not on Darwin). Buses out. Record both.

### 2. Stop ownership
- A table: station · CRS · home region · other regions that touch it · basis (which pack/registry
  note) · status (`decided` / `contested — Tim`). Every boundary/shared station named anywhere in
  the inputs must appear. Known contested or inconsistent ones to resolve or explicitly hand to
  Tim: Denby Dale (West Yorkshire vs South Yorkshire), Tamworth (unclaimed, West Midlands vs
  East Midlands), Darlington (unclaimed, North East vs East Midlands), Chepstow vs Severn Tunnel
  Junction (West of England vs South Wales), Berwick-upon-Tweed (North East vs Rest of
  Scotland), Taunton (West of England vs Southwest), Chester (Rest of Wales vs Liverpool City
  Region), Peterborough (Greater Anglia vs East Midlands/London SE), Fareham (Solent vs
  London SE), Westbury/Gloucester, Walsden (West Yorkshire vs Greater Manchester, no GM
  counterpart yet), Preston/Wigan/Lockerbie/Settle (Cumbria edges).
- Apply "first home region wins" (the region whose merged pack first catalogued the station as
  more than through-running-only). Where two merged packs both catalogue a station, mark it
  `contested — Tim` with both claims; do not pick.
- Also record the doNotGroup two-layer stations (Nottingham, Sheffield, Newcastle Central,
  Cardiff Central, Bradford Interchange/Forster Square, Liverpool Lime Street, Manchester
  Piccadilly/Piccadilly Gardens) as a separate short list, since they are ownership-adjacent.

### 3. National-service verdicts
- One row per cross-region or national service, with verdict, the ticketing fact that drives
  it, and which stations it affects. Silence is a QA failure — every operator that runs across
  region boundaries needs a row. Required rows at minimum:
  Eurostar (`out-checkin`), Caledonian Sleeper (`out-reservation`), Night Riviera Sleeper
  (`out-reservation`), Heathrow Express, Stansted Express, Gatwick Express, Lumo, Hull Trains,
  Grand Central, LNER, Avanti West Coast, CrossCountry, TransPennine Express, GWR, EMR,
  Northern, ScotRail, Transport for Wales, Greater Anglia, Southeastern/Southern/Thameslink,
  South Western Railway, c2c, Chiltern, Elizabeth line (TfL vs NR ownership), London Overground
  (same), Merseyrail. Open-access operators and airport expresses are walk-up: check and say so.
  Verify any verdict you are not certain of via the operator's ticketing page; cite it.
- Where existing region packs already gave a verdict, cite the pack and confirm consistency.
  Flag any pack-to-pack contradiction rather than silently resolving it.

### 4. Coverage boundaries
- Where Darwin's stop-level data actually ends: NIR, Eurostar-only platforms, heritage lines,
  any tram/metro not on Darwin. Record which secondary feeds are confirmed, unconfirmed, or
  blocked (NET no RT, Supertram/SYFTL no feed, Tyne and Wear Metro GTFS too large, TfW Valley
  Lines no feed, Edinburgh Trams no static GTFS, Glasgow Subway schedule-only, TfWM credentials
  gap) — cite the registry note or pack, one line each.
- Note that National Rail has no static GTFS fallback anywhere (Darwin-or-nothing), so no region
  may scope past Darwin's live coverage.

## Ground rules
- Files only. You write `docs/united-kingdom-ledger.md` and nothing else. No code, no registry edits, no
  pack edits (earlier packs are immutable history; the ledger is current truth).
- Every row cites its basis. Nothing invented; unknowns are written as `unknown` or
  `contested — Tim`, never guessed.
- Add a short **Open items for Tim** list at the end: the contested stop-ownership rows, the
  redistribution-terms question, and any pack contradictions found.
- Add a one-line **Propagation log** section (empty table) for later regions to append to, per
  the propagation rule in `docs/country-lane.md`.
