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
 *
 * Scheduled metro tail (20 Sep 2026, docs/jim-brief-brussels-scheduled-tail-and-sncb-grouping.md):
 * STIB's WaitingTimes feed caps at ~2 live passages per direction (a hard upstream property —
 * confirmed unraisable, docs/brussels-d1/jim-handoff.md "Horizon investigation"), which left
 * Arts-Loi/Simonis boards showing only 3-14 minutes ahead. After each direction's LAST live
 * metro row, up to 6 further departures are appended from STIB's own static GTFS timetable
 * (route_type=1, lines 1/2/5/6 only), each carrying `realtime: false` so the shared low-key
 * "Scheduled" UI treatment (contract.js's ProviderTrip.realtime doc, public/app.js) applies —
 * Tim's amended standing rule: scheduled times are never presented as live, and are never shown
 * when live data is unavailable. Concretely: (1) the tail is only ever computed after the live
 * STIB fetch above has already succeeded — a STIB failure throws before this code runs, so the
 * tail can never appear on a refused board; (2) `appendScheduledMetroTail()` only accepts a
 * timetable row whose time is strictly after that exact direction's last live row (or, for a
 * direction with zero live rows this refresh, any row in the 60-minute window) — never before or
 * between; (3) any error loading/parsing the static snapshot (network, stale calendar,
 * malformed feed) is caught and the tail is silently empty — a tail failure never fails the
 * live board. Static data comes from `loadGtfsStatic({ url: gtfsFixtureBlobUrl("brussels") })`,
 * the same snapshot-cache pattern Canberra/Newcastle/etc. use — never a cold parse of STIB's
 * ~16 MB network-wide zip on the request path. The published blob
 * (scripts/publish-brussels-gtfs-snapshot-to-blob.mjs) is pre-trimmed to metro only (~2.4 MB)
 * from STIB's own unauthenticated static GTFS discovery endpoint (mdb-1088 / Belgian Mobility
 * NAP), confirmed live 20 Sep 2026: route_type "1" is exactly routes 1/2/5/6, trip_headsign
 * values ("STOCKEL", "GARE DE L'OUEST", "ELISABETH", ...) match the live payload's
 * `destination.fr` convention exactly (resolveTerminus()/marketingLabel() are reused
 * unchanged), and the catalog's STIB point IDs are confirmed to equal this feed's stop_ids too
 * (Arts-Loi 8041/8042/8401/8402 all resolve). SNCB rows need no tail — iRail already reaches
 * ~60 minutes on its own.
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
import { loadGtfsStatic } from "./gtfs/static-cache.js";
import { gtfsFixtureBlobUrl } from "./gtfs/blob-fixtures.js";
import { buildBoardForStops } from "./gtfs/board.js";

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

const EMPTY_REALTIME_INDEX = {
  tripDelaySec: new Map(),
  stopUpdates: new Map(),
  cancelledTrips: new Set(),
};

/** Horizon cap + per-direction row cap for the scheduled tail (file header). */
export const SCHEDULED_TAIL_HORIZON_MINUTES = 60;
export const SCHEDULED_TAIL_MAX_PER_DIRECTION = 6;
/** A scheduled row within this many ms of a live row for the same direction is treated as the
 * same physical departure and dropped, rather than shown twice. */
const SCHEDULED_TAIL_DEDUPE_WINDOW_MS = 90 * 1000;

let cachedMetroStaticDataPromise = null;

/**
 * Trimmed metro-only snapshot published by scripts/publish-brussels-gtfs-snapshot-to-blob.mjs
 * (see file header) — loadGtfsStatic() caches this in-process for its default TTL (6h), so a
 * warm request never re-downloads or re-parses it.
 */
function loadBrusselsMetroStatic() {
  if (!cachedMetroStaticDataPromise) {
    cachedMetroStaticDataPromise = loadGtfsStatic({
      url: gtfsFixtureBlobUrl("brussels"),
      routeTypes: ["1"],
      includeRouteShortNames: BRUSSELS_METRO_SHORT_NAMES,
      timeZone: BRUSSELS_TIME_ZONE,
      ifModifiedSince: true,
    }).catch((error) => {
      // Let the next call retry rather than caching a rejected promise forever.
      cachedMetroStaticDataPromise = null;
      throw error;
    });
  }
  return cachedMetroStaticDataPromise;
}

/** Test-only: force the next loadBrusselsMetroStatic() call to hit the network/cache again. */
export function _resetBrusselsMetroStaticCacheForTests() {
  cachedMetroStaticDataPromise = null;
}

/**
 * A static-GTFS row (lib/providers/gtfs/board.js shape) to a ProviderTrip-shaped scheduled
 * tail row, reusing the exact same terminus/marketing pipeline as the live rows so labels are
 * identical and stable. Returns null for a row this pipeline would already drop from a live
 * board (overlay/short-turn/depot headsign with no printed terminus, or a self-referential
 * arrival) — same filters mapWaitingTimesResults applies.
 * @param {object} row
 * @param {string} stationKey foldKey() of the station this board was requested for
 */
export function mapScheduledTailRow(row, stationKey) {
  const lineId = String(row?.routeShortName ?? "").trim();
  if (!BRUSSELS_METRO_SHORT_NAMES.includes(lineId)) {
    return null;
  }
  const terminus = resolveTerminus(row?.destination, lineId);
  if (!terminus) {
    return null;
  }
  if (foldKey(terminus) === stationKey) {
    return null;
  }
  return {
    routeShortName: lineId,
    destination: marketingLabel(lineId, terminus),
    rawDestination: row?.destination ?? "",
    liveDeparture: row.liveDeparture,
    scheduledDeparture: row.scheduledDeparture,
    displayTime: row.displayTime,
    scheduledDisplayTime: row.scheduledDisplayTime,
    platform: "",
    realtime: false,
    cancelled: false,
    mode: "metro",
    agency: "STIB/MIVB",
  };
}

/**
 * Append timetable rows after each direction's own last live row — never before or between
 * (file header). A direction with zero live rows this refresh gets every in-window tail row
 * (there is nothing for it to come "after"); this only ever happens for a direction the live
 * feed simply isn't reporting yet, not one it refused, since we only reach this function after
 * the live STIB fetch has already succeeded.
 * @param {object[]} liveMetroTrips already-mapped live metro ProviderTrips (mode: "metro")
 * @param {object[]} tailCandidates mapScheduledTailRow() output, not yet deduped/capped
 */
export function appendScheduledMetroTail(liveMetroTrips, tailCandidates) {
  const directionKey = (trip) => `${trip.routeShortName}|${trip.destination}`;

  const lastLiveByDirection = new Map();
  for (const trip of liveMetroTrips) {
    const key = directionKey(trip);
    const t = new Date(trip.liveDeparture).getTime();
    const prev = lastLiveByDirection.get(key);
    if (prev == null || t > prev) {
      lastLiveByDirection.set(key, t);
    }
  }

  const sorted = [...tailCandidates].sort(
    (a, b) => new Date(a.liveDeparture) - new Date(b.liveDeparture)
  );

  const countByDirection = new Map();
  const out = [];
  for (const trip of sorted) {
    const key = directionKey(trip);
    const t = new Date(trip.liveDeparture).getTime();
    const lastLive = lastLiveByDirection.get(key);
    if (lastLive != null && t <= lastLive + SCHEDULED_TAIL_DEDUPE_WINDOW_MS) {
      // Before, between, or a near-duplicate of a live row for this exact direction — drop it
      // rather than let a timetable row ever appear ahead of or beside a tracked one.
      continue;
    }
    const count = countByDirection.get(key) ?? 0;
    if (count >= SCHEDULED_TAIL_MAX_PER_DIRECTION) {
      continue;
    }
    countByDirection.set(key, count + 1);
    out.push(trip);
  }
  return out;
}

/**
 * Fetch + build the scheduled metro tail for one station's stopIds. Never throws: any failure
 * (network, stale/missing snapshot, malformed feed) resolves to an empty array so a tail
 * problem can never take down the live board that's already been served successfully by the
 * time this runs. Not called at all when the live STIB fetch itself failed (file header).
 * @param {string[]} stopIds
 * @param {object[]} liveMetroTrips this station's already-mapped live metro rows
 * @param {string} stationKey foldKey() of the station
 * @param {{ now?: Date, staticData?: object }} [options] `staticData` — test-only escape hatch,
 *   same shape qa/brussels-dogfood-gate.mjs uses for the live WaitingTimes fixture.
 */
export async function fetchScheduledMetroTail(stopIds, liveMetroTrips, stationKey, options = {}) {
  try {
    const staticData = options.staticData ?? (await loadBrusselsMetroStatic());
    const rows = buildBoardForStops({
      stopIds,
      staticData,
      realtimeIndex: EMPTY_REALTIME_INDEX,
      timeZone: BRUSSELS_TIME_ZONE,
      now: options.now ?? new Date(),
      horizonMinutes: SCHEDULED_TAIL_HORIZON_MINUTES,
    });
    const candidates = rows
      .map((row) => mapScheduledTailRow(row, stationKey))
      .filter(Boolean);
    return appendScheduledMetroTail(liveMetroTrips, candidates);
  } catch {
    return [];
  }
}

/**
 * Live-only for the primary (STIB) source, no fallback there — see file header for the
 * scheduled metro tail, which is additive and only ever appended after live rows, never a
 * substitute for them. Every catalog station's STIB point IDs are read straight from
 * `stopIds` in lib/cities/brussels/stations.json (these are STIB point IDs, not just GTFS
 * stop_ids — see file header).
 * @param {string} stationIdOrName Catalog name, FR/NL alias, or STIB point ID
 * @param {{ now?: Date, rawResults?: object[], noCache?: boolean, irailRawDepartures?: object[], staticData?: object }} [options]
 *   `rawResults` — an already-fetched WaitingTimes `results` array (same shape the live fetch
 *   returns). When supplied the live STIB fetch is skipped entirely, so the offline gate
 *   (qa/brussels-dogfood-gate.mjs, fed by a captured-live fixture) can drive this exact
 *   filter/map pipeline without a network call. Production callers never pass it.
 *   `staticData` — same escape hatch for the scheduled tail's GTFS static snapshot.
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

  // Scheduled tail — only reached once the live STIB fetch above has already succeeded (file
  // header: "only while the live feed is healthy"). Never throws; an empty array on any
  // failure leaves metroTrips completely unaffected.
  const scheduledMetroTrips = await fetchScheduledMetroTail(stopIds, metroTrips, stationKey, {
    now: options.now,
    staticData: options.staticData,
  });

  // SNCB/NMBS second source — only at the three shared stations the oracle report names
  // (SNCB_SHARED_STATION_IRAIL_NAMES). A failure here never refuses the board: the metro rows
  // are still served, with `partial: true` recording that the SNCB portion is missing this
  // refresh — same "second source down doesn't take out the primary board" posture as Boston's
  // Commuter Rail (lib/providers/boston.js fetchCommuterRailTrips, which resolves to []
  // on any failure rather than throwing).
  const irailStationName = SNCB_SHARED_STATION_IRAIL_NAMES[stationName];
  let sncbTrips = [];
  let partial = false;
  let irailUnmapped = [];
  if (irailStationName) {
    try {
      const irailRaw = await fetchIrailLiveboardRaw(irailStationName, options);
      sncbTrips = mapIrailDepartures(irailRaw, { timeZone: BRUSSELS_TIME_ZONE });
      irailUnmapped = sncbTrips.unmapped ?? [];
    } catch {
      partial = true;
    }
  }

  const trips = [...metroTrips, ...scheduledMetroTrips, ...sncbTrips].sort(
    (a, b) => new Date(a.liveDeparture) - new Date(b.liveDeparture)
  );

  return {
    stationName,
    lastUpdate: new Date().toISOString(),
    trips,
    // Board-level marker stays "live" even with scheduled tail rows mixed in — those rows each
    // carry their own per-trip `realtime: false` (contract.js), which is the marker the UI and
    // API actually key off; this board-level field describes the PRIMARY source's health
    // (STIB), unchanged from before the tail existed.
    realtime: "live",
    // `true` only when this station has an SNCB source AND that source's most recent fetch
    // failed — a metro-only station (no SNCB source at all) is never partial. See
    // docs/board-eligibility-rule.md and the file header for why a second-source outage
    // degrades rather than refuses.
    partial,
    // Diagnostics only — never surfaced by api/next-train.js or any UI. Non-empty only when
    // this refresh's iRail departures included a vehicle type classifySncbVehicleType()
    // (lib/providers/irail.js) doesn't recognise, so a silent safe-default drop is detectable
    // (docs/jim-brief-brussels-flip-readiness.md) instead of invisible.
    ...(irailUnmapped.length ? { debug: { irailUnmappedTypes: irailUnmapped } } : {}),
  };
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

export { resolveCatalogEntry };
