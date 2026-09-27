/**
 * Looks up a single CITY_BOUNDS box (or array of boxes) for a city id.
 *
 * CITY_BOUNDS used to live in public/city-session.js (a classic, non-module
 * browser script that couldn't be imported from a Node QA gate) and this
 * helper regex-parsed it out of that file as plain text. As of
 * docs/jim-brief-registry-driven-client.md, CITY_BOUNDS is server-side data
 * (lib/cities/city-bounds.js) served to the client via /api/cities, so this
 * helper just re-exports the real module — no more text parsing.
 *
 * Used by non-UK planned-city gates (docs/jim-brief-us-flip-readiness.md) that need to
 * assert a catalog's own coordinates fall inside that city's CITY_BOUNDS box, mirroring
 * what qa/uk-catalog-coords-gate.mjs already does for UK regions via lib/providers/uk/catalog.js.
 */
import { CITY_BOUNDS } from "../../lib/cities/city-bounds.js";

/**
 * @param {string} cityId CITY_BOUNDS key, e.g. "boston"
 * @returns {{minLat:number,maxLat:number,minLng:number,maxLng:number}[]} one or more boxes
 */
export function cityBoundsFor(cityId) {
  const boxOrBoxes = CITY_BOUNDS[cityId];
  if (!boxOrBoxes) {
    throw new Error(`city-bounds-from-picker: no CITY_BOUNDS entry found for "${cityId}"`);
  }
  return Array.isArray(boxOrBoxes) ? boxOrBoxes : [boxOrBoxes];
}

export function inBounds(lat, lng, box) {
  return lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng;
}

export function inAnyBounds(lat, lng, boxes) {
  return boxes.some((box) => inBounds(lat, lng, box));
}
