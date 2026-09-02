/**
 * Production routing for Sydney, Brisbane, Adelaide, and London on Vercel.
 * Directions and station catalogs avoid GTFS-RT imports so cold starts stay light.
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

/** @typedef {"sydney"|"brisbane"|"adelaide"|"uk-london-tfl"|"amsterdam"|"rotterdam"|"vancouver"|"canberra"|"gold-coast"|"newcastle"|"auckland"|"stockholm"|"goteborg"|"wellington"|"malmo"|"uppsala"|"helsinki"|"oslo"|"west-of-england"} MultiCityId */

/** @type {MultiCityId[]} */
export const MULTI_CITY_IDS = ["sydney", "brisbane", "adelaide", "uk-london-tfl", "amsterdam", "rotterdam", "vancouver", "canberra", "gold-coast", "newcastle", "auckland", "stockholm", "goteborg", "wellington", "malmo", "uppsala", "helsinki", "oslo", "west-of-england"];

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
  return catalog.map((entry) => ({
    name: entry.name,
    lat: entry.lat ?? null,
    lng: entry.lng ?? null,
  }));
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
  throw new Error(`Unknown live city: ${cityId}`);
}
