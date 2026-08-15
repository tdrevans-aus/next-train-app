/**
 * FB-23 — Save a route button opens blank route detail.
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
    saveRouteVisible: !document.getElementById("journey-save-route-btn")?.hidden,
    saveRouteText: document.getElementById("journey-save-route-btn")?.textContent?.trim() ?? "",
    setupCommuteVisible: !document.getElementById("journey-setup-commute-btn")?.hidden,
    customHidden: document.querySelector('[data-template="custom"]')?.hidden === true,
    shortcutsHidden: document.getElementById("journey-template-shortcuts")?.hidden === true,
  }));

  await openCustomJourneyCreate(page);
  await page.waitForTimeout(600);

  const detailOpen = await page.evaluate(
    () => !document.getElementById("settings-detail-view")?.hidden
  );

  await browser.close();

  const pass =
    listUi.saveRouteVisible &&
    listUi.saveRouteText === "Save a route" &&
    listUi.setupCommuteVisible &&
    listUi.customHidden &&
    listUi.shortcutsHidden &&
    detailOpen;

  if (pass) {
    console.log("PASS — Save a route opens blank route detail; commute templates stay collapsed");
  } else {
    console.error("FAIL — route create UX", { listUi, detailOpen });
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
