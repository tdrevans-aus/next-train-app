/**
 * Shared test helper for the Rotterdam/Amsterdam OVapi TripUpdates re-enable
 * (docs/jim-brief-nl-realtime-reenable.md). Builds an in-memory GTFS-RT
 * FeedMessage protobuf and stubs global.fetch so the two dogfood gates can
 * prove the live join (delay moves a row, cancellation removes one, a fetch
 * failure degrades to static) without any network access.
 */
import { zipSync } from "../../lib/vendor/fflate.mjs";
import GtfsRealtimeBindings from "../../lib/vendor/gtfs-realtime.mjs";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = join(new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), "");

export function zipFixtureGtfs(city) {
  const gtfsDir = join(ROOT, "qa/fixtures", city, "gtfs");
  const files = readdirSync(gtfsDir).filter((name) => name.endsWith(".txt"));
  const zipInput = {};
  for (const name of files) {
    zipInput[name] = readFileSync(join(gtfsDir, name));
  }
  return Buffer.from(zipSync(zipInput, { level: 0 }));
}

/**
 * @param {Array<{ tripId: string, stopId?: string, delaySec?: number, scheduledEpochSec?: number, cancelled?: boolean }>} updates
 */
export function encodeTripUpdates(updates) {
  const { transit_realtime: rt } = GtfsRealtimeBindings;
  const entities = updates.map((update, index) => {
    const tripUpdate = {
      trip: {
        tripId: update.tripId,
        scheduleRelationship: update.cancelled ? 3 : 0,
      },
    };
    if (update.delaySec != null && update.stopId) {
      // Mirror the real OVapi feed, which always carries an absolute time
      // alongside delay (protobufjs defaults an unset int64 `time` to 0,
      // which board.js would otherwise treat as a real epoch-0 arrival).
      const liveTime = Number(update.scheduledEpochSec ?? 0) + Number(update.delaySec);
      tripUpdate.stopTimeUpdate = [
        {
          stopId: update.stopId,
          arrival: { delay: update.delaySec, time: liveTime },
          departure: { delay: update.delaySec, time: liveTime },
        },
      ];
    }
    return rt.FeedEntity.create({ id: String(index + 1), tripUpdate });
  });
  const message = rt.FeedMessage.create({
    header: { gtfsRealtimeVersion: "2.0", incrementality: 0, timestamp: Math.floor(Date.now() / 1000) },
    entity: entities,
  });
  return Buffer.from(rt.FeedMessage.encode(message).finish());
}

/**
 * Installs a global.fetch stub that answers the static GTFS zip URL and the
 * RT TripUpdates URL from in-memory buffers, and returns a restore function.
 * @param {{ staticUrl: string, staticZip: Buffer, rtUrl: string, rtBuffer: Buffer | null, rtFails?: boolean }} options
 */
export function stubFetch({ staticUrl, staticZip, rtUrl, rtBuffer, rtFails = false, onRtFetch }) {
  const original = global.fetch;
  global.fetch = async (url, options = {}) => {
    const href = String(url);
    if (href === staticUrl) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        arrayBuffer: async () => staticZip.buffer.slice(staticZip.byteOffset, staticZip.byteOffset + staticZip.byteLength),
      };
    }
    if (href === rtUrl) {
      onRtFetch?.();
      if (rtFails) {
        throw new Error("simulated OVapi RT fetch failure");
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        arrayBuffer: async () => rtBuffer.buffer.slice(rtBuffer.byteOffset, rtBuffer.byteOffset + rtBuffer.byteLength),
      };
    }
    return original(url, options);
  };
  return () => {
    global.fetch = original;
  };
}
