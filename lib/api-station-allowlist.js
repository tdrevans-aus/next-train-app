import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PERTH_CLUSTER_STATIONS } from "./train-times.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PERTH_STATIONS = new Set(PERTH_CLUSTER_STATIONS);
const CANONICAL_PERTH_STATION = PERTH_CLUSTER_STATIONS[0];

let catalog = null;

function collapseStationList(stations) {
  const collapsed = [];
  let perthAdded = false;

  for (const name of stations) {
    if (PERTH_STATIONS.has(name)) {
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

function normalizeStation(station) {
  if (!station) {
    return station;
  }

  const trimmed = station.trim();
  if (PERTH_STATIONS.has(trimmed)) {
    return CANONICAL_PERTH_STATION;
  }

  return trimmed;
}

function loadStationCatalog() {
  if (!catalog) {
    const file = path.join(__dirname, "..", "public", "stations.json");
    const raw = JSON.parse(readFileSync(file, "utf8"));
    catalog = new Set(collapseStationList(raw));
  }

  return catalog;
}

export function resolveAllowedStation(rawStation) {
  if (!rawStation || typeof rawStation !== "string") {
    return null;
  }

  const trimmed = rawStation.trim();
  if (!trimmed || trimmed.length > 120) {
    return null;
  }

  const catalogSet = loadStationCatalog();
  const normalized = normalizeStation(trimmed);

  if (catalogSet.has(normalized)) {
    return normalized;
  }

  if (catalogSet.has(trimmed)) {
    return trimmed;
  }

  return null;
}
