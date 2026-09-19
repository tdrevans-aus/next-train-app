/**
 * docs/jim-brief-release-prep-sync-before-gates.md: `qa/release-prep.mjs` must run `cap:sync`
 * (which produces the synced Android/iOS assets) before any step that reads those assets —
 * `pre-upload-check` and the web smoke suite. Running a gate before the sync means it checks
 * whatever the *previous* sync left on disk, not what will actually ship (17 Sep 2026: a stale
 * leftover `dogfood-origin.json` failed prep before `cap:sync` ever ran to prune it).
 *
 * This asserts on `release-prep.mjs`'s own exported `STEPS` list (not a regex over its source),
 * so a real reorder in that file is what this gate reacts to.
 *
 * To see this gate fail: in qa/release-prep.mjs, swap `cap:sync` to run after
 * `pre-upload-check` (or after the web smoke suite) in the `STEPS` array, then re-run this gate.
 *
 * Usage: node qa/release-prep-step-order-gate.mjs
 */
import { STEPS } from "./release-prep.mjs";

function indexOfStep(matcher) {
  return STEPS.findIndex(matcher);
}

const syncIndex = indexOfStep((step) => step.args.includes("cap:sync"));
const preUploadIndex = indexOfStep((step) =>
  step.args.some((arg) => arg.includes("pre-upload-check"))
);
const smokeIndex = indexOfStep((step) => step.args.includes("--smoke"));

const failures = [];

if (syncIndex === -1) {
  failures.push("no step running `npm run cap:sync` found in release-prep STEPS");
}

function assertAfterSync(name, index) {
  if (index === -1) {
    failures.push(`no step for "${name}" found in release-prep STEPS`);
    return;
  }
  if (syncIndex === -1 || index <= syncIndex) {
    failures.push(
      `"${name}" (STEPS[${index}]) must run after cap:sync (STEPS[${syncIndex}]), reads synced assets`
    );
  }
}

assertAfterSync("pre-upload-check", preUploadIndex);
assertAfterSync("web smoke suite", smokeIndex);

if (failures.length > 0) {
  console.error("FAIL release-prep-step-order-gate:");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log(
  "PASS release-prep-step-order-gate: cap:sync runs before pre-upload-check and the web smoke suite"
);
