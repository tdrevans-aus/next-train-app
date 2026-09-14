# UK station fill phase 2a — unassigned England (RESOLVED in phase 2b)

Companion to `docs/jim-brief-uk-station-fill-phase2a.md` and `docs/jim-brief-uk-station-fill-phase2b.md`. This file originally listed every Darwin-verified English station left without a region after phase 2a's fifteen regions — no existing region's territory (own pack/registry note, then `docs/united-kingdom-ledger.md` section 2, then geography/county) clearly covered it, and widening a region beyond its own name was ruled out by the brief.

**RESOLVED 14 Sep 2026 (UK station fill phase 2b, docs/jim-brief-uk-station-fill-phase2b.md):** all 445 stations below now have a home. 436 were catalogued into the new `rest-of-england` region (`lib/cities/rest-of-england/stations.json`) — an internal catch-all, not a region a rider picks by name, since the country-wide picker means riders search the whole country and never choose a region. The remaining 9 share a printed name with an existing greater-manchester Metrolink stop or north-east Tyne and Wear Metro stop whose bare name is hardcoded in that region's own marketing-directions.js direction model, so instead of going into rest-of-england they were added directly to their own region (greater-manchester/north-east) as mode: "train" entries with an explicit doNotGroup pair — see `lib/cities/greater-manchester/marketing-directions.js` and `lib/cities/north-east/marketing-directions.js` `DO_NOT_GROUP_PAIRS`, and `docs/uk-station-fill/assignment.md`'s 'Direction-model collisions held back, not force-added' section. `qa/uk-station-fill-audit.mjs` now finds every one of these 445 CRS codes in a region catalog (rest-of-england, greater-manchester, or north-east), so this file carries zero rows in the table format the audit script parses — the original data is kept below in a plain (non-table) format for the historical record.

Format below (comma-separated, NOT a markdown table — deliberately, so `qa/uk-station-fill-audit.mjs`'s flat-CRS-column parser does not re-count these as unassigned now that every one is catalogued): `CRS, name, lat, lng, nearest existing region at the time, why not there at the time, home region now`.

## Rest of England (436 stations)

```
ADM, Adisham, 51.241352, 1.199277, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
ADC, Adlington (Cheshire), 53.319542, -2.133571, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
AWK, Adwick, 53.571932, -1.17989, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
ALB, Albrighton, 52.637917, -2.268913, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
ALD, Alderley Edge, 53.303762, -2.236812, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
ALW, Allens West, 54.524557, -1.361652, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
ASG, Alsager, 53.093054, -2.29861, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
ALP, Althorpe, 53.585262, -0.732558, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
ALV, Alvechurch, 52.346607, -1.967854, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
AFV, Ansdell & Fairhaven, 53.741558, -2.993077, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
APD, Appledore (Kent), 51.033287, 0.816576, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
APS, Apsley, 51.732365, -0.462989, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
ARR, Arram, 53.884567, -0.426833, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
AFK, Ashford International, 51.14335294, 0.875167251, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
AHN, Ashton-under-Lyne, 53.491264, -2.093415, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
ASP, Aspatria, 54.759338, -3.331752, cumbria, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
ATH, Atherstone, 52.57852, -1.552366, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
ATN, Atherton, 53.529076, -2.477834, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
AYH, Aylesham, 51.227185, 1.209682, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BMB, Bamber Bridge, 53.726772, -2.660793, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BRT, Barlaston, 52.942856, -2.168118, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BTB, Barnetby, 53.575013, -0.409761, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BTG, Barnt Green, 52.36097, -1.9925, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
BAV, Barrow Haven, 53.697455, -0.392889, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BAU, Barton-on-Humber, 53.688824, -0.443233, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BTT, Battersby, 54.457687, -1.092945, west-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BAY, Bayford, 51.757901, -0.095727, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BER, Bearley, 52.244974, -1.749763, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BPA, Beaulieu Park, 51.757694, 0.519496, greater-anglia, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BDM, Bedford, 52.136175, -0.47945, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BSJ, Bedford St Johns, 52.129299, -0.467348, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BEH, Bedworth, 52.479133, -1.46749, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
BKS, Bekesbourne, 51.261403, 1.13723, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BEM, Bempton, 54.127791, -0.180715, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BYK, Bentley (South Yorkshire), 53.54371, -1.150718, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BEP, Bermuda Park (Nuneaton), 52.5029, -1.4726, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
BEV, Beverley, 53.842161, -0.422899, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BBK, Bilbrook, 52.623964, -2.187305, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
BIL, Billingham, 54.605715, -1.279537, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BCH, Birchington-on-Sea, 51.377502, 1.300904, greater-anglia, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BWD, Birchwood, 53.412782, -2.525139, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BIA, Bishop Auckland, 54.657482, -1.677545, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BBN, Blackburn, 53.746513, -2.479135, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BPN, Blackpool North, 53.822937, -3.048373, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BPB, Blackpool Pleasure Beach, 53.788154, -3.053856, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BPS, Blackpool South, 53.798611, -3.049081, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BKD, Blakedown, 52.406791, -2.176394, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
BYB, Blythe Bridge, 52.968124, -2.066966, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BON, Bolton, 53.573516, -2.425126, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BOC, Bootle, 54.291182, -3.393836, cumbria, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BMH, Bournemouth, 50.727478, -1.863955, solent, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BDN, Brading, 50.678509, -1.13801, solent, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BSM, Branksome, 50.727033, -1.919372, solent, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BYS, Braystones, 54.439508, -3.541971, cumbria, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BWO, Bricket Wood, 51.705223, -0.358846, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BWT, Bridgwater, 51.128025, -2.99031, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BDT, Bridlington, 54.084065, -0.200369, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BGG, Brigg, 53.549137, -0.486094, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BDB, Broadbottom, 53.440968, -2.01653, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BSR, Broadstairs, 51.360653, 1.43317, greater-anglia, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BMC, Bromley Cross, 53.613954, -2.410835, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BMV, Bromsgrove, 52.320158, -2.049979, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
BPK, Brookmans Park, 51.720955, -0.204811, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BME, Broome, 52.423152, -2.884482, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BMF, Broomfleet, 53.740131, -0.673328, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BUH, Brough, 53.726933, -0.578149, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BXB, Broxbourne, 51.746826, -0.010626, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BRU, Bruton, 51.111584, -2.447103, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BUK, Bucknell, 52.357277, -2.947694, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BUU, Burnham-on-Crouch, 51.633526, 0.813459, greater-anglia, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
BUT, Burton-on-Trent, 52.805798, -1.64246, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CAO, Cannock, 52.686097, -2.022351, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
CBE, Canterbury East, 51.274185, 1.07582, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CBW, Canterbury West, 51.284279, 1.074608, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CLC, Castle Cary, 51.099583, -2.522683, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CSM, Castleton Moor, 54.467148, -0.946726, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CTL, Cattal, 53.997515, -1.319808, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CRT, Chartham, 51.256958, 1.018303, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CSR, Chassen Road, 53.44605, -2.368171, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CEL, Chelford, 53.270744, -2.280375, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CHM, Chelmsford, 51.736595, 0.469316, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CYT, Cherry Tree, 53.732868, -2.518401, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CHY, Chertsey, 51.387108, -0.509667, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CHN, Cheshunt, 51.702747, -0.023171, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CSW, Chestfield & Swalecliffe, 51.360283, 1.067441, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CNO, Chetnole, 50.866344, -2.572962, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CIL, Chilham, 51.244549, 0.975937, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CLW, Chorleywood, 51.654188, -0.51846, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CHR, Christchurch, 50.738148, -1.784566, solent, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CHF, Church Fenton, 53.82701, -1.227213, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CTT, Church Stretton, 52.537303, -2.803684, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CLT, Clacton-on-Sea, 51.794532, 1.154327, greater-anglia, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CLV, Claverdon, 52.277195, -1.6964, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
CLE, Cleethorpes, 53.562825, -0.030097, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CSL, Codsall, 52.627437, -2.201816, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
CEH, Coleshill Parkway, 52.5164, -1.7081, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
CWL, Colwall, 52.079843, -2.356799, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
COM, Commondale, 54.481018, -0.97514, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CNG, Congleton, 53.157637, -2.192754, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CNS, Conisbrough, 53.489526, -1.23461, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CKL, Corkickle, 54.541657, -3.582155, cumbria, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
COS, Cosford, 52.644846, -2.300693, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
CGM, Cottingham, 53.781315, -0.406219, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CRV, Craven Arms, 52.44242, -2.837628, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CRE, Crewe, 53.088963, -2.432636, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CKN, Crewkerne, 50.873337, -2.778815, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CMR, Cromer, 52.930054, 1.291648, greater-anglia, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CWE, Crowle, 53.589725, -0.817042, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CUD, Cuddington, 53.23991, -2.599329, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
CUF, Cuffley, 51.709146, -0.109798, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
DSY, Daisy Hill, 53.539359, -2.515178, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
DNY, Danby, 54.466068, -0.910704, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
DZY, Danzey, 52.324754, -1.82084, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
DWN, Darwen, 53.69804, -2.464958, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
DEA, Deal, 51.223129, 1.398559, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
DLM, Delamere, 53.228767, -2.666577, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
DGC, Denham Golf Club, 51.580544, -0.517774, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
DND, Dinsdale, 54.51474, -1.467051, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
DSL, Disley, 53.358146, -2.042465, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
DON, Doncaster, 53.521954, -1.139915, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
DCH, Dorchester South, 50.708752, -2.437593, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
DCW, Dorchester West, 50.710932, -2.442648, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
DVP, Dover Priory, 51.125988, 1.304227, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
DRF, Driffield, 54.001526, -0.434627, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
DRI, Drigg, 54.376968, -3.444066, cumbria, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
DTW, Droitwich Spa, 52.26862, -2.158239, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
DMP, Dumpton Park, 51.345854, 1.425275, greater-anglia, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
DHM, Durham, 54.779408, -1.581746, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
EAG, Eaglescliffe, 54.530089, -1.34972, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
EGN, Eastrington, 53.755235, -0.787077, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
EGT, Egton, 54.437679, -0.761896, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
ENT, Entwistle, 53.655591, -2.413983, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
FAV, Faversham, 51.311436, 0.891278, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
FRY, Ferriby, 53.717051, -0.507729, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
FIL, Filey, 54.209946, -0.293351, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
FLM, Flimby, 54.689815, -3.520544, cumbria, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
FLT, Flitwick, 52.003457, -0.4952, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
FLI, Flixton, 53.443746, -2.383878, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
FLF, Flowery Field, 53.46139, -2.080114, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
FKC, Folkestone Central, 51.082985, 1.168331, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
FKW, Folkestone West, 51.084718, 1.153782, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
GGV, Gargrave, 53.97842, -2.105171, west-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
GBD, Gilberdyke, 53.747955, -0.732223, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
GLS, Glaisdale, 54.439796, -0.794221, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
GLZ, Glazebrook, 53.428291, -2.459992, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
GOB, Gobowen, 52.893322, -3.036885, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
GDL, Godley, 53.452249, -2.055636, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
GOO, Goole, 53.704968, -0.874258, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
GTR, Goostrey, 53.222634, -2.32628, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
GOX, Goxhill, 53.676613, -0.337699, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
GTA, Great Ayton, 54.489497, -1.115235, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
GCT, Great Coates, 53.575722, -0.129833, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
GMV, Great Malvern, 52.109165, -2.318289, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
GBK, Greenbank, 53.25142, -2.534459, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
GNF, Greenfield, 53.538835, -2.014189, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
GMD, Grimsby Docks, 53.574142, -0.075832, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
GMB, Grimsby Town, 53.563457, -0.086851, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
GMT, Grosmont, 54.436394, -0.724937, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
GYP, Gypsy Lane, 54.533329, -1.180312, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HAB, Habrough, 53.6061, -0.269354, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HGF, Hag Fold, 53.533442, -2.493744, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HAG, Hagley, 52.422375, -2.147018, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
HID, Hall I' Th' Wood, 53.597446, -2.413076, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HMT, Ham Street, 51.068199, 0.854585, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HMM, Hammerton, 53.996331, -1.284069, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HAM, Hamworthy, 50.725369, -2.019051, solent, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HTH, Handforth, 53.34639, -2.213263, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HLN, Harlington, 51.961407, -0.49534, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HWM, Harlow Mill, 51.790482, 0.132318, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HWN, Harlow Town, 51.781639, 0.094804, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HPD, Harpenden, 51.814831, -0.351961, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HRR, Harrington, 54.613551, -3.565573, cumbria, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HGT, Harrogate, 53.993404, -1.53743, west-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HTF, Hartford, 53.241721, -2.553978, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HBY, Hartlebury, 52.334441, -2.221086, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
HPL, Hartlepool, 54.686771, -1.2073, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HAT, Hatfield, 51.765155, -0.2158, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HFS, Hatfield & Stainforth, 53.58887, -1.023263, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HAP, Hatfield Peverel, 51.780314, 0.592772, greater-anglia, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HTY, Hattersley, 53.444938, -2.039436, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HTN, Hatton, 52.295242, -1.672982, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
HLI, Healing, 53.581838, -0.160618, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HNF, Hednesford, 52.709922, -2.00199, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HEI, Heighington, 54.596977, -1.582071, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HML, Hemel Hempstead, 51.742062, -0.490762, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HNL, Henley-in-Arden, 52.291455, -1.783999, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
HEL, Hensall, 53.698487, -1.114662, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HFD, Hereford, 52.061199, -2.708122, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HNB, Herne Bay, 51.364438, 1.118307, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HFE, Hertford East, 51.799396, -0.07175, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HFN, Hertford North, 51.79868, -0.092238, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HES, Hessle, 53.717567, -0.442169, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HCH, Holmes Chapel, 53.199131, -2.351063, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HOL, Holton Heath, 50.711346, -2.077863, solent, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HYB, Honeybourne, 52.101641, -1.833682, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HPT, Hopton Heath, 52.391361, -2.912028, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HRE, Horden, 54.763879, -1.307347, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HBP, Hornbeam Park, 53.980236, -1.527272, west-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HWI, Horwich Parkway, 53.577983, -2.539732, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HWW, How Wood, 51.717697, -0.344594, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HOW, Howden, 53.764526, -0.86068, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HUL, Hull, 53.743835, -0.347598, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HUB, Hunmanby, 54.17429, -0.314737, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HUT, Hutton Cranswick, 53.956185, -0.433838, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HYC, Hyde Central, 53.451682, -2.085149, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
HYT, Hyde North, 53.464464, -2.085034, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
IRL, Irlam, 53.434172, -2.432989, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
IVR, Iver, 51.508342, -0.506659, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
JCH, James Cook, 54.552, -1.208525, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
KSL, Kearsley, 53.54419, -2.375032, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
KSN, Kearsney, 51.149399, 1.271566, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
KNW, Kenilworth, 52.3429, -1.5726, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
KDG, Kidsgrove, 53.086555, -2.244828, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
KLD, Kildale, 54.477751, -1.068327, west-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
KGL, Kings Langley, 51.70631, -0.438411, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
KKS, Kirk Sandall, 53.56347, -1.075006, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
KKM, Kirkham & Wesham, 53.786905, -2.88338, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
KTL, Kirton Lindsey, 53.485262, -0.593551, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
KVP, Kiveton Park, 53.336975, -1.240052, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
KNA, Knaresborough, 54.008755, -1.470482, west-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
KNI, Knighton, 52.345043, -3.042232, south-wales, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
KNO, Knottingley, 53.706528, -1.259172, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
KNF, Knutsford, 53.301956, -2.372101, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
LKE, Lake, 50.646183, -1.16647, solent, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
LAW, Landywood, 52.657101, -2.020659, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
LHO, Langho, 53.804811, -2.448824, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
LPW, Lapworth, 52.341803, -1.725814, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
LAY, Layton, 53.835625, -3.030249, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
LEA, Leagrave, 51.905304, -0.459139, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
LHM, Lealholm, 54.460459, -0.825511, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
LMS, Leamington Spa, 52.28461, -1.535803, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
LED, Ledbury, 52.044991, -2.425728, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
LEO, Leominster, 52.225809, -2.730445, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
LIC, Lichfield City, 52.680347, -1.825431, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
LTV, Lichfield Trent Valley, 52.6869, -1.800014, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
LGK, Longbeck, 54.589337, -1.030993, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
LPT, Longport, 53.042091, -2.216712, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
LGN, Longton, 52.990013, -2.137216, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
LOT, Lostock, 53.572969, -2.494276, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
LTG, Lostock Gralam, 53.267677, -2.465197, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
LOH, Lostock Hall, 53.724316, -2.687069, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
LUD, Ludlow, 52.371101, -2.71598, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
LUT, Luton, 51.882527, -0.414085, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
LTN, Luton Airport Parkway, 51.872845, -0.396124, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
LTM, Lytham, 53.739101, -2.964206, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MAC, Macclesfield, 53.259331, -2.121397, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MDN, Maiden Newton, 50.780226, -2.569663, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MLT, Malton, 54.131857, -0.797729, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MVL, Malvern Link, 52.125809, -2.319568, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MAR, Margate, 51.384926, 1.371737, greater-anglia, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MPL, Marple, 53.400763, -2.057168, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MSK, Marske, 54.587433, -1.018892, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MTM, Martin Mill, 51.170642, 1.347988, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MTO, Marton, 54.544225, -1.198362, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MRY, Maryport, 54.711299, -3.494087, cumbria, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MBR, Middlesbrough, 54.579146, -1.234509, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MDL, Middlewood, 53.360056, -2.083528, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MLH, Mill Hill (Lancashire), 53.735433, -2.501433, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MSR, Minster, 51.329167, 1.317106, greater-anglia, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MOB, Mobberley, 53.329941, -2.333309, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MSD, Moorside, 53.516363, -2.352749, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MTN, Moreton (Dorset), 50.701184, -2.31414, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MSS, Moses Gate, 53.55604, -2.400931, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MOS, Moss Side, 53.764753, -2.942962, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MSL, Mossley, 53.514963, -2.041263, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
MLD, Mouldsworth, 53.231976, -2.732546, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
NFN, Nafferton, 54.011343, -0.385624, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
NAN, Nantwich, 53.063533, -2.518868, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
NRT, Nethertown, 54.456227, -3.565624, cumbria, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
NCE, New Clee, 53.574455, -0.060771, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
NHL, New Holland, 53.701985, -0.360153, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
NMC, New Mills Central, 53.364864, -2.005569, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
NMN, New Mills Newtown, 53.359464, -2.008203, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
NAY, Newton Aycliffe, 54.613754, -1.589668, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
NWN, Newton for Hyde, 53.4567, -2.067531, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
NRD, North Road, 54.53573, -1.553929, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
NTR, Northallerton, 54.332473, -1.441378, west-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
NWI, Northwich, 53.261414, -2.496815, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
NUN, Nuneaton, 52.526761, -1.464184, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
NNT, Nunthorpe, 54.528347, -1.170195, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
OKN, Oakengates, 52.693091, -2.450188, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
PNL, Pannal, 53.958511, -1.532787, west-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
PKT, Park Street, 51.725651, -0.340727, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
PKS, Parkstone (Dorset), 50.722961, -1.947848, solent, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
PAT, Patricroft, 53.484745, -2.357919, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
PNS, Penistone, 53.525632, -1.622676, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
PKG, Penkridge, 52.723611, -2.119447, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
PSH, Pershore, 52.13074, -2.072399, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
PLS, Pleasington, 53.730961, -2.544142, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
PLM, Plumley, 53.274809, -2.419615, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
POK, Pokesdown, 50.731187, -1.826734, solent, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
PSW, Polesworth, 52.625835, -1.610705, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
POO, Poole, 50.719321, -1.98364, solent, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
POP, Poppleton, 53.97596, -1.148407, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
PFY, Poulton-le-Fylde, 53.848128, -2.990212, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
PRS, Prees, 52.89962, -2.689765, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
PRB, Prestbury, 53.293465, -2.14549, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
PRE, Preston, 53.755721, -2.707191, liverpool-city-region, docs/united-kingdom-ledger.md section 2: unclaimed, not contested by any region, explicitly flagged for whoever builds the adjacent region — no target region in this phase is named for Lancashire, so it stays unclaimed rather than being force-fit into a neighbour, rest-of-england
RAM, Ramsgate, 51.341076, 1.405226, greater-anglia, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
RGW, Ramsgreave & Wilpshire, 53.779994, -2.478061, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
RAV, Ravenglass for Eskdale, 54.355804, -3.409456, cumbria, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
RWC, Rawcliffe, 53.688943, -0.961271, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
RCC, Redcar Central, 54.615986, -1.070322, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
RCE, Redcar East, 54.609055, -1.051925, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
RDC, Redditch, 52.306337, -1.945248, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
RIS, Rishton, 53.763813, -2.420165, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
RML, Romiley, 53.414026, -2.089307, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
RSH, Rose Hill Marple, 53.396176, -2.076502, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
RNR, Roughton Road, 52.917828, 1.299239, greater-anglia, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
RYN, Roydon, 51.775439, 0.036514, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
RUG, Rugby, 52.379035, -1.250274, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
RGT, Rugeley Town, 52.754672, -1.936963, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
RGL, Rugeley Trent Valley, 52.769451, -1.930309, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
RUS, Ruswarp, 54.46994, -0.627775, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
RYD, Ryde Esplanade, 50.73305, -1.159602, solent, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
RYP, Ryde Pier Head, 50.738994, -1.160409, solent, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
RYR, Ryde St Johns Road, 50.724184, -1.156616, solent, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
RYH, Rye House, 51.769361, 0.005522, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SLB, Saltburn, 54.583419, -0.975223, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SAM, Saltmarshe, 53.722066, -0.809166, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SLW, Salwick, 53.781536, -2.817973, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SDB, Sandbach, 53.150113, -2.393528, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SDG, Sandling, 51.09021, 1.065995, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SAN, Sandown, 50.657101, -1.162457, solent, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SDW, Sandwich, 51.269973, 1.34223, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SCA, Scarborough, 54.279148, -0.406235, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SCU, Scunthorpe, 53.58617, -0.650951, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SEA, Seaham, 54.839091, -1.346378, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SEM, Seamer, 54.240658, -0.416994, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SSC, Seascale, 54.396288, -3.485171, cumbria, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SEC, Seaton Carew, 54.657959, -1.200106, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SBY, Selby, 53.782915, -1.063423, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SEL, Sellafield, 54.416571, -3.510293, cumbria, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SEG, Selling, 51.277285, 0.941145, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SHN, Shanklin, 50.633842, -1.179841, solent, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SEN, Shenstone, 52.638985, -1.844528, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
SPH, Shepherds Well, 51.188339, 1.229952, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SHE, Sherborne, 50.943979, -2.51297, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SIE, Sherburn-in-Elmet, 53.797509, -1.232902, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SHM, Sheringham, 52.941367, 1.21079, greater-anglia, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SFN, Shifnal, 52.666007, -2.371689, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SHD, Shildon, 54.626193, -1.63671, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SHR, Shrewsbury, 52.711851, -2.749404, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SIC, Silecroft, 54.225966, -3.334281, cumbria, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SKI, Skipton, 53.958691, -2.025878, west-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SLH, Sleights, 54.46088, -0.66246, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SAB, Smallbrook Junction, 50.711465, -1.154998, solent, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SNI, Snaith, 53.693192, -1.027678, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SWO, Snowdown, 51.214886, 1.213187, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SBK, South Bank, 54.584011, -1.176271, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SOM, South Milford, 53.782382, -1.251129, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SMN, Southminster, 51.660873, 0.835397, greater-anglia, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SQU, Squires Gate, 53.77699, -3.050171, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SAC, St Albans, 51.750497, -0.327669, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SAA, St Albans Abbey, 51.744675, -0.342422, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SAS, St Annes-on-the-Sea, 53.753181, -3.02895, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SBS, St Bees, 54.492465, -3.591263, cumbria, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SMT, St Margarets (Hertfordshire), 51.787773, 0.000837, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
STA, Stafford, 52.803581, -2.122626, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SNS, Staines, 51.432328, -0.502909, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SLL, Stallingborough, 53.587167, -0.183436, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SYB, Stalybridge, 53.484139, -2.064223, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SBE, Starbeck, 53.999004, -1.501116, west-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
STK, Stockton, 54.56971, -1.31784, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SOT, Stoke-on-Trent, 53.008012, -2.181119, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SNE, Stone, 52.90832, -2.154951, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
STY, Stratford Parkway, 52.20642, -1.7307, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SAV, Stratford-upon-Avon, 52.194945, -1.716304, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SRN, Strines, 53.374932, -2.033544, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
STU, Sturry, 51.301018, 1.121644, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
SYA, Styal, 53.348137, -2.240313, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
TEA, Tees-side Airport, 54.518147, -1.425305, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
TFC, Telford Central, 52.681114, -2.441178, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
TMC, Templecombe, 51.001594, -2.417285, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
TEY, Teynham, 51.333604, 0.807051, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
THP, Thanet Parkway, 51.330843, 1.361777, greater-anglia, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
TLK, The Lakes, 52.359097, -1.844654, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
THI, Thirsk, 54.228489, -1.372573, west-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
TBY, Thornaby, 54.559189, -1.301696, north-east, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
TNN, Thorne North, 53.616329, -0.972006, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
TNS, Thorne South, 53.603345, -0.955256, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
THO, Thornford, 50.910678, -2.57914, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
TNA, Thornton Abbey, 53.654316, -0.323024, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
ULC, Ulceby, 53.619457, -0.30063, east-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
ULL, Ulleskelf, 53.853331, -1.214378, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
UPW, Upwey, 50.64838, -2.466731, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
URM, Urmston, 53.448203, -2.35344, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
UTT, Uttoxeter, 52.89681, -1.856515, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WKD, Walkden, 53.519786, -2.395748, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WAM, Walmer, 51.203223, 1.382548, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WRM, Wareham, 50.692878, -2.115328, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WBQ, Warrington Bank Quay, 53.385937, -2.603178, liverpool-city-region, Warrington Borough Council (Cheshire) — outside both Liverpool City Region (Merseyside) and Greater Manchester's combined-authority areas, rest-of-england
WAC, Warrington Central, 53.391857, -2.592434, liverpool-city-region, Warrington Borough Council (Cheshire) — outside both Liverpool City Region (Merseyside) and Greater Manchester's combined-authority areas, rest-of-england
WAW, Warrington West, 53.393744, -2.636929, liverpool-city-region, Warrington Borough Council (Cheshire) — outside both Liverpool City Region (Merseyside) and Greater Manchester's combined-authority areas, rest-of-england
WRW, Warwick, 52.286861, -1.582155, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
WRP, Warwick Parkway, 52.286014, -1.612273, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
WTO, Water Orton, 52.518379, -1.743538, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
WED, Wedgwood, 52.951839, -2.171135, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WMG, Welham Green, 51.736324, -0.209989, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WLN, Wellington (Shropshire), 52.701436, -2.516719, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WEM, Wem, 52.856293, -2.718784, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WBY, West Byfleet, 51.339394, -0.505468, uk-london-tfl, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WRN, West Runton, 52.935497, 1.245516, greater-anglia, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WHA, Westenhanger, 51.094922, 1.038204, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WGA, Westgate-on-Sea, 51.381386, 1.338402, greater-anglia, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WHG, Westhoughton, 53.555775, -2.523773, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WEY, Weymouth, 50.615927, -2.45491, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WHE, Whalley, 53.824165, -2.412186, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WTB, Whitby, 54.484324, -0.614535, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WTC, Whitchurch (Shropshire), 52.968048, -2.671497, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WTH, Whitehaven, 54.552864, -3.586843, cumbria, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WBD, Whitley Bridge, 53.699129, -1.15889, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WHI, Whitstable, 51.357686, 1.034365, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WIA, Willenhall, 52.58192, -2.05475, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
WMC, Wilmcote, 52.222618, -1.755493, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WML, Wilmslow, 53.327099, -2.226009, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WNE, Wilnecote, 52.610817, -1.679499, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
WSF, Winsford, 53.190505, -2.494669, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WDE, Wood End, 52.344143, -1.844372, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
WLY, Woodley, 53.429245, -2.093275, greater-manchester, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WOO, Wool, 50.68148, -2.220775, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WWW, Wootton Wawen, 52.265831, -1.784561, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
WOF, Worcester Foregate Street, 52.195312, -2.220777, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WOS, Worcester Shrub Hill, 52.195031, -2.209328, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WOP, Worcestershire Parkway, 52.15622, -2.1597, uk-west-midlands, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WKG, Workington, 54.645061, -3.558626, cumbria, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WRE, Wrenbury, 53.019311, -2.596089, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WRS, Wressle, 53.772826, -0.923672, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WYE, Wye, 51.185463, 0.929188, london-se-national-rail, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
WYT, Wythall, 52.380125, -1.865456, uk-west-midlands, West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county, rest-of-england
YRM, Yarm, 54.493763, -1.351467, west-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
YVJ, Yeovil Junction, 50.924814, -2.612245, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
YVP, Yeovil Pen Mill, 50.944466, -2.613461, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
YET, Yetminster, 50.895702, -2.573802, west-of-england, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
YRK, York, 53.957966, -1.093159, south-yorkshire, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
YRT, Yorton, 52.809009, -2.73645, liverpool-city-region, outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it, rest-of-england
```

## Held back to greater-manchester / north-east (9 stations)

```
ALT, Altrincham, 53.3874, -2.347212, greater-manchester, Same printed name as an existing greater-manchester Metro/Metrolink stop whose bare name is hardcoded in that region's marketing-directions.js line+terminus direction model — adding the National Rail entry under the identical name breaks findNearestStation/no-live-feed-stop disambiguation (qa/lib/no-live-feed-gate-helper.mjs); a safe fix needs a metro-side rename plus a marketing-directions.js update, out of scope for a stations.json-only station fill, greater-manchester
BNR, Brockley Whins (T & W Metro), 54.959519, -1.460684, north-east, Same printed name as an existing north-east Metro/Metrolink stop whose bare name is hardcoded in that region's marketing-directions.js line+terminus direction model — adding the National Rail entry under the identical name breaks findNearestStation/no-live-feed-stop disambiguation (qa/lib/no-live-feed-gate-helper.mjs); a safe fix needs a metro-side rename plus a marketing-directions.js update, out of scope for a stations.json-only station fill, north-east
EBL, East Boldon (T & W Metro), 54.946345, -1.420154, north-east, Same printed name as an existing north-east Metro/Metrolink stop whose bare name is hardcoded in that region's marketing-directions.js line+terminus direction model — adding the National Rail entry under the identical name breaks findNearestStation/no-live-feed-stop disambiguation (qa/lib/no-live-feed-gate-helper.mjs); a safe fix needs a metro-side rename plus a marketing-directions.js update, out of scope for a stations.json-only station fill, north-east
ECC, Eccles, 53.485527, -2.334052, greater-manchester, Same printed name as an existing greater-manchester Metro/Metrolink stop whose bare name is hardcoded in that region's marketing-directions.js line+terminus direction model — adding the National Rail entry under the identical name breaks findNearestStation/no-live-feed-stop disambiguation (qa/lib/no-live-feed-gate-helper.mjs); a safe fix needs a metro-side rename plus a marketing-directions.js update, out of scope for a stations.json-only station fill, greater-manchester
HEW, Heworth, 54.951594, -1.55758, north-east, Same printed name as an existing north-east Metro/Metrolink stop whose bare name is hardcoded in that region's marketing-directions.js line+terminus direction model — adding the National Rail entry under the identical name breaks findNearestStation/no-live-feed-stop disambiguation (qa/lib/no-live-feed-gate-helper.mjs); a safe fix needs a metro-side rename plus a marketing-directions.js update, out of scope for a stations.json-only station fill, north-east
MIA, Manchester Airport, 53.365183, -2.272038, greater-manchester, Same printed name as an existing greater-manchester Metro/Metrolink stop whose bare name is hardcoded in that region's marketing-directions.js line+terminus direction model — adding the National Rail entry under the identical name breaks findNearestStation/no-live-feed-stop disambiguation (qa/lib/no-live-feed-gate-helper.mjs); a safe fix needs a metro-side rename plus a marketing-directions.js update, out of scope for a stations.json-only station fill, greater-manchester
MAS, Manors, 54.972698, -1.606296, north-east, Same printed name as an existing north-east Metro/Metrolink stop whose bare name is hardcoded in that region's marketing-directions.js line+terminus direction model — adding the National Rail entry under the identical name breaks findNearestStation/no-live-feed-stop disambiguation (qa/lib/no-live-feed-gate-helper.mjs); a safe fix needs a metro-side rename plus a marketing-directions.js update, out of scope for a stations.json-only station fill, north-east
RCD, Rochdale, 53.610573, -2.152835, greater-manchester, Same printed name as an existing greater-manchester Metro/Metrolink stop whose bare name is hardcoded in that region's marketing-directions.js line+terminus direction model — adding the National Rail entry under the identical name breaks findNearestStation/no-live-feed-stop disambiguation (qa/lib/no-live-feed-gate-helper.mjs); a safe fix needs a metro-side rename plus a marketing-directions.js update, out of scope for a stations.json-only station fill, greater-manchester
SEB, Seaburn (T & W Metro), 54.929558, -1.38667, north-east, Same printed name as an existing north-east Metro/Metrolink stop whose bare name is hardcoded in that region's marketing-directions.js line+terminus direction model — adding the National Rail entry under the identical name breaks findNearestStation/no-live-feed-stop disambiguation (qa/lib/no-live-feed-gate-helper.mjs); a safe fix needs a metro-side rename plus a marketing-directions.js update, out of scope for a stations.json-only station fill, north-east
```

## Summary

- **445 stations** verified against Darwin, previously with no home region — **0 unassigned English stations remain** as of UK station fill phase 2b (14 Sep 2026).
- 436 catalogued into the new `rest-of-england` region.
- 9 catalogued into their own region (greater-manchester/north-east) instead, with a doNotGroup pair against the same-name Metro/Metrolink stop.

