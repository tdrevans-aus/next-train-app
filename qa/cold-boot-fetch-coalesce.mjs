/**
 * Cold-boot double-fetch race — fetchNextTrain() coalescing.
 *
 * On cold boot, fetchNextTrain() could be triggered twice (once by init, once
 * by enterJourneyMode()) before the first request settled, firing two
 * concurrent /api/next-train requests. app.js now coalesces concurrent
 * triggers onto one in-flight request.
 *
 * Regression for docs/jim-brief-cold-boot-double-fetch.md.
 *
 * Usage: node qa/cold-boot-fetch-coalesce.mjs
 */
import { chromium } from "playwright";
import { BASE, ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";
import { waitForJourneyHero } from "./helpers/journey-smoke.mjs";

async function run() {
  let serverChild = null;
  try {
    serverChild = await ensureDevServer();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
      await page.goto(`${BASE}/?reset=1&test=1&fixture=empty&station=Edgewater%20Stn&direction=Perth`);
      await waitForJourneyHero(page, { timeout: 30000 }).catch(() => {});

      let requestCount = 0;
      page.on("request", (request) => {
        if (request.url().includes("/api/next-train")) {
          requestCount += 1;
        }
      });

      // Fire two fetchNextTrain() triggers back to back, before either can
      // settle — this is the shape of the cold-boot race (init +
      // enterJourneyMode()). Coalescing must land exactly one request.
      // (fetchNextTrain() is itself `async`, so each call always returns a
      // distinct top-level Promise wrapper even when both settle from the
      // same underlying in-flight request — the request count below is what
      // actually proves coalescing, not promise identity.)
      await page.evaluate(async () => {
        const first = window.nextTrainApp?.fetchNextTrain?.();
        const second = window.nextTrainApp?.fetchNextTrain?.();
        await Promise.all([first, second]);
      });

      // Give the network layer a moment to flush after both promises settle.
      await page.waitForTimeout(500);

      if (requestCount !== 1) {
        throw new Error(
          `Expected exactly 1 /api/next-train request for two back-to-back fetchNextTrain() calls, saw ${requestCount}`
        );
      }

      console.log("PASS — cold-boot-fetch-coalesce (1 request for 2 concurrent triggers)");
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
