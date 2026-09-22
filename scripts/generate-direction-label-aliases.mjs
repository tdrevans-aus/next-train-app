/**
 * Generate `lib/cities/<city>/direction-label-aliases.json` — legacy direction label -> current
 * canonical label — from each city's own canonical line/terminus data, and regenerate the
 * matching literal block in public/journey-model.js from the same JSON files, so server and
 * client read one shared table instead of two hand-kept copies
 * (docs/jim-brief-direction-label-aliases-server-side.md, 22 Sep 2026).
 *
 * Usage: node scripts/generate-direction-label-aliases.mjs
 *
 * Re-run this whenever a city's direction labels change; it is deterministic (same inputs ->
 * same JSON), so a clean re-run producing a diff means the source data changed, not this script.
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  METRO_LINE_NAMES as MELBOURNE_METRO_LINE_NAMES,
  HUB_TERMINUS as MELBOURNE_HUB_TERMINUS,
} from "../lib/cities/melbourne/direction-labels.js";
import { COMMUTER_RAIL_ROUTES, mapCommuterRailDestination } from "../lib/cities/boston/marketing-directions.js";
import { METROLINK_LINES, mapMetrolinkDestination } from "../lib/cities/greater-manchester/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function writeCityAliases(cityId, aliases) {
  const file = join(ROOT, "lib", "cities", cityId, "direction-label-aliases.json");
  writeFileSync(file, `${JSON.stringify(aliases, null, 2)}\n`);
  console.log(`generate-direction-label-aliases: wrote ${Object.keys(aliases).length} for ${cityId}`);
}

/**
 * Melbourne, relabelled to terminus-only/Perth style 22 Sep 2026
 * (docs/jim-brief-melbourne-direction-labels-perth-style.md). Retired form was
 * "<Line> Line + <terminus>" (plus "via City Loop" for the loop-suffix variant).
 */
function buildMelbourneAliases() {
  const aliases = {};
  for (const lineName of Object.values(MELBOURNE_METRO_LINE_NAMES)) {
    aliases[`${lineName} Line + ${lineName}`] = lineName;
    aliases[`${lineName} Line + ${lineName} via City Loop`] = `${lineName} via City Loop`;
    aliases[`${lineName} Line + ${MELBOURNE_HUB_TERMINUS}`] = `${MELBOURNE_HUB_TERMINUS} (${lineName} Line)`;
  }
  return aliases;
}

/**
 * Adelaide, same relabelling. Retired form was "<line name> <terminus>" (line-map.json's line
 * `name` field, e.g. "Belair line", already includes the word "line").
 */
function buildAdelaideAliases() {
  const HUB = "Adelaide Railway Station";
  const lineMap = JSON.parse(
    readFileSync(join(ROOT, "lib/cities/adelaide/line-map.json"), "utf8")
  );
  const MARKETING_ENDS = {
    BEL: ["Adelaide Railway Station", "Belair"],
    SEAFRD: ["Adelaide Railway Station", "Seaford"],
    FLNDRS: ["Adelaide Railway Station", "Flinders"],
    GAWC: ["Adelaide Railway Station", "Gawler Central"],
    OUTHA: ["Adelaide Railway Station", "Outer Harbor"],
    PTDOCK: ["Adelaide Railway Station", "Port Dock"],
    GRNG: ["Adelaide Railway Station", "Grange"],
  };
  const aliases = {};
  for (const line of lineMap.lines ?? []) {
    const termini = MARKETING_ENDS[line.number];
    if (!termini) {
      continue;
    }
    for (const terminus of termini) {
      if (terminus === HUB) {
        aliases[`${line.name} ${HUB}`] = `${HUB} (${line.name})`;
      } else {
        aliases[`${line.name} ${terminus}`] = terminus;
      }
    }
  }
  return aliases;
}

/**
 * Boston Commuter Rail, terminus-only/Perth style extended 22 Sep 2026
 * (docs/jim-brief-direction-label-aliases-server-side.md Part 2). Retired form was
 * "<Line long name> + <terminus>" for every direction of every route, including the two
 * hub-bound (South Station/North Station) directions. Subway colour-line labels are unchanged
 * and need no alias.
 */
function buildBostonAliases() {
  const aliases = {};
  for (const [routeId, route] of Object.entries(COMMUTER_RAIL_ROUTES)) {
    for (let directionId = 0; directionId < route.termini.length; directionId += 1) {
      const terminus = route.termini[directionId];
      const legacy = `${route.longName} + ${terminus}`;
      const canonical = mapCommuterRailDestination(routeId, directionId);
      if (canonical && canonical !== legacy) {
        aliases[legacy] = canonical;
      }
    }
  }
  return aliases;
}

/**
 * Greater Manchester Metrolink — only the two chips where the line number literally repeated
 * the terminus word lose the line prefix (docs/jim-brief-direction-label-aliases-server-side.md
 * Part 2): "Eccles + Eccles" -> "Eccles", "Airport + Manchester Airport" -> "Manchester Airport".
 * Every other Metrolink chip ("Green + Altrincham" etc.) is unchanged and needs no alias.
 */
function buildGreaterManchesterAliases() {
  const aliases = {};
  for (const line of METROLINK_LINES) {
    for (const terminus of line.termini) {
      const legacy = `${line.number} + ${terminus}`;
      const canonical = mapMetrolinkDestination(terminus, line.number);
      if (canonical && canonical !== legacy) {
        aliases[legacy] = canonical;
      }
    }
  }
  return aliases;
}

const CITY_BUILDERS = {
  melbourne: buildMelbourneAliases,
  adelaide: buildAdelaideAliases,
  boston: buildBostonAliases,
  "greater-manchester": buildGreaterManchesterAliases,
};

function buildAll() {
  const byCity = {};
  for (const [cityId, build] of Object.entries(CITY_BUILDERS)) {
    byCity[cityId] = build();
  }
  return byCity;
}

/**
 * Regenerate the LEGACY_DIRECTION_ALIASES block in public/journey-model.js from the exact same
 * per-city alias objects, between the DIRECTION-LABEL-ALIASES-GENERATED markers, so the client
 * never hand-keeps a second copy of this table.
 */
function writeClientBlock(byCity) {
  const file = join(ROOT, "public", "journey-model.js");
  const source = readFileSync(file, "utf8");
  const start = "  // DIRECTION-LABEL-ALIASES-GENERATED:START\n";
  const end = "  // DIRECTION-LABEL-ALIASES-GENERATED:END\n";
  const startIdx = source.indexOf(start);
  const endIdx = source.indexOf(end);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      "public/journey-model.js is missing the DIRECTION-LABEL-ALIASES-GENERATED markers"
    );
  }
  const merged = Object.assign({}, ...Object.values(byCity));
  const body =
    `  /**\n` +
    `   * Generated by scripts/generate-direction-label-aliases.mjs from the per-city JSON files\n` +
    `   * under lib/cities/<city>/direction-label-aliases.json — do not hand-edit; re-run the\n` +
    `   * script instead (docs/jim-brief-direction-label-aliases-server-side.md).\n` +
    `   */\n` +
    `  const LEGACY_DIRECTION_ALIASES = ${JSON.stringify(merged, null, 2).replace(/\n/g, "\n  ")};\n`;
  const next = source.slice(0, startIdx) + start + body + end + source.slice(endIdx + end.length);
  writeFileSync(file, next);
  console.log(
    `generate-direction-label-aliases: wrote ${Object.keys(merged).length} combined aliases into public/journey-model.js`
  );
}

function main() {
  const byCity = buildAll();
  for (const [cityId, aliases] of Object.entries(byCity)) {
    writeCityAliases(cityId, aliases);
  }
  writeClientBlock(byCity);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main();
}

export { buildAll, buildMelbourneAliases, buildAdelaideAliases, buildBostonAliases, buildGreaterManchesterAliases };
