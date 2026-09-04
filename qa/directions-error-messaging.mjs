/**
 * jim-brief-directions-error-messaging — "Couldn't load directions — try
 * again" was one generic string for three different situations: (1) a
 * genuinely empty result (no error thrown), (2) a feed that will never
 * return data (a named "FeedUnconfirmed"/"FeedUnverified" adapter error),
 * and (3) a missing server config (a named "Missing*" adapter error). Only
 * case 1 should ever say "try again".
 * Usage: node qa/directions-error-messaging.mjs
 */
import { chromium } from "playwright";
import { classifyDirectionsError } from "../api/directions.js";
import { NetFeedUnconfirmedError } from "../lib/providers/east-midlands.js";
import { MissingDarwinTokenError } from "../lib/providers/uk-darwin.js";
import { MissingTfwmCredentialsError } from "../lib/providers/uk-metro-wm.js";
import { ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";

const BASE = "http://localhost:3000";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// --- 1. Server-side classification: real adapter error classes, not guessed ---
assert(
  classifyDirectionsError(new NetFeedUnconfirmedError("Nottingham Station")) === "feed_unavailable",
  "NetFeedUnconfirmedError must classify as feed_unavailable"
);
assert(
  classifyDirectionsError(new MissingDarwinTokenError()) === "missing_config",
  "MissingDarwinTokenError must classify as missing_config"
);
assert(
  classifyDirectionsError(new MissingTfwmCredentialsError()) === "missing_config",
  "MissingTfwmCredentialsError must classify as missing_config"
);
assert(
  classifyDirectionsError(new Error("some transient network blip")) === undefined,
  "a plain/generic Error must not get a reason (keeps the existing try-again copy)"
);
console.log("PASS directions-error-messaging: server-side classification (real adapter error classes)");

// --- 2. Client-side copy selection, driven by the actual /api/directions wire shape ---
async function run() {
  let spawned;
  const browser = await chromium.launch({ headless: true });
  try {
    spawned = await ensureDevServer();

    async function copyForMockedResponse(status, body) {
      const context = await browser.newContext();
      const page = await context.newPage();
      // Diagnostics, printed only when this call comes back empty/wrong: the page
      // console, uncaught page errors, navigations, and a trace of every
      // replaceSelectOptions() call the app made (CI-only flake, see FAIL branch).
      const pageLog = [];
      const stamp = () => `${(performance.now() / 1000).toFixed(3)}s`;
      page.on("console", (msg) => pageLog.push(`${stamp()} [console.${msg.type()}] ${msg.text()}`));
      page.on("pageerror", (err) => pageLog.push(`${stamp()} [pageerror] ${err.message}`));
      page.on("framenavigated", (frame) => pageLog.push(`${stamp()} [navigated] ${frame.url()}`));
      // Wrap replaceSelectOptions() as soon as station-combobox.js defines it, without
      // adding a round-trip between page load and openJourneysLibrary() below — the
      // original gate had none, and the flake is timing-sensitive.
      await page.addInitScript(() => {
        window.__qaReplaceSelectOptionsTrace = [];
        Object.defineProperty(window, "nextTrainStationCombobox", {
          configurable: true,
          get() {
            return undefined;
          },
          set(combobox) {
            const original = combobox.replaceSelectOptions;
            combobox.replaceSelectOptions = (selectEl, options) => {
              window.__qaReplaceSelectOptionsTrace.push({
                at: Math.round(performance.now()),
                target: selectEl.id || selectEl.dataset?.qaProbe || "?",
                labels: options.map((opt) => opt.label),
              });
              return original(selectEl, options);
            };
            Object.defineProperty(window, "nextTrainStationCombobox", {
              value: combobox,
              writable: true,
              configurable: true,
            });
          },
        });
      });
      await page.route("**/api/directions**", (route) =>
        route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) })
      );
      await page.route("**/api/destinations**", (route) =>
        route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) })
      );
      await page.goto(BASE);
      await page.waitForFunction(() => Boolean(window.nextTrainApp?.openJourneysLibrary));
      // journey-detail.js is a deferred module (loaded after first paint) — opening the
      // journeys library kicks off loading it, but openJourneysLibrary() itself is
      // fire-and-forget for that (it must not block the UI paint on a slow chunk fetch).
      // window.nextTrainJourneyDetail can go truthy (script loaded) before its own
      // .init(deps) call has actually run, which under CI's heavier load left deps at
      // {} and made every loadDirectionsForSelect() call silently no-op (empty select,
      // read back as ''). Wait for the real readiness promise instead of polling for the
      // function to merely exist.
      pageLog.push(`${stamp()} [gate] openJourneysLibrary()`);
      await page.evaluate(() => window.nextTrainApp.openJourneysLibrary());
      await page.evaluate(() => window.nextTrainApp.ensureDeferredModulesReady());
      pageLog.push(`${stamp()} [gate] deferred modules ready; calling loadDirectionsForSelect`);
      const result = await page.evaluate(async () => {
        const select = document.createElement("select");
        select.dataset.qaProbe = "qa-probe-select";
        document.body.appendChild(select);
        const moduleBefore = window.nextTrainJourneyDetail;
        await window.nextTrainJourneyDetail.loadDirectionsForSelect(select, "Some Station", null);
        const label = select.options[0]?.textContent ?? "";
        const diagnostics = {
          optionCount: select.options.length,
          selectHtml: select.innerHTML,
          moduleIdentityStable: moduleBefore === window.nextTrainJourneyDetail,
          deferredReady: Boolean(window.NextTrainDeferred?._ready),
          pageNow: Math.round(performance.now()),
          replaceSelectOptionsTrace: window.__qaReplaceSelectOptionsTrace,
        };
        select.remove();
        return { label, diagnostics };
      });
      await context.close();
      return { label: result.label, diagnostics: { ...result.diagnostics, pageLog } };
    }

    const generic = await copyForMockedResponse(500, { error: "boom" });
    const feedUnavailable = await copyForMockedResponse(500, {
      error: "Merseyrail has no confirmed public GTFS-RT feed",
      reason: "feed_unavailable",
    });
    const missingConfig = await copyForMockedResponse(500, {
      error: "DARWIN_LDB_TOKEN is not set",
      reason: "missing_config",
    });
    const emptyResult = await copyForMockedResponse(200, { directions: [] });

    const genericFailureCopy = generic.label;
    const feedUnavailableCopy = feedUnavailable.label;
    const missingConfigCopy = missingConfig.label;
    const emptyResultCopy = emptyResult.label;
    const results = { genericFailureCopy, feedUnavailableCopy, missingConfigCopy, emptyResultCopy };

    const pass =
      /try again/i.test(genericFailureCopy) &&
      !/try again/i.test(feedUnavailableCopy) &&
      /isn.t available yet/i.test(feedUnavailableCopy) &&
      !/try again/i.test(missingConfigCopy) &&
      !/DARWIN_LDB_TOKEN|MissingDarwinTokenError/.test(missingConfigCopy) &&
      /aren.t available right now/i.test(missingConfigCopy) &&
      !/try again/i.test(emptyResultCopy) &&
      /no directions available/i.test(emptyResultCopy) &&
      new Set([genericFailureCopy, feedUnavailableCopy, missingConfigCopy, emptyResultCopy]).size === 4;

    if (!pass) {
      console.error("FAIL", results);
      for (const [name, call] of Object.entries({ generic, feedUnavailable, missingConfig, emptyResult })) {
        console.error(`--- diagnostics: ${name} ---`);
        console.error(JSON.stringify(call.diagnostics, null, 2));
      }
      process.exit(1);
    }
    console.log("PASS directions-error-messaging: client-side copy per reason:", results);
  } finally {
    await browser.close();
    await stopDevServer(spawned);
  }
}

await run();
