/**
 * Custom journeys get Journey 1 / Journey 2 defaults; duplicate names blocked on save.
 * Usage: node qa/custom-journey-names.mjs
 */
import { chromium } from "playwright";
import { openJourneysLibraryDialog } from "./helpers/journeys-dialog.mjs";
import { openCustomJourneyCreate } from "./helpers/open-custom-journey.mjs";

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
  const page = await browser.newPage();

  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.evaluate(() => {
    localStorage.setItem("nextTrainSettings", JSON.stringify({ journeys: [], activeJourneyId: null }));
    localStorage.setItem("nextTrainTemplateWizardSeen", "1");
    localStorage.setItem("nextTrainOnboardingDone", "1");
  });
  await page.reload();
  await page.waitForTimeout(1200);

  await page.evaluate(() => window.nextTrainApp.enterJourneyMode());
  await page.waitForTimeout(300);
  await openJourneysLibraryDialog(page);

  await openCustomJourneyCreate(page);
  await page.waitForTimeout(800);
  await dismissCoach(page);

  const firstName = await page.locator("#detail-journey-name").inputValue();
  if (firstName === "Journey 1") {
    console.log("PASS — first custom journey defaults to Journey 1");
  } else {
    console.error("FAIL — first custom name", firstName);
    process.exitCode = 1;
  }

  await page.evaluate(() => window.nextTrainApp.openJourneysLibrary());
  await page.waitForTimeout(400);
  await openCustomJourneyCreate(page);
  await page.waitForTimeout(800);
  await dismissCoach(page);

  const secondName = await page.locator("#detail-journey-name").inputValue();
  if (secondName === "Journey 2") {
    console.log("PASS — second custom journey defaults to Journey 2");
  } else {
    console.error("FAIL — second custom name", secondName);
    process.exitCode = 1;
  }

  await page.locator("#detail-journey-name").fill("Journey 1");
  await page.evaluate(() => {
    const combobox = window.nextTrainStationCombobox.getDetailCombobox();
    combobox.setValue("Edgewater Stn");
    document.getElementById("detail-direction-select").innerHTML =
      '<option value="Perth">Perth</option>';
    document.getElementById("detail-direction-select").value = "Perth";
    document.getElementById("detail-direction-select").disabled = false;
    document.getElementById("detail-preferred-input").value = "07:30";
    document.getElementById("detail-preferred-input").dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("detail-default-from").value = "06:00";
    document.getElementById("detail-default-from").dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("detail-default-until").value = "09:00";
    document.getElementById("detail-default-until").dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(200);

  let duplicateBlocked = false;
  page.once("dialog", async (dialog) => {
    duplicateBlocked = dialog.message().includes("already called");
    await dialog.dismiss();
  });
  await page.locator("#detail-done-btn").click();
  await page.waitForTimeout(500);

  if (duplicateBlocked) {
    console.log("PASS — duplicate journey name blocked on save");
  } else {
    console.error("FAIL — duplicate name was not blocked");
    process.exitCode = 1;
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
