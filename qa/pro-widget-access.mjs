/**
 * Fresh install must not lock the widget as "trial ended".
 * Usage: node qa/pro-widget-access.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(1500);

  const snap = await page.evaluate(() => {
    localStorage.removeItem("nextTrainProTrialStartedAt");
    localStorage.removeItem("nextTrainFoundingPro");
    localStorage.removeItem("nextTrainAdFreeCache");
    localStorage.removeItem("nextTrainWidgetEverAdded");
    const pro = window.NextTrainPro;
    return {
      state: pro?.getStateId?.(),
      hasWidgetAccess: pro?.hasWidgetAccess?.(),
      hasProAccess: pro?.hasProAccess?.(),
      settingsAccess: (() => {
        const settings = {};
        pro?.mergeIntoSettings?.(settings);
        return settings.pro?.hasWidgetAccess;
      })(),
    };
  });

  // Simulate expired trial
  const expired = await page.evaluate(() => {
    const started = new Date(Date.now() - 40 * 86400000).toISOString();
    localStorage.setItem("nextTrainProTrialStartedAt", started);
    const settings = {};
    window.NextTrainPro?.mergeIntoSettings?.(settings);
    return {
      state: window.NextTrainPro?.getStateId?.(),
      hasWidgetAccess: window.NextTrainPro?.hasWidgetAccess?.(),
      settingsAccess: settings.pro?.hasWidgetAccess,
    };
  });

  await browser.close();

  const freshOk =
    snap.state === "free_no_trial" &&
    snap.hasWidgetAccess === true &&
    snap.hasProAccess === false &&
    snap.settingsAccess === true;

  const expiredOk =
    expired.state === "trial_expired" &&
    expired.hasWidgetAccess === false &&
    expired.settingsAccess === false;

  console.log("Fresh:", JSON.stringify(snap, null, 2));
  console.log("Expired:", JSON.stringify(expired, null, 2));
  console.log(freshOk && expiredOk ? "\nPASS  pro widget access\n" : "\nFAIL  pro widget access\n");
  process.exit(freshOk && expiredOk ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
