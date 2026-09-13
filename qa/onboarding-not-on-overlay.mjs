/**
 * Onboarding coach must not appear over Help/Menu/Journeys overlays.
 * Usage: node qa/onboarding-not-on-overlay.mjs
 */
import { chromium } from "playwright";

import { BASE } from "./helpers/dev-server.mjs";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -31.95, longitude: 115.86 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    localStorage.removeItem("nextTrainOnboardingDone");
    sessionStorage.removeItem("nextTrainOnboardingDefer");
    document.getElementById("onboarding-coach")?.setAttribute("hidden", "");
  });

  await page.locator("#menu-btn").click();
  await page.waitForTimeout(300);
  await page.locator("#menu-help-btn").click();
  await page.waitForTimeout(300);

  const helpOpen = await page.evaluate(
    () => Boolean(document.getElementById("help-dialog")?.open || document.getElementById("help-dialog")?.hasAttribute("open"))
  );

  await page.waitForTimeout(6000);

  const state = await page.evaluate(() => ({
    helpOpen:
      Boolean(document.getElementById("help-dialog")?.open) ||
      document.getElementById("help-dialog")?.hasAttribute("open"),
    coachVisible: document.getElementById("onboarding-coach")?.hidden === false,
  }));

  await browser.close();

  if (!helpOpen) {
    console.error("FAIL onboarding-not-on-overlay — help did not open");
    process.exit(1);
  }

  if (state.coachVisible) {
    console.error("FAIL onboarding-not-on-overlay — coach visible over help");
    process.exit(1);
  }

  console.log("PASS onboarding-not-on-overlay");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
