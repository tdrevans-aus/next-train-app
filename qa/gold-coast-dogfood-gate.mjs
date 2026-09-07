/**
 * Gold Coast is live for testers; G:link only; not Brisbane; Perth green.
 */
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import { loadGoldCoastStatic } from "../lib/providers/gold-coast.js";
import { assertSnapshotNotStaleTodayOrSkip } from "./lib/assert-not-stale.mjs";
import { marketingLabelsForStation, HUB } from "../lib/cities/gold-coast/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const live = assertCityLive("gold-coast");
assert(live && live.ok === true, "assertCityLive(gold-coast) must pass");
assert(getCity("gold-coast")?.status === "live", "gold-coast registry must be live");
assert(isMultiCity("gold-coast") === true, "gold-coast must be in MULTI_CITY_IDS");
assert(getCity("gold-coast")?.id !== "brisbane", "gold-coast is not Brisbane");
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("brisbane")?.ok === true, "Brisbane stays its own live city");
assert(
  existsSync(join(ROOT, "qa/fixtures/gold-coast/published-network.json")),
  "D2: copy docs/gold-coast-d1/published-network.json into qa/fixtures/gold-coast/"
);

const previous = process.env.ALLOW_CITY_PROBES;
delete process.env.ALLOW_CITY_PROBES;
assert(isCityProbeAllowed() === false, "CI/default must not allow city probes");
process.env.ALLOW_CITY_PROBES = "1";
assert(isCityProbeAllowed() === true, "ALLOW_CITY_PROBES=1 enables local express probes only");

const res = {
  statusCode: 0,
  body: null,
  setHeader() {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
  end() {},
};

await vercelBoard({ method: "GET", query: { city: "gold-coast", station: HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

const hub = marketingLabelsForStation(HUB);
assert(HUB === "Helensvale", "Hub lock is Helensvale");
assert(hub.includes("L1 Burleigh Heads"), "Hub must offer L1 Burleigh Heads");
assert(hub.length === 1, "Helensvale has one opposite terminus");
assert(!hub.some((label) => /varsity|beenleigh|bus |ferry|inbound|outbound/i.test(label)), "No SEQ train/bus chips");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

await assertSnapshotNotStaleTodayOrSkip("gold-coast", loadGoldCoastStatic);

console.log("gold-coast-dogfood-gate: ok (live, picker city, not Brisbane, G:link only, snapshot not stale today)");
