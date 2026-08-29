/**
 * Bundled city direction chips exist for every live multi-city region.
 * Usage: node qa/bundled-city-directions.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { MULTI_CITY_IDS } from "../lib/cities/live-city-api.js";
import { marketingLabelsForStation, HUB as AMS_HUB } from "../lib/cities/amsterdam/marketing-directions.js";
import { marketingLabelsForStation as rotterdamLabels, HUB as RET_HUB } from "../lib/cities/rotterdam/marketing-directions.js";
import { marketingLabelsForStation as newcastleLabels, HUB as NLR_HUB } from "../lib/cities/newcastle/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function loadDirections(city) {
  const file = join(ROOT, "public", "city-directions", `${city}.json`);
  assert(existsSync(file), `missing public/city-directions/${city}.json`);
  return JSON.parse(readFileSync(file, "utf8"));
}

for (const city of MULTI_CITY_IDS) {
  const pack = loadDirections(city);
  const names = Object.keys(pack);
  assert(names.length > 0, `${city} bundled directions must include at least one station`);
  const first = pack[names[0]];
  assert(Array.isArray(first) && first.length > 0, `${city} ${names[0]} must have chips`);
}

const amsterdam = loadDirections("amsterdam");
const amsHub = marketingLabelsForStation(AMS_HUB);
assert(Array.isArray(amsterdam[AMS_HUB]), "Amsterdam hub must be in bundled directions");
assert(
  amsHub.every((chip) => amsterdam[AMS_HUB].includes(chip)),
  "Amsterdam bundled hub chips must match marketingLabelsForStation"
);

const rotterdam = loadDirections("rotterdam");
const retHub = rotterdamLabels(RET_HUB);
assert(Array.isArray(rotterdam[RET_HUB]), "Rotterdam hub Beurs must be in bundled directions");
assert(
  retHub.every((chip) => rotterdam[RET_HUB].includes(chip)),
  "Rotterdam bundled hub chips must match marketingLabelsForStation"
);
assert(rotterdam[RET_HUB].includes("Metro A + Binnenhof"), "Beurs must offer Metro A + Binnenhof");

const newcastle = loadDirections("newcastle");
const nlrHub = newcastleLabels(NLR_HUB);
assert(
  nlrHub.every((chip) => newcastle[NLR_HUB].includes(chip)),
  "Newcastle bundled hub chips must match marketingLabelsForStation"
);

console.log(`bundled-city-directions: ok (${MULTI_CITY_IDS.length} cities)`);
