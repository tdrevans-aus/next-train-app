/**
 * Remind me × notification permission matrix.
 * Mocks Capacitor LeaveReminders so web can exercise native permission gates.
 *
 * Usage: node qa/reminders-permission-gate.mjs
 */
import { chromium } from "playwright";
import { openJourneyDetail } from "./helpers/journeys-dialog.mjs";
import {
  installLeaveRemindersNativeMock,
  readLeaveRemindersMock,
  readRemindToggleUi,
} from "./helpers/leave-reminders-native-mock.mjs";

const BASE = "http://localhost:3000";
const JOURNEY_ID = "j-perm-gate";

const JOURNEY = {
  id: JOURNEY_ID,
  kind: "commute",
  name: "Permission gate commute",
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

function fail(name, detail) {
  console.error(`FAIL  ${name}`);
  console.error(JSON.stringify(detail, null, 2));
  return false;
}

function pass(name, detail) {
  console.log(`PASS  ${name}`);
  if (detail) {
    console.log(JSON.stringify(detail));
  }
  return true;
}

async function dismissBlockingCoaches(page) {
  await page.evaluate(() => {
    for (const id of [
      "widget-coach",
      "leave-reminder-coach",
      "template-route-coach",
      "onboarding-coach",
    ]) {
      const el = document.getElementById(id);
      if (el) {
        el.hidden = true;
      }
    }
    document.querySelectorAll(".onboarding-coach-scrim").forEach((scrim) => {
      scrim.style.pointerEvents = "none";
      scrim.hidden = true;
    });
  });
}

async function seedPage(page, { remindMe = false, permissionGranted = false, settings = {} } = {}) {
  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.evaluate(
    ({ journey, remindMeOn }) => {
      const doneCoach = { status: "done", snoozeUntilMs: null, notNowCount: 0 };
      localStorage.setItem(
        "nextTrainSettings",
        JSON.stringify({
          settingsSchemaVersion: 2,
          refreshSeconds: 60,
          activeJourneyId: journey.id,
          journeys: [{ ...journey, remindMe: remindMeOn }],
        })
      );
      localStorage.setItem("nextTrainOnboardingDone", "1");
      localStorage.setItem("nextTrainTemplateWizardSeen", "1");
      localStorage.setItem("nextTrainWidgetCoach", JSON.stringify(doneCoach));
      localStorage.setItem("nextTrainLeaveReminderCoach", JSON.stringify(doneCoach));
      localStorage.setItem("nextTrainWidgetCoachDismissed", "1");
      localStorage.setItem("nextTrainLeaveReminderCoachDismissed", "1");
      localStorage.removeItem("nextTrainLeaveReminders");
    },
    { journey: JOURNEY, remindMeOn: remindMe }
  );

  await installLeaveRemindersNativeMock(page, {
    permissionGranted,
    settings,
  });

  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.waitForTimeout(1200);

  await installLeaveRemindersNativeMock(page, {
    permissionGranted,
    settings,
  });
  await dismissBlockingCoaches(page);
}

async function openDetail(page) {
  await dismissBlockingCoaches(page);
  await openJourneyDetail(page, JOURNEY_ID);
  await page.waitForTimeout(600);
  await dismissBlockingCoaches(page);
}

async function setToggle(page, id, checked) {
  await page.evaluate(
    ({ id, checked }) => {
      const input = document.getElementById(id);
      if (!input) {
        throw new Error(`Missing #${id}`);
      }
      if (input.checked === checked) {
        return;
      }
      input.click();
    },
    { id, checked }
  );
  await page.waitForTimeout(400);
}

async function scenarioRemindMeDenied(page) {
  const name = "Remind me on without permission → stays off";
  await seedPage(page, { permissionGranted: false });
  await openDetail(page);

  await setToggle(page, "detail-remind-me", true);
  const ui = await readRemindToggleUi(page);
  const mock = await readLeaveRemindersMock(page);

  if (ui.remindChecked || mock?.settings?.commuteStripEnabled || mock?.settings?.enabled) {
    return fail(name, { ui, mock });
  }
  return pass(name, { enableCalls: mock.enableCalls });
}

async function scenarioRemindMeGrantedArmsStrip(page) {
  const name = "Remind me on with permission → commute strip defaults on";
  await seedPage(page, { permissionGranted: true });
  await openDetail(page);

  await page.evaluate(() => {
    const remind = document.getElementById("detail-remind-me");
    if (remind) {
      remind.dataset.userTouched = "1";
      if (remind.checked) {
        remind.click();
      }
    }
  });
  await page.waitForTimeout(400);

  await setToggle(page, "detail-remind-me", true);
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    await window.nextTrainLeaveReminders?.refreshJourneyRemindExtras?.();
  });
  await page.waitForTimeout(300);

  const ui = await readRemindToggleUi(page);
  const mock = await readLeaveRemindersMock(page);

  if (!ui.remindChecked || mock?.permissionGranted !== true) {
    return fail(name, { ui, mock });
  }

  if (!mock?.settings?.commuteStripEnabled) {
    return fail(name, { ui, mock, note: "expected commute strip armed in settings" });
  }
  return pass(name, {
    commuteStripEnabled: mock.settings.commuteStripEnabled,
  });
}

async function scenarioEnsureDefaultBlockedWithoutPermission(page) {
  const name = "ensureLiveCountdownDefaultOn does not arm without permission";
  await seedPage(page, {
    permissionGranted: false,
    settings: { enabled: true, commuteStripEnabled: false },
  });

  const result = await page.evaluate(async () => {
    const before = await window.nextTrainLeaveReminders.loadReminderSettings();
    const after = await window.nextTrainLeaveReminders.ensureLiveCountdownDefaultOn();
    return { before, after };
  });

  if (result.after?.commuteStripEnabled) {
    return fail(name, result);
  }
  return pass(name);
}

async function scenarioEnsureClearsOrphanStrip(page) {
  const name = "ensureLiveCountdownDefaultOn clears orphan strip without permission";
  await seedPage(page, {
    permissionGranted: false,
    settings: { commuteStripEnabled: true },
  });

  const result = await page.evaluate(async () => {
    const before = await window.nextTrainLeaveReminders.loadReminderSettings();
    const after = await window.nextTrainLeaveReminders.ensureLiveCountdownDefaultOn();
    return { before, after };
  });

  if (!result.before?.commuteStripEnabled || result.after?.commuteStripEnabled) {
    return fail(name, result);
  }
  return pass(name);
}

async function scenarioHealRevokesStrip(page) {
  const name = "heal clears commute strip when permission later denied";
  await seedPage(page, {
    permissionGranted: false,
    settings: {
      enabled: true,
      commuteStripEnabled: true,
    },
  });

  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}");
    raw.journeys = (raw.journeys || []).map((j) => ({ ...j, remindMe: true }));
    localStorage.setItem("nextTrainSettings", JSON.stringify(raw));
    window.nextTrainApp?.persistReminderJourneys?.([
      {
        id: "j-perm-gate",
        remindMe: true,
        preferredTrainTime: "07:30",
      },
    ]);
  });

  await page.evaluate(async () => {
    await window.nextTrainLeaveReminders.refreshJourneyRemindExtras();
  });

  const mock = await readLeaveRemindersMock(page);
  const journeys = await page.evaluate(() =>
    window.nextTrainApp.getConfiguredJourneys().map((j) => ({
      id: j.id,
      remindMe: j.remindMe,
    }))
  );

  if (
    mock?.settings?.commuteStripEnabled ||
    mock?.settings?.enabled ||
    journeys.some((j) => j.remindMe)
  ) {
    return fail(name, { mock, journeys });
  }
  return pass(name);
}

async function scenarioPermanentDenyOpensSettings(page) {
  const name = "permanent deny opens notification settings on Remind me";
  await seedPage(page, {
    permissionGranted: false,
  });
  await page.evaluate(() => window.__qaLeaveRemindersDeny?.(true));
  await openDetail(page);

  await setToggle(page, "detail-remind-me", true);
  const mock = await readLeaveRemindersMock(page);
  const ui = await readRemindToggleUi(page);

  if (ui.remindChecked || mock?.openSettingsCalls < 1) {
    return fail(name, { ui, mock });
  }
  return pass(name, { openSettingsCalls: mock.openSettingsCalls });
}

async function scenarioSaveWithRemindHealsEnabled(page) {
  const name = "Save with Remind me on + permission → master enabled";
  await seedPage(page, { permissionGranted: true, remindMe: false });
  await openDetail(page);

  await page.evaluate(() => {
    const remind = document.getElementById("detail-remind-me");
    if (remind) {
      delete remind.dataset.userTouched;
      remind.checked = true;
    }
  });
  await setToggle(page, "detail-remind-me", true);
  await page.locator("#detail-done-btn").click();
  await page.waitForTimeout(800);

  await page.evaluate(async () => {
    await window.nextTrainLeaveReminders?.refreshJourneyRemindExtras?.();
  });

  const mock = await readLeaveRemindersMock(page);
  const journeys = await page.evaluate(() =>
    window.nextTrainApp.getConfiguredJourneys().map((j) => ({
      id: j.id,
      remindMe: j.remindMe,
      preferredTrainTime: j.preferredTrainTime,
    }))
  );

  if (!journeys.some((j) => j.remindMe) || !mock?.settings?.enabled) {
    return fail(name, { mock, journeys });
  }
  if (!mock?.settings?.commuteStripEnabled) {
    return fail(name, { mock, journeys, note: "expected strip after remind save" });
  }
  return pass(name);
}

async function scenarioRemindOffDoesNotRequirePermission(page) {
  const name = "Remind me off does not request permission";
  await seedPage(page, {
    permissionGranted: false,
    settings: { enabled: false, commuteStripEnabled: false },
  });
  await openDetail(page);

  const before = await readLeaveRemindersMock(page);
  await page.evaluate(() => {
    const remind = document.getElementById("detail-remind-me");
    if (remind) {
      remind.dataset.userTouched = "1";
      remind.checked = true;
    }
  });
  await setToggle(page, "detail-remind-me", false);
  const after = await readLeaveRemindersMock(page);
  const ui = await readRemindToggleUi(page);

  if (after.enableCalls !== before.enableCalls || ui.remindChecked) {
    return fail(name, { before, after, ui });
  }
  return pass(name, { enableCalls: after.enableCalls });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  const scenarios = [
    scenarioRemindMeDenied,
    scenarioRemindMeGrantedArmsStrip,
    scenarioEnsureDefaultBlockedWithoutPermission,
    scenarioEnsureClearsOrphanStrip,
    scenarioHealRevokesStrip,
    scenarioPermanentDenyOpensSettings,
    scenarioSaveWithRemindHealsEnabled,
    scenarioRemindOffDoesNotRequirePermission,
  ];

  let allPass = true;
  console.log("\nReminders permission gate matrix\n");

  for (const scenario of scenarios) {
    try {
      const ok = await scenario(page);
      allPass = allPass && ok;
    } catch (error) {
      console.error(`FAIL  ${scenario.name} threw`);
      console.error(error);
      allPass = false;
    }
  }

  if (pageErrors.length) {
    console.log("\nPage errors (non-fatal unless leave-reminders load fails):", pageErrors.slice(0, 5));
    if (pageErrors.some((m) => /DEFAULT_REMIND_DAYS|nextTrainLeaveReminders/i.test(m))) {
      allPass = false;
    }
  }

  await browser.close();
  console.log(allPass ? "\nPASS  reminders permission gate\n" : "\nFAIL  reminders permission gate\n");
  process.exit(allPass ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
