/**
 * Sydney on Vercel joins live TfNSW GTFS-RT against the trimmed blob snapshot
 * (docs/jim-brief-sydney-live-on-vercel.md, Tim 22 Nov 2026).
 *
 * Network-free: globalThis.fetch is stubbed (before any lib import) to serve
 *   - the blob snapshot URL: a tiny synthetic GTFS zip with two trips at a real Central stop,
 *   - the three TfNSW TripUpdates URLs: JSON FeedMessages (decodeFeedMessage accepts JSON).
 * VERCEL=1 so loadSydneyBoard takes the production branch.
 *
 * Proves:
 *  1. matched trip -> realtime:true with the live (RT) departure time;
 *  2. unmatched trip -> realtime:false (timetable row, "Scheduled");
 *  3. one feed failing (metro, nswtrains) degrades only its rows - the board still serves;
 *  4. all three feeds failing -> FeedUnavailableError (-> 503), never a timetable board labelled live;
 *     the failure is remembered for the backoff (no per-request hammering) and a 429's Retry-After is honoured;
 *  5. concurrent callers / directions share one RT fetch per feed per ~15 s.
 * Against master's boardFromFixture path (empty RT index, no realtime marker) 1, 2 and 4 go red.
 */
const nowMs = Date.now();
const SNAPSHOT_URL_PART = "/gtfs/sydney.zip";
const RT_URLS = {
  sydneytrains: "https://api.transport.nsw.gov.au/v2/gtfs/realtime/sydneytrains",
  metro: "https://api.transport.nsw.gov.au/v2/gtfs/realtime/metro",
  nswtrains: "https://api.transport.nsw.gov.au/v1/gtfs/realtime/nswtrains",
};

process.env.VERCEL = "1";
process.env.TFNSW_API_KEY = "test-key";

const fetchLog = [];
/** @type {Record<string, () => Response>} */
let rtBehaviour = {};
let zipBytes = null;

globalThis.fetch = async (input) => {
  const url = String(typeof input === "string" ? input : input?.url ?? input);
  fetchLog.push(url);
  if (url.includes(SNAPSHOT_URL_PART)) {
    return new Response(zipBytes, { status: 200, headers: { "content-type": "application/zip" } });
  }
  const name = Object.keys(RT_URLS).find((key) => RT_URLS[key] === url);
  if (name && rtBehaviour[name]) {
    return rtBehaviour[name]();
  }
  throw new Error(`unexpected network call in sydney-vercel-realtime: ${url}`);
};

const { zipSync, strToU8 } = await import("../lib/vendor/fflate.mjs");
const sydney = await import("../lib/providers/sydney.js");
const { getSydneyDogfoodNextTrain } = await import("../lib/cities/sydney/dogfood-next-train.js");
const { FeedUnavailableError } = await import("../lib/providers/gtfs/errors.js");
const { clearGtfsStaticCaches } = await import("../lib/providers/gtfs/static-cache.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// ---- synthetic snapshot ---------------------------------------------------
const central = sydney.listCatalogStations().find((s) => s.name === "Central");
const stopId = central.stopIds[0];
const sydneyMinutes = (() => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: sydney.SYDNEY_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(nowMs));
  return Number(parts.find((p) => p.type === "hour").value) % 24 * 60 + Number(parts.find((p) => p.type === "minute").value);
})();
const hhmmss = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
const MATCHED_SCHED_MIN = sydneyMinutes + 12;
const UNMATCHED_SCHED_MIN = sydneyMinutes + 25;
const LIVE_DELAY_SEC = 180;

const csv = (rows) => strToU8(rows.map((r) => r.join(",")).join("\n") + "\n");
zipBytes = zipSync({
  "stops.txt": csv([["stop_id", "stop_name", "stop_lat", "stop_lon", "platform_code"], [stopId, "Central Station", "-33.88", "151.2", "16"]]),
  "routes.txt": csv([["route_id", "route_short_name", "route_long_name", "route_type"], ["T1", "T1", "North Shore", "2"]]),
  "trips.txt": csv([
    ["trip_id", "route_id", "service_id", "trip_headsign"],
    ["TRIP-MATCHED", "T1", "ALL", "Berowra"],
    ["TRIP-UNMATCHED", "T1", "ALL", "Berowra"],
  ]),
  "stop_times.txt": csv([
    ["trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence"],
    ["TRIP-MATCHED", hhmmss(MATCHED_SCHED_MIN), hhmmss(MATCHED_SCHED_MIN), stopId, "1"],
    ["TRIP-UNMATCHED", hhmmss(UNMATCHED_SCHED_MIN), hhmmss(UNMATCHED_SCHED_MIN), stopId, "1"],
  ]),
  "calendar.txt": csv([
    ["service_id", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "start_date", "end_date"],
    ["ALL", "1", "1", "1", "1", "1", "1", "1", "20200101", "20991231"],
  ]),
});

function scheduledDate(minutes) {
  // minutes since Sydney midnight today -> instant; derive from "now" rather than re-parsing the zone.
  const nowSydneyMin = sydneyMinutes;
  const base = new Date(nowMs);
  base.setUTCSeconds(0, 0);
  return new Date(base.getTime() + (minutes - nowSydneyMin) * 60_000);
}

function feedBody(entities) {
  return new Response(JSON.stringify({ header: { gtfsRealtimeVersion: "2.0" }, entity: entities }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
const liveEntity = {
  id: "1",
  tripUpdate: {
    trip: { tripId: "TRIP-MATCHED" },
    stopTimeUpdate: [{ stopId, departure: { delay: LIVE_DELAY_SEC } }],
  },
};
const fail = (status, headers = {}) => () => new Response("nope", { status, headers });

// The dogfood module reuses one board per station for 15 s (keyed on the `now` it is handed), so each
// scenario advances its own clock past that window to force a fresh board.
let scenario = 0;
const callArgs = (destination = "T1 Berowra") => ({
  station: "Central",
  destination,
  destinationLabel: destination,
  leaveBeforeMinutes: 0,
  refreshSeconds: 30,
  now: new Date(nowMs + scenario * 20_000),
});

async function fresh(behaviour) {
  scenario += 1;
  sydney.resetSydneyRealtimeCache();
  clearGtfsStaticCaches();
  rtBehaviour = behaviour;
  fetchLog.length = 0;
}
const rtFetches = () => fetchLog.filter((u) => u.includes("gtfs/realtime")).length;

async function allTrips(destination = "T1 Berowra", skipTrains = 0) {
  return getSydneyDogfoodNextTrain({ ...callArgs(destination), skipTrains });
}

// ---- 1 + 2: matched vs unmatched -----------------------------------------
await fresh({
  sydneytrains: () => feedBody([liveEntity]),
  metro: () => feedBody([]),
  nswtrains: () => feedBody([]),
});
const first = await allTrips("T1 Berowra", 0);
const second = await allTrips("T1 Berowra", 1);
const matched = first.next;
const unmatched = second.next;
assert(matched && unmatched, `expected two upcoming trips, got ${JSON.stringify({ first, second })}`);
assert(matched.realtime === true, `matched trip must carry realtime:true, got ${matched.realtime}`);
assert(
  matched.timingOffsetMinutes === LIVE_DELAY_SEC / 60 && matched.displayTime !== matched.scheduledDisplayTime,
  `matched trip must show the live (+3 min) time, got ${JSON.stringify(matched)}`
);
assert(unmatched.realtime === false, `unmatched trip must carry realtime:false, got ${unmatched.realtime}`);
assert(/scheduled/i.test(String(unmatched.status)), `unmatched trip must read Scheduled, got ${unmatched.status}`);

// ---- 5: coalescing (the two calls above are two "directions" of one board) -
assert(rtFetches() === 3, `two directions must share one RT fetch per feed (3 total), saw ${rtFetches()}`);
await Promise.all(Array.from({ length: 10 }, () => allTrips()));
assert(rtFetches() === 3, `ten concurrent directions must still share the same RT fetch, saw ${rtFetches()}`);

// ---- 3: one feed failing degrades only that feed --------------------------
await fresh({
  sydneytrains: () => feedBody([liveEntity]),
  metro: fail(503),
  nswtrains: fail(500),
});
const degraded = await allTrips("T1 Berowra", 0);
assert(degraded.next?.realtime === true, "sydneytrains rows must stay live when only metro/nswtrains fail");

// ---- 4: all feeds failing -> refuse, never a timetable board labelled live -
await fresh({ sydneytrains: fail(503), metro: fail(503), nswtrains: fail(503) });
let refused = null;
try {
  await allTrips();
} catch (error) {
  refused = error;
}
assert(refused instanceof FeedUnavailableError, `all feeds failing must throw FeedUnavailableError, got ${refused?.name ?? "a response"}`);
const afterFirstFailure = rtFetches();
let again = null;
try {
  await allTrips();
} catch (error) {
  again = error;
}
assert(again instanceof FeedUnavailableError, "repeat call inside the backoff must still refuse");
assert(rtFetches() === afterFirstFailure, "a failed RT fetch must be remembered for the backoff, not replayed per request");

// 429 + Retry-After is honoured (longer than the default failure backoff).
await fresh({
  sydneytrains: fail(429, { "retry-after": "120" }),
  metro: fail(429),
  nswtrains: fail(429),
});
let limited = null;
try {
  await sydney.loadSydneyRealtime({ now: nowMs });
} catch (error) {
  limited = error;
}
assert(limited instanceof FeedUnavailableError && limited.status === 429, "429 must surface as FeedUnavailableError status 429");
assert(limited.retryAfterMs >= 120_000, `Retry-After 120 s must be honoured, got ${limited.retryAfterMs}`);
const before429 = rtFetches();
await sydney.loadSydneyRealtime({ now: nowMs + 60_000 }).catch(() => {});
assert(rtFetches() === before429, "no refetch within Retry-After");
rtBehaviour = { sydneytrains: () => feedBody([liveEntity]), metro: () => feedBody([]), nswtrains: () => feedBody([]) };
await sydney.loadSydneyRealtime({ now: nowMs + 121_000 });
assert(rtFetches() > before429, "refetch is allowed once Retry-After has passed");

console.log("sydney-vercel-realtime: OK (matched=live, unmatched=scheduled, partial degrade, all-fail refuses, 429 honoured, one RT fetch per feed)");
