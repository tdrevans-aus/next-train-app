/**
 * Offline — stale snapshot eviction (docs/jim-brief-scheduled-snapshot-refresh.md, item 3).
 *
 * A snapshot the board join judges stale must be dropped from the in-memory cache so the next
 * request re-fetches the Blob (otherwise a fresh republish is invisible for up to the 6h TTL),
 * but at most once per interval per URL so a genuinely stale upstream can't cause a refetch storm.
 *
 * Usage: node qa/gtfs-stale-eviction.mjs
 */
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import {
  loadGtfsStatic,
  clearGtfsStaticCaches,
  evictStaleGtfsSnapshot,
} from "../lib/providers/gtfs/static-cache.js";
import { checkSnapshotFreshness } from "../lib/providers/gtfs/board.js";
import { GtfsSnapshotStaleError } from "../lib/providers/gtfs/errors.js";

const URL_A = "https://example.test/gtfs/stale-eviction-city.zip";

function zipFor(endDate) {
  return zipSync({
    "stops.txt": strToU8("stop_id,stop_name\ns1,Alpha\n"),
    "routes.txt": strToU8("route_id,route_short_name,route_type\nr1,L1,2\n"),
    "trips.txt": strToU8("trip_id,route_id,service_id\nt1,r1,wk\n"),
    "stop_times.txt": strToU8("trip_id,stop_id,arrival_time,departure_time,stop_sequence\nt1,s1,10:00:00,10:00:00,1\n"),
    "calendar.txt": strToU8(
      `service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nwk,1,1,1,1,1,1,1,20200101,${endDate}\n`
    ),
  });
}

let fetchCount = 0;
let currentZip = zipFor("20200102"); // long expired
globalThis.fetch = async () => {
  fetchCount += 1;
  return new Response(currentZip, { status: 200, headers: { "content-type": "application/zip" } });
};

clearGtfsStaticCaches();

// 1. cached: second load does not refetch.
const first = await loadGtfsStatic({ url: URL_A, timeZone: "UTC" });
await loadGtfsStatic({ url: URL_A, timeZone: "UTC" });
assert.equal(fetchCount, 1, "second load within TTL must be served from cache");
assert.equal(first.sourceUrl, URL_A);

// 2. stale snapshot -> checkSnapshotFreshness throws AND evicts.
assert.throws(
  () => checkSnapshotFreshness({ cityId: "evict-test", staticData: first, realtimeIndex: { byTripId: new Map() }, now: new Date(), timeZone: "UTC" }),
  GtfsSnapshotStaleError
);
currentZip = zipFor("20991231"); // "republished"
const second = await loadGtfsStatic({ url: URL_A, timeZone: "UTC" });
assert.equal(fetchCount, 2, "stale verdict must evict so the next load re-fetches the Blob");
assert.equal(second.calendar[0].end_date, "20991231", "re-fetch must pick up the republished snapshot");

// 3. bounded: a second eviction inside the interval is a no-op (no refetch storm).
assert.equal(evictStaleGtfsSnapshot(URL_A, { now: Date.now() }), false, "immediately after an eviction, evicting again is rate-limited");
await loadGtfsStatic({ url: URL_A, timeZone: "UTC" });
assert.equal(fetchCount, 2, "rate-limited eviction must not cause another fetch");

// 4. after the interval it can evict again; merged "a+b" source URLs are split.
assert.equal(evictStaleGtfsSnapshot(`${URL_A}+https://example.test/other.zip`, { now: Date.now() + 6 * 60 * 1000 }), true);
await loadGtfsStatic({ url: URL_A, timeZone: "UTC" });
assert.equal(fetchCount, 3);

// 5. unknown / empty source URLs are harmless.
assert.equal(evictStaleGtfsSnapshot(undefined), false);
assert.equal(evictStaleGtfsSnapshot("/some/dir"), false);

console.log("gtfs-stale-eviction: ok");
