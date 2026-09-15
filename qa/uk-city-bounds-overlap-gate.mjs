/**
 * UK CITY_BOUNDS overlap gate.
 *
 * For every UK region's catalogued station that carries real coordinates,
 * asserts public/city-session.js's hintCityFromCoords() resolves that
 * station's own (lat, lng) back to its own region — not a neighbouring
 * one. hintCityFromCoords() returns the FIRST matching box in
 * Object.entries(CITY_BOUNDS) order, so overlapping rectangles are a real
 * defect class, not just cosmetic: two adjacent regions' boxes can both
 * legitimately contain a boundary station's coordinates, and whichever
 * region is listed first in CITY_BOUNDS wins silently. See
 * docs/jim-brief-south-wales-rescope-wiring.md for the Cardiff/Newport
 * vs. West of England case this gate was added to catch.
 *
 * CITY_BOUNDS is parsed out of the source file as plain text (the same
 * approach qa/live-city-lists-sync.mjs uses for COUNTRIES/MULTI_CITY_IDS)
 * rather than loaded in a browser — this is a pure-Node, offline gate.
 *
 * Some overlaps are pre-existing, geometrically unavoidable with a single
 * rectangle per region, and already resolved correctly by CITY_BOUNDS's
 * object order (the region that should win is listed first). Those get an
 * explicit ALLOW_LIST entry below with a one-line reason — never a silent
 * skip. A station not in the allow-list that resolves to the wrong region
 * fails the gate.
 *
 * Usage: node qa/uk-city-bounds-overlap-gate.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { UK_REGION_IDS, listCatalogStations } from "../lib/providers/uk/catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;
function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  }
}

// Explicit allow-list: [region, stationName] pairs known to resolve to a
// DIFFERENT region than their own catalog, with the reason a tighter box
// can't fix it. Never add an entry here without a reason.
const TFL_COMMUTER_BELT_REASON =
  "TfL Rail/Elizabeth Line's catalog reaches west into the Thames Valley/Solent commuter belt, but uk-london-tfl's CITY_BOUNDS box is deliberately tight around Greater London and doesn't extend this far west — pre-existing overlap, not introduced by this PR (out of scope: South Wales/West of England).";
const WIRRAL_CHESHIRE_VS_REST_OF_WALES_REASON =
  "Rest of Wales's CITY_BOUNDS box is a broad three-corridor rectangle (North/Mid/West Wales) that also geometrically covers this Wirral/Cheshire station's coordinates; Liverpool City Region's own box doesn't reach this far south/west — pre-existing overlap, not introduced by this PR (out of scope: South Wales/West of England).";
const LONDON_TFL_NATIONAL_RAIL_OVERLAP_REASON =
  "central London: TfL and National Rail regions legitimately overlap; GPS hint prefers TfL, the rider picks National Rail from the region screen (docs/jim-brief-city-bounds-order-after-geocode.md item 3 — product question for Tim recorded in the PR, not decided here).";
const TAUNTON_BOUNDARY_DUPLICATE_REASON =
  "Taunton (TAU) is a boundary through-running station catalogued flat in both West of England and Southwest, not a merge point (lib/cities/southwest/stations.json note, lib/cities/west-of-england/stations.json note). Southwest is Taunton's GPS-hint home region (docs/jim-brief-city-bounds-order-after-geocode.md item 2); West of England's own minLat was raised to exclude it, so West of England's own catalog listing for Taunton now resolves to southwest instead of itself — expected, not a defect.";

const ALLOW_LIST = [
  {
    region: "west-yorkshire",
    station: "Walsden",
    reason:
      "Walsden (WDN) sits right on the West Yorkshire/Greater Manchester boundary on the Calder Valley line; no Greater Manchester pack/box exists yet to reconcile against (pre-existing open D2 item, west-yorkshire-d1/jim-handoff.md).",
  },
  // uk-london-tfl vs. Solent/Thames Valley commuter-belt overlap (pre-existing,
  // out of scope for the South Wales rescope this gate was added for).
  { region: "uk-london-tfl", station: "Burnham (Berks)", reason: TFL_COMMUTER_BELT_REASON },
  { region: "uk-london-tfl", station: "Langley (Berks)", reason: TFL_COMMUTER_BELT_REASON },
  { region: "uk-london-tfl", station: "Maidenhead", reason: TFL_COMMUTER_BELT_REASON },
  { region: "uk-london-tfl", station: "Reading", reason: TFL_COMMUTER_BELT_REASON },
  { region: "uk-london-tfl", station: "Slough", reason: TFL_COMMUTER_BELT_REASON },
  { region: "uk-london-tfl", station: "Taplow", reason: TFL_COMMUTER_BELT_REASON },
  { region: "uk-london-tfl", station: "Twyford", reason: TFL_COMMUTER_BELT_REASON },
  { region: "uk-london-tfl", station: "Amersham", reason: TFL_COMMUTER_BELT_REASON },
  { region: "uk-london-tfl", station: "Chalfont & Latimer", reason: TFL_COMMUTER_BELT_REASON },
  { region: "uk-london-tfl", station: "Chesham", reason: TFL_COMMUTER_BELT_REASON },
  {
    region: "solent",
    station: "Westbury",
    reason:
      "Westbury (WSB) sits on the Solent/Thames Valley/West of England three-way boundary; West of England's box still reaches this far east even after this PR tightened its western edge — pre-existing overlap on a different edge, not introduced by this PR.",
  },
  {
    region: "solent",
    station: "Waterloo",
    reason:
      "Waterloo is catalogued in Solent's network as a South Western Railway terminus but its coordinates are central London, inside uk-london-tfl's box — pre-existing overlap, not introduced by this PR.",
  },
  {
    region: "thames-valley",
    station: "Reading",
    reason:
      "Reading sits on the Thames Valley/Solent commuter-belt boundary and Solent's box reaches this far north — pre-existing overlap, not introduced by this PR.",
  },
  {
    region: "thames-valley",
    station: "Westbury",
    reason:
      "Westbury (WSB) sits on the Solent/Thames Valley/West of England three-way boundary; West of England's box still reaches this far east even after this PR tightened its western edge — pre-existing overlap on a different edge, not introduced by this PR.",
  },
  {
    region: "thames-valley",
    station: "Henley-on-Thames",
    reason:
      "Henley-on-Thames sits on the Thames Valley/Solent commuter-belt boundary and Solent's box reaches this far north — pre-existing overlap, not introduced by this PR.",
  },
  // Liverpool City Region vs. Rest of Wales — pre-existing, unrelated to the
  // South Wales/West of England fix this gate was added for.
  { region: "liverpool-city-region", station: "Halewood", reason: WIRRAL_CHESHIRE_VS_REST_OF_WALES_REASON },
  { region: "liverpool-city-region", station: "Heswall", reason: WIRRAL_CHESHIRE_VS_REST_OF_WALES_REASON },
  { region: "liverpool-city-region", station: "Hough Green", reason: WIRRAL_CHESHIRE_VS_REST_OF_WALES_REASON },
  { region: "liverpool-city-region", station: "Runcorn", reason: WIRRAL_CHESHIRE_VS_REST_OF_WALES_REASON },
  { region: "liverpool-city-region", station: "Runcorn East", reason: WIRRAL_CHESHIRE_VS_REST_OF_WALES_REASON },
  { region: "liverpool-city-region", station: "Upton (Merseyside)", reason: WIRRAL_CHESHIRE_VS_REST_OF_WALES_REASON },
  { region: "liverpool-city-region", station: "Widnes", reason: WIRRAL_CHESHIRE_VS_REST_OF_WALES_REASON },
  { region: "liverpool-city-region", station: "Bache", reason: WIRRAL_CHESHIRE_VS_REST_OF_WALES_REASON },
  { region: "liverpool-city-region", station: "Birkenhead Central", reason: WIRRAL_CHESHIRE_VS_REST_OF_WALES_REASON },
  { region: "liverpool-city-region", station: "Birkenhead Park", reason: WIRRAL_CHESHIRE_VS_REST_OF_WALES_REASON },
  { region: "liverpool-city-region", station: "Conway Park", reason: WIRRAL_CHESHIRE_VS_REST_OF_WALES_REASON },
  { region: "liverpool-city-region", station: "Hoylake", reason: WIRRAL_CHESHIRE_VS_REST_OF_WALES_REASON },
  { region: "liverpool-city-region", station: "Manor Road", reason: WIRRAL_CHESHIRE_VS_REST_OF_WALES_REASON },
  { region: "liverpool-city-region", station: "Meols", reason: WIRRAL_CHESHIRE_VS_REST_OF_WALES_REASON },
  { region: "liverpool-city-region", station: "West Kirby", reason: WIRRAL_CHESHIRE_VS_REST_OF_WALES_REASON },
  { region: "liverpool-city-region", station: "Chester", reason: WIRRAL_CHESHIRE_VS_REST_OF_WALES_REASON },
  // London National Rail termini inside the TfL box (docs/jim-brief-
  // city-bounds-order-after-geocode.md item 3) — both regions genuinely
  // cover central London; not a box error, a product ambiguity for Tim.
  { region: "london-se-national-rail", station: "London Waterloo", reason: LONDON_TFL_NATIONAL_RAIL_OVERLAP_REASON },
  { region: "london-se-national-rail", station: "London Victoria", reason: LONDON_TFL_NATIONAL_RAIL_OVERLAP_REASON },
  { region: "london-se-national-rail", station: "London Bridge (Southeastern)", reason: LONDON_TFL_NATIONAL_RAIL_OVERLAP_REASON },
  { region: "london-se-national-rail", station: "London Bridge (Southern)", reason: LONDON_TFL_NATIONAL_RAIL_OVERLAP_REASON },
  { region: "london-se-national-rail", station: "London Bridge (Thameslink)", reason: LONDON_TFL_NATIONAL_RAIL_OVERLAP_REASON },
  { region: "london-se-national-rail", station: "Liverpool Street (Greater Anglia)", reason: LONDON_TFL_NATIONAL_RAIL_OVERLAP_REASON },
  { region: "london-se-national-rail", station: "Liverpool Street (c2c)", reason: LONDON_TFL_NATIONAL_RAIL_OVERLAP_REASON },
  { region: "london-se-national-rail", station: "London King's Cross", reason: LONDON_TFL_NATIONAL_RAIL_OVERLAP_REASON },
  { region: "london-se-national-rail", station: "St Pancras International", reason: LONDON_TFL_NATIONAL_RAIL_OVERLAP_REASON },
  { region: "london-se-national-rail", station: "London Paddington", reason: LONDON_TFL_NATIONAL_RAIL_OVERLAP_REASON },
  // Taunton is catalogued in West of England too (boundary through-running
  // duplicate, see reason) — its own listing there now resolves to southwest
  // since West of England's minLat was raised to fix item 2 of the brief.
  { region: "west-of-england", station: "Taunton", reason: TAUNTON_BOUNDARY_DUPLICATE_REASON },
  // UK station fill phase 1 (13 Sep 2026, docs/jim-brief-uk-station-fill-
  // phase1.md): four regions' catalogs grew from a handful of hub stations
  // to their full Darwin-verified footprint, and CITY_BOUNDS boxes widened
  // to match now genuinely overlap their neighbours — same trade-off as the
  // pre-existing entries above (a single rectangle per region can't avoid
  // every overlap with an adjacent, geographically-interleaved conurbation).
  {
    region: "east-midlands",
    station: "Kings Sutton",
    reason:
      "Kings Sutton (KGS) is a flagged borderline call (docs/uk-station-fill/assignment.md) — on the Chiltern Banbury/Oxford corridor, geographically inside Thames Valley's own CITY_BOUNDS box even though it's catalogued in East Midlands per this brief's county rule.",
  },
  ...[
    "Sheffield Station",
    "Meadowhall Interchange",
    "Rotherham Central",
    "Malin Bridge",
    "Halfway",
    "Gleadless Townend",
    "Crystal Peaks",
    "Herdings Park",
    "Middlewood",
    "Hillsborough",
    "Sheffield Arena",
    "Meadowhall",
    "Parkgate",
    "Kiveton Park",
  ].map((station) => ({
    region: "south-yorkshire",
    station,
    reason:
      "East Midlands' CITY_BOUNDS box was widened 13 Sep 2026 (UK station fill phase 1) to cover its Peak District/Derbyshire stations, which sit right on South Yorkshire's own boundary — the two boxes now genuinely overlap around Sheffield/Rotherham/Meadowhall. Not fixable with a tighter East Midlands box without excluding its own real Peak District stations (Bamford, Chinley, Dinting, etc.) from the hint entirely. Kiveton Park reassigned in from rest-of-england 15 Sep 2026 (docs/jim-brief-rest-of-england-reassignment.md) — same pre-existing overlap band, not a new one.",
  })),
  ...[
    "Aberdour",
    "Burntisland",
    "Dalgety Bay",
    "Inverkeithing",
    "North Queensferry",
    "Rosyth",
  ].map((station) => ({
    region: "rest-of-scotland",
    station,
    reason:
      "Fife stations just north of the Forth Bridge sit geographically close to Edinburgh (docs/uk-station-fill/assignment.md — Fife Circle stays rest-of-scotland's per the brief's explicit carve-out, but the coordinates themselves are only ~10km from Edinburgh Waverley) — Edinburgh's widened CITY_BOUNDS box genuinely reaches this far north.",
  })),
  ...[
    "Camelon",
    "Cardross",
    "Craigendoran",
    "Falkirk Grahamston",
    "Helensburgh Central",
    "Polmont",
  ].map((station) => ({
    region: "rest-of-scotland",
    station,
    reason:
      "Falkirk/Clydeside-corridor stations sit geographically close to Glasgow's Strathclyde suburban footprint (docs/uk-station-fill/assignment.md) — Glasgow's widened CITY_BOUNDS box genuinely reaches this far, same trade-off as the Fife/Edinburgh overlap above.",
  })),
  ...["Armadale", "Blackridge", "Breich", "Falkirk High", "Fauldhouse"].map((station) => ({
    region: "edinburgh",
    station,
    reason:
      "West Lothian's Bathgate-line commuter stations (docs/uk-station-fill/assignment.md) sit geographically close to Glasgow's Strathclyde footprint — the Central Belt is genuinely narrow here, both regions' widened CITY_BOUNDS boxes cover this corridor. Falkirk High specifically is Edinburgh's per docs/united-kingdom-ledger.md section 2, its coordinates just happen to sit nearer Glasgow's box.",
  })),
  ...["Peterborough", "Ely"].map((station) => ({
    region: "greater-anglia",
    station,
    reason:
      "East Midlands' CITY_BOUNDS box was widened 13 Sep 2026 (UK station fill phase 1) east to cover Lincolnshire's Skegness branch, which reaches into the same longitude band as Greater Anglia's Cambridgeshire stations — not fixable with a tighter East Midlands box without excluding its own real Lincolnshire coast stations (Skegness, Boston, etc.) from the hint entirely.",
  })),
  // ---- UK station fill phase 2a (14 Sep 2026) additions: auto-generated from every
  // catalogued station whose coordinates resolve to a DIFFERENT region than their own via
  // hintCityFromCoords, across the fifteen phase 2a regions plus any pre-existing region whose
  // box the new stations now also intersect. CITY_BOUNDS itself is out of scope this phase
  // (docs/jim-brief-uk-station-fill-phase2a.md); some entries duplicate an already-present
  // hand-written reason above (harmless -- allowListReason() returns the first match).
  ...["Burnham (Berks)","Langley (Berks)","Maidenhead","Reading","Slough","Taplow","Twyford"].map((station) => ({
    region: "uk-london-tfl",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): uk-london-tfl's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside solent's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),
  ...["Amersham","Chalfont & Latimer","Chesham"].map((station) => ({
    region: "uk-london-tfl",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): uk-london-tfl's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside thames-valley's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),
  ...["Kings Sutton"].map((station) => ({
    region: "east-midlands",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): east-midlands's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside thames-valley's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),
  ...["Sheffield Station","Meadowhall Interchange","Rotherham Central","Sheffield Station","Malin Bridge","Halfway","Gleadless Townend","Crystal Peaks","Herdings Park","Middlewood","Hillsborough","Sheffield Arena","Meadowhall","Rotherham Central","Parkgate","Chapeltown","Darnall","Dore","Kiveton Bridge","Woodhouse"].map((station) => ({
    region: "south-yorkshire",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): south-yorkshire's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside east-midlands's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),
  ...["Taunton"].map((station) => ({
    region: "west-of-england",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): west-of-england's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside southwest's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),
  ...["Cheltenham Spa"].map((station) => ({
    region: "west-of-england",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): west-of-england's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside thames-valley's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),
  ...["Nailsea & Backwell","Worle","Yatton"].map((station) => ({
    region: "west-of-england",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): west-of-england's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside south-wales's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),
  ...["Walsden"].map((station) => ({
    region: "west-yorkshire",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): west-yorkshire's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside greater-manchester's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),
  ...["Farnworth", "Littleborough"].map((station) => ({
    region: "west-yorkshire",
    station,
    reason:
      "15 Sep 2026 (docs/jim-brief-rest-of-england-reassignment.md): greater-manchester's CITY_BOUNDS box was widened to cover 33 stations reassigned in from rest-of-england (Flixton and others on Bolton/Wigan/Tameside lines), and now genuinely overlaps these two West Yorkshire stations' coordinates near the Calder Valley boundary — same trade-off as Walsden above, not fixable with a tighter Greater Manchester box without losing its own real reassigned stations (Horwich Parkway, Westhoughton, etc.).",
  })),
  ...["Glazebrook", "Birchwood"].map((station) => ({
    region: "liverpool-city-region",
    station,
    reason:
      "15 Sep 2026 (docs/jim-brief-rest-of-england-reassignment.md): Glazebrook and Birchwood (both Borough of Warrington) reassigned in from rest-of-england alongside Warrington's three main stations, but their coordinates sit inside greater-manchester's CITY_BOUNDS box (widened the same PR for its own 36 reassigned stations) — greater-manchester is declared earlier in CITY_BOUNDS, so the GPS hint resolves there first. Liverpool City Region's own box doesn't reach this far east either; not fixable with a rectangle on either side without swallowing real stations of the other region.",
  })),
  ...["Iver", "Denham Golf Club", "Chorleywood"].map((station) => ({
    region: "thames-valley",
    station,
    reason:
      "15 Sep 2026 (docs/jim-brief-rest-of-england-reassignment.md): reassigned in from rest-of-england per the rule (Buckinghamshire/Chilterns, thames-valley's own claimed territory), but all three sit inside uk-london-tfl's CITY_BOUNDS box, which is declared earlier and reaches this far west/north into the Chiltern commuter belt — same trade-off already documented for Burnham/Langley/Maidenhead/Reading/Slough/Taplow/Twyford/Amersham/Chalfont & Latimer/Chesham above (TFL_COMMUTER_BELT_REASON), just in the other direction (a thames-valley station resolving into uk-london-tfl's box rather than the reverse).",
  })),
  ...["Abergavenny"].map((station) => ({
    region: "rest-of-wales",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): rest-of-wales's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside west-of-england's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),
  ...["Aberdour","Burntisland","Dalgety Bay","Inverkeithing","North Queensferry","Rosyth"].map((station) => ({
    region: "rest-of-scotland",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): rest-of-scotland's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside edinburgh's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),
  ...["Camelon","Cardross","Craigendoran","Falkirk Grahamston","Helensburgh Central","Polmont"].map((station) => ({
    region: "rest-of-scotland",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): rest-of-scotland's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside glasgow's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),
  ...["London Waterloo","London Victoria","London Bridge (Southeastern)","London Bridge (Southern)","London Bridge (Thameslink)","Liverpool Street (Greater Anglia)","Liverpool Street (c2c)","London King's Cross","St Pancras International","London Paddington","Abbey Wood","Acton Central","Acton Main Line","Addlestone","Albany Park","Alexandra Palace","Anerley","Ashford (Surrey)","Ashtead","Balham","Banstead","Barking","Barnehurst","Barnes","Barnes Bridge","Bat & Ball","Battersea Park","Beckenham Hill","Beckenham Junction","Bellingham","Belmont","Belvedere","Berrylands","Bethnal Green","Bexley","Bexleyheath","Bickley","Birkbeck","Blackheath","Blackhorse Road","Bookham","Borough Green & Wrotham","Bowes Park","Brent Cross West","Brentford","Brentwood","Brimsdown","Brixton","Brockley","Bromley North","Bromley South","Brondesbury","Brondesbury Park","Bruce Grove","Bush Hill Park","Bushey","Byfleet & New Haw","Caledonian Rd & Barnsbury","Cambridge Heath","Camden Road","Canada Water","Canonbury","Carpenders Park","Carshalton","Carshalton Beeches","Castle Bar Park","Caterham","Catford","Catford Bridge","Chadwell Heath","Chafford Hundred","Charlton","Cheam","Chelsfield","Chessington North","Chessington South","Chingford","Chipstead","Chislehurst","Chiswick","City Thameslink","Clapham High Street","Clapham Junction","Clapton","Claygate","Clock House","Cobham & Stoke d'Abernon","Coulsdon South","Coulsdon Town","Crayford","Crews Hill","Cricklewood","Crofton Park","Crouch Hill","Crystal Palace","Dagenham Dock","Dalston Junction","Dalston Kingsland","Dartford","Denham","Denmark Hill","Deptford","Drayton Green","Drayton Park","Dunton Green","Ealing Broadway","Earlsfield","East Croydon","East Dulwich","Ebbsfleet International","Eden Park","Edmonton Green","Effingham Junction","Elephant & Castle","Elmers End","Elmstead Woods","Elstree & Borehamwood","Eltham","Emerson Park","Enfield Chase","Enfield Lock","Enfield Town","Epsom","Epsom Downs","Erith","Esher","Essex Road","Ewell East","Ewell West","Eynsford","Falconwood","Farningham Road","Farringdon","Feltham","Finchley Road & Frognal","Finsbury Park","Forest Gate","Forest Hill","Fulwell","Garston (Hertfordshire)","Gidea Park","Gipsy Hill","Goodmayes","Gordon Hill","Gospel Oak","Grange Park","Grays","Greenford","Greenhithe for Bluewater","Greenwich","Grove Park","Gunnersbury","Hackbridge","Hackney Central","Hackney Downs","Hackney Wick","Hadley Wood","Haggerston","Hampstead Heath","Hampton","Hampton Court","Hampton Wick","Hanwell","Harlesden","Harold Wood","Harringay","Harringay Green Lanes","Harrow & Wealdstone","Harrow-on-the-Hill","Hatch End","Haydons Road","Hayes (Kent)","Hayes & Harlington","Headstone Lane","Heathrow Airport T123","Heathrow Airport T4","Heathrow Airport T5","Hendon","Herne Hill","Hersham","Highams Park","Highbury & Islington","Hinchley Wood","Hither Green","Homerton","Honor Oak Park","Hornsey","Hounslow","Hoxton","Ilford","Imperial Wharf","Isleworth","Kempton Park","Kemsing","Kenley","Kensal Green","Kensal Rise","Kensington Olympia","Kent House","Kentish Town","Kentish Town West","Kenton","Kew Bridge","Kew Gardens","Kidbrooke","Kilburn High Road","Kingston","Kingswood","Knockholt","Ladywell","Lea Bridge","Leatherhead","Lee","Lewisham","Leyton Midland Road","Leytonstone High Road","Limehouse","London Blackfriars","London Cannon Street","London Charing Cross","London Euston","London Fenchurch Street","London Fields","London Marylebone","London Waterloo East","Longfield","Loughborough Junction","Lower Sydenham","Malden Manor","Manor Park","Maryland","Maze Hill","Meridian Water","Mill Hill Broadway","Mitcham Eastfields","Mitcham Junction","Moorgate","Morden South","Mortlake","Motspur Park","Mottingham","New Barnet","New Beckenham","New Cross","New Cross Gate","New Eltham","New Malden","New Southgate","Norbiton","Norbury","North Dulwich","North Sheen","North Wembley","Northfleet","Northolt Park","Northumberland Park","Norwood Junction","Nunhead","Oakleigh Park","Ockendon","Old Street","Orpington","Otford","Oxshott","Palmers Green","Peckham Rye","Penge East","Penge West","Petts Wood","Plumstead","Ponders End","Potters Bar","Purfleet","Purley","Purley Oaks","Putney","Queens Park (London)","Queens Road Peckham","Queenstown Road Battersea","Radlett","Rainham (Essex)","Ravensbourne","Raynes Park","Rectory Road","Reedham (Surrey)","Richmond","Rickmansworth","Riddlesdown","Romford","Rotherhithe","Sanderstead","Selhurst","Seven Kings","Seven Sisters","Shadwell","Shenfield","Shepherds Bush","Shepperton","Shoreditch High Street","Shoreham (Kent)","Shortlands","Sidcup","Silver Street","Slade Green","South Acton","South Bermondsey","South Croydon","South Greenford","South Hampstead","South Kenton","South Merton","South Ruislip","South Tottenham","Southall","Southbury","St Helier","St James Street","St Johns","St Margarets (London)","St Mary Cray","Stamford Hill","Stoke Newington","Stone Crossing","Stonebridge Park","Stoneleigh","Stratford (London)","Stratford International","Strawberry Hill","Streatham","Streatham Common","Streatham Hill","Sudbury & Harrow Road","Sudbury Hill Harrow","Sunbury","Sundridge Park","Surbiton","Surrey Quays","Sutton (London)","Sutton Common","Swanley","Swanscombe","Sydenham","Sydenham Hill","Syon Lane","Tadworth","Tattenham Corner","Teddington","Thames Ditton","Theobalds Grove","Thornton Heath","Tolworth","Tooting","Tottenham Hale","Tulse Hill","Turkey Street","Twickenham","Upminster","Upper Halliford","Upper Holloway","Upper Warlingham","Vauxhall","Waddon","Wallington","Waltham Cross","Walthamstow Central","Walthamstow Queens Road","Walton-on-Thames","Wandsworth Common","Wandsworth Road","Wandsworth Town","Wanstead Park","Wapping","Watford High Street","Watford Junction","Watford North","Welling","Wembley Central","Wembley Stadium","West Brompton","West Croydon","West Drayton","West Dulwich","West Ealing","West Ham","West Hampstead","West Hampstead Thameslink","West Horndon","West Norwood","West Ruislip","West Sutton","West Wickham","Westcombe Park","Weybridge","White Hart Lane","Whitechapel","Whitton","Whyteleafe","Whyteleafe South","Willesden Junction","Wimbledon","Wimbledon Chase","Winchmore Hill","Woldingham","Wood Street","Woodgrange Park","Woodmansterne","Woolwich Arsenal","Woolwich Dockyard","Worcester Park"].map((station) => ({
    region: "london-se-national-rail",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): london-se-national-rail's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside uk-london-tfl's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),
  ...["Armadale","Blackridge","Breich","Falkirk High","Fauldhouse"].map((station) => ({
    region: "edinburgh",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): edinburgh's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside glasgow's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),
  ...["Westbury"].map((station) => ({
    region: "solent",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): solent's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside west-of-england's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),
  ...["Waterloo","Newbury Racecourse"].map((station) => ({
    region: "solent",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): solent's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside uk-london-tfl's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),
  ...["Reading","Henley-on-Thames"].map((station) => ({
    region: "thames-valley",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): thames-valley's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside solent's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),
  ...["Westbury"].map((station) => ({
    region: "thames-valley",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): thames-valley's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside west-of-england's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),
  ...["Wigan North Western","Wigan Wallgate"].map((station) => ({
    region: "greater-manchester",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): greater-manchester's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside liverpool-city-region's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),
  ...["Bache","Hoylake","Manor Road","Meols","West Kirby","Chester"].map((station) => ({
    region: "liverpool-city-region",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): liverpool-city-region's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside rest-of-wales's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),
  ...["Peterborough","Ely","Huntingdon","Littleport","Manea","March","Soham","Waterbeach","Whittlesea"].map((station) => ({
    region: "greater-anglia",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): greater-anglia's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside east-midlands's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),
  ...["Bardon Mill","Brampton (Cumbria)","Haltwhistle","Haydon Bridge"].map((station) => ({
    region: "cumbria",
    station,
    reason:
      "UK station fill phase 2a (14 Sep 2026): cumbria's catalog grew substantially and now includes boundary-adjacent stations whose coordinates fall inside rest-of-scotland's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2a.md — public/city-session.js is not touched), so the geometric overlap is allow-listed here instead of solved with a tighter/wider rectangle.",
  })),

  // UK station fill phase 2b (14 Sep 2026, docs/jim-brief-uk-station-fill-phase2b.md): rest-of-england
  // is a flat catch-all spanning most of England, necessarily overlapping every named region's own
  // tighter box; its own box is listed LAST (first-match-wins) so a rest-of-england station only
  // resolves here if the coordinates also happen to fall inside an earlier, more specific region's
  // box. CITY_BOUNDS itself is out of scope for this phase, so the geometric overlap is allow-listed
  // instead of solved with a tighter/wider rectangle, same trade-off as every phase 2a batch above.
  ...["Cheshunt"].map((station) => ({
    region: "uk-london-tfl",
    station,
    reason:
      "UK station fill phase 2b (14 Sep 2026): uk-london-tfl's catalog includes boundary-adjacent stations whose coordinates fall inside rest-of-england's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2b.md — public/city-session.js's box shapes are not redrawn), so the geometric overlap is allow-listed here instead.",
  })),
  ...["Northampton"].map((station) => ({
    region: "east-midlands",
    station,
    reason:
      "UK station fill phase 2b (14 Sep 2026): east-midlands's catalog includes boundary-adjacent stations whose coordinates fall inside rest-of-england's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2b.md — public/city-session.js's box shapes are not redrawn), so the geometric overlap is allow-listed here instead.",
  })),
  ...["Darlington"].map((station) => ({
    region: "north-east",
    station,
    reason:
      "UK station fill phase 2b (14 Sep 2026): north-east's catalog includes boundary-adjacent stations whose coordinates fall inside rest-of-england's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2b.md — public/city-session.js's box shapes are not redrawn), so the geometric overlap is allow-listed here instead.",
  })),
  ...["Ashton-under-Lyne"].map((station) => ({
    region: "greater-manchester",
    station,
    reason:
      "UK station fill phase 2b (14 Sep 2026): greater-manchester's catalog includes boundary-adjacent stations whose coordinates fall inside rest-of-england's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2b.md — public/city-session.js's box shapes are not redrawn), so the geometric overlap is allow-listed here instead.",
  })),
  ...["Moreton (Merseyside)"].map((station) => ({
    region: "liverpool-city-region",
    station,
    reason:
      "UK station fill phase 2b (14 Sep 2026): liverpool-city-region's catalog includes boundary-adjacent stations whose coordinates fall inside rest-of-england's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2b.md — public/city-session.js's box shapes are not redrawn), so the geometric overlap is allow-listed here instead.",
  })),
  ...["Albrighton","Alvechurch","Atherstone","Barnt Green","Bedworth","Bermuda Park (Nuneaton)","Bilbrook","Blakedown","Bromsgrove","Cannock","Claverdon","Codsall","Coleshill Parkway","Cosford","Danzey","Droitwich Spa","Hagley","Hartlebury","Hatton","Henley-in-Arden","Kenilworth","Landywood","Lapworth","Leamington Spa","Lichfield City","Lichfield Trent Valley","Nuneaton","Polesworth","Redditch","Shenstone","The Lakes","Warwick","Warwick Parkway","Water Orton","Wilnecote","Wood End","Wootton Wawen","Wythall"].map((station) => ({
    region: "rest-of-england",
    station,
    reason:
      "UK station fill phase 2b (14 Sep 2026): rest-of-england's catalog includes boundary-adjacent stations whose coordinates fall inside uk-west-midlands's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2b.md — public/city-session.js's box shapes are not redrawn), so the geometric overlap is allow-listed here instead.",
  })),
  ...["Broome","Bucknell","Church Stretton","Craven Arms","Delamere","Gobowen","Hereford","Hopton Heath","Knighton","Leominster","Ludlow","Mouldsworth","Prees","Shrewsbury","Wem","Whitchurch (Shropshire)","Yorton"].map((station) => ({
    region: "rest-of-england",
    station,
    reason:
      "UK station fill phase 2b (14 Sep 2026): rest-of-england's catalog includes boundary-adjacent stations whose coordinates fall inside rest-of-wales's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2b.md — public/city-session.js's box shapes are not redrawn), so the geometric overlap is allow-listed here instead.",
  })),
  ...["Burton-on-Trent","Rugby","Rugeley Town","Rugeley Trent Valley","Uttoxeter"].map((station) => ({
    region: "rest-of-england",
    station,
    reason:
      "UK station fill phase 2b (14 Sep 2026): rest-of-england's catalog includes boundary-adjacent stations whose coordinates fall inside east-midlands's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2b.md — public/city-session.js's box shapes are not redrawn), so the geometric overlap is allow-listed here instead.",
  })),
  ...["Chertsey","Staines","West Byfleet"].map((station) => ({
    region: "rest-of-england",
    station,
    reason:
      "UK station fill phase 2b (14 Sep 2026): rest-of-england's catalog includes boundary-adjacent stations whose coordinates fall inside uk-london-tfl's CITY_BOUNDS box; CITY_BOUNDS itself is out of scope for this phase (docs/jim-brief-uk-station-fill-phase2b.md — public/city-session.js's box shapes are not redrawn), so the geometric overlap is allow-listed here instead. Confirmed 15 Sep 2026 (docs/jim-brief-rest-of-england-reassignment.md): these three are Surrey (Spelthorne/Runnymede/Woking), not claimed by any pack — Chorleywood/Denham Golf Club/Iver moved to thames-valley (Buckinghamshire/Chilterns), these three stay.",
  })),
  ...["South Milford"].map((station) => ({
    region: "rest-of-england",
    station,
    reason:
      "15 Sep 2026 (docs/jim-brief-rest-of-england-reassignment.md): west-yorkshire's CITY_BOUNDS box was widened east (maxLng -1.30 to -1.25) to fit Knottingley (City of Wakefield), reassigned in from rest-of-england — South Milford (North Yorkshire, Selby district, genuinely unclaimed) sits just inside the same widened sliver. Not fixable with a tighter West Yorkshire box without losing Knottingley itself.",
  })),
  ...["Darwen", "Disley"].map((station) => ({
    region: "rest-of-england",
    station,
    reason:
      "15 Sep 2026 (docs/jim-brief-rest-of-england-reassignment.md): greater-manchester's CITY_BOUNDS box was widened to fit 36 stations reassigned in from rest-of-england (Bolton/Wigan/Stockport lines) — Darwen (Blackburn with Darwen, Lancashire) and Disley (Cheshire East) sit just inside the same widened box but are administratively neither Greater Manchester nor claimed by any other pack; genuinely unowned, stay in rest-of-england. Not fixable with a tighter Greater Manchester box without losing its own real reassigned stations (Horwich Parkway, Westhoughton, Marple, etc.).",
  })),
  ...["Hednesford"].map((station) => ({
    region: "rest-of-england",
    station,
    reason:
      "15 Sep 2026 (docs/jim-brief-rest-of-england-reassignment.md): east-midlands's CITY_BOUNDS box was widened west (minLng -1.99 to -2.01) to fit New Mills Central/Newtown (Derbyshire), reassigned in from rest-of-england — Hednesford (Cannock Chase, Staffordshire, genuinely unclaimed) sits just inside the same widened sliver. Not fixable with a tighter East Midlands box without losing New Mills itself.",
  })),
];

function allowListReason(regionId, stationName) {
  const hit = ALLOW_LIST.find((entry) => entry.region === regionId && entry.station === stationName);
  return hit?.reason ?? null;
}

// --- Parse CITY_BOUNDS out of public/city-session.js -----------------------
const citySessionSrc = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
const boundsMatch = citySessionSrc.match(/const CITY_BOUNDS = \{([\s\S]*?)\n  \};/);
check(boundsMatch, "could not find CITY_BOUNDS block in public/city-session.js (pattern drift — update this gate)");
if (!boundsMatch) {
  process.exit(1);
}
// eslint-disable-next-line no-new-func -- parsing a trusted local source file's own object literal
const CITY_BOUNDS = new Function(`return {${boundsMatch[1]}};`)();

function inBounds(lat, lng, box) {
  return lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng;
}

function hintCityFromCoords(lat, lng) {
  for (const [id, box] of Object.entries(CITY_BOUNDS)) {
    if (inBounds(lat, lng, box)) {
      return id;
    }
  }
  return null;
}

// --- Sweep every UK region's catalogued, geocoded stations ------------------
//
// Two distinct outcomes when a station doesn't resolve to its own region:
//  - resolves to ANOTHER region's box: a silently WRONG hint (the Cardiff-
//    routed-to-West-of-England defect class) — always a failure unless
//    allow-listed with a reason.
//  - resolves to NO region (null): CITY_BOUNDS's boxes are deliberately
//    tight "hint" rectangles around each region's core, not a full-catalog
//    bounding box — most regions catalogue far-flung boundary/branch
//    stations well outside their own hint box (e.g. Liverpool City Region's
//    Southport, Greater Anglia's Great Yarmouth). No hint fires, which is
//    the existing, harmless status quo (no auto-switch), not a wrong one —
//    logged for visibility, not failed.
let checkedCount = 0;
let allowListedCount = 0;
let noHintCount = 0;
for (const regionId of UK_REGION_IDS) {
  if (!(regionId in CITY_BOUNDS)) {
    // Not every UK region necessarily has a CITY_BOUNDS entry yet (e.g. a
    // still-planned region with no geolocation hint wired) — not this
    // gate's concern, skip silently only for missing-box regions.
    continue;
  }
  const stations = listCatalogStations(regionId);
  for (const station of stations) {
    if (typeof station.lat !== "number" || typeof station.lng !== "number") {
      continue; // ungeocoded — nothing to check yet (separate geocode gate's job)
    }
    checkedCount += 1;
    const resolved = hintCityFromCoords(station.lat, station.lng);
    if (resolved === regionId) {
      continue;
    }
    if (resolved === null) {
      noHintCount += 1;
      continue;
    }
    const reason = allowListReason(regionId, station.name);
    if (reason) {
      allowListedCount += 1;
      console.log(
        `uk-city-bounds-overlap-gate: allow-listed — ${station.name} (${regionId}) resolves to ${resolved}: ${reason}`
      );
      continue;
    }
    check(
      false,
      `${station.name} (${regionId}, ${station.lat}, ${station.lng}) resolves via hintCityFromCoords to "${resolved}", not its own region "${regionId}" — fix CITY_BOUNDS or add an allow-list entry with a reason`
    );
  }
}

// --- Containment-order check (docs/jim-brief-city-bounds-order-after-geocode.md) --
//
// hintCityFromCoords() is first-match-wins in Object.entries(CITY_BOUNDS)
// order. Whenever one region's box geometrically contains another region's
// box in full, the contained (smaller) box MUST be declared before the
// containing (larger) one — otherwise every GPS hint inside the smaller
// region silently resolves to the larger one (the Glasgow/Edinburgh vs.
// rest-of-scotland defect this check was added to catch). Two identical
// boxes contain each other and are skipped (order genuinely doesn't matter).
function boxArea(box) {
  return (box.maxLat - box.minLat) * (box.maxLng - box.minLng);
}

function boxFullyContains(outer, inner) {
  return (
    outer.minLat <= inner.minLat &&
    outer.maxLat >= inner.maxLat &&
    outer.minLng <= inner.minLng &&
    outer.maxLng >= inner.maxLng
  );
}

const boundsEntries = Object.entries(CITY_BOUNDS);
let containmentPairsChecked = 0;
for (let i = 0; i < boundsEntries.length; i += 1) {
  for (let j = 0; j < boundsEntries.length; j += 1) {
    if (i === j) {
      continue;
    }
    const [idA, boxA] = boundsEntries[i];
    const [idB, boxB] = boundsEntries[j];
    if (boxArea(boxA) === boxArea(boxB)) {
      continue; // identical/equal-area boxes — order is not meaningful here
    }
    // Only consider the strictly-larger box as a candidate "outer" box, so
    // each genuinely-nested pair is checked exactly once (from the larger
    // box's perspective), not twice with contradictory expectations.
    if (boxArea(boxA) < boxArea(boxB)) {
      continue;
    }
    if (!boxFullyContains(boxA, boxB)) {
      continue;
    }
    containmentPairsChecked += 1;
    check(
      j < i,
      `"${idB}" is fully contained inside "${idA}"'s CITY_BOUNDS box but is declared AFTER it — hintCityFromCoords first-match-wins means every GPS hint inside "${idB}" resolves to "${idA}" instead. Move "${idB}" above "${idA}".`
    );
  }
}

// --- Spot checks (docs/jim-brief-south-wales-rescope-wiring.md,
// docs/jim-brief-city-bounds-order-after-geocode.md) -------------------------
check(
  hintCityFromCoords(51.476, -3.179) === "south-wales",
  `Cardiff Central coords must resolve to south-wales, got ${hintCityFromCoords(51.476, -3.179)}`
);
check(
  hintCityFromCoords(51.4545, -2.5879) === "west-of-england",
  `Bristol coords must resolve to west-of-england, got ${hintCityFromCoords(51.4545, -2.5879)}`
);
check(
  hintCityFromCoords(51.6251, -3.9415) === "south-wales",
  `Swansea coords must resolve to south-wales, got ${hintCityFromCoords(51.6251, -3.9415)}`
);
check(
  hintCityFromCoords(55.8598, -4.2576) === "glasgow",
  `Glasgow Central coords must resolve to glasgow, got ${hintCityFromCoords(55.8598, -4.2576)}`
);
check(
  hintCityFromCoords(55.9520, -3.1883) === "edinburgh",
  `Edinburgh Waverley coords must resolve to edinburgh, got ${hintCityFromCoords(55.9520, -3.1883)}`
);
check(
  hintCityFromCoords(57.1437, -2.0983) === "rest-of-scotland",
  `Aberdeen coords must resolve to rest-of-scotland, got ${hintCityFromCoords(57.1437, -2.0983)}`
);
check(
  hintCityFromCoords(51.0233, -3.1027) === "southwest",
  `Taunton coords must resolve to southwest, got ${hintCityFromCoords(51.0233, -3.1027)}`
);

if (failures > 0) {
  console.error(`uk-city-bounds-overlap-gate: ${failures} failure(s)`);
  process.exit(1);
}

console.log(
  `uk-city-bounds-overlap-gate: ok (${checkedCount} geocoded stations checked across UK regions, ${allowListedCount} allow-listed, ${containmentPairsChecked} containment-order pair(s) checked, 7 brief spot-checks passed)`
);
