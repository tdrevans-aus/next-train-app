/**
 * Edinburgh Trams (Trapeze BusTracker Open API) time handling.
 *
 * Findings from the 24 Oct 2026 probe (BST period, so UTC and local differ and
 * the zone IS discriminable): StopEvents returns `time` as a full ISO-Z instant,
 * each event's `journey.start` as a full ISO-Z instant, and the per-stop
 * `scheduledeparturetime` / `departuretime` as bare "HH:MM" strings that are
 * UTC — e.g. at 09:37:24Z a Haymarket event scheduled "09:40" belongs to a
 * journey that started 09:15Z, so it is 3 minutes away, not 63. A numeric
 * `departuretime` is a countdown in seconds from `time` and is zone-free.
 *
 * The adapter therefore parses bare clocks as UTC and converts to Europe/London
 * explicitly. British Summer Time ends Sun 25 Oct 2026 (02:00 BST -> 01:00
 * GMT); after that UTC and London clock time coincide until late March 2027,
 * which is why this zone assumption must not be inferred from later samples.
 *
 * Pure functions only — no fetch, no clock reads — so the gate can drive them.
 */

export const TRAMS_API_CLOCK_ZONE = "UTC";
export const TRAMS_DISPLAY_ZONE = "Europe/London";

const CLOCK_RE = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Resolve a bare "HH:MM" UTC clock to an absolute instant, anchored to the
 * response's own `time` so a request just before midnight UTC that sees
 * early-morning events (or the reverse) lands on the right calendar day.
 * The result is the instant within +/-12h of the reference.
 * @param {string} clock bare "HH:MM"
 * @param {number} referenceMs epoch ms of the response `time`
 * @returns {number|null}
 */
export function resolveBareUtcClock(clock, referenceMs) {
  const match = CLOCK_RE.exec(String(clock ?? "").trim());
  if (!match || !Number.isFinite(referenceMs)) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }
  const ref = new Date(referenceMs);
  let candidate = Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate(), hours, minutes, 0, 0);
  if (candidate < referenceMs - DAY_MS / 2) {
    candidate += DAY_MS;
  } else if (candidate > referenceMs + DAY_MS / 2) {
    candidate -= DAY_MS;
  }
  return candidate;
}

/**
 * Explicit UTC -> Europe/London wall clock, "HH:MM".
 * @param {number} epochMs
 */
export function formatLondonClock(epochMs) {
  return new Date(epochMs).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TRAMS_DISPLAY_ZONE,
  });
}

/**
 * The live departure instant of one StopEvents event, or null when the event
 * carries no genuine live value. Policy (docs/edinburgh-trams-d1/hazard-pack.md
 * H2 / displayPolicy): the scheduled time is never a departure.
 *  - null / missing prediction            -> no live data, dropped;
 *  - numeric countdown (seconds)          -> reference + countdown;
 *  - "HH:MM" prediction different from the
 *    scheduled "HH:MM"                    -> that UTC clock;
 *  - "HH:MM" prediction equal to the
 *    scheduled "HH:MM"                    -> indistinguishable from a schedule
 *                                            echo; dropped until flip gate G2.
 * @param {object} event one StopEvents `events[]` entry
 * @param {number} referenceMs epoch ms of the response `time`
 * @returns {number|null}
 */
export function liveDepartureMs(event, referenceMs) {
  if (!Number.isFinite(referenceMs)) {
    return null;
  }
  const raw = event?.departuretime ?? event?.arrivaltime ?? null;
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw >= -60 ? referenceMs + raw * 1000 : null;
  }
  const text = String(raw).trim();
  if (/^\d+$/.test(text)) {
    return referenceMs + Number(text) * 1000;
  }
  const liveMs = resolveBareUtcClock(text, referenceMs);
  const schedMs = resolveBareUtcClock(event?.scheduledeparturetime ?? event?.schedulearrivaltime, referenceMs);
  if (liveMs !== null && schedMs !== null && liveMs === schedMs) {
    return null;
  }
  return liveMs;
}
