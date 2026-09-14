/**
 * Journey wizard still runs when a route is already saved (wizard is once-only, not blocked by routes).
 * Usage: node qa/journey-wizard-after-route.mjs
 */
import { chromium } from "playwright";
import { openJourneysLibrary } from "./helpers/travel-library.mjs";

import { BASE } from "./helpers/dev-server.mjs";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -31.77, longitude: 115.99 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(800);

  await page.evaluate(() => {
    const jm = window.nextTrainJourneyModel;
    jm.persistSettings({
      settingsSchemaVersion: 2,
      refreshSeconds: 30,
      activeJourneyId: "route-only",
      journeys: [
        jm.createRouteJourney({
          id: "route-only",
          station: "Edgewater Stn",
          direction: "Perth",
        }),
      ],
    });
    localStorage.setItem("nextTrainOnboardingDone", "1");
    localStorage.removeItem("nextTrainTemplateWizardSeen");
    localStorage.removeItem("nextTrainTemplateWizardSkipped");
  });

  await page.reload();
  await page.waitForTimeout(800);

  // Workaround for a real app bug found while de-flaking this script
  // (docs/jim-brief-nightly-qa-red.md, bucket 3, not fixed here — flagged for
  // the controller): persistSettings()/migrateSettings() only ever persists
  // regionExplicit when it is `true` (mirrors pickSavedCityFields), so the
  // GPS-follow boot path's own `explicit:false` write never survives to
  // localStorage — savedCity ends up set with no regionExplicit key at all,
  // which is indistinguishable from a genuine pre-PR legacy install.
  // migrateLegacyRegionExplicit() then reads that as "legacy, upgrade it" on
  // the very next load and marks the region explicit for good, which is not
  // what a plain GPS-follow reload should do. Strip the flag directly here
  // (bypassing persistSettings, which cannot write `false`) so this test's
  // outcome depends only on the wizard-once-only behaviour it's named for.
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}");
    delete raw.regionExplicit;
    localStorage.setItem("nextTrainSettings", JSON.stringify(raw));
  });

  await openJourneysLibrary(page);
  await page.locator('[data-template="morning"]').click();

  for (let i = 0; i < 24; i++) {
    await page.waitForTimeout(500);
    const coachOpen = await page.evaluate(
      () => !document.getElementById("template-route-coach")?.hidden
    );
    if (coachOpen) {
      break;
    }
  }

  const state = await page.evaluate(() => ({
    coachOpen: !document.getElementById("template-route-coach")?.hidden,
    wizardSeen: localStorage.getItem("nextTrainTemplateWizardSeen"),
    routeCount: window.nextTrainApp
      .getConfiguredJourneys?.()
      .filter((j) => window.nextTrainJourneyModel.isRouteJourney(j)).length,
    journeyKindCount: window.nextTrainApp
      .getConfiguredJourneys?.()
      .filter((j) => window.nextTrainJourneyModel.isJourneyKind(j)).length,
  }));

  await browser.close();

  if (state.routeCount < 1) {
    console.error("FAIL — seed route missing", state);
    process.exit(1);
  }

  if (!state.coachOpen || state.wizardSeen === "1") {
    console.error("FAIL — journey wizard should open with route saved and wizard unseen", state);
    process.exit(1);
  }

  console.log("PASS — journey wizard opens after a saved route (once-only gate)");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
