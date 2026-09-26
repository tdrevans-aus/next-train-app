/**
 * Brisbane is live on Vercel; BART stays planned (anchor moved off melbourne, flipped live
 * 22 Sep 2026 — see docs/jim-brief-melbourne-flip-unblock.md); /api/dev/board stays 404.
 */
import { assertCityLive } from "../lib/providers/registry.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import { BRISBANE_TIME_ZONE } from "../lib/providers/brisbane.js";
import { loadLocalGtfsSnapshotForStaleCheck } from "./lib/local-gtfs-snapshot.mjs";
import { assertSnapshotNotStaleTodayOrSkip } from "./lib/assert-not-stale.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const live = assertCityLive("brisbane");
assert(live && live.ok === true, "assertCityLive(brisbane) must pass");

const bart = assertCityLive("bart");
assert(bart && bart.ok === false, "BART must stay planned");

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

// Local fixture, not the live Translink feed — see qa/lib/local-gtfs-snapshot.mjs
// and docs/jim-brief-blob-transfer-reduction.md (item 1).
await assertSnapshotNotStaleTodayOrSkip("brisbane", () =>
  loadLocalGtfsSnapshotForStaleCheck("brisbane", BRISBANE_TIME_ZONE)
);

console.log("brisbane-dogfood-gate: ok (live, Vercel board 404, probes off by default, snapshot not stale today)");
