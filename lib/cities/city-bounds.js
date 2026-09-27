/**
 * Per-city GPS bounding boxes for hintCityFromCoords() (the region auto-detect used by
 * public/city-session.js and the near-me flow). Moved server-side from
 * public/city-session.js (docs/jim-brief-registry-driven-client.md) so a new live city
 * bounds box ships without an app release — it now reaches the client via the
 * /api/cities manifest (api/cities.js) instead of being duplicated in a client script.
 *
 * A CITY_BOUNDS value is normally a single box ({minLat,maxLat,minLng,maxLng}), but may be
 * an array of boxes for a region whose catalog forms two or more geographically separate
 * clusters that no single rectangle can bound without also catching an unrelated neighbour
 * (docs/jim-brief-essex-to-greater-anglia.md round 2) — true if lat/lng falls in ANY of them.
 *
 * Order matters: hintCityFromCoords() (public/city-session.js, rebuilt client-side from the
 * manifest's city order) returns the FIRST matching box. Where one region's box geometrically
 * contains a smaller region's box, the smaller/more specific box MUST be declared before the
 * larger one. Enforced by qa/uk-city-bounds-overlap-gate.mjs's containment-order check.
 */
// Order rule (7 Sep 2026, docs/jim-brief-city-bounds-order-after-geocode.md):
// hintCityFromCoords() returns the FIRST matching box in object order. Where
// one region's box geometrically contains a smaller region's box (or a
// smaller region's stations), the smaller/more specific box MUST be
// declared before the larger one, or every GPS hint inside the smaller
// region silently resolves to the larger one instead. Enforced by
// qa/uk-city-bounds-overlap-gate.mjs's containment-order check — that gate
// fails the build if this is violated, so don't reorder without rerunning it.
export const CITY_BOUNDS = {
  sydney: { minLat: -34.15, maxLat: -33.45, minLng: 150.6, maxLng: 151.35 },
  newcastle: { minLat: -32.94, maxLat: -32.91, minLng: 151.75, maxLng: 151.80 },
  perth: { minLat: -32.8, maxLat: -31.4, minLng: 115.55, maxLng: 116.25 },
  "gold-coast": { minLat: -28.13, maxLat: -27.90, minLng: 153.32, maxLng: 153.46 },
  brisbane: { minLat: -28.2, maxLat: -27.0, minLng: 152.6, maxLng: 153.6 },
  adelaide: { minLat: -35.3, maxLat: -34.55, minLng: 138.35, maxLng: 138.85 },
  // Melbourne (docs/melbourne-d1/jim-handoff.md, 22 Sep 2026) — now live and in the picker,
  // box derived from lib/cities/melbourne/stations.json's 220 catalogued stations
  // (lat -38.374..-37.579, lng 144.661..145.507) with a small margin.
  melbourne: { minLat: -38.43, maxLat: -37.52, minLng: 144.60, maxLng: 145.56 },
  "uk-london-tfl": { minLat: 51.28, maxLat: 51.7, minLng: -0.52, maxLng: 0.35 },
  canberra: { minLat: -35.32, maxLat: -35.16, minLng: 149.10, maxLng: 149.17 },
  stockholm: { minLat: 58.85, maxLat: 59.60, minLng: 17.50, maxLng: 18.40 },
  goteborg: { minLat: 57.55, maxLat: 57.85, minLng: 11.75, maxLng: 12.25 },
  // Copenhagen (docs/jim-brief-copenhagen-flip.md, 26 Sep 2026) — box covers the Metro M1-M4
  // network plus the four shared S-tog/DSB/Öresundståg stations (København H, Nørreport,
  // Nørrebro, Nordhavn), approx lat 55.60-55.73, lng 12.45-12.65, with a small margin. Listed
  // before malmo below: malmo's own box (12.60-15.55 lng) slightly overlaps Copenhagen's
  // eastern edge, so Copenhagen must be checked first for hintCityFromCoords to resolve
  // correctly there, same containment-order rule as the UK boxes further down.
  copenhagen: { minLat: 55.58, maxLat: 55.75, minLng: 12.40, maxLng: 12.68 },
  malmo: { minLat: 55.30, maxLat: 56.75, minLng: 12.60, maxLng: 15.55 },
  uppsala: { minLat: 59.30, maxLat: 60.75, minLng: 16.80, maxLng: 18.60 },
  helsinki: { minLat: 60.13, maxLat: 60.25, minLng: 24.62, maxLng: 25.16 },
  oslo: { minLat: 59.60, maxLat: 60.25, minLng: 10.40, maxLng: 11.20 },
  // Brussels (docs/jim-brief-brussels-flip-readiness.md, 20 Sep 2026) — now live and in the
  // picker, box derived from lib/cities/brussels/stations.json's 60 catalogued stations
  // (lat 50.812-50.897, lng 4.267-4.465) with a small margin. Doesn't overlap any other
  // region's box, so its position here doesn't affect containment order.
  brussels: { minLat: 50.79, maxLat: 50.92, minLng: 4.24, maxLng: 4.49 },
  // Vienna (docs/jim-brief-vienna-u2-hub-bound-direction.md flip follow-through, 27 Sep 2026)
  // — box derived from lib/cities/vienna/stations.json's 99 catalogued stations
  // (lat 48.130117-48.277555, lng 16.260728-16.508502), with a small margin. No overlap
  // with any other city's box (Brussels/Copenhagen are the nearest and both far off).
  vienna: { minLat: 48.10, maxLat: 48.30, minLng: 16.22, maxLng: 16.55 },
  // Dublin (docs/dublin-d1/jim-handoff.md flip follow-through) — still planned, not in the
  // picker (docs/jim-brief-no-coming-soon-picker.md, 27 Sep 2026: cities are in or out, no
  // "Coming Soon" row); this box exists ahead of the flip solely to satisfy
  // qa/live-city-lists-sync.mjs's CITY_BOUNDS-for-every-live-city check, same as Hong Kong
  // below. Box derived from lib/cities/dublin/stations.json's 67 catalogued stations (all 67
  // now carry real lat/lng, matched by name against the published NTA GTFS snapshot's
  // stops.txt: lat 53.242-53.372, lng -6.438..-6.143) with a small margin. Doesn't overlap
  // any other region's box, so its position here doesn't affect containment order.
  dublin: { minLat: 53.20, maxLat: 53.40, minLng: -6.48, maxLng: -6.10 },
  // Hong Kong (docs/jim-brief-hong-kong-station-coordinates.md, 27 Sep 2026) — still
  // planned, not in the picker; this box exists only to satisfy
  // qa/live-city-lists-sync.mjs's CITY_BOUNDS-for-every-live-city check ahead of the flip.
  // Box derived from lib/cities/hong-kong/stations.json's 95 catalogued stations, all now
  // carrying real lat/lng sourced from OpenStreetMap (no official data.gov.hk/MTR coordinate
  // dataset exists — see coverage.json's notes): lat 22.242-22.528, lng 113.941-114.269,
  // with a small margin. No other region's box is anywhere near Hong Kong, so containment
  // order doesn't matter here.
  "hong-kong": { minLat: 22.21, maxLat: 22.56, minLng: 113.91, maxLng: 114.30 },
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
  // docs/washington-d1/ — derived from lib/cities/washington/stations.json's actual
  // coordinates (min 38.7665/-77.4915, max 39.1199/-76.8446) with a small margin. No
  // overlap with any existing box (different region entirely).
  washington: { minLat: 38.72, maxLat: 39.17, minLng: -77.55, maxLng: -76.8 },
};

export function inBounds(lat, lng, box) {
  return lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng;
}

/** A CITY_BOUNDS value may be a single box or an array of boxes — true if lat/lng falls in ANY. */
export function inAnyBounds(lat, lng, boxOrBoxes) {
  const boxes = Array.isArray(boxOrBoxes) ? boxOrBoxes : [boxOrBoxes];
  return boxes.some((box) => inBounds(lat, lng, box));
}
