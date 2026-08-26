/**
 * Locked Sydney chips: line + terminus (e.g. T1 Emu Plains).
 * City Circle is a loop, not a terminus. Metro vs Trains stay disjoint at
 * Central / Martin Place / Epping / Chatswood / Sydenham.
 */
import publishedNetworkFixture from "./published-network.json" with { type: "json" };

export const MARKETING_ENDS = {
  M1: ["Tallawong", "Sydenham"],
  T1: ["Berowra", "Emu Plains", "Richmond"],
  T2: ["Leppington", "Parramatta"],
  T3: ["Liverpool", "Lidcombe"],
  T4: ["Bondi Junction", "Waterfall", "Cronulla"],
  T5: ["Leppington", "Richmond"],
  T6: ["Bankstown", "Lidcombe"],
  T7: ["Lidcombe", "Olympic Park"],
  T8: ["Macarthur"],
  T9: ["Hornsby", "Gordon"],
};

const SPLIT_PLACES = new Set(["central", "martin place", "epping", "chatswood", "sydenham"]);

const CITY_CIRCLE_KEYS = new Set([
  "city circle",
  "city circle via museum",
  "city circle via town hall",
  "city circle via strathfield",
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
  "T3 Liverpool": ["Liverpool"],
  "T3 Lidcombe": ["Lidcombe"],
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
      if (CITY_CIRCLE_KEYS.has(terminusKey) || terminusKey.includes("city circle")) {
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
  if (!destKey || CITY_CIRCLE_KEYS.has(destKey) || destKey.includes("city circle")) {
    return false;
  }

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
