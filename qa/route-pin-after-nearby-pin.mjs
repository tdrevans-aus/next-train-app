/**
 * Pin a later My Routes train after a Near me pin must stick on the first tap.
 * Usage: node qa/route-pin-after-nearby-pin.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer, BASE } from "./helpers/dev-server.mjs";

async function readHero(page) {
  return page.evaluate(() => {
    let skipCount = 0;
    try {
      for (let index = 0; index < sessionStorage.length; index += 1) {
        const key = sessionStorage.key(index);
        if (key?.startsWith("nextTrainSkip:")) {
          skipCount = Number(JSON.parse(sessionStorage.getItem(key) || "{}").count) || 0;
          break;
        }
      }
    } catch {
      skipCount = 0;
    }
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}");
    const route = settings.journeys?.find((journey) => journey.id === "route-1");
    return {
      time: document.getElementById("depart-display-time")?.textContent?.trim() ?? "",
      label: document.getElementById("hero-depart-label")?.textContent?.trim() ?? "",
      pinPressed: document.getElementById("hero-pin-btn")?.getAttribute("aria-pressed") ?? "",
      skipCount,
      nearbyPin: settings.nearbyPin ?? null,
      routeOverride: route?.journeyPinOverrideIso || "",
    };
  });
}

async function run() {
  let serverChild = null;
  try {
    serverChild = await ensureDevServer();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
      await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
      await page.evaluate(() => {
        localStorage.setItem(
          "nextTrainSettings",
          JSON.stringify({
            settingsSchemaVersion: 2,
            refreshSeconds: 60,
            activeJourneyId: "route-1",
            journeys: [
              {
                id: "route-1",
                kind: "route",
                name: "Evening route",
                station: "Edgewater Stn",
                direction: "Perth",
                leaveBeforeMinutes: 10,
              },
            ],
          })
        );
        localStorage.setItem("nextTrainOnboardingDone", "1");
      });

      await page.goto(`${BASE}/?test=1&fixture=normal`);
      await page.evaluate(async () => {
        await window.nextTrainApp.enterNearbyMode();
      });
      await page.waitForSelector("#hero-pin-btn:not([hidden])", { timeout: 25000 });
      await page.locator("#hero-pin-btn").click();
      await page.waitForTimeout(400);

      const nearbyPinned = await readHero(page);
      if (nearbyPinned.pinPressed !== "true") {
        throw new Error(`nearby pin failed: ${JSON.stringify(nearbyPinned)}`);
      }

      await page.evaluate(() => window.nextTrainApp.enterRouteMode());
      await page.waitForFunction(
        () => document.querySelector(".app")?.classList.contains("journey-mode"),
        null,
        { timeout: 15000 }
      );
      await page.waitForSelector("#hero-pin-btn:not([hidden])", { timeout: 25000 });
      await page.waitForFunction(
        () => (document.getElementById("depart-display-time")?.textContent?.trim() ?? "").length > 0,
        null,
        { timeout: 25000 }
      );

      const onRouteNext = await readHero(page);
      await page.evaluate(() => window.nextTrainApp.skipToNextTrain());
      await page.waitForFunction(
        (previousTime) => {
          const time = document.getElementById("depart-display-time")?.textContent?.trim() ?? "";
          const label = document.getElementById("hero-depart-label")?.textContent?.trim() ?? "";
          return time.length > 0 && (time !== previousTime || label === "Later train");
        },
        onRouteNext.time,
        { timeout: 15000 }
      );

      const later = await readHero(page);
      if (!later.time || later.time === onRouteNext.time) {
        throw new Error(`could not preview a later route train: ${JSON.stringify({ onRouteNext, later })}`);
      }

      await page.locator("#hero-pin-btn").click();
      await page.waitForTimeout(800);

      const afterPin = await readHero(page);
      if (afterPin.pinPressed !== "true") {
        throw new Error(`first route pin tap did not pin: ${JSON.stringify({ later, afterPin })}`);
      }
      if (afterPin.time !== later.time) {
        throw new Error(
          `first route pin tap jumped off the later train: ${JSON.stringify({ later, afterPin })}`
        );
      }
      if (afterPin.nearbyPin) {
        throw new Error(`nearby pin should clear after route pin: ${JSON.stringify(afterPin)}`);
      }
      if (!afterPin.routeOverride) {
        throw new Error(`route override missing: ${JSON.stringify(afterPin)}`);
      }

      console.log("PASS — first My Routes pin after Near me pin keeps the later train");
    } finally {
      await browser.close();
    }
  } finally {
    await stopDevServer(serverChild);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
