const ENGAGEMENT_KEY = "nextTrainAppEngagement";
const WIDGET_COACH_KEY = "nextTrainWidgetCoach";
const REMINDER_COACH_KEY = "nextTrainLeaveReminderCoach";
const LEGACY_WIDGET_DISMISSED_KEY = "nextTrainWidgetCoachDismissed";
const LEGACY_REMINDER_DISMISSED_KEY = "nextTrainLeaveReminderCoachDismissed";
const PERTH_TZ = "Australia/Perth";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const EVALUATION_DELAY_MS = 1500;

function isNativeApp() {
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

function perthDayKey(ms = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PERTH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

function perthWeekdayIso(ms = Date.now()) {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: PERTH_TZ,
    weekday: "short",
  }).format(new Date(ms));
  const map = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[day] ?? 1;
}

function defaultEngagement() {
  return {
    appOpenCount: 0,
    firstConfiguredJourneyAtMs: null,
    lastOpenDayKey: null,
  };
}

function readEngagement() {
  try {
    const raw = localStorage.getItem(ENGAGEMENT_KEY);
    if (!raw) {
      return defaultEngagement();
    }
    return { ...defaultEngagement(), ...JSON.parse(raw) };
  } catch {
    return defaultEngagement();
  }
}

function writeEngagement(engagement) {
  localStorage.setItem(ENGAGEMENT_KEY, JSON.stringify(engagement));
}

function defaultCoachState() {
  return {
    status: "pending",
    snoozeUntilMs: null,
    notNowCount: 0,
  };
}

function migrateCoachState(storageKey, legacyKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      return { ...defaultCoachState(), ...JSON.parse(raw) };
    }
  } catch {
    // Fall through to legacy migration.
  }

  if (localStorage.getItem(legacyKey) === "1") {
    return { status: "done", snoozeUntilMs: null, notNowCount: 0 };
  }

  return defaultCoachState();
}

function readCoachState(kind) {
  if (kind === "widget") {
    return migrateCoachState(WIDGET_COACH_KEY, LEGACY_WIDGET_DISMISSED_KEY);
  }
  return migrateCoachState(REMINDER_COACH_KEY, LEGACY_REMINDER_DISMISSED_KEY);
}

function writeCoachState(kind, state) {
  const key = kind === "widget" ? WIDGET_COACH_KEY : REMINDER_COACH_KEY;
  localStorage.setItem(key, JSON.stringify(state));
}

function recordAppOpen() {
  const engagement = readEngagement();
  engagement.appOpenCount = (engagement.appOpenCount || 0) + 1;
  engagement.lastOpenDayKey = perthDayKey();
  writeEngagement(engagement);
  return engagement;
}

function recordFirstConfiguredJourney() {
  const engagement = readEngagement();
  if (!engagement.firstConfiguredJourneyAtMs) {
    engagement.firstConfiguredJourneyAtMs = Date.now();
    writeEngagement(engagement);
  }
}

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

function hasPassedFirstWeekdayAfterConfig(engagement) {
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

function shouldShowWidgetCoach(engagement = readEngagement(), widgetState = readCoachState("widget")) {
  if (!coachCanAutoShow(widgetState)) {
    return false;
  }
  return (engagement.appOpenCount || 0) >= 2;
}

function anyJourneyHasRemindersOn() {
  const journeys = window.nextTrainApp?.getConfiguredJourneys?.() ?? [];
  return journeys.some((journey) => journey?.remindMe === true);
}

function hasSkippedTemplateWizard() {
  return Boolean(window.nextTrainApp?.hasSkippedTemplateWizard?.());
}

function shouldShowReminderCoach(
  engagement = readEngagement(),
  widgetState = readCoachState("widget"),
  reminderState = readCoachState("reminder"),
  remindersAlreadyOn = anyJourneyHasRemindersOn(),
  skippedTemplateWizard = hasSkippedTemplateWizard()
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
    (engagement.appOpenCount || 0) >= 3 || hasPassedFirstWeekdayAfterConfig(engagement);
  return openGate;
}

function isBlockingUiVisible() {
  const onboardingCoach = document.getElementById("onboarding-coach");
  if (onboardingCoach && !onboardingCoach.hidden) {
    return true;
  }

  const templateCoach = document.getElementById("template-route-coach");
  if (templateCoach && !templateCoach.hidden) {
    return true;
  }

  const journeysDialog = document.getElementById("journeys-dialog");
  if (journeysDialog && !journeysDialog.hidden) {
    return true;
  }

  const menuDialog = document.getElementById("menu-dialog");
  if (menuDialog?.open || menuDialog?.hasAttribute("open")) {
    return true;
  }

  const remindersDialog = document.getElementById("reminders-dialog");
  if (remindersDialog?.open || remindersDialog?.hasAttribute("open")) {
    return true;
  }

  return false;
}

function markCoachDone(kind) {
  const current = readCoachState(kind);
  writeCoachState(kind, {
    status: "done",
    snoozeUntilMs: null,
    notNowCount: current.notNowCount || 0,
  });
}

function markCoachNotNow(kind) {
  const current = readCoachState(kind);
  const notNowCount = (current.notNowCount || 0) + 1;

  if (notNowCount >= 2) {
    writeCoachState(kind, {
      status: "exhausted",
      snoozeUntilMs: null,
      notNowCount,
    });
    return;
  }

  writeCoachState(kind, {
    status: "snoozed",
    snoozeUntilMs: Date.now() + SNOOZE_MS,
    notNowCount,
  });
}

async function evaluateStickinessCoaches() {
  if (!isNativeApp()) {
    return;
  }

  if (!window.nextTrainApp?.hasConfiguredCommute?.()) {
    return;
  }

  if (isBlockingUiVisible()) {
    return;
  }

  const engagement = readEngagement();
  const widgetState = readCoachState("widget");

  if (shouldShowWidgetCoach(engagement, widgetState)) {
    const shown = await window.nextTrainWidget?.showWidgetCoach?.();
    if (shown) {
      return;
    }
  }

  if (anyJourneyHasRemindersOn()) {
    markCoachDone("reminder");
    return;
  }

  if (!hasSkippedTemplateWizard()) {
    return;
  }

  const reminderState = readCoachState("reminder");
  const latestWidgetState = readCoachState("widget");
  if (shouldShowReminderCoach(engagement, latestWidgetState, reminderState, false, true)) {
    window.nextTrainLeaveReminders?.showLeaveReminderCoach?.();
  }
}

function scheduleStickinessCoachEvaluation() {
  window.setTimeout(evaluateStickinessCoaches, EVALUATION_DELAY_MS);
}

function initStickinessCoaches() {
  recordAppOpen();

  document.addEventListener("nexttrain:journey-configured-first", () => {
    recordFirstConfiguredJourney();
  });

  scheduleStickinessCoachEvaluation();
}

window.nextTrainStickinessCoaches = {
  readEngagement,
  readCoachState,
  recordAppOpen,
  recordFirstConfiguredJourney,
  shouldShowWidgetCoach,
  shouldShowReminderCoach,
  anyJourneyHasRemindersOn,
  markCoachDone,
  markCoachNotNow,
  evaluateStickinessCoaches,
  perthDayKey,
  perthWeekdayIso,
  hasPassedFirstWeekdayAfterConfig,
  isWidgetArcFinished,
  coachCanAutoShow,
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStickinessCoaches);
} else {
  initStickinessCoaches();
}
