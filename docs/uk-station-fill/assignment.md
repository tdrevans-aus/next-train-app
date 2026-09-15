# UK station fill phase 1 — region assignment

Companion to `docs/jim-brief-uk-station-fill-phase1.md`. Records the rule actually applied and
every borderline call, per the brief's instruction ("ledger consistency is what Mark gates on").

## Scotland: edinburgh / glasgow / rest-of-scotland

**Method.** Every one of the 363 Scottish stations in the candidate dataset
(`docs/uk-station-fill/source.md`) not already in one of the three catalogs was reverse-geocoded
(OpenStreetMap Nominatim) to a UK council area, then bucketed:

- **Glasgow** if the council area is one of: Glasgow City, East Renfrewshire, Renfrewshire,
  Inverclyde, East Dunbartonshire, West Dunbartonshire, North Lanarkshire, South Lanarkshire,
  East Ayrshire, North Ayrshire, South Ayrshire — the Strathclyde (former SPT) footprint named in
  the brief's assignment rule.
- **Edinburgh** if the council area is one of: City of Edinburgh, East Lothian, Midlothian,
  West Lothian — the brief's "commuter stations into Waverley" footprint. Fife stations (Fife
  Circle, north of the Forth) are never in this set, so they fall through to rest-of-scotland
  automatically, matching the brief's explicit carve-out.
- **Rest of Scotland**: everything else.
- **Falkirk High** (Falkirk council area, in neither set by council) is special-cased to Edinburgh
  per `docs/united-kingdom-ledger.md` section 2 (Tim, 5 Sep 2026 — "Edinburgh's boundary station,
  Edinburgh–Glasgow via Falkirk High is Edinburgh's flagship commuter corridor").

**Borderline call: the Ayrshire coast boundary.** The brief's rule reads "Ayrshire (to Ayr/Largs)"
— read literally, this bounds Glasgow's Ayrshire footprint at Ayr, not the whole of South
Ayrshire council (which also contains Maybole, Girvan and Barrhill, further south toward
Stranraer). Council-area geocoding alone would have put all of South Ayrshire in Glasgow,
including that sparser long-distance-only tail. Applied instead: Ayr, Prestwick, Troon, Barassie
and Newton-on-Ayr (the frequent, electrified Glasgow–Ayr suburban service) stay Glasgow;
**Maybole, Girvan and Barrhill moved to rest-of-scotland** as the sparser, non-suburban corridor
beyond Ayr. Largs (North Ayrshire/Inverclyde area) has no equivalent further-out tail, so no
similar cut was needed there.

**Falkirk High** is now a real catalogued station in Edinburgh's list (previously excluded/
`notInRegion` pending the ledger ruling — the ruling has since landed, this pass just acts on it).

**Robroyston (glasgow, RRN)** and **Kintore (rest-of-scotland, KTR)** are missing from the NaPTAN
`RailReferences.csv` snapshot pulled 13 Sep 2026 (both post-date whatever snapshot the fallback
source currently serves — Robroyston opened 2008, Kintore reopened 2020). Darwin-verified and
shipped; coordinates come from the candidate dataset instead of NaPTAN for these two only, see
`docs/uk-station-fill/source.md`.

**Two rail/other-mode doNotGroup collisions found and recorded** (same printed name, different
mode, genuine interchange stations — not merged, kept as two distinct catalog entries per the
existing pattern at Waverley/Haymarket and Buchanan Street/Queen Street):
- Edinburgh: **Edinburgh Gateway** — National Rail (new, EGY) vs Trams (existing). Added to
  `lib/cities/edinburgh/tram-directions.js` `DO_NOT_GROUP_PAIRS`.
- Glasgow: **Partick** — National Rail (new, PTK) vs Subway (existing). Added to
  `lib/cities/glasgow/subway-directions.js` `DO_NOT_GROUP_PAIRS`.

**Caledonian Sleeper — not extended.** Per the brief, `excludeOperators` was not added to any
newly-shipped station without direct evidence the Sleeper calls there. The existing four
exclusions (Aberdeen, Inverness, Fort William, Mallaig) are untouched. Real-world Sleeper calling
points that plausibly need the same treatment but are **not actioned here** (flagged for whoever
next touches Caledonian Sleeper board eligibility, with a live Darwin filtered-board check before
adding): Stirling, Perth, Pitlochry, Blair Atholl, Dalwhinnie, Aviemore, Carrbridge (Highland
portion, Perth–Inverness); Crianlarich, Rannoch, Corrour (West Highland/Fort William portion).

## East Midlands

**Method.** Every station in the candidate dataset within a generous bounding box around the six
named counties was reverse-geocoded to a council/unitary-authority name, then kept only if:
1. its CRS is not already catalogued in any other UK region's `stations.json` (checked against
   all 19 GB region catalogs' train CRS lists), and
2. its council/unitary-authority name is one of: Nottinghamshire, Derbyshire, Leicestershire,
   Northamptonshire, Rutland, Lincolnshire.

**Bug caught before shipping: Northamptonshire's 2021 unitary reorganisation.** Reverse-geocoding
returns "North Northamptonshire" and "West Northamptonshire" (the post-2021 unitary authorities),
never the bare county name "Northamptonshire" — the first classification pass used only the
literal county name and silently dropped four real, unowned, in-county stations (Corby, Kings
Sutton, Long Buckby, Northampton) into the out-of-county exclusion pile. Caught on review, county
set corrected to include both unitary names, all four re-verified live against Darwin and shipped
(all OK — COR, KGS, LBK, NMP).

**Borderline call: Kings Sutton (KGS).** Sits on the Chiltern Banbury–Oxford–Marylebone corridor,
geographically closer to Thames Valley's Banbury/Oxford territory than to Nottingham. Checked
Thames Valley's own catalog and `docs/united-kingdom-ledger.md` section 2 — neither claims it.
Administratively it is West Northamptonshire, inside this brief's named county list, and adding
it creates no cross-region conflict (no other region catalogs it). Shipped to East Midlands per
the letter of the rule; flagged here in case Thames Valley's next catalog touch has a stronger
claim.

**Already-owned exclusions checked and left untouched** (not reassigned, per the brief): every
West Midlands station in the bounding box (Birmingham-area stations reach into the box's western
edge), Cambridge/Ely/Kings Lynn/Peterborough (Greater Anglia), Banbury (Thames Valley),
Huddersfield/Denby Dale (West Yorkshire), and South Yorkshire's Darton/Meadowhall/Moorthorpe/
Rotherham Central/Sheffield/South Elmsall. Chesterfield and Alfreton were already in East
Midlands' own catalog (per `docs/united-kingdom-ledger.md`'s "Chesterfield deliberately excluded
— East Midlands' station, not South Yorkshire's" note) — untouched, not re-added.

**Tamworth (TAM)** stays excluded from this catalog, unchanged — still West Midlands' per the
ledger; this brief does not touch West Midlands' own catalog.

**doNotGroup collision found and recorded:** **Hucknall** — National Rail (new, HKN) vs NET tram
(existing terminus). East Midlands has no structural `DO_NOT_GROUP_PAIRS` array (unlike
Edinburgh/Glasgow) — the existing pattern here (see Nottingham Station's own entry) is a prose
note on each entry's `class` field, which this follows.

**Naming collision, not a data problem:** Netherfield's CRS code is **NET**, the same letters used
throughout this pack as shorthand for Nottingham Express Transit (the tram operator). No functional
collision — CRS codes and mode/operator abbreviations are different fields, never compared to each
other — but noted here in case a future prose pass conflates them.

---

# UK station fill phase 2a — region assignment

Companion to `docs/jim-brief-uk-station-fill-phase2a.md`. Same candidate dataset and probe method
as phase 1 (`docs/uk-station-fill/source.md`), applied to the fifteen remaining Darwin regions
(every UK region except edinburgh/glasgow/rest-of-scotland/east-midlands, done in phase 1, and
uk-london-tfl, which is TfL not Darwin).

## Method

1. Every candidate CRS already catalogued anywhere (any mode, not just `mode: "train"` — see the
   Merseyrail correction below) is excluded from consideration.
2. Welsh candidates (`constituentCountry: "wales"`) go to south-wales if their coordinates fall in
   its own `CITY_BOUNDS` box (public/city-session.js, read-only reference — not edited this
   phase), else rest-of-wales. Wales ends fully assigned.
3. English candidates are matched against the fifteen target regions' own `CITY_BOUNDS` boxes, in
   the same relative order they appear in that file (so e.g. south-wales is still checked before
   west-of-england for a genuinely Welsh-adjacent boundary station). A candidate with no box match
   goes to `unassigned-england.md`.
4. Each region's own existing `notInRegion` array and any hardcoded "must never resolve" gate
   assertion is treated as a higher-priority signal than the geometry (per the brief's assignment
   order: own pack/registry note, then the ledger, then geography) — see the West Midlands and
   Rest of Wales findings below.

## Corrections made to the box-only geometry pass (found before shipping)

**"Already catalogued" must check every mode, not just `mode: "train"`.** Liverpool City
Region catalogues all 68 Merseyrail stations under `mode: "metro"` (Merseyrail is Darwin-served,
see `docs/united-kingdom-ledger.md` §3), but each entry still carries a real `crs` field. A
train-mode-only exclusion check would have re-added all 55 of those as "new" National Rail
stations, duplicating existing metro entries under a different mode. Fixed before generating any
output — the classifier now excludes any stop with a `crs` field, any mode.

**solent's and thames-valley's `CITY_BOUNDS` boxes reach across all of Greater London.** Both
boxes are drawn wide (tuned only for GPS-hint purposes around their small pre-existing catalogs),
and geometrically also cover central London — sampling caught 211 of solent's 399 raw candidates
being inner-London stations (Balham, Brixton, Bethnal Green, Bond Street, Battersea Park). None of
those are Solent or Thames Valley territory; london-se-national-rail's own box legitimately covers
the same area and is the correct home. Fixed by excluding solent/thames-valley from the England
box-match whenever a candidate also falls inside Greater London (the same rectangle as
uk-london-tfl's own `CITY_BOUNDS` entry) — the candidate then falls through to
london-se-national-rail's box instead, which is what actually happens (526 additions there, a
number that size only made sense once this was traced and fixed).

**south-wales's and rest-of-wales's own boxes reach into England.** Similarly, rest-of-wales's box
(a broad three-corridor North/Mid/West Wales rectangle) geometrically also covers 17 genuinely
English Welsh-Marches/Shropshire/Herefordshire border stations (Shrewsbury, Hereford, Ludlow,
Leominster, Craven Arms, Church Stretton, Gobowen, Knighton, Wem, Whitchurch (Shropshire), Broome,
Bucknell, Hopton Heath, Prees, Yorton, Delamere, Mouldsworth), and south-wales's box similarly
covers 3 Somerset stations near Weston-super-Mare (Nailsea & Backwell, Worle, Yatton). Since a
Welsh candidate is always routed to a Wales region regardless of box match (per the brief's "Wales
ends fully assigned" rule), this only affected *English* candidates being wrongly pulled into a
Wales region by geometry. Fixed by excluding south-wales/rest-of-wales from the England box-match
entirely — English candidates never resolve to a Welsh region regardless of box overlap; the
dataset's own `constituentCountry` field decides Wales vs England, never the box. The three
Somerset stations correctly land in west-of-england instead (its own box already covers them).

## West Midlands: zero new stations this phase (not an oversight)

Every one of uk-west-midlands's 39 raw box-matched candidates (Albrighton, Alvechurch, Atherstone,
Barnt Green, Bedworth, Bermuda Park, Bilbrook, Blakedown, Bromsgrove, Cannock, Claverdon, Codsall,
Coleshill Parkway, Cosford, Danzey, Droitwich Spa, Hagley, Hartlebury, Hatton, Henley-in-Arden,
Kenilworth, Landywood, Lapworth, Leamington Spa, Lichfield City, Lichfield Trent Valley, Nuneaton,
Polesworth, Redditch, Shenstone, The Lakes, Warwick, Warwick Parkway, Water Orton, Wilnecote,
Willenhall, Wood End, Wootton Wawen, Wythall) is either already named in uk-west-midlands's own
24-entry `notInRegion` array or geographically the same kind of station (Staffordshire,
Warwickshire, Worcestershire or Shropshire) — all outside the West Midlands *metropolitan county*
boundary that array already establishes, a tighter boundary than uk-west-midlands's own
`CITY_BOUNDS` box (which, like every other region's box, is a GPS-hint rectangle, not the region's
actual served-area boundary). None of the other fourteen target regions is named for those
counties either. Per the brief's explicit "do not widen a region beyond its name to absorb
stragglers" instruction, all 39 go to `unassigned-england.md` instead of being force-fit into
uk-west-midlands. This is the single largest concrete illustration of why phase 2b (a dedicated
"Rest of England" region) is needed, not a gap in this pass.

## Liverpool City Region: Warrington excluded, Wigan reassigned

Liverpool City Region's own `notInRegion` array already named nine stations as deliberately not
its own (Warrington Bank Quay/Central/West, Wigan North Western/Wallgate, Manchester
Piccadilly/Victoria/Oxford Road/Manchester Airport) — the last four already live in
greater-manchester's own catalog or box-match there correctly. The remaining five needed a
decision:
- **Warrington Bank Quay/Central/West** → `unassigned-england.md`. Warrington Borough Council is a
  unitary authority in the ceremonial county of Cheshire, in neither Merseyside (Liverpool City
  Region) nor Greater Manchester's combined authority.
- **Wigan North Western/Wallgate** → **greater-manchester**. Wigan Metropolitan Borough is one of
  the ten Greater Manchester Combined Authority boroughs, and `docs/united-kingdom-ledger.md`
  section 2 explicitly flagged Wigan as "unclaimed — not contested — flagged for whoever builds
  the adjacent region" — this phase builds greater-manchester, so it claims it. (Their coordinates
  fall outside greater-manchester's own tight `CITY_BOUNDS` box, same trade-off already documented
  elsewhere in `public/city-session.js` for other real boundary stations — not fixed this phase,
  box is out of scope.)

## Preston: still deliberately unclaimed

`docs/united-kingdom-ledger.md` section 2 names Preston (Lancashire) as "unclaimed — not contested
— flagged for whoever builds the adjacent region." No target region in this phase is named for
Lancashire, so per the same "don't widen a region to absorb stragglers" rule as West Midlands,
Preston stays unclaimed — listed in `unassigned-england.md`, not force-fit into
liverpool-city-region or greater-manchester.

## Ledger-decided overrides that superseded a region's own stale exclusion note

**Darlington (DAR) → north-east.** North East's own `stations.json` note said "EXCLUDED -
confirmed unclaimed... do not add without a boundary resolution," written before
`docs/united-kingdom-ledger.md` section 2 later decided (Tim, 5 Sep 2026) that Darlington's home
region is North East (County Durham/ECML, no real second claimant). Per the brief's assignment
rule order (own pack, THEN the ledger, THEN geography), the ledger's later, more specific ruling
wins — Darlington is added, the stale note and the region's own `notInRegion` entry are both
corrected, and `qa/north-east-dogfood-gate.mjs`'s previous "Darlington must not resolve" assertion
is inverted to "must resolve."

## Previously-excluded stations that are real once added

Three stations were previously the subject of "must never resolve" QA assertions written when a
pack was small and each name looked like an ambiguous/unbuilt alias — station-filling proved all
three are real, Darwin-verified, distinct stations:
- **Cardiff Bay (CDB)**, south-wales — a real Bay Line terminus, not a Cardiff Central/Queen
  Street alias.
- **Wrexham Central (WXC)**, rest-of-wales — a real, lower-connectivity terminus distinct from the
  Wrexham General hub lock.
- **London Euston, London Blackfriars, London Cannon Street, London Charing Cross, London
  Fenchurch Street, London Marylebone, Farringdon, Moorgate**, london-se-national-rail — the
  D1 pack's original seven-group scope deliberately left these unbuilt; the full station fill adds
  them as real stations (Darwin's own `stationName` carries a "London " prefix for six of them,
  which is why the bare marketing tokens — "Euston", "Blackfriars", etc. — still correctly fail to
  resolve, only the full printed name does).

Each of these three regions' `qa/*-dogfood-gate.mjs` and `qa/uk-region-catalog-conformance.mjs`
assertions were updated from "must not resolve" to "must resolve with crs X," not just relaxed.

## Elizabeth line/London Overground-exclusive stations are uk-london-tfl's, not Darwin's

Six candidates in london-se-national-rail's raw box match — Bond Street, Canary Wharf (Elizabeth
line), Custom House, Tottenham Court Road, Woolwich (Elizabeth line), Barking Riverside — all
verified against Darwin (it does answer a `stationName` for them) but all shipped with `(0, 0)`
coordinates from the NaPTAN lookup, the tell that surfaced this: NaPTAN's `RailReferences.csv` has
no coordinate record for any of them, because none of them are legacy National Rail facilities.
Per `docs/united-kingdom-ledger.md` §3 ("every Elizabeth line stop [is] TfL's... same for
[London] Overground... no Darwin-side Elizabeth line entries exist in any region pack"), these six
are uk-london-tfl's, not london-se-national-rail's, regardless of Darwin technically answering for
them. Removed from the catalog (530 shipped, not 536); `qa/uk-station-fill-audit.mjs` carries a
small named exception set for these six CRS so the audit doesn't wrongly flag them as unowned
(uk-london-tfl's own catalog format has no `crs` field to cross-reference against).

## Direction-model collisions held back, not force-added

Nine genuine, Darwin-verified National Rail stations share a printed name with an existing
Metrolink/Tyne and Wear Metro stop **whose bare name is also hardcoded in that region's own
`marketing-directions.js` line+terminus direction model** (unlike east-midlands's Hucknall or the
uk-west-midlands/edinburgh/glasgow "(Metro)"-suffix precedent, where no direction-model file
referenced the bare name): greater-manchester's Altrincham, Eccles, Manchester Airport, Rochdale;
north-east's Brockley Whins, East Boldon, Heworth, Manors, Seaburn. Renaming the metro-mode
catalog entry (the usual fix for this class of collision) would decouple it from its own
direction-model termini list — real "second modes... untouched" territory the brief rules out
touching. Held back from this phase's catalog additions and listed in `unassigned-england.md`
instead, with the specific reason recorded per station; a follow-up that also touches
`marketing-directions.js` can resolve it properly.

## Per-region counts

| Region | Before (rail) | New (this pass) | After (rail) | Other-mode (unchanged) | Total |
|---|---|---|---|---|---|
| uk-west-midlands | 75 | +0 | 75 | 35 | 110 |
| south-yorkshire | 6 | +15 | 21 | 12 | 33 |
| north-east | 3 | +25 | 28 | 60 | 88 |
| west-of-england | 6 | +41 | 47 | 0 | 47 |
| southwest | 9 | +80 | 89 | 0 | 89 |
| cumbria | 7 | +42 | 49 | 0 | 49 |
| south-wales | 16 | +88 | 104 | 0 | 104 |
| west-yorkshire | 10 | +72 | 82 | 0 | 82 |
| rest-of-wales | 17 | +101 | 118 | 0 | 118 |
| london-se-national-rail | 10 | +520 | 530 | 0 | 530 |
| solent | 7 | +188 | 195 | 0 | 195 |
| thames-valley | 8 | +56 | 64 | 0 | 64 |
| greater-manchester | 4 | +43 | 47 | 14 | 61 |
| liverpool-city-region | 29 | +30 | 59 | 68 | 127 |
| greater-anglia | 14 | +107 | 121 | 0 | 121 |

`unassigned-england.md`: 445 verified English stations with no home this phase (includes West
Midlands' 39, Warrington's 3, Preston, and the 9 direction-model collisions). `unverified.md`
gained 3 genuine exclusions (Bingham — already known from phase 1 as the same station; Parton —
new, live Darwin 404 gap) plus 20 name-mismatch candidates accepted on manual review as
abbreviation/punctuation variants (same pattern as phase 1's Prestwick review) — see
`docs/uk-station-fill/unverified.md`.

## UK station fill phase 2b — Rest of England (14 Sep 2026)

Companion to `docs/jim-brief-uk-station-fill-phase2b.md`. Builds a new `rest-of-england` region
(status `planned`) directly from `docs/uk-station-fill/unassigned-england.md`'s 445-station list —
no Nico/Luke D1 pack, no bounding-box/county classification pass: every row in that file that
wasn't held back (see below) is catalogued as-is, since phase 2a already live-verified each one
against Darwin and recorded exactly why no named region claimed it.

**436 stations → `rest-of-england`.** `lib/cities/rest-of-england/stations.json`, flat train-only
allow-list, no hub lock, no corridor grouping — this catalog spans the whole of England so no
single station is structurally a hub. `crsVerified: true`/`crsSource: "live Darwin probe
2026-09-14"` carried forward from phase 2a rather than re-probed (the brief's own instruction:
"they already were in 2a"). Region config over the shared `uk-darwin.js` provider (allow-list, no
fork), same pattern as every other UK region.

**9 stations → `greater-manchester`/`north-east` instead, not `rest-of-england`.** The nine
direction-model collisions phase 2a held back (Altrincham, Eccles, Manchester Airport, Rochdale;
Brockley Whins, East Boldon, Heworth, Manors, Seaburn) are real, busy, Darwin-verified stations —
in scope under Tim's walk-up rule, just not Rest of England's. Added directly to their own region
as `mode: "train"` entries with an explicit `doNotGroup` pair against the same-name Metro/
Metrolink stop (the Edinburgh Gateway/Partick pattern from phase 1) — see
`lib/cities/greater-manchester/marketing-directions.js` and
`lib/cities/north-east/marketing-directions.js` `DO_NOT_GROUP_PAIRS`. This is the one permitted
touch of a second-mode direction-model file in this phase; the Metro/Metrolink entries themselves
are unchanged. greater-manchester's rail count moves 47 → 51 (61 → 65 total); north-east's moves
28 → 33 (88 → 93 total).

**CITY_BOUNDS.** `rest-of-england`'s box necessarily spans most of England and overlaps every
named region's own tighter box — it is listed LAST in `public/city-session.js`'s `CITY_BOUNDS`
(first-match-wins order) so every more specific region's hint still wins. 71 of
`rest-of-england`'s own stations and 5 other regions' own stations (uk-london-tfl/Cheshunt,
east-midlands/Northampton, north-east/Darlington, greater-manchester/Ashton-under-Lyne,
liverpool-city-region/Moreton) resolve across this boundary and are allow-listed in
`qa/uk-city-bounds-overlap-gate.mjs` with reasons, same trade-off as every other UK region's
boundary overlaps.

**No Coming Soon picker entry** — per Tim's 30 Aug 2026 rule, `rest-of-england` goes straight from
`planned`/`adapterReady` to Mark's flip-PR once QA is green, same as every other planned UK
region wired since that rule.

**`unassigned-england.md` is now resolved** — rewritten to record all 445 stations' new home
(436 rest-of-england, 9 greater-manchester/north-east) in a non-table format so
`qa/uk-station-fill-audit.mjs`'s flat-CRS-column parser doesn't double-count them as still
unassigned; the audit now reports 0 unassigned English stations.

## Reassignment 15 Sep 2026 — Rest of England stations moved to their real regions

Companion to `docs/jim-brief-rest-of-england-reassignment.md`. Triggered by Flixton (Trafford,
Greater Manchester) being catalogued in `rest-of-england` — reachable only via "Rest of England"
in a region-first picker, when Rest of England is meant to be an internal home for stations no
real region owns, never something a rider must find. Phase 2b's own sweep only checked the
fifteen phase 2a regions' *territory description*, never each station's coordinates against the
regions' actual `CITY_BOUNDS` boxes or (better) NaPTAN ATCO area / true administrative boundary —
that gap is what let Flixton and 73 others through.

**The rule.** A station belongs to an existing region when it is inside that region's named
administrative territory: the metropolitan county or combined authority for the metro regions
(Greater Manchester, Merseyside/liverpool-city-region, West Midlands county, South/West Yorkshire,
Tyne and Wear/north-east), the ceremonial counties/claimed corridor each county-based region's pack
actually claims (thames-valley = Berks/Oxon/Bucks & Chilterns; solent = Hants/IoW; southwest =
Devon/Cornwall; west-of-england = Bristol/Glos/Wilts boundary; cumbria = the ceremonial county;
greater-anglia = Essex/Suffolk/Norfolk/Cambs; east-midlands = Notts/Derbys/Leics/Northants/Rutland/
Lincs; london-se-national-rail = London/Kent/Surrey/Sussex/Essex commuter network), and the
ledger's §2 named boundary-station decisions (e.g. Tamworth → West Midlands despite being
Staffordshire, Kings Sutton flagged thames-valley-adjacent despite living in east-midlands).
**Box overlap is evidence to check, never the verdict on its own** — a region's rectangle
routinely oversails its true territory into a neighbouring, genuinely unclaimed shire county (see
"reviewed and kept" below); CITY_BOUNDS boxes were only ever meant as a GPS hint's first-match
heuristic, not a territory definition. Real calls used known NaPTAN/administrative geography
(district/borough for each station), not just box arithmetic. This pass had no live NaPTAN pull
available, so borderline shire-county calls (Cheshire East around Wilmslow/Handforth/Disley, the
Home Counties commuter belt) were made conservatively — left in Rest of England unless the
evidence was clear-cut — rather than guessed; a future pass with a real NaPTAN ATCO extract should
re-check those.

**74 stations moved.**

| Station | From | To | Rule applied |
|---|---|---|---|
| Ashton-under-Lyne | rest-of-england | greater-manchester | Tameside borough (Greater Manchester met. county) — doNotGroup added vs the existing Metrolink stop of the same name |
| Atherton | rest-of-england | greater-manchester | Wigan borough |
| Bolton | rest-of-england | greater-manchester | Bolton borough |
| Broadbottom | rest-of-england | greater-manchester | Tameside borough |
| Bromley Cross | rest-of-england | greater-manchester | Bolton borough |
| Chassen Road | rest-of-england | greater-manchester | Trafford borough |
| Daisy Hill | rest-of-england | greater-manchester | Wigan borough |
| Entwistle | rest-of-england | greater-manchester | Bolton borough (Turton) |
| Flixton | rest-of-england | greater-manchester | Trafford borough — the reported case (0.03° west of the old box edge) |
| Flowery Field | rest-of-england | greater-manchester | Tameside borough |
| Godley | rest-of-england | greater-manchester | Tameside borough |
| Greenfield | rest-of-england | greater-manchester | Oldham borough (Saddleworth) |
| Hag Fold | rest-of-england | greater-manchester | Wigan borough |
| Hall I' Th' Wood | rest-of-england | greater-manchester | Bolton borough |
| Hattersley | rest-of-england | greater-manchester | Tameside borough |
| Horwich Parkway | rest-of-england | greater-manchester | Bolton borough |
| Hyde Central | rest-of-england | greater-manchester | Tameside borough |
| Hyde North | rest-of-england | greater-manchester | Tameside borough |
| Irlam | rest-of-england | greater-manchester | Salford borough |
| Kearsley | rest-of-england | greater-manchester | Bolton borough |
| Lostock | rest-of-england | greater-manchester | Bolton borough |
| Marple | rest-of-england | greater-manchester | Stockport borough |
| Middlewood | rest-of-england | greater-manchester | Stockport borough (Hazel Grove/Norbury side of the boundary; found via the box-check audit, not the original name scan) |
| Moorside | rest-of-england | greater-manchester | Salford borough (Swinton) |
| Moses Gate | rest-of-england | greater-manchester | Bolton borough |
| Mossley | rest-of-england | greater-manchester | Tameside borough |
| Newton for Hyde | rest-of-england | greater-manchester | Tameside borough |
| Patricroft | rest-of-england | greater-manchester | Salford borough (Eccles); found via the box-check audit |
| Romiley | rest-of-england | greater-manchester | Stockport borough |
| Rose Hill Marple | rest-of-england | greater-manchester | Stockport borough |
| Stalybridge | rest-of-england | greater-manchester | Tameside borough; found via the box-check audit |
| Strines | rest-of-england | greater-manchester | Stockport borough |
| Urmston | rest-of-england | greater-manchester | Trafford borough |
| Walkden | rest-of-england | greater-manchester | Salford borough |
| Westhoughton | rest-of-england | greater-manchester | Bolton borough |
| Woodley | rest-of-england | greater-manchester | Stockport borough |
| New Mills Central | rest-of-england | east-midlands | Derbyshire, High Peak district (east-midlands already catalogues this line's Chapel-en-le-Frith/Dove Holes/Glossop/Hadfield/Dinting) |
| New Mills Newtown | rest-of-england | east-midlands | Derbyshire, High Peak district |
| Adwick | rest-of-england | south-yorkshire | Doncaster borough |
| Bentley (South Yorkshire) | rest-of-england | south-yorkshire | Doncaster borough |
| Conisbrough | rest-of-england | south-yorkshire | Doncaster borough |
| Doncaster | rest-of-england | south-yorkshire | Doncaster borough |
| Hatfield & Stainforth | rest-of-england | south-yorkshire | Doncaster borough |
| Kirk Sandall | rest-of-england | south-yorkshire | Doncaster borough |
| Kiveton Park | rest-of-england | south-yorkshire | Rotherham borough (south-yorkshire already catalogues the neighbouring Kiveton Bridge) |
| Penistone | rest-of-england | south-yorkshire | Barnsley borough |
| Thorne North | rest-of-england | south-yorkshire | Doncaster borough |
| Thorne South | rest-of-england | south-yorkshire | Doncaster borough |
| Knottingley | rest-of-england | west-yorkshire | City of Wakefield borough |
| Willenhall | rest-of-england | uk-west-midlands | Walsall borough (West Midlands met. county) |
| Warrington Bank Quay | rest-of-england | liverpool-city-region | Borough of Warrington (this pack already catalogues Padgate/Sankey for Penketh, also Warrington) |
| Warrington Central | rest-of-england | liverpool-city-region | Borough of Warrington |
| Warrington West | rest-of-england | liverpool-city-region | Borough of Warrington |
| Glazebrook | rest-of-england | liverpool-city-region | Rixton-with-Glazebrook parish, Borough of Warrington |
| Birchwood | rest-of-england | liverpool-city-region | Borough of Warrington; found via the box-check audit |
| Iver | rest-of-england | thames-valley | Buckinghamshire (South Bucks) |
| Denham Golf Club | rest-of-england | thames-valley | Buckinghamshire (South Bucks) |
| Chorleywood | rest-of-england | thames-valley | Hertfordshire, Chiltern line — thames-valley's pack claims "Thames Valley and Chilterns" |
| Aspatria | rest-of-england | cumbria | Cumberland/Allerdale — West Cumbria coast line, a gap in cumbria's own catalog (no coast-line station was catalogued there before this pass) |
| Flimby | rest-of-england | cumbria | Allerdale |
| Maryport | rest-of-england | cumbria | Allerdale |
| Workington | rest-of-england | cumbria | Allerdale |
| Harrington | rest-of-england | cumbria | Allerdale |
| Corkickle | rest-of-england | cumbria | Copeland |
| Whitehaven | rest-of-england | cumbria | Copeland |
| St Bees | rest-of-england | cumbria | Copeland |
| Nethertown | rest-of-england | cumbria | Copeland |
| Braystones | rest-of-england | cumbria | Copeland |
| Sellafield | rest-of-england | cumbria | Copeland |
| Seascale | rest-of-england | cumbria | Copeland |
| Drigg | rest-of-england | cumbria | Copeland |
| Ravenglass for Eskdale | rest-of-england | cumbria | Copeland |
| Silecroft | rest-of-england | cumbria | Copeland |
| Bootle | rest-of-england | cumbria | Copeland (not to be confused with the existing liverpool-city-region "Bootle New Strand"/"Bootle Oriel Road" in Sefton — a different place, same printed short name) |

**Named acceptance-criteria cases, stated explicitly.** Flixton, Urmston, Chassen Road, Humphrey
Park (already correctly in greater-manchester before this pass) and Irlam are all now (or already
were) in `greater-manchester`. Warrington's three stations are in `liverpool-city-region`. Nuneaton,
Bedworth and Atherstone are Warwickshire — **not claimed by any pack** (uk-west-midlands is the
West Midlands metropolitan county only; Warwickshire/Worcestershire/Staffordshire/Shropshire are
not any region's territory) — the rule gives them Rest of England, and they stay. Staines,
Chertsey and West Byfleet are Surrey — also not claimed by any pack (uk-london-tfl is Greater
London only; thames-valley is Berks/Oxon/Bucks) — the rule gives them Rest of England too, and
they stay; Iver/Denham Golf Club/Chorleywood are the genuinely-Buckinghamshire/Chilterns members
of that same six-station cluster and moved to thames-valley instead.

**Reviewed and deliberately kept in Rest of England (not moved).** The rest of the 39-station
uk-west-midlands box overlap (Albrighton, Alvechurch, Barnt Green, Bermuda Park, Bilbrook,
Blakedown, Bromsgrove, Cannock, Claverdon, Codsall, Coleshill Parkway, Cosford, Danzey, Droitwich
Spa, Hagley, Hartlebury, Hatton, Henley-in-Arden, Kenilworth, Landywood, Lapworth, Leamington Spa,
Lichfield City, Lichfield Trent Valley, Polesworth, Redditch, Shenstone, The Lakes, Warwick,
Warwick Parkway, Water Orton, Wilnecote, Wood End, Wootton Wawen, Wythall) are Warwickshire/
Worcestershire/Staffordshire/Shropshire — real counties, none of them any pack's claimed
territory. The 19-station rest-of-wales box overlap (Broome, Bucknell, Church Stretton, Craven
Arms, Delamere, Gobowen, Hereford, Hopton Heath, Knighton, Leominster, Ludlow, Mouldsworth, Prees,
Shrewsbury, Wem, Whitchurch (Shropshire), Yorton, plus Warrington's two already moved above) are
English stations the Welsh box overhangs — Shropshire/Herefordshire/Cheshire, genuinely not
Wales's and not claimed by any English pack either. Rugby, Rugeley Town, Rugeley Trent Valley,
Uttoxeter and Burton-on-Trent overlap east-midlands's box but are Warwickshire/Staffordshire, not
any of the six counties east-midlands's pack actually claims. Darwen (Blackburn with Darwen,
Lancashire) and Disley (Cheshire East — genuinely ambiguous, close to the Stockport boundary but
kept out without a firmer source than this pass had) sit inside greater-manchester's widened box
but aren't Greater Manchester. Hednesford (Staffordshire, Cannock Chase) sits inside
east-midlands's widened box but isn't Derbyshire. South Milford (North Yorkshire, Selby district)
sits inside west-yorkshire's widened box but isn't West Yorkshire. All ten are allow-listed in
`qa/uk-city-bounds-overlap-gate.mjs` under `region: "rest-of-england"` with the reason above.

**Cheshire and the Home Counties, deferred rather than guessed.** A large share of the remaining
362 stations are Cheshire (East/West — the Wilmslow/Alderley Edge/Knutsford/Sandbach/Crewe/
Northwich corridor and the Potteries towns just over the Staffordshire line), Essex (Chelmsford,
Harlow, Clacton — greater-anglia's own box floor sits at lat 51.80, and several of these sit just
south of it, the same edge-case shape as Flixton's), and East Kent (Ashford International through
Ramsgate/Margate — well outside london-se-national-rail's own box). None of these counties are
unambiguously "claimed" by an existing pack's own description in the way Cheshire/Essex/Kent
would need to be to move with confidence, and this pass had no live NaPTAN ATCO-prefix pull to
settle them precisely — recorded here as a flagged follow-up rather than moved on a guess.

**CITY_BOUNDS changes.** `greater-manchester` widened both edges (`-2.35..-2.10` →
`-2.54..-2.01`) to fit its 36 reassigned stations — still doesn't reach Wigan North Western/
Wallgate (already outside the old box; pre-existing gap, out of scope here). `south-yorkshire`
widened both edges (`-1.58..-1.25` → `-1.63..-0.95`) for its 10. `west-yorkshire` widened east
(`-1.30` → `-1.25`) for Knottingley. `east-midlands` widened west (`-1.99` → `-2.01`) for New
Mills. `cumbria` widened west (`-3.30` → `-3.60`) for the West Cumbria coast line. `uk-west-
midlands`, `liverpool-city-region` and `thames-valley` already covered their new stations without
a box change. Every new cross-box resolution this caused (Kiveton Park, Farnworth/Littleborough,
Glazebrook/Birchwood, Iver/Denham Golf Club/Chorleywood, plus the ten "kept" stations above) is
allow-listed in `qa/uk-city-bounds-overlap-gate.mjs` with a reason; `node
qa/uk-city-bounds-overlap-gate.mjs` is green.

**`qa/uk-station-fill-audit.mjs` extended** with a CITY_BOUNDS box check: every `rest-of-england`
station whose coordinates resolve (via `hintCityFromCoords`) into another live region's box must
have a matching allow-list entry in `qa/uk-city-bounds-overlap-gate.mjs`, or the audit fails.
Reuses that gate's allow-list as the single source of truth rather than maintaining a second one.

**Rest of England: 436 → 362.** Dogfood gate counts, `coverage.json` station-count sentences and
`public/city-directions/{greater-manchester,east-midlands,south-yorkshire,west-yorkshire,uk-west-
midlands,liverpool-city-region,thames-valley,cumbria,rest-of-england}.json` all updated to match.

## Reassignment 15 Sep 2026 round 2 — every pack's claimed counties, not just the nearest two

Companion to the "Round 2" section of `docs/jim-brief-rest-of-england-reassignment.md`, triggered
by Mark's QA FAIL on PR #399 (https://github.com/tdrevans-aus/next-train-app/pull/399#issuecomment-5681517329):
Staines, Chertsey and West Byfleet (Surrey, SWR into Waterloo) were kept in `rest-of-england`
because the round 1 "reviewed and kept" check only weighed them against `uk-london-tfl` and
`thames-valley` — the two geographically nearest packs — never against `london-se-national-rail`,
the one pack whose own `coverage.json` explicitly claims "London, Kent, Surrey, Sussex and
Essex's National Rail commuter network."

**The fix to the method.** Round 1's rule already named every pack's claimed counties in one place
(see the rule text above), but the per-station review checked only the boxes/packs that
geographically overhang each cluster, not the full list every time. Round 2 re-ran the "reviewed
and kept" list (all ~60 stations still sitting in `rest-of-england` after round 1: the 34
uk-west-midlands overlap, the 17 rest-of-wales/English-Marches overlap, Rugby/Rugeley
Town/Rugeley Trent Valley/Uttoxeter/Burton-on-Trent, Darwen/Disley, Hednesford, South Milford) and
every remaining East Kent/Surrey/Essex station against all nine named claims (thames-valley,
solent, southwest, west-of-england, cumbria, greater-anglia, east-midlands, london-se-national-rail,
plus the metro-county packs), not just the two nearest.

**Result: no change to the 60-station "reviewed and kept" list.** None of Warwickshire,
Worcestershire, Staffordshire, Shropshire, Herefordshire, Cheshire, Lancashire or North Yorkshire
is named by any pack's claim — the round 1 verdict for all 60 stands.

**41 more stations moved to `london-se-national-rail`.**

| Station | From | To | Rule applied |
|---|---|---|---|
| Adisham | rest-of-england | london-se-national-rail | Kent, claimed explicitly by london-se-national-rail's coverage.json |
| Appledore (Kent) | rest-of-england | london-se-national-rail | Kent, Marshlink line |
| Ashford International | rest-of-england | london-se-national-rail | Kent, HS1 domestic/Southeastern hub |
| Aylesham | rest-of-england | london-se-national-rail | Kent |
| Bekesbourne | rest-of-england | london-se-national-rail | Kent |
| Birchington-on-Sea | rest-of-england | london-se-national-rail | Kent, Thanet loop |
| Broadstairs | rest-of-england | london-se-national-rail | Kent, Thanet loop |
| Canterbury East | rest-of-england | london-se-national-rail | Kent |
| Canterbury West | rest-of-england | london-se-national-rail | Kent |
| Chartham | rest-of-england | london-se-national-rail | Kent |
| Chestfield & Swalecliffe | rest-of-england | london-se-national-rail | Kent |
| Chilham | rest-of-england | london-se-national-rail | Kent |
| Chertsey | rest-of-england | london-se-national-rail | Surrey, claimed explicitly by london-se-national-rail's coverage.json; SWR (not uk-london-tfl, which doesn't reach it) is the operator that actually serves it |
| Deal | rest-of-england | london-se-national-rail | Kent |
| Dover Priory | rest-of-england | london-se-national-rail | Kent |
| Dumpton Park | rest-of-england | london-se-national-rail | Kent, Thanet loop |
| Faversham | rest-of-england | london-se-national-rail | Kent |
| Folkestone Central | rest-of-england | london-se-national-rail | Kent |
| Folkestone West | rest-of-england | london-se-national-rail | Kent |
| Ham Street | rest-of-england | london-se-national-rail | Kent, Marshlink line |
| Herne Bay | rest-of-england | london-se-national-rail | Kent |
| Kearsney | rest-of-england | london-se-national-rail | Kent |
| Margate | rest-of-england | london-se-national-rail | Kent, Thanet loop |
| Martin Mill | rest-of-england | london-se-national-rail | Kent |
| Minster | rest-of-england | london-se-national-rail | Kent |
| Ramsgate | rest-of-england | london-se-national-rail | Kent, Thanet loop |
| Sandling | rest-of-england | london-se-national-rail | Kent |
| Sandwich | rest-of-england | london-se-national-rail | Kent |
| Selling | rest-of-england | london-se-national-rail | Kent |
| Shepherds Well | rest-of-england | london-se-national-rail | Kent |
| Snowdown | rest-of-england | london-se-national-rail | Kent |
| Staines | rest-of-england | london-se-national-rail | Surrey, Mark's PR #399 hard finding; SWR Windsor Lines into Waterloo, not uk-london-tfl's territory |
| Sturry | rest-of-england | london-se-national-rail | Kent |
| Teynham | rest-of-england | london-se-national-rail | Kent |
| Thanet Parkway | rest-of-england | london-se-national-rail | Kent, HS1 domestic |
| Walmer | rest-of-england | london-se-national-rail | Kent |
| West Byfleet | rest-of-england | london-se-national-rail | Surrey, SWR main line into Waterloo, not uk-london-tfl's territory |
| Westenhanger | rest-of-england | london-se-national-rail | Kent |
| Westgate-on-Sea | rest-of-england | london-se-national-rail | Kent, Thanet loop |
| Whitstable | rest-of-england | london-se-national-rail | Kent |
| Wye | rest-of-england | london-se-national-rail | Kent |

**Essex — a genuine conflict, left in place, not a fresh guess.** Round 1 deferred Essex "rather
than guessed" (no NaPTAN pull); round 2's rule text makes explicit that two packs claim Essex by
name: greater-anglia ("Essex/Suffolk/Norfolk/Cambs") and london-se-national-rail ("London, Kent,
Surrey, Sussex and Essex"). Per the brief's round 2 instruction ("unless another pack claims the
same county explicitly, in which case record the conflict... and leave the station where it is"),
the nine Essex stations still in `rest-of-england` are not moved, and this dual claim is recorded
here rather than resolved by guessing which pack should win: Beaulieu Park, Burnham-on-Crouch,
Chelmsford, Clacton-on-Sea, Harlow Mill, Harlow Town, Hatfield Peverel, Roydon, Southminster.
Whoever next reconciles greater-anglia's and london-se-national-rail's Essex boundary (a real
NaPTAN ATCO-prefix pull would settle it precisely) should resolve this, not a future station-fill
pass guessing again.

**No Sussex stations remained in `rest-of-england`** to check — none of the 362 (post round 1)
stations carry a recognisably Sussex place name, and no Sussex candidate appears anywhere in the
round 1 "kept" lists either.

**CITY_BOUNDS changes, round 2.** `london-se-national-rail` widened maxLng from 0.8 to 1.44 (fits
all 38 Kent reassignments) and minLng from -0.5 to -0.51 (fits Chertsey/Staines/West Byfleet on
paper, though uk-london-tfl's box — earlier in public/city-session.js's first-match order and
itself unchanged — still resolves those three first; allow-listed in
qa/uk-city-bounds-overlap-gate.mjs under region: "london-se-national-rail" instead of solved with
box priority). The same widening geometrically swept in two of the nine Essex conflict stations
(Burnham-on-Crouch, Southminster, both just inside the new maxLng) — allow-listed under region:
"rest-of-england" rather than moved, since they're the conflict set above, not a clean claim.

**The Cumbria block, one row per station (Mark's non-blocking nit on PR #399's body).** The
round 1 section above already lists all 16 West Cumbria coast-line stations individually
(Aspatria, Flimby, Maryport, Workington, Harrington, Corkickle, Whitehaven, St Bees, Nethertown,
Braystones, Sellafield, Seascale, Drigg, Ravenglass for Eskdale, Silecroft, Bootle) — only the PR
#399 body's own move table collapsed them into one comma-listed row. The round 2 PR comment
restates them station-by-station for the same literal-compliance reason.

**Rest of England: 362 → 321.** `london-se-national-rail`: 530 → 571. Dogfood gate counts,
`coverage.json` station-count sentences, `qa/uk-city-bounds-overlap-gate.mjs`'s allow-list and
`public/city-directions/{london-se-national-rail,rest-of-england}.json` all updated to match.

## Reassignment 15 Sep 2026 — Essex nine to greater-anglia (docs/jim-brief-essex-to-greater-anglia.md)

The genuine conflict recorded just above (round 2) is now resolved, per PR #399's own body:
**greater-anglia**. It operates every one of the nine Essex stations (Great Eastern main line,
Sunshine Coast and Crouch Valley branches, West Anglia line) and already owns Colchester,
Braintree and Witham on the same lines; London & South East National Rail's Essex claim is only
its Liverpool Street terminus group (its own genuine Fenchurch Street/c2c and Liverpool Street
suburban Essex stations — Rainham, Grays, Upminster, Brentwood and the like — are unaffected and
stay put; this ruling only concerns the nine disputed market-town stations).

Moved from `rest-of-england/stations.json` (flat, no hub change) to
`greater-anglia/stations.json`: Beaulieu Park, Burnham-on-Crouch, Chelmsford, Clacton-on-Sea,
Harlow Mill, Harlow Town, Hatfield Peverel, Roydon, Southminster (CRS BPA, BUU, CHM, CLT, HWM,
HWN, HAP, RYN, SMN). Each entry's `class` field now records "reassigned from rest-of-england,
Essex dual-claim resolved 15 Sep 2026".

**Rest of England: 321 → 312.** `greater-anglia`: 121 → 130. `docs/united-kingdom-ledger.md`
section 2 records the decision. `public/city-session.js`'s `greater-anglia` CITY_BOUNDS box
widened south (minLat 51.80 → 51.62, **Burnham-on-Crouch is the southernmost of the nine at
51.6335**, not Southminster at 51.6609) — this genuinely does overlap several Hertfordshire
rest-of-england stations and Cheshunt in the same newly-covered latitude band, allow-listed in
`qa/uk-city-bounds-overlap-gate.mjs` (**not** "no new overlap allow-list entry needed" as an
earlier draft of this paragraph claimed); the round-2 `Burnham-on-Crouch`/`Southminster`
allow-list entry under `region: "rest-of-england"` in `qa/uk-city-bounds-overlap-gate.mjs` is
removed as obsolete (they're not in that catalog any more). Dogfood gate counts,
`coverage.json` station-count sentences, `qa/uk-region-catalog-conformance.mjs` and
`public/city-directions/{greater-anglia,rest-of-england}.json` all updated to match.

## Round 2 follow-up 16 Sep 2026 — Cheshunt Near-me regression (Mark's PR #402 finding)

The single-box widening above (minLat 51.80 → 51.62) fixed the Essex nine but broke GPS
"Near me" for a rider physically standing at Cheshunt (rest-of-england's own station, 51.7027,
-0.0232): `hintCityFromCoords` sent them to greater-anglia, whose catalog has no Cheshunt, where
before this PR they correctly fell through to rest-of-england. Root cause: Cheshunt's latitude
sits *between* the two reassigned Essex clusters — Burnham-on-Crouch/Southminster at
51.63-51.66, and Chelmsford/Beaulieu Park/Harlow Mill/Harlow Town/Hatfield Peverel/Roydon at
51.74-51.79 — so no single rectangle spanning both clusters can exclude Cheshunt's 51.7027.

Fixed by splitting `greater-anglia`'s `CITY_BOUNDS` entry into an array of two boxes (chosen
over making `hintCityFromCoords` fall through to the next matching box on a no-nearby-station
check, per the brief's option (b): that fixes the whole overlapping-Hertfordshire-station class,
not just this regression, but requires loading each region's station coordinates into the
client-side picker and a new QA distance check — a materially larger, riskier change for a fix
this narrow needs):

- Main box: `minLat: 51.72` (raised from 51.62) — just above Cheshunt (51.7027) and Cuffley
  (51.7091), just below Chelmsford (51.7366), the lowest-latitude of the seven higher-latitude
  reassigned stations. `maxLat`/`minLng`/`maxLng` unchanged.
- New Crouch Valley box: `{ minLat: 51.60, maxLat: 51.70, minLng: 0.70, maxLng: 0.90 }`, scoped
  to just Burnham-on-Crouch (51.6335, 0.8135) and Southminster (51.6609, 0.8354). `maxLat: 51.70`
  sits just below Cheshunt's 51.7027, so Cheshunt falls outside both boxes and correctly
  resolves to rest-of-england again (Cuffley too, incidentally, since 51.7091 > 51.72).

`hintCityFromCoords`/`inBounds` in `public/city-session.js`, and the matching parse/match logic
in `qa/uk-city-bounds-overlap-gate.mjs` and `qa/uk-catalog-coords-gate.mjs`, now accept a
CITY_BOUNDS value that is either a single box or an array of boxes (checked as "in any of
them") — the only structural change this fix needed; every other region's single-box entry is
untouched. All 130 greater-anglia stations still resolve inside one of its two boxes
(`qa/uk-catalog-coords-gate.mjs` stays green).

**Allow-list changes.** Net **10** `qa/uk-city-bounds-overlap-gate.mjs` allow-list entries now
trigger for this reassignment (not the "~17" or "no new entries" claimed by earlier drafts of
this file): 8 Hertfordshire rest-of-england stations still overlap the raised main box's own
51.72-52.9 latitude band (Bayford, Brookmans Park, Broxbourne, Hatfield, Hertford East, Hertford
North, Rye House, St Margarets (Hertfordshire) — Cuffley dropped out, now resolves correctly),
plus Althorne (london-se-national-rail's own Crouch Valley station) against the new second box
(Battlesbridge/Billericay/Ingatestone/North Fambridge/South Woodham Ferrers dropped out, their
longitude sits west of the new box's 0.70 floor). The `region: "greater-anglia"`,
`station: "Burnham-on-Crouch"` allow-list entry from round 1 is **removed**: it claimed
london-se-national-rail won first-match because it's "declared earlier" in `CITY_BOUNDS`, which
was backwards — greater-anglia is declared *before* london-se-national-rail in
`public/city-session.js`'s object order, so `resolved === regionId` was always true for
Burnham-on-Crouch and `allowListReason()` was never reached for it; the entry never actually
triggered.

**Net result for a rider at each of the three named stations:** Cheshunt now correctly falls
through to rest-of-england (its own catalog); Burnham-on-Crouch and Southminster correctly
resolve to greater-anglia via the new second box (their own catalog, unchanged from round 1 —
they already resolved correctly there too, just via the wide single box that also, incidentally,
broke Cheshunt).
