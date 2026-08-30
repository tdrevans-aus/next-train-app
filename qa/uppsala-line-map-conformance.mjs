/**
 * D5 — Offline Uppsala line-map conformance.
 * Usage: node qa/uppsala-line-map-conformance.mjs
 *
 * Tester-live (flipped by Tim 30 Aug 2026). D1 pack required. Not generated from GTFS
 * (line-map is a hand-built summary of the D1 pack's lines[], not re-derived from a live pull).
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getCity } from "../lib/providers/registry.js";
import {
  UPPSALA_HUB,
  marketingLabelsForStation,
  foldKey,
} from "../lib/cities/uppsala/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function main() {
  const lineMap = loadJson("lib/cities/uppsala/line-map.json");
  const catalog = loadJson("lib/cities/uppsala/stations.json");
  const failures = [];

  if (getCity("uppsala")?.status !== "live") {
    failures.push("C0: uppsala registry status must be live");
  }
  if (lineMap.timeZone !== "Europe/Stockholm" || lineMap.dst !== true) {
    failures.push("C0: Europe/Stockholm must record DST");
  }

  const catalogNames = (catalog.stations ?? []).map((row) => row.name);
  if (catalogNames.length !== 19 || new Set(catalogNames).size !== 19) {
    failures.push(`C2: catalog must have 19 unique names, got ${catalogNames.length}`);
  }
  if (!catalogNames.includes(UPPSALA_HUB)) {
    failures.push(`C2: catalog must lock ${UPPSALA_HUB}`);
  }
  if (catalogNames.includes("Uppsala Centralstation") || catalogNames.includes("Uppsala Central")) {
    failures.push("C2: catalog must not carry the forbidden feed/central names");
  }
  for (const name of ["Västerås", "Eskilstuna", "Stockholm Central", "Stockholm C", "Flemingsberg", "Örebro"]) {
    if (catalogNames.includes(name)) {
      failures.push(`C2: catalog must not invent out-of-feed station ${name}`);
    }
  }

  const d1Path = join(ROOT, "docs/uppsala-d1/published-network.json");
  const publishedPath = join(ROOT, "qa/fixtures/uppsala/published-network.json");
  if (!existsSync(d1Path)) {
    failures.push("C3: docs/uppsala-d1/published-network.json is required");
  }
  if (!existsSync(publishedPath)) {
    failures.push("C3: D1 published-network.json must be copied into qa/fixtures/uppsala/");
  } else if (existsSync(d1Path) && readFileSync(d1Path, "utf8") !== readFileSync(publishedPath, "utf8")) {
    failures.push("C3: qa/fixtures/uppsala/published-network.json must match docs/uppsala-d1 verbatim");
  }

  if (existsSync(publishedPath)) {
    const published = JSON.parse(readFileSync(publishedPath, "utf8"));
    if (published.printedInnerCityNames?.lock !== UPPSALA_HUB) {
      failures.push(`C2: D1 lock must be ${UPPSALA_HUB}`);
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
    // Arlanda/Märsta route_id sharing is intentional, not a data-entry error (hazard-pack.md H4).
    const arlanda = published.lines.find((line) => line.id === "uppsala-arlanda");
    const marsta = published.lines.find((line) => line.id === "uppsala-marsta");
    if (JSON.stringify(arlanda?.gtfsRouteIdsIfKnown) !== JSON.stringify(marsta?.gtfsRouteIdsIfKnown)) {
      failures.push("C4: Arlanda and Märsta must share one route_id (direction-collapse hazard)");
    }
  }

  if (JSON.stringify(lineMap.shortTurnGroups ?? {}) !== "{}") {
    failures.push("C5: shortTurnGroups must stay empty");
  }

  const hubLabels = marketingLabelsForStation(UPPSALA_HUB);
  if (!hubLabels.some((label) => /^Mälartåg mot /.test(label))) {
    failures.push(`C7: ${UPPSALA_HUB} must offer Mälartåg chips`);
  }
  if (hubLabels.some((label) => /inbound|outbound|to city/i.test(label))) {
    failures.push("C7: do not use inbound/outbound or to City");
  }

  const grouped = (lineMap.doNotGroup ?? []).map((row) => `${row.a}::${row.b}`);
  if (!grouped.some((row) => row.includes("Uppsala C"))) {
    failures.push("C2: doNotGroup must cover Uppsala C (SL-pendeln / UL bus)");
  }
  if (!grouped.some((row) => row.includes("Knivsta"))) {
    failures.push("C2: doNotGroup must cover Knivsta (SL-pendeln)");
  }
  if (!grouped.some((row) => row.includes("Arlanda C"))) {
    failures.push("C2: doNotGroup must cover Arlanda C (SL-pendeln) — not just the hub");
  }

  const uniqueStations = new Set();
  for (const line of lineMap.lines ?? []) {
    for (const name of line.stations ?? []) {
      uniqueStations.add(name);
    }
  }
  if (!uniqueStations.has("Uppsala C") || !uniqueStations.has("Knivsta")) {
    failures.push("C1: line-map must serve Uppsala C and Knivsta");
  }
  if (uniqueStations.has("Uppsala Centralstation")) {
    failures.push("C1: line-map must not carry the forbidden feed name");
  }

  if (getCity("uppsala")?.adapterReady !== true) {
    failures.push("C0: uppsala adapterReady must be true");
  }

  if (failures.length) {
    console.error("uppsala-line-map-conformance failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("uppsala-line-map-conformance: ok (live, D1 pack, 19 stations, 4 lines, doNotGroup SL-pendeln at 3 stations, Arlanda/Märsta route_id sharing)");
}

main();
