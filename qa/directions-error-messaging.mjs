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
      await page.route("**/api/directions**", (route) =>
        route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) })
      );
      await page.route("**/api/destinations**", (route) =>
        route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) })
      );
      await page.goto(BASE);
      await page.waitForFunction(() => Boolean(window.nextTrainApp?.openJourneysLibrary));
      // journey-detail.js is a deferred module (loaded after first paint) —
      // opening the journeys library is what triggers ensureDeferredModulesReady()
      // on a real page load, same as any other qa script that needs it.
      await page.evaluate(() => window.nextTrainApp.openJourneysLibrary());
      await page.waitForFunction(() => Boolean(window.nextTrainJourneyDetail?.loadDirectionsForSelect));
      const label = await page.evaluate(async () => {
        const select = document.createElement("select");
        document.body.appendChild(select);
        await window.nextTrainJourneyDetail.loadDirectionsForSelect(select, "Some Station", null);
        const label = select.options[0]?.textContent ?? "";
        select.remove();
        return label;
      });
      await context.close();
      return label;
    }

    const genericFailureCopy = await copyForMockedResponse(500, { error: "boom" });
    const feedUnavailableCopy = await copyForMockedResponse(500, {
      error: "Merseyrail has no confirmed public GTFS-RT feed",
      reason: "feed_unavailable",
    });
    const missingConfigCopy = await copyForMockedResponse(500, {
      error: "DARWIN_LDB_TOKEN is not set",
      reason: "missing_config",
    });
    const emptyResultCopy = await copyForMockedResponse(200, { directions: [] });

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
      process.exit(1);
    }
    console.log("PASS directions-error-messaging: client-side copy per reason:", results);
  } finally {
    await browser.close();
    await stopDevServer(spawned);
  }
}

await run();
