/**
 * FB-23 Phase 1 — settings reset, route field strip, upgradeRouteToCommute.
 * Usage: node qa/fb-23-phase-1-model.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const SETTINGS_KEY = "nextTrainSettings";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.waitForTimeout(500);

  const modelResults = await page.evaluate(() => {
    const jm = window.nextTrainJourneyModel;
    const route = jm.normalizeJourney({
      kind: "route",
      station: "Edgewater Stn",
      direction: "Perth",
      defaultFrom: "06:00",
      defaultUntil: "09:00",
      preferredTrainTime: "07:30",
      remindMe: true,
      templateKey: "morning",
    });
    const upgraded = jm.upgradeRouteToCommute({
      id: "j-up",
      name: "Work",
      station: "Edgewater Stn",
      direction: "Perth",
      kind: "route",
    });
    const routeJourney = jm.createRouteJourney({
      station: "Edgewater Stn",
      direction: "Perth",
    });
    return {
      routeKind: route.kind,
      routeStripped:
        !route.defaultFrom &&
        !route.defaultUntil &&
        !route.preferredTrainTime &&
        route.remindMe === false &&
        !route.templateKey,
      upgradedKind: upgraded.kind,
      upgradedHasTarget: upgraded.preferredTrainTime === "07:30",
      createdRouteKind: routeJourney.kind,
    };
  });

  await page.evaluate(
    (key) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          refreshSeconds: 30,
          activeJourneyId: "legacy-1",
          journeys: [
            {
              id: "legacy-1",
              name: "Legacy",
              station: "Edgewater Stn",
              direction: "Perth",
              defaultFrom: "06:00",
              defaultUntil: "09:00",
              preferredTrainTime: "07:30",
            },
          ],
        })
      );
    },
    SETTINGS_KEY
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  const resetResults = await page.evaluate((key) => {
    const raw = JSON.parse(localStorage.getItem(key) || "{}");
  const jm = window.nextTrainJourneyModel;
    const settings = jm.readStoredSettings();
    return {
      schemaVersion: settings.settingsSchemaVersion,
      journeyCount: settings.journeys.length,
      activeJourneyId: settings.activeJourneyId,
      storedVersion: raw.settingsSchemaVersion,
    };
  }, SETTINGS_KEY);

  await browser.close();

  const pass =
    modelResults.routeKind === "route" &&
    modelResults.routeStripped &&
    modelResults.upgradedKind === "commute" &&
    modelResults.upgradedHasTarget &&
    modelResults.createdRouteKind === "route" &&
    resetResults.schemaVersion === 2 &&
    resetResults.journeyCount === 0 &&
    resetResults.activeJourneyId === null &&
    resetResults.storedVersion === 2;

  if (pass) {
    console.log("PASS — FB-23 phase 1 model", { modelResults, resetResults });
  } else {
    console.error("FAIL — FB-23 phase 1 model", { modelResults, resetResults });
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
