import { resolveAllowedStation } from "./api-station-allowlist.js";

export const CITY_REQUIRED_BODY = Object.freeze({ error: "Missing city", code: "CITY_REQUIRED" });

/**
 * docs/jim-brief-missing-city-perth-default-and-gm-flake.md: Perth was the original single-city
 * app, so a request with no `city` still means Perth (the web app, Android and iOS all omit
 * `city` for Perth) — but only when the named station is a Perth catalog station. A no-city
 * request for any other station used to be looked up as a Perth station; now it is a 400.
 *
 * A request with no station at all (e.g. board by lat/lng, or a missing-station error) keeps the
 * Perth default so existing validation messages are unchanged.
 *
 * @returns {{ city: string } | { error: typeof CITY_REQUIRED_BODY }}
 */
export function resolveRequestCity(query = {}) {
  const raw = query?.city;
  const city = typeof raw === "string" ? raw.trim() : "";
  if (city) {
    return { city: raw };
  }
  const station = query?.station;
  if (typeof station === "string" && station.trim() && !resolveAllowedStation(station)) {
    return { error: CITY_REQUIRED_BODY };
  }
  return { city: "perth" };
}
