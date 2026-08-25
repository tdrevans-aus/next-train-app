/**
 * Locked Adelaide chips: line + terminus (e.g. Belair line Belair).
 * Hub is Adelaide Railway Station. Port Dock is its own line. Tonsley is not a line.
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
  return stationKey === "adelaide railway station" || stationKey === "adelaide";
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
      const label = `${line.name} ${terminus}`;
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

function chipLineName(chip) {
  return String(chip || "")
    .replace(/\s+Adelaide Railway Station$/i, "")
    .replace(/\s+(Belair|Seaford|Flinders|Gawler Central|Outer Harbor|Port Dock|Grange)$/i, "")
    .trim();
}

function chipTerminus(chip) {
  const match = String(chip || "").trim().match(
    /(Adelaide Railway Station|Belair|Seaford|Flinders|Gawler Central|Outer Harbor|Port Dock|Grange)$/i
  );
  return match?.[1] ?? "";
}

export function tripMatchesMarketingChip(tripOrDest, chip) {
  const dest =
    typeof tripOrDest === "string" ? tripOrDest : tripOrDest?.destination ?? tripOrDest?.destination;
  const destKey = normalizeKey(dest);
  const endKey = normalizeKey(chipTerminus(chip));
  if (!destKey || !endKey) {
    return false;
  }
  if (NOT_TERMINI.has(destKey)) {
    return destKey === "gawler" ? endKey === "gawler central" : false;
  }
  if (destKey === "adelaide" && endKey === "adelaide railway station") {
    return true;
  }
  const lineHint = normalizeKey(chipLineName(chip));
  const routeShort = typeof tripOrDest === "string" ? "" : String(tripOrDest?.routeShortName || "").trim();
  if (routeShort && lineHint) {
    const code = Object.entries(MARKETING_ENDS).find(([number, ends]) => {
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
