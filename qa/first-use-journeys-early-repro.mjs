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

  // Open template picker via hero CTA or second Journeys tap.
  if (afterEarlyJourneys.heroSetup) {
    await page.locator("#hero-empty-add-btn").click();
  } else {
    await page.locator("#journeys-btn").click();
  }
  await page.waitForTimeout(600);

  await page.locator('[data-template="morning"]').click();
  await page.waitForTimeout(2500);

  const afterMorning = await page.evaluate(() => ({
    coachOpen: !document.getElementById("template-route-coach").hidden,
    detailOpen: !document.getElementById("settings-detail-view").hidden,
    wizardSeen: localStorage.getItem("nextTrainTemplateWizardSeen"),
    onboardingComplete: localStorage.getItem("nextTrainOnboardingComplete"),
  }));

  console.log("After Morning:", afterMorning);
  await browser.close();

  if (!afterMorning.coachOpen) {
    console.error("FAIL — template wizard missing after early Journeys path");
    process.exit(1);
  }

  console.log("PASS — template wizard shows on alternate first-use path");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
