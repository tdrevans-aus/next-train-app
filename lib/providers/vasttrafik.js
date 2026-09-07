/**
 * Västtrafik Planera Resa v4 (docs/jim-brief-goteborg-vasttrafik-live.md).
 * OAuth2 client-credentials token cache + a per-stop-area departures cache,
 * copying the shape of lib/providers/gtfs/ovapi-tripupdates-cache.js (module-
 * level cache, TTL window, in-flight coalescing, stale-on-error) rather than
 * forking it, since the upstream shapes (protobuf feed vs per-stop JSON) are
 * different enough that sharing the cache module itself isn't a fit.
 *
 * Quota: Planera Resa v4's free-tier rate limit is not published anywhere
 * discoverable pre-subscription and the portal shows no numeric tier after
 * subscribing either (see docs/goteborg-d1/jim-handoff.md, unknown #1) — the
 * cache window below (30s) is a conservative placeholder, not a measured
 * budget. Tim should confirm/adjust it once Västtrafik support answers.
 */

const TOKEN_URL = "https://ext-api.vasttrafik.se/token";
export const VASTTRAFIK_API_BASE = "https://ext-api.vasttrafik.se/pr/v4";

/** Refresh this many ms before the token's stated expiry. */
const TOKEN_EXPIRY_MARGIN_MS = 60_000;

/** Conservative shared cache window per stop area — see file header. */
export const VASTTRAFIK_DEPARTURES_CACHE_TTL_MS = 30_000;
const VASTTRAFIK_DEPARTURES_STALE_MAX_MS = 90_000;
export const VASTTRAFIK_FETCH_TIMEOUT_MS = 5000;

export class MissingVasttrafikCredentialsError extends Error {
  constructor(message) {
    super(
      message ??
        "VASTTRAFIK_CLIENT_ID / VASTTRAFIK_CLIENT_SECRET are not set — register an application at " +
          "https://developer.vasttrafik.se/, subscribe it to Planera Resa v4, and add both values to the environment."
    );
    this.name = "MissingVasttrafikCredentialsError";
    this.envNames = ["VASTTRAFIK_CLIENT_ID", "VASTTRAFIK_CLIENT_SECRET"];
  }
}

/**
 * The live Planera Resa v4 departures call failed for reasons that are
 * genuinely transient (HTTP error, auth failure, timeout, malformed
 * response body) — unlike MissingVasttrafikCredentialsError (operator never
 * configured the app) or MissingVasttrafikStopAreaGidError (a catalog data
 * gap), retrying this one can succeed once Västtrafik recovers. Thrown by
 * lib/providers/goteborg.js's fetchStationBoard whenever the live fetch
 * throws for a station that does have a catalog GID — there is no timetable
 * fallback to fall through to (docs/jim-brief-goteborg-live-only-no-fallback.md,
 * Tim: "definitely remove the fallback"). classifyDirectionsError
 * (api/directions.js) deliberately does NOT bucket this with the other named
 * adapter errors it treats as permanent ("feed_unavailable") — this one
 * keeps the generic "retrying could help" treatment.
 */
export class VasttrafikUnavailableError extends Error {
  constructor(stationName, cause) {
    super(
      `Västtrafik departures request failed for "${stationName}"${
        cause?.message ? `: ${cause.message}` : ""
      }`
    );
    this.name = "VasttrafikUnavailableError";
    this.cause = cause;
  }
}

/**
 * A catalog station (lib/cities/goteborg/stations.json) has no
 * `vasttrafikStopAreaGids` recorded — a catalog data gap, never guessed at
 * or silently worked around by falling back to a different data source.
 * Named "Missing*" (like MissingVasttrafikCredentialsError) so
 * classifyDirectionsError treats it as an operator/config problem, not a
 * transient one — the rider sees "isn't available right now", and retrying
 * won't help until the catalog is fixed.
 */
export class MissingVasttrafikStopAreaGidError extends Error {
  constructor(stationName) {
    super(
      `Göteborg catalog station "${stationName}" has no vasttrafikStopAreaGids recorded ` +
        "(lib/cities/goteborg/stations.json) — a catalog data gap, not a live-feed problem."
    );
    this.name = "MissingVasttrafikStopAreaGidError";
  }
}

/** @returns {{ clientId: string, clientSecret: string }} */
export function readVasttrafikCredentials() {
  const clientId = String(process.env.VASTTRAFIK_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.VASTTRAFIK_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) {
    throw new MissingVasttrafikCredentialsError();
  }
  return { clientId, clientSecret };
}

/** @type {{ token: string, expiresAt: number } | null} */
let cachedToken = null;
/** @type {Promise<string> | null} */
let inflightToken = null;

async function fetchAccessTokenUncached() {
  const { clientId, clientSecret } = readVasttrafikCredentials();
  const basic = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(VASTTRAFIK_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Västtrafik token request failed (${response.status})`);
  }
  const payload = await response.json();
  const token = String(payload.access_token || "").trim();
  if (!token) {
    throw new Error("Västtrafik token response had no access_token");
  }
  const expiresInMs = Number(payload.expires_in ?? 0) * 1000;
  cachedToken = {
    token,
    expiresAt: Date.now() + Math.max(expiresInMs - TOKEN_EXPIRY_MARGIN_MS, 0),
  };
  return token;
}

/**
 * Cached OAuth2 client-credentials token (nominal lifetime 86400s per the
 * verified Planera Resa v4 response). Refreshes TOKEN_EXPIRY_MARGIN_MS before
 * the stated expiry; in-flight requests are coalesced.
 * @returns {Promise<string>}
 */
export async function getVasttrafikAccessToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }
  if (inflightToken) {
    return inflightToken;
  }
  inflightToken = fetchAccessTokenUncached().finally(() => {
    inflightToken = null;
  });
  return inflightToken;
}

/** Test-only. */
export function _resetVasttrafikTokenCacheForTests() {
  cachedToken = null;
  inflightToken = null;
}

/** @type {Map<string, { value: object, timestamp: number, inflight: Promise<any>|null }>} */
const departuresCache = new Map();

function evictExpiredEntries(now) {
  for (const [key, entry] of departuresCache) {
    if (!entry.inflight && now - entry.timestamp > VASTTRAFIK_DEPARTURES_STALE_MAX_MS) {
      departuresCache.delete(key);
    }
  }
}

async function fetchStopAreaDeparturesUncached(gid, options) {
  const token = await getVasttrafikAccessToken();
  const limit = Number(options?.limit ?? 20);
  const url = `${VASTTRAFIK_API_BASE}/stop-areas/${encodeURIComponent(gid)}/departures?limit=${limit}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(options?.timeoutMs ?? VASTTRAFIK_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Västtrafik departures fetch failed (${response.status}) for stop-area ${gid}`);
  }
  const payload = await response.json();
  return { results: payload.results ?? [], fetchedAt: new Date() };
}

/**
 * Fetch + cache one stop area's departures (30s TTL, in-flight coalescing,
 * stale-on-error up to 90s) — one shared fetch per stop area per window
 * regardless of how many concurrent board requests ask for it.
 * @param {string} gid 16-digit Västtrafik stop-area GID (9021014…)
 * @param {{ limit?: number, timeoutMs?: number, noCache?: boolean }} [options]
 * @returns {Promise<{ results: object[], fetchedAt: Date, fromCache: boolean, stale: boolean }>}
 */
export async function fetchStopAreaDepartures(gid, options = {}) {
  if (options.noCache) {
    const result = await fetchStopAreaDeparturesUncached(gid, options);
    return { ...result, fromCache: false, stale: false };
  }

  const key = String(gid);
  const now = Date.now();
  const existing = departuresCache.get(key);

  if (existing?.inflight) {
    const value = await existing.inflight;
    return { ...value, fromCache: true, stale: false };
  }
  if (existing && now - existing.timestamp < VASTTRAFIK_DEPARTURES_CACHE_TTL_MS) {
    return { ...existing.value, fromCache: true, stale: false };
  }

  const inflight = fetchStopAreaDeparturesUncached(gid, options).then(
    (value) => {
      departuresCache.set(key, { value, timestamp: Date.now(), inflight: null });
      evictExpiredEntries(Date.now());
      return value;
    },
    (error) => {
      const stale = departuresCache.get(key);
      if (stale && Date.now() - stale.timestamp < VASTTRAFIK_DEPARTURES_STALE_MAX_MS) {
        departuresCache.set(key, { ...stale, inflight: null });
        return stale.value;
      }
      departuresCache.delete(key);
      throw error;
    }
  );

  departuresCache.set(key, {
    value: existing?.value,
    timestamp: existing?.timestamp ?? 0,
    inflight,
  });

  const result = await inflight;
  const wasStaleServe =
    existing != null && now - existing.timestamp >= VASTTRAFIK_DEPARTURES_CACHE_TTL_MS && result === existing.value;
  return { ...result, fromCache: false, stale: wasStaleServe };
}

/** Test-only: clear the module-level departures cache between gate runs. */
export function _resetVasttrafikDeparturesCacheForTests() {
  departuresCache.clear();
}

/** 16-digit Västtrafik stop-area GID, e.g. Brunnsparken 9021014001760000. */
export const STOP_AREA_GID_PATTERN = /^9021014\d{9}$/;

/** @param {string} value */
export function isVasttrafikStopAreaGid(value) {
  return STOP_AREA_GID_PATTERN.test(String(value || "").trim());
}
