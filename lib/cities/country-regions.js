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
  // Australia
  perth: "au",
  sydney: "au",
  brisbane: "au",
  adelaide: "au",
  canberra: "au",
  "gold-coast": "au",
  newcastle: "au",
  melbourne: "au",
  // Belgium (planned/Coming Soon, same precedent as Melbourne above —
  // api/country-stations.js skips any non-live entry, docs/jim-brief-
  // brussels-flip-readiness.md)
  brussels: "be",
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
  // Wales
  "rest-of-wales": "gb-wls",
  "south-wales": "gb-wls",
};

export const COUNTRY_NAMES = {
  au: "Australia",
  be: "Belgium",
  "gb-eng": "England",
  fi: "Finland",
  no: "Norway",
  "gb-sct": "Scotland",
  se: "Sweden",
  "gb-wls": "Wales",
};

export const COUNTRY_IDS = Object.keys(COUNTRY_NAMES);

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
