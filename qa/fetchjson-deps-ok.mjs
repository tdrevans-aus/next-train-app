/**
 * CAPACITOR-18 — missing journey-detail fetchJson dep must not throw
 * TypeError: Cannot read properties of undefined (reading 'ok').
 *
 * Usage: node qa/fetchjson-deps-ok.mjs
 */
import { chromium } from "playwright";
import { BASE } from "./helpers/dev-server.mjs";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e?.message ?? e)));

  await page.addInitScript(() => {
    window.__unhandled = [];
    window.addEventListener("unhandledrejection", (event) => {
      window.__unhandled.push(String(event.reason?.message ?? event.reason));
    });
  });

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForFunction(() => typeof window.nextTrainJourneyDetail?.init === "function");

  const result = await page.evaluate(async () => {
    // Re-init without fetchJson to simulate a missed dep wire-up after the FB-25 split.
    window.nextTrainJourneyDetail.init({});
    let directionsError = null;
    try {
      await window.nextTrainJourneyDetail.fetchDirectionsFromApi("Edgewater Stn");
    } catch (error) {
      directionsError = String(error?.message ?? error);
    }
    return {
      directionsError,
      unhandled: window.__unhandled ?? [],
    };
  });

  const okRead = [...pageErrors, ...result.unhandled, result.directionsError ?? ""].filter((msg) =>
    /reading ['"]ok['"]/i.test(msg)
  );
  if (okRead.length) {
    throw new Error(`leaked reading 'ok': ${okRead.join("; ")}`);
  }
  if (!result.directionsError) {
    throw new Error("expected fetchDirectionsFromApi to reject when fetchJson dep is missing");
  }
  if (!/Could not load directions|Couldn't reach live times/i.test(result.directionsError)) {
    throw new Error(`unexpected error: ${result.directionsError}`);
  }

  console.log("PASS fetchjson-deps-ok");
  await browser.close();
}

run().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
