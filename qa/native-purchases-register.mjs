/**
 * CAPACITOR-17 — registerPlugin("NativePurchases") must not throw when the
 * native plugin is missing from the Capacitor bridge (method calls may reject).
 * Usage: node qa/native-purchases-register.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e?.message ?? e)));

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForFunction(() => typeof window.NextTrainAdFree?.ensureNativeBridge === "function");

  // Simulate native shell without NativePurchases on Cap.Plugins (no withPlugin).
  const result = await page.evaluate(async () => {
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "android",
      Plugins: {},
    };
    window.NextTrainAdFreeNative = undefined;

    let registerThrew = null;
    try {
      const core = window.require("@capacitor/core");
      core.registerPlugin("NativePurchases", {
        web: async () => ({
          async isBillingSupported() {
            return { isBillingSupported: false };
          },
        }),
      });
    } catch (error) {
      registerThrew = String(error?.message ?? error);
    }

    const bridge = await window.NextTrainAdFree.ensureNativeBridge();
    let billing = null;
    let billingError = null;
    try {
      billing = bridge ? await bridge.isBillingSupported() : null;
    } catch (error) {
      billingError = String(error?.message ?? error);
    }

    return {
      registerThrew,
      hasBridge: Boolean(bridge?.isBillingSupported),
      billing,
      billingError,
    };
  });

  const pluginCrash = pageErrors.find((msg) =>
    /Capacitor plugin "NativePurchases" is not available/i.test(msg)
  );
  if (pluginCrash) {
    throw new Error(pluginCrash);
  }
  if (result.registerThrew) {
    throw new Error(`registerPlugin threw: ${result.registerThrew}`);
  }
  if (result.billingError) {
    throw new Error(`isBillingSupported threw: ${result.billingError}`);
  }
  if (result.billing !== false && result.billing !== null) {
    throw new Error(`expected billing false/null without native plugin, got ${result.billing}`);
  }

  console.log("PASS native-purchases-register");
  await browser.close();
}

run().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
