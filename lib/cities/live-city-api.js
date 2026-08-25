/**
 * Production routing for Sydney, Brisbane, Adelaide, and London on Vercel.
 * Directions and station catalogs avoid GTFS-RT imports so cold starts stay light.
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

/** @typedef {"sydney"|"brisbane"|"adelaide"|"uk-london-tfl"} MultiCityId */

/** @type {MultiCityId[]} */
export const MULTI_CITY_IDS = ["sydney", "brisbane", "adelaide", "uk-london-tfl"];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const catalogCache = new Map();
const oracleCache = new Map();

function loadOracle(cityId) {
  const id = String(cityId || "").trim().toLowerCase();
  if (oracleCache.has(id)) {
    return oracleCache.get(id);
  }
  let file;
  if (id === "uk-london-tfl") {
    file = join(ROOT, "qa", "fixtures", "uk-london-tfl", "published-network.json");
  }
  if (file && existsSync(file)) {
    const data = JSON.parse(readFileSync(file, "utf8"));
    oracleCache.set(id, data);
    return data;
  }
  return null;
}

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
  if (cityId === "uk-london-tfl") {
    const oracle = loadOracle(cityId);
    if (!oracle) {
      return { directions: [], source: "uk-london-tfl-no-oracle" };
    }
    const catalog = loadCatalog(cityId);
    const stationName = station.toLowerCase().trim();
    const stops = catalog.filter((s) => s.name.toLowerCase().trim() === stationName);
    if (stops.length === 0) {
      return { directions: [], source: "uk-london-tfl-no-stop" };
    }
    const stopLines = new Set();
    for (const s of stops) {
      if (s.lines) {
        s.lines.forEach((line) => stopLines.add(line));
      }
    }
    const chips = [];
    for (const line of oracle.lines) {
      if (stopLines.has(line.name)) {
        if (line.loop) {
          // Circle Line is a loop; it still appears in the list if it has departures,
          // but we use the line name as the direction instead of a terminus.
          chips.push(line.name);
          continue;
        }
        for (const terminus of line.termini) {
          if (terminus !== station) {
            chips.push(`${line.name} ${terminus}`);
          }
        }
      }
    }
    return {
      directions: chips.sort(),
      source: "uk-london-tfl-oracle",
    };
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
  throw new Error(`Unknown live city: ${cityId}`);
}
