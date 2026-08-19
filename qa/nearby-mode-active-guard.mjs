/**
 * CAPACITOR-T — isNearbyModeActive must not throw when nextTrainNearby is missing.
 * Usage: node qa/nearby-mode-active-guard.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e?.message ?? e)));

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForFunction(() => typeof window.nextTrainNearby?.isNearbyModeActive === "function");

  const healthy = await page.evaluate(() => {
    const active = isNearbyModeActive();
    return { activeType: typeof active, active };
  });
  if (healthy.activeType !== "boolean") {
    throw new Error(`expected boolean from isNearbyModeActive, got ${healthy.activeType}`);
  }

  const guarded = await page.evaluate(() => {
    const prior = window.nextTrainNearby;
    window.nextTrainNearby = undefined;
    let threw = null;
    let value = null;
    try {
      value = isNearbyModeActive();
    } catch (error) {
      threw = String(error?.message ?? error);
    }
    window.nextTrainNearby = prior;
    return { threw, value, valueType: typeof value };
  });

  if (guarded.threw) {
    throw new Error(`isNearbyModeActive threw after clearing nextTrainNearby: ${guarded.threw}`);
  }
  if (guarded.valueType !== "boolean") {
    throw new Error(`expected boolean fallback, got ${guarded.valueType}`);
  }

  const crash = pageErrors.find((msg) =>
    /isNearbyModeActive|Cannot read properties of undefined/i.test(msg)
  );
  if (crash) {
    throw new Error(crash);
  }
  if (pageErrors.length) {
    throw new Error(`page errors: ${pageErrors.join("; ")}`);
  }

  console.log("PASS nearby-mode-active-guard");
  await browser.close();
}

run().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
