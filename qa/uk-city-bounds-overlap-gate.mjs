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

// --- Spot checks from docs/jim-brief-south-wales-rescope-wiring.md ---------
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

if (failures > 0) {
  console.error(`uk-city-bounds-overlap-gate: ${failures} failure(s)`);
  process.exit(1);
}

console.log(
  `uk-city-bounds-overlap-gate: ok (${checkedCount} geocoded stations checked across UK regions, ${allowListedCount} allow-listed, 3 brief spot-checks passed)`
);
