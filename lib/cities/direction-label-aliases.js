/**
 * Server-side legacy direction-label aliases (docs/jim-brief-direction-label-aliases-server-side.md,
 * 22 Sep 2026).
 *
 * PR #439 renamed Melbourne/Adelaide direction labels to terminus-only/Perth style and migrated
 * saved journeys client-side only (LEGACY_DIRECTION_ALIASES in public/journey-model.js). Every
 * installed app still running the old client bundle kept sending the OLD label, and the server
 * rejected it outright (destination match failed -> `next: null` -> "No upcoming trains").
 *
 * A direction-label rename is an API contract change: the server must keep accepting the old
 * label for at least one app release cycle, and must echo the canonical label back in the
 * response so the client self-heals its saved value on next write.
 *
 * Single source of truth per city: `lib/cities/<city>/direction-label-aliases.json`, generated
 * by `scripts/generate-direction-label-aliases.mjs` from that city's own canonical line/terminus
 * data (never hand-typed twice) — the same JSON also feeds the generated block in
 * public/journey-model.js, so server and client read the identical table.
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const aliasCache = new Map();

/** @param {string} cityId @returns {Record<string,string>} */
function loadAliasesForCity(cityId) {
  const id = String(cityId || "").trim().toLowerCase();
  if (aliasCache.has(id)) {
    return aliasCache.get(id);
  }
  const file = join(ROOT, id, "direction-label-aliases.json");
  let aliases = {};
  if (existsSync(file)) {
    try {
      aliases = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      aliases = {};
    }
  }
  aliasCache.set(id, aliases);
  return aliases;
}

/**
 * @param {string} cityId
 * @param {string} label a rider- or client-supplied direction/destination string
 * @returns {string|null} the canonical replacement, or null if `label` is not a known legacy form
 */
export function resolveDirectionLabelAlias(cityId, label) {
  const trimmed = String(label || "").trim();
  if (!trimmed) {
    return null;
  }
  const aliases = loadAliasesForCity(cityId);
  return Object.prototype.hasOwnProperty.call(aliases, trimmed) ? aliases[trimmed] : null;
}

/**
 * Rewrites `config.destination` / `config.destinationLabel` to the canonical label when the
 * caller supplied a known legacy form — a no-op for a city with no alias table or a request
 * that already used the canonical label. Called once, centrally, before a city's next-train
 * lookup runs, so every dispatch path (api/next-train.js, api/board.js) benefits without each
 * city adapter needing its own alias-handling code.
 * @param {string} cityId
 * @param {object} config
 * @returns {object} `config`, or a shallow copy with destination/destinationLabel canonicalized
 */
export function canonicalizeDirectionConfig(cityId, config) {
  if (!config || !config.destination) {
    return config;
  }
  const canonical = resolveDirectionLabelAlias(cityId, config.destination);
  if (!canonical) {
    return config;
  }
  return { ...config, destination: canonical, destinationLabel: canonical };
}
