/**
 * Prague (PID Metro A/B/C, operator DPP) provider — Golemio PID Departure Boards API, a
 * proprietary JSON board (NOT GTFS-RT protobuf). Adapter ready; city remains `planned` in the
 * registry (not live) — see docs/prague-d1/jim-handoff.md. v1 scope is Metro A/B/C only — no
 * Line D (under construction, no passenger service until 2031-2032 earliest), no tram, bus,
 * trolleybus, funicular, regional rail (Esko), ferries (docs/prague-d1/published-network.json
 * coverageGaps).
 *
 * LIVE BOARDS ONLY — no static-GTFS/schedule fallback, same posture as lib/providers/vienna.js,
 * bart.js, washington.js. fetchStationBoard() propagates any fetch/parse failure rather than
 * returning an empty or synthetic board. GOLEMIO_API_KEY unset -> MissingGolemioApiKeyError
 * (lib/providers/gtfs/auth.js), never a silent fallback.
 *
 * Feed: Golemio PID Departure Boards (v2) — confirmed 28 Sep 2026 against the live OpenAPI spec
 * at https://api.golemio.cz/pid/docs/openapi/ (served from
 * https://api.golemio.cz/docs/static/vp-output-gateway/openapi.json):
 *   GET https://api.golemio.cz/v2/pid/departureboards?ids[]=<stop_id>[&ids[]=<stop_id>...]
 *   Header: X-Access-Token: <GOLEMIO_API_KEY>
 *   `ids` is the GTFS stop_id (e.g. "U400Z101P") — up to 100 stops combined in one request.
 *   `mode=departures` (default) excludes trips for which the queried stop is the final stop, so
 *   a terminus station's board never needs an extra self-terminus filter here (see
 *   lib/cities/prague/marketing-directions.js's isTerminatingAtStation, kept as a
 *   belt-and-braces guard, not the primary defence).
 *   Rate limit: 20 requests / 8 seconds per key (Golemio OpenAPI spec's "Requests rate" note).
 * Response shape: `{ stops: [...], departures: [{ route: { short_name, type, ... }, trip: {
 *   headsign, id, is_canceled, ... }, stop: { id, platform_code }, departure_timestamp: {
 *   predicted, scheduled, minutes }, delay: {...}, last_stop: {...} }], infotexts: [...] }`.
 *   `route.type` is the GTFS route_type (1 = metro) — every departure is filtered on
 *   `route.type === 1` as a defence-in-depth check even though the queried stop_ids are already
 *   metro-only platforms (lib/cities/prague/stations.json), same "never trust the network
 *   response alone" posture as lib/providers/vienna.js's tripsFromMonitors line-type filter.
 *
 * Static PID GTFS (https://data.pid.cz/PID_GTFS.zip, ~48MB zipped, verified live 200 anonymous)
 * is used at D2 to resolve the D1 station roster's names to GTFS stop_id — the resolved stop_ids
 * are baked directly into lib/cities/prague/stations.json (same "resolve once at D2, store the
 * result" pattern as lib/cities/vienna/stations.json's `rbl` arrays), never bundled and never a
 * schedule fallback for board CONTENT. It was trimmed to metro-only (route_type 1) by
 * scripts/trim-prague-gtfs.mjs, committed at qa/fixtures/prague/gtfs (small enough, ~4MB, to
 * commit directly — unlike Auckland/Wellington's larger feeds), and published to the
 * next-train-gtfs Vercel Blob store (gtfs/prague.zip) for provenance/reproducibility.
 *
 * Since docs/jim-brief-prague-flora-sweep-empty-state.md (28 Sep 2026), this adapter ALSO loads
 * that same trimmed snapshot at runtime (loadPragueStatic(), cached, same loadGtfsStatic()
 * pattern as lib/providers/dublin.js) for exactly one purpose: honest empty-state detection.
 * When Golemio's live board returns zero trips, computeScheduledCandidates() checks whether the
 * static schedule expects any metro trip at this stop within the near-term horizon; if it does,
 * `emptyReason: "no-live-predictions"` is set (a live-feed gap, not "no service" — mirrors
 * Dublin's precedent, docs/jim-brief-dublin-honest-empty-state.md) rather than silently showing
 * a blank board. This static load is best-effort and non-fatal: any failure (stale calendar,
 * network, missing blob) is swallowed and just means emptyReason is omitted — it must never turn
 * a working live board into a thrown error, and it never supplies board content itself.
 *
 * Flora finding (28 Sep 2026, docs/jim-brief-prague-flora-sweep-empty-state.md, appending
 * docs/prague-d1/jim-handoff.md's original D2 note): Flora (Metro A, between Jiřího z Poděbrad
 * and Želivského) was investigated further and confirmed — via a fresh direct dump of PID's live
 * GTFS zip AND Mark's 9/9 clean live Golemio polls — to have a real, current zero-service gap,
 * not a stop-id mapping bug: Flora's own parent (U118S1) and platform (U118Z101P/U118Z102P)
 * stop_ids resolve correctly by exact name match against the live feed, but literally zero metro
 * stop_times (any day in the current 2-week-valid PID snapshot) reference them — every Line A
 * trip runs Jiřího z Poděbrad -> Želivského directly, skipping it. This is the same shape as
 * Dublin's Connolly/Saggart (a confirmed, current gap, not a fixable id).
 *
 * Not-currently-served (28 Sep 2026, docs/jim-brief-prague-line-c-closure.md, supersedes Flora's
 * catalog-removal treatment above): Mark's QA found Budějovická/Kačerov/Pankrác/Roztyly (Line C,
 * consecutive) empty on 18/18 live polls across two independent runs; a fresh PID GTFS dump traced
 * this to a real, temporary, dated closure — DPP's "Omezení a mimořádné události" notice records
 * Metro C bidirectionally suspended Pražského povstání–Chodov from Sat 26 Sep 2026 04:30 to Mon
 * 28 Sep 2026 23:59 for track repair, replacement bus XC — matching exactly: every trip whose
 * stop_times reference these four stations' platform ids belongs to a service_id whose
 * calendar.txt start_date is 2026-09-29, i.e. the current feed period genuinely has zero
 * scheduled visits to them until service resumes. Rather than removing them from the catalog
 * (Flora's treatment, which would need a manual un-filter once PID's data changes back), these
 * four — and Flora, moved onto the same mechanism and restored to the catalog — instead carry an
 * optional `notServed: { since, until, reason, replacement }` field in
 * lib/cities/prague/stations.json (metadata/copy only) plus fully automatic detection: whenever
 * the live board is empty AND the near-term static horizon has nothing due either,
 * hasScheduledServiceToday() (lib/providers/gtfs/board.js) checks whether TODAY's active
 * calendar has any stop_time at all for this station, for the whole day, not just the next few
 * hours — the same check that would have caught this at the moment the closure's absence of
 * service_ids for today took effect, and that will silently stop firing the moment the feed's
 * calendar shows this station served again (29 Sep 2026 for these four; Flora indefinitely,
 * since its stop_ids are excluded from every calendar day). No date is ever hardcoded in code —
 * `since`/`until` in stations.json are for humans re-reading the file, not inputs to the check.
 * `emptyReason: "not-currently-served"` (distinct from `"no-live-predictions"`, which means the
 * schedule expects a trip very soon but the live feed is momentarily silent) is set with a
 * `notServedMessage` built from the station's `notServed` copy — see formatNotServedMessage().
 *
 * Direction labels: line + terminus (e.g. "A + Depo Hostivař", "C + Letňany"), per
 * docs/prague-d1/direction-model-memo.md §3 recommendation A. Muzeum (hub lock, A x C) never
 * appears as a direction token; Můstek (A x B) and Florenc (B x C) are the other two vertices of
 * the interchange triangle, doNotGroup against Muzeum and each other
 * (lib/cities/prague/marketing-directions.js).
 *
 * Diacritics are load-bearing (hazard-pack.md) — station names/headsigns are matched with full
 * diacritics intact; see marketing-directions.js's file header for why its foldKey() does NOT
 * strip combining marks, unlike every other city in this repo.
 */

import { golemioAuthHeaders, readGolemioApiKey } from "./gtfs/auth.js";
import { loadGtfsStatic } from "./gtfs/static-cache.js";
import { gtfsFixtureBlobUrl } from "./gtfs/blob-fixtures.js";
import {
  buildBoardForStops,
  findNextServiceDate,
  hasScheduledServiceToday,
  NEAR_HORIZON_MINUTES,
} from "./gtfs/board.js";
import {
  PRAGUE_HUB,
  PRAGUE_TIME_ZONE,
  GOLEMIO_ROUTE_SHORT_NAME_TO_LINE,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  isTerminatingAtStation,
  LINE_LABELS,
  LINE_TERMINI,
  listCatalogStations as listMarketingCatalogStations,
  mapLineTerminusDestination,
  resolveCatalogEntry as resolveMarketingCatalogEntry,
} from "../cities/prague/marketing-directions.js";

export {
  PRAGUE_HUB,
  LINE_LABELS,
  LINE_TERMINI,
  GOLEMIO_ROUTE_SHORT_NAME_TO_LINE,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
};
export const PRAGUE_TIMEZONE = PRAGUE_TIME_ZONE;

export const GOLEMIO_DEPARTURE_BOARDS_URL = "https://api.golemio.cz/v2/pid/departureboards";
const METRO_ROUTE_TYPE = 1;

export function listCatalogStations() {
  return listMarketingCatalogStations();
}

/** Re-exported so callers/tests use one resolver (marketing-directions.js owns the data),
 * same pattern as lib/providers/washington.js / lib/providers/vienna.js. */
export function resolveCatalogEntry(stationIdOrName) {
  return resolveMarketingCatalogEntry(stationIdOrName);
}

/**
 * Builds the departure-boards request URL for one or more GTFS stop_ids. Exported for tests —
 * never call the live endpoint from a QA gate; use a captured/synthetic fixture instead.
 * `minutesAfter` widens the default 180-minute window is left at the API default; `mode` is left
 * at its "departures" default (per file header, this is what avoids returning arrival-only rows
 * at a terminus).
 */
export function buildDepartureBoardsUrl(stopIds) {
  const url = new URL(GOLEMIO_DEPARTURE_BOARDS_URL);
  for (const id of Array.isArray(stopIds) ? stopIds : [stopIds]) {
    url.searchParams.append("ids[]", String(id));
  }
  return url.toString();
}

/**
 * Exported so qa/prague-all-stations-live-sweep.mjs can batch many stations' stop_ids into one
 * request (Golemio accepts up to 100 `ids[]` per call, per file header) instead of reimplementing
 * this fetch — same "reuse, don't fork" reasoning as the rest of this adapter. A non-OK response
 * throws with `.status` and `.retryAfterMs` (parsed from a `Retry-After` header, seconds -> ms,
 * or null when absent) attached, so a caller can distinguish and honour a 429 without re-parsing
 * headers itself.
 */
export async function fetchDepartureBoardsJson(stopIds, apiKey) {
  const headers = golemioAuthHeaders(apiKey ?? readGolemioApiKey());
  const response = await fetch(buildDepartureBoardsUrl(stopIds), { headers });
  if (!response.ok) {
    const error = new Error(
      `Golemio PID Departure Boards request failed for stop_id(s) ${stopIds.join(",")}: HTTP ${response.status}`
    );
    error.status = response.status;
    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterSec = retryAfterHeader != null ? Number(retryAfterHeader) : NaN;
    error.retryAfterMs = Number.isFinite(retryAfterSec) ? Math.max(0, retryAfterSec * 1000) : null;
    throw error;
  }
  const body = await response.json();
  return Array.isArray(body?.departures) ? body.departures : [];
}

function formatClock(date, timeZone) {
  return date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  });
}

/**
 * Normalizes one departure-boards `departures[]` entry into a ProviderTrip, or null when the row
 * must be dropped — either it isn't a metro route (route.type !== 1, belt-and-braces per the
 * file header) or its route.short_name isn't one of the three known lines. `stationName` is used
 * for the self-terminus guard (Dublin #484 lesson): a departure whose resolved/raw destination
 * equals the station being viewed is an arrival, not a boardable direction, and is dropped.
 */
export function mapDepartureToTrip(departure, stationName, now = new Date()) {
  const route = departure?.route ?? {};
  if (Number(route.type) !== METRO_ROUTE_TYPE) {
    return null;
  }
  const lineId = GOLEMIO_ROUTE_SHORT_NAME_TO_LINE[String(route.short_name ?? "").trim()] ?? null;
  if (!lineId) {
    return null;
  }

  const headsign = departure?.trip?.headsign;
  if (isTerminatingAtStation(headsign, stationName)) {
    return null;
  }

  const stopTime = departure?.departure_timestamp ?? {};
  const iso = stopTime.predicted ?? stopTime.scheduled;
  if (!iso) {
    return null;
  }
  const liveDeparture = new Date(iso);
  if (Number.isNaN(liveDeparture.getTime())) {
    return null;
  }
  const scheduledIso = stopTime.scheduled ?? iso;
  const scheduledDeparture = new Date(scheduledIso);
  const displayTime = formatClock(liveDeparture, PRAGUE_TIME_ZONE);
  const scheduledDisplayTime = formatClock(
    Number.isNaN(scheduledDeparture.getTime()) ? liveDeparture : scheduledDeparture,
    PRAGUE_TIME_ZONE
  );

  return {
    liveDeparture: liveDeparture.toISOString(),
    scheduledDeparture: (Number.isNaN(scheduledDeparture.getTime())
      ? liveDeparture
      : scheduledDeparture
    ).toISOString(),
    displayTime,
    scheduledDisplayTime,
    platform: departure?.stop?.platform_code != null ? String(departure.stop.platform_code) : undefined,
    destination: mapLineTerminusDestination(headsign, lineId),
    lineId,
    cancelled: Boolean(departure?.trip?.is_canceled),
  };
}

/**
 * Flattens the departure-boards response's `departures[]` into ProviderTrips, dropping any row
 * that isn't a confirmed metro trip for one of the three known lines, or that terminates at the
 * station being viewed.
 */
export function tripsFromDepartures(departures, stationName, now = new Date()) {
  const trips = [];
  for (const departure of departures ?? []) {
    const trip = mapDepartureToTrip(departure, stationName, now);
    if (trip) {
      trips.push(trip);
    }
  }
  return trips;
}

const EMPTY_REALTIME_INDEX = { stopUpdates: new Map(), tripDelaySec: new Map(), cancelledTrips: new Set() };

export async function loadPragueStatic() {
  return loadGtfsStatic({
    url: gtfsFixtureBlobUrl("prague"),
    timeZone: PRAGUE_TIME_ZONE,
    ifModifiedSince: true,
  });
}

/**
 * Maps a raw GTFS-shaped scheduled row (from buildBoardForStops, static schedule only, no RT
 * overlay) into the same "Line + Terminus" marketing-trip shape live departures end up in
 * (mapDepartureToTrip), so honest-empty-state direction comparisons (tripMatchesMarketingChip)
 * work identically for both live and scheduled-only trips. Drops a row for an unclassifiable
 * route (not one of the three known lines) or one that terminates at the station being viewed —
 * same guards as mapDepartureToTrip. Exported for qa/prague-dogfood-gate.mjs.
 */
export function mapScheduledCandidateToTrip(candidate, stationName) {
  const lineId = GOLEMIO_ROUTE_SHORT_NAME_TO_LINE[String(candidate?.routeShortName ?? "").trim()] ?? null;
  if (!lineId) {
    return null;
  }
  const headsign = String(candidate?.stopHeadsign || candidate?.destination || "").trim();
  if (isTerminatingAtStation(headsign, stationName)) {
    return null;
  }
  return {
    ...candidate,
    lineId,
    destination: mapLineTerminusDestination(headsign, lineId),
  };
}

/**
 * Best-effort, non-fatal honest-empty-state signal (docs/jim-brief-prague-flora-sweep-empty-state.md):
 * what the static schedule expects at these stop_ids within the near-term horizon, independent of
 * whether Golemio's live feed confirmed any of it. Returns null — never an empty array — when the
 * static snapshot can't be loaded/used right now (stale calendar per checkSnapshotFreshness, blob
 * 404, network error): callers must treat null as "unknown", not as "genuinely nothing scheduled".
 * This is a side-computation only — a failure here must never turn a working live board (Golemio
 * already answered) into a thrown error, and it never supplies board content itself (file header).
 */
async function computeScheduledCandidates(stopIds, stationName, now, horizonMinutes) {
  try {
    const staticData = await loadPragueStatic();
    const rawCandidates = buildBoardForStops({
      stopIds,
      staticData,
      realtimeIndex: EMPTY_REALTIME_INDEX,
      timeZone: PRAGUE_TIME_ZONE,
      now,
      horizonMinutes: horizonMinutes ?? NEAR_HORIZON_MINUTES,
      cityId: "prague",
      skipResolvedShareCheck: true,
    });
    const mapped = [];
    for (const candidate of rawCandidates) {
      const trip = mapScheduledCandidateToTrip(candidate, stationName);
      if (trip) {
        mapped.push(trip);
      }
    }
    return mapped;
  } catch {
    return null;
  }
}

/**
 * Best-effort, non-fatal "does today's static calendar expect ANY trip at this station at all"
 * check (docs/jim-brief-prague-line-c-closure.md) — see gtfs/board.js's hasScheduledServiceToday
 * for why a full calendar day, not a near-term horizon, is what safely distinguishes a genuine
 * station-wide closure from an ordinary gap between trains or the network's own overnight
 * downtime. Returns null (never true/false) when the static snapshot can't be loaded/used right
 * now, same "unknown, not empty" contract as computeScheduledCandidates — a failure here must
 * never turn a working live board into a thrown error or a misleading verdict.
 */
async function computeNotServedToday(stopIds, now) {
  try {
    const staticData = await loadPragueStatic();
    return !hasScheduledServiceToday({ stopIds, staticData, timeZone: PRAGUE_TIME_ZONE, now });
  } catch {
    return null;
  }
}

/**
 * Rider-facing copy for a station flagged `notServed` in lib/cities/prague/stations.json
 * (docs/jim-brief-prague-line-c-closure.md) — the JSON entry supplies the human-authored reason
 * and replacement-transport text (already mode-aware, e.g. "replacement bus XC runs..." vs
 * "nearby trams connect instead..."); this just assembles the one sentence shown in place of a
 * blank board. `since`/`until` are metadata for whoever reads stations.json next, not rendered
 * here — the *decision* to show this message at all comes from computeNotServedToday's live
 * feed check, not from comparing today's date against `until`, so a stale `until` (a closure that
 * ran long, or one that lifted early) never produces stale rider copy.
 */
export function formatNotServedMessage(notServed) {
  if (!notServed || typeof notServed !== "object") {
    return "No metro service at this station at the moment.";
  }
  const reasonPart = notServed.reason ? ` — ${notServed.reason}` : "";
  const replacementPart = notServed.replacement ? `; ${notServed.replacement}` : "";
  return `No metro service at this station at the moment${reasonPart}${replacementPart}.`;
}

/**
 * @param {string} stationIdOrName Catalog name or documented alias (lib/cities/prague/stations.json)
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  if (!catalogEntry) {
    throw new Error(`Unknown Prague station: ${stationIdOrName}`);
  }

  const stopIds = options.stopIds ?? catalogEntry.stopIds ?? [];
  if (!stopIds.length) {
    throw new Error(`Unknown Prague station: ${stationIdOrName}`);
  }

  const now = options.now ?? new Date();
  const departures =
    options.departures ?? (await fetchDepartureBoardsJson(stopIds, options.apiKey));
  const trips = tripsFromDepartures(departures, catalogEntry.name, now);

  // Honest empty state (docs/jim-brief-prague-flora-sweep-empty-state.md, extended by
  // docs/jim-brief-prague-line-c-closure.md): only computed when the live board is empty, and
  // only ever additive (never changes `trips`). `options.scheduledCandidates`/`options.notServedToday`
  // let tests supply a synthetic static schedule without any network call, same as
  // `options.departures` above for the live side.
  let emptyReason = null;
  let notServedMessage = null;
  let scheduledCandidates = null;
  if (trips.length === 0) {
    scheduledCandidates =
      "scheduledCandidates" in options
        ? options.scheduledCandidates
        : await computeScheduledCandidates(stopIds, catalogEntry.name, now, options.horizonMinutes);
    if (Array.isArray(scheduledCandidates) && scheduledCandidates.length > 0) {
      emptyReason = "no-live-predictions";
    } else {
      // Nothing due soon per the near-term horizon either — before leaving this as a plain,
      // unexplained empty board (a normal off-peak/overnight gap), check whether today's
      // calendar expects ANY trip here at all. A station mid-closure (Flora; the four Line C
      // stations for as long as the current section closure's service_ids stay excluded from
      // today's calendar) has zero, day-wide — everything else, including a legitimate lull
      // between scheduled trains, has at least one somewhere in the day and falls through with
      // no reason, same as before this brief.
      const notServedToday =
        "notServedToday" in options ? options.notServedToday : await computeNotServedToday(stopIds, now);
      if (notServedToday === true) {
        emptyReason = "not-currently-served";
        notServedMessage = formatNotServedMessage(catalogEntry.notServed);
      }
    }
  }

  return {
    stationName: catalogEntry.name,
    lastUpdate: new Date().toISOString(),
    trips,
    scheduledCandidates: Array.isArray(scheduledCandidates) ? scheduledCandidates : [],
    realtime: "live",
    emptyReason,
    notServedMessage,
  };
}
