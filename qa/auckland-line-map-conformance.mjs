/**
 * D5 — Offline Auckland line-map conformance.
 * Usage: node qa/auckland-line-map-conformance.mjs
 *
 * C0: testers live. Hub Waitematā Station. TRAIN only. DST.
 * D1 published-network.json is required (Luke pack; never generated from GTFS).
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import { HUB, MARKETING_ENDS, foldKey, marketingLabelsForStation, mapAucklandDestination } from "../lib/cities/auckland/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRINTED_CODES = ["STH", "EAST", "WEST", "ONE"];
const HUB_LABELS = [
  "Eastern Line Manukau",
  "Southern Line Pukekohe",
  "Western Line Swanson",
].sort((a, b) => a.localeCompare(b));
const CLOSED = ["Te Waihorotiu", "Karanga-a-Hape", "Maungawhau", "Ngākōroa"];

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function main() {
  const lineMap = loadJson("lib/cities/auckland/line-map.json");
  const catalog = loadJson("lib/cities/auckland/stations.json");
  const failures = [];

  const live = assertCityLive("auckland");
  if (live?.ok !== false) {
    failures.push("C0: assertCityLive(auckland) must fail (retired from release 1, 7 Sep 2026)");
  }
  if (getCity("auckland")?.status !== "retired") {
    failures.push("C0: auckland registry status must be retired");
  }
  if (isMultiCity("auckland")) {
    failures.push("C0: auckland must not be in MULTI_CITY_IDS");
  }
  if (assertCityLive("perth")?.ok !== true) {
    failures.push("C0: Perth live-gate must stay green");
  }
  if (lineMap.timeZone !== "Pacific/Auckland" || lineMap.dst !== true) {
    failures.push("C0: Pacific/Auckland must record DST");
  }

  const codes = (lineMap.lines ?? []).map((line) => line.number);
  if (JSON.stringify(codes) !== JSON.stringify(PRINTED_CODES)) {
    failures.push(`C1: expected ${PRINTED_CODES.join(",")} got ${codes.join(",")}`);
  }
  if ((lineMap.lines ?? []).some((line) => /huia|airport/i.test(`${line.name} ${line.number}`))) {
    failures.push("C1: Te Huia / AirportLink must not be lines");
  }

  const catalogNames = (catalog.stations ?? []).map((row) => row.name);
  if (!catalogNames.includes(HUB)) {
    failures.push("C2: catalog must lock Waitematā Station");
  }
  const hubRow = (catalog.stations ?? []).find((row) => row.name === HUB);
  if (hubRow?.aliases?.some((alias) => /britomart|city centre/i.test(alias))) {
    failures.push("C2: hub must not alias Britomart or City Centre");
  }
  if (catalogNames.some((name) => /britomart|city centre/i.test(name))) {
    failures.push("C2: catalog must not use Britomart or City Centre as a station name");
  }
  if (!catalogNames.includes("Ōrākei") || !catalogNames.includes("Ōtāhuhu") || !catalogNames.includes("Paerātā")) {
    failures.push("C2: catalog must preserve macrons (Ōrākei, Ōtāhuhu, Paerātā)");
  }
  if (!catalogNames.includes("Rānui") || !catalogNames.includes("Te Pāpapa")) {
    failures.push("C2: catalog must lock Rānui and Te Pāpapa (not GTFS ASCII)");
  }
  if (catalogNames.includes("Ranui") || catalogNames.includes("Te Papapa")) {
    failures.push("C2: ASCII Ranui / Te Papapa must not be canonical names");
  }
  const mappedStations = (lineMap.lines ?? []).flatMap((line) => line.stations ?? []);
  if (!mappedStations.includes("Rānui") || !mappedStations.includes("Te Pāpapa")) {
    failures.push("C2: line-map must lock Rānui and Te Pāpapa");
  }
  for (const row of catalog.stations ?? []) {
    const blob = `${row.name} ${(row.aliases ?? []).join(" ")}`;
    if (/britomart/i.test(blob)) {
      failures.push(`C2: Britomart must not appear as a name or alias (${row.name})`);
    }
  }
  for (const closed of CLOSED) {
    if (catalogNames.some((name) => foldKey(name) === foldKey(closed))) {
      failures.push(`C2: catalog must not include closed/unopened ${closed}`);
    }
  }

  const publishedPath = join(ROOT, "qa/fixtures/auckland/published-network.json");
  if (!existsSync(publishedPath)) {
    failures.push("C3: Luke D1 published-network.json must be copied into qa/fixtures/auckland/");
  } else {
    const published = JSON.parse(readFileSync(publishedPath, "utf8"));
    const d1Hub = published.printedInnerCityNames?.lock || published.hub;
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
    failures.push("C5: shortTurnGroups must stay empty (line+terminus; CRL through-running later)");
  }

  const one = (lineMap.lines ?? []).find((line) => line.number === "ONE");
  if (one && !one.termini?.includes("Newmarket")) {
    failures.push("C6: Onehunga Line currently ends at Newmarket");
  }

  const hubLabels = marketingLabelsForStation(HUB).sort((a, b) => a.localeCompare(b));
  if (JSON.stringify(hubLabels) !== JSON.stringify(HUB_LABELS)) {
    failures.push(`C7: hub labels ${hubLabels.join("; ")} expected ${HUB_LABELS.join("; ")}`);
  }
  if (hubLabels.some((label) => /onehunga/i.test(label))) {
    failures.push("C7: Onehunga Line must not appear as a hub chip while it ends at Newmarket");
  }
  const sth = marketingLabelsForStation("Pukekohe");
  if (!sth.includes("Southern Line Waitematā Station") && !sth.some((label) => /Southern Line/.test(label))) {
    failures.push("C7: Pukekohe must offer Southern Line + hub/terminus chips");
  }
  if (!MARKETING_ENDS.STH.includes("Pukekohe")) {
    failures.push("C7: §3 Southern Line + Pukekohe");
  }

  const destCases = [
    ["Brit 4 To Pukekohe 3 Via NKT 4, OHU 3, Papakura 1; DRU PAE", "STH", "Southern Line Pukekohe"],
    ["Pukekohe 3 To Brit 4 Via NKT 1, Papakura 3; PAE DRU", "STH", "Southern Line Waitematā Station"],
    ["Brit 1 To Manukau 1 Via Panmure And Otahuhu 3", "EAST", "Eastern Line Manukau"],
    ["Manukau 1 To Brit 1 Via Panmure", "EAST", "Eastern Line Waitematā Station"],
    ["Brit 2 To Swanson 1 Via Newmarket 1", "WEST", "Western Line Swanson"],
    ["Newmarket 4 To Onehunga", "ONE", "Onehunga Line Onehunga"],
  ];
  for (const [headsign, code, expected] of destCases) {
    const got = mapAucklandDestination(headsign, code);
    if (got !== expected) {
      failures.push(`board dest: ${JSON.stringify(headsign)} → ${got} expected ${expected}`);
    }
    if (/britomart|\bbrit\b/i.test(got) && !/Waitematā/i.test(got)) {
      failures.push(`board dest leaked Britomart: ${got}`);
    }
  }

  if (failures.length) {
    console.error("auckland-line-map-conformance failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("auckland-line-map-conformance: ok (retired from release 1, D1 pack kept, TRAIN only)");
}

main();
