/**
 * Offline Gold Coast G:link line-map conformance.
 * Usage: node qa/gold-coast-line-map-conformance.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import {
  foldKey,
  HUB,
  mapGoldCoastDestination,
  marketingLabelsForStation,
} from "../lib/cities/gold-coast/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STAGE_3 = [
  "Mermaid Beach",
  "Mermaid Beach South",
  "Nobby Beach",
  "Miami North",
  "Miami",
  "Christine Avenue",
  "Second Avenue",
  "Burleigh Heads",
];
const NOT_OPEN = ["Biggera Waters", "Palm Beach", "Coolangatta", "Gold Coast Airport"];

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function main() {
  const lineMap = loadJson("lib/cities/gold-coast/line-map.json");
  const catalog = loadJson("lib/cities/gold-coast/stations.json");
  const failures = [];

  if (assertCityLive("gold-coast")?.ok !== true) {
    failures.push("C0: assertCityLive(gold-coast) must pass");
  }
  if (getCity("gold-coast")?.status !== "live") {
    failures.push("C0: gold-coast registry status must be live");
  }
  if (!isMultiCity("gold-coast")) {
    failures.push("C0: gold-coast must be in MULTI_CITY_IDS");
  }
  if (assertCityLive("perth")?.ok !== true) {
    failures.push("C0: Perth live-gate must stay green");
  }
  if (lineMap.timeZone !== "Australia/Brisbane" || lineMap.dst !== false) {
    failures.push("C0: Australia/Brisbane has no DST");
  }
  if (!existsSync(join(ROOT, "qa/fixtures/gold-coast/published-network.json"))) {
    failures.push("D2: copy docs/gold-coast-d1/published-network.json into qa/fixtures/gold-coast/");
  } else {
    const published = loadJson("qa/fixtures/gold-coast/published-network.json");
    if (published.printedInnerCityNames?.lock !== HUB) {
      failures.push(`C2: D1 hub ${published.printedInnerCityNames?.lock} must be ${HUB}`);
    }
    const d1Stations = published.lines?.[0]?.stations ?? [];
    if (JSON.stringify(d1Stations) !== JSON.stringify(lineMap.lines?.[0]?.stations ?? [])) {
      failures.push("C3: line-map stations must match D1 published-network (not GTFS)");
    }
  }

  const line = (lineMap.lines ?? [])[0];
  if (line?.id !== "l1" || (line.stations ?? []).length !== 27) {
    failures.push(`C1: expected 27 L1 stops, got ${(line?.stations ?? []).length}`);
  }
  if (line?.termini?.[0] !== "Helensvale" || line?.termini?.[1] !== "Burleigh Heads") {
    failures.push("C1: termini must be Helensvale and Burleigh Heads");
  }

  const catalogNames = (catalog.stations ?? []).map((row) => row.name);
  if (catalogNames.length !== 27) {
    failures.push(`C2: catalog must have 27 stops, got ${catalogNames.length}`);
  }
  if (!catalogNames.includes(HUB) || !catalogNames.includes("Cavill Avenue")) {
    failures.push("C2: catalog must lock Helensvale and still list Cavill Avenue as an intermediate stop");
  }
  const helensvale = (catalog.stations ?? []).find((row) => row.name === HUB);
  if ((helensvale?.stopIds ?? []).some((id) => id === "place_helsta" || id === "600119" || id === "600245")) {
    failures.push("C2: do not board QR Helensvale train platforms / shared parent");
  }
  if (!(lineMap.doNotGroup ?? []).some((row) => row.a === "Helensvale")) {
    failures.push("C2: doNotGroup Helensvale tram vs QR");
  }
  if (catalogNames.includes("Varsity Lakes") || catalogNames.includes("Beenleigh")) {
    failures.push("C2: SEQ train stations must not be in gold-coast");
  }
  for (const name of STAGE_3) {
    if (!catalogNames.includes(name) || !(line.stations ?? []).includes(name)) {
      failures.push(`C3: Stage 3 stop missing: ${name}`);
    }
  }
  const passenger = new Set([...catalogNames, ...(line?.stations ?? [])]);
  for (const name of NOT_OPEN) {
    if ([...passenger].some((row) => foldKey(row) === foldKey(name))) {
      failures.push(`C3: do not invent unopened stop ${name}`);
    }
  }

  const hubLabels = marketingLabelsForStation(HUB);
  if (!hubLabels.includes("L1 Burleigh Heads") || hubLabels.length !== 1) {
    failures.push(`C7: hub labels ${hubLabels.join("; ")}`);
  }

  const destCases = [
    ["Burleigh Heads", "L1 Burleigh Heads"],
    ["Helensvale", "L1 Helensvale"],
    ["Helensvale station", "L1 Helensvale"],
  ];
  for (const [headsign, expected] of destCases) {
    const got = mapGoldCoastDestination(headsign);
    if (got !== expected) {
      failures.push(`board dest: ${headsign} → ${got} expected ${expected}`);
    }
  }

  if (failures.length) {
    console.error("gold-coast-line-map-conformance failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
  console.log("gold-coast-line-map-conformance: ok (live testers, D1 G:link oracle, hub Helensvale, Stage 3 in)");
}

main();
