/**
 * Network-free proof of the prod-sweep realtime check
 * (docs/jim-brief-prod-sweep-realtime-check.md, 22 Nov 2026).
 *
 * global.fetch is stubbed with canned /api/next-train bodies; nothing leaves the process.
 *  - live trip                                   -> ok
 *  - only `realtime:false` trips, live-expected  -> schedule-only (and a station/city rolls it up)
 *  - only `realtime:false` trips, allow-listed   -> ok
 *  - schedule-only counts toward ALERT_THRESHOLD and is skipped outside service hours
 *  - the live/scheduled split is carried on the result
 *
 * Usage: node qa/prod-sweep-realtime-gate.mjs
 */
import assert from "assert";

process.env.PROD_SWEEP_REQUEST_INTERVAL_MS = "1"; // pacing is irrelevant to a stubbed fetch
process.env.PROD_SWEEP_BASE = "http://stub.invalid";

const sweep = await import("./prod-sweep.mjs");
const { checkChip, checkStation, sweepCity, updateState, alertingCityIds, expectedLive, SCHEDULE_ONLY_CITIES, ALERT_THRESHOLD } =
  sweep;

const trip = (realtime, extra = {}) => ({ displayTime: "10:00", departure: "x" + Math.random(), line: "L", realtime, ...extra });
const body = (...trips) => ({ next: trips[0] ?? null, following: trips[1] ?? null, upcoming: trips });

let nextTrainBody = body();
const realFetch = global.fetch;
global.fetch = async (url) => {
  const u = String(url);
  const json = (obj) => ({ ok: true, status: 200, headers: new Headers(), text: async () => JSON.stringify(obj) });
  if (u.includes("/api/next-train")) return json(nextTrainBody);
  if (u.includes("/api/directions")) return json({ directions: ["A", "B"] });
  if (u.includes("/api/city-stations")) return json({ stations: [{ name: "Hub Stn" }] });
  return { ok: false, status: 404, headers: new Headers(), text: async () => "nf" };
};

const liveCity = { id: "perth", displayName: "Perth", timeZone: "Australia/Perth" };
const schedCity = { id: "copenhagen", displayName: "Copenhagen", timeZone: "Europe/Copenhagen" };
const perthNoon = new Date("2026-11-22T04:00:00Z");
const perthNight = new Date("2026-11-21T19:00:00Z"); // 03:00 Perth

try {
  assert.equal(expectedLive(liveCity).expected, true);
  assert.equal(expectedLive(schedCity).expected, false);
  assert.ok(SCHEDULE_ONLY_CITIES.copenhagen.length > 10, "allow-list entries carry a reason");

  // 1. live trip -> ok (realtime true and undefined both count as live)
  nextTrainBody = body(trip(true));
  let r = await checkChip(liveCity, "S", "A");
  assert.equal(r.outcome, "ok");
  assert.deepEqual([r.live, r.scheduled], [1, 0]);
  nextTrainBody = body(trip(undefined));
  assert.equal((await checkChip(liveCity, "S", "A")).outcome, "ok");

  // mixed: one live row among scheduled ones is still ok, split recorded
  nextTrainBody = body(trip(false), trip(true), trip(false));
  r = await checkChip(liveCity, "S", "A");
  assert.equal(r.outcome, "ok");
  assert.deepEqual([r.live, r.scheduled], [1, 2]);

  // 2. schedule-only trips for a live-expected city -> schedule-only
  nextTrainBody = body(trip(false), trip(false));
  r = await checkChip(liveCity, "S", "A");
  assert.equal(r.outcome, "schedule-only");
  assert.deepEqual([r.live, r.scheduled], [0, 2]);
  const st = await checkStation(liveCity, "S");
  assert.equal(st.outcome, "schedule-only");
  assert.deepEqual([st.live, st.scheduled], [0, 4]); // two chips x two rows

  // 3. same trips, allow-listed city -> ok
  r = await checkChip(schedCity, "S", "A");
  assert.equal(r.outcome, "ok");
  assert.match(r.detail, /allow-listed/);

  // empty stays empty
  nextTrainBody = { next: null };
  assert.equal((await checkChip(liveCity, "S", "A")).outcome, "empty");

  // 4. city rollup, hours rule, state + alerting
  nextTrainBody = body(trip(false));
  const inHours = await sweepCity({ ...liveCity, id: "perth" }, perthNoon);
  assert.equal(inHours.status, "schedule-only");
  assert.equal(inHours.live, 0);
  assert.ok(inHours.scheduled > 0);
  const offHours = await sweepCity(liveCity, perthNight);
  assert.equal(offHours.status, "skipped");
  assert.equal((await sweepCity(schedCity, new Date("2026-11-22T10:00:00Z"))).status, "ok");

  let state = { cities: {} };
  for (let i = 1; i <= ALERT_THRESHOLD; i += 1) {
    state = updateState(state, [inHours], perthNoon);
    assert.equal(state.cities.perth.consecutiveScheduleOnly, i);
    assert.equal(alertingCityIds([inHours], state).length, i >= ALERT_THRESHOLD ? 1 : 0);
  }
  // a live run resets the streak
  state = updateState(state, [{ id: "perth", status: "ok", detail: "" }], perthNoon);
  assert.equal(state.cities.perth.consecutiveScheduleOnly, 0);
  console.log("prod-sweep-realtime-gate: PASS");
} catch (error) {
  console.error(`prod-sweep-realtime-gate: FAIL - ${error.message}`);
  process.exitCode = 1;
} finally {
  global.fetch = realFetch;
}
