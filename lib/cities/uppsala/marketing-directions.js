/**
 * Uppsala (Mälardalstrafik / Mälartåg) direction model.
 *
 * Line + confirmed far end ("Mälartåg mot <far end>"), never bare `direction_id` —
 * see docs/uppsala-d1/direction-model-memo.md. The Arlanda C / Märsta corridors
 * share one GTFS route_id (9011313099300000) where `direction_id` does not
 * distinguish the branches; resolve from `stop_headsign` (or the trip's stop
 * path) instead. doNotGroup extends beyond the hub — Uppsala C, Knivsta, AND
 * Arlanda C are all shared with SL-pendeln (SL Line 40, out of v1).
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

export const UPPSALA_HUB = "Uppsala C";
export const UPPSALA_TIME_ZONE = "Europe/Stockholm";
const PRODUCT_LABEL = "Mälartåg";

const FORBIDDEN_COLLAPSE = new Set(
  [
    "Uppsala Centralstation",
    "Uppsala Central",
    "SL-pendeln",
    "UL",
    "City",
  ].map((value) => value.trim().toLowerCase())
);

/** GTFS Regional `ul` stop_name → cleaned printed name (docs/uppsala-d1/published-network.json stationCoordinates[].gtfsStopName). */
const FEED_RENAMES = new Map(
  [
    ["Uppsala Centralstation", "Uppsala C"],
    ["Knivsta station", "Knivsta"],
    ["Märsta station", "Märsta"],
    ["Sala station", "Sala"],
    ["Morgongåva station", "Morgongåva"],
    ["Heby station", "Heby"],
    ["Storvreta station", "Storvreta"],
    ["Vattholma station", "Vattholma"],
    ["Skyttorp station", "Skyttorp"],
    ["Örbyhus station", "Örbyhus"],
    ["Tobo station", "Tobo"],
    ["Tierp station", "Tierp"],
    ["Mehedeby station", "Mehedeby"],
    ["Marma station", "Marma"],
    ["Älvkarleby station", "Älvkarleby"],
    ["Skutskär station", "Skutskär"],
    ["Gävle Central", "Gävle C"],
    // Beyond-the-feed destinations, no coordinates in the ul feed (coverageGaps) — abbreviated
    // to match direction-model-memo.md §3's worked chip copy ("Mälartåg mot Stockholm C").
    ["Stockholm Central", "Stockholm C"],
  ].map(([feed, printed]) => [foldKeyRaw(feed), printed])
);

/** Beyond-the-feed destinations confirmed only by stop_headsign (no coordinates in the ul feed
 * — docs/uppsala-d1/published-network.json coverageGaps). Never invent a station catalog entry
 * for these; they are valid chip far ends, not resolvable stops. */
export const OUT_OF_FEED_FAR_ENDS = ["Stockholm C", "Flemingsberg"];

/** Per-line marketing far ends for the D1 line-map summary (marketingLabelsForStation).
 * uppsala-arlanda / uppsala-marsta both physically end their GTFS coverage at Arlanda C /
 * Märsta, but the real rider-facing far end is beyond that — use the confirmed headsign
 * destinations, not the truncated feed termini, matching direction-model-memo.md §3. */
const MARKETING_FAR_ENDS = {
  "uppsala-arlanda": ["Stockholm C", "Flemingsberg"],
  "uppsala-marsta": ["Stockholm C"],
};

function foldKeyRaw(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
}

export function foldKey(value) {
  return foldKeyRaw(value).replace(/\s+station$/i, "");
}

export function isForbiddenCollapseName(value) {
  return FORBIDDEN_COLLAPSE.has(String(value || "").trim().toLowerCase());
}

export function loadLineMap() {
  return JSON.parse(readFileSync(join(ROOT, "lib/cities/uppsala/line-map.json"), "utf8"));
}

/** Rewrite a raw feed stop name to its cleaned printed name; passes through unknown strings
 * (including the out-of-feed far ends, which are already printed form). */
export function renameFeedStation(destination) {
  const dest = String(destination || "").trim();
  if (!dest) {
    return "";
  }
  return FEED_RENAMES.get(foldKeyRaw(dest)) ?? dest;
}

/**
 * @param {{ destination?: string, stopHeadsign?: string }} trip Board trip row
 * @param {string} [lineId] line-map.json lines[].id, informational only
 */
export function mapUppsalaDestination(trip, lineId) {
  void lineId;
  const raw = String(trip?.stopHeadsign || "").trim() || String(trip?.destination || "").trim();
  const farEnd = renameFeedStation(raw);
  if (!farEnd || isForbiddenCollapseName(farEnd)) {
    return PRODUCT_LABEL;
  }
  return `${PRODUCT_LABEL} mot ${farEnd}`;
}

export function marketingLabel(terminus) {
  return `${PRODUCT_LABEL} mot ${terminus}`;
}

/**
 * @param {string} station Printed station name
 * @param {object} [published] loadLineMap() result
 */
export function marketingLabelsForStation(station, published = loadLineMap()) {
  const labels = [];
  const seen = new Set();
  const stationKey = foldKey(station);
  if (isForbiddenCollapseName(station)) {
    return [];
  }

  for (const line of published.lines ?? []) {
    const onLine = (line.stations ?? []).some((name) => foldKey(name) === stationKey);
    if (!onLine) {
      continue;
    }
    const farEnds = MARKETING_FAR_ENDS[line.id] ?? line.termini ?? [];
    for (const terminus of farEnds) {
      if (foldKey(terminus) === stationKey) {
        continue;
      }
      const label = marketingLabel(terminus);
      const key = label.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      labels.push(label);
    }
  }

  return labels.sort((a, b) => a.localeCompare(b, "sv"));
}

/**
 * Board trips are remapped by the adapter to chip form. Accept either the
 * remapped chip or a raw GTFS headsign.
 */
export function tripMatchesMarketingChip(tripOrDest, chip) {
  const dest = typeof tripOrDest === "string" ? tripOrDest : tripOrDest?.destination ?? "";
  if (foldKey(dest) === foldKey(chip)) {
    return true;
  }
  return foldKey(mapUppsalaDestination(typeof tripOrDest === "object" ? tripOrDest : { destination: dest })) === foldKey(chip);
}
