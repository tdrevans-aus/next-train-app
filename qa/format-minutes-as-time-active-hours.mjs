/**
 * CAPACITOR-J / GitHub #23 — formatMinutesAsTime must stay defined for Active hours auto-fill.
 * Usage: node qa/format-minutes-as-time-active-hours.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e?.message ?? e)));

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForFunction(
    () => typeof window.nextTrainJourneyModel?.formatMinutesAsTime === "function"
  );

  const helpers = await page.evaluate(() => ({
    format: window.nextTrainJourneyModel.formatMinutesAsTime(9 * 60 + 5),
    plus3h: window.nextTrainJourneyModel.addMinutesToTimeString("06:00", 180),
    wrap: window.nextTrainJourneyModel.addMinutesToTimeString("23:00", 180),
    appPlus3h: addMinutesToTimeString("06:00", 180),
  }));

  if (helpers.format !== "09:05") {
    throw new Error(`formatMinutesAsTime got ${helpers.format}`);
  }
  if (helpers.plus3h !== "09:00") {
    throw new Error(`addMinutesToTimeString got ${helpers.plus3h}`);
  }
  if (helpers.wrap !== "02:00") {
    throw new Error(`overnight wrap got ${helpers.wrap}`);
  }
  if (helpers.appPlus3h !== "09:00") {
    throw new Error(`app.js wrapper got ${helpers.appPlus3h}`);
  }

  await page.evaluate(() => window.nextTrainApp.enterJourneyMode());
  await page.evaluate(() => window.nextTrainApp.openJourneys());
  await page.locator('[data-template="custom"]').click();
  const skip = page.locator("#template-wizard-skip-btn");
  if (await skip.isVisible()) {
    await skip.click();
  }

  const until = await page.evaluate(() => {
    const from = document.getElementById("detail-default-from");
    from.value = "07:00";
    from.dispatchEvent(new Event("change", { bubbles: true }));
    return document.getElementById("detail-default-until")?.value ?? "";
  });

  if (until !== "10:00") {
    throw new Error(`Active hours until auto-fill got ${until}`);
  }

  const crash = pageErrors.find((msg) => /formatMinutesAsTime is not defined/i.test(msg));
  if (crash) {
    throw new Error(crash);
  }
  if (pageErrors.length) {
    throw new Error(`page errors: ${pageErrors.join("; ")}`);
  }

  console.log("PASS format-minutes-as-time-active-hours");
  await browser.close();
}

run().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
