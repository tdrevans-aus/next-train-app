/**
 * docs/jim-brief-missing-city-perth-default-and-gm-flake.md, item 1 (tim-review).
 *
 * `query.city ?? "perth"` made a request with no `city` for a non-Perth station get looked up as a
 * Perth station (Mark, #558 QA). Now: no city + a Perth catalog station keeps working (the web app,
 * Android and iOS all omit `city` for Perth); no city + any other station is a 400
 * {"error":"Missing city","code":"CITY_REQUIRED"}. Network-free: the CITY_REQUIRED branches return
 * before any provider call, and the Perth cases only assert "not CITY_REQUIRED" on a fixture request.
 *
 * Usage: node qa/missing-city-default-gate.mjs
 */
import nextTrain from "../api/next-train.js";
import directions from "../api/directions.js";
import destinations from "../api/destinations.js";
import board from "../api/board.js";
import { PERTH_CLUSTER_STATIONS } from "../lib/train-times.js";

const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

function call(handler, query, n) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ status: -1, body: "timeout" }), 8000);
    const done = (v) => { clearTimeout(timer); resolve(v); };
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      getHeader(k) { return this.headers[k]; },
      status(c) { this.statusCode = c; return this; },
      json(b) { done({ status: this.statusCode, body: b }); return this; },
      send(b) { done({ status: this.statusCode, body: b }); return this; },
      end() { done({ status: this.statusCode, body: null }); return this; },
      on() {},
    };
    const req = {
      method: "GET",
      query,
      headers: { "x-forwarded-for": `10.77.0.${n}` },
      socket: { remoteAddress: `10.77.0.${n}` },
    };
    Promise.resolve(handler(req, res)).catch((e) => done({ status: 500, body: { error: String(e) } }));
  });
}

const isRequired = (r) => r.status === 400 && r.body?.code === "CITY_REQUIRED" && r.body?.error === "Missing city";
const perth = PERTH_CLUSTER_STATIONS[0];
let n = 1;

for (const [name, handler, extra] of [
  ["next-train", nextTrain, { direction: "Stockholm" }],
  ["directions", directions, {}],
  ["destinations", destinations, {}],
  ["board", board, {}],
]) {
  const bad = await call(handler, { station: "Uppsala C", ...extra }, n++);
  check(isRequired(bad), `${name}: no city + non-Perth station must be 400 CITY_REQUIRED, got ${bad.status} ${JSON.stringify(bad.body)?.slice(0, 120)}`);

  const blank = await call(handler, { station: "Uppsala C", city: "  ", ...extra }, n++);
  check(isRequired(blank), `${name}: blank city + non-Perth station must be 400 CITY_REQUIRED, got ${blank.status}`);

  const perthExtra = name === "next-train" ? { direction: "Mandurah" } : extra;
  const ok = await call(handler, { station: perth, fixture: "normal", ...perthExtra }, n++);
  check(!isRequired(ok), `${name}: no city + Perth station must keep working, got CITY_REQUIRED`);

  const explicit = await call(handler, { station: "Uppsala C", city: "nowhere", ...extra }, n++);
  check(!isRequired(explicit), `${name}: an explicit (even unknown) city must not be CITY_REQUIRED (the live-city gate answers)`);
}

if (failures.length) {
  console.error("missing-city-default-gate FAILED:\n - " + failures.join("\n - "));
  process.exit(1);
}
console.log("missing-city-default-gate PASS");
