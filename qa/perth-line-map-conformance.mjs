/**
 * Perth D1 vs live line-map (topology). Not a §3 chip D5 table.
 * Usage: node qa/perth-line-map-conformance.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive } from "../lib/providers/registry.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRINTED = [
  "Airport Line",
  "Armadale Line",
  "Ellenbrook Line",
  "Fremantle Line",
  "Mandurah Line",
  "Midland Line",
  "Thornlie-Cockburn Line",
  "Yanchep Line",
];
const LOCK = ["Perth Stn", "Perth Underground Stn", "Elizabeth Quay Stn"];
const MISSING_BEFORE = [
  "Alkimos Stn",
  "Eglinton Stn",
  "City West Stn",
  "West Leederville Stn",
  "Cottesloe Stn",
  "East Guildford Stn",
];
const SURFACE_IDS = ["fremantle", "midland", "airport", "ellenbrook", "armadale", "thornlie"];

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function fold(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+stn$/i, "")
    .replace(/\s+station$/i, "")
    .replace(/–/g, "-");
}

function main() {
  const published = loadJson("qa/fixtures/perth/published-network.json");
  const lineMap = loadJson("lib/cities/perth/line-map.json");
  const failures = [];

  const live = assertCityLive("perth");
  if (!live || live.ok !== true) {
    failures.push("C0: assertCityLive(perth) must pass — Perth stays live");
  }
  if (published.timezone !== "Australia/Perth" || lineMap.dst !== false) {
    failures.push("C0: Australia/Perth has no DST");
  }

  const names = (lineMap.lines ?? []).map((line) => line.name);
  if (JSON.stringify([...names].sort()) !== JSON.stringify([...PRINTED].sort())) {
    failures.push(`C1: line names ${names.join("; ")} expected eight printed lines`);
  }
  if (names.includes("Armadale / Byford Line")) {
    failures.push("C1: official name is Armadale Line (Byford is the terminus)");
  }
  if ((lineMap.lines ?? []).some((line) => line.name.includes("–"))) {
    failures.push("C1: Thornlie-Cockburn uses a hyphen, not an en-dash");
  }

  const catalog = new Set();
  for (const line of lineMap.lines ?? []) {
    for (const station of line.stations ?? []) {
      catalog.add(station);
    }
  }
  for (const name of LOCK) {
    if (!catalog.has(name)) {
      failures.push(`C2: catalog must keep ${name}`);
    }
  }
  const yanchep = lineMap.lines.find((line) => line.id === "yanchep");
  const mandurah = lineMap.lines.find((line) => line.id === "mandurah");
  if (yanchep?.stations?.includes("Perth Stn") || mandurah?.stations?.includes("Perth Stn")) {
    failures.push("C2: Yanchep/Mandurah must not list Perth Stn");
  }
  for (const id of SURFACE_IDS) {
    const line = lineMap.lines.find((entry) => entry.id === id);
    if (line?.stations?.includes("Perth Underground Stn")) {
      failures.push(`C2: ${id} must not list Perth Underground Stn`);
    }
  }
  if (!yanchep?.stations?.includes("Elizabeth Quay Stn") || !mandurah?.stations?.includes("Elizabeth Quay Stn")) {
    failures.push("C2: Yanchep and Mandurah must list Elizabeth Quay Stn");
  }

  for (const station of MISSING_BEFORE) {
    if (!catalog.has(station)) {
      failures.push(`C2: line-map missing ${station}`);
    }
  }

  const tcl = lineMap.lines.find((line) => line.id === "thornlie");
  if (!tcl?.termini?.includes("Cockburn Central")) {
    failures.push("C3: TCL official outer terminus is Cockburn Central");
  }
  if (tcl?.stations?.some((name) => /mandurah|lakelands|warnbro|wellard|rockingham|kwinana|aubin grove|kenwick/i.test(name))) {
    failures.push("C3: TCL must not include Mandurah-south stops or Kenwick");
  }

  const armadale = lineMap.lines.find((line) => line.id === "armadale");
  if (armadale?.name !== "Armadale Line" || !armadale?.stations?.includes("Byford Stn")) {
    failures.push("C3: Armadale Line outer end is Byford");
  }

  const ellenbrook = lineMap.lines.find((line) => line.id === "ellenbrook");
  if (!ellenbrook || !ellenbrook.stations?.includes("Ellenbrook Stn")) {
    failures.push("C3: Ellenbrook is its own line");
  }

  const airport = lineMap.lines.find((line) => line.id === "airport");
  if (!airport?.termini?.includes("Fremantle") || !airport?.stations?.includes("Fremantle Stn")) {
    failures.push("C3: Airport through-runs to Fremantle on the map");
  }

  for (const pub of published.lines ?? []) {
    const mapped = (lineMap.lines ?? []).find((line) => fold(line.id) === fold(pub.id) || fold(line.name) === fold(pub.name));
    if (!mapped) {
      failures.push(`C3: line-map missing D1 line ${pub.name}`);
      continue;
    }
    const pubKeys = new Set((pub.stations ?? []).map(fold));
    const mapKeys = new Set((mapped.stations ?? []).map(fold));
    const extraMap = [...mapKeys].filter((key) => !pubKeys.has(key));
    const extraPub = [...pubKeys].filter((key) => !mapKeys.has(key));
    if (extraMap.length || extraPub.length) {
      failures.push(
        `C3: ${pub.name} station mismatch extraMap=${extraMap.join("|") || "—"} extraPub=${extraPub.join("|") || "—"}`
      );
    }
  }

  if (JSON.stringify(lineMap.printedInnerCityNames ?? []) !== JSON.stringify(["Perth", "Perth Underground", "Elizabeth Quay"])) {
    failures.push("C2: printedInnerCityNames lock");
  }

  if ((lineMap.shortTurnGroups?.Yanchep ?? []).includes("Butler")) {
    failures.push("C5: Butler is not a printed Yanchep terminate code");
  }

  if (failures.length) {
    console.error("perth-line-map-conformance failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("perth-line-map-conformance: ok (live, D1 oracle, three inner-city strings)");
}

main();
