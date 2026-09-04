/**
 * First-use Near me wizard: Got it advances through all 3 steps (Near Me -> Routes ->
 * Journeys), then Maybe later dismisses the coach and marks onboarding done.
 * Usage: node qa/first-use-wizard-repro.mjs
 */
import { chromium } from "playwright";
import { advanceOnboardingToJourneysStep, waitForOnboardingStep1 } from "../helpers/onboarding.mjs";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -31.77, longitude: 115.99 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await waitForOnboardingStep1(page);

  const onboarding = await page.evaluate(() => ({
    step1Visible:
      !document.getElementById("onboarding-step-1")?.hidden &&
      !document.getElementById("onboarding-coach")?.hidden,
    heroText: document.getElementById("depart-display-time")?.textContent?.trim() ?? "",
  }));

  console.log("After onboarding ready:", onboarding);

  if (!onboarding.step1Visible) {
    console.error("FAIL — onboarding step 1 never appeared");
    await browser.close();
    process.exit(1);
  }

  await advanceOnboardingToJourneysStep(page);

  const afterTwoGotIts = await page.evaluate(() => ({
    step3Visible: document.getElementById("onboarding-step-3")?.hidden === false,
    coachVisible: document.getElementById("onboarding-coach")?.hidden === false,
    done: Boolean(localStorage.getItem("nextTrainOnboardingDone")),
  }));

  if (!afterTwoGotIts.step3Visible || !afterTwoGotIts.coachVisible || afterTwoGotIts.done) {
    console.error("FAIL — two Got its should land on step 3 (Journeys), still open", afterTwoGotIts);
    await browser.close();
    process.exit(1);
  }

  await page.locator("#onboarding-later-btn").click();
  await page.waitForTimeout(300);

  const afterLater = await page.evaluate(() => ({
    coachHidden: document.getElementById("onboarding-coach")?.hidden === true,
    done: Boolean(localStorage.getItem("nextTrainOnboardingDone")),
  }));

  await browser.close();

  if (!afterLater.coachHidden || !afterLater.done) {
    console.error("FAIL — Maybe later did not dismiss Near me wizard", afterLater);
    process.exit(1);
  }

  console.log("PASS — first-use Near me wizard advances through all 3 steps, dismisses on Maybe later");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
