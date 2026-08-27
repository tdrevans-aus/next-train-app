/**
 * Locked Vancouver chips: line + terminus (Expo Line King George).
 * Hub is Waterfront (Expo / Canada Line). Millennium does not serve Waterfront.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
export const HUB = "Waterfront";

export const MARKETING_ENDS = {
  expo: ["Waterfront", "King George", "Production Way–University"],
  millennium: ["VCC–Clark", "Lafarge Lake–Douglas"],
  canada: ["Waterfront", "YVR–Airport", "Richmond–Brighouse"],
};

const BROADWAY_SUBWAY = [
  "great northern way emily carr",
  "mount pleasant",
  "oak vgh",
  "south granville",
  "arbutus",
];

export function foldKey(value) {
  return String(value || "")
    .replace(/[\u2013\u2014]/g, "-")
    .toLowerCase()
    .replace(/^canada line to |^expo line to |^millennium line to /i, "")
    .replace(/\s+station$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function loadLineMap() {
  return JSON.parse(readFileSync(join(ROOT, "lib/cities/vancouver/line-map.json"), "utf8"));
}

function isHub(stationKey) {
  return stationKey === foldKey(HUB);
}

export function lineFromToken(token) {
  const raw = String(token || "");
  if (/expo/i.test(raw)) {
    return "expo";
  }
  if (/millennium/i.test(raw)) {
    return "millennium";
  }
  if (/canada/i.test(raw)) {
    return "canada";
  }
  return "";
}

function lineLabel(code) {
  const id = lineFromToken(code) || String(code || "").trim();
  if (id === "expo") {
    return "Expo Line";
  }
  if (id === "millennium") {
    return "Millennium Line";
  }
  if (id === "canada") {
    return "Canada Line";
  }
  return "";
}

function canonicalPlace(token) {
  const folded = foldKey(token);
  if (!folded || BROADWAY_SUBWAY.includes(folded)) {
    return "";
  }
  if (isHub(folded)) {
    return HUB;
  }
  const published = loadLineMap();
  for (const line of published.lines ?? []) {
    for (const station of line.stations ?? []) {
      if (foldKey(station) === folded) {
        return station;
      }
    }
  }
  return String(token || "")
    .replace(/^canada line to |^expo line to |^millennium line to /i, "")
    .replace(/\s+station$/i, "")
    .trim();
}

function marketingTerminus(place, lineId) {
  const key = foldKey(place);
  if (lineId === "expo") {
    if (key === foldKey("Braid") || key === foldKey("Lougheed Town Centre")) {
      return "Production Way–University";
    }
  }
  return place;
}

export function mapVancouverDestination(headsign, routeHint) {
  const lineId = lineFromToken(headsign) || lineFromToken(routeHint);
  const place = marketingTerminus(canonicalPlace(headsign), lineId);
  const line = lineLabel(lineId);
  if (line && place) {
    return `${line} ${place}`;
  }
  return place || line || String(headsign || "").trim();
}

export function marketingLabelsForStation(station, published = loadLineMap()) {
  const labels = [];
  const seen = new Set();
  const stationKey = foldKey(station);
  const atHub = isHub(stationKey);

  for (const line of published.lines ?? []) {
    const onLine = (line.stations ?? []).some((name) => {
      const key = foldKey(name);
      return key === stationKey || (atHub && isHub(key));
    });
    if (!onLine) {
      continue;
    }
    for (const terminus of MARKETING_ENDS[line.number] ?? line.termini ?? []) {
      const terminusKey = foldKey(terminus);
      if (terminusKey === stationKey || (atHub && isHub(terminusKey))) {
        continue;
      }
      const label = `${line.name} ${terminus}`;
      const key = foldKey(label);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      labels.push(label);
    }
  }
  return labels.sort((a, b) => a.localeCompare(b, "en"));
}

export function tripMatchesMarketingChip(tripOrDest, chip) {
  const dest =
    typeof tripOrDest === "string" ? tripOrDest : tripOrDest?.destination ?? "";
  if (foldKey(dest) === foldKey(chip)) {
    return true;
  }
  const hint =
    typeof tripOrDest === "string"
      ? ""
      : String(tripOrDest?.routeLongName || tripOrDest?.routeShortName || "");
  const mapped = mapVancouverDestination(dest, hint || chip);
  return foldKey(mapped) === foldKey(chip);
}
