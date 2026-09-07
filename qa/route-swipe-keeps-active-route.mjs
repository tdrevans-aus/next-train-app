/**
 * Route-switch hijack fix (docs/jim-brief-route-switch-hijack.md).
 *
 * A saved Route stays active while its hero is swiped, even when another saved
 * journey has an Active schedule window or a pinned target train for today —
 * and the journey switcher's manual choice always wins immediately, regardless
 * of any other journey's schedule/pin state. Covers acceptance criteria 1-4.
 *
 * Usage: node qa/route-swipe-keeps-active-route.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer, BASE } from "./helpers/dev-server.mjs";

function pad2(n) {
  return String(n).padStart(2, "0");
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

async function getActiveJourneyId(page) {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem("nextTrainSettings") || "{}").activeJourneyId
  );
}

async function seedSettings(page, journeys, activeJourneyId, tab = "routes") {
  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.evaluate(
    ({ journeys, activeJourneyId }) => {
      localStorage.setItem(
        "nextTrainSettings",
        JSON.stringify({
          settingsSchemaVersion: 2,
          refreshSeconds: 60,
          activeJourneyId,
          journeys,
        })
      );
      localStorage.setItem("nextTrainOnboardingDone", "1");
    },
    { journeys, activeJourneyId }
  );
  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.evaluate(async (tab) => {
    if (tab === "journeys") {
      await window.nextTrainApp.enterJourneyMode();
    } else {
      await window.nextTrainApp.enterRouteMode();
    }
  }, tab);
  await page.waitForSelector("#hero-pin-btn:not([hidden])", { timeout: 25000 });
  await page.waitForTimeout(600);
}

/** A journey-kind window/pin centred on "now" so it's a live magnet regardless of wall-clock. */
async function buildMagnetJourney(page, overrides = {}) {
  const nowMinutes = await page.evaluate(() => window.nextTrainApp.getPerthMinutesSinceMidnight());
  const target = (nowMinutes + 24 * 60) % (24 * 60);
  const from = (target - 30 + 24 * 60) % (24 * 60);
  const until = (target + 30) % (24 * 60);
  const fmt = (m) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
  return {
    id: "journey-magnet",
    kind: "journey",
    name: "Magnet journey",
    station: "Joondalup",
    direction: "Perth",
    leaveBeforeMinutes: 10,
    preferredTrainTime: fmt(target),
    defaultFrom: fmt(from),
    defaultUntil: fmt(until),
    remindMe: true,
    remindDays: [1, 2, 3, 4, 5, 6, 7],
    ...overrides,
  };
}

const ROUTE_A = {
  id: "route-a",
  kind: "route",
  name: "Route A",
  station: "Edgewater Stn",
  direction: "Perth",
  leaveBeforeMinutes: 10,
};

const ROUTE_B = {
  id: "route-b",
  kind: "route",
  name: "Route B",
  station: "Joondalup",
  direction: "Perth",
  leaveBeforeMinutes: 10,
};

async function runSwipeScenario(page, label, journeyB) {
  await seedSettings(page, [ROUTE_A, journeyB], "route-a");

  const before = await getActiveJourneyId(page);
  if (before !== "route-a") {
    throw new Error(`${label}: setup failed, active journey is ${before}, expected route-a`);
  }

  const canPrevBefore = await page.evaluate(() => window.nextTrainNavigation?.canSkipToEarlierTrain?.());
  if (canPrevBefore) {
    throw new Error(`${label}: board should start at the live train, not already skipped`);
  }

  const swiped = await swipeHeroLeft(page);
  if (!swiped) {
    throw new Error(`${label}: hero bounding box missing`);
  }
  await page.waitForTimeout(900);

  const afterFirstSwipe = await getActiveJourneyId(page);
  if (afterFirstSwipe !== "route-a") {
    throw new Error(
      `${label}: swipe hijacked active route — activeJourneyId became ${afterFirstSwipe}`
    );
  }

  const canPrevAfter = await page.evaluate(() => window.nextTrainNavigation?.canSkipToEarlierTrain?.());
  if (!canPrevAfter) {
    throw new Error(`${label}: swipe did not advance route A's board (canSkipToEarlierTrain still false)`);
  }

  // A second refresh (another schedule/pin evaluation tick) must not dislodge it either.
  await page.evaluate(() => window.nextTrainApp.fetchNextTrain());
  await page.waitForTimeout(400);
  const afterRefetch = await getActiveJourneyId(page);
  if (afterRefetch !== "route-a") {
    throw new Error(
      `${label}: a later refresh hijacked active route — activeJourneyId became ${afterRefetch}`
    );
  }

  console.log(`PASS — ${label}`);
}

async function runSwitcherScenario(page) {
  const magnet = await buildMagnetJourney(page);
  await seedSettings(page, [ROUTE_A, ROUTE_B, magnet], "journey-magnet", "journeys");

  const activeAtStart = await getActiveJourneyId(page);
  if (activeAtStart !== "journey-magnet") {
    throw new Error(`switcher setup failed, active journey is ${activeAtStart}, expected journey-magnet`);
  }

  // Manual choice of a Route must win immediately, in the same fetch, over the live magnet.
  await page.evaluate(() => window.nextTrainApp.switchJourney("route-a"));
  await page.waitForTimeout(400);
  let active = await getActiveJourneyId(page);
  if (active !== "route-a") {
    throw new Error(`switcher: choosing Route A did not stick within one fetch (active=${active})`);
  }

  // Another refresh with nothing new happening must not revert to the magnet.
  await page.evaluate(() => window.nextTrainApp.fetchNextTrain());
  await page.waitForTimeout(400);
  active = await getActiveJourneyId(page);
  if (active !== "route-a") {
    throw new Error(`switcher: a later refresh reverted the manual Route A choice (active=${active})`);
  }

  // Manual choice of a plain (non-magnet) Journey must also win over the magnet.
  const plainJourney = {
    id: "journey-plain",
    kind: "journey",
    name: "Plain journey",
    station: "Edgewater Stn",
    direction: "Perth",
    leaveBeforeMinutes: 10,
    preferredTrainTime: "23:55",
    remindMe: true,
    remindDays: [1, 2, 3, 4, 5, 6, 7],
  };
  await page.evaluate((journey) => {
    const settings = window.nextTrainApp.getSettings();
    settings.journeys.push(journey);
    localStorage.setItem("nextTrainSettings", JSON.stringify(settings));
  }, plainJourney);

  await page.evaluate(() => window.nextTrainApp.switchJourney("journey-plain"));
  await page.waitForTimeout(400);
  active = await getActiveJourneyId(page);
  if (active !== "journey-plain") {
    throw new Error(`switcher: choosing a plain Journey did not stick within one fetch (active=${active})`);
  }

  await page.evaluate(() => window.nextTrainApp.fetchNextTrain());
  await page.waitForTimeout(400);
  active = await getActiveJourneyId(page);
  if (active !== "journey-plain") {
    throw new Error(`switcher: a later refresh reverted the manual Journey choice (active=${active})`);
  }

  console.log("PASS — journey switcher choice always wins within one fetch (criterion 4)");
}

async function run() {
  let serverChild = null;
  try {
    serverChild = await ensureDevServer();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
      // Criterion 1: two Routes, B not active — swipe keeps A active.
      await runSwipeScenario(page, "criterion 1 (Route B not active)", ROUTE_B);

      // Criterion 2: B is a Journey-kind whose Active window matches now.
      const scheduledJourney = await buildMagnetJourney(page, {
        id: "journey-scheduled",
        name: "Scheduled journey",
      });
      await runSwipeScenario(page, "criterion 2 (Journey B active schedule window)", scheduledJourney);

      // Criterion 3: B is a Journey-kind with a pinned target train for today.
      const pinnedJourney = await buildMagnetJourney(page, {
        id: "journey-pinned",
        name: "Pinned journey",
      });
      await runSwipeScenario(page, "criterion 3 (Journey B pinned target train)", pinnedJourney);

      // Criterion 4: the switcher's manual choice always wins, immediately.
      await runSwitcherScenario(page);

      console.log("PASS — route-swipe-keeps-active-route");
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("FAIL — route-swipe-keeps-active-route:", error.message);
    process.exitCode = 1;
  } finally {
    stopDevServer(serverChild);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
