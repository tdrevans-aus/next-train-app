/**
 * CAPACITOR-K: TypeError: Failed to fetch must not become an
 * unhandledrejection / pageerror / Sentry crash.
 *
 * Simulates hard network failure on /api/* (Playwright route.abort)
 * while exercising journey refresh and overlapping Near me board loads.
 *
 * Usage: node qa/network-fetch-no-unhandled.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer, BASE } from "./helpers/dev-server.mjs";

const CRASH_RE = /failed to fetch|load failed|networkerror when attempting to fetch/i;
const NEARBY_CACHE_KEY = "nextTrainLastNearbyStation";

async function run() {
  const spawned = await ensureDevServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -31.884, longitude: 115.803 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  const pageErrors = [];
  page.on("pageerror", (error) => {
    pageErrors.push(String(error?.message ?? error));
  });

  await page.route("**/api/**", async (route) => {
    await route.abort("failed");
  });

  await page.addInitScript(() => {
    window.__unhandled = [];
    window.addEventListener("unhandledrejection", (event) => {
      window.__unhandled.push(String(event.reason?.message ?? event.reason));
    });
  });

  // Near me: cached station + aborted directions/next-train fetches.
  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await page.waitForTimeout(400);
  await page.evaluate(
    ({ key }) => {
      localStorage.setItem("nextTrainOnboardingDone", "1");
      localStorage.setItem(
        key,
        JSON.stringify({
          station: "Edgewater Stn",
          distanceKm: 0.4,
          savedAtMs: Date.now(),
        })
      );
    },
    { key: NEARBY_CACHE_KEY }
  );
  await page.reload();
  await page.waitForTimeout(800);

  await page.evaluate(async () => {
    await window.nextTrainApp?.enterNearbyMode?.();
    const first = window.nextTrainApp?.fetchNextTrain?.();
    const second = window.nextTrainApp?.fetchNextTrain?.();
    await Promise.allSettled([first, second].filter(Boolean));
  });
  await page.waitForTimeout(800);

  // Journey mode refresh against aborted /api/next-train.
  await page.evaluate(async () => {
    localStorage.setItem(
      "nextTrainSettings",
      JSON.stringify({
        leaveBeforeMinutes: 12,
        refreshSeconds: 30,
        journeys: [
          {
            id: "qa-network-journey",
            name: "QA Network",
            station: "Edgewater Stn",
            direction: "Perth",
            leaveBeforeMinutes: 12,
            activeDays: [1, 2, 3, 4, 5],
            defaultFrom: "00:00",
            defaultUntil: "23:59",
          },
        ],
      })
    );
  });
  await page.reload();
  await page.waitForTimeout(800);
  await page.evaluate(async () => {
    await window.nextTrainApp?.enterJourneyMode?.();
    const first = window.nextTrainApp?.fetchNextTrain?.();
    const second = window.nextTrainApp?.fetchNextTrain?.();
    await Promise.allSettled([first, second].filter(Boolean));
  });
  await page.waitForTimeout(800);

  const unhandled = await page.evaluate(() => window.__unhandled ?? []);
  const crashMessages = [...pageErrors, ...unhandled].filter((message) =>
    CRASH_RE.test(String(message))
  );

  await browser.close();
  stopDevServer(spawned);

  if (crashMessages.length) {
    console.error("FAIL: network fetch failures escaped as crashes:");
    for (const message of crashMessages) {
      console.error(`  - ${message}`);
    }
    process.exit(1);
  }

  console.log("PASS: TypeError Failed to fetch stayed handled (no unhandledrejection/pageerror)");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
