/**
 * TESTING.md test 23 — Other directions must not show in My Journeys mode.
 * Usage: node qa/other-directions-journey-repro.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -32.07, longitude: 116.0 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.evaluate(() => {
    localStorage.setItem(
      "nextTrainSettings",
      JSON.stringify({
        refreshSeconds: 30,
        activeJourneyId: "j-morning",
        journeys: [
          {
            id: "j-morning",
            name: "Morning into town",
            station: "Armadale Stn",
            direction: "Perth",
            leaveBeforeMinutes: 10,
            useLeaveBefore: true,
            defaultFrom: "06:00",
            defaultUntil: "09:00",
          },
        ],
      })
    );
  });
  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    window.nextTrainApp.enterJourneyMode();
    window.nextTrainApp.openJourneys();
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById("nearby-btn").click());
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.getElementById("journeys-done-btn").click());
  await page.waitForTimeout(2000);

  const state = await page.evaluate(() => ({
    journeysPressed: document.getElementById("journeys-btn").getAttribute("aria-pressed"),
    nearbyDirectionsHidden: document.getElementById("nearby-directions").hidden,
    editVisible: !document.getElementById("journey-edit-btn").hidden,
    route: document.getElementById("route").textContent?.trim(),
  }));

  await browser.close();

  const pass =
    state.journeysPressed === "true" &&
    state.nearbyDirectionsHidden === true &&
    state.editVisible === true;

  console.log("\nOther directions in journey mode\n");
  console.log(JSON.stringify(state, null, 2));
  console.log(pass ? "\nPASS\n" : "\nFAIL  Other directions visible in My Journeys mode\n");
  process.exit(pass ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
