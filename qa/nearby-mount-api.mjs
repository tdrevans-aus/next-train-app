/**
 * CAPACITOR-Y — nearbyMode().mount must exist after Near me module load.
 * London release boot calls mountNearbyMode() → nearbyMode().mount(...);
 * without mount on the API every app init throws TypeError.
 * Usage: node qa/nearby-mount-api.mjs
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
        () => typeof window.nextTrainNearby?.mount === "function"
      );

      const probe = await page.evaluate(async () => {
        const api = window.nextTrainNearby;
        let mountThrew = null;
        try {
          await api.mount({});
        } catch (error) {
          mountThrew = String(error?.message ?? error);
        }
        return {
          mountType: typeof api?.mount,
          initType: typeof api?.init,
          mountThrew,
        };
      });

      if (probe.mountType !== "function") {
        throw new Error(`expected nextTrainNearby.mount function, got ${probe.mountType}`);
      }
      if (probe.initType !== "function") {
        throw new Error(`expected nextTrainNearby.init function, got ${probe.initType}`);
      }
      if (probe.mountThrew) {
        throw new Error(`mount({}) threw: ${probe.mountThrew}`);
      }

      const crash = pageErrors.find((msg) =>
        /mount is not a function|mountNearbyMode is not defined|attributionEl is not defined/i.test(
          msg
        )
      );
      if (crash) {
        throw new Error(crash);
      }
      if (pageErrors.length) {
        throw new Error(`page errors: ${pageErrors.join("; ")}`);
      }

      console.log("PASS nearby-mount-api");
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
