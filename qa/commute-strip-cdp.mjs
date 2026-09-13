/**
 * Commute strip reminder settings via LeaveReminders API (Playwright + native mock).
 * Replaces the old CDP script that required Chrome remote debugging on :9222.
 *
 * Usage: node qa/commute-strip-cdp.mjs
 */
import { chromium } from "playwright";
import {
  installLeaveRemindersNativeMock,
  readLeaveRemindersMock,
} from "./helpers/leave-reminders-native-mock.mjs";

import { BASE } from "./helpers/dev-server.mjs";

const SEED_JOURNEY = {
  id: "j-commute-strip",
  kind: "journey",
  name: "Commute strip test",
  station: "Edgewater Stn",
  direction: "Perth",
  leaveBeforeMinutes: 10,
  useLeaveBefore: true,
  defaultFrom: "06:30",
  defaultUntil: "09:30",
  preferredTrainTime: "07:30",
  remindDays: [1, 2, 3, 4, 5],
  remindMe: false,
};

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.evaluate((journey) => {
    localStorage.setItem(
      "nextTrainSettings",
      JSON.stringify({
        settingsSchemaVersion: 2,
        refreshSeconds: 60,
        activeJourneyId: journey.id,
        journeys: [journey],
      })
    );
    localStorage.setItem("nextTrainOnboardingDone", "1");
    localStorage.removeItem("nextTrainLeaveReminders");
  }, SEED_JOURNEY);
  await page.reload();
  await page.waitForFunction(() => Boolean(window.nextTrainLeaveReminders?.saveReminderSettings));
  await installLeaveRemindersNativeMock(page, { permissionGranted: true });

  const setup = await page.evaluate(async () => {
    const SETTINGS_KEY = "nextTrainSettings";
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return { ok: false, reason: "no settings" };
    }

    const settings = JSON.parse(raw);
    const journey = settings.journeys?.[0];
    if (!journey) {
      return { ok: false, reason: "no journey" };
    }

    journey.remindMe = true;
    journey.preferredTrainTime = "23:30";
    journey.defaultFrom = "22:00";
    journey.defaultUntil = "23:59";
    journey.remindDays = [1, 2, 3, 4, 5, 6, 7];
    journey.leaveBeforeMinutes = 10;
    journey.useLeaveBefore = true;
    settings.journeys[0] = journey;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    const leave = window.nextTrainLeaveReminders;
    if (!leave?.saveReminderSettings) {
      return { ok: false, reason: "no leave API" };
    }

    const saved = await leave.saveReminderSettings({
      enabled: false,
      paused: false,
      commuteStripEnabled: true,
      earlyHeadsUp: true,
      earlyOffsetMinutes: 45,
    });

    leave.reschedule?.();
    await window.Capacitor?.Plugins?.LeaveReminders?.reschedule?.();

    return {
      ok: true,
      journey: {
        id: journey.id,
        remindMe: journey.remindMe,
        preferredTrainTime: journey.preferredTrainTime,
      },
      reminderSettings: saved,
      commuteStripEnabled: saved?.commuteStripEnabled === true,
    };
  });

  const mock = await readLeaveRemindersMock(page);
  await browser.close();

  if (!setup?.ok || !setup.commuteStripEnabled) {
    console.error("FAIL commute-strip-cdp");
    console.error(JSON.stringify({ setup, mock }, null, 2));
    process.exit(1);
  }

  if (!mock?.settings?.commuteStripEnabled) {
    console.error("FAIL commute-strip-cdp — mock plugin state missing commute strip");
    console.error(JSON.stringify(mock, null, 2));
    process.exit(1);
  }

  console.log("PASS commute-strip-cdp");
  console.log(JSON.stringify(setup, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
