/**
 * Server-side country -> region membership for the country-wide station
 * picker (docs/jim-brief-country-wide-station-picker.md).
 *
 * This is the same taxonomy as public/city-session.js's client-side
 * `COUNTRIES` table (country ids, region ids) — kept as a small, separate
 * data file here because public/city-session.js is a classic (non-module)
 * browser script and can't be imported from api/ code. If a region moves
 * between countries there, mirror the change here too. Region *labels* come
 * from the registry's `displayName` (the single source of truth per the
 * brief), not duplicated in this file.
 */

/** @type {Record<string, string>} region/city id -> country id */
export const CITY_COUNTRY = {
  // Austria
  vienna: "at",
  // Australia
  perth: "au",
  sydney: "au",
  brisbane: "au",
  adelaide: "au",
  canberra: "au",
  "gold-coast": "au",
  newcastle: "au",
  melbourne: "au",
  // Belgium
  brussels: "be",
  // Denmark
  copenhagen: "dk",
  // England
  cumbria: "gb-eng",
  "greater-anglia": "gb-eng",
  "east-midlands": "gb-eng",
  "liverpool-city-region": "gb-eng",
  "uk-london-tfl": "gb-eng",
  "london-se-national-rail": "gb-eng",
  "greater-manchester": "gb-eng",
  "north-east": "gb-eng",
  "rest-of-england": "gb-eng",
  solent: "gb-eng",
  southwest: "gb-eng",
  "south-yorkshire": "gb-eng",
  "thames-valley": "gb-eng",
  "uk-west-midlands": "gb-eng",
  "west-of-england": "gb-eng",
  "west-yorkshire": "gb-eng",
  // Finland
  helsinki: "fi",
  // Hong Kong
  "hong-kong": "hk",
  // Ireland — Dublin is still "planned" and not in the picker at all (no
  // "Coming Soon" row, docs/jim-brief-no-coming-soon-picker.md, 27 Sep 2026);
  // it'll get an entry here in its own flip commit.
  // Norway
  oslo: "no",
  // Scotland
  "rest-of-scotland": "gb-sct",
  edinburgh: "gb-sct",
  glasgow: "gb-sct",
  // Sweden
  goteborg: "se",
  malmo: "se",
  stockholm: "se",
  uppsala: "se",
  // United States — bart/chicago are key-blocked and not in the picker at
  // all (no "Coming Soon" row, docs/jim-brief-no-coming-soon-picker.md,
  // 27 Sep 2026); they'll get an entry here in their own flip commit.
  boston: "us",
  washington: "us",
  // Wales
  "rest-of-wales": "gb-wls",
  "south-wales": "gb-wls",
};

export const COUNTRY_NAMES = {
  at: "Austria",
  au: "Australia",
  be: "Belgium",
  dk: "Denmark",
  "gb-eng": "England",
  fi: "Finland",
  hk: "Hong Kong",
  no: "Norway",
  "gb-sct": "Scotland",
  se: "Sweden",
  us: "United States",
  "gb-wls": "Wales",
};

export const COUNTRY_IDS = Object.keys(COUNTRY_NAMES);

/**
 * Country display order for the picker (public/city-session.js's old COUNTRIES table,
 * moved server-side per docs/jim-brief-registry-driven-client.md). Not alphabetical
 * throughout — this is the order the picker has always shown, preserved verbatim rather
 * than "fixed" as part of this move. Region order *within* a country is derived instead
 * (alphabetical by the registry's displayName), since that's what the old table's region
 * arrays already were in every country.
 */
export const COUNTRY_ORDER = ["au", "at", "be", "gb-eng", "dk", "fi", "hk", "no", "gb-sct", "se", "us", "gb-wls"];

/**
 * Region/city ids that carry National Rail Darwin data alongside (or instead of) another
 * feed — mirrors the picker's old per-region `feed: "darwin"` flag. Used by
 * public/city-session.js's isDarwinCityId() for the co-location tie rule in
 * hintCityFromNearestStation().
 */
export const DARWIN_FEED_CITY_IDS = new Set([
  "cumbria",
  "greater-anglia",
  "east-midlands",
  "liverpool-city-region",
  "london-se-national-rail",
  "greater-manchester",
  "north-east",
  "rest-of-england",
  "solent",
  "southwest",
  "south-yorkshire",
  "thames-valley",
  "uk-west-midlands",
  "west-of-england",
  "west-yorkshire",
  "rest-of-scotland",
  "edinburgh",
  "glasgow",
  "rest-of-wales",
  "south-wales",
]);

export function isKnownCountry(countryId) {
  return COUNTRY_IDS.includes(String(countryId || "").trim().toLowerCase());
}

/** Region/city ids belonging to a country, in registry order. */
export function regionIdsForCountry(countryId) {
  const id = String(countryId || "").trim().toLowerCase();
  return Object.entries(CITY_COUNTRY)
    .filter(([, country]) => country === id)
    .map(([cityId]) => cityId);
}
