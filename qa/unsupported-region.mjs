/**
 * Unsupported region — Near me blocked when nearest station > 50 km.
 * GPS-first: Sydney geo uses the Sydney network; outback GPS falls back to Perth gate.
 *
 * Usage: node qa/unsupported-region.mjs
 */
import { chromium } from "playwright";

import { BASE } from "./helpers/dev-server.mjs";
const SYDNEY = { latitude: -33.8688, longitude: 151.2093 };
const PERTH = { latitude: -31.9505, longitude: 115.8605 };
const OUTBACK = { latitude: -25.0, longitude: 133.0 };

async function run() {
  const browser = await chromium.launch({ headless: true });

  const outbackContext = await browser.newContext({
    geolocation: OUTBACK,
    permissions: ["geolocation"],
  });
  const outbackPage = await outbackContext.newPage();
  await outbackPage.goto(`${BASE}/?reset=1&fixture=normal`);
  await outbackPage.waitForTimeout(4000);

  const unsupported = await outbackPage.evaluate(() => {
    const hero = document.getElementById("depart-countdown");
    const title = hero?.querySelector(".hero-empty-title")?.textContent?.trim();
    const directionsHidden = document.getElementById("nearby-directions")?.hidden;
    const nearbyMode = document.querySelector(".app")?.classList.contains("nearby-mode");
    const journeysMode = document.querySelector(".app")?.classList.contains("journey-mode");
    return { title, directionsHidden, nearbyMode, journeysMode };
  });

  if (
    unsupported.title === "Outside covered areas" &&
    unsupported.directionsHidden &&
    unsupported.nearbyMode &&
    !unsupported.journeysMode
  ) {
    console.log("PASS — Outback geo shows the Outside covered areas empty state");
  } else {
    console.error("FAIL — unsupported state", unsupported);
    process.exitCode = 1;
  }

  await outbackPage.evaluate(() => window.nextTrainApp.enterJourneyMode());
  await outbackPage.waitForTimeout(500);

  const journeysOpen = await outbackPage.evaluate(() => {
    const journeysMode = document.querySelector(".app")?.classList.contains("journey-mode");
    return { journeysMode };
  });

  if (journeysOpen.journeysMode) {
    console.log("PASS — My Journeys reachable from unsupported state");
  } else {
    console.error("FAIL — could not enter journey mode", journeysOpen);
    process.exitCode = 1;
  }

  const sydneyContext = await browser.newContext({
    geolocation: SYDNEY,
    permissions: ["geolocation"],
  });
  const sydneyPage = await sydneyContext.newPage();
  await sydneyPage.goto(`${BASE}/?reset=1&fixture=normal`);
  await sydneyPage.waitForTimeout(4000);

  const sydneyNearby = await sydneyPage.evaluate(() => {
    const title = document.getElementById("depart-countdown")?.querySelector(".hero-empty-title")?.textContent?.trim();
    const route = document.getElementById("route")?.textContent?.trim() ?? "";
    const nearbyCity = window.nextTrainNearby?.getNearbySession?.()?.city ?? null;
    return { title, route, nearbyCity };
  });

  if (/rail only|Outside covered areas|station nearby/.test(sydneyNearby.title || "")) {
    console.error("FAIL — Sydney geo should not use Perth unsupported copy", sydneyNearby);
    process.exitCode = 1;
  } else if (sydneyNearby.nearbyCity === "sydney" || sydneyNearby.route.includes("Near you")) {
    console.log("PASS — Sydney geo scopes Near me to Sydney network");
  } else {
    console.error("FAIL — expected Sydney-scoped nearby", sydneyNearby);
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
