(function (global) {
  // CAPACITOR-Z: classic-script re-eval must not redeclare top-level const in global scope.
  if (global.nextTrainLeaveReminders) {
    return;
  }

const LEAVE_REMINDER_SETTINGS_KEY = "nextTrainLeaveReminders";
const PAUSE_DURATION_KEY = "nextTrainPauseDuration";
const PAUSE_CUSTOM_DAYS_KEY = "nextTrainPauseCustomDays";
const DEFAULT_GET_READY_MINUTES = 5;
const NUDGE_OFFSET_OPTIONS = [5, 10, 15];
const PAUSE_DURATION_OPTIONS = ["1day", "1week", "2weeks", "custom"];
const DEFAULT_PAUSE_DURATION = "1week";
const MIN_CUSTOM_PAUSE_DAYS = 1;
const MAX_CUSTOM_PAUSE_DAYS = 90;
const DEFAULT_CUSTOM_PAUSE_DAYS = 3;

let remindersSaveInFlight = false;

function isNativeApp() {
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

function getLeaveRemindersPlugin() {
  if (!window.Capacitor) {
    return null;
  }
  if (typeof window.Capacitor.registerPlugin === "function") {
    return window.Capacitor.registerPlugin("LeaveReminders");
  }
  return window.Capacitor.Plugins?.LeaveReminders ?? null;
}

function readLocalReminderSettings() {
  try {
    const raw = localStorage.getItem(LEAVE_REMINDER_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalReminderSettings(settings) {
  localStorage.setItem(LEAVE_REMINDER_SETTINGS_KEY, JSON.stringify(settings));
}

async function loadReminderSettings() {
  const plugin = getLeaveRemindersPlugin();
  if (!plugin?.getSettings) {
    return clearExpiredPauseIfNeeded(
      readLocalReminderSettings() ?? {
        enabled: false,
        paused: false,
        pauseUntil: null,
        earlyHeadsUp: false,
        earlyOffsetMinutes: DEFAULT_GET_READY_MINUTES,
        commuteStripEnabled: false,
      }
    );
  }

  try {
    const settings = await plugin.getSettings();
    writeLocalReminderSettings(settings);
    return clearExpiredPauseIfNeeded(settings);
  } catch (error) {
    console.warn("Could not load leave reminder settings", error);
    return clearExpiredPauseIfNeeded(
      readLocalReminderSettings() ?? {
        enabled: false,
        paused: false,
        pauseUntil: null,
        earlyHeadsUp: false,
        earlyOffsetMinutes: DEFAULT_GET_READY_MINUTES,
        commuteStripEnabled: false,
      }
    );
  }
}

async function saveReminderSettings(patch) {
  const current = await loadReminderSettings();
  const next = { ...current, ...patch };
  if (Object.prototype.hasOwnProperty.call(patch, "paused") && patch.paused === false) {
    next.pauseUntil = null;
  }
  writeLocalReminderSettings(next);

  const plugin = getLeaveRemindersPlugin();
  if (!plugin?.setSettings) {
    return next;
  }

  try {
    const saved = await plugin.setSettings(next);
    writeLocalReminderSettings(saved);
    return saved;
  } catch (error) {
    console.warn("Could not save leave reminder settings", error);
    return next;
  }
}

async function enableLeaveReminders({ userInitiated = false } = {}) {
  const plugin = getLeaveRemindersPlugin();
  if (!plugin?.enableReminders) {
    return saveReminderSettings({
      enabled: true,
      paused: false,
      pauseUntil: null,
    });
  }

  try {
    // Single path: native enableReminders shows the POST_NOTIFICATIONS prompt when allowed.
    // Do not also call plugin.requestPermissions first — a prior deny makes the second
    // request return immediately with no dialog, which flips Remind me back off.
    let saved = await plugin.enableReminders();

    if (saved?.permissionGranted !== false) {
      writeLocalReminderSettings(saved);
      if (userInitiated && saved?.shouldOpenAlarmSettings && plugin.openAlarmSettings) {
        try {
          await plugin.openAlarmSettings();
        } catch (error) {
          console.warn("Could not open alarm settings", error);
        }
      }
      return saved;
    }

    if (userInitiated && saved?.shouldOpenSettings && plugin.openNotificationSettings) {
      try {
        await plugin.openNotificationSettings();
      } catch (error) {
        console.warn("Could not open notification settings", error);
      }
    }

    writeLocalReminderSettings(saved);
    return saved;
  } catch (error) {
    console.warn("Could not enable leave reminders", error);
    return loadReminderSettings();
  }
}

async function ensureLiveCountdownDefaultOn() {
  const settings = await loadReminderSettings();
  if (isNativeApp() && settings?.permissionGranted === false && settings?.commuteStripEnabled) {
    return saveReminderSettings({ commuteStripEnabled: false });
  }
  return settings;
}

async function acknowledgeDeparture(journeyId, departure) {
  if (!journeyId || !departure) {
    return;
  }

  const plugin = getLeaveRemindersPlugin();
  if (!plugin?.acknowledgeDeparture) {
    return;
  }

  try {
    await plugin.acknowledgeDeparture({ journeyId, departure });
  } catch (error) {
    console.warn("Could not acknowledge departure for reminders", error);
  }
}

async function isDepartureAcknowledged(journeyId, departure) {
  if (!journeyId || !departure) {
    return false;
  }

  const plugin = getLeaveRemindersPlugin();
  if (!plugin?.isDepartureAcknowledged) {
    return false;
  }

  try {
    const result = await plugin.isDepartureAcknowledged({ journeyId, departure });
    return Boolean(result?.acknowledged);
  } catch (error) {
    console.warn("Could not read native leave ack", error);
    return false;
  }
}

async function startOnTheWay({ journeyId, route, trainTime, departure, stale = false }) {
  if (!journeyId || !departure) {
    return;
  }

  const plugin = getLeaveRemindersPlugin();
  if (!plugin?.startOnTheWay) {
    return;
  }

  try {
    await plugin.startOnTheWay({ journeyId, route, trainTime, departure, stale });
  } catch (error) {
    console.warn("Could not start on-the-way countdown", error);
  }
}

async function getActiveLeaveAlarm() {
  const plugin = getLeaveRemindersPlugin();
  if (!plugin?.getActiveLeaveAlarm) {
    return { active: false };
  }

  try {
    return (await plugin.getActiveLeaveAlarm()) ?? { active: false };
  } catch (error) {
    console.warn("Could not read active leave alarm", error);
    return { active: false };
  }
}

async function dismissLeaveAlarm() {
  const plugin = getLeaveRemindersPlugin();
  if (!plugin?.dismissLeaveAlarm) {
    return;
  }

  try {
    await plugin.dismissLeaveAlarm();
  } catch (error) {
    console.warn("Could not dismiss leave alarm", error);
  }
}

function getActiveTimeZone() {
  return window.NextTrainCitySession?.readActiveTimeZone?.() || "Australia/Perth";
}

function getActiveTimeZoneOffset(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: getActiveTimeZone(),
    timeZoneName: "shortOffset",
  }).formatToParts(date);
  const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value || "GMT+8";
  // Convert "GMT+08:00" or "GMT+8" to "+08:00"
  let offset = offsetPart.replace("GMT", "");
  if (offset === "Z") return "+00:00";
  if (!offset.includes(":")) {
    const sign = offset.startsWith("-") ? "-" : "+";
    const val = offset.replace(/[+-]/, "");
    offset = `${sign}${val.padStart(2, "0")}:00`;
  }
  return offset;
}

function getPerthDateParts(date = new Date()) {
  const parts = {};
  new Intl.DateTimeFormat("en-GB", {
    timeZone: getActiveTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .forEach(({ type, value }) => {
      parts[type] = value;
    });
  return parts;
}

function pauseUntilEndOfPerthDay() {
  const dateKey = getPerthDateKey();
  return `${dateKey}T23:59:59${getActiveTimeZoneOffset()}`;
}

function pauseUntilPerthDaysFromNow(days) {
  const parts = getPerthDateParts();
  const dateKey = getPerthDateKey();
  const offset = getActiveTimeZoneOffset();
  const midnight = new Date(`${dateKey}T00:00:00${offset}`);
  const target = new Date(midnight.getTime() + days * 24 * 60 * 60 * 1000);
  const targetKey = getPerthDateKey(target);
  return `${targetKey}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}

function computePauseUntilIso(duration, customDays = readCustomPauseDays()) {
  if (duration === "1day") {
    return pauseUntilEndOfPerthDay();
  }
  if (duration === "1week") {
    return pauseUntilPerthDaysFromNow(7);
  }
  if (duration === "2weeks") {
    return pauseUntilPerthDaysFromNow(14);
  }
  if (duration === "custom") {
    return pauseUntilPerthDaysFromNow(clampCustomPauseDays(customDays));
  }
  return null;
}

function formatPauseUntilLabel(pauseUntil, paused = true) {
  if (!paused) {
    return null;
  }
  if (!pauseUntil) {
    return "Paused until you resume";
  }

  const date = new Date(pauseUntil);
  if (Number.isNaN(date.getTime())) {
    return "Paused until you resume";
  }

  const label = date.toLocaleDateString("en-AU", {
    timeZone: getActiveTimeZone(),
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `Paused until ${label}`;
}

async function clearExpiredPauseIfNeeded(settings) {
  if (!settings?.paused || !settings.pauseUntil) {
    return settings;
  }

  if (Date.now() < Date.parse(settings.pauseUntil)) {
    return settings;
  }

  const cleared = { ...settings, paused: false, pauseUntil: null };
  writeLocalReminderSettings(cleared);

  const plugin = getLeaveRemindersPlugin();
  if (plugin?.setSettings) {
    try {
      const saved = await plugin.setSettings(cleared);
      writeLocalReminderSettings(saved);
      plugin.reschedule?.();
      return saved;
    } catch (error) {
      console.warn("Could not clear expired pause", error);
    }
  }

  plugin?.reschedule?.();
  return cleared;
}

function readSelectedNudgeOffset() {
  const active = document.querySelector("#leave-reminders-nudge-chips .reminder-offset-chip--active");
  return Number(active?.dataset.minutes) || DEFAULT_GET_READY_MINUTES;
}

function setNudgeOffsetChips(minutes) {
  const container = document.getElementById("leave-reminders-nudge-chips");
  if (!container) {
    return;
  }

  const selected = NUDGE_OFFSET_OPTIONS.includes(minutes) ? minutes : DEFAULT_GET_READY_MINUTES;
  container.querySelectorAll(".reminder-offset-chip").forEach((chip) => {
    const active = Number(chip.dataset.minutes) === selected;
    chip.classList.toggle("reminder-offset-chip--active", active);
    chip.classList.toggle("remind-day-chip--active", active);
    chip.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function initLeaveReminderUi() {
  document.getElementById("leave-reminders-pause-chips")?.addEventListener("click", async (event) => {
    const chip = event.target.closest(".reminder-pause-chip");
    if (!chip) {
      return;
    }

    const duration = chip.dataset.pause;
    if (duration === "custom") {
      await applyCustomPauseFromInput({ focusInput: true });
      return;
    }

    syncPauseCustomField(false);
    const settings = await activatePause(duration);
    const schedule = settings?.enabled ? await loadReminderSchedule() : null;
    await updateRemindersDialogUi(settings, schedule);
  });

  document.getElementById("leave-reminders-pause-custom-apply")?.addEventListener("click", async () => {
    await applyCustomPauseFromInput();
  });

  document.getElementById("leave-reminders-pause-days")?.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    await applyCustomPauseFromInput();
  });

  document.getElementById("leave-reminders-pause")?.addEventListener("change", async (event) => {
    const on = event.target.checked;
    const settings = on
      ? await activatePause(readLastPauseDuration())
      : await resumeReminders();
    const schedule = settings?.enabled ? await loadReminderSchedule() : null;
    await updateRemindersDialogUi(settings, schedule);
  });

  document.getElementById("leave-reminder-turn-on-btn")?.addEventListener("click", async () => {
    hideLeaveReminderCoach();
    window.nextTrainStickinessCoaches?.markCoachDone?.("reminder");
    window.nextTrainApp?.openJourneys?.();
  });

  document.getElementById("leave-reminder-later-btn")?.addEventListener("click", () => {
    window.nextTrainStickinessCoaches?.markCoachNotNow?.("reminder");
    hideLeaveReminderCoach();
    window.nextTrainWidget?.showReminderCoachNotNowHint?.();
  });

  document.addEventListener("nexttrain:settings-persisted", async () => {
    getLeaveRemindersPlugin()?.reschedule?.();
    await renderLeaveAlertSurfaces();
  });

  document.addEventListener("nexttrain:menu-open", () => {
    void refreshMenuPauseUi();
  });
}

function clampCustomPauseDays(value) {
  const days = Math.round(Number(value));
  if (!Number.isFinite(days)) {
    return DEFAULT_CUSTOM_PAUSE_DAYS;
  }
  return Math.min(MAX_CUSTOM_PAUSE_DAYS, Math.max(MIN_CUSTOM_PAUSE_DAYS, days));
}

function readCustomPauseDays() {
  const raw = localStorage.getItem(PAUSE_CUSTOM_DAYS_KEY);
  if (raw == null || raw === "") {
    return DEFAULT_CUSTOM_PAUSE_DAYS;
  }
  return clampCustomPauseDays(raw);
}

function writeCustomPauseDays(days) {
  localStorage.setItem(PAUSE_CUSTOM_DAYS_KEY, String(clampCustomPauseDays(days)));
}

function readLastPauseDuration() {
  const value = localStorage.getItem(PAUSE_DURATION_KEY);
  return PAUSE_DURATION_OPTIONS.includes(value) ? value : DEFAULT_PAUSE_DURATION;
}

function writeLastPauseDuration(duration) {
  if (PAUSE_DURATION_OPTIONS.includes(duration)) {
    localStorage.setItem(PAUSE_DURATION_KEY, duration);
  }
}

function setPauseDurationChips(activeDuration) {
  const container = document.getElementById("leave-reminders-pause-chips");
  if (!container) {
    return;
  }

  container.querySelectorAll(".reminder-pause-chip").forEach((chip) => {
    const active = chip.dataset.pause === activeDuration;
    chip.classList.toggle("remind-day-chip--active", active);
    chip.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function syncPauseCustomField(show, days = readCustomPauseDays()) {
  const customWrap = document.getElementById("leave-reminders-pause-custom");
  const daysInput = document.getElementById("leave-reminders-pause-days");
  if (!customWrap || !daysInput) {
    return;
  }

  customWrap.hidden = !show;
  daysInput.value = String(clampCustomPauseDays(days));
}

function updatePauseUi(settings) {
  const pauseInput = document.getElementById("leave-reminders-pause");
  const pauseExpanded = document.getElementById("leave-reminders-pause-expanded");
  const pauseStatus = document.getElementById("leave-reminders-pause-status");
  if (!pauseInput || !pauseExpanded || !pauseStatus) {
    return;
  }

  const paused = Boolean(settings?.paused);
  const duration = readLastPauseDuration();
  pauseInput.checked = paused;
  pauseExpanded.hidden = !paused;
  setPauseDurationChips(duration);
  syncPauseCustomField(paused && duration === "custom");

  if (paused) {
    const label = formatPauseUntilLabel(settings.pauseUntil, true);
    pauseStatus.hidden = !label;
    pauseStatus.textContent = label || "";
  } else {
    pauseStatus.hidden = true;
    pauseStatus.textContent = "";
  }
}

function getPerthDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: getActiveTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatScheduleDayPrefix(localDate) {
  if (!localDate) {
    return "";
  }

  const today = getPerthDateKey();
  if (localDate === today) {
    return "Today";
  }

  const tomorrow = getPerthDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
  if (localDate === tomorrow) {
    return "Tomorrow";
  }

  return "";
}

function formatReminderScheduleLine(schedule) {
  if (!schedule?.enabled) {
    return null;
  }

  if (schedule.reason === "fast_test") {
    const notifyAt = schedule.primaryNotifyAtClock;
    if (!notifyAt) {
      return "Test reminder in ~1 min";
    }
    const trainTime = schedule.trainTime;
    return trainTime
      ? `Test reminder ~${notifyAt} · ${trainTime} train`
      : `Test reminder ~${notifyAt}`;
  }

  // Only speak when there is a concrete next ping — otherwise stay silent.
  if (schedule.reason !== "ok") {
    return null;
  }

  const notifyAt = schedule.primaryNotifyAtClock;
  const trainTime = schedule.trainTime;
  if (!notifyAt || !trainTime) {
    return null;
  }

  const dayPrefix = formatScheduleDayPrefix(schedule.localDate);
  const when = dayPrefix ? `${dayPrefix} ${notifyAt}` : notifyAt;
  return `Next: ${when} · ${trainTime} train`;
}

async function loadReminderSchedule() {
  const plugin = getLeaveRemindersPlugin();
  if (!plugin?.getSchedule) {
    return null;
  }

  try {
    return await plugin.getSchedule();
  } catch (error) {
    console.warn("Could not load leave reminder schedule", error);
    return null;
  }
}

function updateReminderScheduleLine(schedule, settings) {
  const line = document.getElementById("leave-reminders-schedule");
  if (!line) {
    return;
  }

  if (!isNativeApp() || !settings?.enabled) {
    line.hidden = true;
    line.textContent = "";
    return;
  }

  const text = formatReminderScheduleLine(schedule);
  if (!text) {
    line.hidden = true;
    line.textContent = "";
    return;
  }

  line.textContent = text;
  line.hidden = false;
}

function getConfiguredJourneys() {
  return window.nextTrainApp?.getConfiguredJourneys?.() ?? [];
}

function readAppSettings() {
  try {
    return window.settings ?? window.nextTrainApp?.getSettings?.() ?? null;
  } catch {
    return null;
  }
}

function isNearbyPinNotifyArmed(settings = readAppSettings()) {
  const pin = settings?.nearbyPin;
  if (!pin?.notifyMe) {
    return false;
  }
  const departureMs = Date.parse(pin.departureIso ?? "");
  if (!Number.isFinite(departureMs)) {
    return false;
  }
  const holdingUntil = Number(pin.holdingUntilMs) || departureMs + 60_000;
  return Date.now() < holdingUntil;
}

function deriveReminderEnabled() {
  const journeys = getConfiguredJourneys();
  if (journeys.some((journey) => journey?.remindMe)) {
    return true;
  }
  if (journeys.some((journey) => journey?.pinNotifyMe === true)) {
    return true;
  }
  return isNearbyPinNotifyArmed();
}

function clearAllJourneyRemindMe() {
  const patches = getConfiguredJourneys()
    .filter((journey) => journey.remindMe)
    .map((journey) => ({
      id: journey.id,
      remindMe: false,
      preferredTrainTime: journey.preferredTrainTime || "",
    }));

  if (!patches.length) {
    return false;
  }

  window.nextTrainApp?.persistReminderJourneys?.(patches);
  return true;
}

async function healReminderSettings(settings) {
  const shouldEnable = deriveReminderEnabled();
  if (Boolean(settings?.enabled) === shouldEnable) {
    return settings;
  }

  const patch = { enabled: shouldEnable };
  if (!shouldEnable) {
    patch.paused = false;
    patch.pauseUntil = null;
  }
  return saveReminderSettings(patch);
}

/**
 * Journey Reminder / Live countdown on ⇔ notifications can fire.
 * If permission is denied (or enable fails), turn them off — no orphan “on” state.
 */
async function healRemindersPermissionState(settings) {
  let next = settings;

  if (next?.permissionGranted === false && next?.commuteStripEnabled) {
    next = await saveReminderSettings({ commuteStripEnabled: false });
  }

  if (!deriveReminderEnabled()) {
    return healReminderSettings(next);
  }

  if (next?.permissionGranted === false) {
    if (clearAllJourneyRemindMe()) {
      // Journeys updated via persistReminderJourneys.
    }
    return saveReminderSettings({
      enabled: false,
      commuteStripEnabled: false,
      paused: false,
      pauseUntil: null,
    });
  }

  if (!next?.enabled) {
    next = await enableLeaveReminders();
    if (next?.permissionGranted === false) {
      if (clearAllJourneyRemindMe()) {
        // Journeys updated via persistReminderJourneys.
      }
      return saveReminderSettings({
        enabled: false,
        commuteStripEnabled: false,
        paused: false,
        pauseUntil: null,
      });
    }
  }

  return healReminderSettings(next);
}

function updateRemindersEmptyState() {
  return false;
}

async function refreshJourneyRemindExtras() {
  if (!isNativeApp() && !Boolean(window.NextTrainCitySession?.readActiveTimeZone?.())) {
    return null;
  }
  let settings = await loadReminderSettings();
  // Product cut: Early Reminder UI gone — force off so reminders fire at leave-by.
  if (settings?.earlyHeadsUp) {
    settings = await saveReminderSettings({ earlyHeadsUp: false });
  }
  // Live countdown strip UI removed — clear legacy native flag so Leave now pings fire.
  if (settings?.commuteStripEnabled) {
    settings = await saveReminderSettings({ commuteStripEnabled: false });
    getLeaveRemindersPlugin()?.reschedule?.();
  }
  settings = await healRemindersPermissionState(settings);
  if (deriveReminderEnabled()) {
    getLeaveRemindersPlugin()?.reschedule?.();
  }
  updateNudgeEarlyUi(settings);
  return settings;
}

function updateNudgeEarlyUi(settings) {
  // Early Reminder UI removed from journey detail (product cut 12 Aug 2026).
  // Native earlyHeadsUp stays off unless already set; strip starts at leave-by.
  void settings;
}

async function refreshMenuPauseUi() {
  const block = document.getElementById("menu-pause-block");
  const webHint = document.getElementById("menu-pause-web-hint");
  const pauseWrap = document.getElementById("leave-reminders-pause-wrap");

  if (!block) {
    return null;
  }

  if (!isNativeApp() && !Boolean(window.NextTrainCitySession?.readActiveTimeZone?.())) {
    block.hidden = false;
    if (webHint) {
      webHint.hidden = false;
    }
    if (pauseWrap) {
      pauseWrap.hidden = true;
    }
    return null;
  }

  if (webHint) {
    webHint.hidden = true;
  }

  if (!deriveReminderEnabled()) {
    block.hidden = true;
    return null;
  }

  block.hidden = false;
  if (pauseWrap) {
    pauseWrap.hidden = false;
  }

  let settings = await loadReminderSettings();
  settings = await healRemindersPermissionState(settings);
  updatePauseUi(settings);
  return settings;
}

async function renderLeaveAlertSurfaces() {
  await refreshJourneyRemindExtras();
  await refreshMenuPauseUi();
}

function openMyJourneysFromReminders() {
  window.nextTrainApp?.closeMenuDialogOnly?.();
  window.nextTrainApp?.openJourneys?.();
}

async function updateRemindersDialogUi(settings, schedule) {
  updateNudgeEarlyUi(settings);
  updatePauseUi(settings);
  updateReminderScheduleLine(schedule, settings);
  await refreshMenuPauseUi();
}

async function healAfterJourneySave() {
  let settings = await loadReminderSettings();
  settings = await healRemindersPermissionState(settings);
  // Native strip/reminders read WidgetSettingsStore — sync journeys before reschedule so
  // mid-window late-arm sees the just-saved target train.
  if (typeof window.nextTrainWidget?.syncWidgetSettings === "function") {
    await window.nextTrainWidget.syncWidgetSettings();
  }
  getLeaveRemindersPlugin()?.reschedule?.();
  await renderLeaveAlertSurfaces();
  return settings;
}

async function activatePause(duration, customDays = readCustomPauseDays()) {
  const resolved = PAUSE_DURATION_OPTIONS.includes(duration) ? duration : DEFAULT_PAUSE_DURATION;
  if (resolved === "custom") {
    writeCustomPauseDays(customDays);
  }
  writeLastPauseDuration(resolved);

  const pauseUntil = computePauseUntilIso(resolved, customDays);
  const settings = await saveReminderSettings({ paused: true, pauseUntil });
  getLeaveRemindersPlugin()?.reschedule?.();
  return settings;
}

async function applyCustomPauseFromInput({ focusInput = false } = {}) {
  const daysInput = document.getElementById("leave-reminders-pause-days");
  const days = clampCustomPauseDays(daysInput?.value || readCustomPauseDays());
  if (daysInput) {
    daysInput.value = String(days);
  }

  const settings = await activatePause("custom", days);
  const schedule = settings?.enabled ? await loadReminderSchedule() : null;
  await updateRemindersDialogUi(settings, schedule);

  if (focusInput) {
    daysInput?.focus();
    daysInput?.select();
  }

  return settings;
}

async function resumeReminders() {
  const settings = await saveReminderSettings({ paused: false, pauseUntil: null });
  getLeaveRemindersPlugin()?.reschedule?.();
  return settings;
}

async function renderRemindersDialog() {
  await renderLeaveAlertSurfaces();
}

function hideLeaveReminderCoach() {
  const coach = document.getElementById("leave-reminder-coach");
  if (coach) {
    coach.hidden = true;
  }
}

function showLeaveReminderCoach() {
  if (!isNativeApp() && !Boolean(window.NextTrainCitySession?.readActiveTimeZone?.())) {
    return;
  }

  if (deriveReminderEnabled()) {
    window.nextTrainStickinessCoaches?.markCoachDone?.("reminder");
    return;
  }

  const coach = document.getElementById("leave-reminder-coach");
  if (coach) {
    coach.hidden = false;
  }
}

/** @deprecated Reminder settings sheet removed — open Journeys instead. */
function openRemindersDialog() {
  window.nextTrainStickinessCoaches?.markCoachDone?.("reminder");
  window.nextTrainApp?.closeMenuDialogOnly?.();
  window.nextTrainApp?.openJourneys?.();
}

function closeRemindersDialog() {
  // no-op — sheet removed
}

function setRemindersDoneBusy() {
  // no-op
}

function showRemindersValidationError() {
  // no-op
}

function clearRemindersValidationError() {
  // no-op
}

function dismissRemindersDialog() {
  // no-op
}

async function saveRemindersDialog() {
  if (!isNativeApp()) {
    return;
  }
  try {
    getLeaveRemindersPlugin()?.reschedule?.();
  } catch (saveError) {
    console.warn("Could not refresh reminder schedule", saveError);
  }
}

function initLeaveRemindersBridge() {
  initLeaveReminderUi();
  initReminderFastTestMode();
  if (isNativeApp()) {
    void refreshJourneyRemindExtras();
  }
}

async function initReminderFastTestMode() {
  if (!isNativeApp()) {
    return;
  }
  try {
    if (sessionStorage.getItem("nextTrainReminderTest") !== "1") {
      return;
    }
    const plugin = getLeaveRemindersPlugin();
    if (!plugin?.setFastTestMode) {
      return;
    }
    await plugin.setFastTestMode({ enabled: true });
  } catch (error) {
    console.warn("Could not arm reminder fast-test mode", error);
  }
}

global.nextTrainLeaveReminders = {
  loadReminderSettings,
  saveReminderSettings,
  enableLeaveReminders,
  acknowledgeDeparture,
  isDepartureAcknowledged,
  startOnTheWay,
  getActiveLeaveAlarm,
  dismissLeaveAlarm,
  loadReminderSchedule,
  renderRemindersDialog,
  renderLeaveAlertSurfaces,
  refreshJourneyRemindExtras,
  refreshMenuPauseUi,
  openRemindersDialog,
  showLeaveReminderCoach,
  healAfterJourneySave,
  ensureLiveCountdownDefaultOn,
  reschedule: () => getLeaveRemindersPlugin()?.reschedule?.(),
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLeaveRemindersBridge);
} else {
  initLeaveRemindersBridge();
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    void renderLeaveAlertSurfaces();
    window.nextTrainApp?.syncLeaveAlarmFromNative?.();
    getLeaveRemindersPlugin()?.reschedule?.();
  }
});
})(window);
