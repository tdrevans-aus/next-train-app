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
import { fetchStationBoard, ROTTERDAM_GTFS_RT_TRIP_UPDATES_URL } from "../lib/providers/rotterdam.js";
import { gtfsFixtureBlobUrl } from "../lib/providers/gtfs/blob-fixtures.js";
import { zipFixtureGtfs, encodeTripUpdates, stubFetch } from "./lib/nl-realtime-stub.mjs";
import {
  OVAPI_TRIPUPDATES_CACHE_TTL_MS,
  _resetOvapiTripUpdatesCacheForTests,
} from "../lib/providers/gtfs/ovapi-tripupdates-cache.js";

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

// OVapi GTFS-RT re-enable (docs/jim-brief-nl-realtime-reenable.md): prove the
// live join against the trimmed fixture — a delay moves a board row, a
// cancellation removes one, and an RT fetch failure degrades to static.
{
  const staticZip = zipFixtureGtfs("rotterdam");
  const staticUrl = gtfsFixtureBlobUrl("rotterdam");
  const delayedTripId = "381818212"; // RET Metro A, Beurs stop 3989213, scheduled 10:04 on 2026-09-27
  const cancelledTripId = "381818213"; // same service_id, scheduled 11:19
  const scheduledEpochSec = 1790496240; // 2026-09-27T10:04:00+02:00
  const now = new Date("2026-09-27T08:30:00+02:00");

  _resetOvapiTripUpdatesCacheForTests();
  let restore = stubFetch({
    staticUrl,
    staticZip,
    rtUrl: ROTTERDAM_GTFS_RT_TRIP_UPDATES_URL,
    rtBuffer: encodeTripUpdates([
      { tripId: delayedTripId, stopId: "3989213", delaySec: 300, scheduledEpochSec },
      { tripId: cancelledTripId, cancelled: true },
    ]),
  });
  let board;
  try {
    board = await fetchStationBoard("Beurs", { now });
  } finally {
    restore();
  }
  const delayed = board.trips.find((trip) => trip.tripId === delayedTripId);
  assert(delayed, "delayed trip must still appear on the board");
  assert(delayed.status === "5 min late", `delay must move the board row (got ${delayed?.status})`);
  assert(delayed.displayTime === "10:09", `delayed displayTime must shift (got ${delayed?.displayTime})`);
  assert(
    !board.trips.some((trip) => trip.tripId === cancelledTripId),
    "a CANCELED TripUpdate must remove the trip from the board"
  );
  assert(board.realtime === "live", `delayed board must report realtime="live" (got ${board.realtime})`);

  _resetOvapiTripUpdatesCacheForTests();
  restore = stubFetch({
    staticUrl,
    staticZip,
    rtUrl: ROTTERDAM_GTFS_RT_TRIP_UPDATES_URL,
    rtBuffer: null,
    rtFails: true,
  });
  let fallbackBoard;
  try {
    fallbackBoard = await fetchStationBoard("Beurs", { now });
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
  assert(
    fallbackBoard.realtime === "timetable",
    `a total RT miss must report realtime="timetable" (got ${fallbackBoard.realtime})`
  );

  // Shared cache: coalescing, TTL refetch, and stale-on-error (docs/jim-brief-nl-realtime-cache.md).
  _resetOvapiTripUpdatesCacheForTests();
  let rtFetchCount = 0;
  restore = stubFetch({
    staticUrl,
    staticZip,
    rtUrl: ROTTERDAM_GTFS_RT_TRIP_UPDATES_URL,
    rtBuffer: encodeTripUpdates([
      { tripId: delayedTripId, stopId: "3989213", delaySec: 300, scheduledEpochSec },
    ]),
    onRtFetch: () => {
      rtFetchCount += 1;
    },
  });
  try {
    // 1. Two concurrent board calls produce one upstream fetch.
    await Promise.all([fetchStationBoard("Beurs", { now }), fetchStationBoard("Beurs", { now })]);
    assert(rtFetchCount === 1, `expected 1 upstream fetch for concurrent calls, got ${rtFetchCount}`);

    // Still within TTL: no refetch.
    await fetchStationBoard("Beurs", { now });
    assert(rtFetchCount === 1, `expected cached hit within TTL, got ${rtFetchCount} fetches`);

    // 2. A call after the TTL produces a second upstream fetch.
    await new Promise((resolve) => setTimeout(resolve, OVAPI_TRIPUPDATES_CACHE_TTL_MS + 500));
    await fetchStationBoard("Beurs", { now });
    assert(rtFetchCount === 2, `expected a second upstream fetch after TTL, got ${rtFetchCount}`);
  } finally {
    restore();
  }

  // 3. A rejected refresh with a <60s entry serves the stale copy (still "live").
  _resetOvapiTripUpdatesCacheForTests();
  restore = stubFetch({
    staticUrl,
    staticZip,
    rtUrl: ROTTERDAM_GTFS_RT_TRIP_UPDATES_URL,
    rtBuffer: encodeTripUpdates([
      { tripId: delayedTripId, stopId: "3989213", delaySec: 300, scheduledEpochSec },
    ]),
  });
  try {
    const primed = await fetchStationBoard("Beurs", { now });
    assert(primed.realtime === "live", "priming fetch must be live");
  } finally {
    restore();
  }
  await new Promise((resolve) => setTimeout(resolve, OVAPI_TRIPUPDATES_CACHE_TTL_MS + 500));
  restore = stubFetch({
    staticUrl,
    staticZip,
    rtUrl: ROTTERDAM_GTFS_RT_TRIP_UPDATES_URL,
    rtBuffer: null,
    rtFails: true,
  });
  let staleBoard;
  try {
    staleBoard = await fetchStationBoard("Beurs", { now });
  } finally {
    restore();
  }
  assert(
    staleBoard.trips.some((trip) => trip.tripId === delayedTripId && trip.status === "5 min late"),
    "a rejected refresh with a <60s entry must still apply the stale delay"
  );
  assert(
    staleBoard.realtime === "live",
    `a stale-but-usable serve must still report realtime="live" (got ${staleBoard.realtime})`
  );
}

console.log("rotterdam-dogfood-gate: ok (live, picker city, not amsterdam, RET A–E, Beurs hub, OVapi RT join verified)");
