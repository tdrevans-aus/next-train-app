/**
 * Sydney is live on Vercel; Melbourne stays planned; /api/dev/board stays 404.
 */
import { assertCityLive } from "../lib/providers/registry.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import directionsHandler from "../api/directions.js";
import { getMultiCityDirections } from "../lib/cities/live-city-api.js";
import { marketingLabelsForStation } from "../lib/cities/sydney/marketing-directions.js";
import { loadSydneyStatic } from "../lib/providers/sydney.js";
import { assertSnapshotNotStaleTodayOrSkip } from "./lib/assert-not-stale.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const live = assertCityLive("sydney");
assert(live && live.ok === true, "assertCityLive(sydney) must pass");

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

await vercelBoard({ method: "GET", query: { city: "sydney", station: "Central" } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

const central = marketingLabelsForStation("Central");
assert(central.includes("T1 Emu Plains"), "Central must offer T1 Emu Plains");
assert(!central.some((label) => /city circle/i.test(label)), "City Circle is not a terminus chip");
assert(!central.some((label) => label.startsWith("M1 ")), "Central trains must not show Metro chips");

const metro = marketingLabelsForStation("Central Metro");
assert(metro.includes("M1 Tallawong") && metro.includes("M1 Sydenham"), "Central Metro is M1 only");
assert(!metro.some((label) => label.startsWith("T")), "Central Metro must not show Trains chips");

const banksia = marketingLabelsForStation("Banksia");
assert(banksia.includes("T4 Bondi Junction"), "Banksia must offer T4 Bondi Junction");
assert(
  banksia.includes("T4 Waterfall") && banksia.includes("T4 Cronulla"),
  "Banksia is T4 Illawarra"
);

const banksiaPack = await getMultiCityDirections("sydney", "Banksia");
assert(Array.isArray(banksiaPack.directions), "getMultiCityDirections must resolve to a directions array");
assert(
  banksiaPack.directions.includes("T4 Bondi Junction"),
  "Banksia directions pack includes T4 Bondi Junction"
);

const banksiaRes = {
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
await directionsHandler(
  { method: "GET", headers: {}, query: { city: "sydney", station: "Banksia" } },
  banksiaRes
);
assert(banksiaRes.statusCode === 200, `Banksia /api/directions must 200, got ${banksiaRes.statusCode}`);
assert(
  Array.isArray(banksiaRes.body?.directions) && banksiaRes.body.directions.includes("T4 Bondi Junction"),
  "Banksia /api/directions must return T4 chips, not an unresolved Promise"
);

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

await assertSnapshotNotStaleTodayOrSkip("sydney", loadSydneyStatic);

console.log("sydney-dogfood-gate: ok (live, Vercel board 404, City Circle not a terminus, disjoint chips, snapshot not stale today)");
