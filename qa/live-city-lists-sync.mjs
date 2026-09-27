/**
 * Live-city list sync gate — the self-enforcing half of docs/live-flip-checklist.md.
 *
 * The live-flip used to touch seven independent hand-maintained copies of "which cities are
 * live" (see the Göteborg flip, PR #129 + follow-ups: e2867b8 missed three of them). As of
 * docs/jim-brief-registry-driven-client.md, six of those seven are gone — the client now
 * loads /api/cities' manifest instead of bundling its own copy — leaving exactly one
 * server-side list that still has to agree with the registry: lib/cities/live-city-api.js's
 * MULTI_CITY_IDS (the actual authorization gate `directionsFor`/`getMultiCityNextTrain` use;
 * see .claude/agents/mark.md's flip-commit paragraph).
 *
 * This gate asserts:
 *  (a) /api/cities' manifest live set === lib/providers/registry.js's `status: "live"` set
 *      (built the same way the endpoint itself is — lib/cities/city-manifest.js — so this is
 *      a construction proof, not a live HTTP call; no dev server needed).
 *  (b) MULTI_CITY_IDS still matches the registry (the one list this move deliberately did
 *      NOT remove).
 *  (c) no hardcoded city-id list survives in public/*.js outside the accessor module
 *      (public/city-manifest.js) — a static grep for the six retired list names.
 *  (d) public/city-manifest.seed.json equals what scripts/write-city-manifest.mjs would
 *      produce right now, so a stale seed (e.g. a flip that forgot to regenerate it) fails
 *      smoke instead of shipping a bundle that doesn't match the registry.
 *
 * Offline pure-Node gate — no dev server. Usage: node qa/live-city-lists-sync.mjs
 */
import { readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { CITIES } from "../lib/providers/registry.js";
import { MULTI_CITY_IDS } from "../lib/cities/live-city-api.js";
import { buildCityManifest } from "../lib/cities/city-manifest.js";

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

// Ground truth: the registry. Perth is live but predates the multi-city path.
const registryLiveIds = CITIES.filter((city) => city.status === "live").map((city) => city.id);
const expectedMulti = registryLiveIds.filter((id) => id !== "perth");
check(registryLiveIds.includes("perth"), "Perth must be live in the registry");

// (b) lib/cities/live-city-api.js — MULTI_CITY_IDS (imported directly). The one list this
// move deliberately kept — it's the server-side authorization gate, not a client copy.
sameSet(MULTI_CITY_IDS, expectedMulti, "live-city-api MULTI_CITY_IDS vs registry live cities");

// (a) /api/cities' manifest — built the same way api/cities.js/dev-server.js build it.
const manifest = buildCityManifest();
sameSet(
  manifest.cities.map((city) => city.id),
  registryLiveIds,
  "city manifest (api/cities.js) vs registry live cities"
);

// (c) No hardcoded city-id list left in public/*.js outside the accessor module itself.
const RETIRED_LIST_NAMES = [
  "MULTI_CITY_IDS",
  "LIVE_CITY_IDS",
  "NEARBY_MULTI_CITY_IDS",
  "PERSISTED_CITY_IDS",
  "PERSISTED_COUNTRY_IDS",
  "CITY_BOUNDS",
  "const COUNTRIES",
];
const ACCESSOR_MODULE = "city-manifest.js";
const publicDir = join(ROOT, "public");
const publicJsFiles = readdirSync(publicDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
  .map((entry) => entry.name);
check(publicJsFiles.length > 0, "public/*.js: could not list files (pattern drift — update this gate)");

for (const entry of publicJsFiles) {
  if (entry === ACCESSOR_MODULE) {
    continue;
  }
  const src = readFileSync(join(publicDir, entry), "utf8");
  for (const name of RETIRED_LIST_NAMES) {
    check(
      !src.includes(name),
      `public/${entry} still references "${name}" — the client must read this from window.CityManifest instead (docs/jim-brief-registry-driven-client.md)`
    );
  }
}

// (d) public/city-manifest.seed.json equals what scripts/write-city-manifest.mjs would
// produce right now — a flip that forgot to regenerate it ships a stale seed instead of
// failing loudly.
const seedPath = join(ROOT, "public", "city-manifest.seed.json");
try {
  const seedOnDisk = JSON.parse(readFileSync(seedPath, "utf8"));
  check(
    JSON.stringify(seedOnDisk) === JSON.stringify(manifest),
    "public/city-manifest.seed.json is stale — run `node scripts/write-city-manifest.mjs` and commit the result"
  );
} catch (error) {
  check(false, `public/city-manifest.seed.json: could not read/parse (${error.message})`);
}

if (failures > 0) {
  console.error(`live-city-lists-sync: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `live-city-lists-sync: ok (${registryLiveIds.length} live cities consistent across registry, live-city-api, and the /api/cities manifest; no hardcoded city-id list left in public/*.js)`
);
