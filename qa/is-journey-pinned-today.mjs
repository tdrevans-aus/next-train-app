/**
 * CAPACITOR-1C — isJourneyPinnedToday must resolve without ReferenceError.
 * Covers pin-state API, train-navigation alias, and app.js global shim used by
 * findActiveJourneyPinId / clearOtherPinnedTrains.
 * Usage: node qa/is-journey-pinned-today.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";

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

      await page.goto("http://localhost:3000/?reset=1&test=1&fixture=normal");
      await page.waitForFunction(
        () =>
          typeof window.nextTrainPinState?.isJourneyPinnedToday === "function" &&
          typeof window.nextTrainNavigation?.isJourneyPinnedToday === "function" &&
          typeof window.nextTrainNavigation?.isJourneyTargetPinnedToday === "function"
      );

      const probe = await page.evaluate(() => {
        const journey = {
          preferredTrainTime: "08:00",
          defaultFrom: "00:00",
          defaultUntil: "23:59",
          remindDays: [1, 2, 3, 4, 5, 6, 7],
          journeyPinOverrideIso: "",
          journeyPinOverrideDate: "",
          journeyPinDismissedDate: "",
        };
        const clock = {
          nowMs: new Date("2026-08-26T07:30:00+08:00").getTime(),
          perthDateKey: "2026-08-26",
        };

        const fromPinState = window.nextTrainPinState.isJourneyPinnedToday(journey, clock);
        const fromNav = window.nextTrainNavigation.isJourneyPinnedToday(journey);
        const fromNavAlias = window.nextTrainNavigation.isJourneyTargetPinnedToday(journey);

        let fromGlobal = null;
        const globalType = typeof isJourneyPinnedToday;
        let globalThrew = null;
        try {
          fromGlobal = isJourneyPinnedToday(journey);
        } catch (error) {
          globalThrew = String(error?.message ?? error);
        }

        let reconcileThrew = null;
        try {
          if (typeof reconcileExclusivePinState === "function") {
            reconcileExclusivePinState({ type: "nearby" });
          }
          if (typeof findActiveJourneyPinId === "function") {
            findActiveJourneyPinId();
          }
        } catch (error) {
          reconcileThrew = String(error?.message ?? error);
        }

        return {
          globalType,
          globalThrew,
          reconcileThrew,
          fromGlobal,
          fromPinState,
          fromNav,
          fromNavAlias,
          pinStateNavMatch: fromPinState === fromNav,
          navAliasMatch: fromNav === fromNavAlias,
        };
      });

      if (probe.globalType !== "function") {
        throw new Error(
          `expected global isJourneyPinnedToday function, got ${probe.globalType}`
        );
      }
      if (probe.globalThrew) {
        throw new Error(`global isJourneyPinnedToday threw: ${probe.globalThrew}`);
      }
      if (probe.reconcileThrew) {
        throw new Error(
          `exclusive-pin helpers threw: ${probe.reconcileThrew}`
        );
      }
      if (!probe.pinStateNavMatch || !probe.navAliasMatch) {
        throw new Error(
          `pin helpers disagree: pinState=${probe.fromPinState} nav=${probe.fromNav} alias=${probe.fromNavAlias}`
        );
      }
      if (typeof probe.fromGlobal !== "boolean") {
        throw new Error(
          `expected boolean from global isJourneyPinnedToday, got ${typeof probe.fromGlobal}`
        );
      }

      const crash = pageErrors.find((msg) =>
        /isJourneyPinnedToday is not defined/i.test(msg)
      );
      if (crash) {
        throw new Error(crash);
      }
      if (pageErrors.length) {
        throw new Error(`page errors: ${pageErrors.join("; ")}`);
      }

      console.log("PASS is-journey-pinned-today");
    } finally {
      await browser.close();
    }
  } finally {
    await stopDevServer(serverChild);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
