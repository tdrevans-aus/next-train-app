/**
 * D5 — Offline Helsinki line-map conformance.
 * Usage: node qa/helsinki-line-map-conformance.mjs
 *
 * Live (flipped by Tim). D1 pack required. Not generated from GTFS/Digitransit
 * (line-map is a hand-built summary of the D1 pack's lines[], not re-derived from a live pull).
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getCity } from "../lib/providers/registry.js";
import {
  HELSINKI_HUB,
  marketingLabelsForStation,
  foldKey,
  isForbiddenCollapseName,
  isForbiddenTerminusToken,
} from "../lib/cities/helsinki/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function main() {
  const lineMap = loadJson("lib/cities/helsinki/line-map.json");
  const catalog = loadJson("lib/cities/helsinki/stations.json");
  const failures = [];

  // C0: registry status/adapterReady
  const registryEntry = getCity("helsinki");
  if (registryEntry?.status !== "live") {
    failures.push("C0: helsinki registry status must be live");
  }
  if (registryEntry?.adapterReady !== true) {
    failures.push("C0: helsinki adapterReady must be true");
  }
  if (lineMap.timeZone !== "Europe/Helsinki" || lineMap.dst !== true) {
    failures.push("C0: Europe/Helsinki must record DST");
  }

  // C1: hub lock
  if (lineMap.hub !== HELSINKI_HUB) {
    failures.push(`C1: line-map hub must be ${HELSINKI_HUB}`);
  }

  const catalogNames = (catalog.stations ?? []).map((row) => row.name);
  if (catalogNames.length !== 30 || new Set(catalogNames).size !== 30) {
    failures.push(`C2: catalog must have 30 unique metro station names, got ${catalogNames.length}`);
  }
  if (!catalogNames.includes(HELSINKI_HUB)) {
    failures.push(`C2: catalog must lock ${HELSINKI_HUB}`);
  }
  for (const mode of catalog.stations ?? []) {
    if (mode.mode !== "metro") {
      failures.push(`C2: catalog station ${mode.name} must be mode=metro (v1 is metro-only)`);
    }
  }

  // Forbidden / invented names must never appear in the catalog.
  const forbiddenNames = [
    "Helsinki",
    "Helsinki Central",
    "Helsingin päärautatieasema",
    "Päärautatieasema",
    "Central Railway Station",
    "City",
    "City Centre",
    "Helsingin keskusta",
    "Helsingfors centrum",
    "CBD",
    "to City",
    "Pasila",
    "Kaisaniemi",
    "Aalto University",
    "University of Helsinki",
  ];
  for (const name of forbiddenNames) {
    if (catalogNames.includes(name)) {
      failures.push(`C2: catalog must not invent/carry the forbidden name ${name}`);
    }
  }

  // D1 cross-check
  const d1Path = join(ROOT, "docs/helsinki-d1/published-network.json");
  const publishedPath = join(ROOT, "qa/fixtures/helsinki/published-network.json");
  if (!existsSync(d1Path)) {
    failures.push("C3: docs/helsinki-d1/published-network.json is required");
  }
  if (!existsSync(publishedPath)) {
    failures.push("C3: D1 published-network.json must be copied into qa/fixtures/helsinki/");
  } else if (existsSync(d1Path) && readFileSync(d1Path, "utf8") !== readFileSync(publishedPath, "utf8")) {
    failures.push("C3: qa/fixtures/helsinki/published-network.json must match docs/helsinki-d1 verbatim");
  }

  let published = null;
  if (existsSync(publishedPath)) {
    published = JSON.parse(readFileSync(publishedPath, "utf8"));

    if (published.printedInnerCityNames?.lock !== HELSINKI_HUB) {
      failures.push(`C1: D1 lock must be ${HELSINKI_HUB}`);
    }

    // C3: Metro M1/M2 only station-set matches line-map.json against published-network.json.
    const publishedLineIds = new Set((published.lines ?? []).map((line) => line.id));
    if (!publishedLineIds.has("M1") || !publishedLineIds.has("M2") || publishedLineIds.size !== 2) {
      failures.push(`C3: published-network must define exactly M1 and M2, got ${[...publishedLineIds].join(",")}`);
    }
    const mapLineIds = new Set((lineMap.lines ?? []).map((line) => line.id));
    if (!mapLineIds.has("M1") || !mapLineIds.has("M2") || mapLineIds.size !== 2) {
      failures.push(`C3: line-map.json must define exactly M1 and M2, got ${[...mapLineIds].join(",")}`);
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

  // C4: doNotGroup coverage — Helsinki Central/Päärautatieasema (VR) and Pasila.
  const grouped = (lineMap.doNotGroup ?? []).map((row) => `${row.a}::${row.b}`);
  if (!grouped.some((row) => /helsinki central|päärautatieasema/i.test(row))) {
    failures.push("C4: doNotGroup must cover Helsinki Central/Päärautatieasema (VR, different stop-place)");
  }
  if (!grouped.some((row) => /pasila/i.test(row))) {
    failures.push("C4: doNotGroup must cover Pasila (no metro)");
  }
  if (!grouped.some((row) => /kamppi/i.test(row) && /bus terminal/i.test(row))) {
    failures.push("C4: doNotGroup must cover Kamppi vs Kamppi bus terminal");
  }
  // Same coverage must exist in the D1 pack's doNotUse / alsoOnSharedApproaches lists.
  if (published) {
    const doNotUse = (published.printedInnerCityNames?.doNotUse ?? []).map((s) => s.toLowerCase());
    if (!doNotUse.some((s) => s.includes("päärautatieasema") || s.includes("helsinki central"))) {
      failures.push("C4: D1 doNotUse must cover Helsinki Central/Päärautatieasema");
    }
    if (!doNotUse.includes("pasila")) {
      failures.push("C4: D1 doNotUse must cover Pasila");
    }
  }

  // C5: shortTurnGroups must stay empty (no short-turning modelled in v1).
  if (JSON.stringify(lineMap.shortTurnGroups ?? {}) !== "{}") {
    failures.push("C5: shortTurnGroups must stay empty");
  }

  // C6: current termini — Kivenlahti/Vuosaari (M1), Tapiola/Mellunmäki (M2).
  const m1 = (lineMap.lines ?? []).find((line) => line.id === "M1");
  const m2 = (lineMap.lines ?? []).find((line) => line.id === "M2");
  const m1Termini = new Set(m1?.termini ?? []);
  const m2Termini = new Set(m2?.termini ?? []);
  if (!(m1Termini.has("Kivenlahti") && m1Termini.has("Vuosaari") && m1Termini.size === 2)) {
    failures.push(`C6: M1 termini must be exactly Kivenlahti/Vuosaari, got ${[...m1Termini].join(",")}`);
  }
  if (!(m2Termini.has("Tapiola") && m2Termini.has("Mellunmäki") && m2Termini.size === 2)) {
    failures.push(`C6: M2 termini must be exactly Tapiola/Mellunmäki, got ${[...m2Termini].join(",")}`);
  }
  if (m1Termini.has("Matinkylä") || m2Termini.has("Matinkylä")) {
    failures.push("C6: Matinkylä must never be a terminus (former west end, 2017-2 Dec 2022)");
  }

  // C7: Matinkylä must resolve as a real station but never be a terminus chip token.
  if (!catalogNames.includes("Matinkylä")) {
    failures.push("C7: Matinkylä must resolve as a real catalog station");
  }
  if (isForbiddenCollapseName("Matinkylä")) {
    failures.push("C7: Matinkylä must NOT be blocked from station resolution (isForbiddenCollapseName)");
  }
  if (!isForbiddenTerminusToken("Matinkylä")) {
    failures.push("C7: Matinkylä must be blocked as a terminus/direction chip (isForbiddenTerminusToken)");
  }
  const matinkylaLabels = marketingLabelsForStation("Matinkylä", lineMap);
  if (matinkylaLabels.some((label) => /matinkylä/i.test(label.split(" + ")[1] ?? ""))) {
    failures.push("C7: no marketing chip may print Matinkylä as a terminus");
  }

  // Same split for the other doNotUse-but-real stations (Kamppi, Helsingin yliopisto).
  for (const realStation of ["Kamppi", "Helsingin yliopisto"]) {
    if (!catalogNames.includes(realStation)) {
      failures.push(`C7: ${realStation} must resolve as a real catalog station`);
    }
    if (isForbiddenCollapseName(realStation)) {
      failures.push(`C7: ${realStation} must NOT be blocked from station resolution`);
    }
    if (!isForbiddenTerminusToken(realStation)) {
      failures.push(`C7: ${realStation} must be blocked as a terminus/direction chip`);
    }
  }

  // C8: no forbidden/invented station names anywhere in line-map stations.
  const uniqueStations = new Set();
  for (const line of lineMap.lines ?? []) {
    for (const name of line.stations ?? []) {
      uniqueStations.add(name);
    }
  }
  for (const name of forbiddenNames) {
    if (uniqueStations.has(name)) {
      failures.push(`C8: line-map must not carry the forbidden name ${name}`);
    }
  }
  if (!uniqueStations.has(HELSINKI_HUB)) {
    failures.push(`C8: line-map must serve the hub ${HELSINKI_HUB}`);
  }
  // Every line-map station must exist in the catalog (no invented stations).
  const catalogFold = new Set(catalogNames.map(foldKey));
  for (const name of uniqueStations) {
    if (!catalogFold.has(foldKey(name))) {
      failures.push(`C8: line-map station ${name} is not in the station catalog (invented?)`);
    }
  }

  // C9: hub marketing chips must never read inbound/outbound/City.
  const hubLabels = marketingLabelsForStation(HELSINKI_HUB, lineMap);
  if (!hubLabels.some((label) => /^M1 \+ /.test(label)) || !hubLabels.some((label) => /^M2 \+ /.test(label))) {
    failures.push(`C9: ${HELSINKI_HUB} must offer both M1 + and M2 + chips`);
  }
  if (hubLabels.some((label) => /inbound|outbound|to city/i.test(label))) {
    failures.push("C9: do not use inbound/outbound or to City chips at the hub");
  }

  if (failures.length) {
    console.error("helsinki-line-map-conformance failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    "helsinki-line-map-conformance: ok (live, D1 pack, 30 stations, M1/M2 only, hub lock Rautatientori, doNotGroup VR/Pasila/Kamppi bus, Matinkylä stop-not-terminus)"
  );
}

main();
