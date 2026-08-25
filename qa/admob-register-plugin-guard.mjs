/**
 * CAPACITOR-15 — ads-bundle must not throw "Capacitor plugin AdMob is not available"
 * when Cap exists without Plugins.AdMob / withPlugin (incomplete native bridge).
 * Usage: node qa/admob-register-plugin-guard.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e?.message ?? e)));

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForFunction(() => Boolean(window.NextTrainAdsNative?.showNativeBanner));

  const healthy = pageErrors.find((msg) =>
    /Capacitor plugin ["']AdMob["'] is not available/i.test(msg)
  );
  if (healthy) {
    throw new Error(`unexpected AdMob register error on normal load: ${healthy}`);
  }

  const incompleteBridge = await page.evaluate(async () => {
    // Simulate getGlobalJS-only Cap (Plugins empty, no withPlugin) then reload ads-bundle.
    window.Capacitor = {
      DEBUG: true,
      isLoggingEnabled: false,
      Plugins: {},
      isNativePlatform: () => true,
      getPlatform: () => "android",
    };
    delete window.NextTrainAdsNative;

    const existing = document.querySelector('script[src="ads-bundle.js"]');
    if (existing) {
      existing.remove();
    }

    let loadError = null;
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `ads-bundle.js?guard=${Date.now()}`;
        script.onload = resolve;
        script.onerror = () => reject(new Error("ads-bundle failed to load"));
        document.body.appendChild(script);
      });
    } catch (error) {
      loadError = String(error?.message ?? error);
    }

    let registerThrew = null;
    let hasShow = false;
    try {
      hasShow = typeof window.NextTrainAdsNative?.showNativeBanner === "function";
      if (hasShow) {
        await window.NextTrainAdsNative.showNativeBanner({
          admobAppId: "ca-app-pub-test~1",
          admobBannerId: "ca-app-pub-test/1",
          admobTestMode: true,
        });
      }
    } catch (error) {
      registerThrew = String(error?.message ?? error);
    }

    return {
      loadError,
      hasShow,
      registerThrew,
      pluginsHasAdMob: Boolean(window.Capacitor?.Plugins?.AdMob),
    };
  });

  if (incompleteBridge.loadError) {
    throw new Error(`ads-bundle reload failed: ${incompleteBridge.loadError}`);
  }
  if (!incompleteBridge.hasShow) {
    throw new Error("NextTrainAdsNative.showNativeBanner missing after incomplete Cap reload");
  }
  if (/Capacitor plugin ["']AdMob["'] is not available/i.test(incompleteBridge.registerThrew || "")) {
    throw new Error(`registerPlugin still throws CAPACITOR-15: ${incompleteBridge.registerThrew}`);
  }
  // Soft failure when native AdMob is not linked — caught path, not page crash.
  if (
    incompleteBridge.registerThrew &&
    !/not linked|not implemented/i.test(incompleteBridge.registerThrew)
  ) {
    throw new Error(`unexpected showNativeBanner error: ${incompleteBridge.registerThrew}`);
  }

  const crash = pageErrors.find((msg) =>
    /Capacitor plugin ["']AdMob["'] is not available/i.test(msg)
  );
  if (crash) {
    throw new Error(crash);
  }

  console.log("PASS admob-register-plugin-guard");
  await browser.close();
}

run().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
