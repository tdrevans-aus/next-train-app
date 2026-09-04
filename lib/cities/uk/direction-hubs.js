/**
 * Direction hub anchoring — shared UK helper (FB-51).
 *
 * Design: docs/direction-hub-anchoring-issue.md, FB-50 brief:
 * docs/jim-brief-uk-west-midlands-hub-anchoring.md (West Midlands, the
 * pattern this generalises), FB-51 brief: docs/jim-brief-fb51-uk-hub-rollout.md.
 *
 * A "hub" is a curated, Tim-reviewed intermediate through-station (e.g.
 * Birmingham on the Kidderminster corridor, Nottingham on the Alfreton/
 * Chesterfield corridor) that a habitual rider anchors on even though it is
 * never a trip's printed terminus. This module is pure/data-only on
 * purpose: `applyDirectionHubs()` takes an already-derived chip list and a
 * loaded hub config and returns a new chip list, so QA gates can exercise
 * it with a fixture and no Darwin token. Nothing here fetches a board.
 *
 * `loadDirectionHubs(regionId)` loads `lib/cities/<regionId>/direction-hubs.json`
 * when present. A region with no hub file gets `{ region: regionId, hubs: [] }`
 * back — `applyDirectionHubs()`/`planUkNextTrainFetch()` then behave exactly
 * as if hubs did not exist, so lifting this out of uk-west-midlands changes
 * nothing for regions that opt in later.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { resolveRailEntry } from "../../providers/uk/catalog.js";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const CITIES_ROOT = join(MODULE_DIR, "..");

/** @type {Map<string, { region: string, hubs: object[] }>} */
const cache = new Map();

function hubsJsonPath(regionId) {
  return join(CITIES_ROOT, regionId, "direction-hubs.json");
}

function loadRaw(regionId) {
  const path = hubsJsonPath(regionId);
  if (!existsSync(path)) {
    return { region: regionId, hubs: [] };
  }
  return JSON.parse(readFileSync(path, "utf8"));
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
 * Loads and validates `lib/cities/<regionId>/direction-hubs.json`. A region
 * with no such file returns `{ region: regionId, hubs: [] }` — every
 * consumer treats that identically to "no hubs configured".
 *
 * Every `filterCrs` and `appliesFrom` entry must resolve in the region
 * catalog; `absorbs` entries must be printed destination strings only (no
 * " (Operator)" suffix — those are chip strings, not destination strings,
 * and would never match after chipDestinationPart() strips the chip being
 * tested).
 * @param {string} regionId
 */
export function loadDirectionHubs(regionId) {
  const cached = cache.get(regionId);
  if (cached) {
    return cached;
  }
  const raw = loadRaw(regionId);
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
  const result = { region: raw.region ?? regionId, hubs };
  cache.set(regionId, result);
  return result;
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
 * When `hubs` is empty (no direction-hubs.json for this region), this is a
 * no-op sort — identical to the pre-FB-51 behaviour.
 * @param {string[]} chips
 * @param {string} crs Station CRS the chips were derived for.
 * @param {object[]} hubs Loaded hub configs (loadDirectionHubs(regionId).hubs).
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

/**
 * Resolves an exact chip's destination part to a CRS, or null if it doesn't
 * resolve anywhere — the caller falls back to the undirected path in that
 * case. Tries the region catalog first (an in-region terminus), then the
 * national name->CRS index (an out-of-region terminus, e.g. "London St
 * Pancras (Intl)" from an East Midlands station) when `resolveDestinationCrs`
 * is supplied. Never guesses: an unresolved name returns null.
 * @param {string} destination
 * @param {string} regionId
 * @param {(name: string) => string | null} [resolveDestinationCrs] National
 *   index lookup, e.g. lib/cities/uk/rail-crs-index.js's resolveCrsForName.
 */
function resolveExactChipCrs(destination, regionId, resolveDestinationCrs) {
  const destPart = chipDestinationPart(destination);
  if (!destPart) {
    return null;
  }
  const regional = resolveRailEntry(destPart, regionId);
  if (regional?.crs) {
    return regional.crs;
  }
  if (typeof resolveDestinationCrs === "function") {
    return resolveDestinationCrs(destPart) ?? null;
  }
  return null;
}

/**
 * Pure routing decision for a region's getXDogfoodNextTrain() — exported
 * separately (no fetch inside it) so QA gates can assert the branching
 * table from the brief with a fixture, without a Darwin token:
 *  - "hub": destination matches a hub label for this station's CRS.
 *  - "exact": destination's own destination part resolves to a CRS, either
 *    in the region catalog or (when `resolveDestinationCrs` is given) the
 *    national name->CRS index — this is what lets the exact-chip path fire
 *    for out-of-region termini like London St Pancras from Nottingham.
 *  - "undirected": anything else (e.g. an unresolvable destination) — the
 *    original undirected-fetch-then-client-filter path, unchanged.
 * `mode !== "train"` is always undirected; metro/NET never consults hubs.
 * @param {{ crs?: string, name?: string } | null} entry Resolved catalog entry.
 * @param {"train"|"metro"|undefined} resolvedMode
 * @param {string} destination Chosen chip/label.
 * @param {object[]} hubs Loaded hub configs (loadDirectionHubs(regionId).hubs).
 * @param {{ regionId: string, resolveDestinationCrs?: (name: string) => string | null }} options
 */
export function planUkNextTrainFetch(entry, resolvedMode, destination, hubs, options) {
  const { regionId, resolveDestinationCrs } = options ?? {};
  if (resolvedMode !== "metro" && entry?.crs) {
    const hub = findHubForStation(entry.crs, hubs);
    if (hub && hub.label === destination) {
      return { kind: "hub", filterCrs: hub.filterCrs };
    }
    const exactCrs = resolveExactChipCrs(destination, regionId, resolveDestinationCrs);
    if (exactCrs) {
      return { kind: "exact", filterCrs: exactCrs, operatorMatch: true };
    }
  }
  return { kind: "undirected" };
}
