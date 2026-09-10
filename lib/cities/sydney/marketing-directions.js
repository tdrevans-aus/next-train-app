/**
 * Locked Sydney chips: line + terminus (e.g. T1 Emu Plains).
 * FB-62 (10 Sep 2026, tim-review): T2/T3/T8 physically run trains into the City
 * Circle loop (thousands of real GTFS "City Circle Via X" headsigns each) and
 * that city-bound way was previously suppressed everywhere, leaving Macarthur
 * (T8's only other declared end) with an empty direction list and Campbelltown/
 * Revesby/Leppington/Liverpool with only the outbound chip. Those three lines
 * now carry an explicit "City Circle" marketing end that folds the many
 * "Via Museum"/"Via Town Hall"/"Via Strathfield"/… headsign variants onto one
 * chip (see CHIP_HEADSIGN_GROUPS). T6 and T7 were checked too (per FB-62 scope):
 * their real GTFS headsign population is 100% Bankstown/Lidcombe and
 * Olympic Park/Lidcombe/Strathfield/Central respectively — no line ever runs a
 * trip destined for the City Circle — so a "T6 City Circle"/"T7 City Circle"
 * chip would be permanently next:null (a regression per acceptance criterion 3,
 * not a fix). Left unchanged; see docs/jim-brief-sydney-city-circle-directions.md.
 * Metro vs Trains stay disjoint at Central / Martin Place / Epping / Chatswood /
 * Sydenham.
 */
import publishedNetworkFixture from "./published-network.json" with { type: "json" };

/** The single label used everywhere for the city-bound way on a loop-ended line. */
export const CITY_BOUND_LABEL = "City Circle";

export const MARKETING_ENDS = {
  M1: ["Tallawong", "Sydenham"],
  T1: ["Berowra", "Emu Plains", "Richmond"],
  T2: ["Leppington", "Parramatta", CITY_BOUND_LABEL],
  T3: ["Liverpool", "Lidcombe", CITY_BOUND_LABEL],
  T4: ["Bondi Junction", "Waterfall", "Cronulla"],
  T5: ["Leppington", "Richmond"],
  T6: ["Bankstown", "Lidcombe"],
  T7: ["Lidcombe", "Olympic Park"],
  T8: ["Macarthur", CITY_BOUND_LABEL],
  T9: ["Hornsby", "Gordon"],
};

const SPLIT_PLACES = new Set(["central", "martin place", "epping", "chatswood", "sydenham"]);

const CITY_BOUND_KEY = normalizeKey(CITY_BOUND_LABEL);

/**
 * Raw GTFS/headsign noise that means "the loop" but must never itself become a
 * chip end (via-variants, and the loop's own intermediate-only stop names used
 * as headsigns). Keeps CITY_CIRCLE_KEYS doing its real job — folding the many
 * headsign variants onto CITY_BOUND_LABEL — without ever dropping the one
 * legitimate marketing end above.
 */
const CITY_CIRCLE_KEYS = new Set([
  "city circle via museum",
  "city circle via town hall",
  "city circle via strathfield",
  "city circle via granville",
  "city circle via regents park",
  "city circle via airport",
  "city circle via sydenham",
  "museum",
  "st james",
  "circular quay",
]);

/** Chip → GTFS headsign ends that count as that marketing way (nests fold in). */
export const CHIP_HEADSIGN_GROUPS = {
  "M1 Tallawong": ["Tallawong"],
  "M1 Sydenham": ["Sydenham"],
  "T1 Berowra": ["Berowra"],
  "T1 Emu Plains": ["Emu Plains", "Penrith"],
  "T1 Richmond": ["Richmond", "Schofields"],
  "T2 Leppington": ["Leppington"],
  "T2 Parramatta": ["Parramatta"],
  [`T2 ${CITY_BOUND_LABEL}`]: [
    "City Circle Via Town Hall",
    "City Circle Via Museum",
    "City Circle Via Granville",
    "City Circle Via Strathfield",
    "City Circle Via Regents Park",
  ],
  "T3 Liverpool": ["Liverpool"],
  "T3 Lidcombe": ["Lidcombe"],
  [`T3 ${CITY_BOUND_LABEL}`]: [
    "City Circle Via Regents Park",
    "City Circle Via Museum",
    "City Circle Via Town Hall",
  ],
  "T4 Bondi Junction": ["Bondi Junction"],
  "T4 Waterfall": ["Waterfall"],
  "T4 Cronulla": ["Cronulla"],
  "T5 Leppington": ["Leppington"],
  "T5 Richmond": ["Richmond"],
  "T6 Bankstown": ["Bankstown"],
  "T6 Lidcombe": ["Lidcombe"],
  "T7 Lidcombe": ["Lidcombe"],
  "T7 Olympic Park": ["Olympic Park"],
  "T8 Macarthur": ["Macarthur", "Revesby", "Campbelltown"],
  [`T8 ${CITY_BOUND_LABEL}`]: [
    "City Circle Via Town Hall",
    "City Circle Via Airport",
    "City Circle Via Sydenham",
    "City Circle Via Museum",
  ],
  "T9 Hornsby": ["Hornsby"],
  "T9 Gordon": ["Gordon"],
};

export function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+station$/i, "")
    .replace(/\s+stn$/i, "");
}

export function loadPublishedNetwork() {
  return normalizePublishedNetwork(publishedNetworkFixture);
}

function normalizePublishedNetwork(data) {
  return {
    ...data,
    lines: (data.lines ?? []).map((line) => ({
      ...line,
      number: String(line.number || line.routeShortName || line.tLine || "")
        .trim()
        .toUpperCase(),
      mode:
        line.mode ||
        (String(line.routeShortName || line.tLine || "")
          .trim()
          .toUpperCase() === "M1"
          ? "metro"
          : "train"),
    })),
  };
}

function isMetroCatalogName(stationKey) {
  return stationKey.endsWith(" metro");
}

function publishedPlaceKey(stationKey) {
  return stationKey.replace(/ metro$/, "");
}

function lineServesCatalogStation(line, stationKey) {
  const metroRow = isMetroCatalogName(stationKey);
  const place = publishedPlaceKey(stationKey);
  const lineIsMetro = String(line.number || line.id || "").toUpperCase() === "M1" || line.mode === "metro";

  if (metroRow && !lineIsMetro) {
    return false;
  }
  if (!metroRow && SPLIT_PLACES.has(place) && lineIsMetro) {
    return false;
  }

  const names = line.stations ?? [];
  return names.some((name) => {
    const key = normalizeKey(name);
    return key === stationKey || key === place;
  });
}

export function marketingLabelsForStation(station, published = loadPublishedNetwork()) {
  const labels = [];
  const seen = new Set();
  const stationKey = normalizeKey(station);

  for (const line of published.lines ?? []) {
    if (!lineServesCatalogStation(line, stationKey)) {
      continue;
    }
    const lineNumber = String(line.number || "").toUpperCase();
    for (const terminus of MARKETING_ENDS[lineNumber] ?? line.termini ?? []) {
      const terminusKey = normalizeKey(terminus);
      if (terminusKey === stationKey || terminusKey === publishedPlaceKey(stationKey)) {
        continue;
      }
      if (
        terminusKey !== CITY_BOUND_KEY &&
        (CITY_CIRCLE_KEYS.has(terminusKey) || terminusKey.includes("city circle"))
      ) {
        // Drop stray via-variant/loop-waypoint noise, but never the one
        // legitimate CITY_BOUND_LABEL marketing end declared above.
        continue;
      }
      const label = `${lineNumber} ${terminus}`;
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

function chipLinePrefix(chip) {
  return String(chip || "").trim().match(/^(T\d+|M\d+)/i)?.[1]?.toUpperCase() ?? "";
}

function chipTerminus(chip) {
  return String(chip || "")
    .trim()
    .replace(/^(T\d+|M\d+)\s+/i, "")
    .trim();
}

export function tripMatchesMarketingChip(tripOrDest, chip) {
  const dest =
    typeof tripOrDest === "string" ? tripOrDest : tripOrDest?.destination ?? tripOrDest?.destination;
  const routeShort =
    typeof tripOrDest === "string"
      ? ""
      : String(tripOrDest?.routeShortName || tripOrDest?.route_short_name || "").trim();
  const destKey = normalizeKey(dest);
  if (!destKey) {
    return false;
  }
  // City-Circle-bound destinations only match a chip whose own headsign group
  // says so (T2/T3/T8 City Circle) — every other chip's group is a small,
  // disjoint outbound-name list, so no blanket rejection is needed here.

  const chipLine = chipLinePrefix(chip);
  if (chipLine && routeShort && normalizeKey(routeShort) !== normalizeKey(chipLine)) {
    return false;
  }

  const groups = CHIP_HEADSIGN_GROUPS[chip] ?? [];
  const names = groups.length ? groups : chipTerminus(chip) ? [chipTerminus(chip)] : [];
  return names.some((name) => {
    const endKey = normalizeKey(name);
    return destKey === endKey || destKey.includes(endKey) || endKey.includes(destKey);
  });
}
