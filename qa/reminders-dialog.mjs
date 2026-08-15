/**
 * TESTING.md — Leave alerts IA (nuclear): no Reminder settings sheet.
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
  await page.waitForTimeout(2000);

  const bridge = await page.evaluate(() => ({
    hasLeaveRemindersApi: typeof window.nextTrainLeaveReminders?.refreshMenuPauseUi === "function",
    isNative: window.Capacitor?.isNativePlatform?.(),
  }));

  await page.evaluate(() => document.getElementById("menu-btn").click());
  await page.waitForTimeout(500);

  const menuUi = await page.evaluate(() => ({
    menuOpen: document.getElementById("menu-dialog")?.open || document.getElementById("menu-dialog")?.hasAttribute("open"),
    remindersBtnPresent: Boolean(document.getElementById("menu-reminders-btn")),
    remindersDialogPresent: Boolean(document.getElementById("reminders-dialog")),
    pauseBlockPresent: Boolean(document.getElementById("menu-pause-block")),
    pauseInputPresent: Boolean(document.getElementById("leave-reminders-pause")),
    detailReminderPresent: Boolean(document.getElementById("detail-remind-me")),
    earlyOnJourney: Boolean(document.getElementById("leave-reminders-early")),
    stripOnJourney: Boolean(document.getElementById("leave-reminders-commute-strip")),
    detailReminderInCatchSection: (() => {
      const catchSection = document.getElementById("detail-preferred-section");
      const reminder = document.getElementById("detail-reminder-section");
      const schedule = document.getElementById("detail-timing-section");
      const sections = [...document.querySelectorAll("#settings-detail-view .settings-section")];
      const catchIdx = sections.indexOf(catchSection);
      const scheduleIdx = sections.indexOf(schedule);
      return (
        Boolean(reminder) &&
        catchIdx >= 0 &&
        scheduleIdx >= 0 &&
        scheduleIdx < catchIdx &&
        catchSection?.contains(reminder)
      );
    })(),
  }));

  await browser.close();

  const duplicateConstBug = pageErrors.some((m) => m.includes("DEFAULT_REMIND_DAYS"));

  const webPass =
    bridge.hasLeaveRemindersApi &&
    menuUi.menuOpen &&
    !menuUi.remindersBtnPresent &&
    !menuUi.remindersDialogPresent &&
    menuUi.pauseBlockPresent &&
    menuUi.pauseInputPresent &&
    menuUi.detailReminderPresent &&
    !menuUi.earlyOnJourney &&
    !menuUi.stripOnJourney &&
    menuUi.detailReminderInCatchSection;

  console.log("\nLeave alerts IA check (web)\n");
  console.log("Bridge:", JSON.stringify(bridge, null, 2));
  console.log("Menu / journey UI:", JSON.stringify(menuUi, null, 2));
  if (pageErrors.length) {
    console.log("Page errors:", pageErrors.slice(0, 3));
  }

  if (duplicateConstBug) {
    console.log(
      "\nFAIL  leave-reminders.js did not load (duplicate DEFAULT_REMIND_DAYS in app.js + leave-reminders.js)"
    );
    process.exit(1);
  }

  console.log(webPass ? "\nPASS  Leave alerts IA (web)\n" : "\nFAIL  Leave alerts IA (web)\n");
  process.exit(webPass ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
