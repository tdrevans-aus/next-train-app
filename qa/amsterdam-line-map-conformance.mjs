/**
 * Offline Amsterdam metro line-map conformance.
 * Usage: node qa/amsterdam-line-map-conformance.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import {
  foldKey,
  HUB,
  mapAmsterdamDestination,
  marketingLabelsForStation,
} from "../lib/cities/amsterdam/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRINTED_CODES = ["50", "51", "52", "53", "54"];

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function main() {
  const lineMap = loadJson("lib/cities/amsterdam/line-map.json");
  const catalog = loadJson("lib/cities/amsterdam/stations.json");
  const failures = [];

  if (assertCityLive("amsterdam")?.ok !== true) {
    failures.push("C0: assertCityLive(amsterdam) must pass (testers live)");
  }
  if (getCity("amsterdam")?.status !== "live") {
    failures.push("C0: amsterdam registry status must be live");
  }
  if (!isMultiCity("amsterdam")) {
    failures.push("C0: amsterdam must be in MULTI_CITY_IDS");
  }
  if (assertCityLive("perth")?.ok !== true) {
    failures.push("C0: Perth live-gate must stay green");
  }
  if (getCity("nl")) {
    failures.push("C0: city=nl must not exist");
  }
  if (lineMap.timeZone !== "Europe/Amsterdam" || lineMap.dst !== true) {
    failures.push("C0: Europe/Amsterdam must record DST");
  }
  if (existsSync(join(ROOT, "qa/fixtures/amsterdam/published-network.json"))) {
    failures.push("C3: do not land a GTFS-generated published-network.json; wait for Luke D1");
  }

  const codes = (lineMap.lines ?? []).map((line) => line.number);
  if (JSON.stringify(codes) !== JSON.stringify(PRINTED_CODES)) {
    failures.push(`C1: expected ${PRINTED_CODES.join(",")} got ${codes.join(",")}`);
  }

  const catalogNames = (catalog.stations ?? []).map((row) => row.name);
  if (!catalogNames.includes(HUB)) {
    failures.push("C2: catalog must lock Centraal Station");
  }
  if (catalogNames.includes("Amsterdam Centraal") || catalogNames.includes("Schiphol")) {
    failures.push("C2: do not catalog NS Amsterdam Centraal or Schiphol");
  }
  for (const row of catalog.stations ?? []) {
    const blob = `${row.name} ${(row.aliases ?? []).join(" ")}`;
    if (/amsterdam centraal/i.test(blob) && row.name !== HUB) {
      failures.push(`C2: ${row.name} must not alias Amsterdam Centraal`);
    }
    if (row.name === HUB && (row.aliases ?? []).some((alias) => /amsterdam centraal/i.test(alias))) {
      failures.push("C2: Centraal Station must not alias NS Amsterdam Centraal");
    }
  }

  const centraal = (catalog.stations ?? []).find((row) => row.name === HUB);
  if ((centraal?.stopIds?.length ?? 0) < 2) {
    failures.push("C2: Centraal Station must keep multiple metro stop ids (M52 deeper platforms)");
  }

  const m50 = (lineMap.lines ?? []).find((line) => line.number === "50");
  if (m50?.stations?.some((name) => foldKey(name) === foldKey(HUB))) {
    failures.push("C3: M50 does not serve Centraal Station");
  }
  if (JSON.stringify(catalogNames).includes("Schiphol")) {
    failures.push("C3: metro does not go to Schiphol");
  }

  const hubLabels = marketingLabelsForStation(HUB);
  if (!hubLabels.includes("M52 + Noord") || !hubLabels.includes("M54 + Gein")) {
    failures.push(`C7: hub labels ${hubLabels.join("; ")}`);
  }
  if (hubLabels.some((label) => /inbound|outbound/i.test(label))) {
    failures.push("C7: direction is line + terminus, not inbound/outbound");
  }

  const destCases = [
    ["Gein", "50", "M50 + Gein"],
    ["Isolatorweg", "51", "M51 + Isolatorweg"],
    ["Noord", "52", "M52 + Noord"],
    ["Zuid", "52", "M52 + Station Zuid"],
    ["Centraal Station", "54", "M54 + Centraal Station"],
    ["Gaasperplas", "53", "M53 + Gaasperplas"],
  ];
  for (const [headsign, code, expected] of destCases) {
    const got = mapAmsterdamDestination(headsign, code);
    if (got !== expected) {
      failures.push(`board dest: ${headsign} ${code} → ${got} expected ${expected}`);
    }
    if (/amsterdam centraal/i.test(got)) {
      failures.push(`board dest leaked NS name: ${got}`);
    }
  }

  if (failures.length) {
    console.error("amsterdam-line-map-conformance failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
  console.log("amsterdam-line-map-conformance: ok (live testers, official map lock, no GTFS D1)");
}

main();
