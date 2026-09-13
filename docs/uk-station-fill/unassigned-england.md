# UK station fill phase 2a — unassigned England

Companion to `docs/jim-brief-uk-station-fill-phase2a.md`. Every Darwin-verified English station
left without a region after phase 2a's fifteen regions — no existing region's territory (own
pack/registry note, then `docs/united-kingdom-ledger.md` section 2, then geography/county) clearly
covers it, and widening a region beyond its own name was ruled out by the brief. Phase 2b reads
this file to build the "Rest of England" region.

Format: `CRS | name | lat | lng | nearest existing region | why not there`.

| CRS | name | lat | lng | nearest existing region | why not there |
|---|---|---|---|---|---|
| ADM | Adisham | 51.241352 | 1.199277 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| ADC | Adlington (Cheshire) | 53.319542 | -2.133571 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| AWK | Adwick | 53.571932 | -1.17989 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| ALB | Albrighton | 52.637917 | -2.268913 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| ALD | Alderley Edge | 53.303762 | -2.236812 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| ALW | Allens West | 54.524557 | -1.361652 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| ASG | Alsager | 53.093054 | -2.29861 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| ALP | Althorpe | 53.585262 | -0.732558 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| ALT | Altrincham | 53.3874 | -2.347212 | greater-manchester | Same printed name as an existing greater-manchester Metro/Metrolink stop whose bare name is hardcoded in that region's marketing-directions.js line+terminus direction model — adding the National Rail entry under the identical name breaks findNearestStation/no-live-feed-stop disambiguation (qa/lib/no-live-feed-gate-helper.mjs); a safe fix needs a metro-side rename plus a marketing-directions.js update, out of scope for a stations.json-only station fill |
| ALV | Alvechurch | 52.346607 | -1.967854 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| AFV | Ansdell & Fairhaven | 53.741558 | -2.993077 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| APD | Appledore (Kent) | 51.033287 | 0.816576 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| APS | Apsley | 51.732365 | -0.462989 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| ARR | Arram | 53.884567 | -0.426833 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| AFK | Ashford International | 51.14335294 | 0.875167251 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| AHN | Ashton-under-Lyne | 53.491264 | -2.093415 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| ASP | Aspatria | 54.759338 | -3.331752 | cumbria | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| ATH | Atherstone | 52.57852 | -1.552366 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| ATN | Atherton | 53.529076 | -2.477834 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| AYH | Aylesham | 51.227185 | 1.209682 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BMB | Bamber Bridge | 53.726772 | -2.660793 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BRT | Barlaston | 52.942856 | -2.168118 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BTB | Barnetby | 53.575013 | -0.409761 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BTG | Barnt Green | 52.36097 | -1.9925 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| BAV | Barrow Haven | 53.697455 | -0.392889 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BAU | Barton-on-Humber | 53.688824 | -0.443233 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BTT | Battersby | 54.457687 | -1.092945 | west-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BAY | Bayford | 51.757901 | -0.095727 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BER | Bearley | 52.244974 | -1.749763 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BPA | Beaulieu Park | 51.757694 | 0.519496 | greater-anglia | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BDM | Bedford | 52.136175 | -0.47945 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BSJ | Bedford St Johns | 52.129299 | -0.467348 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BEH | Bedworth | 52.479133 | -1.46749 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| BKS | Bekesbourne | 51.261403 | 1.13723 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BEM | Bempton | 54.127791 | -0.180715 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BYK | Bentley (South Yorkshire) | 53.54371 | -1.150718 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BEP | Bermuda Park (Nuneaton) | 52.5029 | -1.4726 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| BEV | Beverley | 53.842161 | -0.422899 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BBK | Bilbrook | 52.623964 | -2.187305 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| BIL | Billingham | 54.605715 | -1.279537 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BCH | Birchington-on-Sea | 51.377502 | 1.300904 | greater-anglia | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BWD | Birchwood | 53.412782 | -2.525139 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BIA | Bishop Auckland | 54.657482 | -1.677545 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BBN | Blackburn | 53.746513 | -2.479135 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BPN | Blackpool North | 53.822937 | -3.048373 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BPB | Blackpool Pleasure Beach | 53.788154 | -3.053856 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BPS | Blackpool South | 53.798611 | -3.049081 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BKD | Blakedown | 52.406791 | -2.176394 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| BYB | Blythe Bridge | 52.968124 | -2.066966 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BON | Bolton | 53.573516 | -2.425126 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BOC | Bootle | 54.291182 | -3.393836 | cumbria | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BMH | Bournemouth | 50.727478 | -1.863955 | solent | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BDN | Brading | 50.678509 | -1.13801 | solent | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BSM | Branksome | 50.727033 | -1.919372 | solent | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BYS | Braystones | 54.439508 | -3.541971 | cumbria | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BWO | Bricket Wood | 51.705223 | -0.358846 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BWT | Bridgwater | 51.128025 | -2.99031 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BDT | Bridlington | 54.084065 | -0.200369 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BGG | Brigg | 53.549137 | -0.486094 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BDB | Broadbottom | 53.440968 | -2.01653 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BSR | Broadstairs | 51.360653 | 1.43317 | greater-anglia | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BNR | Brockley Whins (T & W Metro) | 54.959519 | -1.460684 | north-east | Same printed name as an existing north-east Metro/Metrolink stop whose bare name is hardcoded in that region's marketing-directions.js line+terminus direction model — adding the National Rail entry under the identical name breaks findNearestStation/no-live-feed-stop disambiguation (qa/lib/no-live-feed-gate-helper.mjs); a safe fix needs a metro-side rename plus a marketing-directions.js update, out of scope for a stations.json-only station fill |
| BMC | Bromley Cross | 53.613954 | -2.410835 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BMV | Bromsgrove | 52.320158 | -2.049979 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| BPK | Brookmans Park | 51.720955 | -0.204811 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BME | Broome | 52.423152 | -2.884482 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BMF | Broomfleet | 53.740131 | -0.673328 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BUH | Brough | 53.726933 | -0.578149 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BXB | Broxbourne | 51.746826 | -0.010626 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BRU | Bruton | 51.111584 | -2.447103 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BUK | Bucknell | 52.357277 | -2.947694 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BUU | Burnham-on-Crouch | 51.633526 | 0.813459 | greater-anglia | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| BUT | Burton-on-Trent | 52.805798 | -1.64246 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CAO | Cannock | 52.686097 | -2.022351 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| CBE | Canterbury East | 51.274185 | 1.07582 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CBW | Canterbury West | 51.284279 | 1.074608 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CLC | Castle Cary | 51.099583 | -2.522683 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CSM | Castleton Moor | 54.467148 | -0.946726 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CTL | Cattal | 53.997515 | -1.319808 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CRT | Chartham | 51.256958 | 1.018303 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CSR | Chassen Road | 53.44605 | -2.368171 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CEL | Chelford | 53.270744 | -2.280375 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CHM | Chelmsford | 51.736595 | 0.469316 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CYT | Cherry Tree | 53.732868 | -2.518401 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CHY | Chertsey | 51.387108 | -0.509667 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CHN | Cheshunt | 51.702747 | -0.023171 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CSW | Chestfield & Swalecliffe | 51.360283 | 1.067441 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CNO | Chetnole | 50.866344 | -2.572962 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CIL | Chilham | 51.244549 | 0.975937 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CLW | Chorleywood | 51.654188 | -0.51846 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CHR | Christchurch | 50.738148 | -1.784566 | solent | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CHF | Church Fenton | 53.82701 | -1.227213 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CTT | Church Stretton | 52.537303 | -2.803684 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CLT | Clacton-on-Sea | 51.794532 | 1.154327 | greater-anglia | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CLV | Claverdon | 52.277195 | -1.6964 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| CLE | Cleethorpes | 53.562825 | -0.030097 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CSL | Codsall | 52.627437 | -2.201816 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| CEH | Coleshill Parkway | 52.5164 | -1.7081 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| CWL | Colwall | 52.079843 | -2.356799 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| COM | Commondale | 54.481018 | -0.97514 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CNG | Congleton | 53.157637 | -2.192754 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CNS | Conisbrough | 53.489526 | -1.23461 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CKL | Corkickle | 54.541657 | -3.582155 | cumbria | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| COS | Cosford | 52.644846 | -2.300693 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| CGM | Cottingham | 53.781315 | -0.406219 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CRV | Craven Arms | 52.44242 | -2.837628 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CRE | Crewe | 53.088963 | -2.432636 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CKN | Crewkerne | 50.873337 | -2.778815 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CMR | Cromer | 52.930054 | 1.291648 | greater-anglia | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CWE | Crowle | 53.589725 | -0.817042 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CUD | Cuddington | 53.23991 | -2.599329 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| CUF | Cuffley | 51.709146 | -0.109798 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| DSY | Daisy Hill | 53.539359 | -2.515178 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| DNY | Danby | 54.466068 | -0.910704 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| DZY | Danzey | 52.324754 | -1.82084 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| DWN | Darwen | 53.69804 | -2.464958 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| DEA | Deal | 51.223129 | 1.398559 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| DLM | Delamere | 53.228767 | -2.666577 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| DGC | Denham Golf Club | 51.580544 | -0.517774 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| DND | Dinsdale | 54.51474 | -1.467051 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| DSL | Disley | 53.358146 | -2.042465 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| DON | Doncaster | 53.521954 | -1.139915 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| DCH | Dorchester South | 50.708752 | -2.437593 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| DCW | Dorchester West | 50.710932 | -2.442648 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| DVP | Dover Priory | 51.125988 | 1.304227 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| DRF | Driffield | 54.001526 | -0.434627 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| DRI | Drigg | 54.376968 | -3.444066 | cumbria | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| DTW | Droitwich Spa | 52.26862 | -2.158239 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| DMP | Dumpton Park | 51.345854 | 1.425275 | greater-anglia | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| DHM | Durham | 54.779408 | -1.581746 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| EAG | Eaglescliffe | 54.530089 | -1.34972 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| EBL | East Boldon (T & W Metro) | 54.946345 | -1.420154 | north-east | Same printed name as an existing north-east Metro/Metrolink stop whose bare name is hardcoded in that region's marketing-directions.js line+terminus direction model — adding the National Rail entry under the identical name breaks findNearestStation/no-live-feed-stop disambiguation (qa/lib/no-live-feed-gate-helper.mjs); a safe fix needs a metro-side rename plus a marketing-directions.js update, out of scope for a stations.json-only station fill |
| EGN | Eastrington | 53.755235 | -0.787077 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| ECC | Eccles | 53.485527 | -2.334052 | greater-manchester | Same printed name as an existing greater-manchester Metro/Metrolink stop whose bare name is hardcoded in that region's marketing-directions.js line+terminus direction model — adding the National Rail entry under the identical name breaks findNearestStation/no-live-feed-stop disambiguation (qa/lib/no-live-feed-gate-helper.mjs); a safe fix needs a metro-side rename plus a marketing-directions.js update, out of scope for a stations.json-only station fill |
| EGT | Egton | 54.437679 | -0.761896 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| ENT | Entwistle | 53.655591 | -2.413983 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| FAV | Faversham | 51.311436 | 0.891278 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| FRY | Ferriby | 53.717051 | -0.507729 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| FIL | Filey | 54.209946 | -0.293351 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| FLM | Flimby | 54.689815 | -3.520544 | cumbria | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| FLT | Flitwick | 52.003457 | -0.4952 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| FLI | Flixton | 53.443746 | -2.383878 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| FLF | Flowery Field | 53.46139 | -2.080114 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| FKC | Folkestone Central | 51.082985 | 1.168331 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| FKW | Folkestone West | 51.084718 | 1.153782 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| GGV | Gargrave | 53.97842 | -2.105171 | west-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| GBD | Gilberdyke | 53.747955 | -0.732223 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| GLS | Glaisdale | 54.439796 | -0.794221 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| GLZ | Glazebrook | 53.428291 | -2.459992 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| GOB | Gobowen | 52.893322 | -3.036885 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| GDL | Godley | 53.452249 | -2.055636 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| GOO | Goole | 53.704968 | -0.874258 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| GTR | Goostrey | 53.222634 | -2.32628 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| GOX | Goxhill | 53.676613 | -0.337699 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| GTA | Great Ayton | 54.489497 | -1.115235 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| GCT | Great Coates | 53.575722 | -0.129833 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| GMV | Great Malvern | 52.109165 | -2.318289 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| GBK | Greenbank | 53.25142 | -2.534459 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| GNF | Greenfield | 53.538835 | -2.014189 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| GMD | Grimsby Docks | 53.574142 | -0.075832 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| GMB | Grimsby Town | 53.563457 | -0.086851 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| GMT | Grosmont | 54.436394 | -0.724937 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| GYP | Gypsy Lane | 54.533329 | -1.180312 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HAB | Habrough | 53.6061 | -0.269354 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HGF | Hag Fold | 53.533442 | -2.493744 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HAG | Hagley | 52.422375 | -2.147018 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| HID | Hall I' Th' Wood | 53.597446 | -2.413076 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HMT | Ham Street | 51.068199 | 0.854585 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HMM | Hammerton | 53.996331 | -1.284069 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HAM | Hamworthy | 50.725369 | -2.019051 | solent | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HTH | Handforth | 53.34639 | -2.213263 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HLN | Harlington | 51.961407 | -0.49534 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HWM | Harlow Mill | 51.790482 | 0.132318 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HWN | Harlow Town | 51.781639 | 0.094804 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HPD | Harpenden | 51.814831 | -0.351961 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HRR | Harrington | 54.613551 | -3.565573 | cumbria | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HGT | Harrogate | 53.993404 | -1.53743 | west-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HTF | Hartford | 53.241721 | -2.553978 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HBY | Hartlebury | 52.334441 | -2.221086 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| HPL | Hartlepool | 54.686771 | -1.2073 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HAT | Hatfield | 51.765155 | -0.2158 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HFS | Hatfield & Stainforth | 53.58887 | -1.023263 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HAP | Hatfield Peverel | 51.780314 | 0.592772 | greater-anglia | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HTY | Hattersley | 53.444938 | -2.039436 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HTN | Hatton | 52.295242 | -1.672982 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| HLI | Healing | 53.581838 | -0.160618 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HNF | Hednesford | 52.709922 | -2.00199 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HEI | Heighington | 54.596977 | -1.582071 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HML | Hemel Hempstead | 51.742062 | -0.490762 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HNL | Henley-in-Arden | 52.291455 | -1.783999 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| HEL | Hensall | 53.698487 | -1.114662 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HFD | Hereford | 52.061199 | -2.708122 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HNB | Herne Bay | 51.364438 | 1.118307 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HFE | Hertford East | 51.799396 | -0.07175 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HFN | Hertford North | 51.79868 | -0.092238 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HES | Hessle | 53.717567 | -0.442169 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HEW | Heworth | 54.951594 | -1.55758 | north-east | Same printed name as an existing north-east Metro/Metrolink stop whose bare name is hardcoded in that region's marketing-directions.js line+terminus direction model — adding the National Rail entry under the identical name breaks findNearestStation/no-live-feed-stop disambiguation (qa/lib/no-live-feed-gate-helper.mjs); a safe fix needs a metro-side rename plus a marketing-directions.js update, out of scope for a stations.json-only station fill |
| HCH | Holmes Chapel | 53.199131 | -2.351063 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HOL | Holton Heath | 50.711346 | -2.077863 | solent | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HYB | Honeybourne | 52.101641 | -1.833682 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HPT | Hopton Heath | 52.391361 | -2.912028 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HRE | Horden | 54.763879 | -1.307347 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HBP | Hornbeam Park | 53.980236 | -1.527272 | west-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HWI | Horwich Parkway | 53.577983 | -2.539732 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HWW | How Wood | 51.717697 | -0.344594 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HOW | Howden | 53.764526 | -0.86068 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HUL | Hull | 53.743835 | -0.347598 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HUB | Hunmanby | 54.17429 | -0.314737 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HUT | Hutton Cranswick | 53.956185 | -0.433838 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HYC | Hyde Central | 53.451682 | -2.085149 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| HYT | Hyde North | 53.464464 | -2.085034 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| IRL | Irlam | 53.434172 | -2.432989 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| IVR | Iver | 51.508342 | -0.506659 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| JCH | James Cook | 54.552 | -1.208525 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| KSL | Kearsley | 53.54419 | -2.375032 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| KSN | Kearsney | 51.149399 | 1.271566 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| KNW | Kenilworth | 52.3429 | -1.5726 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| KDG | Kidsgrove | 53.086555 | -2.244828 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| KLD | Kildale | 54.477751 | -1.068327 | west-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| KGL | Kings Langley | 51.70631 | -0.438411 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| KKS | Kirk Sandall | 53.56347 | -1.075006 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| KKM | Kirkham & Wesham | 53.786905 | -2.88338 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| KTL | Kirton Lindsey | 53.485262 | -0.593551 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| KVP | Kiveton Park | 53.336975 | -1.240052 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| KNA | Knaresborough | 54.008755 | -1.470482 | west-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| KNI | Knighton | 52.345043 | -3.042232 | south-wales | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| KNO | Knottingley | 53.706528 | -1.259172 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| KNF | Knutsford | 53.301956 | -2.372101 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| LKE | Lake | 50.646183 | -1.16647 | solent | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| LAW | Landywood | 52.657101 | -2.020659 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| LHO | Langho | 53.804811 | -2.448824 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| LPW | Lapworth | 52.341803 | -1.725814 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| LAY | Layton | 53.835625 | -3.030249 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| LEA | Leagrave | 51.905304 | -0.459139 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| LHM | Lealholm | 54.460459 | -0.825511 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| LMS | Leamington Spa | 52.28461 | -1.535803 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| LED | Ledbury | 52.044991 | -2.425728 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| LEO | Leominster | 52.225809 | -2.730445 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| LIC | Lichfield City | 52.680347 | -1.825431 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| LTV | Lichfield Trent Valley | 52.6869 | -1.800014 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| LGK | Longbeck | 54.589337 | -1.030993 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| LPT | Longport | 53.042091 | -2.216712 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| LGN | Longton | 52.990013 | -2.137216 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| LOT | Lostock | 53.572969 | -2.494276 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| LTG | Lostock Gralam | 53.267677 | -2.465197 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| LOH | Lostock Hall | 53.724316 | -2.687069 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| LUD | Ludlow | 52.371101 | -2.71598 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| LUT | Luton | 51.882527 | -0.414085 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| LTN | Luton Airport Parkway | 51.872845 | -0.396124 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| LTM | Lytham | 53.739101 | -2.964206 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MAC | Macclesfield | 53.259331 | -2.121397 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MDN | Maiden Newton | 50.780226 | -2.569663 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MLT | Malton | 54.131857 | -0.797729 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MVL | Malvern Link | 52.125809 | -2.319568 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MIA | Manchester Airport | 53.365183 | -2.272038 | greater-manchester | Same printed name as an existing greater-manchester Metro/Metrolink stop whose bare name is hardcoded in that region's marketing-directions.js line+terminus direction model — adding the National Rail entry under the identical name breaks findNearestStation/no-live-feed-stop disambiguation (qa/lib/no-live-feed-gate-helper.mjs); a safe fix needs a metro-side rename plus a marketing-directions.js update, out of scope for a stations.json-only station fill |
| MAS | Manors | 54.972698 | -1.606296 | north-east | Same printed name as an existing north-east Metro/Metrolink stop whose bare name is hardcoded in that region's marketing-directions.js line+terminus direction model — adding the National Rail entry under the identical name breaks findNearestStation/no-live-feed-stop disambiguation (qa/lib/no-live-feed-gate-helper.mjs); a safe fix needs a metro-side rename plus a marketing-directions.js update, out of scope for a stations.json-only station fill |
| MAR | Margate | 51.384926 | 1.371737 | greater-anglia | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MPL | Marple | 53.400763 | -2.057168 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MSK | Marske | 54.587433 | -1.018892 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MTM | Martin Mill | 51.170642 | 1.347988 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MTO | Marton | 54.544225 | -1.198362 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MRY | Maryport | 54.711299 | -3.494087 | cumbria | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MBR | Middlesbrough | 54.579146 | -1.234509 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MDL | Middlewood | 53.360056 | -2.083528 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MLH | Mill Hill (Lancashire) | 53.735433 | -2.501433 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MSR | Minster | 51.329167 | 1.317106 | greater-anglia | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MOB | Mobberley | 53.329941 | -2.333309 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MSD | Moorside | 53.516363 | -2.352749 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MTN | Moreton (Dorset) | 50.701184 | -2.31414 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MSS | Moses Gate | 53.55604 | -2.400931 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MOS | Moss Side | 53.764753 | -2.942962 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MSL | Mossley | 53.514963 | -2.041263 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| MLD | Mouldsworth | 53.231976 | -2.732546 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| NFN | Nafferton | 54.011343 | -0.385624 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| NAN | Nantwich | 53.063533 | -2.518868 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| NRT | Nethertown | 54.456227 | -3.565624 | cumbria | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| NCE | New Clee | 53.574455 | -0.060771 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| NHL | New Holland | 53.701985 | -0.360153 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| NMC | New Mills Central | 53.364864 | -2.005569 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| NMN | New Mills Newtown | 53.359464 | -2.008203 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| NAY | Newton Aycliffe | 54.613754 | -1.589668 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| NWN | Newton for Hyde | 53.4567 | -2.067531 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| NRD | North Road | 54.53573 | -1.553929 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| NTR | Northallerton | 54.332473 | -1.441378 | west-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| NWI | Northwich | 53.261414 | -2.496815 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| NUN | Nuneaton | 52.526761 | -1.464184 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| NNT | Nunthorpe | 54.528347 | -1.170195 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| OKN | Oakengates | 52.693091 | -2.450188 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| PNL | Pannal | 53.958511 | -1.532787 | west-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| PKT | Park Street | 51.725651 | -0.340727 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| PKS | Parkstone (Dorset) | 50.722961 | -1.947848 | solent | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| PAT | Patricroft | 53.484745 | -2.357919 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| PNS | Penistone | 53.525632 | -1.622676 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| PKG | Penkridge | 52.723611 | -2.119447 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| PSH | Pershore | 52.13074 | -2.072399 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| PLS | Pleasington | 53.730961 | -2.544142 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| PLM | Plumley | 53.274809 | -2.419615 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| POK | Pokesdown | 50.731187 | -1.826734 | solent | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| PSW | Polesworth | 52.625835 | -1.610705 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| POO | Poole | 50.719321 | -1.98364 | solent | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| POP | Poppleton | 53.97596 | -1.148407 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| PFY | Poulton-le-Fylde | 53.848128 | -2.990212 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| PRS | Prees | 52.89962 | -2.689765 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| PRB | Prestbury | 53.293465 | -2.14549 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| PRE | Preston | 53.755721 | -2.707191 | liverpool-city-region | docs/united-kingdom-ledger.md section 2: unclaimed, not contested by any region, explicitly flagged for whoever builds the adjacent region — no target region in this phase is named for Lancashire, so it stays unclaimed rather than being force-fit into a neighbour |
| RAM | Ramsgate | 51.341076 | 1.405226 | greater-anglia | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| RGW | Ramsgreave & Wilpshire | 53.779994 | -2.478061 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| RAV | Ravenglass for Eskdale | 54.355804 | -3.409456 | cumbria | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| RWC | Rawcliffe | 53.688943 | -0.961271 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| RCC | Redcar Central | 54.615986 | -1.070322 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| RCE | Redcar East | 54.609055 | -1.051925 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| RDC | Redditch | 52.306337 | -1.945248 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| RIS | Rishton | 53.763813 | -2.420165 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| RCD | Rochdale | 53.610573 | -2.152835 | greater-manchester | Same printed name as an existing greater-manchester Metro/Metrolink stop whose bare name is hardcoded in that region's marketing-directions.js line+terminus direction model — adding the National Rail entry under the identical name breaks findNearestStation/no-live-feed-stop disambiguation (qa/lib/no-live-feed-gate-helper.mjs); a safe fix needs a metro-side rename plus a marketing-directions.js update, out of scope for a stations.json-only station fill |
| RML | Romiley | 53.414026 | -2.089307 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| RSH | Rose Hill Marple | 53.396176 | -2.076502 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| RNR | Roughton Road | 52.917828 | 1.299239 | greater-anglia | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| RYN | Roydon | 51.775439 | 0.036514 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| RUG | Rugby | 52.379035 | -1.250274 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| RGT | Rugeley Town | 52.754672 | -1.936963 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| RGL | Rugeley Trent Valley | 52.769451 | -1.930309 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| RUS | Ruswarp | 54.46994 | -0.627775 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| RYD | Ryde Esplanade | 50.73305 | -1.159602 | solent | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| RYP | Ryde Pier Head | 50.738994 | -1.160409 | solent | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| RYR | Ryde St Johns Road | 50.724184 | -1.156616 | solent | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| RYH | Rye House | 51.769361 | 0.005522 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SLB | Saltburn | 54.583419 | -0.975223 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SAM | Saltmarshe | 53.722066 | -0.809166 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SLW | Salwick | 53.781536 | -2.817973 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SDB | Sandbach | 53.150113 | -2.393528 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SDG | Sandling | 51.09021 | 1.065995 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SAN | Sandown | 50.657101 | -1.162457 | solent | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SDW | Sandwich | 51.269973 | 1.34223 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SCA | Scarborough | 54.279148 | -0.406235 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SCU | Scunthorpe | 53.58617 | -0.650951 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SEB | Seaburn (T & W Metro) | 54.929558 | -1.38667 | north-east | Same printed name as an existing north-east Metro/Metrolink stop whose bare name is hardcoded in that region's marketing-directions.js line+terminus direction model — adding the National Rail entry under the identical name breaks findNearestStation/no-live-feed-stop disambiguation (qa/lib/no-live-feed-gate-helper.mjs); a safe fix needs a metro-side rename plus a marketing-directions.js update, out of scope for a stations.json-only station fill |
| SEA | Seaham | 54.839091 | -1.346378 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SEM | Seamer | 54.240658 | -0.416994 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SSC | Seascale | 54.396288 | -3.485171 | cumbria | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SEC | Seaton Carew | 54.657959 | -1.200106 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SBY | Selby | 53.782915 | -1.063423 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SEL | Sellafield | 54.416571 | -3.510293 | cumbria | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SEG | Selling | 51.277285 | 0.941145 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SHN | Shanklin | 50.633842 | -1.179841 | solent | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SEN | Shenstone | 52.638985 | -1.844528 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| SPH | Shepherds Well | 51.188339 | 1.229952 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SHE | Sherborne | 50.943979 | -2.51297 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SIE | Sherburn-in-Elmet | 53.797509 | -1.232902 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SHM | Sheringham | 52.941367 | 1.21079 | greater-anglia | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SFN | Shifnal | 52.666007 | -2.371689 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SHD | Shildon | 54.626193 | -1.63671 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SHR | Shrewsbury | 52.711851 | -2.749404 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SIC | Silecroft | 54.225966 | -3.334281 | cumbria | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SKI | Skipton | 53.958691 | -2.025878 | west-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SLH | Sleights | 54.46088 | -0.66246 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SAB | Smallbrook Junction | 50.711465 | -1.154998 | solent | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SNI | Snaith | 53.693192 | -1.027678 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SWO | Snowdown | 51.214886 | 1.213187 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SBK | South Bank | 54.584011 | -1.176271 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SOM | South Milford | 53.782382 | -1.251129 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SMN | Southminster | 51.660873 | 0.835397 | greater-anglia | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SQU | Squires Gate | 53.77699 | -3.050171 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SAC | St Albans | 51.750497 | -0.327669 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SAA | St Albans Abbey | 51.744675 | -0.342422 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SAS | St Annes-on-the-Sea | 53.753181 | -3.02895 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SBS | St Bees | 54.492465 | -3.591263 | cumbria | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SMT | St Margarets (Hertfordshire) | 51.787773 | 0.000837 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| STA | Stafford | 52.803581 | -2.122626 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SNS | Staines | 51.432328 | -0.502909 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SLL | Stallingborough | 53.587167 | -0.183436 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SYB | Stalybridge | 53.484139 | -2.064223 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SBE | Starbeck | 53.999004 | -1.501116 | west-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| STK | Stockton | 54.56971 | -1.31784 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SOT | Stoke-on-Trent | 53.008012 | -2.181119 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SNE | Stone | 52.90832 | -2.154951 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| STY | Stratford Parkway | 52.20642 | -1.7307 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SAV | Stratford-upon-Avon | 52.194945 | -1.716304 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SRN | Strines | 53.374932 | -2.033544 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| STU | Sturry | 51.301018 | 1.121644 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| SYA | Styal | 53.348137 | -2.240313 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| TEA | Tees-side Airport | 54.518147 | -1.425305 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| TFC | Telford Central | 52.681114 | -2.441178 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| TMC | Templecombe | 51.001594 | -2.417285 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| TEY | Teynham | 51.333604 | 0.807051 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| THP | Thanet Parkway | 51.330843 | 1.361777 | greater-anglia | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| TLK | The Lakes | 52.359097 | -1.844654 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| THI | Thirsk | 54.228489 | -1.372573 | west-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| TBY | Thornaby | 54.559189 | -1.301696 | north-east | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| TNN | Thorne North | 53.616329 | -0.972006 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| TNS | Thorne South | 53.603345 | -0.955256 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| THO | Thornford | 50.910678 | -2.57914 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| TNA | Thornton Abbey | 53.654316 | -0.323024 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| ULC | Ulceby | 53.619457 | -0.30063 | east-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| ULL | Ulleskelf | 53.853331 | -1.214378 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| UPW | Upwey | 50.64838 | -2.466731 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| URM | Urmston | 53.448203 | -2.35344 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| UTT | Uttoxeter | 52.89681 | -1.856515 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WKD | Walkden | 53.519786 | -2.395748 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WAM | Walmer | 51.203223 | 1.382548 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WRM | Wareham | 50.692878 | -2.115328 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WBQ | Warrington Bank Quay | 53.385937 | -2.603178 | liverpool-city-region | Warrington Borough Council (Cheshire) — outside both Liverpool City Region (Merseyside) and Greater Manchester's combined-authority areas |
| WAC | Warrington Central | 53.391857 | -2.592434 | liverpool-city-region | Warrington Borough Council (Cheshire) — outside both Liverpool City Region (Merseyside) and Greater Manchester's combined-authority areas |
| WAW | Warrington West | 53.393744 | -2.636929 | liverpool-city-region | Warrington Borough Council (Cheshire) — outside both Liverpool City Region (Merseyside) and Greater Manchester's combined-authority areas |
| WRW | Warwick | 52.286861 | -1.582155 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| WRP | Warwick Parkway | 52.286014 | -1.612273 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| WTO | Water Orton | 52.518379 | -1.743538 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| WED | Wedgwood | 52.951839 | -2.171135 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WMG | Welham Green | 51.736324 | -0.209989 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WLN | Wellington (Shropshire) | 52.701436 | -2.516719 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WEM | Wem | 52.856293 | -2.718784 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WBY | West Byfleet | 51.339394 | -0.505468 | uk-london-tfl | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WRN | West Runton | 52.935497 | 1.245516 | greater-anglia | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WHA | Westenhanger | 51.094922 | 1.038204 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WGA | Westgate-on-Sea | 51.381386 | 1.338402 | greater-anglia | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WHG | Westhoughton | 53.555775 | -2.523773 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WEY | Weymouth | 50.615927 | -2.45491 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WHE | Whalley | 53.824165 | -2.412186 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WTB | Whitby | 54.484324 | -0.614535 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WTC | Whitchurch (Shropshire) | 52.968048 | -2.671497 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WTH | Whitehaven | 54.552864 | -3.586843 | cumbria | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WBD | Whitley Bridge | 53.699129 | -1.15889 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WHI | Whitstable | 51.357686 | 1.034365 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WIA | Willenhall | 52.58192 | -2.05475 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| WMC | Wilmcote | 52.222618 | -1.755493 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WML | Wilmslow | 53.327099 | -2.226009 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WNE | Wilnecote | 52.610817 | -1.679499 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| WSF | Winsford | 53.190505 | -2.494669 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WDE | Wood End | 52.344143 | -1.844372 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| WLY | Woodley | 53.429245 | -2.093275 | greater-manchester | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WOO | Wool | 50.68148 | -2.220775 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WWW | Wootton Wawen | 52.265831 | -1.784561 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| WOF | Worcester Foregate Street | 52.195312 | -2.220777 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WOS | Worcester Shrub Hill | 52.195031 | -2.209328 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WOP | Worcestershire Parkway | 52.15622 | -2.1597 | uk-west-midlands | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WKG | Workington | 54.645061 | -3.558626 | cumbria | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WRE | Wrenbury | 53.019311 | -2.596089 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WRS | Wressle | 53.772826 | -0.923672 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WYE | Wye | 51.185463 | 0.929188 | london-se-national-rail | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| WYT | Wythall | 52.380125 | -1.865456 | uk-west-midlands | West Midlands' own catalog already excludes this station by name (existing notInRegion entry) — Staffordshire/Warwickshire/Worcestershire/Shropshire, outside the West Midlands metropolitan county |
| YRM | Yarm | 54.493763 | -1.351467 | west-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| YVJ | Yeovil Junction | 50.924814 | -2.612245 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| YVP | Yeovil Pen Mill | 50.944466 | -2.613461 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| YET | Yetminster | 50.895702 | -2.573802 | west-of-england | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| YRK | York | 53.957966 | -1.093159 | south-yorkshire | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |
| YRT | Yorton | 52.809009 | -2.73645 | liverpool-city-region | outside every target region's CITY_BOUNDS box; no existing region's territory clearly covers it |

## Summary

- **445 stations** verified against Darwin but with no home region this phase.
