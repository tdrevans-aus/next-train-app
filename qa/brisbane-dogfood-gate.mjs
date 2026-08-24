/**
 * Brisbane is live on Vercel; Melbourne stays planned; /api/dev/board stays 404.
 */
import { assertCityLive } from "../lib/providers/registry.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const live = assertCityLive("brisbane");
assert(live && live.ok === true, "assertCityLive(brisbane) must pass");

const melbourne = assertCityLive("melbourne");
assert(melbourne && melbourne.ok === false, "Melbourne must stay planned");

const perth = assertCityLive("perth");
assert(perth && perth.ok === true, "Perth live-gate must stay green");

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

await vercelBoard({ method: "GET", query: { city: "brisbane", station: "Central" } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log("brisbane-dogfood-gate: ok (live, Vercel board 404, probes off by default)");
