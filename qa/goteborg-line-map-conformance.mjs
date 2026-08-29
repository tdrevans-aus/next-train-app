/**
 * D5 — Offline Göteborg line-map conformance.
 * Usage: node qa/goteborg-line-map-conformance.mjs
 *
 * Tester-live. D1 pack required. Not generated from GTFS.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import {
  foldKey,
  mapGoteborgDestination,
  marketingLabelsForStation,
  TRAM_HUB,
  PENDELTÅG_HUB,
  RENAMED_TRAM_HUB,
  FORBIDDEN_TRAM_HUB,
} from "../lib/cities/goteborg/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRINTED_CODES = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "Kungsbacka",
  "Alingsås",
  "Ale",
];
const SWEDISH = ["Göteborg", "Mölndal", "Frölunda", "Kålltorp", "Älvängen", "Högsbotorp"];
const MARK_PROBES = [
  "Brunnsparken",
  "Drottningtorget",
  "Korsvägen",
  "Nils Ericsonsplatsen",
  "Liseberg Station",
  "Liseberg Södra",
  "Gamlestads Torg",
  "Göteborg Central",
  "Gamlestaden Station",
  "Liseberg Station (tåg)",
  "Lindholmen",
];

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function main() {
  const lineMap = loadJson("lib/cities/goteborg/line-map.json");
  const catalog = loadJson("lib/cities/goteborg/stations.json");
  const failures = [];

  if (assertCityLive("goteborg")?.ok !== true) {
    failures.push("C0: assertCityLive(goteborg) must pass (tester-live)");
  }
  if (getCity("goteborg")?.status !== "live") {
    failures.push("C0: goteborg registry status must be live");
  }
  if (!isMultiCity("goteborg")) {
    failures.push("C0: goteborg must be in MULTI_CITY_IDS");
  }
  if (assertCityLive("perth")?.ok !== true) {
    failures.push("C0: Perth live-gate must stay green");
  }
  if (assertCityLive("amsterdam")?.ok !== true) {
    failures.push("C0: Amsterdam live-gate must stay green");
  }
  if (lineMap.timeZone !== "Europe/Stockholm" || lineMap.dst !== true) {
    failures.push("C0: Europe/Stockholm must record DST");
  }

  const codes = (lineMap.lines ?? []).map((line) => line.number);
  if (JSON.stringify(codes) !== JSON.stringify(PRINTED_CODES)) {
    failures.push(`C1: expected ${PRINTED_CODES.join(",")} got ${codes.join(",")}`);
  }
  if ((lineMap.lines ?? []).some((line) => ["16", "17", "18", "X1", "X2", "X4"].includes(line.number))) {
    failures.push("C1: later-mode stombuss / X-bus must not be D1 rows");
  }

  const catalogNames = (catalog.stations ?? []).map((row) => row.name);
  if (catalogNames.length !== 157 || new Set(catalogNames).size !== 157) {
    failures.push(`C2: catalog must have 157 unique names, got ${catalogNames.length}`);
  }
  if (!catalogNames.includes(TRAM_HUB) || !catalogNames.includes(PENDELTÅG_HUB)) {
    failures.push("C2: catalog must lock Brunnsparken and Göteborg Central");
  }
  if (!catalogNames.includes(RENAMED_TRAM_HUB)) {
    failures.push("C2: catalog must lock Drottningtorget");
  }
  if (catalogNames.includes(FORBIDDEN_TRAM_HUB)) {
    failures.push("C2: Centralstationen is not a v1 pickable station");
  }
  if (catalogNames.includes("Nils Ericson Terminalen")) {
    failures.push("C2: Nils Ericson Terminalen is not a v1 pickable station");
  }
  for (const name of MARK_PROBES) {
    if (!catalogNames.includes(name)) {
      failures.push(`Mark probe: catalog must include ${name}`);
    }
  }
  const swedishBlob = `${JSON.stringify(catalogNames)}\n${JSON.stringify(lineMap)}`;
  for (const token of SWEDISH) {
    if (!swedishBlob.includes(token)) {
      failures.push(`C2: catalog must preserve ${token}`);
    }
  }

  const tramLines = (lineMap.lines ?? []).filter((line) => line.mode === "TRAM");
  const atHub = tramLines.filter((line) => (line.stations ?? []).includes(TRAM_HUB)).map((line) => line.number);
  const missHub = tramLines.filter((line) => !(line.stations ?? []).includes(TRAM_HUB)).map((line) => line.number);
  if (atHub.length !== 10) {
    failures.push(`C2: Brunnsparken must serve 10 tram lines, got ${atHub.join(",")}`);
  }
  if (JSON.stringify(missHub) !== JSON.stringify(["8", "12"])) {
    failures.push(`C2: lines 8 and 12 must miss Brunnsparken, got ${missHub.join(",")}`);
  }
  const line2 = tramLines.find((line) => line.number === "2");
  if (line2?.termini?.[0] !== "Högsbotorp" || line2?.stations?.includes("Mölndals Innerstad")) {
    failures.push("C2: line 2 is Högsbotorp–Biskopsgården, not Mölndal");
  }
  const line12 = tramLines.find((line) => line.number === "12");
  if (!line12?.stations?.includes("Lindholmen") || !line12?.stations?.includes("Mölndals Innerstad")) {
    failures.push("C2: line 12 is Mölndal–Lindholmen");
  }
  if (line12?.stations?.includes(TRAM_HUB)) {
    failures.push("C2: line 12 must not serve Brunnsparken");
  }

  const d1Path = join(ROOT, "docs/goteborg-d1/published-network.json");
  const publishedPath = join(ROOT, "qa/fixtures/goteborg/published-network.json");
  if (!existsSync(d1Path)) {
    failures.push("C3: docs/goteborg-d1/published-network.json is the Expansion pack");
  }
  if (!existsSync(publishedPath)) {
    failures.push("C3: D1 published-network.json must be copied into qa/fixtures/goteborg/");
  } else if (existsSync(d1Path) && readFileSync(d1Path, "utf8") !== readFileSync(publishedPath, "utf8")) {
    failures.push("C3: qa/fixtures/goteborg/published-network.json must match docs/goteborg-d1 verbatim");
  }
  if (existsSync(publishedPath)) {
    const published = JSON.parse(readFileSync(publishedPath, "utf8"));
    if (published.printedInnerCityNames?.lock !== TRAM_HUB) {
      failures.push("C2: D1 lock must be Brunnsparken");
    }
    if (published.printedInnerCityNames?.lockPendeltag !== PENDELTÅG_HUB) {
      failures.push("C2: D1 lockPendeltag must be Göteborg Central");
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

  if (JSON.stringify(lineMap.shortTurnGroups ?? {}) !== "{}") {
    failures.push("C5: shortTurnGroups must stay empty (line+terminus; first-halts are live, not extra D1 rows)");
  }

  const hubLabels = marketingLabelsForStation(TRAM_HUB);
  if (!hubLabels.includes("1 + Tynnered")) {
    failures.push(`C7: Brunnsparken must offer 1 + Tynnered (got ${hubLabels.join("; ")})`);
  }
  if (hubLabels.some((label) => /västtågen/i.test(label))) {
    failures.push("C7: Brunnsparken must not show pendeltåg chips");
  }
  if (hubLabels.some((label) => /^8 \+|^12 \+/.test(label))) {
    failures.push("C7: Brunnsparken must not show lines 8 or 12");
  }
  if (hubLabels.some((label) => /inbound|outbound|to city/i.test(label))) {
    failures.push("C7: do not use inbound/outbound or to City");
  }
  if (hubLabels.some((label) => /opaltorget|axel dahlströms/i.test(label))) {
    failures.push("C7: use legend far end, not first-halt strings");
  }

  const kors = marketingLabelsForStation("Korsvägen");
  if (!kors.includes("12 + Lindholmen") || !kors.includes("8 + Frölunda")) {
    failures.push(`C7: Korsvägen must offer 12 + Lindholmen and 8 + Frölunda (got ${kors.join("; ")})`);
  }

  const cityLabels = marketingLabelsForStation(PENDELTÅG_HUB);
  if (!cityLabels.includes("Västtågen + Kungsbacka")) {
    failures.push("C7: Göteborg Central must offer Västtågen + Kungsbacka");
  }
  if (cityLabels.some((label) => /^\d+ \+/.test(label))) {
    failures.push("C7: Göteborg Central must not show tram chips");
  }

  const destCases = [
    ["Tynnered", "1", "1 + Tynnered"],
    ["Opaltorget", "1", "1 + Tynnered"],
    ["Lindholmen", "12", "12 + Lindholmen"],
    ["Högsbotorp", "2", "2 + Högsbotorp"],
    ["Axel Dahlströms Torg", "2", "2 + Högsbotorp"],
    ["Kungsbacka", "Kungsbacka", "Västtågen + Kungsbacka"],
    ["Älvängen resecentrum", "Ale", "Västtågen + Ale"],
    ["Ale", "Ale", "Västtågen + Ale"],
  ];
  for (const [headsign, code, expected] of destCases) {
    const got = mapGoteborgDestination(headsign, code);
    if (got !== expected) {
      failures.push(`board dest: ${JSON.stringify(headsign)} ${code} → ${got} expected ${expected}`);
    }
    if (/to city|centralstationen/i.test(got)) {
      failures.push(`board dest leaked forbidden string: ${got}`);
    }
  }

  if (getCity("goteborg")?.adapterReady !== true) {
    failures.push("C0: goteborg adapterReady must be true");
  }
  if (getCity("sweden") || getCity("gothenburg")) {
    failures.push("C0: city=sweden / gothenburg must not exist");
  }

  const PRINTED = {
    1: 27, 2: 27, 3: 26, 4: 20, 5: 32, 6: 41, 7: 33, 8: 25, 9: 19, 10: 13, 11: 35, 12: 18,
    Kungsbacka: 8, Alingsås: 13, Ale: 7,
  };
  const unique = new Set();
  for (const line of lineMap.lines ?? []) {
    if ((line.stations ?? []).length !== PRINTED[line.number]) {
      failures.push(`C1: ${line.name} expected ${PRINTED[line.number]} stops, got ${(line.stations ?? []).length}`);
    }
    for (const name of line.stations ?? []) {
      unique.add(name);
    }
    if ((line.stations ?? []).includes(FORBIDDEN_TRAM_HUB)) {
      failures.push(`C1: ${line.name} must print Drottningtorget, not Centralstationen`);
    }
  }
  if (unique.size !== 157) {
    failures.push(`C1: expected 157 unique stops (132 tram + 25 train), got ${unique.size}`);
  }
  for (const number of ["Kungsbacka", "Alingsås", "Ale"]) {
    const line = (lineMap.lines ?? []).find((row) => row.number === number);
    if (!(line?.stations ?? []).includes(PENDELTÅG_HUB)) {
      failures.push(`C2: Västtågen ${number} must serve ${PENDELTÅG_HUB}`);
    }
  }
  if (tramLines.some((line) => (line.stations ?? []).includes(PENDELTÅG_HUB))) {
    failures.push("C2: trams stop at Drottningtorget, never Göteborg Central");
  }

  const stockholm = loadJson("lib/cities/stockholm/stations.json");
  const stockholmNames = new Set((stockholm.stations ?? []).map((row) => row.name));
  const clashes = catalogNames.filter((name) => stockholmNames.has(name));
  if (clashes.length) {
    failures.push(`H2: exact name clash with stockholm stations.json: ${clashes.join(", ")}`);
  }

  const grouped = (lineMap.doNotGroup ?? []).map((row) => `${row.a}::${row.b}`);
  if (!grouped.some((row) => row.includes("Drottningtorget") && row.includes("Göteborg Central"))) {
    failures.push("C2: doNotGroup Drottningtorget vs Göteborg Central");
  }
  if (!grouped.some((row) => row.includes("Liseberg Station") && row.includes("Liseberg Station (tåg)"))) {
    failures.push("C2: doNotGroup Liseberg tram vs pendeltåg");
  }
  if (!grouped.some((row) => row.includes("Gamlestads Torg") && row.includes("Gamlestaden Station"))) {
    failures.push("C2: doNotGroup Gamlestads Torg vs Gamlestaden Station");
  }
  if (!(lineMap.suppressedTermini ?? []).includes(FORBIDDEN_TRAM_HUB)) {
    failures.push("C2: Centralstationen must be a suppressed terminus");
  }

  if (!hubLabels.includes("11 + Saltholmen")) {
    failures.push(`C7: Brunnsparken must offer 11 + Saltholmen (got ${hubLabels.join("; ")})`);
  }
  if (cityLabels.length !== 3 || !cityLabels.every((label) => label.startsWith("Västtågen + "))) {
    failures.push(`C7: Göteborg Central chips must be the three Västtågen: ${cityLabels.join("; ")}`);
  }
  if (marketingLabelsForStation(FORBIDDEN_TRAM_HUB).length !== 0) {
    failures.push("C7: Centralstationen must not resolve to chips");
  }

  const extraDestCases = [
    ["Väderilsgatan", "2", "2 + Biskopsgården"],
    ["Virginsgatan", "3", "3 + Kålltorp"],
    ["Aprilgatan", "6", "6 + Kortedala"],
    ["Komettorget", "7", "7 + Bergsjön"],
    ["Frölunda Torg", "8", "8 + Frölunda"],
    ["Doktor Sydows Gata", "10", "10 + Guldheden"],
    ["Mölndals Innerstad", "12", "12 + Mölndal"],
    ["Centralstationen", "4", "4 + Drottningtorget"],
  ];
  for (const [headsign, code, expected] of extraDestCases) {
    const got = mapGoteborgDestination(headsign, code);
    if (got !== expected) {
      failures.push(`board dest: ${headsign} ${code} → ${got} expected ${expected}`);
    }
  }

  if (foldKey("Göteborg Central") !== foldKey("Goteborg Central")) {
    failures.push("C2: fold must accept unaccented variants");
  }

  if (failures.length) {
    console.error("goteborg-line-map-conformance failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("goteborg-line-map-conformance: ok (tester-live, D1 pack present, 157 names, 8/12 miss Brunnsparken)");
}

main();
