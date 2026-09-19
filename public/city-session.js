/**
 * Multi-city session: Sydney, Brisbane, and Adelaide use production Vercel APIs.
 * Local debug can still probe a LAN dev server. Never silent-switch after an explicit pick.
 */
(function () {
  const LIVE_CITY = "perth";
  const MULTI_CITY_IDS = ["sydney", "brisbane", "adelaide", "uk-london-tfl", "canberra", "gold-coast", "newcastle", "stockholm", "goteborg", "malmo", "uppsala", "helsinki", "oslo", "uk-west-midlands", "west-of-england", "east-midlands", "liverpool-city-region", "solent", "south-wales", "west-yorkshire", "thames-valley", "greater-anglia", "rest-of-wales", "rest-of-scotland", "london-se-national-rail", "southwest", "greater-manchester", "south-yorkshire", "north-east", "glasgow", "edinburgh", "cumbria", "rest-of-england", "brussels"];
  const VERCEL_ORIGIN = "https://next-train-app.vercel.app";
  const SETTINGS_KEY = "nextTrainSettings";
  // docs/jim-brief-region-explicit-false-dropped.md: a marker persistRegion()
  // stamps on every write, independent of the regionExplicit value itself, so
  // migrateLegacyRegionExplicit() below can tell "this store has been through
  // post-fix persistRegion() at least once" apart from "genuinely predates
  // #383 (or is a bug-affected store from before this fix shipped)" without
  // relying on the very flag that was the bug. Not the same counter as
  // journey-model.js's SETTINGS_SCHEMA_VERSION, which triggers a destructive
  // one-time journey reset when bumped — this one is inert.
  const REGION_EXPLICIT_SCHEMA_VERSION = 1;

  const COUNTRIES = [
    {
      id: "au",
      name: "Australia",
      regions: [
        { id: "adelaide", name: "Adelaide", timeZone: "Australia/Adelaide" },
        { id: "brisbane", name: "Brisbane", timeZone: "Australia/Brisbane" },
        { id: "canberra", name: "Canberra", timeZone: "Australia/Sydney" },
        { id: "gold-coast", name: "Gold Coast", timeZone: "Australia/Brisbane" },
        { id: "melbourne", name: "Melbourne", timeZone: "Australia/Melbourne", comingSoon: true },
        { id: "newcastle", name: "Newcastle", timeZone: "Australia/Sydney" },
        { id: "perth", name: "Perth", timeZone: "Australia/Perth" },
        { id: "sydney", name: "Sydney", timeZone: "Australia/Sydney" },
      ],
    },
    {
      // Belgium: first Belgian region, flipped live 20 Sep 2026 (Mark's QA on PR #419,
      // docs/brussels-d1/mark-qa-note.md). See docs/brussels-d1/jim-handoff.md
      // "Flip commit — exact edits" for the full list-membership recipe.
      id: "be",
      name: "Belgium",
      regions: [
        { id: "brussels", name: "Brussels", timeZone: "Europe/Brussels" },
      ],
    },
    {
      id: "gb-eng",
      name: "England",
      regions: [
        // Listed in the order the picker shows them (alphabetical by display name).
        // Names lead with the place a rider would look for — "Manchester", not
        // "Greater Manchester" under G (Tim, 6 Sep 2026). Ids are unchanged; only the
        // label and position moved. United Kingdom split into England/Scotland/Wales
        // countries 7 Sep 2026 (docs/jim-brief-picker-countries-england-scotland-wales.md)
        // — region ids, timeZones, comingSoon, and feed fields are unchanged.
        { id: "cumbria", name: "Cumbria", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "greater-anglia", name: "East Anglia", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "east-midlands", name: "East Midlands", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "liverpool-city-region", name: "Liverpool City Region", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "uk-london-tfl", name: "London", timeZone: "Europe/London" },
        { id: "london-se-national-rail", name: "London & South East National Rail", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "greater-manchester", name: "Manchester", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "north-east", name: "North East (Tyne and Wear)", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "rest-of-england", name: "Rest of England", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "solent", name: "Solent (Southampton / Portsmouth)", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "southwest", name: "South West (Devon / Cornwall)", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "south-yorkshire", name: "South Yorkshire", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "thames-valley", name: "Thames Valley (Reading / Oxford)", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "uk-west-midlands", name: "West Midlands", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "west-of-england", name: "West of England", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "west-yorkshire", name: "West Yorkshire", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
      ],
    },
    {
      id: "fi",
      name: "Finland",
      regions: [
        { id: "helsinki", name: "Helsinki", timeZone: "Europe/Helsinki", comingSoon: false },
      ],
    },
    {
      id: "no",
      name: "Norway",
      regions: [
        { id: "oslo", name: "Oslo", timeZone: "Europe/Oslo" },
      ],
    },
    {
      id: "gb-sct",
      name: "Scotland",
      regions: [
        // "Scotland (…)" prefix dropped inside a Scotland-only list — redundant (Tim, 6 Sep 2026).
        { id: "rest-of-scotland", name: "Aberdeen / Inverness / Dundee", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "edinburgh", name: "Edinburgh", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "glasgow", name: "Glasgow", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
      ],
    },
    {
      id: "se",
      name: "Sweden",
      regions: [
        { id: "goteborg", name: "Göteborg", timeZone: "Europe/Stockholm" },
        { id: "malmo", name: "Malmö", timeZone: "Europe/Stockholm" },
        { id: "stockholm", name: "Stockholm", timeZone: "Europe/Stockholm" },
        { id: "uppsala", name: "Uppsala", timeZone: "Europe/Stockholm" },
      ],
    },
    {
      id: "us",
      name: "United States",
      regions: [
        // docs/jim-brief-us-flip-readiness.md — Coming Soon only; none of these
        // are live yet, per the pipeline's "no picker entry for a new planned
        // city" rule (Tim, 30 Aug 2026) not applying here because Mark's Boston
        // QA is green and this is the flip-readiness scaffolding, not a bare
        // planned-city add. Kept comingSoon: true and out of MULTI_CITY_IDS —
        // status stays "planned" in the registry until a separate flip PR.
        { id: "bart", name: "BART (San Francisco Bay Area)", timeZone: "America/Los_Angeles", comingSoon: true },
        { id: "boston", name: "Boston", timeZone: "America/New_York", comingSoon: true },
        { id: "chicago", name: "Chicago", timeZone: "America/Chicago", comingSoon: true },
      ],
    },
    {
      id: "gb-wls",
      name: "Wales",
      regions: [
        { id: "rest-of-wales", name: "North, Mid & West Wales", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "south-wales", name: "South Wales", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
      ],
    },
  ];

  // Order rule (7 Sep 2026, docs/jim-brief-city-bounds-order-after-geocode.md):
  // hintCityFromCoords() returns the FIRST matching box in object order. Where
  // one region's box geometrically contains a smaller region's box (or a
  // smaller region's stations), the smaller/more specific box MUST be
  // declared before the larger one, or every GPS hint inside the smaller
  // region silently resolves to the larger one instead. Enforced by
  // qa/uk-city-bounds-overlap-gate.mjs's containment-order check — that gate
  // fails the build if this is violated, so don't reorder without rerunning it.
  const CITY_BOUNDS = {
    sydney: { minLat: -34.15, maxLat: -33.45, minLng: 150.6, maxLng: 151.35 },
    newcastle: { minLat: -32.94, maxLat: -32.91, minLng: 151.75, maxLng: 151.80 },
    perth: { minLat: -32.8, maxLat: -31.4, minLng: 115.55, maxLng: 116.25 },
    "gold-coast": { minLat: -28.13, maxLat: -27.90, minLng: 153.32, maxLng: 153.46 },
    brisbane: { minLat: -28.2, maxLat: -27.0, minLng: 152.6, maxLng: 153.6 },
    adelaide: { minLat: -35.3, maxLat: -34.55, minLng: 138.35, maxLng: 138.85 },
    "uk-london-tfl": { minLat: 51.28, maxLat: 51.7, minLng: -0.52, maxLng: 0.35 },
    canberra: { minLat: -35.32, maxLat: -35.16, minLng: 149.10, maxLng: 149.17 },
    stockholm: { minLat: 58.85, maxLat: 59.60, minLng: 17.50, maxLng: 18.40 },
    goteborg: { minLat: 57.55, maxLat: 57.85, minLng: 11.75, maxLng: 12.25 },
    malmo: { minLat: 55.30, maxLat: 56.75, minLng: 12.60, maxLng: 15.55 },
    uppsala: { minLat: 59.30, maxLat: 60.75, minLng: 16.80, maxLng: 18.60 },
    helsinki: { minLat: 60.13, maxLat: 60.25, minLng: 24.62, maxLng: 25.16 },
    oslo: { minLat: 59.60, maxLat: 60.25, minLng: 10.40, maxLng: 11.20 },
    // Brussels (docs/jim-brief-brussels-flip-readiness.md, 20 Sep 2026) — comingSoon in the
    // picker, box derived from lib/cities/brussels/stations.json's 60 catalogued stations
    // (lat 50.812-50.897, lng 4.267-4.465) with a small margin. Doesn't overlap any other
    // region's box, so its position here doesn't affect containment order.
    brussels: { minLat: 50.79, maxLat: 50.92, minLng: 4.24, maxLng: 4.49 },
    "uk-west-midlands": { minLat: 52.25, maxLat: 52.70, minLng: -2.35, maxLng: -1.45 },
    // south-wales is listed BEFORE west-of-england so hintCityFromCoords's
    // first-match lookup resolves the Severn-estuary stations correctly:
    // Newport (NWP, lat 51.589, lng -3.0005) geometrically falls inside
    // BOTH boxes below (West of England's own catalog needs Taunton at lng
    // -3.10, which is further west than Newport, so no single rectangle can
    // hold Taunton while excluding Newport by longitude alone) — south-wales
    // being checked first is what actually resolves Newport correctly, not
    // the box shape. Widened 7 Sep 2026 (docs/south-wales-d1/jim-handoff.md
    // re-scope) to cover all 16 catalog stations incl. Swansea (-3.94),
    // Neath (-3.81), Port Talbot Parkway (-3.78), Merthyr Tydfil (51.74),
    // Rhymney (51.76), with a small margin.
    "south-wales": { minLat: 51.35, maxLat: 51.80, minLng: -4.05, maxLng: -2.70 },
    // Western edge pulled back from -3.20 to -3.15 (7 Sep 2026) — just west
    // of Taunton (-3.1028, West of England's own westernmost catalog
    // station) so Cardiff (-3.179) and Barry Island (-3.273) no longer fall
    // in this box. Newport (-3.0005) still does, geometrically, because
    // Taunton is further west than Newport and both must fit — but since
    // south-wales precedes this entry above, hintCityFromCoords resolves
    // Newport to south-wales before it ever reaches this box. Trade-off
    // documented rather than solved with unsupported multi-box logic.
    // minLat raised from 50.90 to 51.20 (7 Sep 2026, uk-catalog-geocode fix):
    // West of England's own catalogued stations (lib/cities/west-of-england/
    // stations.json) are Westbury (51.267), Bath Spa, Bristol Temple Meads,
    // Chepstow, Gloucester — all >= 51.267 — except Taunton (51.023), which
    // is a boundary through-running station also catalogued in Southwest
    // (docs/jim-brief-city-bounds-order-after-geocode.md item 2); Southwest
    // is Taunton's home region for the GPS hint. The old 50.90 floor put
    // Taunton inside this box too, so a rider standing there got hinted into
    // West of England instead. 51.20 sits just south of Westbury and north
    // of Taunton, so Taunton now falls out of this box entirely (see
    // "west-of-england" allow-list entry below for Taunton's own catalog
    // listing, which now legitimately resolves to southwest instead).
    "west-of-england": { minLat: 51.20, maxLat: 51.95, minLng: -3.15, maxLng: -2.10 },
    // Box widened 13 Sep 2026 (UK station fill phase 1, docs/jim-brief-uk-
    // station-fill-phase1.md): the catalog grew from 6 to 105 rail stations
    // across Nottinghamshire/Derbyshire/Leicestershire/Northamptonshire/
    // Rutland/Lincolnshire. Tuned to 98% coverage of this region's own
    // catalog (Kings Sutton/Northampton, both far-south Northamptonshire
    // near Thames Valley, are the only two excluded — harmless no-hint, same
    // trade-off already documented elsewhere in this file). This does
    // genuinely overlap South Yorkshire (Sheffield/Meadowhall/Rotherham,
    // Peak District stations sit right on that boundary) and Greater Anglia
    // (Cambridge/Peterborough/Ely, Lincolnshire's Skegness branch reaches
    // that far east) — resulting overlaps are allow-listed in
    // qa/uk-city-bounds-overlap-gate.mjs with reasons.
    // minLng widened from -1.99 to -2.01 (15 Sep 2026, docs/jim-brief-rest-of-england-
    // reassignment.md): New Mills Central/Newtown (Derbyshire, High Peak) reassigned in from
    // rest-of-england — the old floor excluded these two real, NaPTAN-verified stations.
    "east-midlands": { minLat: 52.25, maxLat: 53.47, minLng: -2.01, maxLng: 0.34 },
    // minLat/minLng/maxLng widened 7 Sep 2026 (uk-catalog-geocode): Colchester, Stansted
    // Airport, Bishops Stortford (lat), Peterborough (lng), Great Yarmouth/Lowestoft (lng)
    // are real, NaPTAN-verified catalog stations the old box excluded.
    // minLat widened from 51.80 to 51.62 (15 Sep 2026, docs/jim-brief-essex-to-greater-
    // anglia.md round 1): nine Essex stations reassigned in from rest-of-england sit as
    // far south as Burnham-on-Crouch itself (51.6335) — the old floor excluded all nine.
    // That single-box widening was reverted 16 Sep 2026 (round 2, Mark's PR #402 finding):
    // it made hintCityFromCoords send a rider physically at Cheshunt (51.7027, rest-of-
    // england's own station) into this box, which has no Cheshunt — Cheshunt's latitude
    // sits BETWEEN the two reassigned clusters (Burnham-on-Crouch/Southminster at
    // 51.63-51.66, and Chelmsford/Beaulieu Park/Harlow/Hatfield Peverel/Roydon at
    // 51.74-51.79), so no single rectangle spanning both clusters can exclude it. Split
    // into two boxes instead (CITY_BOUNDS values may now be a single box OR an array of
    // boxes — see hintCityFromCoords/inAnyBounds below, and qa/uk-city-bounds-overlap-
    // gate.mjs's/qa/uk-catalog-coords-gate.mjs's matching support). This box covers the
    // higher-latitude cluster only; minLat 51.72 sits just above Cheshunt (51.7027) and
    // just below Chelmsford (51.7366), the lowest of that cluster. The Crouch Valley
    // cluster (Burnham-on-Crouch, Southminster) is the separate "greater-anglia" second
    // box below. Still genuinely overlaps several Hertfordshire rest-of-england stations
    // whose own latitude also falls in this band (Bayford, Broxbourne, Hatfield, Hertford
    // East/North, Rye House, St Margarets, Welham Green, Brookmans Park) — allow-listed in
    // qa/uk-city-bounds-overlap-gate.mjs with reasons, same pre-existing trade-off as every
    // other widened box in this file; Cheshunt and Cuffley's latitude (51.7027/51.7091)
    // both now fall below this floor, which is what fixes the regression.
    "greater-anglia": [
      { minLat: 51.72, maxLat: 52.9, minLng: -0.30, maxLng: 1.8 },
      // Crouch Valley cluster: Burnham-on-Crouch (51.6335, 0.8135) and Southminster
      // (51.6609, 0.8354), the two southernmost of the nine reassigned Essex stations.
      // maxLat 51.70 sits just below Cheshunt (51.7027), so a rider at Cheshunt falls
      // outside BOTH greater-anglia boxes and correctly falls through to rest-of-england
      // further down this object. Also overlaps Althorne (51.6479, 0.7525), a genuine
      // london-se-national-rail Crouch Valley station — allow-listed, same pre-existing
      // trade-off as above.
      { minLat: 51.60, maxLat: 51.70, minLng: 0.70, maxLng: 0.90 },
    ],
    // maxLat widened 7 Sep 2026 (uk-catalog-geocode): Walsden (WDN, 53.696) is a real,
    // NaPTAN-verified boundary station the old 53.55 ceiling excluded.
    // Box widened 15 Sep 2026 (docs/jim-brief-rest-of-england-reassignment.md): 33 stations
    // reassigned in from rest-of-england (Trafford/Salford/Bolton/Wigan/Tameside/Stockport/Oldham
    // boroughs — Flixton, Urmston, Chassen Road, Irlam among them) sat outside the old -2.35/-2.10
    // longitude band on both edges. Widening does not fix Wigan North Western/Wallgate (still
    // outside this box on the far west, at -2.633) — a pre-existing gap, out of scope for this PR.
    "greater-manchester": { minLat: 53.35, maxLat: 53.70, minLng: -2.54, maxLng: -2.01 },
    // Box widened 15 Sep 2026 (docs/jim-brief-rest-of-england-reassignment.md): 10 stations
    // reassigned in from rest-of-england (Doncaster/Barnsley/Rotherham boroughs — Adwick, Bentley,
    // Conisbrough, Doncaster, Hatfield & Stainforth, Kirk Sandall, Kiveton Park, Penistone, Thorne
    // North/South) sat outside the old -1.58/-1.25 longitude band on both edges.
    "south-yorkshire": { minLat: 53.30, maxLat: 53.62, minLng: -1.63, maxLng: -0.95 },
    "north-east": { minLat: 54.85, maxLat: 55.80, minLng: -2.10, maxLng: -1.35 },
    // Box widened 7 Sep 2026 (uk-catalog-geocode): the 98-station rescope (Merseyrail +
    // National Rail) reaches well beyond the original 5-point estimate this box was drawn
    // from (see docs/liverpool-city-region-d1/jim-handoff.md item 3) — Earlestown, Garswood,
    // Heswall, Upton (Merseyside), Meols Cop etc. are real, NaPTAN-verified stations.
    "liverpool-city-region": { minLat: 53.25, maxLat: 53.70, minLng: -3.10, maxLng: -2.55 },
    solent: { minLat: 50.75, maxLat: 51.55, minLng: -2.30, maxLng: -0.05 },
    // minLat widened 7 Sep 2026 (uk-catalog-geocode): Denby Dale (53.573) and Huddersfield
    // (53.649) are real, NaPTAN-verified catalog stations the old 53.65 floor excluded.
    // maxLng widened from -1.30 to -1.25 (15 Sep 2026, docs/jim-brief-rest-of-england-
    // reassignment.md): Knottingley (City of Wakefield borough) reassigned in from rest-of-england
    // — the old ceiling excluded this real, NaPTAN-verified station.
    "west-yorkshire": { minLat: 53.55, maxLat: 53.95, minLng: -2.40, maxLng: -1.25 },
    // Box widened 7 Sep 2026 (uk-catalog-geocode): Swindon/Westbury (lng) and Banbury (lat)
    // are real, NaPTAN-verified catalog stations the old box excluded.
    "thames-valley": { minLat: 51.0, maxLat: 52.10, minLng: -2.25, maxLng: -0.5 },
    "rest-of-wales": { minLat: 51.55, maxLat: 53.4, minLng: -5.5, maxLng: -2.6 },
    // glasgow and edinburgh are listed BEFORE rest-of-scotland (7 Sep 2026,
    // uk-catalog-geocode fix — docs/jim-brief-city-bounds-order-after-geocode.md
    // item 1): both cities' boxes below sit entirely inside rest-of-scotland's
    // much larger (55.4-58.6, -5.9 to -2.0) box. With rest-of-scotland listed
    // first (as it was), every Glasgow/Edinburgh GPS hint silently resolved to
    // rest-of-scotland instead of the city-specific region. Per the order rule
    // above (contained box first), these two now precede it.
    // Box widened 13 Sep 2026 (UK station fill phase 1): the catalog grew
    // from 2 to 178 rail stations covering the whole Strathclyde (former
    // SPT) suburban network — Inverclyde (Gourock, -4.81), Ayrshire to Ayr/
    // Largs (55.40 lat), Lanarkshire, Dunbartonshire. Genuinely overlaps
    // edinburgh's box in the Central Belt (both regions' commuter footprints
    // are geographically adjacent) — resulting per-station overlaps are
    // allow-listed in qa/uk-city-bounds-overlap-gate.mjs with reasons,
    // rather than solved with unsupported multi-box logic (same trade-off
    // already documented above for south-wales/west-of-england).
    glasgow: { minLat: 55.40, maxLat: 56.01, minLng: -4.89, maxLng: -3.66 },
    // Box widened 13 Sep 2026 (UK station fill phase 1): the catalog grew
    // from 3 to 37 rail stations covering the City of Edinburgh plus East/
    // Midlothian/West Lothian commuter stations into Waverley — North
    // Berwick (56.06 lat), Bathgate/West Calder (-3.65/-3.79 lng), Falkirk
    // High. See the glasgow overlap note above.
    edinburgh: { minLat: 55.82, maxLat: 56.06, minLng: -3.80, maxLng: -2.51 },
    // minLng widened 7 Sep 2026 (uk-catalog-geocode): Kyle of Lochalsh (-5.71) and Mallaig
    // (-5.83) are real, NaPTAN-verified stations the old -5.5 floor excluded.
    // minLat lowered from 55.4 to 54.90 (13 Sep 2026, UK station fill phase 1):
    // the catalog grew from 9 to 147 stations, reaching south to the
    // Dumfries/Annan/Borders corridor (Gretna Green area, ~54.91 lat).
    "rest-of-scotland": { minLat: 54.90, maxLat: 58.6, minLng: -5.9, maxLng: -2.0 },
    // maxLng widened from 0.8 to 1.44 and minLng from -0.5 to -0.51 (15 Sep 2026 round 2,
    // docs/jim-brief-rest-of-england-reassignment.md): 41 stations (38 East Kent — Ashford
    // International through Margate/Ramsgate/Dover Priory/Broadstairs — plus Chertsey/Staines/
    // West Byfleet, Surrey) reassigned in from rest-of-england, Kent/Surrey claimed explicitly by
    // this pack's own coverage.json. The Kent widening alone fixes their own-region resolution;
    // Chertsey/Staines/West Byfleet still resolve to uk-london-tfl's box first regardless of this
    // widening (uk-london-tfl is earlier in this object's first-match order and geometrically
    // covers this corner too) — the coords gate needs them literally inside their own box even
    // though the overlap gate's priority order still resolves them to uk-london-tfl, so
    // allow-listed there instead of solved with box priority.
    "london-se-national-rail": { minLat: 50.7, maxLat: 51.7, minLng: -0.51, maxLng: 1.44 },
    // minLat/minLng widened 7 Sep 2026 (uk-catalog-geocode): Penzance/Truro/St Erth/St
    // Austell/Plymouth/Totnes are real, NaPTAN-verified stations the old 50.5/-4.7 floor
    // excluded (the box was drawn well east/north of Devon & Cornwall's actual extent).
    southwest: { minLat: 50.05, maxLat: 51.3, minLng: -5.6, maxLng: -3.0 },
    // minLng widened from -3.30 to -3.60 (15 Sep 2026, docs/jim-brief-rest-of-england-
    // reassignment.md): the whole West Cumbria coast line (Aspatria through Bootle, 16 stations)
    // reassigned in from rest-of-england — genuinely inside ceremonial Cumbria (Cumberland/
    // Copeland/Allerdale), a gap in this pack's own catalog rather than a wrong-region case.
    cumbria: { minLat: 54.00, maxLat: 55.00, minLng: -3.60, maxLng: -2.20 },
    // rest-of-england is a flat English catch-all (436 stations with no home in any
    // named region, docs/uk-station-fill/unassigned-england.md) — its box necessarily
    // spans most of England and would swallow every more specific English region's
    // hint above it, so it is listed LAST (first-match-wins order) per this file's own
    // rule, same as rest-of-scotland/rest-of-wales being wide catch-alls relative to
    // Glasgow/Edinburgh. Bounds are the min/max lat/lng actually present in the
    // catalog (docs/jim-brief-uk-station-fill-phase2b.md), not a hand-drawn estimate.
    "rest-of-england": { minLat: 50.6, maxLat: 54.85, minLng: -3.6, maxLng: 1.45 },
    // United States (docs/jim-brief-us-flip-readiness.md) — Coming Soon regions,
    // no overlap risk with any existing box (different continent). Derived from
    // each catalog's actual station coordinates with a small margin.
    // BART's southern edge (Berryessa/North San José, 37.368) is BART's own
    // real southernmost station — the small margin below (37.34) stops well
    // short of Diridon (37.3297), Caltrain/VTA's own hub, so this box does not
    // reach into Caltrain/VTA-only territory.
    bart: { minLat: 37.34, maxLat: 38.05, minLng: -122.5, maxLng: -121.75 },
    boston: { minLat: 42.15, maxLat: 42.48, minLng: -71.3, maxLng: -70.95 },
    chicago: { minLat: 41.68, maxLat: 42.12, minLng: -87.95, maxLng: -87.55 },
  };

  function dogfood() {
    return window.NextTrainBrisbaneDogfood || window.NextTrainPlannedCityDogfood;
  }

  function regionById(regionId) {
    for (const country of COUNTRIES) {
      const region = country.regions.find((entry) => entry.id === regionId);
      if (region) {
        return { country, region };
      }
    }
    return null;
  }

  function countryById(countryId) {
    return COUNTRIES.find((country) => country.id === countryId) ?? COUNTRIES[0];
  }

  function inBounds(lat, lng, box) {
    return lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng;
  }

  // A CITY_BOUNDS value is normally a single box, but may be an array of boxes
  // (added 16 Sep 2026, docs/jim-brief-essex-to-greater-anglia.md round 2) for a
  // region whose catalog forms two or more geographically separate clusters that
  // no single rectangle can bound without also catching an unrelated neighbour
  // (see the "greater-anglia" entry above) — true if lat/lng falls in ANY of them.
  function inAnyBounds(lat, lng, boxOrBoxes) {
    const boxes = Array.isArray(boxOrBoxes) ? boxOrBoxes : [boxOrBoxes];
    return boxes.some((box) => inBounds(lat, lng, box));
  }

  function hintCityFromCoords(lat, lng) {
    for (const [id, boxOrBoxes] of Object.entries(CITY_BOUNDS)) {
      if (inAnyBounds(lat, lng, boxOrBoxes)) {
        return id;
      }
    }
    return null;
  }

  // docs/jim-brief-near-me-nearest-station-region.md — hintCityFromCoords picks
  // the FIRST CITY_BOUNDS box that contains the rider, which is wrong wherever
  // regions overlap (Central London: uk-london-tfl is listed before
  // london-se-national-rail, so a rider at King's Cross/Waterloo/Victoria was
  // hinted Tube even standing at a National Rail terminus). Near me already has
  // (or can cheaply fetch) the country-wide station list, each row carrying its
  // own region, so resolve the region from the nearest LIVE-FEED station across
  // every region in that list instead of a bounding box. Radius mirrors the "no
  // station nearby" cutoff Near me itself would apply; beyond it (or with no
  // usable station list) the caller should fall back to hintCityFromCoords.
  const NEAREST_STATION_HINT_RADIUS_KM = 15;

  function haversineKm(lat1, lng1, lat2, lng2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Resolve a region id from the nearest live-feed station in `stations` (the
   * shape `/api/country-stations` returns: `{ name, lat, lng, liveFeed, region:
   * { id, displayName } }`). Returns null — never CITY_BOUNDS — when no live
   * station is within radiusKm or the list has nothing usable, so callers can
   * fall back to hintCityFromCoords themselves; this function never guesses.
   *
   * Co-location tie rule (docs/jim-brief-near-me-nearest-station-region.md,
   * round 2, Mark's PR #403 FAIL): at an interchange the closer coordinate is
   * usually the metro/tram/TfL entrance, not the National Rail one, so plain
   * "nearest wins" sent a King's Cross/Waterloo rider to uk-london-tfl even
   * though they were standing on top of a Darwin station too. Among
   * candidates co-located with the single nearest one, a Darwin (National
   * Rail) feed wins over a non-Darwin (metro/tram/TfL) one, decided by the
   * region's own `feed` field (isDarwinCityId) — never a London/city-id
   * special case, so Glasgow Queen Street vs Buchanan Street and Newcastle
   * Interchange get the same treatment. When co-located candidates are all
   * the same feed type (e.g. two Darwin stations at a shared interchange),
   * nearest still wins.
   *
   * Round 3 (Mark's FAIL on round 2, PR #403): the round-2 rule measured
   * "distance from the candidate to the RIDER minus distance from the
   * nearest station to the rider <= 250 m" — for a rider standing on top of
   * the nearest stop that is "any Darwin station within 250 m of the rider",
   * which swept in a separate nearby station rather than an interchange (Bank
   * resolved to london-se-national-rail via London Cannon Street, 243 m from
   * the rider but ~280 m from Bank itself). Co-location is now measured
   * STATION-TO-STATION — the distance between the nearest station's own
   * coordinates and the candidate's — with a much tighter CO_LOCATION_STATION_KM
   * radius, since real interchange entrances are metres-to-low-tens-of-metres
   * apart, not hundreds. Verified against real published coordinates: King's
   * Cross St Pancras (Tube) vs London King's Cross (NR) ~129 m apart, London
   * Waterloo (Tube) vs London Waterloo (NR) ~89 m apart — both co-located;
   * Bank (Tube) vs Cannon Street (NR) ~226 m apart — not co-located, so Bank
   * still correctly resolves to uk-london-tfl; Glasgow Queen Street vs
   * Buchanan Street (Subway) ~122 m apart but Buchanan Street is
   * `liveFeed: false` and so is never a candidate regardless of distance.
   */
  const CO_LOCATION_STATION_KM = 0.15;

  function hintCityFromNearestStation(lat, lng, stations, { radiusKm = NEAREST_STATION_HINT_RADIUS_KM } = {}) {
    if (!Array.isArray(stations) || !stations.length || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    const candidates = [];
    for (const station of stations) {
      if (!station || station.liveFeed === false) {
        continue;
      }
      const stationLat = Number(station.lat);
      const stationLng = Number(station.lng);
      const regionId = station.region?.id;
      if (!regionId || !Number.isFinite(stationLat) || !Number.isFinite(stationLng)) {
        continue;
      }
      const distanceKm = haversineKm(lat, lng, stationLat, stationLng);
      if (distanceKm > radiusKm) {
        continue;
      }
      candidates.push({ regionId, distanceKm, stationLat, stationLng });
    }
    if (!candidates.length) {
      return null;
    }
    candidates.sort((a, b) => a.distanceKm - b.distanceKm);
    const nearest = candidates[0];
    // Station-to-station, not rider-to-candidate (round 3) — a candidate is
    // co-located only if it sits within CO_LOCATION_STATION_KM of the
    // NEAREST STATION'S coordinates, not the rider's.
    const coLocated = candidates.filter(
      (c) =>
        c === nearest ||
        haversineKm(nearest.stationLat, nearest.stationLng, c.stationLat, c.stationLng) <= CO_LOCATION_STATION_KM
    );
    const darwinCandidate = coLocated.find((c) => isDarwinCityId(c.regionId));
    if (darwinCandidate && !isDarwinCityId(nearest.regionId)) {
      return darwinCandidate.regionId;
    }
    return nearest.regionId;
  }

  const TFL_OPEN_DATA_LINE = "Powered by TfL Open Data";
  const VANCOUVER_TRANSLINK_DISCLAIMER =
    "Some of the data used in this product or service is provided by permission of TransLink. TransLink assumes no responsibility for the accuracy or currency of the Data used in this product or service.";
  const RDG_LDB_LINE =
    "Live departure data © Rail Delivery Group, via the Rail Data Marketplace. Times may change — check station displays.";

  function isDarwinCityId(cityId) {
    const id = String(cityId || "").toLowerCase();
    const found = regionById(id);
    return Boolean(found && found.region.feed === "darwin");
  }

  function feedAttributionForCity(cityId) {
    const id = String(cityId || "").toLowerCase();
    if (id === "vancouver") {
      return { text: VANCOUVER_TRANSLINK_DISCLAIMER, required: true };
    }
    if (id === "uk-london-tfl") {
      return { text: TFL_OPEN_DATA_LINE, required: false };
    }
    if (isDarwinCityId(id)) {
      return { text: RDG_LDB_LINE, required: true };
    }
    return null;
  }

  function syncFeedAttribution(cityId) {
    const el = document.getElementById("attribution");
    if (!el) {
      return;
    }
    const city = String(cityId || readSavedCity() || LIVE_CITY).toLowerCase();
    const attr = feedAttributionForCity(city);
    if (!attr) {
      el.textContent = "";
      el.hidden = true;
      el.classList.remove("is-required");
      return;
    }
    el.textContent = attr.text;
    el.hidden = false;
    el.classList.toggle("is-required", Boolean(attr.required));
  }

  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function readSavedCity() {
    const city = String(readStore().savedCity || "").toLowerCase();
    const found = regionById(city);
    // No matching picker region at all (e.g. a retired city — release-1 scope cut,
    // 7 Sep 2026) degrades the same way a comingSoon region does: fall through to the
    // caller's default rather than surfacing a city the app can no longer resolve.
    if (!found || found.region.comingSoon) {
      return "";
    }
    return city;
  }

  function readSavedCountry() {
    const fromStore = String(readStore().savedCountry || "").toLowerCase();
    if (countryById(fromStore)?.id === fromStore) {
      return fromStore;
    }
    return regionById(readSavedCity())?.country.id ?? "au";
  }

  function readRegionExplicit() {
    return readStore().regionExplicit === true;
  }

  let legacyRegionExplicitMigrated = false;

  // Pre-PR installs wrote `savedCity` from the old mandatory region picker but
  // never had a `regionExplicit` flag at all (the key is absent, not `false`).
  // Without this, syncRegionControls() below treats that the same as the new
  // GPS-follow path (savedCity set, explicit: false) and resets a stored
  // Stockholm/etc. pick back to "All" on first open after the upgrade
  // (docs/jim-brief-country-wide-station-picker.md Round 2, Mark FAIL #1).
  // Runs once: after it writes the flag, the key exists and this is a no-op.
  //
  // Gated on REGION_EXPLICIT_SCHEMA_VERSION as well as the flag's presence
  // (docs/jim-brief-region-explicit-false-dropped.md): a store that has been
  // through post-fix persistRegion() at least once always carries the
  // schema-version marker, whether regionExplicit is true or false, so a
  // store missing the flag but carrying the marker is a real `false` — never
  // treated as a legacy upgrade again. A store with neither the flag nor the
  // marker is either a genuine pre-#383 legacy install, or (until every
  // device has reloaded once since this fix shipped) an already-affected
  // store from the dropped-`false` bug — those two are indistinguishable
  // from what's on disk, so this still treats them as legacy, same as
  // before. That known gap is deliberate, not an oversight: see the PR
  // description for why it can't be resolved without guessing.
  function migrateLegacyRegionExplicit() {
    if (legacyRegionExplicitMigrated) {
      return;
    }
    legacyRegionExplicitMigrated = true;
    const store = readStore();
    const hasFlag = Object.prototype.hasOwnProperty.call(store, "regionExplicit");
    const hasSchemaMarker = Object.prototype.hasOwnProperty.call(
      store,
      "regionExplicitSchemaVersion"
    );
    const savedCity = String(store.savedCity || "").trim();
    if (!hasFlag && !hasSchemaMarker && savedCity) {
      persistRegion({
        city: savedCity,
        country: store.savedCountry,
        explicit: true,
        source: "migration",
      });
    }
  }

  function persistRegion({ city, country, explicit, source }) {
    const patch = {
      savedCity: city,
      savedCountry: country || regionById(city)?.country.id || "au",
      // Written on every persist, independent of `explicit`'s value, so its
      // mere presence proves "this store has been through post-fix
      // persistRegion() at least once" (see the constant's own comment).
      regionExplicitSchemaVersion: REGION_EXPLICIT_SCHEMA_VERSION,
    };
    if (explicit !== undefined) {
      patch.regionExplicit = Boolean(explicit);
      // Only meaningful when explicit is true — who set it, a rider's own
      // pick or the legacy-upgrade migration above. Used to repair riders
      // affected by a future recurrence of this same bug; today's already-
      // affected riders predate this field, so it can't repair them (PR
      // description).
      if (explicit) {
        patch.regionExplicitSource = source === "migration" ? "migration" : "picker";
      }
    }
    const persist = window.nextTrainJourneyModel?.persistSettings;
    if (typeof persist === "function") {
      persist(patch);
      return;
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...readStore(), ...patch }));
  }

  function isRegionOpen(region) {
    if (!region || region.comingSoon) {
      return false;
    }
    return true;
  }

  function firstOpenRegion(countryId) {
    return countryById(countryId).regions.find((region) => isRegionOpen(region)) ?? null;
  }

  function readRegionMismatchDismissed() {
    return String(readStore().regionMismatchDismissed || "");
  }

  function dismissRegionMismatch(savedCity, detectedCity) {
    const patch = {
      regionMismatchDismissed: `${savedCity}>${detectedCity}`,
    };
    const persist = window.nextTrainJourneyModel?.persistSettings;
    if (typeof persist === "function") {
      persist(patch);
      return;
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...readStore(), ...patch }));
  }

  function clearRegionMismatchDismissed() {
    const persist = window.nextTrainJourneyModel?.persistSettings;
    if (typeof persist === "function") {
      persist({ regionMismatchDismissed: "" });
      return;
    }
    const store = readStore();
    delete store.regionMismatchDismissed;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(store));
  }

  function bindRegionMismatchDialog() {
    const dialog = document.getElementById("region-mismatch-dialog");
    const body =
      document.getElementById("region-mismatch-body") ||
      document.getElementById("region-mismatch-dialog-body");
    const switchBtn = document.getElementById("region-mismatch-switch-btn");
    const keepBtn =
      document.getElementById("region-mismatch-keep-btn") ||
      document.getElementById("region-mismatch-dismiss-btn");
    if (!dialog || !body || !switchBtn || !keepBtn) {
      return;
    }

    let pending = null;

    function closeDialog() {
      window.nextTrainApp?.closeAppDialog?.(dialog);
      pending = null;
    }

    switchBtn.addEventListener("click", () => {
      const next = pending;
      closeDialog();
      if (next?.detectedCity) {
        clearRegionMismatchDismissed();
        void applyCity(next.detectedCity, { persist: true, explicit: true });
      }
    });

    keepBtn.addEventListener("click", () => {
      const next = pending;
      closeDialog();
      if (next?.savedCity && next?.detectedCity) {
        dismissRegionMismatch(next.savedCity, next.detectedCity);
      }
    });

    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      const next = pending;
      closeDialog();
      if (next?.savedCity && next?.detectedCity) {
        dismissRegionMismatch(next.savedCity, next.detectedCity);
      }
    });

    return {
      open(savedCity, detectedCity) {
        pending = { savedCity, detectedCity };
        const savedLabel = regionDisplayName(savedCity);
        const detectedLabel = regionDisplayName(detectedCity);
        body.textContent = `Your location looks like ${detectedLabel}, but the app is set to ${savedLabel}. Switch region?`;
        switchBtn.textContent = `Switch to ${detectedLabel}`;
        keepBtn.textContent = `Keep ${savedLabel}`;
        window.nextTrainApp?.openAppDialog?.(dialog);
      },
    };
  }

  let regionMismatchDialog = null;

  async function maybePromptRegionMismatch({ locateCity, skip } = {}) {
    let shouldSkip = false;
    try {
      shouldSkip = typeof skip === "function" ? Boolean(skip()) : Boolean(skip);
    } catch {
      shouldSkip = false;
    }
    if (shouldSkip) {
      return false;
    }
    const explicit = readRegionExplicit();
    if (!explicit) {
      console.log("[NextTrainCitySession] Mismatch check skipped: not explicit");
      return false;
    }
    const savedCity = readSavedCity() || LIVE_CITY;
    const locate = locateCity || geolocateHint;
    console.log("[NextTrainCitySession] Mismatch check: locating...");
    const detectedCity = await locate();
    console.log(`[NextTrainCitySession] Mismatch check: saved=${savedCity}, detected=${detectedCity}`);
    if (!detectedCity || detectedCity === savedCity) {
      return false;
    }
    const detectedRegion = regionById(detectedCity)?.region;
    if (!isRegionOpen(detectedRegion)) {
      return false;
    }
    const pairKey = `${savedCity}>${detectedCity}`;
    if (readRegionMismatchDismissed() === pairKey) {
      console.log(`[NextTrainCitySession] Mismatch check: dismissed already (${pairKey})`);
      return false;
    }
    if (!regionMismatchDialog) {
      regionMismatchDialog = bindRegionMismatchDialog();
    }
    if (!regionMismatchDialog) {
      console.warn("[NextTrainCitySession] Mismatch check: no dialog bound");
      return false;
    }
    console.log(`[NextTrainCitySession] Mismatch check: opening dialog for ${detectedCity}`);
    regionMismatchDialog.open(savedCity, detectedCity);
    return true;
  }

  async function geolocateHint() {
    // Jim brief: wait for app stability before requesting permissions on cold boot.
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const pos = await new Promise((resolve, reject) => {
        if (!navigator.geolocation?.getCurrentPosition) {
          reject(new Error("no geo"));
          return;
        }
        const isTestActive = sessionStorage.getItem("nextTrainTestMode") === "1" || window.location.search.includes("test=1");
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: isTestActive ? 2500 : 4000,
          maximumAge: 300000,
        });
      });
      // docs/jim-brief-picker-near-you-nearest-five.md: feed the app-wide
      // last-known-position cache from this GPS-follow fix too, not just
      // app.js's getAppGeolocationPosition — never a new geolocation request,
      // just recording the fix this path already made.
      window.nextTrainLastPosition?.write?.(
        pos.coords.latitude,
        pos.coords.longitude,
        pos.timestamp
      );
      return hintCityFromCoords(pos.coords.latitude, pos.coords.longitude);
    } catch {
      return null;
    }
  }

  function fillCountrySelect(select, countryId) {
    if (!select) {
      return;
    }
    select.replaceChildren();
    for (const country of COUNTRIES) {
      const option = document.createElement("option");
      option.value = country.id;
      option.textContent = country.name;
      const hasOpen = country.regions.some((region) => isRegionOpen(region));
      if (!hasOpen) {
        option.textContent = `${country.name} (Coming Soon)`;
      }
      select.append(option);
    }
    select.value = countryId;
  }

  // docs/jim-brief-country-wide-station-picker.md #1: Region is now an
  // optional filter over the whole country's station list, not a required
  // pick. "All" (value "") is always the first entry. `regionId === ""`
  // (or omitted) selects it; a real region id still narrows the list and
  // sets the active region exactly as before.
  function fillRegionSelect(select, countryId, regionId) {
    if (!select) {
      return;
    }
    select.replaceChildren();
    const country = countryById(countryId);
    const hasOpen = country.regions.some((region) => isRegionOpen(region));

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "All";
    select.append(allOption);

    for (const region of country.regions) {
      const option = document.createElement("option");
      option.value = region.id;
      if (region.comingSoon) {
        option.textContent = `${region.name} (Coming Soon)`;
        // Keep the label visible when a country has no live city yet (Sweden).
        // Still disabled beside live siblings (Melbourne next to Perth).
        option.disabled = hasOpen;
      } else {
        option.textContent = region.name;
      }
      select.append(option);
    }

    if (!regionId) {
      select.value = "";
      return;
    }
    const wantedOpen = country.regions.some(
      (region) => region.id === regionId && isRegionOpen(region)
    );
    select.value = wantedOpen ? regionId : "";
  }

  function regionDisplayName(city) {
    return regionById(city)?.region.name || "Perth";
  }

  function syncRegionSummaries() {
    const savedCity = readSavedCity();
    const explicit = readRegionExplicit();
    let label;
    if (savedCity || explicit) {
      label = regionDisplayName(savedCity || LIVE_CITY);
    } else {
      // No pick and no GPS-followed region yet (runInit applies an open GPS hint
      // as a non-explicit saved city, which lands in the branch above).
      label = "Choose...";
    }
    document.querySelectorAll("[data-region-summary]").forEach((el) => {
      el.textContent = label;
    });
  }

  function syncRegionControls() {
    const countryId = readSavedCountry();
    // The Region select shows "All" until the rider has explicitly picked a
    // region (docs/jim-brief-country-wide-station-picker.md #1/AC1) — a
    // GPS-followed or default-Perth savedCity is still tracked internally
    // (boards, journeys, coverage notes all keep working) but the visible
    // filter only shows a specific region once that pick was explicit.
    const explicit = readRegionExplicit();
    const savedCity = readSavedCity();
    const regionFilterValue = explicit ? savedCity || LIVE_CITY : "";
    document.querySelectorAll("[data-region-country]").forEach((select) => {
      fillCountrySelect(select, countryId);
    });
    document.querySelectorAll("[data-region-city]").forEach((select) => {
      fillRegionSelect(select, countryId, regionFilterValue);
    });
    syncRegionSummaries();
  }

  /** Current Region-select filter value: "" for "All", or a region id. */
  function readRegionFilter() {
    const select = document.querySelector("[data-region-city]");
    if (select) {
      return select.value || "";
    }
    return readRegionExplicit() ? readSavedCity() || LIVE_CITY : "";
  }

  function closeRegionScreen() {
    const setup = document.getElementById("region-setup");
    if (!setup) {
      return;
    }
    setup.hidden = true;
    document.body.classList.remove("region-setup-active");
    window.NextTrainAds?.syncOverlaySuppression?.();
  }

  function openRegionScreen() {
    const setup = document.getElementById("region-setup");
    if (!setup) {
      return;
    }
    window.nextTrainApp?.closeMenuDialogOnly?.();
    syncRegionControls();
    setup.hidden = false;
    document.body.classList.add("region-setup-active");
    window.NextTrainAds?.syncOverlaySuppression?.();
  }

  async function applyCity(city, { persist = true, explicit = false } = {}) {
    const match = regionById(city);
    if (!match || !isRegionOpen(match.region)) {
      city = LIVE_CITY;
    }
    const countryId = match?.country.id || regionById(city)?.country.id || "au";

    // Save the pick immediately. Catalog mount can be slow or fail; snapping
    // the saved region back to Perth made the picker look like it ignored the tap.
    if (persist) {
      persistRegion({
        city,
        country: countryId,
        explicit: explicit || readRegionExplicit(),
      });
    }
    if (explicit) {
      clearRegionMismatchDismissed();
      document.dispatchEvent(new CustomEvent("nexttrain:region-explicit"));
    }
    syncRegionControls();
    syncFeedAttribution(city);

    const dogfoodApi = dogfood();
    // In-memory mount state, not localStorage. After a reload the JS session is
    // fresh even when the saved city is unchanged — skipping mount then leaves
    // Sydney/London catalogs empty.
    const mountedCity = dogfoodApi?.getCity?.() || "";
    let mountOk = true;
    if (MULTI_CITY_IDS.includes(city)) {
      if (mountedCity !== city) {
        console.log(`[NextTrainCitySession] Mounting multi-city: ${city}`);
        try {
          mountOk = Boolean(await dogfoodApi?.mount?.(city));
        } catch (error) {
          console.error(`[NextTrainCitySession] Failed to mount: ${city}`, error);
          mountOk = false;
        }
        if (!mountOk) {
          console.error(`[NextTrainCitySession] Catalog failed for ${city}; region stays saved`);
        }
      }
    } else if (mountedCity) {
      console.log(`[NextTrainCitySession] Unmounting to live city: ${city}`);
      dogfoodApi?.unmount?.();
      try {
        window.nextTrainStationCombobox?.replaceStationsCache?.(null);
        const listPromise = window.nextTrainStationCombobox?.getStationsList?.();
        if (explicit) {
          await listPromise;
        }
      } catch {
        /* perth list reloads on next getStationsList */
      }
    }
    document.dispatchEvent(
      new CustomEvent("nexttrain:city-changed", { detail: { city, country: countryId } })
    );
    syncRegionControls();
    return mountOk;
  }

  async function onCountryChange(select) {
    const countryId = select.value;
    const open = firstOpenRegion(countryId);
    document.querySelectorAll("[data-region-country]").forEach((el) => {
      el.value = countryId;
    });
    document.querySelectorAll("[data-region-city]").forEach((el) => {
      fillRegionSelect(el, countryId, open?.id);
    });
    if (open) {
      await applyCity(open.id, { persist: true, explicit: true });
    }
  }

  async function onCityChange(select) {
    const city = select.value;
    if (!city) {
      // "All" chosen: the Region select becomes a pure filter again — the
      // active region (boards/journeys/GPS-follow) is untouched, only the
      // "explicit region pick" flag clears so the filter shows "All".
      persistRegion({ city: readSavedCity() || LIVE_CITY, explicit: false });
      syncRegionControls();
      document.dispatchEvent(
        new CustomEvent("nexttrain:region-filter-changed", { detail: { filter: "" } })
      );
      return;
    }
    if (!regionById(city) || !isRegionOpen(regionById(city).region)) {
      syncRegionControls();
      return;
    }
    await applyCity(city, { persist: true, explicit: true });
    document.dispatchEvent(
      new CustomEvent("nexttrain:region-filter-changed", { detail: { filter: city } })
    );
  }

  function bindControls() {
    document.querySelectorAll("[data-region-country]").forEach((select) => {
      select.addEventListener("change", () => {
        void onCountryChange(select);
      });
    });
    document.querySelectorAll("[data-region-city]").forEach((select) => {
      select.addEventListener("change", () => {
        void onCityChange(select);
      });
    });
    document.getElementById("menu-region-btn")?.addEventListener("click", () => {
      openRegionScreen();
    });
    document.getElementById("region-setup-back-btn")?.addEventListener("click", closeRegionScreen);
    document.getElementById("region-setup-done-btn")?.addEventListener("click", closeRegionScreen);
    document.addEventListener("nexttrain:menu-open", () => syncRegionControls());
  }

  let initPromise = null;
  let currentHint = null;

  async function init() {
    if (initPromise) {
      return initPromise;
    }
    initPromise = runInit();
    try {
      return await initPromise;
    } catch (error) {
      initPromise = null;
      throw error;
    }
  }

  async function runInit() {
    bindControls();
    migrateLegacyRegionExplicit();
    // Do not probe every live city before first paint. Sydney/Brisbane catalogs
    // parse large GTFS fixtures and were blocking Near me on Perth cold start.

    const explicit = readRegionExplicit();
    let initialCity = readSavedCity() || LIVE_CITY;

    if (!explicit) {
      // Background city detection — don't block initial paint.
      // Compare lat/lng to CITY_BOUNDS on device; only the confirmed region's
      // catalog is downloaded.
      void (async () => {
        const hint = await geolocateHint();
        if (hint) {
          currentHint = hint;
          syncRegionSummaries();
        }
        if (hint && hint !== initialCity && isRegionOpen(regionById(hint)?.region)) {
          // First load (or any load while the rider has never picked a region):
          // follow the GPS. Until 6 Sep 2026 this branch was deliberately empty and
          // the app stayed on Perth, so a rider opening the app in Manchester got
          // Perth stations in My Routes/Journeys and a Perth-only card in Near me.
          // The pick stays non-explicit, so a later trip elsewhere re-follows the
          // GPS, and an explicit pick in the region screen still wins for good.
          console.log(`[NextTrainCitySession] First load: following GPS region ${hint}`);
          try {
            await applyCity(hint, { persist: true, explicit: false });
          } catch (error) {
            console.warn(`[NextTrainCitySession] Could not follow GPS region ${hint}`, error);
          }
        }
      })();
    }

    // Only load the catalog for the active city.
    // Jim brief: don't block boot on the catalog fetch.
    const applyPromise = applyCity(initialCity, { persist: !explicit, explicit: false });
    if (!explicit) {
      void applyPromise;
    } else {
      await applyPromise;
    }

    syncRegionControls();
    syncFeedAttribution(initialCity);
    return initialCity;
  }

  window.NextTrainCitySession = {
    init,
    applyCity,
    readSavedCity,
    readSavedCountry,
    readRegionExplicit,
    hintCityFromCoords,
    hintCityFromNearestStation,
    geolocateHint,
    readActiveHint() {
      return currentHint;
    },
    maybePromptRegionMismatch,
    regionDisplayName,
    regionById,
    readActiveTimeZone() {
      const city = readSavedCity() || LIVE_CITY;
      return regionById(city)?.region.timeZone || "Australia/Perth";
    },
    markRegionExplicit() {
      const city = readSavedCity() || LIVE_CITY;
      persistRegion({
        city,
        country: readSavedCountry(),
        explicit: true,
      });
    },
    syncRegionControls,
    readRegionFilter,
    syncFeedAttribution,
    feedAttributionForCity,
    VANCOUVER_TRANSLINK_DISCLAIMER,
    TFL_OPEN_DATA_LINE,
    RDG_LDB_LINE,
    openRegionScreen,
    closeRegionScreen,
    COUNTRIES,
    LIVE_CITY,
    MULTI_CITY_IDS,
    VERCEL_ORIGIN,
  };
})();
