/**
 * Proves qa/lane-lock.mjs's lock file is genuinely shared across a linked git
 * worktree and the main checkout it belongs to, not scoped per-checkout.
 *
 * docs/jim-brief-lane-lock-shared-worktrees.md (20 Sep 2026): the lock used to
 * resolve relative to whichever checkout ran the script, so a Jim run in a
 * `.claude/worktrees/<name>/` isolation worktree wrote a lock the main checkout
 * (and every other worktree) never saw — `status`/`check` kept reporting the
 * country free while it was actually locked. This gate builds a disposable git
 * repo + linked worktree in os.tmpdir(), copies the real qa/lane-lock.mjs into
 * it, and exercises acquire/check/status/release/legacy-migration across the
 * two checkouts, asserting the shared file lands under the temp repo's `.git/`
 * and that neither checkout's docs/expansion-tracker/ gets a new lock file.
 *
 * Also covers the 20 Sep 2026 follow-up: the legacy path was tracked (committed
 * as `{}`) on master before it was gitignored, so migration must never leave a
 * tracked legacy file modified/deleted in `git status` — an empty tracked file
 * is left alone entirely, and a tracked file with real entries is migrated then
 * restored to its committed content rather than deleted.
 *
 * No dev server, no network — pure git + node child processes against a
 * throwaway repo. Never touches the real repo's lock file or `git worktree
 * list`.
 *
 * Usage: node qa/lane-lock-shared-worktree.mjs
 */
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REAL_LANE_LOCK = path.join(__dirname, "lane-lock.mjs");

function git(cwd, args) {
  // No `shell: true` here: on Windows that reparses `args` through cmd.exe,
  // which splits values like "QA Bot" on the space — `execFileSync` calls
  // git.exe directly and correctly with an argv array either way.
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

// Runs `node qa/lane-lock.mjs <args>` from `cwd`, never throwing on a non-zero
// exit — callers assert on `.code` themselves.
function runLock(cwd, args) {
  try {
    const stdout = execFileSync(process.execPath, [path.join(cwd, "qa", "lane-lock.mjs"), ...args], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout, stderr: "" };
  } catch (err) {
    return {
      code: typeof err.status === "number" ? err.status : 1,
      stdout: err.stdout ? err.stdout.toString() : "",
      stderr: err.stderr ? err.stderr.toString() : "",
    };
  }
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function setUpRepo(mainRepo) {
  fs.mkdirSync(mainRepo, { recursive: true });
  git(mainRepo, ["init", "-q"]);
  fs.mkdirSync(path.join(mainRepo, "qa"), { recursive: true });
  fs.copyFileSync(REAL_LANE_LOCK, path.join(mainRepo, "qa", "lane-lock.mjs"));
  git(mainRepo, ["add", "-A"]);
  git(mainRepo, [
    "-c",
    "user.name=QA Bot",
    "-c",
    "user.email=qa-bot@example.com",
    "commit",
    "-q",
    "-m",
    "init",
  ]);
}

function run() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lane-lock-shared-wt-"));
  const mainRepo = path.join(tmpRoot, "main");
  const worktreeDir = path.join(tmpRoot, "wt");

  try {
    setUpRepo(mainRepo);
    git(mainRepo, ["worktree", "add", worktreeDir, "-b", "wt"]);
    // The worktree checkout needs its own copy of docs/expansion-tracker to not
    // exist yet (it's created on demand) but it does need qa/lane-lock.mjs,
    // which `git worktree add` already checked out from the commit above.

    // --- Step 1: acquire from the worktree, no branch (skips any `gh` lookup). ---
    const acquire1 = runLock(worktreeDir, ["acquire", "testland", "region-a", "jim"]);
    assert(acquire1.code === 0, `acquire from worktree expected exit 0, got ${acquire1.code}: ${acquire1.stderr}`);

    // --- Step 2: main checkout sees it. ---
    const check1 = runLock(mainRepo, ["check", "testland"]);
    assert(check1.code === 1, `check from main expected exit 1, got ${check1.code}`);
    assert(
      check1.stderr.includes("region-a"),
      `check from main expected to name region-a, got: ${check1.stderr}`
    );

    const status1 = runLock(mainRepo, ["status"]);
    assert(status1.code === 0, `status from main expected exit 0, got ${status1.code}`);
    assert(
      status1.stdout.includes("testland") && status1.stdout.includes("region-a"),
      `status from main expected to list testland/region-a, got: ${status1.stdout}`
    );

    const acquireConflict = runLock(mainRepo, ["acquire", "testland", "region-b", "jim"]);
    assert(
      acquireConflict.code === 1,
      `acquire of a second region from main expected exit 1, got ${acquireConflict.code}`
    );
    assert(
      acquireConflict.stderr.includes("Refusing"),
      `acquire conflict expected "Refusing", got: ${acquireConflict.stderr}`
    );

    // --- Step 3: release from main, worktree sees it free. ---
    const release1 = runLock(mainRepo, ["release", "testland"]);
    assert(release1.code === 0, `release from main expected exit 0, got ${release1.code}`);

    const check2 = runLock(worktreeDir, ["check", "testland"]);
    assert(check2.code === 0, `check from worktree after release expected exit 0, got ${check2.code}`);
    assert(check2.stdout.includes("free"), `check from worktree after release expected "free", got: ${check2.stdout}`);

    // --- Step 4: legacy per-checkout file migration. ---
    const legacyDir = path.join(worktreeDir, "docs", "expansion-tracker");
    fs.mkdirSync(legacyDir, { recursive: true });
    const legacyFile = path.join(legacyDir, "lane-locks.json");
    fs.writeFileSync(
      legacyFile,
      JSON.stringify(
        {
          legacyland: { region: "region-x", stage: "jim", branch: null, locked_at: new Date().toISOString() },
        },
        null,
        2
      ) + "\n"
    );

    const statusMigrate = runLock(worktreeDir, ["status"]);
    assert(statusMigrate.code === 0, `status (migrate) from worktree expected exit 0, got ${statusMigrate.code}`);
    assert(
      statusMigrate.stdout.includes("Migrated"),
      `status (migrate) expected a "Migrated" line, got: ${statusMigrate.stdout}`
    );
    assert(!fs.existsSync(legacyFile), "legacy lane-locks.json should be removed after migration");

    const checkLegacy = runLock(mainRepo, ["check", "legacyland"]);
    assert(checkLegacy.code === 1, `check legacyland from main expected exit 1, got ${checkLegacy.code}`);
    assert(
      checkLegacy.stderr.includes("region-x"),
      `check legacyland from main expected to name region-x, got: ${checkLegacy.stderr}`
    );
    // Not re-imported: run migration again (status from main) and confirm the
    // legacy file (already gone) doesn't resurrect or duplicate anything.
    const statusAgain = runLock(mainRepo, ["status"]);
    assert(statusAgain.code === 0, `status (post-migration) from main expected exit 0, got ${statusAgain.code}`);
    assert(
      !statusAgain.stdout.includes("Migrated"),
      `status (post-migration) should not migrate again, got: ${statusAgain.stdout}`
    );

    // --- Step 5: shared file lives under the temp repo's .git/, nothing new under docs/expansion-tracker/. ---
    const gitCommonDir = path.resolve(mainRepo, git(mainRepo, ["rev-parse", "--git-common-dir"]).trim());
    const expectedLockFile = path.join(gitCommonDir, "lane-locks.json");
    assert(fs.existsSync(expectedLockFile), `expected shared lock file at ${expectedLockFile}`);
    assert(
      expectedLockFile.startsWith(path.join(mainRepo, ".git")),
      `expected shared lock file under ${path.join(mainRepo, ".git")}, got ${expectedLockFile}`
    );
    assert(
      !fs.existsSync(path.join(mainRepo, "docs", "expansion-tracker")),
      "main checkout should never get a docs/expansion-tracker/ directory"
    );
    assert(
      !fs.existsSync(path.join(worktreeDir, "docs", "expansion-tracker", "lane-locks.json")),
      "worktree checkout's legacy lock file should stay gone after migration"
    );

    // Clean up the lock we left behind (legacyland) so nothing lingers if this
    // ever runs against a longer-lived temp dir; harmless either way since the
    // whole tmpRoot is removed below.
    runLock(mainRepo, ["release", "legacyland"]);

    // --- Step 6: a *tracked* legacy file (the real repo's history: it was
    // committed as `{}` before the path was gitignored). Must never appear
    // modified/deleted in `git status` — see docs/jim-brief-lane-lock-shared-worktrees.md's
    // 20 Sep 2026 follow-up.

    // 6a: tracked, empty ({}) — ignored entirely, not touched at all.
    fs.writeFileSync(legacyFile, "{}\n");
    git(worktreeDir, ["add", legacyFile]);
    git(worktreeDir, [
      "-c",
      "user.name=QA Bot",
      "-c",
      "user.email=qa-bot@example.com",
      "commit",
      "-q",
      "-m",
      "track empty legacy lock file",
    ]);
    const statusEmptyTracked = runLock(worktreeDir, ["status"]);
    assert(
      statusEmptyTracked.code === 0,
      `status with tracked empty legacy file expected exit 0, got ${statusEmptyTracked.code}`
    );
    assert(
      !statusEmptyTracked.stdout.includes("Migrated") && !statusEmptyTracked.stdout.includes("Cleared"),
      `status with tracked empty legacy file should not log a migration line, got: ${statusEmptyTracked.stdout}`
    );
    let gitStatusPorcelain = git(worktreeDir, ["status", "--porcelain", "--", legacyFile]).trim();
    assert(
      gitStatusPorcelain === "",
      `tracked empty legacy file should leave git status clean, got: ${JSON.stringify(gitStatusPorcelain)}`
    );

    // 6b: tracked, with entries — migrated, then restored to committed ({}) content.
    fs.writeFileSync(
      legacyFile,
      JSON.stringify(
        {
          trackedland: { region: "region-y", stage: "jim", branch: null, locked_at: new Date().toISOString() },
        },
        null,
        2
      ) + "\n"
    );
    const statusTrackedMigrate = runLock(worktreeDir, ["status"]);
    assert(
      statusTrackedMigrate.code === 0,
      `status with tracked legacy entries expected exit 0, got ${statusTrackedMigrate.code}`
    );
    assert(
      statusTrackedMigrate.stdout.includes("Migrated"),
      `status with tracked legacy entries expected a "Migrated" line, got: ${statusTrackedMigrate.stdout}`
    );
    assert(
      fs.existsSync(legacyFile),
      "tracked legacy file should still exist after migration (restored, not deleted)"
    );
    assert(
      fs.readFileSync(legacyFile, "utf8").trim() === "{}",
      `tracked legacy file should be restored to its committed ({}) content, got: ${fs.readFileSync(
        legacyFile,
        "utf8"
      )}`
    );
    gitStatusPorcelain = git(worktreeDir, ["status", "--porcelain", "--", legacyFile]).trim();
    assert(
      gitStatusPorcelain === "",
      `tracked legacy file should leave git status clean after migration, got: ${JSON.stringify(gitStatusPorcelain)}`
    );

    const checkTrackedland = runLock(mainRepo, ["check", "trackedland"]);
    assert(checkTrackedland.code === 1, `check trackedland from main expected exit 1, got ${checkTrackedland.code}`);
    assert(
      checkTrackedland.stderr.includes("region-y"),
      `check trackedland from main expected to name region-y, got: ${checkTrackedland.stderr}`
    );

    // Second `status` must not re-migrate (file is back to committed {} content).
    const statusTrackedAgain = runLock(worktreeDir, ["status"]);
    assert(
      statusTrackedAgain.code === 0,
      `second status after tracked-legacy migration expected exit 0, got ${statusTrackedAgain.code}`
    );
    assert(
      !statusTrackedAgain.stdout.includes("Migrated") && !statusTrackedAgain.stdout.includes("Cleared"),
      `second status after tracked-legacy migration should not re-migrate, got: ${statusTrackedAgain.stdout}`
    );
    gitStatusPorcelain = git(worktreeDir, ["status", "--porcelain", "--", legacyFile]).trim();
    assert(
      gitStatusPorcelain === "",
      `tracked legacy file should still be clean after second status, got: ${JSON.stringify(gitStatusPorcelain)}`
    );

    runLock(mainRepo, ["release", "trackedland"]);

    console.log("PASS lane-lock-shared-worktree: lock file is shared across the main checkout and a linked worktree");
  } finally {
    try {
      // Best-effort: dissociate the worktree before nuking the directory tree
      // so no stale entry lingers in a process that might still be holding it.
      git(mainRepo, ["worktree", "remove", "--force", worktreeDir]);
    } catch {
      // Ignore — the directory removal below is what actually matters.
    }
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

try {
  run();
} catch (err) {
  console.error(`FAIL lane-lock-shared-worktree: ${err.message}`);
  process.exit(1);
}
