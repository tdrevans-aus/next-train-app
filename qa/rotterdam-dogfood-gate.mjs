/**
 * Rotterdam is live for testers; hub Beurs; RET A–E only; not city=nl / the-hague.
 */
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import { marketingLabelsForStation, HUB } from "../lib/cities/rotterdam/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const live = assertCityLive("rotterdam");
assert(live && live.ok === true, "assertCityLive(rotterdam) must pass");
assert(getCity("rotterdam")?.status === "live", "rotterdam registry must be live");
assert(isMultiCity("rotterdam") === true, "rotterdam must be in MULTI_CITY_IDS");
assert(getCity("rotterdam")?.id !== "amsterdam", "rotterdam is not Amsterdam");
assert(!getCity("nl"), "city=nl must not exist");
assert(!getCity("the-hague"), "the-hague must not exist");
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("sydney")?.ok === true, "Sydney stays live");
assert(assertCityLive("brisbane")?.ok === true, "Brisbane stays live");
assert(assertCityLive("adelaide")?.ok === true, "Adelaide stays live");
assert(assertCityLive("amsterdam")?.ok === true, "Amsterdam stays live");
assert(assertCityLive("melbourne")?.ok === false, "Melbourne stays planned");
assert(
  existsSync(join(ROOT, "qa/fixtures/rotterdam/published-network.json")),
  "D2: copy docs/rotterdam-d1/published-network.json into qa/fixtures/rotterdam/"
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

await vercelBoard({ method: "GET", query: { city: "rotterdam", station: HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

const hub = marketingLabelsForStation(HUB);
assert(HUB === "Beurs", "Hub lock is Beurs");
assert(hub.includes("Metro A + Binnenhof"), "Hub must offer Metro A + Binnenhof");
assert(hub.includes("Metro A + Schiedam Centrum"), "Hub must offer Metro A + Schiedam Centrum");
assert(hub.includes("Metro B + Hoek van Holland Strand"), "Hub must offer Metro B + Hoek van Holland Strand");
assert(hub.includes("Metro E + Den Haag Centraal"), "Hub must offer Metro E + Den Haag Centraal");
assert(!hub.some((label) => /nesselande/i.test(label) && /metro a/i.test(label)), "A does not go to Nesselande");
assert(!hub.some((label) => /m50|m51|m52|m53|m54|gvb|inbound|outbound/i.test(label)), "No GVB / inbound-outbound chips");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log("rotterdam-dogfood-gate: ok (live, picker city, not amsterdam, RET A–E, Beurs hub)");
