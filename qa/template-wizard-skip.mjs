/**
 * Template wizard — scrim no dismiss, Skip tour, edit name, Reminder final step.
 * Usage: node qa/template-wizard-skip.mjs
 */
import { chromium } from "playwright";
import { openJourneysLibraryDialog } from "./helpers/journeys-dialog.mjs";

import { BASE } from "./helpers/dev-server.mjs";

async function openMorningWizard(page) {
  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(800);
  await openJourneysLibraryDialog(page);
  await page.locator('[data-template="morning"]').click();
  await page.waitForTimeout(2000);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await openMorningWizard(page);

  const coachOpen = await page.evaluate(
    () => !document.getElementById("template-route-coach").hidden
  );
  if (!coachOpen) {
    console.error("FAIL — template coach not open");
    process.exitCode = 1;
    await browser.close();
    return;
  }

  await page.locator("#template-route-coach .onboarding-coach-scrim").click({ force: true });
  await page.waitForTimeout(300);
  const scrimDismissed = await page.evaluate(
    () => document.getElementById("template-route-coach").hidden
  );
  if (scrimDismissed) {
    console.error("FAIL — scrim dismissed wizard");
    process.exitCode = 1;
  } else {
    console.log("PASS — scrim tap does not dismiss wizard");
  }

  await page.locator("#detail-journey-name").fill("Work commute");
  const nameValue = await page.locator("#detail-journey-name").inputValue();
  if (nameValue === "Work commute") {
    console.log("PASS — can edit journey name while coach open");
  } else {
    console.error("FAIL — could not edit name", nameValue);
    process.exitCode = 1;
  }

  for (let step = 0; step < 3; step++) {
    await page.locator("#template-wizard-primary-btn").click();
    await page.waitForTimeout(250);
  }

  const reminderStep = await page.evaluate(() => ({
    reminderVisible: !document.getElementById("template-wizard-step-reminder").hidden,
    hoursHidden: document.getElementById("template-wizard-step-3").hidden,
    primary: document.getElementById("template-wizard-primary-btn")?.textContent?.trim(),
    duplicateLabels: document.querySelectorAll("#detail-reminder-section .menu-toggle-title").length,
    sectionTitles: document.querySelectorAll("#detail-reminder-section .settings-section-title").length,
  }));

  if (
    reminderStep.reminderVisible &&
    reminderStep.hoursHidden &&
    reminderStep.primary === "Next" &&
    reminderStep.duplicateLabels === 1 &&
    reminderStep.sectionTitles === 0
  ) {
    console.log("PASS — Reminder step before Journey window with single label");
  } else {
    console.error("FAIL — Reminder step / label", reminderStep);
    process.exitCode = 1;
  }

  await page.locator("#template-wizard-primary-btn").click();
  await page.waitForTimeout(250);

  const finalStep = await page.evaluate(() => ({
    hoursVisible: !document.getElementById("template-wizard-step-3").hidden,
    reminderHidden: document.getElementById("template-wizard-step-reminder").hidden,
    primary: document.getElementById("template-wizard-primary-btn")?.textContent?.trim(),
  }));

  if (
    finalStep.hoursVisible &&
    finalStep.reminderHidden &&
    finalStep.primary === "Got it"
  ) {
    console.log("PASS — Journey window is final wizard step");
  } else {
    console.error("FAIL — Journey window final step", finalStep);
    process.exitCode = 1;
  }

  await page.locator("#template-wizard-primary-btn").click();
  await page.waitForTimeout(300);
  const afterGotIt = await page.evaluate(() => ({
    coachHidden: document.getElementById("template-route-coach").hidden,
    seen: localStorage.getItem("nextTrainTemplateWizardSeen"),
  }));
  if (afterGotIt.coachHidden && afterGotIt.seen === "1") {
    console.log("PASS — Got it on Journey window step marks seen");
  } else {
    console.error("FAIL — Got it", afterGotIt);
    process.exitCode = 1;
  }

  await openMorningWizard(page);
  await page.locator("#template-wizard-skip-btn").click();
  await page.waitForTimeout(300);
  const afterSkip = await page.evaluate(() => ({
    coachHidden: document.getElementById("template-route-coach").hidden,
    seen: localStorage.getItem("nextTrainTemplateWizardSeen"),
  }));
  if (afterSkip.coachHidden && afterSkip.seen === "1") {
    console.log("PASS — Skip tour dismisses and marks seen");
  } else {
    console.error("FAIL — Skip tour", afterSkip);
    process.exitCode = 1;
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
