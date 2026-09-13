/**
 * Offline, no-network gate for the Canberra GTFS refresh region pin
 * (docs/jim-brief-canberra-refresh-region.md, 13 Sep 2026).
 *
 * Root cause: www.transport.act.gov.au sits behind Cloudflare, which serves
 * a managed JS challenge (403, `cf-mitigated: challenge`) to this project's
 * default US function region (iad1) but returns 200 from syd1. The fix is a
 * per-function region override in vercel.json's functions["api/health.js"]
 * block (api/health.js is where the cron-dispatched GTFS refresh lives -
 * see its header comment) - NOT a project-wide region move, which is a
 * separate, out-of-scope latency decision.
 *
 * Three static assertions, all read from source text / JSON on disk:
 *  1. vercel.json's functions["api/health.js"].regions is exactly ["syd1"] -
 *     confirms the pin is present and scoped to this one function.
 *  2. vercel.json has no top-level "regions" key - confirms the pin is
 *     per-function, not a project-wide move (out of scope per the brief).
 *  3. lib/gtfs-refresh.js's STANDALONE "canberra" entry's url host is
 *     www.transport.act.gov.au - if that ever changes (e.g. an ACT
 *     open-data mirror is found), the comment above the entry says the
 *     syd1 pin may no longer be needed; this check's failure is the signal
 *     to go re-read that comment rather than the pin silently going stale.
 *
 * Usage: node qa/vercel-health-region-gate.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import assert from "assert";
import { STANDALONE } from "../lib/gtfs-refresh.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function fail(message) {
  console.error(`vercel-health-region-gate: FAIL - ${message}`);
  process.exitCode = 1;
}

const vercelJsonPath = path.join(repoRoot, "vercel.json");
const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, "utf8"));

// --- Check 1: api/health.js is pinned to exactly ["syd1"] -----------------
const healthFn = vercelJson.functions?.["api/health.js"];
if (!healthFn) {
  fail('vercel.json has no functions["api/health.js"] entry at all');
} else {
  try {
    assert.deepStrictEqual(
      healthFn.regions,
      ["syd1"],
      `functions["api/health.js"].regions must be exactly ["syd1"], got ${JSON.stringify(healthFn.regions)}`
    );
  } catch (error) {
    fail(error.message);
  }
}

// --- Check 2: no project-wide region override -----------------------------
if (Object.prototype.hasOwnProperty.call(vercelJson, "regions")) {
  fail(
    `vercel.json has a top-level "regions" key (${JSON.stringify(vercelJson.regions)}) - the fix is a ` +
      'per-function pin on api/health.js only, not a project-wide region move (out of scope, see the brief)'
  );
}

// --- Check 3: canberra's upstream host is still what the pin is for ------
const canberraEntry = STANDALONE.find((e) => e.city === "canberra");
if (!canberraEntry) {
  fail('lib/gtfs-refresh.js STANDALONE has no "canberra" entry - has canberra been retired or renamed?');
} else {
  let host;
  try {
    host = new URL(canberraEntry.url).host;
  } catch (error) {
    fail(`canberra STANDALONE entry's url is not a valid URL: ${canberraEntry.url}`);
  }
  if (host && host !== "www.transport.act.gov.au") {
    fail(
      `canberra STANDALONE entry's url host is "${host}", not "www.transport.act.gov.au" - if the source ` +
        "has moved (e.g. an ACT open-data mirror), re-check whether the syd1 pin on api/health.js is still " +
        "needed before dropping it (see the comment above the STANDALONE entry and " +
        "docs/jim-brief-canberra-refresh-region.md)"
    );
  }
}

if (process.exitCode) {
  console.error("vercel-health-region-gate: FAIL");
} else {
  console.log(
    "vercel-health-region-gate: ok - api/health.js is pinned to syd1 only, no project-wide regions key, " +
      "canberra upstream host unchanged"
  );
}
