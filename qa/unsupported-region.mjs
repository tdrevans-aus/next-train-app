/**
 * Unsupported region — Near me blocked when nearest station > 50 km.
 * Usage: node qa/unsupported-region.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const SYDNEY = { latitude: -33.8688, longitude: 151.2093 };
const PERTH = { latitude: -31.9505, longitude: 115.8605 };

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ geolocation: SYDNEY, permissions: ["geolocation"] });
  const page = await context.newPage();

  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await page.waitForTimeout(4000);

  const unsupported = await page.evaluate(() => {
    const hero = document.getElementById("depart-countdown");
    const title = hero?.querySelector(".hero-empty-title")?.textContent?.trim();
    const directionsHidden = document.getElementById("nearby-directions")?.hidden;
    const nearbyMode = document.querySelector(".app")?.classList.contains("nearby-mode");
    const journeysMode = document.querySelector(".app")?.classList.contains("journey-mode");
    return { title, directionsHidden, nearbyMode, journeysMode };
  });

  if (
    unsupported.title === "Perth rail only" &&
    unsupported.directionsHidden &&
    unsupported.nearbyMode &&
    !unsupported.journeysMode
  ) {
    console.log("PASS — Sydney geo shows Perth rail only empty state");
  } else {
    console.error("FAIL — unsupported state", unsupported);
    process.exitCode = 1;
  }

  await page.evaluate(() => window.nextTrainApp.enterJourneyMode());
  await page.waitForTimeout(500);

  const journeysOpen = await page.evaluate(() => {
    const dialog = document.getElementById("journeys-dialog");
    const journeysMode = document.querySelector(".app")?.classList.contains("journey-mode");
    return { dialogOpen: Boolean(dialog?.open), journeysMode };
  });

  if (journeysOpen.journeysMode) {
    console.log("PASS — My Journeys reachable from unsupported state");
  } else {
    console.error("FAIL — could not enter journey mode", journeysOpen);
    process.exitCode = 1;
  }

  const perthContext = await browser.newContext({ geolocation: PERTH, permissions: ["geolocation"] });
  const perthPage = await perthContext.newPage();
  await perthPage.goto(`${BASE}/?reset=1&fixture=normal`);
  await perthPage.waitForTimeout(4000);

  const inCoverage = await perthPage.evaluate(() => {
    const title = document.getElementById("depart-countdown")?.querySelector(".hero-empty-title");
    const route = document.getElementById("route")?.textContent?.trim() ?? "";
    return { unsupportedTitle: title?.textContent?.trim() ?? null, route };
  });

  if (!inCoverage.unsupportedTitle && inCoverage.route.includes("Near you")) {
    console.log("PASS — Perth geo loads nearby board");
  } else {
    console.error("FAIL — expected nearby board in Perth", inCoverage);
    process.exitCode = 1;
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
