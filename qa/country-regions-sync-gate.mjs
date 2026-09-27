/**
 * country-regions.js sync gate (docs/jim-brief-country-regions-sync.md, updated
 * docs/jim-brief-registry-driven-client.md).
 *
 * lib/cities/country-regions.js is a hand-maintained city -> country table that
 * api/country-stations.js AND api/cities.js's city manifest both use to place a
 * region under its country. It used to duplicate a second, client-side COUNTRIES
 * table in public/city-session.js, and nothing checked the two stayed in sync
 * (PR #383 added the table, flip PR #387 made rest-of-england live and updated
 * city-session.js's picker entry, but country-regions.js was never touched, so
 * GET /api/country-stations?country=gb-eng silently omitted a live region's 436
 * stations from the "All regions" view).
 *
 * As of docs/jim-brief-registry-driven-client.md, public/city-session.js no
 * longer carries its own COUNTRIES table at all — the picker is built client-side
 * from the /api/cities manifest, which is itself built from country-regions.js —
 * so that particular drift is now structurally impossible. This gate instead
 * asserts country-regions.js's own internal consistency against the registry:
 * every `status: "live"` city has a CITY_COUNTRY entry (or it silently falls out
 * of the picker/manifest), every CITY_COUNTRY entry names a real, non-retired
 * registry city, and every CITY_COUNTRY value is a known country in
 * COUNTRY_NAMES. (Planned cities — e.g. Osaka, Dublin, BART, Chicago — may or may
 * not have an entry yet; they're out of the picker/manifest either way until they
 * flip live, so this gate doesn't demand or forbid one for them.)
 *
 * Offline pure-Node gate — no dev server. Usage: node qa/country-regions-sync-gate.mjs
 */
import { CITIES } from "../lib/providers/registry.js";
import { CITY_COUNTRY, COUNTRY_NAMES } from "../lib/cities/country-regions.js";

let failures = 0;
function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  }
}

const registryIds = new Set(CITIES.map((city) => city.id));
const registryById = new Map(CITIES.map((city) => [city.id, city]));

// Every live city must have a country, or it silently falls out of the
// /api/cities manifest's `country` field and the country-wide picker.
for (const city of CITIES) {
  if (city.status !== "live") continue;
  check(
    CITY_COUNTRY[city.id] !== undefined,
    `live city "${city.id}" has no lib/cities/country-regions.js CITY_COUNTRY entry — it will have no country in the /api/cities manifest`
  );
}

// Every CITY_COUNTRY entry must name a real, non-retired registry city with a
// known country.
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
    COUNTRY_NAMES[country] !== undefined,
    `country-regions.js entry "${id}" -> unknown country "${country}" (add it to COUNTRY_NAMES)`
  );
}

if (failures > 0) {
  console.error(`country-regions-sync-gate: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `country-regions-sync-gate: ok (${Object.keys(CITY_COUNTRY).length} country-regions.js entries consistent with the registry)`
);
