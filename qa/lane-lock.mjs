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
 * Lock state lives at `<git-common-dir>/lane-locks.json` — i.e. inside the main
 * repo's `.git/`, resolved via `git rev-parse --git-common-dir` from whatever
 * checkout the script runs in. That directory is the same for the main checkout
 * and every `git worktree add` linked to it, which is what makes the lock
 * actually cross-checkout: Jim runs with `isolation: "worktree"`
 * (`.claude/worktrees/<name>/`), and an `acquire` resolved relative to *that*
 * checkout (the old behaviour — `docs/expansion-tracker/lane-locks.json` inside
 * whichever directory the script's `__dirname` sat in) was invisible to the main
 * checkout's `status`/`check` and to every other worktree: two Jims acquired
 * locks for `united-states`/`bart` and `denmark`/`copenhagen` from their own
 * worktrees on 20 Sep 2026 while the main checkout kept reporting both countries
 * free (docs/jim-brief-lane-lock-shared-worktrees.md). `.git/` is never
 * committed, so nothing here needs `.gitignore` beyond the legacy path below. If
 * `git rev-parse --git-common-dir` fails (not a git checkout at all), this falls
 * back to the old per-checkout `docs/expansion-tracker/lane-locks.json` rather
 * than crashing.
 *
 * The mutex file lives beside the lock file (shared for the same reason — a
 * per-worktree mutex would bring back the clobbered-write race described below).
 *
 * Migration: a legacy `docs/expansion-tracker/lane-locks.json` in the checkout a
 * command runs from is merged into the shared file the first time any command
 * runs there (an entry already present in the shared file wins), then removed so
 * it can't be re-imported later. Migration only ever looks at the checkout the
 * command is invoked from, not every worktree.
 *
 * It used to be committed, but an `acquire` made on a feature branch only
 * reached master once that branch's PR merged — i.e. after the lock had stopped
 * mattering — so the committed copy never protected a second checkout, and every
 * release needed its own PR (six of one day's forty PRs). Across checkouts the
 * open PR is the lock: `check` and `acquire` look up the lock's recorded branch
 * with `gh` and auto-release when its PR has merged, so no one has to remember
 * to run `release` after a merge.
 *
 * Only Jim's stage needs the lock: Luke writes exclusively under docs/<city>-d1/
 * and touches no shared file, so Luke on region N+1 may run alongside Jim on N.
 *
 * Usage:
 *   node qa/lane-lock.mjs status
 *   node qa/lane-lock.mjs check <country>
 *   node qa/lane-lock.mjs acquire <country> <region> <stage> [branch]
 *   node qa/lane-lock.mjs release <country>
 *   node qa/lane-lock.mjs release <country> --force --reason "explanation"
 *
 * Pass the branch to `acquire` — that's what lets the merged-PR auto-release work.
 *
 * Exit codes: 0 = ok / free. 1 = locked by another region (check/acquire) or
 * bad usage.
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

// Resolves to the directory shared by the main checkout and every linked
// `git worktree` of it (the main repo's `.git/`), so the lock file lives in one
// place regardless of which checkout a command runs from. Returns null (never
// throws) if `git` isn't available or this isn't a git checkout at all — callers
// fall back to the old per-checkout path.
function resolveGitCommonDir(cwd) {
  try {
    const out = execFileSync("git", ["rev-parse", "--git-common-dir"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      shell: process.platform === "win32",
    }).trim();
    if (!out) return null;
    return path.resolve(cwd, out);
  } catch {
    return null;
  }
}

const LEGACY_LOCK_FILE = path.join(REPO_ROOT, "docs", "expansion-tracker", "lane-locks.json");
const GIT_COMMON_DIR = resolveGitCommonDir(REPO_ROOT);
const LOCK_FILE = GIT_COMMON_DIR ? path.join(GIT_COMMON_DIR, "lane-locks.json") : LEGACY_LOCK_FILE;
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
// file, so a second process blocks (briefly) instead of racing. Since the lock file is now
// genuinely shared across worktrees, this mutex is too — every command that touches
// LOCK_FILE, including reads (which may migrate + auto-release, both writes), must go
// through withMutex so a stale snapshot from one checkout can never overwrite a lock
// another checkout just acquired.
function withMutex(fn) {
  const start = Date.now();
  for (;;) {
    try {
      fs.mkdirSync(path.dirname(MUTEX_FILE), { recursive: true });
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

function readLocksRaw() {
  if (!fs.existsSync(LOCK_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(LOCK_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeLocksRaw(locks) {
  fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
  // Write-then-rename so a crash mid-write can never leave LOCK_FILE truncated or half-written.
  const tmp = `${LOCK_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(locks, null, 2) + "\n");
  fs.renameSync(tmp, LOCK_FILE);
}

// Must be called from inside withMutex. Merges a legacy per-checkout lock file
// (from the checkout this command is running in) into the shared lock file, then
// removes the legacy file so it is never re-imported by a later command. A no-op
// once LOCK_FILE and LEGACY_LOCK_FILE are the same path (the git-unavailable
// fallback) or once the legacy file has already been migrated away.
function migrateLegacyLocked() {
  if (LOCK_FILE === LEGACY_LOCK_FILE) return;
  if (!fs.existsSync(LEGACY_LOCK_FILE)) return;
  let legacy;
  try {
    legacy = JSON.parse(fs.readFileSync(LEGACY_LOCK_FILE, "utf8"));
  } catch {
    legacy = {};
  }
  const locks = readLocksRaw();
  const migrated = [];
  for (const country of Object.keys(legacy)) {
    // An entry already in the shared file wins for the same country.
    if (!(country in locks)) {
      locks[country] = legacy[country];
      migrated.push(country);
    }
  }
  if (migrated.length) writeLocksRaw(locks);
  fs.rmSync(LEGACY_LOCK_FILE, { force: true });
  console.log(
    migrated.length
      ? `Migrated legacy lane lock(s) from ${LEGACY_LOCK_FILE} into ${LOCK_FILE}: ${migrated.join(", ")}.`
      : `Removed legacy lane lock file ${LEGACY_LOCK_FILE} (no new entries — already present in ${LOCK_FILE}).`
  );
}

// Every command that reads or mutates lock state goes through here: takes the
// mutex once, migrates any legacy file in this checkout, reads the current
// locks, and hands them to `fn` for inspection/mutation. `fn` is responsible for
// calling writeLocksRaw() itself if it changes anything, and returns the exit code.
function withLocks(fn) {
  return withMutex(() => {
    migrateLegacyLocked();
    return fn(readLocksRaw());
  });
}

function ageString(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const hrs = ms / (60 * 60 * 1000);
  return hrs < 1 ? `${Math.round(ms / 60000)}m` : `${hrs.toFixed(1)}h`;
}

// True when the lock's branch has a merged PR — the lane is finished even if nobody ran `release`.
// Returns false (keep the lock) whenever `gh` is unavailable, offline, or the lock has no branch,
// so a lookup failure can never silently unlock a lane.
function branchMerged(branch) {
  if (!branch) return false;
  try {
    const out = execFileSync(
      "gh",
      ["pr", "list", "--head", branch, "--state", "merged", "--limit", "1", "--json", "number"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 15000, shell: process.platform === "win32" }
    );
    return JSON.parse(out).length > 0;
  } catch {
    return false;
  }
}

// Drops any lock whose PR has merged. Returns the countries it released.
function releaseMerged(locks) {
  const released = [];
  for (const country of Object.keys(locks)) {
    if (branchMerged(locks[country].branch)) {
      released.push(`${country} (${locks[country].region}, ${locks[country].branch} merged)`);
      delete locks[country];
    }
  }
  if (released.length) writeLocksRaw(locks);
  return released;
}

function cmdStatus() {
  return withLocks((locks) => {
    for (const r of releaseMerged(locks)) console.log(`Auto-released ${r}.`);
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
  });
}

function cmdCheck(country) {
  if (!country) {
    console.error("Usage: node qa/lane-lock.mjs check <country>");
    return 1;
  }
  return withLocks((locks) => {
    for (const r of releaseMerged(locks)) console.log(`Auto-released ${r}.`);
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
  });
}

function cmdAcquire(country, region, stage, branch) {
  if (!country || !region || !stage) {
    console.error("Usage: node qa/lane-lock.mjs acquire <country> <region> <stage> [branch]");
    return 1;
  }
  return withLocks((locks) => {
    for (const r of releaseMerged(locks)) console.log(`Auto-released ${r}.`);
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
    writeLocksRaw(locks);
    console.log(`Locked ${country} for ${region} (${stage}).`);
    return 0;
  });
}

function cmdRelease(country, flags) {
  if (!country) {
    console.error("Usage: node qa/lane-lock.mjs release <country> [--force --reason \"...\"]");
    return 1;
  }
  return withLocks((locks) => {
    if (!locks[country]) {
      console.log(`${country}: already free.`);
      return 0;
    }
    delete locks[country];
    writeLocksRaw(locks);
    console.log(`Released ${country}.${flags.reason ? ` (${flags.reason})` : ""}`);
    return 0;
  });
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
  case "auto-release":
    // For scripts/hooks: release every lock whose PR has merged, print what changed.
    code = withLocks((locks) => {
      const released = releaseMerged(locks);
      console.log(released.length ? released.map((r) => `Auto-released ${r}.`).join("\n") : "Nothing to release.");
      return 0;
    });
    break;
  case "acquire":
    code = cmdAcquire(positional[0], positional[1], positional[2], positional[3]);
    break;
  case "release":
    code = cmdRelease(positional[0], flags);
    break;
  default:
    console.error("Usage: node qa/lane-lock.mjs <status|check|acquire|release> ...");
    code = 1;
}
process.exit(code);
