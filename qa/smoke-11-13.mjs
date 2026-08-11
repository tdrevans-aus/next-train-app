/**
 * TESTING.md tests 11 and 13 (test 12 is manual onboarding — not automated).
 * Usage: node qa/smoke-11-13.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const results = [];

function pass(id, notes) {
  results.push({ id, result: "PASS", notes });
}

function fail(id, notes) {
  results.push({ id, result: "FAIL", notes });
}

async function closeJourneysDialog(page) {
  await page.evaluate(() => {
    if (window.nextTrainApp?.closeJourneysDialog) {
      window.nextTrainApp.closeJourneysDialog();
      return;
    }
    const backdrop = document.getElementById("journeys-dialog-backdrop");
    if (backdrop) backdrop.hidden = true;
    const d = document.getElementById("journeys-dialog");
    if (d) {
      if (d.open) d.close();
      d.removeAttribute("open");
      d.hidden = true;
    }
    document.body.classList.remove("app-dialog-open");
  });
  await page.waitForTimeout(300);
}

async function clickJourneysDone(page) {
  await page.evaluate(() => document.getElementById("journeys-done-btn")?.click());
  await page.waitForTimeout(500);
}

async function openJourneysDialog(page) {
  await closeJourneysDialog(page);
  const inJourneyMode = await page.locator("#journeys-btn").getAttribute("aria-pressed");
  if (inJourneyMode === "true") {
    await page.evaluate(() => window.nextTrainApp?.openJourneys?.());
  } else {
    await page.locator("#journeys-btn").click();
    await page.waitForTimeout(500);
    await page.locator("#journeys-btn").click();
  }
  await page.waitForTimeout(800);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 11 — Save vs Done
  await page.goto(`${BASE}/?test=1`);
  await page.evaluate(() => {
    localStorage.setItem(
      "nextTrainSettings",
      JSON.stringify({
        refreshSeconds: 30,
        activeJourneyId: "j-in",
        journeys: [
          {
            id: "j-in",
            name: "Daily Commute - in",
            station: "Edgewater Stn",
            direction: "Perth",
            leaveBeforeMinutes: 10,
            useLeaveBefore: true,
            defaultFrom: "06:00",
            defaultUntil: "09:00",
          },
        ],
      })
    );
  });
  await page.goto(
    `${BASE}/?test=1&fixture=normal&station=Edgewater%20Stn&direction=Perth`
  );
  await page.waitForTimeout(1500);

  await openJourneysDialog(page);
  await page.locator(".journey-list-open-btn").first().click();
  await page.waitForTimeout(1500);
  await page.locator("#detail-leave-before-input").fill("15");
  await page.locator("#settings-back").click();
  await page.waitForTimeout(300);
  await clickJourneysDone(page);
  let lb = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("nextTrainSettings")).journeys[0].leaveBeforeMinutes
  );
  const doneOk = lb === 10;

  await closeJourneysDialog(page);
  await openJourneysDialog(page);
  await page.locator(".journey-list-open-btn").first().click();
  await page.waitForTimeout(1500);
  await page.locator("#detail-leave-before-input").fill("15");
  await page.locator("#detail-done-btn").click();
  await page.waitForTimeout(500);
  await clickJourneysDone(page);
  lb = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("nextTrainSettings")).journeys[0].leaveBeforeMinutes
  );
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
  await page.waitForTimeout(3000);
  const detailOpen = await page.evaluate(
    () => !document.getElementById("settings-detail-view").hidden
  );
  const templateJourney = await page.evaluate(() => {
    const journey = JSON.parse(localStorage.getItem("nextTrainSettings"))?.journeys?.[0];
    return journey
      ? {
          name: journey.name,
          station: journey.station,
          direction: journey.direction,
          defaultFrom: journey.defaultFrom,
          defaultUntil: journey.defaultUntil,
        }
      : null;
  });
  const coachVisible = await page.locator("#template-route-coach").isVisible();
  if (
    templatesVisible &&
    detailOpen &&
    templateJourney?.name === "Morning into town" &&
    templateJourney?.defaultFrom === "06:00" &&
    templateJourney?.defaultUntil === "09:00" &&
    templateJourney?.station === "Edgewater Stn" &&
    templateJourney?.direction === "Perth" &&
    coachVisible
  ) {
    pass(13, "Morning template → auto route (Edgewater → Perth) + coach");
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
