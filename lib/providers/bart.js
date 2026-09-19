/**
 * BART (Bay Area Rapid Transit) — five color heavy-rail lines (Yellow/Blue/Green/Red/Orange)
 * plus OAK Airport, via the BART Legacy API's real-time ETD endpoint. Adapter ready; city
 * remains `planned` (not live) — see docs/bart-d1/jim-handoff.md.
 * assertCityLive("bart") must still fail until Tim flips the registry entry.
 *
 * LIVE BOARDS ONLY — no static-GTFS/schedule fallback. Tim's rule for this city (per the
 * dispatch brief): no live times, no board; never a silent timetable fallback. Every other
 * planned-city adapter in this codebase (Boston, Auckland, Sydney, Copenhagen, ...) degrades to
 * a GTFS-static schedule-only board when its live key/feed isn't wired; this one deliberately
 * does not — fetchStationBoard() throws MissingBartApiKeyError (lib/providers/gtfs/auth.js)
 * whenever BART_API_KEY is unset, and throws on any ETD fetch/parse failure, rather than
 * returning an empty or synthetic board. Do not add a static-GTFS path here to "improve"
 * coverage — that would violate the D1 pack's live-boards-only instruction.
 *
 * Endpoint: GET https://api.bart.gov/api/etd.aspx?cmd=etd&orig={ABBR}&key={BART_API_KEY}&json=y
 * Docs: https://api.bart.gov/docs/etd/etd.aspx . Never write a key (including BART's published
 * public no-registration key) into a repo file — BART_API_KEY comes from the environment only.
 *
 * v1 scope (docs/bart-d1/hazard-pack.md, direction-model-memo.md, oracle-clash-report.md):
 * BART only — Yellow/Blue/Green/Red/Orange plus OAK Airport (50 unique passenger stops, per
 * the official detailed system map). No Muni Metro, no Muni bus, no Caltrain, no ACE, no
 * Capitol Corridor, no SMART, no ferry, no VTA.
 *
 * Hub lock: Embarcadero (first downtown SF stop after the Transbay Tube; Yellow/Blue/Green/Red
 * through-run both ways, Orange never arrives) — never a direction token. doNotGroup, per
 * hazard-pack.md H1/H2/H4/H6: Montgomery St, Powell St (the Muni/cable-car-famous stop — NOT
 * the lock), Civic Center/UN Plaza, 12th St/Oakland City Center, 19th St/Oakland, West Oakland,
 * Lake Merritt, Dublin/Pleasanton vs West Dublin/Pleasanton, Pittsburg/Bay Point vs Pittsburg
 * Center, San Francisco International Airport (SFO) vs Oakland International Airport (OAK).
 *
 * OAK Airport connector has NO real-time ETD (confirmed in the D1 pack — OAK has no ETD color
 * token, no PDF timetable; hazard-pack.md H3/H5, published-network.json liveBoards). Per the
 * pack's verdict, OAK stays in the catalog/line model (the official map legend lists it as a
 * BART line) but Oakland International Airport (OAK) — the only station solely on that line —
 * throws FeedUnconfirmedError (lib/providers/contract.js) rather than ever returning a board;
 * Coliseum (also Orange/Blue/Green) still boards normally from ETD, simply without any OAK rows
 * since BART's own ETD feed never reports them.
 *
 * Station abbreviations (BART's stable 4-letter codes, e.g. EMBR/RICH/DALY) are recorded in
 * lib/cities/bart/stations.json from public BART documentation — NOT extracted from a live ETD
 * payload (no BART_API_KEY was available at D2; see the file header note on each caveat below).
 * ETD `destination` strings and exact `color` tokens are similarly unverified against a real
 * payload — resolveTerminus() (lib/cities/bart/marketing-directions.js) is deliberately
 * conservative (exact match, then unambiguous substring match against that line's small
 * termini set) so an unexpected live string degrades to a bare line label instead of a wrong
 * or fabricated terminus. Confirm both against a real response once BART_API_KEY is set.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readBartApiKey, MissingBartApiKeyError } from "./gtfs/auth.js";
import { FeedUnconfirmedError } from "./contract.js";
import {
  BART_ETD_COLOR_TO_LINE,
  BART_HUB,
  BART_TIME_ZONE,
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  LINE_LABELS,
  LINE_TERMINI,
  mapLineTerminusDestination,
} from "../cities/bart/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export {
  BART_HUB,
  BART_TIME_ZONE,
  LINE_LABELS,
  LINE_TERMINI,
  BART_ETD_COLOR_TO_LINE,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  MissingBartApiKeyError,
};

export const BART_ETD_URL = "https://api.bart.gov/api/etd.aspx";

const catalogPath = join(__dirname, "../cities/bart/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

export function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw || isForbiddenCollapseName(raw)) {
    return null;
  }
  const needle = foldKey(raw);
  for (const entry of stationCatalog.stations ?? []) {
    if (foldKey(entry.name) === needle) {
      return entry;
    }
    for (const alias of entry.aliases ?? []) {
      if (foldKey(alias) === needle) {
        return entry;
      }
    }
    if (entry.abbr && foldKey(entry.abbr) === needle) {
      return entry;
    }
  }
  return null;
}

/** Builds the ETD request URL for a station abbreviation. Exported for tests — never call the
 * live endpoint from a QA gate; this pack's key is not verified against a real payload. */
export function buildEtdUrl(stationAbbr, apiKey) {
  const url = new URL(BART_ETD_URL);
  url.searchParams.set("cmd", "etd");
  url.searchParams.set("orig", stationAbbr);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("json", "y");
  return url.toString();
}

async function fetchEtdJson(stationAbbr, apiKey) {
  const response = await fetch(buildEtdUrl(stationAbbr, apiKey));
  if (!response.ok) {
    throw new Error(`BART ETD request failed for ${stationAbbr}: HTTP ${response.status}`);
  }
  const body = await response.json();
  const root = body?.root;
  if (!root) {
    throw new Error(`BART ETD response for ${stationAbbr} had no root payload`);
  }
  return root;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatClock(date, timeZone) {
  return date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  });
}

/** Minutes value from an ETD estimate: a non-negative integer string, or "Leaving" for <1 min. */
export function parseEtdMinutes(minutesRaw) {
  const trimmed = String(minutesRaw ?? "").trim();
  if (/^leaving$/i.test(trimmed)) {
    return 0;
  }
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Normalizes one BART ETD `root.station[0].etd[].estimate[]` entry (plus its parent `etd.
 * destination`) into a ProviderTrip. `now` is injectable for tests.
 */
export function mapEtdEstimateToTrip(destinationRaw, estimate, now = new Date()) {
  const color = String(estimate?.color ?? "").toUpperCase();
  const lineId = BART_ETD_COLOR_TO_LINE[color] ?? null;
  const minutes = parseEtdMinutes(estimate?.minutes);
  const liveDeparture = new Date(now.getTime() + minutes * 60_000);
  const displayTime = formatClock(liveDeparture, BART_TIME_ZONE);

  return {
    liveDeparture: liveDeparture.toISOString(),
    scheduledDeparture: liveDeparture.toISOString(),
    displayTime,
    scheduledDisplayTime: displayTime,
    platform: estimate?.platform != null ? String(estimate.platform) : undefined,
    destination: lineId ? mapLineTerminusDestination(destinationRaw, lineId) : String(destinationRaw ?? ""),
    lineId,
    cancelled: String(estimate?.cancelflag ?? "0") === "1",
  };
}

/**
 * Flattens `root.station[0].etd[]` (grouped by destination) into ProviderTrips, dropping any
 * estimate whose `color` isn't one of the five known BART lines (BART_ETD_COLOR_TO_LINE) —
 * belt-and-braces against an unexpected/OAK color token ever reaching a rider.
 */
export function tripsFromEtdRoot(root, now = new Date()) {
  const stationNode = Array.isArray(root?.station) ? root.station[0] : root?.station;
  const etds = Array.isArray(stationNode?.etd) ? stationNode.etd : [];
  const trips = [];
  for (const etd of etds) {
    const estimates = Array.isArray(etd?.estimate) ? etd.estimate : [];
    for (const estimate of estimates) {
      const trip = mapEtdEstimateToTrip(etd?.destination, estimate, now);
      if (trip.lineId) {
        trips.push(trip);
      }
    }
  }
  return trips;
}

/**
 * @param {string} stationIdOrName Catalog name, documented alias, or BART 4-letter abbreviation
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  if (!catalogEntry) {
    throw new Error(`Unknown BART station: ${stationIdOrName}`);
  }

  if (catalogEntry.noEtd) {
    throw new FeedUnconfirmedError({
      agency: "BART to OAK",
      station: catalogEntry.name,
      alternative: "Take BART to Coliseum and transfer to the BART to OAK connector.",
      detail:
        "Oakland International Airport (OAK) is served only by the BART to OAK automated " +
        "people-mover, which has no real-time ETD and no published timetable " +
        "(docs/bart-d1/hazard-pack.md H3/H5). Never a silent schedule fallback here.",
      name: "BartOakFeedUnconfirmedError",
    });
  }

  const apiKey = options.apiKey ?? readBartApiKey();
  if (!apiKey) {
    throw new MissingBartApiKeyError();
  }

  const root = await fetchEtdJson(catalogEntry.abbr, apiKey);
  const trips = tripsFromEtdRoot(root, options.now);

  return {
    stationName: catalogEntry.name,
    lastUpdate: new Date().toISOString(),
    trips,
    realtime: "live",
  };
}
