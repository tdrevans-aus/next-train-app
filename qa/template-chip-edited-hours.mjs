/**
 * Template chips hide when a preset journey exists — even if Active hours were edited.
 * Usage: node qa/template-chip-edited-hours.mjs
 */
import { chromium } from "playwright";

import { BASE } from "./helpers/dev-server.mjs";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(800);

  await page.evaluate(() => {
    const settings = {
      settingsSchemaVersion: 2,
      leaveBeforeMinutes: 10,
      refreshSeconds: 30,
      activeJourneyId: "j-evening",
      journeys: [
        {
          id: "j-morning",
          name: "Morning into town",
          station: "Warwick Stn",
          direction: "Perth",
          leaveBeforeMinutes: 10,
          useLeaveBefore: true,
          defaultFrom: "06:00",
          defaultUntil: "09:00",
          preferredTrainTime: "",
          remindDays: [1, 2, 3, 4, 5],
          remindMe: false,
        },
        {
          id: "j-evening",
          name: "Evening home",
          station: "High Wycombe Stn",
          direction: "Claremont",
          leaveBeforeMinutes: 10,
          useLeaveBefore: true,
          defaultFrom: "16:00",
          defaultUntil: "19:00",
          preferredTrainTime: "",
          remindDays: [1, 2, 3, 4, 5],
          remindMe: false,
        },
      ],
    };
    localStorage.setItem("nextTrainSettings", JSON.stringify(settings));
    localStorage.setItem("nextTrainOnboardingDone", "1");
    localStorage.setItem("nextTrainTemplateWizardSeen", "1");
  });

  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.nextTrainApp.openJourneysLibrary());
  await page.waitForTimeout(500);

  const chips = await page.evaluate(() => ({
    morningHidden: document.querySelector('[data-template="morning"]')?.hidden === true,
    eveningHidden: document.querySelector('[data-template="evening"]')?.hidden === true,
    customHidden: document.querySelector('[data-template="custom"]')?.hidden === true,
    setupVisible: !document.getElementById("journey-setup-btn")?.hidden,
  }));

  await browser.close();

  const pass =
    chips.morningHidden && chips.eveningHidden && chips.customHidden && chips.setupVisible;
  if (pass) {
    console.log(
      "PASS — Morning/Evening shortcuts hidden; Add a journey visible (edited hours OK)"
    );
  } else {
    console.error("FAIL — template chip visibility wrong", chips);
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
