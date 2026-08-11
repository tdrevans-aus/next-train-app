/**
 * Pure-logic checks for stickiness coach gating (no browser).
 * Usage: node qa/stickiness-coaches-logic.mjs
 */

const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function coachCanAutoShow(state) {
  if (state.status === "done" || state.status === "exhausted") {
    return false;
  }
  if (state.status === "snoozed") {
    return Boolean(state.snoozeUntilMs && Date.now() >= state.snoozeUntilMs);
  }
  return state.status === "pending";
}

function isWidgetArcFinished(widgetState) {
  return widgetState.status === "done" || widgetState.status === "exhausted";
}

function hasPassedFirstWeekdayAfterConfig(engagement, perthDayKey, perthWeekdayIso) {
  if (!engagement.firstConfiguredJourneyAtMs) {
    return false;
  }
  const configDayKey = perthDayKey(engagement.firstConfiguredJourneyAtMs);
  const todayKey = perthDayKey();
  if (todayKey <= configDayKey) {
    return false;
  }
  return perthWeekdayIso() <= 5;
}

function shouldShowWidgetCoach(engagement, widgetState) {
  if (!coachCanAutoShow(widgetState)) {
    return false;
  }
  return (engagement.appOpenCount || 0) >= 2;
}

function shouldShowReminderCoach(
  engagement,
  widgetState,
  reminderState,
  perthDayKey,
  perthWeekdayIso,
  remindersAlreadyOn = false,
  skippedTemplateWizard = true
) {
  if (remindersAlreadyOn) {
    return false;
  }
  if (!skippedTemplateWizard) {
    return false;
  }
  if (!coachCanAutoShow(reminderState)) {
    return false;
  }
  if (!isWidgetArcFinished(widgetState)) {
    return false;
  }
  const openGate =
    (engagement.appOpenCount || 0) >= 3 ||
    hasPassedFirstWeekdayAfterConfig(engagement, perthDayKey, perthWeekdayIso);
  return openGate;
}

const monday = "2026-08-10";
const tuesday = "2026-08-11";
const saturday = "2026-08-15";

function perthDayKeyFor(ms) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Perth",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

const tests = [
  {
    name: "open 1: no widget",
    run: () => !shouldShowWidgetCoach({ appOpenCount: 1 }, { status: "pending" }),
  },
  {
    name: "open 2: widget pending",
    run: () => shouldShowWidgetCoach({ appOpenCount: 2 }, { status: "pending" }),
  },
  {
    name: "open 2: no reminder while widget pending",
    run: () =>
      !shouldShowReminderCoach(
        { appOpenCount: 2, firstConfiguredJourneyAtMs: Date.parse("2026-08-09T08:00:00+08:00") },
        { status: "pending" },
        { status: "pending" },
        () => monday,
        () => 1
      ),
  },
  {
    name: "open 3: reminder after skip + widget done",
    run: () =>
      shouldShowReminderCoach(
        { appOpenCount: 3, firstConfiguredJourneyAtMs: Date.parse("2026-08-09T08:00:00+08:00") },
        { status: "done" },
        { status: "pending" },
        () => monday,
        () => 1,
        false,
        true
      ),
  },
  {
    name: "open 3: no reminder coach if wizard completed (not skip)",
    run: () =>
      !shouldShowReminderCoach(
        { appOpenCount: 3, firstConfiguredJourneyAtMs: Date.parse("2026-08-09T08:00:00+08:00") },
        { status: "done" },
        { status: "pending" },
        () => monday,
        () => 1,
        false,
        false
      ),
  },
  {
    name: "open 3: silence reminder coach if already on",
    run: () =>
      !shouldShowReminderCoach(
        { appOpenCount: 3, firstConfiguredJourneyAtMs: Date.parse("2026-08-09T08:00:00+08:00") },
        { status: "done" },
        { status: "pending" },
        () => monday,
        () => 1,
        true,
        true
      ),
  },
  {
    name: "widget snoozed blocks reminder",
    run: () =>
      !shouldShowReminderCoach(
        { appOpenCount: 4, firstConfiguredJourneyAtMs: Date.parse("2026-08-09T08:00:00+08:00") },
        { status: "snoozed", snoozeUntilMs: Date.now() + SNOOZE_MS },
        { status: "pending" },
        () => monday,
        () => 1
      ),
  },
  {
    name: "weekday after config day opens reminder gate",
    run: () => {
      const configMs = Date.parse("2026-08-10T18:00:00+08:00");
      const dayKey = (ms) => (ms ? perthDayKeyFor(configMs) : tuesday);
      return hasPassedFirstWeekdayAfterConfig(
        { firstConfiguredJourneyAtMs: configMs },
        dayKey,
        () => 2
      );
    },
  },
  {
    name: "same config day weekday does not open gate",
    run: () =>
      !hasPassedFirstWeekdayAfterConfig(
        { firstConfiguredJourneyAtMs: Date.parse("2026-08-10T08:00:00+08:00") },
        () => monday,
        () => 1
      ),
  },
  {
    name: "second not now exhausts coach",
    run: () => {
      const next = { status: "snoozed", snoozeUntilMs: Date.now() - 1, notNowCount: 1 };
      const exhausted = { status: "exhausted", snoozeUntilMs: null, notNowCount: 2 };
      return coachCanAutoShow(next) && !coachCanAutoShow(exhausted);
    },
  },
];

let failed = 0;
for (const test of tests) {
  const pass = Boolean(test.run());
  console.log(`${pass ? "PASS" : "FAIL"}  ${test.name}`);
  if (!pass) {
    failed += 1;
  }
}

console.log(`\n${tests.length - failed} PASS · ${failed} FAIL\n`);
process.exit(failed ? 1 : 0);
