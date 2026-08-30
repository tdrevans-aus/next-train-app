/**
 * D5 — Offline Malmö line-map conformance.
 * Usage: node qa/malmo-line-map-conformance.mjs
 *
 * Tester-live (flipped by Tim 30 Aug 2026). D1 pack required. Not generated from GTFS.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getCity } from "../lib/providers/registry.js";
import {
  MALMO_HUB,
  mapMalmoDestination,
  marketingLabelsForStation,
  foldKey,
} from "../lib/cities/malmo/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function main() {
  const lineMap = loadJson("lib/cities/malmo/line-map.json");
  const catalog = loadJson("lib/cities/malmo/stations.json");
  const failures = [];

  if (getCity("malmo")?.status !== "live") {
    failures.push("C0: malmo registry status must be live");
  }
  if (lineMap.timeZone !== "Europe/Stockholm" || lineMap.dst !== true) {
    failures.push("C0: Europe/Stockholm must record DST");
  }

  const catalogNames = (catalog.stations ?? []).map((row) => row.name);
  if (catalogNames.length !== 84 || new Set(catalogNames).size !== 84) {
    failures.push(`C2: catalog must have 84 unique names, got ${catalogNames.length}`);
  }
  if (!catalogNames.includes(MALMO_HUB)) {
    failures.push(`C2: catalog must lock ${MALMO_HUB}`);
  }
  if (catalogNames.includes("Malmö Central") || catalogNames.includes("Malmö Centralstation")) {
    failures.push("C2: catalog must not carry the forbidden feed/central names");
  }

  const d1Path = join(ROOT, "docs/malmo-d1/published-network.json");
  const publishedPath = join(ROOT, "qa/fixtures/malmo/published-network.json");
  if (!existsSync(d1Path)) {
    failures.push("C3: docs/malmo-d1/published-network.json is required");
  }
  if (!existsSync(publishedPath)) {
    failures.push("C3: D1 published-network.json must be copied into qa/fixtures/malmo/");
  } else if (existsSync(d1Path) && readFileSync(d1Path, "utf8") !== readFileSync(publishedPath, "utf8")) {
    failures.push("C3: qa/fixtures/malmo/published-network.json must match docs/malmo-d1 verbatim");
  }

  if (existsSync(publishedPath)) {
    const published = JSON.parse(readFileSync(publishedPath, "utf8"));
    if (published.printedInnerCityNames?.lock !== MALMO_HUB) {
      failures.push(`C2: D1 lock must be ${MALMO_HUB}`);
    }
    for (const line of published.lines ?? []) {
      const mapped = (lineMap.lines ?? []).find((entry) => entry.id === line.id);
      if (!mapped) {
        failures.push(`C3: line-map missing D1 line ${line.id}`);
        continue;
      }
      const pub = new Set((line.stations ?? []).map(foldKey));
      const map = new Set((mapped.stations ?? []).map(foldKey));
      const extraMap = [...map].filter((key) => !pub.has(key));
      const extraPub = [...pub].filter((key) => !map.has(key));
      if (extraMap.length || extraPub.length) {
        failures.push(
          `C3: ${line.id} station mismatch extraMap=${extraMap.join("|") || "—"} extraPub=${extraPub.join("|") || "—"}`
        );
      }
    }
  }

  if (JSON.stringify(lineMap.shortTurnGroups ?? {}) !== "{}") {
    failures.push("C5: shortTurnGroups must stay empty");
  }

  const hubLabels = marketingLabelsForStation(MALMO_HUB);
  if (!hubLabels.some((label) => /^Malmöringen/.test(label))) {
    failures.push(`C7: ${MALMO_HUB} must offer Malmöringen labels`);
  }
  if (!hubLabels.some((label) => /^Pågatågen mot /.test(label))) {
    failures.push(`C7: ${MALMO_HUB} must offer Pågatågen chips`);
  }
  if (hubLabels.some((label) => /inbound|outbound|to city|malmö central/i.test(label))) {
    failures.push("C7: do not use inbound/outbound, to City, or malmö central");
  }

  const grouped = (lineMap.doNotGroup ?? []).map((row) => `${row.a}::${row.b}`);
  if (!grouped.some((row) => row.includes("Malmö C") && row.includes("Malmö C Öresundståg"))) {
    failures.push("C2: doNotGroup Malmö C Pågatågen vs Öresundståg");
  }
  if (!grouped.some((row) => row.includes("Triangeln") && row.includes("Triangeln Öresundståg"))) {
    failures.push("C2: doNotGroup Triangeln Pågatågen vs Öresundståg");
  }
  if (!grouped.some((row) => row.includes("Hyllie") && row.includes("Hyllie Öresundståg"))) {
    failures.push("C2: doNotGroup Hyllie Pågatågen vs Öresundståg");
  }
  if (!grouped.some((row) => row.includes("Burlöv") && row.includes("Burlöv Öresundståg"))) {
    failures.push("C2: doNotGroup Burlöv Pågatågen vs Öresundståg");
  }
  if (!grouped.some((row) => row.includes("Hässleholm C") && row.includes("Krösatågen"))) {
    failures.push("C2: doNotGroup Hässleholm C Pågatågen vs Krösatågen");
  }
  if (!(lineMap.doNotGroup ?? []).every((row) => /shown|self-referential/.test(row.reason ?? ""))) {
    failures.push(
      "C2: doNotGroup reasons must reflect board-eligibility-rule.md (distinct entries at a shared stop, not exclusion)"
    );
  }
  if (!grouped.some((row) => row.includes("Malmö C") && row.includes("Malmö central"))) {
    failures.push("C2: doNotGroup Malmö C vs malmö central headsign");
  }

  const uniqueStations = new Set();
  for (const line of lineMap.lines ?? []) {
    for (const name of line.stations ?? []) {
      uniqueStations.add(name);
    }
  }
  if (!uniqueStations.has("Malmö C") || !uniqueStations.has("Triangeln")) {
    failures.push("C1: line-map must serve Malmö C and Triangeln");
  }
  if (uniqueStations.has("Malmö Central") || uniqueStations.has("Malmö Centralstation")) {
    failures.push("C1: line-map must not carry forbidden feed names");
  }

  if (getCity("malmo")?.adapterReady !== true) {
    failures.push("C0: malmo adapterReady must be true");
  }

  if (failures.length) {
    console.error("malmo-line-map-conformance failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("malmo-line-map-conformance: ok (live, D1 pack, 84 stations, 10 lines, doNotGroup Öresundståg/Krösatågen shown-separately + headsign)");
}

main();
