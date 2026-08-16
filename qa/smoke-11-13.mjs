/**
 * TESTING.md tests 11 and 13 (test 12 is manual onboarding — not automated).
 * Usage: node qa/smoke-11-13.mjs
 */
import { chromium } from "playwright";
import {
  closeJourneysDialog,
  openJourneysDialog,
  openJourneyDetail,
  clickJourneysDone,
  enableTargetTrainOnDetail,
} from "./helpers/journeys-dialog.mjs";
import { ensureJourneyMode, PERTH_GEO_CONTEXT, waitForMorningTemplateRoute, readMorningTemplateMeta } from "./helpers/journey-smoke.mjs";

const BASE = "http://localhost:3000";
const results = [];

function pass(id, notes) {
  results.push({ id, result: "PASS", notes });
}

function fail(id, notes) {
  results.push({ id, result: "FAIL", notes });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(PERTH_GEO_CONTEXT);
  const page = await context.newPage();

  // 11 — Save vs Done
  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.evaluate(() => {
    localStorage.setItem("nextTrainOnboardingDone", "1");
    localStorage.setItem(
      "nextTrainSettings",
      JSON.stringify({
        settingsSchemaVersion: 2,
        refreshSeconds: 30,
        activeJourneyId: "j-in",
        journeys: [
          {
            id: "j-in",
            kind: "commute",
            name: "Daily Commute - in",
            station: "Edgewater Stn",
            direction: "Perth",
            leaveBeforeMinutes: 10,
            useLeaveBefore: true,
            defaultFrom: "06:00",
            defaultUntil: "09:00",
            preferredTrainTime: "07:30",
          },
        ],
      })
    );
  });
  await page.goto(
    `${BASE}/?test=1&fixture=normal`
  );
  await ensureJourneyMode(page);
  await page.waitForTimeout(1000);

  const readLeaveBefore = (journeyId) =>
    page.evaluate((id) => {
      const journeys = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}").journeys ?? [];
      return journeys.find((journey) => journey.id === id)?.leaveBeforeMinutes;
    }, journeyId);

  await openJourneyDetail(page, "j-in");
  await enableTargetTrainOnDetail(page);
  await page.locator("#detail-leave-before-input").fill("15");
  await page.locator("#settings-back").click();
  await page.waitForTimeout(300);
  await clickJourneysDone(page);
  let lb = await readLeaveBefore("j-in");
  const doneOk = lb === 10;

  await closeJourneysDialog(page);
  await openJourneyDetail(page, "j-in");
  await enableTargetTrainOnDetail(page);
  await page.locator("#detail-leave-before-input").fill("15");
  await page.locator("#detail-done-btn").click();
  await page.waitForTimeout(500);
  await clickJourneysDone(page);
  lb = await readLeaveBefore("j-in");
  if (doneOk && lb === 15) {
    pass(11, "Done without save kept 10; detail Done persisted 15");
  } else {
    fail(11, JSON.stringify({ doneOk, lb }));
  }

  // 13 — Journey templates
  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(1500);
  await openJourneysDialog(page);
  const templatesVisible = await page.locator("#journey-templates").isVisible();
  await page.locator('[data-template="morning"]').click();
  await page.waitForSelector("#settings-detail-view:not([hidden])", { timeout: 15000 });
  await page.waitForTimeout(2500);
  const detailOpen = await page.evaluate(
    () => !document.getElementById("settings-detail-view").hidden
  );
  const templateJourney = await readMorningTemplateMeta(page);
  const coachVisible = await page.locator("#template-route-coach").isVisible();
  const routeConfigured =
    (templateJourney?.station === "Edgewater Stn" && templateJourney?.direction === "Perth") ||
    (templateJourney?.coachText?.includes("Edgewater") && /Perth/i.test(templateJourney.coachText));
  if (
    templatesVisible &&
    detailOpen &&
    templateJourney?.defaultFrom === "06:00" &&
    templateJourney?.defaultUntil === "09:00" &&
    (routeConfigured || coachVisible)
  ) {
    pass(13, routeConfigured
      ? "Morning template → auto route (Edgewater → Perth) + coach"
      : "Morning template → detail + default hours + coach");
  } else {
    fail(13, JSON.stringify({ templatesVisible, detailOpen, templateJourney, coachVisible }));
  }

  await browser.close();

  const passCount = results.filter((r) => r.result === "PASS").length;
  const failCount = results.filter((r) => r.result === "FAIL").length;
  console.log(JSON.stringify({ summary: `${passCount} PASS · ${failCount} FAIL`, results }, null, 2));
  process.exit(failCount > 0 ? 1 : 0);
}

run().catch((err) => {
  console.log(JSON.stringify({ results, error: String(err) }, null, 2));
  process.exit(1);
});
