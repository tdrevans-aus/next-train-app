const LEAVE_REMINDER_SETTINGS_KEY = "nextTrainLeaveReminders";
const DEFAULT_GET_READY_MINUTES = 5;
const DEFAULT_REMIND_DAYS = [1, 2, 3, 4, 5];

let commuteDraft = [];

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
    return (
      readLocalReminderSettings() ?? {
        enabled: false,
        paused: false,
        earlyHeadsUp: false,
        earlyOffsetMinutes: DEFAULT_GET_READY_MINUTES,
      }
    );
  }

  try {
    const settings = await plugin.getSettings();
    writeLocalReminderSettings(settings);
    return settings;
  } catch (error) {
    console.warn("Could not load leave reminder settings", error);
    return (
      readLocalReminderSettings() ?? {
        enabled: false,
        paused: false,
        earlyHeadsUp: false,
        earlyOffsetMinutes: DEFAULT_GET_READY_MINUTES,
      }
    );
  }
}

async function saveReminderSettings(patch) {
  const current = await loadReminderSettings();
  const next = { ...current, ...patch };
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
    return saveReminderSettings({ enabled: true, paused: false });
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

function updateGetReadyTitle(minutes) {
  const title = document.getElementById("leave-reminders-get-ready-title");
  if (!title) {
    return;
  }

  const value = Number(minutes) || DEFAULT_GET_READY_MINUTES;
  title.textContent = `Get ready · ${value} min`;
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
      return `Next reminder: ${notifyAt} for ${trainTime} train`;
    }
  }

  if (reason === "paused") {
    return "Reminders paused";
  }

  if (reason === "already_fired") {
    return "No more reminders today";
  }

  if (reason === "wrong_day") {
    return "No reminder today";
  }

  if (reason === "no_permission" || schedule.permissionGranted === false) {
    return "Notifications off";
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
  const preferredField = card.querySelector(".reminders-preferred-field");
  const chips = card.querySelectorAll(".remind-day-chip");
  const disabled = !remindMe;

  preferredField?.querySelectorAll("button, input").forEach((el) => {
    if (el.type !== "hidden") {
      el.disabled = disabled;
    }
  });
  chips.forEach((chip) => {
    chip.disabled = disabled;
  });
  card.classList.toggle("reminders-commute-card--disabled", disabled);
}

function buildCommuteCard(journey) {
  const card = document.createElement("article");
  card.className = "reminders-commute-card";
  card.dataset.journeyId = journey.id;

  const title = document.createElement("h4");
  title.className = "reminders-commute-name";
  title.textContent = journey.name || "Journey";
  card.append(title);

  const toggleRow = document.createElement("div");
  toggleRow.className = "menu-toggle-row";
  toggleRow.innerHTML = `
    <span class="menu-toggle-title">Remind me</span>
    <label class="menu-toggle-switch">
      <input type="checkbox" class="reminders-commute-toggle" ${journey.remindMe ? "checked" : ""} />
      <span class="menu-toggle-track" aria-hidden="true"></span>
    </label>
  `;
  card.append(toggleRow);

  const preferredField = document.createElement("label");
  preferredField.className = "field optional-time-field reminders-preferred-field";
  preferredField.dataset.empty = journey.preferredTrainTime ? "false" : "true";
  preferredField.innerHTML = `
    <span>Preferred train</span>
    <div class="optional-time-control">
      <button type="button" class="optional-time-display reminders-preferred-display"></button>
      <input type="time" class="optional-time-input reminders-preferred-input" tabindex="-1" aria-hidden="true" />
      <button type="button" class="optional-time-clear reminders-preferred-clear" hidden aria-label="Clear preferred train time">×</button>
    </div>
  `;
  card.append(preferredField);

  const daysField = document.createElement("div");
  daysField.className = "remind-days-field";
  daysField.innerHTML = `
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
  card.append(daysField);

  const display = preferredField.querySelector(".reminders-preferred-display");
  const input = preferredField.querySelector(".reminders-preferred-input");
  const clearBtn = preferredField.querySelector(".reminders-preferred-clear");
  setOptionalTimeField(input, display, preferredField, clearBtn, journey.preferredTrainTime);
  bindOptionalTimeField(input, display, preferredField, clearBtn);
  setRemindDayChips(daysField.querySelector(".reminders-day-chips"), journey.remindDays);
  syncCommuteCardState(card, journey.remindMe);

  const toggle = card.querySelector(".reminders-commute-toggle");
  toggle?.addEventListener("change", async () => {
    const enabled = toggle.checked;
    syncCommuteCardState(card, enabled);
    syncCommuteDraftFromDom();

    if (enabled) {
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
  commuteDraft = journeys.map((journey) => ({
    id: journey.id,
    name: journey.name || "Journey",
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
  const appSection = document.getElementById("reminders-app-section");
  const commutesSection = document.getElementById("reminders-commutes-section");
  const webHint = document.getElementById("reminders-web-hint");
  const enabledInput = document.getElementById("leave-reminders-enabled");
  const earlyWrap = document.getElementById("leave-reminders-early-wrap");
  const earlyInput = document.getElementById("leave-reminders-early");
  const pauseWrap = document.getElementById("leave-reminders-pause-wrap");
  const pausedInput = document.getElementById("leave-reminders-paused");
  const permissionHint = document.getElementById("leave-reminders-permission-hint");

  if (!enabledInput) {
    return;
  }

  if (!isNativeApp()) {
    appSection.hidden = true;
    commutesSection.hidden = true;
    if (webHint) {
      webHint.hidden = false;
    }
    updateReminderScheduleLine(null, settings);
    return;
  }

  if (webHint) {
    webHint.hidden = true;
  }
  appSection.hidden = false;
  commutesSection.hidden = false;

  const enabled = Boolean(settings?.enabled);
  const paused = Boolean(settings?.paused);
  enabledInput.checked = enabled;
  if (earlyInput) {
    earlyInput.checked = Boolean(settings?.earlyHeadsUp);
  }
  if (pausedInput) {
    pausedInput.checked = paused;
  }
  if (earlyWrap) {
    earlyWrap.hidden = !enabled;
  }
  if (pauseWrap) {
    pauseWrap.hidden = !enabled;
  }
  updateGetReadyTitle(settings?.earlyOffsetMinutes ?? DEFAULT_GET_READY_MINUTES);
  if (permissionHint) {
    permissionHint.hidden = settings?.permissionGranted !== false || !enabled;
  }
  updateReminderScheduleLine(schedule, settings);
  renderCommuteCards();
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

  const menuDialog = document.getElementById("menu-dialog");
  if (menuDialog?.open) {
    menuDialog.close();
    menuDialog.removeAttribute("open");
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

function validateCommuteDraft() {
  syncCommuteDraftFromDom();

  for (const journey of commuteDraft) {
    if (journey.remindMe && !journey.preferredTrainTime) {
      const card = document.querySelector(
        `.reminders-commute-card[data-journey-id="${journey.id}"]`
      );
      card?.querySelector(".reminders-preferred-display")?.focus?.();
      return `Set a preferred train time for "${journey.name}".`;
    }
  }

  return null;
}

async function saveRemindersDialog() {
  if (!isNativeApp()) {
    closeRemindersDialog();
    return;
  }

  const error = validateCommuteDraft();
  if (error) {
    alert(error);
    return;
  }

  window.nextTrainApp?.persistReminderJourneys?.(commuteDraft);
  getLeaveRemindersPlugin()?.reschedule?.();

  const settings = await loadReminderSettings();
  const schedule = settings?.enabled ? await loadReminderSchedule() : null;
  await updateRemindersDialogUi(settings, schedule);
  closeRemindersDialog();
}

function initLeaveReminderUi() {
  const enabledInput = document.getElementById("leave-reminders-enabled");
  const earlyInput = document.getElementById("leave-reminders-early");
  const pausedInput = document.getElementById("leave-reminders-paused");
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
    const settings = await saveReminderSettings({
      earlyHeadsUp: earlyInput.checked,
      earlyOffsetMinutes: DEFAULT_GET_READY_MINUTES,
    });
    const schedule = settings?.enabled ? await loadReminderSchedule() : null;
    await updateRemindersDialogUi(settings, schedule);
  });

  pausedInput?.addEventListener("change", async () => {
    const settings = await saveReminderSettings({ paused: pausedInput.checked });
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
    if (dialog?.open) {
      renderRemindersDialog();
    }
    getLeaveRemindersPlugin()?.reschedule?.();
  }
});
