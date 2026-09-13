/**
 * Offline guard against re-adding a `functions.*.memory` key to vercel.json.
 *
 * docs/jim-brief-vercel-memory-not-applied.md (13 Sep 2026) established on a
 * real deployment that this project's memory config is silently inert:
 * `vercel deploy` prints "Provided `memory` setting in vercel.json is
 * ignored on Active CPU billing", and `vercel inspect --json` on the
 * resulting deployment showed every function - including one explicitly
 * configured with a different value - at the same memorySize regardless.
 * This project runs on Fluid Compute / Active CPU billing, where function
 * memory is a project-wide dashboard setting (Settings -> Functions ->
 * Advanced Settings -> Function CPU), not a per-function vercel.json
 * override. PR #368 shipped exactly this mistake (a `memory: 4096` line
 * that built green and did nothing); this gate exists so a future PR
 * doesn't reintroduce a memory key that looks authoritative but isn't.
 *
 * What it does (no network, no deployment): parses vercel.json and fails if
 * any entry under "functions" declares a "memory" key.
 *
 * Usage: node qa/vercel-json-no-inert-memory-gate.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const VERCEL_JSON_PATH = path.join(REPO_ROOT, "vercel.json");

function main() {
  const raw = fs.readFileSync(VERCEL_JSON_PATH, "utf8");
  const config = JSON.parse(raw);
  const functions = config.functions || {};

  const offenders = Object.entries(functions)
    .filter(([, fnConfig]) => fnConfig && Object.prototype.hasOwnProperty.call(fnConfig, "memory"))
    .map(([fnPath]) => fnPath);

  if (offenders.length > 0) {
    console.error(
      `FAIL vercel-json-no-inert-memory-gate: vercel.json declares a "memory" key for: ${offenders.join(", ")}.\n` +
        "This project runs on Fluid Compute / Active CPU billing, where vercel.json's " +
        "functions.*.memory is silently ignored (confirmed on a real deployment, " +
        "docs/jim-brief-vercel-memory-not-applied.md). Set the default memory/CPU size " +
        "in the dashboard instead: Settings -> Functions -> Advanced Settings -> Function CPU."
    );
    process.exit(1);
  }

  console.log("PASS vercel-json-no-inert-memory-gate: no inert functions.*.memory key in vercel.json");
}

main();
