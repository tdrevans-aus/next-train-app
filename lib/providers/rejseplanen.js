/**
 * Rejseplanen — shared Danish national platform (25+ operators, one GTFS feed). Per
 * docs/denmark-ledger.md's provider decision, Danish regions (Copenhagen today, Aarhus later
 * per docs/copenhagen-d1) are built as *configs* (allow-list + direction model) over this one
 * shared provider — the UK/Darwin pattern (lib/providers/uk-darwin.js + region configs like
 * lib/providers/cumbria.js), not a per-city clone (the opposite of Sweden/Finland's per-city
 * adapters). Do not fork this file per region; add a new `lib/providers/<region>.js` config
 * instead, same shape as lib/providers/copenhagen.js.
 *
 * Static GTFS (no key required, confirmed by docs/copenhagen-d1/oracle-clash-report.md,
 * 30 Aug 2026): https://www.rejseplanen.info/labs/GTFS.zip — updated ~every 14 days,
 * CC BY 4.0 (attribution required, redistribution/commercial use permitted).
 *
 * Real-time (NOT wired here — key registration required, and per this task's explicit
 * instruction Jim does not sign up for anything): Rejseplanen API 2.0 `departureBoard`
 * (https://api.rejseplanen.dk/api/2.0/departureBoard) requires a key registered at
 * labs.rejseplanen.dk (free tier, 50,000 calls/month, non-commercial). SIRI-ET via the
 * Dataudveksleren NAP is an alternative path, also requiring registration. Both are D2+ work
 * once a key exists — see MissingRejseplanenApiKeyError below, which any future live-path
 * function should throw rather than silently degrading. Until then every Copenhagen board is
 * schedule-only (static GTFS), same posture as lib/providers/brussels.js before its live JSON
 * path was confirmed.
 *
 * This feed has NO confirmed exact route_type/agency_id values for Metro vs S-tog vs DSB vs
 * Öresundståg (docs/copenhagen-d1/hazard-pack.md items 5-6 — "verify against the live feed at
 * D2", not settled here) — filtering in lib/providers/copenhagen.js therefore relies on
 * route_short_name allow-lists (Metro, S-tog — both have real passenger-facing line codes)
 * plus route_long_name/route_desc pattern heuristics (DSB/Öresundståg, which have none). Both
 * are documented as unverified against a live payload; confirm before any live flip.
 */

import { loadGtfsStatic, findRailStopIdsForName } from "./gtfs/static-cache.js";

export const REJSEPLANEN_GTFS_STATIC_URL = "https://www.rejseplanen.info/labs/GTFS.zip";
export const REJSEPLANEN_TIME_ZONE = "Europe/Copenhagen";

/**
 * Thrown by any future real-time (API 2.0 departureBoard / SIRI-ET) path once one is wired.
 * Not currently thrown by anything in this file — static GTFS needs no key — but exported now
 * so D2 real-time work has one documented error shape to throw, matching the
 * MissingDarwinTokenError / MissingProviderApiKeyError precedent used by other adapters.
 */
export class MissingRejseplanenApiKeyError extends Error {
  constructor() {
    super(
      "REJSEPLANEN_API_KEY is not set — register a free-tier key at https://labs.rejseplanen.dk before wiring the API 2.0 departureBoard or SIRI-ET real-time path."
    );
    this.name = "MissingRejseplanenApiKeyError";
    this.envName = "REJSEPLANEN_API_KEY";
  }
}

/**
 * Loads the full national static GTFS, filtered to the given route_type/route_short_name/
 * agency options (see lib/providers/gtfs/static-cache.js loadGtfsStatic). Cached in-process
 * by URL + filter options, same as every other GTFS-static adapter in this repo.
 * @param {{ routeTypes?: string[], includeRouteShortNames?: string[], agencyIds?: string[] }} [options]
 */
export async function loadRejseplanenStatic(options = {}) {
  return loadGtfsStatic({
    url: REJSEPLANEN_GTFS_STATIC_URL,
    routeTypes: options.routeTypes ?? null,
    includeRouteShortNames: options.includeRouteShortNames ?? null,
    agencyIds: options.agencyIds ?? null,
    timeZone: REJSEPLANEN_TIME_ZONE,
    ifModifiedSince: true,
  });
}

/**
 * Resolve GTFS stop_ids for a printed station name against the already-loaded national
 * static feed. Runtime name lookup rather than baked-in stopIds, since no stopIds are in the
 * D1 pack (docs/copenhagen-d1/published-network.json says so explicitly, repeatedly).
 * @param {object} staticData
 * @param {string} name
 */
export function resolveRejseplanenStopIds(staticData, name) {
  return findRailStopIdsForName(staticData, name);
}

export { findRailStopIdsForName };
