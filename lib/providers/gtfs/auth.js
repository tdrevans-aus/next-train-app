/**
 * Optional API-key headers for GTFS feeds (TfNSW, etc.).
 */

export class MissingProviderApiKeyError extends Error {
  /** @param {string} envName */
  constructor(envName, message) {
    super(message ?? `Missing API key: set ${envName} in the environment`);
    this.name = "MissingProviderApiKeyError";
    this.envName = envName;
  }
}

/** @param {string} apiKey */
export function tfnswAuthHeaders(apiKey) {
  const trimmed = String(apiKey || "").trim();
  if (!trimmed) {
    throw new MissingProviderApiKeyError(
      "TFNSW_API_KEY",
      "TFNSW_API_KEY is not set — register at https://opendata.transport.nsw.gov.au/ and add the key to your environment."
    );
  }
  return { Authorization: `apikey ${trimmed}` };
}

export function readTfnswApiKey() {
  return String(
    process.env.TFNSW_API_KEY || process.env.TFNSW_API_KEY || ""
  ).trim();
}

/** Optional x-api-key for Adelaide Metro API Gateway (feeds work without key as of 2026). */
export function adelaideAuthHeaders(apiKey) {
  const trimmed = String(apiKey || "").trim();
  if (!trimmed) {
    return {};
  }
  return { "x-api-key": trimmed };
}

export function readAdelaideMetroApiKey() {
  return String(process.env.ADELAIDE_METRO_API_KEY || "").trim();
}

export function aucklandAuthHeaders(apiKey) {
  const trimmed = String(apiKey || "").trim();
  if (!trimmed) {
    throw new MissingProviderApiKeyError(
      "AT_API_KEY",
      "AT_API_KEY is not set — Auckland Transport Public Transport Dev (GTFS V3 + Realtime Compat). Header Ocp-Apim-Subscription-Key."
    );
  }
  return { "Ocp-Apim-Subscription-Key": trimmed };
}

export function readAucklandApiKey() {
  return String(process.env.AT_API_KEY || "").trim();
}

export function metlinkAuthHeaders(apiKey) {
  const trimmed = String(apiKey || "").trim();
  if (!trimmed) {
    throw new MissingProviderApiKeyError(
      "METLINK_API_KEY",
      "METLINK_API_KEY is not set — Metlink Open Data (header x-api-key). Portal https://opendata.metlink.org.nz/"
    );
  }
  return { "x-api-key": trimmed };
}

export function readMetlinkApiKey() {
  return String(process.env.METLINK_API_KEY || "").trim();
}

/** Trafiklab GTFS Regional / GTFS Sweden — key in query string. */
export function readTrafiklabApiKey() {
  return String(process.env.TRAFIKLAB_API_KEY || "").trim();
}

/**
 * @param {string} [apiKey]
 * @returns {string}
 */
export function requireTrafiklabApiKey(apiKey) {
  const trimmed = String(apiKey || readTrafiklabApiKey()).trim();
  if (!trimmed) {
    throw new MissingProviderApiKeyError(
      "TRAFIKLAB_API_KEY",
      "TRAFIKLAB_API_KEY is not set — register at https://www.trafiklab.se/ and add the key. Used for GTFS Regional (e.g. Västtrafik vt)."
    );
  }
  return trimmed;
}

/**
 * @param {string} operator Abbreviation e.g. `vt`
 * @param {string} [apiKey]
 */
export function trafiklabGtfsStaticUrl(operator, apiKey) {
  const key = requireTrafiklabApiKey(apiKey);
  const op = String(operator || "").trim().toLowerCase();
  return `https://opendata.samtrafiken.se/gtfs/${op}/${op}.zip?key=${encodeURIComponent(key)}`;
}

/**
 * TripUpdates for an operator. Västtrafik (`vt`) has no Trafiklab RT as of 2026-08-28 —
 * callers must tolerate 404 / empty.
 * @param {string} operator
 * @param {string} [apiKey]
 */
export function trafiklabGtfsRtTripUpdatesUrl(operator, apiKey) {
  const key = requireTrafiklabApiKey(apiKey);
  const op = String(operator || "").trim().toLowerCase();
  return `https://opendata.samtrafiken.se/gtfs-rt/${op}/TripUpdates.pb?key=${encodeURIComponent(key)}`;
}

const TRANSLINK_RT_BASE = "https://gtfsapi.translink.ca/v3/gtfsrealtime";

export function readTranslinkApiKey() {
  const trimmed = String(process.env.TRANSLINK_API_KEY || "").trim();
  if (!trimmed) {
    throw new MissingProviderApiKeyError(
      "TRANSLINK_API_KEY",
      "TRANSLINK_API_KEY is not set — register at TransLink developers and add the key. GTFS-RT v3 only (RTTI is retired)."
    );
  }
  return trimmed;
}

/** TransLink trip updates: query apikey=, ~1000 requests/day. Attribute TransLink. */
export function translinkRealtimeUrl(apiKey) {
  const key = String(apiKey || "").trim() || readTranslinkApiKey();
  return `${TRANSLINK_RT_BASE}?apikey=${encodeURIComponent(key)}`;
}

export class MissingActGtfsCredentialsError extends Error {
  constructor(message) {
    super(
      message ??
        "ACT GTFS credentials missing — set ACT_GTFS_BASIC (base64 client_id:client_secret) or ACT_GTFS_CLIENT_ID + ACT_GTFS_CLIENT_SECRET. Request keys via Transport Canberra MuleSoft portal."
    );
    this.name = "MissingActGtfsCredentialsError";
    this.envNames = ["ACT_GTFS_BASIC", "ACT_GTFS_CLIENT_ID", "ACT_GTFS_CLIENT_SECRET"];
  }
}

/** @returns {Record<string, string>} */
export function actGtfsBasicAuthHeaders() {
  const preEncoded = String(process.env.ACT_GTFS_BASIC || "").trim();
  if (preEncoded) {
    return { Authorization: `Basic ${preEncoded}` };
  }

  const clientId = String(process.env.ACT_GTFS_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.ACT_GTFS_CLIENT_SECRET || "").trim();
  if (clientId && clientSecret) {
    const token = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
    return { Authorization: `Basic ${token}` };
  }

  throw new MissingActGtfsCredentialsError();
}
