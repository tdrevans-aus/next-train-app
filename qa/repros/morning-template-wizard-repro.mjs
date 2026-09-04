/**
 * Repro: Near me Got it dismisses the first-use wizard (geo delay must not bring it back).
 * Usage: node qa/morning-template-wizard-repro.mjs
 */
import { chromium } from "playwright";
import { advanceOnboardingToJourneysStep } from "../helpers/onboarding.mjs";

const BASE = "http://localhost:3000";

async function runWizardPath({ geoDelayMs = 0, label }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -31.77, longitude: 115.99 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.addInitScript((delay) => {
    const orig = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    navigator.geolocation.getCurrentPosition = (success, error, options) => {
      setTimeout(() => {
        orig((pos) => success(pos), (err) => error?.(err), options);
      }, delay);
    };
  }, geoDelayMs);

  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await page.waitForTimeout(geoDelayMs + 6000);

  if (!(await page.locator("#onboarding-step-1").isVisible())) {
    await browser.close();
    return { label, error: "onboarding step 1 never appeared", geoDelayMs };
  }

  await advanceOnboardingToJourneysStep(page);
  await page.waitForTimeout(600);

  // Two Got its lands on step 3 (Journeys) — Maybe later is what actually dismisses.
  await page.locator("#onboarding-later-btn").click().catch(() => {});
  await page.waitForTimeout(300);

  const afterGotIt = await page.evaluate(() => ({
    coachHidden: document.getElementById("onboarding-coach")?.hidden === true,
    done: Boolean(localStorage.getItem("nextTrainOnboardingDone")),
  }));

  await page.waitForTimeout(Math.min(geoDelayMs + 2000, 4000));

  const later = await page.evaluate(() => ({
    coachVisible: document.getElementById("onboarding-coach")?.hidden === false,
    done: Boolean(localStorage.getItem("nextTrainOnboardingDone")),
  }));

  await browser.close();
  return {
    label,
    geoDelayMs,
    afterGotIt,
    later,
  };
}

const results = [
  await runWizardPath({ geoDelayMs: 0, label: "instant geo" }),
  await runWizardPath({ geoDelayMs: 2000, label: "2s geo (template)" }),
  await runWizardPath({ geoDelayMs: 5000, label: "5s geo (template)" }),
];

let failed = false;
for (const r of results) {
  console.log("\n===", r.label, "===");
  if (r.error) {
    console.log("ERROR:", r.error);
    failed = true;
    continue;
  }
  console.log("after Got it:", r.afterGotIt);
  console.log("later:", r.later);
  if (!r.afterGotIt.coachHidden || !r.afterGotIt.done || r.later.coachVisible || !r.later.done) {
    failed = true;
  }
}

if (failed) {
  console.error("FAIL morning-template-wizard-repro — Got it did not keep Near me dismissed");
  process.exit(1);
}

console.log("\nPASS morning-template-wizard-repro — Got it dismissed across geo delays");
