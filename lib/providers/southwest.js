/**
 * Southwest (Devon/Cornwall) — National Rail slice. Adapter is structural;
 * city stays `planned` in registry.js (Tim's flip call).
 *
 * One agency, one mode: National Rail (Darwin/OpenLDBWS), reused from
 * lib/providers/uk-darwin.js with regionId "southwest" — same allow-list +
 * config pattern as every other UK National Rail region in this pipeline
 * (uk-west-midlands / uk-ellesmere-port / east-midlands / south-yorkshire /
 * north-east / west-of-england / south-wales / west-yorkshire /
 * rest-of-wales / rest-of-scotland / london-se-national-rail / glasgow /
 * edinburgh / solent / thames-valley / greater-manchester /
 * liverpool-city-region / greater-anglia). BLOCKED at the account level
 * (DARWIN_LDB_TOKEN not set) — same blocker as those regions, not a feed
 * problem. Do not wire the token here; that's Tim's RDM re-registration.
 *
 * Same "no static GTFS at all" gap as West of England / London & South East
 * National Rail — National Rail Enquiries does not publish static GTFS
 * anywhere, so this region is genuinely Darwin-or-nothing until
 * DARWIN_LDB_TOKEN exists. Do not fabricate a schedule-only fallback;
 * fetchNationalRailBoard() below throws MissingDarwinTokenError, same as it
 * does everywhere else in this wave.
 *
 * Hub lock: Exeter St Davids (EXD). Secondary hub: Plymouth (PLY).
 * Terminus: Penzance (PNZ). No doNotGroup at any of the three —
 * single-layer, GWR-dominated, platforms distinguished by route not
 * operator (docs/southwest-d1/hazard-pack.md H1/H4/H6) — same simple hub
 * structure as West of England's Bristol Temple Meads/Bath Spa pair,
 * extended with a terminus node for Penzance.
 *
 * Taunton (TAU) is a through-running-only boundary station toward West of
 * England — not a merge point. Already documented from the West of England
 * side (docs/west-of-england-d1/published-network.json); this pack's own
 * report independently reaches the same non-merge conclusion — no
 * contradiction. D2 de-dup concern once both regions ship live, not built
 * here. Newton Abbot (NTA), Totnes (TOT), Truro (TRU), St Austell (SAU),
 * St Erth (SER) are further through-running/intermediate stations with no
 * boundary implication.
 *
 * CRS codes live-verified against Darwin 5 Sep 2026 (see
 * docs/jim-brief-uk-crs-sweep-2.md) — Newton Abbot and Totnes were corrected
 * from the originally-catalogued NAB (HTTP error) and TON (resolves to
 * Tonbridge in Kent).
 *
 * NIGHT RIVIERA SLEEPER — out-reservation, excluded per-station, not
 * city-wide. Per docs/board-eligibility-rule.md, Night Riviera Sleeper
 * carries verdict `out-reservation` (compulsory sleeping-car cabin
 * reservation, cannot be booked online, must be reserved at station or via
 * GWR telesales — walk-up boarding is not available) and must be excluded
 * from the board at the six stations it calls within this catalog: Exeter
 * St Davids, Plymouth, Truro, St Austell, St Erth, and Penzance (terminus).
 * Consistent with the same service's out-reservation verdict at Paddington
 * in docs/london-se-national-rail-d1/published-network.json. GWR and
 * CrossCountry verdict `in` at every station they call — no operator-level
 * filtering applied to them.
 *
 * This is enforced in code, not just documented: uk-darwin.js's
 * parseServiceBlock extracts each service's Darwin <operator> tag (carried
 * through as trip.operator) and fetchStationBoard() accepts an
 * excludeOperators option that filters matching trips out of the board
 * before it's returned. This adapter passes
 * excludeOperators: ["Night Riviera Sleeper"] only for the six affected
 * stations — same mechanism as Rest of Scotland's Caledonian Sleeper
 * exclusion (lib/providers/rest-of-scotland.js). Unverified against a live
 * Darwin payload (DARWIN_LDB_TOKEN is unset) — the operator-name match is a
 * case-insensitive substring test against whatever string Darwin's
 * <operator> tag actually returns for Night Riviera Sleeper services;
 * confirm this string once the feed is unblocked (see
 * docs/southwest-d1/hazard-pack.md Board eligibility table).
 *
 * Direction model: destination + operator (e.g. "London Paddington (GWR)",
 * "Nottingham (CrossCountry)"), matching how National Rail departure boards
 * actually present and identical in shape to the West of England / East
 * Midlands / London & South East National Rail recommendations. No
 * line+terminus model — GWR does not brand this corridor with rider-facing
 * "line" identifiers a direction model could key off (Cornish Main
 * Line/Riviera Line are geographic branch labels in the station table, not
 * boardable direction names). Illustrative only, not verified — no
 * destination strings can be confirmed until DARWIN_LDB_TOKEN exists and a
 * real Darwin payload can be pulled. See
 * docs/southwest-d1/direction-model-memo.md.
 */

import {
  listCatalogStations as listRegionCatalogStations,
  listRailStations,
  resolveRailEntry,
  getNotInRegion,
} from "./uk/catalog.js";
import { fetchStationBoard as fetchDarwinStationBoard, MissingDarwinTokenError } from "./uk-darwin.js";

export const SOUTHWEST_TIME_ZONE = "Europe/London";
export const SOUTHWEST_REGION = "southwest";
export const SOUTHWEST_HUB = "Exeter St Davids";
export const SOUTHWEST_SECONDARY_HUB = "Plymouth";
export const SOUTHWEST_TERMINUS = "Penzance";

/** Night Riviera Sleeper operator-name token, matched case-insensitively against Darwin's <operator>. */
const NIGHT_RIVIERA_SLEEPER_OPERATOR = "Night Riviera Sleeper";

/**
 * Stations where Night Riviera Sleeper is excluded from the board
 * (out-reservation, per docs/board-eligibility-rule.md) — per-station, not
 * city-wide.
 */
const NIGHT_RIVIERA_SLEEPER_EXCLUDED_STATIONS = new Set(["EXD", "PLY", "TRU", "SAU", "SER", "PNZ"]);

/**
 * @param {string} stationIdOrName
 */
export function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }
  return resolveRailEntry(raw, SOUTHWEST_REGION);
}

export function listCatalogStations() {
  return listRegionCatalogStations(SOUTHWEST_REGION, { mode: "train" });
}

export function listNationalRailStations() {
  return listRailStations(SOUTHWEST_REGION);
}

/** True when Night Riviera Sleeper must be excluded from this station's board. */
export function excludesNightRivieraSleeper(stationIdOrName) {
  const entry = resolveCatalogEntry(stationIdOrName);
  if (!entry?.crs) {
    return false;
  }
  return NIGHT_RIVIERA_SLEEPER_EXCLUDED_STATIONS.has(entry.crs);
}

/**
 * National Rail board — reuses uk-darwin.js verbatim (allow-list + config
 * over the shared Darwin provider, not a fork), plus the shared
 * excludeOperators filter for Night Riviera Sleeper at the six stations it
 * calls. Throws MissingDarwinTokenError until DARWIN_LDB_TOKEN exists.
 * @param {string} stationIdOrName CRS code or catalog name
 */
export async function fetchNationalRailBoard(stationIdOrName) {
  const excludeOperators = excludesNightRivieraSleeper(stationIdOrName)
    ? [NIGHT_RIVIERA_SLEEPER_OPERATOR]
    : undefined;
  return fetchDarwinStationBoard(stationIdOrName, {
    regionId: SOUTHWEST_REGION,
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
  const rail = resolveRailEntry(stationIdOrName, SOUTHWEST_REGION);
  if (!rail) {
    throw new Error(`Unknown Southwest station: ${stationIdOrName}`);
  }
  return fetchNationalRailBoard(stationIdOrName);
}

export { MissingDarwinTokenError };
export { getNotInRegion };
