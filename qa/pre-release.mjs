/**
 * Pre-release gate — syntax, upload sanity, web smoke, widget JVM tests, optional Maestro.
 *
 * Usage:
 *   npm run test:pre-release
 *   npm run test:pre-release -- --with-maestro
 *
 * Set ANDROID_SERIAL when phone + emulator are both connected.
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { listAdbDevices } from "./helpers/adb.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const withMaestro = process.argv.includes("--with-maestro");

function runStep(label, command, args, { optional = false } = {}) {
  process.stdout.write(`→ ${label} … `);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: false,
  });
  const code = result.status ?? 1;
  if (code === 0) {
    console.log("PASS");
    return true;
  }
  if (optional) {
    console.log("SKIP (optional)");
    if (result.stdout?.trim()) {
      console.log(result.stdout.trim().split("\n").slice(-3).join("\n"));
    }
    return true;
  }
  console.log(`FAIL (exit ${code})`);
  if (result.stdout?.trim()) {
    console.log(result.stdout.trim());
  }
  if (result.stderr?.trim()) {
    console.log(result.stderr.trim());
  }
  process.exit(code);
}

function checkSyntax(file) {
  process.stdout.write(`→ syntax ${file} … `);
  const result = spawnSync("node", ["--check", file], { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0) {
    console.log("FAIL");
    process.stderr?.write(result.stderr ?? "");
    process.exit(1);
  }
  console.log("PASS");
}

console.log("Pre-release gate\n");

for (const file of ["public/app.js", "public/widget.js", "public/leave-reminders.js"]) {
  checkSyntax(file);
}

runStep("pre-upload-check", "node", ["qa/pre-upload-check.mjs"]);
runStep("web smoke suite", "node", ["qa/run-all.mjs", "--smoke"]);
runStep("Android widget unit tests", "node", ["qa/run-android-unit.mjs", "--widget"]);

if (withMaestro || listAdbDevices().length > 0) {
  runStep("Maestro smoke", "node", ["qa/run-maestro.mjs"], { optional: !withMaestro });
} else {
  console.log("→ Maestro smoke … SKIP (no adb device; use --with-maestro when emulator is up)");
}

console.log("\nPre-release gate passed.\n");
