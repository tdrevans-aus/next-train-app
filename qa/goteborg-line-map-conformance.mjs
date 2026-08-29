/**
 * D5 — Offline Göteborg tram + pendeltåg line-map conformance.
 * Usage: node qa/goteborg-line-map-conformance.mjs
 *
 * City stays planned. D1 pack is hand-transcribed — never generated from GTFS.
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
  PENDELTÅG_HUB,
  TRAM_HUB,
} from "../lib/cities/goteborg/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRINTED = {
  1: 27, 2: 27, 3: 26, 4: 20, 5: 32, 6: 41, 7: 33, 8: 25, 9: 19, 10: 13, 11: 35, 12: 18,
  Kungsbacka: 8, Alingsås: 13, Ale: 7,
};
const BRUNNSPARKEN_TRAMS = ["1", "2", "3", "4", "5", "6", "7", "9", "10", "11"];
const KORSVAGEN_ONLY = ["8", "12"];

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function main() {
  const lineMap = loadJson("lib/cities/goteborg/line-map.json");
  const catalog = loadJson("lib/cities/goteborg/stations.json");
  const failures = [];

  if (assertCityLive("goteborg")?.ok === true) {
    failures.push("C0: assertCityLive(goteborg) must fail (city stays planned)");
  }
  if (getCity("goteborg")?.status !== "planned") {
    failures.push("C0: goteborg registry status must stay planned");
  }
  if (getCity("goteborg")?.adapterReady !== true) {
    failures.push("C0: goteborg adapterReady must be true");
  }
  if (isMultiCity("goteborg")) {
    failures.push("C0: goteborg must not join MULTI_CITY_IDS until Tim flips live");
  }
  if (assertCityLive("perth")?.ok !== true) {
    failures.push("C0: Perth live-gate must stay green");
  }
  if (getCity("sweden") || getCity("gothenburg")) {
    failures.push("C0: city=sweden / gothenburg must not exist");
  }
  if (lineMap.timeZone !== "Europe/Stockholm" || lineMap.dst !== true) {
    failures.push("C0: Europe/Stockholm must record DST");
  }

  if (!existsSync(join(ROOT, "qa/fixtures/goteborg/published-network.json"))) {
    failures.push("D2: copy docs/goteborg-d1/published-network.json into qa/fixtures/goteborg/");
  } else {
    const published = loadJson("qa/fixtures/goteborg/published-network.json");
    if (published.printedInnerCityNames?.lockTram !== TRAM_HUB) {
      failures.push(`C2: D1 tram hub ${published.printedInnerCityNames?.lockTram} must be ${TRAM_HUB}`);
    }
    if (published.printedInnerCityNames?.lockPendeltag !== PENDELTÅG_HUB) {
      failures.push(`C2: D1 pendeltåg hub must be ${PENDELTÅG_HUB}`);
    }
    if (!(published.printedInnerCityNames?.doNotUse ?? []).includes("Centralstationen")) {
      failures.push("C2: D1 must forbid Centralstationen");
    }
    for (const line of published.lines ?? []) {
      const mapped = (lineMap.lines ?? []).find((row) => row.id === line.id);
      if (JSON.stringify(mapped?.stations ?? []) !== JSON.stringify(line.stations ?? [])) {
        failures.push(`C3: line-map ${line.id} stations must match D1 published-network (not GTFS)`);
      }
      if (JSON.stringify(mapped?.termini ?? []) !== JSON.stringify(line.termini ?? [])) {
        failures.push(`C3: line-map ${line.id} termini must match D1 published-network`);
      }
    }
  }

  const unique = new Set();
  for (const line of lineMap.lines ?? []) {
    const expected = PRINTED[line.number];
    if ((line.stations ?? []).length !== expected) {
      failures.push(`C1: ${line.name} expected ${expected} stops, got ${(line.stations ?? []).length}`);
    }
    for (const name of line.stations ?? []) {
      unique.add(name);
    }
    if ((line.stations ?? []).includes("Centralstationen")) {
      failures.push(`C1: ${line.name} must print Drottningtorget, not Centralstationen`);
    }
  }
  if (unique.size !== 157) {
    failures.push(`C1: expected 157 unique stops (132 tram + 25 train), got ${unique.size}`);
  }

  for (const number of BRUNNSPARKEN_TRAMS) {
    const line = (lineMap.lines ?? []).find((row) => row.number === number);
    if (!(line?.stations ?? []).includes(TRAM_HUB)) {
      failures.push(`C2: tram ${number} must serve hub ${TRAM_HUB}`);
    }
  }
  for (const number of KORSVAGEN_ONLY) {
    const line = (lineMap.lines ?? []).find((row) => row.number === number);
    if ((line?.stations ?? []).includes(TRAM_HUB)) {
      failures.push(`C2: tram ${number} misses Brunnsparken — it lives at Korsvägen`);
    }
    if (!(line?.stations ?? []).includes("Korsvägen")) {
      failures.push(`C2: tram ${number} must serve Korsvägen`);
    }
  }
  for (const number of ["Kungsbacka", "Alingsås", "Ale"]) {
    const line = (lineMap.lines ?? []).find((row) => row.number === number);
    if (!(line?.stations ?? []).includes(PENDELTÅG_HUB)) {
      failures.push(`C2: Västtågen ${number} must serve ${PENDELTÅG_HUB}`);
    }
  }
  const tramLines = (lineMap.lines ?? []).filter((row) => row.mode === "TRAM");
  if (tramLines.some((line) => (line.stations ?? []).includes(PENDELTÅG_HUB))) {
    failures.push("C2: trams stop at Drottningtorget, never Göteborg Central");
  }

  const catalogNames = (catalog.stations ?? []).map((row) => row.name);
  if (catalogNames.length !== 157) {
    failures.push(`C2: catalog must have 157 stops, got ${catalogNames.length}`);
  }
  for (const required of [TRAM_HUB, PENDELTÅG_HUB, "Korsvägen", "Drottningtorget", "Nils Ericsonsplatsen"]) {
    if (!catalogNames.includes(required)) {
      failures.push(`C2: catalog must include ${required}`);
    }
  }
  for (const forbidden of ["Centralstationen", "Nils Ericson Terminalen", "Gothenburg Central"]) {
    if (catalogNames.includes(forbidden)) {
      failures.push(`H2: ${forbidden} must not be a catalog name`);
    }
  }
  for (const distinct of ["Liseberg Station", "Liseberg Station (tåg)", "Liseberg Södra", "Gamlestads Torg", "Gamlestaden Station"]) {
    if (!catalogNames.includes(distinct)) {
      failures.push(`H2: ${distinct} must stay a distinct catalog stop`);
    }
  }
  if (!catalogNames.includes("Axel Dahlströms Torg")) {
    failures.push("H2: Swedish characters must be preserved (Axel Dahlströms Torg)");
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
  if (!(lineMap.suppressedTermini ?? []).includes("Centralstationen")) {
    failures.push("C2: Centralstationen must be a suppressed terminus");
  }

  const hubLabels = marketingLabelsForStation(TRAM_HUB);
  if (!hubLabels.includes("1 + Tynnered") || !hubLabels.includes("11 + Saltholmen")) {
    failures.push(`C7: hub labels ${hubLabels.join("; ")}`);
  }
  if (hubLabels.some((label) => /^(8|12) \+ /.test(label))) {
    failures.push("C7: Brunnsparken must not offer 8 or 12 (Korsvägen lines)");
  }
  if (hubLabels.some((label) => /inbound|outbound|to city/i.test(label))) {
    failures.push("C7: direction is line + terminus, not inbound/outbound or to City");
  }
  const korsvagen = marketingLabelsForStation("Korsvägen");
  for (const chip of ["8 + Frölunda", "8 + Angered", "12 + Mölndal", "12 + Lindholmen"]) {
    if (!korsvagen.includes(chip)) {
      failures.push(`C7: Korsvägen must offer ${chip}`);
    }
  }
  const central = marketingLabelsForStation(PENDELTÅG_HUB);
  if (central.length !== 3 || !central.every((label) => label.startsWith("Västtågen + "))) {
    failures.push(`C7: Göteborg Central chips must be the three Västtågen: ${central.join("; ")}`);
  }
  if (marketingLabelsForStation("Centralstationen").length !== 0) {
    failures.push("C7: Centralstationen must not resolve to chips");
  }

  const destCases = [
    ["Opaltorget", "1", "1 + Tynnered"],
    ["Axel Dahlströms Torg", "2", "2 + Högsbotorp"],
    ["Väderilsgatan", "2", "2 + Biskopsgården"],
    ["Virginsgatan", "3", "3 + Kålltorp"],
    ["Aprilgatan", "6", "6 + Kortedala"],
    ["Komettorget", "7", "7 + Bergsjön"],
    ["Frölunda Torg", "8", "8 + Frölunda"],
    ["Doktor Sydows Gata", "10", "10 + Guldheden"],
    ["Mölndals Innerstad", "12", "12 + Mölndal"],
    ["Centralstationen", "4", "4 + Drottningtorget"],
    ["Kungsbacka", "Kungsbacka", "Västtågen + Kungsbacka"],
    ["Älvängen resecentrum", "Ale", "Västtågen + Ale"],
  ];
  for (const [headsign, code, expected] of destCases) {
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
  console.log(
    "goteborg-line-map-conformance: ok (planned, tram 1–12 + 3 pendeltåg, 157 stops, Brunnsparken/Göteborg Central hubs, D1 lock)"
  );
}

main();
