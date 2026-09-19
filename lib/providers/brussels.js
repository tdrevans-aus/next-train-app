/**
 * Brussels (STIB/MIVB) metro — LIVE board via the BMC Waiting Times API.
 * Adapter ready; city remains `planned` (not live) — see docs/brussels-d1/jim-handoff.md.
 * assertCityLive("brussels") must still fail until Tim/Mark flip the registry entry.
 *
 * Live source confirmed 20 Sep 2026 against the *gateway* host (not the developer-portal
 * host used to browse docs): `GET https://api-management-opendata-production.azure-api.net
 * /api/datasets/stibmivb/rt/WaitingTimes`, header `Ocp-Apim-Subscription-Key: STIB_API_KEY`.
 * The operation path was previously unconfirmed (see PR history) because every path tried
 * was guessed against the client-rendered developer-portal SPA; the real path was recovered
 * from the portal's own `/mapi/apis?api-version=2018-06-01-preview` content-listing endpoint
 * (public, no auth), which enumerates every published API's `properties.path`. Verified live
 * with a real key: Arts-Loi / Kunst-Wet (pointids 8041/8042/8401/8402) returned all four v1
 * lines (1, 2, 5, 6) with `expectedArrivalTime` timestamps a few minutes out, no
 * `message: "Theoretical time"` flag (STIB's own tell for a schedule-fallback entry — see
 * below); Simonis/Elisabeth (pointids 8471/8763/etc.) returned lines 2 and 6 including one
 * entry flagged `message: "Ne pas embarquer" / "Do not embark"` — a live *operational* status
 * that could not exist in a static schedule, which is itself confirmation this is genuine
 * vehicle tracking, not a schedule echo. No response headers exposed a numeric rate limit
 * (`x-ratelimit-*` absent); treated as unknown/conservative — see the cache TTL below.
 *
 * No timetable fallback: a missing key (MissingStibCredentialsError) or a failed live fetch
 * (StibUnavailableError) is a hard error, never silently served as a schedule board — Tim's
 * standing rule (Göteborg PR #332: "no live times, no region").
 *
 * Catalog stopIds ARE STIB point IDs (confirmed: Arts-Loi / Kunst-Wet's stopIds
 * 8041/8042/8401/8402 in lib/cities/brussels/stations.json are exactly the point IDs the
 * static `StopDetails` dataset and the live `WaitingTimes` dataset both use for that stop) —
 * no separate STIB<->catalog id mapping needed, unlike Göteborg's Trafiklab GID generation
 * step.
 *
 * `WaitingTimes` returns every STIB mode (bus/tram/metro) network-wide per point; this
 * adapter's `where` filter restricts to the queried station's own point IDs AND
 * `lineid` in BRUSSELS_METRO_SHORT_NAMES (1/2/5/6), so a bus/tram sharing a point ID
 * elsewhere can never leak onto a metro board. `destination.fr` (STIB's live payload) is the
 * same ALL-CAPS FR headsign convention as GTFS `trip_headsign` (confirmed: "STOCKEL",
 * "GARE DE L'OUEST", "ELISABETH", "ROI BAUDOUIN", "SIMONIS" all matched directly) so the
 * existing resolveTerminus()/marketingLabel() pipeline from marketing-directions.js is reused
 * unchanged — no new direction-mapping code.
 *
 * v1 scope (docs/brussels-d1/hazard-pack.md, direction-model-memo.md, jim-handoff.md): metro
 * 1, 2, 5, 6 only. No tram, no premetro/North-South Axis, no CHRONO, no SNCB/NMBS, no bus, no
 * De Lijn, no TEC. No passenger metro 3 or 4 (Albert-Bordet is a frozen project). Hub lock
 * Arts-Loi / Kunst-Wet (metro 1x2x5x6, through-cross) is a stop string only, never a direction
 * token. Simonis and Elisabeth are two distinct line-2/6 terminus chips, never collapsed.
 *
 * SNCB/NMBS domestic rail at Gare Centrale / Centraal, Gare du Midi / Zuidstation, and Gare de
 * l'Ouest / Weststation is ruled `in` by docs/brussels-d1/oracle-clash-report.md's Board
 * eligibility section (walk-up, no compulsory reservation) and is now wired as a SECOND live
 * source layered onto those three shared stations only, via lib/providers/irail.js (iRail
 * liveboard, no key, docs.irail.be). It is a genuinely separate source from STIB's own
 * WaitingTimes feed — no timetable, no schedule fallback for SNCB either. SNCB rows carry
 * `mode: "rail"` / `agency: "SNCB/NMBS"` (metro rows carry `mode: "metro"` / `agency:
 * "STIB/MIVB"`) so the two are never merged into one direction group (doNotGroup-by-mode,
 * hazard-pack.md, same shape as South Yorkshire's Sheffield Station rail-vs-Supertram split).
 * Eurostar/Thalys/TGV INOUI/OUIGO/Nightjet/European Sleeper are filtered out by iRail vehicle
 * type (classifySncbVehicleType in lib/providers/irail.js); ICE is `in`. If STIB fails the whole
 * board is refused (unchanged, see above); if iRail fails, the board is still served with only
 * the metro rows and `partial: true` (no hard refusal for a second-source outage) — see
 * fetchStationBoard() below.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  BRUSSELS_HUB,
  BRUSSELS_TIME_ZONE,
  foldKey,
  isForbiddenCollapseName,
  marketingLabel,
  resolveTerminus,
} from "../cities/brussels/marketing-directions.js";
import { fetchIrailLiveboardRaw, mapIrailDepartures } from "./irail.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export { BRUSSELS_HUB };
export const BRUSSELS_TIMEZONE = BRUSSELS_TIME_ZONE;

/** route_type=1 (metro) short names — docs/brussels-d1 hazard-pack.md H3 (no metro 3/4). Also the `lineid` allow-list for the live WaitingTimes filter. */
export const BRUSSELS_METRO_SHORT_NAMES = ["1", "2", "5", "6"];

/**
 * The three in-catalog metro stations docs/brussels-d1/oracle-clash-report.md's Board
 * eligibility section names as SNCB/NMBS-shared, mapped to iRail's own English station query
 * name (confirmed against iRail 19 Sep 2026, docs/brussels-d1/jim-handoff.md). Every key here is
 * verified to be the SAME in-catalog station as its metro entry in stations.json, not an
 * adjacent one — no other catalog station gets an SNCB source.
 */
export const SNCB_SHARED_STATION_IRAIL_NAMES = {
  "Gare Centrale / Centraal Station": "Brussels-Central",
  "Gare du Midi / Zuidstation": "Brussels-South/Brussels-Midi",
  "Gare de l'Ouest / Weststation": "Brussels-West",
};

/** BMC Waiting Times gateway operation — see file header for how this path was recovered. */
export const STIB_WAITING_TIMES_URL =
  "https://api-management-opendata-production.azure-api.net/api/datasets/stibmivb/rt/WaitingTimes";

/** Conservative placeholder — no numeric rate limit was exposed by the gateway (see file header). */
export const STIB_WAITING_TIMES_CACHE_TTL_MS = 15_000;
const STIB_WAITING_TIMES_STALE_MAX_MS = 60_000;
export const STIB_FETCH_TIMEOUT_MS = 5000;

const catalogPath = join(__dirname, "../cities/brussels/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

/**
 * STIB_API_KEY is not set — operator never subscribed the app, or the environment (Vercel
 * Production/Preview/Development, or local .env.local) is missing it. A hard error, thrown
 * before any network call — never a silent timetable fallback (board-eligibility rule).
 */
export class MissingStibCredentialsError extends Error {
  constructor(message) {
    super(
      message ??
        "STIB_API_KEY is not set — subscribe an app to the BMC Waiting Times API at " +
          "https://api-management-opendata-production.developer.azure-api.net/apis and add the key to the environment."
    );
    this.name = "MissingStibCredentialsError";
    this.envNames = ["STIB_API_KEY"];
  }
}

/**
 * The live WaitingTimes call failed for a genuinely transient reason (HTTP error, timeout,
 * malformed body) — unlike MissingStibCredentialsError (operator never configured the key),
 * retrying this one can succeed. There is no timetable fallback to fall through to.
 */
export class StibUnavailableError extends Error {
  constructor(stationName, cause) {
    super(
      `STIB WaitingTimes request failed for "${stationName}"${cause?.message ? `: ${cause.message}` : ""}`
    );
    this.name = "StibUnavailableError";
    this.cause = cause;
  }
}

/** @returns {string} */
export function readStibApiKey() {
  const key = String(process.env.STIB_API_KEY || "").trim();
  if (!key) {
    throw new MissingStibCredentialsError();
  }
  return key;
}

function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }
  if (isForbiddenCollapseName(raw)) {
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
    if (entry.stopIds?.includes(raw)) {
      return entry;
    }
  }
  return null;
}

function odsqlQuote(value) {
  // Point/line IDs are always plain alnum (with an occasional trailing letter, e.g. "0473F")
  // per StopDetails — never containing a quote — but escape defensively rather than trust that.
  return String(value).replace(/"/g, '\\"');
}

function buildWaitingTimesWhereClause(stopIds) {
  const pointClause = stopIds.map((id) => `pointid="${odsqlQuote(id)}"`).join(" OR ");
  const lineClause = BRUSSELS_METRO_SHORT_NAMES.map((line) => `lineid="${odsqlQuote(line)}"`).join(" OR ");
  return `(${pointClause}) AND (${lineClause})`;
}

async function fetchWaitingTimesRawUncached(stopIds) {
  const key = readStibApiKey();
  const where = buildWaitingTimesWhereClause(stopIds);
  const url = `${STIB_WAITING_TIMES_URL}?where=${encodeURIComponent(where)}`;
  const response = await fetch(url, {
    headers: { "Ocp-Apim-Subscription-Key": key },
    signal: AbortSignal.timeout(STIB_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`STIB WaitingTimes request failed (${response.status})`);
  }
  const payload = await response.json();
  return Array.isArray(payload?.results) ? payload.results : [];
}

/** @type {Map<string, { value: object[], timestamp: number, inflight: Promise<any>|null }>} */
const waitingTimesCache = new Map();

function cacheKeyFor(stopIds) {
  return stopIds.slice().sort().join(",");
}

/**
 * Fetch + cache one station's raw WaitingTimes rows (TTL window, in-flight coalescing,
 * stale-on-error), same shape as vasttrafik.js's fetchStopAreaDepartures — one shared fetch
 * per station per window regardless of concurrent board requests.
 */
async function fetchWaitingTimesRaw(stopIds, options = {}) {
  if (options.noCache) {
    return fetchWaitingTimesRawUncached(stopIds);
  }

  const key = cacheKeyFor(stopIds);
  const now = Date.now();
  const existing = waitingTimesCache.get(key);

  if (existing?.inflight) {
    return existing.inflight;
  }
  if (existing && now - existing.timestamp < STIB_WAITING_TIMES_CACHE_TTL_MS) {
    return existing.value;
  }

  const inflight = fetchWaitingTimesRawUncached(stopIds).then(
    (value) => {
      waitingTimesCache.set(key, { value, timestamp: Date.now(), inflight: null });
      return value;
    },
    (error) => {
      const stale = waitingTimesCache.get(key);
      if (stale && Date.now() - stale.timestamp < STIB_WAITING_TIMES_STALE_MAX_MS) {
        waitingTimesCache.set(key, { ...stale, inflight: null });
        return stale.value;
      }
      waitingTimesCache.delete(key);
      throw error;
    }
  );

  waitingTimesCache.set(key, { value: existing?.value, timestamp: existing?.timestamp ?? 0, inflight });
  return inflight;
}

/** Test-only: clear the module-level WaitingTimes cache between gate runs. */
export function _resetStibWaitingTimesCacheForTests() {
  waitingTimesCache.clear();
}

function formatClock(date) {
  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: BRUSSELS_TIME_ZONE,
  });
}

function isTheoreticalMessage(message) {
  // STIB's own tell for "no tracked vehicle, this is a schedule-derived estimate" — e.g.
  // {"en":"Theoretical time", "fr":"Temps théorique", ...}. Dropped rather than shown as a
  // live passing time (board-eligibility rule: no schedule-only entries on a live board).
  return String(message?.en || "").toLowerCase().includes("theoretical");
}

function isNonBoardingMessage(message) {
  // e.g. {"en":"Do not embark", "fr":"Ne pas embarquer", ...} — a real, tracked vehicle that
  // is not taking passengers at this stop (ending its run / depot move). Not a boardable
  // departure, dropped rather than shown.
  const en = String(message?.en || "").toLowerCase();
  return en.includes("do not embark") || en.includes("do not board");
}

/**
 * Map raw WaitingTimes `results` rows (already filtered server-side to this station's point
 * IDs and the v1 line allow-list) to the shared ProviderTrip shape. Exported so
 * qa/brussels-dogfood-gate.mjs can drive this exact pipeline against a captured-live fixture
 * without a network call.
 * @param {object[]} results raw `results` array from the WaitingTimes response
 * @param {string} stationKey foldKey() of the station this board was requested for
 */
export function mapWaitingTimesResults(results, stationKey) {
  const trips = [];
  for (const result of results ?? []) {
    const lineId = String(result?.lineid ?? "").trim();
    if (!BRUSSELS_METRO_SHORT_NAMES.includes(lineId)) {
      continue;
    }
    let passingTimes;
    try {
      passingTimes = JSON.parse(result?.passingtimes ?? "[]");
    } catch {
      continue;
    }
    if (!Array.isArray(passingTimes)) {
      continue;
    }
    for (const pt of passingTimes) {
      if (isTheoreticalMessage(pt?.message) || isNonBoardingMessage(pt?.message)) {
        continue;
      }
      const destinationFr = pt?.destination?.fr;
      const terminus = resolveTerminus(destinationFr, lineId);
      if (!terminus) {
        // Overlay/short-turn/depot headsign — not one of the four lines' official printed
        // termini (hazard-pack.md H5: shortTurns empty on all four v1 lines). Dropped rather
        // than fabricating a chip.
        continue;
      }
      if (foldKey(terminus) === stationKey) {
        // Self-referential arrival — same pattern as the retired GTFS-schedule path.
        continue;
      }
      const liveDate = pt?.expectedArrivalTime ? new Date(pt.expectedArrivalTime) : null;
      if (!liveDate || Number.isNaN(liveDate.getTime())) {
        continue;
      }
      const liveIso = liveDate.toISOString();
      trips.push({
        routeShortName: lineId,
        destination: marketingLabel(lineId, terminus),
        rawDestination: `${pt?.destination?.fr ?? ""} / ${pt?.destination?.nl ?? ""}`,
        liveDeparture: liveIso,
        scheduledDeparture: liveIso,
        displayTime: formatClock(liveDate),
        scheduledDisplayTime: formatClock(liveDate),
        platform: "",
        realtime: true,
        cancelled: false,
        // doNotGroup-by-mode (file header): metro rows are always this exact pair, SNCB rows
        // (mapIrailDepartures in lib/providers/irail.js) always carry "rail" / "SNCB/NMBS" — the
        // two are never merged into one direction group.
        mode: "metro",
        agency: "STIB/MIVB",
      });
    }
  }
  return trips;
}

/**
 * Live-only, no fallback. Never loads static GTFS on the board path — every catalog station's
 * STIB point IDs are read straight from `stopIds` in lib/cities/brussels/stations.json (these
 * are STIB point IDs, not just GTFS stop_ids — see file header).
 * @param {string} stationIdOrName Catalog name, FR/NL alias, or STIB point ID
 * @param {{ now?: Date, rawResults?: object[], noCache?: boolean, irailRawDepartures?: object[] }} [options]
 *   `rawResults` — an already-fetched WaitingTimes `results` array (same shape the live fetch
 *   returns). When supplied the live STIB fetch is skipped entirely, so the offline gate
 *   (qa/brussels-dogfood-gate.mjs, fed by a captured-live fixture) can drive this exact
 *   filter/map pipeline without a network call. Production callers never pass it.
 *   `irailRawDepartures` — same escape hatch for the second (SNCB/iRail) source, at the three
 *   SNCB_SHARED_STATION_IRAIL_NAMES stations only; see lib/providers/irail.js.
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = catalogEntry?.stopIds ?? [];
  if (!stopIds.length) {
    throw new Error(`Unknown Brussels station: ${stationIdOrName}`);
  }

  const stationName = catalogEntry?.name ?? String(stationIdOrName);
  const stationKey = foldKey(stationName);

  let rawResults;
  if (options.rawResults) {
    rawResults = options.rawResults;
  } else {
    // Missing STIB_API_KEY throws MissingStibCredentialsError here, before any fetch is
    // attempted — never a silent timetable fallback. STIB failing is a hard refusal of the
    // WHOLE board (metro is the primary, always-on source) — unlike iRail below, whose failure
    // only degrades the board to metro-only + partial.
    try {
      rawResults = await fetchWaitingTimesRaw(stopIds, options);
    } catch (error) {
      if (error instanceof MissingStibCredentialsError) {
        throw error;
      }
      throw new StibUnavailableError(stationName, error);
    }
  }

  const metroTrips = mapWaitingTimesResults(rawResults, stationKey);

  // SNCB/NMBS second source — only at the three shared stations the oracle report names
  // (SNCB_SHARED_STATION_IRAIL_NAMES). A failure here never refuses the board: the metro rows
  // are still served, with `partial: true` recording that the SNCB portion is missing this
  // refresh — same "second source down doesn't take out the primary board" posture as Boston's
  // Commuter Rail (lib/providers/boston.js fetchCommuterRailTrips, which resolves to []
  // on any failure rather than throwing).
  const irailStationName = SNCB_SHARED_STATION_IRAIL_NAMES[stationName];
  let sncbTrips = [];
  let partial = false;
  if (irailStationName) {
    try {
      const irailRaw = await fetchIrailLiveboardRaw(irailStationName, options);
      sncbTrips = mapIrailDepartures(irailRaw, { timeZone: BRUSSELS_TIME_ZONE });
    } catch {
      partial = true;
    }
  }

  const trips = [...metroTrips, ...sncbTrips].sort(
    (a, b) => new Date(a.liveDeparture) - new Date(b.liveDeparture)
  );

  return {
    stationName,
    lastUpdate: new Date().toISOString(),
    trips,
    realtime: "live",
    // `true` only when this station has an SNCB source AND that source's most recent fetch
    // failed — a metro-only station (no SNCB source at all) is never partial. See
    // docs/board-eligibility-rule.md and the file header for why a second-source outage
    // degrades rather than refuses.
    partial,
  };
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

export { resolveCatalogEntry };
