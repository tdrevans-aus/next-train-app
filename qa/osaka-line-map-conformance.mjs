/**
 * D5 — Offline Osaka line-map conformance.
 * Usage: node qa/osaka-line-map-conformance.mjs
 *
 * City stays planned. D1 pack required. Not generated from GTFS.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import {
  METRO_HUB,
  mapOsakaDestination,
  marketingLabelsForStation,
} from "../lib/cities/osaka/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRINTED_CODES = ["M", "T", "Y", "C", "S", "K", "N", "I"];
const PRINTED_NAMES = [
  "Midosuji",
  "Tanimachi",
  "Yotsubashi",
  "Chuo",
  "Sennichimae",
  "Sakaisuji",
  "Nagahori Tsurumi-ryokuchi",
  "Imazatosuji",
];
const TERMINI = {
  M: ["Esaka", "Nakamozu"],
  T: ["Dainichi", "Yao-minami"],
  Y: ["Nishi-Umeda", "Suminoekoen"],
  C: ["Yumeshima", "Nagata"],
  S: ["Nodahanshin", "Minami-Tatsumi"],
  K: ["Tenjimbashisuji 6-chome", "Tengachaya"],
  N: ["Taisho", "Kadoma-minami"],
  I: ["Itakano", "Imazato"],
};
const PRINTED_COUNTS = { M: 20, T: 26, Y: 11, C: 15, S: 14, K: 10, N: 17, I: 11 };
const MARK_PROBES = [
  "Hommachi",
  "Sakaisuji-Hommachi",
  "Umeda",
  "Higashi-Umeda",
  "Nishi-Umeda",
  "Namba",
  "Shinsaibashi",
  "Yotsubashi",
  "Esaka",
  "Yumeshima",
  "Nakamozu",
  "Nagata",
  "Tenjimbashisuji 6-chome",
];
const KITAKYU_BEYOND = ["Senri-Chuo", "Momoyamadai", "Minoh-Kayano", "Minohkayano", "Senri-chuo"];
const NEW_TRAM_ONLY = [
  "Trade Center-mae",
  "Nakafuto",
  "Port Town-nishi",
  "Port Town-higashi",
  "Ferry Terminal",
  "Nanko-higashi",
  "Nanko-guchi",
  "Hirabayashi",
];

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function main() {
  const lineMap = loadJson("lib/cities/osaka/line-map.json");
  const catalog = loadJson("lib/cities/osaka/stations.json");
  const failures = [];

  if (assertCityLive("osaka")?.ok === true) {
    failures.push("C0: assertCityLive(osaka) must fail (city stays planned)");
  }
  if (getCity("osaka")?.status !== "planned") {
    failures.push("C0: osaka registry status must be planned");
  }
  if (getCity("osaka")?.adapterReady !== false) {
    failures.push("C0: osaka adapterReady must be false");
  }
  if (isMultiCity("osaka")) {
    failures.push("C0: osaka must not join MULTI_CITY_IDS until Tim flips live");
  }
  if (assertCityLive("perth")?.ok !== true) {
    failures.push("C0: Perth live-gate must stay green");
  }
  if (assertCityLive("sydney")?.ok !== true) {
    failures.push("C0: Sydney live-gate must stay green");
  }
  if (assertCityLive("stockholm")?.ok !== true) {
    failures.push("C0: Stockholm tester-live must stay green");
  }
  if (lineMap.timeZone !== "Asia/Tokyo" || lineMap.dst !== false) {
    failures.push("C0: Asia/Tokyo must record no DST");
  }
  if (getCity("japan") || getCity("tokyo") || getCity("osk")) {
    failures.push("C0: city=japan / tokyo / osk must not exist");
  }

  const codes = (lineMap.lines ?? []).map((line) => line.number);
  if (JSON.stringify(codes) !== JSON.stringify(PRINTED_CODES)) {
    failures.push(`C1: expected ${PRINTED_CODES.join(",")} got ${codes.join(",")}`);
  }
  const names = (lineMap.lines ?? []).map((line) => line.name);
  if (JSON.stringify(names) !== JSON.stringify(PRINTED_NAMES)) {
    failures.push(`C1: expected ${PRINTED_NAMES.join(",")} got ${names.join(",")}`);
  }
  if ((lineMap.lines ?? []).some((line) => ["P", "New Tram", "Nanko Port Town"].includes(line.number) || /new tram|nanko/i.test(line.name))) {
    failures.push("C1: New Tram / Nanko Port Town must not be a D1 line");
  }

  const catalogNames = (catalog.stations ?? []).map((row) => row.name);
  if (catalogNames.length !== 101 || new Set(catalogNames).size !== 101) {
    failures.push(`C2: catalog must have 101 unique names, got ${catalogNames.length}`);
  }
  if (!catalogNames.includes(METRO_HUB)) {
    failures.push("C2: catalog must lock Hommachi");
  }
  for (const name of MARK_PROBES) {
    if (!catalogNames.includes(name)) {
      failures.push(`Mark probe: catalog must include ${name}`);
    }
  }
  for (const name of [...KITAKYU_BEYOND, ...NEW_TRAM_ONLY]) {
    if (catalogNames.includes(name)) {
      failures.push(`C2: catalog must not include ${name}`);
    }
  }

  const d1Path = join(ROOT, "docs/osaka-d1/published-network.json");
  const publishedPath = join(ROOT, "qa/fixtures/osaka/published-network.json");
  if (!existsSync(d1Path)) {
    failures.push("C3: docs/osaka-d1/published-network.json is the Expansion pack");
  }
  if (!existsSync(publishedPath)) {
    failures.push("C3: D1 published-network.json must be copied into qa/fixtures/osaka/");
  } else if (existsSync(d1Path) && readFileSync(d1Path, "utf8") !== readFileSync(publishedPath, "utf8")) {
    failures.push("C3: qa/fixtures/osaka/published-network.json must match docs/osaka-d1 verbatim");
  }
  if (existsSync(publishedPath)) {
    const published = JSON.parse(readFileSync(publishedPath, "utf8"));
    if (published.printedInnerCityNames?.lock !== METRO_HUB) {
      failures.push("C2: D1 lock must be Hommachi");
    }
    if (published.timezone !== "Asia/Tokyo") {
      failures.push("C0: D1 JSON timezone must be lowercase Asia/Tokyo");
    }
    if (published.timeZone) {
      failures.push("C0: D1 JSON must use timezone, not timeZone");
    }
    if (published.uniqueStationCount !== 101) {
      failures.push(`C1: D1 uniqueStationCount must be 101, got ${published.uniqueStationCount}`);
    }
    for (const line of published.lines ?? []) {
      const mapped = (lineMap.lines ?? []).find((entry) => entry.number === line.number);
      if (!mapped) {
        failures.push(`C3: line-map missing D1 line ${line.number}`);
        continue;
      }
      const pub = line.stations ?? [];
      const map = mapped.stations ?? [];
      if (JSON.stringify(pub) !== JSON.stringify(map)) {
        failures.push(`C3: ${line.number} station order mismatch`);
      }
      const expectedTermini = TERMINI[line.number];
      if (JSON.stringify(line.termini) !== JSON.stringify(expectedTermini)) {
        failures.push(`C1: ${line.name} termini expected ${expectedTermini.join("–")} got ${(line.termini ?? []).join("–")}`);
      }
      if (JSON.stringify(mapped.termini) !== JSON.stringify(expectedTermini)) {
        failures.push(`C1: line-map ${line.name} termini expected ${expectedTermini.join("–")}`);
      }
    }
  }

  const unique = new Set();
  for (const line of lineMap.lines ?? []) {
    if ((line.stations ?? []).length !== PRINTED_COUNTS[line.number]) {
      failures.push(`C1: ${line.name} expected ${PRINTED_COUNTS[line.number]} stops, got ${(line.stations ?? []).length}`);
    }
    if (!(line.stations ?? []).includes("Hommachi") && line.number === "M") {
      failures.push("C2: Midosuji must serve Hommachi");
    }
    for (const name of line.stations ?? []) {
      unique.add(name);
      if (KITAKYU_BEYOND.includes(name) || NEW_TRAM_ONLY.includes(name)) {
        failures.push(`C1: ${line.name} must not print ${name}`);
      }
    }
  }
  if (unique.size !== 101) {
    failures.push(`C1: expected 101 unique stops, got ${unique.size}`);
  }

  const midosuji = (lineMap.lines ?? []).find((line) => line.number === "M");
  if (midosuji?.stations?.[0] !== "Esaka" || midosuji?.stations?.at(-1) !== "Nakamozu") {
    failures.push("C1: Midosuji must be Esaka–Nakamozu (M11–M30)");
  }
  if ((midosuji?.stations ?? []).some((name) => KITAKYU_BEYOND.includes(name))) {
    failures.push("C1: Kitakyu-beyond-Esaka must be absent from Midosuji");
  }

  const chuo = (lineMap.lines ?? []).find((line) => line.number === "C");
  if (!(chuo?.stations ?? []).includes("Yumeshima")) {
    failures.push("C1: Yumeshima C09 must be on Chuo");
  }
  if ((chuo?.stations ?? []).includes("Hommachi") !== true) {
    failures.push("C2: Chuo must serve Hommachi");
  }

  const yotsubashi = (lineMap.lines ?? []).find((line) => line.number === "Y");
  if (!(yotsubashi?.stations ?? []).includes("Hommachi")) {
    failures.push("C2: Yotsubashi must serve Hommachi");
  }

  const grouped = (lineMap.doNotGroup ?? []).map((row) => `${row.a}::${row.b}`);
  if (!grouped.some((row) => row.includes("Hommachi") && row.includes("Sakaisuji-Hommachi"))) {
    failures.push("C2: doNotGroup Hommachi vs Sakaisuji-Hommachi");
  }
  if (!grouped.some((row) => row.includes("Umeda") && row.includes("Higashi-Umeda"))) {
    failures.push("C2: doNotGroup Umeda vs Higashi-Umeda");
  }
  if (!grouped.some((row) => row.includes("Shinsaibashi") && row.includes("Yotsubashi"))) {
    failures.push("C2: doNotGroup Shinsaibashi vs Yotsubashi");
  }
  if (!grouped.some((row) => row.includes("Esaka") && row.includes("Senri-Chuo"))) {
    failures.push("C2: doNotGroup Esaka vs Kitakyu Senri-Chuo");
  }

  if (JSON.stringify(lineMap.shortTurnGroups ?? {}) !== "{}") {
    failures.push("C5: shortTurnGroups must stay empty (line+terminus; no nested codes)");
  }
  if (!(lineMap.laterModes ?? []).includes("New Tram")) {
    failures.push("C1: laterModes must name New Tram as out of v1");
  }

  const blob = `${JSON.stringify(catalogNames)}\n${JSON.stringify(lineMap)}`;
  if (/inbound|outbound|to city|downtown/i.test(JSON.stringify(lineMap.lines))) {
    failures.push("C7: do not use inbound/outbound or to City as line tokens");
  }
  if (!blob.includes("Hommachi") || !blob.includes("Yumeshima")) {
    failures.push("C2: catalog must preserve Hommachi and Yumeshima");
  }

  const hubLabels = marketingLabelsForStation(METRO_HUB);
  if (!hubLabels.includes("Midosuji + Nakamozu") || !hubLabels.includes("Midosuji + Esaka")) {
    failures.push(`C7: Hommachi must offer Midosuji + Esaka / Nakamozu (got ${hubLabels.join("; ")})`);
  }
  if (!hubLabels.includes("Chuo + Yumeshima") || !hubLabels.includes("Yotsubashi + Suminoekoen")) {
    failures.push(`C7: Hommachi must offer Chuo + Yumeshima and Yotsubashi + Suminoekoen (got ${hubLabels.join("; ")})`);
  }
  if (hubLabels.some((label) => /inbound|outbound|to city|downtown/i.test(label))) {
    failures.push("C7: do not use inbound/outbound or to City");
  }
  if (hubLabels.some((label) => /new tram|nanko|senri-chuo|minoh/i.test(label))) {
    failures.push("C7: Hommachi chips must not name New Tram or Kitakyu through-run");
  }

  const destCases = [
    ["Nakamozu", "M", "Midosuji + Nakamozu"],
    ["Esaka", "Midosuji", "Midosuji + Esaka"],
    ["Yumeshima", "C", "Chuo + Yumeshima"],
    ["Nagata", "Chuo Line", "Chuo + Nagata"],
    ["Yao-minami", "T", "Tanimachi + Yao-minami"],
    ["City", "M", ""],
    ["Downtown", "Y", ""],
  ];
  for (const [headsign, code, expected] of destCases) {
    const got = mapOsakaDestination(headsign, code);
    if (got !== expected) {
      failures.push(`board dest: ${JSON.stringify(headsign)} ${code} → ${got} expected ${expected}`);
    }
    if (/to city|downtown|inbound|outbound/i.test(got)) {
      failures.push(`board dest leaked forbidden string: ${got}`);
    }
  }

  if (failures.length) {
    console.error("osaka-line-map-conformance failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("osaka-line-map-conformance: ok (planned, eight subway lines, Hommachi hub, New Tram absent, Kitakyu-beyond-Esaka absent, 101 names)");
}

main();
