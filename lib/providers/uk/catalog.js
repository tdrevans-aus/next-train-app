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
  for (const stopId of entry.stopIds ?? []) {
    if (stopId && normalizeKey(stopId) === needle) {
      return true;
    }
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
  // A dedupe pass folds platform-level TfL StopPoints (and, e.g., Clapham
  // Junction's second rail id) into their surviving hub/primary row — a
  // saved route or pin that stored one of those dropped ids must still
  // resolve. See docs/jim-brief-london-tram-duplicate-stops.md.
  for (const alsoId of entry.alsoNaptanIds ?? []) {
    if (alsoId && normalizeKey(alsoId) === needle) {
      return true;
    }
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
        stopIds: entry.stopIds ?? [],
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

const CITY_DIRECTIONS_ROOT = join(UK_PROVIDERS_ROOT, "..", "..", "..", "public", "city-directions");
/** @type {Map<string, object>} */
const directionCatalogs = new Map();
/** @type {Map<string, Set<string>>} */
const knownOfferedDestinationSets = new Map();

function loadDirectionCatalog(regionId) {
  const id = normalizeRegionId(regionId);
  const cached = directionCatalogs.get(id);
  if (cached) {
    return cached;
  }
  let raw = {};
  try {
    raw = loadJson(join(CITY_DIRECTIONS_ROOT, `${id}.json`));
  } catch {
    raw = {};
  }
  directionCatalogs.set(id, raw);
  return raw;
}

/**
 * Station names that this region's direction catalog (`public/city-directions/<regionId>.json`)
 * itself uses undecorated as the trailing "destination" segment of some offered direction (e.g.
 * "Euston" in "Lioness Euston") — derived from the catalog's own data on every call site, not a
 * hardcoded list, so it stays correct as the catalog changes. Used to gate the leading "London "
 * disambiguation prefix TfL emits on some destination names
 * (docs/jim-brief-london-station-name-prefix.md): only strip "London " from a name when the bare
 * remainder is one of these known destinations and the "London "-prefixed form itself is not —
 * this is what keeps catalog stations that legitimately begin with "London " (London Bridge,
 * London City Airport, London Euston, London Fields) untouched while still normalising TfL's
 * "London Liverpool Street" down to the catalog's "Liverpool Street".
 */
function buildKnownOfferedDestinationSet(regionId) {
  const id = normalizeRegionId(regionId);
  const cached = knownOfferedDestinationSets.get(id);
  if (cached) {
    return cached;
  }
  const raw = loadDirectionCatalog(id);
  const keysByLengthDesc = Object.keys(raw).sort((a, b) => b.length - a.length);
  const known = new Set();
  for (const values of Object.values(raw)) {
    if (!Array.isArray(values)) {
      continue;
    }
    for (const value of values) {
      const lowerValue = String(value || "").trim().toLowerCase();
      for (const key of keysByLengthDesc) {
        const lowerKey = key.toLowerCase();
        if (lowerValue === lowerKey || lowerValue.endsWith(` ${lowerKey}`)) {
          known.add(lowerKey);
          break;
        }
      }
    }
  }
  knownOfferedDestinationSets.set(id, known);
  return known;
}

/** @see buildKnownOfferedDestinationSet */
export function isKnownOfferedDestinationName(name, regionId) {
  const known = buildKnownOfferedDestinationSet(regionId);
  return known.has(String(name || "").trim().toLowerCase());
}

/**
 * Does this region's direction catalog offer `fullDestinationText` (already built as
 * `${lineName} ${destination}`, matching how the catalog's own entries are written) as a
 * direction *at this specific station* — station-scoped, unlike `isKnownOfferedDestinationName`
 * above, which checks catalog-wide. Used by docs/jim-brief-elizabeth-heathrow-normalization.md's
 * Piccadilly-Heathrow fix: prefer `destinationName` over a `towards`-derived value only when the
 * `towards`-derived form doesn't resolve to an offered direction here but `destinationName`'s
 * does — catalog-driven, not a hardcoded station/terminal list, and it never touches the `via`
 * strip itself. Genuine `via`-strip cases where the towards-derived form *does* resolve (e.g.
 * "Hainault via Newbury Park" -> "Central Hainault" -> grouped to the catalog's offered "Central
 * Epping") are unaffected: this check simply confirms the resolve and no override happens. Where
 * neither form resolves at all (e.g. "Grange Hill via Woodford" at a station that offers no
 * "Central Grange Hill" direction — a pre-existing catalog gap, not something this fix changes),
 * the towards-derived destination is kept exactly as before this fix (safe degradation).
 */
export function stationOffersDestination(stationName, fullDestinationText, regionId) {
  const raw = loadDirectionCatalog(regionId);
  const offered = raw[String(stationName || "")];
  if (!Array.isArray(offered)) {
    return false;
  }
  const needle = String(fullDestinationText || "").trim().toLowerCase();
  if (!needle) {
    return false;
  }
  return offered.some((value) => String(value || "").trim().toLowerCase() === needle);
}

export { regionsIndex };
