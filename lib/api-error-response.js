/**
 * D-10 (docs/dwayne-security-review-play-3.0.0.md): api/next-train.js, api/directions.js and
 * api/destinations.js used to send `error.message` straight to the client on a 500. Redaction
 * (lib/providers/gtfs/redact-url.js) covers the known keyed-URL case, but a future adapter could
 * regress it and throw something unredacted (a credential, a stack fragment, an internal path).
 * Send a fixed, per-endpoint generic message instead and log the real error server-side — where
 * it reaches Vercel's function logs for triage — tagged with the request's city/station. This
 * does not touch redact-url.js's redaction, which still applies to whatever ends up in the
 * logged error.
 *
 * @param {import('http').ServerResponse} res
 * @param {{ error: unknown, fallbackMessage: string, city?: string, station?: string, reason?: string }} params
 */
export function sendGenericServerError(res, { error, fallbackMessage, city, station, reason }) {
  const tag = [city ? `city=${city}` : null, station ? `station=${station}` : null]
    .filter(Boolean)
    .join(" ");
  console.error(`[api] 500${tag ? ` ${tag}` : ""}:`, error);

  const body = { error: fallbackMessage };
  if (reason) {
    body.reason = reason;
  }
  res.status(500).json(body);
}
