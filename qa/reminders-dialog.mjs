/**
 * TESTING.md test 21 — Reminders dialog from Menu.
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
    hasLeaveRemindersApi: typeof window.nextTrainLeaveReminders?.openRemindersDialog === "function",
    isNative: window.Capacitor?.isNativePlatform?.(),
  }));

  await page.evaluate(() => document.getElementById("menu-btn").click());
  await page.waitForTimeout(500);

  await page.evaluate(() => document.getElementById("menu-reminders-btn").click());
  await page.waitForTimeout(1500);

  const ui = await page.evaluate(() => ({
    menuOpen: document.getElementById("menu-dialog").open,
    remindersOpen: document.getElementById("reminders-dialog").open,
    webHintHidden: document.getElementById("reminders-web-hint").hidden,
    nativeHidden: document.getElementById("reminders-native-content").hidden,
    masterTogglePresent: Boolean(document.getElementById("leave-reminders-enabled")),
    commuteListPresent: Boolean(document.getElementById("reminders-commutes-list")),
    detailReminderPresent: Boolean(document.getElementById("detail-remind-me")),
    moreOptionsPresent: Boolean(document.getElementById("reminders-more-options")),
    journeysCtaPresent: Boolean(document.getElementById("reminders-open-journeys-btn")),
    detailRemindAboveTiming: (() => {
      const reminder = document.getElementById("detail-reminder-section");
      const sections = [...document.querySelectorAll("#settings-detail-view .settings-section")];
      const reminderIdx = sections.indexOf(reminder);
      const timingIdx = sections.findIndex(
        (section) => section.querySelector(".settings-section-title")?.textContent?.trim() === "Timing"
      );
      return reminderIdx >= 0 && timingIdx >= 0 && reminderIdx < timingIdx;
    })(),
    sharedOptionsPresent: Boolean(document.getElementById("reminders-shared-options")),
    title: document.querySelector("#reminders-dialog h2")?.textContent?.trim() || "",
    doneVisible: !document.getElementById("reminders-done-btn").hidden,
  }));

  await browser.close();

  const duplicateConstBug = pageErrors.some((m) =>
    m.includes("DEFAULT_REMIND_DAYS")
  );

  const webPass =
    bridge.hasLeaveRemindersApi &&
    ui.remindersOpen &&
    !ui.menuOpen &&
    ui.webHintHidden === false &&
    ui.nativeHidden === true &&
    !ui.masterTogglePresent &&
    !ui.commuteListPresent &&
    ui.detailReminderPresent &&
    !ui.moreOptionsPresent &&
    ui.detailRemindAboveTiming &&
    ui.sharedOptionsPresent &&
    ui.title === "Reminder settings" &&
    ui.doneVisible;

  console.log("\nReminders dialog check (web)\n");
  console.log("Bridge:", JSON.stringify(bridge, null, 2));
  console.log("UI after Menu → Reminders:", JSON.stringify(ui, null, 2));
  if (pageErrors.length) {
    console.log("Page errors:", pageErrors.slice(0, 3));
  }

  if (duplicateConstBug) {
    console.log(
      "\nFAIL  leave-reminders.js did not load (duplicate DEFAULT_REMIND_DAYS in app.js + leave-reminders.js)"
    );
    process.exit(1);
  }

  console.log(webPass ? "\nPASS  Reminders dialog (web)\n" : "\nFAIL  Reminders dialog (web)\n");
  process.exit(webPass ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
