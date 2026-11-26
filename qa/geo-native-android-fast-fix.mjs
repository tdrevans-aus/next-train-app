/**
 * docs/jim-brief-android-near-me-slow-location.md — on a native ANDROID shell, Near me
 * asks for maximumAge: 0 on open/resume. If the fused provider has no fresh fix, that
 * request used to be the only path (#450 removed the navigator.geolocation fallback), so
 * the cached station (Edgewater) sat on screen for 30-60 s. A recent last-known fix must
 * win the race, and the fresh request must still be issued.
 *
 * Stubs a native Android Capacitor shell whose Geolocation plugin:
 *   - never answers maximumAge: 0 requests (cold provider, indoors),
 *   - answers any maximumAge >= 30 s request in ~200 ms with a recent fix (Warwick).
 *
 * Checks: (1) getAppGeolocationPosition({maximumAge: 0}) resolves < 3 s;
 * (2) opening Near me with a cached Edgewater station swaps to Warwick < 5 s;
 * (3) navigator.geolocation is never touched (the iOS #450 rule holds on every native shell).
 *
 * Usage: node qa/geo-native-android-fast-fix.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer, BASE } from "./helpers/dev-server.mjs";

const CACHE_KEY = "nextTrainLastNearbyStation";
const WARWICK = { latitude: -31.8448271, longitude: 115.7963953 };

async function stubAndroidShell(page) {
  await page.addInitScript((coords) => {
    window.__pluginCalls = [];
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "android",
      Plugins: {
        Geolocation: {
          getCurrentPosition(options = {}) {
            window.__pluginCalls.push({ maximumAge: options.maximumAge, at: Date.now() });
            if (!(options.maximumAge >= 30000)) {
              return new Promise(() => {}); // fresh-only request: provider has nothing
            }
            return new Promise((resolve) =>
              setTimeout(
                () => resolve({ timestamp: Date.now() - 20000, coords: { ...coords, accuracy: 30 } }),
                200
              )
            );
          },
          async checkPermissions() {
            return { location: "granted", coarseLocation: "granted" };
          },
          async requestPermissions() {
            return { location: "granted", coarseLocation: "granted" };
          },
          async watchPosition() {
            return "0";
          },
          async clearWatch() {},
        },
      },
    };
    const fail = () => {
      window.__navigatorGeoCalls = (window.__navigatorGeoCalls || 0) + 1;
    };
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: fail, watchPosition: fail, clearWatch() {} },
    });
  }, WARWICK);
}

async function run() {
  let server;
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  try {
    server = await ensureDevServer();

    // (1) direct geo call, as Near me's open path makes it.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await stubAndroidShell(page);
      await page.goto(`${BASE}/?test=1`);
      await page.waitForFunction(() => Boolean(window.nextTrainApp?.getAppGeolocationPosition));
      const result = await page.evaluate(async () => {
        const started = Date.now();
        try {
          const position = await window.nextTrainApp.getAppGeolocationPosition({
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 0,
          });
          return { ok: true, ms: Date.now() - started, lat: position.coords.latitude };
        } catch (error) {
          return { ok: false, ms: Date.now() - started, error: String(error?.message || error) };
        }
      });
      const calls = await page.evaluate(() => window.__pluginCalls.map((c) => c.maximumAge));
      if (!result.ok || result.ms >= 3000) {
        failures.push({ check: "maximumAge:0 request resolves < 3 s", result, calls });
      }
      if (!calls.includes(0)) {
        failures.push({ check: "fresh (maximumAge: 0) request is still issued", calls });
      }
      await context.close();
    }

    // (2) Near me open with a cached station.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await stubAndroidShell(page);
      await page.goto(`${BASE}/?reset=1&fixture=normal`);
      await page.waitForTimeout(400);
      await page.evaluate((key) => {
        localStorage.setItem(
          key,
          JSON.stringify({ station: "Edgewater Stn", city: "perth", distanceKm: 0.2, savedAtMs: Date.now() })
        );
        localStorage.setItem("nextTrainOnboardingDone", "1");
      }, CACHE_KEY);
      await page.reload();
      await page.waitForFunction(() => Boolean(window.nextTrainNearby?.enterNearbyMode));
      const started = Date.now();
      void page.evaluate(() => window.nextTrainNearby.enterNearbyMode());
      let station = null;
      while (Date.now() - started < 5000) {
        station = await page.evaluate(() => window.nextTrainNearby?.getNearbySession?.()?.station ?? null);
        if (station && station.includes("Warwick")) break;
        await page.waitForTimeout(150);
      }
      const ms = Date.now() - started;
      if (!(station && station.includes("Warwick"))) {
        failures.push({ check: "Near me swaps cached station to Warwick < 5 s", station, ms });
      }
      const navCalls = await page.evaluate(() => window.__navigatorGeoCalls || 0);
      if (navCalls !== 0) {
        failures.push({ check: "navigator.geolocation never called", navCalls });
      }
      await context.close();
    }

    if (failures.length) {
      console.error("FAIL geo-native-android-fast-fix:", JSON.stringify(failures, null, 2));
      process.exitCode = 1;
    } else {
      console.log("PASS geo-native-android-fast-fix");
    }
  } finally {
    await browser.close();
    await stopDevServer(server);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
