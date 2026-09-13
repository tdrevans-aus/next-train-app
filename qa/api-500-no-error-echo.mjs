/**
 * D-10 (docs/dwayne-security-review-play-3.0.0.md): api/next-train.js, api/directions.js and
 * api/destinations.js used to send `error.message` straight to the client on a 500. Redaction
 * (lib/providers/gtfs/redact-url.js) covers the known keyed-URL case, but a future adapter
 * regression could throw something unredacted. All three now route failures through the shared
 * `sendGenericServerError` (lib/api-error-response.js), which sends a fixed message and logs the
 * real error server-side instead.
 *
 * This gate has three parts:
 *   1. Integration — stub global.fetch to reject with an Error containing a marker
 *      (SECRET-URL-abc123), call the real api/next-train.js handler for a live multi-city
 *      station whose next-train path genuinely hits the network (sydney/Central), and assert
 *      the JSON body sent to the client does not contain the marker while the real error still
 *      reaches console.error (server-side log) tagged with city/station.
 *   2. Unit — call sendGenericServerError directly with a marker-bearing Error and assert the
 *      response body never contains it (this is the exact function all three endpoints call).
 *   3. Static wiring — source-scan api/next-train.js, api/directions.js and api/destinations.js
 *      and fail if any of them still builds a JSON error body from `error.message` (the
 *      pre-fix shape), or if any no longer imports sendGenericServerError. This catches a
 *      regression in directions.js/destinations.js's multi-city and fallback branches, which
 *      resolve through static direction data for the cities/stations this gate can cheaply
 *      reach and so never actually take the 500 branch in an integration test.
 *
 * To see this gate fail: revert any of the three `sendGenericServerError(...)` call sites back
 * to `res.status(500).json({ error: error.message ?? "..." })`.
 *
 * Usage: node qa/api-500-no-error-echo.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nextTrain from "../api/next-train.js";
import { sendGenericServerError } from "../lib/api-error-response.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const MARKER = "SECRET-URL-abc123";

const failures = [];

function mockRes() {
  return {
    statusCode: 0,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {},
  };
}

async function testIntegration() {
  const originalFetch = global.fetch;
  const originalConsoleError = console.error;
  let loggedRaw = "";
  console.error = (...args) => {
    loggedRaw += args.map((a) => (a instanceof Error ? a.stack || a.message : String(a))).join(" ");
  };
  global.fetch = async () => {
    throw new Error(`upstream failed: https://example.invalid/x?key=${MARKER}`);
  };
  try {
    const res = mockRes();
    await nextTrain(
      { method: "GET", query: { city: "sydney", station: "Central", direction: "Bondi Junction" }, headers: {} },
      res
    );
    const bodyText = JSON.stringify(res.body);
    if (res.statusCode !== 500) {
      failures.push(`integration: expected next-train handler to 500 on a stubbed fetch failure, got ${res.statusCode}`);
    }
    if (bodyText.includes(MARKER)) {
      failures.push(`integration: 500 body leaked the marker: ${bodyText}`);
    }
    if (!loggedRaw.includes(MARKER)) {
      failures.push("integration: the real error (with marker) was not logged server-side via console.error");
    }
    if (!loggedRaw.includes("city=sydney") || !loggedRaw.includes("station=Central")) {
      failures.push(`integration: server-side log missing city/station tag: ${loggedRaw.slice(0, 200)}`);
    }
  } finally {
    global.fetch = originalFetch;
    console.error = originalConsoleError;
  }
}

function testUnit() {
  const res = mockRes();
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    sendGenericServerError(res, {
      error: new Error(`boom https://example.invalid/x?key=${MARKER}`),
      fallbackMessage: "Failed to do the thing",
      city: "testcity",
      station: "Teststation",
    });
  } finally {
    console.error = originalConsoleError;
  }
  if (res.statusCode !== 500) {
    failures.push(`unit: sendGenericServerError must set status 500, got ${res.statusCode}`);
  }
  const bodyText = JSON.stringify(res.body);
  if (bodyText.includes(MARKER)) {
    failures.push(`unit: sendGenericServerError leaked the marker into the response body: ${bodyText}`);
  }
  if (res.body?.error !== "Failed to do the thing") {
    failures.push(`unit: sendGenericServerError did not send the fallbackMessage verbatim: ${bodyText}`);
  }
}

const ENDPOINT_FILES = ["api/next-train.js", "api/directions.js", "api/destinations.js"];

function testStaticWiring() {
  for (const rel of ENDPOINT_FILES) {
    const source = fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
    if (!/from ["']\.\.\/lib\/api-error-response\.js["']/.test(source)) {
      failures.push(`static: ${rel} no longer imports sendGenericServerError`);
    }
    if (!/sendGenericServerError\(/.test(source)) {
      failures.push(`static: ${rel} never calls sendGenericServerError`);
    }
    // The pre-fix shape: an error JSON body built directly from error.message.
    if (/\{\s*error:\s*error\.message/.test(source)) {
      failures.push(`static: ${rel} still builds a response body from error.message directly`);
    }
  }
}

async function main() {
  await testIntegration();
  testUnit();
  testStaticWiring();

  if (failures.length > 0) {
    console.error("FAIL api-500-no-error-echo:");
    for (const f of failures) {
      console.error(`  - ${f}`);
    }
    process.exit(1);
  }

  console.log("PASS api-500-no-error-echo: 500 bodies never echo error.message; real errors are logged server-side with city/station");
}

main();
