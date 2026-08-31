#!/usr/bin/env node
/**
 * Country-lane lock for the expansion pipeline.
 *
 * Luke and Jim both edit shared files (lib/providers/registry.js, qa/run-all.mjs,
 * CITY_BOUNDS, multi-city allowlists). Running two regions of the same country
 * through those lanes at once is how the Sweden wave-1 rebuild (PR #157) happened:
 * merge conflicts, a duplicate QA gate registration, stale cross-city assertions.
 * This lock makes "one country lane at a time" a checked precondition instead of
 * a rule someone has to remember.
 *
 * Lock state lives in docs/expansion-tracker/lane-locks.json, committed to the
 * repo — so it's visible in git history and shared across machines/sessions,
 * not just local state.
 *
 * Usage:
 *   node qa/lane-lock.mjs status
 *   node qa/lane-lock.mjs check <country>
 *   node qa/lane-lock.mjs acquire <country> <region> <stage> [branch]
 *   node qa/lane-lock.mjs release <country>
 *   node qa/lane-lock.mjs release <country> --force --reason "explanation"
 *
 * Exit codes: 0 = ok / free. 1 = locked by another region (check/acquire) or
 * bad usage.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const LOCK_FILE = path.join(REPO_ROOT, "docs", "expansion-tracker", "lane-locks.json");
const MUTEX_FILE = LOCK_FILE + ".mutex";

const STALE_MS = 6 * 60 * 60 * 1000; // 6h — long enough for a real session, short enough to flag forgetfulness.
const MUTEX_STALE_MS = 30 * 1000; // a read-modify-write of this file should never take 30s — a leftover mutex past this is a crashed process, not real contention.
const MUTEX_TIMEOUT_MS = 5000;
const MUTEX_RETRY_MS = 50;

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// acquire()/release() both do a read -> mutate -> write of LOCK_FILE. Two concurrent
// invocations (two agent sessions, or Luke and Jim racing) can interleave: both read the
// same snapshot, both write back, and whichever write lands second silently clobbers the
// other's addition — the exact way a country's entry (Denmark) vanished from this file
// with no release ever having been run and no trace in git history. This mutex makes that
// read-modify-write section exclusive across processes via an exclusive-create sentinel
// file, so a second process blocks (briefly) instead of racing.
function withMutex(fn) {
  const start = Date.now();
  for (;;) {
    try {
      const fd = fs.openSync(MUTEX_FILE, "wx");
      fs.writeSync(fd, String(process.pid));
      fs.closeSync(fd);
      break;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      try {
        const age = Date.now() - fs.statSync(MUTEX_FILE).mtimeMs;
        if (age > MUTEX_STALE_MS) {
          fs.rmSync(MUTEX_FILE, { force: true });
          continue;
        }
      } catch {
        continue; // mutex file vanished between the failed open and the stat — retry immediately.
      }
      if (Date.now() - start > MUTEX_TIMEOUT_MS) {
        throw new Error(
          `Timed out waiting for the lane-lock file (${MUTEX_FILE}). Another process may be stuck holding it — ` +
            `check for a hung qa/lane-lock.mjs and remove the .mutex file if so.`
        );
      }
      sleepSync(MUTEX_RETRY_MS);
    }
  }
  try {
    return fn();
  } finally {
    fs.rmSync(MUTEX_FILE, { force: true });
  }
}

function readLocks() {
  if (!fs.existsSync(LOCK_FILE)) return {};
  return JSON.parse(fs.readFileSync(LOCK_FILE, "utf8"));
}

function writeLocks(locks) {
  fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
  // Write-then-rename so a crash mid-write can never leave LOCK_FILE truncated or half-written.
  const tmp = `${LOCK_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(locks, null, 2) + "\n");
  fs.renameSync(tmp, LOCK_FILE);
}

function ageString(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const hrs = ms / (60 * 60 * 1000);
  return hrs < 1 ? `${Math.round(ms / 60000)}m` : `${hrs.toFixed(1)}h`;
}

function cmdStatus() {
  const locks = readLocks();
  const countries = Object.keys(locks);
  if (countries.length === 0) {
    console.log("No lanes locked.");
    return 0;
  }
  for (const country of countries) {
    const l = locks[country];
    const stale = Date.now() - new Date(l.locked_at).getTime() > STALE_MS;
    console.log(
      `${country}: ${l.region} (${l.stage})${l.branch ? ` on ${l.branch}` : ""} — locked ${ageString(
        l.locked_at
      )} ago${stale ? "  [STALE — verify before overriding]" : ""}`
    );
  }
  return 0;
}

function cmdCheck(country) {
  if (!country) {
    console.error("Usage: node qa/lane-lock.mjs check <country>");
    return 1;
  }
  const locks = readLocks();
  const l = locks[country];
  if (!l) {
    console.log(`${country}: free.`);
    return 0;
  }
  const stale = Date.now() - new Date(l.locked_at).getTime() > STALE_MS;
  console.error(
    `${country} is locked by ${l.region} (${l.stage})${l.branch ? ` on ${l.branch}` : ""}, ` +
      `locked ${ageString(l.locked_at)} ago.${stale ? " Lock looks stale — confirm the prior region actually merged, then release with --force." : " Do not start another region in this country until it's merged and released."}`
  );
  return 1;
}

function cmdAcquire(country, region, stage, branch) {
  if (!country || !region || !stage) {
    console.error("Usage: node qa/lane-lock.mjs acquire <country> <region> <stage> [branch]");
    return 1;
  }
  const locks = readLocks();
  const existing = locks[country];
  if (existing && existing.region !== region) {
    const stale = Date.now() - new Date(existing.locked_at).getTime() > STALE_MS;
    console.error(
      `Refusing: ${country} is already locked by ${existing.region} (${existing.stage}), ` +
        `locked ${ageString(existing.locked_at)} ago.${stale ? " It looks stale — if you've confirmed it merged, release it first." : ""}`
    );
    return 1;
  }
  locks[country] = {
    region,
    stage,
    branch: branch || null,
    locked_at: new Date().toISOString(),
  };
  writeLocks(locks);
  console.log(`Locked ${country} for ${region} (${stage}).`);
  return 0;
}

function cmdRelease(country, flags) {
  if (!country) {
    console.error("Usage: node qa/lane-lock.mjs release <country> [--force --reason \"...\"]");
    return 1;
  }
  const locks = readLocks();
  if (!locks[country]) {
    console.log(`${country}: already free.`);
    return 0;
  }
  delete locks[country];
  writeLocks(locks);
  console.log(`Released ${country}.${flags.reason ? ` (${flags.reason})` : ""}`);
  return 0;
}

function parseFlags(argv) {
  const flags = { force: false, reason: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--force") flags.force = true;
    if (argv[i] === "--reason") flags.reason = argv[i + 1];
  }
  return flags;
}

const [, , cmd, ...rest] = process.argv;
const positional = rest.filter((a) => !a.startsWith("--") && rest[rest.indexOf(a) - 1] !== "--reason");
const flags = parseFlags(rest);

let code;
switch (cmd) {
  case "status":
    code = cmdStatus();
    break;
  case "check":
    code = cmdCheck(positional[0]);
    break;
  case "acquire":
    code = withMutex(() => cmdAcquire(positional[0], positional[1], positional[2], positional[3]));
    break;
  case "release":
    code = withMutex(() => cmdRelease(positional[0], flags));
    break;
  default:
    console.error("Usage: node qa/lane-lock.mjs <status|check|acquire|release> ...");
    code = 1;
}
process.exit(code);
