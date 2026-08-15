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
const ONBOARDING_STEP_KEY = "nextTrainOnboardingStep";
const TEMPLATE_WIZARD_SEEN_KEY = "nextTrainTemplateWizardSeen";
const TEMPLATE_WIZARD_SKIPPED_KEY = "nextTrainTemplateWizardSkipped";
const LAST_NEARBY_STATION_KEY = "nextTrainLastNearbyStation";
const LAST_NEARBY_STATION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** Instant reopen paint — refresh in background after this. */
const LAST_NEARBY_BOARD_MAX_AGE_MS = 15 * 60 * 1000;
/** Soft GPS refine may reuse a recent fused fix (station-level accuracy). */
const NEARBY_SOFT_LOCATION_MAX_AGE_MS = 2 * 60 * 1000;
const SWIPE_THRESHOLD_PX = 48;
const ONBOARDING_QUIET_MS = 5000;

const routeEl = document.getElementById("route");

function setRouteDisplay(text) {
  if (!routeEl) {
    return;
  }
  routeEl.textContent = text;
  routeEl.setAttribute("aria-label", text);
}

function setAccessibleText(el, text) {
  if (!el) {
    return;
  }
  el.textContent = text;
  el.setAttribute("aria-label", text);
}
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
const preferredHintEl = document.getElementById("preferred-hint");
const leaveAckBtn = document.getElementById("leave-ack-btn");
const leaveNextTrainBtn = document.getElementById("leave-next-train-btn");
const leaveCardActionsEl = document.getElementById("leave-card-actions");
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
const nearbyStationComboboxRoot = document.getElementById("nearby-station-combobox");
const nearbyStationInput = document.getElementById("nearby-station-input");
const nearbyStationBtn = document.getElementById("nearby-station-btn");
const nearbyDontWaitBtn = document.getElementById("nearby-dont-wait-btn");
const appEl = document.querySelector(".app");

/**
 * Hide Near me pin leave-by surfaces (slider / Notify me / hide footer).
 * Defined early so render / fetchNextTrain never hit ReferenceError (CAPACITOR-C/D).
 * Looks up the node each call so this stays safe before/after pin-leave markup ships.
 */
function hideNearbyPinLeaveSurfaces() {
  const controls = document.getElementById("nearby-pin-leave-controls");
  if (controls) {
    controls.hidden = true;
  }
}
const helpDialog = document.getElementById("help-dialog");
const helpCloseBtn = document.getElementById("help-close-btn");
const feedbackDialog = document.getElementById("feedback-dialog");
const feedbackForm = document.getElementById("feedback-form");
const feedbackNoteInput = document.getElementById("feedback-note");
const feedbackEmailInput = document.getElementById("feedback-email");
const feedbackStatusEl = document.getElementById("feedback-status");
const feedbackSendBtn = document.getElementById("feedback-send-btn");
const feedbackCancelBtn = document.getElementById("feedback-cancel-btn");
const feedbackThanksEl = document.getElementById("feedback-thanks");
const feedbackDoneBtn = document.getElementById("feedback-done-btn");
const journeysDialog = document.getElementById("journeys-dialog");
const menuDialog = document.getElementById("menu-dialog");
const menuAppVersionEl = document.getElementById("menu-app-version");
const menuHelpBtn = document.getElementById("menu-help-btn");
const menuFeedbackBtn = document.getElementById("menu-feedback-btn");
const settingsListView = document.getElementById("settings-list-view");
const settingsDetailView = document.getElementById("settings-detail-view");
const journeysDetailChrome = document.getElementById("journeys-detail-chrome");
const journeysDoneBtn = document.getElementById("journeys-done-btn");
const menuDoneBtn = document.getElementById("menu-done-btn");
const detailCancelBtn = document.getElementById("detail-cancel-btn");
const settingsBackBtn = document.getElementById("settings-back");
const journeyListEl = document.getElementById("journey-list");
const clearAllDataBtn = document.getElementById("clear-all-data-btn");
const deleteJourneyBtn = document.getElementById("delete-journey-btn");
const detailJourneyNameInput = document.getElementById("detail-journey-name");
const detailStationComboboxRoot = document.getElementById("detail-station-combobox");
const detailStationInput = document.getElementById("detail-station-input");
const detailDirectionSelect = document.getElementById("detail-direction-select");
const detailLeaveBeforeInput = document.getElementById("detail-leave-before-input");
const detailLeaveBeforeValueEl = document.getElementById("detail-leave-before-value");
const detailUseLeaveBeforeInput = document.getElementById("detail-use-leave-before");
const detailUseTargetTrainInput = document.getElementById("detail-use-target-train");
const detailTargetNest = document.getElementById("detail-target-nest");
const detailTargetMaster = document.getElementById("detail-target-master");
const detailTargetMasterHint = document.getElementById("detail-target-master-hint");
const leaveBeforeField = document.getElementById("leave-before-field");
const leaveBeforeControls = document.getElementById("leave-before-controls");
const detailPreferredSection = document.getElementById("detail-preferred-section");
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
const journeyTemplatesCapHintEl = document.getElementById("journey-templates-cap-hint");
const journeyTemplateChipsEl = document.querySelector(".journey-template-chips");
const journeyTemplatesAddHintEl = document.querySelector(".journey-templates-hint");
const templateRouteCoach = document.getElementById("template-route-coach");
const templateRouteCoachBody = document.getElementById("template-route-coach-body");
const templateWizardHoursBody = document.getElementById("template-wizard-hours-body");
const templateWizardPrimaryBtn = document.getElementById("template-wizard-primary-btn");
const templateWizardStep1 = document.getElementById("template-wizard-step-1");
const templateWizardStep2 = document.getElementById("template-wizard-step-2");
const templateWizardStep3 = document.getElementById("template-wizard-step-3");
const templateWizardStepReminder = document.getElementById("template-wizard-step-reminder");
const templateWizardStepName = document.getElementById("template-wizard-step-name");
const templateWizardNameBody = document.getElementById("template-wizard-name-body");
const templateWizardSkipBtn = document.getElementById("template-wizard-skip-btn");
const detailJourneyNameField = document.querySelector(".journey-name-field");
const detailRouteSection = document.getElementById("detail-route-section");
const detailJourneyWindow = document.getElementById("detail-journey-window");
const heroEmptyStateEl = document.getElementById("hero-empty-state");
const heroEmptyAddBtn = document.getElementById("hero-empty-add-btn");
const heroEmptyBackBtn = document.getElementById("hero-empty-back-btn");
const detailActiveDayChips = document.getElementById("detail-active-day-chips");
const detailActiveDaysHint = document.querySelector(".detail-active-days-hint");
const DEFAULT_ACTIVE_DAYS_HINT = "Which days do you travel this journey?";
const CUSTOM_ACTIVE_DAYS_HINT =
  "Starts on today — add more days if this repeats more often.";
const detailActiveHoursErrorEl = document.getElementById("detail-active-hours-error");
const detailActiveHoursErrorTextEl = document.getElementById("detail-active-hours-error-text");
const detailActiveHoursFixBtn = document.getElementById("detail-active-hours-fix-btn");
const detailActiveHoursHint = document.getElementById("detail-active-hours-hint");
const detailTargetOutsideActiveHint = document.getElementById("detail-target-outside-active-hint");
const detailComboBHint = document.getElementById("detail-combo-b-hint");
const detailComboDHint = document.getElementById("detail-combo-d-hint");
const detailReminderSection = document.getElementById("detail-reminder-section");
const detailRemindControls = document.getElementById("detail-remind-controls");
const detailRemindMeInput = document.getElementById("detail-remind-me");
const detailLeaveRemindersCommuteStripInput = document.getElementById("leave-reminders-commute-strip");
const detailLeaveRemindersStripWrap = document.getElementById("leave-reminders-strip-wrap");
const detailPreferredInput = document.getElementById("detail-preferred-input");
const detailPreferredDisplay = document.getElementById("detail-preferred-display");
const detailPreferredField = document.getElementById("detail-preferred-field");
const detailPreferredClear = document.getElementById("detail-preferred-clear");

let settings = createDefaultStore();
let refreshSeconds = DEFAULT_SETTINGS.refreshSeconds;
let skipTrains = 0;
/** Near me: hold a pinned departure until 1 minute after it leaves. */
const NEARBY_PIN_HOLD_MS = 60_000;
let lastResumeRefreshAt = 0;
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
let swipeStartX = 0;
let swipeStartY = 0;
let swipeLastX = 0;
let swipeLastY = 0;
let heroSwipePointerId = null;
let leaveAutoCheckDeparture = null;
let nearbySession = null;
let nearbyBoard = null;
let nearbyLoading = false;
let nearbyBoardInflight = null;
let nearbyBoardRefetchPending = false;
let nearbyLocateStartedAt = 0;
let nearbyLocateTimer = null;
let nearbyLocateDontWaitTimer = null;
let nearbyLocateGeneration = 0;
let nearbyLocatePickerVisible = false;
let nearbyDontWaitVisible = false;
let nearbyUserPickedStation = false;
let nearbyError = null;
let nearbyErrorKind = null; // "location" | "board" | null
let journeyModeActive = false;
let deferJourneyAutoSelect = false;
let onboardingShowTimer = null;
let onboardingPopulatedAt = null;
let onboardingNearbyFaceReady = false;
let templateCreateInFlight = false;
let helpOpenedFromMenu = false;
let journeyOverlapState = null;

const STATION_ARRIVAL_KM = 0.35;
const TRAVELING_SPEED_MS = 2.5;

const DIRECTION_ALIASES = {
  "Perth Underground": "Perth",
  "Perth Underground Stn": "Perth",
  "Perth Stn": "Perth",
  "Cockburn Central": "Cockburn",
  "Cockburn Central Stn": "Cockburn",
};

const LINE_DIRECTION_GROUPS = {
  Yanchep: ["Yanchep", "Whitfords", "Clarkson", "Butler"],
  Mandurah: ["Mandurah", "Cockburn"],
  Fremantle: ["Fremantle", "Claremont"],
};

const PERTH_STATIONS = new Set(["Perth Stn", "Perth Underground Stn"]);
const PERTH_API_STATIONS = ["Perth Underground Stn", "Perth Stn"];
const CANONICAL_PERTH_STATION = "Perth Underground Stn";
const DEFAULT_DIRECTION_LABEL = "Perth";
const DEFAULT_REMIND_DAYS = [1, 2, 3, 4, 5];

function trackProductEvent(name, props) {
  window.NextTrainAnalytics?.track?.(name, props);
}
const MAX_JOURNEYS = 6;
const JOURNEY_CAP_HINT = `${MAX_JOURNEYS} journeys — that's the limit for now. Delete one to add another.`;
const JOURNEY_TEMPLATE_PRESETS = {
  morning: {
    name: "Morning into town",
    defaultFrom: "06:00",
    defaultUntil: "09:00",
    preferredTrainTime: "07:30",
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
const DELETE_LAST_JOURNEY_CONFIRM =
  "Delete your only journey? You can add a new one anytime.";

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

function locationErrorFrom(error) {
  const code = Number(error?.code);
  const message = String(error?.message || error || "");
  const lower = message.toLowerCase();

  if (
    code === 1 ||
    lower.includes("denied") ||
    lower.includes("permission")
  ) {
    return Object.assign(
      new Error(
        "Location permission is needed for Near me. Open Settings → Apps → Next Train → Location → Allow, or choose a station below."
      ),
      { code: 1, cause: error }
    );
  }

  if (
    lower.includes("disabled") ||
    lower.includes("location services") ||
    lower.includes("not enabled")
  ) {
    return Object.assign(
      new Error(
        "Turn on Location in your phone settings, then try Near me again — or choose a station below."
      ),
      { code: 2, cause: error }
    );
  }

  if (
    lower.includes("timeout") ||
    lower.includes("could not obtain location in time") ||
    lower.includes("location unavailable")
  ) {
    return Object.assign(
      new Error(
        "Couldn’t get your location. On an emulator, set a mock GPS (Extended controls → Location). On a phone, turn on Location — or choose a station below."
      ),
      { code: 2, cause: error }
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return Object.assign(new Error(message || "Could not find a nearby station"), {
    code: code || 2,
  });
}

function classifyNearbyError(message) {
  const lower = String(message || "").toLowerCase();
  if (
    lower.includes("departures") ||
    lower.includes("times") ||
    lower.includes("board") ||
    lower.includes("directions") ||
    lower.includes("unavailable")
  ) {
    return "board";
  }
  return "location";
}

function setNearbyError(message, kind = null) {
  nearbyError = message;
  nearbyErrorKind = kind || (message ? classifyNearbyError(message) : null);
}

function clearNearbyError() {
  nearbyError = null;
  nearbyErrorKind = null;
}

async function getAppGeolocationPosition(options = {}) {
  if (isNativeApp()) {
    await ensureGeoBridge();
    if (!window.NextTrainGeo?.getCurrentPosition) {
      throw Object.assign(new Error("Native geolocation bridge unavailable"), { code: 2 });
    }

    try {
      if (typeof window.NextTrainGeo.ensureLocationPermission === "function") {
        await window.NextTrainGeo.ensureLocationPermission();
      }
      return await window.NextTrainGeo.getCurrentPosition(options);
    } catch (error) {
      throw locationErrorFrom(error);
    }
  }

  if (!navigator.geolocation) {
    throw Object.assign(new Error("Geolocation unavailable"), { code: 2 });
  }

  try {
    return await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  } catch (error) {
    throw locationErrorFrom(error);
  }
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

    if (dialog === helpDialog || dialog === feedbackDialog) {
      closeAppDialog(dialog);
    }
  });

  dialog.parentNode?.insertBefore(backdrop, dialog);
  return backdrop;
}

function notifyAdOverlaySuppression() {
  window.NextTrainAds?.syncOverlaySuppression?.();
}

function isAppOverlayOpen() {
  const remindersDialog = document.getElementById("reminders-dialog");
  return (
    isJourneysDialogOpen() ||
    isAppDialogOpen(menuDialog) ||
    isAppDialogOpen(helpDialog) ||
    isAppDialogOpen(feedbackDialog) ||
    Boolean(remindersDialog?.open || remindersDialog?.hasAttribute("open"))
  );
}

function canShowOnboardingCoach() {
  return isNearbyModeActive() && !isAppOverlayOpen() && !hasCompletedOnboarding();
}

function pauseOnboardingForOverlay() {
  if (isOnboardingVisible()) {
    hideOnboardingCoach();
  }
  clearOnboardingSchedule();
}

function openAppDialog(dialog) {
  if (!dialog || isAppDialogOpen(dialog)) {
    return;
  }

  pauseOnboardingForOverlay();
  document.body.classList.add("app-dialog-open");
  notifyAdOverlaySuppression();
  if (isNativeApp()) {
    void window.NextTrainAds?.hideNativeBanner?.({ force: true });
  }

  if (isNativeApp()) {
    const backdrop = ensureDialogBackdrop(dialog);
    if (backdrop) {
      backdrop.hidden = false;
    }
    dialog.classList.add("app-native-dialog");
    dialog.setAttribute("open", "");
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
    notifyAdOverlaySuppression();
    if (isNearbyModeActive() && isNearbyFaceReadyForOnboarding() && !hasCompletedOnboarding()) {
      maybeScheduleOnboarding();
    }
  }
}

function apiUrl(path) {
  return `${API_ORIGIN}${path}`;
}

function getActiveFixture() {
  return new URLSearchParams(window.location.search).get("fixture");
}

function appendFixtureQuery(queryString) {
  const fixture = getActiveFixture() || (isTestMode() ? "normal" : null);
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

function isCatalogStation(station) {
  const trimmed = String(station || "").trim();
  if (!trimmed) {
    return false;
  }

  const normalized = normalizeStation(trimmed);
  if (!stationsCache?.length) {
    return Boolean(normalized);
  }

  return stationsCache.includes(normalized) || stationsCache.includes(trimmed);
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

function formatNearestDistanceHint(nearest) {
  if (!nearest || typeof nearest.distanceKm !== "number") {
    return null;
  }

  return `${nearest.distanceKm.toFixed(1)} km away`;
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
  let aliased = trimmed;
  if (DIRECTION_ALIASES[trimmed]) {
    aliased = DIRECTION_ALIASES[trimmed];
  } else {
    const withoutStn = trimmed.replace(/ Stn$/i, "");
    if (DIRECTION_ALIASES[withoutStn]) {
      aliased = DIRECTION_ALIASES[withoutStn];
    }
  }

  for (const [canonical, members] of Object.entries(LINE_DIRECTION_GROUPS)) {
    if (members.some((member) => member.toLowerCase() === aliased.toLowerCase())) {
      return canonical;
    }
  }

  return aliased;
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

function getPerthDayOfWeekIso(date = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Australia/Perth",
    weekday: "long",
  }).format(date);
  const map = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 7,
  };
  return map[weekday] ?? 1;
}

function getJourneyRemindDays(journey) {
  return normalizeRemindDays(journey?.remindDays);
}

function setDetailActiveDayChips(days) {
  if (!detailActiveDayChips) {
    return;
  }

  const selected = new Set(normalizeRemindDays(days));
  detailActiveDayChips.querySelectorAll(".remind-day-chip").forEach((chip) => {
    const day = Number(chip.dataset.day);
    const active = selected.has(day);
    chip.classList.toggle("remind-day-chip--active", active);
    chip.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function syncDetailActiveDaysHint(journey) {
  if (!detailActiveDaysHint) {
    return;
  }

  detailActiveDaysHint.textContent =
    journey?.templateKey === "custom" ? CUSTOM_ACTIVE_DAYS_HINT : DEFAULT_ACTIVE_DAYS_HINT;
}

function isTargetOutsideActiveWindow(defaultFrom, defaultUntil, preferredTrainTime) {
  if (!defaultFrom || !defaultUntil || !preferredTrainTime) {
    return false;
  }

  const targetMinutes = parseTimeToMinutes(preferredTrainTime);
  const from = parseTimeToMinutes(defaultFrom);
  const until = parseTimeToMinutes(defaultUntil);

  // Inclusive of Active from/until (unlike live auto-show, which uses until exclusive).
  if (from === until) {
    return false;
  }
  if (from < until) {
    return targetMinutes < from || targetMinutes > until;
  }
  // Overnight window: inside if at/after from OR at/before until.
  return targetMinutes < from && targetMinutes > until;
}

function syncDetailComboHints() {
  const defaultFrom = readOptionalTimeField(detailDefaultFromField);
  const defaultUntil = readOptionalTimeField(detailDefaultUntilField);
  const preferredTrainTime = readOptionalTimeField(detailPreferredField);
  const hasWindow = Boolean(defaultFrom && defaultUntil);
  const hasTarget = Boolean(preferredTrainTime);

  const outsideTarget = isTargetOutsideActiveWindow(
    defaultFrom,
    defaultUntil,
    preferredTrainTime
  );
  const showComboB = !hasWindow && hasTarget;
  const showComboD = !hasWindow && !hasTarget;
  const showDefault = !outsideTarget && !showComboB && !showComboD;

  if (detailTargetOutsideActiveHint) {
    const wasHidden = detailTargetOutsideActiveHint.hidden;
    detailTargetOutsideActiveHint.hidden = !outsideTarget;
    if (outsideTarget && wasHidden) {
      detailTargetOutsideActiveHint.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }
  if (detailComboBHint) {
    detailComboBHint.hidden = !showComboB;
  }
  if (detailComboDHint) {
    detailComboDHint.hidden = !showComboD;
  }
  if (detailActiveHoursHint) {
    detailActiveHoursHint.hidden = !showDefault;
  }
}

function readDetailActiveDays() {
  if (!detailActiveDayChips) {
    return [];
  }

  const days = [];
  detailActiveDayChips.querySelectorAll(".remind-day-chip--active").forEach((chip) => {
    days.push(Number(chip.dataset.day));
  });
  return [...new Set(days)].sort((a, b) => a - b);
}

function journeyMatchesActiveDay(journey, dayOfWeek = getPerthDayOfWeekIso()) {
  return getJourneyRemindDays(journey).includes(dayOfWeek);
}

function journeyMatchesSchedule(
  journey,
  minutes = getPerthMinutesSinceMidnight(),
  dayOfWeek = getPerthDayOfWeekIso()
) {
  return journeyMatchesActiveDay(journey, dayOfWeek) && journeyMatchesTime(journey, minutes);
}

function journeyRemindMeEnabled(raw = {}) {
  if (typeof raw.remindMe === "boolean") {
    return raw.remindMe;
  }
  return Boolean(raw.preferredTrainTime);
}

function inferTemplateKey(raw = {}) {
  if (raw.templateKey) {
    return String(raw.templateKey);
  }

  for (const [key, preset] of Object.entries(JOURNEY_TEMPLATE_PRESETS)) {
    if (raw.name === preset.name) {
      return key;
    }
  }

  return "";
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

  const templateKey = inferTemplateKey(raw);
  const journey = {
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

  if (templateKey) {
    journey.templateKey = templateKey;
  }
  if (raw.autoRoute === false) {
    journey.autoRoute = false;
  }

  return journey;
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

function syncJourneyContextEditOffset() {
  if (!journeyContextRowEl || !journeyEditBtn || journeyEditBtn.hidden) {
    journeyContextRowEl?.style.removeProperty("--journey-context-anchor-width");
    return;
  }

  const anchorEl = journeyContextNameEl?.hidden ? journeySwitcherEl : journeyContextNameEl;
  if (!anchorEl || anchorEl.hidden) {
    journeyContextRowEl.style.removeProperty("--journey-context-anchor-width");
    return;
  }

  journeyContextRowEl.style.setProperty("--journey-context-anchor-width", `${anchorEl.offsetWidth}px`);
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
    setAccessibleText(journeyContextNameEl, getActiveJourney()?.name ?? "Journey");
  }

  if (journeySwitcherEl) {
    journeySwitcherEl.hidden = !showSwitcher;
  }

  if (journeyEditBtn) {
    journeyEditBtn.hidden = !showManage;
  }

  requestAnimationFrame(syncJourneyContextEditOffset);
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
  // Don't yank the user back to Near me while they're setting up a journey.
  if (isJourneysDialogOpen() || isOnboardingVisible()) {
    renderJourneySwitcher();
    syncChromeMode();
    return;
  }

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
  nearbyChromeAction?.classList.remove("onboarding-highlight");
  clearOnboardingCoachPosition();
  notifyAdOverlaySuppression();
}

function isOnboardingCoachInteractable() {
  if (!isOnboardingVisible()) {
    return false;
  }

  const card = onboardingCoach?.querySelector(".onboarding-coach-card");
  if (!card) {
    return false;
  }

  const rect = card.getBoundingClientRect();
  return (
    rect.width > 8 &&
    rect.height > 8 &&
    rect.bottom > 8 &&
    rect.top < window.innerHeight - 8 &&
    rect.right > 8 &&
    rect.left < window.innerWidth - 8
  );
}

function reconcileOnboardingOverlay() {
  if (!isOnboardingVisible()) {
    return;
  }

  if (!canShowOnboardingCoach() || !isOnboardingCoachInteractable()) {
    hideOnboardingCoach();
  }
}

function dismissStaleBlockingLayers() {
  const nativeDialogOpen = document.querySelector("dialog[open], .app-native-dialog[open]");
  if (!nativeDialogOpen && !isJourneysDialogOpen()) {
    document.body.classList.remove("app-dialog-open");
    const journeysBackdrop = document.getElementById("journeys-dialog-backdrop");
    if (journeysBackdrop) {
      journeysBackdrop.hidden = true;
    }
    document.querySelectorAll(".app-dialog-backdrop").forEach((backdrop) => {
      backdrop.hidden = true;
    });
    notifyAdOverlaySuppression();
  }

  reconcileOnboardingOverlay();
}

function clearOnboardingCoachPosition() {
  const card = onboardingCoach?.querySelector(".onboarding-coach-card");
  if (card) {
    card.style.top = "";
  }
}

/** Sit step 1 under the hero; step 2 just under My Journeys so the label stays visible. */
function syncOnboardingCoachPosition() {
  const card = onboardingCoach?.querySelector(".onboarding-coach-card");
  if (!card || !onboardingCoach || onboardingCoach.hidden) {
    return;
  }

  const isStep1 = onboardingCoach.classList.contains("onboarding-coach--step-1");
  const isStep2 = onboardingCoach.classList.contains("onboarding-coach--step-2");
  if (!isStep1 && !isStep2) {
    card.style.top = "";
    return;
  }

  const anchor = isStep1
    ? document.getElementById("hero")
    : document.getElementById("journeys-chrome-action");
  if (!anchor) {
    return;
  }

  const gap = isStep1 ? 12 : 10;
  const padding = 12;
  const anchorBottom = anchor.getBoundingClientRect().bottom;
  const cardHeight = card.getBoundingClientRect().height || 160;
  const maxTop = window.innerHeight - cardHeight - padding - 8;
  const top = Math.min(Math.max(anchorBottom + gap, padding), Math.max(padding, maxTop));
  card.style.top = `${Math.round(top)}px`;
}

function showOnboardingCoach(step) {
  if (!onboardingCoach || !canShowOnboardingCoach()) {
    return;
  }

  onboardingCoach.classList.remove("onboarding-coach--step-1", "onboarding-coach--step-2");
  onboardingCoach.classList.add(step === 2 ? "onboarding-coach--step-2" : "onboarding-coach--step-1");
  nearbyChromeAction?.classList.toggle("onboarding-highlight", step === 1);
  journeysChromeAction?.classList.toggle("onboarding-highlight", step === 2);
  onboardingCoach.hidden = false;
  // Native AdMob sits above the WebView — hide while bottom coaches are up.
  void window.NextTrainAds?.hideNativeBanner?.({ force: true });
  window.requestAnimationFrame(() => {
    syncOnboardingCoachPosition();
    window.requestAnimationFrame(() => reconcileOnboardingOverlay());
  });
}

function completeOnboarding() {
  localStorage.setItem(ONBOARDING_KEY, "1");
  sessionStorage.removeItem(ONBOARDING_DEFER_KEY);
  sessionStorage.removeItem(ONBOARDING_STEP_KEY);
  clearOnboardingSchedule();
  hideOnboardingCoach();
  if (onboardingStep1) {
    onboardingStep1.hidden = false;
  }
  if (onboardingStep2) {
    onboardingStep2.hidden = true;
  }
}

function deferOnboardingForSession() {
  if (hasCompletedOnboarding()) {
    return;
  }

  clearOnboardingSchedule();
  if (isOnboardingVisible()) {
    hideOnboardingCoach();
  }

  sessionStorage.setItem(ONBOARDING_DEFER_KEY, String(Date.now()));

  // User interacted before the coach appeared — try again after a quiet pause.
  onboardingPopulatedAt = Date.now();
  onboardingShowTimer = window.setTimeout(() => {
    onboardingShowTimer = null;
    if (
      !canShowOnboardingCoach() ||
      !isNearbyModeActive() ||
      !isNearbyFaceReadyForOnboarding()
    ) {
      return;
    }
    showOnboardingResumeStep();
  }, 8000);
}

/** Nearby coach only after the face is settled — not locate spinners or permission in flight. */
function isNearbyFaceReadyForOnboarding() {
  if (!isNearbyModeActive()) {
    return false;
  }

  if (nearbyLoading || nearbyBoardInflight || shouldShowNearbyLoadingState()) {
    return false;
  }

  // Cached board can paint before the user answers the location permission sheet.
  if (nearbySession?.gpsRefining) {
    return false;
  }

  if (!nearbySession?.station) {
    if (nearbyLocatePickerVisible && !nearbyUserPickedStation) {
      return true;
    }

    if (
      nearbyError &&
      (nearbyErrorKind === "location" || classifyNearbyError(nearbyError) === "location")
    ) {
      return true;
    }

    return false;
  }

  if (!nearbyBoard || nearbyError) {
    return false;
  }

  return true;
}

function clearOnboardingSchedule() {
  if (onboardingShowTimer) {
    clearTimeout(onboardingShowTimer);
    onboardingShowTimer = null;
  }
  onboardingPopulatedAt = null;
  onboardingNearbyFaceReady = false;
}

function maybeScheduleOnboarding() {
  if (!isNearbyModeActive()) {
    clearOnboardingSchedule();
    return;
  }

  const faceReady = isNearbyFaceReadyForOnboarding();
  if (!faceReady) {
    clearOnboardingSchedule();
    return;
  }

  if (!canShowOnboardingCoach()) {
    clearOnboardingSchedule();
    return;
  }

  if (hasCompletedOnboarding()) {
    return;
  }

  if (isTestMode()) {
    return;
  }

  // Board/GPS refresh must not yank step 2 (or an open step 1) back to the start.
  if (isOnboardingVisible()) {
    return;
  }

  if (!onboardingNearbyFaceReady) {
    onboardingNearbyFaceReady = true;
    onboardingPopulatedAt = Date.now();
  }

  const now = Date.now();
  const elapsed = now - (onboardingPopulatedAt ?? now);
  if (elapsed >= ONBOARDING_QUIET_MS) {
    clearTimeout(onboardingShowTimer);
    onboardingShowTimer = null;
    showOnboardingResumeStep();
    return;
  }

  if (onboardingShowTimer) {
    return;
  }

  onboardingShowTimer = window.setTimeout(() => {
    onboardingShowTimer = null;
    if (
      !canShowOnboardingCoach() ||
      isOnboardingVisible() ||
      !isNearbyFaceReadyForOnboarding()
    ) {
      return;
    }
    showOnboardingResumeStep();
  }, ONBOARDING_QUIET_MS - elapsed);
}

function getOnboardingResumeStep() {
  return sessionStorage.getItem(ONBOARDING_STEP_KEY) === "2" ? 2 : 1;
}

function showOnboardingResumeStep() {
  if (getOnboardingResumeStep() === 2) {
    showOnboardingStep2();
    return;
  }
  showOnboardingStep1();
}

function showOnboardingStep1() {
  sessionStorage.setItem(ONBOARDING_STEP_KEY, "1");
  if (!onboardingCoach || !canShowOnboardingCoach()) {
    return;
  }

  const step1Text = onboardingStep1?.querySelector("p");
  if (step1Text) {
    step1Text.textContent = nearbySession?.unsupportedRegion
      ? "Near me works when you're near Transperth stations."
      : "By default, Next Train shows departures at the station nearest you.";
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
  clearOnboardingSchedule();
  sessionStorage.setItem(ONBOARDING_STEP_KEY, "2");
  if (!canShowOnboardingCoach()) {
    return;
  }

  if (onboardingStep1) {
    onboardingStep1.hidden = true;
  }
  if (onboardingStep2) {
    onboardingStep2.hidden = false;
  }
  showOnboardingCoach(2);
}

function installOnboardingInteractionTracking() {
  // Defer only when the user taps the app beneath the coach — not coach buttons/scrim.
  const selector =
    "#hero, #nearby-btn, #journeys-btn, #menu-btn, #journey-switcher, .nearby-direction-row, #nearby-station-btn, #nearby-station-input, #detail-station-input";

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.target.closest("#onboarding-coach")) {
        return;
      }
      if (event.target.closest(selector)) {
        deferOnboardingForSession();
      }
    },
    { capture: true }
  );

  const scrim = onboardingCoach?.querySelector(".onboarding-coach-scrim");
  if (scrim) {
    scrim.addEventListener("click", () => {
      if (!isOnboardingVisible()) {
        return;
      }
      deferOnboardingForSession();
    });
  }
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
    });
  });

  for (const patch of patches) {
    const draftIndex = settingsDraftJourneys.findIndex((journey) => journey.id === patch.id);
    if (draftIndex >= 0) {
      settingsDraftJourneys[draftIndex] = normalizeJourney({
        ...settingsDraftJourneys[draftIndex],
        remindMe: patch.remindMe === true,
        preferredTrainTime: patch.preferredTrainTime || "",
      });
    }
  }

  persistSettings({ journeys });

  if (patches.some((patch) => patch.remindMe === true)) {
    window.nextTrainStickinessCoaches?.markCoachDone?.("reminder");
  }

  if (editingJourneyId && !settingsDetailView.hidden) {
    const journey =
      settingsDraftJourneys.find((entry) => entry.id === editingJourneyId) ??
      getJourneyById(editingJourneyId);
    if (journey) {
      populateDetailReminderFields(journey);
    }
  }
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

function normalizeActiveHoursFieldsForSave() {
  let defaultFrom = readOptionalTimeField(detailDefaultFromField);
  let defaultUntil = readOptionalTimeField(detailDefaultUntilField);

  if (defaultFrom && !defaultUntil) {
    defaultUntil = "";
    setOptionalTimeField(
      detailDefaultUntilInput,
      detailDefaultUntilDisplay,
      detailDefaultUntilField,
      detailDefaultUntilClear,
      ""
    );
  } else if (!defaultFrom && defaultUntil) {
    defaultFrom = "";
    setOptionalTimeField(
      detailDefaultFromInput,
      detailDefaultFromDisplay,
      detailDefaultFromField,
      detailDefaultFromClear,
      ""
    );
  }

  return { defaultFrom, defaultUntil };
}

function clearPairedActiveHourField(clearedSide) {
  if (clearedSide === "from") {
    setOptionalTimeField(
      detailDefaultUntilInput,
      detailDefaultUntilDisplay,
      detailDefaultUntilField,
      detailDefaultUntilClear,
      ""
    );
  } else if (clearedSide === "until") {
    setOptionalTimeField(
      detailDefaultFromInput,
      detailDefaultFromDisplay,
      detailDefaultFromField,
      detailDefaultFromClear,
      ""
    );
  }
  clearJourneyOverlapError();
  syncDetailComboHints();
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

  const syncFromInput = () => {
    setOptionalTimeField(input, display, field, clearBtn, input.value);
    syncDetailComboHints();
    if (field === detailPreferredField) {
      if (input.value && detailUseTargetTrainInput && !detailUseTargetTrainInput.checked) {
        detailUseTargetTrainInput.checked = true;
      }
      syncDetailTargetMasterVisibility();
    }
  };

  // Android WebView often fires `input` when the picker commits; `change` alone can miss.
  input.addEventListener("input", syncFromInput);
  input.addEventListener("change", syncFromInput);

  clearBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setOptionalTimeField(input, display, field, clearBtn, "");
    syncDetailComboHints();
    if (field === detailPreferredField) {
      if (detailUseTargetTrainInput) {
        detailUseTargetTrainInput.checked = false;
      }
      syncDetailTargetMasterVisibility();
    }
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
  syncLeaveBeforeSliderFill(minutes);
}

function syncLeaveBeforeSliderFill(minutes = detailLeaveBeforeInput?.value) {
  if (!detailLeaveBeforeInput) {
    return;
  }
  const min = Number(detailLeaveBeforeInput.min) || 1;
  const max = Number(detailLeaveBeforeInput.max) || 30;
  const value = Number(minutes);
  const clamped = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
  const pct = max === min ? 0 : ((clamped - min) / (max - min)) * 100;
  detailLeaveBeforeInput.style.setProperty("--leave-before-pct", `${pct}%`);
}

function syncLeaveBeforeControlsState() {
  // Time-to-station slider is only shown under Target; always enabled when visible.
  if (leaveBeforeField) {
    leaveBeforeField.classList.remove("leave-before-field--disabled");
  }
  if (detailLeaveBeforeInput) {
    detailLeaveBeforeInput.disabled = false;
  }
  if (detailLeaveBeforeValueEl) {
    detailLeaveBeforeValueEl.hidden = false;
  }
}

function isDetailTargetMasterOn() {
  return Boolean(detailUseTargetTrainInput?.checked);
}

function syncDetailTargetMasterVisibility({ seedTime = false } = {}) {
  const masterOn = isDetailTargetMasterOn();

  if (detailUseLeaveBeforeInput) {
    detailUseLeaveBeforeInput.checked = masterOn;
  }
  if (detailPreferredField) {
    detailPreferredField.hidden = !masterOn;
  }
  if (detailTargetNest) {
    detailTargetNest.hidden = !masterOn;
  }
  if (detailTargetMasterHint) {
    detailTargetMasterHint.hidden = masterOn;
  }

  if (!masterOn) {
    setOptionalTimeField(
      detailPreferredInput,
      detailPreferredDisplay,
      detailPreferredField,
      detailPreferredClear,
      ""
    );
    if (detailRemindMeInput) {
      detailRemindMeInput.checked = false;
    }
    if (detailRemindControls) {
      detailRemindControls.hidden = true;
    }
    syncLeaveBeforeControlsState();
    return;
  }

  if (seedTime && !hasDetailTargetTrain()) {
    const fallback =
      readOptionalTimeField(detailDefaultFromField) ||
      editingJourneySnapshot?.preferredTrainTime ||
      editingJourneySnapshot?.defaultFrom ||
      "07:30";
    setOptionalTimeField(
      detailPreferredInput,
      detailPreferredDisplay,
      detailPreferredField,
      detailPreferredClear,
      fallback
    );
  }

  syncLeaveBeforeControlsState();
  syncDetailTargetRemindVisibility();
}

function hasDetailTargetTrain() {
  return detailPreferredField?.dataset.empty === "false";
}

function syncDetailTargetRemindVisibility() {
  const controls = detailRemindControls || document.getElementById("detail-remind-controls");
  const masterOn = isDetailTargetMasterOn();
  const hasTarget = masterOn && hasDetailTargetTrain();

  if (controls) {
    controls.hidden = !hasTarget;
  }

  if (!hasTarget) {
    if (detailRemindMeInput?.checked) {
      detailRemindMeInput.checked = false;
    }
    return;
  }

  // Gentle pressure: default Remind me on when a target is first set.
  if (
    detailRemindMeInput &&
    !detailRemindMeInput.dataset.userTouched &&
    !templateWizardReminderDemoActive
  ) {
    detailRemindMeInput.checked = true;
  }
  if (!templateWizardReminderDemoActive) {
    void window.nextTrainLeaveReminders?.refreshJourneyRemindExtras?.();
    void window.nextTrainLeaveReminders?.ensureLiveCountdownDefaultOn?.();
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

function formatMinutesAsTime(totalMinutes) {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  return `${pad2(hour)}:${pad2(minute)}`;
}

function addMinutesToTimeString(time, minutesToAdd) {
  if (!time) {
    return "";
  }
  return formatMinutesAsTime(parseTimeToMinutes(time) + minutesToAdd);
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

function journeyActiveDaysOverlap(left, right) {
  const leftDays = new Set(getJourneyRemindDays(left));
  const rightDays = new Set(getJourneyRemindDays(right));
  for (const day of leftDays) {
    if (rightDays.has(day)) {
      return true;
    }
  }
  return false;
}

function findJourneyDefaultWindowConflict(journey, journeys) {
  if (!hasDefaultWindow(journey)) {
    return null;
  }

  if (
    parseTimeToMinutes(journey.defaultFrom) === parseTimeToMinutes(journey.defaultUntil)
  ) {
    const other = journeys.find(
      (entry) => entry.id !== journey.id && journeyActiveDaysOverlap(journey, entry)
    );
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
    if (
      journeyDefaultWindowsOverlap(journey, other) &&
      journeyActiveDaysOverlap(journey, other)
    ) {
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
  const match = configured.find((journey) => journeyMatchesSchedule(journey, minutes));
  if (match) {
    return match.id;
  }

  return null;
}

function findDefaultWindowJourneyAt(minutes = getPerthMinutesSinceMidnight()) {
  return (
    getConfiguredJourneys().find((journey) => journeyMatchesSchedule(journey, minutes)) ?? null
  );
}

function getDefaultWindowJourneyIds(minutes = getPerthMinutesSinceMidnight()) {
  return getConfiguredJourneys()
    .filter((journey) => journeyMatchesSchedule(journey, minutes))
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

  // Outside every Active window — drop stale override unless window context still matches.
  if (!scheduledId) {
    const storedWindowIds =
      override.matchingWindowIds ??
      (override.windowJourneyId ? [override.windowJourneyId] : []);
    const currentWindowIds = getDefaultWindowJourneyIds();
    if (!defaultWindowContextsMatch(storedWindowIds, currentWindowIds)) {
      clearManualJourneyOverride();
      return false;
    }
    if (settings.activeJourneyId === override.journeyId) {
      return true;
    }
    clearManualJourneyOverride();
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

  if (settings.activeJourneyId === override.journeyId) {
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

async function readUrlSettings() {
  const params = new URLSearchParams(window.location.search);
  const rawStation = params.get("station");
  const rawDirection = params.get("direction") ?? params.get("destination");

  if (!rawStation || !rawDirection) {
    return null;
  }

  const stationText = String(rawStation).trim();
  const directionText = String(rawDirection).trim();
  if (!stationText || !directionText) {
    return null;
  }

  if (stationText.length > 120 || directionText.length > 120) {
    return null;
  }

  const stations = await getStationsList();
  const catalog = new Set(stations);
  const normalizedStation = normalizeStation(stationText);
  if (!catalog.has(normalizedStation) && !catalog.has(stationText)) {
    return null;
  }

  const station = catalog.has(normalizedStation) ? normalizedStation : stationText;

  const journey = createDefaultJourney({
    name: "To work",
    station,
    direction: directionText,
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

function getWidgetSyncPluginForMaestro() {
  const native = window.Capacitor?.Plugins?.WidgetSync;
  if (native) {
    return native;
  }
  if (!window.Capacitor?.registerPlugin) {
    return null;
  }
  return window.Capacitor.registerPlugin("WidgetSync");
}

async function waitForWidgetSyncPlugin(maxMs = 8000) {
  const waitFn =
    window.NextTrainScripts?.waitForCapacitor ?? window.NextTrainAdFreeNative?.waitForCapacitor;
  if (waitFn) {
    await waitFn(maxMs);
  } else {
    const started = Date.now();
    while (!window.Capacitor && Date.now() - started < maxMs) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const plugin = getWidgetSyncPluginForMaestro();
    if (plugin) {
      try {
        await plugin.isDebugBuild();
        return plugin;
      } catch {
        // Native bridge not ready yet.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return getWidgetSyncPluginForMaestro();
}

async function peekMaestroSeedDeepLink(plugin, maxMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    try {
      const peek = await plugin.peekLaunchDeepLink();
      // Successful peek with no URI = normal cold start. Do not burn 5s polling.
      if (peek?.uri) {
        return String(peek.uri);
      }
      return null;
    } catch {
      // Bridge may still be starting — keep trying briefly.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}

function buildMaestroSeedSettingsFromParams(stationText, directionText, params = new URLSearchParams()) {
  const station = normalizeStation(String(stationText).trim()) || String(stationText).trim();
  const direction = String(directionText).trim();
  if (!station || !direction) {
    return null;
  }

  const preset =
    params.get("fixture") === "normal" || params.get("preset") === "morning"
      ? JOURNEY_TEMPLATE_PRESETS.morning
      : {};

  const journey = createDefaultJourney({
    ...preset,
    name: params.get("name") || preset.name || "Morning into town",
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

async function buildMaestroSeedSettings(stationText, directionText, params = new URLSearchParams()) {
  const stations = await getStationsList();
  const catalog = new Set(stations);
  const normalizedStation = normalizeStation(String(stationText).trim());
  const station = catalog.has(normalizedStation) ? normalizedStation : String(stationText).trim();
  const direction = String(directionText).trim();
  if (!station || !direction) {
    return null;
  }

  const preset =
    params.get("fixture") === "normal" || params.get("preset") === "morning"
      ? JOURNEY_TEMPLATE_PRESETS.morning
      : {};

  const journey = createDefaultJourney({
    ...preset,
    name: params.get("name") || preset.name || "Morning into town",
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

async function applyMaestroTestSeedFromDeepLink() {
  if (!isNativeApp()) {
    return false;
  }

  const plugin = await waitForWidgetSyncPlugin();
  if (!plugin) {
    return false;
  }

  try {
    const debugResult = await plugin.isDebugBuild();
    if (!debugResult?.debug) {
      return false;
    }

    const uri = await peekMaestroSeedDeepLink(plugin);
    if (!uri || !/^nexttrain:\/\/test\/seed(?:\?(.*))?$/i.test(uri)) {
      return false;
    }

    const match = String(uri).match(/^nexttrain:\/\/test\/seed(?:\?(.*))?$/i);
    const params = new URLSearchParams(match?.[1] ?? "");

    if (params.get("reset") === "1") {
      localStorage.clear();
      sessionStorage.clear();
    }
    sessionStorage.setItem("nextTrainTestMode", "1");

    const station = params.get("station");
    const direction = params.get("direction");
    let seedSettings = null;

    if (station && direction) {
      seedSettings = buildMaestroSeedSettingsFromParams(station, direction, params);
    } else if (params.get("preset") === "morning" || params.get("fixture") === "normal") {
      seedSettings = buildMaestroSeedSettingsFromParams("Edgewater Stn", "Perth", params);
    }

    if (!seedSettings) {
      return false;
    }

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(seedSettings));
    await plugin.clearLaunchDeepLink();
    return true;
  } catch (error) {
    console.warn("Maestro test seed failed", error);
    return false;
  }
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

function preferredMinutesForLiveGlance(journey) {
  const raw = journey?.preferredTrainTime || "";
  if (!raw) {
    return -1;
  }

  const minutes = parseTimeToMinutes(raw);
  return Number.isNaN(minutes) ? -1 : minutes;
}

function liveHorizonMinutes(journey) {
  const untilRaw = journey?.defaultUntil || "";
  if (!untilRaw) {
    return 24 * 60;
  }

  const minutes = parseTimeToMinutes(untilRaw);
  return Number.isNaN(minutes) ? 24 * 60 : minutes;
}

function formatPreferredClock(totalMinutes) {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  return `${hour}:${String(minute).padStart(2, "0")}`;
}

function tripMatchesPreferredOrLater(trip, preferredMinutes, horizonMinutes) {
  const iso = trip?.departure ?? trip?.arrival;
  if (!iso) {
    return false;
  }

  const departureMinutes = getPerthMinutesSinceMidnight(new Date(iso));
  if (departureMinutes < preferredMinutes) {
    return false;
  }

  if (
    horizonMinutes < 24 * 60 &&
    preferredMinutes < horizonMinutes &&
    departureMinutes >= horizonMinutes
  ) {
    return false;
  }

  return true;
}

function leaveByArmedForDisplayedTrip(trip, journey = getActiveJourney(), skipCount = skipTrains) {
  if (skipCount !== 0) {
    return true;
  }

  const preferredMinutes = preferredMinutesForLiveGlance(journey);
  if (preferredMinutes < 0) {
    return true;
  }

  if (!trip) {
    return false;
  }

  return tripMatchesPreferredOrLater(trip, preferredMinutes, liveHorizonMinutes(journey));
}

const TARGET_TRAIN_GAP_WARN_MINUTES = 25;

function targetTrainGapMinutes(journey = getActiveJourney()) {
  const preferredMinutes = preferredMinutesForLiveGlance(journey);
  if (preferredMinutes < 0 || !lastApiData?.next?.departure) {
    return null;
  }
  if (!leaveByArmedForDisplayedTrip(lastApiData.next, journey, skipTrains)) {
    return null;
  }
  const departureMinutes = getPerthMinutesSinceMidnight(new Date(lastApiData.next.departure));
  let gap = departureMinutes - preferredMinutes;
  if (gap < 0) {
    gap += 24 * 60;
  }
  return gap;
}

function preferredHintForJourney(journey = getActiveJourney()) {
  const preferredMinutes = preferredMinutesForLiveGlance(journey);
  if (preferredMinutes < 0) {
    return "";
  }

  const gapMinutes = targetTrainGapMinutes(journey);
  if (gapMinutes != null && gapMinutes >= TARGET_TRAIN_GAP_WARN_MINUTES) {
    return `Target ${formatPreferredClock(preferredMinutes)} · next is ${gapMinutes} min later`;
  }

  return `Target ${formatPreferredClock(preferredMinutes)}`;
}

function findPreferredTripSkipIndex(data, journey = getActiveJourney()) {
  const preferredMinutes = preferredMinutesForLiveGlance(journey);
  if (preferredMinutes < 0 || !data) {
    return -1;
  }

  const upcoming = getUpcomingTrips(data);
  const horizon = liveHorizonMinutes(journey);
  for (let index = 0; index < upcoming.length; index += 1) {
    if (tripMatchesPreferredOrLater(upcoming[index], preferredMinutes, horizon)) {
      return index;
    }
  }
  return -1;
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
  setAccessibleText(journeySwitcherNameEl, active?.name ?? "Journey");
  journeySwitcherEl.setAttribute(
    "aria-label",
    `Switch journey: ${active?.name ?? "Journey"}`
  );

  journeySwitcherMenuEl.innerHTML = "";

  for (const journey of getConfiguredJourneys()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "journey-switcher-option";
    if (journey.id === settings.activeJourneyId) {
      button.classList.add("active");
    }
    const routeSpan = document.createElement("span");
    routeSpan.className = "journey-switcher-option-route";
    routeSpan.textContent = formatJourneyRoute(journey);
    button.append(document.createTextNode(journey.name), routeSpan);
    button.addEventListener("click", () => {
      closeJourneySwitcherMenu();
      switchJourney(journey.id);
    });
    journeySwitcherMenuEl.appendChild(button);
  }

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

function applyNearbySkipOptimistic(direction, skip) {
  if (!nearbyBoard?.entries?.length || !direction) {
    return;
  }

  for (const entry of nearbyBoard.entries) {
    if (entry.direction !== direction || !entry.data) {
      continue;
    }

    entry.data = applyNearbySkip(normalizeApiTrainData(entry.data), skip);
  }

  renderNearbyBoard();
}

function skipToNextTrain() {
  if (isNearbyModeActive()) {
    const entry = getNearbyFocusedEntry();
    if (!entry || !canSkipToNextTrain()) {
      return;
    }

    clearNearbyPin();
    const nextSkip = getNearbySkip(entry.direction) + 1;
    setNearbySkip(entry.direction, nextSkip);
    dismissSwipeHint();
    applyNearbySkipOptimistic(entry.direction, nextSkip);
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

    clearNearbyPin();
    const nextSkip = Math.max(0, getNearbySkip(entry.direction) - 1);
    setNearbySkip(entry.direction, nextSkip);
    dismissSwipeHint();
    applyNearbySkipOptimistic(entry.direction, nextSkip);
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

  const fixture = getActiveFixture() || (isTestMode() ? "normal" : null);
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

function getLeaveAckTarget() {
  // Leave card can outlive lastRenderedNext during refresh; fall back to cached API data.
  if (lastRenderedNext) {
    return lastRenderedNext;
  }
  if (!lastApiData) {
    return null;
  }
  return prepareDisplayData(lastApiData).next ?? null;
}

function acknowledgeLeave(next) {
  if (!next) {
    return;
  }
  sessionStorage.setItem(leaveAckStorageKey(next), "1");
  const journey = getActiveJourney();
  const departure = resolveTripDeparture(next);
  window.nextTrainLeaveReminders?.acknowledgeDeparture?.(journey?.id, departure);
  if (leaveCardActionsEl) {
    leaveCardActionsEl.hidden = true;
    leaveCardActionsEl.classList.remove("leave-card-actions--visible");
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
        detailLeaveBeforeInput?.focus({ preventScroll: true });
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
  if (
    !swipeHintEl ||
    hasSeenSwipeHint() ||
    heroEl?.classList.contains("hero-setup") ||
    !lastRenderedNext
  ) {
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
  swipeLastX = 0;
  swipeLastY = 0;
}

function handleHeroSwipeEnd(event) {
  if (heroEl.classList.contains("hero-setup")) {
    resetHeroSwipePointer(event);
    return;
  }

  if (heroSwipePointerId === null || event.pointerId !== heroSwipePointerId) {
    return;
  }

  swipeLastX = event.clientX;
  swipeLastY = event.clientY;
  const deltaX = swipeLastX - swipeStartX;
  const deltaY = swipeLastY - swipeStartY;
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

  const trackHeroPointer = (event) => {
    if (heroEl.classList.contains("hero-setup") || !event.isPrimary) {
      return;
    }

    swipeStartX = event.clientX;
    swipeStartY = event.clientY;
    swipeLastX = event.clientX;
    swipeLastY = event.clientY;
    heroSwipePointerId = event.pointerId;

    try {
      heroEl.setPointerCapture(event.pointerId);
    } catch {
      // Keep tracking — window pointerup handles release when capture fails.
    }
  };

  const moveHeroPointer = (event) => {
    if (heroSwipePointerId !== event.pointerId) {
      return;
    }

    swipeLastX = event.clientX;
    swipeLastY = event.clientY;
  };

  heroEl.addEventListener("pointerdown", trackHeroPointer, { passive: true });
  heroEl.addEventListener("pointermove", moveHeroPointer, { passive: true });
  heroEl.addEventListener("pointerup", handleHeroSwipeEnd);
  heroEl.addEventListener("pointercancel", handleHeroSwipeEnd);
  heroEl.addEventListener("lostpointercapture", handleHeroSwipeEnd);
  window.addEventListener("pointerup", handleHeroSwipeEnd);
  window.addEventListener("pointercancel", handleHeroSwipeEnd);
}

function render(data, { stale = false } = {}) {
  lastLiveDisplayMinute = getPerthMinutesSinceMidnight();
  hideNearbyPinLeaveSurfaces();

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
  setRouteDisplay(journey ? formatJourneyRoute(journey) : "Set up a journey");
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
    if (preferredHintEl) {
      preferredHintEl.hidden = true;
    }
    if (leaveCardActionsEl) {
      leaveCardActionsEl.hidden = true;
      leaveCardActionsEl.classList.remove("leave-card-actions--visible");
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
  const leaveArmed = leaveByArmedForDisplayedTrip(next, journey);
  const showLeaveCard = journeyUsesLeaveBefore(journey) && !leaveAcknowledged && leaveArmed;
  const showPreferredHint =
    journeyUsesLeaveBefore(journey) &&
    !leaveAcknowledged &&
    !leaveArmed &&
    skipTrains === 0 &&
    preferredMinutesForLiveGlance(journey) >= 0;
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

  if (preferredHintEl) {
    if (showPreferredHint) {
      preferredHintEl.textContent = preferredHintForJourney(journey);
      preferredHintEl.hidden = false;
    } else {
      preferredHintEl.hidden = true;
    }
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

  if (leaveCardActionsEl) {
    leaveCardActionsEl.hidden = !showLateNag;
    leaveCardActionsEl.classList.toggle("leave-card-actions--visible", showLateNag);
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
  hideNearbyPinLeaveSurfaces();
  clearHeroSetupState();
  lastRenderedNext = null;
  heroEl?.classList.remove("stale");
  leaveCardEl?.classList.remove("stale");

  const journey = getActiveJourney();
  setRouteDisplay(journey ? formatJourneyRoute(journey) : "Set up a journey");
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
  hideNearbyPinLeaveSurfaces();
  syncChromeMode();

  errorEl.hidden = true;
  setRouteDisplay("Journeys");
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

async function getGeolocationPosition() {
  const options = { timeout: 15000, maximumAge: 60000 };

  try {
    return await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        ...options,
        enableHighAccuracy: false,
      });
    });
  } catch {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        ...options,
        enableHighAccuracy: true,
      });
    });
  }
}

async function findNearestStation({ forceFresh = false, allowSessionShortcut = true } = {}) {
  if (isTestMode()) {
    return { station: "Edgewater Stn", distanceKm: 0.2 };
  }

  // Only skip GPS when caller explicitly allows it (not the background refine path).
  if (allowSessionShortcut && !forceFresh && nearbySession?.station) {
    return {
      station: nearbySession.station,
      distanceKm:
        typeof nearbySession.distanceKm === "number" ? nearbySession.distanceKm : 0,
    };
  }

  const geoTimeoutMs = forceFresh ? 15000 : 10000;
  // Load station catalog and GPS in parallel — don't serialise a local JSON read ahead of the fix.
  const [coords, position] = await Promise.all([
    loadStationCoords(),
    getAppGeolocationPosition({
      // Soft locate reuses a recent fused fix (station-level). forceFresh only for rare hard refresh.
      enableHighAccuracy: forceFresh,
      timeout: geoTimeoutMs,
      maximumAge: forceFresh ? 0 : NEARBY_SOFT_LOCATION_MAX_AGE_MS,
    }),
  ]);

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

function isUnsupportedRegion(distanceKm) {
  return typeof distanceKm === "number" && distanceKm > UNSUPPORTED_REGION_KM;
}

function renderUnsupportedRegionBoard() {
  lastRenderedNext = null;
  errorEl.hidden = true;
  setRouteDisplay("Near me");
  updatedEl.textContent = "";
  updatedEl.hidden = true;
  setHeroUrgency("calm");
  heroEl?.classList.remove("locating");
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
  if (nearbyFallbackEl) {
    nearbyFallbackEl.hidden = true;
  }
  if (nearbyDirectionsListEl) {
    nearbyDirectionsListEl.innerHTML = "";
  }

  if (departCountdownEl) {
    departCountdownEl.classList.add("hero-setup-message");
    departCountdownEl.replaceChildren();

    const title = document.createElement("span");
    title.className = "hero-empty-title";
    title.textContent = "Perth rail only";

    const text = document.createElement("span");
    text.className = "hero-empty-text";
    text.textContent =
      "Next Train's Near me board works near Transperth stations. You're outside that area right now.";

    const hint = document.createElement("span");
    hint.className = "hero-empty-hint";
    hint.textContent =
      "You can still save journeys under My Journeys for when you're in Perth.";

    const journeysBtn = document.createElement("button");
    journeysBtn.type = "button";
    journeysBtn.className = "btn-primary hero-empty-primary";
    journeysBtn.textContent = "My Journeys";
    journeysBtn.addEventListener("click", () => enterJourneyMode());

    departCountdownEl.append(title, text, hint, journeysBtn);
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

function readLastNearbyStationCache() {
  try {
    const raw = localStorage.getItem(LAST_NEARBY_STATION_KEY);
    if (!raw) {
      return null;
    }

    const data = JSON.parse(raw);
    if (!data?.station) {
      return null;
    }

    if (
      typeof data.savedAtMs === "number" &&
      Date.now() - data.savedAtMs > LAST_NEARBY_STATION_MAX_AGE_MS
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function readCachedNearbyBoard(cache = readLastNearbyStationCache()) {
  if (!cache?.station || !cache?.board?.entries?.length) {
    return null;
  }
  if (
    typeof cache.boardSavedAtMs !== "number" ||
    Date.now() - cache.boardSavedAtMs > LAST_NEARBY_BOARD_MAX_AGE_MS
  ) {
    return null;
  }
  return cache.board;
}

function writeLastNearbyStationCache({ station, distanceKm = null, board = undefined } = {}) {
  if (!station) {
    return;
  }

  let previous = null;
  try {
    previous = JSON.parse(localStorage.getItem(LAST_NEARBY_STATION_KEY) || "null");
  } catch {
    previous = null;
  }

  const nextBoard = board === undefined ? previous?.board ?? null : board;
  const nextBoardSavedAtMs =
    board === undefined
      ? previous?.boardSavedAtMs ?? null
      : board
        ? Date.now()
        : null;

  const payload = {
    station,
    distanceKm: typeof distanceKm === "number" ? distanceKm : null,
    savedAtMs: Date.now(),
    board: nextBoard,
    boardSavedAtMs: nextBoardSavedAtMs,
  };

  try {
    localStorage.setItem(LAST_NEARBY_STATION_KEY, JSON.stringify(payload));
  } catch {
    // Board snapshots can be large — fall back to station-only so reopen still skips GPS wait.
    try {
      localStorage.setItem(
        LAST_NEARBY_STATION_KEY,
        JSON.stringify({
          station: payload.station,
          distanceKm: payload.distanceKm,
          savedAtMs: payload.savedAtMs,
          board: null,
          boardSavedAtMs: null,
        })
      );
    } catch {
      // Ignore — cache is best-effort.
    }
  }
}

function clearLastNearbyStationCache() {
  localStorage.removeItem(LAST_NEARBY_STATION_KEY);
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

function getNearbyPin() {
  return nearbySession?.pin ?? null;
}

function clearNearbyPin() {
  if (nearbySession) {
    nearbySession.pin = null;
  }
}

function nearbyPinExpiryMs(pin = getNearbyPin()) {
  if (!pin?.departureIso) {
    return 0;
  }
  const departureMs = Date.parse(pin.departureIso);
  if (!Number.isFinite(departureMs)) {
    return 0;
  }
  return departureMs + NEARBY_PIN_HOLD_MS;
}

function isNearbyPinHolding(pin = getNearbyPin()) {
  if (!pin || !nearbySession?.station) {
    return false;
  }
  if (pin.station !== nearbySession.station) {
    return false;
  }
  return Date.now() < nearbyPinExpiryMs(pin);
}

function isNearbyPinShowing(direction = nearbySession?.focusedDirection) {
  const pin = getNearbyPin();
  return Boolean(isNearbyPinHolding(pin) && pin.direction === direction);
}

function setNearbyPinFromTrip(direction, trip) {
  if (!nearbySession?.station || !direction || !trip) {
    return;
  }

  const departureIso = resolveTripDeparture(trip);
  if (!departureIso) {
    return;
  }

  nearbySession.pin = {
    station: nearbySession.station,
    direction,
    departureIso,
    trip: { ...trip, departure: departureIso, arrival: departureIso },
  };
}

/**
 * When a Near me pin is active for this direction, keep that departure selected
 * (and hold a snapshot for up to 1 minute after it leaves).
 */
function applyNearbyPinToData(direction, data) {
  const pin = getNearbyPin();
  if (!pin || pin.direction !== direction || pin.station !== nearbySession?.station) {
    return applyNearbySkip(data, getNearbySkip(direction));
  }

  if (!isNearbyPinHolding(pin)) {
    clearNearbyPin();
    setNearbySkip(direction, 0);
    return applyNearbySkip(data, 0);
  }

  const normalized = normalizeApiTrainData(data);
  const upcoming = getUpcomingTrips(normalized);
  const idx = upcoming.findIndex(
    (trip) => resolveTripDeparture(trip) === pin.departureIso
  );

  if (idx >= 0) {
    const live = upcoming[idx];
    setNearbySkip(direction, idx);
    nearbySession.pin = {
      ...pin,
      trip: { ...live, departure: pin.departureIso, arrival: pin.departureIso },
    };
    return applyNearbySkip(normalized, idx);
  }

  // Train already dropped from the board — keep showing it through the hold window.
  const snapshot = ensureFullNext(
    pin.trip ?? { departure: pin.departureIso, arrival: pin.departureIso },
    0,
    pin.departureIso
  );
  const realNext = normalized.next;
  return {
    ...normalized,
    next: snapshot,
    following: realNext ? slimFollowing(realNext) : null,
  };
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
  const pinHolds =
    isNearbyPinHolding() &&
    getNearbyPin()?.direction === direction &&
    getNearbyPin()?.station === station;
  const requestSkip = pinHolds ? 0 : skip;

  const params = new URLSearchParams({
    station,
    direction,
    destination: direction,
    leaveBefore: "0",
    refresh: String(settings.refreshSeconds),
    skipTrains: String(requestSkip),
  });

  const fixture = getActiveFixture() || (isTestMode() ? "normal" : null);
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
            skipTrains: requestSkip,
          })) ?? payload;
      } catch (error) {
        console.warn("Nearby live-times fallback failed", error);
      }
    }
  }

  const normalized = normalizeApiTrainData(payload);
  if (pinHolds) {
    return applyNearbyPinToData(direction, normalized);
  }
  return applyNearbySkip(normalized, skip);
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

async function ensureNearbyStationOptions({ force = false } = {}) {
  if (!nearbyStationCombobox) {
    return;
  }

  if (!force && stationsCache?.length) {
    setStationComboboxValue(nearbyStationCombobox, nearbySession?.station ?? "");
    return;
  }

  await getStationsList();
  setStationComboboxValue(nearbyStationCombobox, nearbySession?.station ?? "");
}

const NEARBY_LOCATE_COPY = "Finding your nearest station…";
const NEARBY_BOARD_LOADING_COPY = "Loading departures…";
/** Nearest catalog station farther than this → Perth-rail-only empty state (Near me blocked). */
const UNSUPPORTED_REGION_KM = 50;

/** Keep calm on a normal GPS fix (~1–4s). Offer escape only when it is actually slow. */
const NEARBY_LOCATE_DONT_WAIT_MS = 7000;
/** While the system permission sheet is up, offer escape sooner so the 7s GPS wait is fair. */
const NEARBY_LOCATE_PERMISSION_ESCAPE_MS = 2500;

function stopNearbyLocateTimers() {
  if (nearbyLocateTimer) {
    clearInterval(nearbyLocateTimer);
    nearbyLocateTimer = null;
  }
  if (nearbyLocateDontWaitTimer) {
    clearTimeout(nearbyLocateDontWaitTimer);
    nearbyLocateDontWaitTimer = null;
  }
}

function syncNearbyDontWaitButton() {
  if (!nearbyDontWaitBtn) {
    return;
  }

  const show = nearbyLoading && nearbyDontWaitVisible && !nearbyLocatePickerVisible;
  nearbyDontWaitBtn.hidden = !show;
}

function showNearbyDontWaitOffer() {
  if (nearbyDontWaitVisible || nearbyLocatePickerVisible) {
    return;
  }

  nearbyDontWaitVisible = true;
  syncNearbyDontWaitButton();
}

function showNearbyEarlyPicker() {
  if (!nearbyDirectionsEl || nearbyLocatePickerVisible) {
    return;
  }

  nearbyLocatePickerVisible = true;
  nearbyDontWaitVisible = false;
  syncNearbyDontWaitButton();
  nearbyDirectionsEl.hidden = false;
  if (nearbyDirectionsListEl) {
    nearbyDirectionsListEl.innerHTML = "";
  }
  const directionsLabel = nearbyDirectionsEl.querySelector(".nearby-directions-label");
  if (directionsLabel) {
    directionsLabel.hidden = true;
  }
  nearbyFallbackEl.hidden = false;
  if (nearbyFallbackTextEl) {
    nearbyFallbackTextEl.textContent = "Choose a station — we’ll show the next train.";
  }
  ensureNearbyStationOptions();
}

function dismissNearbyLocatePicker() {
  nearbyLocatePickerVisible = false;
}

function shouldShowNearbyLoadingState() {
  if (nearbySession?.unsupportedRegion) {
    return false;
  }

  if (nearbyLocatePickerVisible && !nearbySession?.station && !nearbyUserPickedStation) {
    return false;
  }

  if (nearbyError && !nearbySession?.station) {
    return false;
  }

  return (
    nearbyLoading ||
    Boolean(nearbyBoardInflight) ||
    (Boolean(nearbySession?.station) && !nearbyBoard && !nearbyError)
  );
}

function nearbyLoadingRouteCopy() {
  return nearbySession?.station ? formatNearbyRouteLine() : NEARBY_LOCATE_COPY;
}

function nearbyLoadingHeroCopy() {
  return nearbySession?.station ? NEARBY_BOARD_LOADING_COPY : NEARBY_LOCATE_COPY;
}

function startNearbyLocateTimers(delayMs = NEARBY_LOCATE_DONT_WAIT_MS) {
  stopNearbyLocateTimers();
  nearbyLocateStartedAt = Date.now();
  nearbyLocatePickerVisible = false;
  nearbyDontWaitVisible = false;
  syncNearbyDontWaitButton();

  nearbyLocateDontWaitTimer = window.setTimeout(() => {
    nearbyLocateDontWaitTimer = null;
    if (
      !isNearbyModeActive() ||
      !nearbyLoading ||
      nearbyLocatePickerVisible ||
      nearbyUserPickedStation
    ) {
      return;
    }
    showNearbyDontWaitOffer();
    renderNearbyBoard();
  }, delayMs);
}

function isNearbyLocateCurrent(generation) {
  return generation === nearbyLocateGeneration && Boolean(nearbySession);
}

async function locateNearbyInBackground({ forceFresh = false } = {}) {
  const generation = ++nearbyLocateGeneration;
  const previousStation = nearbySession?.station ?? null;

  try {
    // Soft by default: reuse a recent fused fix. Never short-circuit on session station —
    // that's what the optimistic cache paint sets, and we still need a real nearest check.
    const nearest = await findNearestStation({
      forceFresh,
      allowSessionShortcut: false,
    });
    // User may have left Near me (or started a newer locate) while GPS resolved.
    if (!isNearbyLocateCurrent(generation)) {
      return;
    }

    if (nearbyUserPickedStation) {
      writeLastNearbyStationCache({
        station: nearbySession?.station,
        distanceKm: nearbySession?.distanceKm,
      });
      stopNearbyLocateTimers();
      nearbyLoading = false;
      setNearbyGpsRefining(false);
      dismissNearbyLocatePicker();
      nearbyDontWaitVisible = false;
      syncNearbyDontWaitButton();
      renderNearbyBoard();
      return;
    }

    if (nearbyLocatePickerVisible) {
      stopNearbyLocateTimers();
      nearbyLoading = false;
      setNearbyGpsRefining(false);
      syncNearbyDontWaitButton();
      renderNearbyBoard();
      return;
    }

    if (isUnsupportedRegion(nearest.distanceKm)) {
      clearLastNearbyStationCache();
      nearbySession.unsupportedRegion = true;
      nearbySession.station = null;
      nearbySession.distanceKm = nearest.distanceKm;
      nearbySession.fromCache = false;
      setNearbyGpsRefining(false);
      nearbyBoard = null;
      nearbyLoading = false;
      stopNearbyLocateTimers();
      nearbyLocatePickerVisible = false;
      nearbyDontWaitVisible = false;
      syncNearbyDontWaitButton();
      renderNearbyBoard();
      return;
    }

    const stationChanged = Boolean(previousStation && nearest.station !== previousStation);

    nearbySession.unsupportedRegion = false;
    nearbySession.fromCache = false;
    setNearbyGpsRefining(false);
    nearbySession.station = nearest.station;
    nearbySession.distanceKm = nearest.distanceKm;
    if (stationChanged) {
      nearbySession.refineNotice = "Updated to nearest station";
    }
    writeLastNearbyStationCache({
      station: nearest.station,
      distanceKm: nearest.distanceKm,
    });
    stopNearbyLocateTimers();
    nearbyLocatePickerVisible = false;
    nearbyDontWaitVisible = false;
    syncNearbyDontWaitButton();
    try {
      if (stationChanged || !nearbyBoard) {
        await fetchNearbyBoard();
      }
      if (!isNearbyLocateCurrent(generation)) {
        return;
      }
      clearNearbyError();
    } catch (error) {
      if (!isNearbyLocateCurrent(generation)) {
        return;
      }
      setNearbyError(error.message ?? "Could not load departures for this station", "board");
    } finally {
      if (isNearbyLocateCurrent(generation)) {
        nearbyLoading = false;
      }
    }
    if (!isNearbyLocateCurrent(generation)) {
      return;
    }
    renderNearbyBoard();
  } catch (error) {
    stopNearbyLocateTimers();
    if (!isNearbyLocateCurrent(generation)) {
      return;
    }
    setNearbyGpsRefining(false);
    nearbyLoading = false;
    nearbyDontWaitVisible = false;
    syncNearbyDontWaitButton();
    if (!nearbySession.station && !nearbyUserPickedStation) {
      setNearbyError(locationErrorFrom(error).message, "location");
      renderNearbyBoard();
      return;
    }

    if (nearbySession.station) {
      try {
        if (!nearbyBoard) {
          await fetchNearbyBoard();
        }
        if (!isNearbyLocateCurrent(generation)) {
          return;
        }
        clearNearbyError();
        renderNearbyBoard();
      } catch (fetchError) {
        if (!isNearbyLocateCurrent(generation)) {
          return;
        }
        errorEl.textContent = fetchError.message;
        errorEl.hidden = false;
        renderNearbyBoard({ stale: true });
      }
    }
  }
}

function showNearbyFallback(message) {
  setNearbyError(message);
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
  const directionsLabel = nearbyDirectionsEl?.querySelector(".nearby-directions-label");
  if (directionsLabel) {
    directionsLabel.hidden = false;
  }
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

  if (shouldShowNearbyLoadingState()) {
    lastRenderedNext = null;
    setRouteDisplay(nearbyLoadingRouteCopy());
    setHeroUrgency("calm");
    heroEl?.classList.add("locating");
    if (heroDepartLabelEl) {
      heroDepartLabelEl.textContent = "Next Train";
    }
    if (departCountdownEl) {
      departCountdownEl.innerHTML =
        '<span class="locate-spinner locate-spinner--hero" aria-hidden="true"></span>';
    }
    if (departDisplayTimeEl) {
      departDisplayTimeEl.textContent = nearbyLoadingHeroCopy();
    }
    if (heroScheduledTimeEl) {
      heroScheduledTimeEl.hidden = true;
    }
    if (leaveCardEl) {
      leaveCardEl.hidden = true;
    }
    if (nearbyLocatePickerVisible) {
      nearbyDirectionsEl.hidden = false;
      if (nearbyDirectionsListEl) {
        nearbyDirectionsListEl.innerHTML = "";
      }
      const directionsLabel = nearbyDirectionsEl.querySelector(".nearby-directions-label");
      if (directionsLabel) {
        directionsLabel.hidden = true;
      }
      nearbyFallbackEl.hidden = false;
      if (nearbyFallbackTextEl) {
        nearbyFallbackTextEl.textContent = "Choose a station — we’ll show the next train.";
      }
      void ensureNearbyStationOptions();
    } else {
      nearbyDirectionsEl.hidden = true;
    }
    syncNearbyDontWaitButton();
    followingSectionEl.hidden = true;
    if (nearbySession?.gpsRefining) {
      updatedEl.textContent = "Checking location…";
    } else {
      updatedEl.textContent = "Updating…";
    }
    updateSwipeHint();
    updateSwipeCues();
    return;
  }

  heroEl?.classList.remove("locating");
  nearbyDontWaitVisible = false;
  syncNearbyDontWaitButton();

  if (nearbyLocatePickerVisible && !nearbySession?.station && !nearbyUserPickedStation) {
    lastRenderedNext = null;
    setRouteDisplay("Near me");
    setHeroUrgency("calm");
    if (heroDepartLabelEl) {
      heroDepartLabelEl.textContent = "Next Train";
    }
    if (departCountdownEl) {
      departCountdownEl.textContent = "—";
    }
    if (departDisplayTimeEl) {
      departDisplayTimeEl.textContent = "Choose a station below";
    }
    if (heroScheduledTimeEl) {
      heroScheduledTimeEl.hidden = true;
    }
    if (leaveCardEl) {
      leaveCardEl.hidden = true;
    }
    nearbyDirectionsEl.hidden = false;
    nearbyFallbackEl.hidden = false;
    if (nearbyFallbackTextEl) {
      nearbyFallbackTextEl.textContent = "Choose a station below";
    }
    void ensureNearbyStationOptions();
    platformEl.textContent = "—";
    statusEl.textContent = "—";
    followingSectionEl.hidden = true;
    updatedEl.textContent = "Choose a station below";
    updateSwipeHint();
    updateSwipeCues();
    maybeScheduleOnboarding();
    return;
  }

  if (nearbySession?.unsupportedRegion) {
    renderUnsupportedRegionBoard();
    maybeScheduleOnboarding();
    return;
  }

  if (nearbyError) {
    setRouteDisplay(formatNearbyRouteLine());
    setHeroUrgency("calm");
    if (heroDepartLabelEl) {
      heroDepartLabelEl.textContent = "Near me";
    }
    if (departCountdownEl) {
      departCountdownEl.textContent = "—";
    }
    if (departDisplayTimeEl) {
      const kind = nearbyErrorKind || classifyNearbyError(nearbyError);
      departDisplayTimeEl.textContent =
        kind === "board" ? "Times unavailable" : "Location needed";
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
  let boardData = focusedEntry?.data ?? null;
  if (focusedEntry?.direction && boardData && isNearbyPinShowing(focusedEntry.direction)) {
    // Re-apply pin against the cached board so skip stays locked between fetches.
    boardData = applyNearbyPinToData(focusedEntry.direction, boardData);
    focusedEntry.data = boardData;
  } else if (getNearbyPin() && !isNearbyPinHolding()) {
    const expiredDirection = getNearbyPin()?.direction;
    clearNearbyPin();
    if (expiredDirection) {
      setNearbySkip(expiredDirection, 0);
      void fetchNearbyBoard()
        .then(() => renderNearbyBoard())
        .catch(() => renderNearbyBoard({ stale: true }));
      return;
    }
  }

  const next = boardData?.next ?? null;
  setRouteDisplay(formatNearbyRouteLine());
  if (nearbySession?.refineNotice) {
    updatedEl.textContent = nearbySession.refineNotice;
    nearbySession.refineNotice = null;
  } else if (nearbySession?.gpsRefining) {
    updatedEl.textContent = "Checking location…";
  } else {
    updatedEl.textContent = stale
      ? "Update failed — times may be out of date"
      : nearbyBoard?.lastUpdated
        ? `Updated ${nearbyBoard.lastUpdated}`
        : "Updated just now";
  }

  if (!next) {
    if (shouldShowNearbyLoadingState()) {
      return;
    }

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

  const pinned = isNearbyPinShowing(focusedEntry?.direction);
  if (heroDepartLabelEl) {
    heroDepartLabelEl.textContent = pinned ? "Pinned Train" : "Next Train";
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
  renderThenTrains(boardData);
  nearbyDirectionsEl.hidden = false;
  renderNearbyDirectionsList();
  updateSwipeHint();
  updateSwipeCues();
  maybeScheduleOnboarding();
}

function nearbyBoardHasDepartures(board = nearbyBoard) {
  return Boolean(board?.entries?.some((entry) => entry.data?.next));
}

function nearbyBoardLooksEmpty(board = nearbyBoard) {
  return Boolean(board?.entries?.length) && !nearbyBoardHasDepartures(board);
}

async function fetchNearbyBoard() {
  if (!nearbySession?.station) {
    return;
  }

  if (nearbyBoardInflight) {
    nearbyBoardRefetchPending = true;
    return nearbyBoardInflight;
  }

  nearbyBoardInflight = fetchNearbyBoardOnce().finally(() => {
    nearbyBoardInflight = null;
    renderNearbyBoard();
    if (nearbyBoardRefetchPending) {
      nearbyBoardRefetchPending = false;
      void fetchNearbyBoard();
    }
  });

  if (nearbyBoardLooksEmpty()) {
    renderNearbyBoard();
  }

  return nearbyBoardInflight;
}

async function fetchNearbyBoardOnce() {
  const station = nearbySession?.station;
  if (!station) {
    return;
  }

  let directions = [];
  try {
    directions = await fetchDirectionsFromApi(station);
  } catch (error) {
    console.warn("Nearby directions lookup failed", error);
    if (isTestMode()) {
      directions = ["Perth", "Mandurah", "Joondalup"];
    } else {
      throw error;
    }
  }
  let fetchFailures = 0;
  const settled = await Promise.all(
    directions.map(async (direction) => {
      try {
        const data = await fetchNearbyDirectionData(station, direction, getNearbySkip(direction));
        return { direction, data };
      } catch (error) {
        fetchFailures += 1;
        console.warn(`Nearby fetch failed for ${direction}`, error);
        return null;
      }
    })
  );
  const entries = settled.filter(Boolean);

  if (!nearbySession || nearbySession.station !== station) {
    return;
  }

  if (!entries.length) {
    if (fetchFailures > 0) {
      throw new Error("Could not load departures for this station");
    }

    // Station known but no live/scheduled trips (overnight). Not a location failure.
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
      entries: directions.map((direction) => ({
        direction,
        data: { next: null, following: [], scheduleSource: "empty" },
      })),
    };
    if (
      !nearbySession.focusedDirection ||
      !directions.includes(nearbySession.focusedDirection)
    ) {
      nearbySession.focusedDirection = directions[0] ?? null;
    }
    writeLastNearbyStationCache({
      station,
      distanceKm: nearbySession.distanceKm,
      board: nearbyBoard,
    });
    return;
  }

  if (
    !nearbySession.focusedDirection ||
    !entries.some((entry) => entry.direction === nearbySession.focusedDirection)
  ) {
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
  writeLastNearbyStationCache({
    station,
    distanceKm: nearbySession.distanceKm,
    board: nearbyBoard,
  });
}

function focusNearbyDirection(direction) {
  if (!nearbySession || nearbySession.focusedDirection === direction) {
    return;
  }

  nearbySession.focusedDirection = direction;
  renderNearbyBoard();
}

function setNearbyGpsRefining(value) {
  if (nearbySession) {
    nearbySession.gpsRefining = value;
  }
}

async function enterNearbyMode({ station: manualStation, distanceKm = null } = {}) {
  journeyModeActive = false;
  clearManualJourneyOverride();
  dismissLeaveHint();
  closeJourneySwitcherMenu();
  stopNearbyLocateTimers();
  clearOnboardingSchedule();
  nearbyUserPickedStation = Boolean(manualStation);
  nearbyLocatePickerVisible = false;
  nearbyDontWaitVisible = false;
  nearbyBoard = null;
  clearNearbyError();
  nearbyLoading = true;

  if (manualStation) {
    nearbySession = {
      station: manualStation,
      distanceKm,
      focusedDirection: null,
      skipByDirection: {},
    };
    syncNearbyChrome();
    renderNearbyBoard();

    try {
      await fetchNearbyBoard();
      clearNearbyError();
      writeLastNearbyStationCache({ station: manualStation, distanceKm });
    } catch (error) {
      setNearbyError(error.message ?? "Could not load departures for this station", "board");
    } finally {
      nearbyLoading = false;
    }
    renderNearbyBoard();
    return;
  }

  // Paint last Near me station (+ board if fresh) immediately — don't wait on GPS / permission.
  // 9/10 visits the station is unchanged; GPS refine swaps if it moved.
  const cachedStation = readLastNearbyStationCache();
  if (cachedStation?.station) {
    const cachedBoard = readCachedNearbyBoard(cachedStation);
    nearbySession = {
      station: cachedStation.station,
      // Don't show a stale km crumb until GPS refine returns.
      distanceKm: null,
      fromCache: true,
      gpsRefining: true,
      focusedDirection: cachedBoard?.focusedDirection ?? null,
      skipByDirection: {},
    };
    if (cachedBoard) {
      nearbyBoard = {
        lastUpdated: cachedBoard.lastUpdated ?? "just now",
        entries: cachedBoard.entries,
      };
      if (
        !nearbySession.focusedDirection ||
        !nearbyBoard.entries.some((entry) => entry.direction === nearbySession.focusedDirection)
      ) {
        nearbySession.focusedDirection = pickSoonestNearbyDirection(nearbyBoard.entries);
      }
      nearbyLoading = false;
    }
    syncNearbyChrome();
    renderNearbyBoard();

    void (async () => {
      try {
        await fetchNearbyBoard();
        clearNearbyError();
      } catch (error) {
        // Keep a useful cached board; surface failure when the face would be misleading empty.
        if (!nearbyBoardHasDepartures()) {
          setNearbyError(error.message ?? "Could not load departures for this station", "board");
        }
      } finally {
        nearbyLoading = false;
        renderNearbyBoard();
      }
    })();

    void (async () => {
      if (isNativeApp()) {
        try {
          await ensureGeoBridge();
          if (typeof window.NextTrainGeo?.ensureLocationPermission === "function") {
            await window.NextTrainGeo.ensureLocationPermission();
          }
        } catch (error) {
          // Keep cached board; permission / geo failures shouldn't blank a useful face.
          if (nearbySession) {
            setNearbyGpsRefining(false);
          }
          renderNearbyBoard();
          return;
        }
      }
      void locateNearbyInBackground({ forceFresh: false });
    })();
    return;
  }

  // No cache — show locating UI immediately. Don’t wait uses a short delay during
  // permission, then a fresh 7s after permission so GPS wait isn’t “already due”.
  nearbySession = {
    station: null,
    distanceKm: null,
    focusedDirection: null,
    skipByDirection: {},
  };
  syncNearbyChrome();
  renderNearbyBoard();
  startNearbyLocateTimers(NEARBY_LOCATE_PERMISSION_ESCAPE_MS);

  void (async () => {
    if (isNativeApp()) {
      try {
        await ensureGeoBridge();
        if (typeof window.NextTrainGeo?.ensureLocationPermission === "function") {
          await window.NextTrainGeo.ensureLocationPermission();
        }
      } catch (error) {
        if (!isNearbyModeActive()) {
          return;
        }
        nearbyLoading = false;
        stopNearbyLocateTimers();
        setNearbyError(locationErrorFrom(error).message, "location");
        syncNearbyChrome();
        renderNearbyBoard();
        return;
      }
    }

    if (!isNearbyModeActive() || nearbyUserPickedStation || nearbyLocatePickerVisible) {
      return;
    }

    // Permission done — start the real 7s GPS clock unless escape is already up.
    if (!nearbyDontWaitVisible) {
      startNearbyLocateTimers(NEARBY_LOCATE_DONT_WAIT_MS);
    }
    void locateNearbyInBackground();
  })();
}

function exitNearbyMode() {
  hideNearbyPinLeaveSurfaces();
  stopNearbyLocateTimers();
  dismissNearbyLocatePicker();
  nearbyDontWaitVisible = false;
  syncNearbyDontWaitButton();
  nearbyUserPickedStation = false;
  nearbyLocateGeneration += 1;
  nearbySession = null;
  nearbyBoard = null;
  nearbyBoardInflight = null;
  nearbyLoading = false;
  clearNearbyError();
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
    if (nearbySession?.unsupportedRegion) {
      renderNearbyBoard();
      return;
    }

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
  updateSwipeHint();
  updateSwipeCues();

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
    trackProductEvent("api_error_shown", { surface: "journey" });

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
    const pin = getNearbyPin();
    const pinExpired = Boolean(pin && !isNearbyPinHolding(pin));
    if (!force && minute === lastLiveDisplayMinute && !pinExpired) {
      return;
    }

    if (pinExpired) {
      const direction = pin.direction;
      clearNearbyPin();
      if (direction) {
        setNearbySkip(direction, 0);
      }
      void fetchNearbyBoard()
        .then(() => renderNearbyBoard())
        .catch(() => renderNearbyBoard({ stale: true }));
      lastLiveDisplayMinute = minute;
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

function replaceSelectOptions(selectEl, options) {
  selectEl.replaceChildren();

  for (const { value, label, disabled, selected } of options) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    if (disabled) {
      option.disabled = true;
    }
    if (selected) {
      option.selected = true;
    }
    selectEl.appendChild(option);
  }
}

function renderStationOptions(selectEl, selectedStation) {
  const stations = stationsCache ?? [];
  replaceSelectOptions(selectEl, [
    {
      value: "",
      label: "Choose station…",
      disabled: true,
      selected: !selectedStation,
    },
    ...stations.map((name) => ({
      value: name,
      label: formatStationLabel(name),
      selected: name === selectedStation,
    })),
  ]);
}

function filterStationsByQuery(query) {
  const stations = stationsCache ?? [];
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) {
    return stations;
  }

  return stations.filter((name) => formatStationLabel(name).toLowerCase().includes(normalized));
}

function createStationCombobox(root, { onChange, required = false, hideFooterOnOpen = false } = {}) {
  const trigger = root?.querySelector(".station-combobox-input");
  const list = root?.querySelector(".station-combobox-list");
  if (!trigger || !list) {
    return null;
  }

  const shouldHideFooter =
    hideFooterOnOpen || root.id === "detail-station-combobox";

  let dropdown = root.querySelector(".station-combobox-dropdown");
  if (!dropdown) {
    dropdown = document.createElement("div");
    dropdown.className = "station-combobox-dropdown";
    list.parentNode.insertBefore(dropdown, list);
    dropdown.appendChild(list);
  }

  let searchInput = dropdown.querySelector(".station-combobox-search-input");
  if (!searchInput) {
    searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "station-combobox-search-input";
    searchInput.placeholder = "Type a station";
    searchInput.setAttribute("autocomplete", "off");
    searchInput.setAttribute("aria-label", "Search stations");
    searchInput.hidden = true;
    dropdown.insertBefore(searchInput, list);
  }

  let selectedValue = "";
  let activeIndex = -1;
  let suppressBlurClose = false;
  let suppressOpenUntil = 0;
  let mode = "closed";

  function canOpenPicker() {
    return Date.now() >= suppressOpenUntil;
  }

  function markPickerJustClosed() {
    suppressOpenUntil = Date.now() + 350;
  }

  function setFooterHidden(hidden) {
    if (!shouldHideFooter) {
      return;
    }
    const detailView = document.getElementById("settings-detail-view");
    if (!detailView) {
      return;
    }
    detailView.classList.toggle("station-picker-open", Boolean(hidden));
  }

  function setExpanded(expanded) {
    trigger.setAttribute("aria-expanded", expanded ? "true" : "false");
    root.classList.toggle("station-combobox--open", expanded);
    dropdown.hidden = !expanded;
    list.hidden = !expanded;
  }

  function updateTriggerLabel() {
    trigger.value = selectedValue ? formatStationLabel(selectedValue) : "";
    trigger.placeholder = selectedValue ? "" : "Choose station";
  }

  function closeList({ restoreSelection = true } = {}) {
    mode = "closed";
    setExpanded(false);
    activeIndex = -1;
    searchInput.hidden = true;
    searchInput.value = "";
    setFooterHidden(false);
    if (restoreSelection) {
      updateTriggerLabel();
    }
  }

  function renderList(query = "") {
    const matches = filterStationsByQuery(query);
    list.innerHTML = "";

    if (mode === "browse") {
      const searchRow = document.createElement("li");
      searchRow.className = "station-combobox-search";
      searchRow.setAttribute("role", "option");
      searchRow.textContent = "Search stations";
      searchRow.addEventListener("mousedown", (event) => {
        event.preventDefault();
        suppressBlurClose = true;
      });
      searchRow.addEventListener("click", () => {
        enterSearchMode();
      });
      list.appendChild(searchRow);
    }

    if (!matches.length) {
      const empty = document.createElement("li");
      empty.className = "station-combobox-empty";
      empty.textContent = mode === "search" ? "No stations match" : "No stations available";
      empty.setAttribute("aria-disabled", "true");
      list.appendChild(empty);
      activeIndex = -1;
      return;
    }

    const optionOffset = mode === "browse" ? 1 : 0;
    matches.forEach((name, index) => {
      const item = document.createElement("li");
      item.className = "station-combobox-option";
      item.setAttribute("role", "option");
      item.dataset.value = name;
      item.textContent = formatStationLabel(name);
      if (name === selectedValue) {
        item.setAttribute("aria-selected", "true");
      }
      const optionIndex = index + optionOffset;
      if (optionIndex === activeIndex) {
        item.classList.add("station-combobox-option--active");
      }
      item.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        suppressBlurClose = true;
      });
      item.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        suppressBlurClose = true;
      });
      item.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectStation(name);
      });
      list.appendChild(item);
    });
  }

  function openBrowse() {
    mode = "browse";
    activeIndex = -1;
    searchInput.hidden = true;
    searchInput.value = "";
    setExpanded(true);
    setFooterHidden(true);
    renderList("");
  }

  function enterSearchMode() {
    mode = "search";
    activeIndex = 0;
    searchInput.hidden = false;
    searchInput.value = "";
    renderList("");
    window.setTimeout(() => {
      searchInput.focus();
    }, 0);
  }

  function selectStation(name, { silent = false } = {}) {
    selectedValue = name || "";
    updateTriggerLabel();
    closeList({ restoreSelection: false });
    markPickerJustClosed();
    if (shouldHideFooter) {
      document.getElementById("settings-detail-view")?.classList.remove("station-picker-open");
    }
    if (!silent && typeof onChange === "function") {
      onChange(selectedValue);
    }
  }

  function setValue(name, { silent = false } = {}) {
    selectStation(name, { silent });
  }

  function getValue() {
    return selectedValue;
  }

  function focus() {
    openBrowse();
  }

  function getFocusableOptions() {
    return [...list.querySelectorAll(".station-combobox-option, .station-combobox-search")];
  }

  trigger.readOnly = true;
  updateTriggerLabel();

  trigger.addEventListener("pointerdown", (event) => {
    if (mode === "closed" && canOpenPicker()) {
      event.preventDefault();
      openBrowse();
    }
  });

  trigger.addEventListener("click", (event) => {
    if (mode === "closed" && canOpenPicker()) {
      event.preventDefault();
      openBrowse();
    }
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mode !== "closed") {
      event.preventDefault();
      closeList();
      return;
    }

    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
      event.preventDefault();
      if (mode === "closed") {
        openBrowse();
      }
    }
  });

  searchInput.addEventListener("input", () => {
    activeIndex = 0;
    renderList(searchInput.value);
  });

  searchInput.addEventListener("keydown", (event) => {
    const options = getFocusableOptions();
    if (event.key === "Escape") {
      event.preventDefault();
      closeList();
      trigger.focus();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!options.length) {
        return;
      }
      activeIndex = Math.min(activeIndex + 1, options.length - 1);
      renderList(searchInput.value);
      options[activeIndex]?.scrollIntoView({ block: "nearest" });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!options.length) {
        return;
      }
      activeIndex = Math.max(activeIndex - 1, 0);
      renderList(searchInput.value);
      options[activeIndex]?.scrollIntoView({ block: "nearest" });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const pick = options[activeIndex >= 0 ? activeIndex : 0];
      if (pick?.classList.contains("station-combobox-search")) {
        return;
      }
      if (pick?.dataset.value) {
        selectStation(pick.dataset.value);
      }
    }
  });

  searchInput.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (suppressBlurClose) {
        suppressBlurClose = false;
        return;
      }
      if (mode !== "closed" && !root.contains(document.activeElement)) {
        closeList();
      }
    }, 120);
  });

  document.addEventListener("pointerdown", (event) => {
    if (!root.contains(event.target)) {
      closeList();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mode !== "closed") {
      event.preventDefault();
      closeList();
      trigger.focus();
    }
  });

  return {
    getValue,
    setValue,
    focus,
    openBrowse,
    closeList,
    enterSearchMode,
    required,
    trigger,
    searchInput,
    list,
  };
}

let detailStationCombobox = null;
let nearbyStationCombobox = null;

function initStationComboboxes() {
  if (detailStationComboboxRoot) {
    detailStationCombobox = createStationCombobox(detailStationComboboxRoot, {
      required: true,
      hideFooterOnOpen: true,
      onChange: (station) => loadDirectionsForSelect(detailDirectionSelect, station),
    });
  }

  if (nearbyStationComboboxRoot) {
    nearbyStationCombobox = createStationCombobox(nearbyStationComboboxRoot, {
      onChange: (station) => {
        if (station && isNearbyModeActive()) {
          void applyNearbyManualStation(station);
        }
      },
    });
  }
}

function setStationComboboxValue(combobox, station) {
  combobox?.setValue(station || "", { silent: true });
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
    replaceSelectOptions(selectEl, [{ value: "", label: "Choose station first" }]);
    selectEl.disabled = true;
    return;
  }

  replaceSelectOptions(selectEl, [{ value: "", label: "Loading…" }]);
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
    const normalizedPreferred = normalizeDirection(preferredDirection);
    const options = directions.map((dir) => ({ value: dir, label: dir }));

    if (normalizedPreferred && !directions.includes(normalizedPreferred)) {
      options.unshift({ value: normalizedPreferred, label: normalizedPreferred });
    }

    if (options.length === 0) {
      replaceSelectOptions(selectEl, [
        { value: "", label: "No directions available" },
      ]);
    } else {
      replaceSelectOptions(selectEl, options);
      if (normalizedPreferred && options.some((opt) => opt.value === normalizedPreferred)) {
        selectEl.value = normalizedPreferred;
      }
    }
  } catch (error) {
    if (requestId !== directionsRequestId) {
      return;
    }
    const normalizedPreferred = normalizeDirection(preferredDirection);
    if (normalizedPreferred) {
      replaceSelectOptions(selectEl, [
        { value: normalizedPreferred, label: normalizedPreferred },
      ]);
      selectEl.value = normalizedPreferred;
    } else if (isTestMode()) {
      replaceSelectOptions(selectEl, [
        { value: "Perth", label: "Perth" },
        { value: "Mandurah", label: "Mandurah" },
      ]);
    } else {
      replaceSelectOptions(selectEl, [
        { value: "", label: "Couldn’t load directions — try again" },
      ]);
    }
    console.warn("Could not load directions", error);
  }

  if (requestId === directionsRequestId) {
    selectEl.disabled = false;
  }
}

function openJourneysDialogSync() {
  if (!journeysDialog || isJourneysDialogOpen()) {
    return;
  }

  pauseOnboardingForOverlay();
  const backdrop = document.getElementById("journeys-dialog-backdrop");
  if (backdrop) {
    backdrop.hidden = false;
  }

  journeysDialog.hidden = false;
  document.body.classList.add("app-dialog-open");
  notifyAdOverlaySuppression();
  if (isNativeApp()) {
    void window.NextTrainAds?.hideNativeBanner?.({ force: true });
  }
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
    notifyAdOverlaySuppression();
    if (isNearbyModeActive() && isNearbyFaceReadyForOnboarding() && !hasCompletedOnboarding()) {
      maybeScheduleOnboarding();
    }
  }
}

function syncJourneysDetailChrome() {
  if (!journeysDetailChrome) {
    return;
  }
  const show = Boolean(settingsDetailView && !settingsDetailView.hidden);
  journeysDetailChrome.hidden = !show;
  journeysDetailChrome.setAttribute("aria-hidden", show ? "false" : "true");
}

function syncJourneysDialogSheetMode() {
  if (!journeysDialog) {
    return;
  }
  const onList = Boolean(settingsListView && !settingsListView.hidden);
  journeysDialog.classList.toggle("journeys-dialog--list", onList);
  journeysDialog.classList.toggle("journeys-dialog--detail", !onList);
  syncJourneysDetailChrome();
}

function showSettingsListView() {
  settingsListView.hidden = false;
  settingsDetailView.hidden = true;
  editingJourneyId = null;
  editingJourneySnapshot = null;
  syncJourneysDialogSheetMode();
  updateJourneyTemplatesVisibility();
}

function showSettingsDetailView() {
  settingsListView.hidden = true;
  settingsDetailView.hidden = false;
  syncJourneysDialogSheetMode();
  if (isNativeApp()) {
    void window.NextTrainAds?.hideNativeBanner?.({ force: true });
    notifyAdOverlaySuppression();
  }
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

let templateWizardStep = 1;
let templateWizardContext = null;
let templateWizardReminderArmGeneration = 0;
let templateWizardReminderArmTimers = [];
let templateWizardReminderDemoActive = false;
let templateWizardReminderPermissionRequested = false;

function templateWizardShouldDockCoachBottom(step = templateWizardStep) {
  // Legacy hook — scroll padding only; coach position is computed in syncTemplateWizardCoachPosition.
  return (
    step === getTemplateWizardHoursStep() ||
    step === getTemplateWizardTimeStep() ||
    step === getTemplateWizardReminderStep()
  );
}

function templateWizardRectsOverlap(rectA, rectB, gap = 8) {
  return (
    rectA.left < rectB.right - gap &&
    rectA.right > rectB.left + gap &&
    rectA.top < rectB.bottom - gap &&
    rectA.bottom > rectB.top + gap
  );
}

function applyTemplateWizardCoachTop(card, topPx, padding, maxTop) {
  const top = Math.max(padding, Math.min(topPx, maxTop));
  card.style.top = `${top}px`;
  card.style.bottom = "auto";
}

function applyTemplateWizardCoachBottom(card, bottomPx) {
  card.style.top = "auto";
  card.style.bottom = `${bottomPx}px`;
}

function syncTemplateWizardCoachPosition() {
  const card = templateRouteCoach?.querySelector(".onboarding-coach-card");
  if (!card || !templateRouteCoach || templateRouteCoach.hidden) {
    return;
  }

  const target = getTemplateWizardHighlightTarget();

  if (!target) {
    return;
  }

  templateRouteCoach.classList.remove("template-route-coach--dock-bottom");

  // Active hours step: always dock coach at bottom so fields stay tappable.
  if (templateWizardStep === getTemplateWizardHoursStep()) {
    const padding = 12;
    applyTemplateWizardCoachBottom(card, padding);
    templateRouteCoach.classList.add("template-route-coach--dock-bottom");
    return;
  }

  const coachRect = templateRouteCoach.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const cardHeight = card.offsetHeight;
  const gap = 10;
  const padding = 12;
  const maxTop = coachRect.height - cardHeight - padding;

  const candidates = [
    { top: targetRect.top - coachRect.top - cardHeight - gap },
    { top: targetRect.bottom - coachRect.top + gap },
    { bottom: padding },
  ];

  for (const candidate of candidates) {
    if (candidate.top !== undefined) {
      applyTemplateWizardCoachTop(card, candidate.top, padding, maxTop);
    } else {
      applyTemplateWizardCoachBottom(card, candidate.bottom);
    }

    const cardRect = card.getBoundingClientRect();
    if (!templateWizardRectsOverlap(cardRect, targetRect)) {
      if (candidate.bottom !== undefined) {
        templateRouteCoach.classList.add("template-route-coach--dock-bottom");
      }
      return;
    }
  }

  applyTemplateWizardCoachTop(card, padding, padding, maxTop);
}

function templateWizardUsesNameStep(context = templateWizardContext) {
  return context?.useNameStep === true;
}

function getTemplateWizardRouteStep(context = templateWizardContext) {
  return templateWizardUsesNameStep(context) ? 2 : 1;
}

/** Active hours / days — before Target train. */
function getTemplateWizardHoursStep(context = templateWizardContext) {
  return templateWizardUsesNameStep(context) ? 3 : 2;
}

/** Target train nest (walk buffer + reminders unlock). */
function getTemplateWizardTimeStep(context = templateWizardContext) {
  return templateWizardUsesNameStep(context) ? 4 : 3;
}

function getTemplateWizardReminderStep(context = templateWizardContext) {
  return getTemplateWizardTimeStep(context) + 1;
}

function getTemplateWizardMaxStep(context = templateWizardContext) {
  return getTemplateWizardReminderStep(context);
}

function getTemplateWizardHighlightTarget(
  step = templateWizardStep,
  context = templateWizardContext
) {
  if (templateWizardUsesNameStep(context) && step === 1) {
    return detailJourneyNameField;
  }

  if (step === getTemplateWizardRouteStep(context)) {
    return detailRouteSection;
  }
  if (step === getTemplateWizardHoursStep(context)) {
    return detailJourneyWindow || document.getElementById("detail-timing-section");
  }
  if (step === getTemplateWizardTimeStep(context)) {
    return detailTargetMaster || detailPreferredSection || detailPreferredField;
  }
  if (step === getTemplateWizardReminderStep(context)) {
    return detailRemindControls || detailReminderSection;
  }

  return null;
}

function getTemplateWizardStepTitleId(
  step = templateWizardStep,
  context = templateWizardContext
) {
  if (templateWizardUsesNameStep(context) && step === 1) {
    return "template-wizard-step-name-title";
  }
  if (step === getTemplateWizardRouteStep(context)) {
    return "template-wizard-step-1-title";
  }
  if (step === getTemplateWizardHoursStep(context)) {
    return "template-wizard-step-3-title";
  }
  if (step === getTemplateWizardTimeStep(context)) {
    return "template-wizard-step-2-title";
  }
  if (step === getTemplateWizardReminderStep(context)) {
    return "template-wizard-step-reminder-title";
  }
  return "template-wizard-step-1-title";
}

function escapeTemplateHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function populateTemplateWizardNameBody(journey, templateKey) {
  if (!templateWizardNameBody) {
    return;
  }

  const label =
    templateKey === "evening"
      ? "Evening home"
      : templateKey === "custom"
        ? "custom journey"
        : "Morning into town";
  const name = journey?.name || label;
  templateWizardNameBody.innerHTML = `We've called this journey <strong>${escapeTemplateHtml(name)}</strong>. Change it anytime.`;
}

function populateTemplateWizardHoursBody(journey, templateKey) {
  if (!templateWizardHoursBody) {
    return;
  }

  const windowLabel = formatJourneyDefaultWindow(journey);
  const period =
    templateKey === "evening"
      ? "evenings"
      : templateKey === "custom"
        ? "weekday mornings"
        : "mornings";
  const example =
    windowLabel && windowLabel !== "Not set"
      ? ` — e.g. ${period} ${windowLabel}`
      : templateKey === "custom"
        ? " — e.g. weekday mornings"
        : "";
  templateWizardHoursBody.textContent = `This journey shows on your main screen during these hours${example}.`;
}

function populateTemplateRouteCoachBody(context = templateWizardContext) {
  if (!templateRouteCoachBody || !context) {
    return;
  }

  const { templateKey, journey, nearest, configured, error, routeLoading } = context;
  const step1Title = document.getElementById("template-wizard-step-1-title");
  if (step1Title) {
    step1Title.textContent =
      templateKey === "custom" ? "Pick your route" : "Route picked for you";
  }

  if (routeLoading) {
    templateRouteCoachBody.innerHTML =
      '<span class="template-route-loading"><span class="locate-spinner" aria-hidden="true"></span> Finding your nearest station…</span>';
    return;
  }

  const templateLabel =
    templateKey === "evening"
      ? "Evening home"
      : templateKey === "custom"
        ? "custom journey"
        : "Morning into town";

  if (templateKey === "custom") {
    if (journey?.station) {
      const station = formatStationLabel(journey.station);
      const distance =
        typeof nearest?.distanceKm === "number"
          ? ` (${nearest.distanceKm.toFixed(1)} km)`
          : "";
      templateRouteCoachBody.textContent = journey.direction
        ? `We filled in your nearest station ${station}${distance} → ${journey.direction}. Change station or direction above.`
        : `We filled in your nearest station ${station}${distance}. Pick a direction above (or change station).`;
    } else if (error?.code === 1) {
      templateRouteCoachBody.textContent =
        "Location permission was denied, so we couldn't pick your nearest station. Open Settings → Apps → Next Train → Location → Allow, or choose your station and direction — you can tap Use nearest station if you change your mind.";
    } else if (error) {
      templateRouteCoachBody.textContent =
        "We couldn't find your nearest station just now. Pick your station and direction — you can tap Use nearest station for a shortcut.";
    } else {
      templateRouteCoachBody.textContent =
        "Pick your station and direction above. You can tap Use nearest station for a shortcut.";
    }
  } else if (configured && journey?.station && journey?.direction) {
    const station = formatStationLabel(journey.station);
    const distance =
      typeof nearest?.distanceKm === "number"
        ? ` (${nearest.distanceKm.toFixed(1)} km)`
        : "";
    templateRouteCoachBody.textContent = `For ${templateLabel.toLowerCase()} we defaulted to your nearest station ${station}${distance} → ${journey.direction}. Change station or direction above.`;
  } else if (error?.code === 1) {
    templateRouteCoachBody.textContent =
      "Location permission was denied, so we couldn't pick your nearest station. Open Settings → Apps → Next Train → Location → Allow, or choose your station and direction — you can tap Use nearest station if you change your mind.";
  } else if (
    templateKey === "morning" &&
    nearest?.station &&
    PERTH_STATIONS.has(normalizeStation(nearest.station))
  ) {
    templateRouteCoachBody.textContent = "Pick your station and direction above.";
  } else {
    templateRouteCoachBody.textContent =
      "We couldn't auto-fill your route just now. Pick your station and direction — you can tap Use nearest station for a shortcut.";
  }
}

function updateTemplateRouteCoachState(patch) {
  if (!templateWizardContext) {
    return;
  }

  templateWizardContext = { ...templateWizardContext, ...patch };
  if (templateWizardContext.journey) {
    populateTemplateWizardHoursBody(
      templateWizardContext.journey,
      templateWizardContext.templateKey
    );
  }

  if (templateWizardStep === getTemplateWizardRouteStep()) {
    populateTemplateRouteCoachBody();
  }
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
  detailJourneyNameField?.classList.remove("template-wizard-highlight");
  detailRouteSection?.classList.remove("template-wizard-highlight");
  detailPreferredSection?.classList.remove("template-wizard-highlight");
  detailTargetMaster?.classList.remove("template-wizard-highlight");
  leaveBeforeField?.classList.remove("template-wizard-highlight");
  detailJourneyWindow?.classList.remove("template-wizard-highlight");
  detailReminderSection?.classList.remove("template-wizard-highlight");
  detailRemindControls?.classList.remove("template-wizard-highlight");

  const target = getTemplateWizardHighlightTarget(step);
  if (target) {
    target.classList.add("template-wizard-highlight");
    const scrollBlock =
      step === getTemplateWizardHoursStep() ||
      step === getTemplateWizardTimeStep() ||
      step === getTemplateWizardReminderStep()
        ? "start"
        : "nearest";
    window.requestAnimationFrame(() => {
      target.scrollIntoView({
        block: scrollBlock,
        behavior: "smooth",
      });
      window.setTimeout(() => syncTemplateWizardCoachPosition(), 320);
    });
  }
}

function syncTemplateWizardChrome() {
  const active = Boolean(templateRouteCoach && !templateRouteCoach.hidden);
  const reminderStep = active && templateWizardStep === getTemplateWizardReminderStep();
  journeysDialog?.classList.toggle("template-wizard-active", active);
  journeysDialog?.classList.toggle("template-wizard-reminder-step", reminderStep);

  if (!templateRouteCoach) {
    return;
  }

  templateRouteCoach.classList.remove(
    "template-route-coach--step-1",
    "template-route-coach--step-2",
    "template-route-coach--step-3",
    "template-route-coach--step-4",
    "template-route-coach--step-5"
  );
  if (active) {
    templateRouteCoach.classList.add(`template-route-coach--step-${templateWizardStep}`);
    window.requestAnimationFrame(() => syncTemplateWizardCoachPosition());
  } else {
    templateRouteCoach.classList.remove("template-route-coach--dock-bottom");
  }
}

function renderTemplateWizardStep() {
  const useName = templateWizardUsesNameStep();
  const routeStep = getTemplateWizardRouteStep();
  const timeStep = getTemplateWizardTimeStep();
  const hoursStep = getTemplateWizardHoursStep();
  const reminderStep = getTemplateWizardReminderStep();

  if (templateWizardStepName) {
    templateWizardStepName.hidden = !(useName && templateWizardStep === 1);
  }
  if (templateWizardStep1) {
    templateWizardStep1.hidden = templateWizardStep !== routeStep;
  }
  if (templateWizardStep2) {
    templateWizardStep2.hidden = templateWizardStep !== timeStep;
  }
  if (templateWizardStep3) {
    templateWizardStep3.hidden = templateWizardStep !== hoursStep;
  }
  if (templateWizardStepReminder) {
    templateWizardStepReminder.hidden = templateWizardStep !== reminderStep;
  }

  if (templateRouteCoach) {
    templateRouteCoach.setAttribute("aria-labelledby", getTemplateWizardStepTitleId());
  }

  if (templateWizardPrimaryBtn) {
    templateWizardPrimaryBtn.textContent =
      templateWizardStep === getTemplateWizardMaxStep() ? "Got it" : "Next";
  }

  syncTemplateWizardHighlight();
  syncTemplateWizardChrome();

  if (templateWizardStep === reminderStep) {
    void armRemindersForWizardStep({ animate: true });
  } else {
    cancelTemplateWizardReminderArm();
  }
}

function cancelTemplateWizardReminderArm() {
  templateWizardReminderArmGeneration += 1;
  templateWizardReminderDemoActive = false;
  templateWizardReminderPermissionRequested = false;
  for (const timerId of templateWizardReminderArmTimers) {
    window.clearTimeout(timerId);
  }
  templateWizardReminderArmTimers = [];
  return templateWizardReminderArmGeneration;
}

function isTemplateWizardReminderArmActive(generation) {
  return (
    generation === templateWizardReminderArmGeneration &&
    templateWizardStep === getTemplateWizardReminderStep() &&
    Boolean(templateRouteCoach && !templateRouteCoach.hidden)
  );
}

function templateWizardReminderDelay(ms, generation) {
  return new Promise((resolve, reject) => {
    const timerId = window.setTimeout(() => {
      templateWizardReminderArmTimers = templateWizardReminderArmTimers.filter((id) => id !== timerId);
      if (!isTemplateWizardReminderArmActive(generation)) {
        reject(new DOMException("Template wizard reminder arm cancelled", "AbortError"));
        return;
      }
      resolve();
    }, ms);
    templateWizardReminderArmTimers.push(timerId);
  });
}

function pulseTemplateWizardToggleRow(element) {
  if (!element) {
    return;
  }
  element.classList.add("template-wizard-toggle-on");
  window.setTimeout(() => {
    element.classList.remove("template-wizard-toggle-on");
  }, 650);
}

async function requestTemplateWizardReminderPermission() {
  if (templateWizardReminderPermissionRequested) {
    return;
  }
  templateWizardReminderPermissionRequested = true;

  const settings = await window.nextTrainLeaveReminders?.enableLeaveReminders?.({
    userInitiated: true,
  });
  if (settings?.permissionGranted === false) {
    await revertDetailRemindersForDeniedPermission();
    syncDetailTargetRemindVisibility();
    return;
  }
  await window.nextTrainLeaveReminders?.ensureLiveCountdownDefaultOn?.();
  syncDetailTargetRemindVisibility();
}

/** Default Remind me + Live Countdown on, and ask for notification permission once. */
function armRemindersForWizardStep({ animate = false } = {}) {
  const generation = cancelTemplateWizardReminderArm();

  void (async () => {
    if (animate) {
      templateWizardReminderDemoActive = true;
    }

    if (!isDetailTargetMasterOn()) {
      if (detailUseTargetTrainInput) {
        detailUseTargetTrainInput.checked = true;
      }
      syncDetailTargetMasterVisibility({ seedTime: true });
    }

    if (detailRemindMeInput) {
      delete detailRemindMeInput.dataset.userTouched;
    }

    if (animate) {
      if (detailRemindMeInput) {
        detailRemindMeInput.checked = false;
      }
      if (detailLeaveRemindersCommuteStripInput) {
        detailLeaveRemindersCommuteStripInput.checked = false;
      }
      syncDetailTargetRemindVisibility();

      try {
        await templateWizardReminderDelay(450, generation);
        if (detailRemindMeInput) {
          detailRemindMeInput.checked = true;
        }
        pulseTemplateWizardToggleRow(detailReminderSection);

        await templateWizardReminderDelay(220, generation);
        if (detailLeaveRemindersCommuteStripInput) {
          detailLeaveRemindersCommuteStripInput.checked = true;
        }
        pulseTemplateWizardToggleRow(detailLeaveRemindersStripWrap);
      } catch (error) {
        if (error?.name !== "AbortError") {
          throw error;
        }
        return;
      } finally {
        if (generation === templateWizardReminderArmGeneration) {
          templateWizardReminderDemoActive = false;
        }
      }
    } else if (detailRemindMeInput) {
      detailRemindMeInput.checked = true;
      if (detailLeaveRemindersCommuteStripInput) {
        detailLeaveRemindersCommuteStripInput.checked = true;
      }
      syncDetailTargetRemindVisibility();
    }

    if (!isTemplateWizardReminderArmActive(generation)) {
      return;
    }

    await requestTemplateWizardReminderPermission();
  })();
}

function hasSeenTemplateWizard() {
  return localStorage.getItem(TEMPLATE_WIZARD_SEEN_KEY) === "1";
}

function hasSkippedTemplateWizard() {
  return localStorage.getItem(TEMPLATE_WIZARD_SKIPPED_KEY) === "1";
}

function markTemplateWizardSeen() {
  localStorage.setItem(TEMPLATE_WIZARD_SEEN_KEY, "1");
}

function markTemplateWizardCompleted() {
  markTemplateWizardSeen();
  localStorage.removeItem(TEMPLATE_WIZARD_SKIPPED_KEY);
}

function skipTemplateWizard() {
  markTemplateWizardSeen();
  localStorage.setItem(TEMPLATE_WIZARD_SKIPPED_KEY, "1");
  dismissTemplateRouteCoach();
}

function shouldShowTemplateRouteCoach() {
  if (hasSeenTemplateWizard()) {
    return false;
  }

  // Already set up a journey — fields are familiar; skip the 3-step coach.
  return getConfiguredJourneys().length === 0;
}

function dismissTemplateRouteCoach() {
  cancelTemplateWizardReminderArm();
  if (templateRouteCoach) {
    templateRouteCoach.hidden = true;
  }
  clearTemplateWizardCoachPosition();
  templateWizardStep = 1;
  templateWizardContext = null;
  detailJourneyNameField?.classList.remove("template-wizard-highlight");
  detailReminderSection?.classList.remove("template-wizard-highlight");
  detailRemindControls?.classList.remove("template-wizard-highlight");
  syncTemplateWizardHighlight(0);
  syncTemplateWizardChrome();
  // Same as onboarding: restore banner after rare coach overlays.
  void window.NextTrainAds?.reload?.();
}

function advanceTemplateWizard() {
  const maxStep = getTemplateWizardMaxStep();
  if (templateWizardStep < maxStep) {
    templateWizardStep += 1;
    if (templateWizardStep === getTemplateWizardRouteStep()) {
      populateTemplateRouteCoachBody();
    }
    renderTemplateWizardStep();
    return;
  }

  void requestTemplateWizardReminderPermission().finally(() => {
    markTemplateWizardCompleted();
    dismissTemplateRouteCoach();
  });
}

function showTemplateRouteCoach({
  templateKey,
  journey,
  nearest,
  configured,
  error,
  routeLoading = false,
}) {
  if (!templateRouteCoach || !templateRouteCoachBody) {
    return;
  }

  if (!shouldShowTemplateRouteCoach()) {
    return;
  }

  const useNameStep = templateKey !== "custom";
  templateWizardContext = {
    templateKey,
    journey,
    nearest,
    configured,
    error,
    routeLoading,
    useNameStep,
  };
  templateWizardStep = 1;

  if (useNameStep) {
    populateTemplateWizardNameBody(journey, templateKey);
  } else {
    populateTemplateRouteCoachBody();
  }
  populateTemplateWizardHoursBody(journey, templateKey);

  openJourneysDialogSync();
  showSettingsDetailView();
  renderTemplateWizardStep();
  templateRouteCoach.hidden = false;
  // Native AdMob sits above the WebView — hide while the setup wizard is up.
  void window.NextTrainAds?.hideNativeBanner?.({ force: true });
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

  setStationComboboxValue(detailStationCombobox, journey.station);
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
    return `Only one journey can be active at one time. Another ${conflict.name} already uses these hours.`;
  }

  return `Only one journey can be active at one time. These hours overlap ${conflict.name} (${formatJourneyDefaultWindow(conflict)}).`;
}

function clearJourneyOverlapError() {
  journeyOverlapState = null;
  if (detailActiveHoursErrorEl) {
    detailActiveHoursErrorEl.hidden = true;
    detailActiveHoursErrorEl.classList.remove("journey-overlap-error--fixed");
  }
  if (detailActiveHoursFixBtn) {
    detailActiveHoursFixBtn.hidden = false;
  }
  detailDefaultFromField?.classList.remove("optional-time-field--overlap");
  detailDefaultUntilField?.classList.remove("optional-time-field--overlap");
  detailJourneyWindow?.classList.remove("template-wizard-highlight");
}

function showJourneyOverlapError(updated, conflict) {
  journeyOverlapState = { updated, conflict };
  if (detailActiveHoursErrorEl) {
    detailActiveHoursErrorEl.classList.remove("journey-overlap-error--fixed");
  }
  if (detailActiveHoursFixBtn) {
    detailActiveHoursFixBtn.hidden = false;
  }
  if (detailActiveHoursErrorTextEl) {
    detailActiveHoursErrorTextEl.textContent = formatJourneyOverlapError(updated, conflict);
  }
  if (detailActiveHoursErrorEl) {
    detailActiveHoursErrorEl.hidden = false;
    requestAnimationFrame(() => {
      detailActiveHoursErrorEl.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }
  detailDefaultFromField?.classList.add("optional-time-field--overlap");
  detailDefaultUntilField?.classList.add("optional-time-field--overlap");
  detailJourneyWindow?.classList.add("template-wizard-highlight");
}

function showJourneyOverlapFixApplied(adjustedJourney, keptJourney, cleared) {
  journeyOverlapState = null;
  detailDefaultFromField?.classList.remove("optional-time-field--overlap");
  detailDefaultUntilField?.classList.remove("optional-time-field--overlap");
  detailJourneyWindow?.classList.remove("template-wizard-highlight");
  if (detailActiveHoursFixBtn) {
    detailActiveHoursFixBtn.hidden = true;
  }
  if (detailActiveHoursErrorTextEl) {
    detailActiveHoursErrorTextEl.textContent = cleared
      ? `Cleared Active hours on ${adjustedJourney.name} so yours can keep ${formatJourneyDefaultWindow(keptJourney)}. Tap Save.`
      : `Adjusted ${adjustedJourney.name} to ${formatJourneyDefaultWindow(adjustedJourney)} so yours can keep ${formatJourneyDefaultWindow(keptJourney)}. Tap Save.`;
  }
  if (detailActiveHoursErrorEl) {
    detailActiveHoursErrorEl.classList.add("journey-overlap-error--fixed");
    detailActiveHoursErrorEl.hidden = false;
  }
}

function scoreActiveHoursChange(before, after) {
  if (!hasDefaultWindow(after)) {
    return 24 * 60 * 4;
  }
  if (!hasDefaultWindow(before)) {
    return 0;
  }
  return (
    Math.abs(parseTimeToMinutes(after.defaultFrom) - parseTimeToMinutes(before.defaultFrom)) +
    Math.abs(parseTimeToMinutes(after.defaultUntil) - parseTimeToMinutes(before.defaultUntil))
  );
}

function buildConflictFixCandidates(editing, conflict) {
  const editingStart = parseTimeToMinutes(editing.defaultFrom);
  const editingEnd = parseTimeToMinutes(editing.defaultUntil);
  const conflictStart = parseTimeToMinutes(conflict.defaultFrom);
  const conflictEnd = parseTimeToMinutes(conflict.defaultUntil);
  const candidates = [];

  // Overnight windows: clearing the older journey is safer than inventing a preset.
  if (editingStart >= editingEnd || conflictStart >= conflictEnd) {
    return [{ defaultFrom: "", defaultUntil: "" }];
  }

  const duration = conflictEnd - conflictStart;

  if (conflictStart < editingStart && conflictEnd > editingStart && editingStart - conflictStart >= 1) {
    candidates.push({
      defaultFrom: formatMinutesAsTime(conflictStart),
      defaultUntil: formatMinutesAsTime(editingStart),
    });
  }

  if (conflictStart < editingEnd && conflictEnd > editingEnd && conflictEnd - editingEnd >= 1) {
    candidates.push({
      defaultFrom: formatMinutesAsTime(editingEnd),
      defaultUntil: formatMinutesAsTime(conflictEnd),
    });
  }

  if (duration >= 1 && editingStart - duration >= 0) {
    candidates.push({
      defaultFrom: formatMinutesAsTime(editingStart - duration),
      defaultUntil: formatMinutesAsTime(editingStart),
    });
  }

  if (duration >= 1 && editingEnd + duration <= 24 * 60) {
    candidates.push({
      defaultFrom: formatMinutesAsTime(editingEnd),
      defaultUntil: formatMinutesAsTime(editingEnd + duration),
    });
  }

  candidates.push({ defaultFrom: "", defaultUntil: "" });
  return candidates;
}

function conflictFixCreatesOtherClash(proposedConflict, editing, journeys) {
  if (!hasDefaultWindow(proposedConflict)) {
    return false;
  }

  for (const other of journeys) {
    if (
      other.id === proposedConflict.id ||
      other.id === editing.id ||
      !hasDefaultWindow(other) ||
      isUnconfiguredJourney(other)
    ) {
      continue;
    }
    if (
      journeyDefaultWindowsOverlap(proposedConflict, other) &&
      journeyActiveDaysOverlap(proposedConflict, other)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * New journey (being edited) keeps its hours. Adjust the conflicting journey
 * by the smallest time change that removes the overlap.
 */
function suggestOverlapFixForConflict(editing, conflict, journeys) {
  let best = null;
  let bestScore = Infinity;
  let bestStart = Infinity;

  for (const window of buildConflictFixCandidates(editing, conflict)) {
    const proposed = {
      ...conflict,
      defaultFrom: window.defaultFrom,
      defaultUntil: window.defaultUntil,
    };
    if (hasDefaultWindow(proposed) && journeyDefaultWindowsOverlap(editing, proposed)) {
      continue;
    }
    if (conflictFixCreatesOtherClash(proposed, editing, journeys)) {
      continue;
    }

    const score = scoreActiveHoursChange(conflict, proposed);
    const start = hasDefaultWindow(proposed)
      ? parseTimeToMinutes(proposed.defaultFrom)
      : Infinity;
    if (score < bestScore || (score === bestScore && start < bestStart)) {
      bestScore = score;
      bestStart = start;
      best = {
        defaultFrom: window.defaultFrom,
        defaultUntil: window.defaultUntil,
        cleared: !hasDefaultWindow(proposed),
      };
    }
  }

  return best;
}

function applyJourneyOverlapFix() {
  if (!journeyOverlapState?.conflict || !journeyOverlapState?.updated) {
    return;
  }

  const kept = journeyOverlapState.updated;
  const conflict = journeyOverlapState.conflict;
  const fix = suggestOverlapFixForConflict(kept, conflict, settingsDraftJourneys);
  if (!fix) {
    return;
  }

  const index = settingsDraftJourneys.findIndex((journey) => journey.id === conflict.id);
  if (index < 0) {
    return;
  }

  settingsDraftJourneys[index] = {
    ...settingsDraftJourneys[index],
    defaultFrom: fix.defaultFrom,
    defaultUntil: fix.defaultUntil,
  };

  const stillConflicts = findJourneyDefaultWindowConflict(kept, settingsDraftJourneys);
  if (stillConflicts) {
    showJourneyOverlapError(kept, stillConflicts);
    return;
  }

  showJourneyOverlapFixApplied(settingsDraftJourneys[index], kept, fix.cleared);
}

async function revertDetailRemindersForDeniedPermission() {
  if (detailRemindMeInput) {
    detailRemindMeInput.checked = false;
    detailRemindMeInput.dataset.userTouched = "1";
  }
  if (detailLeaveRemindersCommuteStripInput) {
    detailLeaveRemindersCommuteStripInput.checked = false;
  }
  await window.nextTrainLeaveReminders?.saveReminderSettings?.({
    enabled: false,
    commuteStripEnabled: false,
    paused: false,
    pauseUntil: null,
  });
}

function highlightDetailReminderSection() {
  const target = detailRemindControls || detailReminderSection;
  if (!target) {
    return;
  }

  target.classList.add("template-wizard-highlight");
  target.scrollIntoView({ block: "center", behavior: "smooth" });
  window.setTimeout(() => {
    target.classList.remove("template-wizard-highlight");
  }, 3200);
}

async function handleDetailRemindToggleChange() {
  if (!isDetailTargetMasterOn() || !hasDetailTargetTrain()) {
    if (detailRemindMeInput) {
      detailRemindMeInput.checked = false;
    }
    syncDetailTargetMasterVisibility();
    detailPreferredDisplay?.focus();
    return;
  }

  const remindOn = detailRemindMeInput?.checked ?? false;

  if (!remindOn) {
    syncDetailTargetRemindVisibility();
    return;
  }

  window.nextTrainStickinessCoaches?.markCoachDone?.("reminder");

  const settings = await window.nextTrainLeaveReminders?.enableLeaveReminders?.({
    userInitiated: true,
  });
  if (settings?.permissionGranted === false) {
    await revertDetailRemindersForDeniedPermission();
    return;
  }

  syncDetailTargetRemindVisibility();
  void window.nextTrainLeaveReminders?.refreshJourneyRemindExtras?.();
}

function populateDetailReminderFields(journey) {
  const hasTarget = Boolean(journey?.preferredTrainTime);
  const remindOn = journey?.remindMe === true || (hasTarget && journey?.remindMe !== false);
  // Target master replaces Time-to-station checkbox. Legacy leave-by without preferred → off.
  if (detailUseTargetTrainInput) {
    detailUseTargetTrainInput.checked = hasTarget || journey?.remindMe === true;
  }

  if (detailRemindMeInput) {
    detailRemindMeInput.checked = remindOn;
    if (journey?.remindMe === false) {
      detailRemindMeInput.dataset.userTouched = "1";
    } else {
      delete detailRemindMeInput.dataset.userTouched;
    }
  }
  setOptionalTimeField(
    detailPreferredInput,
    detailPreferredDisplay,
    detailPreferredField,
    detailPreferredClear,
    journey?.preferredTrainTime || ""
  );
  syncDetailTargetMasterVisibility();
  if (remindOn && hasTarget) {
    void window.nextTrainLeaveReminders?.ensureLiveCountdownDefaultOn?.();
  }
}

function readJourneyDetailDraft() {
  if (!editingJourneyId) {
    return null;
  }

  const { station, direction } = requireJourneyRouteFromForm();
  const name = readJourneyNameFromForm(station, direction);
  const { defaultFrom, defaultUntil } = normalizeActiveHoursFieldsForSave();

  const remindDays = readDetailActiveDays();
  if (!remindDays.length) {
    detailActiveDayChips?.querySelector(".remind-day-chip")?.focus?.();
    throw new Error("Pick at least one active day.");
  }

  const targetMasterOn = isDetailTargetMasterOn();
  const preferredTrainTime = targetMasterOn ? readOptionalTimeField(detailPreferredField) : "";
  const remindWanted = detailRemindMeInput?.checked ?? false;

  if (targetMasterOn && !preferredTrainTime) {
    detailPreferredDisplay?.focus();
    throw new Error("Choose your target train.");
  }

  if (remindWanted && !preferredTrainTime) {
    if (detailUseTargetTrainInput) {
      detailUseTargetTrainInput.checked = true;
    }
    syncDetailTargetMasterVisibility();
    detailPreferredDisplay?.focus();
    throw new Error("Choose your target train.");
  }

  const remindMe = remindWanted;
  const useLeaveBefore = isDetailTargetMasterOn();

  const existing = settingsDraftJourneys.find((entry) => entry.id === editingJourneyId);
  return normalizeJourney({
    id: editingJourneyId,
    name,
    station,
    direction,
    leaveBeforeMinutes: Number(detailLeaveBeforeInput.value),
    useLeaveBefore,
    defaultFrom,
    defaultUntil,
    preferredTrainTime,
    remindDays,
    remindMe,
    templateKey: existing?.templateKey,
    autoRoute: existing?.autoRoute,
  });
}

function journeyMatchesTemplate(journey, templateKey) {
  if (!journey || !templateKey || templateKey === "custom") {
    return false;
  }

  if (journey.templateKey === templateKey) {
    return true;
  }

  if (journey.templateKey && journey.templateKey !== templateKey) {
    return false;
  }

  const preset = JOURNEY_TEMPLATE_PRESETS[templateKey];
  if (!preset) {
    return false;
  }

  // Preset journeys stay matched by name even if Active hours were edited after Save.
  return journey.name === preset.name;
}

function hasJourneyForTemplate(templateKey) {
  return settingsDraftJourneys.some((journey) => journeyMatchesTemplate(journey, templateKey));
}

function updateJourneyTemplatesVisibility() {
  if (!journeyTemplatesEl) {
    return;
  }

  const atCap = isAtJourneyCap();
  let anyChipVisible = false;

  document.querySelectorAll(".journey-template-chip").forEach((chip) => {
    const templateKey = chip.dataset.template;
    const taken =
      templateKey === "morning" || templateKey === "evening"
        ? hasJourneyForTemplate(templateKey)
        : false;
    chip.hidden = taken || atCap;
    if (!taken && !atCap) {
      anyChipVisible = true;
    }
  });

  if (journeyTemplatesCapHintEl) {
    journeyTemplatesCapHintEl.textContent = JOURNEY_CAP_HINT;
    journeyTemplatesCapHintEl.hidden = !atCap;
  }
  if (journeyTemplatesAddHintEl) {
    journeyTemplatesAddHintEl.hidden = atCap;
  }
  if (journeyTemplateChipsEl) {
    journeyTemplateChipsEl.hidden = atCap || !anyChipVisible;
  }

  journeyTemplatesEl.hidden = !atCap && !anyChipVisible;
}

function createJourneyFromTemplate(templateKey) {
  if (isAtJourneyCap()) {
    return;
  }

  if (templateKey === "custom") {
    const journey = createDefaultJourney({
      name: "",
      templateKey: "custom",
      autoRoute: false,
      remindDays: [getPerthDayOfWeekIso()],
    });
    settingsDraftJourneys.push(journey);
    // Draft only until Save with station + direction — do not persist shells.
    // Open immediately; nearest station prefills in the background (no geo gate).
    return openJourneyDetail(journey.id).then(() => {
      showTemplateRouteCoach({
        templateKey: "custom",
        journey,
        nearest: null,
        configured: false,
        error: null,
        routeLoading: true,
      });
      void prefillCustomNearestStation(journey.id);
    });
  }

  return createJourneyFromCommuteTemplate(templateKey);
}

async function prefillCustomNearestStation(journeyId) {
  if (!journeyId) {
    return;
  }

  if (detailNearestHint) {
    detailNearestHint.hidden = false;
    detailNearestHint.textContent = "Finding nearest station…";
  }

  if (templateWizardContext?.templateKey === "custom") {
    updateTemplateRouteCoachState({ routeLoading: true });
  }

  let nearest = null;
  let error = null;
  try {
    nearest = await findNearestStation();
  } catch (err) {
    error = err;
  }

  if (editingJourneyId !== journeyId) {
    return;
  }

  const journeyIndex = settingsDraftJourneys.findIndex((entry) => entry.id === journeyId);
  const journey = journeyIndex >= 0 ? settingsDraftJourneys[journeyIndex] : null;
  if (!journey) {
    return;
  }

  const formStation = String(detailStationCombobox?.getValue?.() || "").trim();
  if (formStation || journey.station) {
    if (templateWizardContext?.templateKey === "custom") {
      updateTemplateRouteCoachState({
        journey,
        routeLoading: false,
        configured: Boolean(journey.station && journey.direction),
      });
    }
    return;
  }

  if (error || !nearest?.station) {
    if (detailNearestHint) {
      detailNearestHint.hidden = false;
      detailNearestHint.textContent = error
        ? locationErrorFrom(error).message
        : "Couldn't find nearest station";
    }
    if (templateWizardContext?.templateKey === "custom") {
      updateTemplateRouteCoachState({
        journey,
        nearest: null,
        configured: false,
        error: error || { message: "Couldn't find nearest station" },
        routeLoading: false,
      });
    }
    return;
  }

  const formDirection = String(detailDirectionSelect?.value || "").trim();
  let direction = formDirection || journey.direction || "";
  if (!direction) {
    direction = (await pickPerthDirection(nearest.station)) || "";
  }

  if (editingJourneyId !== journeyId) {
    return;
  }

  // User may have typed a station while geo was in flight — don't overwrite.
  if (String(detailStationCombobox?.getValue?.() || "").trim()) {
    if (templateWizardContext?.templateKey === "custom") {
      updateTemplateRouteCoachState({ routeLoading: false });
    }
    return;
  }

  const updated = normalizeJourney({
    ...journey,
    station: nearest.station,
    direction,
  });
  settingsDraftJourneys[journeyIndex] = updated;

  const nearestHint = `Selected ${formatStationLabel(nearest.station)} (${nearest.distanceKm.toFixed(1)} km away)`;
  await syncJourneyDetailRouteFields(updated, nearestHint);

  if (templateWizardContext?.templateKey === "custom") {
    updateTemplateRouteCoachState({
      journey: updated,
      nearest,
      configured: Boolean(updated.station && updated.direction),
      error: null,
      routeLoading: false,
    });
  }
}

async function completeTemplateRouteSetup(journeyId, templateKey) {
  let journey = settingsDraftJourneys.find((entry) => entry.id === journeyId);
  if (!journey) {
    return;
  }

  const showCoach = shouldShowTemplateRouteCoach();
  if (showCoach) {
    showTemplateRouteCoach({
      templateKey,
      journey,
      nearest: null,
      configured: false,
      error: null,
      routeLoading: templateKey !== "custom",
    });
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
      ? formatNearestDistanceHint(routeResult.nearest)
      : null;

  if (editingJourneyId === journeyId) {
    await syncJourneyDetailRouteFields(journey, nearestHint);
  }

  if (showCoach) {
    updateTemplateRouteCoachState({
      journey,
      nearest: routeResult.nearest,
      configured: routeResult.configured,
      error: routeResult.error,
      routeLoading: false,
    });
  }
}

async function createJourneyFromCommuteTemplate(templateKey) {
  if (isAtJourneyCap()) {
    return;
  }

  if (hasJourneyForTemplate(templateKey)) {
    const existing =
      settingsDraftJourneys.find((journey) => journeyMatchesTemplate(journey, templateKey)) ?? null;
    if (existing) {
      await openJourneyDetail(existing.id, { skipAutoRoute: true });
      if (isUnconfiguredJourney(existing)) {
        await completeTemplateRouteSetup(existing.id, templateKey);
      }
    }
    return;
  }

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
    remindMe: preset.remindMe !== false && Boolean(preset.preferredTrainTime),
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

    textStack.append(nameEl, route);
    openBtn.append(textStack, chevron);
    openBtn.addEventListener("click", () => {
      openJourneyDetail(journey.id);
    });

    card.append(openBtn);
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
  clearJourneyOverlapError();
  if (detailJourneyNameInput) {
    detailJourneyNameInput.value = journey.name || "";
  }
  detailLeaveBeforeInput.value = journey.leaveBeforeMinutes;
  if (detailUseLeaveBeforeInput) {
    detailUseLeaveBeforeInput.checked = Boolean(journey.preferredTrainTime);
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
  setDetailActiveDayChips(journey.remindDays);
  syncDetailActiveDaysHint(journey);
  populateDetailReminderFields(journey);
  syncDetailComboHints();
  detailDirectionSelect.innerHTML = '<option value="">Loading…</option>';
  detailDirectionSelect.disabled = true;
  if (deleteJourneyBtn) {
    deleteJourneyBtn.hidden = !editingJourneyId;
  }
  setStationComboboxValue(detailStationCombobox, journey.station || "");

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
      if (detailJourneyNameInput && !detailJourneyNameInput.value) {
        detailJourneyNameInput.value = journey.name || "";
      }
      setStationComboboxValue(detailStationCombobox, journey.station || "");
      populateDetailReminderFields(journey);
    }

    if (routeResult.configured && routeResult.nearest) {
      nearestHint = formatNearestDistanceHint(routeResult.nearest);
    }
  }

  if (detailNearestHint) {
    if (nearestHint) {
      detailNearestHint.hidden = false;
      detailNearestHint.textContent = nearestHint;
    } else if (!shouldAutoRouteJourney(journey)) {
      detailNearestHint.hidden = true;
    }
  }

  try {
    await getStationsList();
  } catch (error) {
    console.warn("Could not load stations for journey detail", error);
  }

  setStationComboboxValue(detailStationCombobox, journey.station);
  await loadDirectionsForSelect(detailDirectionSelect, journey.station, journey.direction);
}

function countConfiguredJourneys(journeys) {
  return journeys.filter((journey) => !isUnconfiguredJourney(journey)).length;
}

function isAtJourneyCap(journeys = settingsDraftJourneys) {
  return countConfiguredJourneys(journeys) >= MAX_JOURNEYS;
}

function reloadSettingsDraftFromStorage() {
  if (settings.journeys.length === 0) {
    return;
  }

  settingsDraftJourneys = normalizeJourneyList(settings.journeys).map((journey) => ({
    ...normalizeJourney(journey),
  }));
}

function saveJourneyListToSettings({ allowEmpty = false } = {}) {
  // Never persist shells without station + direction (template/Custom mid-create).
  const draftConfigured = settingsDraftJourneys.filter(
    (journey) => !isUnconfiguredJourney(journey)
  );
  const persistedConfiguredCount = countConfiguredJourneys(settings.journeys);

  if (draftConfigured.length === 0 && persistedConfiguredCount > 0 && !allowEmpty) {
    return;
  }

  if (countConfiguredJourneys(draftConfigured) > MAX_JOURNEYS) {
    return;
  }

  if (
    persistedConfiguredCount > 0 &&
    draftConfigured.length < persistedConfiguredCount &&
    !allowEmpty
  ) {
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
  if (journeys.length === 0) {
    clearManualJourneyOverride();
  }
}

function finishAfterAllJourneysDeleted() {
  dismissTemplateRouteCoach();
  editingJourneyId = null;
  editingJourneySnapshot = null;
  showSettingsListView();

  if (journeysDialog?.open) {
    journeysDialog.close();
    journeysDialog.removeAttribute("open");
  }

  clearManualJourneyOverride();
  renderJourneySwitcher();
  renderJourneyEmptyState();
  void window.nextTrainWidget?.syncWidgetSettings?.();
}

function requireJourneyRouteFromForm() {
  const station = detailStationCombobox?.getValue?.() || "";
  const direction = normalizeDirection(detailDirectionSelect?.value || "");

  if (!station) {
    detailStationCombobox?.focus?.();
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

  const updated = readJourneyDetailDraft();
  const conflict = findJourneyDefaultWindowConflict(updated, settingsDraftJourneys);
  if (conflict) {
    const overlapError = new Error(formatJourneyOverlapError(updated, conflict));
    overlapError.code = "journey-overlap";
    overlapError.conflict = conflict;
    overlapError.updated = updated;
    throw overlapError;
  }

  const wasConfiguredBeforeSave = settings.journeys.some(
    (journey) => journey.id === editingJourneyId && !isUnconfiguredJourney(journey)
  );
  const isNewJourneySave = !wasConfiguredBeforeSave;
  if (isNewJourneySave && countConfiguredJourneys(settings.journeys) >= MAX_JOURNEYS) {
    const capError = new Error(JOURNEY_CAP_HINT);
    capError.code = "journey-cap";
    throw capError;
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
  const manualOverride = readManualJourneyOverride();
  if (isNewJourneySave) {
    activeJourneyId = editingJourneyId;
    setManualJourneyOverride(editingJourneyId);
  } else if (manualOverride?.journeyId) {
    activeJourneyId = manualOverride.journeyId;
  } else if (!isOutboundCommuteJourney(updated)) {
    activeJourneyId = editingJourneyId;
  } else if (!settingsDraftJourneys.some((journey) => journey.id === activeJourneyId)) {
    activeJourneyId = getInboundJourney(settingsDraftJourneys)?.id ?? settingsDraftJourneys[0]?.id ?? null;
  }

  if (configuredBeforeSave === 0) {
    markInitialJourneySetup();
    if (!isNewJourneySave) {
      activeJourneyId = getInboundJourney(settingsDraftJourneys)?.id ?? activeJourneyId;
    }
    document.dispatchEvent(new CustomEvent("nexttrain:journey-configured-first"));
  }

  if (updated.remindMe === true) {
    window.nextTrainStickinessCoaches?.markCoachDone?.("reminder");
    trackProductEvent("reminder_enabled", { journeyId: updated.id });
  }

  persistSettings({
    journeys: settingsDraftJourneys
      .filter((journey) => !isUnconfiguredJourney(journey))
      .map((journey) => normalizeJourney(journey)),
    activeJourneyId,
  });
  void window.nextTrainLeaveReminders?.healAfterJourneySave?.();
  trackProductEvent("journey_saved", { configuredCount: countConfiguredJourneys(settings.journeys) });
  editingJourneySnapshot = null;
}

function closeJourneysDialog() {
  dismissTemplateRouteCoach();

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
      setRouteDisplay(formatJourneyRoute(journey));
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

function closeMenuDialogOnly() {
  if (isAppDialogOpen(menuDialog)) {
    closeAppDialog(menuDialog);
  }
  menuBtn?.setAttribute("aria-expanded", "false");
  menuChromeAction?.classList.remove("chrome-action--open");
}

function resumeAfterMenuClose() {
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

function closeMenuDialog() {
  closeMenuDialogOnly();
  resumeAfterMenuClose();
}

function formatAppVersionLabel(config) {
  if (!config) {
    return "";
  }
  const version = String(config.appVersion || "").trim();
  const code = Number(config.appVersionCode);
  if (version && Number.isFinite(code)) {
    return `Version ${version} (${code})`;
  }
  return version ? `Version ${version}` : "";
}

async function refreshMenuAppVersionLabel() {
  if (!menuAppVersionEl) {
    return;
  }
  try {
    const response = await fetch("/site-config.json", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const config = await response.json();
    const label = formatAppVersionLabel(config);
    if (label) {
      menuAppVersionEl.textContent = label;
      menuAppVersionEl.hidden = false;
    }
  } catch {
    // Non-fatal — menu still works without version label.
  }
}

function openMenu() {
  dismissLeaveHint();
  window.NextTrainAdFree?.renderMenuAdFree?.();
  window.NextTrainProPurchase?.renderMenuPro?.();
  void refreshMenuAppVersionLabel();
  openAppDialog(menuDialog);
  menuBtn?.setAttribute("aria-expanded", "true");
  menuChromeAction?.classList.add("chrome-action--open");
  document.dispatchEvent(new CustomEvent("nexttrain:menu-open"));
}

function closeHelpDialog() {
  const returnToMenu = helpOpenedFromMenu;
  if (returnToMenu) {
    helpOpenedFromMenu = false;
  }
  closeAppDialog(helpDialog);
  if (returnToMenu) {
    openMenu();
  }
}

let feedbackOpenedFromMenu = false;
let feedbackSiteConfig = null;

async function loadFeedbackSiteConfig() {
  if (feedbackSiteConfig) {
    return feedbackSiteConfig;
  }
  try {
    const response = await fetch("/site-config.json", { cache: "no-store" });
    if (response.ok) {
      feedbackSiteConfig = await response.json();
      return feedbackSiteConfig;
    }
  } catch {
    // Non-fatal.
  }
  feedbackSiteConfig = {};
  return feedbackSiteConfig;
}

function feedbackPlatformLabel() {
  return isNativeApp() ? "Android" : "Web";
}

function feedbackVersionLabel(config) {
  return formatAppVersionLabel(config) || "unknown version";
}

function resetFeedbackForm() {
  if (feedbackForm) {
    feedbackForm.hidden = false;
    feedbackForm.reset();
  }
  if (feedbackThanksEl) {
    feedbackThanksEl.hidden = true;
  }
  if (feedbackStatusEl) {
    feedbackStatusEl.hidden = true;
    feedbackStatusEl.textContent = "";
  }
  if (feedbackSendBtn) {
    feedbackSendBtn.disabled = false;
    feedbackSendBtn.textContent = "Send";
  }
}

async function openFeedbackDialog() {
  resetFeedbackForm();
  openAppDialog(feedbackDialog);
  // Tear the banner out before focusing — keyboard + hideBanner makes AdMob jump to the top.
  if (isNativeApp() && window.NextTrainAds?.hideNativeBanner) {
    await window.NextTrainAds.hideNativeBanner({ force: true });
  }
  window.requestAnimationFrame(() => {
    feedbackNoteInput?.focus?.({ preventScroll: true });
  });
}

function closeFeedbackDialog({ resumeMenu = false } = {}) {
  const shouldResume = resumeMenu || feedbackOpenedFromMenu;
  feedbackOpenedFromMenu = false;
  closeAppDialog(feedbackDialog);
  if (shouldResume) {
    openMenu();
  }
}

function buildFeedbackMailto({ note, email, version, platform, to }) {
  const recipient = to || "EvansAppStudio@gmail.com";
  const subject = encodeURIComponent(`Next Train feedback · ${version}`);
  const body = encodeURIComponent(
    `${note}\n\n---\nVersion: ${version}\nPlatform: ${platform}${
      email ? `\nReply-to: ${email}` : ""
    }`
  );
  return `mailto:${recipient}?subject=${subject}&body=${body}`;
}

async function submitFeedback(event) {
  event.preventDefault();
  const note = String(feedbackNoteInput?.value || "").trim();
  const email = String(feedbackEmailInput?.value || "").trim();
  if (!note) {
    if (feedbackStatusEl) {
      feedbackStatusEl.hidden = false;
      feedbackStatusEl.textContent = "Add a short note first.";
    }
    feedbackNoteInput?.focus?.();
    return;
  }

  const config = await loadFeedbackSiteConfig();
  const version = feedbackVersionLabel(config);
  const platform = feedbackPlatformLabel();
  const payload = { note, email: email || undefined, version, platform };

  if (feedbackSendBtn) {
    feedbackSendBtn.disabled = true;
    feedbackSendBtn.textContent = "Sending…";
  }
  if (feedbackStatusEl) {
    feedbackStatusEl.hidden = true;
    feedbackStatusEl.textContent = "";
  }

  try {
    const response = await fetch(apiUrl("/api/feedback"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      if (feedbackForm) {
        feedbackForm.hidden = true;
      }
      if (feedbackThanksEl) {
        feedbackThanksEl.hidden = false;
      }
      return;
    }

    // Webhook not configured / failed — fall back to device mail composer.
    const mailto = buildFeedbackMailto({
      ...payload,
      to: data?.mailto || "EvansAppStudio@gmail.com",
    });
    window.location.href = mailto;
    if (feedbackForm) {
      feedbackForm.hidden = true;
    }
    if (feedbackThanksEl) {
      feedbackThanksEl.hidden = false;
    }
  } catch {
    const mailto = buildFeedbackMailto(payload);
    window.location.href = mailto;
    if (feedbackForm) {
      feedbackForm.hidden = true;
    }
    if (feedbackThanksEl) {
      feedbackThanksEl.hidden = false;
    }
  } finally {
    if (feedbackSendBtn) {
      feedbackSendBtn.disabled = false;
      feedbackSendBtn.textContent = "Send";
    }
  }
}

function clearAllAppData() {
  const localKeysToRemove = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("nextTrain") && key !== "nextTrainAdFreeCache") {
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
  window.NextTrainPro?.onSettingsCleared?.();
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
  dismissTemplateRouteCoach();
  showSettingsListView();
  openJourneysDialogSync();
  void populateJourneyListView();
}

function openJourneysForSetup() {
  completeOnboarding();
  journeyModeActive = true;
  exitNearbyMode();
  syncChromeMode();
  openJourneys();
}

function openMainScreenFromWidget() {
  dismissLeaveHint();
  closeMenuDialogOnly();
  if (journeysDialog?.open || !settingsDetailView.hidden) {
    closeJourneysDialog();
  }

  if (hasConfiguredCommute()) {
    if (!journeyModeActive) {
      journeyModeActive = true;
      exitNearbyMode();
    }
    syncChromeMode();
    clearHeroSetupState();
    const journey = getActiveJourney();
    if (journey) {
      setManualJourneyOverride(journey.id);
    }
    maybeAutoSelectJourney();
    skipTrains = readSkipState().count;
    renderJourneySwitcher();
    fetchNextTrain();
    return;
  }

  void enterNearbyMode();
}

function openJourneyDetail(journeyId, options = {}) {
  openJourneysDialogSync();
  showSettingsDetailView();
  if (detailDirectionSelect) {
    detailDirectionSelect.innerHTML = '<option value="">Loading…</option>';
    detailDirectionSelect.disabled = true;
  }

  return ensureSettingsDraftLoaded()
    .then(() => populateJourneyDetailForm(journeyId, options))
    .then(() => {
      if (options.highlightReminder) {
        highlightDetailReminderSection();
      }
    })
    .catch((error) => {
      console.warn("Could not open journey detail", error);
    });
}

journeysBtn?.addEventListener("click", () => enterJourneyMode());
journeyEditBtn?.addEventListener("click", () => openJourneys());
if (journeyContextRowEl && typeof ResizeObserver !== "undefined") {
  const journeyContextLayoutObserver = new ResizeObserver(() => syncJourneyContextEditOffset());
  journeyContextLayoutObserver.observe(journeyContextRowEl);
  if (journeyContextNameEl) {
    journeyContextLayoutObserver.observe(journeyContextNameEl);
  }
  if (journeySwitcherEl) {
    journeyContextLayoutObserver.observe(journeySwitcherEl);
  }
}
menuBtn?.addEventListener("click", () => openMenu());
nearbyBtn?.addEventListener("click", () => {
  nearbyBtn?.classList.add("icon-btn--refreshing");
  Promise.resolve(enterNearbyMode()).finally(() => {
    window.setTimeout(() => nearbyBtn?.classList.remove("icon-btn--refreshing"), 300);
  });
});
async function applyNearbyManualStation(station) {
  await getStationsList();
  const normalized = normalizeStation(station);
  if (!normalized || !isCatalogStation(station)) {
    return;
  }

  nearbyUserPickedStation = true;
  clearNearbyError();
  stopNearbyLocateTimers();
  dismissNearbyLocatePicker();
  nearbyDontWaitVisible = false;
  syncNearbyDontWaitButton();
  nearbySession = {
    station: normalized,
    distanceKm: null,
    focusedDirection: null,
    skipByDirection: {},
  };
  nearbyLoading = true;
  renderNearbyBoard();

  try {
    await fetchNearbyBoard();
    nearbyLoading = false;
    clearNearbyError();
    writeLastNearbyStationCache({ station: normalized });
    renderNearbyBoard();
  } catch (error) {
    nearbyLoading = false;
    setNearbyError(error.message ?? "Could not load departures for this station", "board");
    renderNearbyBoard();
  }
}

nearbyDontWaitBtn?.addEventListener("click", () => {
  if (!nearbyLoading || nearbyLocatePickerVisible) {
    return;
  }

  showNearbyEarlyPicker();
  if (isNearbyModeActive() && nearbyLoading) {
    renderNearbyBoard();
  }
});

nearbyStationBtn?.addEventListener("click", async () => {
  const station = nearbyStationCombobox?.getValue?.();
  if (!station) {
    if (nearbyFallbackTextEl) {
      nearbyFallbackTextEl.textContent = "Pick a station from the list first.";
    }
    nearbyStationCombobox?.focus?.();
    return;
  }

  await applyNearbyManualStation(station);
});
menuFeedbackBtn?.addEventListener("click", () => {
  feedbackOpenedFromMenu = true;
  closeMenuDialog();
  void openFeedbackDialog();
});
menuHelpBtn?.addEventListener("click", () => {
  helpOpenedFromMenu = true;
  closeMenuDialog();
  void window.nextTrainWidget?.refreshWidgetDebugPanel?.();
  openAppDialog(helpDialog);
});
feedbackNoteInput?.addEventListener("focus", () => {
  if (isNativeApp()) {
    void window.NextTrainAds?.hideNativeBanner?.({ force: true });
  }
});
feedbackEmailInput?.addEventListener("focus", () => {
  if (isNativeApp()) {
    void window.NextTrainAds?.hideNativeBanner?.({ force: true });
  }
});
feedbackForm?.addEventListener("submit", (event) => {
  void submitFeedback(event);
});
feedbackCancelBtn?.addEventListener("click", () => {
  closeFeedbackDialog({ resumeMenu: true });
});
feedbackDoneBtn?.addEventListener("click", () => {
  closeFeedbackDialog({ resumeMenu: true });
});
feedbackDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeFeedbackDialog({ resumeMenu: true });
});
feedbackDialog?.addEventListener("click", (event) => {
  if (event.target === feedbackDialog) {
    closeFeedbackDialog({ resumeMenu: true });
  }
});
helpCloseBtn?.addEventListener("click", () => {
  closeHelpDialog();
});
helpDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeHelpDialog();
});
helpDialog?.addEventListener("click", (event) => {
  if (event.target === helpDialog) {
    closeHelpDialog();
  }
});
leaveAckBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  const next = getLeaveAckTarget();
  if (next) {
    acknowledgeLeave(next);
  }
});
leaveNextTrainBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  skipToNextTrain();
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

templateWizardSkipBtn?.addEventListener("click", () => {
  skipTemplateWizard();
});

onboardingGotItBtn?.addEventListener("click", () => {
  clearOnboardingSchedule();
  showOnboardingStep2();
});

onboardingSetupBtn?.addEventListener("click", () => {
  openJourneysForSetup();
});

onboardingLaterBtn?.addEventListener("click", () => {
  completeOnboarding();
});

window.addEventListener("resize", () => {
  if (isOnboardingVisible()) {
    syncOnboardingCoachPosition();
  }
});

clearAllDataBtn?.addEventListener("click", handleClearAllData);

deleteJourneyBtn?.addEventListener("click", () => {
  if (!editingJourneyId) {
    return;
  }

  const editing = settingsDraftJourneys.find((journey) => journey.id === editingJourneyId);
  if (!editing) {
    return;
  }

  const soleConfiguredJourney =
    !isUnconfiguredJourney(editing) && countConfiguredJourneys(settingsDraftJourneys) === 1;
  if (soleConfiguredJourney) {
    const confirmed = confirm(DELETE_LAST_JOURNEY_CONFIRM);
    if (!confirmed) {
      return;
    }
  }

  settingsDraftJourneys = settingsDraftJourneys.filter((journey) => journey.id !== editingJourneyId);
  editingJourneySnapshot = null;
  editingJourneyId = null;

  const hasConfiguredJourneysLeft = countConfiguredJourneys(settingsDraftJourneys) > 0;
  saveJourneyListToSettings({ allowEmpty: true });
  renderJourneyListView();

  if (!hasConfiguredJourneysLeft) {
    finishAfterAllJourneysDeleted();
    return;
  }

  showSettingsListView();
});

detailLeaveBeforeInput?.addEventListener("input", () => {
  updateLeaveBeforeLabel();
});

detailUseTargetTrainInput?.addEventListener("change", () => {
  syncDetailTargetMasterVisibility({ seedTime: detailUseTargetTrainInput.checked });
  if (detailUseTargetTrainInput.checked) {
    detailPreferredDisplay?.focus?.();
  }
});

detailUseLeaveBeforeInput?.addEventListener("change", () => {
  // Hidden mirror of Target master — keep nest in sync if touched programmatically.
  if (detailUseTargetTrainInput) {
    detailUseTargetTrainInput.checked = detailUseLeaveBeforeInput.checked;
  }
  syncDetailTargetMasterVisibility({ seedTime: detailUseLeaveBeforeInput.checked });
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
bindOptionalTimeField(
  detailPreferredInput,
  detailPreferredDisplay,
  detailPreferredField,
  detailPreferredClear
);
detailRemindMeInput?.addEventListener("change", () => {
  if (detailRemindMeInput) {
    detailRemindMeInput.dataset.userTouched = "1";
  }
  void handleDetailRemindToggleChange();
});
detailDefaultFromClear?.addEventListener("click", () => {
  clearPairedActiveHourField("from");
});
detailDefaultUntilClear?.addEventListener("click", () => {
  clearPairedActiveHourField("until");
});
detailDefaultFromInput?.addEventListener("change", () => {
  clearJourneyOverlapError();
  const fromValue = detailDefaultFromInput.value;
  if (!fromValue) {
    clearPairedActiveHourField("from");
    return;
  }

  setOptionalTimeField(
    detailDefaultUntilInput,
    detailDefaultUntilDisplay,
    detailDefaultUntilField,
    detailDefaultUntilClear,
    addMinutesToTimeString(fromValue, 180)
  );
  syncDetailComboHints();
});
detailDefaultFromInput?.addEventListener("input", () => {
  clearJourneyOverlapError();
  const fromValue = detailDefaultFromInput.value;
  if (!fromValue) {
    return;
  }
  setOptionalTimeField(
    detailDefaultUntilInput,
    detailDefaultUntilDisplay,
    detailDefaultUntilField,
    detailDefaultUntilClear,
    addMinutesToTimeString(fromValue, 180)
  );
  syncDetailComboHints();
});
detailDefaultUntilInput?.addEventListener("change", () => {
  clearJourneyOverlapError();
  syncDetailComboHints();
  if (!detailDefaultUntilInput.value) {
    clearPairedActiveHourField("until");
  }
});
detailDefaultUntilInput?.addEventListener("input", () => {
  clearJourneyOverlapError();
  syncDetailComboHints();
});
detailActiveHoursFixBtn?.addEventListener("click", applyJourneyOverlapFix);

detailActiveDayChips?.addEventListener("click", (event) => {
  const chip = event.target.closest(".remind-day-chip");
  if (!chip) {
    return;
  }

  chip.classList.toggle("remind-day-chip--active");
  chip.setAttribute(
    "aria-pressed",
    chip.classList.contains("remind-day-chip--active") ? "true" : "false"
  );
});

detailNearestBtn?.addEventListener("click", async () => {
  detailNearestHint.hidden = false;
  detailNearestHint.textContent = "Finding nearest station…";

  try {
    const { station, distanceKm: km } = await findNearestStation();
    detailStationCombobox?.setValue(station);
    detailNearestHint.textContent = `Selected ${formatStationLabel(station)} (${km.toFixed(1)} km away)`;
    await loadDirectionsForSelect(detailDirectionSelect, station);
    const direction = await pickPerthDirection(station);
    if (direction) {
      detailDirectionSelect.value = direction;
    }
  } catch (error) {
    detailNearestHint.textContent = locationErrorFrom(error).message;
  }
});

settingsDetailView?.addEventListener("submit", (event) => {
  event.preventDefault();

  try {
    saveJourneyDetailFromForm();
  } catch (error) {
    if (error.code === "journey-overlap") {
      showJourneyOverlapError(error.updated, error.conflict);
      return;
    }
    clearJourneyOverlapError();
    alert(error.message);
    return;
  }

  clearJourneyOverlapError();
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
  if (isNativeApp()) {
    document.body.classList.add("native-app");
  }

  const seedApplied = await applyMaestroTestSeedFromDeepLink();
  if (!seedApplied) {
    applyTestQueryParams();
  }

  initHeroSwipe();
  installOnboardingInteractionTracking();
  dismissStaleBlockingLayers();

  if (seedApplied) {
    settings = readStoredSettings();
    refreshSeconds = settings.refreshSeconds ?? DEFAULT_SETTINGS.refreshSeconds;
    journeyModeActive = true;
    scheduleRefresh();
    void getStationsList();
    void loadStationCoords();
    renderJourneySwitcher();
    clearHeroSetupState();
    maybeAutoSelectJourney();
    skipTrains = readSkipState().count;
    fetchNextTrain();
    window.nextTrainWidget?.syncWidgetSettings?.(settings);
    await window.nextTrainWidget?.consumeLaunchDeepLink?.();
    return;
  }

  const urlSettings = await readUrlSettings();
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

  // Paywall / journey deep links must not wait on nearby locate (can take many seconds).
  await window.nextTrainWidget?.consumeLaunchDeepLink?.();
  await applyCommuteMode({ coldStart: true });
  window.nextTrainWidget?.syncWidgetSettings?.(settings);
}

initStationComboboxes();
syncLeaveBeforeSliderFill();
init();

window.nextTrainApp = {
  migrateSettings,
  getConfiguredJourneys,
  formatJourneyRoute,
  persistReminderJourneys,
  getPerthDayOfWeekIso,
  journeyMatchesSchedule,
  findScheduledJourneyId,
  shouldDefaultToNearby,
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
  enterNearbyMode,
  openJourneys,
  openJourneyDetail,
  openAppDialog,
  closeAppDialog,
  hasSkippedTemplateWizard,
  switchJourney,
  fetchNextTrain,
  hasConfiguredCommute,
  closeMenuDialogOnly,
  closeJourneysDialog,
  openMainScreenFromWidget,
  clearDetailStation() {
    detailStationCombobox?.setValue?.("", { silent: true });
    if (detailDirectionSelect) {
      detailDirectionSelect.innerHTML = "";
      detailDirectionSelect.value = "";
      detailDirectionSelect.disabled = true;
    }
  },
  isUnsupportedRegion,
  UNSUPPORTED_REGION_KM,
  readLastNearbyStationCache,
  writeLastNearbyStationCache,
  clearLastNearbyStationCache,
  leaveByArmedForDisplayedTrip,
  preferredHintForJourney,
  tripMatchesPreferredOrLater,
  isTargetOutsideActiveWindow,
  syncDetailComboHints,
  prepareDisplayData,
  skipToNextTrain,
  skipToEarlierTrain,
};

async function resumeMaestroSeedIfNeeded() {
  const seedApplied = await applyMaestroTestSeedFromDeepLink();
  if (!seedApplied) {
    return false;
  }

  settings = readStoredSettings();
  refreshSeconds = settings.refreshSeconds ?? DEFAULT_SETTINGS.refreshSeconds;
  journeyModeActive = true;
  scheduleRefresh();
  void getStationsList();
  void loadStationCoords();
  renderJourneySwitcher();
  clearHeroSetupState();
  maybeAutoSelectJourney();
  skipTrains = readSkipState().count;
  fetchNextTrain();
  window.nextTrainWidget?.syncWidgetSettings?.(settings);
  await window.nextTrainWidget?.consumeLaunchDeepLink?.();
  return true;
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    return;
  }

  dismissStaleBlockingLayers();
  maybeScheduleOnboarding();

  void (async () => {
    if (isJourneysDialogOpen() || isOnboardingVisible() || isAppOverlayOpen()) {
      return;
    }

    if (!journeyModeActive) {
      const seeded = await resumeMaestroSeedIfNeeded();
      if (seeded) {
        return;
      }
    }

    const now = Date.now();
    if (now - lastResumeRefreshAt < 15_000) {
      refreshLiveDisplay(true);
      return;
    }
    lastResumeRefreshAt = now;

    if (shouldDefaultToNearby()) {
      void applyCommuteMode();
      return;
    }

    if (journeyModeActive) {
      skipTrains = readSkipState().count;
      refreshLiveDisplay(true);
      fetchNextTrain();
      return;
    }

    void applyCommuteMode();
  })();
});
