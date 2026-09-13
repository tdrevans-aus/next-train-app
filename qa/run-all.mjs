/**
 * Run web QA scripts with one command.
 *
 * Usage:
 *   node qa/run-all.mjs              # full suite
 *   node qa/run-all.mjs --smoke      # fast gate (~6–7 min; offline gates run 6-wide)
 *   node qa/run-all.mjs --release    # smoke + pin/leave gates (~9–11 min) — CI on main
 *   node qa/run-all.mjs --no-native  # full web only (no Maestro / native CDP tail)
 *   node qa/run-all.mjs --list       # list scripts in suite
 *
 * CI (GITHUB_ACTIONS): per-script timeouts (3–6 min), QA_VERBOSE=1 streams logs,
 * 30s heartbeats, and dev-server is always spawned fresh on :3000.
 * Local runs cap each script at 10 min (heavier of that and the CI ceiling).
 * Override all script limits with QA_SCRIPT_TIMEOUT_MS.
 *
 * Local runs pick a free port per invocation and spawn their own dev-server.js
 * on it — safe to run from several worktrees at once. To point a run at a
 * server you started yourself instead, set QA_BASE=http://localhost:XXXX and
 * QA_ATTACH=1 (docs/jim-brief-qa-port-per-worktree.md).
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
import { ensureDevServer, stopDevServer, REPO_ROOT, BASE } from "./helpers/dev-server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SMOKE_SCRIPTS = [
  "stickiness-coaches-logic.mjs",
  "upcoming-board-depth.mjs",
  "fremantle-claremont-direction.mjs",
  "smoke-browser.mjs",
  "smoke-11-13.mjs",
  "reminders-dialog.mjs",
  "hub-printed-destination-render.mjs",
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
  "dogfood-mount-race-gate.mjs",
  "location-permission-web-copy.mjs",
  "donotgroup-picker-disambiguation.mjs",
  "directions-error-messaging.mjs",
  "sydney-dogfood-gate.mjs",
  "sydney-direction-match.mjs",
  "sydney-direction-match-negative.mjs",
  "sydney-banksia-perth-route.mjs",
  "sydney-new-journey-not-perth.mjs",
  "nearby-region-preference.mjs",
  "nearby-relocate-ignores-region.mjs",
  "route-swipe-keeps-active-route.mjs",
  "adelaide-dogfood-gate.mjs",
  "amsterdam-dogfood-gate.mjs",
  "amsterdam-line-map-conformance.mjs",
  "rotterdam-dogfood-gate.mjs",
  "rotterdam-line-map-conformance.mjs",
  "gtfs-static-streaming.mjs",
  "gtfs-realtime-accept.mjs",
  "gtfs-error-redaction.mjs",
  "gtfs-snapshot-freshness.mjs",
  "gtfs-local-snapshot-fixture-freshness.mjs",
  "vancouver-dogfood-gate.mjs",
  "vancouver-attribution.mjs",
  "uk-rdg-attribution.mjs",
  "vancouver-line-map-conformance.mjs",
  "canberra-dogfood-gate.mjs",
  "canberra-line-map-conformance.mjs",
  "gold-coast-dogfood-gate.mjs",
  "gold-coast-line-map-conformance.mjs",
  "newcastle-dogfood-gate.mjs",
  "newcastle-line-map-conformance.mjs",
  "auckland-dogfood-gate.mjs",
  "region-selection.mjs",
  "live-city-lists-sync.mjs",
  "coverage-notes-gate.mjs",
  "bundle-freshness.mjs",
  "help-coverage-entry.mjs",
  "uk-region-catalog-conformance.mjs",
  "uk-catalog-coords-gate.mjs",
  "uk-catalog-lazy-load.mjs",
  "uk-london-tfl-direction-match.mjs",
  "branch-reachable-chips-gate.mjs",
  "uk-planned-gate.mjs",
  "nz-planned-gate.mjs",
  "stockholm-dogfood-gate.mjs",
  "stockholm-direction-match.mjs",
  "goteborg-dogfood-gate.mjs",
  "goteborg-direction-match.mjs",
  "malmo-dogfood-gate.mjs",
  "malmo-line-map-conformance.mjs",
  "wellington-dogfood-gate.mjs",
  "osaka-planned-gate.mjs",
  "hong-kong-planned-gate.mjs",
  "auckland-line-map-conformance.mjs",
  "stockholm-line-map-conformance.mjs",
  "goteborg-line-map-conformance.mjs",
  "wellington-line-map-conformance.mjs",
  "osaka-line-map-conformance.mjs",
  "hong-kong-line-map-conformance.mjs",
  "perth-line-map-conformance.mjs",
  "london-nearby-chips.mjs",
  "london-catalog-no-duplicate-stops.mjs",
  "london-picker-no-duplicate-stops.mjs",
  "uppsala-dogfood-gate.mjs",
  "uppsala-line-map-conformance.mjs",
  "helsinki-dogfood-gate.mjs",
  "helsinki-line-map-conformance.mjs",
  "oslo-dogfood-gate.mjs",
  "oslo-line-map-conformance.mjs",
  "brussels-planned-gate.mjs",
  "east-midlands-dogfood-gate.mjs",
  "uk-west-midlands-dogfood-gate.mjs",
  "uk-rail-crs-index.mjs",
  "south-yorkshire-dogfood-gate.mjs",
  "north-east-dogfood-gate.mjs",
  "west-of-england-dogfood-gate.mjs",
  "south-wales-dogfood-gate.mjs",
  "uk-city-bounds-overlap-gate.mjs",
  "west-yorkshire-dogfood-gate.mjs",
  "rest-of-wales-dogfood-gate.mjs",
  "rest-of-scotland-dogfood-gate.mjs",
  "glasgow-dogfood-gate.mjs",
  "edinburgh-dogfood-gate.mjs",
  "solent-dogfood-gate.mjs",
  "thames-valley-dogfood-gate.mjs",
  "greater-anglia-dogfood-gate.mjs",
  "london-se-national-rail-dogfood-gate.mjs",
  "greater-manchester-dogfood-gate.mjs",
  "feed-unconfirmed-rider-copy.mjs",
  "no-live-feed-stops-gate.mjs",
  "cumbria-dogfood-gate.mjs",
  "liverpool-city-region-dogfood-gate.mjs",
  "southwest-dogfood-gate.mjs",
  "uk-darwin-cache.mjs",
  "copenhagen-planned-gate.mjs",
  "boston-planned-gate.mjs",
  "write-city-directions-resilience.mjs",
  "late-leave-slider-stays.mjs",
  "cold-boot-fetch-coalesce.mjs",
  "lib-bare-import-gate.mjs",
  "gtfs-refresh-retired-city-skip-gate.mjs",
  "gtfs-refresh-partial-status-gate.mjs",
  "gtfs-refresh-status-cache-gate.mjs",
  "prod-sweep-refresh-failed-gate.mjs",
  "no-hardcoded-qa-port.mjs",
  "ad-consent-gate.mjs",
  "feedback-abuse.mjs",
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
  "fetchjson-deps-ok.mjs",
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
  /**
   * FB-64 production sweep (docs/jim-brief-prod-sweep.md) — hits production for every live
   * city on an hourly GitHub Actions cron (.github/workflows/prod-sweep.yml), never a PR
   * gate. Must never join any run-all.mjs tier, including the untiered full glob — same
   * reasoning as the per-city network-sweep scripts above. npm run sweep:prod
   */
  "prod-sweep.mjs",
  /** Deprecated alias of pin-behavior.mjs — running both doubled the last-check flake. */
  "pin-exclusive.mjs",
  /**
   * Live-probed Amsterdam OVapi GTFS-RT (real network fetch, ~5.7MB TripUpdates) as its
   * overnight-lookahead example city. Amsterdam retired from release 1, 7 Sep 2026
   * (docs/jim-brief-release-1-scope-cut.md) — dropped from the smoke tier per that brief's
   * "drop any that live-probe the agency" instruction rather than repointed at a live city,
   * since the overnight-lookahead feature itself has no other dedicated gate to preserve.
   */
  "gtfs-overnight-lookahead.mjs",
  /**
   * Fetches Rotterdam's blob-hosted static GTFS fixture over the network to validate Mark's
   * 13 probe stations against live fixture data. Rotterdam retired from release 1, 7 Sep 2026
   * (docs/jim-brief-release-1-scope-cut.md) — dropped from the smoke tier per that brief's
   * "drop any that live-probe the agency" instruction; the probe-list/hub assertions this
   * checked are still covered offline by qa/rotterdam-line-map-conformance.mjs.
   */
  "rotterdam-mark-probes.mjs",
]);

/**
 * Offline pure-Node gates — no dev server, no browser. Their wall clock is
 * dominated by per-spawn Node startup + module imports (each reports ~0s of
 * test time), so the runner executes them with limited parallelism. Each still
 * gets its own clean `node` process and its own exit code — only the
 * scheduling changes. Anything NOT matched here is assumed to need the dev
 * server on :3000 and runs strictly serially, in suite order, as before.
 */
const OFFLINE_GATE_RE =
  /-(dogfood-gate|line-map-conformance|planned-gate|direction-match|mark-probes)\.mjs$/;
const OFFLINE_EXTRA_SCRIPTS = new Set([
  /** Pure logic, no browser (see its header). */
  "stickiness-coaches-logic.mjs",
  /** lib/train-times.js only. */
  "fremantle-claremont-direction.mjs",
  /** Static file/source assertions. */
  "nearby-pin-notify-label.mjs",
  "vancouver-attribution.mjs",
  "uk-rdg-attribution.mjs",
  /** Direct provider-lib imports, no :3000. */
  "gtfs-static-streaming.mjs",
  "gtfs-realtime-accept.mjs",
  "gtfs-error-redaction.mjs",
  "gtfs-snapshot-freshness.mjs",
  "gtfs-local-snapshot-fixture-freshness.mjs",
  /**
   * Fetches every live blob-backed city's real published static snapshot
   * (+ realtime for the credential-free ones) over the network — the same
   * class of live fetch as the dogfood gates and rotterdam-mark-probes.mjs
   * above. Deliberately NOT in SMOKE_SCRIPTS (docs/jim-brief-blob-transfer-
   * reduction.md item 2) — runs on the full/nightly suite instead, still
   * offline-scheduled here for parallelism when that suite does run it.
   */
  "gtfs-live-blob-snapshot-integrity.mjs",
  /** Registry vs. the six live-city list copies (docs/live-flip-checklist.md). */
  "live-city-lists-sync.mjs",
  /** Offline UK catalog checks. */
  "uk-region-catalog-conformance.mjs",
  "uk-catalog-coords-gate.mjs",
  "uk-catalog-lazy-load.mjs",
  /** Parses CITY_BOUNDS out of public/city-session.js as text; no dev server. */
  "uk-city-bounds-overlap-gate.mjs",
  /** Pure static-text scan of api/ + reachable lib/ files; no dev server. */
  "lib-bare-import-gate.mjs",
  /**
   * Construction proof (no dev server, no real network - global.fetch/putImpl
   * are stubbed to throw if invoked): proves runGtfsRefresh() skips any city
   * whose registry status isn't "live". docs/jim-brief-356-rebase-and-
   * retired-city-oom.md, 11 Sep 2026.
   */
  "gtfs-refresh-retired-city-skip-gate.mjs",
  "gtfs-refresh-partial-status-gate.mjs",
  "gtfs-refresh-status-cache-gate.mjs",
  /**
   * Construction proof (no dev server, no real network - global.fetch is
   * stubbed): proves qa/prod-sweep.mjs's checkRefreshStatus() alarms on a
   * single named city's refresh failure, not just an all-cities failure.
   * docs/jim-brief-prod-sweep-refresh-failed-alarm.md, 13 Sep 2026.
   */
  "prod-sweep-refresh-failed-gate.mjs",
  /** Pure static-text scan of qa/*.mjs for hardcoded :3000; no dev server. */
  "no-hardcoded-qa-port.mjs",
]);
const OFFLINE_CONCURRENCY = 6;

function isOfflineScript(name) {
  return OFFLINE_GATE_RE.test(name) || OFFLINE_EXTRA_SCRIPTS.has(name);
}

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

/**
 * Browser scripts with a known timing flake (CI history, 100 runs to 5 Sep 2026: smoke-browser 6
 * failures, pin-behavior 4, pin-swipe-notify 1 — every one passed on re-run with no code change).
 * A FAIL on the first attempt gets exactly one re-run; a pass on the second attempt is reported
 * PASS with a "(passed on retry)" note so the flake stays visible without costing a 7-minute
 * job re-run. Timeouts are not retried. QA_NO_RETRY=1 disables this (use when hunting a real bug).
 */
const RETRY_ONCE_SCRIPTS = new Set(["smoke-browser.mjs", "pin-behavior.mjs", "pin-swipe-notify.mjs"]);

function shouldRetry(scriptName, result) {
  if (process.env.QA_NO_RETRY === "1") return false;
  return RETRY_ONCE_SCRIPTS.has(scriptName) && result.code !== 0 && !result.timedOut;
}

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

/**
 * gtfs-live-blob-snapshot-integrity.mjs exits 2 (rather than the usual 1)
 * when every failure it found is the specific, already-diagnosed Newcastle
 * synthetic-dogfood-fixture issue (docs/jim-brief-newcastle-stale-snapshot.md)
 * — still a real FAIL, not suppressed, but distinguishable in this summary
 * from a new/different regression the same way "(passed on retry)" marks a
 * known browser flake. This self-clears with no edit here: once Tim
 * republishes real Newcastle data the gate's own signals stop firing and it
 * exits 0 (PASS) instead.
 */
const KNOWN_TRACKED_EXIT_CODES = {
  "gtfs-live-blob-snapshot-integrity.mjs": {
    code: 2,
    note: "known, tracked — see docs/jim-brief-newcastle-stale-snapshot.md; self-clears once Tim republishes real Newcastle GTFS data",
  },
};

function classifyResult(scriptName, code, { timedOut = false, timeoutMs = 0 } = {}) {
  if (timedOut) {
    const limitSec = Math.round(timeoutMs / 1000);
    return { status: "FAIL", note: `timeout after ${limitSec}s` };
  }

  if (code === 0) {
    return { status: "PASS", note: "" };
  }

  const known = KNOWN_TRACKED_EXIT_CODES[scriptName];
  if (known && code === known.code) {
    return { status: "FAIL", note: known.note };
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

  const needsServer = scripts.some((name) => !isOfflineScript(name));
  let serverChild = null;

  if (needsServer) {
    serverChild = await ensureDevServer({ force: process.env.CI === "true", isRunner: true });
    if (serverChild) {
      console.log(`Started dev-server.js on ${BASE}\n`);
    } else {
      console.log(`Using existing server on ${BASE} (QA_ATTACH=1)\n`);
    }
  }

  if (isCiVerbose()) {
    console.log(
      `[qa] suite=${smoke ? "smoke" : release ? "release" : noNative ? "full-no-native" : "full"} scripts=${scripts.length} ci=true\n`
    );
  }

  const results = [];
  const started = Date.now();

  const limitLabelFor = (scriptName) => {
    const limitMs = getScriptTimeoutMs(scriptName);
    return limitMs > 0 ? ` (limit ${Math.round(limitMs / 1000)}s)` : "";
  };

  /** Record one finished run; fullLine=true prints the whole "→ name … " line at once. */
  const recordResult = ({ scriptName, code, output, timedOut, timeoutMs, elapsedMs, retried }, fullLine) => {
    let { status, note } = classifyResult(scriptName, code, { timedOut, timeoutMs });
    if (retried && status === "PASS") note = "passed on retry";
    else if (retried) note = `${note}, failed twice`;
    const elapsedSec = Math.round(elapsedMs / 1000);
    results.push({ scriptName, status, code, note, elapsedSec });
    const suffix = `${status}${note ? ` (${note})` : ""} · ${elapsedSec}s`;
    if (fullLine) {
      console.log(`→ ${scriptName}${limitLabelFor(scriptName)} … ${suffix}`);
    } else {
      console.log(suffix);
    }
    if (status === "FAIL" && output.trim()) {
      console.log(tailOutput(output, timedOut ? 20 : 8));
      console.log("");
    }
  };

  const offlineScripts = scripts.filter(isOfflineScript);
  const serialScripts = scripts.filter((name) => !isOfflineScript(name));

  /** Phase 1: offline pure-Node gates with limited parallel spawns. */
  if (offlineScripts.length > 0) {
    const queue = [...offlineScripts];
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        recordResult(await runScript(next), true);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(OFFLINE_CONCURRENCY, queue.length) }, worker)
    );
  }

  /** Phase 2: browser/dev-server scripts, strictly serial in suite order. */
  for (const scriptName of serialScripts) {
    process.stdout.write(`→ ${scriptName}${limitLabelFor(scriptName)} … `);
    let result = await runScript(scriptName);
    if (shouldRetry(scriptName, result)) {
      process.stdout.write(`FAIL (exit ${result.code}) · ${Math.round(result.elapsedMs / 1000)}s — retrying once … `);
      const firstOutput = result.output;
      const firstElapsed = result.elapsedMs;
      result = await runScript(scriptName);
      result.retried = true;
      result.elapsedMs += firstElapsed;
      if (result.code !== 0) result.output = `${firstOutput}\n--- retry ---\n${result.output}`;
    }
    recordResult(result, false);
  }

  /** Keep the summary table in suite-list order regardless of finish order. */
  const listOrder = new Map(scripts.map((name, index) => [name, index]));
  results.sort((a, b) => listOrder.get(a.scriptName) - listOrder.get(b.scriptName));

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
