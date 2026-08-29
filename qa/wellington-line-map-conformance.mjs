/**
 * D5 — Offline Wellington line-map conformance.
 * Usage: node qa/wellington-line-map-conformance.mjs
 *
 * C0: tester-live (flipped by Tim 30 Aug 2026). Hub Wellington Station. TRAIN only. DST.
 * D1 published-network.json is required (Luke pack; never generated from GTFS).
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import {
  HUB,
  MARKETING_ENDS,
  foldKey,
  marketingLabelsForStation,
  mapWellingtonDestination,
} from "../lib/cities/wellington/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRINTED_CODES = ["KPL", "HVL", "MEL", "JVL", "WRL"];
const HUB_LABELS = [
  "Hutt Valley Line Upper Hutt Station",
  "Johnsonville Line Johnsonville Station",
  "Kāpiti Line Waikanae Station",
  "Melling Line Western Hutt Station",
  "Wairarapa Line Masterton Station",
].sort((a, b) => a.localeCompare(b));

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function main() {
  const lineMap = loadJson("lib/cities/wellington/line-map.json");
  const catalog = loadJson("lib/cities/wellington/stations.json");
  const failures = [];

  const live = assertCityLive("wellington");
  if (live?.ok !== true) {
    failures.push("C0: assertCityLive(wellington) must pass (tester-live)");
  }
  if (getCity("wellington")?.status !== "live") {
    failures.push("C0: wellington registry status must be live");
  }
  if (!isMultiCity("wellington")) {
    failures.push("C0: wellington must be in MULTI_CITY_IDS");
  }
  if (assertCityLive("perth")?.ok !== true) {
    failures.push("C0: Perth live-gate must stay green");
  }
  if (assertCityLive("auckland")?.ok !== true) {
    failures.push("C0: Auckland live-gate must stay green");
  }
  if (lineMap.timeZone !== "Pacific/Auckland" || lineMap.dst !== true) {
    failures.push("C0: Pacific/Auckland must record DST");
  }

  const codes = (lineMap.lines ?? []).map((line) => line.number);
  if (JSON.stringify(codes) !== JSON.stringify(PRINTED_CODES)) {
    failures.push(`C1: expected ${PRINTED_CODES.join(",")} got ${codes.join(",")}`);
  }
  if ((lineMap.lines ?? []).some((line) => /capital connection|northern explorer|cable car/i.test(`${line.name} ${line.number}`))) {
    failures.push("C1: Capital Connection / Northern Explorer / cable car must not be lines");
  }

  const catalogNames = (catalog.stations ?? []).map((row) => row.name);
  if (!catalogNames.includes(HUB)) {
    failures.push("C2: catalog must lock Wellington Station");
  }
  if (catalogNames.includes("Melling Station")) {
    failures.push("C2: closed Melling Station must not be a v1 catalog station");
  }
  if (catalogNames.length !== 47 || new Set(catalogNames).size !== 47) {
    failures.push(`C2: catalog must have 47 unique names, got ${catalogNames.length}`);
  }

  const publishedPath = join(ROOT, "qa/fixtures/wellington/published-network.json");
  if (!existsSync(publishedPath)) {
    failures.push("C3: Luke D1 published-network.json must be copied into qa/fixtures/wellington/");
  } else {
    const published = JSON.parse(readFileSync(publishedPath, "utf8"));
    const d1Hub = published.printedInnerCityNames?.lock;
    if (d1Hub && d1Hub !== HUB) {
      failures.push(`C2: D1 hub ${d1Hub} must be ${HUB}`);
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
    failures.push("C5: shortTurnGroups must stay empty (line+terminus)");
  }

  const mel = (lineMap.lines ?? []).find((line) => line.number === "MEL");
  if (mel && !mel.termini?.includes("Western Hutt Station")) {
    failures.push("C6: MEL (Melling Line) live terminus is Western Hutt Station");
  }
  if (mel?.stations?.includes("Melling Station")) {
    failures.push("C6: closed Melling Station must not be on the MEL line array");
  }

  const hubLabels = marketingLabelsForStation(HUB).sort((a, b) => a.localeCompare(b));
  if (JSON.stringify(hubLabels) !== JSON.stringify(HUB_LABELS)) {
    failures.push(`C7: hub labels ${hubLabels.join("; ")} expected ${HUB_LABELS.join("; ")}`);
  }
  if (hubLabels.some((label) => /melling station$/i.test(label))) {
    failures.push("C7: Melling Line must not resolve to a Melling Station chip while closed");
  }
  if (!MARKETING_ENDS.MEL.includes("Western Hutt Station")) {
    failures.push("C7: MEL marketing end must be Western Hutt Station");
  }

  const destCases = [
    ["Waikanae", "KPL", "Kāpiti Line Waikanae Station"],
    ["Wellington", "KPL", "Kāpiti Line Wellington Station"],
    ["Upper Hutt", "HVL", "Hutt Valley Line Upper Hutt Station"],
    ["Western Hutt", "MEL", "Melling Line Western Hutt Station"],
    ["Johnsonville", "JVL", "Johnsonville Line Johnsonville Station"],
    ["Masterton", "WRL", "Wairarapa Line Masterton Station"],
  ];
  for (const [headsign, code, expected] of destCases) {
    const got = mapWellingtonDestination(headsign, code);
    if (got !== expected) {
      failures.push(`board dest: ${JSON.stringify(headsign)} ${code} → ${got} expected ${expected}`);
    }
    if (/melling station/i.test(got)) {
      failures.push(`board dest leaked closed Melling Station: ${got}`);
    }
  }

  if (getCity("wellington")?.adapterReady !== true) {
    failures.push("C0: wellington adapterReady must be true");
  }
  if (getCity("nz")) {
    failures.push("C0: city=nz must not exist");
  }

  if (failures.length) {
    console.error("wellington-line-map-conformance failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("wellington-line-map-conformance: ok (tester-live, D1 pack present, TRAIN only, MEL→Western Hutt)");
}

main();
