const LEAVE_REMINDER_SETTINGS_KEY = "nextTrainLeaveReminders";
const DEFAULT_GET_READY_MINUTES = 5;
const NUDGE_OFFSET_OPTIONS = [5, 10, 15];

let commuteDraft = [];
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

function updatePauseUi(settings) {
  const pauseActive = document.getElementById("leave-reminders-pause-active");
  const pauseStatus = document.getElementById("leave-reminders-pause-status");
  const pauseChips = document.getElementById("leave-reminders-pause-chips");
  if (!pauseActive || !pauseStatus || !pauseChips) {
    return;
  }

  const paused = Boolean(settings?.paused);
  pauseActive.hidden = !paused;
  pauseChips.hidden = paused;
  if (paused) {
    pauseStatus.textContent = formatPauseUntilLabel(settings.pauseUntil, true);
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

  const reason = schedule.reason;
  if (reason === "ok") {
    const notifyAt = schedule.primaryNotifyAtClock;
    const trainTime = schedule.trainTime;
    if (notifyAt && trainTime) {
      const dayPrefix = formatScheduleDayPrefix(schedule.localDate);
      const when = dayPrefix ? `${dayPrefix} ${notifyAt}` : notifyAt;
      return `Next: ${when} · ${trainTime} train`;
    }
  }

  if (reason === "paused") {
    return formatPauseUntilLabel(schedule.pauseUntil, true);
  }

  if (reason === "already_fired") {
    return "No more reminders today";
  }

  if (reason === "wrong_day") {
    return "No reminder today";
  }

  if (reason === "no_permission" || schedule.permissionGranted === false) {
    return null;
  }

  if (reason === "reminders_off") {
    return null;
  }

  return "No reminder scheduled";
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

function formatOptionalTimeDisplay(value) {
  if (!value) {
    return "Not set";
  }

  const [hour, minute] = String(value).split(":").map(Number);
  const sample = new Date();
  sample.setHours(hour, minute || 0, 0, 0);
  return sample.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function setOptionalTimeField(input, display, field, clearBtn, value) {
  if (!input || !display || !field) {
    return;
  }

  const normalized = value ? String(value) : "";
  field.dataset.empty = normalized ? "false" : "true";
  input.value = normalized;
  display.textContent = formatOptionalTimeDisplay(normalized);
  if (clearBtn) {
    clearBtn.hidden = !normalized;
  }
}

function readOptionalTimeField(field) {
  if (!field || field.dataset.empty === "true") {
    return "";
  }

  return field.querySelector(".optional-time-input")?.value ?? "";
}

function bindOptionalTimeField(input, display, field, clearBtn) {
  if (!input || !display || !field) {
    return;
  }

  display.addEventListener("click", () => {
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.click();
  });

  input.addEventListener("change", () => {
    setOptionalTimeField(input, display, field, clearBtn, input.value);
    syncCommuteDraftFromDom();
  });

  clearBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setOptionalTimeField(input, display, field, clearBtn, "");
    syncCommuteDraftFromDom();
  });
}

function normalizeRemindDays(days) {
  const values = Array.isArray(days) ? days.map(Number).filter((day) => day >= 1 && day <= 7) : [];
  return values.length ? [...new Set(values)].sort((a, b) => a - b) : [...DEFAULT_REMIND_DAYS];
}

function setRemindDayChips(container, days) {
  if (!container) {
    return;
  }

  const selected = new Set(normalizeRemindDays(days));
  container.querySelectorAll(".remind-day-chip").forEach((chip) => {
    const day = Number(chip.dataset.day);
    const active = selected.has(day);
    chip.classList.toggle("remind-day-chip--active", active);
    chip.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function readRemindDaysFromContainer(container) {
  if (!container) {
    return [...DEFAULT_REMIND_DAYS];
  }

  const days = [];
  container.querySelectorAll(".remind-day-chip--active").forEach((chip) => {
    days.push(Number(chip.dataset.day));
  });
  return normalizeRemindDays(days);
}

function syncCommuteCardState(card, remindMe) {
  const expanded = card.querySelector(".reminders-commute-expanded");
  const preferredField = card.querySelector(".reminders-preferred-field");
  const chips = card.querySelectorAll(".remind-day-chip");
  const disabled = !remindMe;

  if (expanded) {
    expanded.hidden = !remindMe;
  }

  preferredField?.querySelectorAll("button, input").forEach((el) => {
    if (el.type !== "hidden") {
      el.disabled = disabled;
    }
  });
  chips.forEach((chip) => {
    chip.disabled = disabled;
  });
  card.classList.toggle("reminders-commute-card--inactive", disabled);
  syncPreferredHint(card);
}

function syncPreferredHint(card) {
  const preferredField = card.querySelector(".reminders-preferred-field");
  const hint = card.querySelector(".reminders-preferred-hint");
  if (!preferredField || !hint) {
    return;
  }

  const empty = preferredField.dataset.empty !== "false";
  const focused = card.contains(document.activeElement);
  hint.hidden = !empty && !focused;
}

function buildCommuteCard(journey) {
  const card = document.createElement("article");
  card.className = "reminders-commute-card";
  card.dataset.journeyId = journey.id;

  const header = document.createElement("div");
  header.className = "reminders-commute-header";

  const title = document.createElement("h4");
  title.className = "reminders-commute-name";
  title.textContent = journey.name || "Journey";
  header.append(title);

  const route = document.createElement("p");
  route.className = "reminders-commute-route";
  route.textContent = journey.routeLabel || "";
  if (journey.routeLabel) {
    header.append(route);
  }
  card.append(header);

  const toggleRow = document.createElement("div");
  toggleRow.className = "menu-toggle-row reminders-commute-toggle-row";
  toggleRow.innerHTML = `
    <span class="menu-toggle-title">Reminder</span>
    <label class="menu-toggle-switch">
      <input type="checkbox" class="reminders-commute-toggle" ${journey.remindMe ? "checked" : ""} />
      <span class="menu-toggle-track" aria-hidden="true"></span>
    </label>
  `;
  card.append(toggleRow);

  const expanded = document.createElement("div");
  expanded.className = "reminders-commute-expanded";
  expanded.hidden = !journey.remindMe;

  const preferredField = document.createElement("label");
  preferredField.className = "field optional-time-field reminders-preferred-field";
  preferredField.dataset.empty = journey.preferredTrainTime ? "false" : "true";
  preferredField.innerHTML = `
    <span>Usual train time</span>
    <div class="optional-time-control">
      <button type="button" class="optional-time-display reminders-preferred-display"></button>
      <input type="time" class="optional-time-input reminders-preferred-input" tabindex="-1" aria-hidden="true" />
      <button type="button" class="optional-time-clear reminders-preferred-clear" hidden aria-label="Clear preferred train time">×</button>
    </div>
  `;
  expanded.append(preferredField);

  const preferredHint = document.createElement("p");
  preferredHint.className = "reminders-preferred-hint";
  preferredHint.textContent = "First train at or after this time.";
  expanded.append(preferredHint);

  const daysField = document.createElement("div");
  daysField.className = "remind-days-field";
  daysField.innerHTML = `
    <span class="reminders-days-label">Days</span>
    <div class="remind-day-chips remind-day-chips--row reminders-day-chips">
      <button type="button" class="remind-day-chip" data-day="1" aria-label="Monday">M</button>
      <button type="button" class="remind-day-chip" data-day="2" aria-label="Tuesday">T</button>
      <button type="button" class="remind-day-chip" data-day="3" aria-label="Wednesday">W</button>
      <button type="button" class="remind-day-chip" data-day="4" aria-label="Thursday">T</button>
      <button type="button" class="remind-day-chip" data-day="5" aria-label="Friday">F</button>
      <button type="button" class="remind-day-chip" data-day="6" aria-label="Saturday">S</button>
      <button type="button" class="remind-day-chip" data-day="7" aria-label="Sunday">S</button>
    </div>
  `;
  expanded.append(daysField);
  card.append(expanded);

  const display = preferredField.querySelector(".reminders-preferred-display");
  const input = preferredField.querySelector(".reminders-preferred-input");
  const clearBtn = preferredField.querySelector(".reminders-preferred-clear");
  setOptionalTimeField(input, display, preferredField, clearBtn, journey.preferredTrainTime);
  bindOptionalTimeField(input, display, preferredField, clearBtn);
  clearBtn?.addEventListener("click", () => {
    queueMicrotask(() => syncPreferredHint(card));
  });
  setRemindDayChips(daysField.querySelector(".reminders-day-chips"), journey.remindDays);
  syncCommuteCardState(card, journey.remindMe);

  display?.addEventListener("focus", () => syncPreferredHint(card));
  display?.addEventListener("blur", () => syncPreferredHint(card));
  input?.addEventListener("change", () => syncPreferredHint(card));

  const toggle = card.querySelector(".reminders-commute-toggle");
  toggle?.addEventListener("change", async () => {
    const enabled = toggle.checked;
    syncCommuteCardState(card, enabled);
    syncCommuteDraftFromDom();

    if (enabled) {
      const preferredEmpty = preferredField.dataset.empty !== "false";
      if (preferredEmpty) {
        display?.focus();
        syncPreferredHint(card);
      }

      const settings = await loadReminderSettings();
      if (!settings?.enabled) {
        window.nextTrainStickinessCoaches?.markCoachDone?.("reminder");
        const next = await enableLeaveReminders();
        const schedule = await loadReminderSchedule();
        await updateRemindersDialogUi(next, schedule);
      }
    }
  });

  daysField.addEventListener("click", (event) => {
    const chip = event.target.closest(".remind-day-chip");
    if (!chip || chip.disabled) {
      return;
    }

    chip.classList.toggle("remind-day-chip--active");
    chip.setAttribute(
      "aria-pressed",
      chip.classList.contains("remind-day-chip--active") ? "true" : "false"
    );
    syncCommuteDraftFromDom();
  });

  return card;
}

function loadCommuteDraftFromSettings() {
  const journeys = window.nextTrainApp?.getConfiguredJourneys?.() ?? [];
  const formatRoute = window.nextTrainApp?.formatJourneyRoute;
  commuteDraft = journeys.map((journey) => ({
    id: journey.id,
    name: journey.name || "Journey",
    routeLabel:
      typeof formatRoute === "function" && journey.station && journey.direction
        ? formatRoute(journey)
        : "",
    remindMe: journey.remindMe === true,
    preferredTrainTime: journey.preferredTrainTime || "",
    remindDays: normalizeRemindDays(journey.remindDays),
  }));
}

function syncCommuteDraftFromDom() {
  const list = document.getElementById("reminders-commutes-list");
  if (!list) {
    return;
  }

  list.querySelectorAll(".reminders-commute-card").forEach((card) => {
    const id = card.dataset.journeyId;
    const entry = commuteDraft.find((journey) => journey.id === id);
    if (!entry) {
      return;
    }

    entry.remindMe = card.querySelector(".reminders-commute-toggle")?.checked ?? false;
    entry.preferredTrainTime = readOptionalTimeField(card.querySelector(".reminders-preferred-field"));
    entry.remindDays = readRemindDaysFromContainer(card.querySelector(".reminders-day-chips"));
  });
}

function renderCommuteCards() {
  const list = document.getElementById("reminders-commutes-list");
  const empty = document.getElementById("reminders-empty");
  if (!list || !empty) {
    return;
  }

  list.replaceChildren();
  if (!commuteDraft.length) {
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  commuteDraft.forEach((journey) => {
    list.append(buildCommuteCard(journey));
  });
}

async function updateRemindersDialogUi(settings, schedule) {
  const nativeContent = document.getElementById("reminders-native-content");
  const lead = document.getElementById("reminders-lead");
  const webHint = document.getElementById("reminders-web-hint");
  const enabledInput = document.getElementById("leave-reminders-enabled");
  const permissionHint = document.getElementById("leave-reminders-permission-hint");
  const moreOptions = document.getElementById("reminders-more-options");

  if (!enabledInput) {
    return;
  }

  if (!isNativeApp()) {
    if (nativeContent) {
      nativeContent.hidden = true;
    }
    if (lead) {
      lead.hidden = true;
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
  if (lead) {
    lead.hidden = false;
  }
  if (nativeContent) {
    nativeContent.hidden = false;
  }

  const enabled = Boolean(settings?.enabled);
  enabledInput.checked = enabled;
  updateNudgeEarlyUi(settings);
  updatePauseUi(settings);
  if (moreOptions) {
    moreOptions.hidden = !enabled;
    moreOptions.open = false;
  }
  if (permissionHint) {
    const needsPermission = settings?.permissionGranted === false && enabled;
    permissionHint.hidden = !needsPermission;
  }
  updateReminderScheduleLine(schedule, settings);
  renderCommuteCards();
}

async function activatePause(duration) {
  if (duration === "indefinite") {
    const settings = await saveReminderSettings({ paused: true, pauseUntil: null });
    getLeaveRemindersPlugin()?.reschedule?.();
    return settings;
  }

  const pauseUntil = computePauseUntilIso(duration);
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
  loadCommuteDraftFromSettings();
  const settings = await loadReminderSettings();
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

  const coach = document.getElementById("leave-reminder-coach");
  if (coach) {
    coach.hidden = false;
  }
}

function openRemindersDialog() {
  window.nextTrainStickinessCoaches?.markCoachDone?.("reminder");
  window.nextTrainApp?.closeMenuDialogOnly?.();
  clearRemindersValidationError();

  const moreOptions = document.getElementById("reminders-more-options");
  if (moreOptions) {
    moreOptions.open = false;
  }

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

function validateCommuteDraft() {
  syncCommuteDraftFromDom();

  for (const journey of commuteDraft) {
    if (journey.remindMe && !journey.preferredTrainTime) {
      const card = document.querySelector(
        `.reminders-commute-card[data-journey-id="${journey.id}"]`
      );
      card?.querySelector(".reminders-preferred-display")?.focus?.();
      return "Choose your usual train time.";
    }
  }

  return null;
}

async function saveRemindersDialog() {
  if (remindersSaveInFlight) {
    return;
  }

  clearRemindersValidationError();

  if (!isNativeApp()) {
    closeRemindersDialog();
    return;
  }

  const error = validateCommuteDraft();
  if (error) {
    showRemindersValidationError(error);
    return;
  }

  remindersSaveInFlight = true;
  setRemindersDoneBusy(true);
  closeRemindersDialog();

  try {
    window.nextTrainApp?.persistReminderJourneys?.(commuteDraft);
    getLeaveRemindersPlugin()?.reschedule?.();
  } catch (saveError) {
    console.warn("Could not save reminder settings", saveError);
  } finally {
    remindersSaveInFlight = false;
    setRemindersDoneBusy(false);
  }
}

function initLeaveReminderUi() {
  const enabledInput = document.getElementById("leave-reminders-enabled");
  const earlyInput = document.getElementById("leave-reminders-early");
  const permissionHint = document.getElementById("leave-reminders-permission-hint");
  const remindersDialog = document.getElementById("reminders-dialog");

  document.getElementById("menu-reminders-btn")?.addEventListener("click", () => {
    openRemindersDialog();
  });

  document.getElementById("reminders-done-btn")?.addEventListener("click", () => {
    saveRemindersDialog();
  });

  document.getElementById("reminders-open-journeys-btn")?.addEventListener("click", () => {
    closeRemindersDialog();
    window.nextTrainApp?.openJourneys?.();
  });

  enabledInput?.addEventListener("change", async () => {
    if (enabledInput.checked) {
      window.nextTrainStickinessCoaches?.markCoachDone?.("reminder");
      const settings = await enableLeaveReminders();
      const schedule = await loadReminderSchedule();
      await updateRemindersDialogUi(settings, schedule);
      if (!settings?.permissionGranted) {
        permissionHint?.removeAttribute("hidden");
      }
      return;
    }

    const settings = await saveReminderSettings({ enabled: false });
    await updateRemindersDialogUi(settings, null);
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

  document.getElementById("leave-reminders-resume-btn")?.addEventListener("click", async () => {
    const settings = await resumeReminders();
    const schedule = settings?.enabled ? await loadReminderSchedule() : null;
    await updateRemindersDialogUi(settings, schedule);
  });

  permissionHint?.addEventListener("click", () => {
    getLeaveRemindersPlugin()?.openNotificationSettings?.();
  });

  document.getElementById("leave-reminder-turn-on-btn")?.addEventListener("click", () => {
    hideLeaveReminderCoach();
    openRemindersDialog();
  });

  document.getElementById("leave-reminder-later-btn")?.addEventListener("click", () => {
    window.nextTrainStickinessCoaches?.markCoachNotNow?.("reminder");
    hideLeaveReminderCoach();
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

  document.getElementById("reminders-commutes-list")?.addEventListener("change", () => {
    clearRemindersValidationError();
  });

  document.addEventListener("nexttrain:settings-persisted", async () => {
    getLeaveRemindersPlugin()?.reschedule?.();
    if (!remindersDialog?.open) {
      return;
    }

    loadCommuteDraftFromSettings();
    const settings = await loadReminderSettings();
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
