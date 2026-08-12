/**
 * Leaving Near me while GPS refine is in flight must not throw
 * TypeError: Cannot set properties of null (setting 'gpsRefining').
 * Usage: node qa/nearby-exit-during-gps-refine.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const CACHE_KEY = "nextTrainLastNearbyStation";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -31.95, longitude: 115.86 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  const pageErrors = [];
  page.on("pageerror", (error) => {
    pageErrors.push(String(error?.message ?? error));
  });

  await page.addInitScript(() => {
    window.__holdGeo = true;
    window.__pendingGeoQueue = [];
    const original = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    navigator.geolocation.getCurrentPosition = (success, error, options) => {
      if (window.__holdGeo) {
        window.__pendingGeoQueue.push({ success, error, options });
        return;
      }
      return original(success, error, options);
    };
  });

  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await page.waitForTimeout(500);
  await page.evaluate(
    ({ key }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          station: "Perth Stn",
          distanceKm: 0.3,
          savedAtMs: Date.now(),
        })
      );
      localStorage.setItem("nextTrainOnboardingDone", "1");
    },
    { key: CACHE_KEY }
  );
  await page.reload();
  await page.waitForTimeout(1500);

  const beforeExit = await page.evaluate(() => ({
    route: document.getElementById("route")?.textContent?.trim() ?? "",
    pendingGeo: window.__pendingGeoQueue?.length ?? 0,
    journeyMode: document.getElementById("app")?.classList.contains("journey-mode"),
  }));

  // Leave Near me while background GPS is still held.
  await page.click("#journeys-btn");
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    window.__holdGeo = false;
    const position = {
      coords: { latitude: -31.95, longitude: 115.86, accuracy: 10 },
      timestamp: Date.now(),
    };
    for (const pending of window.__pendingGeoQueue ?? []) {
      pending.success(position);
    }
    window.__pendingGeoQueue = [];
  });

  await page.waitForTimeout(1500);

  const gpsRefiningCrash = pageErrors.some((message) =>
    /Cannot set properties of null \(setting 'gpsRefining'\)/i.test(message)
  );

  const setupOk =
    beforeExit.route.includes("Perth") && beforeExit.pendingGeo > 0 && !beforeExit.journeyMode;

  if (setupOk && !gpsRefiningCrash && pageErrors.length === 0) {
    console.log("PASS — late GPS after leaving Near me did not crash on gpsRefining");
  } else {
    console.error("FAIL — nearby exit during GPS refine", {
      beforeExit,
      setupOk,
      gpsRefiningCrash,
      pageErrors,
    });
    process.exitCode = 1;
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
