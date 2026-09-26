/**
 * jim-brief-ios-webkit-location-prompt — inside the native shell
 * (Capacitor.isNativePlatform() true), every location read must go through
 * window.NextTrainGeo (the Capacitor Geolocation plugin bridge), never
 * navigator.geolocation directly. A direct navigator.geolocation call from
 * WKWebView shows a *second*, website-style permission panel on top of the
 * native iOS prompt, and can block first paint on a warm relaunch.
 *
 * This stubs a native Capacitor shell (window.Capacitor.isNativePlatform() =>
 * true, with a fake Plugins.Geolocation so the bridge resolves without a real
 * device) and instruments navigator.geolocation.getCurrentPosition so any
 * direct call fails the run — then exercises every native location-read path:
 * city-session.js's boot-time region hint (geolocateHint), app.js's
 * getAppGeolocationPosition, and nearby-mode.js's relocate loop (via
 * getAppGeolocationPosition, the only position source nearby-mode uses).
 *
 * Usage: node qa/geo-native-shell.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer, BASE } from "./helpers/dev-server.mjs";

const FAKE_COORDS = { latitude: -31.951, longitude: 115.8605 };

async function stubNativeShell(page) {
  await page.addInitScript((coords) => {
    // Fake native Capacitor shell + a Plugins.Geolocation the geo-bundle.js
    // registerPlugin shim picks up (public/index.html's inline shim returns
    // Cap.Plugins[name] when it already exists — see capacitorCoreModule()).
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "ios",
      Plugins: {
        Geolocation: {
          async getCurrentPosition() {
            window.__qaNativeGeoCalls = (window.__qaNativeGeoCalls || 0) + 1;
            return {
              timestamp: Date.now(),
              coords: { ...coords, accuracy: 5 },
            };
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

    // Any direct navigator.geolocation call in the native shell is the bug
    // this brief fixes — record it (and fail fast rather than hang the page
    // on WebKit's actual permission prompt, which never resolves headless).
    const failCall = (label) => (...args) => {
      window.__qaNavigatorGeoCalls = (window.__qaNavigatorGeoCalls || 0) + 1;
      console.error(`[qa] navigator.geolocation.${label} called directly in native shell`);
      const onError = args[1];
      if (typeof onError === "function") {
        onError({ code: 1, message: "navigator.geolocation blocked in QA native-shell stub" });
      }
    };
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: failCall("getCurrentPosition"),
        watchPosition: failCall("watchPosition"),
        clearWatch() {},
      },
    });
  }, FAKE_COORDS);
}

async function run() {
  let spawned;
  const browser = await chromium.launch({ headless: true });
  try {
    spawned = await ensureDevServer();

    const context = await browser.newContext();
    const page = await context.newPage();
    await stubNativeShell(page);
    await page.goto(`${BASE}/?test=1`);
    await page.waitForFunction(
      () =>
        Boolean(window.nextTrainApp?.getAppGeolocationPosition) &&
        Boolean(window.NextTrainCitySession?.geolocateHint) &&
        Boolean(window.Capacitor?.isNativePlatform?.())
    );

    // 1. city-session.js's boot-time region hint.
    const hintResult = await page.evaluate(async () => {
      try {
        const hint = await window.NextTrainCitySession.geolocateHint();
        return { ok: true, hint };
      } catch (error) {
        return { ok: false, error: String(error?.message || error) };
      }
    });

    // 2. app.js's shared native geolocation entry point.
    const appResult = await page.evaluate(async () => {
      try {
        const position = await window.nextTrainApp.getAppGeolocationPosition({
          timeout: 4000,
          maximumAge: 300000,
        });
        return { ok: true, hasCoords: Boolean(position?.coords) };
      } catch (error) {
        return { ok: false, error: String(error?.message || error) };
      }
    });

    const counts = await page.evaluate(() => ({
      native: window.__qaNativeGeoCalls || 0,
      navigatorDirect: window.__qaNavigatorGeoCalls || 0,
    }));

    await context.close();

    const results = { hintResult, appResult, counts };
    const pass =
      counts.navigatorDirect === 0 &&
      counts.native >= 2 &&
      appResult.ok &&
      appResult.hasCoords;

    if (!pass) {
      console.error("FAIL geo-native-shell:", JSON.stringify(results, null, 2));
      process.exit(1);
    }
    console.log("PASS geo-native-shell:", JSON.stringify(results));
  } finally {
    await browser.close();
    await stopDevServer(spawned);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
