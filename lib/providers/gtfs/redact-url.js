/**
 * Strip query-string values from a URL before it's ever interpolated into a
 * thrown Error message. Upstream fetch failures (Trafiklab `?key=…`,
 * TransLink `?apikey=…`, etc.) must never echo a secret back to a browser —
 * api/next-train.js and api/directions.js both return `error.message`
 * verbatim on failure, so any URL with a credential in its query string is a
 * leak if it reaches an Error unredacted.
 * @see docs/jim-brief-sweden-static-429-and-key-leak.md
 * @param {string} url
 * @returns {string} the URL with every query parameter value replaced by `…`
 */
export function redactUrl(url) {
  const raw = String(url ?? "");
  const queryIndex = raw.indexOf("?");
  if (queryIndex === -1) {
    return raw;
  }
  const base = raw.slice(0, queryIndex);
  const query = raw.slice(queryIndex + 1);
  const hashIndex = query.indexOf("#");
  const hash = hashIndex === -1 ? "" : query.slice(hashIndex);
  const queryOnly = hashIndex === -1 ? query : query.slice(0, hashIndex);
  const redactedQuery = queryOnly
    .split("&")
    .filter(Boolean)
    .map((pair) => {
      const eqIndex = pair.indexOf("=");
      if (eqIndex === -1) {
        return pair;
      }
      return `${pair.slice(0, eqIndex)}=…`;
    })
    .join("&");
  return redactedQuery ? `${base}?${redactedQuery}${hash}` : `${base}${hash}`;
}
