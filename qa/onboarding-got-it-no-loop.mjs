/**
 * Got it on the Near me wizard must dismiss it and keep it dismissed.
 * Usage: node qa/onboarding-got-it-no-loop.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -31.77, longitude: 115.99 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await page.waitForTimeout(6000);

  if (!(await page.locator("#onboarding-step-1").isVisible())) {
    await browser.close();
    console.error("FAIL onboarding-got-it-no-loop — step 1 never appeared");
    process.exit(1);
  }

  await page.locator("#onboarding-got-it-btn").click();
  await page.waitForTimeout(300);

  const afterGotIt = await page.evaluate(() => ({
    coachHidden: document.getElementById("onboarding-coach")?.hidden === true,
    coachVisible: document.getElementById("onboarding-coach")?.hidden === false,
    step1Visible: document.getElementById("onboarding-step-1")?.hidden === false,
    done: Boolean(localStorage.getItem("nextTrainOnboardingDone")),
  }));

  if (!afterGotIt.coachHidden || afterGotIt.coachVisible || !afterGotIt.done) {
    await browser.close();
    console.error("FAIL onboarding-got-it-no-loop — Got it did not dismiss Near me wizard", afterGotIt);
    process.exit(1);
  }

  await page.waitForTimeout(8500);

  const afterWait = await page.evaluate(() => ({
    coachHidden: document.getElementById("onboarding-coach")?.hidden === true,
    coachVisible: document.getElementById("onboarding-coach")?.hidden === false,
    step1Visible:
      document.getElementById("onboarding-coach")?.hidden === false &&
      document.getElementById("onboarding-step-1")?.hidden === false,
    done: Boolean(localStorage.getItem("nextTrainOnboardingDone")),
  }));

  await browser.close();

  if (afterWait.coachVisible || afterWait.step1Visible || !afterWait.done || !afterWait.coachHidden) {
    console.error("FAIL onboarding-got-it-no-loop — Near me wizard came back", afterWait);
    process.exit(1);
  }

  console.log("PASS onboarding-got-it-no-loop — Got it dismissed and stayed dismissed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
