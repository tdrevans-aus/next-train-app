function isNativeApp() {
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

function getCommuteModePlugin() {
  if (!window.Capacitor) {
    return null;
  }

  if (typeof window.Capacitor.registerPlugin === "function") {
    return window.Capacitor.registerPlugin("CommuteMode");
  }

  return window.Capacitor.Plugins?.CommuteMode ?? null;
}

function readCommuteSettings() {
  if (window.nextTrainApp?.getActiveLegCommute) {
    return window.nextTrainApp.getActiveLegCommute();
  }

  try {
    const raw = localStorage.getItem("nextTrainSettings");
    if (!raw) {
      return null;
    }

    const store = window.nextTrainApp?.migrateSettings
      ? window.nextTrainApp.migrateSettings(JSON.parse(raw))
      : JSON.parse(raw);

    const journey =
      store.journeys?.find((item) => item.id === store.activeJourneyId) ??
      store.journeys?.[0];

    if (!journey?.station || !journey?.direction) {
      return null;
    }

    return journey;
  } catch {
    return null;
  }
}

function readSkipTrains() {
  try {
    const raw = localStorage.getItem("nextTrainSettings");
    if (!raw) {
      return 0;
    }

    const store = window.nextTrainApp?.migrateSettings
      ? window.nextTrainApp.migrateSettings(JSON.parse(raw))
      : JSON.parse(raw);

    const journeyId = store.activeJourneyId ?? store.journeys?.[0]?.id ?? "none";
    const skipRaw = sessionStorage.getItem(`nextTrainSkip:${journeyId}`);
    if (!skipRaw) {
      return 0;
    }

    const parsed = JSON.parse(skipRaw);
    if (parsed.skippedUntil && new Date(parsed.skippedUntil) <= new Date()) {
      return 0;
    }

    return Math.max(0, Number(parsed.count) || 0);
  } catch {
    return 0;
  }
}

let commuteModeActive = false;

function setCommuteUi(active) {
  const section = document.getElementById("commute-mode-section");
  const startBtn = document.getElementById("commute-mode-start");
  const activePanel = document.getElementById("commute-mode-active");

  if (!section || !startBtn || !activePanel) {
    return;
  }

  commuteModeActive = active;

  if (!isNativeApp() || !readCommuteSettings()) {
    section.hidden = true;
    commuteModeActive = false;
    return;
  }

  section.hidden = false;
  startBtn.hidden = active;
  activePanel.hidden = !active;
  window.nextTrainApp?.refreshDisplay?.();
}

async function refreshCommuteState() {
  const plugin = getCommuteModePlugin();
  if (!plugin) {
    setCommuteUi(false);
    return;
  }

  try {
    const result = await plugin.isActive();
    setCommuteUi(Boolean(result?.active));
  } catch {
    setCommuteUi(false);
  }
}

async function startCommuteMode() {
  const plugin = getCommuteModePlugin();
  const journey = readCommuteSettings();

  if (!plugin || !journey) {
    return;
  }

  const startBtn = document.getElementById("commute-mode-start");
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.textContent = "Starting…";
  }

  try {
    await plugin.start({
      station: journey.station,
      direction: journey.direction,
      leaveBeforeMinutes:
        window.nextTrainApp?.getEffectiveLeaveBeforeMinutes?.(journey) ??
        (journey.useLeaveBefore === false ? 0 : journey.leaveBeforeMinutes ?? 10),
      skipTrains: readSkipTrains(),
    });
    setCommuteUi(true);
  } catch (error) {
    const hint = document.getElementById("commute-mode-hint");
    if (hint) {
      hint.textContent = error?.message ?? "Could not start Heading to station";
    }
    setCommuteUi(false);
  } finally {
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = "Heading to station";
    }
  }
}

async function stopCommuteMode() {
  const plugin = getCommuteModePlugin();
  if (!plugin) {
    return;
  }

  try {
    await plugin.stop();
  } catch {
    // Ignore stop errors — service may already be gone.
  }

  setCommuteUi(false);
}

function initCommuteMode() {
  const startBtn = document.getElementById("commute-mode-start");
  const stopBtn = document.getElementById("commute-mode-stop");

  if (!isNativeApp()) {
    return;
  }

  startBtn?.addEventListener("click", () => {
    startCommuteMode();
  });

  stopBtn?.addEventListener("click", () => {
    stopCommuteMode();
  });

  refreshCommuteState();

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      refreshCommuteState();
    }
  });
}

window.addEventListener("load", () => {
  initCommuteMode();
});

window.nextTrainCommuteMode = {
  refresh: refreshCommuteState,
  isActive: () => commuteModeActive,
};
