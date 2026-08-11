/**
 * Target / Active hours combo soft hints (U-13 §2.1–2.2).
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
  await page.evaluate(() => window.nextTrainApp.openJourneys());
  await page.waitForTimeout(400);
  await page.locator(".journey-list-open-btn").click();
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
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { fieldId, value }
  );
  await page.waitForTimeout(150);
}

async function readHints(page) {
  return page.evaluate(() => ({
    default: !document.getElementById("detail-active-hours-hint")?.hidden,
    outside: !document.getElementById("detail-target-outside-active-hint")?.hidden,
    comboB: !document.getElementById("detail-combo-b-hint")?.hidden,
    comboD: !document.getElementById("detail-combo-d-hint")?.hidden,
    outsideText:
      document.getElementById("detail-target-outside-active-hint")?.textContent?.trim() ?? "",
    comboBText: document.getElementById("detail-combo-b-hint")?.textContent?.trim() ?? "",
  }));
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await openCustomJourneyDetail(page);

  let hints = await readHints(page);
  if (!hints.comboD || hints.outside || hints.comboB || hints.default) {
    console.error("FAIL — combo D hint expected when neither Active nor Target set", hints);
    process.exitCode = 1;
  }

  await setOptionalTime(page, "detail-preferred-field", "07:30");
  hints = await readHints(page);
  if (!hints.comboB || hints.outside || hints.comboD || hints.default) {
    console.error("FAIL — combo B hint expected when Target set without Active hours", hints);
    process.exitCode = 1;
  }

  await setOptionalTime(page, "detail-default-from-field", "08:00");
  await setOptionalTime(page, "detail-default-until-field", "09:00");
  hints = await readHints(page);
  if (!hints.outside || hints.comboB || hints.comboD || hints.default) {
    console.error("FAIL — outside Active hours hint expected for Target 7:30 in 8–9 window", hints);
    process.exitCode = 1;
  }
  if (!/outside Active hours/i.test(hints.outsideText)) {
    console.error("FAIL — outside hint copy", hints);
    process.exitCode = 1;
  }

  await setOptionalTime(page, "detail-default-from-field", "07:00");
  await setOptionalTime(page, "detail-default-until-field", "09:00");
  hints = await readHints(page);
  if (hints.outside || !hints.default) {
    console.error("FAIL — outside hint should clear when Target is inside Active window", hints);
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
    console.error("FAIL — Save should work with soft hints visible", saved);
    process.exitCode = 1;
  }

  if (process.exitCode) {
    await browser.close();
    return;
  }

  console.log("PASS — Target/Active combo hints show, clear, and do not block Save");
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
