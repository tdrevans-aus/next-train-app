/**
 * FB-23 Q7 — Routes library + two-field route editor.
 * Usage: node qa/add-journey-btn.mjs
 */
import { chromium } from "playwright";
import { openRouteCreate, openRoutesLibrary } from "./helpers/travel-library.mjs";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(800);
  await openRoutesLibrary(page);

  const listUi = await page.evaluate(() => ({
    libraryTitle: document.getElementById("journeys-library-title")?.textContent?.trim() ?? "",
    saveRouteVisible: !document.getElementById("journey-save-route-btn")?.hidden,
    saveRouteText: document.getElementById("journey-save-route-btn")?.textContent?.trim() ?? "",
    setupCommuteVisible: !document.getElementById("journey-setup-commute-btn")?.hidden,
    shortcutsHidden: document.getElementById("journey-template-shortcuts")?.hidden === true,
    morningChipHidden: document.querySelector('[data-template="morning"]')?.hidden === true,
  }));

  await openRouteCreate(page);

  const detailUi = await page.evaluate(() => ({
    detailOpen: !document.getElementById("settings-detail-view")?.hidden,
    deleteHidden: document.getElementById("delete-journey-btn")?.hidden === true,
    nameFieldHidden: document.querySelector(".journey-name-field")?.hidden === true,
    timingHidden: document.getElementById("detail-timing-section")?.hidden === true,
    preferredHidden: document.getElementById("detail-preferred-section")?.hidden === true,
    trainsToLabel:
      document.querySelector(".detail-direction-label--route")?.textContent?.trim() ?? "",
  }));

  await browser.close();

  const pass =
    listUi.libraryTitle === "Routes" &&
    listUi.saveRouteVisible &&
    listUi.saveRouteText === "Add a route" &&
    !listUi.setupCommuteVisible &&
    listUi.shortcutsHidden &&
    listUi.morningChipHidden &&
    detailUi.detailOpen &&
    detailUi.deleteHidden &&
    detailUi.nameFieldHidden &&
    detailUi.timingHidden &&
    detailUi.preferredHidden &&
    detailUi.trainsToLabel === "Trains to";

  if (pass) {
    console.log("PASS — Routes library + two-field route editor");
  } else {
    console.error("FAIL — route create UX", { listUi, detailUi });
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
