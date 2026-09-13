/**
 * FB-23 — Routes & Journeys web QA (Q7 chrome, libraries, switcher, route hero).
 * Usage: node qa/fb-23-web.mjs
 */
import { chromium } from "playwright";
import {
  openJourneysLibrary,
  openRouteCreate,
  openRoutesLibrary,
  readChromeLabels,
  seedMixedJourneys,
} from "./helpers/travel-library.mjs";

import { BASE } from "./helpers/dev-server.mjs";

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
    chrome.routes !== "My Routes" ||
    chrome.journeys !== "My Journeys" ||
    chrome.menu !== "Menu" ||
    !chrome.legacyCommutesChromeRemoved
  ) {
    fail("four-tab chrome labels", chrome);
  }

  await openRoutesLibrary(page);
  const routesLibrary = await page.evaluate(() => ({
    title: document.getElementById("journeys-library-title")?.textContent?.trim() ?? "",
    addRouteVisible: !document.getElementById("journey-save-route-btn")?.hidden,
    addRouteText: document.getElementById("journey-save-route-btn")?.textContent?.trim() ?? "",
    setupJourneyHidden: document.getElementById("journey-setup-btn")?.hidden === true,
    shortcutsHidden: document.getElementById("journey-template-shortcuts")?.hidden === true,
  }));
  if (
    routesLibrary.title !== "Routes" ||
    !routesLibrary.addRouteVisible ||
    routesLibrary.addRouteText !== "Add a route" ||
    !routesLibrary.setupJourneyHidden ||
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
    journeyLabelHidden:
      document.querySelector(".detail-direction-label--journey")?.offsetParent === null,
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
    !routeEditor.journeyLabelHidden ||
    !routeEditor.hint.includes("platform sign")
  ) {
    fail("route editor (Q8 Trains to)", routeEditor);
  }

  await page.evaluate(() => window.nextTrainApp.closeJourneysDialog?.());
  await page.waitForTimeout(300);

  await openJourneysLibrary(page);
  const journeysLibrary = await page.evaluate(() => ({
    title: document.getElementById("journeys-library-title")?.textContent?.trim() ?? "",
    setupVisible: !document.getElementById("journey-setup-btn")?.hidden,
    addRouteHidden: document.getElementById("journey-save-route-btn")?.hidden === true,
    morningVisible: !document.querySelector('[data-template="morning"]')?.hidden,
  }));
  if (
    journeysLibrary.title !== "Journeys" ||
    !journeysLibrary.setupVisible ||
    !journeysLibrary.addRouteHidden ||
    !journeysLibrary.morningVisible
  ) {
    fail("journeys library", journeysLibrary);
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
    boardVisible: document.getElementById("upcoming-departures")?.hidden === false,
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

  await page.evaluate(() => window.nextTrainApp.openJourneysLibrary?.());
  await page.waitForTimeout(500);
  const journeysTab = await page.evaluate(() => ({
    libraryTitle: document.getElementById("journeys-library-title")?.textContent?.trim() ?? "",
    listLabels: [...document.querySelectorAll(".journey-list-item")].map((item) =>
      item.textContent?.replace(/\s+/g, " ").trim()
    ),
    journeyCount: window.nextTrainJourneyModel
      .readStoredSettings()
      .journeys.filter((j) => window.nextTrainJourneyModel.isJourneyKind(j)).length,
  }));
  await page.evaluate(() => window.nextTrainApp.closeJourneysDialog?.());

  await browser.close();

  const routeOnly =
    routeSwitcher.options.length === 2 &&
    routeHero.routeCount === 2 &&
    routeSwitcher.options.every((line) => line.includes("Route") || line.includes("→"));
  const routeHasNoJourneyName = !routeSwitcher.options.some((line) => line.includes("Morning"));
  const journeysOnly =
    journeysTab.libraryTitle === "Journeys" &&
    journeysTab.journeyCount === 1 &&
    journeysTab.listLabels.length === 1 &&
    journeysTab.listLabels[0].includes("Morning") &&
    !journeysTab.listLabels.some((line) => line.includes("Mandurah"));

  if (
    !routeHero.leaveHidden ||
    !routeHero.boardVisible ||
    !routeHero.routeLine.includes("Edgewater") ||
    !routeOnly ||
    !routeHasNoJourneyName ||
    !journeysOnly
  ) {
    fail("route hero + tab switcher", {
      routeHero,
      routeSwitcher,
      journeysTab,
      routeOnly,
      routeHasNoJourneyName,
      journeysOnly,
    });
  }

  console.log("PASS — FB-23 web (chrome, libraries, route editor, switcher, route board)");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
