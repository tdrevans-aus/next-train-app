/**
 * Vancouver is live for testers; hub Waterfront; no city=canada; Perth green.
 */
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import { marketingLabelsForStation, HUB } from "../lib/cities/vancouver/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const live = assertCityLive("vancouver");
assert(live && live.ok === true, "assertCityLive(vancouver) must pass");
assert(getCity("vancouver")?.status === "live", "vancouver registry must be live");
assert(isMultiCity("vancouver") === true, "vancouver must be in MULTI_CITY_IDS");
assert(!getCity("canada"), "city=canada must not exist");
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("auckland")?.ok === true, "Auckland is tester-live");
assert(assertCityLive("wellington")?.ok === true, "Wellington is tester-live");
assert(assertCityLive("stockholm")?.ok === true, "Stockholm is tester-live");
assert(
  !existsSync(join(ROOT, "qa/fixtures/vancouver/published-network.json")),
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

await vercelBoard({ method: "GET", query: { city: "vancouver", station: HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

const hub = marketingLabelsForStation(HUB);
assert(hub.includes("Expo Line King George"), "Hub must offer Expo Line King George");
assert(
  hub.includes("Expo Line Production Way–University"),
  "Hub must offer Expo Line Production Way–University"
);
assert(hub.includes("Canada Line YVR–Airport"), "Hub must offer Canada Line YVR–Airport");
assert(hub.includes("Canada Line Richmond–Brighouse"), "Hub must offer Canada Line Richmond–Brighouse");
assert(!hub.some((label) => /millennium/i.test(label)), "Millennium does not serve Waterfront");
assert(!hub.some((label) => /inbound|outbound|seabus|west coast/i.test(label)), "No inbound/outbound or non-SkyTrain chips");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log("vancouver-dogfood-gate: ok (live, picker city, no city=canada, Vercel board 404, Wellington planned)");
