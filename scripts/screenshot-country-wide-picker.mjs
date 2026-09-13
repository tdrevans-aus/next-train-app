/**
 * Captures the two country-wide picker screenshots for the PR description
 * (docs/jim-brief-country-wide-station-picker.md "Process" section):
 * list before typing, list mid-query. Not a QA gate — a one-off convenience
 * script, run manually.
 *
 * Usage: node scripts/screenshot-country-wide-picker.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer, BASE } from "../qa/helpers/dev-server.mjs";
import { openJourneySetup } from "../qa/helpers/travel-library.mjs";
import { openStationSearch } from "../qa/helpers/station-combobox.mjs";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "docs", "outreach-drafts", "country-wide-picker-screens");

async function run() {
  let spawned;
  const browser = await chromium.launch({ headless: true });
  try {
    spawned = await ensureDevServer();
    mkdirSync(OUT_DIR, { recursive: true });

    const context = await browser.newContext({ viewport: { width: 420, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);

    await page.evaluate(async () => {
      await window.NextTrainCitySession.applyCity("uk-london-tfl", { persist: true, explicit: true });
      const select = document.querySelector("[data-region-city]");
      select.value = "";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForTimeout(1500);

    await openJourneySetup(page);
    await page.waitForSelector("#settings-detail-view", { state: "visible", timeout: 15000 });
    await page.waitForTimeout(500);

    // Dismiss the "Station & direction" onboarding coach so it doesn't cover
    // the picker in the screenshot.
    await page.evaluate(() => {
      const skip = document.getElementById("template-wizard-skip-btn");
      if (skip) skip.click();
      const coach = document.getElementById("template-route-coach");
      if (coach) coach.hidden = true;
    });
    await page.waitForTimeout(300);

    await openStationSearch(page, {
      rootSelector: "#detail-station-combobox",
      inputSelector: "#detail-station-input",
      listboxSelector: "#detail-station-listbox",
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT_DIR, "01-before-typing.png") });
    console.log(`Saved ${join(OUT_DIR, "01-before-typing.png")}`);

    await page.locator("#detail-station-combobox .station-combobox-search-input").fill("croy");
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT_DIR, "02-mid-query.png") });
    console.log(`Saved ${join(OUT_DIR, "02-mid-query.png")}`);

    await context.close();
  } finally {
    await browser.close();
    if (spawned) {
      await stopDevServer();
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
