/**
 * Wellington stays planned. D1 pack present. Perth/Auckland live-gates untouched.
 * Usage: node qa/wellington-planned-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const D1_FILES = [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
  "qa-note.md",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(assertCityLive("perth")?.ok === true, "Perth must stay live");
assert(assertCityLive("auckland")?.ok === true, "Auckland testers-live gate must stay green");

const live = assertCityLive("wellington");
assert(live?.ok === false, "assertCityLive(wellington) must fail");
assert(live?.status === 501, "wellington must be 501 planned");

const entry = getCity("wellington");
assert(entry?.status === "planned", "wellington registry status must be planned");
assert(entry?.adapterReady === true, "wellington adapterReady must be true");
assert((entry.envKeys ?? []).includes("METLINK_API_KEY"), "wellington needs METLINK_API_KEY");
assert(isMultiCity("wellington") === false, "wellington must not be in MULTI_CITY_IDS");

const d1Dir = join(ROOT, "docs/wellington-d1");
for (const name of D1_FILES) {
  assert(existsSync(join(d1Dir, name)), `docs/wellington-d1/${name} is required`);
}

const d1Json = readFileSync(join(d1Dir, "published-network.json"), "utf8");
const fixturePath = join(ROOT, "qa/fixtures/wellington/published-network.json");
assert(existsSync(fixturePath), "D2 fixture must exist");
assert(d1Json === readFileSync(fixturePath, "utf8"), "fixture must be verbatim D1 copy");

const network = JSON.parse(d1Json);
assert(network.uniqueStationCount === 47, "D1 unique station count must be 47");
assert(
  network.printedInnerCityNames?.lock === "Wellington Station",
  "hub lock must be Wellington Station"
);
const mel = network.lines.find((line) => line.number === "MEL");
assert(mel?.termini?.includes("Western Hutt Station"), "MEL live terminus is Western Hutt");
assert(!mel?.stations?.includes("Melling Station"), "closed Melling Station must not be on MEL array");

const catalog = JSON.parse(readFileSync(join(ROOT, "lib/cities/wellington/stations.json"), "utf8"));
const catalogNames = new Set((catalog.stations ?? []).map((s) => s.name));
assert(catalogNames.size === 47, "catalog must have 47 stations");
for (const name of network.uniqueStations ?? []) {
  assert(catalogNames.has(name), `catalog missing D1 station ${name}`);
}

const adapterSrc = readFileSync(join(ROOT, "lib/providers/wellington.js"), "utf8");
assert(adapterSrc.includes("METLINK_API_KEY") || adapterSrc.includes("metlinkAuthHeaders"), "adapter uses Metlink auth");
assert(adapterSrc.includes("WELLINGTON_GTFS_STATIC_URL"), "adapter pins static URL");

console.log("wellington-planned-gate: ok (planned/501, D1 pack, 47 stations, MEL→Western Hutt, Auckland green)");
