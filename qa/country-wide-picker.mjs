/**
 * Country-wide station picker (docs/jim-brief-country-wide-station-picker.md).
 * - Region select defaults to "All" for a fresh install.
 * - GET /api/country-stations returns every live region's stations for a
 *   country, tagged with region, and 400s for an unknown country.
 * - The "Choose station" combobox searches the whole country, tags
 *   cross-region matches, and selecting a station silently switches the
 *   active region (no explicit Region pick).
 *
 * Usage: node qa/country-wide-picker.mjs
 */
import { chromium } from "playwright";
import { BASE } from "./helpers/dev-server.mjs";
import { openJourneySetup } from "./helpers/travel-library.mjs";

let failed = false;

function pass(id, notes) {
  console.log(`  PASS — ${id}${notes ? `: ${notes}` : ""}`);
}

function fail(id, notes) {
  failed = true;
  console.error(`  FAIL — ${id}${notes ? `: ${notes}` : ""}`);
}

async function run() {
  console.log("country-wide-picker: starting Playwright suite...");

  // 1. GET /api/country-stations — server contract.
  {
    const ukRes = await fetch(`${BASE}/api/country-stations?country=gb-eng`);
    const ukBody = await ukRes.json();
    const hasRegionField =
      Array.isArray(ukBody.stations) &&
      ukBody.stations.length > 0 &&
      ukBody.stations.every((s) => s.region && typeof s.region.id === "string" && typeof s.region.displayName === "string");
    const hasMultipleRegions = new Set((ukBody.stations || []).map((s) => s.region.id)).size > 1;
    if (ukRes.status === 200 && hasRegionField && hasMultipleRegions) {
      pass("country-stations gb-eng", `${ukBody.stations.length} stations across ${ukBody.regions.length} regions`);
    } else {
      fail("country-stations gb-eng", JSON.stringify({ status: ukRes.status, hasRegionField, hasMultipleRegions }));
    }

    const badRes = await fetch(`${BASE}/api/country-stations?country=zz-nowhere`);
    if (badRes.status === 400) {
      pass("country-stations unknown country -> 400");
    } else {
      fail("country-stations unknown country -> 400", `got ${badRes.status}`);
    }

    const auRes = await fetch(`${BASE}/api/country-stations?country=au`);
    const auBody = await auRes.json();
    const hasPerth = (auBody.stations || []).some((s) => s.region.id === "perth");
    if (auRes.status === 200 && hasPerth) {
      pass("country-stations au includes Perth");
    } else {
      fail("country-stations au includes Perth", `status=${auRes.status} hasPerth=${hasPerth}`);
    }
  }

  const browser = await chromium.launch({ headless: true });

  // 2. Region select defaults to "All" for a fresh install.
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4000);

    await page.evaluate(() => window.NextTrainCitySession.openRegionScreen());
    await page.waitForTimeout(300);

    const state = await page.evaluate(() => {
      const select = document.querySelector("[data-region-city]");
      return {
        value: select?.value ?? null,
        firstLabel: select?.options?.[0]?.textContent?.trim() ?? "",
        label: document.querySelector('label.region-field span')?.textContent ?? "",
      };
    });

    if (state.value === "" && state.firstLabel === "All") {
      pass("Region select defaults to All for a fresh install");
    } else {
      fail("Region select defaults to All for a fresh install", JSON.stringify(state));
    }
    await context.close();
  }

  // 3. Country-wide search, region tag, and silent region switch on selection.
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4000);

    // Start on an explicit region other than Perth so a later silent switch
    // to Perth is an observable change, not a no-op. An explicit pick also
    // sets the Region select's filter to that region (brief #1), so put it
    // back on "All" the same way a rider would — via the select — before
    // searching, or the country-wide search would be narrowed to Sydney.
    await page.evaluate(async () => {
      await window.NextTrainCitySession.applyCity("sydney", { persist: true, explicit: true });
      const select = document.querySelector("[data-region-city]");
      select.value = "";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForTimeout(1500);

    await openJourneySetup(page);
    await page.waitForSelector("#settings-detail-view", { state: "visible", timeout: 15000 });
    await page.waitForTimeout(500);

    // Opening the combobox should jump straight to search mode (brief #2).
    await page.locator("#detail-station-combobox .station-combobox-input").click();
    await page.waitForTimeout(400);

    const searchVisible = await page.evaluate(() => {
      const input = document.querySelector("#detail-station-combobox .station-combobox-search-input");
      return input && !input.hidden;
    });
    if (searchVisible) {
      pass("Opening the combobox focuses the search field directly");
    } else {
      fail("Opening the combobox focuses the search field directly");
    }

    await page.locator("#detail-station-combobox .station-combobox-search-input").fill("perth");
    await page.waitForTimeout(600);

    const query = await page.evaluate(() => {
      const options = [...document.querySelectorAll("#detail-station-combobox .station-combobox-option")];
      return options.map((el) => ({
        value: el.dataset.value,
        text: el.textContent.trim(),
        hasTag: Boolean(el.querySelector(".station-combobox-region-tag")),
      }));
    });

    const perthOption = query.find((o) => o.text.startsWith("Perth"));
    if (perthOption && perthOption.hasTag) {
      pass("Typing 'perth' under Australia surfaces a tagged Perth result", perthOption.text);
    } else {
      fail("Typing 'perth' under Australia surfaces a tagged Perth result", JSON.stringify(query));
    }

    if (perthOption) {
      await page.locator("#detail-station-combobox .station-combobox-option", { hasText: "Perth" }).first().click();
      await page.waitForTimeout(1500);

      const after = await page.evaluate(() => ({
        savedCity: window.NextTrainCitySession.readSavedCity(),
        regionFilter: window.NextTrainCitySession.readRegionFilter(),
      }));

      if (after.savedCity === "perth" && after.regionFilter === "") {
        pass("Selecting the station silently switches the active region and Region stays 'All'", JSON.stringify(after));
      } else {
        fail("Selecting the station silently switches the active region and Region stays 'All'", JSON.stringify(after));
      }
    }

    await context.close();
  }

  await browser.close();

  if (failed) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
