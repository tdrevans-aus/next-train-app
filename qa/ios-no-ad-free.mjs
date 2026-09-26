/**
 * docs/jim-brief-ios-remove-ad-free-purchase.md — Apple won't let Tim sell
 * the A$7.99 "Remove ads" one-time purchase on iOS without registering for
 * GST and an ABN, so the iOS app must ship with no ad-free purchase
 * anywhere: no CTA, no price, no paywall, no restore button, and no
 * StoreKit / NativePurchases calls at all. Android keeps the purchase
 * exactly as today.
 *
 * Stubs a native Capacitor shell (window.Capacitor.isNativePlatform() =>
 * true) the same way qa/geo-native-shell.mjs does, with an instrumented
 * fake Plugins.NativePurchases that public/index.html's inline
 * capacitorCoreModule() shim picks up (it returns Cap.Plugins[name] when
 * that key already exists, so the real @capgo/native-purchases plugin
 * registration in public/ad-free-bundle.js resolves to our fake instead of
 * throwing "not implemented").
 *
 * Checks with getPlatform: () => "ios":
 *  - the Menu ad-free section (#menu-ad-free-section), both its web hints,
 *    and the restore button are all hidden;
 *  - the under-banner "Remove ads" link (#ad-remove-link-wrap) is hidden;
 *  - window.NextTrainAdFree.isEntitled() is false;
 *  - calling openRemoveAdsDialog() does not open the paywall dialog
 *    (#ad-free-dialog);
 *  - the native purchase bundle (public/ad-free-bundle.js) is never
 *    injected, and zero calls land on the fake NativePurchases plugin.
 *
 * Checks with getPlatform: () => "android" (same script, so the gate is
 * platform-specific rather than a global kill):
 *  - the Menu ad-free section is shown and the CTA button renders;
 *  - the fake NativePurchases plugin does get called (billing lookup runs
 *    as before).
 *
 * Usage: node qa/ios-no-ad-free.mjs
 */
import { chromium } from "playwright";

import { ensureDevServer, stopDevServer, BASE } from "./helpers/dev-server.mjs";

async function stubNativeShell(page, platform) {
  await page.addInitScript((platform) => {
    const calls = [];
    window.__qaNativePurchaseCalls = calls;

    const record = (name) => (...args) => {
      calls.push(name);
      if (name === "isBillingSupported") {
        return Promise.resolve({ isBillingSupported: true });
      }
      if (name === "getProducts") {
        return Promise.resolve({
          products: [{ identifier: "com.tdrevans.nexttrain.adfree", priceString: "A$7.99" }],
        });
      }
      if (name === "getPurchases") {
        return Promise.resolve({ purchases: [] });
      }
      if (name === "purchaseProduct") {
        return Promise.resolve({ transactionId: "qa-fake" });
      }
      if (name === "restorePurchases") {
        return Promise.resolve({ purchases: [] });
      }
      return Promise.resolve({});
    };

    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => platform,
      Plugins: {
        NativePurchases: {
          isBillingSupported: record("isBillingSupported"),
          getProducts: record("getProducts"),
          getPurchases: record("getPurchases"),
          purchaseProduct: record("purchaseProduct"),
          restorePurchases: record("restorePurchases"),
        },
      },
    };
  }, platform);
}

function isHidden(el) {
  return el === null || el.hidden === true || el.hasAttribute("hidden");
}

async function runForPlatform(browser, platform) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await stubNativeShell(page, platform);
  await page.goto(`${BASE}/?test=1`);
  await page.waitForFunction(
    () => Boolean(window.NextTrainAdFree) && Boolean(window.Capacitor?.isNativePlatform?.())
  );
  await page.evaluate(() => window.NextTrainAdFree.ensureInit());

  // Exercise the one remaining user-reachable entry point directly — this
  // is the "paywall can't be opened by any path" assertion.
  await page.evaluate(() => window.NextTrainAdFree.openRemoveAdsDialog());
  await page.waitForTimeout(150);

  const result = await page.evaluate(() => {
    const section = document.getElementById("menu-ad-free-section");
    const webHint = document.getElementById("menu-ad-free-web-hint");
    const billingHint = document.getElementById("menu-ad-free-billing-hint");
    const restoreBtn = document.getElementById("menu-restore-purchase-btn");
    const ctaBtn = document.getElementById("menu-ad-free-cta-btn");
    const removeWrap = document.getElementById("ad-remove-link-wrap");
    const dialog = document.getElementById("ad-free-dialog");
    const bundleScript = document.querySelector('script[data-dynamic-src="ad-free-bundle.js"]');

    return {
      sectionHidden: section?.hidden ?? true,
      webHintHidden: webHint === null || webHint.hidden === true,
      billingHintHidden: billingHint === null || billingHint.hidden === true,
      restoreBtnHidden: restoreBtn === null || restoreBtn.hidden === true,
      ctaBtnHidden: ctaBtn === null || ctaBtn.hidden === true,
      removeWrapHidden: removeWrap === null || removeWrap.hidden === true,
      dialogOpen: Boolean(dialog?.open) || dialog?.hasAttribute("open"),
      bundleLoaded: bundleScript !== null,
      entitled: window.NextTrainAdFree.isEntitled(),
      nativePurchaseCalls: (window.__qaNativePurchaseCalls || []).slice(),
    };
  });

  await context.close();
  return result;
}

async function run() {
  let spawned;
  const browser = await chromium.launch({ headless: true });
  const failures = [];

  try {
    spawned = await ensureDevServer();

    const ios = await runForPlatform(browser, "ios");
    console.log("iOS result:", JSON.stringify(ios));

    if (!ios.sectionHidden) failures.push("iOS: #menu-ad-free-section must be hidden");
    if (!ios.webHintHidden) failures.push("iOS: #menu-ad-free-web-hint must be hidden");
    if (!ios.billingHintHidden) failures.push("iOS: #menu-ad-free-billing-hint must be hidden");
    if (!ios.restoreBtnHidden) failures.push("iOS: #menu-restore-purchase-btn must be hidden");
    if (!ios.removeWrapHidden) failures.push("iOS: #ad-remove-link-wrap must be hidden");
    if (ios.dialogOpen) failures.push("iOS: #ad-free-dialog must never open");
    if (ios.bundleLoaded) failures.push("iOS: ad-free-bundle.js must never be injected/loaded");
    if (ios.entitled !== false) failures.push("iOS: isEntitled() must be false");
    if (ios.nativePurchaseCalls.length !== 0) {
      failures.push(
        `iOS: expected zero NativePurchases calls, got ${JSON.stringify(ios.nativePurchaseCalls)}`
      );
    }

    const android = await runForPlatform(browser, "android");
    console.log("Android result:", JSON.stringify(android));

    if (android.sectionHidden) failures.push("Android: #menu-ad-free-section must still render");
    if (android.ctaBtnHidden) failures.push("Android: CTA button must still render");
    if (android.nativePurchaseCalls.length === 0) {
      failures.push("Android: expected the native purchase bridge to still be used (gate must be iOS-only, not global)");
    }

    if (failures.length > 0) {
      console.error("FAIL ios-no-ad-free:");
      for (const failure of failures) {
        console.error(`  - ${failure}`);
      }
      process.exit(1);
    }

    console.log("PASS ios-no-ad-free: iOS ships no ad-free purchase; Android unchanged");
  } finally {
    await browser.close();
    await stopDevServer(spawned);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
