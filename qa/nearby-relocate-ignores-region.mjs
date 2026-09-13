/**
 * Near me relocation ignores the saved region.
 *
 * Bug (4 Sep 2026): with Sweden (stockholm) selected and GPS in Perth, every Near me
 * relocation threw REGION_MISMATCH inside findNearestStation, so the cached station
 * (Edgewater) stuck all day while the rider moved around Perth. Near me must resolve in
 * the GPS city regardless of the region preference; journey/template callers stay
 * region-scoped.
 *
 * Usage: node qa/nearby-relocate-ignores-region.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";

import { BASE } from "./helpers/dev-server.mjs";
const CACHE_KEY = "nextTrainLastNearbyStation";
const SETTINGS_KEY = "nextTrainSettings";
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
  const server = await ensureDevServer();
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
  const boardCities = [];
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/api/board?")) {
      boardCities.push(new URL(url).searchParams.get("city"));
    }
  });

  await page.addInitScript(() => {
    window.__geoCoords = { latitude: -31.7872, longitude: 115.7723, speed: null };
    navigator.geolocation.getCurrentPosition = (success) => {
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
    navigator.geolocation.watchPosition = () => 1;
  });

  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await page.waitForTimeout(500);
  // Region = Sweden (stockholm), explicit so the wizard doesn't open; last Near me
  // station = Edgewater in Perth, the shape the rider's phone was in.
  await page.evaluate(
    ({ cacheKey, settingsKey }) => {
      localStorage.setItem(
        settingsKey,
        JSON.stringify({ savedCity: "stockholm", savedCountry: "se", regionExplicit: true })
      );
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          station: "Edgewater Stn",
          city: "perth",
          distanceKm: 0.2,
          savedAtMs: Date.now(),
        })
      );
      localStorage.setItem("nextTrainOnboardingDone", "1");
    },
    { cacheKey: CACHE_KEY, settingsKey: SETTINGS_KEY }
  );
  await page.reload();
  await page.waitForTimeout(2500);

  const setup = await page.evaluate(() => ({
    preferenceCity: window.NextTrainCitySession?.readSavedCity?.() ?? null,
    nearbyMode: document.querySelector(".app")?.classList.contains("nearby-mode") ?? false,
    loopRunning: window.nextTrainNearby?.isNearbyRelocateLoopScheduled?.() ?? false,
  }));
  const initialStation = await waitForNearbyStation(page, "Edgewater");

  // Move to Joondalup at travel speed and force a relocate tick.
  await page.evaluate(() => {
    window.__geoCoords = { latitude: -31.7444, longitude: 115.7656, speed: 12 };
  });
  await page.evaluate(async () => {
    await window.nextTrainNearby.tickNearbyRelocate();
  });
  const movedStation = await waitForNearbyStation(page, "Joondalup", 10000);

  const afterMove = await page.evaluate(() => ({
    station: window.nextTrainNearby?.getNearbySession?.()?.station ?? null,
    city: window.nextTrainNearby?.getNearbySession?.()?.city ?? null,
    unsupported: window.nextTrainNearby?.getNearbySession?.()?.unsupportedRegion ?? false,
    errorKind: window.nextTrainNearby?.getNearbyErrorKind?.() ?? null,
    heroEmpty: document.querySelector(".hero-empty-title")?.textContent?.trim() ?? "",
  }));

  // Journey/template callers must still be region-scoped: default call throws REGION_MISMATCH.
  const journeySide = await page.evaluate(async () => {
    try {
      const nearest = await window.nextTrainApp.findNearestStation({
        allowSessionShortcut: false,
      });
      return { threw: false, nearest };
    } catch (error) {
      return { threw: true, code: error?.code ?? null, message: error?.message ?? "" };
    }
  });

  const setupOk =
    setup.preferenceCity === "stockholm" &&
    setup.nearbyMode &&
    String(initialStation || "").includes("Edgewater");
  const relocateOk = String(movedStation || "").includes("Joondalup");
  const cityOk = afterMove.city === "perth" && !afterMove.unsupported;
  const boardCityOk =
    boardCities.length > 0 && boardCities.every((city) => city === "perth" || city === null);
  const journeyScopedOk = journeySide.threw && journeySide.code === "REGION_MISMATCH";

  if (setupOk && relocateOk && cityOk && boardCityOk && journeyScopedOk && pageErrors.length === 0) {
    console.log(
      "PASS — stockholm selected, Perth GPS: Near me relocated Edgewater → Joondalup; journeys still region-scoped"
    );
  } else {
    console.error("FAIL — nearby relocate ignores region", {
      setup,
      initialStation,
      movedStation,
      afterMove,
      boardCities,
      journeySide,
      setupOk,
      relocateOk,
      cityOk,
      boardCityOk,
      journeyScopedOk,
      pageErrors,
    });
    process.exitCode = 1;
  }

  await browser.close();
  if (server) {
    await stopDevServer(server);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
