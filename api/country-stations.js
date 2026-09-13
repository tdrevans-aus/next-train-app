import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { applyCors } from "../lib/api-cors.js";
import { checkRateLimit } from "../lib/api-rate-limit.js";
import { CITIES } from "../lib/providers/registry.js";
import { isMultiCity, listMultiCityStations } from "../lib/cities/live-city-api.js";
import { isKnownCountry, regionIdsForCountry } from "../lib/cities/country-regions.js";
import { PERTH_CLUSTER_STATIONS } from "../lib/train-times.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PERTH_STATION_SET = new Set(PERTH_CLUSTER_STATIONS);
const CANONICAL_PERTH_STATION = PERTH_CLUSTER_STATIONS[0];

let perthCache = null;

function collapsePerthStations(names) {
  const collapsed = [];
  let perthAdded = false;
  for (const name of names) {
    if (PERTH_STATION_SET.has(name)) {
      if (!perthAdded) {
        collapsed.push(CANONICAL_PERTH_STATION);
        perthAdded = true;
      }
      continue;
    }
    collapsed.push(name);
  }
  return collapsed;
}

/**
 * Perth is the original single-city integration — it doesn't answer
 * city-stations (docs/jim-brief-country-wide-station-picker.md "Data"
 * section), so its catalog is read directly from the same two static files
 * the client itself falls back to (public/stations.json,
 * public/station-coords.json) rather than via listMultiCityStations.
 */
function loadPerthStations() {
  if (perthCache) {
    return perthCache;
  }
  try {
    const namesFile = path.join(__dirname, "..", "public", "stations.json");
    const coordsFile = path.join(__dirname, "..", "public", "station-coords.json");
    const rawNames = JSON.parse(readFileSync(namesFile, "utf8"));
    const coords = JSON.parse(readFileSync(coordsFile, "utf8"));
    const names = collapsePerthStations(Array.isArray(rawNames) ? rawNames : []);
    perthCache = names.map((name) => ({
      name,
      lat: coords?.[name]?.lat ?? null,
      lng: coords?.[name]?.lng ?? null,
      liveFeed: true,
    }));
  } catch (error) {
    console.error("[country-stations] Could not load Perth catalog", error);
    perthCache = [];
  }
  return perthCache;
}

function registryEntry(cityId) {
  return CITIES.find((entry) => entry.id === cityId);
}

export default async function handler(req, res) {
  if (applyCors(req, res)) {
    return;
  }

  if (!checkRateLimit(req, res)) {
    return;
  }

  const country = String(req.query?.country ?? "").trim().toLowerCase();
  if (!isKnownCountry(country)) {
    res.status(400).json({ error: "Unknown country", country });
    return;
  }

  const regionIds = regionIdsForCountry(country);
  const regions = [];
  const stations = [];

  for (const regionId of regionIds) {
    const entry = registryEntry(regionId);
    if (!entry || entry.status !== "live") {
      // Not live yet (e.g. Melbourne, planned) — excluded from the
      // country-wide catalog per the brief; the client renders these as
      // non-selectable "(Coming Soon)" headers from its own COUNTRIES table.
      continue;
    }

    let regionStations;
    if (regionId === "perth") {
      regionStations = loadPerthStations();
    } else if (isMultiCity(regionId)) {
      regionStations = listMultiCityStations(regionId);
    } else {
      // A live registry entry that is neither Perth nor a wired multi-city
      // catalog has no station source here — skip rather than guess.
      continue;
    }

    if (!regionStations.length) {
      continue;
    }

    const region = { id: regionId, displayName: entry.displayName };
    regions.push(region);
    for (const station of regionStations) {
      stations.push({
        name: station.name,
        lat: station.lat ?? null,
        lng: station.lng ?? null,
        liveFeed: station.liveFeed,
        region,
      });
    }
  }

  res.setHeader("Cache-Control", "public, s-maxage=3600");
  res.status(200).json({ country, regions, stations });
}
