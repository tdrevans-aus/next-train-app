/**
 * TESTING.md 13b — duplicate Morning template should reuse row, not overlap on save.
 * Usage: node qa/duplicate-morning-template-repro.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function dismissCoach(page) {
  for (let i = 0; i < 4; i++) {
    const open = await page.evaluate(
      () => !document.getElementById("template-route-coach").hidden
    );
    if (!open) break;
    await page.locator("#template-wizard-primary-btn").click();
    await page.waitForTimeout(200);
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
  await page.waitForTimeout(2000);

  await page.evaluate(() => window.nextTrainApp.openJourneys());
  await page.waitForTimeout(600);

  await page.locator('[data-template="morning"]').click();
  await page.waitForTimeout(3000);
  await dismissCoach(page);

  await page.locator("#settings-back").click();
  await page.waitForTimeout(400);

  await page.locator('[data-template="morning"]').click();
  await page.waitForTimeout(2000);

  const state = await page.evaluate(() => {
    const journeys = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}").journeys ?? [];
    const morningRows = journeys.filter(
      (j) => j.name === "Morning into town" && j.defaultFrom === "06:00" && j.defaultUntil === "09:00"
    );
    return {
      morningCount: morningRows.length,
      draftCount: window.nextTrainApp?.getSettingsDraftJourneys?.()?.length ?? null,
      listItems: document.querySelectorAll(".journey-list-item").length,
    };
  });

  await browser.close();

  const pass = state.morningCount <= 1 && state.listItems <= 1;

  console.log("\nDuplicate Morning template repro (13b)\n");
  console.log(state);
  console.log(
    pass
      ? "\nPASS  No duplicate Morning into town rows after second template tap.\n"
      : "\nFAIL  Duplicate Morning journey rows — overlap on save likely.\n"
  );

  process.exit(pass ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
