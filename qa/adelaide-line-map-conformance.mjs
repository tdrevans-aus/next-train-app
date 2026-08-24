/**
 * D5 — Offline Adelaide line-map conformance (published D1 vs hand-locked D2).
 * Usage: node qa/adelaide-line-map-conformance.mjs
 *
 * LABEL_EXPECTATIONS: line + terminus. Hub is Adelaide Railway Station.
 * Port Dock is a seventh printed line. Tonsley is not a line.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive } from "../lib/providers/registry.js";
import { marketingLabelsForStation } from "../lib/cities/adelaide/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRINTED_CODES = ["BEL", "SEAFRD", "FLNDRS", "GAWC", "OUTHA", "PTDOCK", "GRNG"];
const HUB = "Adelaide Railway Station";
const DIRECTION_CEILING = 16;
const FROZEN_SHORT_TURN_GROUPS = {};

const HUB_LABELS = [
  "Belair line Belair",
  "Flinders line Flinders",
  "Gawler line Gawler Central",
  "Grange line Grange",
  "Outer Harbor line Outer Harbor",
  "Port Dock line Port Dock",
  "Seaford line Seaford",
];

const H6_STATIONS = [
  "Adelaide Railway Station",
  "Goodwood",
  "Woodlands Park",
  "Woodville",
  "Alberton",
  "Gawler Central",
  "Belair",
  "Port Dock",
];

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+railway station$/i, "")
    .replace(/\s+station$/i, "")
    .replace(/\s+stn$/i, "");
}

function unique(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const key = normalizeKey(value);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(value);
  }
  return out;
}

function setDiff(left, right) {
  const rightKeys = new Set(right.map(normalizeKey));
  return left.filter((item) => !rightKeys.has(normalizeKey(item)));
}

function main() {
  const published = loadJson("qa/fixtures/adelaide/published-network.json");
  const lineMap = loadJson("lib/cities/adelaide/line-map.json");
  const catalog = loadJson("lib/cities/adelaide/stations.json");
  const failures = [];

  const live = assertCityLive("adelaide");
  if (!live || live.ok !== true) {
    failures.push("C0: assertCityLive(adelaide) must pass (city is live)");
  }

  if (published.hub !== HUB || published.mode !== "train") {
    failures.push("C0: published hub must be Adelaide Railway Station and mode train");
  }
  if (published.timeZone !== "Australia/Adelaide" || published.dst !== true) {
    failures.push("C0: H7 Australia/Adelaide must record DST");
  }

  const publishedCodes = (published.lines ?? []).map((line) => line.number);
  if (JSON.stringify(publishedCodes) !== JSON.stringify(PRINTED_CODES)) {
    failures.push(`C1: expected printed codes ${PRINTED_CODES.join(",")} got ${publishedCodes.join(",")}`);
  }
  if ((published.lines ?? []).length !== 7) {
    failures.push("C1: D1 must list exactly seven TRAIN lines including Port Dock");
  }
  if (!(published.notLines ?? []).some((name) => /tonsley/i.test(name))) {
    failures.push("C1: published notLines must call out Tonsley");
  }

  const mapCodes = (lineMap.lines ?? []).map((line) => line.number ?? line.routeShortName);
  if (JSON.stringify(mapCodes) !== JSON.stringify(PRINTED_CODES)) {
    failures.push(`C1: line-map codes ${mapCodes.join(",")} must match D1`);
  }
  if ((lineMap.lines ?? []).some((line) => /tonsley/i.test(line.name) && line.number !== "FLNDRS")) {
    failures.push("C1: Tonsley must not be a line-map line");
  }

  const catalogNames = (catalog.stations ?? []).map((row) => row.name);
  if (!catalogNames.includes(HUB)) {
    failures.push("C2: catalog must lock Adelaide Railway Station");
  }
  const hubRow = (catalog.stations ?? []).find((row) => row.name === HUB);
  if (!hubRow?.aliases?.includes("Adelaide")) {
    failures.push("C2: hub aliases must include Adelaide");
  }

  for (const line of published.lines ?? []) {
    const mapped = (lineMap.lines ?? []).find((entry) => entry.number === line.number);
    if (!mapped) {
      failures.push(`C3: line-map missing ${line.number}`);
      continue;
    }
    const extraMap = setDiff(mapped.stations ?? [], line.stations ?? []);
    const extraPub = setDiff(line.stations ?? [], mapped.stations ?? []);
    if (extraMap.length || extraPub.length) {
      failures.push(
        `C3: ${line.number} station mismatch extraMap=${extraMap.join("|") || "—"} extraPub=${extraPub.join("|") || "—"}`
      );
    }
    const missingCatalog = setDiff(line.stations ?? [], catalogNames);
    if (missingCatalog.length) {
      failures.push(`C4: catalog missing ${line.number} stations ${missingCatalog.join(", ")}`);
    }
  }

  const shippedGroups = JSON.stringify(lineMap.shortTurnGroups ?? {});
  if (shippedGroups !== JSON.stringify(FROZEN_SHORT_TURN_GROUPS)) {
    failures.push("C5: shortTurnGroups must stay empty (line+terminus; no opposite-end collapse)");
  }
  if (Object.keys(lineMap.proposedShortTurnGroups ?? {}).length) {
    failures.push("C5: proposedShortTurnGroups must stay empty until reviewed");
  }

  const tonsleyOnFlinders = (published.lines ?? [])
    .find((line) => line.number === "FLNDRS")
    ?.stations?.some((name) => normalizeKey(name) === "tonsley");
  if (!tonsleyOnFlinders) {
    failures.push("C6: Tonsley must appear as a Flinders station");
  }

  const hubLabels = marketingLabelsForStation(HUB).sort((a, b) => a.localeCompare(b));
  if (JSON.stringify(hubLabels) !== JSON.stringify(HUB_LABELS)) {
    failures.push(`C7: hub labels ${hubLabels.join("; ")} expected ${HUB_LABELS.join("; ")}`);
  }
  if (hubLabels.some((label) => /tonsley/i.test(label))) {
    failures.push("C7: Tonsley must not appear as a hub chip");
  }
  if (hubLabels.some((label) => /osborne/i.test(label))) {
    failures.push("C7: Osborne must not appear as a hub chip");
  }

  for (const station of H6_STATIONS) {
    const labels = marketingLabelsForStation(station);
    if (labels.length === 0) {
      failures.push(`C7: ${station} has no line+terminus labels`);
    }
    if (labels.length > DIRECTION_CEILING) {
      failures.push(`C7: ${station} has ${labels.length} labels (ceiling ${DIRECTION_CEILING})`);
    }
  }

  if (!unique(catalogNames).length) {
    failures.push("C4: empty catalog");
  }

  if (failures.length) {
    console.error("adelaide-line-map-conformance failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("adelaide-line-map-conformance: ok");
}

main();
