/**
 * Repro: Custom template skips 3-step route coach; Morning shows it later.
 * Usage: node qa/custom-template-no-wizard-repro.mjs
 */
import { chromium } from "playwright";
import { openCustomJourneyCreate } from "./helpers/open-custom-journey.mjs";
import { waitForOnboardingStep1 } from "./helpers/onboarding.mjs";

const BASE = "http://localhost:3000";

async function coachState(page) {
  return page.evaluate(() => ({
    coachHidden: document.getElementById("template-route-coach").hidden,
    coachBody: document.getElementById("template-route-coach-body")?.textContent?.trim() ?? "",
    detailOpen: !document.getElementById("settings-detail-view").hidden,
    listOpen: !document.getElementById("settings-list-view").hidden,
  }));
}

async function dismissTemplateCoach(page) {
  for (let step = 0; step < 6; step++) {
    const visible = await page.evaluate(
      () => !document.getElementById("template-route-coach").hidden
    );
    if (!visible) break;
    await page.locator("#template-wizard-primary-btn").click();
    await page.waitForTimeout(200);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -31.77, longitude: 115.99 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await waitForOnboardingStep1(page);

  await page.locator("#onboarding-got-it-btn").click();
  await page.waitForTimeout(300);
  await page.locator("#onboarding-later-btn").click();
  await page.waitForTimeout(300);
  await page.evaluate(() => window.nextTrainApp.openJourneys());
  await page.waitForTimeout(400);

  await openCustomJourneyCreate(page);
  await page.waitForTimeout(1500);
  const afterCustom = await coachState(page);

  await dismissTemplateCoach(page);
  await page.locator("#settings-back").click();
  await page.waitForTimeout(400);

  await page.locator('[data-template="morning"]').click();
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    const snap = await coachState(page);
    if (!snap.coachHidden) break;
  }
  const afterMorning = await coachState(page);

  await browser.close();

  const bug =
    afterCustom.coachHidden &&
    !afterMorning.coachHidden &&
    afterMorning.coachBody.length > 0;
  const pass = !afterCustom.coachHidden && afterCustom.coachBody.length > 0;

  console.log("\nCustom template — no wizard repro\n");
  console.log("After Custom:", afterCustom);
  console.log("After Morning:", afterMorning);
  console.log(
    pass
      ? "\nPASS  Custom shows template route coach on first setup.\n"
      : bug
        ? "\nFAIL  Custom skips template route coach; Morning shows it on second template tap.\n"
        : "\nFAIL  Unexpected coach state.\n"
  );

  process.exit(pass ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
