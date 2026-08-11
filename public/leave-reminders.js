const LEAVE_REMINDER_SETTINGS_KEY = "nextTrainLeaveReminders";
const PAUSE_DURATION_KEY = "nextTrainPauseDuration";
const DEFAULT_GET_READY_MINUTES = 5;
const NUDGE_OFFSET_OPTIONS = [5, 10, 15];
const PAUSE_DURATION_OPTIONS = ["1day", "1week", "2weeks"];
const DEFAULT_PAUSE_DURATION = "1week";

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
      }
    );
  }
}

async function saveReminderSettings(patch) {
  const current = await loadReminderSettings();
  const next = { ...current, ...patch };
  if (patch.paused === false) {
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

async function enableLeaveReminders() {
  const plugin = getLeaveRemindersPlugin();
  if (!plugin?.enableReminders) {
    return saveReminderSettings({ enabled: true, paused: false, pauseUntil: null });
  }

  try {
    const saved = await plugin.enableReminders();
    writeLocalReminderSettings(saved);
    return saved;
  } catch (error) {
    console.warn("Could not enable leave reminders", error);
    return loadReminderSettings();
  }
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

function getPerthDateParts(date = new Date()) {
  const parts = {};
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Australia/Perth",
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
  return `${dateKey}T23:59:59+08:00`;
}

function pauseUntilPerthDaysFromNow(days) {
  const parts = getPerthDateParts();
  const dateKey = getPerthDateKey();
  const midnight = new Date(`${dateKey}T00:00:00+08:00`);
  const target = new Date(midnight.getTime() + days * 24 * 60 * 60 * 1000);
  const targetKey = getPerthDateKey(target);
  return `${targetKey}T${parts.hour}:${parts.minute}:${parts.second}+08:00`;
}

function computePauseUntilIso(duration) {
  if (duration === "1day") {
    return pauseUntilEndOfPerthDay();
  }
  if (duration === "1week") {
    return pauseUntilPerthDaysFromNow(7);
  }
  if (duration === "2weeks") {
    return pauseUntilPerthDaysFromNow(14);
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
    timeZone: "Australia/Perth",
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

function updateNudgeEarlyUi(settings) {
  const earlyInput = document.getElementById("leave-reminders-early");
  const chipsWrap = document.getElementById("leave-reminders-nudge-chips-wrap");
  if (!earlyInput || !chipsWrap) {
    return;
  }

  const enabled = Boolean(settings?.earlyHeadsUp);
  const offset = Number(settings?.earlyOffsetMinutes) || DEFAULT_GET_READY_MINUTES;
  earlyInput.checked = enabled;
  chipsWrap.hidden = !enabled;
  setNudgeOffsetChips(offset);
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
    timeZone: "Australia/Perth",
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

function deriveReminderEnabled() {
  return getConfiguredJourneys().some((journey) => journey.remindMe);
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
 * Journey Reminder on ⇔ notifications can fire.
 * If permission is denied (or enable fails), turn journey Reminder(s) off — no orphan “on” state.
 */
async function healRemindersPermissionState(settings) {
  let next = settings;

  if (!deriveReminderEnabled()) {
    return healReminderSettings(next);
  }

  if (next?.permissionGranted === false) {
    if (clearAllJourneyRemindMe()) {
      // Journeys updated via persistReminderJourneys.
    }
    return saveReminderSettings({ enabled: false, paused: false, pauseUntil: null });
  }

  if (!next?.enabled) {
    next = await enableLeaveReminders();
    if (next?.permissionGranted === false) {
      if (clearAllJourneyRemindMe()) {
        // Journeys updated via persistReminderJourneys.
      }
      return saveReminderSettings({ enabled: false, paused: false, pauseUntil: null });
    }
  }

  return healReminderSettings(next);
}

function updateRemindersEmptyState() {
  const empty = document.getElementById("reminders-empty");
  const emptyTitle = document.getElementById("reminders-empty-title");
  const emptyBody = document.getElementById("reminders-empty-body");
  if (!empty || !emptyTitle || !emptyBody) {
    return false;
  }

  const journeys = getConfiguredJourneys();
  if (!journeys.length) {
    emptyTitle.textContent = "No journeys yet";
    emptyBody.textContent = "Save a journey, then turn Remind me on.";
    empty.hidden = false;
    return true;
  }

  if (!deriveReminderEnabled()) {
    emptyTitle.textContent = "No leave alerts on yet";
    emptyBody.textContent =
      "Turn Remind me on when you edit a journey — then Early Reminder and Pause show up here.";
    empty.hidden = false;
    return true;
  }

  empty.hidden = true;
  return false;
}

function openMyJourneysFromReminders() {
  closeRemindersDialog();
  window.nextTrainApp?.closeMenuDialogOnly?.();
  window.nextTrainApp?.openJourneys?.();
}

async function updateRemindersDialogUi(settings, schedule) {
  const nativeContent = document.getElementById("reminders-native-content");
  const lead = document.getElementById("reminders-lead");
  const armedLead = document.getElementById("reminders-armed-lead");
  const webHint = document.getElementById("reminders-web-hint");
  const sharedOptions = document.getElementById("reminders-shared-options");

  if (!nativeContent) {
    return;
  }

  if (!isNativeApp()) {
    if (nativeContent) {
      nativeContent.hidden = true;
    }
    if (lead) {
      lead.hidden = true;
    }
    if (armedLead) {
      armedLead.hidden = true;
    }
    if (webHint) {
      webHint.hidden = false;
    }
    updateReminderScheduleLine(null, settings);
    return;
  }

  if (webHint) {
    webHint.hidden = true;
  }
  nativeContent.hidden = false;

  const anyReminderOn = deriveReminderEnabled();
  const remindersLive = Boolean(settings?.enabled) && anyReminderOn;
  const showEmpty = updateRemindersEmptyState();
  if (lead) {
    lead.hidden = !showEmpty;
  }
  if (armedLead) {
    armedLead.hidden = !remindersLive;
  }
  updateNudgeEarlyUi(settings);
  updatePauseUi(settings);
  if (sharedOptions) {
    sharedOptions.hidden = !remindersLive;
  }
  updateReminderScheduleLine(schedule, settings);
}

async function healAfterJourneySave() {
  let settings = await loadReminderSettings();
  settings = await healRemindersPermissionState(settings);
  getLeaveRemindersPlugin()?.reschedule?.();
  return settings;
}

async function activatePause(duration) {
  const resolved = PAUSE_DURATION_OPTIONS.includes(duration) ? duration : DEFAULT_PAUSE_DURATION;
  writeLastPauseDuration(resolved);

  const pauseUntil = computePauseUntilIso(resolved);
  const settings = await saveReminderSettings({ paused: true, pauseUntil });
  getLeaveRemindersPlugin()?.reschedule?.();
  return settings;
}

async function resumeReminders() {
  const settings = await saveReminderSettings({ paused: false, pauseUntil: null });
  getLeaveRemindersPlugin()?.reschedule?.();
  return settings;
}

async function renderRemindersDialog() {
  let settings = await loadReminderSettings();
  settings = await healRemindersPermissionState(settings);
  const schedule = settings?.enabled ? await loadReminderSchedule() : null;
  await updateRemindersDialogUi(settings, schedule);
}

function hideLeaveReminderCoach() {
  const coach = document.getElementById("leave-reminder-coach");
  if (coach) {
    coach.hidden = true;
  }
}

function showLeaveReminderCoach() {
  if (!isNativeApp()) {
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

function openRemindersDialog() {
  window.nextTrainStickinessCoaches?.markCoachDone?.("reminder");
  window.nextTrainApp?.closeMenuDialogOnly?.();
  clearRemindersValidationError();

  renderRemindersDialog().then(() => {
    const dialog = document.getElementById("reminders-dialog");
    document.dispatchEvent(new CustomEvent("nexttrain:reminders-open"));
    dialog?.showModal();
  });
}

function closeRemindersDialog() {
  const dialog = document.getElementById("reminders-dialog");
  if (dialog?.open) {
    dialog.close();
    dialog.removeAttribute("open");
  }
}

function setRemindersDoneBusy(busy) {
  const button = document.getElementById("reminders-done-btn");
  if (!button) {
    return;
  }

  button.disabled = busy;
  button.textContent = busy ? "Saving…" : "Done";
  button.setAttribute("aria-busy", busy ? "true" : "false");
}

function showRemindersValidationError(message) {
  const errorEl = document.getElementById("reminders-validation-error");
  if (!errorEl) {
    return;
  }

  if (!message) {
    errorEl.hidden = true;
    errorEl.textContent = "";
    return;
  }

  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearRemindersValidationError() {
  showRemindersValidationError("");
}

function dismissRemindersDialog() {
  if (remindersSaveInFlight) {
    return;
  }

  clearRemindersValidationError();
  closeRemindersDialog();
}

async function saveRemindersDialog() {
  if (remindersSaveInFlight) {
    return;
  }

  clearRemindersValidationError();
  closeRemindersDialog();

  if (!isNativeApp()) {
    return;
  }

  remindersSaveInFlight = true;
  setRemindersDoneBusy(true);

  try {
    getLeaveRemindersPlugin()?.reschedule?.();
  } catch (saveError) {
    console.warn("Could not refresh reminder schedule", saveError);
  } finally {
    remindersSaveInFlight = false;
    setRemindersDoneBusy(false);
  }
}

function initLeaveReminderUi() {
  const earlyInput = document.getElementById("leave-reminders-early");
  const remindersDialog = document.getElementById("reminders-dialog");

  document.getElementById("menu-reminders-btn")?.addEventListener("click", () => {
    openRemindersDialog();
  });

  document.getElementById("reminders-open-journeys-btn")?.addEventListener("click", () => {
    openMyJourneysFromReminders();
  });

  document.getElementById("reminders-done-btn")?.addEventListener("click", () => {
    saveRemindersDialog();
  });

  earlyInput?.addEventListener("change", async () => {
    const patch = { earlyHeadsUp: earlyInput.checked };
    if (earlyInput.checked) {
      patch.earlyOffsetMinutes = readSelectedNudgeOffset();
    }
    const settings = await saveReminderSettings(patch);
    const schedule = settings?.enabled ? await loadReminderSchedule() : null;
    await updateRemindersDialogUi(settings, schedule);
  });

  document.getElementById("leave-reminders-nudge-chips")?.addEventListener("click", async (event) => {
    const chip = event.target.closest(".reminder-offset-chip");
    if (!chip) {
      return;
    }

    const minutes = Number(chip.dataset.minutes);
    if (!NUDGE_OFFSET_OPTIONS.includes(minutes)) {
      return;
    }

    const settings = await saveReminderSettings({
      earlyHeadsUp: true,
      earlyOffsetMinutes: minutes,
    });
    const schedule = settings?.enabled ? await loadReminderSchedule() : null;
    await updateRemindersDialogUi(settings, schedule);
  });

  document.getElementById("leave-reminders-pause-chips")?.addEventListener("click", async (event) => {
    const chip = event.target.closest(".reminder-pause-chip");
    if (!chip) {
      return;
    }

    const settings = await activatePause(chip.dataset.pause);
    const schedule = settings?.enabled ? await loadReminderSchedule() : null;
    await updateRemindersDialogUi(settings, schedule);
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

  remindersDialog?.addEventListener("close", () => {
    remindersDialog.removeAttribute("open");
    setRemindersDoneBusy(false);
  });

  remindersDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    dismissRemindersDialog();
  });

  remindersDialog?.addEventListener("click", (event) => {
    if (event.target === remindersDialog) {
      dismissRemindersDialog();
    }
  });

  document.addEventListener("nexttrain:settings-persisted", async () => {
    getLeaveRemindersPlugin()?.reschedule?.();
    if (!remindersDialog?.open) {
      return;
    }

    const settings = await healRemindersPermissionState(await loadReminderSettings());
    const schedule = settings?.enabled ? await loadReminderSchedule() : null;
    await updateRemindersDialogUi(settings, schedule);
  });
}

function initLeaveRemindersBridge() {
  initLeaveReminderUi();
}

window.nextTrainLeaveReminders = {
  loadReminderSettings,
  saveReminderSettings,
  enableLeaveReminders,
  acknowledgeDeparture,
  loadReminderSchedule,
  renderRemindersDialog,
  openRemindersDialog,
  showLeaveReminderCoach,
  healAfterJourneySave,
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLeaveRemindersBridge);
} else {
  initLeaveRemindersBridge();
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    const dialog = document.getElementById("reminders-dialog");
    if (dialog?.open && !remindersSaveInFlight) {
      renderRemindersDialog();
    }
    getLeaveRemindersPlugin()?.reschedule?.();
  }
});
