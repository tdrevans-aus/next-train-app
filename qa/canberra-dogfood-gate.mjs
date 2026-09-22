/**
 * Canberra is live for testers; hub Alinga Street; light rail only; Perth green; BART planned
 * (anchor moved off melbourne, flipped live 22 Sep 2026 — see
 * docs/jim-brief-melbourne-flip-unblock.md).
 */
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import { CANBERRA_TIME_ZONE } from "../lib/providers/canberra.js";
import { loadLocalGtfsSnapshotForStaleCheck } from "./lib/local-gtfs-snapshot.mjs";
import { assertSnapshotNotStaleTodayOrSkip } from "./lib/assert-not-stale.mjs";
import { marketingLabelsForStation, HUB } from "../lib/cities/canberra/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const live = assertCityLive("canberra");
assert(live && live.ok === true, "assertCityLive(canberra) must pass");
assert(getCity("canberra")?.status === "live", "canberra registry must be live");
assert(isMultiCity("canberra") === true, "canberra must be in MULTI_CITY_IDS");
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("bart")?.ok === false, "BART stays planned");
assert(
  existsSync(join(ROOT, "qa/fixtures/canberra/published-network.json")),
  "D2: copy docs/canberra-d1/published-network.json into qa/fixtures/canberra/"
);
assert(!(getCity("canberra")?.envKeys ?? []).length, "Do not invent MyWay+ credentials");

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

await vercelBoard({ method: "GET", query: { city: "canberra", station: HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

const hub = marketingLabelsForStation(HUB);
assert(hub.includes("R1 Gungahlin Place"), "Hub must offer R1 Gungahlin Place");
assert(hub.length === 1, "Alinga Street has one opposite terminus");
assert(!hub.some((label) => /bus|woden|edinburgh|city south|commonwealth|inbound|outbound/i.test(label)), "No bus or Stage 2A chips");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

// Local fixture, not the live Blob store — see qa/lib/local-gtfs-snapshot.mjs
// and docs/jim-brief-blob-transfer-reduction.md (item 1).
await assertSnapshotNotStaleTodayOrSkip("canberra", () =>
  loadLocalGtfsSnapshotForStaleCheck("canberra", CANBERRA_TIME_ZONE)
);

console.log("canberra-dogfood-gate: ok (live, picker city, light rail only, D1 oracle copied, no MyWay+ key, BART planned, snapshot not stale today)");
