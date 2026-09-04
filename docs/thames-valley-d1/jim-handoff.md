Thames Valley D1 + research pack. City stays **planned** / "Coming Soon" until (a) National Rail
is unblocked (`DARWIN_LDB_TOKEN`) and (b) Jim wires testers live — this pack does not flip
anything. **assertCityLive("thames-valley") must fail** (city is not in
`lib/providers/registry.js` CITIES today — Unknown city / 400). No generator, no product edit. Jim
owns D2–D6. Do not flip thames-valley live from this pack. Do not touch West of England, Solent,
London & South East National Rail, or any other UK region — same account-level National Rail
blocker, but separate regions/packs.

Lane lock: acquired `United Kingdom` / `Thames Valley` / `luke` before writing (checked free first
— Solent's lock released post-merge, PR #181). Release happens post-merge, per CLAUDE.md
country-lane rule — not run by this pack.

Research pack is docs/thames-valley-d1/: published-network.json, oracle-clash-report.md,
hazard-pack.md, direction-model-memo.md, jim-handoff.md (this file).

## Architecture: hub + secondary-hub, reused from West of England/Solent — with a doNotGroup twist

**Reading (RDG)** is the hub lock — principal interchange, 15 platforms, three operators (GWR
primary, CrossCountry, SWR through-running) but **no internal doNotGroup** — the report explicitly
rules out multi-operator platform mixing at Reading (line 36), so it's a single flat
destination+operator board like Southampton Central in Solent's pack.

**Oxford (OXF)** is the secondary hub — but unlike Bath Spa (West of England) or Portsmouth &
Southsea (Solent), Oxford **needs doNotGroup: true**. GWR's main line and Chiltern Railways'
Marylebone branch sit on separate platforms and separate infrastructure at Oxford (report line 16,
37, 56, C2/C3 point 4/6) and the report explicitly calls for "separate boarding logic required per
operator." Build Oxford as two operator sections (GWR toward London/Reading/Bristol; Chiltern
toward Marylebone), not one flat list — see hazard-pack.md H4/H6 and direction-model-memo.md for
full reasoning.

## Through-running / not-built stations

Five through-running-only points, none are merge/hub candidates at D1:

- **Swindon (SWI)** — GWR main-line continuation, upstream of the Westbury boundary.
- **Banbury (BAN)** — Chiltern (Marylebone branch) + GWR (Paddington–Birmingham via Oxford), two
  TOCs on separate infrastructure at the same town. Not a hub; proposed doNotGroup only if ever
  promoted to a station group.
- **Westbury (WSB)** — boundary to West of England / Solent. GWR (Reading/Oxford) and SWR
  (Southampton/Portsmouth) share the platform, separate franchises. Already flagged reciprocally in
  both those regions' finished packs (`west-of-england-d1/published-network.json`,
  `solent-d1/published-network.json`) — consistent with this pack.
- **Henley-on-Thames (HOT)** — GWR branch, single operator, no through-running.
- **Didcot Parkway (DID)** — GWR main line, Cotswold Line connection point, single operator.

**London Paddington (PAD) and London Marylebone (MYB)** are the two London termini Thames Valley's
GWR/Chiltern services originate from — both belong to London & South East National Rail's catalog,
not Thames Valley's, and neither is built here. Paddington is already a built stationGroup in
`london-se-national-rail-d1/published-network.json`; Marylebone is explicitly **not** built there
either (sits in that pack's `notBuilt.secondary-termini` list). No double-build conflict exists
today for either terminus.

## Direction model recommendation

**Destination + operator** at both hubs — same model as every prior UK National Rail region. At
Oxford, this applies *within* each of the two doNotGroup sections (GWR section, Chiltern section),
not across them. No line+terminus model — neither GWR nor Chiltern brand this corridor with named
lines on a departure board, and inventing them would be guessing. **Illustrative only, not
verified** — no destination strings can be confirmed until `DARWIN_LDB_TOKEN` exists and a real
Darwin payload can be pulled. See direction-model-memo.md for full reasoning and options
considered.

## Skip risk — Chiltern operator transition (20 September 2026)

Chiltern Railways moves from Arriva to DfT Operator on 20 September 2026 (report skip risk 3).
Not a blocker, but a timing flag: whoever wires this adapter on or after that date should verify
Darwin correctly attributes Chiltern services and that any operator/agency mapping (if a GTFS
schedule-source supplement is ever wired) reflects the new operator structure. Flag this in QA if
the wiring date lands close to or after the transition.

## Open items for Tim only — do not resolve

1. **National Rail / OpenLDBWS redistribution terms are ambiguous.** OGL 2.0 baseline permits
   redistribution with attribution, but the Rail Data Marketplace Platform Agreement may restrict
   downstream redistribution to third-party rider clients — the operative clause isn't confirmed
   in public sources. Oracle report confidence: `unclear`. Tim needs to review the signed RDM Data
   Sharing Agreement once EvansAppStudio re-registers and receives a token.
2. **No static GTFS exists directly from NRE for this feed** (Transitland's derived feed is
   reference-only, CC-BY-2.0 UK, not pulled here). Confirm with Tim whether Next Train's
   architecture supports a Darwin-only realtime-board model, or whether a third-party GTFS
   supplement is required before this region can go live at all (independent of the account-level
   token blocker).
3. **Confirm the Oxford doNotGroup shape.** This pack's own judgment call, applying the report's
   explicit language (line 37, 56) rather than inventing a new architecture — but this is the
   first time in this pipeline a *secondary* hub (rather than a primary terminus) has needed an
   internal doNotGroup split, worth an explicit sanity check before Jim wires it.
4. **Chiltern operator transition timing (20 September 2026)** — see skip risk above.
5. **UK country ledger retrofit** — still overdue (no `docs/united-kingdom-ledger.md` exists as of
   this pack, despite being named as required before the next NR region across multiple prior
   regions' packs). Should run before the region after this one, not indefinitely deferred.

## H7 / license summary

Europe/London, HAS DST (BST/GMT). National Rail under OGL 2.0 + NRE amendments (unclear on
third-party redistribution — same open item as every other UK NR region). National Rail static
GTFS (Transitland) is CC-BY-2.0 UK, confidence `clear`, reference-only, not used to derive this
catalog.

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit,
no GTFS fetch/parse, no invented station-graph or stop-order facts beyond what the report's tables
state, no invented destination strings, no CRS verification against a live feed (Paddington and
Marylebone CRS codes are supplied for identification only, not sourced from either oracle report —
see published-network.json's `crsSource` notes on those two entries), no
`docs/united-kingdom-ledger.md` creation (flagged as overdue, not this pack's job to write), no
wiring of `DARWIN_LDB_TOKEN`, no reading of any other city's in-progress (unfinished) pack — West
of England, Solent, and london-se-national-rail's finished `published-network.json` files were read
only for the specific Westbury/Paddington-Marylebone reciprocal-flag consistency check the dispatch
instruction named, not for general context.

## 5 Sep 2026 — pre-adapter hygiene (Fable, top-level session)

- **CRS codes verified live against Darwin** with `scripts/fix-uk-region-crs.mjs thames-valley --write`:
  Henley-on-Thames was HEY (a 400 at Darwin) and is now **HOT**; the other seven entries were right
  (Oxford's two operator-split entries both resolve to OXF as designed). Corrected in `stations.json`,
  `published-network.json`, this pack's prose and the planned gate; coordinates filled from NaPTAN
  where missing. The adapter gate must carry the token-gated catalog sweep so this cannot regress.
- `DARWIN_LDB_TOKEN` exists (live since 2 Sep 2026); the account-level blocker framing above is
  resolved. Board eligibility section present, no `undecided` rows.

## 5 Sep 2026 — Adapter wired (Jim, docs/jim-brief-thames-valley-adapter.md)

**What was built:** `lib/cities/thames-valley/dogfood-next-train.js`
(`getThamesValleyDogfoodDirections`, `getThamesValleyDogfoodNextTrain`,
`planThamesValleyNextTrainFetch`, `listThamesValleyDogfoodStations`) over
`fetchStationBoard`/`fetchRegionalDepartureBoard` from
`lib/providers/uk-darwin.js` via the existing `lib/providers/thames-valley.js`
region config, wired through the shared hub helper
(`lib/cities/uk/direction-hubs.js`) with the national CRS index
(`lib/cities/uk/rail-crs-index.js`) as the exact-chip fallback — same shape as
West Yorkshire/Solent, copied structurally, not forked.
`lib/cities/live-city-api.js` gained `thames-valley` switch-cases in
`directionsFor()` and `getMultiCityNextTrain()` (dispatch is safe ahead of the
flip — production routes gate on `assertCityLive()` first, not on
`MULTI_CITY_IDS` membership). `qa/thames-valley-planned-gate.mjs` retired;
replaced by `qa/thames-valley-dogfood-gate.mjs`, registered in
`qa/run-all.mjs`'s smoke tier. `lib/providers/registry.js`'s thames-valley
`notes` field updated to record the live-verified adapter and the flip-commit
list additions Mark still owns; **`status` stays `"planned"`** — not flipped
by this pass. `thames-valley` was deliberately **not** added to
`MULTI_CITY_IDS`, the `MultiCityId` typedef, `brisbane-dogfood.js`'s
mount/available map, or `journey-model.js`'s persisted-city/country lists —
those are Mark's flip commit (`qa/live-city-lists-sync.mjs` enforces they
equal the registry's live set). `public/city-directions/thames-valley.json`
is **not generated pre-flip** — same posture as West Yorkshire (#215) and
Solent (#216): `qa/bundled-city-directions.mjs` only requires that file for
`MULTI_CITY_IDS` entries, and the pre-flip bundling escape hatch
(`EXTRA_BUNDLED_CITY_IDS`) is currently empty. It will be picked up
automatically by `scripts/write-city-directions.mjs` once Mark's flip adds
`thames-valley` to `MULTI_CITY_IDS`.

**CrossCountry discovery at Oxford (live-probed, not named by the D1
report):** the oracle report only names GWR and Chiltern Railways as
Oxford's two operators (report line 16, 37). Live probing 5 Sep 2026
(`scripts/probe-uk-board.mjs --crs=OXF`, and `--filter-crs=OXF` from
Banbury) showed CrossCountry genuinely calling at Oxford — Newcastle,
Manchester Piccadilly, Bournemouth, and Reading destinations, all on the
same main-line platforms GWR uses, not Chiltern's separate Marylebone-branch
infrastructure. CrossCountry's board-eligibility verdict is already recorded
`in` generally by the report (optional reservation only) — it just wasn't
station-scoped to Oxford. Adding it to the "Oxford (GWR)" board's
`operators`/`includeOperators` list (rather than a third sub-board) keeps
the walk-up rule satisfied without inventing a boarding-section split the
live evidence doesn't support: CrossCountry shares GWR's main-line
infrastructure at Oxford, not Chiltern's. Confirmed via live chip tables
below that neither Oxford board leaks the other's operator.

**Live evidence — Reading (hub, flat, no doNotGroup):** GWR/CrossCountry/SWR
all appear on one board, confirming report line 36 live. Sample (5 Sep 2026):
Basingstoke (GWR), Cheltenham Spa (GWR), Gatwick Airport (GWR), Great Malvern
(GWR), London Paddington (GWR), London Waterloo (SWR), Manchester Piccadilly
(CrossCountry), Newbury (GWR), Swansea (GWR).

**Live evidence — Oxford doNotGroup confirmed:**

| board | live chips (5 Sep 2026) |
| --- | --- |
| Oxford (GWR) — GWR + CrossCountry | Banbury (GWR), Bournemouth (CrossCountry), Didcot Parkway (GWR), Great Malvern (GWR), London Paddington (GWR), Manchester Piccadilly (CrossCountry), Newcastle (CrossCountry), Reading (CrossCountry) |
| Oxford (Chiltern) — Chiltern only | London Marylebone (Chiltern Railways) |

No chip crosses boards either direction — the split holds against a real
Darwin payload, not just the catalog config.

**Live evidence — the five through-running-only stations (all resolve, all
flat, no doNotGroup):**

| station (CRS) | live chips (5 Sep 2026) |
| --- | --- |
| Swindon (SWI) | Bristol Parkway, Bristol Temple Meads, Cheltenham Spa, London Paddington, Oxford, Swansea, Westbury, Weston-super-Mare (all Great Western Railway) |
| Banbury (BAN) | Birmingham Moor Street, Birmingham Snow Hill, Stourbridge Junction, London Marylebone (all Chiltern Railways); Bournemouth, Manchester Piccadilly, Reading (all CrossCountry); Didcot Parkway, London Paddington (Great Western Railway) |
| Westbury (WSB) | Bristol Temple Meads, Cardiff Central, Cheltenham Spa, Frome, London Paddington, Plymouth, Portsmouth Harbour, Salisbury (all Great Western Railway) |
| Henley-on-Thames (HOT) | Twyford (Great Western Railway) only |
| Didcot Parkway (DID) | Banbury, Bristol Parkway, Bristol Temple Meads, Cheltenham Spa, London Paddington, Oxford, Weston-super-Mare (all Great Western Railway) |

**Catalog CRS sweep:** all seven unique CRS codes (RDG, OXF, SWI, BAN, WSB,
HOT, DID — OXF shared by both Oxford boards, swept once) resolve at Darwin to
their catalogued station name; `qa/thames-valley-dogfood-gate.mjs`'s sweep
passes with `DARWIN_LDB_TOKEN` set.

**Hub decision: no `direction-hubs.json` shipped for v1.** All three
candidates the brief named were live-probed and rejected:

1. **Henley branch through to Reading** (would be a Kidderminster-shape hub,
   label "Reading", `filterCrs: RDG`): rejected. `node
   scripts/probe-uk-board.mjs "Henley-on-Thames" --region=thames-valley
   --filter-crs=RDG` returned **0 trips** — every HOT departure terminates at
   Twyford; none reaches Reading. Per the "if the filtered board doesn't show
   it, it isn't" rule, no hub is built.
2. **Operator split on "London Paddington"/"Reading" at Didcot/Swindon**
   (Liverpool shape): rejected. Both stations' boards filtered to
   calls-at-RDG (`--filter-crs=RDG`) show Great Western Railway only — no
   second operator prints the same terminus to collapse.
3. **Operator split on "Oxford" at Banbury** (Chiltern vs CrossCountry):
   rejected. Neither Banbury's full board nor its `--filter-crs=OXF` sample
   shows any train printing "Oxford" itself as a destination — GWR and
   CrossCountry trains that call at Oxford continue past it (to Didcot,
   Paddington, Bournemouth, Reading, Manchester Piccadilly), and Chiltern's
   Banbury departures go to Marylebone/Birmingham, never Oxford. No
   destination string exists to split.

If a future live pull shows a genuine split or through-run at any of these
stations, that is a fresh probe result, not a retrofit of this evidence —
re-run the probe script and update this section (or add
`lib/cities/thames-valley/direction-hubs.json`) at that point.

**Board eligibility:** unchanged from the "5 Sep 2026 — pre-adapter hygiene"
section above — GWR, CrossCountry, Chiltern Railways, and SWR all verdict
`in`, no `undecided` rows. CrossCountry's presence at Oxford (discovered
above) is covered by its existing general `in` verdict, not a new exclusion
question.

**QA:** `node qa/thames-valley-dogfood-gate.mjs` passes both token-free
(MissingDarwinTokenError-tolerant branches) and with `DARWIN_LDB_TOKEN`
loaded via `loadEnvLocal()` (exercises the live dispatch, live next-train,
the Oxford doNotGroup chip-leak assertions, and the 7-unique-CRS sweep for
real). `node qa/run-all.mjs --smoke` green.

**Not done in this pass:** no hub file (see decision above), no
`MULTI_CITY_IDS`/typedef/`brisbane-dogfood.js`/`journey-model.js` list edits
(Mark's flip commit), no `public/city-directions/thames-valley.json`
generation (picked up automatically once flipped), no live flip (`status`
stays `"planned"`), no shared-helper edit (`lib/providers/uk-darwin.js`,
`lib/providers/uk/catalog.js`, `lib/cities/uk/*` untouched beyond the
read-only imports above), no resolution of the Westbury/Paddington/Marylebone
boundary flags (still open, unchanged from the D1 pack), no
`docs/united-kingdom-ledger.md` creation (still overdue, flagged again, not
this pass's job).
