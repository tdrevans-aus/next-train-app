/**
 * CAPACITOR-F: hideNearbyPinLeaveSurfaces must stay defined through Near me
 * pin + leave-by teardown (renderNearbyBoard / exit Nearby / dismiss).
 * Usage: node qa/nearby-pin-leave-helper-defined.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const CACHE_KEY = "nextTrainLastNearbyStation";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -31.95, longitude: 115.86 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  const pageErrors = [];
  page.on("pageerror", (error) => {
    pageErrors.push(String(error?.message ?? error));
  });

  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await page.evaluate(
    ({ key }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          station: "Perth Stn",
          distanceKm: 0.3,
          savedAtMs: Date.now(),
        })
      );
      localStorage.setItem("nextTrainOnboardingDone", "1");
    },
    { key: CACHE_KEY }
  );
  await page.reload();
  await page.waitForTimeout(2000);

  const boot = await page.evaluate(() => ({
    typeofHide: typeof hideNearbyPinLeaveSurfaces,
    route: document.getElementById("route")?.textContent?.trim() ?? "",
  }));

  const pinBtn = page.locator("#hero-pin-btn");
  await pinBtn.waitFor({ state: "visible", timeout: 10000 });
  await pinBtn.click();
  await page.waitForTimeout(600);

  const pinned = await page.evaluate(() => ({
    controlsHidden: document.getElementById("nearby-pin-leave-controls")?.hidden,
    ariaPressed: document.getElementById("hero-pin-btn")?.getAttribute("aria-pressed"),
  }));

  // CAPACITOR-F path: renderNearbyBoard → renderNearbyPinLeaveSurfaces → hide helper
  const boardPath = await page.evaluate(() => {
    const errs = [];
    try {
      if (typeof renderNearbyBoard === "function") {
        renderNearbyBoard();
      }
    } catch (error) {
      errs.push(String(error?.message ?? error));
    }
    return {
      errs,
      typeofHide: typeof hideNearbyPinLeaveSurfaces,
    };
  });

  await page.click("#journeys-btn");
  await page.waitForTimeout(800);

  const afterExit = await page.evaluate(() => {
    const errs = [];
    try {
      hideNearbyPinLeaveSurfaces();
    } catch (error) {
      errs.push(String(error));
    }
    try {
      if (typeof dismissNearbyPinLeaveCard === "function") {
        dismissNearbyPinLeaveCard();
      }
    } catch (error) {
      errs.push(String(error));
    }
    try {
      exitNearbyMode();
    } catch (error) {
      errs.push(String(error));
    }
    return {
      errs,
      controlsHidden: document.getElementById("nearby-pin-leave-controls")?.hidden,
      typeofHide: typeof hideNearbyPinLeaveSurfaces,
    };
  });

  const undefinedHelper = pageErrors.some((message) =>
    /hideNearbyPinLeaveSurfaces is not defined/i.test(message)
  );

  const setupOk =
    boot.typeofHide === "function" &&
    boot.route.includes("Perth") &&
    pinned.ariaPressed === "true" &&
    pinned.controlsHidden === false;

  if (
    setupOk &&
    !undefinedHelper &&
    boardPath.typeofHide === "function" &&
    boardPath.errs.length === 0 &&
    afterExit.typeofHide === "function" &&
    afterExit.errs.length === 0 &&
    afterExit.controlsHidden === true
  ) {
    console.log(
      "PASS — hideNearbyPinLeaveSurfaces stays defined through pin, board render, and Near me exit"
    );
  } else {
    console.error("FAIL — nearby pin leave helper", {
      boot,
      pinned,
      boardPath,
      afterExit,
      undefinedHelper,
      pageErrors,
      setupOk,
    });
    process.exitCode = 1;
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
