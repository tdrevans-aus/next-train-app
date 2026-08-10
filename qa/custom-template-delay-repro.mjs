/**
 * Custom template delay — populateJourneyDetailForm calls findNearestStation
 * for unconfigured journeys even when user picked Custom (blank form).
 * Usage: node qa/custom-template-delay-repro.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const GEO_DELAY_MS = 4000;

async function openTemplatesAndClick(page, template) {
  await page.evaluate(() => window.nextTrainApp.openJourneys());
  await page.waitForTimeout(700);
  const chip = page.locator(`[data-template="${template}"]`);
  const t0 = Date.now();
  await chip.click();
  const polls = [];
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(250);
    const snap = await page.evaluate((tpl) => ({
      detailOpen: !document.getElementById("settings-detail-view").hidden,
      chipDisabled: document.querySelector(`[data-template="${tpl}"]`)?.disabled,
      listVisible: !document.getElementById("settings-list-view").hidden,
    }), template);
    polls.push({ ms: Date.now() - t0, ...snap });
    if (snap.detailOpen) break;
  }
  return { template, elapsedMs: Date.now() - t0, polls, detailOpen: polls.at(-1)?.detailOpen };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -32.07, longitude: 116.0 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.addInitScript((delay) => {
    const orig = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    navigator.geolocation.getCurrentPosition = (ok, err, opts) => {
      setTimeout(() => orig(ok, err, opts), delay);
    };
  }, GEO_DELAY_MS);

  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await page.waitForTimeout(1500);

  const custom = await openTemplatesAndClick(page, "custom");
  await page.evaluate(() => {
    document.getElementById("journeys-dialog")?.close();
  });
  await page.waitForTimeout(500);

  const morning = await openTemplatesAndClick(page, "morning");

  await browser.close();

  console.log("\nCustom template delay repro (simulated geo", GEO_DELAY_MS, "ms)\n");
  console.log("Custom:", JSON.stringify({ elapsedMs: custom.elapsedMs, detailOpen: custom.detailOpen }, null, 2));
  console.log("Morning:", JSON.stringify({ elapsedMs: morning.elapsedMs, detailOpen: morning.detailOpen }, null, 2));

  const customSlow = custom.elapsedMs >= GEO_DELAY_MS - 500;
  const customFail = customSlow && custom.detailOpen;

  console.log(
    customFail
      ? "\nREPRODUCED: Custom waits ~geo delay before detail opens (no loading UI)\n"
      : "\nDid not reproduce slow Custom in this run\n"
  );
  process.exit(customFail ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
