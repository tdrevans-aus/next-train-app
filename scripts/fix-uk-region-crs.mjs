/**
 * Verify (and optionally fix) a UK region's rail CRS codes against Darwin.
 *
 * The West Midlands D1 pack shipped 17/75 wrong codes (each board silently showing another
 * station's trains) and a pre-flight sweep on 4 Sep 2026 found the same in every planned
 * region's pack. This script is the hygiene pass Jim's adapter brief assumes has been run:
 *
 *   1. resolve each catalogued station name through lib/cities/uk/rail-crs-index.json,
 *   2. verify the candidate live (Darwin stationName must match the catalogued name),
 *   3. fall back to the existing code only if it verifies and the index candidate doesn't,
 *   4. fill missing lat/lng from NaPTAN,
 *   5. with --write, patch lib/cities/<region>/stations.json, the same `crs` fields in
 *      docs/<region>-d1/published-network.json, and the region's CRS allow-list in
 *      qa/uk-region-catalog-conformance.mjs.
 *
 * Usage:
 *   node scripts/fix-uk-region-crs.mjs <region>            # report only
 *   node scripts/fix-uk-region-crs.mjs <region> --write    # apply
 *
 * Needs DARWIN_LDB_TOKEN (read from .env.local).
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "../lib/load-env-local.js";
import { resolveCrsForName } from "../lib/cities/uk/rail-crs-index.js";
import { fetchDepartureBoard } from "../lib/providers/uk-darwin.js";
import { loadUkNaptanIndex } from "./lib/uk-naptan.mjs";

loadEnvLocal();

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const region = process.argv[2];
const write = process.argv.includes("--write");
if (!region) {
  console.error("Usage: node scripts/fix-uk-region-crs.mjs <region> [--write]");
  process.exit(2);
}

const stationsPath = join(ROOT, "lib", "cities", region, "stations.json");
const networkPath = join(ROOT, "docs", `${region}-d1`, "published-network.json");
const conformancePath = join(ROOT, "qa", "uk-region-catalog-conformance.mjs");

const catalog = JSON.parse(readFileSync(stationsPath, "utf8"));
const stops = catalog.stops ?? catalog.stations ?? [];
const rail = stops.filter((s) => (s.mode ?? "train") === "train");

function norm(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s*\(.*?\)/g, "")
    .replace(/\bstation\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}
function namesMatch(a, b) {
  const x = norm(a);
  const y = norm(b);
  return x === y || x.includes(y) || y.includes(x);
}
async function liveName(crs) {
  try {
    const board = await fetchDepartureBoard({ crs, numRows: 1 });
    return { ok: true, name: board.stationName };
  } catch (err) {
    return { ok: false, name: `ERR ${String(err.message).slice(0, 40)}` };
  }
}

const changes = []; // { name, from, to }
const unresolved = [];
const rows = [];
let naptan = null;

for (const stop of rail) {
  const candidates = [];
  const viaIndex =
    resolveCrsForName(stop.name) ?? resolveCrsForName(String(stop.name).replace(/\s+Station$/i, ""));
  if (viaIndex) candidates.push(viaIndex);
  if (stop.crs && !candidates.includes(stop.crs)) candidates.push(stop.crs);

  let chosen = null;
  let evidence = "";
  for (const crs of candidates) {
    const live = await liveName(crs);
    if (live.ok && namesMatch(stop.name, live.name)) {
      chosen = crs;
      evidence = live.name;
      break;
    }
    evidence += `${crs}→${live.name}; `;
  }
  if (!chosen) {
    unresolved.push(`${stop.crs} "${stop.name}" (${evidence.trim()})`);
    rows.push([stop.crs, stop.name, "UNRESOLVED", evidence.trim()]);
    continue;
  }
  if (chosen !== stop.crs) {
    changes.push({ name: stop.name, from: stop.crs, to: chosen });
    rows.push([stop.crs, stop.name, `→ ${chosen}`, evidence]);
    stop.crs = chosen;
  } else {
    rows.push([stop.crs, stop.name, "ok", evidence]);
  }
  if (stop.lat == null || stop.lng == null) {
    naptan ??= await loadUkNaptanIndex();
    const { lat, lng } = naptan.coordsForCrs(stop.crs, stop.name);
    stop.lat = lat ?? null;
    stop.lng = lng ?? null;
    if (lat == null) unresolved.push(`${stop.crs} "${stop.name}" has no NaPTAN coords`);
  }
}

console.log(`fix-uk-region-crs: ${region} — ${rail.length} rail stations`);
for (const [crs, name, verdict, ev] of rows) {
  console.log(`  ${String(crs).padEnd(4)} ${String(name).padEnd(30)} ${verdict.padEnd(10)} ${ev}`);
}
console.log(`  changes: ${changes.length}, unresolved: ${unresolved.length}`);
for (const u of unresolved) console.log(`  !! ${u}`);

if (!write) {
  console.log("  (dry run — pass --write to apply)");
  process.exit(unresolved.length ? 1 : 0);
}

// 1. stations.json
writeFileSync(stationsPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`  wrote ${stationsPath}`);

// 2. published-network.json — same name → same code, structurally.
if (existsSync(networkPath) && changes.length) {
  const byName = new Map(changes.map((c) => [norm(c.name), c]));
  const byOld = new Map(changes.map((c) => [c.from, c.to]));
  let patched = 0;
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    if (typeof node.crs === "string" && typeof node.name === "string") {
      const c = byName.get(norm(node.name));
      if (c && node.crs === c.from) {
        node.crs = c.to;
        patched++;
      }
    }
    for (const [k, v] of Object.entries(node)) {
      if (/crs$/i.test(k) && typeof v === "string" && byOld.has(v) && k !== "crs") {
        node[k] = byOld.get(v);
        patched++;
      } else {
        walk(v);
      }
    }
  };
  const network = JSON.parse(readFileSync(networkPath, "utf8"));
  walk(network);
  writeFileSync(networkPath, `${JSON.stringify(network, null, 2)}\n`);
  console.log(`  patched ${patched} crs field(s) in ${networkPath}`);
}

// 3. conformance allow-list for this region.
if (changes.length) {
  let src = readFileSync(conformancePath, "utf8");
  const marker = `listRailStations("${region}")`;
  const at = src.indexOf(marker);
  if (at >= 0) {
    const listStart = src.indexOf("for (const crs of [", at);
    const listEnd = src.indexOf("]", listStart);
    if (listStart >= 0 && listEnd > listStart) {
      let list = src.slice(listStart, listEnd);
      for (const c of changes) list = list.replace(`"${c.from}"`, `"${c.to}"`);
      src = src.slice(0, listStart) + list + src.slice(listEnd);
      writeFileSync(conformancePath, src);
      console.log(`  updated ${region} allow-list in ${conformancePath}`);
    }
  }
}
process.exit(unresolved.length ? 1 : 0);
