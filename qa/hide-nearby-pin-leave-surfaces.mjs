/**
 * CAPACITOR-C / CAPACITOR-D: render / fetchNextTrain must not throw
 * ReferenceError: hideNearbyPinLeaveSurfaces is not defined.
 * Usage: node qa/hide-nearby-pin-leave-surfaces.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const pageErrors = [];
  page.on("pageerror", (error) => {
    pageErrors.push(String(error?.message ?? error));
  });

  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await page.waitForTimeout(1500);

  const probe = await page.evaluate(async () => {
    const typeofHide = typeof hideNearbyPinLeaveSurfaces;
    let renderError = null;
    try {
      // Journey empty / live refresh both reach render paths that call hide.
      if (typeof renderJourneyEmptyState === "function") {
        renderJourneyEmptyState();
      }
      if (typeof refreshLiveDisplay === "function") {
        refreshLiveDisplay(true);
      }
      if (typeof fetchNextTrain === "function") {
        await fetchNextTrain();
      }
    } catch (error) {
      renderError = String(error?.message ?? error);
    }
    return { typeofHide, renderError };
  });

  await page.waitForTimeout(500);

  const hideCrash = pageErrors.some((message) =>
    /hideNearbyPinLeaveSurfaces is not defined/i.test(message)
  );
  const probeCrash = /hideNearbyPinLeaveSurfaces is not defined/i.test(
    probe.renderError ?? ""
  );

  if (probe.typeofHide === "function" && !hideCrash && !probeCrash && !probe.renderError) {
    console.log("PASS — hideNearbyPinLeaveSurfaces is defined; render/fetch did not throw");
  } else {
    console.error("FAIL — hideNearbyPinLeaveSurfaces guard", {
      probe,
      hideCrash,
      pageErrors,
    });
    process.exitCode = 1;
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
