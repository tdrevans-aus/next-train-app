/**
 * Full first-use: onboarding coach → Set up a journey → Morning into town wizard.
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
    completed: localStorage.getItem("nextTrainOnboardingComplete"),
    deferred: sessionStorage.getItem("nextTrainOnboardingDeferred"),
    heroText: document.getElementById("depart-display-time")?.textContent?.trim() ?? "",
  }));

  console.log("After onboarding ready:", onboarding);

  if (!onboarding.step1Visible) {
    console.error("FAIL — onboarding step 1 never appeared");
    await browser.close();
    process.exit(1);
  }

  await advanceOnboardingToJourneysStep(page);
  await page.locator("#onboarding-setup-btn").click();
  await page.waitForTimeout(2500);

  const afterSetup = await page.evaluate(() => ({
    coachOpen: !document.getElementById("template-route-coach").hidden,
    detailOpen: !document.getElementById("settings-detail-view").hidden,
    wizardSeen: localStorage.getItem("nextTrainTemplateWizardSeen"),
    configuredCount: JSON.parse(localStorage.getItem("nextTrainSettings") || "{}").journeys?.filter(
      (j) => j.station && j.direction
    ).length,
    coachTitle: document.getElementById("template-wizard-step-1-title")?.textContent?.trim(),
  }));

  console.log("After Add a journey:", afterSetup);

  await browser.close();

  if (!afterSetup.coachOpen || !afterSetup.detailOpen) {
    console.error("FAIL — Morning into town wizard did not open from onboarding");
    process.exit(1);
  }

  if (afterSetup.coachTitle !== "Station picked for you") {
    console.error("FAIL — expected Morning into town wizard step 1, got:", afterSetup.coachTitle);
    process.exit(1);
  }

  console.log("PASS — full first-use Morning into town wizard");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
