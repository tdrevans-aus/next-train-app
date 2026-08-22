/**
 * Pin on Near me, then open My Journeys — hero should land on Target train,
 * not true next.
 * Usage: node qa/journeys-after-nearby-pin.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";
import { commuteJourney } from "./helpers/pin-behavior.mjs";

function perthHm(minutesFromNow) {
  const at = new Date(Date.now() + minutesFromNow * 60_000);
  return at.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Australia/Perth",
  });
}

async function readHero(page) {
  return page.evaluate(() => ({
    time: document.getElementById("depart-display-time")?.textContent?.trim() ?? "",
    label: document.getElementById("hero-depart-label")?.textContent?.trim() ?? "",
    nearbyPin: JSON.parse(localStorage.getItem("nextTrainSettings") || "{}").nearbyPin ?? null,
    dismissed:
      JSON.parse(localStorage.getItem("nextTrainSettings") || "{}").journeys?.[0]
        ?.journeyPinDismissedDate ?? "",
  }));
}

async function run() {
  let serverChild = null;
  try {
    serverChild = await ensureDevServer();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
      const preferredTrainTime = perthHm(34);
      await page.goto("http://localhost:3000/?reset=1&test=1&fixture=normal");
      await page.evaluate((journey) => {
        localStorage.setItem(
          "nextTrainSettings",
          JSON.stringify({
            settingsSchemaVersion: 2,
            refreshSeconds: 60,
            activeJourneyId: "j-a",
            journeys: [journey],
          })
        );
        localStorage.setItem("nextTrainOnboardingDone", "1");
      }, commuteJourney({ preferredTrainTime }));

      await page.goto("http://localhost:3000/?test=1&fixture=normal");
      await page.evaluate(async () => {
        await window.nextTrainApp.enterNearbyMode();
      });
      await page.waitForSelector("#hero-pin-btn:not([hidden])", { timeout: 25000 });
      await page.locator("#hero-pin-btn").click();
      await page.waitForTimeout(400);

      const nearbyPinned = await readHero(page);
      if (!nearbyPinned.nearbyPin) {
        throw new Error(`nearby pin failed: ${JSON.stringify(nearbyPinned)}`);
      }

      await page.evaluate(() => window.nextTrainApp.enterJourneyMode());
      await page.waitForFunction(
        () => document.querySelector(".app")?.classList.contains("journey-mode"),
        null,
        { timeout: 15000 }
      );
      await page.waitForFunction(
        () => {
          const label = document.getElementById("hero-depart-label")?.textContent?.trim() ?? "";
          const time = document.getElementById("depart-display-time")?.textContent?.trim() ?? "";
          return time.length > 0 && label.length > 0;
        },
        null,
        { timeout: 25000 }
      );

      const onJourneys = await readHero(page);
      if (onJourneys.label !== "Target train") {
        throw new Error(`expected Target train after Near me pin: ${JSON.stringify(onJourneys)}`);
      }

      await page.locator("#hero-pin-btn").click();
      await page.waitForTimeout(400);
      const afterPin = await page.evaluate(() => ({
        pressed: document.getElementById("hero-pin-btn")?.getAttribute("aria-pressed") ?? "",
        active: document.getElementById("hero-pin-btn")?.classList.contains("hero-pin-btn--active"),
        dismissed:
          JSON.parse(localStorage.getItem("nextTrainSettings") || "{}").journeys?.[0]
            ?.journeyPinDismissedDate ?? "",
      }));
      if (afterPin.pressed !== "true" || !afterPin.active) {
        throw new Error(`target pin did not show pressed: ${JSON.stringify(afterPin)}`);
      }

      console.log("PASS — My Journeys after Near me pin shows Target train and pin chrome");
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
