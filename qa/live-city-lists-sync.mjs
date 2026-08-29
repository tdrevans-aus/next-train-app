/**
 * Live-city list sync gate — the self-enforcing half of docs/live-flip-checklist.md.
 *
 * The live-flip touches seven independent copies of "which cities are live"
 * (see the Göteborg flip, PR #129 + follow-ups: e2867b8 missed three of them).
 * This gate derives the expected set from the registry (status === "live") and
 * asserts every copy agrees, so a flip that misses one fails smoke instead of
 * failing in production persistence or the dogfood mount.
 *
 * Offline pure-Node gate — no dev server. Usage: node qa/live-city-lists-sync.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { CITIES } from "../lib/providers/registry.js";
import { MULTI_CITY_IDS } from "../lib/cities/live-city-api.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;
function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  }
}

function sameSet(actual, expected, label) {
  const a = new Set(actual);
  const e = new Set(expected);
  check(actual.length === a.size, `${label} has duplicate entries`);
  const missing = [...e].filter((id) => !a.has(id));
  const extra = [...a].filter((id) => !e.has(id));
  check(
    missing.length === 0 && extra.length === 0,
    `${label} out of sync — missing: [${missing}] extra: [${extra}]`
  );
}

/** Extract a quoted-string list from source by a regex whose group 1 spans the entries. */
function extractIds(source, regex, label) {
  const match = source.match(regex);
  check(match, `${label}: could not find the list in source (pattern drift — update this gate)`);
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

// Ground truth: the registry. Perth is live but predates the multi-city path.
const registryLiveIds = CITIES.filter((city) => city.status === "live").map((city) => city.id);
const expectedMulti = registryLiveIds.filter((id) => id !== "perth");
check(registryLiveIds.includes("perth"), "Perth must be live in the registry");

// 1. lib/cities/live-city-api.js — MULTI_CITY_IDS (imported directly).
sameSet(MULTI_CITY_IDS, expectedMulti, "live-city-api MULTI_CITY_IDS vs registry live cities");

// 2–3. public/app.js — NEARBY_MULTI_CITY_IDS + LIVE_CITY_IDS (which adds perth).
const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
sameSet(
  extractIds(appJs, /NEARBY_MULTI_CITY_IDS = \[([^\]]*)\]/, "app.js NEARBY_MULTI_CITY_IDS"),
  expectedMulti,
  "app.js NEARBY_MULTI_CITY_IDS"
);
sameSet(
  extractIds(appJs, /LIVE_CITY_IDS = new Set\(\[([^\]]*)\]/, "app.js LIVE_CITY_IDS"),
  registryLiveIds,
  "app.js LIVE_CITY_IDS"
);

// 4. public/city-session.js — its own MULTI_CITY_IDS, plus picker comingSoon flags.
const citySession = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
sameSet(
  extractIds(citySession, /MULTI_CITY_IDS = \[([^\]]*)\]/, "city-session MULTI_CITY_IDS"),
  expectedMulti,
  "city-session MULTI_CITY_IDS"
);

// Picker: every live city's region entry must exist and must not be comingSoon,
// and its country id must be in journey-model's PERSISTED_COUNTRY_IDS below.
const countryByCity = new Map();
for (const country of citySession.matchAll(
  /id:\s*"([a-z]{2})",\s*name:\s*"[^"]+",\s*regions:\s*\[([\s\S]*?)\]/g
)) {
  for (const region of country[2].matchAll(/\{\s*id:\s*"([a-z-]+)"([^}]*)\}/g)) {
    countryByCity.set(region[1], { country: country[1], comingSoon: /comingSoon:\s*true/.test(region[2]) });
  }
}
check(countryByCity.size > 0, "city-session picker COUNTRIES: could not parse (pattern drift — update this gate)");
for (const id of registryLiveIds) {
  const entry = countryByCity.get(id);
  check(entry, `city-session picker must list live city ${id}`);
  check(entry && !entry.comingSoon, `city-session picker entry for live city ${id} must not be comingSoon`);
}

// 5. public/brisbane-dogfood.js — its own MULTI_CITY_IDS + the available map.
const dogfood = readFileSync(join(ROOT, "public/brisbane-dogfood.js"), "utf8");
sameSet(
  extractIds(dogfood, /MULTI_CITY_IDS = \[([^\]]*)\]/, "brisbane-dogfood MULTI_CITY_IDS"),
  expectedMulti,
  "brisbane-dogfood MULTI_CITY_IDS"
);
const availableMatch = dogfood.match(/available: \{([^}]*)\}/);
check(availableMatch, "brisbane-dogfood available map: could not parse (pattern drift — update this gate)");
if (availableMatch) {
  const availableIds = [...availableMatch[1].matchAll(/(?:"([a-z-]+)"|([a-z]+)):/g)].map(
    (m) => m[1] ?? m[2]
  );
  sameSet(availableIds, expectedMulti, "brisbane-dogfood available map keys");
}

// 6–7. public/journey-model.js — PERSISTED_CITY_IDS + PERSISTED_COUNTRY_IDS.
// The settings sanitizer silently drops savedCity / savedCountry not on these.
const journeyModel = readFileSync(join(ROOT, "public/journey-model.js"), "utf8");
sameSet(
  extractIds(journeyModel, /PERSISTED_CITY_IDS = new Set\(\[([\s\S]*?)\]\)/, "journey-model PERSISTED_CITY_IDS"),
  registryLiveIds,
  "journey-model PERSISTED_CITY_IDS"
);
const persistedCountries = new Set(
  extractIds(journeyModel, /PERSISTED_COUNTRY_IDS = new Set\(\[([^\]]*)\]\)/, "journey-model PERSISTED_COUNTRY_IDS")
);
for (const id of registryLiveIds) {
  const country = countryByCity.get(id)?.country;
  if (!country) continue; // already failed the picker check above
  check(
    persistedCountries.has(country),
    `journey-model PERSISTED_COUNTRY_IDS must include "${country}" (country of live city ${id}) — the sanitizer drops savedCountry otherwise`
  );
}

if (failures > 0) {
  console.error(`live-city-lists-sync: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `live-city-lists-sync: ok (${registryLiveIds.length} live cities consistent across registry, live-city-api, app.js, city-session, brisbane-dogfood, journey-model)`
);
