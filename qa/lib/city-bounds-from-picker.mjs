/**
 * Reads a single CITY_BOUNDS box (or array of boxes) out of public/city-session.js by
 * regex, the same offline-parse approach live-city-lists-sync.mjs and
 * country-regions-sync-gate.mjs already use for that file's other tables —
 * public/city-session.js is a classic (non-module) browser script and can't be
 * imported from a Node QA gate.
 *
 * Used by non-UK planned-city gates (docs/jim-brief-us-flip-readiness.md) that need to
 * assert a catalog's own coordinates fall inside that city's CITY_BOUNDS box, mirroring
 * what qa/uk-catalog-coords-gate.mjs already does for UK regions via lib/providers/uk/catalog.js.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function parseBox(text) {
  const num = (key) => {
    const m = text.match(new RegExp(`${key}:\\s*(-?[0-9.]+)`));
    if (!m) throw new Error(`city-bounds-from-picker: missing ${key} in box text "${text}"`);
    return Number(m[1]);
  };
  return { minLat: num("minLat"), maxLat: num("maxLat"), minLng: num("minLng"), maxLng: num("maxLng") };
}

/**
 * @param {string} cityId CITY_BOUNDS key, e.g. "boston"
 * @returns {{minLat:number,maxLat:number,minLng:number,maxLng:number}[]} one or more boxes
 */
export function cityBoundsFor(cityId) {
  const src = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
  const key = JSON.stringify(cityId).slice(1, -1);
  // Single-box form: `id: { minLat: ..., ... },`
  const singleRe = new RegExp(`(?:^|\\s)(?:"${key}"|${key}):\\s*\\{([^}]*)\\}`, "m");
  const single = src.match(singleRe);
  if (single) return [parseBox(single[1])];
  // Array-of-boxes form: `id: [ { ... }, { ... } ],`
  const arrayRe = new RegExp(`(?:^|\\s)(?:"${key}"|${key}):\\s*\\[([\\s\\S]*?)\\]\\s*,`, "m");
  const arr = src.match(arrayRe);
  if (arr) {
    const boxes = [];
    const boxRe = /\{([^}]*)\}/g;
    let m;
    while ((m = boxRe.exec(arr[1]))) boxes.push(parseBox(m[1]));
    if (boxes.length > 0) return boxes;
  }
  throw new Error(`city-bounds-from-picker: no CITY_BOUNDS entry found for "${cityId}"`);
}

export function inBounds(lat, lng, box) {
  return lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng;
}

export function inAnyBounds(lat, lng, boxes) {
  return boxes.some((box) => inBounds(lat, lng, box));
}
