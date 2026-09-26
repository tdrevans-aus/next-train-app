/**
 * Template wizard — scrim does not dismiss, Skip tour, edit name, Reminders final step.
 *
 * Rewritten 26 Sep 2026 (docs/jim-brief-template-wizard-known-red.md) against the current
 * wizard steps: name -> station (#template-wizard-step-1) -> target train
 * (#template-wizard-step-2) -> Reminders (#template-wizard-step-reminder, now the final step
 * with "Got it" — the old #template-wizard-step-3 "Active hours" step is gone; hours now
 * auto-derive from the target time, so there is nothing to assert on it).
 *
 * The previous version force-clicked the dead center of the scrim's full-screen bounding box.
 * On this layout that point sits on top of the coach card's Skip tour button (the card is
 * roughly centered over the scrim), so the "click" landed on Skip tour, not the scrim, and
 * correctly dismissed the wizard — a test-authoring bug, not a product one. This version clicks
 * a scrim corner that the coach card never covers.
 *
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
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

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

  const scrimBox = await page
    .locator("#template-route-coach .onboarding-coach-scrim")
    .boundingBox();
  await page.mouse.click(scrimBox.x + 5, scrimBox.y + 5);
  await page.waitForTimeout(300);
  const scrimDismissed = await page.evaluate(
    () => document.getElementById("template-route-coach").hidden
  );
  if (scrimDismissed) {
    console.error("FAIL — scrim corner tap dismissed wizard");
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
    routeStepHidden: document.getElementById("template-wizard-step-1").hidden,
    timeStepHidden: document.getElementById("template-wizard-step-2").hidden,
    primary: document.getElementById("template-wizard-primary-btn")?.textContent?.trim(),
    duplicateLabels: document.querySelectorAll("#detail-reminder-section .menu-toggle-title").length,
    sectionTitles: document.querySelectorAll("#detail-reminder-section .settings-section-title").length,
  }));

  if (
    reminderStep.reminderVisible &&
    reminderStep.routeStepHidden &&
    reminderStep.timeStepHidden &&
    reminderStep.primary === "Got it" &&
    reminderStep.duplicateLabels === 1 &&
    reminderStep.sectionTitles === 0
  ) {
    console.log("PASS — Reminders is the final wizard step with single label");
  } else {
    console.error("FAIL — Reminders final step / label", reminderStep);
    process.exitCode = 1;
  }

  await page.locator("#template-wizard-primary-btn").click();
  await page.waitForTimeout(300);
  const afterGotIt = await page.evaluate(() => ({
    coachHidden: document.getElementById("template-route-coach").hidden,
    seen: localStorage.getItem("nextTrainTemplateWizardSeen"),
  }));
  if (afterGotIt.coachHidden && afterGotIt.seen === "1") {
    console.log("PASS — Got it on Reminders step marks seen");
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
