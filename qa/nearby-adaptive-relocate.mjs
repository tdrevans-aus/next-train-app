/**
 * Adaptive Near me re-locate: movement should swap nearest station without re-tapping Near me.
 * Also: loop stops on exit and manual station pick.
 * Usage: node qa/nearby-adaptive-relocate.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const CACHE_KEY = "nextTrainLastNearbyStation";
const EDGEWATER = { latitude: -31.7872, longitude: 115.7723 };
const JOONDALUP = { latitude: -31.7444, longitude: 115.7656 };

async function waitForNearbyStation(page, stationSubstring, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const station = await page.evaluate(
      () => window.nextTrainNearby?.getNearbySession?.()?.station ?? null
    );
    if (station && station.includes(stationSubstring)) {
      return station;
    }
    await page.waitForTimeout(200);
  }
  return null;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: EDGEWATER,
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  const pageErrors = [];
  page.on("pageerror", (error) => {
    pageErrors.push(String(error?.message ?? error));
  });

  await page.addInitScript(() => {
    window.__geoCoords = { latitude: -31.7872, longitude: 115.7723, speed: null };
    const original = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    navigator.geolocation.getCurrentPosition = (success, error, options) => {
      window.__lastGeoOptions = options;
      window.__geoCallCount = (window.__geoCallCount ?? 0) + 1;
      success({
        coords: {
          latitude: window.__geoCoords.latitude,
          longitude: window.__geoCoords.longitude,
          accuracy: 10,
          speed: window.__geoCoords.speed,
        },
        timestamp: Date.now(),
      });
    };
    navigator.geolocation.watchPosition = original
      ? navigator.geolocation.watchPosition.bind(navigator.geolocation)
      : () => 1;
  });

  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await page.waitForTimeout(500);
  await page.evaluate(
    ({ key }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          station: "Edgewater Stn",
          distanceKm: 0.2,
          savedAtMs: Date.now(),
        })
      );
      localStorage.setItem("nextTrainOnboardingDone", "1");
    },
    { key: CACHE_KEY }
  );
  await page.reload();
  await page.waitForTimeout(2000);

  const loopRunning = await page.evaluate(
    () => window.nextTrainNearby?.isNearbyRelocateLoopScheduled?.() ?? false
  );
  const initialStation = await waitForNearbyStation(page, "Edgewater");

  await page.evaluate(() => {
    window.__geoCoords = {
      latitude: -31.7444,
      longitude: 115.7656,
      speed: 12,
    };
  });

  await page.evaluate(async () => {
    await window.nextTrainNearby.tickNearbyRelocate();
  });
  await page.waitForTimeout(2500);

  const afterMove = await page.evaluate(() => ({
    station: window.nextTrainNearby?.getNearbySession?.()?.station ?? null,
    loopRunning: window.nextTrainNearby?.isNearbyRelocateLoopScheduled?.() ?? false,
  }));

  await page.evaluate(() => {
    window.nextTrainNearby.exitNearbyMode();
  });
  await page.waitForTimeout(200);
  const afterExit = await page.evaluate(
    () => window.nextTrainNearby?.isNearbyRelocateLoopScheduled?.() ?? false
  );

  await page.evaluate(async () => {
    await window.nextTrainApp.enterNearbyMode();
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.__geoCoords = { latitude: -31.7872, longitude: 115.7723, speed: null };
  });
  await page.evaluate(async () => {
    await window.nextTrainNearby.applyNearbyManualStation("Perth Stn");
  });
  await page.waitForTimeout(500);
  const afterManual = await page.evaluate(
    () => window.nextTrainNearby?.isNearbyRelocateLoopScheduled?.() ?? false
  );

  const swapOk = String(afterMove.station || "").includes("Joondalup");
  const setupOk = loopRunning && String(initialStation || "").includes("Edgewater");
  const loopAfterMoveOk = afterMove.loopRunning === true;
  const exitOk = afterExit === false;
  const manualOk = afterManual === false;

  if (
    setupOk &&
    swapOk &&
    loopAfterMoveOk &&
    exitOk &&
    manualOk &&
    pageErrors.length === 0
  ) {
    console.log("PASS — adaptive Near me re-locate swapped station without re-tap");
  } else {
    console.error("FAIL — nearby adaptive re-locate", {
      setupOk,
      initialStation,
      loopRunning,
      afterMove,
      swapOk,
      loopAfterMoveOk,
      exitOk,
      manualOk,
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
