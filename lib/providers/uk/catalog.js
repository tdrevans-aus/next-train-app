/**
 * UK region catalogs — allow-lists per docs/uk-architecture.md + uk-coding-brief.md.
 * Region ids: uk-west-midlands, uk-london-tfl.
 * NOT wired to dev-city-board or live /api/next-train until Tim flips.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const UK_PROVIDERS_ROOT = dirname(fileURLToPath(import.meta.url));

export const UK_REGION_IDS = [
  "uk-west-midlands",
  "uk-london-tfl",
  "east-midlands",
  "south-yorkshire",
  "north-east",
  "west-of-england",
  "south-wales",
  "west-yorkshire",
  "rest-of-wales",
  "rest-of-scotland",
  "london-se-national-rail",
  "glasgow",
  "edinburgh",
  "solent",
  "thames-valley",
  "greater-manchester",
  "liverpool-city-region",
  "greater-anglia",
  "southwest",
  "cumbria",
];

function loadJson(absPath) {
  return JSON.parse(readFileSync(absPath, "utf8"));
}

const regionsIndex = loadJson(join(UK_PROVIDERS_ROOT, "regions.json"));
const regionMetaById = new Map((regionsIndex.regions ?? []).map((region) => [region.id, region]));
/** @type {Map<string, { meta: object, catalog: object }>} */
const regionCatalogs = new Map();

function normalizeRegionId(regionId) {
  return String(regionId || "").trim().toLowerCase();
}

function loadRegionCatalog(regionId) {
  const id = normalizeRegionId(regionId);
  const cached = regionCatalogs.get(id);
  if (cached) {
    return cached;
  }
  const meta = regionMetaById.get(id);
  if (!meta) {
    return null;
  }
  const catalog = loadJson(join(UK_PROVIDERS_ROOT, meta.catalogPath));
  const pack = { meta, catalog };
  regionCatalogs.set(id, pack);
  return pack;
}

export function listRegions() {
  return (regionsIndex.regions ?? []).map((region) => ({
    id: region.id,
    name: region.name,
    modes: region.modes ?? [],
  }));
}

/** Region ids whose stops JSON has been parsed in this process. */
export function loadedUkRegionCatalogIds() {
  return [...regionCatalogs.keys()];
}

export function getRegion(regionId) {
  const id = normalizeRegionId(regionId);
  const pack = loadRegionCatalog(id);
  if (!pack) {
    return null;
  }
  const stops = pack.catalog.stops ?? [];
  const railCount = stops.filter((s) => s.mode === "train").length;
  const metroCount = stops.filter((s) => s.mode === "metro").length;
  const tflCount = id === "uk-london-tfl" ? stops.length : 0;
  return {
    ...pack.meta,
    railCount,
    metroCount,
    tflStopCount: tflCount,
    stopCount: stops.length,
  };
}

export function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+station$/i, "")
    .replace(/\s+stn$/i, "")
    .replace(/'/g, "");
}

function catalogStops(regionId) {
  const pack = loadRegionCatalog(regionId);
  return pack?.catalog?.stops ?? [];
}

function matchTrainEntry(entry, needle) {
  if (normalizeKey(entry.name) === needle) {
    return true;
  }
  if (entry.crs && normalizeKey(entry.crs) === needle) {
    return true;
  }
  for (const alias of entry.aliases ?? []) {
    if (normalizeKey(alias) === needle) {
      return true;
    }
  }
  return false;
}

function matchMetroEntry(entry, needle) {
  if (normalizeKey(entry.name) === needle) {
    return true;
  }
  if (entry.catalogId && normalizeKey(entry.catalogId) === needle) {
    return true;
  }
  if (entry.stopId && normalizeKey(entry.stopId) === needle) {
    return true;
  }
  for (const alias of entry.aliases ?? []) {
    if (normalizeKey(alias) === needle) {
      return true;
    }
  }
  return false;
}

function matchTflEntry(entry, needle) {
  if (normalizeKey(entry.name) === needle) {
    return true;
  }
  if (entry.naptanId && normalizeKey(entry.naptanId) === needle) {
    return true;
  }
  for (const alias of entry.aliases ?? []) {
    if (normalizeKey(alias) === needle) {
      return true;
    }
  }
  return false;
}

export function resolveRailEntry(stationIdOrName, regionId) {
  const id = String(regionId || "").trim().toLowerCase();
  const needle = normalizeKey(stationIdOrName);
  if (!needle) {
    return null;
  }
  for (const entry of catalogStops(id)) {
    if (entry.mode !== "train") {
      continue;
    }
    if (matchTrainEntry(entry, needle)) {
      return { ...entry, regionId: id, mode: "train" };
    }
  }
  if (/^[a-z]{3}$/i.test(needle)) {
    const crs = needle.toUpperCase();
    const hit = catalogStops(id).find((e) => e.mode === "train" && e.crs === crs);
    if (hit) {
      return { ...hit, regionId: id, mode: "train" };
    }
  }
  return null;
}

export function resolveMetroEntry(stopIdOrName, regionId = "uk-west-midlands") {
  const id = String(regionId || "").trim().toLowerCase();
  const needle = normalizeKey(stopIdOrName);
  if (!needle) {
    return null;
  }
  for (const entry of catalogStops(id)) {
    if (entry.mode !== "metro") {
      continue;
    }
    if (matchMetroEntry(entry, needle)) {
      return { ...entry, regionId: id, mode: "metro" };
    }
  }
  return null;
}

export function resolveTflStop(stopIdOrName, regionId = "uk-london-tfl") {
  return resolveTflStops(stopIdOrName, regionId)[0] ?? null;
}

export function resolveTflStops(stopIdOrName, regionId = "uk-london-tfl") {
  const id = String(regionId || "").trim().toLowerCase();
  const needle = normalizeKey(stopIdOrName);
  if (!needle) {
    return [];
  }
  const matches = [];
  for (const entry of catalogStops(id)) {
    if (matchTflEntry(entry, needle)) {
      matches.push({ ...entry, regionId: id });
    }
  }
  return matches;
}

export function listRailStations(regionId) {
  return catalogStops(regionId).filter((entry) => entry.mode === "train");
}

export function listMetroStops(regionId = "uk-west-midlands") {
  return catalogStops(regionId).filter((entry) => entry.mode === "metro");
}

export function listTflStops(regionId = "uk-london-tfl") {
  return catalogStops(regionId);
}

export function listCatalogStations(regionId, { mode } = {}) {
  const id = String(regionId || "").trim().toLowerCase();
  const stops = catalogStops(id);
  const modes = mode ? [mode] : null;
  const filtered = modes ? stops.filter((s) => modes.includes(s.mode)) : stops;

  return filtered.map((entry) => {
    if (entry.mode === "train") {
      return {
        name: entry.name,
        crs: entry.crs,
        mode: "train",
        regionId: id,
        aliases: entry.aliases ?? [],
        lat: entry.lat ?? null,
        lng: entry.lng ?? null,
      };
    }
    if (entry.mode === "metro") {
      return {
        name: entry.name,
        stopId: entry.stopId ?? null,
        catalogId: entry.catalogId,
        mode: "metro",
        regionId: id,
        aliases: entry.aliases ?? [],
        lat: entry.lat ?? null,
        lng: entry.lng ?? null,
      };
    }
    return {
      name: entry.name,
      naptanId: entry.naptanId,
      modes: entry.modes ?? [],
      mode: entry.modes?.[0] ?? "tfl",
      regionId: id,
      aliases: entry.aliases ?? [],
      lat: entry.lat ?? null,
      lng: entry.lng ?? null,
    };
  });
}

export function getRegionCrsAllowList(regionId) {
  return new Set(listRailStations(regionId).map((entry) => entry.crs));
}

export function isCrsInRegion(crs, regionId) {
  const code = String(crs || "").trim().toUpperCase();
  return getRegionCrsAllowList(regionId).has(code);
}

export function getNotInRegion(regionId) {
  const pack = loadRegionCatalog(regionId);
  return pack?.catalog?.notInRegion ?? [];
}

export function isUkRegionId(regionId) {
  return UK_REGION_IDS.includes(String(regionId || "").trim().toLowerCase());
}

export { regionsIndex };
