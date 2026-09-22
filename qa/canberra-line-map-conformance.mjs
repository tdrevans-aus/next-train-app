/**
 * Offline Canberra light-rail line-map conformance.
 * Usage: node qa/canberra-line-map-conformance.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import {
  foldKey,
  HUB,
  mapCanberraDestination,
  marketingLabelsForStation,
} from "../lib/cities/canberra/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STAGE_2A = ["Edinburgh Avenue", "City South", "Commonwealth Park", "Woden"];
const PRINTED = [
  "Gungahlin Place",
  "Manning Clark North",
  "Mapleton Avenue",
  "Nullarbor Avenue",
  "Well Station Drive",
  "Sandford Street",
  "EPIC and Racecourse",
  "Phillip Avenue",
  "Swinden Street",
  "Dickson Interchange",
  "Macarthur Avenue",
  "Ipima Street",
  "Elouera Street",
  "Alinga Street",
];

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function main() {
  const lineMap = loadJson("lib/cities/canberra/line-map.json");
  const catalog = loadJson("lib/cities/canberra/stations.json");
  const failures = [];

  if (assertCityLive("canberra")?.ok !== true) {
    failures.push("C0: assertCityLive(canberra) must pass (testers live)");
  }
  if (getCity("canberra")?.status !== "live") {
    failures.push("C0: canberra registry status must be live");
  }
  if (!isMultiCity("canberra")) {
    failures.push("C0: canberra must be in MULTI_CITY_IDS");
  }
  if (assertCityLive("perth")?.ok !== true) {
    failures.push("C0: Perth live-gate must stay green");
  }
  // Anchor moved off melbourne (flipped live 22 Sep 2026) to bart — see
  // docs/jim-brief-melbourne-flip-unblock.md.
  if (assertCityLive("bart")?.ok !== false) {
    failures.push("C0: BART must stay planned");
  }
  if (lineMap.timeZone !== "Australia/Sydney" || lineMap.dst !== true) {
    failures.push("C0: Australia/Sydney must record DST");
  }
  if (!existsSync(join(ROOT, "qa/fixtures/canberra/published-network.json"))) {
    failures.push("D2: copy docs/canberra-d1/published-network.json into qa/fixtures/canberra/");
  } else {
    const published = loadJson("qa/fixtures/canberra/published-network.json");
    if (published.printedInnerCityNames?.lock !== HUB) {
      failures.push(`C2: D1 hub ${published.printedInnerCityNames?.lock} must be ${HUB}`);
    }
    const d1Stations = published.lines?.[0]?.stations ?? [];
    if (JSON.stringify(d1Stations) !== JSON.stringify(lineMap.lines?.[0]?.stations ?? [])) {
      failures.push("C3: line-map stations must match D1 published-network (not GTFS)");
    }
  }
  if ((getCity("canberra")?.envKeys ?? []).length) {
    failures.push("C0: do not invent MyWay+ credentials");
  }

  const line = (lineMap.lines ?? [])[0];
  if (line?.id !== "r1" || JSON.stringify(line.stations) !== JSON.stringify(PRINTED)) {
    failures.push(`C1: expected 14 printed Stage 1 stops, got ${(line?.stations ?? []).join("; ")}`);
  }

  const catalogNames = (catalog.stations ?? []).map((row) => row.name);
  if (catalogNames.length !== 14) {
    failures.push(`C2: catalog must have 14 stops, got ${catalogNames.length}`);
  }
  if (!catalogNames.includes(HUB) || catalogNames.includes("City")) {
    failures.push("C2: catalog must lock Alinga Street and must not use City as the hub name");
  }

  const passenger = new Set([...catalogNames, ...(line?.stations ?? [])]);
  for (const name of STAGE_2A) {
    if ([...passenger].some((row) => foldKey(row) === foldKey(name))) {
      failures.push(`C3: do not invent Stage 2A/Woden station ${name}`);
    }
  }

  const hubLabels = marketingLabelsForStation(HUB);
  if (!hubLabels.includes("R1 Gungahlin Place") || hubLabels.length !== 1) {
    failures.push(`C7: hub labels ${hubLabels.join("; ")}`);
  }
  if (hubLabels.some((label) => /inbound|outbound/i.test(label))) {
    failures.push("C7: direction is line + terminus, not inbound/outbound");
  }

  const destCases = [
    ["Alinga St", "R1 Alinga Street"],
    ["Gungahlin Pl", "R1 Gungahlin Place"],
    ["Alinga Street", "R1 Alinga Street"],
  ];
  for (const [headsign, expected] of destCases) {
    const got = mapCanberraDestination(headsign);
    if (got !== expected) {
      failures.push(`board dest: ${headsign} → ${got} expected ${expected}`);
    }
  }

  if (failures.length) {
    console.error("canberra-line-map-conformance failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
  console.log("canberra-line-map-conformance: ok (live testers, D1 oracle lock, no GTFS map)");
}

main();
