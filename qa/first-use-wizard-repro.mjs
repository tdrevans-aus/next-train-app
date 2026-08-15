/**
 * Full first-use: onboarding coach → Set up → Morning template wizard.
 * Usage: node qa/first-use-wizard-repro.mjs
 */
import { chromium } from "playwright";
import { waitForOnboardingStep1 } from "./helpers/onboarding.mjs";

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

  await page.locator("#onboarding-got-it-btn").click();
  await page.waitForTimeout(300);
  await page.locator("#onboarding-setup-btn").click();
  await page.waitForTimeout(2500);

  const afterMorning = await page.evaluate(() => ({
    coachOpen: !document.getElementById("template-route-coach").hidden,
    detailOpen: !document.getElementById("settings-detail-view").hidden,
    wizardSeen: localStorage.getItem("nextTrainTemplateWizardSeen"),
    configuredCount: JSON.parse(localStorage.getItem("nextTrainSettings") || "{}").journeys?.filter(
      (j) => j.station && j.direction
    ).length,
    coachTitle: document.getElementById("template-wizard-step-name-title")?.textContent?.trim(),
  }));

  console.log("After Morning tap:", afterMorning);

  await browser.close();

  if (!afterMorning.coachOpen) {
    console.error("FAIL — template wizard did not appear on first Morning setup");
    process.exit(1);
  }

  console.log("PASS — full first-use wizard flow");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
