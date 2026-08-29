/**
 * User taps Journeys before onboarding delay — template wizard should still appear.
 * Usage: node qa/first-use-journeys-early-repro.mjs
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
  // Board loads quickly; tap Journeys before 4s onboarding delay.
  await page.waitForTimeout(1500);
  await page.locator("#journeys-btn").click();
  await page.waitForTimeout(400);

  const afterEarlyJourneys = await page.evaluate(() => ({
    onboardingVisible: !document.getElementById("onboarding-coach")?.hidden,
    onboardingComplete: localStorage.getItem("nextTrainOnboardingComplete"),
    deferred: sessionStorage.getItem("nextTrainOnboardingDeferred"),
    journeysOpen: document.getElementById("journeys-dialog")?.open,
    heroSetup: document.getElementById("hero")?.classList.contains("hero-setup"),
  }));
  console.log("After early Journeys tap:", afterEarlyJourneys);

  if (afterEarlyJourneys.heroSetup) {
    await page.locator("#hero-empty-add-btn").click();
  } else {
    await page.evaluate(() => window.nextTrainApp.openJourneysLibrary?.());
    await page.waitForTimeout(400);
    await page.locator('[data-template="morning"]').click();
  }
  await page.waitForTimeout(2500);

  const afterMorning = await page.evaluate(() => ({
    coachOpen: !document.getElementById("template-route-coach").hidden,
    detailOpen: !document.getElementById("settings-detail-view").hidden,
    wizardSeen: localStorage.getItem("nextTrainTemplateWizardSeen"),
    onboardingComplete: localStorage.getItem("nextTrainOnboardingComplete"),
    journeyName: document.getElementById("detail-journey-name")?.value,
    coachTitle: document.getElementById("template-wizard-step-1-title")?.textContent?.trim(),
  }));

  console.log("After Morning:", afterMorning);
  await browser.close();

  if (!afterMorning.coachOpen) {
    console.error("FAIL — template wizard missing after early Journeys path");
    process.exit(1);
  }

  if (afterMorning.journeyName !== "Morning into town") {
    console.error(
      "FAIL — first journey from hero Add should use Morning into town, got:",
      afterMorning.journeyName
    );
    process.exit(1);
  }

  if (afterMorning.coachTitle !== "Station picked for you") {
    console.error("FAIL — expected Morning route coach, got:", afterMorning.coachTitle);
    process.exit(1);
  }

  console.log("PASS — template wizard shows on alternate first-use path");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
