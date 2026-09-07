/**
 * Cold-boot double-fetch race — fetchNextTrain() coalescing.
 *
 * On cold boot, fetchNextTrain() could be triggered twice (once by init, once
 * by enterJourneyMode()) before the first request settled, firing two
 * concurrent /api/next-train requests. app.js now coalesces concurrent
 * triggers onto one in-flight request, and schedules exactly one follow-up
 * request when a route/mode switch moves journeyBoardFetchId on while a
 * fetch is already in flight.
 *
 * v1 (docs/jim-brief-cold-boot-double-fetch.md) attached its request
 * listener *after* the two natural init fetches had already settled, so it
 * measured the wrong window — it passed even when fetchJourneyBoardCoalesced()
 * snapshotted journeyBoardFetchId *before* runJourneyBoardFetchCycle()'s
 * `++journeyBoardFetchId`, which made every overlapping trigger look "stale"
 * and schedule a spurious follow-up fetch. v2
 * (docs/jim-brief-cold-boot-double-fetch-v2.md) attaches the listener before
 * page load, waits for a genuinely quiescent point, and takes the request
 * count from there.
 *
 * Usage: node qa/cold-boot-fetch-coalesce.mjs
 */
import { chromium } from "playwright";
import { BASE, ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";
import { waitForJourneyHero } from "./helpers/journey-smoke.mjs";

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

function trackNextTrainRequests(page) {
  const requests = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/next-train")) {
      requests.push(request.url());
    }
  });
  return requests;
}

/** Waits until no new /api/next-train request has landed for `quietMs`. */
async function waitForQuiescence(requests, { quietMs = 800, timeoutMs = 12000 } = {}) {
  const start = Date.now();
  let lastCount = requests.length;
  let lastChange = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (requests.length !== lastCount) {
      lastCount = requests.length;
      lastChange = Date.now();
    } else if (Date.now() - lastChange >= quietMs) {
      return;
    }
  }
}

// Case 1: two fetchNextTrain() triggers fired back to back, from a quiescent
// point, with no route/mode switch in between — must coalesce to 1 request.
async function runBasicCoalesceCase(browser) {
  const page = await browser.newPage();
  try {
    const requests = trackNextTrainRequests(page);

    await page.goto(`${BASE}/?reset=1&test=1&fixture=empty&station=Edgewater%20Stn&direction=Perth`);
    await waitForJourneyHero(page, { timeout: 30000 }).catch(() => {});
    await waitForQuiescence(requests);

    const baseline = requests.length;

    // Fire two triggers back to back, before either can settle — the shape
    // of the cold-boot race (init + enterJourneyMode()).
    await page.evaluate(async () => {
      const first = window.nextTrainApp?.fetchNextTrain?.();
      const second = window.nextTrainApp?.fetchNextTrain?.();
      await Promise.all([first, second]);
    });

    await page.waitForTimeout(600);

    const since = requests.slice(baseline);
    if (since.length !== 1) {
      throw new Error(
        `Expected exactly 1 /api/next-train request for two back-to-back fetchNextTrain() calls ` +
          `from a quiescent point, saw ${since.length}: ${JSON.stringify(since)}`
      );
    }

    console.log("PASS — cold-boot-fetch-coalesce: two concurrent triggers with no switch coalesce to 1 request");
  } finally {
    await page.close();
  }
}

async function seedTwoRoutes(page) {
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
    { journeys: [ROUTE_A, ROUTE_B], activeJourneyId: "route-a" }
  );
}

// Case 2: two overlapping triggers where the second is a route switch that
// bumps journeyBoardFetchId (via discardStaleJourneyBoard()) between them —
// must yield exactly 2 requests, the second carrying the new station.
async function runRouteSwitchCase(browser) {
  const page = await browser.newPage();
  try {
    const requests = trackNextTrainRequests(page);

    await seedTwoRoutes(page);
    await page.goto(`${BASE}/?test=1&fixture=normal`);
    await page.evaluate(async () => {
      await window.nextTrainApp.enterRouteMode();
    });
    await page.waitForSelector("#hero-pin-btn:not([hidden])", { timeout: 25000 }).catch(() => {});
    await waitForQuiescence(requests);

    const baseline = requests.length;

    await page.evaluate(async () => {
      const first = window.nextTrainApp?.fetchNextTrain?.();
      // switchJourney() persists the new active journey, calls
      // discardStaleJourneyBoard() (bumping journeyBoardFetchId) and then
      // fetchNextTrain() itself — fired while the route-A cycle above is
      // still in flight.
      const second = window.nextTrainApp?.switchJourney?.("route-b");
      await Promise.all([first, second]);
    });

    await page.waitForTimeout(800);

    const since = requests.slice(baseline);
    if (since.length !== 2) {
      throw new Error(
        `Expected exactly 2 /api/next-train requests for a route switch between two overlapping ` +
          `triggers, saw ${since.length}: ${JSON.stringify(since)}`
      );
    }
    if (!since[0].includes("Edgewater")) {
      throw new Error(`First request should carry route A's station (Edgewater Stn), got ${since[0]}`);
    }
    if (!since[1].includes("Joondalup")) {
      throw new Error(`Second request should carry route B's station (Joondalup) after the switch, got ${since[1]}`);
    }

    console.log(
      "PASS — cold-boot-fetch-coalesce: route switch between overlapping triggers yields 2 requests, second for the new station"
    );
  } finally {
    await page.close();
  }
}

async function run() {
  let serverChild = null;
  try {
    serverChild = await ensureDevServer();
    const browser = await chromium.launch({ headless: true });
    try {
      await runBasicCoalesceCase(browser);
      await runRouteSwitchCase(browser);
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
