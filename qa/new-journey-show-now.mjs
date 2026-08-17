/**
 * New journey Save → show that journey on main (U-05 B).
 * Usage: node qa/new-journey-show-now.mjs
 */
import { chromium } from "playwright";
import { pickStationCombobox, waitForDetailStationCombobox } from "./helpers/station-combobox.mjs";
import { openCustomJourneyCreate } from "./helpers/open-custom-journey.mjs";
import { seedPersistedJourneys } from "./helpers/travel-library.mjs";

const BASE = "http://localhost:3000";

async function dismissCoach(page) {
  const skip = page.locator("#template-wizard-skip-btn");
  if (await skip.isVisible()) {
    await skip.click();
    await page.waitForTimeout(300);
  }
}

async function waitForStationOptions(page) {
  await waitForDetailStationCombobox(page);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -31.77, longitude: 115.99 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await seedPersistedJourneys(page, [
    {
      id: "j-evening",
      kind: "journey",
      name: "Evening home",
      station: "Perth Underground Stn",
      direction: "Mandurah",
      leaveBeforeMinutes: 10,
      useLeaveBefore: true,
      defaultFrom: "15:00",
      defaultUntil: "18:00",
      preferredTrainTime: "17:30",
      remindDays: [1, 2, 3, 4, 5],
      remindMe: false,
    },
    {
      id: "j-morning",
      kind: "journey",
      name: "Morning into town",
      station: "Edgewater Stn",
      direction: "Perth",
      leaveBeforeMinutes: 10,
      useLeaveBefore: true,
      defaultFrom: "06:00",
      defaultUntil: "09:00",
      preferredTrainTime: "07:30",
      remindDays: [1, 2, 3, 4, 5],
      remindMe: false,
    },
  ]);
  await page.reload();
  await page.waitForTimeout(1500);

  await openCustomJourneyCreate(page);
  await page.waitForTimeout(800);
  await dismissCoach(page);

  await waitForStationOptions(page);
  await page.locator("#detail-journey-name").fill("My custom trip");
  await pickStationCombobox(page, {
    rootSelector: "#detail-station-combobox",
    inputSelector: "#detail-station-input",
    listboxSelector: "#detail-station-listbox",
    station: "Edgewater Stn",
  });
  await page.waitForTimeout(1200);
  await page.selectOption("#detail-direction-select", { index: 1 });
  await page.locator("#detail-done-btn").click();
  await page.waitForTimeout(2000);

  const afterNewSave = await page.evaluate(() => {
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}");
    const overrideRaw = sessionStorage.getItem("nextTrainManualJourneyOverride");
    let overrideJourneyId = null;
    try {
      overrideJourneyId = overrideRaw ? JSON.parse(overrideRaw)?.journeyId ?? null : null;
    } catch {
      overrideJourneyId = null;
    }
    const journeyName =
      document.getElementById("journey-switcher-name")?.textContent?.trim() ??
      document.getElementById("journey-context-name")?.textContent?.trim() ??
      "";
    const custom = settings.journeys?.find((j) => j.name === "My custom trip");
    return {
      activeJourneyId: settings.activeJourneyId,
      customId: custom?.id ?? null,
      overrideJourneyId,
      journeyName,
    };
  });

  const newSavePass =
    afterNewSave.customId &&
    afterNewSave.activeJourneyId === afterNewSave.customId &&
    afterNewSave.journeyName.includes("My custom trip");

  if (newSavePass) {
    console.log("PASS — new Custom journey active on main after first Save");
  } else {
    console.error("FAIL — new journey not shown", afterNewSave);
    process.exitCode = 1;
  }

  await page.evaluate(() => window.nextTrainApp.openJourneysLibrary());
  await page.waitForTimeout(500);
  await page.locator(".journey-list-item").filter({ hasText: "Evening home" }).click();
  await page.waitForTimeout(400);
  await page.locator("#detail-journey-name").fill("Evening home edited");
  await page.locator("#detail-done-btn").click();
  await page.waitForTimeout(2000);

  const afterEditSave = await page.evaluate(() => {
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}");
    const custom = settings.journeys?.find((j) => j.name === "My custom trip");
    return {
      activeJourneyId: settings.activeJourneyId,
      customId: custom?.id ?? null,
      journeyName:
        document.getElementById("journey-switcher-name")?.textContent?.trim() ??
        document.getElementById("journey-context-name")?.textContent?.trim() ??
        "",
    };
  });

  if (afterEditSave.activeJourneyId === afterNewSave.customId) {
    console.log("PASS — editing Evening home did not steal active journey from Custom");
  } else {
    console.error("FAIL — edit forced switch away from Custom", afterEditSave);
    process.exitCode = 1;
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
