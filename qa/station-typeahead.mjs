/**
 * Station picker — list-first browse + search filter (journey detail + Near me).
 * Usage: node qa/station-typeahead.mjs
 */
import { chromium } from "playwright";
import { openCustomJourneyCreate } from "./helpers/open-custom-journey.mjs";
import {
  openStationSearch,
  waitForDetailStationCombobox,
} from "./helpers/station-combobox.mjs";

import { BASE } from "./helpers/dev-server.mjs";

async function dismissCoach(page) {
  const skip = page.locator("#template-wizard-skip-btn");
  if (await skip.isVisible()) {
    await skip.click();
    await page.waitForTimeout(300);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -31.77, longitude: 115.99 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(1200);

  await openCustomJourneyCreate(page);
  await page.waitForTimeout(800);
  await dismissCoach(page);
  await page.evaluate(() => {
    const coach = document.getElementById("template-route-coach");
    if (coach) {
      coach.hidden = true;
    }
  });
  await page.locator("#detail-station-input").waitFor({ state: "visible", timeout: 15000 });

  // Wait for optional geo prefill, then clear so Save-without-station is meaningful.
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.nextTrainApp.clearDetailStation());
  await page.waitForTimeout(200);

  page.once("dialog", async (dialog) => {
    await dialog.dismiss();
  });
  await page.locator("#detail-done-btn").click();
  await page.waitForTimeout(400);

  const saveBlocked = await page.evaluate(() => {
    const detailOpen = !document.getElementById("settings-detail-view").hidden;
    const stationValue =
      document.getElementById("detail-station-input")?.value?.trim() ?? "";
    return detailOpen && !stationValue;
  });

  if (saveBlocked) {
    console.log("PASS — Save blocked without a station");
  } else {
    console.error("FAIL — Save allowed without station");
    process.exitCode = 1;
  }

  await waitForDetailStationCombobox(page);

  await page.locator("#detail-station-input").click();
  await page.waitForTimeout(200);

  // docs/jim-brief-country-wide-station-picker.md #2 (deliberate change): for
  // the journey-detail picker specifically, openBrowse() now calls
  // enterSearchMode() straight away — search is the primary interaction for
  // this combobox, so the first tap opens directly into search mode
  // (keyboard up) rather than an intermediate browse-only list. The Near me
  // picker below is a different combobox instance (isDetailPicker: false)
  // and keeps the old browse-first behaviour, still asserted further down.
  const searchModeOnFirstTap = await page.evaluate(() => {
    const searchInput = document.querySelector(
      "#detail-station-combobox .station-combobox-search-input"
    );
    const searchVisible = searchInput && !searchInput.hidden;
    const footerHidden = document
      .getElementById("settings-detail-view")
      ?.classList.contains("station-picker-open");
    const listOpen =
      document.querySelectorAll("#detail-station-listbox .station-combobox-option").length > 0;
    return listOpen && searchVisible && footerHidden;
  });

  if (searchModeOnFirstTap) {
    console.log("PASS — first tap on the detail picker opens straight into search mode");
  } else {
    console.error("FAIL — search list / footer / keyboard state wrong on first tap");
    process.exitCode = 1;
  }

  await openStationSearch(page, {
    rootSelector: "#detail-station-combobox",
    inputSelector: "#detail-station-input",
    listboxSelector: "#detail-station-listbox",
  });
  await page.locator("#detail-station-combobox .station-combobox-search-input").fill("War");
  await page.waitForTimeout(200);

  const warwickVisible = await page.evaluate(() => {
    const labels = [...document.querySelectorAll("#detail-station-listbox .station-combobox-option")].map(
      (el) => el.textContent.trim()
    );
    return labels.some((label) => label.includes("Warwick"));
  });

  if (warwickVisible) {
    console.log("PASS — Search stations filters to Warwick on journey detail");
  } else {
    console.error("FAIL — Warwick not in filtered list");
    process.exitCode = 1;
  }

  await page
    .locator("#detail-station-listbox .station-combobox-option")
    .filter({ hasText: "Warwick" })
    .first()
    .click();
  await page.waitForTimeout(400);

  const footerBack = await page
    .waitForFunction(
      () =>
        !document.getElementById("settings-detail-view")?.classList.contains("station-picker-open"),
      null,
      { timeout: 5000 }
    )
    .then(() => true)
    .catch(() => false);

  if (footerBack) {
    console.log("PASS — footer returns after station pick");
  } else {
    console.error("FAIL — footer still hidden after station pick");
    process.exitCode = 1;
  }

  const directionReady = await page.evaluate(() => {
    const select = document.getElementById("detail-direction-select");
    return select && !select.disabled && select.options.length > 1;
  });

  if (directionReady) {
    console.log("PASS — Warwick selection loads directions");
  } else {
    console.error("FAIL — directions did not load after station pick");
    process.exitCode = 1;
  }

  await page.close();

  const nearbyContext = await browser.newContext({
    geolocation: { latitude: -31.95, longitude: 115.86 },
    permissions: ["geolocation"],
  });
  await nearbyContext.addInitScript(() => {
    window.__holdGeo = true;
    window.__pendingGeoQueue = [];
    const original = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    navigator.geolocation.getCurrentPosition = (success, error, options) => {
      if (window.__holdGeo) {
        window.__pendingGeoQueue.push({ success, error, options });
        return;
      }
      return original(success, error, options);
    };
  });

  const nearbyPage = await nearbyContext.newPage();
  await nearbyPage.goto(`${BASE}/?reset=1&fixture=normal`);
  await nearbyPage.waitForTimeout(7500);
  await nearbyPage.evaluate(() => {
    localStorage.setItem("nextTrainOnboardingDone", "1");
    const coach = document.getElementById("onboarding-coach");
    if (coach) {
      coach.hidden = true;
    }
  });
  await nearbyPage.evaluate(() => document.getElementById("nearby-dont-wait-btn")?.click());
  await nearbyPage.waitForFunction(
    () => document.getElementById("nearby-fallback")?.hidden === false,
    null,
    { timeout: 10000 }
  );

  await openStationSearch(nearbyPage, {
    rootSelector: "#nearby-station-combobox",
    inputSelector: "#nearby-station-input",
    listboxSelector: "#nearby-station-listbox",
  });
  await nearbyPage.locator("#nearby-station-combobox .station-combobox-search-input").fill("Edge");
  await nearbyPage.waitForTimeout(200);

  const edgewaterNearby = await nearbyPage.evaluate(() => {
    const labels = [...document.querySelectorAll("#nearby-station-listbox .station-combobox-option")].map(
      (el) => el.textContent.trim()
    );
    return labels.includes("Edgewater");
  });

  const pickerAboveTrainMeta = await nearbyPage.evaluate(() => {
    const listbox = document.getElementById("nearby-station-listbox");
    const strip = document.getElementById("detail-strip");
    if (!listbox || listbox.hidden || !strip) {
      return false;
    }
    const listRect = listbox.getBoundingClientRect();
    const stripRect = strip.getBoundingClientRect();
    const overlaps =
      listRect.left < stripRect.right &&
      listRect.right > stripRect.left &&
      listRect.top < stripRect.bottom &&
      listRect.bottom > stripRect.top;
    const meta = document.querySelector(".train-meta");
    const style = meta ? getComputedStyle(meta) : null;
    const stripHidden =
      style?.visibility === "hidden" || style?.display === "none" || stripRect.height < 1;
    return stripHidden || !overlaps;
  });

  if (pickerAboveTrainMeta) {
    console.log("PASS — Near me station list above Platform/Status");
  } else {
    console.error("FAIL — station picker overlaps Platform/Status strip");
    process.exitCode = 1;
  }

  if (edgewaterNearby) {
    console.log("PASS — Near me picker filters by typed query");
  } else {
    console.error("FAIL — Edgewater not in nearby filtered list");
    process.exitCode = 1;
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
