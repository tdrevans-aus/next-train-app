/**
 * FB-27 / FB-23 — journey kind (route vs commute) in journey-model.
 * Usage: node qa/journey-kind.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.waitForTimeout(500);

  const results = await page.evaluate(() => {
    const jm = window.nextTrainJourneyModel;
    const route = jm.normalizeJourney({
      station: "Edgewater Stn",
      direction: "Perth",
      defaultFrom: "06:00",
      defaultUntil: "09:00",
    });
    const commutePreferred = jm.normalizeJourney({
      station: "Edgewater Stn",
      direction: "Perth",
      preferredTrainTime: "07:30",
    });
    const commuteTemplate = jm.normalizeJourney({
      name: "Morning into town",
      templateKey: "morning",
      station: "Edgewater Stn",
      direction: "Perth",
      preferredTrainTime: "07:30",
      remindMe: true,
    });
    const explicitRoute = jm.normalizeJourney({
      kind: "route",
      station: "Edgewater Stn",
      direction: "Perth",
      preferredTrainTime: "07:30",
    });
    const strippedRoute = jm.normalizeJourney({
      kind: "route",
      station: "Edgewater Stn",
      direction: "Perth",
      preferredTrainTime: "07:30",
      defaultFrom: "06:00",
      defaultUntil: "09:00",
    });
    return {
      route: route.kind,
      commutePreferred: commutePreferred.kind,
      commuteTemplate: commuteTemplate.kind,
      explicitRoute: explicitRoute.kind,
      strippedPreferred: strippedRoute.preferredTrainTime,
      isCommute: jm.isCommuteJourney(commutePreferred),
      isRoute: jm.isRouteJourney(route),
    };
  });

  await browser.close();

  const pass =
    results.route === "route" &&
    results.commutePreferred === "commute" &&
    results.commuteTemplate === "commute" &&
    results.explicitRoute === "route" &&
    results.strippedPreferred === "" &&
    results.isCommute &&
    results.isRoute;

  if (pass) {
    console.log("PASS — journey kind inference", results);
  } else {
    console.error("FAIL — journey kind inference", results);
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
