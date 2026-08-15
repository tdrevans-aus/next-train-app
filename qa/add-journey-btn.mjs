/**
 * FB-29 — primary Add journey button replaces the Custom chip.
 * Usage: node qa/add-journey-btn.mjs
 */
import { chromium } from "playwright";
import { openCustomJourneyCreate } from "./helpers/open-custom-journey.mjs";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(800);
  await page.evaluate(() => window.nextTrainApp.openJourneys());
  await page.waitForTimeout(400);

  const listUi = await page.evaluate(() => ({
    addBtnVisible: !document.getElementById("journey-add-btn")?.hidden,
    addBtnText: document.getElementById("journey-add-btn")?.textContent?.trim() ?? "",
    customHidden: document.querySelector('[data-template="custom"]')?.hidden === true,
    morningVisible: document.querySelector('[data-template="morning"]')?.hidden === false,
  }));

  await openCustomJourneyCreate(page);
  await page.waitForTimeout(600);

  const detailOpen = await page.evaluate(
    () => !document.getElementById("settings-detail-view")?.hidden
  );

  await browser.close();

  const pass =
    listUi.addBtnVisible &&
    listUi.addBtnText === "Add journey" &&
    listUi.customHidden &&
    listUi.morningVisible &&
    detailOpen;

  if (pass) {
    console.log("PASS — Add journey button visible; opens custom create flow");
  } else {
    console.error("FAIL — Add journey UX", { listUi, detailOpen });
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
