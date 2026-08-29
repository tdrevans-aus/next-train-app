/**
 * Auckland is live for testers; hub Waitematā Station; TRAIN only; Wellington also live.
 */
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import { marketingLabelsForStation, HUB } from "../lib/cities/auckland/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const live = assertCityLive("auckland");
assert(live && live.ok === true, "assertCityLive(auckland) must pass");
assert(getCity("auckland")?.status === "live", "auckland registry must be live");
assert(isMultiCity("auckland") === true, "auckland must be in MULTI_CITY_IDS");
assert(!getCity("nz"), "city=nz must not exist");
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("wellington")?.ok === true, "Wellington is tester-live (flipped by Tim)");
assert(assertCityLive("melbourne")?.ok === false, "Melbourne stays planned");
assert(
  existsSync(join(ROOT, "qa/fixtures/auckland/published-network.json")),
  "D1 published-network.json must be in qa/fixtures/auckland/"
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

await vercelBoard({ method: "GET", query: { city: "auckland", station: HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

const hub = marketingLabelsForStation(HUB);
assert(hub.includes("Eastern Line Manukau"), "Hub must offer Eastern Line Manukau");
assert(hub.includes("Southern Line Pukekohe"), "Hub must offer Southern Line Pukekohe");
assert(hub.includes("Western Line Swanson"), "Hub must offer Western Line Swanson");
assert(!hub.some((label) => /onehunga|britomart|inbound|outbound|airport|huia/i.test(label)), "No ONE/CRL/bus chips at Waitematā");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log("auckland-dogfood-gate: ok (live, picker city, TRAIN only, Waitematā hub, Wellington also live, Melbourne planned)");
