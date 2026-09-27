/**
 * Builds the /api/cities manifest — the server-side source of truth for "which cities
 * exist" that the client used to bake into seven hand-maintained list copies
 * (docs/jim-brief-registry-driven-client.md). Shared by api/cities.js (production/Vercel)
 * and dev-server.js (local dev, which also layers in fixture-only extra cities), so the
 * two never drift.
 *
 * contractVersion 2 (bumped from 1): every `status: "live"` registry city now carries
 * displayName, country, timeZone, bounds, modes, nearbyEligible and directionsVersion,
 * plus a top-level `countries` picker tree. contractVersion 1's `cities` shape
 * ({id, displayName, status, timeZone, modes}, every status) is still returned unchanged
 * for any caller that only reads that — see registry.js's listCities().
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CITIES } from "../providers/registry.js";
import { CITY_COUNTRY, COUNTRY_NAMES, COUNTRY_ORDER, DARWIN_FEED_CITY_IDS } from "./country-regions.js";
import { CITY_BOUNDS } from "./city-bounds.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIRECTIONS_DIR = path.join(__dirname, "..", "..", "public", "city-directions");

export const CONTRACT_VERSION = 2;

const directionsVersionCache = new Map();

/** Short content hash of public/city-directions/<cityId>.json, or null if it doesn't exist. */
function directionsVersionFor(cityId) {
  if (directionsVersionCache.has(cityId)) {
    return directionsVersionCache.get(cityId);
  }
  let version = null;
  try {
    const buf = readFileSync(path.join(DIRECTIONS_DIR, `${cityId}.json`));
    version = createHash("sha1").update(buf).digest("hex").slice(0, 8);
  } catch {
    version = null;
  }
  directionsVersionCache.set(cityId, version);
  return version;
}

function manifestCityFromRegistry(entry) {
  const countryId = CITY_COUNTRY[entry.id] ?? null;
  return {
    id: entry.id,
    displayName: entry.displayName,
    // contractVersion 1 backwards-compat (docs/multi-city-provider-design.md) — every
    // manifest entry is a live city, so this is always "live", but the field name is kept.
    status: "live",
    country: countryId ? { id: countryId, name: COUNTRY_NAMES[countryId] ?? countryId } : null,
    timeZone: entry.timeZone,
    bounds: CITY_BOUNDS[entry.id] ?? null,
    modes: entry.modes,
    nearbyEligible: entry.nearbyEligible !== false,
    directionsVersion: directionsVersionFor(entry.id),
    ...(DARWIN_FEED_CITY_IDS.has(entry.id) ? { feed: "darwin" } : {}),
  };
}

/**
 * @param {object} [opts]
 * @param {object[]} [opts.extraCities] fixture-only extra manifest-shaped city entries
 *   (dev-server.js's `?fixture=` support only — see lib/fixtures.js's CITY_MANIFEST_FIXTURES;
 *   production never honours this).
 */
export function buildCityManifest({ extraCities = [] } = {}) {
  const liveEntries = CITIES.filter((city) => city.status === "live");
  const liveIds = new Set(liveEntries.map((city) => city.id));
  // Bounds order matters (see city-bounds.js) — walk CITY_BOUNDS's own key order first so
  // the client's rebuilt "first matching box wins" GPS hint keeps the same priority it had
  // when CITY_BOUNDS lived directly in public/city-session.js, then append any live city
  // that (unexpectedly) has no bounds entry at all.
  const boundsOrder = Object.keys(CITY_BOUNDS);
  const orderedIds = [
    ...boundsOrder.filter((id) => liveIds.has(id)),
    ...[...liveIds].filter((id) => !boundsOrder.includes(id)),
  ];
  const entryById = new Map(liveEntries.map((city) => [city.id, city]));

  const cities = orderedIds.map((id) => manifestCityFromRegistry(entryById.get(id))).concat(extraCities);

  const countryMap = new Map();
  for (const city of cities) {
    if (!city.country) continue;
    if (!countryMap.has(city.country.id)) {
      countryMap.set(city.country.id, { id: city.country.id, name: city.country.name, regions: [] });
    }
    countryMap.get(city.country.id).regions.push({
      id: city.id,
      name: city.displayName,
      timeZone: city.timeZone,
      ...(city.feed ? { feed: city.feed } : {}),
    });
  }
  for (const country of countryMap.values()) {
    // Region order within a country is alphabetical by displayName — the same order the
    // old client-side COUNTRIES table always used (see docs/jim-brief-registry-driven-client.md).
    country.regions.sort((a, b) => a.name.localeCompare(b.name));
  }
  const countryOrder = [...COUNTRY_ORDER, ...[...countryMap.keys()].filter((id) => !COUNTRY_ORDER.includes(id))];
  const countries = countryOrder.map((id) => countryMap.get(id)).filter(Boolean);

  return {
    contractVersion: CONTRACT_VERSION,
    cities,
    countries,
    docs: "docs/multi-city-provider-design.md",
  };
}
