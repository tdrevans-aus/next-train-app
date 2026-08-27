/**
 * Menu → Reminders: one list per journey, no Upcoming section.
 * Usage: node qa/reminders-dialog.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await page.goto(
    `${BASE}/?reset=1&test=1&fixture=normal&station=Edgewater%20Stn&direction=Perth`
  );
  await page.waitForFunction(
    () => typeof window.nextTrainLeaveReminders?.openRemindersDialog === "function",
    null,
    { timeout: 15000 }
  );

  await page.evaluate(() => document.getElementById("menu-btn").click());
  await page.waitForTimeout(400);

  const menuUi = await page.evaluate(() => ({
    menuOpen: document.getElementById("menu-dialog")?.open || document.getElementById("menu-dialog")?.hasAttribute("open"),
    remindersBtnPresent: Boolean(document.getElementById("menu-reminders-btn")),
    remindersDialogPresent: Boolean(document.getElementById("reminders-dialog")),
    upcomingPresent: Boolean(document.getElementById("reminders-upcoming-section")),
  }));

  await page.evaluate(() => document.getElementById("menu-reminders-btn")?.click());
  await page.waitForTimeout(400);

  const dialogUi = await page.evaluate(() => ({
    open: Boolean(
      document.getElementById("reminders-dialog")?.open ||
        document.getElementById("reminders-dialog")?.hasAttribute("open")
    ),
    title: document.getElementById("reminders-dialog-title")?.textContent,
    lead: document.querySelector("#reminders-dialog .reminders-lead")?.textContent,
    upcomingTitle: document.getElementById("reminders-upcoming-title")?.textContent || null,
    emptyCopy: document.getElementById("reminders-journeys-empty")?.textContent,
    pauseTitle: document.querySelector("#leave-reminders-pause-wrap .menu-toggle-title")?.textContent,
    donePresent: Boolean(document.getElementById("reminders-done-btn")),
  }));

  await browser.close();

  const duplicateConstBug = pageErrors.some((m) => m.includes("DEFAULT_REMIND_DAYS"));
  const webPass =
    menuUi.menuOpen &&
    menuUi.remindersBtnPresent &&
    menuUi.remindersDialogPresent &&
    !menuUi.upcomingPresent &&
    dialogUi.open &&
    dialogUi.title === "Reminders" &&
    dialogUi.lead?.includes("ping you when it’s time to leave") &&
    !dialogUi.upcomingTitle &&
    dialogUi.emptyCopy?.includes("No reminders set") &&
    dialogUi.pauseTitle === "Pause" &&
    dialogUi.donePresent &&
    !duplicateConstBug;

  console.log("\nReminders list check (web)\n");
  console.log("Menu:", JSON.stringify(menuUi, null, 2));
  console.log("Dialog:", JSON.stringify(dialogUi, null, 2));
  if (pageErrors.length) {
    console.log("Page errors:", pageErrors.slice(0, 3));
  }

  if (!webPass) {
    process.exitCode = 1;
    console.log("\nFAIL");
    return;
  }
  console.log("\nPASS");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
