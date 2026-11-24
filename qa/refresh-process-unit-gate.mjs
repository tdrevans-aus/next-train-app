/**
 * Network-free (docs/jim-brief-qa-hardening-555-544.md). Drives processUnit() from
 * scripts/refresh-hand-published-gtfs.mjs for the real sydney unit with stubbed download, publish,
 * probe and read-back, proving the per-mode wiring that qa/sydney-mode-freshness.mjs cannot see:
 *  (a) a snapshot whose Metro calendar expired (Trains current, so the overall range looks fine) is
 *      refreshed even though the probe says upstream is unchanged - i.e. processUnit passes
 *      staleModes into decideRefresh;
 *  (b) if the read-back still shows a stale mode after the retries, the unit throws (job goes red),
 *      and the retry delay is the injected one.
 */
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import { processUnit, REFRESH_UNITS } from "../scripts/refresh-hand-published-gtfs.mjs";

process.env.TFNSW_API_KEY ||= "qa-stub-key";
const unit = REFRESH_UNITS.find((u) => u.id === "sydney");
const NOW = new Date("2026-11-24T02:00:00Z");

const cal = (rows) =>
  ["service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date", ...rows].join("\n");
const zipOf = (metroRow) =>
  Buffer.from(
    zipSync({
      "routes.txt": strToU8(["route_id,route_short_name,route_type", "T1,T1,2", "SMNW_M1,M1,401"].join("\n")),
      "trips.txt": strToU8(["route_id,service_id,trip_id", "T1,SVC_T,t1", "SMNW_M1,SVC_M,m1"].join("\n")),
      "calendar.txt": strToU8(cal(["SVC_T,1,1,1,1,1,1,1,20261118,20261223", metroRow])),
      "calendar_dates.txt": strToU8("service_id,date,exception_type"),
    })
  );
const staleZip = zipOf("SVC_M,1,1,1,1,1,1,1,20240915,20241226");
const freshZip = zipOf("SVC_M,1,1,1,1,1,1,1,20261118,20270517");
const okFetch = (bytes) => ({ ok: true, status: 200, bytes, lastModified: "Mon, 23 Nov 2026 00:00:00 GMT" });

function makeDeps(fetchQueue) {
  const calls = { commands: 0, manifests: [], sleeps: [], fetches: 0 };
  const deps = {
    readManifest: async () => ({ publishedAt: "2026-11-23T00:00:00.000Z", lastModified: "x" }),
    writeManifest: async (city) => void calls.manifests.push(city),
    fetchPublished: async () => {
      calls.fetches += 1;
      const next = fetchQueue.length > 1 ? fetchQueue.shift() : fetchQueue[0];
      return okFetch(next);
    },
    runCommands: () => void (calls.commands += 1),
    probeUpstreamSetChanged: async () => ({ changed: false, reason: "all upstream sources unchanged", lastModified: null, etag: null }),
    probeUpstreamChanged: async () => assert.fail("sydney uses the multi-source probe"),
    putImpl: async () => ({}),
    sleep: async (ms) => void calls.sleeps.push(ms),
    readBackRetryDelayMs: 7,
  };
  return { deps, calls };
}

// (a) stale Metro + unchanged probe -> still refreshed, then verified fresh.
{
  const { deps, calls } = makeDeps([staleZip, freshZip]);
  const line = await processUnit(unit, { now: NOW, force: false, dryRun: false }, deps);
  assert.equal(line.decision, "REFRESHED", `stale metro must refresh despite an unchanged probe: ${JSON.stringify(line)}`);
  assert.match(line.reason, /no service today for mode\(s\): metro/);
  assert.equal(calls.commands, 1, "publish commands must run");
  assert.deepEqual(calls.manifests, ["sydney"]);
}

// control: a fully fresh snapshot with an unchanged probe is NOT refreshed.
{
  const { deps, calls } = makeDeps([freshZip]);
  const line = await processUnit(unit, { now: NOW, force: false, dryRun: false }, deps);
  assert.equal(line.decision, "skip");
  assert.equal(calls.commands, 0);
}

// (b) read-back still stale after the retries -> the unit fails, with the injected delay.
{
  const { deps, calls } = makeDeps([staleZip]);
  await assert.rejects(
    processUnit(unit, { now: NOW, force: false, dryRun: false }, deps),
    /no service today .* for mode\(s\) metro/
  );
  assert.equal(calls.commands, 1);
  assert.ok(calls.sleeps.length >= 1 && calls.sleeps.every((ms) => ms === 7), `retries must use the injected delay: ${calls.sleeps}`);
  assert.deepEqual(calls.manifests, [], "no manifest may be written for a stale read-back");
}

console.log("refresh-process-unit-gate: PASS");
