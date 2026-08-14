/**
 * Got it on step 1 must advance to step 2 and not loop back to Near Me after defer timer.
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
    step1Hidden: document.getElementById("onboarding-step-1")?.hidden,
    step2Visible: !document.getElementById("onboarding-step-2")?.hidden,
    coachStep: document.getElementById("onboarding-coach")?.classList.contains("onboarding-coach--step-2"),
    onboardingStep: sessionStorage.getItem("nextTrainOnboardingStep"),
  }));

  if (!afterGotIt.step2Visible || !afterGotIt.coachStep || afterGotIt.onboardingStep !== "2") {
    await browser.close();
    console.error("FAIL onboarding-got-it-no-loop — did not advance to step 2", afterGotIt);
    process.exit(1);
  }

  // Old bug: defer timer fired ~8s after Got it and reset to step 1.
  await page.waitForTimeout(8500);

  const afterWait = await page.evaluate(() => ({
    step1Visible: !document.getElementById("onboarding-step-1")?.hidden,
    step2Visible: !document.getElementById("onboarding-step-2")?.hidden,
    coachStep1: document.getElementById("onboarding-coach")?.classList.contains("onboarding-coach--step-1"),
    coachStep2: document.getElementById("onboarding-coach")?.classList.contains("onboarding-coach--step-2"),
    onboardingStep: sessionStorage.getItem("nextTrainOnboardingStep"),
  }));

  await browser.close();

  if (afterWait.coachStep1 || afterWait.step1Visible || !afterWait.step2Visible || !afterWait.coachStep2) {
    console.error("FAIL onboarding-got-it-no-loop — looped back to step 1", afterWait);
    process.exit(1);
  }

  console.log("PASS onboarding-got-it-no-loop");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
