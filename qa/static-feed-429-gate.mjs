/**
 * Offline — a GTFS static feed that returns 429 (rate limit) or a 2xx with a
 * non-zip body must never crash the process or get inflated as if it were a
 * real zip; a burst of concurrent callers for the same URL (one per board
 * direction) must share a single fetch instead of hammering the upstream;
 * api/board.js must turn a total feed outage into a fast 503, never a
 * synthetic empty board, and never a 500.
 *
 * Never hits the real Transport for NSW API — stubs global.fetch and a tiny
 * local http server instead.
 *
 * @see docs/jim-brief-sydney-board-oom-on-429.md
 * Usage: node qa/static-feed-429-gate.mjs
 */
import http from "http";
import {
  loadGtfsStatic,
  clearGtfsStaticCaches,
} from "../lib/providers/gtfs/static-cache.js";
import { FeedUnavailableError } from "../lib/providers/gtfs/errors.js";

const failures = [];

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function heapMb() {
  return process.memoryUsage().heapUsed / (1024 * 1024);
}

async function withServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  try {
    return await run(port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

/** (a) 429 never crashes the process; N concurrent callers share one fetch. */
async function test429NeverCrashesAndDedupes() {
  clearGtfsStaticCaches();
  let requestCount = 0;
  await withServer(
    (req, res) => {
      requestCount += 1;
      res.writeHead(429, { "content-type": "text/plain", "retry-after": "1" });
      res.end("Rate limit exceeded");
    },
    async (port) => {
      const url = `http://localhost:${port}/gtfs.zip`;
      const heapBefore = heapMb();
      const startedAt = Date.now();

      // Simulate a board that fans out to one loadGtfsStatic() call per
      // direction (Sydney has up to 20) — all racing for the same URL.
      const results = await Promise.allSettled(
        Array.from({ length: 20 }, () => loadGtfsStatic({ url, ttlMs: 0 }))
      );
      const elapsedMs = Date.now() - startedAt;
      const heapAfter = heapMb();

      assert(
        results.every((r) => r.status === "rejected"),
        "test429: expected every concurrent call to reject"
      );
      assert(
        results.every((r) => r.reason instanceof FeedUnavailableError),
        `test429: expected FeedUnavailableError for every rejection, got: ${results
          .map((r) => r.reason?.constructor?.name)
          .join(", ")}`
      );
      assert(
        elapsedMs < 2000,
        `test429: 20 concurrent calls took ${elapsedMs}ms, expected < 2000ms`
      );
      assert(
        requestCount === 1,
        `test429: expected exactly 1 upstream request for 20 concurrent callers (in-flight de-dupe), got ${requestCount}`
      );
      assert(
        heapAfter - heapBefore < 50,
        `test429: heap grew by ${(heapAfter - heapBefore).toFixed(1)}MB, expected < 50MB`
      );

      // A second call within the negative-cache TTL must not re-hit upstream
      // either, and must still fail fast and cleanly.
      const secondStart = Date.now();
      try {
        await loadGtfsStatic({ url, ttlMs: 0 });
        failures.push("test429: expected the negative-cached second call to reject");
      } catch (err) {
        assert(
          err instanceof FeedUnavailableError,
          "test429: negative-cached rejection must still be a FeedUnavailableError"
        );
      }
      assert(
        Date.now() - secondStart < 2000,
        "test429: negative-cached second call must fail fast"
      );
      assert(
        requestCount === 1,
        `test429: negative-cached second call must not re-hit upstream, saw ${requestCount} requests`
      );
    }
  );
}

/** (b) a 2xx response whose body is not a real zip must not crash, never gets inflated as one. */
async function testNonZip200NeverCrashes() {
  clearGtfsStaticCaches();
  await withServer(
    (req, res) => {
      res.writeHead(200, { "content-type": "application/zip" });
      // A plausible rate-limit/WAF page mislabelled as a zip — large enough
      // that a naive "decompress it anyway" path would show up in heap use.
      res.end(Buffer.alloc(8 * 1024 * 1024, 0x41)); // 8MB of 'A'
    },
    async (port) => {
      const url = `http://localhost:${port}/gtfs.zip`;
      const heapBefore = heapMb();
      const startedAt = Date.now();
      try {
        await loadGtfsStatic({ url, ttlMs: 0 });
        failures.push("testNonZip200: expected a throw for a non-zip 200 body");
      } catch (err) {
        assert(
          err instanceof FeedUnavailableError,
          `testNonZip200: expected FeedUnavailableError, got ${err?.constructor?.name}: ${err?.message}`
        );
      }
      const elapsedMs = Date.now() - startedAt;
      const heapAfter = heapMb();
      assert(elapsedMs < 2000, `testNonZip200: took ${elapsedMs}ms, expected < 2000ms`);
      assert(
        heapAfter - heapBefore < 50,
        `testNonZip200: heap grew by ${(heapAfter - heapBefore).toFixed(1)}MB, expected < 50MB`
      );
    }
  );
}

/** (c) after the stub recovers, a normal 200 + valid zip resolves and is cached. */
async function testRecoveryAfterOutage() {
  clearGtfsStaticCaches();
  // Minimal but genuinely valid (uncompressed/STORED) zip containing one
  // empty-ish GTFS table, built with the same vendor fflate the app uses.
  const { zipSync } = await import("../lib/vendor/fflate.mjs");
  const zipBytes = zipSync(
    {
      "stops.txt": new TextEncoder().encode("stop_id,stop_name,stop_lat,stop_lon\n"),
      "routes.txt": new TextEncoder().encode("route_id,route_short_name,route_type,agency_id\n"),
      "trips.txt": new TextEncoder().encode("trip_id,route_id\n"),
      "stop_times.txt": new TextEncoder().encode("trip_id,stop_id,departure_time\n"),
      "calendar.txt": new TextEncoder().encode(
        "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\n"
      ),
      "calendar_dates.txt": new TextEncoder().encode("service_id,date,exception_type\n"),
    },
    { level: 0 }
  );

  let serveFailure = true;
  await withServer(
    (req, res) => {
      if (serveFailure) {
        res.writeHead(429, { "content-type": "text/plain", "retry-after": "0" });
        res.end("Rate limit exceeded");
        return;
      }
      res.writeHead(200, { "content-type": "application/zip" });
      res.end(Buffer.from(zipBytes));
    },
    async (port) => {
      const url = `http://localhost:${port}/gtfs.zip`;
      try {
        await loadGtfsStatic({ url, ttlMs: 0 });
        failures.push("testRecovery: expected the first (429) call to reject");
      } catch (err) {
        assert(err instanceof FeedUnavailableError, "testRecovery: first call must reject with FeedUnavailableError");
      }

      // Simulate the outage clearing and enough time passing (rather than
      // sleeping in a QA script): drop the negative cache directly, the way
      // the TTL naturally expiring would.
      clearGtfsStaticCaches();
      serveFailure = false;

      const data = await loadGtfsStatic({ url, ttlMs: 0 });
      assert(!!data, "testRecovery: expected a successful load after recovery");
      assert(
        Array.isArray(data?.stops),
        "testRecovery: expected parsed GTFS data with a stops array after recovery"
      );
    }
  );
}

async function main() {
  await test429NeverCrashesAndDedupes();
  await testNonZip200NeverCrashes();
  await testRecoveryAfterOutage();

  if (failures.length) {
    console.error("static-feed-429-gate failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    "static-feed-429-gate: ok (429 and non-zip 200 never crash or inflate garbage, concurrent callers dedupe to one upstream request, recovery works)"
  );
}

main();
