/**
 * Proof by construction that qa/sydney-direction-match.mjs still bites now
 * that it reads a local fixture instead of the live Sydney static zip
 * (13 Sep 2026; the Blob-transfer follow-up to PR #357).
 *
 * A fixture-backed gate can pass forever for the wrong reason — a helper
 * that returns an empty dataset, an assertion loop that iterates nothing —
 * so this script copies qa/fixtures/gtfs-snapshots/sydney/ into a scratch
 * directory, deletes the trip rows that satisfy one assertion, points the
 * gate at the mutated copy via SYDNEY_DIRECTION_MATCH_FIXTURE, and requires
 * a non-zero exit with the specific failure message. Three mutations, each
 * targeting a different assertion in the gate:
 *
 *  - drop every "City Circle Via …" T8 trip → the network-wide check (2a)
 *    for "T8 City Circle" must fail;
 *  - drop only the T2 City Circle trip that calls at Leppington → the
 *    per-station check (2b) for Leppington must fail, network-wide still ok;
 *  - drop the T7 Lidcombe trip → the T6/T7 pinned-unchanged check (3) must
 *    fail for Olympic Park.
 *
 * It also runs the gate unmodified once and requires a clean exit, so a
 * broken fixture path fails here as "unexpected pass/fail" rather than
 * silently. Offline: the gate stubs fetch itself, and this script never
 * imports anything that talks to the network.
 *
 * Usage: node qa/sydney-direction-match-negative.mjs
 */
import { spawnSync } from "child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GATE = join(__dirname, "sydney-direction-match.mjs");
const FIXTURE = join(__dirname, "fixtures/gtfs-snapshots/sydney");

function fail(message) {
  console.error(`sydney-direction-match-negative: ${message}`);
  process.exit(1);
}

function runGate(fixtureDir) {
  const env = { ...process.env };
  if (fixtureDir) {
    env.SYDNEY_DIRECTION_MATCH_FIXTURE = fixtureDir;
  } else {
    delete env.SYDNEY_DIRECTION_MATCH_FIXTURE;
  }
  const result = spawnSync("node", [GATE], { env, encoding: "utf8" });
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
}

/**
 * Copy the fixture, then drop from trips.txt every row whose trip_id is
 * rejected by `keepTrip`, and from stop_times.txt every row for a dropped
 * trip. Returns the scratch directory.
 */
function mutatedFixture(label, keepTrip) {
  const dir = mkdtempSync(join(tmpdir(), `sydney-direction-match-${label}-`));
  cpSync(FIXTURE, dir, { recursive: true });
  const dropped = new Set();
  const trips = readFileSync(join(dir, "trips.txt"), "utf8").split(/\r?\n/);
  const keptTrips = trips.filter((line, index) => {
    if (index === 0 || !line.trim()) {
      return true;
    }
    const tripId = line.split(",")[0];
    if (keepTrip(tripId)) {
      return true;
    }
    dropped.add(tripId);
    return false;
  });
  if (dropped.size === 0) {
    fail(`mutation "${label}" dropped no trips — the fixture no longer has the rows this proof relies on`);
  }
  writeFileSync(join(dir, "trips.txt"), keptTrips.join("\n"));
  const stopTimes = readFileSync(join(dir, "stop_times.txt"), "utf8").split(/\r?\n/);
  writeFileSync(
    join(dir, "stop_times.txt"),
    stopTimes.filter((line, index) => index === 0 || !dropped.has(line.split(",")[0])).join("\n")
  );
  return dir;
}

const cases = [
  {
    label: "no-t8-city-circle",
    keepTrip: (id) => !/^T8-CC-/.test(id),
    expect: /"T8 City Circle" matches no scheduled GTFS trip anywhere in the network/,
  },
  {
    label: "no-t2-city-circle-at-leppington",
    keepTrip: (id) => id !== "T2-CC-GRANVILLE",
    expect: /Leppington "T2 City Circle" matches no scheduled GTFS trip at this station/,
  },
  {
    label: "no-t7-lidcombe",
    keepTrip: (id) => id !== "T7-LIDCOMBE",
    expect: /Olympic Park "T7 Lidcombe" matches no scheduled GTFS trip/,
  },
];

const baseline = runGate(null);
if (baseline.status !== 0) {
  fail(`gate must pass on the committed fixture before the negative cases mean anything:\n${baseline.output}`);
}

for (const testCase of cases) {
  const dir = mutatedFixture(testCase.label, testCase.keepTrip);
  try {
    const result = runGate(dir);
    if (result.status === 0) {
      fail(`gate PASSED on mutated fixture "${testCase.label}" — it no longer detects a chip with no matching trip`);
    }
    if (!testCase.expect.test(result.output)) {
      fail(
        `gate failed on "${testCase.label}" but not for the expected reason (wanted ${testCase.expect}):\n${result.output}`
      );
    }
    console.log(`sydney-direction-match-negative: "${testCase.label}" correctly fails the gate`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(
  `sydney-direction-match-negative: ok (gate passes on the committed fixture and fails on all ${cases.length} mutated copies)`
);
