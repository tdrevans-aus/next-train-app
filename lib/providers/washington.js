/**
 * Washington, D.C. Metrorail (WMATA) — six colour rapid-transit lines (Red, Orange, Blue,
 * Silver, Green, Yellow) via WMATA's Station Prediction ("Real-Time Rail Predictions") API.
 * Adapter ready; city remains `planned` (not live) — see docs/washington-d1/jim-handoff.md.
 * assertCityLive("washington") must still fail until Tim flips the registry entry.
 *
 * LIVE BOARDS ONLY — no static-GTFS/schedule fallback. Tim's rule for this city (same posture as
 * lib/providers/bart.js and lib/providers/chicago.js): no live times, no board; never a silent
 * timetable fallback. WMATA's own GTFS/GTFS-RT are portal-keyed too (developer.wmata.com), not a
 * free/keyless fallback, so there is no schedule-only degrade path here at all.
 * fetchStationBoard() throws MissingWmataApiKeyError (lib/providers/gtfs/auth.js) whenever
 * WMATA_API_KEY is unset, and propagates any WMATA fetch/parse failure rather than returning an
 * empty/synthetic board.
 *
 * Endpoints (https://developer.wmata.com/, header `api_key`):
 *   - GET https://api.wmata.com/Rail.svc/json/jStations — Rail Station Information (all
 *     stations: Code, Name, StationTogether1/2, Lat/Lon, LineCode1-4). Used at request time to
 *     resolve a catalog entry's WMATA StationCode(s) by name — never hardcoded (see
 *     resolveStationCodesForCatalogEntry below). Cached in-process for
 *     STATIONS_METADATA_CACHE_MS since this list changes rarely.
 *   - GET https://api.wmata.com/StationPrediction.svc/json/GetPrediction/{StationCodes} —
 *     Real-Time Rail Predictions ("Trains": [{Car, Destination, DestinationCode,
 *     DestinationName, Group, Line, LocationCode, LocationName, Min}]). {StationCodes} accepts
 *     a comma-separated list, which is how multi-level transfer stations (Metro Center A01+C01,
 *     Gallery Place-Chinatown B01+F01, L'Enfant Plaza D03+F03, Fort Totten B06+E06) get a single
 *     merged board from one request — one catalog station, both codes queried together, per the
 *     pack's hub lock and doNotGroup rules (never split into two catalog entries).
 * CTA_TRAIN_TRACKER_KEY-style env var here is WMATA_API_KEY — never write a key into a repo
 * file. WMATA_API_KEY was confirmed live against both endpoints on 20 Sep 2026 (docs/
 * washington-d1/jim-handoff.md "Live verification") — station codes are resolved by name match
 * against jStations rather than a hand-transcribed code table (documented station codes, e.g.
 * from the public DC GIS "Metro Stations Regional" dataset used to source
 * lib/cities/washington/stations.json's lat/lng, are NOT trusted for StationCodes — that dataset
 * has at least one known data-entry bug, Potomac Yard's TRAININFO_URL fragment duplicating
 * Huntington's C15 — so codes are always resolved live from WMATA's own jStations, never from
 * that dataset).
 *
 * `Min` field handling (confirmed against a real GetPrediction payload, 20 Sep 2026):
 *   - "ARR" (arriving) and "BRD" (boarding) are treated as an imminent departure (0 minutes) —
 *     both were seen live, kept.
 *   - "---", "", null, or any non-numeric value that isn't ARR/BRD means WMATA has no reliable
 *     prediction for that run — DROPPED, never presented as live (same never-fabricate posture
 *     Chicago applies to isSch/isFlt rows). A station whose only rows are unreliable simply
 *     returns an empty trip list, not a fabricated-looking live row. "---" was seen live (on a
 *     no-passenger row; a reliable "---" on a passenger line is documented by WMATA but wasn't
 *     captured live this pass — kept as a marked-synthetic QA fixture case).
 *   - A positive integer string is minutes-until-arrival (1–40 seen live), added to `now` (Date
 *     arithmetic is timezone-agnostic; DST is resolved correctly at *display* time via Intl
 *     formatting in WASHINGTON_TIME_ZONE, hazard-pack.md H7 — America/New_York HAS DST).
 * `Line` field handling: "No" (no-passenger/out-of-service train, confirmed live) and "--"
 * (unknown route, not seen live this pass) are DROPPED — no-passenger trains must never appear
 * on a rider-facing board. Any other value not in WMATA_LINE_CODE_TO_LINE
 * (lib/cities/washington/marketing-directions.js) is also dropped, belt-and-braces against an
 * unexpected route token ever reaching a rider. RD/BL/OR/SV/GR were all confirmed live 20 Sep
 * 2026; YL (Yellow) carried zero trains in that capture (an off-peak/single-snapshot gap, not
 * evidence of suspension) — see jim-handoff.md's open items.
 *
 * **DestinationName is not always the full canonical station name** — confirmed live 20 Sep
 * 2026: Red Line trains to Shady Grove were frequently sent as "Shady Grv", and New Carrollton
 * (Orange/Silver) as "NewCrlton"/"New Crlton". Neither is a substring of the canonical name, so
 * lib/cities/washington/marketing-directions.js's resolveTerminus() normalizes these known
 * abbreviations (WMATA_DESTINATION_ABBREVIATIONS) before matching — without it, most
 * Shady-Grove-bound Red trains would have silently lost their terminus chip. A genuine
 * short-turn (a real Blue Line train signed "Huntington", not one of Blue's two termini) was
 * also confirmed live and is handled correctly by the existing bare-line-label fallback — no fix
 * needed there.
 *
 * v1 scope (docs/washington-d1/hazard-pack.md, direction-model-memo.md, oracle-clash-report.md):
 * WMATA Metrorail only — 98 unique passenger-open stops across six lines. No Metrobus, no
 * Streetcar, no MARC, no VRE, no Amtrak.
 *
 * Hub lock: Metro Center (Red × Orange/Blue/Silver transfer, a through-cross not a single-end
 * hub) — never a direction token. doNotGroup/doNotCollapse per hazard-pack.md H1/H4/H6 and
 * lib/cities/washington/marketing-directions.js file header: Metro Center vs
 * Gallery Place-Chinatown, Farragut North vs Farragut West, Union Station/L'Enfant Plaza/New
 * Carrollton metro vs MARC/VRE/Amtrak (not wired here — see Board eligibility note below).
 *
 * Board eligibility (docs/washington-d1/oracle-clash-report.md "Board eligibility" section,
 * controller note 20 Sep 2026): MARC and VRE are ruled `in` at shared stations (Union Station,
 * Rockville, Silver Spring, New Carrollton, L'Enfant Plaza, Franconia-Springfield) but come from
 * feeds other than WMATA's API — they are NOT wired in this adapter and must not be faked. This
 * holds the flip pending either a second feed being wired or Tim's `out-product` sign-off (see
 * registry.js notes and jim-handoff.md addendum). All Amtrak rows, Northeast Regional included,
 * are `out-reservation` (all-reserved, no walk-up).
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readWmataApiKey, MissingWmataApiKeyError } from "./gtfs/auth.js";
import {
  WASHINGTON_HUB,
  WASHINGTON_TIME_ZONE,
  WMATA_LINE_CODE_TO_LINE,
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  LINE_LABELS,
  LINE_TERMINI,
  mapLineTerminusDestination,
  resolveCatalogEntry as resolveMarketingCatalogEntry,
} from "../cities/washington/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export {
  WASHINGTON_HUB,
  WASHINGTON_TIME_ZONE,
  WMATA_LINE_CODE_TO_LINE,
  LINE_LABELS,
  LINE_TERMINI,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  MissingWmataApiKeyError,
};

export const WMATA_API_BASE = "https://api.wmata.com";
export const WMATA_STATIONS_URL = `${WMATA_API_BASE}/Rail.svc/json/jStations`;
export const WMATA_PREDICTION_URL = `${WMATA_API_BASE}/StationPrediction.svc/json/GetPrediction`;

/** How long jStations metadata is cached in-process before a fresh fetch (rarely changes). */
export const STATIONS_METADATA_CACHE_MS = 24 * 60 * 60 * 1000;

const catalogPath = join(__dirname, "../cities/washington/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

/** Re-exported so callers/tests use one resolver (marketing-directions.js owns the data). */
export function resolveCatalogEntry(stationIdOrName) {
  return resolveMarketingCatalogEntry(stationIdOrName);
}

/**
 * Thrown when a catalogued station's WMATA StationCode(s) can't be confidently resolved from
 * jStations (zero qualifying candidates). Never guesses — same never-fabricate posture as
 * ChicagoStationMapIdUnconfirmedError and BART's FeedUnconfirmedError. Confirm against a real
 * WMATA payload at D3.
 */
export class WashingtonStationCodeUnconfirmedError extends Error {
  constructor(catalogEntry) {
    super(
      `Could not confidently resolve a WMATA StationCode for "${catalogEntry?.name}" from ` +
        "jStations — zero qualifying candidates found. NEEDS LIVE CONFIRMATION once " +
        "WMATA_API_KEY is available."
    );
    this.name = "WashingtonStationCodeUnconfirmedError";
  }
}

let stationsMetadataCache = null; // { data, fetchedAt }

/**
 * Fetches (and caches) WMATA's Rail Station Information list. `options.stationsData` is a test
 * seam — production callers never pass it. `options.now` controls cache-freshness checks in
 * tests.
 */
export async function getStationsMetadata(apiKey, options = {}) {
  if (options.stationsData) {
    return options.stationsData;
  }
  const now = options.now ?? new Date();
  if (
    stationsMetadataCache &&
    now.getTime() - stationsMetadataCache.fetchedAt.getTime() < STATIONS_METADATA_CACHE_MS
  ) {
    return stationsMetadataCache.data;
  }
  const response = await fetch(WMATA_STATIONS_URL, { headers: { api_key: apiKey } });
  if (!response.ok) {
    throw new Error(`WMATA Rail Station Information request failed: HTTP ${response.status}`);
  }
  const body = await response.json();
  const data = Array.isArray(body?.Stations) ? body.Stations : [];
  stationsMetadataCache = { data, fetchedAt: now };
  return data;
}

/** Test-only hook to reset the in-process jStations cache between test cases. */
export function resetStationsMetadataCacheForTests() {
  stationsMetadataCache = null;
}

/**
 * Resolve a catalog entry's WMATA StationCode(s) from jStations (Rail Station Information).
 * A row whose Name folds to the entry's printed name OR one of its documented aliases
 * (lib/cities/washington/stations.json aliases[], the D1-print vs WMATA-API-name rename
 * correspondence) is accepted; its StationTogether1/StationTogether2 fields (WMATA's own
 * multi-level-platform linkage) are also pulled in, so a hub/transfer station's second code is
 * discovered from WMATA's own data rather than a hardcoded pairing — this is what resolves
 * Metro Center to both A01 and C01, Gallery Place-Chinatown to B01+F01, etc. Zero candidates
 * throws rather than guessing. Exported for tests — never call the live endpoint from a QA gate.
 */
export function resolveStationCodesForCatalogEntry(stationsMetadata, catalogEntry) {
  const names = [catalogEntry?.name, ...(catalogEntry?.aliases ?? [])].map(foldKey);
  const matches = (stationsMetadata ?? []).filter((row) => names.includes(foldKey(row?.Name)));
  if (matches.length === 0) {
    throw new WashingtonStationCodeUnconfirmedError(catalogEntry);
  }
  const codes = new Set();
  for (const row of matches) {
    if (row?.Code) codes.add(String(row.Code));
    if (row?.StationTogether1) codes.add(String(row.StationTogether1));
    if (row?.StationTogether2) codes.add(String(row.StationTogether2));
  }
  return [...codes];
}

function formatClock(date, timeZone) {
  return date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  });
}

/** Builds the GetPrediction request URL for one or more comma-joined StationCodes. Exported for
 * tests — never call the live endpoint from a QA gate; use qa/fixtures/washington/predictions.json
 * (a real capture, 20 Sep 2026) instead. */
export function buildPredictionUrl(codes) {
  const joined = (Array.isArray(codes) ? codes : [codes]).join(",");
  return `${WMATA_PREDICTION_URL}/${encodeURIComponent(joined)}`;
}

async function fetchPredictionsJson(codes, apiKey) {
  const response = await fetch(buildPredictionUrl(codes), { headers: { api_key: apiKey } });
  if (!response.ok) {
    throw new Error(
      `WMATA Station Prediction request failed for ${codes.join(",")}: HTTP ${response.status}`
    );
  }
  const body = await response.json();
  return Array.isArray(body?.Trains) ? body.Trains : [];
}

/**
 * Parses WMATA's `Min` field into a whole number of minutes, or null when there is no reliable
 * live prediction (see file header — "---"/""/null/non-numeric-non-ARR/BRD are dropped).
 */
export function parseWmataMinutes(min) {
  const raw = String(min ?? "").trim();
  if (raw === "ARR" || raw === "BRD") {
    return 0;
  }
  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }
  return null;
}

/**
 * Normalizes one WMATA `Trains[]` entry into a ProviderTrip, or null when the row must be
 * dropped (no reliable Min, or a Line value that isn't one of the six known lines — see file
 * header). `now` is injectable for tests.
 */
export function mapWmataTrainToTrip(train, now = new Date()) {
  const lineId = WMATA_LINE_CODE_TO_LINE[String(train?.Line ?? "").trim()] ?? null;
  if (!lineId) {
    return null;
  }
  const minutes = parseWmataMinutes(train?.Min);
  if (minutes === null) {
    return null;
  }
  const liveDeparture = new Date(now.getTime() + minutes * 60_000);
  const displayTime = formatClock(liveDeparture, WASHINGTON_TIME_ZONE);

  return {
    liveDeparture: liveDeparture.toISOString(),
    scheduledDeparture: liveDeparture.toISOString(),
    displayTime,
    scheduledDisplayTime: displayTime,
    platform: train?.Group != null ? String(train.Group) : undefined,
    destination: mapLineTerminusDestination(train?.DestinationName, lineId),
    lineId,
    cancelled: false,
    // WMATA's Station Prediction feed has no documented delay indicator — always false, unlike
    // Chicago's isDly. Revisit if a future WMATA payload surfaces one.
    delayed: false,
  };
}

/**
 * Flattens WMATA `Trains[]` into ProviderTrips, dropping unreliable-Min/no-passenger/unknown-
 * line rows.
 */
export function tripsFromTrainsList(trains, now = new Date()) {
  const list = Array.isArray(trains) ? trains : [];
  const trips = [];
  for (const train of list) {
    const trip = mapWmataTrainToTrip(train, now);
    if (trip) {
      trips.push(trip);
    }
  }
  return trips;
}

/**
 * @param {string} stationIdOrName Catalog name/alias
 * @param {{ apiKey?: string, now?: Date, codes?: string[], stationsData?: object[] }} [options]
 *   `codes`/`stationsData` are test seams — production callers never pass them.
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  if (!catalogEntry) {
    throw new Error(`Unknown Washington Metrorail station: ${stationIdOrName}`);
  }

  const apiKey = options.apiKey ?? readWmataApiKey();
  if (!apiKey) {
    throw new MissingWmataApiKeyError();
  }

  const codes =
    options.codes ??
    resolveStationCodesForCatalogEntry(
      await getStationsMetadata(apiKey, { stationsData: options.stationsData, now: options.now }),
      catalogEntry
    );

  const trains = await fetchPredictionsJson(codes, apiKey);
  const trips = tripsFromTrainsList(trains, options.now);

  return {
    stationName: catalogEntry.name,
    lastUpdate: new Date().toISOString(),
    trips,
    realtime: "live",
  };
}
