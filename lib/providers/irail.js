/**
 * iRail liveboard (https://api.irail.be/liveboard/) — a shared, free, unauthenticated real-time
 * source for SNCB/NMBS domestic rail departures, used as a SECOND live source layered onto a
 * city's own primary provider at the specific stations where board-eligibility rules SNCB `in`
 * (docs/board-eligibility-rule.md) — first consumer: lib/providers/brussels.js at Gare Centrale /
 * Gare du Midi / Gare de l'Ouest (docs/brussels-d1/oracle-clash-report.md Board eligibility
 * section). Deliberately its own small module, not forked per city, so a future SNCB-adjacent
 * city (Antwerp, Charleroi, Ghent) reuses this file rather than copy-pasting a second fetch/cache
 * pipeline (CLAUDE.md's "reuse shared helpers, never fork" pattern already applied to gtfs/ptw).
 *
 * Etiquette: iRail asks for a descriptive User-Agent identifying the app (docs.irail.be) — set
 * below, never a browser UA string. No published numeric rate limit; this module caches
 * per-station with a conservative short TTL (same posture as Brussels' own BMC WaitingTimes cache
 * and Göteborg's Västtrafik cache) so a station with several riders open at once makes one iRail
 * call per window, not one per request.
 *
 * Vehicle classification (board-eligibility rule, docs/board-eligibility-rule.md): iRail's
 * `vehicleinfo.type` is NMBS/SNCB's own train-category code. IC/S/L/P/ICT are ordinary domestic
 * walk-up categories — always `in`. ICE is `in` per the oracle report (reservation optional
 * outside a short summer-peak window on the one Brussels-Cologne service, rule §6: optional
 * reservation is `in`). THA (Thalys)/TGV (TGV INOUI)/OUI (OUIGO)/NJ (Nightjet)/EN (European
 * Sleeper) are `out-reservation` — compulsory seat/bunk reservation. EUR (Eurostar) is
 * `out-checkin` — mandatory check-in/security/border control. Any type this module does not
 * recognise is dropped by default (classifySncbVehicleType returns "unmapped") rather than shown
 * — the safe failure direction for a walk-up/check-in test is "we didn't recognise it, so we
 * didn't show it", never the reverse. This exact type-code mapping has not been re-verified
 * against a fresh live capture in this pass (the 19 Sep 2026 live check that confirmed iRail
 * itself works was against Brussels-Central's ordinary IC/S traffic, not against an international
 * THA/EUR/TGV/OUI/NJ/EN departure) — same "confirm at D2 against a live payload" caveat Boston's
 * MBTA route_id mapping and Copenhagen's route-type regex both carry; a fresh live capture before
 * flip should double check these exact codes.
 */

export const IRAIL_LIVEBOARD_URL = "https://api.irail.be/liveboard/";

/** Descriptive User-Agent per iRail's etiquette (docs.irail.be) — never a browser UA string. */
export const IRAIL_USER_AGENT =
  "next-train-app/1.0 (+https://github.com/tdrevans-aus/next-train-app; live-departures rider app)";

/** No published numeric rate limit — conservative placeholder, same posture as Brussels' own BMC cache. */
export const IRAIL_CACHE_TTL_MS = 30_000;
const IRAIL_STALE_MAX_MS = 90_000;
export const IRAIL_FETCH_TIMEOUT_MS = 6000;

/**
 * The iRail liveboard call failed for a transient reason (HTTP error, timeout, malformed body).
 * Callers (e.g. lib/providers/brussels.js) catch this and degrade to a partial board — SNCB rows
 * omitted, the primary source's rows unaffected — never a hard refusal of the whole board, unlike
 * the primary source's own credential/availability errors.
 */
export class IrailUnavailableError extends Error {
  constructor(stationName, cause) {
    super(
      `iRail liveboard request failed for "${stationName}"${cause?.message ? `: ${cause.message}` : ""}`
    );
    this.name = "IrailUnavailableError";
    this.cause = cause;
  }
}

/** Ordinary domestic NMBS/SNCB walk-up categories, plus ICE (optional reservation, see file header). */
const IN_TYPES = new Set(["IC", "S", "L", "P", "ICT", "ICE"]);
/** Mandatory check-in/security/border control — Eurostar. */
const OUT_CHECKIN_TYPES = new Set(["EUR", "EST"]);
/** Compulsory seat/bunk reservation — Thalys, TGV INOUI, OUIGO, Nightjet, European Sleeper. */
const OUT_RESERVATION_TYPES = new Set(["THA", "TGV", "OUI", "OUIGO", "NJ", "NIGHTJET", "EN", "ES"]);

/**
 * @param {string} rawType iRail `vehicleinfo.type` (or a shortname-derived fallback)
 * @returns {"in"|"out-checkin"|"out-reservation"|"unmapped"}
 */
export function classifySncbVehicleType(rawType) {
  const type = String(rawType || "").trim().toUpperCase();
  if (IN_TYPES.has(type)) return "in";
  if (OUT_CHECKIN_TYPES.has(type)) return "out-checkin";
  if (OUT_RESERVATION_TYPES.has(type)) return "out-reservation";
  return "unmapped";
}

/** @param {string} rawType */
export function isSncbBoardEligible(rawType) {
  return classifySncbVehicleType(rawType) === "in";
}

/** iRail's `vehicleinfo.type` is the primary source; a shortname like "IC1832" (type + number,
 * with the number stripped) is a fallback for a malformed/missing `type` field. */
function vehicleTypeFromDeparture(departure) {
  const declared = departure?.vehicleinfo?.type;
  if (declared) return declared;
  const shortname = String(departure?.vehicleinfo?.shortname || "");
  const match = shortname.match(/^([A-Za-z]+)/);
  return match ? match[1] : "";
}

async function fetchIrailLiveboardRawUncached(irailStationName) {
  const url = `${IRAIL_LIVEBOARD_URL}?station=${encodeURIComponent(irailStationName)}&format=json&lang=en`;
  let response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": IRAIL_USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(IRAIL_FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    throw new IrailUnavailableError(irailStationName, error);
  }
  if (!response.ok) {
    throw new IrailUnavailableError(irailStationName, new Error(`HTTP ${response.status}`));
  }
  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new IrailUnavailableError(irailStationName, error);
  }
  const departures = payload?.departures?.departure;
  return Array.isArray(departures) ? departures : [];
}

/** @type {Map<string, { value: object[], timestamp: number, inflight: Promise<any>|null }>} */
const liveboardCache = new Map();

/**
 * Fetch + cache one station's raw iRail liveboard departures (TTL window, in-flight coalescing,
 * stale-on-error) — same shape as lib/providers/brussels.js's fetchWaitingTimesRaw and
 * vasttrafik.js's fetchStopAreaDepartures.
 * @param {string} irailStationName
 * @param {{ irailRawDepartures?: object[], noCache?: boolean }} [options]
 *   `irailRawDepartures` — an already-fetched departures array (same shape the live fetch
 *   returns), so an offline gate can drive the real classify/map pipeline without a network
 *   call. Production callers never pass it.
 */
export async function fetchIrailLiveboardRaw(irailStationName, options = {}) {
  if (options.irailRawDepartures) {
    return options.irailRawDepartures;
  }
  if (options.noCache) {
    return fetchIrailLiveboardRawUncached(irailStationName);
  }

  const now = Date.now();
  const existing = liveboardCache.get(irailStationName);

  if (existing?.inflight) {
    return existing.inflight;
  }
  if (existing && now - existing.timestamp < IRAIL_CACHE_TTL_MS) {
    return existing.value;
  }

  const inflight = fetchIrailLiveboardRawUncached(irailStationName).then(
    (value) => {
      liveboardCache.set(irailStationName, { value, timestamp: Date.now(), inflight: null });
      return value;
    },
    (error) => {
      const stale = liveboardCache.get(irailStationName);
      if (stale && Date.now() - stale.timestamp < IRAIL_STALE_MAX_MS) {
        liveboardCache.set(irailStationName, { ...stale, inflight: null });
        return stale.value;
      }
      liveboardCache.delete(irailStationName);
      throw error;
    }
  );

  liveboardCache.set(irailStationName, {
    value: existing?.value,
    timestamp: existing?.timestamp ?? 0,
    inflight,
  });
  return inflight;
}

/** Test-only: clear the module-level liveboard cache between gate runs. */
export function _resetIrailLiveboardCacheForTests() {
  liveboardCache.clear();
}

function formatClockInZone(date, timeZone) {
  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone });
}

/**
 * Map raw iRail `departures.departure` rows to the shared ProviderTrip shape, filtered to
 * board-eligible SNCB vehicle types only (see file header). Exported so a gate can drive this
 * exact pipeline against a captured/fixture payload without a network call.
 * @param {object[]} departures raw iRail departure rows
 * @param {{ timeZone: string }} options
 */
export function mapIrailDepartures(departures, { timeZone }) {
  const trips = [];
  for (const departure of departures ?? []) {
    if (String(departure?.canceled) === "1") {
      // Canceled — never boardable, dropped regardless of vehicle type.
      continue;
    }
    if (String(departure?.left) === "1") {
      // Already departed this platform — not a future departure for this board.
      continue;
    }
    const rawType = vehicleTypeFromDeparture(departure);
    if (!isSncbBoardEligible(rawType)) {
      // out-checkin / out-reservation / unmapped — filtered per board-eligibility rule.
      continue;
    }
    const scheduledSec = Number(departure?.time);
    if (!Number.isFinite(scheduledSec)) {
      continue;
    }
    const delaySec = Number(departure?.delay) || 0;
    const scheduledDate = new Date(scheduledSec * 1000);
    const liveDate = new Date((scheduledSec + delaySec) * 1000);
    if (Number.isNaN(liveDate.getTime())) {
      continue;
    }
    trips.push({
      routeShortName: rawType,
      destination: String(departure?.station ?? "").trim(),
      rawDestination: String(departure?.station ?? "").trim(),
      liveDeparture: liveDate.toISOString(),
      scheduledDeparture: scheduledDate.toISOString(),
      displayTime: formatClockInZone(liveDate, timeZone),
      scheduledDisplayTime: formatClockInZone(scheduledDate, timeZone),
      platform: String(departure?.platform ?? ""),
      realtime: true,
      cancelled: false,
      mode: "rail",
      agency: "SNCB/NMBS",
    });
  }
  return trips;
}
