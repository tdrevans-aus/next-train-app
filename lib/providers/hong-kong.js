/**
 * Hong Kong (MTR) — eight urban heavy-rail lines (ISL, TWL, KTL, TKL, TCL, TML, EAL, SIL) plus
 * two board-eligibility-approved product lines, via the MTR Next Train REST. Adapter ready; city
 * remains `planned` (not live) — see docs/hong-kong-d1/jim-handoff.md. assertCityLive("hong-kong")
 * must still fail until Tim flips the registry entry.
 *
 * LIVE BOARDS ONLY — no static-GTFS/schedule fallback (there is no MTR-only official GTFS to
 * fall back to anyway; see docs/hong-kong-d1/oracle-clash-report.md). fetchStationBoard()
 * propagates any REST fetch/parse failure rather than returning an empty or synthetic board.
 *
 * Feed: MTR Next Train REST (proprietary JSON, NOT GTFS-RT) —
 * GET https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=<LINE>&sta=<STA>
 * (spec v1.7 https://opendata.mtr.com.hk/doc/Next_Train_API_Spec_v1.7.pdf). No key required.
 * One call per (line, station) pair — the API has no multi-line query, unlike Vienna's
 * multi-stopId monitor request. A multi-line station (e.g. Admiralty: TWL x ISL x SIL x EAL, or
 * Hong Kong/Kowloon/Tsing Yi: TCL x AEL, or Sunny Bay: TCL x DRL) makes one HTTP call per line
 * it serves, issued CONCURRENTLY within that one station request (Promise.all — capped at the
 * number of lines the station serves, max 4, since no station serves more) — this was sequential
 * through 27 Sep 2026, which put Admiralty's board (four lines) at 3.3-3.8s; see
 * docs/jim-brief-hong-kong-hub-latency.md. Deliberately still no cross-station parallelism: only
 * the lines of the one station being requested fire together. Any one line's failure still
 * rejects the whole board fetch (Promise.all semantics) exactly as the old sequential loop did —
 * never a silent empty direction for a failed line.
 *
 * Response shapes verified LIVE this session (docs/hong-kong-d1/jim-handoff.md):
 *  - success: {"status":1,"message":"successful","isdelay":"N","data":{"<LINE>-<STA>":{"UP":[...],"DOWN":[...]}}}
 *  - data absence (station open, no live trains right now): status:1 but isdelay:"Y" and the
 *    data block carries no UP/DOWN arrays at all (spec p.9) — never rendered as a silent empty
 *    board; explicitly thrown.
 *  - NT-301 "Please type the line-station" (bad/missing line+sta combo):
 *    {"resultCode":0,"status":0,"error":{"errorCode":"NT-301","errorMsg":"..."}}
 *  - NT-205 "<LINE> line is disabled in CMS" (a whole line temporarily off, e.g. DRL confirmed
 *    live outside Disneyland park operating hours, 2026-09-27 08:38 HKT):
 *    {"resultCode":0,"status":0,"error":{"errorCode":"NT-205","errorMsg":"..."}}
 *  - the v1.7 spec PDF's own documented shapes for "special train service arrangements" and a
 *    single-station suspension ({"status":0,"message":"..."}, no errorCode) — same status:0
 *    generic handling covers these too, since every one of these is `status !== 1`.
 * All of the above are explicit, propagated failures — parseScheduleResponse() never returns a
 * silently-empty board for any of them.
 *
 * v1 scope (docs/hong-kong-d1/hazard-pack.md, direction-model-memo.md, oracle-clash-report.md):
 * eight urban heavy-rail lines, 95 unique official EN station names. Board eligibility
 * (oracle-clash-report.md's "Board eligibility" section, Tim's decision 27 Sep 2026, appended to
 * the D1 pack after the hazard pack/direction memo were written — it SUPERSEDES their "no Airport
 * Express / no Disneyland Resort in v1" line) adds two restricted product lines: Airport Express
 * (AEL) at Hong Kong/Kowloon/Tsing Yi only, and Disneyland Resort Line (DRL) at Sunny Bay only.
 * Light Rail, High Speed Rail, MTR Bus, Peak Tram, Star Ferry, Ngong Ping 360 all stay fully
 * out-mode/out-of-catalog. Airport, AsiaWorld-Expo and Disneyland Resort stations themselves are
 * NOT in the catalog — AEL/DRL trains toward them show as text destinations
 * ("Airport / AsiaWorld-Expo", "Disneyland Resort") from their in-catalog boarding stations only,
 * never as a station a rider can pick a board for.
 *
 * Hub lock: Admiralty (TWL x ISL x SIL x EAL, spec ADM) — never a direction token. See
 * lib/cities/hong-kong/marketing-directions.js for the "line + terminus" direction model, the
 * dest-code -> printed-terminus table (DEST_CODE_TO_TERMINUS), and doNotGroup guards.
 */

import {
  DEST_CODE_TO_TERMINUS,
  LINE_FAMILY,
  METRO_HUB,
  marketingLabel,
  marketingLabelsForStation,
  listCatalogStations as listMarketingCatalogStations,
  resolveCatalogEntry as resolveMarketingCatalogEntry,
  resolveTerminusFromDestCode,
} from "../cities/hong-kong/marketing-directions.js";
import { FeedUnavailableError, feedUnavailableForError } from "./gtfs/errors.js";

export { METRO_HUB, DEST_CODE_TO_TERMINUS, LINE_FAMILY, marketingLabelsForStation };

export const HONG_KONG_TIMEZONE = "Asia/Hong_Kong";
export const MTR_NEXT_TRAIN_URL = "https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php";

/**
 * Extends FeedUnavailableError (not a bare Error) since 28 Sep 2026
 * (docs/jim-brief-feed-unavailable-bespoke-adapters.md) — every case this is thrown for (a
 * non-2xx REST response, a data.gov.hk gateway error like NT-301/NT-205, "isdelay":"Y" data
 * absence) means this station/line's board can't be built right now, and api/board.js's
 * partial-board fan-out must be able to tell that apart from a genuine bug via `instanceof
 * FeedUnavailableError` without special-casing MtrScheduleError by name.
 */
export class MtrScheduleError extends FeedUnavailableError {
  constructor(message, { errorCode, status = null, retryAfterMs = null, cause = null } = {}) {
    super({ message, status, retryAfterMs, cause });
    this.name = "MtrScheduleError";
    this.errorCode = errorCode;
  }
}

export function listCatalogStations() {
  return listMarketingCatalogStations();
}

/** Re-exported so callers/tests use one resolver (marketing-directions.js owns the data), same
 * pattern as lib/providers/vienna.js / lib/providers/washington.js. */
export function resolveCatalogEntry(stationIdOrName) {
  return resolveMarketingCatalogEntry(stationIdOrName);
}

/** Builds one (line, station) request URL. Exported for tests — never call the live endpoint
 * from a QA gate; use a captured fixture / synthetic body instead. */
export function buildScheduleUrl(lineCode, staCode) {
  const url = new URL(MTR_NEXT_TRAIN_URL);
  url.searchParams.set("line", String(lineCode || ""));
  url.searchParams.set("sta", String(staCode || ""));
  return url.toString();
}

async function fetchScheduleJson(lineCode, staCode) {
  let response;
  try {
    response = await fetch(buildScheduleUrl(lineCode, staCode));
  } catch (error) {
    throw feedUnavailableForError(
      error,
      `MTR Next Train REST request failed for ${lineCode}-${staCode}: ${error?.message ?? error}`
    );
  }
  if (!response.ok) {
    throw new MtrScheduleError(
      `MTR Next Train REST request failed for ${lineCode}-${staCode}: HTTP ${response.status}`,
      { status: response.status }
    );
  }
  try {
    return await response.json();
  } catch (error) {
    throw feedUnavailableForError(
      error,
      `MTR Next Train REST response for ${lineCode}-${staCode} was not parseable JSON`
    );
  }
}

/**
 * Validates one getSchedule.php response body for one (lineCode, staCode) pair and returns its
 * `data["<LINE>-<STA>"]` block, or throws — never silently returns an empty/synthetic board.
 * Covers both status:0 shapes seen live (the data.gov.hk gateway's {resultCode,error:{errorCode,
 * errorMsg}} wrapper for NT-301/NT-205, and the v1.7 spec's own bare {status:0,message,...} shape
 * for special-train-arrangement/station-suspension cases) plus the "isdelay":"Y" data-absence
 * case, which is status:1 but carries no UP/DOWN arrays at all.
 */
export function parseScheduleResponse(body, lineCode, staCode) {
  if (body?.status !== 1) {
    const message = body?.error?.errorMsg ?? body?.message ?? "Unknown MTR Next Train error";
    const errorCode = body?.error?.errorCode;
    throw new MtrScheduleError(
      `MTR Next Train REST error for ${lineCode}-${staCode}${errorCode ? ` (${errorCode})` : ""}: ${message}`,
      { errorCode }
    );
  }
  const key = `${lineCode}-${staCode}`;
  const entry = body?.data?.[key];
  if (!entry) {
    throw new MtrScheduleError(`MTR Next Train REST returned no data block for ${key}`);
  }
  if (body?.isdelay === "Y") {
    throw new MtrScheduleError(
      `MTR Next Train REST has no live departures for ${key} right now (isdelay=Y, data absence)`
    );
  }
  return entry;
}

/**
 * Normalizes one raw UP/DOWN departure row into a ProviderTrip, or null when the row must be
 * dropped (invalid, no time). `now` is unused (kept for signature symmetry with other adapters)
 * — the feed's own `time` is always used, never a computed one.
 */
export function mapScheduleEntryToTrip(rawTrip, lineCode) {
  if (rawTrip?.valid !== "Y") {
    return null;
  }
  const rawTime = rawTrip?.time;
  if (!rawTime) {
    return null;
  }
  // Asia/Hong_Kong has no DST (hazard-pack.md H7) — the feed's "YYYY-MM-DD HH:MM:SS" is always
  // HKT, a fixed +08:00 offset.
  const iso = `${String(rawTime).trim().replace(" ", "T")}+08:00`;
  const liveDeparture = new Date(iso);
  if (Number.isNaN(liveDeparture.getTime())) {
    return null;
  }
  const terminus = resolveTerminusFromDestCode(lineCode, rawTrip?.dest);
  const destination = terminus ? marketingLabel(lineCode, terminus) : LINE_FAMILY[lineCode] ?? String(lineCode);
  const displayTime = liveDeparture.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: HONG_KONG_TIMEZONE,
  });

  return {
    liveDeparture: liveDeparture.toISOString(),
    // The Next Train REST has no separate scheduled-vs-live split (only one `time` field) —
    // unlike Vienna's timePlanned/timeReal, so scheduled === live here.
    scheduledDeparture: liveDeparture.toISOString(),
    displayTime,
    scheduledDisplayTime: displayTime,
    platform: rawTrip?.plat != null ? String(rawTrip.plat) : undefined,
    destination,
    lineId: lineCode,
    cancelled: false,
  };
}

/** Flattens one line's UP+DOWN arrays into ProviderTrips. */
export function tripsFromScheduleEntry(entry, lineCode) {
  const trips = [];
  for (const direction of ["UP", "DOWN"]) {
    for (const rawTrip of entry?.[direction] ?? []) {
      const trip = mapScheduleEntryToTrip(rawTrip, lineCode);
      if (trip) {
        trips.push(trip);
      }
    }
  }
  return trips;
}

/**
 * @param {string} stationIdOrName Catalog name or documented alias (lib/cities/hong-kong/stations.json)
 * @param {object} [options]
 * @param {Record<string, object>} [options.entries] Test seam — pre-parsed `{lineCode: dataBlock}`
 *   map (already past parseScheduleResponse), skipping the live REST call entirely.
 * @param {Record<string, object>} [options.rawBodies] Test seam — pre-fetched `{lineCode: rawBody}`
 *   map, still run through parseScheduleResponse (so its status:0/isdelay error handling is
 *   exercised without any network call — used by qa/hong-kong-dogfood-gate.mjs).
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  if (!catalogEntry) {
    throw new Error(`Unknown Hong Kong station: ${stationIdOrName}`);
  }
  const staCode = catalogEntry.siteId ?? catalogEntry.codes?.[0];
  if (!staCode) {
    throw new Error(`Unknown Hong Kong station code: ${stationIdOrName}`);
  }
  const lineCodes = options.lineCodes ?? catalogEntry.lines ?? [];
  if (!lineCodes.length) {
    throw new Error(`No MTR line serves ${stationIdOrName}`);
  }

  // One (line, station) request per line this station serves, issued CONCURRENTLY (capped at
  // the station's own line count, max 4 — never cross-station). Promise.all preserves the old
  // sequential loop's failure semantics: any one line's rejection rejects the whole board fetch,
  // so a failed line is never silently dropped or rendered as an empty direction.
  const entries = await Promise.all(
    lineCodes.map(async (lineCode) => {
      if (options.entries && Object.prototype.hasOwnProperty.call(options.entries, lineCode)) {
        return options.entries[lineCode];
      }
      if (options.rawBodies && Object.prototype.hasOwnProperty.call(options.rawBodies, lineCode)) {
        return parseScheduleResponse(options.rawBodies[lineCode], lineCode, staCode);
      }
      return parseScheduleResponse(await fetchScheduleJson(lineCode, staCode), lineCode, staCode);
    })
  );

  const trips = [];
  lineCodes.forEach((lineCode, index) => {
    trips.push(...tripsFromScheduleEntry(entries[index], lineCode));
  });

  return {
    stationName: catalogEntry.name,
    lastUpdate: new Date().toISOString(),
    trips,
    realtime: "live",
  };
}
