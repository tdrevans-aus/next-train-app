const SETTINGS_KEY = "nextTrainSettings";
const SKIP_KEY = "nextTrainSkip";
const MANUAL_JOURNEY_OVERRIDE_KEY = "nextTrainManualJourneyOverride";

const DEFAULT_SETTINGS = {
  leaveBeforeMinutes: 10,
  refreshSeconds: 30,
};

const SWIPE_HINT_KEY = "nextTrainSwipeHintSeen";
const LEAVE_HINT_KEY = "nextTrainLeaveHintSeen";
const ONBOARDING_KEY = "nextTrainOnboardingDone";
const ONBOARDING_DEFER_KEY = "nextTrainOnboardingDeferred";
const SWIPE_THRESHOLD_PX = 48;

const routeEl = document.getElementById("route");
const updatedEl = document.getElementById("updated");
const journeySwitcherEl = document.getElementById("journey-switcher");
const journeySwitcherNameEl = document.getElementById("journey-switcher-name");
const journeySwitcherMenuEl = document.getElementById("journey-switcher-menu");
const journeyContextNameEl = document.getElementById("journey-context-name");
const journeyContextRowEl = document.getElementById("journey-context-row");
const journeyEditBtn = document.getElementById("journey-edit-btn");
const heroEl = document.getElementById("hero");
const heroDepartLabelEl = document.getElementById("hero-depart-label");
const departCountdownEl = document.getElementById("depart-countdown");
const departDisplayTimeEl = document.getElementById("depart-display-time");
const heroScheduledTimeEl = document.getElementById("hero-scheduled-time");
const swipeHintEl = document.getElementById("swipe-hint");
const heroSwipePrevEl = document.getElementById("hero-swipe-prev");
const heroSwipeNextEl = document.getElementById("hero-swipe-next");
const leaveCardEl = document.getElementById("leave-card");
const leaveBufferEditBtn = document.getElementById("leave-buffer-edit-btn");
const leaveCardLabelEl = document.getElementById("leave-card-label");
const leaveTimeEl = document.getElementById("leave-time");
const leaveCountdownEl = document.getElementById("leave-countdown");
const leaveHintEl = document.getElementById("leave-hint");
const leaveAckBtn = document.getElementById("leave-ack-btn");
const platformEl = document.getElementById("platform");
const statusEl = document.getElementById("status");
const followingSectionEl = document.getElementById("following-section");
const followingNextEl = document.getElementById("following-next");
const errorEl = document.getElementById("error");

const menuBtn = document.getElementById("menu-btn");
const journeysBtn = document.getElementById("journeys-btn");
const nearbyBtn = document.getElementById("nearby-btn");
const nearbyChromeAction = document.getElementById("nearby-chrome-action");
const menuChromeAction = document.getElementById("menu-chrome-action");
const nearbyDirectionsEl = document.getElementById("nearby-directions");
const nearbyDirectionsListEl = document.getElementById("nearby-directions-list");
const nearbyFallbackEl = document.getElementById("nearby-fallback");
const nearbyFallbackTextEl = document.getElementById("nearby-fallback-text");
const nearbyStationSelect = document.getElementById("nearby-station-select");
const nearbyStationBtn = document.getElementById("nearby-station-btn");
const appEl = document.querySelector(".app");
const helpDialog = document.getElementById("help-dialog");
const helpCloseBtn = document.getElementById("help-close-btn");
const journeysDialog = document.getElementById("journeys-dialog");
const menuDialog = document.getElementById("menu-dialog");
const menuHelpBtn = document.getElementById("menu-help-btn");
const settingsListView = document.getElementById("settings-list-view");
const settingsDetailView = document.getElementById("settings-detail-view");
const journeysDoneBtn = document.getElementById("journeys-done-btn");
const menuDoneBtn = document.getElementById("menu-done-btn");
const detailCancelBtn = document.getElementById("detail-cancel-btn");
const settingsBackBtn = document.getElementById("settings-back");
const journeyListEl = document.getElementById("journey-list");
const clearAllDataBtn = document.getElementById("clear-all-data-btn");
const deleteJourneyBtn = document.getElementById("delete-journey-btn");
const detailJourneyNameInput = document.getElementById("detail-journey-name");
const detailStationSelect = document.getElementById("detail-station-select");
const detailDirectionSelect = document.getElementById("detail-direction-select");
const detailLeaveBeforeInput = document.getElementById("detail-leave-before-input");
const detailLeaveBeforeValueEl = document.getElementById("detail-leave-before-value");
const detailUseLeaveBeforeInput = document.getElementById("detail-use-leave-before");
const leaveBeforeField = document.getElementById("leave-before-field");
const leaveBeforeControls = document.getElementById("leave-before-controls");
const detailDefaultFromInput = document.getElementById("detail-default-from");
const detailDefaultUntilInput = document.getElementById("detail-default-until");
const detailDefaultFromDisplay = document.getElementById("detail-default-from-display");
const detailDefaultUntilDisplay = document.getElementById("detail-default-until-display");
const detailDefaultFromField = document.getElementById("detail-default-from-field");
const detailDefaultUntilField = document.getElementById("detail-default-until-field");
const detailDefaultFromClear = document.getElementById("detail-default-from-clear");
const detailDefaultUntilClear = document.getElementById("detail-default-until-clear");
const detailNearestBtn = document.getElementById("detail-nearest-btn");
const detailNearestHint = document.getElementById("detail-nearest-hint");
const onboardingCoach = document.getElementById("onboarding-coach");
const onboardingStep1 = document.getElementById("onboarding-step-1");
const onboardingStep2 = document.getElementById("onboarding-step-2");
const onboardingGotItBtn = document.getElementById("onboarding-got-it-btn");
const onboardingSetupBtn = document.getElementById("onboarding-setup-btn");
const onboardingLaterBtn = document.getElementById("onboarding-later-btn");
const journeysChromeAction = document.getElementById("journeys-chrome-action");
const journeyTemplatesEl = document.getElementById("journey-templates");
const journeyTemplatesLoadingEl = document.getElementById("journey-templates-loading");
const templateRouteCoach = document.getElementById("template-route-coach");
const templateRouteCoachBody = document.getElementById("template-route-coach-body");
const templateWizardHoursBody = document.getElementById("template-wizard-hours-body");
const templateWizardPrimaryBtn = document.getElementById("template-wizard-primary-btn");
const templateWizardStep1 = document.getElementById("template-wizard-step-1");
const templateWizardStep2 = document.getElementById("template-wizard-step-2");
const templateWizardStep3 = document.getElementById("template-wizard-step-3");
const detailRouteSection = document.getElementById("detail-route-section");
const detailJourneyWindow = document.getElementById("detail-journey-window");
const heroEmptyStateEl = document.getElementById("hero-empty-state");
const heroEmptyAddBtn = document.getElementById("hero-empty-add-btn");
const heroEmptyBackBtn = document.getElementById("hero-empty-back-btn");

let settings = createDefaultStore();
let refreshSeconds = DEFAULT_SETTINGS.refreshSeconds;
let skipTrains = 0;
let lastRenderedNext = null;
let lastApiData = null;
let stationCoords = null;
let refreshTimer = null;
let countdownTimer = null;
let lastLiveDisplayMinute = null;
let stationsCache = null;
let directionsRequestId = 0;
let settingsDraftJourneys = [];
let editingJourneyId = null;
let editingJourneySnapshot = null;
let journeySwitcherOpen = false;
let activeJourneyNameEdit = null;
let swipeStartX = 0;
let swipeStartY = 0;
let heroSwipePointerId = null;
let leaveAutoCheckDeparture = null;
let nearbySession = null;
let nearbyBoard = null;
let nearbyLoading = false;
let nearbyError = null;
let journeyModeActive = false;
let deferJourneyAutoSelect = false;
let onboardingShowTimer = null;
let onboardingPopulatedAt = null;
let templateCreateInFlight = false;

const STATION_ARRIVAL_KM = 0.35;
const TRAVELING_SPEED_MS = 2.5;

const DIRECTION_ALIASES = {
  "Perth Underground": "Perth",
  "Perth Underground Stn": "Perth",
  "Perth Stn": "Perth",
};

const PERTH_STATIONS = new Set(["Perth Stn", "Perth Underground Stn"]);
const PERTH_API_STATIONS = ["Perth Underground Stn", "Perth Stn"];
const CANONICAL_PERTH_STATION = "Perth Underground Stn";
const DEFAULT_DIRECTION_LABEL = "Perth";
const DEFAULT_REMIND_DAYS = [1, 2, 3, 4, 5];

const API_ORIGIN = window.Capacitor?.isNativePlatform?.()
  ? "https://next-train-app.vercel.app"
  : "";

function isNativeApp() {
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

async function ensureGeoBridge() {
  if (!isNativeApp() || window.NextTrainGeo?.getCurrentPosition) {
    return;
  }

  const { loadScriptOnce, waitForCapacitor } = window.NextTrainScripts ?? {};
  if (!loadScriptOnce || !waitForCapacitor) {
    throw Object.assign(new Error("Native geolocation bridge unavailable"), { code: 2 });
  }

  await waitForCapacitor();
  await loadScriptOnce("geo-bundle.js");
}

async function getAppGeolocationPosition(options = {}) {
  if (isNativeApp()) {
    await ensureGeoBridge();
    if (!window.NextTrainGeo?.getCurrentPosition) {
      throw Object.assign(new Error("Native geolocation bridge unavailable"), { code: 2 });
    }

    return window.NextTrainGeo.getCurrentPosition(options);
  }

  if (!navigator.geolocation) {
    throw Object.assign(new Error("Geolocation unavailable"), { code: 2 });
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function isJourneysDialogOpen() {
  return Boolean(journeysDialog && !journeysDialog.hidden);
}

function isAppDialogOpen(dialog) {
  if (dialog === journeysDialog) {
    return isJourneysDialogOpen();
  }

  return Boolean(dialog?.open || dialog?.hasAttribute("open"));
}

function getDialogBackdrop(dialog) {
  const backdropId = dialog?.dataset?.backdropId;
  if (!backdropId) {
    return null;
  }

  return document.getElementById(backdropId);
}

function ensureDialogBackdrop(dialog) {
  if (!dialog) {
    return null;
  }

  let backdrop = getDialogBackdrop(dialog);
  if (backdrop) {
    return backdrop;
  }

  const backdropId = `${dialog.id}-backdrop`;
  dialog.dataset.backdropId = backdropId;

  backdrop = document.createElement("div");
  backdrop.id = backdropId;
  backdrop.className = "app-dialog-backdrop";
  backdrop.hidden = true;
  backdrop.addEventListener("click", () => {
    if (dialog === menuDialog) {
      closeMenuDialog();
      return;
    }

    if (dialog === helpDialog) {
      closeAppDialog(dialog);
    }
  });

  dialog.parentNode?.insertBefore(backdrop, dialog);
  return backdrop;
}

function openAppDialog(dialog) {
  if (!dialog || isAppDialogOpen(dialog)) {
    return;
  }

  if (isNativeApp()) {
    const backdrop = ensureDialogBackdrop(dialog);
    if (backdrop) {
      backdrop.hidden = false;
    }
    dialog.classList.add("app-native-dialog");
    dialog.setAttribute("open", "");
    document.body.classList.add("app-dialog-open");
    return;
  }

  try {
    dialog.showModal();
  } catch (error) {
    console.warn("showModal failed, using open attribute fallback", error);
    dialog.setAttribute("open", "");
  }
}

function closeAppDialog(dialog) {
  if (!dialog) {
    return;
  }

  const backdrop = getDialogBackdrop(dialog);
  if (backdrop) {
    backdrop.hidden = true;
  }

  try {
    if (dialog.open) {
      dialog.close();
    }
  } catch {
    // Ignore close errors on fallback dialogs.
  }

  dialog.removeAttribute("open");
  dialog.classList.remove("app-native-dialog");

  if (!document.querySelector("dialog[open], .app-native-dialog[open]")) {
    document.body.classList.remove("app-dialog-open");
  }
}

function apiUrl(path) {
  return `${API_ORIGIN}${path}`;
}

function getActiveFixture() {
  return new URLSearchParams(window.location.search).get("fixture");
}

function appendFixtureQuery(queryString) {
  const fixture = getActiveFixture();
  if (!fixture) {
    return queryString;
  }

  const params = new URLSearchParams(queryString);
  params.set("fixture", fixture);
  return params.toString();
}

function applyTestQueryParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("test") === "1") {
    sessionStorage.setItem("nextTrainTestMode", "1");
  }

  if (params.get("reset") !== "1") {
    return;
  }

  localStorage.clear();
  sessionStorage.clear();
  if (params.get("test") === "1") {
    sessionStorage.setItem("nextTrainTestMode", "1");
  }
  params.delete("reset");
  const nextQuery = params.toString();
  const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
  window.history.replaceState(null, "", nextUrl);
}

function isTestMode() {
  return sessionStorage.getItem("nextTrainTestMode") === "1";
}

function createJourneyId() {
  return `j-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function createDefaultJourney(overrides = {}) {
  return {
    id: createJourneyId(),
    name: "Journey",
    station: "",
    direction: "",
    leaveBeforeMinutes: DEFAULT_SETTINGS.leaveBeforeMinutes,
    useLeaveBefore: true,
    defaultFrom: "",
    defaultUntil: "",
    preferredTrainTime: "",
    remindDays: [...DEFAULT_REMIND_DAYS],
    remindMe: false,
    ...overrides,
  };
}

function createDefaultStore() {
  return {
    refreshSeconds: DEFAULT_SETTINGS.refreshSeconds,
    activeJourneyId: null,
    journeys: [],
  };
}

function isUnconfiguredJourney(journey) {
  return !journey?.station || !journey?.direction;
}

function resolveInitialJourneys(rawJourneys = []) {
  return rawJourneys
    .map((journey) => normalizeJourney(journey))
    .filter((journey) => !isUnconfiguredJourney(journey));
}

function normalizeJourneyList(rawJourneys = []) {
  return rawJourneys.map((journey) => normalizeJourney(journey));
}

function normalizeStation(station) {
  if (!station) {
    return station;
  }
  const trimmed = station.trim();
  if (PERTH_STATIONS.has(trimmed)) {
    return CANONICAL_PERTH_STATION;
  }
  return trimmed;
}

function collapseStationList(stations) {
  const collapsed = [];
  let perthAdded = false;

  for (const name of stations) {
    if (PERTH_STATIONS.has(name)) {
      if (!perthAdded) {
        collapsed.push(CANONICAL_PERTH_STATION);
        perthAdded = true;
      }
      continue;
    }
    collapsed.push(name);
  }

  return collapsed;
}

function formatRouteBasedJourneyName(station, direction) {
  return `${formatStationLabel(station)} → ${direction}`;
}

function readJourneyNameFromForm(station, direction) {
  const trimmed = detailJourneyNameInput?.value?.trim() ?? "";
  if (trimmed) {
    return trimmed.slice(0, 40);
  }
  return formatRouteBasedJourneyName(station, direction);
}

function formatStationLabel(name) {
  if (PERTH_STATIONS.has(name)) {
    return "Perth";
  }
  return name.replace(/ Stn$/, "");
}

function normalizeDirection(direction) {
  if (!direction) {
    return direction;
  }

  const trimmed = direction.trim();
  if (DIRECTION_ALIASES[trimmed]) {
    return DIRECTION_ALIASES[trimmed];
  }

  const withoutStn = trimmed.replace(/ Stn$/i, "");
  if (DIRECTION_ALIASES[withoutStn]) {
    return DIRECTION_ALIASES[withoutStn];
  }

  return trimmed;
}

function dedupeDirections(directions) {
  const seen = new Set();
  const unique = [];

  for (const direction of directions) {
    const normalized = normalizeDirection(direction);
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(normalized);
  }

  return unique.sort();
}

function isDefaultCommuteJourneyName(name) {
  const normalized = String(name || "").trim().toLowerCase();
  return normalized === "daily commute - in" || normalized === "daily commute - out";
}

function isLegacyBlankDefaultWindow(defaultFrom, defaultUntil) {
  return defaultFrom === "00:00" && (defaultUntil === "23:59" || defaultUntil === "24:00");
}

function normalizeRemindDays(raw) {
  if (!Array.isArray(raw)) {
    return [...DEFAULT_REMIND_DAYS];
  }

  const days = raw.map((value) => Number(value)).filter((value) => value >= 1 && value <= 7);
  return days.length ? [...new Set(days)].sort((a, b) => a - b) : [...DEFAULT_REMIND_DAYS];
}

function journeyRemindMeEnabled(raw = {}) {
  if (typeof raw.remindMe === "boolean") {
    return raw.remindMe;
  }
  return Boolean(raw.preferredTrainTime);
}

function normalizeJourney(raw = {}) {
  let defaultFrom =
    raw.defaultFrom === undefined || raw.defaultFrom === null
      ? ""
      : String(raw.defaultFrom);
  let defaultUntil =
    raw.defaultUntil === "24:00"
      ? "23:59"
      : raw.defaultUntil === undefined || raw.defaultUntil === null
        ? ""
        : String(raw.defaultUntil);

  if (
    isLegacyBlankDefaultWindow(defaultFrom, defaultUntil) &&
    !isDefaultCommuteJourneyName(raw.name)
  ) {
    defaultFrom = "";
    defaultUntil = "";
  }

  let preferredTrainTime =
    raw.preferredTrainTime === undefined || raw.preferredTrainTime === null
      ? ""
      : String(raw.preferredTrainTime);
  if (!preferredTrainTime && defaultFrom && journeyRemindMeEnabled(raw)) {
    preferredTrainTime = defaultFrom;
  }

  return {
    id: raw.id || createJourneyId(),
    name: String(raw.name || "Journey").trim() || "Journey",
    station: raw.station ? normalizeStation(raw.station) : "",
    direction: raw.direction ? normalizeDirection(raw.direction) : "",
    leaveBeforeMinutes:
      Number(raw.leaveBeforeMinutes) || DEFAULT_SETTINGS.leaveBeforeMinutes,
    useLeaveBefore: raw.useLeaveBefore !== false,
    defaultFrom,
    defaultUntil,
    preferredTrainTime,
    remindDays: normalizeRemindDays(raw.remindDays),
    remindMe: journeyRemindMeEnabled(raw),
  };
}

function legToJourney(leg, name, defaultFrom, defaultUntil) {
  if (!leg?.station || !leg?.direction) {
    return null;
  }
  return normalizeJourney({
    id: createJourneyId(),
    name,
    station: leg.station,
    direction: leg.direction,
    leaveBeforeMinutes: leg.leaveBeforeMinutes,
    defaultFrom,
    defaultUntil,
  });
}

function migrateSettings(raw = {}) {
  if (Array.isArray(raw.journeys) && raw.journeys.length > 0) {
    const journeys = normalizeJourneyList(raw.journeys).filter(
      (journey) => !isUnconfiguredJourney(journey)
    );
    const activeJourneyId = journeys.some((journey) => journey.id === raw.activeJourneyId)
      ? raw.activeJourneyId
      : (journeys[0]?.id ?? null);

    return {
      refreshSeconds: Number(raw.refreshSeconds) || DEFAULT_SETTINGS.refreshSeconds,
      activeJourneyId,
      journeys,
    };
  }

  if (raw.outbound || raw.return) {
    const journeys = [];
    const work = legToJourney(raw.outbound, "To work", "00:00", "12:00");
    const home = legToJourney(raw.return, "To home", "12:00", "23:59");
    if (work) {
      journeys.push(work);
    }
    if (home) {
      journeys.push(home);
    }

    let activeJourneyId = journeys[0]?.id ?? null;
    if (raw.activeLeg === "return" && journeys[1]) {
      activeJourneyId = journeys[1].id;
    }

    return {
      refreshSeconds: Number(raw.refreshSeconds) || DEFAULT_SETTINGS.refreshSeconds,
      activeJourneyId,
      journeys,
    };
  }

  const direction = raw.direction ?? raw.destination;
  if (raw.station && direction) {
    const journey = legToJourney(
      {
        station: raw.station,
        direction,
        leaveBeforeMinutes: raw.leaveBeforeMinutes,
      },
      "To work",
      "00:00",
      "12:00"
    );

    return {
      refreshSeconds: Number(raw.refreshSeconds) || DEFAULT_SETTINGS.refreshSeconds,
      activeJourneyId: journey?.id ?? null,
      journeys: journey ? [journey] : [],
    };
  }

  return {
    refreshSeconds: Number(raw.refreshSeconds) || DEFAULT_SETTINGS.refreshSeconds,
    activeJourneyId: null,
    journeys: [],
  };
}

function getConfiguredJourneys() {
  return settings.journeys.filter((journey) => !isUnconfiguredJourney(journey));
}

function shouldShowJourneySwitcher() {
  return getConfiguredJourneys().length >= 2;
}

function syncJourneyContextChrome() {
  const configuredCount = getConfiguredJourneys().length;
  const inEmptySetup = heroEl?.classList.contains("hero-setup");
  const showManage =
    journeyModeActive && configuredCount >= 1 && !inEmptySetup && !isNearbyModeActive();
  const showName = showManage && configuredCount === 1;
  const showSwitcher = showManage && shouldShowJourneySwitcher();

  if (journeyContextRowEl) {
    journeyContextRowEl.hidden = !showManage;
    journeyContextRowEl.classList.toggle("journey-context-row--multi", showSwitcher);
    journeyContextRowEl.classList.toggle("journey-context-row--single", showName);
  }

  if (journeyContextNameEl) {
    journeyContextNameEl.hidden = !showName;
    journeyContextNameEl.textContent = getActiveJourney()?.name ?? "Journey";
  }

  if (journeySwitcherEl) {
    journeySwitcherEl.hidden = !showSwitcher;
  }

  if (journeyEditBtn) {
    journeyEditBtn.hidden = !showManage;
  }
}

function getJourneyById(id) {
  return settings.journeys.find((journey) => journey.id === id) ?? null;
}

function getActiveJourney() {
  const configured = getConfiguredJourneys();
  if (!configured.length) {
    return null;
  }

  const active = getJourneyById(settings.activeJourneyId);
  if (active?.station && active?.direction) {
    return active;
  }

  return configured[0];
}

function shouldDefaultToNearby() {
  const configured = getConfiguredJourneys();
  if (!configured.length) {
    return true;
  }

  const scheduledId = findScheduledJourneyId();
  if (isManualOverrideBlockingAuto(scheduledId)) {
    return false;
  }

  return !scheduledId;
}

async function applyCommuteMode({ coldStart = false } = {}) {
  renderJourneySwitcher();

  if (shouldDefaultToNearby()) {
    journeyModeActive = false;
    if (coldStart) {
      maybeScheduleOnboarding();
    }
    if (!nearbySession) {
      await enterNearbyMode();
    } else {
      syncChromeMode();
    }
    return;
  }

  const scheduledId = findScheduledJourneyId();
  if (
    scheduledId &&
    settings.activeJourneyId !== scheduledId &&
    !isManualOverrideBlockingAuto(scheduledId)
  ) {
    settings.activeJourneyId = scheduledId;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  journeyModeActive = true;
  exitNearbyMode();
  maybeAutoSelectJourney();
  skipTrains = readSkipState().count;
  clearHeroSetupState();
  syncChromeMode();
  fetchNextTrain();
}

function hasCompletedOnboarding() {
  return Boolean(localStorage.getItem(ONBOARDING_KEY));
}

function isOnboardingVisible() {
  return Boolean(onboardingCoach && !onboardingCoach.hidden);
}

function hideOnboardingCoach() {
  if (!onboardingCoach) {
    return;
  }

  onboardingCoach.hidden = true;
  onboardingCoach.classList.remove("onboarding-coach--step-1", "onboarding-coach--step-2");
  journeysChromeAction?.classList.remove("onboarding-highlight");
}

function showOnboardingCoach(step) {
  if (!onboardingCoach) {
    return;
  }

  onboardingCoach.classList.remove("onboarding-coach--step-1", "onboarding-coach--step-2");
  onboardingCoach.classList.add(step === 2 ? "onboarding-coach--step-2" : "onboarding-coach--step-1");
  journeysChromeAction?.classList.toggle("onboarding-highlight", step === 2);
  onboardingCoach.hidden = false;
}

function completeOnboarding() {
  localStorage.setItem(ONBOARDING_KEY, "1");
  hideOnboardingCoach();
  if (onboardingStep1) {
    onboardingStep1.hidden = false;
  }
  if (onboardingStep2) {
    onboardingStep2.hidden = true;
  }
}

function deferOnboardingForSession() {
  if (hasCompletedOnboarding() || isOnboardingVisible() || !onboardingShowTimer) {
    return;
  }

  clearTimeout(onboardingShowTimer);
  onboardingShowTimer = null;
  onboardingPopulatedAt = null;
  sessionStorage.setItem(ONBOARDING_DEFER_KEY, "1");
}

function maybeScheduleOnboarding() {
  if (!isNearbyModeActive()) {
    return;
  }

  if (hasCompletedOnboarding()) {
    return;
  }

  if (sessionStorage.getItem(ONBOARDING_DEFER_KEY)) {
    return;
  }

  if (isTestMode()) {
    return;
  }

  const now = Date.now();
  if (!onboardingPopulatedAt) {
    onboardingPopulatedAt = now;
  }

  const elapsed = now - onboardingPopulatedAt;
  if (elapsed >= 6000) {
    clearTimeout(onboardingShowTimer);
    onboardingShowTimer = null;
    showOnboardingStep1();
    return;
  }

  if (onboardingShowTimer) {
    return;
  }

  onboardingShowTimer = window.setTimeout(() => {
    onboardingShowTimer = null;
    if (sessionStorage.getItem(ONBOARDING_DEFER_KEY) || hasCompletedOnboarding()) {
      return;
    }
    showOnboardingStep1();
  }, 6000 - elapsed);
}

function showOnboardingStep1() {
  if (!onboardingCoach || hasCompletedOnboarding()) {
    return;
  }

  if (onboardingStep1) {
    onboardingStep1.hidden = false;
  }
  if (onboardingStep2) {
    onboardingStep2.hidden = true;
  }
  showOnboardingCoach(1);
}

function showOnboardingStep2() {
  if (onboardingStep1) {
    onboardingStep1.hidden = true;
  }
  if (onboardingStep2) {
    onboardingStep2.hidden = false;
  }
  showOnboardingCoach(2);
}

function installOnboardingInteractionTracking() {
  const selector =
    "#hero, #nearby-btn, #journeys-btn, #menu-btn, #journey-switcher, .nearby-direction-row, #nearby-station-btn, #nearby-station-select, #onboarding-coach, #onboarding-coach *";

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.target.closest(selector)) {
        deferOnboardingForSession();
      }
    },
    { capture: true }
  );
}

function hasConfiguredCommute() {
  return getConfiguredJourneys().length > 0;
}

function readStoredSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return createDefaultStore();
    }

    const migrated = migrateSettings(JSON.parse(raw));
    const resolved = {
      ...migrated,
      journeys: normalizeJourneyList(migrated.journeys),
    };

    if (resolved.journeys.length && !resolved.activeJourneyId) {
      resolved.activeJourneyId = resolved.journeys[0].id;
    }

    if (
      resolved.activeJourneyId &&
      !resolved.journeys.some((journey) => journey.id === resolved.activeJourneyId)
    ) {
      resolved.activeJourneyId = resolved.journeys[0]?.id ?? null;
    }

    if (!resolved.journeys.length) {
      resolved.activeJourneyId = null;
    }

    return resolved;
  } catch {
    return createDefaultStore();
  }
}

function persistSettings(next) {
  settings = migrateSettings({ ...settings, ...next });
  settings.journeys = settings.journeys.map((journey) => normalizeJourney(journey));
  const configured = getConfiguredJourneys();
  if (!configured.some((journey) => journey.id === settings.activeJourneyId)) {
    settings.activeJourneyId = configured[0]?.id ?? settings.journeys[0]?.id ?? null;
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  refreshSeconds = settings.refreshSeconds;
  renderJourneySwitcher();
  window.nextTrainWidget?.syncWidgetSettings?.(settings);
  document.dispatchEvent(new CustomEvent("nexttrain:settings-persisted"));
}

function persistReminderJourneys(patches) {
  const patchMap = new Map(patches.map((patch) => [patch.id, patch]));
  const journeys = settings.journeys.map((journey) => {
    const patch = patchMap.get(journey.id);
    if (!patch) {
      return normalizeJourney(journey);
    }

    return normalizeJourney({
      ...journey,
      remindMe: patch.remindMe === true,
      preferredTrainTime: patch.preferredTrainTime || "",
      remindDays: normalizeRemindDays(patch.remindDays),
    });
  });
  persistSettings({ journeys });
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
  });

  clearBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setOptionalTimeField(input, display, field, clearBtn, "");
  });
}

function journeyUsesLeaveBefore(journey) {
  return journey?.useLeaveBefore !== false;
}

function getEffectiveLeaveBeforeMinutes(journey) {
  if (!journeyUsesLeaveBefore(journey)) {
    return 0;
  }

  return Number(journey?.leaveBeforeMinutes) || DEFAULT_SETTINGS.leaveBeforeMinutes;
}

function formatLeaveBeforeLabel(minutes) {
  const value = Number(minutes) || DEFAULT_SETTINGS.leaveBeforeMinutes;
  return value === 1 ? "1 min" : `${value} min`;
}

function updateLeaveBeforeLabel(minutes = detailLeaveBeforeInput?.value) {
  if (detailLeaveBeforeValueEl) {
    detailLeaveBeforeValueEl.textContent = formatLeaveBeforeLabel(minutes);
  }
}

function syncLeaveBeforeControlsState() {
  const enabled = detailUseLeaveBeforeInput?.checked ?? true;

  if (leaveBeforeField) {
    leaveBeforeField.classList.toggle("leave-before-field--disabled", !enabled);
  }
  if (detailLeaveBeforeInput) {
    detailLeaveBeforeInput.disabled = !enabled;
  }
  if (detailLeaveBeforeValueEl) {
    detailLeaveBeforeValueEl.hidden = !enabled;
  }
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function getPerthDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Perth",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year").value),
    month: Number(parts.find((part) => part.type === "month").value),
    day: Number(parts.find((part) => part.type === "day").value),
  };
}

function departureIsoFromDisplayTime(displayTime, referenceIso) {
  if (!displayTime) {
    return null;
  }

  const [hour, minute] = displayTime.split(":").map(Number);
  const reference = referenceIso ? new Date(referenceIso) : new Date();
  const { year, month, day } = getPerthDateParts(reference);
  let departure = new Date(
    `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:00+08:00`
  );

  if (referenceIso && departure < new Date(referenceIso) - 30 * 60 * 1000) {
    departure = new Date(departure.getTime() + 24 * 60 * 60 * 1000);
  }

  return departure.toISOString();
}

function resolveTripDeparture(trip, referenceIso) {
  return trip?.departure ?? trip?.arrival ?? departureIsoFromDisplayTime(trip?.displayTime, referenceIso);
}

function enrichTrip(trip, referenceIso) {
  if (!trip) {
    return trip;
  }

  const departure = resolveTripDeparture(trip, referenceIso);
  return {
    ...trip,
    departure,
    arrival: departure,
  };
}

function normalizeApiTrainData(data) {
  if (!data?.next) {
    return data;
  }

  const nextReference = data.next.departure ?? data.next.arrival;
  const next = enrichTrip(data.next, nextReference);
  const following = data.following
    ? enrichTrip(data.following, next.departure ?? next.arrival)
    : null;

  const upcoming =
    data.upcoming?.length > 0
      ? data.upcoming.map((trip, index) =>
          enrichTrip(
            trip,
            index > 0
              ? resolveTripDeparture(data.upcoming[index - 1], nextReference)
              : nextReference
          )
        )
      : following
        ? [next, following]
        : [next];

  return {
    ...data,
    next,
    following,
    upcoming,
  };
}

function getPerthMinutesSinceMidnight(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Perth",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour").value);
  const minute = Number(parts.find((part) => part.type === "minute").value);
  return hour * 60 + minute;
}

function minutesUntilPerthWallClock(isoString) {
  const target = getPerthMinutesSinceMidnight(new Date(isoString));
  const now = getPerthMinutesSinceMidnight();
  let diff = target - now;

  if (diff < -12 * 60) {
    diff += 24 * 60;
  } else if (diff > 12 * 60) {
    diff -= 24 * 60;
  }

  return diff;
}

function getLiveTiming(next) {
  const minutesUntilDeparture = minutesUntilPerthWallClock(
    next.departure ?? next.arrival
  );
  const minutesUntilLeave = minutesUntilPerthWallClock(next.leaveBy);
  const leavePhase = getLeavePhase(minutesUntilLeave, minutesUntilDeparture);

  return {
    minutesUntilDeparture,
    minutesUntilLeave,
    leavePhase,
    minutesLate: minutesUntilLeave < 0 ? Math.abs(minutesUntilLeave) : 0,
  };
}

function hasDefaultWindow(journey) {
  return Boolean(journey?.defaultFrom && journey?.defaultUntil);
}

function parseTimeToMinutes(time) {
  const [hour, minute] = String(time || "00:00").split(":").map(Number);
  return hour * 60 + (minute || 0);
}

function journeyMatchesTime(journey, minutes) {
  if (!hasDefaultWindow(journey)) {
    return false;
  }

  const from = parseTimeToMinutes(journey.defaultFrom);
  const until = parseTimeToMinutes(journey.defaultUntil);

  if (from === until) {
    return true;
  }
  if (from < until) {
    return minutes >= from && minutes < until;
  }
  return minutes >= from || minutes < until;
}

function getJourneyWindowRanges(journey) {
  if (!hasDefaultWindow(journey)) {
    return [];
  }

  const from = parseTimeToMinutes(journey.defaultFrom);
  const until = parseTimeToMinutes(journey.defaultUntil);
  const dayEnd = 24 * 60;

  if (from === until) {
    return [[0, dayEnd]];
  }
  if (from < until) {
    return [[from, until]];
  }
  return [
    [from, dayEnd],
    [0, until],
  ];
}

function timeRangesOverlap(rangeA, rangeB) {
  return rangeA[0] < rangeB[1] && rangeB[0] < rangeA[1];
}

function journeyDefaultWindowsOverlap(left, right) {
  for (const rangeA of getJourneyWindowRanges(left)) {
    for (const rangeB of getJourneyWindowRanges(right)) {
      if (timeRangesOverlap(rangeA, rangeB)) {
        return true;
      }
    }
  }
  return false;
}

function formatJourneyDefaultWindow(journey) {
  if (!hasDefaultWindow(journey)) {
    return "Not set";
  }
  return `${journey.defaultFrom}–${journey.defaultUntil}`;
}

function findJourneyDefaultWindowConflict(journey, journeys) {
  if (!hasDefaultWindow(journey)) {
    return null;
  }

  if (
    parseTimeToMinutes(journey.defaultFrom) === parseTimeToMinutes(journey.defaultUntil)
  ) {
    const other = journeys.find((entry) => entry.id !== journey.id);
    if (other) {
      return other;
    }
  }

  for (const other of journeys) {
    if (
      other.id === journey.id ||
      !hasDefaultWindow(other) ||
      isUnconfiguredJourney(other)
    ) {
      continue;
    }
    if (journeyDefaultWindowsOverlap(journey, other)) {
      return other;
    }
  }

  return null;
}

function findScheduledJourneyId() {
  const configured = getConfiguredJourneys();
  if (!configured.length) {
    return null;
  }

  const minutes = getPerthMinutesSinceMidnight();
  const match = configured.find((journey) => journeyMatchesTime(journey, minutes));
  if (match) {
    return match.id;
  }

  if (configured.length === 1 && !hasDefaultWindow(configured[0])) {
    return configured[0].id;
  }

  return null;
}

function findDefaultWindowJourneyAt(minutes = getPerthMinutesSinceMidnight()) {
  return (
    getConfiguredJourneys().find((journey) => journeyMatchesTime(journey, minutes)) ?? null
  );
}

function getDefaultWindowJourneyIds(minutes = getPerthMinutesSinceMidnight()) {
  return getConfiguredJourneys()
    .filter((journey) => journeyMatchesTime(journey, minutes))
    .map((journey) => journey.id);
}

function defaultWindowContextsMatch(storedIds, currentIds) {
  const stored = [...(storedIds ?? [])].sort().join(",");
  const current = [...(currentIds ?? [])].sort().join(",");
  return stored === current;
}

function readManualJourneyOverride() {
  try {
    const raw = sessionStorage.getItem(MANUAL_JOURNEY_OVERRIDE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setManualJourneyOverride(journeyId) {
  sessionStorage.setItem(
    MANUAL_JOURNEY_OVERRIDE_KEY,
    JSON.stringify({
      journeyId,
      matchingWindowIds: getDefaultWindowJourneyIds(),
    })
  );
}

function clearManualJourneyOverride() {
  sessionStorage.removeItem(MANUAL_JOURNEY_OVERRIDE_KEY);
}

function isManualOverrideBlockingAuto(scheduledId) {
  const override = readManualJourneyOverride();
  if (!override) {
    return false;
  }

  if (settings.activeJourneyId !== override.journeyId) {
    settings.activeJourneyId = override.journeyId;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  const storedWindowIds =
    override.matchingWindowIds ??
    (override.windowJourneyId ? [override.windowJourneyId] : []);
  const currentWindowIds = getDefaultWindowJourneyIds();

  if (defaultWindowContextsMatch(storedWindowIds, currentWindowIds)) {
    return true;
  }

  if (!scheduledId) {
    return true;
  }

  if (scheduledId === override.journeyId) {
    clearManualJourneyOverride();
    return false;
  }

  clearManualJourneyOverride();
  return false;
}

function maybeAutoSelectJourney() {
  if (deferJourneyAutoSelect) {
    return;
  }

  const scheduledId = findScheduledJourneyId();
  if (isManualOverrideBlockingAuto(scheduledId)) {
    return;
  }

  if (!scheduledId || scheduledId === settings.activeJourneyId) {
    return;
  }

  settings.activeJourneyId = scheduledId;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  skipTrains = readSkipState().count;
}

function readUrlSettings() {
  const params = new URLSearchParams(window.location.search);
  const station = params.get("station");
  const direction = params.get("direction") ?? params.get("destination");

  if (!station || !direction) {
    return null;
  }

  const journey = createDefaultJourney({
    name: "To work",
    station,
    direction,
    leaveBeforeMinutes:
      Number(params.get("leaveBefore") ?? params.get("leaveBeforeMinutes")) ||
      DEFAULT_SETTINGS.leaveBeforeMinutes,
  });

  return migrateSettings({
    journeys: [journey],
    activeJourneyId: journey.id,
    refreshSeconds:
      Number(params.get("refresh") ?? params.get("refreshSeconds")) ||
      DEFAULT_SETTINGS.refreshSeconds,
  });
}

function skipStorageKey() {
  const journey = getActiveJourney();
  return `${SKIP_KEY}:${journey?.id ?? "none"}`;
}

function readSkipState() {
  try {
    const raw = sessionStorage.getItem(skipStorageKey());
    if (!raw) {
      return { count: 0, skippedUntil: null, skippedToDeparture: null };
    }

    const parsed = JSON.parse(raw);
    if (parsed.skippedUntil && new Date(parsed.skippedUntil) <= new Date()) {
      clearSkipState();
      return { count: 0, skippedUntil: null, skippedToDeparture: null };
    }

    return {
      count: Math.max(0, Number(parsed.count) || 0),
      skippedUntil: parsed.skippedUntil ?? null,
      skippedToDeparture: parsed.skippedToDeparture ?? null,
    };
  } catch {
    return { count: 0, skippedUntil: null, skippedToDeparture: null };
  }
}

function saveSkipState(count, skippedUntil, skippedToDeparture = null) {
  skipTrains = Math.max(0, count);
  const payload = {
    count: skipTrains,
    skippedUntil: skippedUntil ?? null,
    skippedToDeparture: skippedToDeparture ?? null,
  };
  sessionStorage.setItem(skipStorageKey(), JSON.stringify(payload));
}

function clearSkipState() {
  skipTrains = 0;
  sessionStorage.removeItem(skipStorageKey());
}

function getUpcomingTrips(data) {
  if (!data?.next) {
    return [];
  }
  return normalizeApiTrainData(data).upcoming ?? [];
}

function formatFollowingLine(trip) {
  return `${trip.displayTime} · Platform ${trip.platform} · ${trip.status}`;
}

function getNextThenTrain(data, skipCount = skipTrains) {
  if (!data) {
    return null;
  }

  const normalized = normalizeApiTrainData(data);
  const upcoming = normalized.upcoming ?? [];
  const nextTrip = upcoming[skipCount + 1];

  if (nextTrip) {
    return slimFollowing(nextTrip);
  }

  if (skipCount === 0 && normalized.following) {
    return slimFollowing(normalized.following);
  }

  return null;
}

function renderThenTrains(data) {
  if (!followingSectionEl || !followingNextEl) {
    return;
  }

  const nextTrain = getNextThenTrain(data);

  if (!nextTrain) {
    followingSectionEl.hidden = true;
    followingNextEl.textContent = "";
    return;
  }

  followingSectionEl.hidden = false;
  followingNextEl.textContent = formatFollowingLine(nextTrain);
}

function reconcileSkipWithApi(data) {
  if (skipTrains <= 0 || !data?.next) {
    return;
  }

  const { skippedToDeparture } = readSkipState();
  if (!skippedToDeparture) {
    return;
  }

  const apiNextDeparture = resolveTripDeparture(
    normalizeApiTrainData(data).next
  );
  if (apiNextDeparture && apiNextDeparture === skippedToDeparture) {
    clearSkipState();
  }
}

function getSkippedEarlierTrain(data) {
  if (skipTrains <= 0 || !data) {
    return null;
  }

  const earlierTrip = getUpcomingTrips(data)[skipTrains - 1];
  if (!earlierTrip) {
    return null;
  }

  const journey = getActiveJourney();
  const normalized = normalizeApiTrainData(data);
  const referenceIso = normalized.next?.departure ?? normalized.next?.arrival;
  return ensureFullNext(
    earlierTrip,
    getEffectiveLeaveBeforeMinutes(journey),
    referenceIso
  );
}

function prepareDisplayData(data) {
  const normalized = normalizeApiTrainData(data);
  reconcileSkipWithApi(normalized);
  return applyClientSkip(normalized);
}

function getLeavePhase(minutesUntilLeave, minutesUntilDeparture) {
  if (minutesUntilDeparture <= 0) {
    return "missed";
  }
  if (minutesUntilLeave < 0) {
    return "late";
  }
  if (minutesUntilLeave <= 0) {
    return "now";
  }
  if (minutesUntilLeave <= 2) {
    return "urgent";
  }
  if (minutesUntilLeave <= 5) {
    return "soon";
  }
  return "calm";
}

function buildNextFromFollowing(following, leaveBeforeMinutes, referenceIso) {
  const departureIso = resolveTripDeparture(
    following,
    referenceIso ?? following?.departure ?? following?.arrival
  );
  if (!departureIso) {
    return null;
  }

  const departure = new Date(departureIso);
  const leaveByMs = departure.getTime() - leaveBeforeMinutes * 60 * 1000;
  const leaveByIso = new Date(leaveByMs).toISOString();
  const timing = getLiveTiming({
    departure: departureIso,
    arrival: departureIso,
    leaveBy: leaveByIso,
  });

  return {
    ...following,
    leaveBy: leaveByIso,
    departure: departureIso,
    arrival: departureIso,
    minutesUntilDeparture: timing.minutesUntilDeparture,
    minutesUntilArrival: timing.minutesUntilDeparture,
    minutesUntilLeave: timing.minutesUntilLeave,
    minutesLate: timing.minutesLate,
    leavePhase: timing.leavePhase,
    isDelayed: Number(following.timingOffsetMinutes ?? 0) >= 2,
  };
}

function slimFollowing(trip) {
  const departure = trip.departure ?? trip.arrival;
  return {
    displayTime: trip.displayTime,
    scheduledDisplayTime: trip.scheduledDisplayTime,
    platform: trip.platform,
    status: trip.status,
    departure,
    arrival: departure,
  };
}

function ensureFullNext(trip, leaveBeforeMinutes, referenceIso) {
  if (!trip) {
    return null;
  }
  if (trip.leaveBy) {
    return trip;
  }
  return buildNextFromFollowing(trip, leaveBeforeMinutes, referenceIso);
}

function applyClientSkip(data) {
  if (!data || skipTrains <= 0) {
    return data;
  }

  const normalized = normalizeApiTrainData(data);
  const journey = getActiveJourney();
  const referenceIso = normalized.next?.departure ?? normalized.next?.arrival;

  if (!normalized.upcoming?.length) {
    return normalized;
  }

  const skip = Math.min(skipTrains, normalized.upcoming.length - 1);
  const next = ensureFullNext(
    normalized.upcoming[skip] ?? normalized.next,
    getEffectiveLeaveBeforeMinutes(journey),
    referenceIso
  );
  const followingTrip = normalized.upcoming[skip + 1] ?? null;
  const following = getNextThenTrain(normalized, skip) ?? (followingTrip ? slimFollowing(followingTrip) : null);

  return {
    ...normalized,
    next,
    following,
  };
}

function formatJourneyRoute(journey) {
  if (!journey?.station || !journey?.direction) {
    return "Set up...";
  }
  return `${formatStationLabel(journey.station)}, towards ${journey.direction}`;
}

function renderJourneySwitcher() {
  if (!journeySwitcherEl || !journeySwitcherMenuEl) {
    syncJourneyContextChrome();
    return;
  }

  if (isNearbyModeActive()) {
    journeySwitcherEl.hidden = true;
    journeySwitcherMenuEl.hidden = true;
    journeySwitcherOpen = false;
    syncJourneySwitcherA11y();
    syncJourneyContextChrome();
    return;
  }

  if (!shouldShowJourneySwitcher()) {
    journeySwitcherEl.hidden = true;
    journeySwitcherMenuEl.hidden = true;
    journeySwitcherOpen = false;
    syncJourneySwitcherA11y();
    syncJourneyContextChrome();
    return;
  }

  const active = getActiveJourney();
  journeySwitcherEl.hidden = false;
  journeySwitcherNameEl.textContent = active?.name ?? "Journey";

  journeySwitcherMenuEl.innerHTML = "";

  for (const journey of getConfiguredJourneys()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "journey-switcher-option";
    if (journey.id === settings.activeJourneyId) {
      button.classList.add("active");
    }
    button.innerHTML = `${journey.name}<span class="journey-switcher-option-route">${formatJourneyRoute(journey)}</span>`;
    button.addEventListener("click", () => {
      closeJourneySwitcherMenu();
      switchJourney(journey.id);
    });
    journeySwitcherMenuEl.appendChild(button);
  }

  const manageBtn = document.createElement("button");
  manageBtn.type = "button";
  manageBtn.className = "journey-switcher-option journey-switcher-option--manage";
  manageBtn.textContent = "Manage journeys";
  manageBtn.addEventListener("click", () => {
    closeJourneySwitcherMenu();
    openJourneys();
  });
  journeySwitcherMenuEl.appendChild(manageBtn);

  journeySwitcherMenuEl.hidden = !journeySwitcherOpen;
  syncJourneySwitcherA11y();
  syncJourneyContextChrome();
}

function syncJourneySwitcherA11y() {
  if (!journeySwitcherEl) {
    return;
  }

  journeySwitcherEl.setAttribute("aria-expanded", journeySwitcherOpen ? "true" : "false");
}

function toggleJourneySwitcherMenu() {
  if (!shouldShowJourneySwitcher() || isNearbyModeActive()) {
    return;
  }
  journeySwitcherOpen = !journeySwitcherOpen;
  journeySwitcherMenuEl.hidden = !journeySwitcherOpen;
  syncJourneySwitcherA11y();
}

function closeJourneySwitcherMenu() {
  journeySwitcherOpen = false;
  if (journeySwitcherMenuEl) {
    journeySwitcherMenuEl.hidden = true;
  }
  syncJourneySwitcherA11y();
}

function switchJourney(journeyId) {
  journeyModeActive = true;
  exitNearbyMode();

  if (journeyId === settings.activeJourneyId) {
    syncChromeMode();
    return;
  }

  const journey = getJourneyById(journeyId);
  if (!journey?.station || !journey?.direction) {
    openJourneyDetail(journeyId);
    return;
  }

  setManualJourneyOverride(journeyId);
  deferJourneyAutoSelect = false;
  persistSettings({ activeJourneyId: journeyId });
  skipTrains = readSkipState().count;
  closeJourneySwitcherMenu();
  fetchNextTrain();
}

function canSkipToNextTrain() {
  if (isNearbyModeActive()) {
    const entry = getNearbyFocusedEntry();
    const upcoming = getUpcomingTrips(entry?.data);
    return getNearbySkip(entry?.direction) < upcoming.length - 1;
  }

  if (!lastApiData) {
    return false;
  }

  const upcoming = getUpcomingTrips(lastApiData);
  return skipTrains < upcoming.length - 1;
}

function canSkipToEarlierTrain() {
  if (isNearbyModeActive()) {
    return getNearbySkip(getNearbyFocusedEntry()?.direction) > 0;
  }

  return skipTrains > 0;
}

function skipToNextTrain() {
  if (isNearbyModeActive()) {
    const entry = getNearbyFocusedEntry();
    if (!entry || !canSkipToNextTrain()) {
      return;
    }

    setNearbySkip(entry.direction, getNearbySkip(entry.direction) + 1);
    dismissSwipeHint();
    fetchNearbyBoard()
      .then(() => renderNearbyBoard())
      .catch((error) => {
        errorEl.textContent = error.message;
        errorEl.hidden = false;
        renderNearbyBoard({ stale: true });
      });
    return;
  }

  if (!canSkipToNextTrain()) {
    return;
  }

  skipTrains += 1;
  const normalized = normalizeApiTrainData(lastApiData);
  const skippedToTrip = normalized.upcoming?.[skipTrains] ?? null;
  const skippedToDeparture = skippedToTrip ? resolveTripDeparture(skippedToTrip) : null;
  saveSkipState(skipTrains, null, skippedToDeparture);
  dismissSwipeHint();

  if (lastApiData) {
    render(applyClientSkip({ ...lastApiData }));
    fetchNextTrain();
  }
}

function skipToEarlierTrain() {
  if (isNearbyModeActive()) {
    const entry = getNearbyFocusedEntry();
    if (!entry || !canSkipToEarlierTrain()) {
      return;
    }

    setNearbySkip(entry.direction, getNearbySkip(entry.direction) - 1);
    dismissSwipeHint();
    fetchNearbyBoard()
      .then(() => renderNearbyBoard())
      .catch((error) => {
        errorEl.textContent = error.message;
        errorEl.hidden = false;
        renderNearbyBoard({ stale: true });
      });
    return;
  }

  if (!canSkipToEarlierTrain() || !lastApiData) {
    return;
  }

  skipTrains -= 1;
  if (skipTrains <= 0) {
    clearSkipState();
  } else {
    const normalized = normalizeApiTrainData(lastApiData);
    const skippedToTrip = normalized.upcoming?.[skipTrains] ?? null;
    const skippedToDeparture = skippedToTrip ? resolveTripDeparture(skippedToTrip) : null;
    saveSkipState(skipTrains, null, skippedToDeparture);
  }

  dismissSwipeHint();
  render(applyClientSkip({ ...lastApiData }));
  fetchNextTrain();
}

function buildApiParams() {
  const journey = getActiveJourney();
  if (!journey?.station || !journey?.direction) {
    throw new Error("Journey is not fully configured");
  }

  const params = new URLSearchParams({
    station: journey.station,
    direction: journey.direction,
    destination: journey.direction,
    leaveBefore: String(getEffectiveLeaveBeforeMinutes(journey)),
    refresh: String(settings.refreshSeconds),
  });

  const fixture = getActiveFixture();
  if (fixture) {
    params.set("fixture", fixture);
  }

  return params;
}

async function fetchJson(url) {
  const response = await fetch(url);
  const text = await response.text();
  try {
    return { ok: response.ok, data: JSON.parse(text) };
  } catch {
    return {
      ok: false,
      error: "Server returned an invalid response. Restart with: npm start",
    };
  }
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatLeaveMessage(next) {
  const { minutesUntilLeave, minutesLate, leavePhase } = getLiveTiming(next);

  if (leavePhase === "late" || leavePhase === "missed") {
    if (minutesLate === 1) {
      return "You're 1 minute late — leave now";
    }
    if (minutesLate > 1) {
      return `You're ${minutesLate} minutes late — leave now`;
    }
    return "You should have left — hurry";
  }

  if (leavePhase === "now") {
    return "Leave now";
  }

  if (minutesUntilLeave === 1) {
    return "Leave in 1 minute";
  }

  return `Leave in ${minutesUntilLeave} minutes`;
}

function leaveAckStorageKey(next) {
  const journey = getActiveJourney();
  const departure = resolveTripDeparture(next);
  return `nextTrainLeaveAck:${journey?.id ?? "none"}:${departure ?? "unknown"}`;
}

function isLeaveAcknowledged(next) {
  if (!next) {
    return false;
  }
  return sessionStorage.getItem(leaveAckStorageKey(next)) === "1";
}

function acknowledgeLeave(next) {
  if (!next) {
    return;
  }
  sessionStorage.setItem(leaveAckStorageKey(next), "1");
  const journey = getActiveJourney();
  const departure = resolveTripDeparture(next);
  window.nextTrainLeaveReminders?.acknowledgeDeparture?.(journey?.id, departure);
  if (leaveAckBtn) {
    leaveAckBtn.hidden = true;
    leaveAckBtn.classList.remove("leave-ack-btn--visible");
  }
  if (lastApiData) {
    render(prepareDisplayData(lastApiData));
  }
}

async function maybeAutoAcknowledgeLeave(next) {
  if (!next || isLeaveAcknowledged(next)) {
    return;
  }

  const { leavePhase } = getLiveTiming(next);
  if (leavePhase !== "late" && leavePhase !== "missed") {
    return;
  }

  const departure = resolveTripDeparture(next);
  if (!departure || leaveAutoCheckDeparture === departure) {
    return;
  }

  leaveAutoCheckDeparture = departure;

  const journey = getActiveJourney();
  if (!journey?.station || (!isNativeApp() && !navigator.geolocation)) {
    return;
  }

  try {
    const coords = await loadStationCoords();
    const stationPoint = coords[normalizeStation(journey.station)];
    if (!stationPoint) {
      return;
    }

    const position = await getAppGeolocationPosition({
      enableHighAccuracy: false,
      timeout: 6000,
      maximumAge: 60_000,
    });

    const distance = distanceKm(
      position.coords.latitude,
      position.coords.longitude,
      stationPoint.lat,
      stationPoint.lng
    );

    if (distance <= STATION_ARRIVAL_KM) {
      acknowledgeLeave(next);
      return;
    }

    if (typeof position.coords.speed === "number" && position.coords.speed >= TRAVELING_SPEED_MS) {
      acknowledgeLeave(next);
    }
  } catch {
    // Geolocation unavailable or denied — button still works.
  }
}

function formatLeaveCardLabel(leavePhase) {
  if (leavePhase === "late" || leavePhase === "missed") {
    return "You should have left";
  }
  if (leavePhase === "now") {
    return "Leave now";
  }
  return "Leave in";
}

function urgencyPhaseClass(leavePhase) {
  if (leavePhase === "missed") {
    return "late";
  }
  return leavePhase || "calm";
}

function updateLeaveCardState(leavePhase) {
  if (!leaveCardEl) {
    return;
  }

  leaveCardEl.classList.remove("calm", "soon", "urgent", "now", "late");
  leaveCardEl.classList.add(urgencyPhaseClass(leavePhase));
}

function setHeroUrgency(leavePhase) {
  if (!heroEl) {
    return;
  }

  const stale = heroEl.classList.contains("stale");
  heroEl.className = `hero ${urgencyPhaseClass(leavePhase)}`;
  if (stale) {
    heroEl.classList.add("stale");
  }
}

function formatScheduledLine(next) {
  const offset = Number(next.timingOffsetMinutes ?? 0);

  if (offset >= 2 && next.scheduledDisplayTime) {
    return `Scheduled ${next.scheduledDisplayTime}`;
  }

  if (offset <= -2) {
    return "Estimated";
  }

  return null;
}

function isOnTimeStatus(status) {
  return String(status || "")
    .toLowerCase()
    .includes("on time");
}

function renderStatusDisplay(next) {
  if (!statusEl) {
    return;
  }

  statusEl.classList.remove("has-scheduled");
  statusEl.replaceChildren();

  if (!next?.status) {
    statusEl.textContent = "—";
    setStatusClass(statusEl, "");
    return;
  }

  if (isOnTimeStatus(next.status) || !next.scheduledDisplayTime) {
    statusEl.textContent = next.status;
    setStatusClass(statusEl, next.status);
    return;
  }

  const statusMain = document.createElement("span");
  statusMain.className = "status-primary";
  statusMain.textContent = next.status;

  const statusScheduled = document.createElement("span");
  statusScheduled.className = "status-scheduled";
  statusScheduled.textContent = `Sched. ${next.scheduledDisplayTime}`;

  statusEl.append(statusMain, statusScheduled);
  statusEl.classList.add("has-scheduled");
  setStatusClass(statusEl, next.status);
}

function setStatusClass(element, statusText) {
  element.classList.remove("on-time", "delayed");
  const normalized = statusText.toLowerCase();
  if (normalized.includes("on time")) {
    element.classList.add("on-time");
  } else if (normalized.includes("delay") || normalized.includes("late")) {
    element.classList.add("delayed");
  }
}

function renderMinutesCountdown(element, minutes) {
  if (!element) {
    return;
  }

  if (minutes <= 0) {
    element.textContent = "Now";
    return;
  }

  const valueEl = document.createElement("span");
  valueEl.className = "depart-countdown-value";
  valueEl.textContent = String(minutes);

  const unitEl = document.createElement("span");
  unitEl.className = "depart-countdown-unit";
  unitEl.textContent = minutes === 1 ? "min" : "mins";

  element.replaceChildren(valueEl, unitEl);
}

function renderDepartureCountdown(element, next) {
  if (!element) {
    return;
  }

  renderMinutesCountdown(element, getLiveTiming(next).minutesUntilDeparture);
}

function renderLeaveMinutesCountdown(element, next) {
  if (!element) {
    return;
  }

  const { minutesUntilLeave, leavePhase } = getLiveTiming(next);
  if (leavePhase === "late" || leavePhase === "missed" || leavePhase === "now") {
    element.textContent = "Now";
    return;
  }

  renderMinutesCountdown(element, minutesUntilLeave);
}

function formatLeaveCardSubline(next) {
  const { leavePhase } = getLiveTiming(next);
  if (leavePhase === "late" || leavePhase === "missed") {
    return formatLeaveMessage(next);
  }

  return formatTime(next.leaveBy);
}

function hasSeenSwipeHint() {
  return localStorage.getItem(SWIPE_HINT_KEY) === "1";
}

function dismissLeaveHint() {
  localStorage.setItem(LEAVE_HINT_KEY, "1");
  if (leaveHintEl) {
    leaveHintEl.hidden = true;
  }
}

function updateLeaveBufferEditBtn() {
  if (!leaveBufferEditBtn) {
    return;
  }

  const journey = getActiveJourney();
  const visible =
    journeyUsesLeaveBefore(journey) &&
    leaveCardEl &&
    !leaveCardEl.hidden &&
    !heroEl?.classList.contains("hero-setup");

  leaveBufferEditBtn.hidden = !visible;
}

function highlightLeaveBeforeField() {
  if (!leaveBeforeField) {
    return;
  }

  leaveBeforeField.classList.remove("leave-before-field--highlight");
  void leaveBeforeField.offsetWidth;
  leaveBeforeField.classList.add("leave-before-field--highlight");

  const removeHighlight = () => {
    leaveBeforeField.classList.remove("leave-before-field--highlight");
    leaveBeforeField.removeEventListener("animationend", removeHighlight);
  };

  leaveBeforeField.addEventListener("animationend", removeHighlight);
  window.setTimeout(removeHighlight, 2400);
}

async function ensureSettingsDraftLoaded() {
  if (settingsDraftJourneys.length > 0) {
    return;
  }

  await populateJourneyListView();
}

function openLeaveBufferSettings() {
  dismissLeaveHint();
  const journey = getActiveJourney();
  if (!journey) {
    enterJourneyMode();
    openJourneys();
    return;
  }

  openJourneysDialogSync();

  ensureSettingsDraftLoaded()
    .then(() => populateJourneyDetailForm(journey.id))
    .then(() => {
      showSettingsDetailView();
      openJourneysDialogSync();

      requestAnimationFrame(() => {
        leaveBeforeField?.scrollIntoView({ behavior: "smooth", block: "center" });
        detailUseLeaveBeforeInput?.focus({ preventScroll: true });
        window.setTimeout(highlightLeaveBeforeField, 400);
      });
    });
}

function hasSeenLeaveHint() {
  return localStorage.getItem(LEAVE_HINT_KEY) === "1";
}

function updateLeaveHint() {
  const journey = getActiveJourney();
  const leavePhase = lastRenderedNext ? getLiveTiming(lastRenderedNext).leavePhase : null;
  const hideForLateState =
    leavePhase === "late" ||
    leavePhase === "missed" ||
    (lastRenderedNext && isLeaveAcknowledged(lastRenderedNext));

  if (
    !leaveHintEl ||
    !leaveBufferEditBtn ||
    !journeyUsesLeaveBefore(journey) ||
    hasSeenLeaveHint() ||
    hideForLateState ||
    heroEl?.classList.contains("hero-setup") ||
    leaveCardEl?.hidden
  ) {
    if (leaveHintEl) {
      leaveHintEl.hidden = true;
    }
  } else {
    leaveHintEl.hidden = false;
  }

  updateLeaveBufferEditBtn();
}

function dismissSwipeHint() {
  localStorage.setItem(SWIPE_HINT_KEY, "1");
  if (swipeHintEl) {
    swipeHintEl.hidden = true;
  }
}

function updateSwipeCues() {
  const showPrev = canSkipToEarlierTrain() && !heroEl?.classList.contains("hero-setup");
  const showNext = canSkipToNextTrain() && !heroEl?.classList.contains("hero-setup");

  if (heroSwipePrevEl) {
    heroSwipePrevEl.hidden = !showPrev;
  }
  if (heroSwipeNextEl) {
    heroSwipeNextEl.hidden = !showNext;
  }
}

function updateSwipeHint() {
  if (!swipeHintEl || hasSeenSwipeHint() || heroEl?.classList.contains("hero-setup")) {
    if (swipeHintEl) {
      swipeHintEl.hidden = true;
    }
  } else if (swipeHintEl) {
    swipeHintEl.hidden = false;
  }

  updateSwipeCues();
}

function resetHeroSwipePointer(event) {
  if (heroSwipePointerId === null) {
    return;
  }

  if (event && event.pointerId !== heroSwipePointerId) {
    return;
  }

  if (heroEl?.hasPointerCapture?.(heroSwipePointerId)) {
    try {
      heroEl.releasePointerCapture(heroSwipePointerId);
    } catch {
      // Ignore if capture was already released.
    }
  }

  heroSwipePointerId = null;
}

function handleHeroSwipeEnd(event) {
  if (heroEl.classList.contains("hero-setup")) {
    resetHeroSwipePointer(event);
    return;
  }

  if (heroSwipePointerId === null || event.pointerId !== heroSwipePointerId) {
    return;
  }

  const deltaX = event.clientX - swipeStartX;
  const deltaY = event.clientY - swipeStartY;
  resetHeroSwipePointer(event);

  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX < SWIPE_THRESHOLD_PX || absX <= absY) {
    return;
  }

  dismissSwipeHint();

  if (deltaX < 0) {
    skipToNextTrain();
  } else {
    skipToEarlierTrain();
  }
}

function initHeroSwipe() {
  if (!heroEl) {
    return;
  }

  heroEl.addEventListener(
    "pointerdown",
    (event) => {
      if (heroEl.classList.contains("hero-setup") || !event.isPrimary) {
        return;
      }

      swipeStartX = event.clientX;
      swipeStartY = event.clientY;
      heroSwipePointerId = event.pointerId;

      try {
        heroEl.setPointerCapture(event.pointerId);
      } catch {
        heroSwipePointerId = null;
      }
    },
    { passive: true }
  );

  heroEl.addEventListener("pointerup", handleHeroSwipeEnd);
  heroEl.addEventListener("pointercancel", handleHeroSwipeEnd);
  heroEl.addEventListener("lostpointercapture", (event) => {
    if (heroSwipePointerId === event.pointerId) {
      heroSwipePointerId = null;
    }
  });
}

function render(data, { stale = false } = {}) {
  lastLiveDisplayMinute = getPerthMinutesSinceMidnight();

  if (nearbyDirectionsEl) {
    nearbyDirectionsEl.hidden = true;
  }

  if (!stale) {
    errorEl.hidden = true;
  }
  clearHeroSetupState();
  heroEl?.classList.toggle("stale", stale);
  leaveCardEl?.classList.toggle("stale", stale);

  const { next, lastUpdated } = data;
  const journey = getActiveJourney();
  routeEl.textContent = journey ? formatJourneyRoute(journey) : "Set up a journey";
  updatedEl.textContent = stale
    ? "Update failed — times may be out of date"
    : lastUpdated
      ? `Updated ${lastUpdated}`
      : "Updated just now";

  if (!next) {
    lastRenderedNext = null;
    setHeroUrgency("calm");
    if (heroDepartLabelEl) {
      heroDepartLabelEl.textContent = "Next Train";
    }
    if (departCountdownEl) {
      departCountdownEl.textContent = "—";
    }
    if (departDisplayTimeEl) {
      departDisplayTimeEl.textContent = "No upcoming trains";
    }
    if (heroScheduledTimeEl) {
      heroScheduledTimeEl.hidden = true;
    }
    if (leaveCardEl) {
      leaveCardEl.hidden = true;
      leaveCardEl.classList.remove("leave-card--context");
    }
    if (leaveAckBtn) {
      leaveAckBtn.hidden = true;
    }
    platformEl.textContent = "—";
    statusEl.textContent = "—";
    followingSectionEl.hidden = true;
    updateSwipeHint();
    updateSwipeCues();
    updateLeaveHint();
    renderJourneySwitcher();
    return;
  }

  lastRenderedNext = next;
  const live = getLiveTiming(next);
  const leaveAcknowledged = isLeaveAcknowledged(next);
  const showLeaveCard = journeyUsesLeaveBefore(journey) && !leaveAcknowledged;
  const showLateNag =
    showLeaveCard && (live.leavePhase === "late" || live.leavePhase === "missed");

  setHeroUrgency("calm");
  if (heroDepartLabelEl) {
    heroDepartLabelEl.textContent = "Next Train";
  }
  if (departCountdownEl) {
    renderDepartureCountdown(departCountdownEl, next);
  }
  if (departDisplayTimeEl) {
    departDisplayTimeEl.textContent = next.displayTime;
  }

  const scheduledLine = formatScheduledLine(next);
  if (heroScheduledTimeEl) {
    if (scheduledLine) {
      heroScheduledTimeEl.textContent = scheduledLine;
      heroScheduledTimeEl.hidden = false;
    } else {
      heroScheduledTimeEl.hidden = true;
    }
  }

  if (leaveCardEl) {
    leaveCardEl.hidden = !showLeaveCard;
    leaveCardEl.classList.remove("leave-card--context", "leave-card--acknowledged");
  }

  if (showLeaveCard) {
    if (leaveCardLabelEl) {
      leaveCardLabelEl.textContent = formatLeaveCardLabel(live.leavePhase);
    }
    if (leaveTimeEl) {
      renderLeaveMinutesCountdown(leaveTimeEl, next);
    }
    if (leaveCountdownEl) {
      leaveCountdownEl.textContent = formatLeaveCardSubline(next);
    }
    updateLeaveCardState(live.leavePhase);
  }

  if (leaveAckBtn) {
    leaveAckBtn.hidden = !showLateNag;
    leaveAckBtn.classList.toggle("leave-ack-btn--visible", showLateNag);
  }

  if (showLateNag) {
    maybeAutoAcknowledgeLeave(next);
  }

  platformEl.textContent = next.platform;
  renderStatusDisplay(next);

  renderThenTrains(lastApiData ?? data);

  updateSwipeHint();
  updateSwipeCues();
  updateLeaveHint();
  renderJourneySwitcher();
}

function renderRefreshErrorState() {
  clearHeroSetupState();
  heroEl?.classList.remove("stale");
  leaveCardEl?.classList.remove("stale");

  const journey = getActiveJourney();
  routeEl.textContent = journey ? formatJourneyRoute(journey) : "Set up a journey";
  updatedEl.textContent = "Update failed";
  setHeroUrgency("calm");
  if (heroDepartLabelEl) {
    heroDepartLabelEl.textContent = "Next Train";
  }
  if (departCountdownEl) {
    departCountdownEl.textContent = "—";
  }
  if (departDisplayTimeEl) {
    departDisplayTimeEl.textContent = "Couldn't refresh times";
  }
  if (heroScheduledTimeEl) {
    heroScheduledTimeEl.hidden = true;
  }
  if (leaveCardEl) {
    leaveCardEl.hidden = true;
    leaveCardEl.classList.remove("leave-card--context");
  }
  platformEl.textContent = "—";
  statusEl.textContent = "—";
  followingSectionEl.hidden = true;
  updateSwipeHint();
  updateSwipeCues();
  updateLeaveHint();
  renderJourneySwitcher();
}

function clearHeroSetupState() {
  if (!heroEl) {
    return;
  }

  heroEl.classList.remove("hero-setup");
  heroEl.removeAttribute("role");
  heroEl.removeAttribute("tabindex");
  heroEl.removeAttribute("aria-label");
  heroEl.onclick = null;
  heroEl.onkeydown = null;

  if (heroDepartLabelEl) {
    heroDepartLabelEl.hidden = false;
  }
  if (departCountdownEl) {
    departCountdownEl.hidden = false;
    departCountdownEl.classList.remove("hero-setup-message");
    departCountdownEl.textContent = "—";
  }
  if (heroEmptyStateEl) {
    heroEmptyStateEl.hidden = true;
  }
  if (departDisplayTimeEl) {
    departDisplayTimeEl.hidden = false;
  }
  if (heroScheduledTimeEl) {
    heroScheduledTimeEl.hidden = false;
  }
  if (leaveCardEl) {
    leaveCardEl.hidden = false;
    leaveCardEl.classList.remove("leave-card--context");
  }
  if (updatedEl) {
    updatedEl.hidden = false;
  }
}

function enterJourneyMode() {
  dismissLeaveHint();
  closeJourneySwitcherMenu();

  if (journeyModeActive) {
    openJourneys();
    return;
  }

  journeyModeActive = true;
  exitNearbyMode();
  syncChromeMode();

  if (!hasConfiguredCommute()) {
    renderJourneyEmptyState();
    return;
  }

  const journey = getActiveJourney();
  if (journey) {
    setManualJourneyOverride(journey.id);
  }

  clearHeroSetupState();
  maybeAutoSelectJourney();
  skipTrains = readSkipState().count;
  renderJourneySwitcher();
  fetchNextTrain();
}

function renderJourneyEmptyState() {
  journeyModeActive = true;
  exitNearbyMode();
  syncChromeMode();

  errorEl.hidden = true;
  routeEl.textContent = "Journeys";
  updatedEl.textContent = "";
  updatedEl.hidden = true;
  setHeroUrgency("calm");
  heroEl.classList.add("hero-setup");
  if (heroDepartLabelEl) {
    heroDepartLabelEl.hidden = true;
  }
  if (departDisplayTimeEl) {
    departDisplayTimeEl.hidden = true;
  }
  if (heroScheduledTimeEl) {
    heroScheduledTimeEl.hidden = true;
  }
  if (leaveCardEl) {
    leaveCardEl.hidden = true;
    leaveCardEl.classList.remove("leave-card--context");
  }
  if (nearbyDirectionsEl) {
    nearbyDirectionsEl.hidden = true;
  }

  if (departCountdownEl) {
    departCountdownEl.hidden = true;
    departCountdownEl.classList.remove("hero-setup-message");
  }
  if (heroEmptyStateEl) {
    heroEmptyStateEl.hidden = false;
  }

  heroEl.removeAttribute("role");
  heroEl.removeAttribute("tabindex");
  heroEl.removeAttribute("aria-label");
  heroEl.onclick = null;
  heroEl.onkeydown = null;
  platformEl.textContent = "—";
  statusEl.textContent = "—";
  followingSectionEl.hidden = true;
  if (journeySwitcherEl) {
    journeySwitcherEl.hidden = true;
  }
  if (journeySwitcherMenuEl) {
    journeySwitcherMenuEl.hidden = true;
  }
  updateSwipeHint();
  updateSwipeCues();
  updateLeaveHint();
  renderJourneySwitcher();
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function loadStationCoords() {
  if (stationCoords) {
    return stationCoords;
  }

  try {
    stationCoords = await fetchLocalJson("/station-coords.json");
  } catch (error) {
    console.warn("Could not load station-coords.json", error);
    stationCoords = {};
  }

  return stationCoords;
}

async function pickPerthDirection(station) {
  const directions = await fetchDirectionsFromApi(station);
  const exact = directions.find(
    (direction) => normalizeDirection(direction) === DEFAULT_DIRECTION_LABEL
  );
  if (exact) {
    return normalizeDirection(exact);
  }

  const loose = directions.find((direction) =>
    normalizeDirection(direction).toLowerCase().includes("perth")
  );
  return loose ? normalizeDirection(loose) : null;
}

function isOutboundCommuteJourney(journey) {
  const name = String(journey?.name || "")
    .trim()
    .toLowerCase();
  return name.endsWith(" - out") || name === "to home";
}

function getInboundJourney(journeys = settings.journeys) {
  return journeys.find((journey) => !isOutboundCommuteJourney(journey)) ?? journeys[0] ?? null;
}

function markInitialJourneySetup() {
  deferJourneyAutoSelect = true;
}

async function pickOutboundDirection(nearestStation) {
  const normalizedNearest = normalizeStation(nearestStation);

  if (!PERTH_STATIONS.has(normalizedNearest)) {
    const fromSuburb = await fetchDirectionsFromApi(normalizedNearest);
    const suburbanOutbound = dedupeDirections(fromSuburb)
      .map(normalizeDirection)
      .find(
        (direction) =>
          direction !== DEFAULT_DIRECTION_LABEL &&
          !direction.toLowerCase().includes("perth")
      );
    if (suburbanOutbound) {
      return suburbanOutbound;
    }
  }

  const fromPerth = await fetchDirectionsFromApi(CANONICAL_PERTH_STATION);
  return (
    dedupeDirections(fromPerth)
      .map(normalizeDirection)
      .find(
        (direction) =>
          direction !== DEFAULT_DIRECTION_LABEL &&
          !direction.toLowerCase().includes("perth")
      ) ?? null
  );
}

async function configureInboundJourney(journey, nearestStation) {
  const station = normalizeStation(nearestStation);
  if (PERTH_STATIONS.has(station)) {
    return null;
  }

  const direction = await pickPerthDirection(station);
  if (!direction) {
    return null;
  }

  return normalizeJourney({
    ...journey,
    station,
    direction,
  });
}

/** Nearest suburban station + towards Perth — used for templates and first-open setup. */
async function applyDefaultJourneyRoute(journey) {
  if (!journey || !isUnconfiguredJourney(journey)) {
    return { configured: false, nearest: null, error: null, journey };
  }

  if (journey.station && !journey.direction) {
    const direction = await pickPerthDirection(journey.station);
    if (!direction) {
      return { configured: false, nearest: null, error: null, journey };
    }

    return {
      configured: true,
      nearest: null,
      error: null,
      journey: normalizeJourney({ ...journey, direction }),
    };
  }

  let nearest = null;
  try {
    nearest = await findNearestStation();
  } catch (error) {
    return { configured: false, nearest: null, error, journey };
  }

  const configured = await configureInboundJourney(journey, nearest.station);
  if (!configured) {
    return { configured: false, nearest, error: null, journey };
  }

  return { configured: true, nearest, error: null, journey: configured };
}

async function configureOutboundFromInbound(journey, inboundJourney) {
  if (!inboundJourney?.station || !inboundJourney?.direction) {
    return null;
  }

  const inboundStation = normalizeStation(inboundJourney.station);
  if (PERTH_STATIONS.has(inboundStation)) {
    return null;
  }

  const fromSuburb = await fetchDirectionsFromApi(inboundStation);
  const lineDirection = dedupeDirections(fromSuburb)
    .map(normalizeDirection)
    .find(
      (direction) =>
        direction.toLowerCase() !== inboundJourney.direction.toLowerCase() &&
        !direction.toLowerCase().includes("perth")
    );

  if (!lineDirection) {
    return null;
  }

  return normalizeJourney({
    ...journey,
    station: CANONICAL_PERTH_STATION,
    direction: lineDirection,
  });
}

async function configureOutboundJourney(journey, nearestStation, inboundJourney = null) {
  const fromInbound = await configureOutboundFromInbound(journey, inboundJourney);
  if (fromInbound) {
    return fromInbound;
  }

  const direction = await pickOutboundDirection(nearestStation);
  if (!direction) {
    return null;
  }

  return normalizeJourney({
    ...journey,
    station: CANONICAL_PERTH_STATION,
    direction,
  });
}

async function findNearestStation() {
  if (isTestMode()) {
    return { station: "Edgewater Stn", distanceKm: 0.2 };
  }

  if (nearbySession?.station) {
    return {
      station: nearbySession.station,
      distanceKm:
        typeof nearbySession.distanceKm === "number" ? nearbySession.distanceKm : 0,
    };
  }

  const coords = await loadStationCoords();
  const geoTimeoutMs = isNativeApp() ? 6000 : 15000;
  const position = await getAppGeolocationPosition({
    enableHighAccuracy: !isNativeApp(),
    timeout: geoTimeoutMs,
    maximumAge: 60000,
  });

  const { latitude, longitude } = position.coords;
  let nearest = null;
  let bestDistance = Infinity;

  for (const [name, point] of Object.entries(coords)) {
    const distance = distanceKm(latitude, longitude, point.lat, point.lng);
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = name;
    }
  }

  if (!nearest) {
    throw new Error("Could not find a nearby station");
  }

  return { station: nearest, distanceKm: bestDistance };
}

function isNearbyModeActive() {
  return !journeyModeActive;
}

function isJourneyModeActive() {
  return journeyModeActive;
}

function syncChromeMode() {
  const nearbyActive = isNearbyModeActive();
  const journeyActive = isJourneyModeActive();

  appEl?.classList.toggle("nearby-mode", nearbyActive && Boolean(nearbySession));
  appEl?.classList.toggle("journey-mode", journeyActive);

  nearbyChromeAction?.classList.toggle("chrome-action--active", nearbyActive);
  nearbyBtn?.classList.toggle("icon-btn--active", nearbyActive);
  nearbyBtn?.setAttribute("aria-pressed", nearbyActive ? "true" : "false");
  nearbyBtn?.setAttribute("aria-label", "Near me");

  journeysChromeAction?.classList.toggle("chrome-action--active", journeyActive);
  journeysBtn?.classList.toggle("icon-btn--active", journeyActive);
  journeysBtn?.setAttribute("aria-pressed", journeyActive ? "true" : "false");

  syncJourneyContextChrome();
}

function syncNearbyChrome() {
  syncChromeMode();
}

function formatNearbyRouteLine() {
  if (!nearbySession?.station) {
    return "Near you";
  }

  const label = formatStationLabel(nearbySession.station);
  if (typeof nearbySession.distanceKm === "number") {
    return `Near you · ${label} (${nearbySession.distanceKm.toFixed(1)} km)`;
  }
  return `Near you · ${label}`;
}

function getNearbySkip(direction) {
  return nearbySession?.skipByDirection?.[direction] ?? 0;
}

function setNearbySkip(direction, skip) {
  if (!nearbySession) {
    return;
  }

  if (!nearbySession.skipByDirection) {
    nearbySession.skipByDirection = {};
  }

  if (skip <= 0) {
    delete nearbySession.skipByDirection[direction];
  } else {
    nearbySession.skipByDirection[direction] = skip;
  }
}

function applyNearbySkip(data, skip) {
  if (!data || skip <= 0) {
    return data;
  }

  const normalized = normalizeApiTrainData(data);
  if (!normalized.upcoming?.length) {
    return normalized;
  }

  const cappedSkip = Math.min(skip, normalized.upcoming.length - 1);
  const referenceIso = normalized.next?.departure ?? normalized.next?.arrival;
  const next = ensureFullNext(normalized.upcoming[cappedSkip] ?? normalized.next, 0, referenceIso);
  const followingTrip = normalized.upcoming[cappedSkip + 1] ?? null;
  const following = getNextThenTrain(normalized, cappedSkip) ?? (followingTrip ? slimFollowing(followingTrip) : null);

  return {
    ...normalized,
    next,
    following,
  };
}

async function fetchNearbyDirectionData(station, direction, skip = 0) {
  const params = new URLSearchParams({
    station,
    direction,
    destination: direction,
    leaveBefore: "0",
    refresh: String(settings.refreshSeconds),
    skipTrains: String(skip),
  });

  const fixture = getActiveFixture();
  if (fixture) {
    params.set("fixture", fixture);
  }

  const result = await fetchJson(apiUrl(`/api/next-train?${params}`));
  if (!result.ok) {
    throw new Error(result.data?.error ?? result.error ?? "Could not load train times");
  }

  let payload = result.data;
  if (!Array.isArray(payload?.upcoming) || payload.upcoming.length === 0) {
    const client = window.NextTrainTimes;
    if (client?.getNextTrainData) {
      try {
        payload =
          (await client.getNextTrainData({
            station,
            destination: direction,
            destinationLabel: direction,
            leaveBeforeMinutes: 0,
            refreshSeconds: settings.refreshSeconds,
            skipTrains: skip,
          })) ?? payload;
      } catch (error) {
        console.warn("Nearby live-times fallback failed", error);
      }
    }
  }

  return applyNearbySkip(normalizeApiTrainData(payload), skip);
}

function pickSoonestNearbyDirection(entries) {
  let best = null;

  for (const entry of entries) {
    if (!entry.data?.next) {
      continue;
    }

    const minutes = getLiveTiming(entry.data.next).minutesUntilDeparture;
    if (!best || minutes < best.minutes) {
      best = { direction: entry.direction, minutes };
    }
  }

  return best?.direction ?? entries[0]?.direction ?? null;
}

function getNearbyFocusedEntry() {
  if (!nearbyBoard?.entries?.length) {
    return null;
  }

  const focused = nearbySession?.focusedDirection;
  const match = nearbyBoard.entries.find((entry) => entry.direction === focused);
  return match ?? nearbyBoard.entries.find((entry) => entry.data?.next) ?? nearbyBoard.entries[0];
}

function formatNearbyDirectionRow(entry) {
  const next = entry.data?.next;
  if (!next) {
    return `to ${entry.direction} · —`;
  }

  const minutes = getLiveTiming(next).minutesUntilDeparture;
  const minuteLabel = minutes <= 0 ? "now" : minutes === 1 ? "1 min" : `${minutes} min`;
  const platform = next.platform ? `Pl ${next.platform}` : "—";
  return `to ${entry.direction} · ${minuteLabel} · ${platform}`;
}

async function ensureNearbyStationOptions() {
  if (!nearbyStationSelect) {
    return;
  }

  await getStationsList();
  renderStationOptions(nearbyStationSelect, nearbySession?.station ?? "");
}

function showNearbyFallback(message) {
  nearbyError = message;
  nearbyDirectionsEl.hidden = false;
  nearbyDirectionsListEl.innerHTML = "";
  nearbyFallbackEl.hidden = false;
  if (nearbyFallbackTextEl) {
    nearbyFallbackTextEl.textContent = message;
  }
  ensureNearbyStationOptions();
}

function renderNearbyDirectionsList() {
  if (!nearbyDirectionsListEl || !nearbyBoard?.entries?.length) {
    return;
  }

  nearbyFallbackEl.hidden = true;
  nearbyDirectionsListEl.innerHTML = "";
  const focused = nearbySession?.focusedDirection;

  for (const entry of nearbyBoard.entries) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nearby-direction-row";
    if (entry.direction === focused) {
      button.classList.add("active");
    }
    button.textContent = formatNearbyDirectionRow(entry);
    button.addEventListener("click", () => {
      focusNearbyDirection(entry.direction);
    });
    item.appendChild(button);
    nearbyDirectionsListEl.appendChild(item);
  }
}

function renderNearbyBoard({ stale = false } = {}) {
  if (!isNearbyModeActive()) {
    return;
  }

  syncNearbyChrome();
  errorEl.hidden = true;
  clearHeroSetupState();

  if (nearbyLoading) {
    routeEl.textContent = "Finding nearest station…";
    setHeroUrgency("calm");
    if (heroDepartLabelEl) {
      heroDepartLabelEl.textContent = "Next Train";
    }
    if (departCountdownEl) {
      departCountdownEl.textContent = "—";
    }
    if (departDisplayTimeEl) {
      departDisplayTimeEl.textContent = "Locating you";
    }
    if (heroScheduledTimeEl) {
      heroScheduledTimeEl.hidden = true;
    }
    if (leaveCardEl) {
      leaveCardEl.hidden = true;
    }
    nearbyDirectionsEl.hidden = true;
    followingSectionEl.hidden = true;
    updatedEl.textContent = "Updating…";
    updateSwipeHint();
    updateSwipeCues();
    return;
  }

  if (nearbyError) {
    routeEl.textContent = formatNearbyRouteLine();
    setHeroUrgency("calm");
    if (heroDepartLabelEl) {
      heroDepartLabelEl.textContent = "Near me";
    }
    if (departCountdownEl) {
      departCountdownEl.textContent = "—";
    }
    if (departDisplayTimeEl) {
      departDisplayTimeEl.textContent = "Location needed";
    }
    if (heroScheduledTimeEl) {
      heroScheduledTimeEl.hidden = true;
    }
    if (leaveCardEl) {
      leaveCardEl.hidden = true;
    }
    showNearbyFallback(nearbyError);
    platformEl.textContent = "—";
    statusEl.textContent = "—";
    followingSectionEl.hidden = true;
    updatedEl.textContent = stale ? "Update failed — times may be out of date" : "Choose a station below";
    updateSwipeHint();
    updateSwipeCues();
    maybeScheduleOnboarding();
    return;
  }

  const focusedEntry = getNearbyFocusedEntry();
  const next = focusedEntry?.data?.next ?? null;
  routeEl.textContent = formatNearbyRouteLine();
  updatedEl.textContent = stale
    ? "Update failed — times may be out of date"
    : nearbyBoard?.lastUpdated
      ? `Updated ${nearbyBoard.lastUpdated}`
      : "Updated just now";

  if (!next) {
    setHeroUrgency("calm");
    if (heroDepartLabelEl) {
      heroDepartLabelEl.textContent = "Next Train";
    }
    if (departCountdownEl) {
      departCountdownEl.textContent = "—";
    }
    if (departDisplayTimeEl) {
      departDisplayTimeEl.textContent = "No upcoming trains";
    }
    if (heroScheduledTimeEl) {
      heroScheduledTimeEl.hidden = true;
    }
    platformEl.textContent = "—";
    statusEl.textContent = "—";
    followingSectionEl.hidden = true;
    nearbyDirectionsEl.hidden = false;
    renderNearbyDirectionsList();
    updateSwipeHint();
    updateSwipeCues();
    maybeScheduleOnboarding();
    return;
  }

  lastRenderedNext = next;
  setHeroUrgency("calm");
  heroEl?.classList.toggle("stale", stale);
  leaveCardEl.hidden = true;

  if (heroDepartLabelEl) {
    heroDepartLabelEl.textContent = "Next Train";
  }
  if (departCountdownEl) {
    renderDepartureCountdown(departCountdownEl, next);
  }
  if (departDisplayTimeEl) {
    departDisplayTimeEl.textContent = `${next.displayTime} · towards ${focusedEntry.direction}`;
  }

  const scheduledLine = formatScheduledLine(next);
  if (heroScheduledTimeEl) {
    if (scheduledLine) {
      heroScheduledTimeEl.textContent = scheduledLine;
      heroScheduledTimeEl.hidden = false;
    } else {
      heroScheduledTimeEl.hidden = true;
    }
  }

  platformEl.textContent = next.platform;
  renderStatusDisplay(next);
  renderThenTrains(focusedEntry.data);
  nearbyDirectionsEl.hidden = false;
  renderNearbyDirectionsList();
  updateSwipeHint();
  updateSwipeCues();
  maybeScheduleOnboarding();
}

async function fetchNearbyBoard() {
  if (!nearbySession?.station) {
    return;
  }

  const directions = await fetchDirectionsFromApi(nearbySession.station);
  const entries = [];

  for (const direction of directions) {
    try {
      const data = await fetchNearbyDirectionData(
        nearbySession.station,
        direction,
        getNearbySkip(direction)
      );
      entries.push({ direction, data });
    } catch (error) {
      console.warn(`Nearby fetch failed for ${direction}`, error);
    }
  }

  if (!entries.length) {
    throw new Error("Could not load departures for this station");
  }

  if (!nearbySession.focusedDirection || !entries.some((entry) => entry.direction === nearbySession.focusedDirection)) {
    nearbySession.focusedDirection = pickSoonestNearbyDirection(entries);
  }

  nearbyBoard = {
    lastUpdated: new Date().toLocaleString("en-AU", {
      timeZone: "Australia/Perth",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    entries,
  };
}

function focusNearbyDirection(direction) {
  if (!nearbySession || nearbySession.focusedDirection === direction) {
    return;
  }

  nearbySession.focusedDirection = direction;
  renderNearbyBoard();
}

async function enterNearbyMode({ station: manualStation, distanceKm = null } = {}) {
  journeyModeActive = false;
  clearManualJourneyOverride();
  dismissLeaveHint();
  closeJourneySwitcherMenu();
  nearbySession = {
    station: manualStation ?? null,
    distanceKm,
    focusedDirection: null,
    skipByDirection: {},
  };
  nearbyBoard = null;
  nearbyError = null;
  nearbyLoading = !manualStation;
  syncNearbyChrome();
  renderNearbyBoard();

  try {
    if (!manualStation) {
      const nearest = await findNearestStation();
      nearbySession.station = nearest.station;
      nearbySession.distanceKm = nearest.distanceKm;
    }

    nearbyLoading = false;
    await fetchNearbyBoard();
    nearbyError = null;
    renderNearbyBoard();
  } catch (error) {
    nearbyLoading = false;
    if (!nearbySession.station) {
      nearbyError =
        error.code === 1
          ? "Location permission is needed for Near me. Choose a station below instead."
          : (error.message ?? "Could not find a nearby station");
      renderNearbyBoard();
      return;
    }

    errorEl.textContent = error.message;
    errorEl.hidden = false;
    renderNearbyBoard({ stale: true });
  }
}

function exitNearbyMode() {
  nearbySession = null;
  nearbyBoard = null;
  nearbyLoading = false;
  nearbyError = null;
  syncNearbyChrome();
  if (nearbyDirectionsEl) {
    nearbyDirectionsEl.hidden = true;
  }
  if (nearbyFallbackEl) {
    nearbyFallbackEl.hidden = true;
  }
  if (nearbyDirectionsListEl) {
    nearbyDirectionsListEl.innerHTML = "";
  }
}

async function fetchNextTrainFromLiveTimesClient() {
  const client = window.NextTrainTimes;
  if (!client?.getNextTrainData) {
    return null;
  }

  const journey = getActiveJourney();
  if (!journey?.station || !journey?.direction) {
    return null;
  }

  try {
    return await client.getNextTrainData({
      station: journey.station,
      destination: journey.direction,
      destinationLabel: journey.direction,
      leaveBeforeMinutes: getEffectiveLeaveBeforeMinutes(journey),
      refreshSeconds: settings.refreshSeconds,
      skipTrains: 0,
    });
  } catch (error) {
    console.warn("Live times client fallback failed", error);
    return null;
  }
}

async function resolveNextTrainPayload(apiData) {
  if (Array.isArray(apiData?.upcoming) && apiData.upcoming.length > 0) {
    return apiData;
  }

  const clientData = await fetchNextTrainFromLiveTimesClient();
  return clientData ?? apiData;
}

async function fetchNextTrain() {
  if (!isNearbyModeActive() && !journeyModeActive && shouldDefaultToNearby()) {
    await applyCommuteMode();
    return;
  }

  if (isNearbyModeActive()) {
    try {
      await fetchNearbyBoard();
      renderNearbyBoard();
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
      renderNearbyBoard({ stale: true });
    }
    return;
  }

  if (!hasConfiguredCommute()) {
    renderJourneyEmptyState();
    return;
  }

  clearHeroSetupState();
  maybeAutoSelectJourney();

  try {
    const result = await fetchJson(apiUrl(`/api/next-train?${buildApiParams()}`));

    if (!result.ok) {
      throw new Error(result.data?.error ?? result.error ?? "Could not load train times");
    }

    const payload = await resolveNextTrainPayload(result.data);
    lastApiData = normalizeApiTrainData(payload);
    render(prepareDisplayData(lastApiData));
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.hidden = false;

    if (lastApiData?.next) {
      render(prepareDisplayData(lastApiData), { stale: true });
    } else {
      renderRefreshErrorState();
    }
  }
}

function refreshLiveDisplay(force = false) {
  if (isNearbyModeActive()) {
    const minute = getPerthMinutesSinceMidnight();
    if (!force && minute === lastLiveDisplayMinute) {
      return;
    }

    lastLiveDisplayMinute = minute;
    renderNearbyBoard();
    return;
  }

  if (!lastApiData) {
    return;
  }

  const minute = getPerthMinutesSinceMidnight();
  if (!force && minute === lastLiveDisplayMinute) {
    return;
  }

  lastLiveDisplayMinute = minute;
  render(prepareDisplayData(lastApiData));
}

function scheduleLiveDisplayRefresh() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }

  lastLiveDisplayMinute = getPerthMinutesSinceMidnight();
  countdownTimer = setInterval(() => refreshLiveDisplay(), 1000);
}

function scheduleRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  refreshTimer = setInterval(fetchNextTrain, refreshSeconds * 1000);
  scheduleLiveDisplayRefresh();
}

async function fetchLocalJson(path, timeoutMs = 4000) {
  const fetchPromise = (async () => {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load ${path}`);
    }
    return await response.json();
  })();

  const timeoutPromise = new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error(`Timed out loading ${path}`)), timeoutMs);
  });

  return Promise.race([fetchPromise, timeoutPromise]);
}

async function getStationsList() {
  if (stationsCache) {
    return stationsCache;
  }

  try {
    stationsCache = collapseStationList(await fetchLocalJson("/stations.json"));
  } catch (error) {
    console.warn("Could not load stations.json", error);
    stationsCache = collapseStationList([
      "Edgewater Stn",
      "Joondalup Stn",
      "Perth Underground Stn",
      "Mandurah Stn",
    ]);
  }

  return stationsCache;
}

function renderStationOptions(selectEl, selectedStation) {
  const stations = stationsCache ?? [];
  const parts = [
    `<option value="" disabled${selectedStation ? "" : " selected"}>Choose station…</option>`,
  ];

  for (const name of stations) {
    const label = formatStationLabel(name);
    const selected = name === selectedStation ? " selected" : "";
    parts.push(`<option value="${name}"${selected}>${label}</option>`);
  }

  selectEl.innerHTML = parts.join("");
}

async function fetchDirectionsFromApi(station) {
  const query = appendFixtureQuery(`station=${encodeURIComponent(station)}`);
  const primary = await fetchJson(apiUrl(`/api/directions?${query}`));

  if (primary.ok && Array.isArray(primary.data.directions)) {
    return primary.data.directions;
  }

  const fallback = await fetchJson(apiUrl(`/api/destinations?${query}`));
  if (fallback.ok && Array.isArray(fallback.data.destinations)) {
    return fallback.data.destinations;
  }

  throw new Error(
    primary.data?.error ??
      fallback.data?.error ??
      primary.error ??
      "Could not load directions"
  );
}

async function loadDirectionsForSelect(selectEl, station, preferredDirection) {
  const requestId = ++directionsRequestId;

  if (!station) {
    selectEl.innerHTML = '<option value="">Choose station first</option>';
    selectEl.disabled = true;
    return;
  }

  selectEl.innerHTML = "<option value=\"\">Loading…</option>";
  selectEl.disabled = true;

  try {
    const stationsToQuery = PERTH_STATIONS.has(station)
      ? PERTH_API_STATIONS
      : [station];

    const directionLists = await Promise.all(
      stationsToQuery.map((name) => fetchDirectionsFromApi(name))
    );

    if (requestId !== directionsRequestId) {
      return;
    }

    const directions = dedupeDirections(directionLists.flat());
    selectEl.innerHTML = directions
      .map((dir) => `<option value="${dir}">${dir}</option>`)
      .join("");

    const normalizedPreferred = normalizeDirection(preferredDirection);
    if (normalizedPreferred && directions.includes(normalizedPreferred)) {
      selectEl.value = normalizedPreferred;
    }
  } catch (error) {
    if (requestId !== directionsRequestId) {
      return;
    }
    selectEl.innerHTML = `<option value="">${error.message}</option>`;
  }

  if (requestId === directionsRequestId) {
    selectEl.disabled = false;
  }
}

function openJourneysDialogSync() {
  if (!journeysDialog || isJourneysDialogOpen()) {
    return;
  }

  const backdrop = document.getElementById("journeys-dialog-backdrop");
  if (backdrop) {
    backdrop.hidden = false;
  }

  journeysDialog.hidden = false;
  document.body.classList.add("app-dialog-open");
}

function closeJourneysSheet() {
  const backdrop = document.getElementById("journeys-dialog-backdrop");
  if (backdrop) {
    backdrop.hidden = true;
  }

  if (journeysDialog) {
    journeysDialog.hidden = true;
  }

  if (
    !isJourneysDialogOpen() &&
    !document.querySelector("dialog[open], .app-native-dialog[open]")
  ) {
    document.body.classList.remove("app-dialog-open");
  }
}

function showSettingsListView() {
  settingsListView.hidden = false;
  settingsDetailView.hidden = true;
  editingJourneyId = null;
  editingJourneySnapshot = null;
  updateJourneyTemplatesVisibility();
}

function showSettingsDetailView() {
  settingsListView.hidden = true;
  settingsDetailView.hidden = false;
}

function cancelJourneyDetailEdit() {
  if (settingsDraftJourneys.length === 0) {
    reloadSettingsDraftFromStorage();
  }

  if (editingJourneyId && editingJourneySnapshot) {
    if (isUnconfiguredJourney(editingJourneySnapshot)) {
      // Abandoned create — drop the shell; don't keep "Set up…" rows.
      settingsDraftJourneys = settingsDraftJourneys.filter(
        (journey) => journey.id !== editingJourneyId
      );
    } else {
      const index = settingsDraftJourneys.findIndex((journey) => journey.id === editingJourneyId);
      if (index >= 0) {
        settingsDraftJourneys[index] = editingJourneySnapshot;
      } else {
        settingsDraftJourneys.push(editingJourneySnapshot);
      }
    }
  } else if (editingJourneyId) {
    const draft = settingsDraftJourneys.find((journey) => journey.id === editingJourneyId);
    if (draft && isUnconfiguredJourney(draft)) {
      settingsDraftJourneys = settingsDraftJourneys.filter(
        (journey) => journey.id !== editingJourneyId
      );
    }
  }

  editingJourneySnapshot = null;
  editingJourneyId = null;
  renderJourneyListView();
  showSettingsListView();
}

function commitActiveJourneyNameEdit() {
  if (!activeJourneyNameEdit) {
    return;
  }

  const session = activeJourneyNameEdit;
  activeJourneyNameEdit = null;
  session.finish();
}

function startJourneyNameEdit(nameEl, journey, openBtn, renameBtn) {
  commitActiveJourneyNameEdit();

  if (nameEl.dataset.editing === "true") {
    return;
  }

  nameEl.dataset.editing = "true";
  if (openBtn) {
    openBtn.disabled = true;
  }
  if (renameBtn) {
    renameBtn.disabled = true;
  }

  const input = document.createElement("input");
  input.type = "text";
  input.className = "journey-list-name-input";
  input.maxLength = 24;
  input.value = journey.name;
  input.setAttribute("aria-label", "Journey name");

  let finished = false;
  const finish = () => {
    if (finished) {
      return;
    }
    finished = true;

    if (activeJourneyNameEdit?.input === input) {
      activeJourneyNameEdit = null;
    }

    journey.name = input.value.trim() || journey.name;
    nameEl.textContent = journey.name;
    nameEl.dataset.editing = "false";
    if (openBtn) {
      openBtn.disabled = false;
    }
    if (renameBtn) {
      renameBtn.disabled = false;
    }
    if (input.isConnected) {
      input.remove();
    }
    nameEl.hidden = false;
    saveJourneyListToSettings();
  };

  activeJourneyNameEdit = { input, finish };

  nameEl.hidden = true;
  nameEl.parentNode.insertBefore(input, nameEl.nextSibling);
  input.focus();
  input.select();

  input.addEventListener("blur", finish, { once: true });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    }
    if (event.key === "Escape") {
      input.value = journey.name;
      input.blur();
    }
  });
}

let templateWizardStep = 1;
let templateWizardContext = null;

function syncTemplateWizardCoachPosition() {
  const card = templateRouteCoach?.querySelector(".onboarding-coach-card");
  if (!card || !templateRouteCoach || templateRouteCoach.hidden) {
    return;
  }

  const target =
    templateWizardStep === 1
      ? detailRouteSection
      : templateWizardStep === 2
        ? leaveBeforeField
        : templateWizardStep === 3
          ? detailJourneyWindow
          : null;

  if (!target) {
    return;
  }

  const coachRect = templateRouteCoach.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const cardHeight = card.offsetHeight;
  const gap = 10;
  const padding = 12;

  let top = targetRect.top - coachRect.top - cardHeight - gap;
  if (top < padding) {
    top = targetRect.bottom - coachRect.top + gap;
  }

  const maxTop = coachRect.height - cardHeight - padding;
  top = Math.max(padding, Math.min(top, maxTop));

  card.style.top = `${top}px`;
  card.style.bottom = "auto";
  card.style.left = "50%";
  card.style.right = "auto";
  card.style.transform = "translateX(-50%)";
}

function clearTemplateWizardCoachPosition() {
  const card = templateRouteCoach?.querySelector(".onboarding-coach-card");
  if (!card) {
    return;
  }

  card.style.removeProperty("top");
  card.style.removeProperty("bottom");
  card.style.removeProperty("left");
  card.style.removeProperty("right");
  card.style.removeProperty("transform");
}

function syncTemplateWizardHighlight(step = templateWizardStep) {
  detailRouteSection?.classList.remove("template-wizard-highlight");
  leaveBeforeField?.classList.remove("template-wizard-highlight");
  detailJourneyWindow?.classList.remove("template-wizard-highlight");

  const target =
    step === 1 ? detailRouteSection : step === 2 ? leaveBeforeField : step === 3 ? detailJourneyWindow : null;
  if (target) {
    target.classList.add("template-wizard-highlight");
    window.requestAnimationFrame(() => {
      target.scrollIntoView({
        block: step === 3 ? "center" : "nearest",
        behavior: "smooth",
      });
      window.setTimeout(() => syncTemplateWizardCoachPosition(), 320);
    });
  }
}

function syncTemplateWizardChrome() {
  const active = Boolean(templateRouteCoach && !templateRouteCoach.hidden);
  journeysDialog?.classList.toggle("template-wizard-active", active);

  if (!templateRouteCoach) {
    return;
  }

  templateRouteCoach.classList.remove(
    "template-route-coach--step-1",
    "template-route-coach--step-2",
    "template-route-coach--step-3"
  );
  if (active) {
    templateRouteCoach.classList.add(`template-route-coach--step-${templateWizardStep}`);
    window.requestAnimationFrame(() => syncTemplateWizardCoachPosition());
  }
}

function renderTemplateWizardStep() {
  if (templateWizardStep1) {
    templateWizardStep1.hidden = templateWizardStep !== 1;
  }
  if (templateWizardStep2) {
    templateWizardStep2.hidden = templateWizardStep !== 2;
  }
  if (templateWizardStep3) {
    templateWizardStep3.hidden = templateWizardStep !== 3;
  }

  if (templateRouteCoach) {
    templateRouteCoach.setAttribute(
      "aria-labelledby",
      `template-wizard-step-${templateWizardStep}-title`
    );
  }

  if (templateWizardPrimaryBtn) {
    templateWizardPrimaryBtn.textContent = templateWizardStep === 3 ? "Got it" : "Next";
  }

  syncTemplateWizardHighlight();
  syncTemplateWizardChrome();
}

function dismissTemplateRouteCoach() {
  if (templateRouteCoach) {
    templateRouteCoach.hidden = true;
  }
  clearTemplateWizardCoachPosition();
  templateWizardStep = 1;
  templateWizardContext = null;
  syncTemplateWizardHighlight(0);
  syncTemplateWizardChrome();
}

function advanceTemplateWizard() {
  if (templateWizardStep < 3) {
    templateWizardStep += 1;
    renderTemplateWizardStep();
    return;
  }

  dismissTemplateRouteCoach();
}

function showTemplateRouteCoach({ templateKey, journey, nearest, configured, error }) {
  if (!templateRouteCoach || !templateRouteCoachBody) {
    return;
  }

  templateWizardContext = { templateKey, journey, nearest, configured, error };
  templateWizardStep = 1;

  const step1Title = document.getElementById("template-wizard-step-1-title");
  if (step1Title) {
    step1Title.textContent =
      templateKey === "custom" ? "Pick your route" : "Route picked for you";
  }

  const templateLabel =
    templateKey === "evening"
      ? "Evening home"
      : templateKey === "custom"
        ? "custom journey"
        : "Morning into town";

  if (templateKey === "custom") {
    templateRouteCoachBody.textContent =
      "Pick your station and direction above. You can tap Use nearest station for a shortcut.";
  } else if (configured && journey?.station && journey?.direction) {
    const station = formatStationLabel(journey.station);
    const distance =
      typeof nearest?.distanceKm === "number"
        ? ` (${nearest.distanceKm.toFixed(1)} km)`
        : "";
    templateRouteCoachBody.textContent = `For ${templateLabel.toLowerCase()} we defaulted to your nearest station ${station}${distance} → ${journey.direction}. Change station or direction above.`;
  } else if (error?.code === 1) {
    templateRouteCoachBody.textContent =
      "Location permission was denied, so we couldn't pick your nearest station. Choose your station and direction — you can tap Use nearest station if you change your mind.";
  } else if (templateKey === "morning" && nearest?.station && PERTH_STATIONS.has(normalizeStation(nearest.station))) {
    templateRouteCoachBody.textContent =
      "You're near the city centre, so we couldn't guess a suburban departure station. Pick your station and direction — morning trips are usually from your local station towards Perth.";
  } else {
    templateRouteCoachBody.textContent =
      "We couldn't auto-fill your route just now. Pick your station and direction — you can tap Use nearest station for a shortcut.";
  }

  if (templateWizardHoursBody) {
    if (templateKey === "custom") {
      templateWizardHoursBody.textContent =
        "Optional: limit when this journey appears on your home screen (e.g. weekday mornings).";
    } else {
      const windowLabel = formatJourneyDefaultWindow(journey);
      const period = templateKey === "evening" ? "evenings" : "mornings";
      const example =
        windowLabel && windowLabel !== "Not set" ? ` — e.g. ${period} ${windowLabel}` : "";
      templateWizardHoursBody.textContent = `This journey shows on your screen during these hours${example}.`;
    }
  }

  renderTemplateWizardStep();
  templateRouteCoach.hidden = false;
  syncTemplateWizardChrome();
  window.requestAnimationFrame(() => syncTemplateWizardCoachPosition());
}

async function applyTemplateRoute(journey, templateKey) {
  if (templateKey === "morning") {
    return applyDefaultJourneyRoute(journey);
  }

  if (templateKey !== "evening") {
    return { configured: false, nearest: null, error: null };
  }

  let nearest = null;
  try {
    nearest = await findNearestStation();
  } catch (error) {
    return { configured: false, nearest: null, error };
  }

  const inbound = getInboundJourney(
    settingsDraftJourneys.filter((entry) => entry.id !== journey.id)
  );
  const configured = await configureOutboundJourney(journey, nearest.station, inbound);

  if (!configured) {
    return { configured: false, nearest, error: null };
  }

  return { configured: true, journey: configured, nearest, error: null };
}

const JOURNEY_TEMPLATE_PRESETS = {
  morning: {
    name: "Morning into town",
    defaultFrom: "06:00",
    defaultUntil: "09:00",
    preferredTrainTime: "07:20",
    remindDays: [1, 2, 3, 4, 5],
    remindMe: true,
  },
  evening: {
    name: "Evening home",
    defaultFrom: "15:00",
    defaultUntil: "18:00",
    preferredTrainTime: "17:30",
    remindDays: [1, 2, 3, 4, 5],
    remindMe: true,
  },
};

function shouldAutoRouteJourney(journey) {
  if (!journey || !isUnconfiguredJourney(journey)) {
    return false;
  }

  if (journey.templateKey === "custom" || journey.autoRoute === false) {
    return false;
  }

  return true;
}

function findReusableTemplateJourney(templateKey) {
  const preset = JOURNEY_TEMPLATE_PRESETS[templateKey];
  if (!preset) {
    return null;
  }

  return (
    settingsDraftJourneys.find(
      (journey) =>
        isUnconfiguredJourney(journey) &&
        journey.name === preset.name &&
        journey.defaultFrom === preset.defaultFrom &&
        journey.defaultUntil === preset.defaultUntil
    ) ?? null
  );
}

function setJourneyTemplateLoading(active, message = "Finding nearest station…") {
  if (journeyTemplatesLoadingEl) {
    journeyTemplatesLoadingEl.textContent = message;
    journeyTemplatesLoadingEl.hidden = !active;
  }

  document.querySelectorAll(".journey-template-chip").forEach((chip) => {
    chip.disabled = active;
    chip.setAttribute("aria-busy", active ? "true" : "false");
  });
}

async function syncJourneyDetailRouteFields(journey, nearestHint = null) {
  if (!journey) {
    return;
  }

  renderStationOptions(detailStationSelect, journey.station);
  if (journey.station) {
    detailStationSelect.value = journey.station;
  }
  await loadDirectionsForSelect(detailDirectionSelect, journey.station, journey.direction);

  if (detailNearestHint) {
    if (nearestHint) {
      detailNearestHint.hidden = false;
      detailNearestHint.textContent = nearestHint;
    } else {
      detailNearestHint.hidden = true;
    }
  }
}

function formatJourneyOverlapError(updated, conflict) {
  if (conflict.name === updated.name && conflict.id !== updated.id) {
    return `Another journey already uses these hours (${updated.name}). Delete the duplicate from Journeys or change the times.`;
  }

  return `Default times overlap with "${conflict.name}" (${formatJourneyDefaultWindow(conflict)}). Adjust the times so only one journey is the default at any moment.`;
}

function updateJourneyTemplatesVisibility() {
  if (!journeyTemplatesEl) {
    return;
  }

  journeyTemplatesEl.hidden = settingsDraftJourneys.length >= 6;
}

function createJourneyFromTemplate(templateKey) {
  if (templateKey === "custom") {
    const journey = createDefaultJourney({
      name: "",
      templateKey: "custom",
      autoRoute: false,
    });
    settingsDraftJourneys.push(journey);
    // Draft only until Save with station + direction — do not persist shells.
    return openJourneyDetail(journey.id).then(() => {
      showTemplateRouteCoach({
        templateKey: "custom",
        journey,
        nearest: null,
        configured: false,
        error: null,
      });
    });
  }

  return createJourneyFromCommuteTemplate(templateKey);
}

async function completeTemplateRouteSetup(journeyId, templateKey) {
  let journey = settingsDraftJourneys.find((entry) => entry.id === journeyId);
  if (!journey) {
    return;
  }

  const routeResult = await applyTemplateRoute(journey, templateKey);
  if (routeResult.configured && routeResult.journey) {
    const index = settingsDraftJourneys.findIndex((entry) => entry.id === journeyId);
    if (index >= 0) {
      settingsDraftJourneys[index] = routeResult.journey;
    }
    journey = routeResult.journey;
    if (!isUnconfiguredJourney(journey)) {
      saveJourneyListToSettings();
    }
  }

  const nearestHint =
    routeResult.nearest && routeResult.configured
      ? `Nearest: ${formatStationLabel(routeResult.nearest.station)} (${routeResult.nearest.distanceKm.toFixed(1)} km away)`
      : null;

  if (editingJourneyId === journeyId) {
    await syncJourneyDetailRouteFields(journey, nearestHint);
  }

  showTemplateRouteCoach({
    templateKey,
    journey,
    nearest: routeResult.nearest,
    configured: routeResult.configured,
    error: routeResult.error,
  });
}

async function createJourneyFromCommuteTemplate(templateKey) {
  const reusable = findReusableTemplateJourney(templateKey);
  if (reusable) {
    await openJourneyDetail(reusable.id, { skipAutoRoute: true });
    if (isUnconfiguredJourney(reusable)) {
      await completeTemplateRouteSetup(reusable.id, templateKey);
    }
    return;
  }

  const preset = JOURNEY_TEMPLATE_PRESETS[templateKey] ?? {};
  const journey = createDefaultJourney({
    name: preset.name ?? "",
    defaultFrom: preset.defaultFrom ?? "",
    defaultUntil: preset.defaultUntil ?? "",
    preferredTrainTime: preset.preferredTrainTime ?? "",
    remindDays: preset.remindDays ?? [...DEFAULT_REMIND_DAYS],
    remindMe: preset.remindMe === true,
    templateKey,
    autoRoute: true,
  });
  settingsDraftJourneys.push(journey);

  await openJourneyDetail(journey.id, { skipAutoRoute: true });
  await completeTemplateRouteSetup(journey.id, templateKey);
}

function renderJourneyListView() {
  journeyListEl.innerHTML = "";

  if (!settingsDraftJourneys.length) {
    const empty = document.createElement("li");
    empty.className = "journey-list-empty";
    empty.textContent = "No journeys yet";
    journeyListEl.appendChild(empty);
  }

  for (const journey of settingsDraftJourneys) {
    const item = document.createElement("li");
    item.className = "journey-list-item";
    item.dataset.journeyId = journey.id;

    const card = document.createElement("div");
    card.className = "journey-list-card";

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "journey-list-open-btn";
    openBtn.setAttribute("aria-label", `Edit ${journey.name}`);

    const textStack = document.createElement("span");
    textStack.className = "journey-list-text";

    const nameEl = document.createElement("span");
    nameEl.className = "journey-list-name";
    nameEl.textContent = journey.name;

    const route = document.createElement("span");
    route.className = "journey-list-route";
    if (!journey.station || !journey.direction) {
      route.classList.add("journey-list-route--empty");
    }
    route.textContent = formatJourneyRoute(journey);

    const chevron = document.createElement("span");
    chevron.className = "journey-list-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "›";

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "journey-list-rename-btn";
    renameBtn.setAttribute("aria-label", `Rename ${journey.name}`);
    renameBtn.textContent = "Rename";

    textStack.append(nameEl, route);
    openBtn.append(textStack, chevron);
    openBtn.addEventListener("click", () => {
      openJourneyDetail(journey.id);
    });

    renameBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      startJourneyNameEdit(nameEl, journey, openBtn, renameBtn);
    });

    card.append(openBtn, renameBtn);
    item.appendChild(card);
    journeyListEl.appendChild(item);
  }

  updateJourneyTemplatesVisibility();
}

async function populateJourneyListView() {
  settingsDraftJourneys = normalizeJourneyList(settings.journeys).map((journey) => ({
    ...journey,
  }));
  renderJourneyListView();

  try {
    await getStationsList();
    renderJourneyListView();
  } catch (error) {
    console.warn("Could not refresh journey list stations", error);
  }
}

async function populateJourneyDetailForm(journeyId, { skipAutoRoute = false } = {}) {
  let journey =
    settingsDraftJourneys.find((entry) => entry.id === journeyId) ??
    getJourneyById(journeyId);

  if (!journey) {
    return;
  }

  editingJourneyId = journey.id;
  editingJourneySnapshot = normalizeJourney({ ...journey });
  if (detailJourneyNameInput) {
    detailJourneyNameInput.value = journey.name || "";
  }
  detailLeaveBeforeInput.value = journey.leaveBeforeMinutes;
  if (detailUseLeaveBeforeInput) {
    detailUseLeaveBeforeInput.checked = journeyUsesLeaveBefore(journey);
  }
  syncLeaveBeforeControlsState();
  updateLeaveBeforeLabel(journey.leaveBeforeMinutes);
  setOptionalTimeField(
    detailDefaultFromInput,
    detailDefaultFromDisplay,
    detailDefaultFromField,
    detailDefaultFromClear,
    journey.defaultFrom
  );
  setOptionalTimeField(
    detailDefaultUntilInput,
    detailDefaultUntilDisplay,
    detailDefaultUntilField,
    detailDefaultUntilClear,
    journey.defaultUntil
  );

  renderStationOptions(detailStationSelect, journey.station);
  if (journey.station) {
    detailStationSelect.value = journey.station;
  }
  detailDirectionSelect.innerHTML = '<option value="">Loading…</option>';
  detailDirectionSelect.disabled = true;

  let nearestHint = null;

  if (!skipAutoRoute && shouldAutoRouteJourney(journey)) {
    if (detailNearestHint) {
      detailNearestHint.hidden = false;
      detailNearestHint.textContent = "Finding nearest station…";
    }

    const routeResult = await applyDefaultJourneyRoute(journey);
    if (routeResult.configured && routeResult.journey) {
      const index = settingsDraftJourneys.findIndex((entry) => entry.id === journey.id);
      if (index >= 0) {
        settingsDraftJourneys[index] = routeResult.journey;
      }
      journey = routeResult.journey;
      saveJourneyListToSettings();
    }

    if (routeResult.configured && routeResult.nearest) {
      nearestHint = `Nearest: ${formatStationLabel(routeResult.nearest.station)} (${routeResult.nearest.distanceKm.toFixed(1)} km away)`;
    }
  }

  if (detailNearestHint) {
    if (nearestHint) {
      detailNearestHint.hidden = false;
      detailNearestHint.textContent = nearestHint;
    } else {
      detailNearestHint.hidden = true;
    }
  }

  try {
    await getStationsList();
  } catch (error) {
    console.warn("Could not load stations for journey detail", error);
  }

  renderStationOptions(detailStationSelect, journey.station);
  if (journey.station) {
    detailStationSelect.value = journey.station;
  }
  await loadDirectionsForSelect(detailDirectionSelect, journey.station, journey.direction);

  if (deleteJourneyBtn) {
    const editing = settingsDraftJourneys.find((journey) => journey.id === editingJourneyId);
    const canDelete =
      settingsDraftJourneys.length > 1 ||
      (editing && isUnconfiguredJourney(editing));
    deleteJourneyBtn.hidden = !canDelete;
  }
}

function countConfiguredJourneys(journeys) {
  return journeys.filter((journey) => !isUnconfiguredJourney(journey)).length;
}

function reloadSettingsDraftFromStorage() {
  if (settings.journeys.length === 0) {
    return;
  }

  settingsDraftJourneys = normalizeJourneyList(settings.journeys).map((journey) => ({
    ...normalizeJourney(journey),
  }));
}

function saveJourneyListToSettings() {
  // Never persist shells without station + direction (template/Custom mid-create).
  const draftConfigured = settingsDraftJourneys.filter(
    (journey) => !isUnconfiguredJourney(journey)
  );
  const persistedConfiguredCount = countConfiguredJourneys(settings.journeys);

  if (draftConfigured.length === 0 && persistedConfiguredCount > 0) {
    return;
  }

  if (persistedConfiguredCount > 0 && draftConfigured.length < persistedConfiguredCount) {
    return;
  }

  let activeJourneyId = settings.activeJourneyId;
  const journeys = draftConfigured.map((draft) => {
    const existing = getJourneyById(draft.id);
    return normalizeJourney({
      ...existing,
      ...draft,
      station: draft.station || existing?.station || "",
      direction: draft.direction || existing?.direction || "",
    });
  });
  if (!journeys.some((journey) => journey.id === activeJourneyId)) {
    activeJourneyId = journeys[0]?.id ?? null;
  }
  persistSettings({ journeys, activeJourneyId });
}

function requireJourneyRouteFromForm() {
  const station = detailStationSelect?.value?.trim?.() || detailStationSelect?.value || "";
  const direction = normalizeDirection(detailDirectionSelect?.value || "");

  if (!station) {
    detailStationSelect?.focus?.();
    throw new Error("Choose a departure station before saving.");
  }

  if (!direction) {
    detailDirectionSelect?.focus?.();
    throw new Error("Choose a direction of travel before saving.");
  }

  return { station, direction };
}

function saveJourneyDetailFromForm() {
  if (!editingJourneyId) {
    return;
  }

  const { station, direction } = requireJourneyRouteFromForm();
  const name = readJourneyNameFromForm(station, direction);

  const defaultFrom = readOptionalTimeField(detailDefaultFromField);
  const defaultUntil = readOptionalTimeField(detailDefaultUntilField);
  if (Boolean(defaultFrom) !== Boolean(defaultUntil)) {
    throw new Error("Set both default from and until times, or leave both blank.");
  }

  const existing = settingsDraftJourneys.find((entry) => entry.id === editingJourneyId);
  const updated = normalizeJourney({
    id: editingJourneyId,
    name,
    station,
    direction,
    leaveBeforeMinutes: Number(detailLeaveBeforeInput.value),
    useLeaveBefore: detailUseLeaveBeforeInput?.checked ?? true,
    defaultFrom,
    defaultUntil,
    preferredTrainTime: existing?.preferredTrainTime ?? "",
    remindDays: existing?.remindDays ?? [...DEFAULT_REMIND_DAYS],
    remindMe: existing?.remindMe ?? false,
  });

  const conflict = findJourneyDefaultWindowConflict(updated, settingsDraftJourneys);
  if (conflict) {
    throw new Error(formatJourneyOverlapError(updated, conflict));
  }

  const index = settingsDraftJourneys.findIndex((journey) => journey.id === editingJourneyId);
  if (index >= 0) {
    settingsDraftJourneys[index] = updated;
  } else {
    settingsDraftJourneys.push(updated);
  }

  // Drop any other unfinished shells so the list stays clean after a real save.
  settingsDraftJourneys = settingsDraftJourneys.filter(
    (journey) => journey.id === updated.id || !isUnconfiguredJourney(journey)
  );

  const configuredBeforeSave = countConfiguredJourneys(settings.journeys);
  let activeJourneyId = settings.activeJourneyId;
  if (!isOutboundCommuteJourney(updated)) {
    activeJourneyId = editingJourneyId;
  } else if (!settingsDraftJourneys.some((journey) => journey.id === activeJourneyId)) {
    activeJourneyId = getInboundJourney(settingsDraftJourneys)?.id ?? settingsDraftJourneys[0]?.id ?? null;
  }

  if (configuredBeforeSave === 0) {
    markInitialJourneySetup();
    activeJourneyId = getInboundJourney(settingsDraftJourneys)?.id ?? activeJourneyId;
    document.dispatchEvent(new CustomEvent("nexttrain:journey-configured-first"));
  }

  persistSettings({
    journeys: settingsDraftJourneys
      .filter((journey) => !isUnconfiguredJourney(journey))
      .map((journey) => normalizeJourney(journey)),
    activeJourneyId,
  });
  editingJourneySnapshot = null;
}

function closeJourneysDialog() {
  dismissTemplateRouteCoach();
  commitActiveJourneyNameEdit();

  if (!settingsDetailView.hidden) {
    cancelJourneyDetailEdit();
  } else {
    if (settingsDraftJourneys.length === 0) {
      reloadSettingsDraftFromStorage();
    }
    settingsDraftJourneys = settingsDraftJourneys.filter(
      (journey) => !isUnconfiguredJourney(journey)
    );
    showSettingsListView();
  }

  saveJourneyListToSettings();

  const configured = hasConfiguredCommute();
  if (configured) {
    clearHeroSetupState();
    const journey = getActiveJourney();
    if (journey && routeEl) {
      routeEl.textContent = formatJourneyRoute(journey);
    }
    if (updatedEl) {
      updatedEl.textContent = "Updating…";
      updatedEl.hidden = false;
    }
  }

  if (isJourneysDialogOpen()) {
    closeJourneysSheet();
  }

  if (!configured) {
    if (journeyModeActive) {
      renderJourneyEmptyState();
    } else {
      applyCommuteMode();
    }
    return;
  }

  journeyModeActive = true;
  exitNearbyMode();
  syncChromeMode();

  fetchNextTrain();
}

function closeMenuDialog() {
  if (isAppDialogOpen(menuDialog)) {
    closeAppDialog(menuDialog);
  }
  menuBtn?.setAttribute("aria-expanded", "false");
  menuChromeAction?.classList.remove("chrome-action--open");

  if (!hasConfiguredCommute()) {
    return;
  }

  if (isNearbyModeActive()) {
    fetchNearbyBoard()
      .then(() => renderNearbyBoard())
      .catch(() => renderNearbyBoard({ stale: true }));
    return;
  }

  fetchNextTrain();
}

function openMenu() {
  dismissLeaveHint();
  window.NextTrainAdFree?.renderMenuAdFree?.();
  openAppDialog(menuDialog);
  menuBtn?.setAttribute("aria-expanded", "true");
  menuChromeAction?.classList.add("chrome-action--open");
}

function clearAllAppData() {
  const localKeysToRemove = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (
      key?.startsWith("nextTrain") &&
      key !== "nextTrainAdsLoaded" &&
      key !== "nextTrainAdFreeCache"
    ) {
      localKeysToRemove.push(key);
    }
  }

  for (const key of localKeysToRemove) {
    localStorage.removeItem(key);
  }

  sessionStorage.clear();

  settings = createDefaultStore();
  refreshSeconds = settings.refreshSeconds ?? DEFAULT_SETTINGS.refreshSeconds;
  settingsDraftJourneys = [];
  editingJourneyId = null;
  skipTrains = 0;
  lastApiData = null;
  lastRenderedNext = null;
  leaveAutoCheckDeparture = null;
  onboardingShowTimer = null;
  onboardingPopulatedAt = null;

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  renderJourneyListView();
  renderJourneySwitcher();
  applyCommuteMode({ coldStart: true });
  window.NextTrainAdFree?.refreshEntitlement?.({ silent: true });
}

function handleClearAllData() {
  const confirmed = confirm(
    "Clear all journeys and preferences? Purchases are kept. This cannot be undone."
  );
  if (!confirmed) {
    return;
  }

  clearAllAppData();

  if (isJourneysDialogOpen()) {
    closeJourneysSheet();
  }
  if (isAppDialogOpen(menuDialog)) {
    closeAppDialog(menuDialog);
  }
}

function openJourneys() {
  dismissLeaveHint();
  completeOnboarding();
  dismissTemplateRouteCoach();
  showSettingsListView();
  openJourneysDialogSync();
  void populateJourneyListView();
}

function openJourneysForSetup() {
  completeOnboarding();
  enterJourneyMode();
  openJourneys();
}

function openJourneyDetail(journeyId, options = {}) {
  openJourneysDialogSync();

  return ensureSettingsDraftLoaded()
    .then(() => populateJourneyDetailForm(journeyId, options))
    .then(() => {
      showSettingsDetailView();
    })
    .catch((error) => {
      console.warn("Could not open journey detail", error);
    });
}

journeysBtn?.addEventListener("click", () => enterJourneyMode());
journeyEditBtn?.addEventListener("click", () => openJourneys());
menuBtn?.addEventListener("click", () => openMenu());
nearbyBtn?.addEventListener("click", () => {
  nearbyBtn?.classList.add("icon-btn--refreshing");
  Promise.resolve(enterNearbyMode()).finally(() => {
    window.setTimeout(() => nearbyBtn?.classList.remove("icon-btn--refreshing"), 300);
  });
});
nearbyStationBtn?.addEventListener("click", async () => {
  const station = nearbyStationSelect?.value;
  if (!station) {
    return;
  }

  nearbyError = null;
  nearbySession = {
    station,
    distanceKm: null,
    focusedDirection: null,
    skipByDirection: {},
  };
  nearbyLoading = true;
  renderNearbyBoard();

  try {
    await fetchNearbyBoard();
    nearbyLoading = false;
    renderNearbyBoard();
  } catch (error) {
    nearbyLoading = false;
    nearbyError = error.message ?? "Could not load departures for this station";
    renderNearbyBoard();
  }
});
menuHelpBtn?.addEventListener("click", () => {
  closeMenuDialog();
  openAppDialog(helpDialog);
});
helpCloseBtn?.addEventListener("click", () => {
  closeAppDialog(helpDialog);
});
helpDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeAppDialog(helpDialog);
});
helpDialog?.addEventListener("click", (event) => {
  if (event.target === helpDialog) {
    closeAppDialog(helpDialog);
  }
});
leaveAckBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (lastRenderedNext) {
    acknowledgeLeave(lastRenderedNext);
  }
});
leaveBufferEditBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  openLeaveBufferSettings();
});
document.getElementById("journeys-dialog-backdrop")?.addEventListener("click", () => {
  closeJourneysDialog();
});
journeysDoneBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  closeJourneysDialog();
});
menuDoneBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  closeMenuDialog();
});
menuDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeMenuDialog();
});
menuDialog?.addEventListener("click", (event) => {
  if (event.target === menuDialog) {
    closeMenuDialog();
  }
});

settingsBackBtn?.addEventListener("click", () => {
  dismissTemplateRouteCoach();
  cancelJourneyDetailEdit();
});

detailCancelBtn?.addEventListener("click", () => {
  dismissTemplateRouteCoach();
  cancelJourneyDetailEdit();
});

document.querySelectorAll(".journey-template-chip").forEach((button) => {
  button.addEventListener("click", async () => {
    if (templateCreateInFlight) {
      return;
    }

    templateCreateInFlight = true;
    setJourneyTemplateLoading(true);
    showSettingsListView();
    openJourneysDialogSync();

    try {
      await createJourneyFromTemplate(button.dataset.template);
    } finally {
      templateCreateInFlight = false;
      setJourneyTemplateLoading(false);
    }
  });
});

heroEmptyAddBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  openJourneys();
});

heroEmptyBackBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  enterNearbyMode();
});

templateWizardPrimaryBtn?.addEventListener("click", () => {
  advanceTemplateWizard();
});

templateRouteCoach?.querySelector(".onboarding-coach-scrim")?.addEventListener("click", () => {
  dismissTemplateRouteCoach();
});

onboardingGotItBtn?.addEventListener("click", () => {
  showOnboardingStep2();
});

onboardingSetupBtn?.addEventListener("click", () => {
  openJourneysForSetup();
});

onboardingLaterBtn?.addEventListener("click", () => {
  completeOnboarding();
});

clearAllDataBtn?.addEventListener("click", handleClearAllData);

deleteJourneyBtn?.addEventListener("click", () => {
  if (!editingJourneyId) {
    return;
  }

  const editing = settingsDraftJourneys.find((journey) => journey.id === editingJourneyId);
  const onlyConfiguredSole =
    settingsDraftJourneys.length <= 1 && editing && !isUnconfiguredJourney(editing);
  if (onlyConfiguredSole) {
    return;
  }

  settingsDraftJourneys = settingsDraftJourneys.filter((journey) => journey.id !== editingJourneyId);
  editingJourneySnapshot = null;
  editingJourneyId = null;
  saveJourneyListToSettings();
  renderJourneyListView();
  showSettingsListView();
});

detailLeaveBeforeInput?.addEventListener("input", () => {
  updateLeaveBeforeLabel();
});

detailUseLeaveBeforeInput?.addEventListener("change", () => {
  syncLeaveBeforeControlsState();
});

bindOptionalTimeField(
  detailDefaultFromInput,
  detailDefaultFromDisplay,
  detailDefaultFromField,
  detailDefaultFromClear
);
bindOptionalTimeField(
  detailDefaultUntilInput,
  detailDefaultUntilDisplay,
  detailDefaultUntilField,
  detailDefaultUntilClear
);

detailStationSelect?.addEventListener("change", () => {
  loadDirectionsForSelect(detailDirectionSelect, detailStationSelect.value);
});

detailNearestBtn?.addEventListener("click", async () => {
  detailNearestHint.hidden = false;
  detailNearestHint.textContent = "Finding nearest station…";

  try {
    const { station, distanceKm: km } = await findNearestStation();
    detailStationSelect.value = station;
    detailNearestHint.textContent = `Selected ${formatStationLabel(station)} (${km.toFixed(1)} km away)`;
    await loadDirectionsForSelect(detailDirectionSelect, station);
    const direction = await pickPerthDirection(station);
    if (direction) {
      detailDirectionSelect.value = direction;
    }
  } catch (error) {
    detailNearestHint.textContent =
      error.code === 1
        ? "Location permission denied. Pick your station from the list."
        : "Could not use location. Pick your station from the list.";
  }
});

settingsDetailView?.addEventListener("submit", (event) => {
  event.preventDefault();

  try {
    saveJourneyDetailFromForm();
  } catch (error) {
    alert(error.message);
    return;
  }

  closeJourneysDialog();
});

journeySwitcherEl?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleJourneySwitcherMenu();
});

journeySwitcherMenuEl?.addEventListener("click", (event) => {
  event.stopPropagation();
});

document.addEventListener("click", () => {
  closeJourneySwitcherMenu();
});

async function init() {
  applyTestQueryParams();
  initHeroSwipe();
  installOnboardingInteractionTracking();

  const urlSettings = readUrlSettings();
  if (urlSettings) {
    persistSettings(urlSettings);
  } else {
    settings = readStoredSettings();
    refreshSeconds = settings.refreshSeconds ?? DEFAULT_SETTINGS.refreshSeconds;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  scheduleRefresh();
  void getStationsList();
  void loadStationCoords();

  if (urlSettings) {
    journeyModeActive = true;
    renderJourneySwitcher();
    clearHeroSetupState();
    maybeAutoSelectJourney();
    skipTrains = readSkipState().count;
    fetchNextTrain();
    window.nextTrainWidget?.syncWidgetSettings?.(settings);
    await window.nextTrainWidget?.consumeLaunchDeepLink?.();
    return;
  }

  await applyCommuteMode({ coldStart: true });
  window.nextTrainWidget?.syncWidgetSettings?.(settings);
  await window.nextTrainWidget?.consumeLaunchDeepLink?.();
}

init();

window.nextTrainApp = {
  migrateSettings,
  getConfiguredJourneys,
  formatJourneyRoute,
  persistReminderJourneys,
  getActiveLegCommute() {
    return getActiveJourney();
  },
  getEffectiveLeaveBeforeMinutes(journey = getActiveJourney()) {
    return getEffectiveLeaveBeforeMinutes(journey);
  },
  refreshDisplay() {
    if (lastApiData) {
      render(prepareDisplayData(lastApiData));
    }
  },
  enterJourneyMode,
  openJourneys,
  switchJourney,
  fetchNextTrain,
  hasConfiguredCommute,
};

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    maybeScheduleOnboarding();

    if (journeyModeActive) {
      skipTrains = readSkipState().count;
      refreshLiveDisplay(true);
      fetchNextTrain();
      return;
    }

    applyCommuteMode();
  }
});
