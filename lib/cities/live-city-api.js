/**
 * Production routing for Sydney, Brisbane, Adelaide, and London on Vercel.
 * Directions and station catalogs avoid GTFS-RT imports so cold starts stay light.
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

/** @typedef {"sydney"|"brisbane"|"adelaide"|"uk-london-tfl"|"canberra"|"gold-coast"|"newcastle"|"stockholm"|"goteborg"|"malmo"|"uppsala"|"helsinki"|"oslo"|"uk-west-midlands"|"west-of-england"|"east-midlands"|"liverpool-city-region"|"solent"|"south-wales"|"west-yorkshire"|"thames-valley"|"greater-anglia"|"rest-of-wales"|"rest-of-scotland"|"london-se-national-rail"|"southwest"|"greater-manchester"|"south-yorkshire"|"north-east"|"glasgow"|"edinburgh"|"cumbria"} MultiCityId */

/** @type {MultiCityId[]} */
export const MULTI_CITY_IDS = ["sydney", "brisbane", "adelaide", "uk-london-tfl", "canberra", "gold-coast", "newcastle", "stockholm", "goteborg", "malmo", "uppsala", "helsinki", "oslo", "uk-west-midlands", "west-of-england", "east-midlands", "liverpool-city-region", "solent", "south-wales", "west-yorkshire", "thames-valley", "greater-anglia", "rest-of-wales", "rest-of-scotland", "london-se-national-rail", "southwest", "greater-manchester", "south-yorkshire", "north-east", "glasgow", "edinburgh", "cumbria"];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const catalogCache = new Map();

function loadCatalog(cityId) {
  const id = String(cityId || "").trim().toLowerCase();
  if (catalogCache.has(id)) {
    return catalogCache.get(id);
  }
  let file;
  if (id === "uk-london-tfl") {
    file = join(ROOT, "lib", "cities", "uk-london-tfl", "stops.json");
  } else {
    file = join(ROOT, "lib", "cities", id, "stations.json");
  }
  if (!existsSync(file)) {
    return [];
  }
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const stations = Array.isArray(raw.stations) ? raw.stations : (Array.isArray(raw.stops) ? raw.stops : (Array.isArray(raw) ? raw : []));
  catalogCache.set(id, stations);
  return stations;
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function findNearestStation(cityId, lat, lng) {
  const id = String(cityId || "perth").trim().toLowerCase();
  let stations = [];
  if (id === "perth") {
    const coordsPath = join(ROOT, "public", "station-coords.json");
    if (existsSync(coordsPath)) {
      const coords = JSON.parse(readFileSync(coordsPath, "utf8"));
      stations = Object.entries(coords).map(([name, pt]) => ({ name, lat: pt.lat, lng: pt.lng }));
    }
  } else {
    stations = loadCatalog(id);
  }

  let nearest = null;
  let bestDistance = Infinity;
  for (const s of stations) {
    // docs/jim-brief-no-live-feed-stops-out-of-picker.md: a stop whose operator
    // has no confirmed live-departures feed can never produce a board, so
    // Near me must never nominate it as the nearest station — it stays in the
    // catalog (coordinates and all) for coverage notes and a future re-enable,
    // just not offered here. Default true when the field is absent so every
    // other city (and every mode: train stop) is untouched.
    if (s.liveFeed === false) {
      continue;
    }
    if (s.lat != null && s.lng != null) {
      const d = distanceKm(lat, lng, s.lat, s.lng);
      if (d < bestDistance) {
        bestDistance = d;
        nearest = s.name;
      }
    }
  }
  return nearest;
}

/** @param {string} [cityId] */
export function isMultiCity(cityId) {
  const id = String(cityId || "").trim().toLowerCase();
  return MULTI_CITY_IDS.includes(/** @type {MultiCityId} */ (id));
}

function resolveFromCatalog(cityId, raw) {
  const needle = String(raw || "").trim().toLowerCase();
  if (!needle) {
    return null;
  }
  for (const entry of loadCatalog(cityId)) {
    if (String(entry.name || "").trim().toLowerCase() === needle) {
      return entry.name;
    }
    if ((entry.aliases ?? []).some((alias) => String(alias).trim().toLowerCase() === needle)) {
      return entry.name;
    }
  }
  return null;
}

/** @param {string} cityId @param {string} raw */
export function resolveMultiCityStation(cityId, raw) {
  if (!isMultiCity(cityId)) {
    return null;
  }
  return resolveFromCatalog(cityId, raw);
}

/** @param {string} cityId */
export function listMultiCityStations(cityId) {
  const id = String(cityId || "").trim().toLowerCase();
  if (!isMultiCity(id)) {
    return [];
  }
  
  // Jim brief: server must not parse large GTFS fixtures for city-stations.
  // We return a simple name list if we can, or just the catalog without expensive parse.
  const catalog = loadCatalog(id);
  return catalog
    .map((entry) => ({
      name: entry.name,
      lat: entry.lat ?? null,
      lng: entry.lng ?? null,
      // docs/jim-brief-no-live-feed-stops-out-of-picker.md: carried through
      // (not filtered here) so /api/city-stations always reflects the
      // catalog's real flag; default true when absent leaves every other
      // city untouched. Filtering it out of pickers/Near me happens
      // client-side (public/brisbane-dogfood.js, public/app.js) and
      // server-side (findNearestStation above).
      liveFeed: entry.liveFeed !== false,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function directionsFor(cityId, station) {
  if (cityId === "sydney") {
    const { marketingLabelsForStation } = await import("./sydney/marketing-directions.js");
    return { directions: marketingLabelsForStation(station), source: "sydney-marketing-ends" };
  }
  if (cityId === "brisbane") {
    const { marketingLabelsForStation } = await import("./brisbane/marketing-directions.js");
    return { directions: marketingLabelsForStation(station), source: "brisbane-marketing-ends" };
  }
  if (cityId === "adelaide") {
    const { marketingLabelsForStation } = await import("./adelaide/marketing-directions.js");
    return { directions: marketingLabelsForStation(station), source: "adelaide-marketing-ends" };
  }
  if (cityId === "amsterdam") {
    const { marketingLabelsForStation } = await import("./amsterdam/marketing-directions.js");
    return { directions: marketingLabelsForStation(station), source: "amsterdam-marketing-ends" };
  }
  if (cityId === "rotterdam") {
    const { marketingLabelsForStation } = await import("./rotterdam/marketing-directions.js");
    return { directions: marketingLabelsForStation(station), source: "rotterdam-marketing-ends" };
  }
  if (cityId === "vancouver") {
    const { marketingLabelsForStation } = await import("./vancouver/marketing-directions.js");
    return { directions: marketingLabelsForStation(station), source: "vancouver-marketing-ends" };
  }
  if (cityId === "canberra") {
    const { marketingLabelsForStation } = await import("./canberra/marketing-directions.js");
    return { directions: marketingLabelsForStation(station), source: "canberra-marketing-ends" };
  }
  if (cityId === "gold-coast") {
    const { marketingLabelsForStation } = await import("./gold-coast/marketing-directions.js");
    return { directions: marketingLabelsForStation(station), source: "gold-coast-marketing-ends" };
  }
  if (cityId === "newcastle") {
    const { marketingLabelsForStation } = await import("./newcastle/marketing-directions.js");
    return { directions: marketingLabelsForStation(station), source: "newcastle-marketing-ends" };
  }
  if (cityId === "auckland") {
    const { marketingLabelsForStation } = await import("./auckland/marketing-directions.js");
    return { directions: marketingLabelsForStation(station), source: "auckland-marketing-ends" };
  }
  if (cityId === "goteborg") {
    const { marketingLabelsForStation } = await import("./goteborg/marketing-directions.js");
    return { directions: marketingLabelsForStation(station), source: "goteborg-marketing-ends" };
  }
  if (cityId === "stockholm") {
    const { marketingLabelsForStation } = await import("./stockholm/marketing-directions.js");
    return { directions: marketingLabelsForStation(station), source: "stockholm-marketing-ends" };
  }
  if (cityId === "wellington") {
    const { marketingLabelsForStation } = await import("./wellington/marketing-directions.js");
    return { directions: marketingLabelsForStation(station), source: "wellington-marketing-ends" };
  }
  if (cityId === "malmo") {
    const { marketingLabelsForStation } = await import("./malmo/marketing-directions.js");
    return { directions: marketingLabelsForStation(station), source: "malmo-marketing-ends" };
  }
  if (cityId === "uppsala") {
    const { marketingLabelsForStation } = await import("./uppsala/marketing-directions.js");
    return { directions: marketingLabelsForStation(station), source: "uppsala-marketing-ends" };
  }
  if (cityId === "oslo") {
    const { marketingLabelsForStation } = await import("./oslo/marketing-directions.js");
    return { directions: marketingLabelsForStation(station), source: "oslo-marketing-ends" };
  }
  if (cityId === "uk-london-tfl") {
    const { marketingLabelsForStation } = await import("./uk-london-tfl/marketing-directions.js");
    const directions = marketingLabelsForStation(station);
    return {
      directions,
      source: directions.length ? "uk-london-tfl-oracle" : "uk-london-tfl-no-stop",
    };
  }
  if (cityId === "helsinki") {
    const { marketingLabelsForStation } = await import("./helsinki/marketing-directions.js");
    return { directions: marketingLabelsForStation(station), source: "helsinki-marketing-ends" };
  }
  if (cityId === "west-of-england") {
    // No printed line map (National Rail destination+operator model) — directions
    // are derived live from the Darwin board itself, not a static marketing list.
    const { getWestOfEnglandDogfoodDirections } = await import("./west-of-england/dogfood-next-train.js");
    return getWestOfEnglandDogfoodDirections(station);
  }
  if (cityId === "east-midlands") {
    // National Rail: destination+operator derived live from Darwin, same approach as
    // West of England. NET tram: fetchStationBoard() throws NetFeedUnconfirmedError
    // unconditionally (no confirmed feed) — surfaced here, not swallowed.
    const { getEastMidlandsDogfoodDirections } = await import("./east-midlands/dogfood-next-train.js");
    return getEastMidlandsDogfoodDirections(station);
  }
  if (cityId === "uk-west-midlands") {
    // National Rail: destination+operator derived live from Darwin, same approach as
    // West of England/East Midlands. West Midlands Metro: fetchMetroStopBoard()
    // serves the live TfWM GTFS-RT board when TFWM_API_APP_ID/TFWM_API_APP_KEY are
    // set and throws MissingTfwmCredentialsError otherwise — surfaced here, not swallowed.
    const { getUkWestMidlandsDogfoodDirections } = await import("./uk-west-midlands/dogfood-next-train.js");
    return getUkWestMidlandsDogfoodDirections(station);
  }
  if (cityId === "liverpool-city-region") {
    // Both National Rail and Merseyrail: destination+operator derived live from
    // Darwin, same approach as West of England/East Midlands (Merseyrail corrected
    // 4 Sep 2026 — it is a National Rail TOC, Darwin-served like any other).
    const { getLiverpoolCityRegionDogfoodDirections } = await import(
      "./liverpool-city-region/dogfood-next-train.js"
    );
    return getLiverpoolCityRegionDogfoodDirections(station);
  }
  if (cityId === "west-yorkshire") {
    // National Rail: destination+operator derived live from Darwin, same approach
    // as West of England/East Midlands. Not in MULTI_CITY_IDS yet — registry
    // status stays "planned" until Mark/Tim flip it (docs/west-yorkshire-d1/
    // jim-handoff.md). Safe to wire the switch-case ahead of that: production
    // routes gate on assertCityLive() first, not on this list.
    const { getWestYorkshireDogfoodDirections } = await import("./west-yorkshire/dogfood-next-train.js");
    return getWestYorkshireDogfoodDirections(station);
  }
  if (cityId === "solent") {
    // National Rail: destination+operator derived live from Darwin, same approach
    // as West of England/East Midlands/West Yorkshire. Not in MULTI_CITY_IDS yet —
    // registry status stays "planned" until Mark/Tim flip it (docs/solent-d1/
    // jim-handoff.md). Safe to wire the switch-case ahead of that: production
    // routes gate on assertCityLive() first, not on this list.
    const { getSolentDogfoodDirections } = await import("./solent/dogfood-next-train.js");
    return getSolentDogfoodDirections(station);
  }
  if (cityId === "thames-valley") {
    // National Rail: destination+operator derived live from Darwin, same approach
    // as West of England/East Midlands/West Yorkshire/Solent. Not in MULTI_CITY_IDS
    // yet — registry status stays "planned" until Mark/Tim flip it
    // (docs/thames-valley-d1/jim-handoff.md). Safe to wire the switch-case ahead of
    // that: production routes gate on assertCityLive() first, not on this list.
    const { getThamesValleyDogfoodDirections } = await import("./thames-valley/dogfood-next-train.js");
    return getThamesValleyDogfoodDirections(station);
  }
  if (cityId === "greater-anglia") {
    // National Rail: destination+operator derived live from Darwin, same approach
    // as West of England/East Midlands/West Yorkshire/Solent/Thames Valley. Not in
    // MULTI_CITY_IDS yet — registry status stays "planned" until Mark/Tim flip it
    // (docs/greater-anglia-d1/jim-handoff.md). Safe to wire the switch-case ahead of
    // that: production routes gate on assertCityLive() first, not on this list.
    const { getGreaterAngliaDogfoodDirections } = await import("./greater-anglia/dogfood-next-train.js");
    return getGreaterAngliaDogfoodDirections(station);
  }
  if (cityId === "south-wales") {
    // National Rail: destination+operator derived live from Darwin, same approach
    // as West of England/East Midlands/West Yorkshire/Solent/Thames Valley/Greater
    // Anglia. Not in MULTI_CITY_IDS yet — registry status stays "planned" until
    // Mark/Tim flip it (docs/south-wales-d1/jim-handoff.md). Safe to wire the
    // switch-case ahead of that: production routes gate on assertCityLive() first,
    // not on this list.
    const { getSouthWalesDogfoodDirections } = await import("./south-wales/dogfood-next-train.js");
    return getSouthWalesDogfoodDirections(station);
  }
  if (cityId === "rest-of-wales") {
    // National Rail: destination+operator derived live from Darwin, same approach
    // as West of England/East Midlands/West Yorkshire/Solent/Thames Valley/Greater
    // Anglia/South Wales. Not in MULTI_CITY_IDS yet — registry status stays
    // "planned" until Mark/Tim flip it (docs/rest-of-wales-d1/jim-handoff.md).
    // Safe to wire the switch-case ahead of that: production routes gate on
    // assertCityLive() first, not on this list.
    const { getRestOfWalesDogfoodDirections } = await import("./rest-of-wales/dogfood-next-train.js");
    return getRestOfWalesDogfoodDirections(station);
  }
  if (cityId === "southwest") {
    // National Rail: destination+operator derived live from Darwin, same approach
    // as West of England/East Midlands/West Yorkshire/Solent/Thames Valley/Greater
    // Anglia/South Wales/Rest of Wales. Hub lock Exeter St Davids, secondary hub
    // Plymouth, terminus Penzance — no hub configured (direction-hubs.json), same
    // shape as South Wales' single Cardiff Central hub. Night Riviera Sleeper is
    // excluded (out-reservation) at the six stations it calls, enforced inside
    // lib/providers/southwest.js. Not in MULTI_CITY_IDS yet — registry status
    // stays "planned" until Mark/Tim flip it (docs/southwest-d1/jim-handoff.md).
    // Safe to wire the switch-case ahead of that: production routes gate on
    // assertCityLive() first, not on this list.
    const { getSouthwestDogfoodDirections } = await import("./southwest/dogfood-next-train.js");
    return getSouthwestDogfoodDirections(station);
  }
  if (cityId === "rest-of-scotland") {
    // National Rail: destination+operator derived live from Darwin, same approach
    // as West of England/East Midlands/West Yorkshire/Solent/Thames Valley/Greater
    // Anglia/South Wales/Rest of Wales. Four co-equal hub locks (Perth, Inverness,
    // Aberdeen, Dundee) — no special-casing needed here, see
    // lib/cities/rest-of-scotland/dogfood-next-train.js file header. Not in
    // MULTI_CITY_IDS yet — registry status stays "planned" until Mark/Tim flip it
    // (docs/rest-of-scotland-d1/jim-handoff.md). Safe to wire the switch-case ahead
    // of that: production routes gate on assertCityLive() first, not on this list.
    const { getRestOfScotlandDogfoodDirections } = await import("./rest-of-scotland/dogfood-next-train.js");
    return getRestOfScotlandDogfoodDirections(station);
  }
  if (cityId === "london-se-national-rail") {
    // National Rail: destination+operator derived live from Darwin, same approach
    // as West of England/East Midlands/West Yorkshire/Solent/Thames Valley/Greater
    // Anglia/South Wales/Rest of Wales/Rest of Scotland. FIRST MULTI-GROUP UK
    // REGION, no single hub-lock — seven independent per-terminus station groups
    // (Tim's Option A); no special-casing needed here, see
    // lib/cities/london-se-national-rail/dogfood-next-train.js file header. Not in
    // MULTI_CITY_IDS yet — registry status stays "planned" until Mark/Tim flip it
    // (docs/london-se-national-rail-d1/jim-handoff.md). Safe to wire the
    // switch-case ahead of that: production routes gate on assertCityLive() first,
    // not on this list.
    const { getLondonSeNationalRailDogfoodDirections } = await import(
      "./london-se-national-rail/dogfood-next-train.js"
    );
    return getLondonSeNationalRailDogfoodDirections(station);
  }
  if (cityId === "greater-manchester") {
    // Two agencies: National Rail destination+operator derived live from Darwin
    // (same approach as every other UK NR region); Metrolink has no confirmed
    // real-time feed and fetchMetrolinkStopBoard() throws
    // MetrolinkFeedUnconfirmedError unconditionally — surfaced here, not
    // swallowed, see lib/cities/greater-manchester/dogfood-next-train.js file
    // header. Not in MULTI_CITY_IDS yet — registry status stays "planned" until
    // Mark/Tim flip it (docs/greater-manchester-d1/jim-handoff.md). Safe to wire
    // the switch-case ahead of that: production routes gate on assertCityLive()
    // first, not on this list.
    const { getGreaterManchesterDogfoodDirections } = await import(
      "./greater-manchester/dogfood-next-train.js"
    );
    return getGreaterManchesterDogfoodDirections(station);
  }
  if (cityId === "south-yorkshire") {
    // Two agencies: National Rail destination+operator derived live from Darwin
    // (same approach as every other UK NR region); Sheffield Supertram has no
    // confirmed GTFS/GTFS-RT feed under SYFTL and fetchSupertramStopBoard()
    // throws SupertramFeedUnconfirmedError unconditionally — surfaced here, not
    // swallowed, see lib/cities/south-yorkshire/dogfood-next-train.js file
    // header. Not in MULTI_CITY_IDS yet — registry status stays "planned" until
    // Mark/Tim flip it (docs/south-yorkshire-d1/jim-handoff.md). Safe to wire
    // the switch-case ahead of that: production routes gate on assertCityLive()
    // first, not on this list.
    const { getSouthYorkshireDogfoodDirections } = await import(
      "./south-yorkshire/dogfood-next-train.js"
    );
    return getSouthYorkshireDogfoodDirections(station);
  }
  if (cityId === "edinburgh") {
    // Two agencies: National Rail destination+operator derived live from Darwin
    // (same approach as every other UK NR region), SINGLE hub-lock at Edinburgh
    // Waverley with Haymarket/Slateford as through-running satellites (not
    // Glasgow's two-independent-termini shape). Edinburgh Trams has no
    // confirmed real-time feed and fetchTramStopBoard() throws
    // EdinburghTramsFeedUnverifiedError unconditionally — surfaced here, not
    // swallowed, see lib/cities/edinburgh/dogfood-next-train.js file header.
    // Not in MULTI_CITY_IDS yet — registry status stays "planned" until
    // Mark/Tim flip it (docs/edinburgh-d1/jim-handoff.md). Safe to wire the
    // switch-case ahead of that: production routes gate on assertCityLive()
    // first, not on this list.
    const { getEdinburghDogfoodDirections } = await import(
      "./edinburgh/dogfood-next-train.js"
    );
    return getEdinburghDogfoodDirections(station);
  }
  if (cityId === "north-east") {
    // Two agencies: National Rail destination+operator derived live from Darwin
    // (same approach as every other UK NR region); Tyne and Wear Metro is
    // OUT-PRODUCT (Tim, 5 Sep 2026) — no confirmed public real-time feed exists
    // and fetchMetroStopBoard() throws MetroFeedUnconfirmedError unconditionally
    // — surfaced here, not swallowed, see
    // lib/cities/north-east/dogfood-next-train.js file header. Not in
    // MULTI_CITY_IDS yet — registry status stays "planned" until Mark/Tim flip
    // it (docs/north-east-d1/jim-handoff.md). Safe to wire the switch-case
    // ahead of that: production routes gate on assertCityLive() first, not on
    // this list.
    const { getNorthEastDogfoodDirections } = await import(
      "./north-east/dogfood-next-train.js"
    );
    return getNorthEastDogfoodDirections(station);
  }
  if (cityId === "cumbria") {
    // National Rail: destination+operator derived live from Darwin, same approach
    // as every other UK NR region. One tier-1 hub lock (Carlisle) plus two tier-2
    // secondary hubs (Oxenholme Lake District, Barrow-in-Furness) — no special-
    // casing needed here, see lib/cities/cumbria/dogfood-next-train.js file
    // header. Not in MULTI_CITY_IDS yet — registry status stays "planned" until
    // Mark/Tim flip it (docs/cumbria-d1/jim-handoff.md). Safe to wire the
    // switch-case ahead of that: production routes gate on assertCityLive()
    // first, not on this list.
    const { getCumbriaDogfoodDirections } = await import(
      "./cumbria/dogfood-next-train.js"
    );
    return getCumbriaDogfoodDirections(station);
  }
  if (cityId === "glasgow") {
    // Two INDEPENDENT NETWORKS under one city id, no single hub-lock
    // ("Option A at n=2" — Glasgow Central + Glasgow Queen Street, see
    // lib/providers/glasgow.js file header): National Rail
    // destination+operator derived live from Darwin (same approach as every
    // other UK NR region); Glasgow Subway has no confirmed GTFS-RT feed and
    // an unverified static-feed stop order/license, so
    // fetchSubwayStopBoard() throws GlasgowSubwayFeedUnverifiedError
    // unconditionally — surfaced here, not swallowed, see
    // lib/cities/glasgow/dogfood-next-train.js file header. Not in
    // MULTI_CITY_IDS yet — registry status stays "planned" until Mark/Tim
    // flip it (docs/glasgow-d1/jim-handoff.md). Safe to wire the
    // switch-case ahead of that: production routes gate on assertCityLive()
    // first, not on this list.
    const { getGlasgowDogfoodDirections } = await import("./glasgow/dogfood-next-train.js");
    return getGlasgowDogfoodDirections(station);
  }
  throw new Error(`Unknown live city: ${cityId}`);
}

/** @param {string} cityId @param {string} station */
export async function getMultiCityDirections(cityId, station) {
  return directionsFor(String(cityId || "").trim().toLowerCase(), station);
}

/** @param {string} cityId @param {object} config */
export async function getMultiCityNextTrain(cityId, config) {
  const id = String(cityId || "").trim().toLowerCase();
  if (id === "sydney") {
    const { getSydneyDogfoodNextTrain } = await import("./sydney/dogfood-next-train.js");
    return getSydneyDogfoodNextTrain(config);
  }
  if (id === "brisbane") {
    const { getBrisbaneDogfoodNextTrain } = await import("./brisbane/dogfood-next-train.js");
    return getBrisbaneDogfoodNextTrain(config);
  }
  if (id === "adelaide") {
    const { getAdelaideDogfoodNextTrain } = await import("./adelaide/dogfood-next-train.js");
    return getAdelaideDogfoodNextTrain(config);
  }
  if (id === "amsterdam") {
    const { getAmsterdamDogfoodNextTrain } = await import("./amsterdam/dogfood-next-train.js");
    return getAmsterdamDogfoodNextTrain(config);
  }
  if (id === "rotterdam") {
    const { getRotterdamDogfoodNextTrain } = await import("./rotterdam/dogfood-next-train.js");
    return getRotterdamDogfoodNextTrain(config);
  }
  if (id === "vancouver") {
    const { getVancouverDogfoodNextTrain } = await import("./vancouver/dogfood-next-train.js");
    return getVancouverDogfoodNextTrain(config);
  }
  if (id === "canberra") {
    const { getCanberraDogfoodNextTrain } = await import("./canberra/dogfood-next-train.js");
    return getCanberraDogfoodNextTrain(config);
  }
  if (id === "gold-coast") {
    const { getGoldCoastDogfoodNextTrain } = await import("./gold-coast/dogfood-next-train.js");
    return getGoldCoastDogfoodNextTrain(config);
  }
  if (id === "newcastle") {
    const { getNewcastleDogfoodNextTrain } = await import("./newcastle/dogfood-next-train.js");
    return getNewcastleDogfoodNextTrain(config);
  }
  if (id === "auckland") {
    const { getAucklandDogfoodNextTrain } = await import("./auckland/dogfood-next-train.js");
    return getAucklandDogfoodNextTrain(config);
  }
  if (id === "goteborg") {
    // Schedule-only board (no Trafiklab TripUpdates for vt) — surfaced honestly.
    const { getGoteborgDogfoodNextTrain } = await import("./goteborg/dogfood-next-train.js");
    return getGoteborgDogfoodNextTrain(config);
  }
  if (id === "stockholm") {
    const { getStockholmDogfoodNextTrain } = await import("./stockholm/dogfood-next-train.js");
    return getStockholmDogfoodNextTrain(config);
  }
  if (id === "wellington") {
    const { getWellingtonDogfoodNextTrain } = await import("./wellington/dogfood-next-train.js");
    return getWellingtonDogfoodNextTrain(config);
  }
  if (id === "malmo") {
    const { getMalmoDogfoodNextTrain } = await import("./malmo/dogfood-next-train.js");
    return getMalmoDogfoodNextTrain(config);
  }
  if (id === "uppsala") {
    const { getUppsalaDogfoodNextTrain } = await import("./uppsala/dogfood-next-train.js");
    return getUppsalaDogfoodNextTrain(config);
  }
  if (id === "oslo") {
    const { getOsloDogfoodNextTrain } = await import("./oslo/dogfood-next-train.js");
    return getOsloDogfoodNextTrain(config);
  }
  if (id === "uk-london-tfl") {
    const { fetchStopBoard } = await import("../providers/uk-tfl.js");
    const { buildNextTrainResponse, pickUpcomingProviderTrips } = await import("../train-times-core.js");
    const { getCity } = await import("../providers/registry.js");
    
    const board = await fetchStopBoard(config.station);
    const city = getCity("uk-london-tfl");
    const timeZone = city.timeZone;
    const now = config.now || new Date();

    const trips = board.trips || [];
    const upcoming = pickUpcomingProviderTrips(trips, config.destination, now);

    return buildNextTrainResponse({
      station: board.stationName,
      destination: config.destination,
      destinationLabel: config.destinationLabel || config.destination,
      leaveBeforeMinutes: config.leaveBeforeMinutes,
      refreshSeconds: config.refreshSeconds,
      skipTrains: config.skipTrains,
      now,
      lastUpdated: board.lastUpdate ? new Date(board.lastUpdate) : now,
      upcomingTrips: upcoming,
      timeZone,
    });
  }
  if (id === "helsinki") {
    const { getHelsinkiDogfoodNextTrain } = await import("./helsinki/dogfood-next-train.js");
    return getHelsinkiDogfoodNextTrain(config);
  }
  if (id === "west-of-england") {
    const { getWestOfEnglandDogfoodNextTrain } = await import("./west-of-england/dogfood-next-train.js");
    return getWestOfEnglandDogfoodNextTrain(config);
  }
  if (id === "east-midlands") {
    const { getEastMidlandsDogfoodNextTrain } = await import("./east-midlands/dogfood-next-train.js");
    return getEastMidlandsDogfoodNextTrain(config);
  }
  if (id === "uk-west-midlands") {
    const { getUkWestMidlandsDogfoodNextTrain } = await import("./uk-west-midlands/dogfood-next-train.js");
    return getUkWestMidlandsDogfoodNextTrain(config);
  }
  if (id === "liverpool-city-region") {
    const { getLiverpoolCityRegionDogfoodNextTrain } = await import(
      "./liverpool-city-region/dogfood-next-train.js"
    );
    return getLiverpoolCityRegionDogfoodNextTrain(config);
  }
  if (id === "west-yorkshire") {
    // Not in MULTI_CITY_IDS yet — see the directionsFor() note above.
    const { getWestYorkshireDogfoodNextTrain } = await import("./west-yorkshire/dogfood-next-train.js");
    return getWestYorkshireDogfoodNextTrain(config);
  }
  if (id === "solent") {
    // Not in MULTI_CITY_IDS yet — see the directionsFor() note above.
    const { getSolentDogfoodNextTrain } = await import("./solent/dogfood-next-train.js");
    return getSolentDogfoodNextTrain(config);
  }
  if (id === "thames-valley") {
    // Not in MULTI_CITY_IDS yet — see the directionsFor() note above.
    const { getThamesValleyDogfoodNextTrain } = await import("./thames-valley/dogfood-next-train.js");
    return getThamesValleyDogfoodNextTrain(config);
  }
  if (id === "greater-anglia") {
    // Not in MULTI_CITY_IDS yet — see the directionsFor() note above.
    const { getGreaterAngliaDogfoodNextTrain } = await import("./greater-anglia/dogfood-next-train.js");
    return getGreaterAngliaDogfoodNextTrain(config);
  }
  if (id === "south-wales") {
    // Not in MULTI_CITY_IDS yet — see the directionsFor() note above.
    const { getSouthWalesDogfoodNextTrain } = await import("./south-wales/dogfood-next-train.js");
    return getSouthWalesDogfoodNextTrain(config);
  }
  if (id === "rest-of-wales") {
    // Not in MULTI_CITY_IDS yet — see the directionsFor() note above.
    const { getRestOfWalesDogfoodNextTrain } = await import("./rest-of-wales/dogfood-next-train.js");
    return getRestOfWalesDogfoodNextTrain(config);
  }
  if (id === "southwest") {
    // Not in MULTI_CITY_IDS yet — see the directionsFor() note above.
    const { getSouthwestDogfoodNextTrain } = await import("./southwest/dogfood-next-train.js");
    return getSouthwestDogfoodNextTrain(config);
  }
  if (id === "rest-of-scotland") {
    // Not in MULTI_CITY_IDS yet — see the directionsFor() note above.
    const { getRestOfScotlandDogfoodNextTrain } = await import("./rest-of-scotland/dogfood-next-train.js");
    return getRestOfScotlandDogfoodNextTrain(config);
  }
  if (id === "london-se-national-rail") {
    // Not in MULTI_CITY_IDS yet — see the directionsFor() note above.
    const { getLondonSeNationalRailDogfoodNextTrain } = await import(
      "./london-se-national-rail/dogfood-next-train.js"
    );
    return getLondonSeNationalRailDogfoodNextTrain(config);
  }
  if (id === "greater-manchester") {
    // Not in MULTI_CITY_IDS yet — see the directionsFor() note above.
    const { getGreaterManchesterDogfoodNextTrain } = await import(
      "./greater-manchester/dogfood-next-train.js"
    );
    return getGreaterManchesterDogfoodNextTrain(config);
  }
  if (id === "south-yorkshire") {
    // Not in MULTI_CITY_IDS yet — see the directionsFor() note above.
    const { getSouthYorkshireDogfoodNextTrain } = await import(
      "./south-yorkshire/dogfood-next-train.js"
    );
    return getSouthYorkshireDogfoodNextTrain(config);
  }
  if (id === "edinburgh") {
    // Not in MULTI_CITY_IDS yet — see the directionsFor() note above.
    const { getEdinburghDogfoodNextTrain } = await import(
      "./edinburgh/dogfood-next-train.js"
    );
    return getEdinburghDogfoodNextTrain(config);
  }
  if (id === "north-east") {
    // Not in MULTI_CITY_IDS yet — see the directionsFor() note above.
    const { getNorthEastDogfoodNextTrain } = await import(
      "./north-east/dogfood-next-train.js"
    );
    return getNorthEastDogfoodNextTrain(config);
  }
  if (id === "cumbria") {
    // Not in MULTI_CITY_IDS yet — see the directionsFor() note above.
    const { getCumbriaDogfoodNextTrain } = await import(
      "./cumbria/dogfood-next-train.js"
    );
    return getCumbriaDogfoodNextTrain(config);
  }
  if (id === "glasgow") {
    // Not in MULTI_CITY_IDS yet — see the directionsFor() note above.
    const { getGlasgowDogfoodNextTrain } = await import("./glasgow/dogfood-next-train.js");
    return getGlasgowDogfoodNextTrain(config);
  }
  throw new Error(`Unknown live city: ${cityId}`);
}
