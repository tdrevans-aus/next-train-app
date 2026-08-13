/**
 * Run Maestro Android smoke flows on a connected emulator/device.
 * Usage: npm run test:maestro
 *
 * With multiple adb devices, prefers an emulator. Override with ANDROID_SERIAL.
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { adb, listAdbDevices, resolveAdbSerial } from "./helpers/adb.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const flowsDir = path.resolve(__dirname, "maestro", "flows");
const coreFlows = [
  "smoke-app-opens.yaml",
  "journeys-dialog.yaml",
  "menu-reminders.yaml",
];
const optionalFlows = ["widget-face.yaml"];

const includeWidget = process.argv.includes("--widget");

function resolveMaestroCommand() {
  const fromEnv = process.env.MAESTRO_BIN?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) {
    return fromEnv;
  }

  const home = process.env.USERPROFILE || process.env.HOME || "";
  const windowsCandidate = path.join(home, "maestro", "bin", "maestro.bat");
  if (process.platform === "win32" && fs.existsSync(windowsCandidate)) {
    return windowsCandidate;
  }

  return "maestro";
}

const maestroCommand = resolveMaestroCommand();

function resolveJavaHome() {
  if (process.env.JAVA_HOME?.trim()) {
    return process.env.JAVA_HOME.trim();
  }
  const candidates = [
    path.join(process.env["ProgramFiles"] || "C:\\Program Files", "Android", "Android Studio1", "jbr"),
    path.join(process.env["ProgramFiles"] || "C:\\Program Files", "Android", "Android Studio", "jbr"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "bin", "java.exe"))) {
      return candidate;
    }
  }
  return undefined;
}

const javaHome = resolveJavaHome();
const adbSerial = resolveAdbSerial({ preferEmulator: true });

function adbOnTarget(args) {
  return adb(args, { serial: adbSerial });
}

function runMaestro(args, options = {}) {
  if (process.platform === "win32" && maestroCommand.toLowerCase().endsWith(".bat")) {
    return spawnSync("cmd.exe", ["/c", maestroCommand, ...args], {
      encoding: "utf8",
      shell: false,
      ...options,
    });
  }
  return spawnSync(maestroCommand, args, {
    encoding: "utf8",
    shell: false,
    ...options,
  });
}

function maestroEnv() {
  return {
    ...process.env,
    ...(javaHome ? { JAVA_HOME: javaHome } : {}),
    ...(adbSerial ? { ANDROID_SERIAL: adbSerial } : {}),
    MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: "true",
  };
}

function commandOk(args = []) {
  const result = runMaestro(args, { env: maestroEnv() });
  return !result.error && result.status === 0;
}

function countAdbDevices() {
  return listAdbDevices().length;
}

function listFlows(names) {
  return names
    .map((name) => path.join(flowsDir, name))
    .filter((filePath) => fs.existsSync(filePath));
}

if (!commandOk(["--version"])) {
  console.error(
    "Maestro CLI not found. Install: https://maestro.mobile.dev/docs/getting-started/installing-maestro"
  );
  console.error(
    "Windows: extract maestro.zip to %USERPROFILE%\\maestro or set MAESTRO_BIN to maestro.bat"
  );
  process.exit(1);
}

const deviceCount = countAdbDevices();
if (deviceCount < 1 || !adbSerial) {
  console.error("No Android device/emulator found. Run `adb devices` and start an emulator.");
  process.exit(1);
}

if (deviceCount > 1) {
  console.log(
    `Multiple adb devices — using ${adbSerial} (set ANDROID_SERIAL to override).`
  );
}

const flows = [...listFlows(coreFlows)];
if (includeWidget) {
  flows.push(...listFlows(optionalFlows));
}
if (flows.length === 0) {
  console.error(`No Maestro flows found in ${flowsDir}`);
  process.exit(1);
}

console.log(`Running ${flows.length} Maestro flow(s) on ${adbSerial}...`);

function waitForAdbDevice(maxAttempts = 20) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    adbOnTarget(["wait-for-device"]);
    if (listAdbDevices().includes(adbSerial) || countAdbDevices() > 0) {
      return true;
    }
    adbOnTarget(["shell", "sleep", "1"]);
  }
  return countAdbDevices() > 0;
}

function resetMaestroDriver() {
  adbOnTarget(["uninstall", "dev.mobile.maestro.test"]);
  adbOnTarget(["uninstall", "dev.mobile.maestro"]);
  adbOnTarget(["reconnect"]);
  waitForAdbDevice();
  adbOnTarget(["shell", "sleep", "3"]);
}

function stabilizeEmulatorBetweenFlows() {
  waitForAdbDevice();
  adbOnTarget(["shell", "sleep", "2"]);
}

adbOnTarget(["shell", "pm", "clear", "com.tdrevans.nexttrain"]);
stabilizeEmulatorBetweenFlows();

for (const flow of flows) {
  if (path.basename(flow) === "menu-reminders.yaml") {
    resetMaestroDriver();
  }
  stabilizeEmulatorBetweenFlows();
  console.log(`\n— ${path.basename(flow)}`);
  const result = runMaestro(["test", flow], {
    stdio: "inherit",
    env: maestroEnv(),
  });
  if (result.status !== 0) {
    console.error(`Maestro flow failed: ${path.basename(flow)}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nMaestro smoke flows passed.");
