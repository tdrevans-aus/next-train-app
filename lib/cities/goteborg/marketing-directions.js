/**
 * Locked Göteborg chips: line + terminus (1 + Tynnered).
 * Through-running — not inbound/outbound vs CBD. Never “to City”.
 * Brunnsparken is tram. Göteborg Central is pendeltåg. Do not collapse.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

export const TRAM_HUB = "Brunnsparken";
export const PENDELTÅG_HUB = "Göteborg Central";
export const RENAMED_TRAM_HUB = "Drottningtorget";
export const FORBIDDEN_TRAM_HUB = "Centralstationen";

export const ALLOWED_LINE_CODES = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "Kungsbacka",
  "Alingsås",
  "Ale",
];

export const LINE_FAMILY = {
  1: "1",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "11",
  12: "12",
  Kungsbacka: "Västtågen",
  Alingsås: "Västtågen",
  Ale: "Västtågen",
};

/** Map legend far ends — not first-halt strings. */
export const MARKETING_ENDS = {
  1: ["Tynnered", "Östra Sjukhuset"],
  2: ["Högsbotorp", "Biskopsgården"],
  3: ["Marklandsgatan", "Kålltorp"],
  4: ["Mölndal", "Angered"],
  5: ["Östra Sjukhuset", "Länsmansgården"],
  6: ["Kortedala", "Länsmansgården"],
  7: ["Tynnered", "Bergsjön"],
  8: ["Frölunda", "Angered"],
  9: ["Kungssten", "Angered"],
  10: ["Guldheden", "Lindholmen"],
  11: ["Saltholmen", "Bergsjön"],
  12: ["Mölndal", "Lindholmen"],
  Kungsbacka: ["Göteborg Central", "Kungsbacka"],
  Alingsås: ["Göteborg Central", "Alingsås"],
  Ale: ["Göteborg Central", "Ale"],
};

const FIRST_HALT_TO_LEGEND = {
  opaltorget: "Tynnered",
  "axel dahlstroms torg": "Högsbotorp",
  vaderilsgatan: "Biskopsgården",
  varmfrontsgatan: "Länsmansgården",
  vardfrontsgatan: "Länsmansgården",
  aprilgatan: "Kortedala",
  komettorget: "Bergsjön",
  "frolunda torg": "Frölunda",
  "molndals innerstad": "Mölndal",
  virginsgatan: "Kålltorp",
  "doktor sydows gata": "Guldheden",
  "dr sydows gata": "Guldheden",
  "alvangen resecentrum": "Ale",
  "angereds centrum": "Angered",
};

const FORBIDDEN_COLLAPSE = new Set([
  "centralstationen",
  "goteborg c",
  "gothenburg central",
  "to city",
  "nils ericson terminalen",
]);

export function foldKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+station$/i, "")
    .replace(/\s+\(tag\)$/i, "");
}

export function loadLineMap() {
  return JSON.parse(readFileSync(join(ROOT, "lib/cities/goteborg/line-map.json"), "utf8"));
}

function familyForCode(code) {
  const raw = String(code || "").trim();
  return LINE_FAMILY[raw] || LINE_FAMILY[raw.replace(/^tram/i, "")] || "";
}

function legendPlace(destination) {
  const place = String(destination || "").trim();
  const folded = foldKey(place);
  if (FIRST_HALT_TO_LEGEND[folded]) {
    return FIRST_HALT_TO_LEGEND[folded];
  }
  if (/^centralstationen$/i.test(place)) {
    return RENAMED_TRAM_HUB;
  }
  return place;
}

/**
 * Västtågen's feed-supplied direction text names the train's actual
 * terminus (`Göteborg`, an intermediate stop like `Floda`, or a
 * through-running destination beyond the corridor like `Stockholm`) rather
 * than one of the three chips a station offers (`Göteborg Central`,
 * `Alingsås`/`Kungsbacka`/`Ale`). Normalise using the corridor's own station
 * order from line-map.json:
 *   - a Göteborg-name-family destination (`Göteborg`, `Göteborg C`,
 *     `Göteborg Central`, `Göteborg Centralstation`) -> the hub chip;
 *   - a destination that sits on the corridor's station list ahead of (or
 *     at) the requested station -> the corridor's outer terminus chip
 *     (train still heading outbound); one that sits behind the requested
 *     station (closer to Göteborg) -> the hub chip (train already passed
 *     it, now heading inbound);
 *   - any other place not on the corridor's station list (through-running
 *     beyond the terminus — `Stockholm`/`Töreboda` past Alingsås, `Varberg`
 *     past Kungsbacka, `Vänersborg` past Ale, or anything else the feed
 *     supplies) -> the corridor terminus chip, treated the same as "ahead
 *     of every in-scope station" (outbound) since it has no known position
 *     on the corridor to compare against the requested station.
 *
 * A place that resolves to the requested station's own name (e.g. the
 * corridor terminus chip computed while querying that very terminus) means
 * no chip matches — see the self-reference check below.
 */
const GOTEBORG_HUB_NAME_FAMILY = new Set(
  ["Göteborg", "Göteborg C", "Göteborg Central", "Göteborg Centralstation"].map(foldKey)
);

function corridorStationIndex(stations, name) {
  const key = foldKey(name);
  return stations.findIndex((station) => foldKey(station) === key);
}

function normalizeVasttagenPlace(destination, corridorCode, queryStation) {
  const raw = String(destination || "").trim();
  const foldedRaw = foldKey(raw);
  let place;

  if (GOTEBORG_HUB_NAME_FAMILY.has(foldedRaw)) {
    place = PENDELTÅG_HUB;
  } else {
    const line = loadLineMap().lines?.find((entry) => entry.number === corridorCode);
    const stations = line?.stations ?? [];
    const terminusChip = MARKETING_ENDS[corridorCode]?.[1] ?? line?.termini?.[1] ?? raw;

    if (!stations.length) {
      place = raw || terminusChip;
    } else {
      const lastIndex = stations.length - 1;
      const queryIndex = corridorStationIndex(stations, queryStation);
      const destIndex = corridorStationIndex(stations, raw);

      if (destIndex !== -1) {
        if (destIndex === lastIndex) {
          place = terminusChip; // feed text already names the corridor terminus
        } else if (queryIndex !== -1 && destIndex <= queryIndex) {
          place = PENDELTÅG_HUB; // intermediate stop behind the requested station: inbound
        } else {
          place = terminusChip; // intermediate stop ahead: still outbound
        }
      } else {
        // Not one of this corridor's own stations: through-running beyond
        // the terminus (any name — Stockholm, Töreboda, Varberg,
        // Vänersborg, ...) or an unrecognised place. No corridor position
        // to compare against the requested station, so default to the
        // "still heading out" reading the un-normalised feed text implied.
        place = terminusChip;
      }
    }
  }

  // A trip whose normalised place names the very station being queried
  // isn't a chip that station offers — marketingLabelsForStation excludes a
  // station's own terminus from its own chip list for the same reason (you
  // can't board "toward" the stop you're already at). Signal "no matching
  // chip" instead of emitting a label nothing can match; this is the
  // terminus-through-running edge case (e.g. Alingsås Station itself seeing
  // a "Stockholm"-direction train continuing past the v1 terminus).
  if (queryStation && place && foldKey(place) === foldKey(queryStation)) {
    return null;
  }
  return place;
}

export function mapGoteborgDestination(destination, lineDesignation, queryStation) {
  const code = String(lineDesignation || "").trim();
  const family = familyForCode(code);
  if (family === "Västtågen") {
    const place = normalizeVasttagenPlace(destination, code, queryStation);
    return place === null ? null : `Västtågen + ${place}`;
  }
  const place = legendPlace(destination);
  if (!family) {
    return place || destination || "";
  }
  return `${family} + ${place}`;
}

export function marketingLabel(code, terminus) {
  const family = familyForCode(code);
  const place = legendPlace(terminus);
  if (family === "Västtågen") {
    return `Västtågen + ${place}`;
  }
  return `${family} + ${place}`;
}

export function marketingLabelsForStation(station, published = loadLineMap()) {
  const labels = [];
  const seen = new Set();
  const stationKey = foldKey(station);
  if (FORBIDDEN_COLLAPSE.has(String(station || "").trim().toLowerCase())) {
    return [];
  }

  for (const line of published.lines ?? []) {
    const onLine = (line.stations ?? []).some((name) => foldKey(name) === stationKey);
    if (!onLine) {
      continue;
    }
    for (const terminus of MARKETING_ENDS[line.number] ?? line.termini ?? []) {
      if (foldKey(terminus) === stationKey || foldKey(legendPlace(station)) === foldKey(terminus)) {
        continue;
      }
      const label = marketingLabel(line.number, terminus);
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

export function isForbiddenCollapseName(value) {
  return FORBIDDEN_COLLAPSE.has(String(value || "").trim().toLowerCase());
}

/**
 * Board trips are remapped by the adapter to chip form (`1 + Tynnered`,
 * `Västtågen + Kungsbacka`). Accept either the remapped chip or a raw GTFS
 * headsign + line designation. The line code is part of the match — a 7 to
 * Tynnered must not satisfy a `1 + Tynnered` chip.
 */
export function tripMatchesMarketingChip(tripOrDest, chip) {
  const dest =
    typeof tripOrDest === "string" ? tripOrDest : tripOrDest?.destination ?? "";
  const code =
    typeof tripOrDest === "object"
      ? tripOrDest?.routeShortName ?? tripOrDest?.line ?? ""
      : "";
  if (foldKey(dest) === foldKey(chip)) {
    return true;
  }
  return foldKey(mapGoteborgDestination(dest, code)) === foldKey(chip);
}
