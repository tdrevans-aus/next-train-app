/**
 * First-use Near me wizard: Got it dismisses the coach.
 * Usage: node qa/first-use-wizard-repro.mjs
 */
import { chromium } from "playwright";
import { advanceOnboardingToJourneysStep, waitForOnboardingStep1 } from "./helpers/onboarding.mjs";

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

  const afterGotIt = await page.evaluate(() => ({
    coachHidden: document.getElementById("onboarding-coach")?.hidden === true,
    done: Boolean(localStorage.getItem("nextTrainOnboardingDone")),
  }));

  await browser.close();

  if (!afterGotIt.coachHidden || !afterGotIt.done) {
    console.error("FAIL — Got it did not dismiss Near me wizard", afterGotIt);
    process.exit(1);
  }

  console.log("PASS — first-use Near me wizard dismisses on Got it");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
