/**
 * PTV Timetable API v3 — HMAC-SHA1 signed GET requests.
 * @see https://timetableapi.ptv.vic.gov.au/swagger/ui/index
 * @see docs/jim-brief-melbourne-provider.md
 */

import { createHmac } from "crypto";

export const PTV_BASE_URL = "https://timetableapi.ptv.vic.gov.au";

/** Metro train route_type in PTV v3. */
export const PTV_ROUTE_TYPE_METRO_TRAIN = 0;

export class MissingPtvCredentialsError extends Error {
  constructor(message) {
    super(
      message ??
        "PTV_DEVID and PTV_API_KEY are not set — email APIKeyRequest@ptv.vic.gov.au with subject: PTV Timetable API – request for key"
    );
    this.name = "MissingPtvCredentialsError";
    this.envNames = ["PTV_DEVID", "PTV_API_KEY"];
  }
}

export function readPtvCredentials() {
  return {
    devid: String(process.env.PTV_DEVID ?? "").trim(),
    apiKey: String(process.env.PTV_API_KEY ?? "").trim(),
  };
}

export function ensurePtvCredentials() {
  const { devid, apiKey } = readPtvCredentials();
  if (!devid || !apiKey) {
    throw new MissingPtvCredentialsError();
  }
  return { devid, apiKey };
}

/**
 * Build signed path per PTV docs: /v3/...?devid=...&other=params (no URL encoding in signature input).
 */
export function signPtvPath(path, params, apiKey) {
  const pairs = [];

  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        pairs.push([key, String(item)]);
      }
    } else {
      pairs.push([key, String(value)]);
    }
  }

  const devidPair = pairs.find(([key]) => key === "devid");
  const rest = pairs
    .filter(([key]) => key !== "devid")
    .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

  const ordered = devidPair ? [devidPair, ...rest] : rest;
  const queryString = ordered.map(([key, value]) => `${key}=${value}`).join("&");
  const signedPath = `${path}?${queryString}`;
  const signature = createHmac("sha1", apiKey).update(signedPath).digest("hex");
  return { signedPath, signature, url: `${PTV_BASE_URL}${signedPath}&signature=${signature}` };
}

/**
 * @param {string} path e.g. /v3/departures/route_type/0/stop/1071
 * @param {Record<string, string|number|boolean|Array<string|number>>} [params]
 */
export async function ptvGet(path, params = {}) {
  const { devid, apiKey } = ensurePtvCredentials();
  const { url } = signPtvPath(path, { devid, ...params }, apiKey);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `PTV API failed (${response.status}) for ${path}${body ? `: ${body.slice(0, 200)}` : ""}`
    );
  }

  return response.json();
}

/**
 * Metro train departures for a PTV stop_id.
 * @param {number} stopId
 * @param {{ maxResults?: number }} [options]
 */
export async function getMetroDepartures(stopId, options = {}) {
  const maxResults = options.maxResults ?? 30;
  const path = `/v3/departures/route_type/${PTV_ROUTE_TYPE_METRO_TRAIN}/stop/${stopId}`;
  return ptvGet(path, {
    max_results: maxResults,
    expand: "All",
  });
}
