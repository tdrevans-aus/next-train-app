/**
 * National GB rail name -> CRS index (FB-51).
 *
 * Generated file: lib/cities/uk/rail-crs-index.json, built by
 * scripts/build-uk-rail-crs-index.mjs from NaPTAN's RailReferences.csv (via
 * scripts/lib/uk-naptan.mjs's fetchRailReferencesCsv()) plus a small alias
 * table for how Darwin actually prints some termini. Regenerate with:
 *
 *   node scripts/build-uk-rail-crs-index.mjs
 *
 * Used by lib/cities/uk/direction-hubs.js's planUkNextTrainFetch() as the
 * fallback for the exact-chip path when a printed destination doesn't
 * resolve in the calling region's own catalog (e.g. "London St Pancras
 * (Intl)" from a East Midlands station) — never guesses; an unresolved name
 * returns null and the caller falls back to the undirected path.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = join(MODULE_DIR, "rail-crs-index.json");

/** @type {{ generatedAt: string, entries: Record<string, string> } | null} */
let cached = null;

function load() {
  if (!cached) {
    cached = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  }
  return cached;
}

/**
 * Same normalisation chipDestinationPart() output goes through before
 * lookup: case-fold, drop punctuation, collapse whitespace. Applied both at
 * generation time (scripts/build-uk-rail-crs-index.mjs) and at lookup time
 * so the two never drift.
 * @param {string} name
 */
export function normalizeStationName(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Resolves a printed station name to a CRS code via the national index, or
 * null if it isn't found — never guesses.
 * @param {string} name
 */
export function resolveCrsForName(name) {
  const index = load();
  const key = normalizeStationName(name);
  if (!key) {
    return null;
  }
  return index.entries?.[key] ?? null;
}

/** Number of entries in the loaded index (QA sanity check). */
export function railCrsIndexSize() {
  return Object.keys(load().entries ?? {}).length;
}

/** The recorded generation date (QA/PR reporting). */
export function railCrsIndexGeneratedAt() {
  return load().generatedAt ?? null;
}
