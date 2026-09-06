/**
 * Auckland/Wellington outage (6 Sep 2026): AT and Metlink now content-negotiate and answer
 * `Accept: application/x-google-protobuf, application/x-protobuf, application/octet-stream`
 * with JSON (AT wraps it in `{status, response}`; Metlink returns a plain feed), which broke
 * `FeedMessage.decode()`. This asserts:
 *   1. The outgoing Accept header is exactly `application/x-protobuf`.
 *   2. The decoder yields the same header/entity shape whether fed a real protobuf buffer,
 *      a plain JSON feed (Metlink-style), or an AT-style `{status, response}`-wrapped JSON feed.
 *
 * Usage: node qa/gtfs-realtime-accept.mjs
 */
import GtfsRealtimeBindings from "../lib/vendor/gtfs-realtime.mjs";
import { decodeFeedMessage, fetchTripUpdates } from "../lib/providers/gtfs/realtime.js";

const { FeedMessage } = GtfsRealtimeBindings.transit_realtime;

const failures = [];

function check(label, condition) {
  if (!condition) {
    failures.push(label);
  }
}

// --- Fixture: a minimal but representative TripUpdate feed. ---
const feedObject = {
  header: { gtfsRealtimeVersion: "2.0", timestamp: 1700000000 },
  entity: [
    {
      id: "trip-1",
      tripUpdate: {
        trip: { tripId: "T1", scheduleRelationship: 0 },
        stopTimeUpdate: [
          {
            stopId: "S1",
            arrival: { time: 1700000100, delay: 30 },
            departure: { time: 1700000160, delay: 30 },
          },
        ],
      },
    },
  ],
};

function shapeOf(feed) {
  const entity = feed.entity?.[0];
  const stu = entity?.tripUpdate?.stopTimeUpdate?.[0];
  return {
    version: feed.header?.gtfsRealtimeVersion,
    entityCount: feed.entity?.length,
    tripId: entity?.tripUpdate?.trip?.tripId,
    stopId: stu?.stopId,
    arrivalTime: Number(stu?.arrival?.time),
    departureDelay: Number(stu?.departure?.delay),
  };
}

const expectedShape = {
  version: "2.0",
  entityCount: 1,
  tripId: "T1",
  stopId: "S1",
  arrivalTime: 1700000100,
  departureDelay: 30,
};

function assertShape(label, feed) {
  const shape = shapeOf(feed);
  check(
    `${label}: shape matches (got ${JSON.stringify(shape)})`,
    JSON.stringify(shape) === JSON.stringify(expectedShape),
  );
}

// (a) real protobuf FeedMessage buffer
const protoBuffer = FeedMessage.encode(FeedMessage.fromObject(feedObject)).finish();
const decodedFromProto = decodeFeedMessage(protoBuffer.buffer.slice(protoBuffer.byteOffset, protoBuffer.byteOffset + protoBuffer.byteLength), "application/x-protobuf");
assertShape("protobuf buffer", decodedFromProto);

// (b) plain JSON feed, like Metlink's (no wrapper)
const plainJsonBuffer = new TextEncoder().encode(JSON.stringify(feedObject)).buffer;
const decodedFromPlainJson = decodeFeedMessage(plainJsonBuffer, "application/json");
assertShape("plain JSON (Metlink-style)", decodedFromPlainJson);

// (c) AT-style wrapped JSON feed: {"status":"OK","response":{...feed...}}
const wrappedJsonBuffer = new TextEncoder().encode(
  JSON.stringify({ status: "OK", response: feedObject }),
).buffer;
const decodedFromWrappedJson = decodeFeedMessage(wrappedJsonBuffer, "application/json");
assertShape("AT-wrapped JSON", decodedFromWrappedJson);

// (d) JSON body with no/octet-stream content-type but a `{` first byte still gets sniffed as JSON.
const sniffedJsonBuffer = new TextEncoder().encode(JSON.stringify(feedObject)).buffer;
const decodedFromSniffedJson = decodeFeedMessage(sniffedJsonBuffer, "application/octet-stream");
assertShape("content-sniffed JSON (no json content-type)", decodedFromSniffedJson);

// --- Outgoing Accept header assertion (mocked fetch) ---
const originalFetch = globalThis.fetch;
let capturedHeaders = null;
globalThis.fetch = async (url, init) => {
  capturedHeaders = init?.headers ?? {};
  return {
    ok: true,
    status: 200,
    headers: { get: (name) => (name.toLowerCase() === "content-type" ? "application/x-protobuf" : null) },
    arrayBuffer: async () => protoBuffer.buffer.slice(protoBuffer.byteOffset, protoBuffer.byteOffset + protoBuffer.byteLength),
  };
};
try {
  await fetchTripUpdates("https://example.invalid/tripupdates");
} finally {
  globalThis.fetch = originalFetch;
}
check(
  `outgoing Accept header is exactly "application/x-protobuf" (got ${JSON.stringify(capturedHeaders?.Accept)})`,
  capturedHeaders?.Accept === "application/x-protobuf",
);

if (failures.length > 0) {
  console.error("gtfs-realtime-accept: FAIL");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log("gtfs-realtime-accept: ok (protobuf, plain JSON, AT-wrapped JSON, content-sniffed JSON, Accept header)");
