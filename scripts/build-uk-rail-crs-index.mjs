/**
 * Builds lib/cities/uk/rail-crs-index.json — a national GB station
 * name -> CRS index generated from NaPTAN's RailReferences.csv, plus a
 * small alias table for how Darwin prints some termini differently from
 * the raw NaPTAN StationName column. FB-51, docs/jim-brief-fb51-uk-hub-rollout.md.
 *
 * Usage: node scripts/build-uk-rail-crs-index.mjs
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { fetchRailReferencesCsv, parseCsvRow } from "./lib/uk-naptan.mjs";
import { normalizeStationName } from "../lib/cities/uk/rail-crs-index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(ROOT, "lib/cities/uk/rail-crs-index.json");

// How Darwin prints a terminus when it differs from NaPTAN's raw
// StationName column (e.g. "London St Pancras (Intl)" vs NaPTAN's "London
// St Pancras International"). Listed in docs/jim-brief-fb51-uk-hub-rollout.md
// — at minimum these; the CSV pass below covers every other GB station by
// its own NaPTAN name, so this table only needs the exceptions.
const DARWIN_PRINT_ALIASES = {
  "London St Pancras (Intl)": "STP",
  "Liverpool Lime Street": "LIV",
  "Birmingham New Street": "BHM",
  "Manchester Piccadilly": "MAN",
  "Stansted Airport": "SSD",
  Leeds: "LDS",
  Sheffield: "SHF",
  Norwich: "NRW",
  "Cardiff Central": "CDF",
  Edinburgh: "EDB",
  Plymouth: "PLY",
  Corby: "COR",
  "Lincoln Central": "LCN",
  Crewe: "CRE",
  Leicester: "LEI",
  Nottingham: "NOT",
  Derby: "DBY",
};

function normalizeRailName(stationName) {
  return normalizeStationName(
    String(stationName ?? "")
      .replace(/\s+Rail Station$/i, "")
      .replace(/\s+Station$/i, "")
  );
}

async function main() {
  const csv = await fetchRailReferencesCsv();
  const lines = csv.split(/\r?\n/).slice(1).filter(Boolean);

  /** @type {Record<string, string>} */
  const entries = {};
  let rowCount = 0;

  for (const line of lines) {
    const cols = parseCsvRow(line);
    const crs = cols[2]?.replace(/^"|"$/g, "").trim();
    const stationName = cols[3]?.replace(/^"|"$/g, "").trim();
    if (!crs || !stationName) {
      continue;
    }
    rowCount += 1;
    const key = normalizeRailName(stationName);
    if (key && !entries[key]) {
      entries[key] = crs;
    }
  }

  for (const [name, crs] of Object.entries(DARWIN_PRINT_ALIASES)) {
    const key = normalizeStationName(name);
    entries[key] = crs;
  }

  const out = {
    generatedAt: new Date().toISOString(),
    source: "NaPTAN RailReferences.csv (scripts/lib/uk-naptan.mjs fetchRailReferencesCsv) + Darwin-print alias table",
    rowCount,
    entryCount: Object.keys(entries).length,
    entries,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, `${JSON.stringify(out, null, 2)}\n`);
  console.log(
    `build-uk-rail-crs-index: wrote ${OUT_PATH} — ${out.entryCount} entries from ${rowCount} NaPTAN rows + ${Object.keys(DARWIN_PRINT_ALIASES).length} Darwin-print aliases`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
