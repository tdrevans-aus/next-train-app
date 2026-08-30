/**
 * Malmö (Skånetrafiken / Pågatågen) direction model.
 *
 * Product + terminus ("Pågatågen mot <far end>") — there are no passenger-
 * facing line codes on Pågatågen (confirmed against the map, site copy, and
 * the GTFS feed; see docs/malmo-d1/direction-model-memo.md). Never inbound/
 * outbound vs "City", never a raw headsign at Malmö C — the ring line
 * (Malmöringen) calls Malmö C twice on one through-path and its feed
 * headsign is the self-referential "Malmö central" in every direction,
 * including departures FROM Malmö C. See direction-model-memo.md §3.
 *
 * Öresundståg and Krösatågen (revised 30 Aug 2026, docs/board-eligibility-rule.md — both
 * pass the walk-up test) get their own product + far-end chip style, distinct from
 * "Pågatågen mot <X>": "Öresundståg mot <far end>" / "Krösatåg mot <far end>". They are a
 * different product from Pågatågen (separate operator collaboration / rolling stock), so the
 * chip must say so, not collapse into the Pågatågen phrasing.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

export const MALMO_HUB = "Malmö C";
export const MALMO_TIME_ZONE = "Europe/Stockholm";

/** printedInnerCityNames.doNotUse from docs/malmo-d1/published-network.json. */
const FORBIDDEN_COLLAPSE = new Set(
  [
    "Malmö Central",
    "Malmö Centralstation",
    "Malmö central",
    "Malmö C Öresundståg",
    "Öresundståg",
    "Malmö",
    "City",
    "Bussterminal",
  ].map((value) => value.trim().toLowerCase())
);

/** Ring order (clockwise from Malmö C) used to build the Malmöringen via-chip. */
const RING_ORDER = [
  "Malmö C",
  "Triangeln",
  "Hyllie",
  "Svågertorp",
  "Persborg",
  "Rosengård",
  "Östervärn",
  "Malmö C",
];

export function foldKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+station$/i, "")
    .replace(/\s+centralstation$/i, " c");
}

export function isForbiddenCollapseName(value) {
  return FORBIDDEN_COLLAPSE.has(String(value || "").trim().toLowerCase());
}

export function loadLineMap() {
  return JSON.parse(readFileSync(join(ROOT, "lib/cities/malmo/line-map.json"), "utf8"));
}

/**
 * GTFS Sweden 3 / GTFS Regional feed strings → printed map strings.
 * docs/malmo-d1/oracle-clash-report.md "Station name table".
 */
const FEED_RENAMES = new Map(
  [
    ["Malmö Centralstation", "Malmö C"],
    ["Malmö Triangeln", "Triangeln"],
    ["Malmö Hyllie", "Hyllie"],
    ["Malmö Svågertorp", "Svågertorp"],
    ["Malmö Persborg", "Persborg"],
    ["Malmö Rosengård station", "Rosengård"],
    ["Burlöv station", "Burlöv"],
    ["Oxie station", "Oxie"],
    ["Trelleborg C", "Trelleborg"],
    ["Sölvesborgs Resecentrum", "Sölvesborg"],
    ["Karlshamn Resecentrum", "Karlshamn"],
    ["Laholm Station", "Laholm"],
    ["Lund Gunnesbo station", "Gunnesbo"],
    ["Hässleholm Centralstation", "Hässleholm C"],
    ["Helsingborg Centralstation", "Helsingborg C"],
    ["Kristianstad Centralstation", "Kristianstad C"],
    ["Lund Centralstation", "Lund C"],
  ].map(([feed, printed]) => [foldKey(feed), printed])
);

/** Rewrite a raw feed headsign to its printed map string; passes through unknown strings. */
export function renameFeedStation(destination) {
  const dest = String(destination || "").trim();
  if (!dest) {
    return "";
  }
  return FEED_RENAMES.get(foldKey(dest)) ?? dest;
}

function isKavlingeBound(destination) {
  return /kavlinge/.test(foldKey(destination));
}

function isSelfReferential(destination) {
  const folded = foldKey(destination);
  return folded === foldKey(MALMO_HUB) || folded === "malmo central" || folded === "malmo centralstation";
}

/**
 * Malmöringen (line 11) via-chip for the self-referential clockwise
 * direction: at Malmö C itself the chip names the next stop (Triangeln);
 * everywhere else along that direction it names the fixed landmark just
 * before the train terminates back at Malmö C (Östervärn). Tim-approved
 * copy, direction-model-memo.md open question 2.
 */
function malmoringenViaChip(stationName) {
  const folded = foldKey(stationName);
  if (folded === foldKey(MALMO_HUB)) {
    return `Malmöring. v ${RING_ORDER[1]}`;
  }
  return `Malmöring. v ${RING_ORDER[RING_ORDER.length - 2]}`;
}

/**
 * @param {string} destination Raw GTFS headsign / destination string
 * @param {string} lineId line-map.json lines[].id (e.g. "malmoringen")
 * @param {string} [stationName] Station the board is being built for
 */
export function mapMalmoDestination(destination, lineId, stationName) {
  if (lineId === "malmoringen") {
    if (isKavlingeBound(destination)) {
      return "Malmöringen mot Kävlinge";
    }
    if (isSelfReferential(destination) || !destination) {
      return malmoringenViaChip(stationName ?? "");
    }
    return `Malmöringen mot ${renameFeedStation(destination)}`;
  }
  if (lineId === "oresundstag" || lineId === "krosatagen") {
    const productLabel = lineId === "oresundstag" ? "Öresundståg" : "Krösatåg";
    const dest = renameFeedStation(destination);
    if (!dest || isForbiddenCollapseName(dest)) {
      return productLabel;
    }
    return `${productLabel} mot ${dest}`;
  }
  const productLabel = lineId === "pagatagen-express" ? "PågatågenExpress" : "Pågatågen";
  const dest = renameFeedStation(destination);
  if (!dest || isForbiddenCollapseName(dest)) {
    return productLabel;
  }
  return `${productLabel} mot ${dest}`;
}

export function marketingLabel(lineOrProductLabel, terminus) {
  const productLabel =
    typeof lineOrProductLabel === "object"
      ? lineOrProductLabel.productLabel ?? "Pågatågen"
      : lineOrProductLabel;
  return `${productLabel} mot ${terminus}`;
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

    if (line.id === "malmoringen") {
      const label = "Malmöringen mot Kävlinge";
      if (!seen.has(label.toLowerCase())) {
        seen.add(label.toLowerCase());
        labels.push(label);
      }
      const viaLabel = malmoringenViaChip(station);
      if (!seen.has(viaLabel.toLowerCase())) {
        seen.add(viaLabel.toLowerCase());
        labels.push(viaLabel);
      }
      continue;
    }

    for (const terminus of line.termini ?? []) {
      if (foldKey(terminus) === stationKey) {
        continue;
      }
      const label = marketingLabel(line, terminus);
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
 * remapped chip or a raw GTFS headsign + line id.
 */
export function tripMatchesMarketingChip(tripOrDest, chip) {
  const dest = typeof tripOrDest === "string" ? tripOrDest : tripOrDest?.destination ?? "";
  const lineId = typeof tripOrDest === "object" ? tripOrDest?.lineId ?? "" : "";
  const stationName = typeof tripOrDest === "object" ? tripOrDest?.stationName ?? "" : "";
  if (foldKey(dest) === foldKey(chip)) {
    return true;
  }
  return foldKey(mapMalmoDestination(dest, lineId, stationName)) === foldKey(chip);
}
