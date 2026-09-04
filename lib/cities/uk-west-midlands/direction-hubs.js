/**
 * Direction hub anchoring — West Midlands only (FB-50).
 *
 * Design: docs/direction-hub-anchoring-issue.md, brief:
 * docs/jim-brief-uk-west-midlands-hub-anchoring.md.
 *
 * A "hub" is a curated, Tim-reviewed intermediate through-station (e.g.
 * Birmingham, on the Kidderminster–Worcester/Stratford-upon-Avon corridor)
 * that a habitual rider anchors on even though it is never a trip's printed
 * terminus. This module is pure/data-only on purpose: `applyDirectionHubs()`
 * takes an already-derived chip list and the loaded hub config and returns
 * a new chip list, so the QA gate can exercise it with a fixture and no
 * Darwin token. Nothing here fetches a board.
 *
 * Kept region-local deliberately (not a shared UK helper yet) — other
 * Darwin regions are FB-51, after Tim reviews this one.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { resolveRailEntry } from "../../providers/uk/catalog.js";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const HUBS_PATH = join(MODULE_DIR, "direction-hubs.json");

/** @type {{ region: string, hubs: object[] } | null} */
let cachedHubs = null;

function loadRaw() {
  return JSON.parse(readFileSync(HUBS_PATH, "utf8"));
}

/**
 * The destination part of a chip string, stripping a trailing
 * " (Operator)" suffix if present. "Dorridge (West Midlands Railway)" ->
 * "Dorridge"; "Birmingham" -> "Birmingham" (no suffix to strip).
 * @param {string} chip
 */
export function chipDestinationPart(chip) {
  const value = String(chip ?? "");
  const match = value.match(/^(.*) \(([^()]+)\)$/);
  return match ? match[1] : value;
}

/**
 * Loads and validates lib/cities/uk-west-midlands/direction-hubs.json.
 * Every `filterCrs` and `appliesFrom` entry must resolve in the region
 * catalog; `absorbs` entries must be printed destination strings only (no
 * " (Operator)" suffix — those are chip strings, not destination strings,
 * and would never match after chipDestinationPart() strips the chip being
 * tested).
 * @param {string} [regionId]
 */
export function loadDirectionHubs(regionId = "uk-west-midlands") {
  if (cachedHubs) {
    return cachedHubs;
  }
  const raw = loadRaw();
  const hubs = Array.isArray(raw.hubs) ? raw.hubs : [];
  for (const hub of hubs) {
    const filterEntry = resolveRailEntry(hub.filterCrs, regionId);
    if (!filterEntry) {
      throw new Error(
        `direction-hubs.json: hub "${hub.label}" filterCrs "${hub.filterCrs}" does not resolve in ${regionId} catalog`
      );
    }
    for (const crs of hub.appliesFrom ?? []) {
      const entry = resolveRailEntry(crs, regionId);
      if (!entry) {
        throw new Error(
          `direction-hubs.json: hub "${hub.label}" appliesFrom "${crs}" does not resolve in ${regionId} catalog`
        );
      }
    }
    for (const absorbed of hub.absorbs ?? []) {
      if (chipDestinationPart(absorbed) !== String(absorbed)) {
        throw new Error(
          `direction-hubs.json: hub "${hub.label}" absorbs entry "${absorbed}" must be a printed destination, not a chip with an operator suffix`
        );
      }
    }
  }
  cachedHubs = { region: raw.region, hubs };
  return cachedHubs;
}

/**
 * The hub (if any) that applies from the given station CRS.
 * @param {string} crs
 * @param {object[]} hubs
 */
export function findHubForStation(crs, hubs) {
  const normalizedCrs = String(crs || "").trim().toUpperCase();
  if (!normalizedCrs) {
    return null;
  }
  return (
    (hubs ?? []).find(
      (hub) => Array.isArray(hub.appliesFrom) && hub.appliesFrom.includes(normalizedCrs)
    ) ?? null
  );
}

/**
 * Post-processes an already-derived, sorted chip list for the given station:
 *  - if the station is in a hub's appliesFrom, always add the hub label as
 *    a chip (declared by config, not inferred from the sampled trips —
 *    otherwise the chip would flicker when the 15-row sample happens to
 *    contain no train toward the hub);
 *  - removes any chip whose destination part (before " (Operator)") is in
 *    that hub's absorbs list;
 *  - leaves every other chip alone.
 * @param {string[]} chips
 * @param {string} crs Station CRS the chips were derived for.
 * @param {object[]} hubs Loaded hub configs (loadDirectionHubs().hubs).
 */
export function applyDirectionHubs(chips, crs, hubs) {
  const hub = findHubForStation(crs, hubs);
  if (!hub) {
    return [...chips].sort((a, b) => a.localeCompare(b));
  }
  const absorbSet = new Set(hub.absorbs ?? []);
  const kept = chips.filter((chip) => !absorbSet.has(chipDestinationPart(chip)));
  const result = new Set(kept);
  result.add(hub.label);
  return [...result].sort((a, b) => a.localeCompare(b));
}
