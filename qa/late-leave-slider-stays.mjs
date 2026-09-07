/**
 * Time to station slider on a pinned leave card stays visible and usable
 * once the leave phase is late/missed (Near me pin and route pin), and the
 * late/missed subline explains why ("N min to train · N min to station").
 * Regression for docs/jim-brief-late-leave-slider.md.
 *
 * Usage: node qa/late-leave-slider-stays.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";

const BASE = "http://localhost:3000";

async function readLeaveCardState(page) {
  return page.evaluate(() => ({
    cardHidden: document.getElementById("leave-card")?.hidden ?? true,
    sliderFieldHidden: document.getElementById("nearby-leave-before-field")?.hidden ?? true,
    sliderVisible: (() => {
      const el = document.getElementById("nearby-leave-before-field");
      if (!el || el.hidden) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    })(),
    late:
      document.getElementById("leave-card")?.classList.contains("late") ||
      document.getElementById("leave-card")?.classList.contains("now"),
    label: document.getElementById("leave-card-label")?.textContent?.trim() ?? "",
    countdown: document.getElementById("leave-countdown")?.textContent?.trim() ?? "",
    reasonHidden: document.getElementById("leave-card-reason")?.hidden ?? true,
    reasonText: document.getElementById("leave-card-reason")?.textContent?.trim() ?? "",
  }));
}

async function setSliderMinutes(page, minutes) {
  await page.evaluate((value) => {
    const input = document.getElementById("nearby-leave-before-input");
    if (!input) {
      throw new Error("slider input missing");
    }
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, minutes);
  await page.waitForTimeout(250);
}

async function run() {
  let serverChild = null;
  try {
    serverChild = await ensureDevServer();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
      // --- A1: Near me pin ---
      await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
      await page.evaluate(async () => {
        await window.nextTrainApp.enterNearbyMode();
      });
      await page.waitForSelector("#hero-pin-btn:not([hidden])", { timeout: 25000 });
      await page.locator("#hero-pin-btn").click();
      await page.waitForTimeout(500);

      // Push the buffer to the max so leave-by is well in the past — the
      // pinned train should read as late/now regardless of fixture timing.
      await setSliderMinutes(page, 30);

      const nearbyLate = await readLeaveCardState(page);
      if (nearbyLate.cardHidden) {
        throw new Error(`nearby leave card hidden after forcing late: ${JSON.stringify(nearbyLate)}`);
      }
      if (!nearbyLate.late) {
        throw new Error(`nearby leave card did not reach late/now phase: ${JSON.stringify(nearbyLate)}`);
      }
      if (nearbyLate.sliderFieldHidden || !nearbyLate.sliderVisible) {
        throw new Error(`A1 FAIL — slider hidden while late (nearby pin): ${JSON.stringify(nearbyLate)}`);
      }
      if (nearbyLate.reasonHidden || !/min to train/.test(nearbyLate.reasonText) || !/min to station/.test(nearbyLate.reasonText)) {
        throw new Error(`A3 FAIL — late subline missing reason (nearby pin): ${JSON.stringify(nearbyLate)}`);
      }
      if (nearbyLate.reasonText.length > 40) {
        throw new Error(`A3 FAIL — reason line too long (${nearbyLate.reasonText.length} chars): "${nearbyLate.reasonText}"`);
      }
      if (nearbyLate.reasonText.includes("—")) {
        throw new Error(`A3 FAIL — reason line uses an em-dash: "${nearbyLate.reasonText}"`);
      }

      // Drag the slider back down — the card must return to "Leave in …"
      // immediately, with no fetch/reload in between.
      await setSliderMinutes(page, 1);
      const nearbyRecovered = await readLeaveCardState(page);
      if (nearbyRecovered.late) {
        throw new Error(`A1 FAIL — nearby pin card still late after lowering slider: ${JSON.stringify(nearbyRecovered)}`);
      }
      if (!/^Leave in/i.test(nearbyRecovered.label)) {
        throw new Error(`A1 FAIL — nearby pin label did not recover to "Leave in": ${JSON.stringify(nearbyRecovered)}`);
      }
      if (!nearbyRecovered.reasonHidden) {
        throw new Error(`A3 FAIL — reason line stayed visible after recovering: ${JSON.stringify(nearbyRecovered)}`);
      }

      // --- A2: route pin (Routes tab) ---
      await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
      await page.evaluate((today) => {
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
      }, null);

      await page.goto(`${BASE}/?test=1&fixture=normal`);
      await page.evaluate(() => window.nextTrainApp.enterRouteMode());
      await page.waitForFunction(
        () => document.querySelector(".app")?.classList.contains("journey-mode"),
        null,
        { timeout: 15000 }
      );
      await page.waitForSelector("#hero-pin-btn:not([hidden])", { timeout: 25000 });
      await page.locator("#hero-pin-btn").click();
      await page.waitForTimeout(500);

      await setSliderMinutes(page, 30);
      const routeLate = await readLeaveCardState(page);
      if (routeLate.cardHidden) {
        throw new Error(`route pin leave card hidden after forcing late: ${JSON.stringify(routeLate)}`);
      }
      if (!routeLate.late) {
        throw new Error(`route pin leave card did not reach late/now phase: ${JSON.stringify(routeLate)}`);
      }
      if (routeLate.sliderFieldHidden || !routeLate.sliderVisible) {
        throw new Error(`A2 FAIL — slider hidden while late (route pin): ${JSON.stringify(routeLate)}`);
      }
      if (routeLate.reasonHidden || !/min to train/.test(routeLate.reasonText) || !/min to station/.test(routeLate.reasonText)) {
        throw new Error(`A3 FAIL — late subline missing reason (route pin): ${JSON.stringify(routeLate)}`);
      }

      await setSliderMinutes(page, 1);
      const routeRecovered = await readLeaveCardState(page);
      if (routeRecovered.late) {
        throw new Error(`A2 FAIL — route pin card still late after lowering slider: ${JSON.stringify(routeRecovered)}`);
      }
      if (!/^Leave in/i.test(routeRecovered.label)) {
        throw new Error(`A2 FAIL — route pin label did not recover to "Leave in": ${JSON.stringify(routeRecovered)}`);
      }

      console.log("PASS — late-leave-slider-stays (A1 nearby pin, A2 route pin, A3 late reason line)");
    } finally {
      await browser.close();
    }
  } finally {
    stopDevServer(serverChild);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
