/**
 * Service-hours awareness for live dogfood gates — docs/jim-brief-live-gates-service-hours.md
 * (28 Sep 2026).
 *
 * A gate that live-fetches a real board and asserts "must surface at least one X chip" (or
 * "must return a non-null next train") is really asserting "the operator's service is currently
 * running" — true for almost all of the day, but false during a city's genuine overnight gap
 * (or, for Melbourne/Adelaide, a scheduled line closure). Run at the wrong hour in CI/CD
 * (European night = an Australian-morning-timezone CI runner's daytime, or vice versa), that
 * hard assertion goes red for a reason that has nothing to do with the code under test.
 *
 * This module gives every live dogfood gate two small, shared things:
 *   1. `localClock(city, now)` — the city's own local hour/minute via its IANA zone, so a gate
 *      can print "SKIP-LIVE (outside service hours, <city> local <HH:MM>)" consistently.
 *   2. `isDocumentedServiceHour(city, now)` — a documented, conservative per-city service
 *      window, for gates that have no cheaper way to ask "is a train running right now" than a
 *      clock check. This is the *fallback*: a gate that can already ask its own live board
 *      whether a matching trip exists (the strictly better, evidence-based check — see
 *      Copenhagen's classifyDsbService-driven check and Adelaide's routeShortName-driven check)
 *      should prefer that over this table, and use this module only for the SKIP-LIVE label.
 *
 * Windows are deliberately conservative (start late, end early) — a false SKIP inside real
 * service hours only means a gate ran its relaxed path a few extra minutes near the boundary;
 * a false strict-assert outside service hours is the actual bug this file exists to prevent.
 * Never weaken an offline/synthetic assertion using this module — it only ever gates a live,
 * network-backed, "must be non-empty right now" assertion.
 */

const TIME_ZONES = {
  copenhagen: "Europe/Copenhagen",
  melbourne: "Australia/Melbourne",
  adelaide: "Australia/Adelaide",
  "greater-manchester": "Europe/London",
  dublin: "Europe/Dublin",
  washington: "America/New_York",
};

/**
 * Conservative "trains are running" windows, local 24h clock, end exclusive. These are
 * deliberately narrower than each network's real first/last train (which vary by line and day)
 * — the point is only to distinguish "the deep overnight gap" from "any point a rider might
 * plausibly be boarding", not to model a full timetable.
 */
export const DOCUMENTED_SERVICE_WINDOWS = {
  copenhagen: { startHour: 5, endHour: 24 }, // DSB/Metro/S-tog: Metro runs 24h Fri/Sat, but DSB
  // Regional/InterCity/Öresundståg (what this file's callers care about) thin out well before
  // midnight and resume ~05:00 — see copenhagen-dogfood-gate.mjs's evidence-based check for the
  // authoritative signal; this window is only the SKIP-LIVE label's fallback.
  melbourne: { startHour: 5, endHour: 25 }, // Metro trains run to ~01:00 on most lines.
  adelaide: { startHour: 5.5, endHour: 24 }, // Adelaide Metro: ~05:30 first service, last ~midnight.
  "greater-manchester": { startHour: 5, endHour: 24.5 }, // National Rail + Metrolink, last trains ~00:30.
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * The city's own local hour/minute right now (or at `now`, for tests), via Intl — no manual UTC
 * offset math, so DST transitions in either hemisphere are handled correctly.
 */
export function localClock(city, now = new Date()) {
  const timeZone = TIME_ZONES[city];
  if (!timeZone) {
    throw new Error(`service-hours.mjs: no IANA time zone configured for city "${city}"`);
  }
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return {
    timeZone,
    hour,
    minute,
    label: `${pad2(hour === 24 ? 0 : hour)}:${pad2(minute)}`,
  };
}

/**
 * Fallback-only check against the documented conservative window above. Prefer an
 * evidence-based check (does the live/static board actually have a matching trip right now)
 * wherever the adapter can answer that cheaply; use this only when it can't.
 */
export function isDocumentedServiceHour(city, now = new Date()) {
  const window = DOCUMENTED_SERVICE_WINDOWS[city];
  if (!window) {
    throw new Error(`service-hours.mjs: no documented service window configured for city "${city}"`);
  }
  const { hour, minute } = localClock(city, now);
  const decimalHour = hour + minute / 60;
  return decimalHour >= window.startHour && decimalHour < window.endHour;
}

/** The exact SKIP-LIVE line format every gate should print (grep-able, one shape). */
export function skipLiveLine(city, now = new Date(), { reason = "outside service hours" } = {}) {
  const { label } = localClock(city, now);
  return `SKIP-LIVE (${reason}, ${city} local ${label})`;
}
