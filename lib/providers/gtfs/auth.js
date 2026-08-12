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
  return String(process.env.TFNSW_API_KEY || "").trim();
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
