/**
 * Offline Newcastle Light Rail line-map conformance.
 * Usage: node qa/newcastle-line-map-conformance.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import {
  foldKey,
  HUB,
  mapNewcastleDestination,
  marketingLabelsForStation,
} from "../lib/cities/newcastle/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRINTED = [
  "Newcastle Interchange",
  "Honeysuckle",
  "Civic",
  "Crown Street",
  "Queens Wharf",
  "Newcastle Beach",
];
const NOT_OPEN = ["Broadmeadow", "Stockton", "Wickham", "Newcastle East"];

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function main() {
  const lineMap = loadJson("lib/cities/newcastle/line-map.json");
  const catalog = loadJson("lib/cities/newcastle/stations.json");
  const failures = [];

  if (assertCityLive("newcastle")?.ok !== true) {
    failures.push("C0: assertCityLive(newcastle) must pass");
  }
  if (getCity("newcastle")?.status !== "live") {
    failures.push("C0: newcastle registry status must be live");
  }
  if (!isMultiCity("newcastle")) {
    failures.push("C0: newcastle must be in MULTI_CITY_IDS");
  }
  if (assertCityLive("perth")?.ok !== true) {
    failures.push("C0: Perth live-gate must stay green");
  }
  if (lineMap.timeZone !== "Australia/Sydney" || lineMap.dst !== true) {
    failures.push("C0: Australia/Sydney must record DST");
  }
  if (!existsSync(join(ROOT, "qa/fixtures/newcastle/published-network.json"))) {
    failures.push("D2: copy docs/newcastle-d1/published-network.json into qa/fixtures/newcastle/");
  } else {
    const published = loadJson("qa/fixtures/newcastle/published-network.json");
    if (published.printedInnerCityNames?.lock && published.printedInnerCityNames.lock !== HUB) {
      failures.push(`C2: D1 hub ${published.printedInnerCityNames.lock} must be ${HUB}`);
    }
    const d1Stations = published.lines?.[0]?.stations ?? [];
    if (JSON.stringify(d1Stations) !== JSON.stringify(lineMap.lines?.[0]?.stations ?? [])) {
      failures.push("C3: line-map stations must match D1 published-network (not GTFS)");
    }
  }

  const line = (lineMap.lines ?? [])[0];
  if (line?.id !== "nlr" || JSON.stringify(line.stations) !== JSON.stringify(PRINTED)) {
    failures.push(`C1: expected six printed NLR stops, got ${(line?.stations ?? []).join("; ")}`);
  }

  const catalogNames = (catalog.stations ?? []).map((row) => row.name);
  if (catalogNames.length !== 6) {
    failures.push(`C2: catalog must have 6 stops, got ${catalogNames.length}`);
  }
  if (!catalogNames.includes(HUB) || catalogNames.includes("Wickham")) {
    failures.push("C2: catalog must lock Newcastle Interchange, not Wickham");
  }
  const interchange = (catalog.stations ?? []).find((row) => row.name === HUB);
  if ((interchange?.stopIds ?? []).includes("229310")) {
    failures.push("C2: do not board the heavy-rail parent stop at Newcastle Interchange");
  }

  const passenger = new Set([...catalogNames, ...(line?.stations ?? [])]);
  for (const name of NOT_OPEN) {
    if ([...passenger].some((row) => foldKey(row) === foldKey(name))) {
      failures.push(`C3: do not invent unopened/non-LR stop ${name}`);
    }
  }

  const hubLabels = marketingLabelsForStation(HUB);
  if (!hubLabels.includes("NLR + Newcastle Beach") || hubLabels.length !== 1) {
    failures.push(`C7: hub labels ${hubLabels.join("; ")}`);
  }
  const civic = marketingLabelsForStation("Civic");
  if (!civic.includes("NLR + Newcastle Interchange") || !civic.includes("NLR + Newcastle Beach")) {
    failures.push(`C7: Civic labels ${civic.join("; ")}`);
  }

  const destCases = [
    ["Newcastle Beach", "NLR + Newcastle Beach"],
    ["Newcastle Beach Light Rail", "NLR + Newcastle Beach"],
    ["Newcastle Interchange Light Rail", "NLR + Newcastle Interchange"],
    ["Honeysuckle Light Rail", "NLR + Honeysuckle"],
  ];
  for (const [headsign, expected] of destCases) {
    const got = mapNewcastleDestination(headsign);
    if (got !== expected) {
      failures.push(`board dest: ${headsign} → ${got} expected ${expected}`);
    }
  }

  if (failures.length) {
    console.error("newcastle-line-map-conformance failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
  console.log("newcastle-line-map-conformance: ok (live testers, D1 NLR oracle, not Sydney)");
}

main();
