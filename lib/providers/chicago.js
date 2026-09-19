/**
 * Chicago 'L' (Chicago Transit Authority) — eight color rapid-transit lines (Red, Blue, Brown,
 * Green, Orange, Pink, Purple, Yellow) via the CTA Train Tracker Arrivals API. Adapter ready;
 * city remains `planned` (not live) — see docs/chicago-d1/jim-handoff.md.
 * assertCityLive("chicago") must still fail until Tim flips the registry entry.
 *
 * LIVE BOARDS ONLY — no static-GTFS/schedule fallback. Tim's rule for this city (per the
 * dispatch brief, same posture as lib/providers/bart.js): no live times, no board; never a
 * silent timetable fallback. fetchStationBoard() throws MissingCtaTrainTrackerKeyError
 * (lib/providers/gtfs/auth.js) whenever CTA_TRAIN_TRACKER_KEY is unset, and propagates any
 * Train Tracker fetch/parse failure rather than returning an empty/synthetic board.
 *
 * Endpoint: GET https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx?key={KEY}&mapid={ID}
 *   &outputType=JSON . Docs: https://www.transitchicago.com/developers/traintracker/ .
 * Never write a key into a repo file — CTA_TRAIN_TRACKER_KEY comes from the environment only.
 * CTA_TRAIN_TRACKER_KEY was NOT available this session (not in .env.local) — this adapter was
 * never called against the live endpoint.
 *
 * isSch/isDly/isFlt (documented Train Tracker flags, UNVERIFIED against a live payload):
 *   - isSch="1" ("schedule-based", i.e. Train Tracker has no live vehicle to predict from and
 *     is showing a static-schedule guess) is DROPPED — never presented as live, same rule this
 *     pack applies everywhere else (no live times, no board). A station whose only etas are
 *     schedule-based simply returns an empty trip list, not a fabricated-looking live row.
 *   - isFlt="1" ("fault" — Train Tracker has no reliable prediction for this run) is also
 *     DROPPED for the same reason.
 *   - isDly="1" (the run is running behind) is a REAL live prediction, kept, and surfaced as
 *     `delayed: true` on the trip (not `cancelled` — CTA's own semantics distinguish "delayed"
 *     from "no service"). This mirrors how Göteborg/Helsinki keep a real-time row while still
 *     flagging degraded confidence rather than hiding it or pretending it's on-time.
 *
 * Station ids (Train Tracker `mapid`) are NOT hardcoded in the catalog — they are resolved at
 * request time from CTA's own published static GTFS (loadGtfsStatic, routeTypes: ["1"] for
 * subway/metro), same runtime-resolution pattern as lib/providers/boston.js and
 * lib/providers/malmo.js, rather than a hand-transcribed id table (143 mapids memorized by an
 * LLM is a fabrication risk this pack explicitly warns against). A GTFS parent stop whose
 * stop_name matches the catalog entry's printed name AND whose child platform stop_ids carry
 * at least one trip on one of that entry's `lines` is accepted as the mapid; zero or multiple
 * qualifying candidates throws ChicagoStationMapIdUnconfirmedError rather than guessing — this
 * is the mechanism that also disambiguates same-printed-name families (Western, Pulaski, ...)
 * by line once real GTFS data is available. NEEDS LIVE CONFIRMATION once a key is set — this
 * session never fetched CTA's real static GTFS zip.
 *
 * v1 scope (docs/chicago-d1/hazard-pack.md, direction-model-memo.md, oracle-clash-report.md):
 * CTA 'L' only — 143 unique passenger stops across the eight lines. No Metra, no Pace, no South
 * Shore Line, no CTA bus.
 *
 * Hub lock: Clark/Lake (Blue subway crossing under the Loop rectangle; Brown/Green/Orange/Pink/
 * Purple elevated on it) — never a direction token; the Loop is a structure/region label, not a
 * station. Red does not call Clark/Lake (its inner-city string is Lake). doNotGroup/
 * doNotCollapse, per hazard-pack.md H1/H4/H6 and lib/cities/chicago/marketing-directions.js file
 * header: State/Lake, Washington/Wabash, Adams/Wabash, Library, LaSalle/Van Buren, Quincy,
 * Washington/Wells, Lake, Washington (Blue), plus the several same-printed-name-different-place
 * families (Harlem, Western, Pulaski, Cicero, Kedzie, Damen, Belmont, Chicago, Grand, Monroe,
 * Addison, Ashland, Clinton, California, Austin, Oak Park, Halsted, Garfield, 47th, Montrose,
 * Irving Park, Central) — resolveCatalogEntry() throws AmbiguousChicagoStationError for the
 * bare colliding name rather than silently picking a physical place.
 *
 * Board eligibility (docs/chicago-d1/oracle-clash-report.md "Board eligibility" section,
 * controller note 20 Sep 2026): Metra, Amtrak and South Shore Line terminals adjacent to
 * Quincy/Washington-Wells/Washington-Wabash are separate buildings, not in-catalog 'L'
 * stations — no verdict owed, no service beyond CTA 'L' is board-eligible at any in-catalog
 * station.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readCtaTrainTrackerKey, MissingCtaTrainTrackerKeyError } from "./gtfs/auth.js";
import { loadGtfsStatic } from "./gtfs/static-cache.js";
import {
  CHICAGO_HUB,
  CHICAGO_TIME_ZONE,
  CTA_RT_TO_LINE,
  CTA_GTFS_ROUTE_ID_TO_LINE,
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  AmbiguousChicagoStationError,
  LINE_LABELS,
  LINE_TERMINI,
  mapLineTerminusDestination,
  resolveCatalogEntry as resolveMarketingCatalogEntry,
} from "../cities/chicago/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export {
  CHICAGO_HUB,
  CHICAGO_TIME_ZONE,
  CTA_RT_TO_LINE,
  CTA_GTFS_ROUTE_ID_TO_LINE,
  LINE_LABELS,
  LINE_TERMINI,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  AmbiguousChicagoStationError,
  MissingCtaTrainTrackerKeyError,
};

/** Per CTA's GTFS developer page (transitchicago.com/developers/gtfs/) — UNVERIFIED this
 * session, no network fetch was performed (no CTA_TRAIN_TRACKER_KEY, no reason to download). */
export const CTA_GTFS_STATIC_URL = "https://www.transitchicago.com/downloads/sch_data/google_transit.zip";
export const CTA_TRAIN_TRACKER_URL = "https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx";
/** GTFS route_type for subway/metro (CTA 'L') per the GTFS spec — CTA rail is NOT route_type 2 (rail). */
export const CTA_GTFS_ROUTE_TYPE = "1";

const catalogPath = join(__dirname, "../cities/chicago/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

/** Re-exported so callers/tests use one resolver (marketing-directions.js owns the data). */
export function resolveCatalogEntry(stationIdOrName) {
  return resolveMarketingCatalogEntry(stationIdOrName);
}

/**
 * Thrown when a catalogued station's Train Tracker `mapid` can't be confidently resolved from
 * the static GTFS join (zero or multiple qualifying parent-stop candidates). Never guesses —
 * same never-fabricate posture as AmbiguousChicagoStationError and BART's OAK
 * FeedUnconfirmedError. Confirm against a real CTA GTFS snapshot at D3.
 */
export class ChicagoStationMapIdUnconfirmedError extends Error {
  constructor(catalogEntry, candidateCount) {
    super(
      `Could not confidently resolve a Train Tracker mapid for "${catalogEntry?.name}"` +
        (catalogEntry?.branch ? ` (${catalogEntry.branch})` : "") +
        ` from CTA's static GTFS — ${candidateCount} qualifying candidate(s) found (need exactly ` +
        "1). NEEDS LIVE CONFIRMATION once CTA_TRAIN_TRACKER_KEY and a real GTFS snapshot are available."
    );
    this.name = "ChicagoStationMapIdUnconfirmedError";
    this.candidateCount = candidateCount;
  }
}

/**
 * Resolve a catalog entry's Train Tracker `mapid` from parsed GTFS static data
 * (lib/providers/gtfs/static-cache.js shape: stops/stopsById/stopTimesByStopId/tripsById/
 * routesById). A parent stop (no parent_station) whose stop_name folds to the entry's printed
 * name AND whose child platform stops carry at least one trip on one of the entry's `lines` is
 * accepted; anything else (0 or >1 candidates) throws rather than guessing. Exported for tests
 * — never call the live endpoint from a QA gate.
 */
export function resolveMapIdForCatalogEntry(staticData, catalogEntry) {
  const needle = foldKey(catalogEntry?.name);
  const parents = (staticData?.stops ?? []).filter(
    (stop) => !stop.parent_station && foldKey(stop.stop_name) === needle
  );

  function tripLineIds(childStopId) {
    const stopTimes = staticData.stopTimesByStopId?.get(childStopId) ?? [];
    const lines = new Set();
    for (const stopTime of stopTimes) {
      const trip = staticData.tripsById?.get(stopTime.trip_id);
      const route = trip ? staticData.routesById?.get(trip.route_id) : null;
      const lineId =
        CTA_GTFS_ROUTE_ID_TO_LINE[trip?.route_id] ?? CTA_GTFS_ROUTE_ID_TO_LINE[route?.route_short_name];
      if (lineId) {
        lines.add(lineId);
      }
    }
    return lines;
  }

  const qualifying = parents.filter((parent) => {
    const children = (staticData?.stops ?? []).filter((stop) => stop.parent_station === parent.stop_id);
    const childIds = children.length ? children.map((c) => c.stop_id) : [parent.stop_id];
    const lines = new Set();
    for (const id of childIds) {
      for (const lineId of tripLineIds(id)) {
        lines.add(lineId);
      }
    }
    return (catalogEntry.lines ?? []).some((lineId) => lines.has(lineId));
  });

  if (qualifying.length !== 1) {
    throw new ChicagoStationMapIdUnconfirmedError(catalogEntry, qualifying.length);
  }
  return qualifying[0].stop_id;
}

/**
 * Train Tracker `prdt`/`arrT` timestamps are documented as naive local (America/Chicago)
 * wall-clock strings with no offset, e.g. "2013-09-23T14:41:39" — parsed against `referenceNow`
 * (injectable for tests) so DST is resolved for the correct side of a transition (hazard-pack.md
 * H7: America/Chicago HAS DST, do not copy Perth/Brisbane no-DST).
 */
export function parseChicagoWallClock(isoLocal, referenceNow = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(String(isoLocal ?? ""));
  if (!match) {
    return null;
  }
  const [, y, mo, d, h, mi, se] = match.map(Number);
  const utcGuess = new Date(Date.UTC(y, mo - 1, d, h, mi, se));
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(referenceNow);
  const pick = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(pick("year"), pick("month") - 1, pick("day"), pick("hour"), pick("minute"), pick("second"));
  const offsetMs = asUtc - referenceNow.getTime();
  return new Date(utcGuess.getTime() - offsetMs);
}

function formatClock(date, timeZone) {
  return date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  });
}

/** Builds the ttarrivals.aspx request URL for a single mapid. Exported for tests — never call
 * the live endpoint from a QA gate; this pack's shape is documented-only, unverified live. */
export function buildTrainTrackerUrl(mapid, apiKey) {
  const url = new URL(CTA_TRAIN_TRACKER_URL);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("mapid", mapid);
  url.searchParams.set("outputType", "JSON");
  return url.toString();
}

async function fetchTrainTrackerJson(mapid, apiKey) {
  const response = await fetch(buildTrainTrackerUrl(mapid, apiKey));
  if (!response.ok) {
    throw new Error(`CTA Train Tracker request failed for mapid ${mapid}: HTTP ${response.status}`);
  }
  const body = await response.json();
  const root = body?.ctatt;
  if (!root) {
    throw new Error(`CTA Train Tracker response for mapid ${mapid} had no ctatt payload`);
  }
  if (root.errCd && String(root.errCd) !== "0") {
    throw new Error(`CTA Train Tracker error for mapid ${mapid}: ${root.errCd} ${root.errNm ?? ""}`.trim());
  }
  return root;
}

/**
 * Normalizes one Train Tracker `ctatt.eta[]` entry into a ProviderTrip, or null when the row
 * must be dropped (isSch/isFlt — see file header). `now` is injectable for tests.
 */
export function mapEtaToTrip(eta, now = new Date()) {
  if (String(eta?.isSch ?? "0") === "1" || String(eta?.isFlt ?? "0") === "1") {
    return null;
  }
  const rt = String(eta?.rt ?? "").toLowerCase();
  const lineId = CTA_RT_TO_LINE[rt] ?? null;
  const liveDeparture = parseChicagoWallClock(eta?.arrT, now) ?? now;
  const displayTime = formatClock(liveDeparture, CHICAGO_TIME_ZONE);
  const delayed = String(eta?.isDly ?? "0") === "1";

  return {
    liveDeparture: liveDeparture.toISOString(),
    scheduledDeparture: liveDeparture.toISOString(),
    displayTime,
    scheduledDisplayTime: displayTime,
    platform: eta?.stpId != null ? String(eta.stpId) : undefined,
    destination: lineId ? mapLineTerminusDestination(eta?.destNm, lineId) : String(eta?.destNm ?? ""),
    lineId,
    cancelled: false,
    delayed,
  };
}

/**
 * Flattens `ctatt.eta[]` into ProviderTrips, dropping schedule-based/fault rows (isSch/isFlt)
 * and any row whose `rt` isn't one of the eight known lines — belt-and-braces against an
 * unexpected route token ever reaching a rider.
 */
export function tripsFromEtaList(root, now = new Date()) {
  const etas = Array.isArray(root?.eta) ? root.eta : [];
  const trips = [];
  for (const eta of etas) {
    const trip = mapEtaToTrip(eta, now);
    if (trip && trip.lineId) {
      trips.push(trip);
    }
  }
  return trips;
}

/**
 * @param {string} stationIdOrName Catalog name/branch-qualified alias
 * @param {{ apiKey?: string, now?: Date, mapid?: string, staticData?: object }} [options]
 *   `mapid`/`staticData` are test seams — production callers never pass them.
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  if (!catalogEntry) {
    throw new Error(`Unknown Chicago 'L' station: ${stationIdOrName}`);
  }

  const apiKey = options.apiKey ?? readCtaTrainTrackerKey();
  if (!apiKey) {
    throw new MissingCtaTrainTrackerKeyError();
  }

  const mapid =
    options.mapid ??
    resolveMapIdForCatalogEntry(
      options.staticData ?? (await loadGtfsStatic({ url: CTA_GTFS_STATIC_URL, routeTypes: [CTA_GTFS_ROUTE_TYPE] })),
      catalogEntry
    );

  const root = await fetchTrainTrackerJson(mapid, apiKey);
  const trips = tripsFromEtaList(root, options.now);

  return {
    stationName: catalogEntry.name,
    lastUpdate: new Date().toISOString(),
    trips,
    realtime: "live",
  };
}
