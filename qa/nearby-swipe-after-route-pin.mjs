/**
 * Near me swipe after pinning on My routes clears nearby pin.
 * Usage: node qa/nearby-swipe-after-route-pin.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";

function perthTodayKey() {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Perth",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

async function swipeHeroLeft(page) {
  const hero = page.locator("#hero");
  const box = await hero.boundingBox();
  if (!box) {
    return false;
  }

  const startX = box.x + box.width * 0.82;
  const endX = box.x + box.width * 0.18;
  const y = box.y + box.height / 2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y, { steps: 14 });
  await page.mouse.up();
  return true;
}

async function readHeroState(page) {
  return page.evaluate(() => ({
    time: document.getElementById("depart-display-time")?.textContent?.trim() ?? "",
    label: document.getElementById("hero-depart-label")?.textContent?.trim() ?? "",
    pinPressed: document.getElementById("hero-pin-btn")?.getAttribute("aria-pressed") ?? "",
    locking: window.nextTrainNavigation?.isHeroPinLockingSwipe?.() ?? null,
    canNext: window.nextTrainNavigation?.canSkipToNextTrain?.() ?? null,
    canPrev: window.nextTrainNavigation?.canSkipToEarlierTrain?.() ?? null,
    nearbyPin: JSON.parse(localStorage.getItem("nextTrainSettings") || "{}").nearbyPin,
  }));
}

async function run() {
  let serverChild = null;
  try {
    serverChild = await ensureDevServer();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const today = perthTodayKey();

    await page.goto("http://localhost:3000/?reset=1&test=1&fixture=normal");
    await page.evaluate((dateKey) => {
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
    }, today);

    await page.goto("http://localhost:3000/?test=1&fixture=normal");
    await page.evaluate(async () => {
      await window.nextTrainApp.enterNearbyMode();
    });
    await page.waitForSelector("#hero-pin-btn:not([hidden])", { timeout: 25000 });
    await page.locator("#hero-pin-btn").click();
    await page.waitForTimeout(500);

    const pinnedNearby = await readHeroState(page);
    if (pinnedNearby.pinPressed !== "true") {
      throw new Error(`nearby pin failed: ${JSON.stringify(pinnedNearby)}`);
    }

    await page.evaluate(() => window.nextTrainApp.enterRouteMode());
    await page.waitForFunction(
      () => document.querySelector(".app")?.classList.contains("journey-mode"),
      null,
      { timeout: 15000 }
    );
    await page.waitForSelector("#hero-pin-btn:not([hidden])", { timeout: 25000 });
    await page.locator("#hero-pin-btn").click();
    await page.waitForTimeout(800);

    const settingsAfterRoutePin = await page.evaluate(
      () => JSON.parse(localStorage.getItem("nextTrainSettings") || "{}").nearbyPin
    );
    if (settingsAfterRoutePin) {
      throw new Error(`nearbyPin should be cleared after route pin: ${JSON.stringify(settingsAfterRoutePin)}`);
    }

    await page.evaluate(async () => {
      await window.nextTrainApp.enterNearbyMode();
    });
    await page.waitForSelector("#hero-pin-btn:not([hidden])", { timeout: 25000 });
    await page.waitForTimeout(1200);

    const beforeSwipe = await readHeroState(page);
    if (beforeSwipe.pinPressed !== "false") {
      throw new Error(`nearby should be unpinned: ${JSON.stringify(beforeSwipe)}`);
    }
    if (beforeSwipe.locking) {
      throw new Error(`nearby swipe locked before gesture: ${JSON.stringify(beforeSwipe)}`);
    }

    const swiped = await swipeHeroLeft(page);
    if (!swiped) {
      throw new Error("hero bounding box missing");
    }
    await page.waitForTimeout(800);

    const afterSwipe = await readHeroState(page);
    await browser.close();

    const gestureWorked =
      afterSwipe.time !== beforeSwipe.time ||
      afterSwipe.label === "Later train" ||
      afterSwipe.canPrev === true;

    if (!gestureWorked) {
      console.error("FAIL — nearby hero swipe after route pin", {
        beforeSwipe,
        afterSwipe,
      });
      process.exitCode = 1;
      return;
    }

    console.log("PASS — nearby hero swipe after route pin");
  } finally {
    stopDevServer(serverChild);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
