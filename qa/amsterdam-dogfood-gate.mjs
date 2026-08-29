/**
 * Amsterdam is live for testers; hub Centraal Station; no city=nl; Perth green.
 */
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import { marketingLabelsForStation, HUB } from "../lib/cities/amsterdam/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const live = assertCityLive("amsterdam");
assert(live && live.ok === true, "assertCityLive(amsterdam) must pass");
assert(getCity("amsterdam")?.status === "live", "amsterdam registry must be live");
assert(isMultiCity("amsterdam") === true, "amsterdam must be in MULTI_CITY_IDS");
assert(!getCity("nl"), "city=nl must not exist");
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("auckland")?.ok === true, "Auckland is tester-live");
assert(assertCityLive("wellington")?.ok === true, "Wellington is tester-live");
assert(assertCityLive("stockholm")?.ok === true, "Stockholm is tester-live");
assert(
  !existsSync(join(ROOT, "qa/fixtures/amsterdam/published-network.json")),
  "Do not generate published-network.json from GTFS; Luke D1 can follow"
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

await vercelBoard({ method: "GET", query: { city: "amsterdam", station: HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

const hub = marketingLabelsForStation(HUB);
assert(hub.includes("M51 + Isolatorweg"), "Hub must offer M51 + Isolatorweg");
assert(hub.includes("M52 + Noord"), "Hub must offer M52 + Noord");
assert(hub.includes("M54 + Gein"), "Hub must offer M54 + Gein");
assert(!hub.some((label) => /m50/i.test(label)), "M50 does not serve Centraal Station");
assert(!hub.some((label) => /schiphol|amsterdam centraal/i.test(label)), "No Schiphol / NS Amsterdam Centraal chips");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log("amsterdam-dogfood-gate: ok (live, picker city, no city=nl, Vercel board 404, Wellington planned)");
