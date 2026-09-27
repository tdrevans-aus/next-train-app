/**
 * country-regions.js sync gate (docs/jim-brief-country-regions-sync.md).
 *
 * lib/cities/country-regions.js is a hand-maintained city -> country table
 * that api/country-stations.js uses to answer the country-wide station
 * picker. It duplicates the taxonomy already encoded in public/city-session.js's
 * client-side COUNTRIES table (its own file header says so), and nothing
 * checked that the two stay in sync — PR #383 added the table, and flip
 * PR #387 made rest-of-england live and updated city-session.js's picker
 * entry, but country-regions.js was never touched, so
 * GET /api/country-stations?country=gb-eng silently omitted a live region's
 * 436 stations from the "All regions" view.
 *
 * This gate derives the expected city -> country map from city-session.js's
 * COUNTRIES table (which lists every region meant to participate in the
 * country-wide picker) and asserts country-regions.js's CITY_COUNTRY matches
 * it exactly in both directions: every picker region has a matching
 * country-regions.js entry, and every country-regions.js entry names a real
 * registry city and has a matching picker region. (Planned cities — e.g.
 * Osaka, Dublin, BART, Chicago — are out of scope for this feature entirely
 * until they flip live, so they're correctly absent from both tables; this
 * gate leaves them alone rather than demanding entries that don't belong.)
 *
 * A picker region is in or out, never a third "Coming Soon" state (Tim,
 * 27 Sep 2026: "It's either in or out."; docs/jim-brief-no-coming-soon-picker.md):
 * this gate also asserts no picker region carries the (removed) comingSoon
 * flag, and that every picker region names a `status: "live"` registry city.
 * A new city gets a picker entry in its own flip commit — never a comingSoon
 * row ahead of it (Copenhagen #454 precedent).
 *
 * Offline pure-Node gate — no dev server. Usage: node qa/country-regions-sync-gate.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { CITIES } from "../lib/providers/registry.js";
import { CITY_COUNTRY } from "../lib/cities/country-regions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;
function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  }
}

// Ground truth for "which regions belong to the country-wide picker feature
// at all": public/city-session.js's COUNTRIES table, parsed the same way
// live-city-lists-sync.mjs does.
const citySession = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
const countryByCity = new Map();
for (const country of citySession.matchAll(
  /id:\s*"([a-z]{2}(?:-[a-z]{3})?)",\s*name:\s*"[^"]+",\s*regions:\s*\[([\s\S]*?)\]/g
)) {
  for (const region of country[2].matchAll(/\{\s*id:\s*"([a-z-]+)"([^}]*)\}/g)) {
    countryByCity.set(region[1], {
      country: country[1],
      comingSoon: /comingSoon:\s*true/.test(region[2]),
    });
  }
}
check(
  countryByCity.size > 0,
  "city-session picker COUNTRIES: could not parse (pattern drift — update this gate)"
);

const registryIds = new Set(CITIES.map((city) => city.id));
const registryById = new Map(CITIES.map((city) => [city.id, city]));

// No third "Coming Soon" state, and no picker region for a city that isn't
// actually live yet (docs/jim-brief-no-coming-soon-picker.md, 27 Sep 2026).
for (const [id, { comingSoon }] of countryByCity) {
  check(
    !comingSoon,
    `picker region "${id}" carries comingSoon — a city is in the picker or it isn't, never "Coming Soon" (docs/jim-brief-no-coming-soon-picker.md)`
  );
  const entry = registryById.get(id);
  check(
    entry && entry.status === "live",
    `picker region "${id}" must name a status: "live" registry city (got ${entry ? entry.status : "no registry entry"})`
  );
}

// 1. Every picker region (live or Coming Soon) must have a matching
//    country-regions.js entry, with the same country.
for (const [id, { country }] of countryByCity) {
  const actual = CITY_COUNTRY[id];
  check(
    actual !== undefined,
    `country-regions.js is missing an entry for picker region "${id}" (country-session.js has it under "${country}")`
  );
  if (actual !== undefined) {
    check(
      actual === country,
      `country-regions.js has "${id}" -> "${actual}" but the picker lists it under "${country}"`
    );
  }
}

// 2. Every country-regions.js entry must name a real registry city (live or
//    planned), and — if that city is meant to be reachable via the
//    country-wide picker at all — must also appear in the picker table.
for (const [id, country] of Object.entries(CITY_COUNTRY)) {
  check(registryIds.has(id), `country-regions.js entry "${id}" is not a known registry city`);
  const entry = registryById.get(id);
  if (entry) {
    check(
      entry.status === "live" || entry.status === "planned",
      `country-regions.js entry "${id}" is registry status "${entry.status}" — remove it (retired cities don't belong in the country-wide picker)`
    );
  }
  check(
    countryByCity.has(id),
    `country-regions.js entry "${id}" (${country}) has no matching public/city-session.js picker region — only add one once the city is status: "live" (never a "Coming Soon" row ahead of the flip)`
  );
}

if (failures > 0) {
  console.error(`country-regions-sync-gate: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `country-regions-sync-gate: ok (${Object.keys(CITY_COUNTRY).length} country-regions.js entries match the picker's ${countryByCity.size} regions)`
);
