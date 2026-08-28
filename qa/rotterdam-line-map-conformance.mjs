/**
 * Offline Rotterdam RET metro line-map conformance.
 * Usage: node qa/rotterdam-line-map-conformance.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import {
  foldKey,
  HUB,
  mapRotterdamDestination,
  marketingLabelsForStation,
} from "../lib/cities/rotterdam/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRINTED = { A: 20, B: 32, C: 26, D: 17, E: 23 };
const TERMINI = {
  A: ["Binnenhof", "Schiedam Centrum"],
  B: ["Nesselande", "Hoek van Holland Strand"],
  C: ["De Terp", "De Akkers"],
  D: ["Rotterdam Centraal", "De Akkers"],
  E: ["Den Haag Centraal", "Slinge"],
};

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function main() {
  const lineMap = loadJson("lib/cities/rotterdam/line-map.json");
  const catalog = loadJson("lib/cities/rotterdam/stations.json");
  const failures = [];

  if (assertCityLive("rotterdam")?.ok !== true) {
    failures.push("C0: assertCityLive(rotterdam) must pass (testers live)");
  }
  if (getCity("rotterdam")?.status !== "live") {
    failures.push("C0: rotterdam registry status must be live");
  }
  if (!isMultiCity("rotterdam")) {
    failures.push("C0: rotterdam must be in MULTI_CITY_IDS");
  }
  if (assertCityLive("perth")?.ok !== true) {
    failures.push("C0: Perth live-gate must stay green");
  }
  if (assertCityLive("amsterdam")?.ok !== true) {
    failures.push("C0: Amsterdam stays live");
  }
  if (assertCityLive("melbourne")?.ok !== false) {
    failures.push("C0: Melbourne stays planned");
  }
  if (getCity("nl") || getCity("the-hague")) {
    failures.push("C0: city=nl / the-hague must not exist");
  }
  if (lineMap.timeZone !== "Europe/Amsterdam" || lineMap.dst !== true) {
    failures.push("C0: Europe/Amsterdam must record DST");
  }
  if (!existsSync(join(ROOT, "qa/fixtures/rotterdam/published-network.json"))) {
    failures.push("D2: copy docs/rotterdam-d1/published-network.json into qa/fixtures/rotterdam/");
  } else {
    const published = loadJson("qa/fixtures/rotterdam/published-network.json");
    if (published.printedInnerCityNames?.lock !== HUB) {
      failures.push(`C2: D1 hub ${published.printedInnerCityNames?.lock} must be ${HUB}`);
    }
    if (published.printedInnerCityNames?.airportLock !== "Meijersplein/Airport") {
      failures.push("C2: lock Meijersplein/Airport");
    }
    if (published.printedInnerCityNames?.strandLock !== "Hoek van Holland Strand") {
      failures.push("C2: lock Hoek van Holland Strand");
    }
    for (const line of published.lines ?? []) {
      const mapped = (lineMap.lines ?? []).find((row) => row.id === line.id);
      if (JSON.stringify(mapped?.stations ?? []) !== JSON.stringify(line.stations ?? [])) {
        failures.push(`C3: line-map ${line.id} stations must match D1 published-network (not GTFS)`);
      }
    }
  }

  const unique = new Set();
  for (const line of lineMap.lines ?? []) {
    const expected = PRINTED[line.number];
    if ((line.stations ?? []).length !== expected) {
      failures.push(`C1: ${line.name} expected ${expected} stops, got ${(line.stations ?? []).length}`);
    }
    const termini = TERMINI[line.number];
    if (JSON.stringify(line.termini) !== JSON.stringify(termini)) {
      failures.push(`C1: ${line.name} termini must be ${termini.join("–")}`);
    }
    if (!(line.stations ?? []).includes(HUB)) {
      failures.push(`C2: ${line.name} must serve hub Beurs`);
    }
    for (const name of line.stations ?? []) {
      unique.add(name);
    }
  }
  if (unique.size !== 71) {
    failures.push(`C1: expected 71 unique stops, got ${unique.size}`);
  }

  const lineA = (lineMap.lines ?? []).find((line) => line.number === "A");
  if ((lineA?.stations ?? []).includes("Nesselande")) {
    failures.push("C1: A does not go to Nesselande");
  }
  const lineB = (lineMap.lines ?? []).find((line) => line.number === "B");
  if (!(lineB?.stations ?? []).includes("Hoek van Holland Strand")) {
    failures.push("C1: B includes Hoek van Holland Strand");
  }

  const catalogNames = (catalog.stations ?? []).map((row) => row.name);
  if (catalogNames.length !== 71) {
    failures.push(`C2: catalog must have 71 stops, got ${catalogNames.length}`);
  }
  if (!catalogNames.includes(HUB)) {
    failures.push("C2: catalog must lock Beurs");
  }
  if (!catalogNames.includes("Den Haag Centraal")) {
    failures.push("C2: Den Haag Centraal stays on rotterdam");
  }
  if (!catalogNames.includes("Meijersplein/Airport")) {
    failures.push("C2: catalog must lock Meijersplein/Airport");
  }
  if (!catalogNames.includes("Hoek van Holland Strand") || !catalogNames.includes("Hoek van Holland Haven")) {
    failures.push("C2: Strand and Haven are distinct catalog stops");
  }
  const blob = JSON.stringify(catalog);
  if (/gvb|isolatorweg|gaasperplas|\bgein\b|schiphol/i.test(blob)) {
    failures.push("C2: do not leak GVB names into rotterdam catalog");
  }

  const beurs = (catalog.stations ?? []).find((row) => row.name === HUB);
  if ((beurs?.stopIds?.length ?? 0) < 5) {
    failures.push("C2: Beurs must keep stop ids for all five RET lines");
  }

  const hubLabels = marketingLabelsForStation(HUB);
  if (!hubLabels.includes("Metro A + Binnenhof") || !hubLabels.includes("Metro E + Slinge")) {
    failures.push(`C7: hub labels ${hubLabels.join("; ")}`);
  }
  if (hubLabels.some((label) => /inbound|outbound/i.test(label))) {
    failures.push("C7: direction is line + terminus, not inbound/outbound");
  }
  if (hubLabels.some((label) => /metro a/i.test(label) && /nesselande/i.test(label))) {
    failures.push("C7: A chips must not include Nesselande");
  }

  const destCases = [
    ["Binnenhof", "A", "Metro A + Binnenhof"],
    ["Schiedam Centrum", "A", "Metro A + Schiedam Centrum"],
    ["Nesselande", "B", "Metro B + Nesselande"],
    ["Hoek v Holland Strand", "B", "Metro B + Hoek van Holland Strand"],
    ["Hoek van Holland Haven", "B", "Metro B + Hoek van Holland Haven"],
    ["De Akkers", "C", "Metro C + De Akkers"],
    ["Rotterdam Centraal", "D", "Metro D + Rotterdam Centraal"],
    ["Den Haag Centraal", "E", "Metro E + Den Haag Centraal"],
    ["Slinge", "E", "Metro E + Slinge"],
    ["Meijersplein", "E", "Metro E + Meijersplein/Airport"],
  ];
  for (const [headsign, code, expected] of destCases) {
    const got = mapRotterdamDestination(headsign, code);
    if (got !== expected) {
      failures.push(`board dest: ${headsign} ${code} → ${got} expected ${expected}`);
    }
    if (/gvb|m50|m51|m52|m53|m54/i.test(got)) {
      failures.push(`board dest leaked GVB: ${got}`);
    }
  }

  if (foldKey("Meijersplein/Airport") !== foldKey("Meijersplein / Airport")) {
    failures.push("C2: Meijersplein/Airport fold must accept slash variants");
  }

  if (failures.length) {
    console.error("rotterdam-line-map-conformance failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
  console.log("rotterdam-line-map-conformance: ok (live testers, RET A–E, 71 stops, Beurs hub, D1 lock)");
}

main();
