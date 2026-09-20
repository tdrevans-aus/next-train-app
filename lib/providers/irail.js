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
 * Vehicle classification (board-eligibility rule, docs/board-eligibility-rule.md;
 * docs/brussels-d1/board-eligibility-addendum.md): iRail's `vehicleinfo.type` is NMBS/SNCB's own
 * train-category code. IC/L/P/EXTRA/EXT/ICT are ordinary domestic walk-up categories — always
 * `in`. S-trains arrive from live iRail as `S` followed by the sub-line number (`S1`, `S2`, `S3`,
 * `S8`, `S10`, ... — never a bare `"S"` in practice, confirmed by Mark's 20 Sep 2026 live QA pass
 * at all three shared stations) — matched by pattern, not a fixed string, so a new sub-line number
 * never needs a code change. ICE, EC (EuroCity) and ECD (EuroCity Direct) are `in` per the
 * addendum — none carry a compulsory reservation. THA (Thalys)/TGV (TGV INOUI)/OUI/OUIGO/IZY
 * (OUIGO family)/NJ/NIGHTJET (Nightjet)/EN/ES (European Sleeper) are `out-reservation` —
 * compulsory seat/bunk reservation. EUR/EST (Eurostar) are `out-checkin` — mandatory
 * check-in/security/border control. Any type this module does not recognise is dropped by
 * default (classifySncbVehicleType returns "unmapped") rather than shown — the safe failure
 * direction for a walk-up/check-in test is "we didn't recognise it, so we didn't show it", never
 * the reverse — but every unmapped type seen on a real fetch is collected into
 * `mapIrailDepartures`'s returned `unmapped` list (see below) so a silent drop is detectable
 * rather than invisible; `lib/providers/brussels.js` surfaces it on the board's `debug` field, and
 * `qa/brussels-dogfood-gate.mjs` fails if the captured-live fixture produces any unmapped row.
 * This mapping was fixed on 20 Sep 2026 after Mark's live QA (PR #419) found the previous exact-
 * match `"S"` entry silently dropped every real S-train departure and that EC/ECD had no verdict
 * at all — see the addendum for the research trail.
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

/** Ordinary domestic NMBS/SNCB walk-up categories, plus ICE/EC/ECD (no compulsory reservation —
 * see docs/brussels-d1/board-eligibility-addendum.md). S-trains are matched by pattern below, not
 * listed here, since they always carry a sub-line number on live iRail (S1, S2, S3, S8, S10, ...). */
const IN_TYPES = new Set(["IC", "L", "P", "EXTRA", "EXT", "ICT", "ICE", "EC", "ECD"]);
/** S-train (SNCB suburban/RER): bare "S" or "S" + digits — live iRail always sends the latter. */
const S_TRAIN_PATTERN = /^S\d*$/;
/** Mandatory check-in/security/border control — Eurostar. */
const OUT_CHECKIN_TYPES = new Set(["EUR", "EST"]);
/** Compulsory seat/bunk reservation — Thalys, TGV INOUI, OUIGO family, Nightjet, European Sleeper. */
const OUT_RESERVATION_TYPES = new Set([
  "THA",
  "TGV",
  "OUI",
  "OUIGO",
  "IZY",
  "NJ",
  "NIGHTJET",
  "EN",
  "ES",
]);
/** Rail-replacement bus (iRail `BUS`) — a real, currently-seen live type (Brussels-South capture,
 * 20 Sep 2026), but a different mode than the rail board this classifier feeds, not a train at
 * all. Classified deliberately (`out-mode`), same family as the addendum's premetro/tram
 * out-mode verdict, so it never falls into the "unmapped" bucket the gate treats as a bug. */
const OUT_MODE_TYPES = new Set(["BUS"]);

/**
 * @param {string} rawType iRail `vehicleinfo.type` (or a shortname-derived fallback)
 * @returns {"in"|"out-checkin"|"out-reservation"|"out-mode"|"unmapped"}
 */
export function classifySncbVehicleType(rawType) {
  const type = String(rawType || "").trim().toUpperCase();
  if (IN_TYPES.has(type)) return "in";
  if (S_TRAIN_PATTERN.test(type)) return "in";
  if (OUT_CHECKIN_TYPES.has(type)) return "out-checkin";
  if (OUT_RESERVATION_TYPES.has(type)) return "out-reservation";
  if (OUT_MODE_TYPES.has(type)) return "out-mode";
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
 *
 * The returned array also carries a non-enumerable `unmapped` property — the sorted, de-duplicated
 * list of `classifySncbVehicleType(...) === "unmapped"` raw type codes seen in this call, counted
 * per code (`{ type, count }`). A safe-default drop is otherwise invisible; this makes it
 * detectable by a caller (lib/providers/brussels.js surfaces it on the board's `debug` field) or a
 * gate (qa/brussels-dogfood-gate.mjs fails the run if a captured-live fixture produces any).
 * @param {object[]} departures raw iRail departure rows
 * @param {{ timeZone: string }} options
 */
export function mapIrailDepartures(departures, { timeZone }) {
  const trips = [];
  const unmappedCounts = new Map();
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
    const classification = classifySncbVehicleType(rawType);
    if (classification === "unmapped" && rawType) {
      unmappedCounts.set(rawType, (unmappedCounts.get(rawType) ?? 0) + 1);
    }
    if (classification !== "in") {
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
  const unmapped = [...unmappedCounts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => a.type.localeCompare(b.type));
  Object.defineProperty(trips, "unmapped", { value: unmapped, enumerable: false });
  return trips;
}
