/**
 * CAPACITOR-Q — getSettings must stay defined for classic-script / global callers
 * after the FB-25 module split (leave-reminders + window.settings alias).
 * Usage: node qa/get-settings-global.mjs
 */
import { chromium } from "playwright";

import { BASE } from "./helpers/dev-server.mjs";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e?.message ?? e)));

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForFunction(() => typeof window.nextTrainApp?.getSettings === "function");

  const probe = await page.evaluate(() => {
    const fromGlobal = getSettings();
    const fromApp = window.nextTrainApp.getSettings();
    const fromWindow = window.settings;
    const drafts = window.nextTrainApp.getSettingsDraftJourneys();
    return {
      globalKeys: fromGlobal && typeof fromGlobal === "object" ? Object.keys(fromGlobal).slice(0, 6) : null,
      sameRef: fromGlobal === fromApp && fromApp === fromWindow,
      hasJourneys: Array.isArray(fromGlobal?.journeys),
      draftsIsArray: Array.isArray(drafts),
      leaveRemindersPath: window.settings ?? window.nextTrainApp?.getSettings?.() ?? null,
    };
  });

  if (!probe.sameRef) {
    throw new Error("getSettings / nextTrainApp.getSettings / window.settings must be the same object");
  }
  if (!probe.hasJourneys) {
    throw new Error("getSettings().journeys missing");
  }
  if (!probe.draftsIsArray) {
    throw new Error("getSettingsDraftJourneys() must return an array");
  }
  if (!probe.leaveRemindersPath || typeof probe.leaveRemindersPath !== "object") {
    throw new Error("leave-reminders readAppSettings path returned null");
  }

  const crash = pageErrors.find((msg) => /getSettings is not defined/i.test(msg));
  if (crash) {
    throw new Error(crash);
  }
  if (pageErrors.length) {
    throw new Error(`page errors: ${pageErrors.join("; ")}`);
  }

  console.log("PASS get-settings-global");
  await browser.close();
}

run().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
