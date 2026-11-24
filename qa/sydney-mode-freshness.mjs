/**
 * Network-free (docs/jim-brief-sydney-metro-stale-and-refresh-cadence.md). Sydney's published snapshot
 * merges sydneytrains + metro. On 21 Nov 2026 its Metro section was a 2024 feed with no service today,
 * hidden because the overall calendar range (driven by the Trains section) read 20240915..20261220.
 *
 *  1. A snapshot whose Metro calendar has expired but whose Trains calendar is current must FAIL the
 *     per-mode check (staleModes = ["metro"]); the overall range alone still looks fine.
 *  2. decideRefresh must refresh for a stale mode even when the probe says "unchanged".
 *  3. Cadence: the multi-source probe flips when ANY of the three upstream zips is republished, and
 *     treats a source with no Last-Modified as changed.
 *  4. The Metro static URL must be the v2 path (v1 serves the 2024 feed).
 */
import assert from "node:assert/strict";
import { checkModeFreshness } from "../lib/providers/gtfs/mode-freshness.js";
import { probeUpstreamSetChanged } from "../lib/providers/gtfs/snapshot-manifest.js";
import { decideRefresh, REFRESH_UNITS } from "../scripts/refresh-hand-published-gtfs.mjs";
import { tripMatchesMarketingChip } from "../lib/cities/sydney/marketing-directions.js";
import { SYDNEY_METRO_STATIC_URL, SYDNEY_TIME_ZONE } from "../lib/providers/sydney.js";

const NOW = new Date("2026-11-24T02:00:00Z"); // Tue 24 Nov 2026, 13:00 Sydney
const routesText = ["route_id,route_short_name,route_type", "T1,T1,2", "SMNW_M1,M1,401"].join("\n");
const tripsText = ["route_id,service_id,trip_id", "T1,SVC_T,t1", "SMNW_M1,SVC_M,m1"].join("\n");
const cal = (rows) =>
  ["service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date", ...rows].join("\n");

const trainsCurrent = "SVC_T,1,1,1,1,1,1,1,20261118,20261223";
const metroExpired = "SVC_M,1,1,1,1,1,1,1,20240915,20241226";
const metroCurrent = "SVC_M,1,1,1,1,1,1,1,20261118,20270517";
const opts = { now: NOW, timeZone: SYDNEY_TIME_ZONE };

// 1. expired Metro behind a current Trains calendar
const stale = checkModeFreshness(
  { routesText, tripsText, calendarText: cal([trainsCurrent, metroExpired]), calendarDatesText: "" },
  opts
);
assert.deepEqual(stale.staleModes, ["metro"], "expired Metro must be reported stale even though Trains is current");
assert.equal(stale.modes.trains.activeTrips, 1);
assert.equal(stale.modes.metro.activeTrips, 0);

const fresh = checkModeFreshness(
  { routesText, tripsText, calendarText: cal([trainsCurrent, metroCurrent]), calendarDatesText: "" },
  opts
);
assert.deepEqual(fresh.staleModes, [], "both modes current -> nothing stale");

// an exception removing today's only service marks the mode stale
const removed = checkModeFreshness(
  {
    routesText,
    tripsText,
    calendarText: cal([trainsCurrent, metroCurrent]),
    calendarDatesText: "service_id,date,exception_type\nSVC_M,20261124,2",
  },
  opts
);
assert.deepEqual(removed.staleModes, ["metro"]);

// 2. a stale mode forces a refresh even if upstream is unchanged and the overall range looks healthy
const manifest = { lastModified: "x", publishedAt: NOW.toISOString() };
const unchanged = { changed: false, reason: "unchanged" };
const decision = decideRefresh({
  manifest,
  probe: unchanged,
  calendarMaxDate: "20261223",
  now: NOW,
  staleModes: stale.staleModes,
});
assert.equal(decision.refresh, true);
assert.match(decision.reason, /metro/);
assert.equal(decideRefresh({ manifest, probe: unchanged, calendarMaxDate: "20261223", now: NOW }).refresh, false);

// 3. cadence: probed (not weekly/probe-less) and flips on any source
const sydney = REFRESH_UNITS.find((u) => u.id === "sydney");
assert.equal(sydney.probeSources?.length, 3, "sydney must probe all three static sources daily");
assert.ok(sydney.modeFreshness, "sydney must run the per-mode freshness check");

const base = { sydneytrains: "A", metro: "B", nswtrains: "C" };
const fetchWith = (lm) => async (url) => {
  const name = Object.keys(lm).find((n) => url.includes(n));
  return { ok: true, headers: { get: (h) => (h === "last-modified" ? lm[name] : null) } };
};
const sources = Object.keys(base).map((name) => ({ name, url: `https://x/${name}` }));
const first = await probeUpstreamSetChanged({ sources, manifest: null, fetchImpl: fetchWith(base) });
assert.equal(first.changed, true);
const recorded = { lastModified: first.lastModified };
const same = await probeUpstreamSetChanged({ sources, manifest: recorded, fetchImpl: fetchWith(base) });
assert.equal(same.changed, false);
for (const name of Object.keys(base)) {
  const bumped = await probeUpstreamSetChanged({ sources, manifest: recorded, fetchImpl: fetchWith({ ...base, [name]: "Z" }) });
  assert.equal(bumped.changed, true, `republish of ${name} must trigger a refresh`);
}
const missingLm = await probeUpstreamSetChanged({ sources, manifest: recorded, fetchImpl: fetchWith({ ...base, metro: null }) });
assert.equal(missingLm.changed, true);

// 4. v2 metro endpoint
assert.match(SYDNEY_METRO_STATIC_URL, /\/v2\/gtfs\/schedule\/metro$/, "v1 metro static serves a 2024 feed");

// 5. the current v2 Metro feed heads southbound trips "Bankstown": they must land on the M1 Sydenham chip
//    (Tallawong's only southbound chip), and must not leak onto T6 Bankstown
assert.equal(tripMatchesMarketingChip({ destination: "Bankstown", routeShortName: "M1" }, "M1 Sydenham"), true);
assert.equal(tripMatchesMarketingChip({ destination: "Bankstown", routeShortName: "M1" }, "T6 Bankstown"), false);
assert.equal(tripMatchesMarketingChip({ destination: "Bankstown", routeShortName: "T6" }, "M1 Sydenham"), false);

console.log("sydney-mode-freshness: ok");
