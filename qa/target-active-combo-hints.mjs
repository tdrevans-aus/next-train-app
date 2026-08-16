/**
 * Target train should default journey window on custom commutes (±90 min).
 * Usage: node qa/target-active-combo-hints.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function openCustomJourneyDetail(page) {
  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.evaluate(() => {
    localStorage.setItem(
      "nextTrainSettings",
      JSON.stringify({
        refreshSeconds: 60,
        activeJourneyId: "j-custom",
        journeys: [
          {
            id: "j-custom",
            kind: "commute",
            templateKey: "custom",
            name: "Custom commute",
            station: "Edgewater Stn",
            direction: "Perth",
            leaveBeforeMinutes: 10,
            useLeaveBefore: true,
            defaultFrom: "",
            defaultUntil: "",
            preferredTrainTime: "",
            remindDays: [1, 2, 3, 4, 5],
            remindMe: false,
          },
        ],
      })
    );
    localStorage.setItem("nextTrainOnboardingDone", "1");
    localStorage.setItem("nextTrainTemplateWizardSeen", "1");
  });
  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    window.nextTrainApp.openJourneysLibrary?.();
    await window.nextTrainApp.openJourneyDetail?.("j-custom");
  });
  await page.waitForTimeout(500);
}

async function setOptionalTime(page, fieldId, value) {
  await page.evaluate(
    ({ fieldId, value }) => {
      const field = document.getElementById(fieldId);
      const input = field?.querySelector(".optional-time-input");
      if (!input) {
        return;
      }
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { fieldId, value }
  );
  await page.waitForTimeout(150);
}

async function readWindowState(page) {
  return page.evaluate(() => ({
    defaultFrom: document.getElementById("detail-default-from")?.value ?? "",
    defaultUntil: document.getElementById("detail-default-until")?.value ?? "",
    preferredTrainTime: document.getElementById("detail-preferred-input")?.value ?? "",
    outside: !document.getElementById("detail-target-outside-active-hint")?.hidden,
  }));
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await openCustomJourneyDetail(page);

  let state = await readWindowState(page);
  if (state.preferredTrainTime || state.defaultFrom || state.defaultUntil) {
    console.error("FAIL — custom commute should start with empty target/window", state);
    process.exitCode = 1;
    await browser.close();
    return;
  }

  await setOptionalTime(page, "detail-preferred-field", "07:30");
  state = await readWindowState(page);
  if (state.defaultFrom !== "06:00" || state.defaultUntil !== "09:00" || state.outside) {
    console.error("FAIL — target train should default journey window to 06:00–09:00", state);
    process.exitCode = 1;
  }

  await setOptionalTime(page, "detail-default-from-field", "08:00");
  await setOptionalTime(page, "detail-default-until-field", "09:00");
  state = await readWindowState(page);
  if (!state.outside) {
    console.error("FAIL — outside hint expected when target 07:30 is outside 08:00–09:00", state);
    process.exitCode = 1;
  }

  await setOptionalTime(page, "detail-default-from-field", "07:00");
  await setOptionalTime(page, "detail-default-until-field", "09:00");
  state = await readWindowState(page);
  if (state.outside) {
    console.error("FAIL — outside hint should clear when target is inside window", state);
    process.exitCode = 1;
  }

  await page.locator("#detail-done-btn").click();
  await page.waitForTimeout(600);
  const saved = await page.evaluate(() => {
    const journey = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}").journeys?.[0];
    return {
      preferredTrainTime: journey?.preferredTrainTime ?? "",
      defaultFrom: journey?.defaultFrom ?? "",
      defaultUntil: journey?.defaultUntil ?? "",
    };
  });
  if (saved.preferredTrainTime !== "07:30" || saved.defaultFrom !== "07:00" || saved.defaultUntil !== "09:00") {
    console.error("FAIL — save should persist target and journey window", saved);
    process.exitCode = 1;
  }

  await browser.close();

  if (process.exitCode) {
    return;
  }

  console.log("PASS — target train defaults journey window and validation still works");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
