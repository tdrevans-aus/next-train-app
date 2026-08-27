/**
 * Offline Vancouver SkyTrain line-map conformance.
 * Usage: node qa/vancouver-line-map-conformance.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import {
  foldKey,
  HUB,
  mapVancouverDestination,
  marketingLabelsForStation,
} from "../lib/cities/vancouver/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BROADWAY_SUBWAY = [
  "Great Northern Way–Emily Carr",
  "Mount Pleasant",
  "Oak–VGH",
  "South Granville",
  "Arbutus",
];

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function main() {
  const lineMap = loadJson("lib/cities/vancouver/line-map.json");
  const catalog = loadJson("lib/cities/vancouver/stations.json");
  const failures = [];

  if (assertCityLive("vancouver")?.ok !== true) {
    failures.push("C0: assertCityLive(vancouver) must pass (testers live)");
  }
  if (getCity("vancouver")?.status !== "live") {
    failures.push("C0: vancouver registry status must be live");
  }
  if (!isMultiCity("vancouver")) {
    failures.push("C0: vancouver must be in MULTI_CITY_IDS");
  }
  if (assertCityLive("perth")?.ok !== true) {
    failures.push("C0: Perth live-gate must stay green");
  }
  if (getCity("canada")) {
    failures.push("C0: city=canada must not exist");
  }
  if (lineMap.timeZone !== "America/Vancouver" || lineMap.dst !== true) {
    failures.push("C0: America/Vancouver must record DST");
  }
  if (existsSync(join(ROOT, "qa/fixtures/vancouver/published-network.json"))) {
    failures.push("C3: do not land a GTFS-generated published-network.json; wait for Luke D1");
  }

  const ids = (lineMap.lines ?? []).map((line) => line.id);
  if (JSON.stringify(ids) !== JSON.stringify(["expo", "millennium", "canada"])) {
    failures.push(`C1: expected expo,millennium,canada got ${ids.join(",")}`);
  }

  const catalogNames = (catalog.stations ?? []).map((row) => row.name);
  if (!catalogNames.includes(HUB)) {
    failures.push("C2: catalog must lock Waterfront");
  }
  if (catalogNames.includes("Waterfront") === false) {
    failures.push("C2: hub product name is Waterfront");
  }

  const mill = (lineMap.lines ?? []).find((line) => line.id === "millennium");
  if (mill?.stations?.some((name) => foldKey(name) === foldKey(HUB))) {
    failures.push("C3: Millennium does not serve Waterfront");
  }
  if (mill?.stations?.some((name) => foldKey(name) === foldKey("Broadway–City Hall"))) {
    failures.push("C3: Broadway–City Hall is Canada Line only until Broadway Subway opens");
  }
  const passengerStations = new Set([
    ...(catalogNames ?? []),
    ...(lineMap.lines ?? []).flatMap((line) => line.stations ?? []),
  ]);
  for (const name of BROADWAY_SUBWAY) {
    if ([...passengerStations].some((row) => foldKey(row) === foldKey(name))) {
      failures.push(`C3: do not invent Broadway Subway station ${name}`);
    }
  }

  if (!catalogNames.includes("Capstan")) {
    failures.push("C2: Capstan is in service on Canada Line");
  }

  const waterfront = (catalog.stations ?? []).find((row) => row.name === HUB);
  if ((waterfront?.stopIds?.length ?? 0) < 2) {
    failures.push("C2: Waterfront must keep Expo and Canada Line stop ids");
  }

  const hubLabels = marketingLabelsForStation(HUB);
  if (
    !hubLabels.includes("Expo Line King George") ||
    !hubLabels.includes("Canada Line YVR–Airport") ||
    !hubLabels.includes("Canada Line Richmond–Brighouse")
  ) {
    failures.push(`C7: hub labels ${hubLabels.join("; ")}`);
  }
  if (hubLabels.some((label) => /millennium|inbound|outbound/i.test(label))) {
    failures.push("C7: Waterfront chips must be Expo/Canada line + terminus");
  }

  const destCases = [
    ["Expo Line To King George", "expo", "Expo Line King George"],
    ["Expo Line To Production Way-University", "expo", "Expo Line Production Way–University"],
    ["Expo Line To Braid", "expo", "Expo Line Production Way–University"],
    ["Canada Line To YVR-Airport", "canada", "Canada Line YVR–Airport"],
    ["Canada Line To Richmond-Brighouse", "canada", "Canada Line Richmond–Brighouse"],
    ["Canada Line To Waterfront", "canada", "Canada Line Waterfront"],
    ["Millennium Line To VCC-Clark", "millennium", "Millennium Line VCC–Clark"],
    ["Millennium Line To Lafarge Lake-Douglas", "millennium", "Millennium Line Lafarge Lake–Douglas"],
  ];
  for (const [headsign, code, expected] of destCases) {
    const got = mapVancouverDestination(headsign, code);
    if (got !== expected) {
      failures.push(`board dest: ${headsign} ${code} → ${got} expected ${expected}`);
    }
  }

  if (failures.length) {
    console.error("vancouver-line-map-conformance failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
  console.log("vancouver-line-map-conformance: ok (live testers, official map lock, no GTFS D1)");
}

main();
