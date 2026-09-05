/**
 * Shared server-side cache in front of OVapi's national GTFS-RT TripUpdates
 * feed (docs/jim-brief-nl-realtime-cache.md). Both lib/providers/rotterdam.js
 * and lib/providers/amsterdam.js import this — nothing city-specific lives
 * here. Same contract as the Darwin cache (lib/providers/uk-darwin.js, PR
 * #230): module-level cache keyed by feed URL, 20s TTL, in-flight
 * coalescing so concurrent callers await one upstream fetch, and
 * stale-on-error (serve the previous copy if younger than 60s, logging
 * once per stale-serve).
 *
 * Caches the *decoded* entity list (post-protobuf), not the raw bytes, so
 * Rotterdam and Amsterdam share one decode of the 4.4 MB national feed per
 * window instead of each city paying its own fetch+decode.
 */
import { fetchTripUpdates } from "./realtime.js";

export const OVAPI_TRIPUPDATES_CACHE_TTL_MS = 20_000;
const OVAPI_TRIPUPDATES_STALE_MAX_MS = 60_000;
export const OVAPI_TRIPUPDATES_FETCH_TIMEOUT_MS = 5000;

/** @type {Map<string, { value: { entities: object[], fetchedAt: Date }, timestamp: number, inflight: Promise<any>|null }>} */
const tripUpdatesCache = new Map();

function evictExpiredEntries(now) {
  for (const [key, entry] of tripUpdatesCache) {
    if (!entry.inflight && now - entry.timestamp > OVAPI_TRIPUPDATES_STALE_MAX_MS) {
      tripUpdatesCache.delete(key);
    }
  }
}

let loggedStaleOnErrorOnce = false;

async function fetchTripUpdatesUncached(url, options) {
  const start = Date.now();
  let bytes = 0;
  let entityCount = 0;
  let outcome = "ok";
  try {
    const result = await fetchTripUpdates(url, {
      headers: options?.headers,
      timeoutMs: options?.timeoutMs ?? OVAPI_TRIPUPDATES_FETCH_TIMEOUT_MS,
    });
    bytes = result.bytes ?? 0;
    entityCount = result.entities?.length ?? 0;
    return result;
  } catch (error) {
    outcome =
      error?.name === "TimeoutError" || /timeout/i.test(String(error?.message)) ? "timeout" : "error";
    throw error;
  } finally {
    const ms = Date.now() - start;
    console.log(
      `ovapi-tripupdates fetch ms=${ms} bytes=${bytes} entities=${entityCount} outcome=${outcome}`
    );
  }
}

/**
 * Fetch + decode OVapi TripUpdates, cached 20s (OVAPI_TRIPUPDATES_CACHE_TTL_MS)
 * with in-flight coalescing and stale-on-error (up to 60s).
 * @param {string} url
 * @param {{ headers?: Record<string,string>, timeoutMs?: number, noCache?: boolean }} [options]
 * @returns {Promise<{ entities: object[], fetchedAt: Date, fromCache: boolean, stale: boolean }>}
 */
export async function fetchOvapiTripUpdates(url, options = {}) {
  if (options.noCache) {
    const result = await fetchTripUpdatesUncached(url, options);
    return { ...result, fromCache: false, stale: false };
  }

  const key = url;
  const now = Date.now();
  const existing = tripUpdatesCache.get(key);

  if (existing?.inflight) {
    const value = await existing.inflight;
    return { ...value, fromCache: true, stale: false };
  }
  if (existing && now - existing.timestamp < OVAPI_TRIPUPDATES_CACHE_TTL_MS) {
    return { ...existing.value, fromCache: true, stale: false };
  }

  const inflight = fetchTripUpdatesUncached(url, options).then(
    (value) => {
      tripUpdatesCache.set(key, { value, timestamp: Date.now(), inflight: null });
      evictExpiredEntries(Date.now());
      return value;
    },
    (error) => {
      const stale = tripUpdatesCache.get(key);
      if (stale && Date.now() - stale.timestamp < OVAPI_TRIPUPDATES_STALE_MAX_MS) {
        tripUpdatesCache.set(key, { ...stale, inflight: null });
        if (!loggedStaleOnErrorOnce) {
          loggedStaleOnErrorOnce = true;
          console.error(
            `OVapi TripUpdates fetch failed, serving stale cache entry for ${key}: ${error?.message ?? error}`
          );
        }
        return stale.value;
      }
      tripUpdatesCache.delete(key);
      throw error;
    }
  );

  tripUpdatesCache.set(key, {
    value: existing?.value,
    timestamp: existing?.timestamp ?? 0,
    inflight,
  });

  const result = await inflight;
  const wasStaleServe = existing != null && now - existing.timestamp >= OVAPI_TRIPUPDATES_CACHE_TTL_MS && result === existing.value;
  return { ...result, fromCache: false, stale: wasStaleServe };
}

/** Test-only: clear the module-level cache between gate runs. */
export function _resetOvapiTripUpdatesCacheForTests() {
  tripUpdatesCache.clear();
  loggedStaleOnErrorOnce = false;
}
