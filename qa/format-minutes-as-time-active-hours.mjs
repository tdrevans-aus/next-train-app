/**
 * CAPACITOR-J / CAPACITOR-H: Active hours "from" change must not throw
 * ReferenceError: formatMinutesAsTime is not defined.
 * Usage: node qa/format-minutes-as-time-active-hours.mjs
 */
import { chromium } from "playwright";
import { pickStationCombobox, waitForDetailStationCombobox } from "./helpers/station-combobox.mjs";

const BASE = "http://localhost:3000";

async function dismissCoach(page) {
  const skip = page.locator("#template-wizard-skip-btn");
  if (await skip.isVisible()) {
    await skip.click();
    await page.waitForTimeout(300);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => {
    pageErrors.push(String(error?.message ?? error));
  });

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.nextTrainApp.enterJourneyMode());
  await page.waitForTimeout(400);
  await page.evaluate(() => window.nextTrainApp.openJourneys());
  await page.waitForTimeout(500);

  await page.locator('[data-template="custom"]').click();
  await page.waitForTimeout(800);
  await dismissCoach(page);
  await waitForDetailStationCombobox(page);

  await page.locator("#detail-journey-name").fill("Active hours crash check");
  await pickStationCombobox(page, {
    rootSelector: "#detail-station-combobox",
    inputSelector: "#detail-station-input",
    listboxSelector: "#detail-station-listbox",
    station: "Edgewater Stn",
  });
  await page.waitForTimeout(800);
  await page.selectOption("#detail-direction-select", { index: 1 });

  const modelCheck = await page.evaluate(() => {
    const model = window.nextTrainJourneyModel;
    return {
      hasFormat: typeof model?.formatMinutesAsTime === "function",
      hasAdd: typeof model?.addMinutesToTimeString === "function",
      sample: model?.addMinutesToTimeString?.("06:00", 180) ?? null,
    };
  });

  if (!modelCheck.hasFormat || !modelCheck.hasAdd) {
    throw new Error(`journey-model missing time helpers: ${JSON.stringify(modelCheck)}`);
  }
  if (modelCheck.sample !== "09:00") {
    throw new Error(`addMinutesToTimeString expected 09:00, got ${modelCheck.sample}`);
  }

  await page.locator("#detail-default-from").fill("07:15");
  await page.locator("#detail-default-from").dispatchEvent("change");
  await page.waitForTimeout(300);
  await page.locator("#detail-default-from").dispatchEvent("input");
  await page.waitForTimeout(300);

  const untilValue = await page.evaluate(() => {
    return document.getElementById("detail-default-until")?.value ?? "";
  });

  const formatErrors = pageErrors.filter((message) =>
    /formatMinutesAsTime is not defined/i.test(message)
  );
  if (formatErrors.length) {
    throw new Error(`pageerror: ${formatErrors.join(" | ")}`);
  }
  if (pageErrors.length) {
    throw new Error(`unexpected pageerror: ${pageErrors.join(" | ")}`);
  }
  if (untilValue !== "10:15") {
    throw new Error(`expected Until auto-fill 10:15 after From 07:15, got "${untilValue}"`);
  }

  console.log("PASS format-minutes-as-time-active-hours");
  await browser.close();
}

run().catch(async (error) => {
  console.error("FAIL format-minutes-as-time-active-hours");
  console.error(error);
  process.exitCode = 1;
});
