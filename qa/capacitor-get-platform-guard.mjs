/**
 * CAPACITOR-19 — analytics-bundle (@sentry/capacitor) must not throw
 * "Capacitor.getPlatform is not a function" when Cap is the partial native
 * bridge object (Plugins/PluginHeaders only; @capacitor/core JS never ran).
 * Usage: node qa/capacitor-get-platform-guard.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e?.message ?? e)));

  // Healthy web load first.
  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForFunction(() => Boolean(window.NextTrainAnalyticsNative?.initAnalytics));

  const healthyCrash = pageErrors.find((msg) =>
    /getPlatform is not a function/i.test(msg)
  );
  if (healthyCrash) {
    throw new Error(`unexpected getPlatform crash on normal load: ${healthyCrash}`);
  }

  // Incomplete native Cap: Plugins present, no getPlatform (createCapacitor never ran).
  const incomplete = await page.evaluate(async () => {
    window.androidBridge = window.androidBridge || { postMessage() {} };
    window.Capacitor = {
      Plugins: {},
      PluginHeaders: [{ name: "SentryCapacitor" }],
      // deliberately omit getPlatform / isNativePlatform
    };
    delete window.NextTrainAnalyticsNative;

    // Re-install require shim path: call the page's require after Cap mutation.
    // The shim reads window.Capacitor on each require("@capacitor/core").
    const core = typeof require === "function" ? require("@capacitor/core") : null;
    const platformFromShim =
      core && typeof core.Capacitor?.getPlatform === "function"
        ? core.Capacitor.getPlatform()
        : null;
    const isNativeFromShim =
      core && typeof core.Capacitor?.isNativePlatform === "function"
        ? core.Capacitor.isNativePlatform()
        : null;

    const existing = document.querySelector('script[src*="analytics-bundle.js"]');
    if (existing) {
      existing.remove();
    }

    let loadError = null;
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `analytics-bundle.js?guard=${Date.now()}`;
        script.onload = resolve;
        script.onerror = () => reject(new Error("analytics-bundle failed to load"));
        document.body.appendChild(script);
      });
    } catch (error) {
      loadError = String(error?.message ?? error);
    }

    return {
      loadError,
      platformFromShim,
      isNativeFromShim,
      hasInit: typeof window.NextTrainAnalyticsNative?.initAnalytics === "function",
      capGetPlatformType: typeof window.Capacitor?.getPlatform,
    };
  });

  if (incomplete.loadError) {
    throw new Error(`analytics-bundle reload failed: ${incomplete.loadError}`);
  }
  if (incomplete.platformFromShim !== "android") {
    throw new Error(
      `shim getPlatform expected "android", got ${JSON.stringify(incomplete.platformFromShim)}`
    );
  }
  if (incomplete.isNativeFromShim !== true) {
    throw new Error(`shim isNativePlatform expected true, got ${incomplete.isNativeFromShim}`);
  }
  if (incomplete.capGetPlatformType !== "function") {
    throw new Error("Cap.getPlatform was not polyfilled on incomplete native Cap");
  }
  if (!incomplete.hasInit) {
    throw new Error("NextTrainAnalyticsNative.initAnalytics missing after incomplete Cap reload");
  }

  const crash = pageErrors.find((msg) => /getPlatform is not a function/i.test(msg));
  if (crash) {
    throw new Error(crash);
  }

  console.log("PASS capacitor-get-platform-guard");
  await browser.close();
}

run().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
