/**
 * Target outside Active hours soft hint.
 * Usage: node qa/target-outside-active-hint.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${BASE}/?reset=1&fixture=normal&test=1&station=Edgewater%20Stn&direction=Perth`);
  await page.waitForTimeout(3000);

  const gotIt = page.locator("#onboarding-got-it-btn");
  if (await gotIt.isVisible().catch(() => false)) {
    await gotIt.click();
    await page.waitForTimeout(300);
  }

  // Seed a journey into detail via app APIs if needed
  await page.evaluate(() => {
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}");
    const journeys = settings.journeys?.length
      ? settings.journeys
      : [
          {
            id: "qa-morning",
            name: "Morning into town",
            station: "Edgewater Stn",
            direction: "Perth",
            leaveBeforeMinutes: 12,
            useLeaveBefore: true,
            defaultFrom: "06:00",
            defaultUntil: "09:00",
            preferredTrainTime: "07:30",
            remindMe: false,
            remindDays: [1, 2, 3, 4, 5],
            templateKey: "morning",
          },
        ];
    settings.journeys = journeys;
    settings.activeJourneyId = journeys[0].id;
    localStorage.setItem("nextTrainSettings", JSON.stringify(settings));
  });
  await page.reload();
  await page.waitForTimeout(2500);

  const gotIt2 = page.locator("#onboarding-got-it-btn");
  if (await gotIt2.isVisible().catch(() => false)) {
    await gotIt2.click();
  }

  await page.locator("#journeys-btn").click();
  await page.waitForTimeout(500);
  await page.locator(".journey-list-open-btn").first().click();
  await page.waitForTimeout(800);

  const checks = await page.evaluate(() => {
    const app = window.nextTrainApp;
    const hint = document.getElementById("detail-target-outside-active-hint");

    const setField = (inputId, fieldId, displayId, clearId, value) => {
      const input = document.getElementById(inputId);
      const field = document.getElementById(fieldId);
      const display = document.getElementById(displayId);
      const clear = document.getElementById(clearId);
      field.dataset.empty = value ? "false" : "true";
      input.value = value;
      display.textContent = value || "Not set";
      clear.hidden = !value;
    };

    setField(
      "detail-preferred-input",
      "detail-preferred-field",
      "detail-preferred-display",
      "detail-preferred-clear",
      "07:30"
    );
    setField(
      "detail-default-from",
      "detail-default-from-field",
      "detail-default-from-display",
      "detail-default-from-clear",
      "06:00"
    );
    setField(
      "detail-default-until",
      "detail-default-until-field",
      "detail-default-until-display",
      "detail-default-until-clear",
      "09:00"
    );
    app.syncDetailComboHints();
    const insideHidden = hint.hidden;

    setField(
      "detail-default-from",
      "detail-default-from-field",
      "detail-default-from-display",
      "detail-default-from-clear",
      "08:00"
    );
    setField(
      "detail-default-until",
      "detail-default-until-field",
      "detail-default-until-display",
      "detail-default-until-clear",
      "11:00"
    );
    document.getElementById("detail-default-from").dispatchEvent(new Event("input", { bubbles: true }));
    app.syncDetailComboHints();

    return {
      insideHidden,
      outsideHidden: hint.hidden,
      text: hint.textContent.trim(),
      unitOutside: app.isTargetOutsideActiveWindow("08:00", "11:00", "07:30"),
      unitInside: app.isTargetOutsideActiveWindow("06:00", "09:00", "07:30"),
      unitEdgeInclusive: app.isTargetOutsideActiveWindow("06:00", "07:30", "07:30"),
    };
  });

  console.log(checks);
  const pass =
    checks.insideHidden === true &&
    checks.outsideHidden === false &&
    checks.unitOutside === true &&
    checks.unitInside === false &&
    checks.unitEdgeInclusive === false;

  console.log(pass ? "PASS  target-outside-active hint" : "FAIL  target-outside-active hint");
  await browser.close();
  process.exit(pass ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
