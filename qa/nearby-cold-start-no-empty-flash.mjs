/**
 * Near me cold start must not flash "No upcoming trains" while locating/fetching.
 * Usage: node qa/nearby-cold-start-no-empty-flash.mjs
 */
import { chromium } from "playwright";

import { BASE } from "./helpers/dev-server.mjs";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const seen = [];
  await page.exposeFunction("recordDepartCopy", (text) => {
    if (text) {
      seen.push(text);
    }
  });

  await page.addInitScript(() => {
    const el = document.getElementById("depart-display-time");
    if (!el) {
      return;
    }
    const push = () => window.recordDepartCopy(el.textContent?.trim() ?? "");
    push();
    new MutationObserver(push).observe(el, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(3500);

  const finalRoute = await page.locator("#route").textContent();
  const hadEmptyFlash = seen.includes("No upcoming trains");
  const hadLoading =
    seen.includes("Finding your nearest station…") ||
    seen.includes("Loading departures…") ||
    seen.some((text) => text.includes("locate-spinner"));

  if (!hadEmptyFlash && finalRoute?.includes("Near you")) {
    console.log("PASS — no empty flash on cold start; board populated");
  } else {
    console.error("FAIL", { hadEmptyFlash, hadLoading, seen, finalRoute });
    process.exitCode = 1;
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
