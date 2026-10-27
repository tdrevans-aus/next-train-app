/**
 * Edinburgh Trams (T50) live board — Trapeze "NRT Open API, Edinburgh CEC Bus
 * tracker Open Interface", generic/v1.2. Imported by lib/providers/edinburgh.js,
 * which keeps the switch: this module never decides whether trams are on.
 *
 *  - Auth: `Ocp-Apim-Subscription-Key` header, env EDINBURGH_BUSTRACKER_KEY.
 *    Unset -> MissingEdinburghTramsKeyError (a FeedUnavailableError, so the
 *    shared 503 path in api/board.js handles it; no timetable fallback — Tim's
 *    rule: no live times, no board).
 *  - Any feed failure (network, non-2xx, unparseable body, wrong shape) ->
 *    FeedUnavailableError (#502).
 *  - `GET stops/StopEvents?atcocode=<platform>&maxEvents=N` returns ONE OBJECT
 *    ({ time, atcocode, smscode, name, events[] }), not an array. A closed stop
 *    (York Place) returns the object without `events`.
 *  - Each tram stop is two platforms: ...1 departs towards Newhaven, ...2
 *    towards Edinburgh Airport (lib/cities/edinburgh/trams-api.json). The
 *    destination string on each event drives the chip; the platform is only a
 *    cross-check. The west terminus only departs on platform 1, the east
 *    terminus only on 2, and a terminus never shows a chip towards itself.
 *  - Live times only: lib/cities/edinburgh/trams-time.js drops events with no
 *    live value and schedule echoes. The scheduled time is never emitted — the
 *    trip's scheduledDeparture/scheduledDisplayTime equal its live values, so
 *    nothing in the payload can render a timetable time as a departure.
 *  - An empty list is a normal result (the honest empty state, "No live
 *    predictions for this stop right now"), never an outage on its own.
 *
 * Rate/cache: unknown vendor limits (flip gate G6). Each platform is cached
 * server-side for 20 s (the Darwin pattern) with in-flight de-duplication, so a
 * stop costs at most two upstream calls per 20 s regardless of rider count.
 */
import { FeedUnavailableError, feedUnavailableForError, feedUnavailableForResponse } from "./gtfs/errors.js";
import { mapTramDestination, foldKey } from "../cities/edinburgh/tram-directions.js";
import { liveDepartureMs, formatLondonClock } from "../cities/edinburgh/trams-time.js";
import { loadTramsOverlay, tramOverlayFor } from "../cities/edinburgh/trams-catalog.js";

export const EDINBURGH_TRAMS_KEY_ENV = "EDINBURGH_BUSTRACKER_KEY";
/** Up to ~2 h of lookahead came back for 16 events at Haymarket in the 24 Oct 2026 probe. */
export const EDINBURGH_TRAMS_MAX_EVENTS = 16;
export const EDINBURGH_TRAMS_CACHE_MS = 20_000;
const REQUEST_TIMEOUT_MS = 8_000;

export class MissingEdinburghTramsKeyError extends FeedUnavailableError {
  constructor(message) {
    super({
      message:
        message ??
        `${EDINBURGH_TRAMS_KEY_ENV} is not set. Edinburgh Trams live boards use the Trapeze BusTracker ` +
          "Open API (StopEvents) and there is no schedule fallback — no live times, no board.",
    });
    this.name = "MissingEdinburghTramsKeyError";
    this.envNames = [EDINBURGH_TRAMS_KEY_ENV];
  }
}

/** Strips accidental surrounding quotes (a quoted .env value produces a fake 401). */
export function readEdinburghTramsKey() {
  return String(process.env[EDINBURGH_TRAMS_KEY_ENV] || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

/** @param {string} atcocode @param {number} [maxEvents] */
export function buildStopEventsUrl(atcocode, maxEvents = EDINBURGH_TRAMS_MAX_EVENTS) {
  const url = new URL("stops/StopEvents", loadTramsOverlay().apiBase);
  url.searchParams.set("atcocode", atcocode);
  url.searchParams.set("maxEvents", String(maxEvents));
  return url.toString();
}

/**
 * Normalise a parsed StopEvents body. It is a single object; an array (never
 * observed) is tolerated by merging its objects. Anything else is a feed fault.
 * @returns {{ time: string|null, events: object[] }}
 */
export function parseStopEventsBody(body) {
  const objects = Array.isArray(body) ? body : [body];
  const events = [];
  let time = null;
  for (const obj of objects) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      throw new FeedUnavailableError({ message: "Edinburgh Trams StopEvents response had an unexpected shape" });
    }
    time = time ?? (typeof obj.time === "string" ? obj.time : null);
    if (Array.isArray(obj.events)) {
      events.push(...obj.events);
    }
  }
  if (time === null) {
    throw new FeedUnavailableError({ message: "Edinburgh Trams StopEvents response had no `time`" });
  }
  return { time, events };
}

/**
 * Turn one platform's events into ProviderTrips. Pure: no fetch, no clock.
 * @param {{ time: string|null, events: object[] }} parsed
 * @param {{ stopName: string, platform: "1"|"2" }} context
 */
export function tripsFromStopEvents(parsed, { stopName, platform }) {
  const referenceMs = Date.parse(parsed.time ?? "");
  if (!Number.isFinite(referenceMs)) {
    return [];
  }
  const here = foldKey(stopName);
  const trips = [];
  for (const event of parsed.events) {
    if (/cancel/i.test(String(event?.status ?? ""))) {
      continue;
    }
    const chip = mapTramDestination(event?.destination);
    if (!chip) {
      continue; // null destination (arrival-only platform row) or an unknown terminus
    }
    if (foldKey(chip.replace(/^T50 towards /, "")) === here) {
      continue; // never a chip towards the stop itself
    }
    const liveMs = liveDepartureMs(event, referenceMs);
    if (liveMs === null) {
      continue;
    }
    const display = formatLondonClock(liveMs);
    const iso = new Date(liveMs).toISOString();
    trips.push({
      liveDeparture: iso,
      scheduledDeparture: iso,
      displayTime: display,
      scheduledDisplayTime: display,
      platform,
      destination: chip,
      realtime: true,
    });
  }
  return trips;
}

const platformCache = new Map();

async function fetchPlatformEvents(atcocode, { apiKey, fetchImpl, now }) {
  const cached = platformCache.get(atcocode);
  if (cached && now - cached.at < EDINBURGH_TRAMS_CACHE_MS) {
    return cached.promise;
  }
  const promise = (async () => {
    let response;
    try {
      response = await fetchImpl(buildStopEventsUrl(atcocode), {
        headers: { "Ocp-Apim-Subscription-Key": apiKey },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw feedUnavailableForError(error, `Edinburgh Trams StopEvents request failed for ${atcocode}`);
    }
    if (!response.ok) {
      throw feedUnavailableForResponse(
        response,
        `Edinburgh Trams StopEvents request failed for ${atcocode}: HTTP ${response.status}`
      );
    }
    let body;
    try {
      body = await response.json();
    } catch (error) {
      throw feedUnavailableForError(error, `Edinburgh Trams StopEvents response for ${atcocode} was not JSON`);
    }
    return parseStopEventsBody(body);
  })();
  platformCache.set(atcocode, { at: now, promise });
  promise.catch(() => {
    if (platformCache.get(atcocode)?.promise === promise) {
      platformCache.delete(atcocode); // never cache a failure
    }
  });
  return promise;
}

export function clearEdinburghTramsCache() {
  platformCache.clear();
}

/**
 * @param {object} entry resolved tram catalog entry (mode "metro")
 * @param {{ apiKey?: string, fetchImpl?: typeof fetch, now?: number }} [options]
 * @returns {Promise<import("./contract.js").StationBoard>}
 */
export async function fetchEdinburghTramsBoard(entry, options = {}) {
  const apiKey = options.apiKey ?? readEdinburghTramsKey();
  if (!apiKey) {
    throw new MissingEdinburghTramsKeyError();
  }
  const row = tramOverlayFor(entry);
  if (!row) {
    throw new Error(`Unknown Edinburgh Trams stop: ${entry?.name}`);
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now();
  const platforms = [
    { platform: "1", atcocode: row.towardsNewhaven },
    { platform: "2", atcocode: row.towardsAirport },
  ].filter((p) => p.atcocode);

  const results = await Promise.all(
    platforms.map(async ({ platform, atcocode }) => ({
      platform,
      parsed: await fetchPlatformEvents(atcocode, { apiKey, fetchImpl, now }),
    }))
  );

  const trips = [];
  let lastTime = null;
  for (const { platform, parsed } of results) {
    lastTime = parsed.time ?? lastTime;
    trips.push(...tripsFromStopEvents(parsed, { stopName: entry.name, platform }));
  }
  trips.sort((a, b) => a.liveDeparture.localeCompare(b.liveDeparture));

  return {
    stationName: entry.name,
    lastUpdate: lastTime,
    trips,
    realtime: "live",
    // An empty live board is a feed gap, not "no service" (Newhaven had 3 empty polls, 25 Oct
    // 2026). Same additive marker as Dublin/Prague; there is no schedule here to say otherwise.
    emptyReason: trips.length === 0 ? "no-live-predictions" : null,
  };
}
