/**
 * Production routing for Sydney, Brisbane, and Adelaide on Vercel.
 * Directions and station catalogs avoid GTFS-RT imports so cold starts stay light.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { marketingLabelsForStation as sydneyMarketingLabels } from "./sydney/marketing-directions.js";
import { marketingLabelsForStation as brisbaneMarketingLabels } from "./brisbane/marketing-directions.js";
import { marketingLabelsForStation as adelaideMarketingLabels } from "./adelaide/marketing-directions.js";
import { listBrisbaneDogfoodStations } from "./brisbane/dogfood-next-train.js";
import { listSydneyDogfoodStations } from "./sydney/dogfood-next-train.js";
import { listAdelaideDogfoodStations } from "./adelaide/dogfood-next-train.js";

/** @typedef {"sydney"|"brisbane"|"adelaide"} LiveAuCityId */

/** @type {LiveAuCityId[]} */
export const LIVE_AU_CITY_IDS = ["sydney", "brisbane", "adelaide"];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const catalogCache = new Map();

function loadCatalog(cityId) {
  const id = String(cityId || "").trim().toLowerCase();
  if (catalogCache.has(id)) {
    return catalogCache.get(id);
  }
  const file = join(ROOT, "lib", "cities", id, "stations.json");
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const stations = Array.isArray(raw.stations) ? raw.stations : [];
  catalogCache.set(id, stations);
  return stations;
}

/** @param {string} [cityId] */
export function isLiveAuCity(cityId) {
  const id = String(cityId || "").trim().toLowerCase();
  return LIVE_AU_CITY_IDS.includes(/** @type {LiveAuCityId} */ (id));
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
export function resolveLiveAuStation(cityId, raw) {
  if (!isLiveAuCity(cityId)) {
    return null;
  }
  return resolveFromCatalog(cityId, raw);
}

/** @param {string} cityId */
export function listLiveAuStations(cityId) {
  const id = String(cityId || "").trim().toLowerCase();
  if (!isLiveAuCity(id)) {
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
    lat: null,
    lng: null,
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
  throw new Error(`Unknown live city: ${cityId}`);
}

/** @param {string} cityId @param {object} config */
export async function getLiveAuNextTrain(cityId, config) {
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
  throw new Error(`Unknown live city: ${cityId}`);
}

/** @param {string} cityId @param {string} station */
export function getLiveAuDirections(cityId, station) {
  return directionsFor(String(cityId || "").trim().toLowerCase(), station);
}
