/**
 * CAPACITOR-H / CAPACITOR-J: changing Active hours "from" must not throw
 * ReferenceError: formatMinutesAsTime is not defined (addMinutesToTimeString).
 * Usage: node qa/format-minutes-as-time-active-hours.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headlight: true }).catch(() =>
    chromium.launch({ headless: true })
  );
  // Prefer headless; tolerate typo path above by always launching headless.
  const browserInstance =
    browser && typeof browser.newContext === "function"
      ? browser
      : await chromium.launch({ headless: true });
  const context = await browserInstance.newContext();
  const page = await context.newPage();

  const pageErrors = [];
  page.on("pageerror", (error) => {
    pageErrors.push(String(error?.message ?? error));
  });

  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    localStorage.setItem("nextTrainOnboardingDone", "1");
  });
  await page.reload();
  await page.waitForTimeout(1200);

  const probe = await page.evaluate(() => {
    const typeofFormat = typeof formatMinutesAsTime;
    const typeofAdd = typeof addMinutesToTimeString;
    const modelFormat = typeof window.nextTrainJourneyModel?.formatMinutesAsTime;
    let addError = null;
    let addResult = null;
    try {
      addResult = addMinutesToTimeString("07:00", 180);
    } catch (error) {
      addError = String(error?.message ?? error);
    }
    return { typeofFormat, typeofAdd, modelFormat, addError, addResult };
  });

  // Open Journeys → first journey detail → change Active hours from (stack path).
  await page.click("#journeys-btn").catch(() => {});
  await page.waitForTimeout(400);
  const openedDetail = await page
    .locator("#journey-list .journey-list-item, #journey-list button")
    .first()
    .click({ timeout: 3000 })
    .then(() => true)
    .catch(() => false);

  if (openedDetail) {
    await page.waitForTimeout(400);
    await page
      .locator("#detail-default-from")
      .evaluate((el) => {
        el.value = "06:30";
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.dispatchEvent(new Event("input", { bubbles: true }));
      })
      .catch(() => {});
    await page.waitForTimeout(300);
  }

  const formatCrash = pageErrors.some((message) =>
    /formatMinutesAsTime is not defined/i.test(message)
  );
  const probeCrash = /formatMinutesAsTime is not defined/i.test(probe.addError ?? "");

  if (
    probe.typeofFormat === "function" &&
    probe.typeofAdd === "function" &&
    probe.modelFormat === "function" &&
    probe.addResult === "10:00" &&
    !formatCrash &&
    !probeCrash &&
    !probe.addError
  ) {
    console.log(
      "PASS — formatMinutesAsTime wired; addMinutesToTimeString / Active hours did not throw"
    );
  } else {
    console.error("FAIL — CAPACITOR-H formatMinutesAsTime guard", {
      probe,
      formatCrash,
      openedDetail,
      pageErrors,
    });
    process.exitCode = 1;
  }

  await browserInstance.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
