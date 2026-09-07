/**
 * London picker browser check — docs/jim-brief-london-tram-duplicate-stops.md (A2).
 *
 * Before the catalog dedupe, searching the station picker for a London
 * Trams stop showed the same name 2-3 times with nothing to tell the rows
 * apart (TfL returns a hub + one row per platform for every Tramlink
 * stop). This confirms the picker now shows exactly one "Addington
 * Village" row, and spot-checks a second tram stop with a bigger fan-out
 * (three raw StopPoints pre-dedupe).
 *
 * Usage: node qa/london-picker-no-duplicate-stops.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer, BASE } from "./helpers/dev-server.mjs";
import { openCustomJourneyCreate } from "./helpers/open-custom-journey.mjs";
import { openStationSearch } from "./helpers/station-combobox.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function optionTextsFor(page, query) {
  await page.locator("#detail-station-combobox .station-combobox-search-input").fill(query);
  await page.waitForTimeout(400);
  return page.evaluate(() =>
    [...document.querySelectorAll("#detail-station-listbox .station-combobox-option")].map((el) =>
      el.textContent.trim()
    )
  );
}

async function run() {
  let spawned;
  const browser = await chromium.launch({ headless: true });
  try {
    spawned = await ensureDevServer();
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
    await page.waitForTimeout(800);

    await page.evaluate(async () => {
      await window.NextTrainCitySession.applyCity("uk-london-tfl", { persist: true, explicit: true });
    });
    await page.reload();
    await page.waitForTimeout(1200);

    await openCustomJourneyCreate(page);
    await page.locator("#detail-station-input").waitFor({ state: "visible", timeout: 15000 });

    await openStationSearch(page, {
      rootSelector: "#detail-station-combobox",
      inputSelector: "#detail-station-input",
      listboxSelector: "#detail-station-listbox",
    });

    const addington = await optionTextsFor(page, "Addington");
    console.log("  Addington search results:", addington);
    assert(
      addington.filter((text) => text.startsWith("Addington Village")).length === 1,
      `Expected exactly one "Addington Village" row, got ${JSON.stringify(addington)}`
    );

    const eastCroydon = await optionTextsFor(page, "East Croydon");
    console.log("  East Croydon search results:", eastCroydon);
    assert(
      eastCroydon.filter((text) => text.startsWith("East Croydon")).length === 1,
      `Expected exactly one "East Croydon" row, got ${JSON.stringify(eastCroydon)}`
    );

    console.log("PASS london-picker-no-duplicate-stops");
  } finally {
    await browser.close();
    await stopDevServer(spawned);
  }
}

run().catch((error) => {
  console.error("FAIL london-picker-no-duplicate-stops:", error.message);
  process.exit(1);
});
