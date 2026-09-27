/**
 * Vienna (Wiener Linien U-Bahn) — U1/U2/U3/U4/U6 heavy metro only, via the Wiener Linien OGD
 * Realtime Monitor. Adapter ready; city remains `planned` (not live) — see
 * docs/vienna-d1/jim-handoff.md. assertCityLive("vienna") must still fail until Tim flips the
 * registry entry.
 *
 * LIVE BOARDS ONLY — no static-GTFS/schedule fallback. Tim's rule for this city (same posture as
 * lib/providers/bart.js and lib/providers/washington.js): no live times, no board; never a
 * silent timetable fallback. fetchStationBoard() propagates any monitor fetch/parse failure
 * rather than returning an empty or synthetic board. A prior "planned" adapter for this city
 * (closed PR #289, git ref origin/pr-289) shipped a static-GTFS schedule-only board
 * (`realtime: false`) — that shape is deliberately NOT reused here; it violates this session's
 * live-boards-only instruction and predates it.
 *
 * Feed: Wiener Linien OGD Realtime Monitor (proprietary JSON, NOT GTFS-RT protobuf) —
 * GET https://www.wienerlinien.at/ogd_realtime/monitor?stopId=<RBL>[&stopId=<RBL>...]
 * (docs: https://www.wienerlinien.at/ogd_realtime/doku/ogd/wienerlinien-echtzeitdaten-dokumentation.pdf).
 * No key required. The documented `SENDER` parameter is deliberately omitted (per the official
 * docs, "ignore/remove it" — never sent by this adapter). Multiple `stopId` params in one request
 * are supported and is how a multi-platform station (e.g. Karlsplatz's five U1/U2/U4 platform
 * RBLs) gets a single merged board from one HTTP call.
 *
 * `stopId` is Wiener Linien's RBL number, NOT the GTFS static stop_id and NOT the DIVA station
 * code — lib/cities/vienna/stations.json's `rbl` array per station was resolved and LIVE-VERIFIED
 * against the real monitor endpoint this session (all 99 stations, every line, confirmed — see
 * docs/vienna-d1/jim-handoff.md's appended "Live verification" section for the method and
 * evidence). RBL candidates were derived from Wiener Linien's own public
 * wienerlinien-ogd-haltepunkte.csv (StopID;DIVA;StopText — a keyless static reference download,
 * not a live endpoint) by folded-name match against each of the 99 D1 station names/aliases, then
 * every candidate was queried against the live monitor and kept only when the response's own
 * `lines[].type === "ptMetro"` and `lines[].name` matched that station's expected U-Bahn line(s)
 * — this is what filters out the tram/bus/night-bus rows the monitor also returns at shared-name
 * stops (e.g. Karlsplatz's WLB tram rows, N46/N62 night buses), per the oracle report's mode cut.
 *
 * v1 scope (docs/vienna-d1/hazard-pack.md, direction-model-memo.md, oracle-clash-report.md):
 * U-Bahn heavy metro only — U1, U2, U3, U4, U6 (99 unique stations). U5 excluded (construction,
 * service opens 2030). No S-Bahn, no Badner Bahn (Wiener Lokalbahnen), no ÖBB national rail, no
 * tram, no bus — all out-product/out-mode per the oracle report's Board eligibility section
 * (re-confirmed live this session: every RBL whose response line `type` wasn't `ptMetro`, or
 * whose `name` wasn't one of U1/U2/U3/U4/U6, was excluded from the catalog's rbl arrays).
 *
 * Hub lock: Karlsplatz (U1 x U2 x U4). U1 and U4 are through-stations there; U2 *terminates*
 * there (its own printed southern terminus) — a different hub shape from every prior city's hub
 * lock. See lib/cities/vienna/marketing-directions.js for how this changes U2's direction chip
 * (only `U2 + Seestadt` is ever synthesized; Karlsplatz is never a direction token for any line).
 * Independently reconfirmed live: Karlsplatz's catalog RBL list carries exactly one U2 platform
 * (4202, monitor `towards: "Seestadt"`) against two each for U1/U4.
 */

import {
  VIENNA_HUB,
  VIENNA_TIME_ZONE,
  WIENER_LINIEN_LINE_NAME_TO_LINE,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  LINE_LABELS,
  LINE_TERMINI,
  listCatalogStations as listMarketingCatalogStations,
  mapLineTerminusDestination,
  resolveCatalogEntry as resolveMarketingCatalogEntry,
} from "../cities/vienna/marketing-directions.js";

export {
  VIENNA_HUB,
  LINE_LABELS,
  LINE_TERMINI,
  WIENER_LINIEN_LINE_NAME_TO_LINE,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
};
export const VIENNA_TIMEZONE = VIENNA_TIME_ZONE;

export const WIENER_LINIEN_MONITOR_URL = "https://www.wienerlinien.at/ogd_realtime/monitor";

export function listCatalogStations() {
  return listMarketingCatalogStations();
}

/** Re-exported so callers/tests use one resolver (marketing-directions.js owns the data),
 * same pattern as lib/providers/washington.js. */
export function resolveCatalogEntry(stationIdOrName) {
  return resolveMarketingCatalogEntry(stationIdOrName);
}

/** Builds the monitor request URL for one or more RBL stopIds. Exported for tests — never call
 * the live endpoint from a QA gate; use a captured fixture instead. Deliberately never sets
 * `SENDER` (official docs say to ignore/omit it). */
export function buildMonitorUrl(rblIds) {
  const url = new URL(WIENER_LINIEN_MONITOR_URL);
  for (const id of Array.isArray(rblIds) ? rblIds : [rblIds]) {
    url.searchParams.append("stopId", String(id));
  }
  return url.toString();
}

async function fetchMonitorJson(rblIds) {
  const response = await fetch(buildMonitorUrl(rblIds));
  if (!response.ok) {
    throw new Error(
      `Wiener Linien OGD Realtime Monitor request failed for stopId(s) ${rblIds.join(",")}: HTTP ${response.status}`
    );
  }
  const body = await response.json();
  const messageCode = body?.message?.messageCode;
  if (messageCode != null && messageCode !== 1) {
    // e.g. messageCode 316 "Abfragelimit erreicht!" (query limit reached) — never treat this as
    // an empty-but-valid board; propagate loudly instead of silently showing zero trips.
    throw new Error(
      `Wiener Linien OGD Realtime Monitor returned message ${messageCode} (${body?.message?.value}) for stopId(s) ${rblIds.join(",")}`
    );
  }
  return Array.isArray(body?.data?.monitors) ? body.data.monitors : [];
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
 * Normalizes one monitor `lines[].departures.departure[]` entry (plus its parent `lines[]` row's
 * `name`/`towards`) into a ProviderTrip, or null when the row must be dropped — belt-and-braces
 * against a tram/bus/night-bus/unexpected-line row ever reaching a rider even though the catalog's
 * rbl arrays were already filtered to confirmed U-Bahn platforms at D2 (see file header).
 * `now` is injectable for tests.
 */
export function mapMonitorDepartureToTrip(lineEntry, departure, now = new Date()) {
  const lineId = WIENER_LINIEN_LINE_NAME_TO_LINE[String(lineEntry?.name ?? "").trim()] ?? null;
  if (!lineId) {
    return null;
  }
  const timeReal = departure?.departureTime?.timeReal;
  const timePlanned = departure?.departureTime?.timePlanned;
  const iso = timeReal ?? timePlanned;
  if (!iso) {
    return null;
  }
  const liveDeparture = new Date(iso);
  if (Number.isNaN(liveDeparture.getTime())) {
    return null;
  }
  const scheduledIso = timePlanned ?? iso;
  const scheduledDeparture = new Date(scheduledIso);
  const displayTime = formatClock(liveDeparture, VIENNA_TIME_ZONE);
  const scheduledDisplayTime = formatClock(
    Number.isNaN(scheduledDeparture.getTime()) ? liveDeparture : scheduledDeparture,
    VIENNA_TIME_ZONE
  );

  return {
    liveDeparture: liveDeparture.toISOString(),
    scheduledDeparture: (Number.isNaN(scheduledDeparture.getTime())
      ? liveDeparture
      : scheduledDeparture
    ).toISOString(),
    displayTime,
    scheduledDisplayTime,
    platform: lineEntry?.platform != null ? String(lineEntry.platform) : undefined,
    destination: mapLineTerminusDestination(lineEntry?.towards, lineId),
    lineId,
    cancelled: false,
  };
}

/**
 * Flattens the monitor's `data.monitors[]` (one per RBL platform queried) into ProviderTrips,
 * dropping any row whose line isn't one of the five known U-Bahn lines (tram/bus/night-bus at a
 * shared-name stop, or an unexpected token) per the file header.
 */
export function tripsFromMonitors(monitors, now = new Date()) {
  const trips = [];
  for (const monitor of monitors ?? []) {
    for (const lineEntry of monitor?.lines ?? []) {
      const departures = lineEntry?.departures?.departure ?? [];
      for (const departure of departures) {
        const trip = mapMonitorDepartureToTrip(lineEntry, departure, now);
        if (trip) {
          trips.push(trip);
        }
      }
    }
  }
  return trips;
}

/**
 * @param {string} stationIdOrName Catalog name or documented alias (lib/cities/vienna/stations.json)
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  if (!catalogEntry) {
    throw new Error(`Unknown Vienna station: ${stationIdOrName}`);
  }

  const rblIds = options.rblIds ?? catalogEntry.rbl ?? [];
  if (!rblIds.length) {
    throw new Error(`Unknown Vienna station: ${stationIdOrName}`);
  }

  const monitors = options.monitors ?? (await fetchMonitorJson(rblIds));
  const trips = tripsFromMonitors(monitors, options.now);

  return {
    stationName: catalogEntry.name,
    lastUpdate: new Date().toISOString(),
    trips,
    realtime: "live",
  };
}
