/**
 * CAPACITOR-K / GitHub #27 — network fetch failures must not become unhandled TypeErrors.
 * Usage: node qa/network-fetch-no-unhandled.mjs
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

  await page.route("**/api/**", (route) => route.abort());
  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForFunction(() => typeof fetchJson === "function");

  const result = await page.evaluate(async () => {
    const json = await fetchJson("/api/directions?station=Edgewater%20Stn");
    let directionsError = null;
    try {
      await window.nextTrainJourneyDetail.fetchDirectionsFromApi("Edgewater Stn");
    } catch (error) {
      directionsError = String(error?.message ?? error);
    }
    return {
      json,
      directionsError,
      unhandled: window.__unhandled ?? [],
    };
  });

  if (result.json?.ok !== false) {
    throw new Error(`fetchJson should fail closed, got ${JSON.stringify(result.json)}`);
  }
  if (!/Couldn't reach live times/i.test(result.json?.error ?? "")) {
    throw new Error(`fetchJson error was ${result.json?.error}`);
  }
  if (/Failed to fetch/i.test(result.directionsError ?? "")) {
    throw new Error(`fetchDirectionsFromApi leaked TypeError: ${result.directionsError}`);
  }

  const leaked = [...pageErrors, ...result.unhandled].filter((msg) =>
    /Failed to fetch/i.test(msg)
  );
  if (leaked.length) {
    throw new Error(`unhandled Failed to fetch: ${leaked.join("; ")}`);
  }

  console.log("PASS network-fetch-no-unhandled");
  await browser.close();
}

run().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
