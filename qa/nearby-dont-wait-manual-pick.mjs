/**
 * Don't wait → station picker must survive late GPS resolve.
 * Usage: node qa/nearby-dont-wait-manual-pick.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -31.95, longitude: 115.86 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

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
  await page.waitForTimeout(7500);

  await page.evaluate(() => document.getElementById("nearby-dont-wait-btn")?.click());
  await page.waitForTimeout(500);

  const pickerBefore = await page.evaluate(
    () => document.getElementById("nearby-fallback")?.hidden === false
  );

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

  const state = await page.evaluate(() => ({
    pickerOpen: document.getElementById("nearby-fallback")?.hidden === false,
    route: document.getElementById("route")?.textContent?.trim() ?? "",
  }));

  if (pickerBefore && state.pickerOpen && !state.route.includes("Near you ·")) {
    console.log("PASS — late GPS did not kick user out of station picker");
  } else {
    console.error("FAIL — picker state after late GPS", { pickerBefore, state });
    process.exitCode = 1;
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
