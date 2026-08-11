/**
 * Delete last configured journey → empty setup state (journeys cleared in storage).
 * Usage: node qa/delete-last-journey.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const CONFIRM_TEXT = "Delete your only journey? You can add a new one anytime.";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -31.77, longitude: 115.99 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  page.on("dialog", async (dialog) => {
    if (dialog.message() === CONFIRM_TEXT) {
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
  });

  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.evaluate(() => {
    localStorage.setItem(
      "nextTrainSettings",
      JSON.stringify({
        refreshSeconds: 60,
        activeJourneyId: "j-only",
        journeys: [
          {
            id: "j-only",
            name: "Solo commute",
            station: "Edgewater Stn",
            direction: "Perth",
            leaveBeforeMinutes: 10,
            useLeaveBefore: true,
            defaultFrom: "06:00",
            defaultUntil: "09:00",
            remindDays: [1, 2, 3, 4, 5],
            remindMe: false,
          },
        ],
      })
    );
    localStorage.setItem("nextTrainTemplateWizardSeen", "1");
    localStorage.setItem("nextTrainOnboardingDone", "1");
  });
  await page.reload();
  await page.waitForTimeout(1500);

  await page.evaluate(() => window.nextTrainApp.openJourneys());
  await page.waitForTimeout(500);
  await page.locator(".journey-list-open-btn").click();
  await page.waitForTimeout(800);

  const deleteVisible = await page.evaluate(
    () => !document.getElementById("delete-journey-btn").hidden
  );
  if (!deleteVisible) {
    console.error("FAIL — delete button hidden on sole journey");
    process.exitCode = 1;
    await browser.close();
    return;
  }

  await page.locator("#delete-journey-btn").click();
  await page.waitForTimeout(1200);

  const afterDelete = await page.evaluate(() => ({
    persisted: JSON.parse(localStorage.getItem("nextTrainSettings") || "{}").journeys?.length ?? 0,
    dialogOpen: document.getElementById("journeys-dialog")?.open ?? false,
    emptyTitle: document.querySelector(".hero-empty-title")?.textContent?.trim() ?? "",
    route: document.getElementById("route")?.textContent?.trim() ?? "",
  }));

  const pass =
    deleteVisible &&
    afterDelete.persisted === 0 &&
    !afterDelete.dialogOpen &&
    afterDelete.emptyTitle === "No journeys yet";

  if (pass) {
    console.log("PASS — sole journey deleted; empty setup shown; storage cleared");
  } else {
    console.error("FAIL — delete last journey", afterDelete);
    process.exitCode = 1;
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
