/**
 * Routes must not consume the 5-journey cap on My Journeys.
 * Usage: node qa/journey-cap-ignores-routes.mjs
 */
import { chromium } from "playwright";
import { openJourneysLibrary, seedPersistedJourneys } from "./helpers/travel-library.mjs";

import { BASE } from "./helpers/dev-server.mjs";

function route(id, name, station, direction) {
  return {
    id,
    kind: "route",
    name,
    station,
    direction,
    cityId: "perth",
  };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(800);

  await seedPersistedJourneys(page, [
    route("r1", "Edgewater", "Edgewater Stn", "Perth"),
    route("r2", "Warwick", "Warwick Stn", "Perth"),
    route("r3", "Stirling", "Stirling Stn", "Perth"),
    route("r4", "Joondalup", "Joondalup Stn", "Perth"),
    route("r5", "Whitfords", "Whitfords Stn", "Perth"),
  ]);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  await openJourneysLibrary(page);

  const state = await page.evaluate(() => {
    const capHint = document.getElementById("journey-templates-cap-hint");
    const setup = document.getElementById("journey-setup-btn");
    const jm = window.nextTrainJourneyModel;
    const stored = jm.readStoredSettings().journeys || [];
    return {
      routeCount: stored.filter((j) => jm.isRouteJourney(j)).length,
      journeyCount: stored.filter((j) => jm.isJourneyKind(j)).length,
      atCap: window.nextTrainApp?.isAtJourneyCap?.() ?? null,
      capHintVisible: Boolean(capHint && !capHint.hidden),
      setupVisible: Boolean(setup && !setup.hidden),
    };
  });

  await browser.close();

  if (state.routeCount !== 5 || state.journeyCount !== 0) {
    console.error("FAIL journey-cap-ignores-routes — seed not as expected", state);
    process.exit(1);
  }
  if (state.atCap === true) {
    console.error("FAIL journey-cap-ignores-routes — routes counted toward journey cap", state);
    process.exit(1);
  }
  if (state.capHintVisible) {
    console.error("FAIL journey-cap-ignores-routes — cap hint shown with only routes", state);
    process.exit(1);
  }
  if (!state.setupVisible) {
    console.error("FAIL journey-cap-ignores-routes — Set up a journey hidden", state);
    process.exit(1);
  }

  console.log("PASS journey-cap-ignores-routes");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
