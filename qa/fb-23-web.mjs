/**
 * FB-23 — Routes & Commutes web QA (Q7 chrome, libraries, switcher, route hero).
 * Usage: node qa/fb-23-web.mjs
 */
import { chromium } from "playwright";
import {
  openCommutesLibrary,
  openRouteCreate,
  openRoutesLibrary,
  readChromeLabels,
  seedMixedJourneys,
} from "./helpers/travel-library.mjs";

const BASE = "http://localhost:3000";

function fail(message, detail) {
  console.error(`FAIL — ${message}`, detail ?? "");
  process.exitCode = 1;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(800);

  const chrome = await readChromeLabels(page);
  if (
    chrome.nearby !== "Near me" ||
    chrome.routes !== "Routes" ||
    chrome.commutes !== "Commutes" ||
    chrome.menu !== "Menu" ||
    !chrome.journeysBtnGone
  ) {
    fail("four-tab chrome labels", chrome);
  }

  await openRoutesLibrary(page);
  const routesLibrary = await page.evaluate(() => ({
    title: document.getElementById("journeys-library-title")?.textContent?.trim() ?? "",
    addRouteVisible: !document.getElementById("journey-save-route-btn")?.hidden,
    addRouteText: document.getElementById("journey-save-route-btn")?.textContent?.trim() ?? "",
    setupCommuteHidden: document.getElementById("journey-setup-commute-btn")?.hidden === true,
    shortcutsHidden: document.getElementById("journey-template-shortcuts")?.hidden === true,
  }));
  if (
    routesLibrary.title !== "Routes" ||
    !routesLibrary.addRouteVisible ||
    routesLibrary.addRouteText !== "Add a route" ||
    !routesLibrary.setupCommuteHidden ||
    !routesLibrary.shortcutsHidden
  ) {
    fail("routes library", routesLibrary);
  }

  await openRouteCreate(page);
  const routeEditor = await page.evaluate(() => ({
    open: !document.getElementById("settings-detail-view")?.hidden,
    routeMode: document
      .getElementById("settings-detail-view")
      ?.classList.contains("settings-detail-view--route"),
    nameHidden: document.querySelector(".journey-name-field")?.hidden === true,
    timingHidden: document.getElementById("detail-timing-section")?.hidden === true,
    preferredHidden: document.getElementById("detail-preferred-section")?.hidden === true,
    trainsToLabel:
      document.querySelector(".detail-direction-label--route")?.textContent?.trim() ?? "",
    commuteLabelHidden:
      document.querySelector(".detail-direction-label--commute")?.offsetParent === null,
    hint:
      document.querySelector(".detail-direction-hint--route")?.textContent?.trim() ?? "",
  }));
  if (
    !routeEditor.open ||
    !routeEditor.routeMode ||
    !routeEditor.nameHidden ||
    !routeEditor.timingHidden ||
    !routeEditor.preferredHidden ||
    routeEditor.trainsToLabel !== "Trains to" ||
    !routeEditor.commuteLabelHidden ||
    !routeEditor.hint.includes("platform sign")
  ) {
    fail("route editor (Q8 Trains to)", routeEditor);
  }

  await page.evaluate(() => window.nextTrainApp.closeJourneysDialog?.());
  await page.waitForTimeout(300);

  await openCommutesLibrary(page);
  const commutesLibrary = await page.evaluate(() => ({
    title: document.getElementById("journeys-library-title")?.textContent?.trim() ?? "",
    setupVisible: !document.getElementById("journey-setup-commute-btn")?.hidden,
    addRouteHidden: document.getElementById("journey-save-route-btn")?.hidden === true,
    morningVisible: !document.querySelector('[data-template="morning"]')?.hidden,
  }));
  if (
    commutesLibrary.title !== "Commutes" ||
    !commutesLibrary.setupVisible ||
    !commutesLibrary.addRouteHidden ||
    !commutesLibrary.morningVisible
  ) {
    fail("commutes library", commutesLibrary);
  }

  await page.evaluate(() => window.nextTrainApp.closeJourneysDialog?.());
  await seedMixedJourneys(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  await page.evaluate(() => window.nextTrainApp.enterRouteMode?.());
  await page.waitForFunction(
    () => {
      const hero = document.getElementById("hero");
      const sw = document.getElementById("journey-switcher");
      return hero && !hero.classList.contains("hero-setup") && sw && !sw.hidden;
    },
    null,
    { timeout: 20000 }
  );
  await page.waitForTimeout(500);

  const routeHero = await page.evaluate(() => ({
    leaveHidden: document.getElementById("leave-card")?.hidden === true,
    boardVisible:
      document.getElementById("nearby-directions")?.classList.contains("route-departures") ||
      document.getElementById("nearby-directions")?.hidden === false,
    routeLine: document.getElementById("route")?.textContent?.trim() ?? "",
    routeCount: window.nextTrainJourneyModel
      .readStoredSettings()
      .journeys.filter((j) => window.nextTrainJourneyModel.isRouteJourney(j)).length,
  }));

  await page.locator("#journey-switcher").click({ force: true });
  await page.waitForTimeout(300);
  const routeSwitcher = await page.evaluate(() => ({
    options: [...document.querySelectorAll("#journey-switcher-menu button")].map((btn) =>
      btn.textContent?.replace(/\s+/g, " ").trim()
    ),
  }));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  await page.evaluate(() => window.nextTrainApp.openCommutesLibrary?.());
  await page.waitForTimeout(500);
  const commuteTab = await page.evaluate(() => ({
    libraryTitle: document.getElementById("journeys-library-title")?.textContent?.trim() ?? "",
    listLabels: [...document.querySelectorAll(".journey-list-item")].map((item) =>
      item.textContent?.replace(/\s+/g, " ").trim()
    ),
    commuteCount: window.nextTrainJourneyModel
      .readStoredSettings()
      .journeys.filter((j) => window.nextTrainJourneyModel.isCommuteJourney(j)).length,
  }));
  await page.evaluate(() => window.nextTrainApp.closeJourneysDialog?.());

  await browser.close();

  const routeOnly =
    routeSwitcher.options.length === 2 &&
    routeHero.routeCount === 2 &&
    routeSwitcher.options.every((line) => line.includes("Route") || line.includes("→"));
  const routeHasNoCommuteName = !routeSwitcher.options.some((line) => line.includes("Morning"));
  const commuteOnly =
    commuteTab.libraryTitle === "Commutes" &&
    commuteTab.commuteCount === 1 &&
    commuteTab.listLabels.length === 1 &&
    commuteTab.listLabels[0].includes("Morning") &&
    !commuteTab.listLabels.some((line) => line.includes("Mandurah"));

  if (
    !routeHero.leaveHidden ||
    !routeHero.boardVisible ||
    !routeHero.routeLine.includes("Edgewater") ||
    !routeOnly ||
    !routeHasNoCommuteName ||
    !commuteOnly
  ) {
    fail("route hero + tab switcher", {
      routeHero,
      routeSwitcher,
      commuteTab,
      routeOnly,
      routeHasNoCommuteName,
      commuteOnly,
    });
  }

  console.log("PASS — FB-23 web (chrome, libraries, route editor, switcher, route board)");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
