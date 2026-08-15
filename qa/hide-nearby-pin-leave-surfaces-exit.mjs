/**
 * CAPACITOR-G: exiting Near me (enterJourneyMode → exitNearbyMode) must not
 * throw ReferenceError: hideNearbyPinLeaveSurfaces is not defined.
 * Usage: node qa/hide-nearby-pin-leave-surfaces-exit.mjs
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
  await page.waitForTimeout(400);
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
  await page.waitForTimeout(1500);

  const probe = await page.evaluate(() => {
    const typeofHide = typeof hideNearbyPinLeaveSurfaces;
    const typeofGlobal = typeof globalThis.hideNearbyPinLeaveSurfaces;
    let exitError = null;
    try {
      if (typeof exitNearbyMode === "function") {
        exitNearbyMode();
      }
      if (typeof enterJourneyMode === "function") {
        enterJourneyMode();
      }
    } catch (error) {
      exitError = String(error?.message ?? error);
    }
    return { typeofHide, typeofGlobal, exitError };
  });

  await page.click("#journeys-btn").catch(() => {});
  await page.waitForTimeout(400);

  const hideCrash = pageErrors.some((message) =>
    /hideNearbyPinLeaveSurfaces is not defined/i.test(message)
  );
  const probeCrash = /hideNearbyPinLeaveSurfaces is not defined/i.test(
    probe.exitError ?? ""
  );

  if (
    probe.typeofHide === "function" &&
    probe.typeofGlobal === "function" &&
    !hideCrash &&
    !probeCrash &&
    !probe.exitError
  ) {
    console.log(
      "PASS — hideNearbyPinLeaveSurfaces defined; exitNearbyMode / Journeys did not throw"
    );
  } else {
    console.error("FAIL — CAPACITOR-G hideNearbyPinLeaveSurfaces guard", {
      probe,
      hideCrash,
      pageErrors,
    });
    process.exitCode = 1;
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
