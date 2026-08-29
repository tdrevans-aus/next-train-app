/**
 * Run web QA scripts with one command.
 *
 * Usage:
 *   node qa/run-all.mjs              # full suite
 *   node qa/run-all.mjs --smoke      # fast gate (~2–5 min)
 *   node qa/run-all.mjs --release    # smoke + pin/leave gates (~5–8 min) — CI on main
 *   node qa/run-all.mjs --no-native  # full web only (no Maestro / native CDP tail)
 *   node qa/run-all.mjs --list       # list scripts in suite
 *
 * CI (GITHUB_ACTIONS): per-script timeouts (3–6 min), QA_VERBOSE=1 streams logs,
 * 30s heartbeats, and dev-server is always spawned fresh on :3000.
 * Local runs cap each script at 10 min (heavier of that and the CI ceiling).
 * Override all script limits with QA_SCRIPT_TIMEOUT_MS.
 *
 * Only top-level qa/*.mjs files are suite candidates. One-off bug repros live
 * in qa/repros/ and debug utilities in qa/tools/ — both invisible to the full
 * suite's glob on purpose. A new gate belongs in qa/ root; a new repro or
 * probe belongs in a subfolder so it never silently joins the release gate.
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ensureDevServer, stopDevServer, REPO_ROOT } from "./helpers/dev-server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SMOKE_SCRIPTS = [
  "stickiness-coaches-logic.mjs",
  "fremantle-claremont-direction.mjs",
  "smoke-browser.mjs",
  "smoke-11-13.mjs",
  "reminders-dialog.mjs",
  "reminders-permission-gate.mjs",
  "template-wizard-coach-overlap.mjs",
  "journey-detail-footer-above-ad.mjs",
  "nearby-content-above-ad.mjs",
  "nearby-pin-notify-label.mjs",
  "static-page-above-ad.mjs",
  "dialog-above-ad.mjs",
  "onboarding-not-on-overlay.mjs",
  "onboarding-got-it-no-loop.mjs",
  "region-explicit-skips-wizard.mjs",
  "journey-cap-ignores-routes.mjs",
  "onboarding-scrim-dismiss.mjs",
  "brisbane-dogfood-gate.mjs",
  "sydney-dogfood-gate.mjs",
  "sydney-banksia-perth-route.mjs",
  "sydney-new-journey-not-perth.mjs",
  "nearby-region-preference.mjs",
  "adelaide-dogfood-gate.mjs",
  "amsterdam-dogfood-gate.mjs",
  "amsterdam-line-map-conformance.mjs",
  "rotterdam-dogfood-gate.mjs",
  "rotterdam-line-map-conformance.mjs",
  "rotterdam-mark-probes.mjs",
  "gtfs-overnight-lookahead.mjs",
  "vancouver-dogfood-gate.mjs",
  "vancouver-attribution.mjs",
  "vancouver-line-map-conformance.mjs",
  "canberra-dogfood-gate.mjs",
  "canberra-line-map-conformance.mjs",
  "gold-coast-dogfood-gate.mjs",
  "gold-coast-line-map-conformance.mjs",
  "newcastle-dogfood-gate.mjs",
  "newcastle-line-map-conformance.mjs",
  "auckland-dogfood-gate.mjs",
  "region-selection.mjs",
  "uk-region-catalog-conformance.mjs",
  "uk-catalog-lazy-load.mjs",
  "uk-planned-gate.mjs",
  "nz-planned-gate.mjs",
  "stockholm-planned-gate.mjs",
  "stockholm-dogfood-gate.mjs",
  "stockholm-direction-match.mjs",
  "goteborg-planned-gate.mjs",
  "goteborg-dogfood-gate.mjs",
  "goteborg-direction-match.mjs",
  "wellington-planned-gate.mjs",
  "auckland-line-map-conformance.mjs",
  "stockholm-line-map-conformance.mjs",
  "goteborg-line-map-conformance.mjs",
  "perth-line-map-conformance.mjs",
  "london-nearby-chips.mjs",
];

/** Smoke + ship gates not in smoke — main-branch CI tier (FB-33 QA-P2-09). */
const RELEASE_PIN_SCRIPTS = [
  "leave-by-preferred-gate.mjs",
  "pin-swipe-notify.mjs",
  "pin-behavior.mjs",
];

const RELEASE_EXTRA_SCRIPTS = [
  ...RELEASE_PIN_SCRIPTS,
  "fb-23-route-destination-filter.mjs",
  "journey-kind.mjs",
  "fb-23-phase-1-model.mjs",
  "fb-23-phase-3-hero.mjs",
  "fb-23-auto-selection.mjs",
  "fb-23-web.mjs",
  "add-journey-btn.mjs",
  "app-theme.mjs",
  "sanitize-journey-pin-fields.mjs",
];

const RELEASE_SCRIPTS = [
  ...SMOKE_SCRIPTS,
  ...RELEASE_EXTRA_SCRIPTS.filter(
    (name) => !SMOKE_SCRIPTS.includes(name) && !RELEASE_PIN_SCRIPTS.includes(name)
  ),
];

const RUNNER_EXCLUDE = new Set([
  "run-all.mjs",
  "pre-upload-check.mjs",
  "pre-release.mjs",
  /** Hotfix / Play upload gates — need cap sync; run via npm run test:patch-ship / release:prep. */
  "patch-ship-gate.mjs",
  "release-prep.mjs",
  /** Gradle widget palette tests — android-unit job runs cap sync + JVM. */
  "widget-theme-palettes.mjs",
  /** Meta health-check — uses gh CLI, not a web regression (see soak:status). */
  "soak-status.mjs",
  /** Android JVM — separate CI job (android-unit) runs cap sync + Gradle. */
  "run-android-unit.mjs",
  /** FB-23 phase 4 native — covered by android-unit job on main. */
  "fb-23-phase-4-native.mjs",
  /** Mac/Xcode preflight — `npm run test:ios:preflight`, not Linux web CI. */
  "check-ios-test-setup.mjs",
  /** Live Translink SEQ sweep — D6; never gate PRs. npm run sweep:brisbane */
  "brisbane-network-sweep.mjs",
  /** Live TfNSW Sydney sweep — D6; never gate PRs. npm run sweep:sydney */
  "sydney-network-sweep.mjs",
  /** Live Adelaide Metro sweep — D6; never gate PRs. npm run sweep:adelaide */
  "adelaide-network-sweep.mjs",
  /** Live London TfL sweep — D6; never gate PRs. npm run sweep:uk-london-tfl */
  "uk-london-tfl-network-sweep.mjs",
  /** Live Auckland AT sweep — D6; never gate PRs. npm run sweep:auckland */
  "auckland-network-sweep.mjs",
  /** Live Wellington Metlink sweep — D6; never gate PRs. npm run sweep:wellington */
  "wellington-network-sweep.mjs",
  /** Live Stockholm SL Transport sweep — D6; never gate PRs. npm run sweep:stockholm */
  "stockholm-network-sweep.mjs",
  /** Live Transperth sweep — D6; never gate PRs. npm run sweep:perth */
  "perth-network-sweep.mjs",
  /** Live Amsterdam GVB metro sweep — D6; never gate PRs. npm run sweep:amsterdam */
  "amsterdam-network-sweep.mjs",
  /** Live Rotterdam RET metro sweep — D6; never gate PRs. npm run sweep:rotterdam */
  "rotterdam-network-sweep.mjs",
  /** Live Vancouver SkyTrain sweep — D6; never gate PRs. npm run sweep:vancouver */
  "vancouver-network-sweep.mjs",
  /** Live Canberra light-rail sweep — D6; never gate PRs. npm run sweep:canberra */
  "canberra-network-sweep.mjs",
  /** Live Gold Coast G:link sweep — D6; never gate PRs. npm run sweep:gold-coast */
  "gold-coast-network-sweep.mjs",
  /** Live Newcastle Light Rail sweep — D6; never gate PRs. npm run sweep:newcastle */
  "newcastle-network-sweep.mjs",
  /** Live Göteborg Västtrafik sweep (schedule-only, needs TRAFIKLAB_API_KEY) — D6; never gate PRs. npm run sweep:goteborg */
  "goteborg-network-sweep.mjs",
  /** Deprecated alias of pin-behavior.mjs — running both doubled the last-check flake. */
  "pin-exclusive.mjs",
]);

/** Native/device scripts run last so they do not disturb each other. */
const NATIVE_TAIL_SCRIPTS = [
  "reminders-permission-native-cdp.mjs",
  "run-maestro.mjs",
];

function listFullScripts() {
  const all = fs
    .readdirSync(__dirname)
    .filter((name) => name.endsWith(".mjs") && !RUNNER_EXCLUDE.has(name))
    .sort();
  const tail = NATIVE_TAIL_SCRIPTS.filter((name) => all.includes(name));
  const rest = all.filter((name) => !tail.includes(name));
  return [...rest, ...tail];
}

function parseArgs(argv) {
  const smoke = argv.includes("--smoke");
  const release = argv.includes("--release");
  const pin = argv.includes("--pin");
  const list = argv.includes("--list");
  const noNative = argv.includes("--no-native");
  return { smoke, release, pin, list, noNative };
}

function resolveScripts({ smoke, release, pin, noNative }) {
  let scripts;
  if (pin) {
    scripts = RELEASE_PIN_SCRIPTS;
  } else if (smoke) {
    scripts = SMOKE_SCRIPTS;
  } else if (release) {
    scripts = RELEASE_SCRIPTS;
  } else {
    scripts = listFullScripts();
  }
  if (noNative) {
    scripts = scripts.filter((name) => !NATIVE_TAIL_SCRIPTS.includes(name));
  }
  return scripts;
}

function isCiVerbose() {
  return process.env.CI === "true" || process.env.QA_VERBOSE === "1";
}

/** Per-script ceiling in CI so one stuck Playwright run cannot burn the whole job. */
const HEAVY_SCRIPT_TIMEOUT_MS = {
  "smoke-browser.mjs": 6 * 60 * 1000,
  "smoke-11-13.mjs": 4 * 60 * 1000,
  "pin-swipe-notify.mjs": 8 * 60 * 1000,
  "pin-behavior.mjs": 3 * 60 * 1000,
  "leave-by-preferred-gate.mjs": 3 * 60 * 1000,
  "fb-23-web.mjs": 4 * 60 * 1000,
};

function getScriptTimeoutMs(scriptName) {
  const override = Number(process.env.QA_SCRIPT_TIMEOUT_MS);
  if (Number.isFinite(override) && override > 0) {
    return override;
  }
  const heavy = HEAVY_SCRIPT_TIMEOUT_MS[scriptName];
  if (process.env.CI === "true") {
    return heavy ?? 3 * 60 * 1000;
  }
  // Local runs get a generous ceiling instead of none — a single hung
  // Playwright script must not stall the whole suite indefinitely.
  return Math.max(heavy ?? 0, 10 * 60 * 1000);
}

function killScriptChild(child) {
  if (!child || child.killed) {
    return;
  }
  if (process.platform !== "win32" && child.pid) {
    try {
      process.kill(-child.pid, "SIGKILL");
      return;
    } catch {
      // Fall through to direct child kill.
    }
  }
  child.kill("SIGKILL");
}

function runScript(scriptName) {
  const scriptPath = path.join(__dirname, scriptName);
  const timeoutMs = getScriptTimeoutMs(scriptName);
  const verbose = isCiVerbose();

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn("node", [scriptPath], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
      detached: process.platform !== "win32",
    });

    let output = "";
    let timedOut = false;

    const append = (chunk) => {
      output += chunk;
      if (verbose) {
        process.stderr.write(`[${scriptName}] ${chunk}`);
      }
    };

    child.stdout?.on("data", append);
    child.stderr?.on("data", append);

    let heartbeat = null;
    if (verbose && timeoutMs > 0) {
      heartbeat = setInterval(() => {
        const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
        const limitSec = Math.round(timeoutMs / 1000);
        console.error(`[qa] ${scriptName} still running (${elapsedSec}s / ${limitSec}s)`);
      }, 30_000);
    }

    let timer = null;
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        killScriptChild(child);
      }, timeoutMs);
    }

    child.on("close", (code, signal) => {
      if (timer) {
        clearTimeout(timer);
      }
      if (heartbeat) {
        clearInterval(heartbeat);
      }
      resolve({
        scriptName,
        code: timedOut ? 124 : (code ?? 1),
        output,
        timedOut,
        signal,
        elapsedMs: Date.now() - startedAt,
        timeoutMs,
      });
    });
  });
}

function classifyResult(scriptName, code, { timedOut = false, timeoutMs = 0 } = {}) {
  if (timedOut) {
    const limitSec = Math.round(timeoutMs / 1000);
    return { status: "FAIL", note: `timeout after ${limitSec}s` };
  }

  if (code === 0) {
    return { status: "PASS", note: "" };
  }
  return { status: "FAIL", note: `exit ${code}` };
}

function tailOutput(text, maxLines = 8) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length <= maxLines) {
    return lines.join("\n");
  }
  return lines.slice(-maxLines).join("\n");
}

async function main() {
  const { smoke, release, pin, list, noNative } = parseArgs(process.argv.slice(2));
  const scripts = resolveScripts({ smoke, release, pin, noNative });

  if (list) {
    const label = smoke
      ? "Smoke scripts:"
      : release
        ? "Release scripts:"
        : noNative
          ? "Full scripts (no native tail):"
          : "Full scripts:";
    console.log(label);
    for (const name of scripts) {
      console.log(`  ${name}`);
    }
    return;
  }

  const needsServer = scripts.some((name) => name !== "stickiness-coaches-logic.mjs");
  let serverChild = null;

  if (needsServer) {
    serverChild = await ensureDevServer({ force: process.env.CI === "true" });
    if (serverChild) {
      console.log("Started dev-server.js on http://localhost:3000\n");
    } else {
      console.log("Using existing server on http://localhost:3000\n");
    }
  }

  if (isCiVerbose()) {
    console.log(
      `[qa] suite=${smoke ? "smoke" : release ? "release" : noNative ? "full-no-native" : "full"} scripts=${scripts.length} ci=true\n`
    );
  }

  const results = [];
  const started = Date.now();

  for (const scriptName of scripts) {
    const limitSec = getScriptTimeoutMs(scriptName);
    const limitLabel = limitSec > 0 ? ` (limit ${Math.round(limitSec / 1000)}s)` : "";
    process.stdout.write(`→ ${scriptName}${limitLabel} … `);
    const { code, output, timedOut, timeoutMs, elapsedMs } = await runScript(scriptName);
    const { status, note } = classifyResult(scriptName, code, { timedOut, timeoutMs });
    const elapsedSec = Math.round(elapsedMs / 1000);
    results.push({ scriptName, status, code, note, elapsedSec });
    console.log(`${status}${note ? ` (${note})` : ""} · ${elapsedSec}s`);
    if (status === "FAIL" && output.trim()) {
      console.log(tailOutput(output, timedOut ? 20 : 8));
      console.log("");
    }
  }

  if (serverChild) {
    stopDevServer(serverChild);
  }

  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const elapsedSec = Math.round((Date.now() - started) / 1000);

  console.log("\n--- Summary ---");
  const suiteLabel = smoke
    ? "smoke"
    : release
      ? "release"
      : noNative
        ? "full (no native)"
        : "full";
  console.log(
    `Suite: ${suiteLabel} · ${pass} PASS · ${fail} FAIL · ${elapsedSec}s`
  );
  console.log("");

  for (const row of results) {
    const pad = row.scriptName.padEnd(36);
    console.log(`${pad} ${row.status}${row.note ? `  ${row.note}` : ""}`);
  }

  if (fail > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
