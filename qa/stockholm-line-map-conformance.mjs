/**
 * D5 — Offline Stockholm line-map conformance.
 * Usage: node qa/stockholm-line-map-conformance.mjs
 *
 * City stays planned. D1 pack required. Not generated from GTFS.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import {
  foldKey,
  mapStockholmDestination,
  marketingLabelsForStation,
  METRO_HUB,
  PENDELTÅG_HUB,
  SJ_HUB,
} from "../lib/cities/stockholm/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRINTED_CODES = ["10", "11", "13", "14", "17", "18", "19", "40", "41", "43", "48"];
const SWEDISH = ["T-Centralen", "Södertälje", "Hässelby", "Mörby", "Åkeshov"];
const MARK_PROBES = [
  "T-Centralen",
  "Stockholm City",
  "Odenplan",
  "Stockholm Odenplan",
  "Slussen",
  "Fridhemsplan",
  "Östermalmstorg",
  "Arlanda central",
  "Södertälje centrum",
  "Hjulsta",
  "Norsborg",
];

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function main() {
  const lineMap = loadJson("lib/cities/stockholm/line-map.json");
  const catalog = loadJson("lib/cities/stockholm/stations.json");
  const failures = [];

  if (assertCityLive("stockholm")?.ok === true) {
    failures.push("C0: assertCityLive(stockholm) must fail (city stays planned)");
  }
  if (getCity("stockholm")?.status !== "planned") {
    failures.push("C0: stockholm registry status must be planned");
  }
  if (isMultiCity("stockholm")) {
    failures.push("C0: stockholm must not join MULTI_CITY_IDS until Tim flips live");
  }
  if (assertCityLive("perth")?.ok !== true) {
    failures.push("C0: Perth live-gate must stay green");
  }
  if (lineMap.timeZone !== "Europe/Stockholm" || lineMap.dst !== true) {
    failures.push("C0: Europe/Stockholm must record DST");
  }

  const codes = (lineMap.lines ?? []).map((line) => line.number);
  if (JSON.stringify(codes) !== JSON.stringify(PRINTED_CODES)) {
    failures.push(`C1: expected ${PRINTED_CODES.join(",")} got ${codes.join(",")}`);
  }
  if ((lineMap.lines ?? []).some((line) => ["42", "44", "7", "12", "21", "25", "26", "27", "28", "29", "30", "31"].includes(line.number))) {
    failures.push("C1: later-mode / withdrawn lines must not be D1 rows");
  }

  const catalogNames = (catalog.stations ?? []).map((row) => row.name);
  if (!catalogNames.includes(METRO_HUB) || !catalogNames.includes(PENDELTÅG_HUB)) {
    failures.push("C2: catalog must lock T-Centralen and Stockholm City");
  }
  if (catalogNames.includes(SJ_HUB)) {
    failures.push("C2: Stockholms central is not a v1 pickable station");
  }
  for (const name of MARK_PROBES) {
    if (!catalogNames.includes(name)) {
      failures.push(`Mark probe: catalog must include ${name}`);
    }
  }
  if (catalogNames.includes("Göteborg") || catalogNames.some((name) => /gothenburg|goteborg/i.test(name))) {
    failures.push("C2: Göteborg is not this city");
  }
  for (const token of SWEDISH) {
    if (!JSON.stringify(catalogNames).includes(token) && token !== "Södertälje") {
      failures.push(`C2: catalog must preserve ${token}`);
    }
  }
  if (!catalogNames.some((name) => name.includes("Södertälje"))) {
    failures.push("C2: catalog must preserve Södertälje");
  }

  const metro = (catalog.stations ?? []).find((row) => row.name === METRO_HUB);
  const city = (catalog.stations ?? []).find((row) => row.name === PENDELTÅG_HUB);
  const oden = (catalog.stations ?? []).find((row) => row.name === "Odenplan");
  const stOden = (catalog.stations ?? []).find((row) => row.name === "Stockholm Odenplan");
  if (!metro || !city || metro.siteId === city.siteId) {
    failures.push("C2: T-Centralen and Stockholm City must be distinct sites");
  }
  if (!oden || !stOden || oden.siteId === stOden.siteId) {
    failures.push("C2: Odenplan and Stockholm Odenplan must be distinct sites");
  }
  const blob = JSON.stringify(catalog);
  if (/stockholm central(?!station)/i.test(blob) || catalogNames.some((name) => /britomart/i.test(name))) {
    failures.push("C2: do not emit Stockholm Central as a catalog name");
  }
  for (const row of catalog.stations ?? []) {
    const aliases = `${row.name} ${(row.aliases ?? []).join(" ")}`;
    if (row.name !== METRO_HUB && /stockholms central|stockholm c\b/i.test(aliases)) {
      failures.push(`C2: ${row.name} must not alias Stockholms central / Stockholm C`);
    }
    if (row.name === METRO_HUB && /stockholm city/i.test(aliases)) {
      failures.push("C2: T-Centralen must not alias Stockholm City");
    }
    if (row.name === "Odenplan" && /stockholm odenplan/i.test(aliases)) {
      failures.push("C2: Odenplan must not alias Stockholm Odenplan");
    }
    if (row.name === "Sundbybergs centrum" && (row.aliases ?? []).includes("Sundbyberg")) {
      failures.push("C2: Sundbybergs centrum must not alias Sundbyberg");
    }
  }

  const d1Path = join(ROOT, "docs/stockholm-d1/published-network.json");
  const publishedPath = join(ROOT, "qa/fixtures/stockholm/published-network.json");
  if (!existsSync(d1Path)) {
    failures.push("C3: docs/stockholm-d1/published-network.json is the Expansion pack");
  }
  if (!existsSync(publishedPath)) {
    failures.push("C3: Luke D1 published-network.json must be copied into qa/fixtures/stockholm/");
  } else if (existsSync(d1Path) && readFileSync(d1Path, "utf8") !== readFileSync(publishedPath, "utf8")) {
    failures.push("C3: qa/fixtures/stockholm/published-network.json must match docs/stockholm-d1 verbatim");
  }
  if (existsSync(publishedPath)) {
    const published = JSON.parse(readFileSync(publishedPath, "utf8"));
    if (published.printedInnerCityNames?.lockMetro !== METRO_HUB) {
      failures.push("C2: D1 lockMetro must be T-Centralen");
    }
    if (published.printedInnerCityNames?.lockPendeltag !== PENDELTÅG_HUB) {
      failures.push("C2: D1 lockPendeltag must be Stockholm City");
    }
    for (const line of published.lines ?? []) {
      const mapped = (lineMap.lines ?? []).find((entry) => entry.number === line.number);
      if (!mapped) {
        failures.push(`C3: line-map missing D1 line ${line.number}`);
        continue;
      }
      const pub = new Set((line.stations ?? []).map(foldKey));
      const map = new Set((mapped.stations ?? []).map(foldKey));
      const extraMap = [...map].filter((key) => !pub.has(key));
      const extraPub = [...pub].filter((key) => !map.has(key));
      if (extraMap.length || extraPub.length) {
        failures.push(
          `C3: ${line.number} station mismatch extraMap=${extraMap.join("|") || "—"} extraPub=${extraPub.join("|") || "—"}`
        );
      }
    }
  }

  const line48 = (lineMap.lines ?? []).find((line) => line.number === "48");
  if (line48?.stations?.some((name) => foldKey(name) === foldKey(PENDELTÅG_HUB))) {
    failures.push("C3: line 48 must not through-run Stockholm City");
  }

  if (JSON.stringify(lineMap.shortTurnGroups ?? {}) !== "{}") {
    failures.push("C5: shortTurnGroups must stay empty (line+terminus; nested shorts are live, not extra D1 rows)");
  }

  const metroLabels = marketingLabelsForStation(METRO_HUB);
  if (!metroLabels.includes("Röda linjen + Norsborg")) {
    failures.push(`C7: T-Centralen must offer Röda linjen + Norsborg (got ${metroLabels.join("; ")})`);
  }
  if (metroLabels.some((label) => /pendeltåg/i.test(label))) {
    failures.push("C7: T-Centralen must not show pendeltåg chips");
  }
  if (metroLabels.some((label) => /inbound|outbound|to city/i.test(label))) {
    failures.push("C7: do not use inbound/outbound");
  }

  const cityLabels = marketingLabelsForStation(PENDELTÅG_HUB);
  if (!cityLabels.includes("Pendeltåg 40 + Uppsala C")) {
    failures.push("C7: Stockholm City must offer Pendeltåg 40 + Uppsala C");
  }
  if (cityLabels.some((label) => /t-centralen|röda|blå|gröna/i.test(label))) {
    failures.push("C7: Stockholm City must not show metro chips");
  }
  if (cityLabels.some((label) => /pendeltåg 48/i.test(label))) {
    failures.push("C7: line 48 must not appear at Stockholm City");
  }

  const destCases = [
    ["Norsborg", "13", "Röda linjen + Norsborg"],
    ["Kungsträdgården", "10", "Blå linjen + Kungsträdgården"],
    ["Hässelby strand", "19", "Gröna linjen + Hässelby strand"],
    ["Alvik", "18", "Gröna linjen + Alvik"],
    ["Uppsala C", "40", "Pendeltåg 40 + Uppsala C"],
    ["Södertälje centrum", "41", "Pendeltåg 41 + Södertälje centrum"],
    ["Kallhäll", "43X", "Pendeltåg 43 + Kallhäll"],
    ["Gnesta", "48", "Pendeltåg 48 + Gnesta"],
    ["Norsborg T-bana", "13", "Röda linjen + Norsborg"],
  ];
  for (const [headsign, code, expected] of destCases) {
    const got = mapStockholmDestination(headsign, code);
    if (got !== expected) {
      failures.push(`board dest: ${JSON.stringify(headsign)} ${code} → ${got} expected ${expected}`);
    }
    if (/stockholm central|stockholm c\b/i.test(got)) {
      failures.push(`board dest leaked Stockholm Central: ${got}`);
    }
  }

  if (failures.length) {
    console.error("stockholm-line-map-conformance failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("stockholm-line-map-conformance: ok (planned, D1 pack present)");
}

main();
