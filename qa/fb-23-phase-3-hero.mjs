/**
 * FB-23 Phase 3 — route board + commute-only auto schedule.
 * Usage: node qa/fb-23-phase-3-hero.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.waitForTimeout(500);

  const schedule = await page.evaluate(() => {
    const jm = window.nextTrainJourneyModel;
    const morning = jm.normalizeJourney({
      id: "j-morning",
      kind: "journey",
      name: "Morning",
      station: "Edgewater Stn",
      direction: "Perth",
      defaultFrom: "06:00",
      defaultUntil: "09:00",
      preferredTrainTime: "07:00",
    });
    const later = jm.normalizeJourney({
      id: "j-later",
      kind: "journey",
      name: "Later",
      station: "Edgewater Stn",
      direction: "Perth",
      defaultFrom: "06:00",
      defaultUntil: "09:00",
      preferredTrainTime: "08:00",
    });
    const route = jm.createRouteJourney({
      id: "j-route",
      name: "Route",
      station: "Edgewater Stn",
      direction: "Perth",
    });

    const pick = window.nextTrainApp?.pickScheduledJourney?.([
      morning,
      later,
    ], 7 * 60 + 20);
    const pickLate = window.nextTrainApp?.pickScheduledJourney?.([morning, later], 7 * 60 + 40);

    return {
      morningKind: morning.kind,
      routeKind: route.kind,
      routeHasWindow: !route.defaultFrom && !route.preferredTrainTime,
      pickEarly: pick?.id ?? null,
      pickLate: pickLate?.id ?? null,
    };
  });

  await page.evaluate(() => {
    const jm = window.nextTrainJourneyModel;
    jm.persistSettings({
      settingsSchemaVersion: 2,
      journeys: [
        jm.createRouteJourney({
          id: "route-1",
          name: "Evening route",
          station: "Edgewater Stn",
          direction: "Perth",
        }),
      ],
      activeJourneyId: "route-1",
    });
  });

  await page.evaluate(() => {
    window.nextTrainApp?.enterRouteMode?.();
  });

  await page.waitForTimeout(1200);

  const routeUi = await page.evaluate(() => ({
    pinHidden: document.getElementById("hero-pin-btn")?.hidden === true,
    leaveHidden: document.getElementById("leave-card")?.hidden === true,
    boardVisible:
      document.getElementById("upcoming-departures")?.hidden === false ||
      document.getElementById("nearby-directions")?.hidden === false,
  }));

  await browser.close();

  const pass =
    schedule.routeKind === "route" &&
    schedule.routeHasWindow &&
    schedule.pickEarly === "j-morning" &&
    schedule.pickLate === "j-later" &&
    routeUi.leaveHidden &&
    routeUi.boardVisible;

  if (pass) {
    console.log("PASS — FB-23 phase 3 hero", { schedule, routeUi });
  } else {
    console.error("FAIL — FB-23 phase 3 hero", { schedule, routeUi });
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
