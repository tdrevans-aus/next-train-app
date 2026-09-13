/**
 * "What's covered" Help entry — docs/jim-brief-help-coverage-notes.md, acceptance item 3.
 * Empty picker search shows the "Can't find your station?" row; tapping it opens Help
 * scrolled to "What's covered in <Region>", expanded. Covered in Perth and one UK region
 * (Manchester) since the entry point is shared code across every region.
 *
 * Usage: node qa/help-coverage-entry.mjs
 */
import { chromium } from "playwright";
import { openCustomJourneyCreate } from "./helpers/open-custom-journey.mjs";
import { openStationSearch } from "./helpers/station-combobox.mjs";

import { BASE } from "./helpers/dev-server.mjs";

const CASES = [
  { city: "perth", label: "Perth" },
  { city: "greater-manchester", label: "Manchester" },
];

async function dismissCoach(page) {
  const skip = page.locator("#template-wizard-skip-btn");
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => {
    const coach = document.getElementById("template-route-coach");
    if (coach) {
      coach.hidden = true;
    }
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const failures = [];

  for (const testCase of CASES) {
    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
    await page.waitForFunction(() => window.NextTrainCitySession?.applyCity, null, { timeout: 15000 });
    await page.evaluate(async (city) => {
      localStorage.setItem("nextTrainOnboardingDone", "1");
      document.getElementById("onboarding-coach")?.remove();
      await window.NextTrainCitySession.applyCity(city, { persist: true, explicit: true });
    }, testCase.city);
    await page.waitForTimeout(600);

    await openCustomJourneyCreate(page);
    await page.waitForTimeout(500);
    await dismissCoach(page);
    await page.locator("#detail-station-input").waitFor({ state: "visible", timeout: 15000 });

    await openStationSearch(page, {
      rootSelector: "#detail-station-combobox",
      inputSelector: "#detail-station-input",
      listboxSelector: "#detail-station-listbox",
    });
    await page.locator("#detail-station-combobox .station-combobox-search-input").fill("zzzzzzzzzzzz");
    await page.waitForSelector("#detail-station-listbox .station-combobox-empty", { timeout: 10000 });

    const coverageRow = page.locator("#detail-station-listbox .station-combobox-coverage-row");
    const rowVisible = await coverageRow.isVisible().catch(() => false);
    if (!rowVisible) {
      failures.push(`${testCase.city}: "Can't find your station?" row did not appear on empty search`);
      continue;
    }
    const rowText = (await coverageRow.textContent()) || "";
    if (!/Can't find your station\?/.test(rowText)) {
      failures.push(`${testCase.city}: coverage row text unexpected — "${rowText}"`);
    }
    if (!rowText.includes(testCase.label)) {
      failures.push(`${testCase.city}: coverage row should mention "${testCase.label}" — "${rowText}"`);
    }

    await coverageRow.click();

    const dialogOpen = await page
      .waitForFunction(
        () => document.getElementById("help-dialog")?.open === true,
        null,
        { timeout: 5000 }
      )
      .then(() => true)
      .catch(() => false);
    if (!dialogOpen) {
      failures.push(`${testCase.city}: Help dialog did not open`);
      continue;
    }

    const faqOpen = await page
      .waitForFunction(
        () => document.getElementById("help-coverage-faq")?.open === true,
        null,
        { timeout: 5000 }
      )
      .then(() => true)
      .catch(() => false);
    if (!faqOpen) {
      failures.push(`${testCase.city}: "What's covered" FAQ entry did not expand`);
    }

    const titleText = await page.locator("#help-coverage-title").textContent().catch(() => "");
    const expectedTitle = `What's covered in ${testCase.label}`;
    if ((titleText || "").trim() !== expectedTitle) {
      failures.push(`${testCase.city}: expected title "${expectedTitle}", got "${titleText}"`);
    }

    await page.evaluate(() => {
      window.nextTrainApp?.closeAppDialog?.(document.getElementById("help-dialog"));
    });
  }

  await browser.close();

  if (failures.length) {
    for (const failure of failures) {
      console.error(`FAIL help-coverage-entry — ${failure}`);
    }
    process.exit(1);
  }

  console.log("PASS help-coverage-entry");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
