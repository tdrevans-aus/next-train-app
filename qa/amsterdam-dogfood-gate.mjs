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
import { fetchStationBoard, AMSTERDAM_GTFS_RT_TRIP_UPDATES_URL } from "../lib/providers/amsterdam.js";
import { gtfsFixtureBlobUrl } from "../lib/providers/gtfs/blob-fixtures.js";
import { zipFixtureGtfs, encodeTripUpdates, stubFetch } from "./lib/nl-realtime-stub.mjs";

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

// OVapi GTFS-RT re-enable (docs/jim-brief-nl-realtime-reenable.md): prove the
// live join against the trimmed fixture — a delay moves a board row, a
// cancellation removes one, and an RT fetch failure degrades to static.
{
  const staticZip = zipFixtureGtfs("amsterdam");
  const staticUrl = gtfsFixtureBlobUrl("amsterdam");
  const delayedTripId = "380797656"; // GVB Metro 52, Centraal Station stop 3979722, scheduled 05:24:30 on 2026-09-04
  const cancelledTripId = "380797657"; // same service_id, scheduled 05:34:30
  const scheduledEpochSec = 1788492270; // 2026-09-04T05:24:30+02:00
  const now = new Date("2026-09-04T05:00:00+02:00");

  let restore = stubFetch({
    staticUrl,
    staticZip,
    rtUrl: AMSTERDAM_GTFS_RT_TRIP_UPDATES_URL,
    rtBuffer: encodeTripUpdates([
      { tripId: delayedTripId, stopId: "3979722", delaySec: 240, scheduledEpochSec },
      { tripId: cancelledTripId, cancelled: true },
    ]),
  });
  let board;
  try {
    board = await fetchStationBoard("Centraal Station", { now });
  } finally {
    restore();
  }
  const delayed = board.trips.find((trip) => trip.tripId === delayedTripId);
  assert(delayed, "delayed trip must still appear on the board");
  assert(delayed.status === "4 min late", `delay must move the board row (got ${delayed?.status})`);
  assert(delayed.displayTime === "05:28", `delayed displayTime must shift (got ${delayed?.displayTime})`);
  assert(
    !board.trips.some((trip) => trip.tripId === cancelledTripId),
    "a CANCELED TripUpdate must remove the trip from the board"
  );

  restore = stubFetch({
    staticUrl,
    staticZip,
    rtUrl: AMSTERDAM_GTFS_RT_TRIP_UPDATES_URL,
    rtBuffer: null,
    rtFails: true,
  });
  let fallbackBoard;
  try {
    fallbackBoard = await fetchStationBoard("Centraal Station", { now });
  } finally {
    restore();
  }
  const fallback = fallbackBoard.trips.find((trip) => trip.tripId === delayedTripId);
  assert(fallback, "a failed RT fetch must still degrade to the static board");
  assert(fallback.status === "On Time", "a failed RT fetch must not carry over a stale delay");
  assert(
    fallback.liveDeparture === fallback.scheduledDeparture,
    "a failed RT fetch must report the static scheduled time, not a stale live one"
  );
}

console.log("amsterdam-dogfood-gate: ok (live, picker city, no city=nl, Vercel board 404, Wellington planned, OVapi RT join verified)");
