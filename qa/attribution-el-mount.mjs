/**
 * CAPACITOR-X — attributionEl must be defined before mountNearbyMode passes it.
 * London TfL attribution was added to mount deps without a module-level DOM binding,
 * so every init threw ReferenceError: attributionEl is not defined.
 * Usage: node qa/attribution-el-mount.mjs
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
      await page.waitForFunction(() => typeof window.nextTrainApp?.enterNearbyMode === "function");

      const probe = await page.evaluate(() => {
        const el = document.getElementById("attribution");
        return {
          hasAttributionNode: Boolean(el),
          attributionHidden: el ? el.hidden : null,
          appReady: typeof window.nextTrainApp?.enterNearbyMode === "function",
        };
      });

      if (!probe.appReady) {
        throw new Error("nextTrainApp.enterNearbyMode missing after load");
      }
      if (!probe.hasAttributionNode) {
        throw new Error("#attribution node missing from index.html");
      }

      const crash = pageErrors.find((msg) => /attributionEl is not defined/i.test(msg));
      if (crash) {
        throw new Error(crash);
      }
      if (pageErrors.length) {
        throw new Error(`page errors: ${pageErrors.join("; ")}`);
      }

      console.log("PASS attribution-el-mount");
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
