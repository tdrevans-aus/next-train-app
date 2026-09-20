/**
 * docs/jim-brief-ads-init-missed-load-event.md: ads.js is loaded deferred,
 * after first train paint (public/index.html's NextTrainDeferred.load(),
 * triggered from public/app.js / public/nearby-mode.js). By then
 * document.readyState is already "complete", so a bare
 * `window.addEventListener("load", ...)` in ads.js never fires and no ad
 * ever initialises — the first public Play release (3.0.3) shipped with
 * zero ad requests.
 *
 * This script reproduces the production order exactly: navigate, wait for
 * document.readyState === "complete", THEN trigger
 * `window.NextTrainDeferred.load()` (loading ads.js after "load" already
 * fired) and asserts ads initialisation actually ran.
 *
 * To see it fail: restore the bare
 *   window.addEventListener("load", () => { installOverlayAdGuard(); ... });
 * in public/ads.js (i.e. revert the `document.readyState === "complete"`
 * check this script guards). Both cases below fail on that version.
 *
 * Case 1 (web): #ad-container is un-hidden and rendered. This fixture's
 * public/site-config.json has no AdSense client/slot configured, so the web
 * path (initWebAds -> renderPlaceholderAd) renders the "Ad preview"
 * placeholder rather than a real AdSense unit — that placeholder appearing
 * is the observable proxy for "ads initialised" on web.
 *
 * Case 2 (native): with window.Capacitor.isNativePlatform() stubbed true and
 * a stubbed window.NextTrainAdsNative, the same late-load order results in
 * exactly one showNativeBanner call (public/site-config.json's fixture has
 * real-looking admobAppId/admobBannerId, so the native path is taken).
 *
 * Also checks (case 1 fixture) that the startup block runs exactly once:
 * dispatching an extra "load" event afterwards must not init ads again
 * (no extra /site-config.json fetch).
 *
 * Usage: node qa/ads-init-after-deferred-load.mjs
 */
import { chromium } from "playwright";

import { BASE } from "./helpers/dev-server.mjs";

const VIEWPORT = { width: 390, height: 844 };

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  }
}

async function triggerDeferredAfterLoad(page) {
  // page.goto's default waitUntil is "load", so by the time it resolves the
  // window "load" event has already fired — exactly the production race.
  await page.waitForFunction(() => document.readyState === "complete");
  await page.evaluate(() => window.NextTrainDeferred?.load?.());
  await page.evaluate(() => window.NextTrainDeferred?.whenReady?.());
}

async function runWebCase() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize(VIEWPORT);

  // Several scripts fetch /site-config.json (analytics, ad-free-purchase,
  // app.js), so counting that request isn't a clean signal for "ads init ran
  // once". Instead, count calls to ads.js's own initAdsWork() by wrapping
  // fetch and keeping only the calls whose stack traces back to ads.js.
  await page.addInitScript(() => {
    window.__adsFetchCalls = 0;
    const originalFetch = window.fetch.bind(window);
    window.fetch = (...args) => {
      const url = String(args[0] ?? "");
      if (url.endsWith("/site-config.json")) {
        const stack = new Error().stack ?? "";
        if (stack.includes("ads.js")) {
          window.__adsFetchCalls += 1;
        }
      }
      return originalFetch(...args);
    };
  });

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await triggerDeferredAfterLoad(page);

  const state = await page
    .waitForFunction(
      () => {
        const container = document.getElementById("ad-container");
        return container && !container.hidden && container.innerHTML.trim().length > 0;
      },
      { timeout: 5000 }
    )
    .then(() => true)
    .catch(() => false);

  const result = await page.evaluate(() => {
    const container = document.getElementById("ad-container");
    return {
      hidden: container?.hidden,
      hasPlaceholder: Boolean(container?.querySelector(".ad-placeholder")),
      html: container?.innerHTML ?? null,
    };
  });

  assert(
    state && result.hidden === false && result.hasPlaceholder,
    `web: expected #ad-container un-hidden with .ad-placeholder after readyState-complete deferred load, got ${JSON.stringify(result)}`
  );
  const adsFetchCalls = await page.evaluate(() => window.__adsFetchCalls ?? 0);
  assert(
    adsFetchCalls === 1,
    `web: expected exactly 1 ads.js-originated /site-config.json fetch (ads init runs once), got ${adsFetchCalls}`
  );

  // AC3: dispatching a late "load" event must not run ads init a second time.
  await page.evaluate(() => window.dispatchEvent(new Event("load")));
  await page.waitForTimeout(300);
  const adsFetchCallsAfterExtraLoad = await page.evaluate(() => window.__adsFetchCalls ?? 0);
  assert(
    adsFetchCallsAfterExtraLoad === 1,
    `web: a second "load" event must not re-init ads, got ${adsFetchCallsAfterExtraLoad} ads.js-originated /site-config.json fetch(es)`
  );

  await browser.close();
}

async function runNativeCase() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize(VIEWPORT);

  await page.addInitScript(() => {
    window.__nativeBannerCalls = [];
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "android",
      Plugins: {},
      withPlugin() {
        return {};
      },
    };
  });

  // public/index.html's deferred script list always loads the real
  // ads-bundle.js, which would clobber a stub set via addInitScript before
  // ads.js's own ensureNativeAdsBridge() checks it. Serve a stub bundle
  // instead so ads.js's real code path (initNativeAds -> showNativeBanner)
  // runs against a fake native bridge, per the brief's "reuse the existing
  // __setAdMobClientForTests seam where practical" — that seam lives in
  // web-sources/ads-native.mjs, which is exactly what ads-bundle.js is built
  // from, so this stub mirrors its public shape (showNativeBanner et al.).
  await page.route("**/ads-bundle.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.NextTrainAdsNative = {
        async showNativeBanner(config) {
          window.__nativeBannerCalls.push(config ?? null);
        },
        async hideNativeBanner() {},
        async resumeNativeBanner() {},
      };`,
    })
  );

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.evaluate(() => document.body.classList.add("native-app"));
  await triggerDeferredAfterLoad(page);

  await page
    .waitForFunction(() => (window.__nativeBannerCalls ?? []).length >= 1, { timeout: 5000 })
    .catch(() => {});

  const callCount = await page.evaluate(() => (window.__nativeBannerCalls ?? []).length);
  assert(
    callCount === 1,
    `native: expected exactly 1 showNativeBanner call after readyState-complete deferred load, got ${callCount}`
  );

  // AC3 for the native path too.
  await page.evaluate(() => window.dispatchEvent(new Event("load")));
  await page.waitForTimeout(300);
  const callCountAfterExtraLoad = await page.evaluate(
    () => (window.__nativeBannerCalls ?? []).length
  );
  assert(
    callCountAfterExtraLoad === 1,
    `native: a second "load" event must not call showNativeBanner again, got ${callCountAfterExtraLoad}`
  );

  await browser.close();
}

async function run() {
  await runWebCase();
  await runNativeCase();

  if (failures > 0) {
    console.error(`FAIL ads-init-after-deferred-load: ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log(
    "PASS ads-init-after-deferred-load: ads initialise on both web and native paths even when ads.js loads after window \"load\" has already fired"
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
