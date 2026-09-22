/**
 * Locked Adelaide chips: terminus only, Perth style (e.g. "Belair"), except hub-bound
 * chips (terminus is Adelaide Railway Station, shared by every line) which carry the
 * line name to disambiguate: "Adelaide Railway Station (Belair line)" — relabelled
 * 22 Sep 2026, docs/jim-brief-melbourne-direction-labels-perth-style.md.
 * Hub is Adelaide Railway Station. Port Dock is its own line. Tonsley is not a line.
 *
 * The live Adelaide Metro feed's `trip_headsign` for hub-bound trips is the bare word
 * "City" (not "Adelaide" or "Adelaide Railway Station") — see isHub() below. #439's
 * relabelling missed this and dropped every hub-bound chip's trips
 * (docs/jim-brief-adelaide-city-bound-rows-missing.md, 22 Sep 2026).
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const HUB = "Adelaide Railway Station";

export const MARKETING_ENDS = {
  BEL: ["Adelaide Railway Station", "Belair"],
  SEAFRD: ["Adelaide Railway Station", "Seaford"],
  FLNDRS: ["Adelaide Railway Station", "Flinders"],
  GAWC: ["Adelaide Railway Station", "Gawler Central"],
  OUTHA: ["Adelaide Railway Station", "Outer Harbor"],
  PTDOCK: ["Adelaide Railway Station", "Port Dock"],
  GRNG: ["Adelaide Railway Station", "Grange"],
};

const NOT_TERMINI = new Set([
  "tonsley",
  "osborne",
  "gawler racecourse",
  "gawler oval",
  "gawler",
  "noarlunga centre",
]);

/**
 * Short-workings: a feed destination that is not a printed terminus but still belongs to
 * one of the seven marketing lines, so a trip carrying it must still count towards that
 * line's outbound chip rather than vanish. Osborne trains run on a distinct GTFS route
 * ("OSBORN") from the Outer Harbor line's own route code, so this can't be derived from
 * routeShortName alone.
 */
const SHORT_WORKING_LINE = {
  osborne: "OUTHA",
  "gawler racecourse": "GAWC",
  "gawler oval": "GAWC",
  gawler: "GAWC",
  "noarlunga centre": "SEAFRD",
};

/**
 * A short-working also runs under its own GTFS route_short_name when it is City-bound
 * (e.g. Osborne trains run as route "OSBORN", Gawler-only trains as "GAW"), separate from
 * the parent line's own code — map those back to the parent line so a hub-bound chip still
 * counts them.
 */
const ROUTE_SHORT_LINE_ALIAS = {
  osborn: "OUTHA",
  gaw: "GAWC",
};

export function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+railway station$/i, "")
    .replace(/\s+interchange$/i, "")
    .replace(/\s+station$/i, "")
    .replace(/\s+stn$/i, "");
}

export function loadPublishedNetwork() {
  const path = join(ROOT, "lib/cities/adelaide/line-map.json");
  if (!existsSync(path)) {
    throw new Error("Adelaide line-map.json not found");
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function isHub(stationKey) {
  return (
    stationKey === "adelaide railway station" ||
    stationKey === "adelaide" ||
    stationKey === "city"
  );
}

/**
 * A trip whose (raw GTFS headsign) destination is the station being viewed is an
 * arrival, not a departure — never a boardable direction from here
 * (docs/jim-brief-melbourne-direction-labels-perth-style.md item 3).
 * @param {string} destination
 * @param {string} stationName
 */
export function isTerminatingAtStation(destination, stationName) {
  const destKey = normalizeKey(destination);
  const stationKey = normalizeKey(stationName);
  if (!destKey || !stationKey) {
    return false;
  }
  if (destKey === stationKey) {
    return true;
  }
  return isHub(destKey) && isHub(stationKey);
}

export function marketingLabelsForStation(station, published = loadPublishedNetwork()) {
  const labels = [];
  const seen = new Set();
  const stationKey = normalizeKey(station);
  const atHub = isHub(stationKey);

  for (const line of published.lines ?? []) {
    const onLine = (line.stations ?? []).some((name) => {
      const key = normalizeKey(name);
      return key === stationKey || (atHub && isHub(key));
    });
    if (!onLine) {
      continue;
    }
    for (const terminus of MARKETING_ENDS[line.number] ?? line.termini ?? []) {
      const terminusKey = normalizeKey(terminus);
      if (terminusKey === stationKey || (atHub && isHub(terminusKey))) {
        continue;
      }
      if (NOT_TERMINI.has(terminusKey)) {
        continue;
      }
      const label = isHub(terminusKey) ? `${terminus} (${line.name})` : terminus;
      const key = label.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      labels.push(label);
    }
  }

  return labels.sort((a, b) => a.localeCompare(b));
}

/** The "(<Line> line)" suffix on a hub-bound chip, e.g. "Belair line" — empty for an outbound chip. */
function chipLineName(chip) {
  const match = String(chip || "").match(/\(([^)]+)\)\s*$/);
  return match ? match[1].trim() : "";
}

/** The terminus a chip names, with any "(<Line> line)" suffix stripped. */
function chipTerminus(chip) {
  return String(chip || "")
    .replace(/\s*\([^)]+\)\s*$/, "")
    .trim();
}

export function tripMatchesMarketingChip(tripOrDest, chip) {
  const dest =
    typeof tripOrDest === "string" ? tripOrDest : tripOrDest?.destination ?? tripOrDest?.destination;
  const destKey = normalizeKey(dest);
  const endKey = normalizeKey(chipTerminus(chip));
  if (!destKey || !endKey) {
    return false;
  }
  // A short-working (e.g. an "Osborne" trip on the Outer Harbor line) still belongs to
  // its line's outbound chip even though it never carries that line's printed terminus.
  if (NOT_TERMINI.has(destKey)) {
    const lineCode = SHORT_WORKING_LINE[destKey];
    if (!lineCode) {
      return false;
    }
    const lineTerminus = (MARKETING_ENDS[lineCode] ?? []).find((t) => !isHub(normalizeKey(t)));
    return normalizeKey(lineTerminus) === endKey;
  }
  // The feed's hub-bound destination ("City", "Adelaide", "Adelaide Railway Station",
  // whichever the source uses) and the chip's hub terminus are both variant spellings of
  // the same station — treat them as one canonical value before comparing.
  if (isHub(destKey) && isHub(endKey)) {
    const lineHint = normalizeKey(chipLineName(chip));
    if (!lineHint) {
      // No line name on the chip (shouldn't happen for a hub-bound chip) — any
      // hub-bound trip is close enough.
      return true;
    }
    const routeShort = typeof tripOrDest === "string" ? "" : String(tripOrDest?.routeShortName || "").trim();
    if (!routeShort) {
      return true;
    }
    const code = Object.entries(MARKETING_ENDS).find(([number]) => {
      const published = loadPublishedNetwork().lines.find((line) => line.number === number);
      return normalizeKey(published?.name) === lineHint;
    })?.[0];
    const routeShortKey = normalizeKey(routeShort);
    const routeCode = ROUTE_SHORT_LINE_ALIAS[routeShortKey] ?? routeShort;
    return !code || normalizeKey(routeCode) === normalizeKey(code);
  }
  const lineHint = normalizeKey(chipLineName(chip));
  const routeShort = typeof tripOrDest === "string" ? "" : String(tripOrDest?.routeShortName || "").trim();
  if (routeShort && lineHint) {
    const code = Object.entries(MARKETING_ENDS).find(([number]) => {
      const published = loadPublishedNetwork().lines.find((line) => line.number === number);
      return normalizeKey(published?.name) === lineHint;
    })?.[0];
    if (code && normalizeKey(routeShort) !== normalizeKey(code)) {
      return false;
    }
  }
  return destKey === endKey || destKey.includes(endKey) || endKey.includes(destKey);
}

export { HUB };
