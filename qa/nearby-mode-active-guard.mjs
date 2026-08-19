/**
 * CAPACITOR-S — isNearbyModeActive must not throw when window.nextTrainNearby
 * is missing (TypeError: Cannot read properties of undefined reading
 * 'isNearbyModeActive').
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
  await page.waitForFunction(() => typeof isNearbyModeActive === "function");

  const probe = await page.evaluate(() => {
    const before = {
      hasModule: Boolean(window.nextTrainNearby),
      active: isNearbyModeActive(),
    };

    const saved = window.nextTrainNearby;
    window.nextTrainNearby = undefined;

    let afterActive = null;
    let threw = null;
    try {
      afterActive = isNearbyModeActive();
    } catch (error) {
      threw = String(error?.message ?? error);
    }

    window.nextTrainNearby = saved;

    return { before, afterActive, threw };
  });

  const crash = pageErrors.find((msg) =>
    /isNearbyModeActive/i.test(msg)
  );

  if (probe.threw) {
    throw new Error(`isNearbyModeActive threw without module: ${probe.threw}`);
  }
  if (probe.afterActive !== false) {
    throw new Error(`expected false when module missing, got ${probe.afterActive}`);
  }
  if (!probe.before.hasModule) {
    throw new Error("expected nextTrainNearby to be registered on a normal boot");
  }
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
