/**
 * D5 — Offline Oslo line-map conformance.
 * Usage: node qa/oslo-line-map-conformance.mjs
 *
 * Live (flipped by Tim 30 Aug 2026). D1 pack required. Not generated from GTFS
 * (line-map.json is a hand-transcribed summary of the D1 pack's lines[], not re-derived
 * from a live Entur pull).
 *
 * Oslo hazards this gate exists to catch (see docs/oslo-d1/{hazard-pack,direction-model-memo}.md):
 *  - T-bane must stay lines 1-5 only — never line 6, never Fornebubanen (unopened, 2029 target).
 *  - Vy (8 lines) and Flytoget (2 lines) are in-scope ONLY at Jernbanetorget + Nationaltheatret —
 *    never the rest of their corridors (Drammen, Lillehammer, Skien, Moss, Ski, etc).
 *  - Hub lock is Stortinget, not Oslo/City/Sentrum/Jernbanetorget/Nationaltheatret/Majorstuen.
 *  - Three-way doNotGroup at Jernbanetorget and Nationaltheatret: T-bane vs Vy vs Flytoget are
 *    three separate platform/board sections, not two, not merged.
 *  - R21's own terminus is Oslo S (= Jernbanetorget cluster) — self-referential-hub problem;
 *    only "R21 + Moss" is ever a valid outbound chip, never "R21 + Oslo S"/"R21 + Jernbanetorget".
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getCity } from "../lib/providers/registry.js";
import {
  OSLO_HUB,
  marketingLabelsForStation,
  foldKey,
  isOsloSNameFamily,
  isForbiddenTerminusToken,
} from "../lib/cities/oslo/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function main() {
  const lineMap = loadJson("lib/cities/oslo/line-map.json");
  const catalog = loadJson("lib/cities/oslo/stations.json");
  const failures = [];

  if (getCity("oslo")?.status !== "live") {
    failures.push("C0: oslo registry status must be live");
  }
  if (getCity("oslo")?.adapterReady !== true) {
    failures.push("C0: oslo adapterReady must be true");
  }
  if (lineMap.timezone !== "Europe/Oslo") {
    failures.push("C0: line-map must record timezone Europe/Oslo");
  }

  // C2: catalog is T-bane-only, 101 unique passenger-open stops, hub locked, no forbidden names.
  const catalogNames = (catalog.stations ?? []).map((row) => row.name);
  if (catalogNames.length !== 101 || new Set(catalogNames).size !== 101) {
    failures.push(`C2: catalog must have 101 unique names, got ${catalogNames.length}`);
  }
  if (!catalogNames.includes(OSLO_HUB)) {
    failures.push(`C2: catalog must lock ${OSLO_HUB}`);
  }
  for (const name of ["Oslo S", "Oslo Sentralstasjon", "Oslo Central Station", "Sentrum", "City", "City Centre", "Oslo bussterminal"]) {
    if (catalogNames.includes(name)) {
      failures.push(`C2: catalog must not carry the forbidden/invented name ${name}`);
    }
  }

  // C3: D1 pack present and the QA fixture is a verbatim copy.
  const d1Path = join(ROOT, "docs/oslo-d1/published-network.json");
  const publishedPath = join(ROOT, "qa/fixtures/oslo/published-network.json");
  if (!existsSync(d1Path)) {
    failures.push("C3: docs/oslo-d1/published-network.json is required");
  }
  if (!existsSync(publishedPath)) {
    failures.push("C3: D1 published-network.json must be copied into qa/fixtures/oslo/");
  } else if (existsSync(d1Path) && readFileSync(d1Path, "utf8") !== readFileSync(publishedPath, "utf8")) {
    failures.push("C3: qa/fixtures/oslo/published-network.json must match docs/oslo-d1 verbatim");
  }

  let published = null;
  if (existsSync(publishedPath)) {
    published = JSON.parse(readFileSync(publishedPath, "utf8"));
    if (published.printedInnerCityNames?.lock !== OSLO_HUB) {
      failures.push(`C2: D1 lock must be ${OSLO_HUB}`);
    }

    // Station-set cross-check per line between line-map.json and the D1 pack.
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

  // C1: T-bane is exactly lines 1-5 — never line 6, never Fornebubanen.
  const tbaneLines = (lineMap.lines ?? []).filter((line) => line.mapGroup === "T-bane");
  const tbaneIds = tbaneLines.map((line) => line.id).sort();
  if (JSON.stringify(tbaneIds) !== JSON.stringify(["1", "2", "3", "4", "5"])) {
    failures.push(`C1: T-bane must be exactly lines 1-5, got ${tbaneIds.join(",")}`);
  }
  const tbaneStations = new Set();
  for (const line of tbaneLines) {
    for (const name of line.stations ?? []) {
      tbaneStations.add(name);
    }
  }
  for (const forbidden of ["Fornebu", "Fornebuporten", "Flytårnet", "Skøyen", "Vækerø", "Lysaker"]) {
    if (tbaneStations.has(forbidden)) {
      failures.push(`C1: T-bane must not carry unopened Fornebubanen station ${forbidden}`);
    }
  }

  // C6: Vy (8 lines) and Flytoget (2 lines) scoped ONLY to Jernbanetorget + Nationaltheatret.
  const vyLines = (lineMap.lines ?? []).filter((line) => line.mapGroup === "Vy");
  const flytogetLines = (lineMap.lines ?? []).filter((line) => line.mapGroup === "Flytoget");
  if (vyLines.length !== 8) {
    failures.push(`C6: Vy must carry exactly 8 in-scope lines, got ${vyLines.length}`);
  }
  if (flytogetLines.length !== 2) {
    failures.push(`C6: Flytoget must carry exactly 2 in-scope lines, got ${flytogetLines.length}`);
  }
  const scopedNames = new Set(["Jernbanetorget", "Nationaltheatret"]);
  for (const line of [...vyLines, ...flytogetLines]) {
    const names = new Set(line.stations ?? []);
    const extra = [...names].filter((name) => !scopedNames.has(name));
    if (extra.length || names.size !== 2) {
      failures.push(`C6: ${line.mapGroup} line ${line.id} must be scoped to exactly Jernbanetorget + Nationaltheatret, got ${line.stations?.join("|")}`);
    }
  }

  // C4: hub lock Stortinget appears on every T-bane line, and is never a Vy/Flytoget stop.
  for (const line of tbaneLines) {
    if (!(line.stations ?? []).includes(OSLO_HUB)) {
      failures.push(`C4: T-bane line ${line.id} must serve hub ${OSLO_HUB}`);
    }
  }
  for (const line of [...vyLines, ...flytogetLines]) {
    if ((line.stations ?? []).includes(OSLO_HUB)) {
      failures.push(`C4: ${line.mapGroup} line ${line.id} must never carry the T-bane hub ${OSLO_HUB}`);
    }
  }

  // C5: three-way doNotGroup at Jernbanetorget and Nationaltheatret — all three mapGroups
  // must record a doNotGroup branch note at BOTH stations, not just one group or one station.
  const groupsSeenAt = { Jernbanetorget: new Set(), Nationaltheatret: new Set() };
  for (const line of lineMap.lines ?? []) {
    for (const branch of line.branches ?? []) {
      if (!Object.prototype.hasOwnProperty.call(groupsSeenAt, branch.at)) {
        continue;
      }
      if (/doNotGroup/i.test(branch.note ?? "")) {
        groupsSeenAt[branch.at].add(line.mapGroup);
      }
    }
  }
  for (const station of ["Jernbanetorget", "Nationaltheatret"]) {
    for (const group of ["T-bane", "Vy", "Flytoget"]) {
      if (!groupsSeenAt[station].has(group)) {
        failures.push(`C5: ${station} must record a doNotGroup branch note for mapGroup ${group}`);
      }
    }
  }
  const doNotUse = (lineMap.printedInnerCityNames?.doNotUse ?? []).map((v) => v.toLowerCase());
  if (!doNotUse.includes("jernbanetorget") || !doNotUse.includes("nationaltheatret")) {
    failures.push("C5: printedInnerCityNames.doNotUse must list Jernbanetorget and Nationaltheatret as non-chip stations");
  }

  // C7: R21's self-referential Oslo S terminus is never a chip destination at Jernbanetorget.
  const r21 = (lineMap.lines ?? []).find((line) => line.id === "vy-r21");
  if (!r21) {
    failures.push("C7: vy-r21 must be present in line-map.json");
  } else {
    if (!r21.termini?.some((t) => isOsloSNameFamily(t))) {
      failures.push("C7: R21's own printed terminus must be Oslo S (the self-referential hub case)");
    }
  }
  const jbLabels = marketingLabelsForStation("Jernbanetorget");
  if (!jbLabels.includes("R21 + Moss")) {
    failures.push("C7: Jernbanetorget must offer R21 + Moss");
  }
  if (jbLabels.some((label) => /R21.*Oslo S/i.test(label))) {
    failures.push("C7: Jernbanetorget must never offer R21 + Oslo S (self-referential terminus)");
  }
  for (const label of jbLabels) {
    const terminus = label.split(" + ").slice(1).join(" + ");
    if (isOsloSNameFamily(terminus)) {
      failures.push(`C7: no chip may resolve to the Oslo S self-referential terminus, got ${label}`);
    }
  }

  // C8: no forbidden/invented names surface as direction-chip termini anywhere in the catalog.
  const uniqueStations = new Set();
  for (const line of lineMap.lines ?? []) {
    for (const name of line.stations ?? []) {
      uniqueStations.add(name);
    }
  }
  for (const forbidden of ["Oslo S", "Oslo Sentralstasjon", "Oslo Central Station", "Sentrum", "City", "City Centre"]) {
    if (uniqueStations.has(forbidden)) {
      failures.push(`C8: line-map must not carry the forbidden/invented station name ${forbidden}`);
    }
  }
  for (const stationName of uniqueStations) {
    const labels = marketingLabelsForStation(stationName);
    for (const label of labels) {
      const terminus = label.split(" + ").slice(1).join(" + ");
      if (isForbiddenTerminusToken(terminus) && !isOsloSNameFamily(terminus)) {
        // isForbiddenTerminusToken also covers doNotGroup shared-approach names (Jernbanetorget,
        // Nationaltheatret, Majorstuen, Tøyen) which must never be synthesized as a chip terminus.
        failures.push(`C8: ${stationName} must not offer a forbidden-terminus chip, got ${label}`);
      }
    }
  }

  if (failures.length) {
    console.error("oslo-line-map-conformance failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    "oslo-line-map-conformance: ok (live, D1 pack, 101 T-bane stations across lines 1-5, 8 Vy + 2 Flytoget lines scoped to Jernbanetorget/Nationaltheatret, three-way doNotGroup, R21+Moss-only, hub Stortinget)"
  );
}

main();
