/**
 * Near me — cached last station paints before GPS.
 * Usage: node qa/nearby-cache-last-station.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const CACHE_KEY = "nextTrainLastNearbyStation";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -31.77, longitude: 115.99 },
    permissions: ["geolocation"],
  });
  await context.addInitScript(() => {
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

  const page = await context.newPage();
  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await page.waitForTimeout(500);
  await page.evaluate(
    ({ key }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          station: "Warwick Stn",
          distanceKm: 0.4,
          savedAtMs: Date.now(),
        })
      );
      localStorage.setItem("nextTrainOnboardingDone", "1");
    },
    { key: CACHE_KEY }
  );
  await page.reload();
  await page.waitForTimeout(1200);

  const cachedPaint = await page.evaluate(() => ({
    route: document.getElementById("route")?.textContent?.trim() ?? "",
    heroCopy: document.getElementById("depart-display-time")?.textContent?.trim() ?? "",
    findingCopy: document.body.innerText.includes("Finding your nearest station"),
    cache: localStorage.getItem("nextTrainLastNearbyStation"),
  }));

  if (
    cachedPaint.route.includes("Warwick") &&
    !cachedPaint.findingCopy &&
    cachedPaint.heroCopy !== "Finding your nearest station…"
  ) {
    console.log("PASS — cached station paints before GPS (route + no locate-only copy)");
  } else {
    console.error("FAIL — cached first paint", cachedPaint);
    process.exitCode = 1;
  }

  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await page.waitForTimeout(500);
  const cleared = await page.evaluate(() => localStorage.getItem("nextTrainLastNearbyStation"));
  if (!cleared) {
    console.log("PASS — ?reset=1 clears last Near me station cache");
  } else {
    console.error("FAIL — cache survived reset", cleared);
    process.exitCode = 1;
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
