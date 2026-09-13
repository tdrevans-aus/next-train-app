/**
 * Custom journey Active days default to today's Perth weekday (U-06 A).
 * Usage: node qa/custom-active-days-today.mjs
 */
import { chromium } from "playwright";
import { openCustomJourneyCreate } from "./helpers/open-custom-journey.mjs";
import { seedPersistedJourneys } from "./helpers/travel-library.mjs";

import { BASE } from "./helpers/dev-server.mjs";

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

  try {
    await page.goto(`${BASE}/?test=1&fixture=normal`);
    await seedPersistedJourneys(page, [
      {
        id: "j-seed-morning",
        name: "Morning into town",
        station: "Edgewater Stn",
        direction: "Perth",
        leaveBeforeMinutes: 10,
        useLeaveBefore: true,
        kind: "journey",
        templateKey: "morning",
        defaultFrom: "06:00",
        defaultUntil: "09:00",
        preferredTrainTime: "07:30",
        remindDays: [1, 2, 3, 4, 5],
        remindMe: true,
      },
    ]);
    await page.reload();
    await page.waitForTimeout(1200);

    const today = await page.evaluate(() => window.nextTrainApp.getPerthDayOfWeekIso());

    await page.evaluate(() => window.nextTrainApp.enterJourneyMode());
    await page.waitForTimeout(400);
    await page.evaluate(() => window.nextTrainApp.openJourneysLibrary());
    await page.waitForTimeout(500);

    await openCustomJourneyCreate(page);
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
      customState.hint.includes("Which days do you travel");

    if (customPass) {
      console.log(`PASS — Custom defaults to today only (day ${today})`);
    } else {
      console.error("FAIL — Custom Active days", customState);
      process.exitCode = 1;
    }

    const toggleDay = today === 7 ? 6 : 7;
    await page.locator(`#detail-active-day-chips [data-day="${toggleDay}"]`).click();
    const afterToggle = await page.evaluate((day) => {
      const active = [...document.querySelectorAll("#detail-active-day-chips .remind-day-chip--active")].map(
        (chip) => Number(chip.dataset.day)
      );
      return { active, toggledDay: day };
    }, toggleDay);

    if (!afterToggle.active.includes(toggleDay)) {
      console.error("FAIL — Active day chip did not toggle", afterToggle);
      process.exitCode = 1;
    } else {
      console.log(`PASS — Active day chip toggles (day ${toggleDay})`);
    }

    await page.evaluate(() => window.nextTrainApp.openJourneysLibrary());
    await page.waitForTimeout(400);
    await page.locator(".journey-list-item").filter({ hasText: "Morning into town" }).click();
    await page.waitForTimeout(800);
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
      morningState.hint.includes("Which days do you travel");

    if (morningPass) {
      console.log("PASS — Morning stays Mon–Fri with default hint");
    } else {
      console.error("FAIL — Morning Active days", morningState);
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
