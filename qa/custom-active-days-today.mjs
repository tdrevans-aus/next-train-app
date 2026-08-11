/**
 * Custom journey Active days default to today's Perth weekday (U-06 A).
 * Usage: node qa/custom-active-days-today.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function dismissCoach(page) {
  const skip = page.locator("#template-wizard-skip-btn");
  if (await skip.isVisible()) {
    await skip.click();
    await page.waitForTimeout(300);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -31.77, longitude: 115.99 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.evaluate(() => {
    localStorage.setItem("nextTrainSettings", JSON.stringify({ journeys: [], activeJourneyId: null }));
    localStorage.setItem("nextTrainTemplateWizardSeen", "1");
    localStorage.setItem("nextTrainOnboardingDone", "1");
  });
  await page.reload();
  await page.waitForTimeout(1200);

  const today = await page.evaluate(() => window.nextTrainApp.getPerthDayOfWeekIso());

  await page.evaluate(() => window.nextTrainApp.enterJourneyMode());
  await page.waitForTimeout(400);
  await page.evaluate(() => window.nextTrainApp.openJourneys());
  await page.waitForTimeout(500);

  await page.locator('[data-template="custom"]').click();
  await page.waitForTimeout(800);
  await dismissCoach(page);

  const customState = await page.evaluate((expectedDay) => {
    const active = [...document.querySelectorAll("#detail-active-day-chips .remind-day-chip--active")].map(
      (chip) => Number(chip.dataset.day)
    );
    const hint = document.querySelector(".detail-active-days-hint")?.textContent?.trim() ?? "";
    return { active, hint, expectedDay };
  }, today);

  const customPass =
    customState.active.length === 1 &&
    customState.active[0] === today &&
    customState.hint.includes("Starts on today");

  if (customPass) {
    console.log(`PASS — Custom defaults to today only (day ${today})`);
  } else {
    console.error("FAIL — Custom Active days", customState);
    process.exitCode = 1;
  }

  await page.evaluate(() => window.nextTrainApp.openJourneys());
  await page.waitForTimeout(400);
  await page.locator('[data-template="morning"]').click();
  await page.waitForTimeout(2000);
  await dismissCoach(page);

  const morningState = await page.evaluate(() => {
    const active = [...document.querySelectorAll("#detail-active-day-chips .remind-day-chip--active")].map(
      (chip) => Number(chip.dataset.day)
    );
    const hint = document.querySelector(".detail-active-days-hint")?.textContent?.trim() ?? "";
    return { active, hint };
  });

  const morningPass =
    morningState.active.length === 5 &&
    morningState.active.every((day) => day >= 1 && day <= 5) &&
    !morningState.hint.includes("Starts on today");

  if (morningPass) {
    console.log("PASS — Morning stays Mon–Fri with default hint");
  } else {
    console.error("FAIL — Morning Active days", morningState);
    process.exitCode = 1;
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
