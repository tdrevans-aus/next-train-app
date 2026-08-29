/**
 * Göteborg stays planned. Adapter ready. Perth live-gate untouched.
 * Usage: node qa/goteborg-planned-gate.mjs
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

const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

const live = assertCityLive("goteborg");
assert(live?.ok === false, "assertCityLive(goteborg) must fail");
assert(live?.status === 501, "goteborg must be 501 planned");

const entry = getCity("goteborg");
assert(entry?.status === "planned", "goteborg registry status must be planned");
assert(entry?.adapterReady === true, "goteborg adapterReady must be true");
assert(entry?.displayName === "Göteborg", "goteborg display name must be Göteborg");
assert(entry?.timeZone === "Europe/Stockholm", "goteborg timezone must be Europe/Stockholm");
assert(entry?.agency === "Västtrafik", "Göteborg agency is Västtrafik");
assert((entry.envKeys ?? []).includes("TRAFIKLAB_API_KEY"), "goteborg needs TRAFIKLAB_API_KEY");
assert(!entry.modes?.includes("metro"), "goteborg has no metro");
assert(entry.modes?.includes("tram") && entry.modes?.includes("train"), "goteborg modes v1 are tram + train");
assert(isMultiCity("goteborg") === false, "goteborg must not be in MULTI_CITY_IDS");

assert(!getCity("sweden"), "city=sweden must not exist");
assert(!getCity("gothenburg"), "city id is goteborg, not gothenburg");

const d1Dir = join(ROOT, "docs/goteborg-d1");
for (const name of D1_FILES) {
  assert(existsSync(join(d1Dir, name)), `docs/goteborg-d1/${name} is required`);
}

const d1Json = readFileSync(join(d1Dir, "published-network.json"), "utf8");
const fixturePath = join(ROOT, "qa/fixtures/goteborg/published-network.json");
assert(existsSync(fixturePath), "D2: qa/fixtures/goteborg/published-network.json must exist");
assert(
  d1Json === readFileSync(fixturePath, "utf8"),
  "qa/fixtures/goteborg/published-network.json must be a verbatim copy of docs/goteborg-d1"
);

assert(existsSync(join(ROOT, "lib/providers/goteborg.js")), "goteborg adapter must exist");
assert(
  existsSync(join(ROOT, "lib/providers/gtfs/realtime-board.js")),
  "shared realtime-board.js must exist"
);

const adapterSrc = readFileSync(join(ROOT, "lib/providers/goteborg.js"), "utf8");
assert(
  adapterSrc.includes("realtime-board.js"),
  "goteborg adapter must reuse realtime-board.js"
);

const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(!/LIVE_CITY_IDS = new Set\(\[[^\]]*goteborg/.test(appJs), "goteborg must not be in LIVE_CITY_IDS");

console.log(
  "goteborg-planned-gate: ok (planned/501, D1+adapterReady, Trafiklab key, schedule-only RT gap documented, Perth green)"
);
