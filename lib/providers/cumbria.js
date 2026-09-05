/**
 * Cumbria — National Rail (Carlisle / Lake District) slice. Adapter is
 * structural; city stays `planned` in registry.js (Tim's flip call).
 *
 * One agency family, one mode: National Rail (Darwin/OpenLDBWS), reused from
 * lib/providers/uk-darwin.js with regionId "cumbria" — same allow-list +
 * config pattern as every other UK National Rail region in this pipeline
 * (uk-west-midlands / east-midlands / rest-of-scotland / greater-manchester /
 * liverpool-city-region / etc). BLOCKED at the account level
 * (DARWIN_LDB_TOKEN not set) — same blocker as those regions, not a feed
 * problem. Do not wire the token here; that's Tim's RDM re-registration.
 *
 * SINGLE TIER-1 HUB LOCK PLUS TWO TIER-2 SECONDARY HUBS — the simplest UK
 * station-graph shape this wave (contrast Rest of Scotland's four co-equal
 * hubs, which had no ranking basis). Carlisle (CAR) is unambiguously the sole
 * tier-1 hub: 8 platforms, junction of four lines directly (West Coast Main
 * Line, Settle-Carlisle Line, Tyne Valley Line, Cumbrian Coast Line) plus a
 * fifth (Lakes Line) reachable via Oxenholme. Oxenholme Lake District (OXN)
 * and Barrow-in-Furness (BIF) are tier-2 secondary hubs, each a genuine
 * two-line junction. Penrith (PNR) is a major WCML station but not a
 * junction — built as a regional station, not promoted to hub. No
 * doNotGroup case anywhere in this catalog: every junction is a single
 * physical station, no separate infrastructure or walk-link pair (contrast
 * Liverpool City Region's Lime Street or Greater Manchester's
 * Piccadilly/Piccadilly Gardens). See docs/cumbria-d1/jim-handoff.md.
 *
 * CALEDONIAN SLEEPER — out-reservation, excluded per-station (Carlisle only).
 * Per docs/board-eligibility-rule.md, Caledonian Sleeper carries verdict
 * `out-reservation` (compulsory berth booking; the staff platform check-in
 * 60-90 min before departure is a reservation check, not a walk-up check-in
 * barrier) and must be excluded from the board at Carlisle, the only
 * Cumbrian station it calls (crew/supply change stop). It does not call at
 * Oxenholme, Barrow-in-Furness, Penrith, Windermere, Kendal, or Settle, so no
 * exclusion is needed (or applied) there. Northern Trains, TransPennine
 * Express, and Avanti West Coast all verdict `in` at every station they
 * call. CrossCountry's Cumbrian calling pattern is unconfirmed (report flags
 * this itself) — not added to any station's operator list.
 *
 * This is enforced in code, not just documented: uk-darwin.js's
 * parseServiceBlock extracts each service's Darwin `<operator>` tag (carried
 * through as `trip.operator`) and fetchStationBoard() accepts an
 * `excludeOperators` option that filters matching trips out of the board
 * before it's returned. This adapter passes `excludeOperators: ["Caledonian
 * Sleeper"]` only for Carlisle. Unverified against a live Darwin payload
 * (DARWIN_LDB_TOKEN is unset) — the operator-name match is a case-insensitive
 * substring test against whatever string Darwin's `<operator>` tag actually
 * returns for Caledonian Sleeper services; confirm this string once the feed
 * is unblocked.
 *
 * Regional boundaries: checked against already-merged adjacent packs
 * (Rest of Scotland, Greater Manchester) — no live overlap found at
 * Lockerbie/Preston/Wigan/Settle today. Remains an open D2 item if either
 * adjacent region's scope changes. See docs/cumbria-d1/jim-handoff.md.
 *
 * Station coverage: only 7 of the report's claimed 48 Cumbrian stations are
 * catalogued (Carlisle, Penrith, Oxenholme Lake District, Windermere,
 * Kendal, Barrow-in-Furness, Settle) — the report's own aggregate count for
 * the remainder is internally inconsistent (38 vs. 41). Do not extend this
 * catalog by inventing CRS codes or names for the other ~41 stations; that
 * needs a corrected/complete station list from Nico or a verified
 * GTFS/Darwin pull, neither performed here. See
 * docs/cumbria-d1/jim-handoff.md open item 2.
 *
 * CRS codes for all 7 catalogued stations were live-verified against Darwin 5 Sep 2026
 * (see docs/jim-brief-uk-crs-sweep-2.md), correcting five originally-catalogued codes
 * that Darwin resolved to entirely different stations elsewhere in Great Britain: OXO ->
 * OXN, PEN -> PNR, WND -> WDM, KND -> KEN, SLF -> SET.
 *
 * Direction model: destination + operator (e.g. "Glasgow Central (Avanti
 * West Coast)", "Leeds (Northern Trains)"), matching every other UK National
 * Rail region's recommendation — no printed route/line map exists for
 * Darwin. Illustrative only, not verified against a live Darwin payload — do
 * not invent destination strings beyond what Darwin itself returns once
 * unblocked. See docs/cumbria-d1/direction-model-memo.md.
 */

import {
  listCatalogStations as listRegionCatalogStations,
  listRailStations,
  resolveRailEntry,
  getNotInRegion,
} from "./uk/catalog.js";
import { fetchStationBoard as fetchDarwinStationBoard, MissingDarwinTokenError } from "./uk-darwin.js";

export const CUMBRIA_TIME_ZONE = "Europe/London";
export const CUMBRIA_REGION = "cumbria";
/** Sole tier-1 hub lock. */
export const CUMBRIA_HUB = "Carlisle";
/** Tier-2 secondary hubs — genuine junctions, ranked below the tier-1 hub. */
export const CUMBRIA_SECONDARY_HUBS = ["Oxenholme Lake District", "Barrow-in-Furness"];

/** Caledonian Sleeper operator-name token, matched case-insensitively against Darwin's <operator>. */
const CALEDONIAN_SLEEPER_OPERATOR = "Caledonian Sleeper";

/**
 * Stations where Caledonian Sleeper is excluded from the board (out-reservation,
 * per docs/board-eligibility-rule.md) — Carlisle only within this catalog.
 */
const CALEDONIAN_SLEEPER_EXCLUDED_STATIONS = new Set(["CAR"]);

/**
 * @param {string} stationIdOrName
 */
export function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }
  return resolveRailEntry(raw, CUMBRIA_REGION);
}

export function listCatalogStations() {
  return listRegionCatalogStations(CUMBRIA_REGION, { mode: "train" });
}

export function listNationalRailStations() {
  return listRailStations(CUMBRIA_REGION);
}

/** True when Caledonian Sleeper must be excluded from this station's board. */
export function excludesCaledonianSleeper(stationIdOrName) {
  const entry = resolveCatalogEntry(stationIdOrName);
  if (!entry?.crs) {
    return false;
  }
  return CALEDONIAN_SLEEPER_EXCLUDED_STATIONS.has(entry.crs);
}

/**
 * National Rail board — reuses uk-darwin.js verbatim (allow-list + config
 * over the shared Darwin provider, not a fork), plus the shared
 * excludeOperators filter for Caledonian Sleeper at Carlisle. Throws
 * MissingDarwinTokenError until DARWIN_LDB_TOKEN exists.
 * @param {string} stationIdOrName CRS code or catalog name
 */
export async function fetchNationalRailBoard(stationIdOrName) {
  const excludeOperators = excludesCaledonianSleeper(stationIdOrName)
    ? [CALEDONIAN_SLEEPER_OPERATOR]
    : undefined;
  return fetchDarwinStationBoard(stationIdOrName, {
    regionId: CUMBRIA_REGION,
    excludeOperators,
  });
}

/**
 * Contract-shaped dispatcher — single agency/mode, so this is a thin pass
 * through to fetchNationalRailBoard(). Kept for parity with the other UK
 * adapters' fetchStationBoard(stationIdOrName) contract shape.
 * @param {string} stationIdOrName
 */
export async function fetchStationBoard(stationIdOrName) {
  const rail = resolveRailEntry(stationIdOrName, CUMBRIA_REGION);
  if (!rail) {
    throw new Error(`Unknown Cumbria station: ${stationIdOrName}`);
  }
  return fetchNationalRailBoard(stationIdOrName);
}

export { MissingDarwinTokenError };
export { getNotInRegion };
