/**
 * Darwin server-side cache gate (docs/uk-architecture.md, docs/uk-provider-design.md).
 *
 * Stubs global fetch with a counter — never hits Darwin. Verifies:
 *  1. Two concurrent calls for the same CRS produce one upstream fetch
 *     (in-flight coalescing).
 *  2. A call after the 20s TTL produces a second upstream fetch.
 *  3. A filtered and an unfiltered fetchStationBoard() call for the same CRS
 *     share one upstream fetch (operator filtering happens after the cache).
 *
 * Usage: node qa/uk-darwin-cache.mjs
 */
process.env.DARWIN_LDB_TOKEN = process.env.DARWIN_LDB_TOKEN || "test-token";

const { fetchDepartureBoard, fetchStationBoard, DARWIN_CACHE_TTL_MS } = await import(
  "../lib/providers/uk-darwin.js"
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

let fetchCount = 0;
const originalFetch = globalThis.fetch;

function fakeResponse(crs) {
  return {
    ok: true,
    text: async () =>
      JSON.stringify({
        locationName: crs,
        generatedAt: new Date().toISOString(),
        trainServices: [],
      }),
  };
}

globalThis.fetch = async (url) => {
  fetchCount += 1;
  const match = /GetDepartureBoard\/([^?]+)/.exec(String(url));
  return fakeResponse(match ? decodeURIComponent(match[1]) : "TEST");
};

try {
  // 1. In-flight coalescing.
  fetchCount = 0;
  const [a, b] = await Promise.all([
    fetchDepartureBoard({ crs: "KGX", numRows: 15 }),
    fetchDepartureBoard({ crs: "KGX", numRows: 15 }),
  ]);
  assert(fetchCount === 1, `expected 1 upstream fetch for concurrent calls, got ${fetchCount}`);
  assert(a.stationName === "KGX" && b.stationName === "KGX", "both callers should get the cached board");

  // Still within TTL: another call should not refetch.
  await fetchDepartureBoard({ crs: "KGX", numRows: 15 });
  assert(fetchCount === 1, `expected cached hit within TTL, got ${fetchCount} fetches`);

  // 2. After TTL, a new fetch happens.
  await new Promise((resolve) => setTimeout(resolve, DARWIN_CACHE_TTL_MS + 500));
  await fetchDepartureBoard({ crs: "KGX", numRows: 15 });
  assert(fetchCount === 2, `expected a second upstream fetch after TTL, got ${fetchCount}`);

  // 3. Filtered vs unfiltered fetchStationBoard() share one upstream fetch.
  fetchCount = 0;
  const entry = { crs: "TEST1", name: "Test Station", regionId: "test-region" };
  await Promise.all([
    fetchStationBoard("Test Station", { entry, excludeOperators: ["LNER"] }),
    fetchStationBoard("Test Station", { entry }),
  ]);
  assert(fetchCount === 1, `expected filtered+unfiltered callers to share one fetch, got ${fetchCount}`);

  console.log("[uk-darwin-cache] ok: coalescing, TTL refetch, and filtered/unfiltered sharing all pass");
} finally {
  globalThis.fetch = originalFetch;
}
