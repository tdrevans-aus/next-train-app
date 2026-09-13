/**
 * After an explicit region pick, skip first-use onboarding and the journey wizard.
 * Usage: node qa/region-explicit-skips-wizard.mjs
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
  await page.waitForFunction(() => window.NextTrainCitySession?.applyCity, null, {
    timeout: 15000,
  });

  await page.evaluate(async () => {
    localStorage.removeItem("nextTrainOnboardingDone");
    await window.NextTrainCitySession.applyCity("sydney", { persist: true, explicit: true });
  });

  await page.waitForTimeout(5000);

  const state = await page.evaluate(() => ({
    regionExplicit: window.NextTrainCitySession?.readRegionExplicit?.() === true,
    coachVisible: document.getElementById("onboarding-coach")?.hidden === false,
    templateVisible: document.getElementById("template-route-coach")?.hidden === false,
    shouldShowTemplate:
      window.nextTrainTemplateWizard?.shouldShowTemplateRouteCoach?.() === true,
  }));

  await browser.close();

  if (!state.regionExplicit) {
    console.error("FAIL region-explicit-skips-wizard — regionExplicit not set");
    process.exit(1);
  }
  if (state.coachVisible) {
    console.error("FAIL region-explicit-skips-wizard — onboarding coach shown after region change");
    process.exit(1);
  }
  if (state.templateVisible || state.shouldShowTemplate) {
    console.error("FAIL region-explicit-skips-wizard — template wizard still eligible");
    process.exit(1);
  }

  console.log("PASS region-explicit-skips-wizard");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
