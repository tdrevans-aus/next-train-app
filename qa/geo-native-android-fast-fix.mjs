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
const EDGEWATER = { latitude: -31.7872, longitude: 115.7723 };

// mode "base": the original stub (no fresh answer, any maximumAge >= 30 s answers Warwick).
// mode "split": an old (100 s) cached Warwick fix for maximumAge >= 120 s in 100 ms; a
//   maximumAge === 30000 request is answered in 1.5 s with a 5 s-old Edgewater fix; a
//   maximumAge === 0 request is answered in 1.5 s with a brand-new Edgewater fix.
async function stubAndroidShell(page, mode = "base") {
  await page.addInitScript(([coords, edgewater, stubMode]) => {
    window.__pluginCalls = [];
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "android",
      Plugins: {
        Geolocation: {
          getCurrentPosition(options = {}) {
            window.__pluginCalls.push({ maximumAge: options.maximumAge, at: Date.now() });
            if (stubMode === "split") {
              const answer = (delay, age, c) =>
                new Promise((resolve) =>
                  setTimeout(
                    () => resolve({ timestamp: Date.now() - age, coords: { ...c, accuracy: 30 } }),
                    delay
                  )
                );
              if (options.maximumAge >= 120000) return answer(100, 100000, coords);
              if (options.maximumAge === 30000) return answer(1500, 5000, edgewater);
              if (options.maximumAge === 0) return answer(1500, 0, edgewater);
              return answer(1500, 0, edgewater);
            }
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
  }, [WARWICK, EDGEWATER, mode]);
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

    // (a) Travel mode (maximumAge: 30000) never gets a fix older than 30 s, even though a
    // 100 s-old fix is available 1.4 s sooner.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await stubAndroidShell(page, "split");
      await page.goto(`${BASE}/?test=1`);
      await page.waitForFunction(() => Boolean(window.nextTrainApp?.getAppGeolocationPosition));
      const result = await page.evaluate(async () => {
        const position = await window.nextTrainApp.getAppGeolocationPosition({
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 30000,
        });
        // The bridge returns { coords } only, so identify the fix by position: Warwick is the
        // 100 s-old cached fix, Edgewater the 5 s-old one a 30 s caller is entitled to.
        return { lat: position.coords.latitude };
      });
      const calls = await page.evaluate(() => window.__pluginCalls.map((c) => c.maximumAge));
      if (Math.abs(result.lat - -31.7872) > 0.001) {
        failures.push({ check: "(a) maximumAge:30000 never resolves with a fix older than 30 s", result, calls });
      }
      if (calls.some((age) => age > 30000)) {
        failures.push({ check: "(a) no native request wider than the caller's maximumAge", calls });
      }
      await context.close();
    }

    // (b) Open (maximumAge: 0) paints the quick station first, then swaps to the fresh fix's
    // station when it differs. No cache, so the first station can only come from the quick fix.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await stubAndroidShell(page, "split");
      await page.goto(`${BASE}/?reset=1&fixture=normal`);
      await page.waitForTimeout(400);
      await page.evaluate(() => localStorage.setItem("nextTrainOnboardingDone", "1"));
      await page.reload();
      await page.waitForFunction(() => Boolean(window.nextTrainNearby?.enterNearbyMode));
      const started = Date.now();
      void page.evaluate(() => window.nextTrainNearby.enterNearbyMode());
      const seen = [];
      while (Date.now() - started < 7000) {
        const station = await page.evaluate(() => window.nextTrainNearby?.getNearbySession?.()?.station ?? null);
        if (station && seen[seen.length - 1] !== station) seen.push(station);
        if (station && station.includes("Edgewater")) break;
        await page.waitForTimeout(50);
      }
      if (!(seen.length >= 2 && seen[0].includes("Warwick") && seen[seen.length - 1].includes("Edgewater"))) {
        failures.push({ check: "(b) open paints quick Warwick, then swaps to fresh Edgewater", seen });
      }
      await page.waitForTimeout(1200);
      const after = await page.evaluate(() => window.nextTrainNearby?.getNearbySession?.()?.station ?? null);
      if (!(after && after.includes("Edgewater"))) {
        failures.push({ check: "(b) station stays on the fresh fix", after });
      }
      const navCalls = await page.evaluate(() => window.__navigatorGeoCalls || 0);
      if (navCalls !== 0) failures.push({ check: "(b) navigator.geolocation never called", navCalls });
      const openCalls = await page.evaluate(() => window.__pluginCalls.map((c) => c.maximumAge));
      console.log(`INFO native getCurrentPosition calls on Near me open: ${openCalls.length} (${openCalls.join(", ")})`);
      await context.close();
    }

    // (c) Concurrent compatible callers share native requests instead of one each.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await stubAndroidShell(page, "split");
      await page.goto(`${BASE}/?test=1`);
      await page.waitForFunction(() => Boolean(window.nextTrainApp?.getAppGeolocationPosition));
      const same = await page.evaluate(async () => {
        const get = () =>
          window.nextTrainApp.getAppGeolocationPosition({ enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 });
        await Promise.all([get(), get(), get(), get()]);
        return window.__pluginCalls.length;
      });
      if (same !== 1) {
        failures.push({ check: "(c) 4 concurrent maximumAge:60000 calls issue 1 native request", nativeCalls: same });
      }
      await page.evaluate(() => (window.__pluginCalls.length = 0));
      const mixed = await page.evaluate(async () => {
        const get = (maximumAge) =>
          window.nextTrainApp.getAppGeolocationPosition({ enableHighAccuracy: false, timeout: 8000, maximumAge });
        // Near me locate (0), region hint (300 s), second locate, relocate-style (300 s).
        await Promise.all([get(0), get(300000), get(0), get(300000)]);
        return window.__pluginCalls.map((c) => c.maximumAge);
      });
      console.log(`INFO native calls for 4 concurrent open-time callers: ${mixed.length} (${mixed.join(", ")}); 4 identical maximumAge:60000 callers: ${same}`);
      if (mixed.length > 2) {
        failures.push({ check: "(c) 4 concurrent open-time callers issue <= 2 native requests (fresh + quick)", mixed });
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
