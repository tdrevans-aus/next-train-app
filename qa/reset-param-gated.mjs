/**
 * D-05 (docs/dwayne-security-review-play-3.0.0.md): `?reset=1` on the public web must not wipe a
 * visitor's storage unless `test=1` is also present. Before the fix, `applyTestQueryParams()`
 * cleared localStorage/sessionStorage for any visitor of a crafted
 * `https://next-train-app.vercel.app/?reset=1` link.
 *
 * This gate seeds a journey, then:
 *   1. loads `/?reset=1` (no `test`) and asserts the seeded journey SURVIVES.
 *   2. loads `/?reset=1&test=1` and asserts storage IS cleared (every existing QA script relies
 *      on this combination to reset state between runs — that must stay green).
 *
 * Usage: node qa/reset-param-gated.mjs
 */
import { chromium } from "playwright";
import { BASE, ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";

const SEEDED_SETTINGS = JSON.stringify({
  settingsSchemaVersion: 2,
  refreshSeconds: 60,
  activeJourneyId: "reset-gate-journey",
  journeys: [
    {
      id: "reset-gate-journey",
      kind: "route",
      name: "Reset gate probe",
      station: "Edgewater Stn",
      direction: "Perth",
      leaveBeforeMinutes: 10,
    },
  ],
});

async function seedJourney(page) {
  await page.goto(`${BASE}/?fixture=normal`);
  await page.evaluate((settings) => {
    localStorage.setItem("nextTrainSettings", settings);
    sessionStorage.setItem("marker", "1");
  }, SEEDED_SETTINGS);
}

async function readStorage(page) {
  return page.evaluate(() => ({
    settings: localStorage.getItem("nextTrainSettings"),
    marker: sessionStorage.getItem("marker"),
  }));
}

async function run() {
  let serverChild = null;
  try {
    serverChild = await ensureDevServer();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
      // Case 1: reset=1 with no test=1 must NOT clear storage.
      await seedJourney(page);
      await page.goto(`${BASE}/?reset=1&fixture=normal`);
      await page.waitForTimeout(500);
      const afterBareReset = await readStorage(page);
      if (!afterBareReset.settings || !afterBareReset.settings.includes("reset-gate-journey")) {
        throw new Error(
          `FAIL reset-param-gated — /?reset=1 (no test=1) wiped storage on a public-web host: ${JSON.stringify(afterBareReset)}`
        );
      }

      // Case 2: reset=1&test=1 (the QA convention) must still clear storage.
      await seedJourney(page);
      await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
      await page.waitForTimeout(500);
      const afterTestReset = await readStorage(page);
      if (afterTestReset.settings && afterTestReset.settings.includes("reset-gate-journey")) {
        throw new Error(
          `FAIL reset-param-gated — /?reset=1&test=1 did not clear storage as QA scripts require: ${JSON.stringify(afterTestReset)}`
        );
      }

      console.log("PASS reset-param-gated — reset=1 alone leaves storage intact; reset=1&test=1 still clears it");
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
