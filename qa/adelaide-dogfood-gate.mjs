/**
 * Adelaide is live on Vercel; hub locked to Adelaide Railway Station; public GTFS needs no key.
 */
import { assertCityLive } from "../lib/providers/registry.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import { marketingLabelsForStation } from "../lib/cities/adelaide/marketing-directions.js";
import { readAdelaideMetroApiKey } from "../lib/providers/gtfs/auth.js";
import { loadAdelaideStatic } from "../lib/providers/adelaide.js";
import { assertSnapshotNotStaleTodayOrSkip } from "./lib/assert-not-stale.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const live = assertCityLive("adelaide");
assert(live && live.ok === true, "assertCityLive(adelaide) must pass");

const perth = assertCityLive("perth");
assert(perth && perth.ok === true, "Perth live-gate must stay green");
const sydney = assertCityLive("sydney");
assert(sydney && sydney.ok === true, "Sydney live-gate must pass");
const brisbane = assertCityLive("brisbane");
assert(brisbane && brisbane.ok === true, "Brisbane live-gate must pass");
const melbourne = assertCityLive("melbourne");
assert(melbourne && melbourne.ok === false, "Melbourne must stay planned");

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

await vercelBoard(
  { method: "GET", query: { city: "adelaide", station: "Adelaide Railway Station" } },
  res
);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

const hub = marketingLabelsForStation("Adelaide Railway Station");
assert(hub.includes("Belair line Belair"), "Hub must offer Belair line Belair");
assert(hub.includes("Port Dock line Port Dock"), "Port Dock is a seventh printed line");
assert(!hub.some((label) => /tonsley/i.test(label)), "Tonsley is not a line chip");
assert(hub.length === 7, `Hub must have 7 chips, got ${hub.length}: ${hub.join("; ")}`);

assert(
  typeof readAdelaideMetroApiKey() === "string",
  "H2: missing key must be an empty string, not a throw"
);

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

await assertSnapshotNotStaleTodayOrSkip("adelaide", loadAdelaideStatic);

console.log(
  "adelaide-dogfood-gate: ok (live, Vercel board 404, seven hub chips, Melbourne stays planned, snapshot not stale today)"
);
