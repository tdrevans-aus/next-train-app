/**
 * CAPACITOR-V — sanitizeJourneyPinFields must resolve without ReferenceError.
 * Covers pin-state API, train-navigation re-export, and app.js global shim.
 * Usage: node qa/sanitize-journey-pin-fields.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer, BASE } from "./helpers/dev-server.mjs";

async function run() {
  let serverChild = null;
  try {
    serverChild = await ensureDevServer();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
      const pageErrors = [];
      page.on("pageerror", (error) => {
        pageErrors.push(String(error?.message ?? error));
      });

      await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
      await page.waitForFunction(
        () =>
          typeof window.nextTrainPinState?.sanitizeJourneyPinFields === "function" &&
          typeof window.nextTrainNavigation?.sanitizeJourneyPinFields === "function"
      );

      const probe = await page.evaluate(() => {
        const stale = {
          preferredTrainTime: "08:00",
          journeyPinOverrideIso: "2020-01-01T08:00:00+08:00",
          journeyPinOverrideDate: "2020-01-01",
          journeyPinDismissedDate: "2020-01-01",
        };

        const fromPinState = window.nextTrainPinState.sanitizeJourneyPinFields(stale);
        const fromNav = window.nextTrainNavigation.sanitizeJourneyPinFields(stale);
        let fromGlobal = null;
        const globalType = typeof sanitizeJourneyPinFields;
        let globalThrew = null;
        try {
          fromGlobal = sanitizeJourneyPinFields(stale);
        } catch (error) {
          globalThrew = String(error?.message ?? error);
        }

        let resolveThrew = null;
        try {
          window.nextTrainPinState.resolvePinState({
            mode: "journey",
            journey: {
              preferredTrainTime: "08:00",
              defaultFrom: "00:00",
              defaultUntil: "23:59",
              remindDays: [1, 2, 3, 4, 5, 6, 7],
            },
            payload: {
              next: { departure: "2026-08-22T08:15:00+08:00" },
              following: [],
            },
            clock: {
              nowMs: new Date("2026-08-22T07:00:00+08:00").getTime(),
              perthDateKey: "2026-08-22",
            },
          });
        } catch (error) {
          resolveThrew = String(error?.message ?? error);
        }

        return {
          globalType,
          globalThrew,
          resolveThrew,
          pinStateClearedOverride: fromPinState?.journeyPinOverrideDate === "",
          pinStateClearedDismissed: fromPinState?.journeyPinDismissedDate === "",
          navClearedOverride: fromNav?.journeyPinOverrideDate === "",
          globalClearedOverride:
            fromGlobal?.journeyPinDismissedDate === "" &&
            fromGlobal?.journeyPinOverrideDate === "",
        };
      });

      if (probe.globalType !== "function") {
        throw new Error(
          `expected global sanitizeJourneyPinFields function, got ${probe.globalType}`
        );
      }
      if (probe.globalThrew) {
        throw new Error(`global sanitizeJourneyPinFields threw: ${probe.globalThrew}`);
      }
      if (probe.resolveThrew) {
        throw new Error(`resolvePinState threw: ${probe.resolveThrew}`);
      }
      if (!probe.pinStateClearedOverride || !probe.pinStateClearedDismissed) {
        throw new Error("pin-state sanitizeJourneyPinFields did not clear stale day fields");
      }
      if (!probe.navClearedOverride || !probe.globalClearedOverride) {
        throw new Error(
          "train-navigation / global sanitizeJourneyPinFields did not clear stale override"
        );
      }

      const crash = pageErrors.find((msg) =>
        /sanitizeJourneyPinFields is not defined/i.test(msg)
      );
      if (crash) {
        throw new Error(crash);
      }
      if (pageErrors.length) {
        throw new Error(`page errors: ${pageErrors.join("; ")}`);
      }

      console.log("PASS sanitize-journey-pin-fields");
    } finally {
      await browser.close();
    }
  } finally {
    await stopDevServer(serverChild);
  }
}

run().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
