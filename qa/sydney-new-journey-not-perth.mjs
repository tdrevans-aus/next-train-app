/**
 * Perth GPS + Sydney region: a new journey must not prefill Edgewater/Yanchep.
 *
 * Usage: node qa/sydney-new-journey-not-perth.mjs
 */
import { chromium } from "playwright";
import { dismissTemplateWizardCoach, openJourneySetup } from "./helpers/travel-library.mjs";

const BASE = "http://localhost:3000";
const PERTH = { latitude: -31.7739, longitude: 115.7716 };

function isPerthDefaultRoute(station, direction, coachText) {
  const blob = `${station} ${direction} ${coachText}`;
  return /Edgewater/i.test(blob) || /Yanchep/i.test(blob);
}

async function readDetailRoute(page) {
  return page.evaluate(() => {
    const combobox = window.nextTrainStationCombobox?.getDetailStationCombobox?.();
    return {
      station: String(combobox?.getValue?.() || "").trim(),
      direction: String(document.getElementById("detail-direction-select")?.value || "").trim(),
      coachText: String(document.getElementById("template-wizard-coach")?.textContent || "").trim(),
      city: window.NextTrainCitySession?.readSavedCity?.() || "",
    };
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: PERTH,
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await page.waitForTimeout(2500);

  const mounted = await page.evaluate(async () => {
    return window.NextTrainCitySession.applyCity("sydney", { persist: true, explicit: true });
  });
  await page.waitForTimeout(2500);

  const city = await page.evaluate(() => window.NextTrainCitySession.readSavedCity());
  if (!mounted || city !== "sydney") {
    console.error("FAIL — could not switch region to Sydney", { mounted, city });
    process.exitCode = 1;
    await browser.close();
    return;
  }

  await openJourneySetup(page);
  await dismissTemplateWizardCoach(page);
  await page.waitForTimeout(2500);

  const custom = await readDetailRoute(page);
  if (isPerthDefaultRoute(custom.station, custom.direction, custom.coachText)) {
    console.error("FAIL — custom journey used a Perth default while Sydney is selected", custom);
    process.exitCode = 1;
    await browser.close();
    return;
  }

  await page.evaluate(() => {
    window.nextTrainApp?.closeJourneysDialog?.();
  });
  await page.waitForTimeout(400);

  await page.evaluate(() => window.nextTrainApp.openJourneysLibrary?.());
  await page.waitForTimeout(600);
  await page.locator('[data-template="morning"]').click();
  await dismissTemplateWizardCoach(page);
  await page.waitForTimeout(2500);

  const morning = await readDetailRoute(page);
  if (isPerthDefaultRoute(morning.station, morning.direction, morning.coachText)) {
    console.error("FAIL — morning journey used a Perth default while Sydney is selected", morning);
    process.exitCode = 1;
    await browser.close();
    return;
  }

  console.log("PASS — Sydney region does not prefill Edgewater/Yanchep", { custom, morning });
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
