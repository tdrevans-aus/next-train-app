/**
 * Tampere (Nysse tram, lines 1 and 3) direction model.
 *
 * docs/tampere-d1/direction-model-memo.md recommends "line + printed terminus" with a
 * headsign->terminus lookup table (GTFS trip_headsign "TAYS" -> display "Kaupin kampus",
 * "Hervanta" -> display "Hervantajärvi"), because the feed's own trip_headsign undershoots
 * or is ambiguous relative to the real printed terminus.
 *
 * This adapter does NOT need that lookup table. lib/providers/tampere.js derives every
 * direction chip from each live trip's own ACTUAL LAST STATIC STOP (joined from
 * stop_times.txt), never from trip_headsign or from a fixed "line X always ends at station Y"
 * assumption. That single mechanism produces the memo's own recommended chip for the two
 * headsign-mismatch cases (TAYS's trip actually terminates at the Kaupin kampus stop_id;
 * "Hervanta"'s trip actually terminates at the Hervantajärvi stop_id) AND handles
 * hazard-pack.md H5's through-running minority correctly, because a through-running trip's
 * actual last stop is genuinely whichever corridor it really ends on (e.g. Hervantajärvi for
 * a route_id "1" trip that crossed over) — there is no separate case to special-case.
 * See lib/providers/tampere.js's tripTerminusStationName()/buildLastStopIndex().
 *
 * Rautatieasema (hub lock, hazard-pack.md H6) is a plain through-station on both lines —
 * never itself a trip's last stop, so it never needs a self-referential-hub guard (unlike
 * Oslo's Vy R21/Jernbanetorget case).
 */

export const TAMPERE_HUB = "Rautatieasema";
export const TAMPERE_TIME_ZONE = "Europe/Helsinki";

/**
 * printedInnerCityNames.doNotUse (docs/tampere-d1/published-network.json) — strings that must
 * never resolve as a catalog station. Tampere railway station (VR) is a confirmed-separate,
 * nearby stop-place from the tram's Rautatieasema (hazard-pack.md H1) and is never in this
 * catalog under any name.
 */
const FORBIDDEN_STATION_NAMES = new Set(
  [
    "Tampere",
    "Tampere keskusta",
    "Keskusta",
    "City",
    "CBD",
    "to City",
    "Tampere Central Station",
    "Tampere asema",
    "Tampere railway station",
  ].map((value) => value.trim().toLowerCase())
);

export function foldKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+tram stop$/i, "")
    .replace(/\s+stop$/i, "");
}

/** Blocks station *resolution* — only strings that are never a real Tampere tram stop. */
export function isForbiddenCollapseName(value) {
  return FORBIDDEN_STATION_NAMES.has(String(value || "").trim().toLowerCase());
}

/** Allowed passenger line codes (hazard-pack.md H3 — no "2", live GTFS confirms only 1 and 3). */
export const ALLOWED_LINE_CODES = new Set(["1", "3"]);
