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

/**
 * Transport Victoria Open Data Portal (Melbourne Metro + V/Line GTFS-R).
 * Header casing is exact: `KeyID` (capital K, capital ID) — not `Key-Id`,
 * not `apikey`. Confirmed live 22 Sep 2026 (docs/melbourne-d1/jim-handoff.md):
 * an empty/missing key 401s with `WWW-Authenticate: ApiKey` /
 * "Failed to find key field: KeyId", so unlike Adelaide's optional key this
 * one is required.
 */
export function vicOpenDataAuthHeaders(apiKey) {
  const trimmed = String(apiKey || "").trim();
  if (!trimmed) {
    throw new MissingProviderApiKeyError(
      "VIC_OPENDATA_API_KEY",
      "VIC_OPENDATA_API_KEY is not set — register at https://opendata-signup.transport.vic.gov.au/ and add the key to your environment. Header KeyID."
    );
  }
  return { KeyID: trimmed };
}

export function readVicOpenDataApiKey() {
  return String(process.env.VIC_OPENDATA_API_KEY || "").trim();
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
 * Trafiklab issues GTFS Regional Static and GTFS Regional Realtime as
 * separate keyed products — a key for one 403s on the other ("Key does not
 * have access to file"), confirmed 2026-08-30 against skane/ul TripUpdates.
 * Falls back to TRAFIKLAB_API_KEY so a single combined key (if Trafiklab
 * ever issues one) still works without a second env var.
 */
export function readTrafiklabRealtimeApiKey() {
  return String(
    process.env.TRAFIKLAB_API_KEY_RT || process.env.TRAFIKLAB_API_KEY || ""
  ).trim();
}

/**
 * @param {string} [apiKey]
 * @returns {string}
 */
export function requireTrafiklabRealtimeApiKey(apiKey) {
  const trimmed = String(apiKey || readTrafiklabRealtimeApiKey()).trim();
  if (!trimmed) {
    throw new MissingProviderApiKeyError(
      "TRAFIKLAB_API_KEY_RT",
      "TRAFIKLAB_API_KEY_RT is not set — GTFS Regional Realtime is a separate Trafiklab product/key from GTFS Regional Static (TRAFIKLAB_API_KEY). Register at https://www.trafiklab.se/ and add the Realtime key as TRAFIKLAB_API_KEY_RT."
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
  const key = requireTrafiklabRealtimeApiKey(apiKey);
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

/** Digitransit Routing API v2 (HSL / Helsinki) — portal-api.digitransit.fi key. */
export function readDigitransitSubscriptionKey() {
  return String(process.env.DIGITRANSIT_SUBSCRIPTION_KEY || "").trim();
}

/**
 * @param {string} [apiKey]
 * @returns {string}
 */
export function requireDigitransitSubscriptionKey(apiKey) {
  const trimmed = String(apiKey || readDigitransitSubscriptionKey()).trim();
  if (!trimmed) {
    throw new MissingProviderApiKeyError(
      "DIGITRANSIT_SUBSCRIPTION_KEY",
      "DIGITRANSIT_SUBSCRIPTION_KEY is not set — register at https://portal-api.digitransit.fi/ and add the key. Header digitransit-subscription-key."
    );
  }
  return trimmed;
}

/** @param {string} [apiKey] */
export function digitransitAuthHeaders(apiKey) {
  const key = requireDigitransitSubscriptionKey(apiKey);
  return { "digitransit-subscription-key": key };
}

/**
 * BART Legacy API (ETD) key. Query-string `key=`, not a header — see
 * https://api.bart.gov/docs/etd/etd.aspx and docs/bart-d1/jim-handoff.md. Register at
 * https://api.bart.gov/api/register.aspx (or use the public no-registration key documented at
 * https://www.bart.gov/schedules/developers/api — never copied into this repo, per the D1 pack).
 */
export function readBartApiKey() {
  return String(process.env.BART_API_KEY || "").trim();
}

/**
 * Thrown whenever BART_API_KEY is unset. BART's ETD endpoint is the ONLY board source for this
 * city — Tim's rule: no live times, no board; never a silent timetable fallback (unlike
 * Boston/Auckland/Sydney, there is no GTFS-static schedule path to degrade to here). Every
 * caller of lib/providers/bart.js's fetchStationBoard must let this propagate rather than
 * catching it and returning an empty/synthetic board.
 */
export class MissingBartApiKeyError extends Error {
  constructor(message) {
    super(
      message ??
        "BART_API_KEY is not set. BART live boards use the BART Legacy API ETD endpoint " +
          "(api.bart.gov/api/etd.aspx) and there is no schedule fallback — Tim's rule is no " +
          "live times, no board. Register at https://api.bart.gov/api/register.aspx."
    );
    this.name = "MissingBartApiKeyError";
    this.envNames = ["BART_API_KEY"];
  }
}

/**
 * CTA Train Tracker API key (ttarrivals.aspx). Query-string `key=`, not a header — see
 * https://www.transitchicago.com/developers/traintracker/ and docs/chicago-d1/jim-handoff.md.
 * Register at https://www.transitchicago.com/developers/ (Tim signs up later, Auckland pattern
 * — not a D1 blocker). Never write a key into a repo file.
 */
export function readCtaTrainTrackerKey() {
  return String(process.env.CTA_TRAIN_TRACKER_KEY || "").trim();
}

/**
 * Thrown whenever CTA_TRAIN_TRACKER_KEY is unset. CTA Train Tracker is the ONLY board source
 * for Chicago 'L' — Tim's rule: no live times, no board; never a silent timetable fallback
 * (same posture as lib/providers/bart.js — there is no GTFS-static schedule path to degrade
 * to here). Every caller of lib/providers/chicago.js's fetchStationBoard must let this
 * propagate rather than catching it and returning an empty/synthetic board.
 */
export class MissingCtaTrainTrackerKeyError extends Error {
  constructor(message) {
    super(
      message ??
        "CTA_TRAIN_TRACKER_KEY is not set. Chicago 'L' live boards use the CTA Train Tracker " +
          "Arrivals API (ttarrivals.aspx) and there is no schedule fallback — Tim's rule is no " +
          "live times, no board. Register at https://www.transitchicago.com/developers/."
    );
    this.name = "MissingCtaTrainTrackerKeyError";
    this.envNames = ["CTA_TRAIN_TRACKER_KEY"];
  }
}

/**
 * WMATA subscription key (header `api_key`) for both Station Prediction
 * (Real-Time Rail Predictions) and Rail Station Information (GetStations) —
 * see https://developer.wmata.com/ and docs/washington-d1/jim-handoff.md.
 * Register at https://developer.wmata.com/signup/ (Tim signs up later, Auckland
 * pattern — not a D1 blocker). Never write a key into a repo file.
 */
export function readWmataApiKey() {
  return String(process.env.WMATA_API_KEY || "").trim();
}

/** @param {string} [apiKey] */
export function wmataAuthHeaders(apiKey) {
  const trimmed = String(apiKey || "").trim();
  if (!trimmed) {
    throw new MissingWmataApiKeyError();
  }
  return { api_key: trimmed };
}

/**
 * Thrown whenever WMATA_API_KEY is unset. WMATA's Station Prediction API is the
 * ONLY board source for Washington Metrorail — Tim's rule: no live times, no
 * board; never a silent timetable fallback (same posture as lib/providers/
 * bart.js and lib/providers/chicago.js — there is no GTFS-static schedule path
 * to degrade to here, and WMATA's own GTFS/GTFS-RT are portal-keyed too, not a
 * free fallback). Every caller of lib/providers/washington.js's
 * fetchStationBoard must let this propagate rather than catching it and
 * returning an empty/synthetic board.
 */
export class MissingWmataApiKeyError extends Error {
  constructor(message) {
    super(
      message ??
        "WMATA_API_KEY is not set. Washington Metrorail live boards use WMATA's " +
          "Station Prediction API (api.wmata.com/StationPrediction.svc/json/GetPrediction) " +
          "and there is no schedule fallback — Tim's rule is no live times, no board. " +
          "Register at https://developer.wmata.com/signup/."
    );
    this.name = "MissingWmataApiKeyError";
    this.envNames = ["WMATA_API_KEY"];
  }
}

/**
 * National Transport Authority (Ireland) GTFS-RT v2 (TripUpdates + Vehicles) key — header
 * `x-api-key`, portal https://developer.nationaltransport.ie/. Confirmed 404 without a key
 * (docs/dublin-d1/hazard-pack.md / published-network.json liveBoards) — this pack made no keyed
 * calls and pasted no key. Static NTA GTFS (GTFS_All.zip) does NOT require this key (verified 200
 * with no key), so it is only needed for the realtime path.
 */
export function readNtaApiKey() {
  return String(process.env.NTA_API_KEY || "").trim();
}

/**
 * Thrown whenever NTA_API_KEY is unset. NTA GTFS-RT v2 is the only realtime source for Dublin
 * Luas boards — no live times, no board; never a silent timetable fallback (same posture as
 * lib/providers/bart.js/chicago.js/washington.js — a scheduled time must never be presented as
 * live, docs/jim-brief-boston-subway-live-predictions.md). Register at
 * https://developer.nationaltransport.ie/. Never write a key into a repo file.
 */
export class MissingNtaApiKeyError extends Error {
  constructor(message) {
    super(
      message ??
        "NTA_API_KEY is not set. Dublin Luas live boards use the National Transport Authority " +
          "GTFS-RT v2 TripUpdates feed (api.nationaltransport.ie/gtfsr/v2/TripUpdates) and there " +
          "is no schedule fallback — no live times, no board. Register at " +
          "https://developer.nationaltransport.ie/."
    );
    this.name = "MissingNtaApiKeyError";
    this.envNames = ["NTA_API_KEY"];
  }
}

/** @param {string} [apiKey] */
export function ntaAuthHeaders(apiKey) {
  const trimmed = String(apiKey || "").trim();
  if (!trimmed) {
    throw new MissingNtaApiKeyError();
  }
  return { "x-api-key": trimmed };
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
