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
