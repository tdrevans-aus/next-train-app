/**
 * Cached Near me board stays up when location is denied; fallback explains Next tap.
 * Usage: node qa/nearby-location-hint-keeps-cache.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";

const CACHE_KEY = "nextTrainLastNearbyStation";

async function run() {
  let serverChild = null;
  try {
    serverChild = await ensureDevServer();
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await context.addInitScript(() => {
      navigator.geolocation.getCurrentPosition = (_success, error) => {
        error?.({ code: 1, message: "User denied Geolocation" });
      };
    });
    const page = await context.newPage();
    try {
      await page.goto("http://localhost:3000/?reset=1&fixture=normal");
      await page.evaluate((key) => {
        localStorage.setItem(
          key,
          JSON.stringify({
            station: "Warwick Stn",
            distanceKm: 0.4,
            savedAtMs: Date.now(),
          })
        );
        localStorage.setItem("nextTrainOnboardingDone", "1");
      }, CACHE_KEY);
      await page.goto("http://localhost:3000/?fixture=normal");

      await page.waitForFunction(
        () => {
          const fallback = document.getElementById("nearby-fallback");
          const fallbackText =
            document.getElementById("nearby-fallback-text")?.textContent ?? "";
          const depart =
            document.getElementById("depart-display-time")?.textContent?.trim() ?? "";
          const route = document.getElementById("route")?.textContent ?? "";
          return (
            fallback?.hidden === false &&
            /tap Near me|location permission/i.test(fallbackText) &&
            /Warwick/i.test(route) &&
            depart.length > 0 &&
            !depart.includes("Location needed")
          );
        },
        null,
        { timeout: 25000 }
      );

      console.log("PASS — cached Near me board keeps times when location is denied");
    } finally {
      await browser.close();
    }
  } finally {
    await stopDevServer(serverChild);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
