/**
 * D5 — Offline Hong Kong line-map conformance.
 * Usage: node qa/hong-kong-line-map-conformance.mjs
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
  mapHongKongDestination,
  marketingLabelsForStation,
} from "../lib/cities/hong-kong/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRINTED_CODES = ["ISL", "TWL", "KTL", "TKL", "TCL", "TML", "EAL", "SIL"];
const PRINTED_NAMES = [
  "Island",
  "Tsuen Wan",
  "Kwun Tong",
  "Tseung Kwan O",
  "Tung Chung",
  "Tuen Ma",
  "East Rail",
  "South Island",
];
const TERMINI = {
  ISL: ["Kennedy Town", "Chai Wan"],
  TWL: ["Tsuen Wan", "Central"],
  KTL: ["Whampoa", "Tiu Keng Leng"],
  TKL: ["North Point", "Po Lam / LOHAS Park"],
  TCL: ["Hong Kong", "Tung Chung"],
  TML: ["Wu Kai Sha", "Tuen Mun"],
  EAL: ["Admiralty", "Lo Wu / Lok Ma Chau"],
  SIL: ["Admiralty", "South Horizons"],
};
const PRINTED_COUNTS = { ISL: 17, TWL: 16, KTL: 17, TKL: 8, TCL: 8, TML: 27, EAL: 16, SIL: 5 };
const MARK_PROBES = [
  "Admiralty",
  "Central",
  "Tsim Sha Tsui",
  "East Tsim Sha Tsui",
  "Hung Hom",
  "Hong Kong",
  "Kowloon",
  "Lo Wu",
  "Lok Ma Chau",
  "LOHAS Park",
  "Kennedy Town",
  "South Horizons",
];
const AEL_ONLY = ["Airport", "AsiaWorld-Expo", "AsiaWorld Expo"];
const DIS_ONLY = ["Disneyland Resort"];
const HSR_ONLY = ["Hong Kong West Kowloon"];
const LIGHT_RAIL_MARKERS = ["Light Rail", "Tin King", "Siu Lun", "LR"];

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function main() {
  const lineMap = loadJson("lib/cities/hong-kong/line-map.json");
  const catalog = loadJson("lib/cities/hong-kong/stations.json");
  const failures = [];

  if (assertCityLive("hong-kong")?.ok === true) {
    failures.push("C0: assertCityLive(hong-kong) must fail (city stays planned)");
  }
  if (getCity("hong-kong")?.status !== "planned") {
    failures.push("C0: hong-kong registry status must be planned");
  }
  if (getCity("hong-kong")?.adapterReady !== false) {
    failures.push("C0: hong-kong adapterReady must be false");
  }
  if (isMultiCity("hong-kong")) {
    failures.push("C0: hong-kong must not join MULTI_CITY_IDS until Tim flips live");
  }
  if (assertCityLive("perth")?.ok !== true) {
    failures.push("C0: Perth live-gate must stay green");
  }
  if (assertCityLive("amsterdam")?.ok !== true) {
    failures.push("C0: Amsterdam live-gate must stay green");
  }
  if (assertCityLive("rotterdam")?.ok !== true) {
    failures.push("C0: Rotterdam tester-live must stay green");
  }
  if (lineMap.timeZone !== "Asia/Hong_Kong" || lineMap.dst !== false) {
    failures.push("C0: Asia/Hong_Kong must record no DST");
  }
  if (getCity("hk") || getCity("mtr") || getCity("kowloon") || getCity("china")) {
    failures.push("C0: city=hk / mtr / kowloon / china must not exist");
  }

  const codes = (lineMap.lines ?? []).map((line) => line.number);
  if (JSON.stringify(codes) !== JSON.stringify(PRINTED_CODES)) {
    failures.push(`C1: expected ${PRINTED_CODES.join(",")} got ${codes.join(",")}`);
  }
  const names = (lineMap.lines ?? []).map((line) => line.name);
  if (JSON.stringify(names) !== JSON.stringify(PRINTED_NAMES)) {
    failures.push(`C1: expected ${PRINTED_NAMES.join(",")} got ${names.join(",")}`);
  }
  if (
    (lineMap.lines ?? []).some(
      (line) =>
        ["AEL", "DIS", "DRL", "LR"].includes(line.number) || /airport express|disneyland|light rail|high speed/i.test(line.name)
    )
  ) {
    failures.push("C1: AEL / DIS / Light Rail / HSR must not be a D1 line");
  }

  const catalogNames = (catalog.stations ?? []).map((row) => row.name);
  if (catalogNames.length !== 95 || new Set(catalogNames).size !== 95) {
    failures.push(`C2: catalog must have 95 unique names, got ${catalogNames.length}`);
  }
  if (!catalogNames.includes(METRO_HUB)) {
    failures.push("C2: catalog must lock Admiralty");
  }
  if (catalog.stations?.find((row) => row.name === METRO_HUB)?.siteId !== "ADM") {
    failures.push("C2: Admiralty siteId must be ADM");
  }
  for (const name of MARK_PROBES) {
    if (!catalogNames.includes(name)) {
      failures.push(`Mark probe: catalog must include ${name}`);
    }
  }
  for (const name of [...AEL_ONLY, ...DIS_ONLY, ...HSR_ONLY]) {
    if (catalogNames.includes(name)) {
      failures.push(`C2: catalog must not include ${name}`);
    }
  }

  const d1Path = join(ROOT, "docs/hong-kong-d1/published-network.json");
  const publishedPath = join(ROOT, "qa/fixtures/hong-kong/published-network.json");
  if (!existsSync(d1Path)) {
    failures.push("C3: docs/hong-kong-d1/published-network.json is the Expansion pack");
  }
  if (!existsSync(publishedPath)) {
    failures.push("C3: D1 published-network.json must be copied into qa/fixtures/hong-kong/");
  } else if (existsSync(d1Path) && readFileSync(d1Path, "utf8") !== readFileSync(publishedPath, "utf8")) {
    failures.push("C3: qa/fixtures/hong-kong/published-network.json must match docs/hong-kong-d1 verbatim");
  }
  if (existsSync(publishedPath)) {
    const published = JSON.parse(readFileSync(publishedPath, "utf8"));
    if (published.printedInnerCityNames?.lock !== METRO_HUB) {
      failures.push("C2: D1 lock must be Admiralty");
    }
    if (published.timezone !== "Asia/Hong_Kong") {
      failures.push("C0: D1 JSON timezone must be lowercase Asia/Hong_Kong");
    }
    if (published.timeZone) {
      failures.push("C0: D1 JSON must use timezone, not timeZone");
    }
    if (published.uniqueStationCount !== 95) {
      failures.push(`C1: D1 uniqueStationCount must be 95, got ${published.uniqueStationCount}`);
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
    for (const name of line.stations ?? []) {
      unique.add(name);
      if (AEL_ONLY.includes(name) || DIS_ONLY.includes(name) || HSR_ONLY.includes(name)) {
        failures.push(`C1: ${line.name} must not print ${name}`);
      }
    }
  }
  if (unique.size !== 95) {
    failures.push(`C1: expected 95 unique stops, got ${unique.size}`);
  }

  const island = (lineMap.lines ?? []).find((line) => line.number === "ISL");
  if (island?.stations?.[0] !== "Kennedy Town" || island?.stations?.at(-1) !== "Chai Wan") {
    failures.push("C1: Island must be Kennedy Town–Chai Wan");
  }
  if (!(island?.stations ?? []).includes("Admiralty")) {
    failures.push("C2: Island must serve Admiralty");
  }

  const tsuenWan = (lineMap.lines ?? []).find((line) => line.number === "TWL");
  if (!(tsuenWan?.stations ?? []).includes("Admiralty")) {
    failures.push("C2: Tsuen Wan must serve Admiralty");
  }

  const eastRail = (lineMap.lines ?? []).find((line) => line.number === "EAL");
  if (!(eastRail?.stations ?? []).includes("Admiralty")) {
    failures.push("C2: East Rail must serve Admiralty");
  }
  if (!(eastRail?.stations ?? []).includes("Lo Wu") || !(eastRail?.stations ?? []).includes("Lok Ma Chau")) {
    failures.push("C1: Lo Wu / Lok Ma Chau must be present on EAL");
  }

  const southIsland = (lineMap.lines ?? []).find((line) => line.number === "SIL");
  if (southIsland?.stations?.[0] !== "Admiralty") {
    failures.push("C2: South Island must start at Admiralty");
  }

  const tkl = (lineMap.lines ?? []).find((line) => line.number === "TKL");
  if (!(tkl?.stations ?? []).includes("LOHAS Park")) {
    failures.push("C1: LOHAS Park must be present as TKL branch");
  }
  if ((tkl?.stations ?? []).includes("Admiralty")) {
    failures.push("C2: Tseung Kwan O must not serve Admiralty");
  }

  const tuenMa = (lineMap.lines ?? []).find((line) => line.number === "TML");
  if ((tuenMa?.stations ?? []).includes("Admiralty")) {
    failures.push("C2: Tuen Ma must not serve Admiralty");
  }

  const grouped = (lineMap.doNotGroup ?? []).map((row) => `${row.a}::${row.b}`);
  if (!grouped.some((row) => row.includes("Admiralty") && row.includes("Central"))) {
    failures.push("C2: doNotGroup Admiralty vs Central");
  }
  if (!grouped.some((row) => row.includes("Tsim Sha Tsui") && row.includes("East Tsim Sha Tsui"))) {
    failures.push("C2: doNotGroup Tsim Sha Tsui vs East Tsim Sha Tsui");
  }
  if (!grouped.some((row) => row.includes("Admiralty") && row.includes("Hung Hom"))) {
    failures.push("C2: doNotGroup Admiralty vs Hung Hom");
  }
  if (!grouped.some((row) => row.includes("Hong Kong") && row.includes("Hong Kong West Kowloon"))) {
    failures.push("C2: doNotGroup Hong Kong station vs Hong Kong West Kowloon HSR");
  }

  if (JSON.stringify(lineMap.shortTurnGroups ?? {}) !== "{}") {
    failures.push("C5: shortTurnGroups must stay empty (line+terminus; no nested codes)");
  }
  if (!(lineMap.laterModes ?? []).includes("Airport Express")) {
    failures.push("C1: laterModes must name Airport Express as out of v1");
  }
  if (!(lineMap.laterModes ?? []).includes("Light Rail")) {
    failures.push("C1: laterModes must name Light Rail as out of v1");
  }
  if (!(lineMap.laterModes ?? []).includes("High Speed Rail")) {
    failures.push("C1: laterModes must name High Speed Rail as out of v1");
  }

  const catalogBlob = `${JSON.stringify(catalogNames)}\n${JSON.stringify(lineMap)}`;
  if (/inbound|outbound|to city|downtown/i.test(JSON.stringify(lineMap.lines))) {
    failures.push("C7: do not use inbound/outbound or to City as line tokens");
  }
  if (!catalogBlob.includes("Admiralty") || !catalogBlob.includes("LOHAS Park") || !catalogBlob.includes("Lo Wu")) {
    failures.push("C2: catalog must preserve Admiralty, LOHAS Park, and Lo Wu");
  }
  if (LIGHT_RAIL_MARKERS.some((marker) => (lineMap.lines ?? []).some((line) => line.number === marker || line.name === marker))) {
    failures.push("C1: Light Rail must be absent from line-map lines");
  }

  const hubLabels = marketingLabelsForStation(METRO_HUB);
  if (!hubLabels.includes("Island + Chai Wan") || !hubLabels.includes("Island + Kennedy Town")) {
    failures.push(`C7: Admiralty must offer Island + Kennedy Town / Chai Wan (got ${hubLabels.join("; ")})`);
  }
  if (!hubLabels.includes("East Rail + Lo Wu / Lok Ma Chau") || !hubLabels.includes("South Island + South Horizons")) {
    failures.push(`C7: Admiralty must offer East Rail + Lo Wu / Lok Ma Chau and South Island + South Horizons (got ${hubLabels.join("; ")})`);
  }
  if (hubLabels.some((label) => /inbound|outbound|to city|downtown/i.test(label))) {
    failures.push("C7: do not use inbound/outbound or to City");
  }
  if (hubLabels.some((label) => /airport|disneyland|light rail|high speed/i.test(label))) {
    failures.push("C7: Admiralty chips must not name AEL / DIS / Light Rail / HSR");
  }

  const destCases = [
    ["Chai Wan", "ISL", "Island + Chai Wan"],
    ["Kennedy Town", "Island", "Island + Kennedy Town"],
    ["Lo Wu / Lok Ma Chau", "EAL", "East Rail + Lo Wu / Lok Ma Chau"],
    ["South Horizons", "SIL", "South Island + South Horizons"],
    ["Po Lam / LOHAS Park", "TKL", "Tseung Kwan O + Po Lam / LOHAS Park"],
    ["Tuen Mun", "Tuen Ma Line", "Tuen Ma + Tuen Mun"],
    ["City", "ISL", ""],
    ["Downtown", "TWL", ""],
  ];
  for (const [headsign, code, expected] of destCases) {
    const got = mapHongKongDestination(headsign, code);
    if (got !== expected) {
      failures.push(`board dest: ${JSON.stringify(headsign)} ${code} → ${got} expected ${expected}`);
    }
    if (/to city|downtown|inbound|outbound/i.test(got)) {
      failures.push(`board dest leaked forbidden string: ${got}`);
    }
  }

  if (failures.length) {
    console.error("hong-kong-line-map-conformance failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("hong-kong-line-map-conformance: ok (planned, eight urban heavy-rail lines, Admiralty hub, AEL/DIS/LR/HSR absent, Lo Wu/Lok Ma Chau in, LOHAS Park TKL branch, 95 names)");
}

main();
