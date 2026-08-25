/**
 * Production routing for Sydney, Brisbane, Adelaide, and London on Vercel.
 * Directions and station catalogs avoid GTFS-RT imports so cold starts stay light.
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { marketingLabelsForStation as sydneyMarketingLabels } from "./sydney/marketing-directions.js";
import { marketingLabelsForStation as brisbaneMarketingLabels } from "./brisbane/marketing-directions.js";
import { marketingLabelsForStation as adelaideMarketingLabels } from "./adelaide/marketing-directions.js";
import { listBrisbaneDogfoodStations } from "./brisbane/dogfood-next-train.js";
import { listSydneyDogfoodStations } from "./sydney/dogfood-next-train.js";
import { listAdelaideDogfoodStations } from "./adelaide/dogfood-next-train.js";

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
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const stations = Array.isArray(raw.stations) ? raw.stations : (Array.isArray(raw.stops) ? raw.stops : (Array.isArray(raw) ? raw : []));
  catalogCache.set(id, stations);
  return stations;
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
  if (id === "brisbane") {
    return listBrisbaneDogfoodStations();
  }
  if (id === "sydney") {
    return listSydneyDogfoodStations();
  }
  if (id === "adelaide") {
    return listAdelaideDogfoodStations();
  }
  return loadCatalog(id).map((entry) => ({
    name: entry.name,
    lat: entry.lat ?? null,
    lng: entry.lng ?? null,
  }));
}

function directionsFor(cityId, station) {
  if (cityId === "sydney") {
    return { directions: sydneyMarketingLabels(station), source: "sydney-marketing-ends" };
  }
  if (cityId === "brisbane") {
    return { directions: brisbaneMarketingLabels(station), source: "brisbane-marketing-ends" };
  }
  if (cityId === "adelaide") {
    return { directions: adelaideMarketingLabels(station), source: "adelaide-marketing-ends" };
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
export function getMultiCityDirections(cityId, station) {
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
