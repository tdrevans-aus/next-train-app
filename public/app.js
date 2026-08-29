const SETTINGS_KEY = "nextTrainSettings";
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
/** Instant reopen paint — refresh in background after this. */
/** Soft GPS refine may reuse a recent fused fix (station-level accuracy). */
const SWIPE_THRESHOLD_PX = 48;
const ONBOARDING_QUIET_MS = 4000;

const routeEl = document.getElementById("route");

function setRouteDisplay(text) {
  if (!routeEl) {
    return;
  }
  routeEl.textContent = text;
  routeEl.setAttribute("aria-label", text);
  if (isNearbyModeActive()) {
    routeEl.hidden = false;
  } else {
    syncRouteLineVisibility();
  }
}

function syncRouteLineVisibility() {
  if (!routeEl || isNearbyModeActive()) {
    return;
  }

  const hideForRouteSwitcher =
    journeyModeActive &&
    chromeTravelTab === "routes" &&
    getRouteJourneys().length >= 2 &&
    !heroEl?.classList.contains("hero-setup");
  routeEl.hidden = hideForRouteSwitcher;
  requestAnimationFrame(syncJourneyContextEditOffset);
}

function setAccessibleText(el, text) {
  if (!el) {
    return;
  }
  el.textContent = text;
  el.setAttribute("aria-label", text);
}
const updatedEl = document.getElementById("updated");
const attributionEl = document.getElementById("attribution");
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
const leaveAlarmBannerEl = document.getElementById("leave-alarm-banner");
const leaveAlarmRouteEl = document.getElementById("leave-alarm-route");
const leaveAlarmTrainEl = document.getElementById("leave-alarm-train");
const leaveAlarmOkBtn = document.getElementById("leave-alarm-ok-btn");
const heroPinBtn = document.getElementById("hero-pin-btn");
const platformEl = document.getElementById("platform");
const statusEl = document.getElementById("status");
const followingSectionEl = document.getElementById("following-section");
const followingLabelEl = document.getElementById("following-label");
const followingNextEl = document.getElementById("following-next");
const errorEl = document.getElementById("error");

const menuBtn = document.getElementById("menu-btn");
const routesBtn = document.getElementById("routes-btn");
const journeysBtn = document.getElementById("journeys-btn");
const menuChromeAction = document.getElementById("menu-chrome-action");
const appEl = document.querySelector(".app");
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
const deleteJourneyDialog = document.getElementById("delete-journey-dialog");
const deleteJourneyDialogTitle = document.getElementById("delete-journey-dialog-title");
const deleteJourneyDialogBody = document.getElementById("delete-journey-dialog-body");
const deleteJourneyConfirmBtn = document.getElementById("delete-journey-confirm-btn");
const deleteJourneyCancelBtn = document.getElementById("delete-journey-cancel-btn");
let pendingDeleteJourneyId = null;
const detailJourneyNameInput = document.getElementById("detail-journey-name");
const detailStationComboboxRoot = document.getElementById("detail-station-combobox");
const detailStationInput = document.getElementById("detail-station-input");
const nearbyStationComboboxRoot = document.getElementById("nearby-station-combobox");
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
const onboardingStep3 = document.getElementById("onboarding-step-3");
const onboardingGotItBtn = document.getElementById("onboarding-got-it-btn");
const onboardingRoutesGotItBtn = document.getElementById("onboarding-routes-got-it-btn");
const onboardingSetupBtn = document.getElementById("onboarding-setup-btn");
const onboardingLaterBtn = document.getElementById("onboarding-later-btn");
const routesChromeAction = document.getElementById("routes-chrome-action");
const journeysChromeAction = document.getElementById("journeys-chrome-action");
const journeyTemplatesEl = document.getElementById("journey-templates");
const journeyTemplatesLoadingEl = document.getElementById("journey-templates-loading");
const journeyTemplatesCapHintEl = document.getElementById("journey-templates-cap-hint");
const journeyTemplateShortcutsEl = document.getElementById("journey-template-shortcuts");
const journeySaveRouteBtnEl = document.getElementById("journey-save-route-btn");
const journeySetupBtnEl = document.getElementById("journey-setup-btn");
const journeyTemplateChipsEl = document.querySelector(".journey-template-chips");
const journeyTemplatesAddHintEl = document.querySelector(".journey-templates-hint");
const detailJourneyNameField = document.querySelector(".journey-name-field");
const detailRouteSection = document.getElementById("detail-route-section");
const detailRouteCore = document.getElementById("detail-route-core");
const detailJourneyWindow = document.getElementById("detail-journey-window");
const heroEmptyStateEl = document.getElementById("hero-empty-state");
const heroEmptyTitleEl = document.querySelector(".hero-empty-title");
const heroEmptyTextEl = document.querySelector(".hero-empty-text");
const heroEmptyAddBtn = document.getElementById("hero-empty-add-btn");
const detailActiveDayChips = document.getElementById("detail-active-day-chips");
const detailActiveDaysHint = document.querySelector(".detail-active-days-hint");
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
const detailPreferredInput = document.getElementById("detail-preferred-input");
const detailPreferredDisplay = document.getElementById("detail-preferred-display");
const detailPreferredField = document.getElementById("detail-preferred-field");
const detailPreferredClear = document.getElementById("detail-preferred-clear");

let settings = window.nextTrainJourneyModel.createDefaultStore();
let refreshSeconds = DEFAULT_SETTINGS.refreshSeconds;
let skipTrains = 0;
/** Near me: hold a pinned departure until 1 minute after it leaves. */
const NEARBY_PIN_HOLD_MS = 60_000;
const NEARBY_SOFT_LOCATION_MAX_AGE_MS = 2 * 60 * 1000;
let lastResumeRefreshAt = 0;
let lastRenderedNext = null;
let lastApiData = null;
let journeyBoardFetchId = 0;
let stationCoords = null;
const NEARBY_MULTI_CITY_IDS = ["sydney", "brisbane", "adelaide", "uk-london-tfl", "amsterdam", "rotterdam", "vancouver", "canberra", "gold-coast", "newcastle", "auckland", "stockholm", "goteborg", "wellington"];
const nearbyCoordsCache = new Map();
const nearbyStationNamesCache = new Map();
let nearbyCityHint = "perth";
let refreshTimer = null;
let countdownTimer = null;
let lastLiveDisplayMinute = null;
let settingsDraftJourneys = [];
/**
 * CAPACITOR-Q: classic-script callers (leave-reminders, widget, pin exclusivity)
 * expect `getSettings` / `window.settings` after the FB-25 module split.
 */
function getSettings() {
  return settings;
}
function getSettingsDraftJourneys() {
  return settingsDraftJourneys;
}
Object.defineProperty(window, "settings", {
  configurable: true,
  enumerable: true,
  get() {
    return settings;
  },
  set(next) {
    settings = next;
  },
});
let journeySwitcherOpen = false;
let leaveAutoAckLastAttemptAt = 0;
let leaveAutoAckLastDeparture = null;
let leaveAutoAckLastPosition = null;
let leaveAutoAckInflight = null;
let journeyModeActive = false;
/** @type {'nearby' | 'routes' | 'journeys'} */
let chromeTravelTab = "nearby";
let deferJourneyAutoSelect = false;
let pendingJourneyTargetFaceRestore = false;
let onboardingShowTimer = null;
let onboardingPopulatedAt = null;
let onboardingNearbyFaceReady = false;
let templateCreateInFlight = false;
let journeysTemplatesExpanded = false;
let helpOpenedFromMenu = false;

const STATION_ARRIVAL_KM = 0.35;
const TRAVELING_SPEED_MS = 2.5;
const LEAVE_AUTO_ACK_THROTTLE_MS = 30_000;
const LEAVE_AUTO_ACK_MOVE_KM = 0.2;

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
const MAX_JOURNEYS = 5;
const JOURNEY_CAP_HINT = `${MAX_JOURNEYS} journeys — that's the limit for now. Delete one to add another.`;
const UPCOMING_DEPARTURE_BOARD_LIMIT = 2;
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

const VERCEL_ORIGIN = "https://next-train-app.vercel.app";

async function readDogfoodOrigin() {
  if (!isNativeApp()) {
    return null;
  }
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    const response = await fetch("dogfood-origin.json", { signal: controller.signal });
    clearTimeout(id);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

let dogfoodOriginCache = null;

function getApiOrigin() {
  const params = new URLSearchParams(window.location.search);
  const useDogfood = params.get("dogfood") === "1" || params.get("test") === "1";

  if (window.NextTrainBrisbaneDogfood?.isActive?.()) {
    const origin = window.NextTrainBrisbaneDogfood.getOrigin?.() || "";
    if (origin) {
      return origin;
    }
  }

  // Debug dogfooding on LAN or Emulator — only if explicitly enabled or in test mode.
  if (useDogfood && dogfoodOriginCache) {
    if (dogfoodOriginCache.emulatorOrigin && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      return dogfoodOriginCache.emulatorOrigin;
    }
    if (dogfoodOriginCache.origin) {
      return dogfoodOriginCache.origin;
    }
  }

  // Production or regular web
  if (isNativeApp()) {
    // Standard native app always hits production Vercel
    return VERCEL_ORIGIN;
  }
  return "";
}

function isNativeApp() {
  if (window.location.hostname === "localhost" && window.location.port === "") {
    // Standard Capacitor dev webview
    return true;
  }
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

function isIosNativeApp() {
  return isNativeApp() && window.Capacitor?.getPlatform?.() === "ios";
}

function locationPermissionHelpMessage() {
  if (isIosNativeApp()) {
    return "Location is off for this visit. Tap Near me and choose While Using the App, or open Settings → Next Train → Location. You can also pick a station below.";
  }
  return "Location permission is needed for Near me. Open Settings → Apps → Next Train → Location → Allow, or choose a station below.";
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
  const codeStr = String(error?.code || "");
  const code = Number(error?.code);
  const message = String(error?.message || (typeof error === 'string' ? error : '') || "");
  const lower = message.toLowerCase();
  
  console.log(`[App] locationErrorFrom: code=${code}, codeStr=${codeStr}, message="${message}"`);

  // OS-PLUG-GLOC-0010 is Capacitor's GPS timeout — not "location off".
  const isServicesOff =
    lower.includes("disabled") ||
    (lower.includes("location services") && lower.includes("off")) ||
    lower.includes("not enabled");
  if (isServicesOff) {
    const servicesOff = isIosNativeApp()
      ? "Location services are off. Turn them on in Settings → Privacy → Location Services."
      : "Location services are off. Turn on Location in your phone settings, then try Near me again.";
    console.log("[App] locationErrorFrom: recognized as services off");
    return Object.assign(new Error(servicesOff), { code: 2, cause: error });
  }

  if (
    code === 1 ||
    lower.includes("denied") ||
    lower.includes("permission") ||
    lower.includes("authorized")
  ) {
    return Object.assign(new Error(locationPermissionHelpMessage()), {
      code: 1,
      cause: error,
    });
  }

  if (
    code === 3 ||
    codeStr === "OS-PLUG-GLOC-0010" ||
    lower.includes("timeout") ||
    lower.includes("could not obtain location in time") ||
    lower.includes("location unavailable") ||
    lower.includes("timed out")
  ) {
    const timeoutMessage = isIosNativeApp()
      ? "Couldn’t get your location in time. On iPad, try Wi‑Fi, move near a window, or choose a station below."
      : "Couldn’t get your location in time. Turn on Location — or choose a station below.";
    return Object.assign(new Error(timeoutMessage), { code: 3, cause: error });
  }

  if (error instanceof Error) {
    return error;
  }

  return Object.assign(new Error(message || "Could not find a nearby station"), {
    code: code || 2,
  });
}

async function getAppGeolocationPosition(options = {}) {
  console.log("[App] getAppGeolocationPosition starting...", options);
  if (isNativeApp()) {
    await ensureGeoBridge();
    if (!window.NextTrainGeo?.getCurrentPosition) {
      throw Object.assign(new Error("Native geolocation bridge unavailable"), { code: 2 });
    }

    try {
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

    if (dialog === helpDialog || dialog === feedbackDialog || dialog?.id === "reminders-dialog") {
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

function hasExplicitRegionChoice() {
  return window.NextTrainCitySession?.readRegionExplicit?.() === true;
}

function canShowOnboardingCoach() {
  return (
    isNearbyModeActive() &&
    !isAppOverlayOpen() &&
    !hasCompletedOnboarding() &&
    !hasExplicitRegionChoice()
  );
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
  return `${getApiOrigin()}${path}`;
}

/** Formspree lives on production Vercel — never POST feedback to local/dogfood origins. */
function feedbackApiUrl() {
  const host = String(location.hostname || "");
  const origin = getApiOrigin();
  const localHost =
    host === "localhost" || host === "127.0.0.1" || host === "10.0.2.2";
  const localOrigin =
    !origin ||
    /localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.|10\.\d+\.\d+\.\d+/.test(
      origin
    );
  if (localHost || localOrigin || window.NextTrainBrisbaneDogfood?.isActive?.()) {
    return `${VERCEL_ORIGIN}/api/feedback`;
  }
  return apiUrl("/api/feedback");
}

function getActiveFixture() {
  return new URLSearchParams(window.location.search).get("fixture");
}

const LIVE_CITY_IDS = new Set(["perth", "sydney", "brisbane", "adelaide", "uk-london-tfl", "amsterdam", "rotterdam", "vancouver", "canberra", "gold-coast", "newcastle", "auckland", "stockholm", "goteborg", "wellington"]);

function normalizeCityId(raw) {
  const city = String(raw || "").trim().toLowerCase();
  return LIVE_CITY_IDS.has(city) ? city : "";
}

function cityIdForStation(station) {
  const name = String(station || "").trim();
  const dogfood = window.NextTrainBrisbaneDogfood;
  if (name && dogfood?.isActive?.() && dogfood.getStations?.()?.includes(name)) {
    return normalizeCityId(dogfood.getCity());
  }
  return "";
}

function resolveJourneyCity(journey) {
  return normalizeCityId(journey?.cityId) || cityIdForStation(journey?.station) || "perth";
}

function appendFixtureQuery(queryString) {
  const fixture = getActiveFixture() || (isTestMode() ? "normal" : null);
  const params = new URLSearchParams(queryString);
  if (fixture) {
    params.set("fixture", fixture);
  }
  window.NextTrainBrisbaneDogfood?.applyParams?.(params);
  if (!params.has("city")) {
    const city = cityIdForStation(params.get("station")) || planningCityId();
    if (city && city !== "perth") {
      params.set("city", city);
    }
  }
  return params.toString();
}

async function applyTestQueryParams() {
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

  // Persist URL station/direction synchronously. Awaiting the station catalog here
  // yields past `load`, so QA seeds written after goto would be overwritten when
  // catalog fetch completed.
  const urlSettings = buildUrlSettingsFromParams(params);
  if (urlSettings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(urlSettings));
    } catch {
      /* ignore quota */
    }
    settings = urlSettings;
    settingsDraftJourneys = Array.isArray(settings.journeys)
      ? settings.journeys.map((j) => ({ ...j }))
      : [];
    urlSettingsAppliedDuringReset = true;
  }

  params.delete("reset");
  const nextQuery = params.toString();
  const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
  window.history.replaceState(null, "", nextUrl);
}

function isTestMode() {
  return sessionStorage.getItem("nextTrainTestMode") === "1";
}

function readTestClockMinutesFromUrl() {
  if (!isTestMode()) {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const clock = params.get("clock");
  if (clock) {
    const match = String(clock).trim().match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const hour = Number(match[1]);
      const minute = Number(match[2]);
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return hour * 60 + minute;
      }
    }
  }

  const rawMinutes = params.get("perthMinutes");
  if (rawMinutes != null && rawMinutes !== "") {
    const minutes = Number(rawMinutes);
    if (Number.isFinite(minutes) && minutes >= 0 && minutes < 24 * 60) {
      return Math.floor(minutes);
    }
  }

  return null;
}

function readTestDayIsoFromUrl() {
  if (!isTestMode()) {
    return null;
  }

  const raw = new URLSearchParams(window.location.search).get("day");
  if (raw == null || raw === "") {
    return null;
  }

  const day = Number(raw);
  if (Number.isInteger(day) && day >= 1 && day <= 7) {
    return day;
  }

  return null;
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
  if (isNearbyModeActive()) {
    return isStationInNearbyCity(normalized) || isStationInNearbyCity(trimmed);
  }

  if (!window.nextTrainStationCombobox?.getStationsCache?.()?.length) {
    return Boolean(normalized);
  }

  return window.nextTrainStationCombobox.getStationsCache().includes(normalized) || window.nextTrainStationCombobox.getStationsCache().includes(trimmed);
}

function formatRouteBasedJourneyName(station, direction) {
  return `${formatStationLabel(station)} → ${direction}`;
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







function getChromeTravelTab() {
  return chromeTravelTab;
}

function setChromeTravelTab(tab) {
  chromeTravelTab = tab === "routes" || tab === "journeys" ? tab : "nearby";
}

function getRouteJourneys() {
  return getConfiguredJourneys().filter((journey) => isRouteJourney(journey));
}

function getJourneyKindJourneys() {
  return getConfiguredJourneys().filter((journey) => isJourneyKind(journey));
}

function hasConfiguredRoute() {
  return getRouteJourneys().length > 0;
}

function hasConfiguredForActiveTab() {
  if (chromeTravelTab === "routes") {
    return hasConfiguredRoute();
  }
  if (chromeTravelTab === "journeys") {
    return hasJourneyKind();
  }
  return hasConfiguredRoute() || hasJourneyKind();
}

function isActiveTravelTabEmpty() {
  return journeyModeActive && !hasConfiguredForActiveTab();
}

function activeJourneyMatchesCurrentTab(journey) {
  if (!journey) {
    return false;
  }
  if (chromeTravelTab === "routes") {
    return isRouteJourney(journey);
  }
  if (chromeTravelTab === "journeys") {
    return isJourneyKind(journey);
  }
  return true;
}

function syncActiveJourneyForCurrentTab() {
  if (!journeyModeActive || !hasConfiguredForActiveTab()) {
    return;
  }
  ensureActiveJourneyForTab(chromeTravelTab);
}

function getActiveTabJourneys() {
  if (chromeTravelTab === "routes") {
    return getRouteJourneys();
  }
  if (chromeTravelTab === "journeys") {
    return getJourneyKindJourneys();
  }
  return getConfiguredJourneys();
}

function ensureActiveJourneyForTab(tab) {
  const pool = tab === "routes" ? getRouteJourneys() : getJourneyKindJourneys();
  if (!pool.length) {
    return;
  }

  if (tab === "journeys") {
    const scheduledId = findScheduledJourneyId();
    if (isManualOverrideBlockingAuto(scheduledId)) {
      return;
    }

    const pinnedCommuteId = findActiveCommuteTargetPinId();
    if (
      pinnedCommuteId &&
      pool.some((journey) => journey.id === pinnedCommuteId)
    ) {
      if (settings.activeJourneyId !== pinnedCommuteId) {
        persistSettings({ activeJourneyId: pinnedCommuteId });
        skipTrains = readSkipState().count;
      }
      return;
    }

    if (
      scheduledId &&
      pool.some((journey) => journey.id === scheduledId)
    ) {
      if (settings.activeJourneyId !== scheduledId) {
        persistSettings({ activeJourneyId: scheduledId });
        skipTrains = readSkipState().count;
      }
      return;
    }
  }

  const active = getActiveJourney();
  if (active && pool.some((journey) => journey.id === active.id)) {
    return;
  }

  persistSettings({ activeJourneyId: pool[0].id });
  skipTrains = readSkipState().count;
}

function shouldShowJourneySwitcher() {
  return getActiveTabJourneys().length >= 2;
}

function isSingleRouteEditContext() {
  return (
    journeyModeActive &&
    chromeTravelTab === "routes" &&
    getRouteJourneys().length === 1 &&
    !heroEl?.classList.contains("hero-setup") &&
    !isNearbyModeActive()
  );
}

function syncJourneyContextEditOffset() {
  if (!journeyContextRowEl || !journeyEditBtn || journeyEditBtn.hidden) {
    journeyContextRowEl?.style.removeProperty("--journey-context-anchor-width");
    return;
  }

  let anchorEl = journeyContextNameEl?.hidden ? journeySwitcherEl : journeyContextNameEl;
  if (isSingleRouteEditContext() && routeEl && !routeEl.hidden) {
    anchorEl = routeEl;
  }
  if (!anchorEl || anchorEl.hidden) {
    journeyContextRowEl.style.removeProperty("--journey-context-anchor-width");
    return;
  }

  journeyContextRowEl.style.setProperty("--journey-context-anchor-width", `${anchorEl.offsetWidth}px`);
}

function syncJourneyContextChrome() {
  const configuredCount = getActiveTabJourneys().length;
  const inEmptySetup = heroEl?.classList.contains("hero-setup");
  const isRoutesTab =
    journeyModeActive && chromeTravelTab === "routes" && !isNearbyModeActive();
  let showManage =
    journeyModeActive && configuredCount >= 1 && !inEmptySetup && !isNearbyModeActive();
  let showName = showManage && configuredCount === 1;
  let showSwitcher = showManage && shouldShowJourneySwitcher();

  const showRouteEdit = isRoutesTab && configuredCount === 1 && !inEmptySetup;
  if (isRoutesTab) {
    showName = false;
    showSwitcher = configuredCount >= 2 && !inEmptySetup;
    showManage = showSwitcher || showRouteEdit;
  }

  syncRouteLineVisibility();

  if (journeyContextRowEl) {
    journeyContextRowEl.hidden = !showManage;
    journeyContextRowEl.classList.toggle("journey-context-row--multi", showSwitcher);
    journeyContextRowEl.classList.toggle("journey-context-row--single", showName);
    journeyContextRowEl.classList.toggle("journey-context-row--route-edit", showRouteEdit);
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
    journeyEditBtn.setAttribute(
      "aria-label",
      chromeTravelTab === "routes" ? "Manage routes" : "Manage journeys"
    );
  }

  requestAnimationFrame(syncJourneyContextEditOffset);
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

function requestJourneyTargetFaceRestore() {
  pendingJourneyTargetFaceRestore = true;
}

function consumeJourneyTargetFaceRestore(journey, data) {
  if (!pendingJourneyTargetFaceRestore || !journey || !data?.next) {
    return;
  }
  if (chromeTravelTab !== "journeys" || !isJourneyKind(journey)) {
    pendingJourneyTargetFaceRestore = false;
    return;
  }
  trainNavigation().restoreJourneyTargetPinFace?.(journey, data);
  pendingJourneyTargetFaceRestore = false;
}

async function applyJourneysMode({ coldStart = false, skipNearbyDefault = false } = {}) {
  // Don't yank the user back to Near me while they're setting up a journey.
  if (isJourneysDialogOpen() || isOnboardingVisible()) {
    renderJourneySwitcher();
    syncChromeMode();
    return;
  }

  renderJourneySwitcher();

  const configured = getConfiguredJourneys();
  if (!configured.length) {
    journeyModeActive = false;
    if (coldStart) {
      maybeScheduleOnboarding();
    }
    // Jim brief: always ensure nearby mode is entered if we default to it.
    await enterNearbyMode();
    return;
  }

  if (coldStart && !skipNearbyDefault && shouldDefaultToNearby()) {
    journeyModeActive = false;
    await enterNearbyMode();
    return;
  }

  const resolvedId = resolveCurrentOrNextJourneyId();
  if (
    resolvedId &&
    settings.activeJourneyId !== resolvedId &&
    !isManualOverrideBlockingAuto(resolvedId)
  ) {
    settings.activeJourneyId = resolvedId;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  chromeTravelTab = "journeys";
  journeyModeActive = true;
  exitNearbyMode();
  syncActiveJourneyForCurrentTab();
  maybeAutoSelectJourney();
  const journey = getActiveJourney();
  if (hasPersistedNearbyPin()) {
    reconcileExclusivePinState({ type: "nearby" });
  } else {
    reconcileExclusivePinState();
  }
  requestJourneyTargetFaceRestore();
  trainNavigation().restoreJourneyTargetPinFace?.(journey);
  clearHeroSetupState();
  syncChromeMode();
  fetchNextTrain();
}

function hasCompletedOnboarding() {
  return Boolean(localStorage.getItem(ONBOARDING_KEY));
}

function isOnboardingVisible() {
  const active = isTemplateWizardActive();
  const visible = Boolean(onboardingCoach && !onboardingCoach.hidden) || active;
  
  // If we are in nearby mode and it's showing a fallback error (like location needed), 
  // we want periodic refreshes and train fetching to proceed so we can break out of the error state.
  if (isNearbyModeActive() && nearbyMode().getNearbyErrorKind()) {
    return false;
  }
  
  console.log("[App] isOnboardingVisible:", visible, "mainCoach:", Boolean(onboardingCoach && !onboardingCoach.hidden), "wizardActive:", active);
  return visible;
}

document.addEventListener("nexttrain:region-explicit", () => {
  clearOnboardingSchedule();
  hideOnboardingCoach();
});

function hideOnboardingCoach() {
  if (!onboardingCoach) {
    return;
  }

  onboardingCoach.hidden = true;
  onboardingCoach.classList.remove(
    "onboarding-coach--step-1",
    "onboarding-coach--step-2",
    "onboarding-coach--step-3"
  );
  routesChromeAction?.classList.remove("onboarding-highlight");
  journeysChromeAction?.classList.remove("onboarding-highlight");
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
  const isStep3 = onboardingCoach.classList.contains("onboarding-coach--step-3");
  if (!isStep1 && !isStep2 && !isStep3) {
    card.style.top = "";
    return;
  }

  const anchor = isStep1
    ? document.getElementById("hero")
    : isStep2
      ? document.getElementById("routes-chrome-action")
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

  onboardingCoach.classList.remove(
    "onboarding-coach--step-1",
    "onboarding-coach--step-2",
    "onboarding-coach--step-3"
  );
  onboardingCoach.classList.add(`onboarding-coach--step-${step}`);
  routesChromeAction?.classList.toggle("onboarding-highlight", step === 2);
  journeysChromeAction?.classList.toggle("onboarding-highlight", step === 3);
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
  const coach = document.getElementById("onboarding-coach");
  if (coach) {
    coach.hidden = true;
    coach.setAttribute("hidden", "");
  }
  if (onboardingStep1) {
    onboardingStep1.hidden = false;
  }
  if (onboardingStep2) {
    onboardingStep2.hidden = true;
  }
  if (onboardingStep3) {
    onboardingStep3.hidden = true;
  }
}

window.dismissNearMeOnboarding = function dismissNearMeOnboarding(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  completeOnboarding();
};

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
  return nearbyMode().isNearbyFaceReadyForOnboarding();
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
  const raw = Number(sessionStorage.getItem(ONBOARDING_STEP_KEY));
  if (raw >= 3) {
    return 3;
  }
  if (raw >= 2) {
    return 2;
  }
  return 1;
}

function showOnboardingResumeStep() {
  const step = getOnboardingResumeStep();
  if (step >= 3) {
    showOnboardingStep3();
    return;
  }
  if (step >= 2) {
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
    const regionNames = {
      perth: "Transperth",
      brisbane: "Brisbane",
      sydney: "Sydney",
      adelaide: "Adelaide",
      amsterdam: "Amsterdam",
      rotterdam: "Rotterdam",
      vancouver: "Vancouver",
      canberra: "Canberra",
      "gold-coast": "Gold Coast",
      newcastle: "Newcastle",
      auckland: "Auckland",
    };
    const regionLabel = regionNames[readActiveCity()] || "your local";
    step1Text.textContent = nearbyMode().getNearbySession()?.unsupportedRegion
      ? "Near me works when you're near supported train stations."
      : `By default, Next Train shows departures at the station nearest you.`;
  }

  if (onboardingStep1) {
    onboardingStep1.hidden = false;
  }
  if (onboardingStep2) {
    onboardingStep2.hidden = true;
  }
  if (onboardingStep3) {
    onboardingStep3.hidden = true;
  }
  showOnboardingCoach(1);
  window.NextTrainCitySession?.syncRegionControls?.();
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
  if (onboardingStep3) {
    onboardingStep3.hidden = true;
  }
  showOnboardingCoach(2);
}

function showOnboardingStep3() {
  clearOnboardingSchedule();
  sessionStorage.setItem(ONBOARDING_STEP_KEY, "3");
  if (!canShowOnboardingCoach()) {
    return;
  }

  if (onboardingStep1) {
    onboardingStep1.hidden = true;
  }
  if (onboardingStep2) {
    onboardingStep2.hidden = true;
  }
  if (onboardingStep3) {
    onboardingStep3.hidden = false;
  }
  showOnboardingCoach(3);
}

function installOnboardingInteractionTracking() {
  // Defer only when the user taps the app beneath the coach — not coach buttons/scrim.
  const selector =
    "#hero, #nearby-btn, #routes-btn, #journeys-btn, #menu-btn, #journey-switcher, .nearby-direction-row, #nearby-station-btn, #nearby-station-input, #detail-station-input";

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

function hasJourneyKind() {
  return getJourneyKindJourneys().length > 0;
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

  const editingId = journeyDetail()?.getEditingJourneyId?.();
  if (editingId && settingsDetailView && !settingsDetailView.hidden) {
    const journey =
      settingsDraftJourneys.find((entry) => entry.id === editingId) ??
      getJourneyById(editingId);
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
    const amendWindowFromTarget = field === detailPreferredField;
    syncDetailComboHints({ amendWindowFromTarget });
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
    if (field === detailDefaultFromField || field === detailDefaultUntilField) {
      journeyDetail()?.clearPairedActiveHourField?.(
        field === detailDefaultFromField ? "from" : "until"
      );
      return;
    }
    setOptionalTimeField(input, display, field, clearBtn, "");
    syncDetailComboHints({ amendWindowFromTarget: field === detailPreferredField });
    if (field === detailPreferredField) {
      if (detailUseTargetTrainInput) {
        detailUseTargetTrainInput.checked = false;
      }
      syncDetailTargetMasterVisibility();
    }
  });
}

function journeyUsesLeaveBefore(journey) {
  if (isRouteJourney(journey)) {
    return false;
  }
  return journey?.useLeaveBefore !== false;
}

function getRoutePinnedLeaveBeforeMinutes(journey = getActiveJourney()) {
  const routeMinutes = Number(journey?.leaveBeforeMinutes);
  if (
    isRouteJourney(journey) &&
    Number.isFinite(routeMinutes) &&
    routeMinutes >= 1 &&
    routeMinutes <= 30
  ) {
    return routeMinutes;
  }
  return Number(settings?.nearbyLeaveBeforeMinutes) || DEFAULT_SETTINGS.leaveBeforeMinutes;
}

function persistRoutePinSettings(journeyId, patch = {}) {
  if (!journeyId) {
    return;
  }

  const journeys = settings.journeys.map((journey) => {
    if (journey.id !== journeyId || !isRouteJourney(journey)) {
      return journey;
    }
    return journeyModel().normalizeJourney({
      ...journey,
      ...patch,
      kind: "route",
    });
  });

  persistSettings({ journeys });
  rescheduleNearbyPinReminders();
}

function isRoutePinnedToday(journey) {
  if (!isRouteJourney(journey)) {
    return false;
  }
  const journeyClean = sanitizeJourneyPinDismissed(sanitizeJourneyPinOverride(journey));
  return isJourneyOverrideActiveToday(journeyClean);
}

function journeyLeaveCardArmed(journey, pinTrip) {
  if (isRouteJourney(journey)) {
    return isRoutePinnedToday(journey);
  }
  if (lastApiData && window.nextTrainPinState?.resolvePinState) {
    return window.nextTrainPinState.resolvePinState({
      mode: "journey",
      payload: lastApiData,
      journey,
      skipTrains: 0,
    }).leaveCardArmed;
  }
  if (!pinTrip || !journeyUsesLeaveBefore(journey)) {
    return false;
  }

  const journeyClean = sanitizeJourneyPinDismissed(sanitizeJourneyPinOverride(journey));
  return isJourneyTargetPinnedToday(journeyClean);
}

function resolveJourneyPinState(data, journey, { skip = skipTrains } = {}) {
  if (!window.nextTrainPinState?.resolvePinState) {
    return null;
  }
  const skipState = readSkipState();
  return window.nextTrainPinState.resolvePinState({
    mode: "journey",
    payload: lastApiData ?? data,
    journey,
    skipTrains: skip,
    browseLiveBoard: skipState.browseLiveBoard,
  });
}

function resolveNearbyPinState(data) {
  if (!window.nextTrainPinState?.resolvePinState || !isNearbyModeActive()) {
    return null;
  }

  const entry = getNearbyFocusedEntry();
  const payload = data ?? entry?.data;
  if (!payload) {
    return null;
  }

  return window.nextTrainPinState.resolvePinState({
    mode: "nearby",
    payload,
    nearbyPin: getNearbyPin(),
    nearbyFocusedDirection: entry?.direction ?? null,
    skipTrains: entry?.direction ? getNearbySkip(entry.direction) : 0,
  });
}

function tripForPinDeparture(data, departureIso, journey) {
  if (!departureIso) {
    return null;
  }
  const normalized = normalizeApiTrainData(lastApiData ?? data);
  const trip = findTripByDepartureIso(normalized, departureIso);
  if (!trip) {
    return null;
  }
  const referenceIso = normalized.next?.departure ?? normalized.next?.arrival;
  return (
    ensureFullNext(trip, getEffectiveLeaveBeforeMinutes(journey), referenceIso) ?? trip
  );
}


function getEffectiveLeaveBeforeMinutes(journey) {
  if (isRouteJourney(journey)) {
    if (!isRoutePinnedToday(journey)) {
      return 0;
    }
    return getRoutePinnedLeaveBeforeMinutes(journey);
  }
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
  const enabled = detailUseLeaveBeforeInput?.checked !== false;
  if (leaveBeforeField) {
    leaveBeforeField.hidden = !enabled;
    leaveBeforeField.classList.toggle("leave-before-field--disabled", !enabled);
  }
  if (detailLeaveBeforeInput) {
    detailLeaveBeforeInput.disabled = !enabled;
  }
  if (detailLeaveBeforeValueEl) {
    detailLeaveBeforeValueEl.hidden = false;
  }
}



function getActiveTimeZoneOffset(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: window.NextTrainCitySession?.readActiveTimeZone?.() || "Australia/Perth",
    timeZoneName: "shortOffset",
  }).formatToParts(date);
  const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value || "GMT+8";
  let offset = offsetPart.replace("GMT", "");
  if (offset === "Z") return "+00:00";
  if (!offset.includes(":")) {
    const sign = offset.startsWith("-") ? "-" : "+";
    const val = offset.replace(/[+-]/, "");
    offset = `${sign}${val.padStart(2, "0")}:00`;
  }
  return offset;
}

function departureIsoFromDisplayTime(displayTime, referenceIso) {
  if (!displayTime) {
    return null;
  }

  const [hour, minute] = displayTime.split(":").map(Number);
  const reference = referenceIso ? new Date(referenceIso) : new Date();
  const { year, month, day } = getPerthDateParts(reference);
  const offset = getActiveTimeZoneOffset(reference);
  let departure = new Date(
    `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:00${offset}`
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


function minutesUntilPerthClockMinutes(targetMinutes) {
  const now = getPerthMinutesSinceMidnight();
  let diff = targetMinutes - now;

  if (diff < -12 * 60) {
    diff += 24 * 60;
  } else if (diff > 12 * 60) {
    diff -= 24 * 60;
  }

  return diff;
}

function minutesUntilPerthWallClock(isoString) {
  return minutesUntilPerthClockMinutes(getPerthMinutesSinceMidnight(new Date(isoString)));
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


function formatMinutesAsTime(totalMinutes) {
  return journeyModel().formatMinutesAsTime(totalMinutes);
}

function addMinutesToTimeString(time, minutesToAdd) {
  return journeyModel().addMinutesToTimeString(time, minutesToAdd);
}



function formatJourneyDefaultWindow(journey) {
  if (!hasDefaultWindow(journey)) {
    return "Not set";
  }
  return `${journey.defaultFrom}–${journey.defaultUntil}`;
}


function preferredMinutesFromJourney(journey) {
  const raw = journey?.preferredTrainTime;
  if (!raw) {
    return null;
  }
  return parseTimeToMinutes(raw);
}

function getJourneysMatchingSchedule(minutes = getPerthMinutesSinceMidnight()) {
  const day = getPerthDayOfWeekIso();
  return getConfiguredJourneys().filter(
    (journey) => isJourneyKind(journey) && journeyMatchesSchedule(journey, minutes, day)
  );
}

function pickScheduledJourney(journeys, minutes = getPerthMinutesSinceMidnight()) {
  if (!journeys.length) {
    return null;
  }
  if (journeys.length === 1) {
    return journeys[0];
  }

  const withTarget = journeys.filter((journey) => preferredMinutesFromJourney(journey) != null);
  if (withTarget.length < 2) {
    return journeys[0];
  }

  const sorted = [...withTarget].sort(
    (left, right) => preferredMinutesFromJourney(left) - preferredMinutesFromJourney(right)
  );

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const midpoint = Math.floor(
      (preferredMinutesFromJourney(sorted[index]) + preferredMinutesFromJourney(sorted[index + 1])) / 2
    );
    if (minutes < midpoint) {
      return sorted[index];
    }
  }

  return sorted[sorted.length - 1];
}

function findScheduledJourneyId() {
  const matching = getJourneysMatchingSchedule();
  if (!matching.length) {
    return null;
  }

  const picked = pickScheduledJourney(matching);
  return picked?.id ?? null;
}

/** Rule 4: soonest upcoming target clock, any day (tonight, tomorrow, or next Monday). */
function findNextTargetJourneyId() {
  const journeys = getConfiguredJourneys().filter(isJourneyKind);
  if (!journeys.length) {
    return null;
  }

  const nowMinutes = getPerthMinutesSinceMidnight();
  const day = getPerthDayOfWeekIso();

  // Try today
  const upcomingToday = journeys
    .filter((j) => journeyMatchesActiveDay(j, day))
    .map((j) => ({ id: j.id, minutes: preferredMinutesFromJourney(j) }))
    .filter((j) => j.minutes != null && j.minutes > nowMinutes)
    .sort((a, b) => a.minutes - b.minutes);

  if (upcomingToday.length > 0) {
    return upcomingToday[0].id;
  }

  // Try future days
  for (let offset = 1; offset <= 7; offset++) {
    const nextDay = ((day + offset - 1) % 7) + 1;
    const upcomingNextDay = journeys
      .filter((j) => journeyMatchesActiveDay(j, nextDay))
      .map((j) => ({ id: j.id, minutes: preferredMinutesFromJourney(j) }))
      .filter((j) => j.minutes != null)
      .sort((a, b) => a.minutes - b.minutes);

    if (upcomingNextDay.length > 0) {
      return upcomingNextDay[0].id;
    }
  }

  return journeys[0].id;
}

function resolveCurrentOrNextJourneyId() {
  return findScheduledJourneyId() ?? findNextTargetJourneyId();
}

function findDefaultWindowJourneyAt(minutes = getPerthMinutesSinceMidnight()) {
  return pickScheduledJourney(getJourneysMatchingSchedule(minutes));
}

function getDefaultWindowJourneyIds(minutes = getPerthMinutesSinceMidnight()) {
  return getJourneysMatchingSchedule(minutes).map((journey) => journey.id);
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

  const storedWindowIds =
    override.matchingWindowIds ??
    (override.windowJourneyId ? [override.windowJourneyId] : []);
  const currentWindowIds = getDefaultWindowJourneyIds();
  const windowContextMatches = defaultWindowContextsMatch(storedWindowIds, currentWindowIds);

  // Outside every Active window — drop stale override unless window context still matches.
  if (!scheduledId) {
    if (!windowContextMatches) {
      clearManualJourneyOverride();
      return false;
    }
    if (settings.activeJourneyId === override.journeyId) {
      return true;
    }
    clearManualJourneyOverride();
    return false;
  }

  // Morning → evening (etc.): override was tied to a different active-window set.
  if (!windowContextMatches) {
    clearManualJourneyOverride();
    return false;
  }

  if (settings.activeJourneyId !== override.journeyId) {
    settings.activeJourneyId = override.journeyId;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  return true;
}

function maybeAutoSelectJourney() {
  if (deferJourneyAutoSelect) {
    return;
  }

  const pinnedCommuteId = findActiveCommuteTargetPinId();
  if (pinnedCommuteId) {
    const pinnedInSchedule = settings.journeys.some(
      (journey) => journey.id === pinnedCommuteId && journeyMatchesSchedule(journey),
    );
    if (
      pinnedInSchedule &&
      settings.activeJourneyId !== pinnedCommuteId
    ) {
      settings.activeJourneyId = pinnedCommuteId;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      skipTrains = readSkipState().count;
    }
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

function buildUrlSettingsFromParams(params, { station, direction } = {}) {
  const stationText = String(station ?? params.get("station") ?? "").trim();
  const directionText = String(
    direction ?? params.get("direction") ?? params.get("destination") ?? ""
  ).trim();
  if (!stationText || !directionText) {
    return null;
  }
  if (stationText.length > 120 || directionText.length > 120) {
    return null;
  }

  const journey = createDefaultJourney({
    name: "To work",
    station: stationText,
    direction: directionText,
    leaveBeforeMinutes:
      Number(params.get("leaveBefore") ?? params.get("leaveBeforeMinutes")) ||
      DEFAULT_SETTINGS.leaveBeforeMinutes,
  });

  return migrateSettings({
    settingsSchemaVersion: 2,
    journeys: [journey],
    activeJourneyId: journey.id,
    refreshSeconds:
      Number(params.get("refresh") ?? params.get("refreshSeconds")) ||
      DEFAULT_SETTINGS.refreshSeconds,
  });
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

  // Jim brief: don't block on catalog fetch for URL-based settings if we can.
  // However, for validation, we do a quick check.
  const stations = await getStationsList();
  if (stations.length === 0) {
    // If list failed/empty, trust the URL station for now (e.g. cold start with network delay)
    return buildUrlSettingsFromParams(params, {
      station: stationText,
      direction: directionText,
    });
  }

  const catalog = new Set(stations);
  const normalizedStation = normalizeStation(stationText);
  if (!catalog.has(normalizedStation) && !catalog.has(stationText)) {
    return null;
  }

  const station = catalog.has(normalizedStation) ? normalizedStation : stationText;
  return buildUrlSettingsFromParams(params, {
    station,
    direction: directionText,
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
    settingsSchemaVersion: 2,
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
    settingsSchemaVersion: 2,
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


function formatPreferredClock(totalMinutes) {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  return `${hour}:${String(minute).padStart(2, "0")}`;
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

  return (
    minutesUntilPerthWallClock(lastApiData.next.departure) -
    minutesUntilPerthClockMinutes(preferredMinutes)
  );
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
  const routeIsActiveRoute = active && isRouteJourney(active);
  const switcherLabel = routeIsActiveRoute
    ? formatJourneyRoute(active)
    : active?.name ?? "Journey";
  journeySwitcherEl.hidden = false;
  setAccessibleText(journeySwitcherNameEl, switcherLabel);
  journeySwitcherEl.setAttribute("aria-label", `Switch journey: ${switcherLabel}`);

  journeySwitcherMenuEl.innerHTML = "";

  for (const journey of getActiveTabJourneys()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "journey-switcher-option";
    if (journey.id === settings.activeJourneyId) {
      button.classList.add("active");
    }

    const titleRow = document.createElement("span");
    titleRow.className = "journey-switcher-option-title";
    const kindBadge = document.createElement("span");
    kindBadge.className = "journey-switcher-option-kind";
    kindBadge.textContent = isJourneyKind(journey) ? "Journey" : "Route";
    const nameSpan = document.createElement("span");
    nameSpan.className = "journey-switcher-option-name";
    const routeIsRoute = isRouteJourney(journey);
    nameSpan.textContent = routeIsRoute
      ? `${formatStationLabel(journey.station)} → ${journey.direction}`
      : journey.name;
    titleRow.append(kindBadge, nameSpan);

    button.append(titleRow);
    if (!routeIsRoute) {
      const routeSpan = document.createElement("span");
      routeSpan.className = "journey-switcher-option-route";
      routeSpan.textContent = formatJourneyRoute(journey);
      button.appendChild(routeSpan);
    }
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
  prepareMainScreenFromDeepLink();

  const journey = getJourneyById(journeyId);
  chromeTravelTab = journey && isRouteJourney(journey) ? "routes" : "journeys";
  journeyModeActive = true;
  exitNearbyMode();

  if (!journey) {
    clearHeroSetupState();
    syncChromeMode();
    if (hasConfiguredRoute()) {
      chromeTravelTab = "routes";
      ensureActiveJourneyForTab("routes");
    } else if (hasJourneyKind()) {
      ensureActiveJourneyForTab("journeys");
    } else {
      void enterNearbyMode();
    }
    fetchNextTrain();
    return;
  }

  if (!journey.station || !journey.direction) {
    openJourneyDetail(journeyId);
    return;
  }

  if (journeyId === settings.activeJourneyId) {
    syncChromeMode();
    clearHeroSetupState();
    fetchNextTrain();
    return;
  }

  setManualJourneyOverride(journeyId);
  deferJourneyAutoSelect = false;
  persistSettings({ activeJourneyId: journeyId });
  closeJourneySwitcherMenu();
  clearHeroSetupState();
  syncChromeMode();
  discardStaleJourneyBoard();
  if (isJourneyKind(journey)) {
    // Switcher: land on Target train, not a leftover swipe from last visit.
    // Day-override Pinned train still wins via restoreJourneyTargetPinFace.
    if (!isJourneyOverrideActiveToday(journey)) {
      clearSkipState();
    }
    requestJourneyTargetFaceRestore();
    trainNavigation().restoreJourneyTargetPinFace?.(journey);
  } else {
    skipTrains = readSkipState().count;
  }
  fetchNextTrain();
}

function prepareMainScreenFromDeepLink() {
  dismissLeaveHint();
  closeMenuDialogOnly();
  if (journeysDialog?.open || !settingsDetailView.hidden) {
    closeJourneysDialog();
  }
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

  const city = resolveJourneyCity(journey);
  if (city && city !== "perth") {
    params.set("city", city);
  }

  const fixture = getActiveFixture() || (isTestMode() ? "normal" : null);
  if (fixture) {
    params.set("fixture", fixture);
  }
  window.NextTrainBrisbaneDogfood?.applyParams?.(params);

  return params;
}

let rateLimitPauseUntil = 0;

function parseRetryAfterSec(response) {
  const raw = response.headers?.get?.("Retry-After");
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(Math.ceil(seconds), 300);
  }
  return undefined;
}

function noteRateLimited(retryAfterSec = 60) {
  const pauseMs = Math.max(1, Number(retryAfterSec) || 60) * 1000;
  rateLimitPauseUntil = Math.max(rateLimitPauseUntil, Date.now() + pauseMs);
}

function isRateLimitPaused() {
  return Date.now() < rateLimitPauseUntil;
}

function isRateLimitedResult(result) {
  return (
    result?.status === 429 ||
    result?.data?.error === "Too many requests" ||
    result?.error === "Too many requests"
  );
}

function isRateLimitedError(error) {
  return (
    error?.code === "RATE_LIMITED" ||
    /too many requests|live times are busy/i.test(String(error?.message ?? error ?? ""))
  );
}

function apiResultError(result, fallback = "Could not load train times") {
  if (isRateLimitedResult(result)) {
    noteRateLimited(result?.retryAfterSec ?? 60);
    const error = new Error("Live times are busy. Trying again shortly.");
    error.code = "RATE_LIMITED";
    return error;
  }

  return new Error(result?.data?.error ?? result?.error ?? fallback);
}

async function fetchJson(url, timeoutMs = 10000) {
  console.log(`[fetchJson] ${url}`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  let text;
  try {
    response = await fetch(url, { signal: controller.signal });
    text = await response.text();
  } catch (error) {
    console.error(`[fetchJson] error for ${url}:`, error.message || error);
    clearTimeout(timeoutId);

    // Fallback to Vercel if local origin fails (e.g. firewall, disconnected from LAN)
    const origin = getApiOrigin();
    if (origin && url.startsWith(origin) && origin !== VERCEL_ORIGIN && !url.includes("dogfood-origin.json")) {
      console.warn(`[fetchJson] Local API failed, retrying with Vercel: ${url} (error: ${error.message || error})`);
      const vercelUrl = url.replace(origin, VERCEL_ORIGIN);
      return await fetchJson(vercelUrl, timeoutMs);
    }

    if (error.name === "AbortError") {
      return {
        ok: false,
        error: "Connection timed out. Check your signal.",
      };
    }
    return {
      ok: false,
      error: "Couldn't reach live times. Check your connection.",
    };
  } finally {
    clearTimeout(timeoutId);
  }
  const retryAfterSec = parseRetryAfterSec(response);
  try {
    return {
      ok: response.ok,
      status: response.status,
      retryAfterSec,
      data: JSON.parse(text),
    };
  } catch {
    return {
      ok: false,
      status: response.status,
      retryAfterSec,
      error: text.includes("<html") 
        ? `Server error (${response.status}). The board API may not be deployed yet.`
        : "Server returned an invalid response. Restart with: npm start",
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

function leaveAckStorageKey(next, ackContext = null) {
  const departure = resolveTripDeparture(next);
  if (ackContext?.nearbyStation) {
    return `nextTrainLeaveAck:nearby:${normalizeStation(ackContext.nearbyStation)}:${departure ?? "unknown"}`;
  }
  const journey = getActiveJourney();
  const journeyId = ackContext?.journeyId ?? journey?.id ?? "none";
  return `nextTrainLeaveAck:${journeyId}:${departure ?? "unknown"}`;
}

function isLeaveAcknowledged(next, ackContext = null) {
  if (!next) {
    return false;
  }
  return sessionStorage.getItem(leaveAckStorageKey(next, ackContext)) === "1";
}

async function syncLeaveAckFromNative(next, ackContext = null) {
  if (!next || isLeaveAcknowledged(next, ackContext)) {
    return false;
  }
  if (!isNativeApp()) {
    return false;
  }

  const resolvedContext = ackContext ?? getLeaveAckContext();
  const departure = resolveTripDeparture(next);
  const journeyId = resolveAckJourneyId(resolvedContext);
  if (!departure || !journeyId) {
    return false;
  }

  const acknowledged = await window.nextTrainLeaveReminders?.isDepartureAcknowledged?.(
    journeyId,
    departure
  );
  if (!acknowledged) {
    return false;
  }

  sessionStorage.setItem(leaveAckStorageKey(next, resolvedContext), "1");
  return true;
}

let leaveAckNativeSyncInflight = null;

function maybeSyncLeaveAckFromNative(next, ackContext = null, onSynced) {
  if (!next || isLeaveAcknowledged(next, ackContext)) {
    return;
  }

  if (leaveAckNativeSyncInflight) {
    return;
  }

  leaveAckNativeSyncInflight = syncLeaveAckFromNative(next, ackContext)
    .then((synced) => {
      leaveAckNativeSyncInflight = null;
      if (synced) {
        onSynced?.();
      }
      return synced;
    })
    .catch(() => {
      leaveAckNativeSyncInflight = null;
      return false;
    });
}

async function syncActiveLeaveAckFromNative() {
  if (isNearbyModeActive() && isNearbyPinHolding()) {
    const next = getNearbyFocusedEntry()?.data?.next ?? lastRenderedNext;
    const station = nearbyMode().getNearbySession?.()?.station;
    if (!next || !station) {
      return false;
    }
    const leaveNext = nearbyMode().buildNearbyLeaveNext?.(next);
    if (!leaveNext) {
      return false;
    }
    return syncLeaveAckFromNative(leaveNext, { nearbyStation: station });
  }

  const leaveTrip = getLeaveTripForActiveJourney();
  return syncLeaveAckFromNative(leaveTrip);
}

function getLeaveAckContext() {
  if (isNearbyModeActive()) {
    const session = nearbyMode().getNearbySession?.();
    if (session?.station) {
      return { nearbyStation: session.station };
    }
  }
  return null;
}

function resolveAckJourneyId(ackContext = null) {
  if (ackContext?.nearbyStation) {
    return "nearby-pin";
  }
  return getActiveJourney()?.id ?? null;
}

function buildNearbyPinRouteForNative(pin) {
  if (!pin?.station || !pin?.direction) {
    return "";
  }
  return `${pin.station} → ${pin.direction}`;
}

function buildLeaveConfirmPayload(next, ackContext = null) {
  const resolvedContext = ackContext ?? getLeaveAckContext();
  const departure = resolveTripDeparture(next);
  if (!departure) {
    return null;
  }

  if (resolvedContext?.nearbyStation) {
    const pin = getNearbyPin();
    if (!pin) {
      return null;
    }
    const trip = pin.trip ?? next ?? {};
    const departure = pin.departureIso ?? resolveTripDeparture(trip);
    if (!departure) {
      return null;
    }
    return {
      journeyId: "nearby-pin",
      route: buildNearbyPinRouteForNative(pin),
      trainTime: trip.displayTime ?? "",
      departure,
      stale: false,
    };
  }

  const journey = getActiveJourney();
  if (!journey?.id) {
    return null;
  }

  const route =
    journey.station && journey.direction
      ? `${journey.station} → ${journey.direction}`
      : formatJourneyRoute(journey);

  return {
    journeyId: journey.id,
    route,
    trainTime: next.displayTime ?? "",
    departure,
    stale: Boolean(lastApiData?.stale),
  };
}

function getLeaveTripForActiveJourney(data = lastApiData) {
  const journey = getActiveJourney();
  if (!data || !journey) {
    return null;
  }
  return resolveJourneyPinTrip(data, journey);
}

function getLeaveAckTarget() {
  // Leave card follows the pin trip; ack must use the same departure key.
  const leaveTrip = getLeaveTripForActiveJourney();
  if (leaveTrip) {
    return leaveTrip;
  }
  return lastRenderedNext ?? null;
}

async function acknowledgeLeave(next, { ackContext = null } = {}) {
  if (!next) {
    return;
  }
  const resolvedContext = ackContext ?? getLeaveAckContext();
  const payload = buildLeaveConfirmPayload(next, resolvedContext);
  if (payload && isNativeApp()) {
    try {
      await window.nextTrainLeaveReminders?.startOnTheWay?.(payload);
    } catch (error) {
      console.warn("Could not start leave countdown after I've left", error);
    }
  }
  applyLeaveAcknowledgedUi(next, resolvedContext);
}

async function markLeaveAcknowledgedLocally(next, { ackContext = null } = {}) {
  if (!next) {
    return;
  }
  const resolvedContext = ackContext ?? getLeaveAckContext();
  const payload = buildLeaveConfirmPayload(next, resolvedContext);
  if (payload && isNativeApp()) {
    try {
      await window.nextTrainLeaveReminders?.acknowledgeDeparture?.({
        journeyId: payload.journeyId,
        departure: payload.departure,
      });
    } catch (error) {
      console.warn("Could not sync native leave ack", error);
    }
  }
  applyLeaveAcknowledgedUi(next, resolvedContext);
}

function applyLeaveAcknowledgedUi(next, resolvedContext) {
  sessionStorage.setItem(leaveAckStorageKey(next, resolvedContext), "1");
  if (leaveCardActionsEl) {
    leaveCardActionsEl.hidden = true;
    leaveCardActionsEl.classList.remove("leave-card-actions--visible");
  }
  if (leaveCardEl && (resolvedContext?.nearbyStation || isNearbyModeActive())) {
    leaveCardEl.hidden = true;
    hideNearbyPinLeaveSurfaces();
  }
  if (resolvedContext?.nearbyStation || isNearbyModeActive()) {
    nearbyMode().renderNearbyBoard?.();
    return;
  }
  if (lastApiData) {
    syncActiveJourneyForCurrentTab();
    const activeJourney = getActiveJourney();
    if (isRouteJourney(activeJourney) && chromeTravelTab === "routes") {
      renderRouteJourney(lastApiData);
    } else if (!isRouteJourney(activeJourney)) {
      render(prepareDisplayData(lastApiData));
    }
  }
}

function hideLeaveAlarmBanner() {
  if (leaveAlarmBannerEl) {
    leaveAlarmBannerEl.hidden = true;
  }
}

function renderLeaveAlarmBanner(alarm) {
  if (!leaveAlarmBannerEl) {
    return;
  }
  if (!alarm?.active) {
    hideLeaveAlarmBanner();
    return;
  }

  if (leaveAlarmRouteEl) {
    leaveAlarmRouteEl.textContent = alarm.route || "Your journey";
  }
  if (leaveAlarmTrainEl) {
    let trainText = alarm.trainTime ? `Train ${alarm.trainTime}` : "";
    if (alarm.stale && trainText) {
      trainText += " · Times may be out of date";
    } else if (alarm.stale) {
      trainText = "Times may be out of date";
    }
    leaveAlarmTrainEl.textContent = trainText;
  }
  leaveAlarmBannerEl.hidden = false;
}

function resolveLeaveAlarmTrip(alarm) {
  if (!alarm?.departure) {
    return null;
  }

  if (alarm.journeyId === "nearby-pin") {
    const pin = getNearbyPin();
    if (pin?.trip) {
      return pin.trip;
    }
    if (isNearbyModeActive()) {
      return {
        departure: alarm.departure,
        arrival: alarm.departure,
        displayTime: alarm.trainTime ?? "",
        leaveBy: alarm.departure,
      };
    }
  }

  const leaveTrip = getLeaveTripForActiveJourney();
  if (leaveTrip && resolveTripDeparture(leaveTrip) === alarm.departure) {
    return leaveTrip;
  }

  return {
    departure: alarm.departure,
    arrival: alarm.departure,
    displayTime: alarm.trainTime ?? "",
    leaveBy: alarm.departure,
  };
}

function focusJourneyForLeaveAlarm(alarm) {
  if (!alarm?.active || !alarm.journeyId) {
    return;
  }

  if (alarm.journeyId === "nearby-pin") {
    if (!isNearbyModeActive()) {
      void enterNearbyMode({
        departureIso: alarm.departure || undefined,
      });
    }
    return;
  }

  const activeJourney = getActiveJourney();
  if (activeJourney?.id === alarm.journeyId) {
    return;
  }

  if (!getJourneyById(alarm.journeyId)) {
    return;
  }

  switchJourney(alarm.journeyId);
}

async function syncLeaveAlarmFromNative() {
  if (!isNativeApp()) {
    hideLeaveAlarmBanner();
    return false;
  }

  const alarm = await window.nextTrainLeaveReminders?.getActiveLeaveAlarm?.();
  if (alarm?.active) {
    focusJourneyForLeaveAlarm(alarm);
  }
  renderLeaveAlarmBanner(alarm);
  return Boolean(alarm?.active);
}

let leaveAlarmNativeSyncInflight = null;

function maybeSyncLeaveAlarmFromNative() {
  if (!isNativeApp()) {
    return Promise.resolve(false);
  }
  if (leaveAlarmNativeSyncInflight) {
    return leaveAlarmNativeSyncInflight;
  }
  leaveAlarmNativeSyncInflight = syncLeaveAlarmFromNative().finally(() => {
    leaveAlarmNativeSyncInflight = null;
  });
  return leaveAlarmNativeSyncInflight;
}

async function handleLeaveAlarmOk() {
  const alarm = await window.nextTrainLeaveReminders?.getActiveLeaveAlarm?.();
  if (!alarm?.active) {
    hideLeaveAlarmBanner();
    return;
  }

  const ackContext = alarm.journeyId === "nearby-pin" ? getLeaveAckContext() : null;
  const next = resolveLeaveAlarmTrip(alarm);
  if (next) {
    await acknowledgeLeave(next, { ackContext });
  } else {
    await window.nextTrainLeaveReminders?.startOnTheWay?.({
      journeyId: alarm.journeyId,
      route: alarm.route,
      trainTime: alarm.trainTime,
      departure: alarm.departure,
      stale: alarm.stale,
    });
  }
  hideLeaveAlarmBanner();
}

function shouldAutoAckLeavePhase(leavePhase) {
  return leavePhase === "now" || leavePhase === "late" || leavePhase === "missed";
}

function movementTriggersLeaveAutoAck({ distanceKm: stationDistanceKm, speed, movedKm }) {
  if (typeof speed === "number" && speed >= TRAVELING_SPEED_MS) {
    return true;
  }
  if (typeof movedKm === "number" && movedKm >= LEAVE_AUTO_ACK_MOVE_KM) {
    return true;
  }
  return typeof stationDistanceKm === "number" && stationDistanceKm <= STATION_ARRIVAL_KM;
}

async function maybeAutoAcknowledgeLeave(next, options = {}) {
  const {
    station = null,
    ackContext = null,
    movedKm = null,
    speed = null,
    latitude = null,
    longitude = null,
    onAcknowledged = null,
  } = options;

  const resolvedAckContext = ackContext ?? null;

  if (!next || isLeaveAcknowledged(next, resolvedAckContext)) {
    return false;
  }

  const { leavePhase } = getLiveTiming(next);
  if (!shouldAutoAckLeavePhase(leavePhase)) {
    return false;
  }

  const departure = resolveTripDeparture(next);
  if (!departure) {
    return false;
  }

  const journey = getActiveJourney();
  const resolvedStation = station ?? journey?.station;
  if (!resolvedStation || (!isNativeApp() && !navigator.geolocation)) {
    return false;
  }

  const hasPrefetchedPosition =
    typeof latitude === "number" && typeof longitude === "number";
  const now = Date.now();
  if (
    leaveAutoAckLastDeparture === departure &&
    now - leaveAutoAckLastAttemptAt < LEAVE_AUTO_ACK_THROTTLE_MS
  ) {
    return false;
  }

  if (leaveAutoAckInflight) {
    return leaveAutoAckInflight;
  }

  leaveAutoAckLastDeparture = departure;
  leaveAutoAckLastAttemptAt = now;

  leaveAutoAckInflight = (async () => {
    try {
      const coords = await loadStationCoords();
      const stationPoint = coords[normalizeStation(resolvedStation)];
      if (!stationPoint) {
        return false;
      }

      let position;
      if (hasPrefetchedPosition) {
        position = {
          coords: {
            latitude,
            longitude,
            speed: typeof speed === "number" ? speed : null,
          },
        };
      } else {
        position = await getAppGeolocationPosition({
          enableHighAccuracy: false,
          timeout: 6000,
          maximumAge: 60_000,
        });
      }

      const stationDistance = distanceKm(
        position.coords.latitude,
        position.coords.longitude,
        stationPoint.lat,
        stationPoint.lng
      );

      const effectiveSpeed =
        typeof speed === "number" ? speed : position.coords.speed;

      let effectiveMovedKm = movedKm;
      if (effectiveMovedKm == null && leaveAutoAckLastPosition) {
        effectiveMovedKm = distanceKm(
          position.coords.latitude,
          position.coords.longitude,
          leaveAutoAckLastPosition.latitude,
          leaveAutoAckLastPosition.longitude
        );
      }
      leaveAutoAckLastPosition = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      if (
        movementTriggersLeaveAutoAck({
          distanceKm: stationDistance,
          speed: effectiveSpeed,
          movedKm: effectiveMovedKm,
        })
      ) {
        await markLeaveAcknowledgedLocally(next, { ackContext: resolvedAckContext });
        onAcknowledged?.();
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      leaveAutoAckInflight = null;
    }
  })();

  return leaveAutoAckInflight;
}

function maybeAutoAckLeaveFromLiveTick() {
  if (isNearbyModeActive() || !leaveCardEl || leaveCardEl.hidden) {
    return;
  }

  const next = getLeaveAckTarget();
  if (!next || isLeaveAcknowledged(next)) {
    return;
  }

  const { leavePhase } = getLiveTiming(next);
  if (!shouldAutoAckLeavePhase(leavePhase)) {
    return;
  }

  const journey = getActiveJourney();
  void maybeAutoAcknowledgeLeave(next, { station: journey?.station });
}

function isLeavePhasePastLeaveBy(leavePhase) {
  return leavePhase === "late" || leavePhase === "missed" || leavePhase === "now";
}


function formatLeaveCardSubline(next) {
  const { leavePhase } = getLiveTiming(next);
  if (leavePhase === "late" || leavePhase === "missed") {
    return formatLeaveMessage(next);
  }

  return formatTime(next.leaveBy);
}

function formatLeaveCardTargetSubline(trip) {
  const { leavePhase } = getLiveTiming(trip);
  if (leavePhase === "late" || leavePhase === "missed") {
    return `${trip.displayTime} train · ${formatLeaveMessage(trip)}`;
  }

  return `${trip.displayTime} train · leave by ${formatTime(trip.leaveBy)}`;
}

function formatLeaveCardLabel(leavePhase, { forTarget = false } = {}) {
  if (forTarget) {
    if (leavePhase === "late" || leavePhase === "missed") {
      return "Target — you should have left";
    }
    if (leavePhase === "now") {
      return "Target — leave now";
    }
    return "Target — leave in";
  }

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

  const preserve = [...heroEl.classList].filter(
    (className) =>
      className === "stale" ||
      className === "hero-setup" ||
      className === "hero--target-train" ||
      className === "hero--pinned-train" ||
      className === "locating"
  );
  heroEl.className = `hero ${urgencyPhaseClass(leavePhase)}`;
  preserve.forEach((className) => heroEl.classList.add(className));
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

function formatHeroScheduledLine(_next) {
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

function renderHeroHasLeftCountdown(element) {
  if (!element) {
    return;
  }

  element.classList.add("depart-countdown--has-left");
  element.textContent = "Has left";
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

function highlightLeaveBeforeField(fieldEl = leaveBeforeField) {
  if (!fieldEl) {
    return;
  }

  fieldEl.classList.remove("leave-before-field--highlight");
  void fieldEl.offsetWidth;
  fieldEl.classList.add("leave-before-field--highlight");

  const removeHighlight = () => {
    fieldEl.classList.remove("leave-before-field--highlight");
    fieldEl.removeEventListener("animationend", removeHighlight);
  };

  fieldEl.addEventListener("animationend", removeHighlight);
  window.setTimeout(removeHighlight, 2400);
}


function openLeaveBufferSettings() {
  dismissLeaveHint();
  const journey = getActiveJourney();
  if (!journey) {
    enterJourneyMode();
    openJourneysLibrary();
    return;
  }

  const nearbyPinControls = document.getElementById("nearby-pin-leave-controls");
  const inlineLeaveBeforeVisible =
    nearbyPinControls &&
    !nearbyPinControls.hidden &&
    (isRoutePinnedToday(journey) || (isNearbyModeActive() && isNearbyPinHolding()));

  if (inlineLeaveBeforeVisible) {
    const inlineField = document.getElementById("nearby-leave-before-field");
    inlineField?.scrollIntoView({ behavior: "smooth", block: "center" });
    document.getElementById("nearby-leave-before-input")?.focus({ preventScroll: true });
    highlightLeaveBeforeField(inlineField);
    return;
  }

  journeyDetail()?.setLibraryKind?.(isRouteJourney(journey) ? "routes" : "journeys");

  openJourneyDetail(journey.id)
    .then(() => {
      requestAnimationFrame(() => {
        leaveBeforeField?.scrollIntoView({ behavior: "smooth", block: "center" });
        detailLeaveBeforeInput?.focus({ preventScroll: true });
        window.setTimeout(() => highlightLeaveBeforeField(leaveBeforeField), 400);
      });
    })
    .catch((error) => {
      console.warn("Could not open leave buffer settings", error);
    });
}

function hasSeenLeaveHint() {
  return localStorage.getItem(LEAVE_HINT_KEY) === "1";
}

function updateLeaveHint() {
  const journey = getActiveJourney();
  const leaveTarget = getLeaveAckTarget();
  const leavePhase = leaveTarget ? getLiveTiming(leaveTarget).leavePhase : null;
  const hideForLateState =
    leavePhase === "late" ||
    leavePhase === "missed" ||
    (leaveTarget && isLeaveAcknowledged(leaveTarget));
  const hideForNearbyPinControls =
    isNearbyModeActive() &&
    document.getElementById("nearby-pin-leave-controls") &&
    !document.getElementById("nearby-pin-leave-controls").hidden;

  if (
    !leaveHintEl ||
    !leaveBufferEditBtn ||
    !journeyUsesLeaveBefore(journey) ||
    hasSeenLeaveHint() ||
    hideForLateState ||
    hideForNearbyPinControls ||
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
  const pinLocked = isHeroPinLockingSwipe();
  const showPrev =
    !pinLocked && canSkipToEarlierTrain() && !heroEl?.classList.contains("hero-setup");
  const showNext =
    !pinLocked && canSkipToNextTrain() && !heroEl?.classList.contains("hero-setup");

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
    !lastRenderedNext ||
    isHeroPinLockingSwipe()
  ) {
    if (swipeHintEl) {
      swipeHintEl.hidden = true;
    }
  } else if (swipeHintEl) {
    swipeHintEl.hidden = false;
  }

  updateSwipeCues();
}


function hideUpcomingDepartureBoard() {
  const sectionEl = document.getElementById("upcoming-departures");
  if (sectionEl) {
    sectionEl.hidden = true;
  }
  const listEl = document.getElementById("upcoming-departures-list");
  if (listEl) {
    listEl.innerHTML = "";
  }
}

function resolveDepartureBoardSkip(data, { pinTrip = null, heroShowsPin = false, skipCount = skipTrains } = {}) {
  let boardSkip = skipCount;
  if (heroShowsPin && pinTrip) {
    const pinIndex = trainNavigation().findTripIndexInUpcoming(
      normalizeApiTrainData(data),
      pinTrip
    );
    if (pinIndex >= 0) {
      boardSkip = Math.max(boardSkip, pinIndex);
    }
  }
  return boardSkip;
}

function renderUpcomingDepartureBoard(data, skipCount = skipTrains) {
  const sectionEl = document.getElementById("upcoming-departures");
  const listEl = document.getElementById("upcoming-departures-list");
  if (!sectionEl || !listEl) {
    return;
  }

  const upcoming = trainNavigation().getUpcomingTrips(data) ?? [];
  const rest = upcoming.slice(skipCount + 1);
  if (!rest.length) {
    hideUpcomingDepartureBoard();
    return;
  }

  sectionEl.hidden = false;
  listEl.innerHTML = "";
  const canPreview = !isHeroPinLockingSwipe();
  const visible = rest.slice(0, UPCOMING_DEPARTURE_BOARD_LIMIT);
  visible.forEach((trip, offset) => {
    const tripIndex = skipCount + 1 + offset;
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "upcoming-departures-item";
    button.disabled = !canPreview;
    if (canPreview) {
      button.setAttribute(
        "aria-label",
        `Show ${trip.displayTime ?? "departure"} in hero`
      );
      button.addEventListener("click", () => {
        previewUpcomingDepartureAtIndex(tripIndex);
      });
    }
    const time = document.createElement("span");
    time.className = "upcoming-departures-time";
    time.textContent = trip.displayTime ?? "—";
    const meta = document.createElement("span");
    meta.className = "upcoming-departures-meta";
    meta.textContent = `Pl ${trip.platform ?? "—"} · ${trip.status ?? "On Time"}`;
    button.append(time, meta);
    item.appendChild(button);
    listEl.appendChild(item);
  });
}

function renderRouteJourney(data, { stale = false } = {}) {
  if (chromeTravelTab !== "routes") {
    return;
  }

  const journey = getActiveJourney();
  const routePinned = isRoutePinnedToday(journey);
  if (!routePinned) {
    hideNearbyPinLeaveSurfaces();
    nearbyMode().clearRoutePinLeaveCardDismissed?.();
    if (leaveCardEl) {
      leaveCardEl.hidden = true;
    }
  }
  hideUpcomingDepartureBoard();

  const { next, lastUpdated } = data;
  setRouteDisplay(journey ? formatJourneyRoute(journey) : "Set up a journey");
  window.NextTrainCitySession?.syncFeedAttribution?.(
    journey?.cityId || lastApiData?.config?.city || data?.config?.city || planningCityId()
  );
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
    }
    if (preferredHintEl) {
      preferredHintEl.hidden = true;
    }
    platformEl.textContent = "—";
    statusEl.textContent = "—";
    followingSectionEl.hidden = true;
    updateSwipeHint();
    updateSwipeCues();
    syncHeroPinChrome();
    renderJourneySwitcher();
    return;
  }

  const pinState = resolveJourneyPinState(data, journey);
  const pinTrip = pinState
    ? tripForPinDeparture(data, pinState.pinDeparture, journey)
    : resolveJourneyPinTrip(lastApiData ?? data, journey);
  const heroTrip = pinState
    ? tripForPinDeparture(data, pinState.heroDeparture, journey) ??
      (skipTrains > 0 ? next : pinTrip ?? next)
    : skipTrains > 0
      ? next
      : pinTrip ?? next;
  lastRenderedNext = heroTrip;
  const referenceIso = next?.departure ?? next?.arrival;
  const leaveTrip =
    routePinned && heroTrip
      ? ensureFullNext(
          heroTrip,
          getRoutePinnedLeaveBeforeMinutes(journey),
          referenceIso
        ) ?? heroTrip
      : heroTrip;
  const heroShowsPin = pinState
    ? pinState.heroShowsPin
    : pinTrip && journeysDepartureMatch(heroTrip, pinTrip) && skipTrains === 0;

  setHeroUrgency("calm");
  if (heroDepartLabelEl) {
    heroDepartLabelEl.textContent = pinState
      ? pinState.heroLabel
      : getHeroDepartLabel({
          pinned: isRouteJourney(journey) && heroShowsPin,
          heroShowsPin: !isRouteJourney(journey) && heroShowsPin,
          skipCount: skipTrains,
        });
  }
  if (departCountdownEl) {
    renderDepartureCountdown(departCountdownEl, heroTrip);
  }
  if (departDisplayTimeEl) {
    departDisplayTimeEl.textContent = heroTrip.line ? `${heroTrip.displayTime} · ${heroTrip.line}` : heroTrip.displayTime;
    departDisplayTimeEl.dataset.time = heroTrip.displayTime;
  }

  const scheduledLine = formatHeroScheduledLine(heroTrip);
  if (heroScheduledTimeEl) {
    if (scheduledLine) {
      heroScheduledTimeEl.textContent = scheduledLine;
      heroScheduledTimeEl.hidden = false;
    } else {
      heroScheduledTimeEl.hidden = true;
    }
  }

  if (routePinned) {
    nearbyMode().renderRoutePinLeaveSurfaces?.(leaveTrip, journey);
  } else {
    if (leaveCardEl) {
      leaveCardEl.hidden = true;
    }
    hideNearbyPinLeaveSurfaces();
  }
  if (preferredHintEl) {
    preferredHintEl.hidden = true;
  }

  platformEl.textContent = heroTrip.platform;
  renderStatusDisplay(heroTrip);
  followingSectionEl.hidden = true;
  const boardSkip = resolveDepartureBoardSkip(data, { pinTrip, heroShowsPin });
  renderUpcomingDepartureBoard(data, boardSkip);
  updateSwipeHint();
  updateSwipeCues();
  updateLeaveHint();
  syncHeroPinChrome();
  renderJourneySwitcher();
}


function resolveJourneyTargetPreviewDisplay(journey, pinState) {
  const authoritative = window.nextTrainPinState?.resolveJourneyPreviewHero?.(journey) ?? null;
  if (authoritative?.heroPreviewClock) {
    return {
      previewClock: authoritative.heroPreviewClock,
      previewDayLabel: authoritative.heroPreviewDayLabel ?? "",
    };
  }

  if (pinState?.heroMode === "preview" && pinState.heroPreviewClock) {
    return {
      previewClock: pinState.heroPreviewClock,
      previewDayLabel: pinState.heroPreviewDayLabel ?? "",
    };
  }

  const preferredMinutes = preferredMinutesForLiveGlance(journey);
  if (preferredMinutes >= 0) {
    return {
      previewClock: formatPreferredClock(preferredMinutes),
      previewDayLabel: "",
    };
  }

  return { previewClock: "", previewDayLabel: "" };
}

function renderJourneyTargetPreviewFace(journey, pinState) {
  lastRenderedNext = null;
  setHeroUrgency("calm");
  const { previewClock, previewDayLabel } = resolveJourneyTargetPreviewDisplay(journey, pinState);
  if (heroDepartLabelEl) {
    heroDepartLabelEl.textContent = pinState?.heroLabel ?? "Target train";
  }
  if (departCountdownEl) {
    departCountdownEl.textContent = "—";
    departCountdownEl.classList.remove("depart-countdown--has-left");
  }
  if (departDisplayTimeEl) {
    departDisplayTimeEl.textContent = previewClock || "No matching train";
  }
  if (heroScheduledTimeEl) {
    if (previewDayLabel) {
      heroScheduledTimeEl.textContent = previewDayLabel;
      heroScheduledTimeEl.hidden = false;
    } else {
      heroScheduledTimeEl.textContent = previewClock
        ? `No train at or after ${previewClock}`
        : "";
      heroScheduledTimeEl.hidden = !previewClock;
    }
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
  hideUpcomingDepartureBoard();
  updateSwipeHint();
  updateSwipeCues();
  updateLeaveHint();
  syncHeroPinChrome();
  renderJourneySwitcher();
}

function render(data, { stale = false } = {}) {
  if (isActiveTravelTabEmpty()) {
    return;
  }

  syncActiveJourneyForCurrentTab();

  lastLiveDisplayMinute = getPerthMinutesSinceMidnight();
  hideNearbyPinLeaveSurfaces();
  hideUpcomingDepartureBoard();

  if (!stale) {
    errorEl.hidden = true;
  }
  clearHeroSetupState();
  heroEl?.classList.toggle("stale", stale);
  leaveCardEl?.classList.toggle("stale", stale);

  const journey = getActiveJourney();
  if (journeyModeActive && !activeJourneyMatchesCurrentTab(journey)) {
    return;
  }
  if (isRouteJourney(journey) && chromeTravelTab === "routes") {
    renderRouteJourney(data, { stale });
    return;
  }
  if (isRouteJourney(journey)) {
    return;
  }

  let { next, lastUpdated } = data;
  const emptyBoardPinState =
    !next && journey ? resolveJourneyPinState(data, journey) : null;
  if (!next && emptyBoardPinState?.heroDeparture && emptyBoardPinState.heroMode !== "preview") {
    next = tripForPinDeparture(data, emptyBoardPinState.heroDeparture, journey);
  }
  setRouteDisplay(journey ? formatJourneyRoute(journey) : "Set up a journey");
  window.NextTrainCitySession?.syncFeedAttribution?.(
    journey?.cityId || lastApiData?.config?.city || data?.config?.city || planningCityId()
  );
  updatedEl.textContent = stale
    ? "Update failed — times may be out of date"
    : lastUpdated
      ? `Updated ${lastUpdated}`
      : "Updated just now";

  if (!next) {
    if (
      emptyBoardPinState &&
      (emptyBoardPinState.heroMode === "preview" || emptyBoardPinState.showsTargetTrain)
    ) {
      renderJourneyTargetPreviewFace(journey, emptyBoardPinState);
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
    syncHeroPinChrome();
    renderJourneySwitcher();
    return;
  }

  consumeJourneyTargetFaceRestore(journey, data);

  const pinState = resolveJourneyPinState(data, journey);
  const pinTrip = pinState
    ? tripForPinDeparture(data, pinState.pinDeparture, journey)
    : resolveJourneyPinTrip(lastApiData ?? data, journey);
  const departedTargetTrip = pinState
    ? pinState.pinDeparture
      ? null
      : tripForPinDeparture(
          data,
          window.nextTrainPinState?.resolveDepartedJourneyTargetDeparture?.(
            lastApiData ?? data,
            journey
          ),
          journey
        )
    : pinTrip
      ? null
      : resolveDepartedJourneyTargetTrip(lastApiData ?? data, journey);
  const heroTrip = pinState
    ? pinState.heroMode === "preview"
      ? stale
        ? next
        : null
      : tripForPinDeparture(data, pinState.heroDeparture, journey) ??
        (skipTrains > 0 ? next : pinTrip ?? departedTargetTrip ?? next)
    : skipTrains > 0
      ? next
      : pinTrip ?? departedTargetTrip ?? next;
  const targetDeparted = pinState
    ? Boolean(
        !pinState.isSkipPreview &&
          !pinState.pinDeparture &&
          pinState.heroShowsPin &&
          pinState.trueNextDeparture === null
      )
    : Boolean(departedTargetTrip && !pinTrip && skipTrains === 0);
  lastRenderedNext = heroTrip;
  if (!heroTrip) {
    renderJourneyTargetPreviewFace(journey, pinState);
    return;
  }

  const leaveTrip = heroTrip;
  const live = getLiveTiming(leaveTrip);
  maybeSyncLeaveAckFromNative(leaveTrip, null, () => {
    if (lastApiData) {
      render(prepareDisplayData(lastApiData));
    }
  });
  const leaveAcknowledged = isLeaveAcknowledged(leaveTrip);
  const leaveArmed = pinState?.leaveCardArmed ?? journeyLeaveCardArmed(journey, pinTrip);
  const showLeaveCard = leaveArmed && !leaveAcknowledged && !targetDeparted;
  const showTargetDepartedActions = targetDeparted;
  const showLeaveAckActions =
    showTargetDepartedActions ||
    (showLeaveCard &&
      (live.leavePhase === "now" ||
        live.leavePhase === "late" ||
        live.leavePhase === "missed"));
  const journeyPinClean = sanitizeJourneyPinDismissed(sanitizeJourneyPinOverride(journey));
  const isDayOverridePin = pinState?.isOverrideActiveToday ?? isJourneyOverrideActiveToday(journeyPinClean);
  const activeTargetTrip = pinTrip ?? departedTargetTrip;
  const heroShowsPin = pinState
    ? pinState.heroShowsPin
    : activeTargetTrip &&
      journeysDepartureMatch(heroTrip, activeTargetTrip) &&
      skipTrains === 0;
  const showsTargetTrain = pinState
    ? Boolean(pinState.showsTargetTrain)
    : Boolean(
        activeTargetTrip && journeysDepartureMatch(heroTrip, activeTargetTrip) && !isDayOverridePin
      );

  setHeroUrgency(targetDeparted ? "late" : "calm");
  if (heroDepartLabelEl) {
    heroDepartLabelEl.textContent = pinState
      ? pinState.heroLabel
      : getHeroDepartLabel({
          heroShowsPin,
          showsTargetTrain,
          isDayOverridePin,
          skipCount: showsTargetTrain ? 0 : skipTrains,
        });
  }
  if (departCountdownEl) {
    if (targetDeparted) {
      renderHeroHasLeftCountdown(departCountdownEl);
    } else if (pinState?.heroMode === "preview") {
      departCountdownEl.textContent = "—";
      departCountdownEl.classList.remove("depart-countdown--has-left");
    } else {
      departCountdownEl.classList.remove("depart-countdown--has-left");
      renderDepartureCountdown(departCountdownEl, heroTrip);
    }
  }
  if (departDisplayTimeEl) {
    departDisplayTimeEl.textContent = heroTrip.line ? `${heroTrip.displayTime} · ${heroTrip.line}` : heroTrip.displayTime;
    departDisplayTimeEl.dataset.time = heroTrip.displayTime;
  }

  const scheduledLine = formatHeroScheduledLine(heroTrip);
  if (heroScheduledTimeEl) {
    if (scheduledLine) {
      heroScheduledTimeEl.textContent = scheduledLine;
      heroScheduledTimeEl.hidden = false;
    } else {
      heroScheduledTimeEl.hidden = true;
    }
  }

  if (leaveCardEl) {
    leaveCardEl.hidden = !showLeaveCard && !showTargetDepartedActions;
    leaveCardEl.classList.remove("leave-card--context", "leave-card--acknowledged");
    leaveCardEl.classList.toggle("leave-card--target-departed-only", showTargetDepartedActions && !showLeaveCard);
  }

  if (preferredHintEl) {
    preferredHintEl.hidden = true;
  }

  if (showLeaveCard) {
    if (leaveCardLabelEl) {
      leaveCardLabelEl.textContent = formatLeaveCardLabel(live.leavePhase);
    }
    if (leaveTimeEl) {
      renderLeaveMinutesCountdown(leaveTimeEl, leaveTrip);
    }
    if (leaveCountdownEl) {
      leaveCountdownEl.textContent = formatLeaveCardTargetSubline(leaveTrip);
    }
    updateLeaveCardState(live.leavePhase);
  }

  if (leaveCardActionsEl) {
    leaveCardActionsEl.hidden = !showLeaveAckActions;
    leaveCardActionsEl.classList.toggle("leave-card-actions--visible", showLeaveAckActions);
  }
  if (leaveAckBtn) {
    leaveAckBtn.hidden = showTargetDepartedActions;
  }

  if (showLeaveCard && shouldAutoAckLeavePhase(live.leavePhase)) {
    void maybeAutoAcknowledgeLeave(leaveTrip, { station: journey?.station });
  }

  platformEl.textContent = heroTrip.platform;
  renderStatusDisplay(heroTrip);
  followingSectionEl.hidden = true;
  const boardSkip = resolveDepartureBoardSkip(lastApiData ?? data, {
    pinTrip: activeTargetTrip,
    heroShowsPin: heroShowsPin || showsTargetTrain,
  });
  renderUpcomingDepartureBoard(lastApiData ?? data, boardSkip);

  updateSwipeHint();
  updateSwipeCues();
  updateLeaveHint();
  syncHeroPinChrome();
  renderJourneySwitcher();
}

function tryRenderJourneyTargetPreview(journey, payload = { next: null, upcoming: [] }) {
  if (!journey || !isJourneyKind(journey) || chromeTravelTab === "routes") {
    return false;
  }

  const board = payload ? normalizeApiTrainData(payload) : { next: null, upcoming: [] };
  const pinState = resolveJourneyPinState(board, journey);
  if (!pinState || (pinState.heroMode !== "preview" && !pinState.showsTargetTrain)) {
    return false;
  }

  if (pinState.heroDeparture && pinState.heroMode !== "preview") {
    const trip = tripForPinDeparture(board, pinState.heroDeparture, journey);
    if (trip) {
      render(prepareDisplayData({ ...board, next: trip }));
      return true;
    }
  }

  setRouteDisplay(formatJourneyRoute(journey));
  renderJourneyTargetPreviewFace(journey, pinState);
  return true;
}

function renderRefreshErrorState() {
  hideNearbyPinLeaveSurfaces();
  clearHeroSetupState();
  lastRenderedNext = null;
  heroEl?.classList.remove("stale");
  leaveCardEl?.classList.remove("stale");

  const journey = getActiveJourney();
  let previewed = false;
  try {
    previewed = tryRenderJourneyTargetPreview(
      journey,
      lastApiData ?? { next: null, upcoming: [] }
    );
  } catch {
    previewed = false;
  }
  if (previewed) {
    updatedEl.textContent = "Update failed";
    errorEl.hidden = true;
    return;
  }

  setRouteDisplay(journey ? formatJourneyRoute(journey) : "Set up a journey");
  window.NextTrainCitySession?.syncFeedAttribution?.(journey?.cityId || lastApiData?.config?.city || planningCityId());
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
  syncHeroPinChrome();
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
    leaveCardEl.classList.remove("leave-card--context");
  }
  if (updatedEl) {
    updatedEl.hidden = false;
  }
}

function openTravelLibrary(tab) {
  chromeTravelTab = tab;
  journeyModeActive = true;
  exitNearbyMode();
  if (journeyDetail()) {
    journeyDetail().setLibraryKind?.(tab);
  } else {
    // First paint can fail (offline/429) without ever loading the deferred
    // modules; the library must still open in the requested kind.
    void ensureDeferredModulesReady().then(() => journeyDetail()?.setLibraryKind?.(tab));
  }
  dismissLeaveHint();
  dismissTemplateRouteCoach();
  showSettingsListView();
  if (!hasConfiguredForActiveTab()) {
    renderTravelTabEmptyState();
  } else {
    syncActiveJourneyForCurrentTab();
    const journey = getActiveJourney();
    if (tab === "routes" && journey && isRoutePinnedToday(journey)) {
      reconcileExclusivePinState({ type: "journey", journeyId: journey.id });
    } else if (tab === "journeys" && journey && isJourneyTargetPinnedToday(journey)) {
      reconcileExclusivePinState({ type: "journey", journeyId: journey.id });
    } else {
      reconcileExclusivePinState();
    }
    fetchNextTrain();
  }
  openJourneysDialogSync();
  void populateJourneyListView();
  syncChromeMode();
}

function openRoutesLibrary() {
  openTravelLibrary("routes");
}

function openJourneysLibrary() {
  journeysTemplatesExpanded = false;
  openTravelLibrary("journeys");
}

function paintJourneyBoardLoadingState() {
  if (isNearbyModeActive() || !hasConfiguredForActiveTab()) {
    return;
  }

  hideNearbyPinLeaveSurfaces();
  clearHeroSetupState();
  heroEl?.classList.remove("stale");
  leaveCardEl?.classList.remove("stale");
  errorEl.hidden = true;

  const journey = getActiveJourney();
  setRouteDisplay(journey ? formatJourneyRoute(journey) : "Set up a journey");

  if (heroDepartLabelEl) {
    heroDepartLabelEl.textContent = "Next Train";
  }
  if (departCountdownEl) {
    departCountdownEl.textContent = "—";
  }
  if (departDisplayTimeEl) {
    departDisplayTimeEl.textContent = "Updating…";
    departDisplayTimeEl.removeAttribute("data-time");
  }
  if (heroScheduledTimeEl) {
    heroScheduledTimeEl.hidden = true;
  }
  if (leaveCardEl) {
    leaveCardEl.hidden = true;
  }
  if (updatedEl) {
    updatedEl.textContent = "Updating…";
  }
  platformEl.textContent = "—";
  statusEl.textContent = "—";
  followingSectionEl.hidden = true;
  hideUpcomingDepartureBoard();
  syncHeroPinChrome();
  renderJourneySwitcher();
}

function discardStaleJourneyBoard() {
  journeyBoardFetchId += 1;
  lastApiData = null;
  lastRenderedNext = null;
  paintJourneyBoardLoadingState();
}

function enterRouteMode() {
  dismissLeaveHint();
  closeJourneySwitcherMenu();

  if (journeyModeActive && chromeTravelTab === "routes") {
    openRoutesLibrary();
    return;
  }

  const switchingFromJourneys = journeyModeActive && chromeTravelTab === "journeys";
  chromeTravelTab = "routes";
  journeyModeActive = true;
  exitNearbyMode();
  syncChromeMode();

  if (!hasConfiguredRoute()) {
    renderTravelTabEmptyState();
    return;
  }

  if (switchingFromJourneys) {
    clearManualJourneyOverride();
  }

  discardStaleJourneyBoard();
  ensureActiveJourneyForTab("routes");
  const journey = getActiveJourney();
  if (journey) {
    setManualJourneyOverride(journey.id);
  }
  if (journey && isRoutePinnedToday(journey)) {
    reconcileExclusivePinState({ type: "journey", journeyId: journey.id });
  } else {
    reconcileExclusivePinState();
  }

  clearHeroSetupState();
  skipTrains = readSkipState().count;
  renderJourneySwitcher();
  fetchNextTrain();
}

function enterJourneyMode() {
  dismissLeaveHint();
  closeJourneySwitcherMenu();

  if (journeyModeActive && chromeTravelTab === "journeys") {
    openJourneysLibrary();
    return;
  }

  const switchingFromRoutes = journeyModeActive && chromeTravelTab === "routes";
  if (switchingFromRoutes) {
    clearManualJourneyOverride();
  }

  chromeTravelTab = "journeys";
  journeyModeActive = true;
  exitNearbyMode();
  syncChromeMode();

  if (!hasJourneyKind()) {
    renderTravelTabEmptyState();
    return;
  }

  ensureActiveJourneyForTab("journeys");
  discardStaleJourneyBoard();
  clearHeroSetupState();

  const resolvedId = resolveCurrentOrNextJourneyId();
  if (resolvedId && settings.activeJourneyId !== resolvedId) {
    settings.activeJourneyId = resolvedId;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  const journey = getActiveJourney();
  if (journey) {
    setManualJourneyOverride(journey.id);
  }

  // Rule 6: load = Target train again, unless their chosen pin is still active.
  if (journey && !isJourneyOverrideActiveToday(journey)) {
    clearSkipState();
  }

  if (hasPersistedNearbyPin()) {
    reconcileExclusivePinState({ type: "nearby" });
  } else if (journey && isJourneyTargetPinnedToday(journey)) {
    reconcileExclusivePinState({ type: "journey", journeyId: journey.id });
  } else {
    reconcileExclusivePinState();
  }

  requestJourneyTargetFaceRestore();
  trainNavigation().restoreJourneyTargetPinFace?.(journey);
  renderJourneySwitcher();
  fetchNextTrain();
}

function renderTravelTabEmptyState() {
  journeyModeActive = true;
  exitNearbyMode();
  hideNearbyPinLeaveSurfaces();
  lastApiData = null;
  lastRenderedNext = null;
  syncChromeMode();

  errorEl.hidden = true;
  setRouteDisplay(chromeTravelTab === "routes" ? "Routes" : "My Journeys");
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

  if (departCountdownEl) {
    departCountdownEl.hidden = true;
    departCountdownEl.classList.remove("hero-setup-message");
  }
  if (heroEmptyTitleEl) {
    heroEmptyTitleEl.textContent =
      chromeTravelTab === "routes" ? "No routes yet" : "No journeys yet";
  }
  if (heroEmptyTextEl) {
    heroEmptyTextEl.textContent =
      chromeTravelTab === "routes"
        ? "Pick a station and direction to check the next trains anytime."
        : "Save a trip you take often. Set your usual train and when you travel — we'll remind you when it's time to leave.";
  }
  if (heroEmptyAddBtn) {
    heroEmptyAddBtn.textContent =
      chromeTravelTab === "routes" ? "Add a route" : "Add a journey";
  }
  hideUpcomingDepartureBoard();
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
  lastRenderedNext = null;
  syncHeroPinChrome();
  renderJourneySwitcher();
}

function renderJourneyEmptyState() {
  renderTravelTabEmptyState();
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

async function loadStationCoordsForCity(cityId) {
  const id = String(cityId || "perth").trim().toLowerCase();
  if (nearbyCoordsCache.has(id)) {
    return nearbyCoordsCache.get(id);
  }

  let coords = {};
  if (id === "perth") {
    try {
      coords = await fetchLocalJson("/station-coords.json");
    } catch (error) {
      console.warn("Could not load station-coords.json for nearby", error);
      coords = {};
    }
  } else if (NEARBY_MULTI_CITY_IDS.includes(id)) {
    coords = (await window.NextTrainBrisbaneDogfood?.loadCoordsForCity?.(id)) ?? {};
  }

  nearbyCoordsCache.set(id, coords);
  return coords;
}

async function loadNearbyStationNames(cityId) {
  const id = String(cityId || "perth").trim().toLowerCase();
  if (nearbyStationNamesCache.has(id)) {
    return nearbyStationNamesCache.get(id);
  }

  let names = [];
  if (id === "perth") {
    try {
      names = collapseStationList(await fetchLocalJson("/stations.json"));
    } catch (error) {
      console.warn("Could not load stations.json for nearby", error);
      names = [];
    }
  } else if (NEARBY_MULTI_CITY_IDS.includes(id)) {
    names = (await window.NextTrainBrisbaneDogfood?.loadStationNamesForCity?.(id)) ?? [];
  }

  const set = new Set(names);
  nearbyStationNamesCache.set(id, set);
  return set;
}

function nearbyCityFromCoords(lat, lng) {
  const hint = window.NextTrainCitySession?.hintCityFromCoords?.(lat, lng);
  return hint || "perth";
}

function readPreferenceCity() {
  return String(
    window.NextTrainBrisbaneDogfood?.getCity?.() ||
      window.NextTrainCitySession?.readSavedCity?.() ||
      window.NextTrainCitySession?.readActiveHint?.() ||
      "perth"
  )
    .trim()
    .toLowerCase();
}

function readNearbyCity() {
  const sessionCity = nearbyMode().getNearbySession?.()?.city;
  if (sessionCity) {
    return String(sessionCity).trim().toLowerCase();
  }
  if (nearbyCityHint) {
    return String(nearbyCityHint).trim().toLowerCase();
  }
  const cached = nearbyMode().readLastNearbyStationCache?.();
  if (cached?.city) {
    return String(cached.city).trim().toLowerCase();
  }
  if (cached?.station) {
    return "perth";
  }
  return "perth";
}

async function getNearbyStationsList() {
  const city = readNearbyCity();
  const names = await loadNearbyStationNames(city);
  return Array.from(names);
}

async function loadStationCoords() {
  if (stationCoords) {
    return stationCoords;
  }

  // Planning/detail path: preference region catalog only.
  if (window.NextTrainBrisbaneDogfood?.isActive?.()) {
    const dogfoodCoords = window.NextTrainBrisbaneDogfood.getCoords?.() ?? {};
    if (Object.keys(dogfoodCoords).length > 0) {
      stationCoords = { ...dogfoodCoords };
      return stationCoords;
    }
    return {};
  }

  try {
    stationCoords = await fetchLocalJson("/station-coords.json");
  } catch (error) {
    console.warn("Could not load station-coords.json", error);
    stationCoords = {};
  }

  return stationCoords;
}

function activeCityStationNames() {
  if (!window.NextTrainBrisbaneDogfood?.isActive?.()) {
    return null;
  }
  return new Set(window.NextTrainBrisbaneDogfood.getStations?.() ?? []);
}

function isStationInNearbyCity(station, cityId = readNearbyCity()) {
  const id = String(cityId || "perth").trim().toLowerCase();
  const normalized = normalizeStation(station);
  const cached = nearbyStationNamesCache.get(id);
  if (!cached?.size) {
    return true;
  }
  return cached.has(normalized) || cached.has(station);
}

function isStationInActiveCity(station) {
  if (isNearbyModeActive()) {
    return isStationInNearbyCity(station);
  }
  const allowed = activeCityStationNames();
  return !allowed || allowed.has(station);
}

function readActiveCity() {
  return readPreferenceCity();
}

async function locateCityFromPosition() {
  try {
    console.log("[App] locateCityFromPosition: getting geolocation...");
    const position = await getAppGeolocationPosition({
      timeout: 8000,
      maximumAge: 300000,
    });
    const hint = window.NextTrainCitySession?.hintCityFromCoords?.(
      position.coords.latitude,
      position.coords.longitude
    ) ?? null;
    console.log(`[App] locateCityFromPosition: hint=${hint} from ${position.coords.latitude}, ${position.coords.longitude}`);
    return hint;
  } catch (error) {
    console.warn("[App] locateCityFromPosition failed:", error.message);
    return null;
  }
}

function scheduleRegionMismatchPrompt() {
  console.log("[App] scheduleRegionMismatchPrompt: scheduling in 2s...");
  setTimeout(() => {
    console.log("[App] scheduleRegionMismatchPrompt: firing...");
    void window.NextTrainCitySession?.maybePromptRegionMismatch?.({
      locateCity: locateCityFromPosition,
      skip: () => isJourneysDialogOpen() || Boolean(document.querySelector("dialog[open]")),
    });
  }, 2000);
}

function planningCityId() {
  return normalizeCityId(readPreferenceCity()) || "perth";
}

function isRegionMismatchError(error) {
  if (!error) {
    return false;
  }
  if (error.code === "REGION_MISMATCH") {
    return true;
  }
  return /in the selected region/i.test(String(error.message || ""));
}

/** Last known GPS city only — never default to Perth. */
function readKnownLocateCity() {
  const sessionCity = nearbyMode().getNearbySession?.()?.city;
  if (sessionCity) {
    return normalizeCityId(sessionCity) || String(sessionCity).trim().toLowerCase() || null;
  }
  try {
    const raw = JSON.parse(localStorage.getItem("nextTrainLastGps") || "null");
    if (raw && Number.isFinite(Number(raw.latitude)) && Number.isFinite(Number(raw.longitude))) {
      const hint = window.NextTrainCitySession?.hintCityFromCoords?.(
        Number(raw.latitude),
        Number(raw.longitude)
      );
      if (hint) {
        return normalizeCityId(hint) || String(hint).trim().toLowerCase();
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function isPlanningAwayFromLocation() {
  const locate = readKnownLocateCity();
  if (!locate) {
    return false;
  }
  return locate !== planningCityId();
}

function testModeNearestStation() {
  if (window.NextTrainBrisbaneDogfood?.isActive?.()) {
    const city = String(window.NextTrainBrisbaneDogfood.getCity?.() || "").toLowerCase();
    const defaults = {
      brisbane: "Roma Street",
      sydney: "Central",
      adelaide: "Adelaide Railway Station",
      "uk-london-tfl": "King's Cross St. Pancras",
      amsterdam: "Centraal Station",
      rotterdam: "Beurs",
      vancouver: "Waterfront",
      canberra: "Alinga Street",
      "gold-coast": "Helensvale",
      newcastle: "Newcastle Interchange",
      auckland: "Waitematā Station",
    };
    if (defaults[city]) {
      return { station: defaults[city], city, distanceKm: 0.2 };
    }
  }
  return { station: "Edgewater Stn", city: "perth", distanceKm: 0.2 };
}

function pickPerthDirectionFromList(directions) {
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

async function pickPerthDirection(station) {
  return pickPerthDirectionFromList(await fetchDirectionsFromApi(station));
}

async function pickDefaultDirection(station) {
  const directions = await fetchDirectionsFromApi(station);
  if (planningCityId() === "perth") {
    return pickPerthDirectionFromList(directions);
  }
  const first = directions.find((direction) => String(direction || "").trim());
  return first ? normalizeDirection(first) : null;
}

function isOutboundJourney(journey) {
  const name = String(journey?.name || "")
    .trim()
    .toLowerCase();
  return name.endsWith(" - out") || name === "to home";
}

function getInboundJourney(journeys = settings.journeys) {
  return journeys.find((journey) => !isOutboundJourney(journey)) ?? journeys[0] ?? null;
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

  const direction = await pickDefaultDirection(station);
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

  try {
    if (journey.station && !journey.direction) {
      const direction = await pickDefaultDirection(journey.station);
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

    if (isPlanningAwayFromLocation()) {
      return { configured: false, nearest: null, error: null, journey, regionAway: true };
    }

    let nearest = null;
    try {
      nearest = await findNearestStation();
    } catch (error) {
      if (isRegionMismatchError(error)) {
        return { configured: false, nearest: null, error: null, journey, regionAway: true };
      }
      return { configured: false, nearest: null, error, journey };
    }

    const configured = await configureInboundJourney(journey, nearest.station);
    if (!configured) {
      return { configured: false, nearest, error: null, journey };
    }

    return { configured: true, nearest, error: null, journey: configured };
  } catch (error) {
    // Direction API 429/failures must not reject journey-detail openers (unhandled → Sentry).
    return { configured: false, nearest: null, error, journey };
  }
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
  console.log("[App] getGeolocationPosition starting...");
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

async function findNearestStation({
  forceFresh = false,
  allowSessionShortcut = true,
  maximumAge,
} = {}) {
  const planningCity = planningCityId();
  const regionMismatch = Object.assign(
    new Error("Could not find a nearby station in the selected region."),
    { code: "REGION_MISMATCH" }
  );

  if (isTestMode()) {
    const nearest = testModeNearestStation();
    const nearestCity = normalizeCityId(nearest.city) || "perth";
    if (nearestCity !== planningCity) {
      throw regionMismatch;
    }
    return nearest;
  }

  // Only skip GPS when caller explicitly allows it (not the background refine path).
  if (allowSessionShortcut && !forceFresh && nearbyMode().getNearbySession()?.station) {
    const session = nearbyMode().getNearbySession();
    const sessionCity = normalizeCityId(session.city || readNearbyCity()) || "perth";
    if (sessionCity === planningCity && isStationInNearbyCity(session.station, sessionCity)) {
      return {
        station: session.station,
        city: sessionCity,
        distanceKm:
          typeof session.distanceKm === "number" ? session.distanceKm : 0,
      };
    }
  }

  const geoTimeoutMs = forceFresh ? 12000 : 5000;
  const resolvedMaximumAge =
    typeof maximumAge === "number"
      ? maximumAge
      : forceFresh
        ? 0
        : NEARBY_SOFT_LOCATION_MAX_AGE_MS;
  const position = await getAppGeolocationPosition({
    enableHighAccuracy: forceFresh,
    timeout: geoTimeoutMs,
    maximumAge: resolvedMaximumAge,
  });

  const { latitude, longitude } = position.coords;
  const nearbyCity = nearbyCityFromCoords(latitude, longitude);
  nearbyCityHint = nearbyCity;

  if ((normalizeCityId(nearbyCity) || "perth") !== planningCity) {
    throw regionMismatch;
  }

  // Cache the last successful GPS fix.
  try {
    localStorage.setItem("nextTrainLastGps", JSON.stringify({
      latitude,
      longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp || Date.now()
    }));
  } catch {}

  const coords = await loadStationCoordsForCity(planningCity);
  await loadNearbyStationNames(planningCity);

  // If we don't have coords yet, return raw position for server resolution.
  if (Object.keys(coords).length === 0) {
    console.log("[App] findNearestStation: no coords loaded, returning raw position");
    return { lat: latitude, lng: longitude, city: planningCity, distanceKm: 0 };
  }

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

  if (!isStationInNearbyCity(nearest, planningCity)) {
    throw new Error("Could not find a nearby station.");
  }

  return {
    station: nearest,
    city: planningCity,
    distanceKm: bestDistance,
    lat: latitude,
    lng: longitude,
  };
}


function isJourneyModeActive() {
  return journeyModeActive;
}

function heroHasVisibleTrain() {
  if (heroEl?.classList.contains("hero-setup")) {
    return false;
  }
  if (heroEmptyStateEl && !heroEmptyStateEl.hidden) {
    return false;
  }
  const pinState = resolveJourneyPinState(lastApiData, getActiveJourney());
  if (pinState?.heroMode === "preview") {
    return true;
  }
  if (!lastRenderedNext) {
    return false;
  }
  const countdown = departCountdownEl?.textContent?.trim() ?? "";
  return countdown.length > 0 && countdown !== "—";
}

function syncHeroPinChrome() {
  const nearbyActive = isNearbyModeActive();
  const pinHolding = isNearbyPinHolding();
  const journey = getActiveJourney();
  const routePinActive = journeyModeActive && isRoutePinnedToday(journey);
  appEl?.classList.toggle("nearby-pin-active", nearbyActive && pinHolding);
  appEl?.classList.toggle("route-pin-active", routePinActive);

  let showTargetTrainChrome = false;
  if (
    journeyModeActive &&
    journey &&
    isJourneyKind(journey) &&
    lastRenderedNext &&
    preferredMinutesForLiveGlance(journey) >= 0
  ) {
    const pinState = resolveJourneyPinState(lastApiData, journey);
    if (pinState) {
      showTargetTrainChrome = Boolean(pinState.showsTargetTrain);
    } else {
      const journeyPinClean = sanitizeJourneyPinDismissed(sanitizeJourneyPinOverride(journey));
      const preferredDeparture = window.nextTrainPinState?.resolveJourneyPreferredTargetDeparture?.(
        lastApiData,
        journey
      );
      const heroDeparture = resolveTripDeparture(lastRenderedNext);
      showTargetTrainChrome = Boolean(
        preferredDeparture &&
          heroDeparture === preferredDeparture &&
          !isJourneyOverrideActiveToday(journeyPinClean)
      );
    }
  }

  let showPinnedTrainChrome = false;
  if (!showTargetTrainChrome) {
    if (nearbyActive && pinHolding) {
      const entry = getNearbyFocusedEntry();
      const pinState = resolveNearbyPinState(entry?.data);
      if (pinState) {
        showPinnedTrainChrome = pinState.pinnedChrome;
      } else {
        showPinnedTrainChrome =
          Boolean(entry?.direction) &&
          getNearbySkip(entry.direction) === 0 &&
          isNearbyPinShowing(entry.direction);
      }
    } else if (lastRenderedNext && journeyModeActive && journey) {
      const pinState = resolveJourneyPinState(lastApiData, journey);
      if (pinState) {
        showPinnedTrainChrome = pinState.pinnedChrome;
      } else {
        const pinTrip = resolveJourneyPinTrip(lastApiData, journey);
        const heroOnPin =
          pinTrip &&
          journeysDepartureMatch(lastRenderedNext, pinTrip) &&
          skipTrains === 0;
        if (heroOnPin) {
          if (isRouteJourney(journey) && isRoutePinnedToday(journey)) {
            showPinnedTrainChrome = true;
          } else if (isJourneyKind(journey)) {
            const journeyPinClean = sanitizeJourneyPinDismissed(sanitizeJourneyPinOverride(journey));
            showPinnedTrainChrome = isJourneyOverrideActiveToday(journeyPinClean);
          }
        }
      }
    }
  }

  heroEl?.classList.toggle("hero--target-train", showTargetTrainChrome);
  heroEl?.classList.toggle("hero--pinned-train", showPinnedTrainChrome);

  if (heroPinBtn) {
    if (nearbyActive) {
      const showPin =
        Boolean(nearbyMode().getNearbySession()?.station) &&
        !shouldShowNearbyLoadingState() &&
        heroHasVisibleTrain();
      heroPinBtn.hidden = !showPin;
      const entry = getNearbyFocusedEntry();
      const pinActive = isNearbyPinShowing(entry?.direction);
      heroPinBtn.classList.toggle("hero-pin-btn--active", pinActive);
      heroPinBtn.setAttribute("aria-pressed", pinActive ? "true" : "false");
      heroPinBtn.setAttribute("aria-label", pinActive ? "Unpin train" : "Pin train");
    } else {
      const journeyPin = getActiveJourney();
      const showJourneyPin =
        journeyModeActive &&
        journeyPin &&
        (isJourneyKind(journeyPin) || isRouteJourney(journeyPin)) &&
        !isUnconfiguredJourney(journeyPin) &&
        heroHasVisibleTrain();
      heroPinBtn.hidden = !showJourneyPin;
      if (showJourneyPin) {
        const journeyPinClean = sanitizeJourneyPinDismissed(
          sanitizeJourneyPinOverride(journeyPin)
        );
        const pinState = resolveJourneyPinState(lastApiData, journeyPinClean);
        let pinActive = false;
        if (pinState) {
          // Filled pin when this journey is armed and the hero is on that train.
          // pinnedChrome is only override/nearby (swipe lock); Target train still
          // uses skip to sit on preferred, so skip>0 must not hide the pressed state.
          pinActive = Boolean(
            pinState.isPinnedToday &&
              !pinState.isPinDismissedToday &&
              (pinState.heroShowsPin || pinState.pinnedChrome)
          );
        } else {
          const pinTrip = resolveJourneyPinTrip(lastApiData, journeyPinClean);
          const heroShowsPin =
            pinTrip &&
            journeysDepartureMatch(lastRenderedNext, pinTrip) &&
            skipTrains === 0;
          pinActive =
            isJourneyTargetPinnedToday(journeyPinClean) && heroShowsPin && skipTrains === 0;
        }
        heroPinBtn.classList.toggle("hero-pin-btn--active", pinActive);
        heroPinBtn.setAttribute("aria-pressed", pinActive ? "true" : "false");
        heroPinBtn.setAttribute("aria-label", pinActive ? "Unpin train" : "Pin train");
      }
    }
  }

  updateSwipeCues();
  updateSwipeHint();
}

function syncNearbyPinChrome() {
  syncHeroPinChrome();
}



async function fetchNextTrainFromLiveTimesClient() {
  if (window.NextTrainBrisbaneDogfood?.isActive?.()) {
    return null;
  }
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

  if (apiData?.next) {
    return apiData;
  }

  // Server already checked live board (+ GTFS fallback server-side). Do not re-fetch
  // raw Perth XML in the browser — it can disagree and flash a phantom time.
  if (apiData?.scheduleSource) {
    return apiData;
  }

  const clientData = await fetchNextTrainFromLiveTimesClient();
  return clientData ?? apiData;
}

async function fetchNextTrain() {
  if (!isNearbyModeActive() && !journeyModeActive && shouldDefaultToNearby()) {
    await applyJourneysMode();
    return;
  }

  if (isNearbyModeActive()) {
    if (nearbyMode().getNearbySession()?.unsupportedRegion) {
      renderNearbyBoard();
      return;
    }

    if (isRateLimitPaused()) {
      renderNearbyBoard({ stale: Boolean(nearbyMode().getNearbyBoard?.()) });
      return;
    }

    try {
      await fetchNearbyBoard();
      renderNearbyBoard();
    } catch (error) {
      if (isRateLimitedError(error)) {
        renderNearbyBoard({ stale: true });
        return;
      }
      errorEl.textContent = error.message;
      errorEl.hidden = false;
      renderNearbyBoard({ stale: true });
    }
    return;
  }

  if (!hasConfiguredForActiveTab()) {
    renderTravelTabEmptyState();
    return;
  }

  syncActiveJourneyForCurrentTab();
  clearHeroSetupState();
  if (!lastApiData) {
    paintJourneyBoardLoadingState();
  }
  maybeAutoSelectJourney();
  updateSwipeHint();
  updateSwipeCues();

  if (isRateLimitPaused()) {
    if (lastApiData?.next) {
      render(prepareDisplayData(lastApiData), { stale: true });
    }
    return;
  }

  const fetchId = ++journeyBoardFetchId;

  try {
    const result = await fetchJson(apiUrl(`/api/next-train?${buildApiParams()}`), 20000);

    if (fetchId !== journeyBoardFetchId) {
      return;
    }

    if (!result.ok) {
      throw apiResultError(result, "Could not load train times");
    }

    const payload = await resolveNextTrainPayload(result.data);
    if (fetchId !== journeyBoardFetchId) {
      return;
    }
  lastApiData = normalizeApiTrainData(payload);
  render(prepareDisplayData(lastApiData));

  // Jim brief: defer non-critical scripts until after first train paint.
  window.NextTrainDeferred?.load?.();
} catch (error) {
    if (fetchId !== journeyBoardFetchId) {
      return;
    }
    // Deferred features (reminders, journey detail) must still become
    // available when the first fetch fails (offline/429).
    window.NextTrainDeferred?.load?.();
    errorEl.textContent = error.message;
    errorEl.hidden = false;
    trackProductEvent("api_error_shown", {
      surface: "journey",
      code: error?.code || "api_error",
    });

    if (lastApiData?.next) {
      render(prepareDisplayData(lastApiData), { stale: true });
    } else {
      let previewed = false;
      try {
        previewed = tryRenderJourneyTargetPreview(
          getActiveJourney(),
          lastApiData ?? { next: null, upcoming: [] }
        );
      } catch {
        previewed = false;
      }
      if (previewed) {
        updatedEl.textContent = "Update failed";
        errorEl.hidden = true;
      } else {
        renderRefreshErrorState();
      }
    }
  }
}

function refreshLiveDisplay(force = false) {
  maybeAutoAckLeaveFromLiveTick();
  void maybeSyncLeaveAlarmFromNative();

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

  if (isActiveTravelTabEmpty()) {
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






async function applyTemplateRoute(journey, templateKey) {
  if (templateKey === "morning") {
    return applyDefaultJourneyRoute(journey);
  }

  if (templateKey !== "evening") {
    return { configured: false, nearest: null, error: null };
  }

  if (planningCityId() !== "perth") {
    return applyDefaultJourneyRoute(journey);
  }

  if (isPlanningAwayFromLocation()) {
    return { configured: false, nearest: null, error: null, regionAway: true };
  }

  let nearest = null;
  try {
    nearest = await findNearestStation();
  } catch (error) {
    if (isRegionMismatchError(error)) {
      return { configured: false, nearest: null, error: null, regionAway: true };
    }
    return { configured: false, nearest: null, error };
  }

  try {
    const inbound = getInboundJourney(
      settingsDraftJourneys.filter((entry) => entry.id !== journey.id)
    );
    const configured = await configureOutboundJourney(journey, nearest.station, inbound);

    if (!configured) {
      return { configured: false, nearest, error: null };
    }

    return { configured: true, journey: configured, nearest, error: null };
  } catch (error) {
    // Direction API 429/failures must not reject template creators (unhandled → Sentry).
    return { configured: false, nearest, error };
  }
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

  if (journeySaveRouteBtnEl) {
    journeySaveRouteBtnEl.disabled = active;
    journeySaveRouteBtnEl.setAttribute("aria-busy", active ? "true" : "false");
  }
  if (journeySetupBtnEl) {
    journeySetupBtnEl.disabled = active;
    journeySetupBtnEl.setAttribute("aria-busy", active ? "true" : "false");
  }
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


function getJourneyNamePool() {
  const byId = new Map();
  for (const journey of settings.journeys) {
    byId.set(journey.id, journey);
  }
  for (const journey of settingsDraftJourneys) {
    byId.set(journey.id, journey);
  }
  return [...byId.values()];
}

function createJourneyFromRoute() {
  journeyDetail()?.setLibraryKind?.("routes");
  const journey = createDefaultJourney({
    name: "",
    kind: "route",
    autoRoute: false,
    cityId: planningCityId(),
  });
  settingsDraftJourneys.push(journey);
  return openJourneyDetail(journey.id);
}

function createJourneyFromTemplate(templateKey) {
  if (isAtJourneyCap()) {
    return;
  }

  journeyDetail()?.setLibraryKind?.("journeys");

  if (templateKey === "custom") {
    const journey = createDefaultJourney({
      name: nextAvailableJourneyName(getJourneyNamePool()),
      kind: "journey",
      templateKey: "custom",
      autoRoute: false,
      cityId: planningCityId(),
      remindDays: [getPerthDayOfWeekIso()],
      preferredTrainTime: journeyModel().getDefaultCustomPreferredTrainTime(),
    });
    settingsDraftJourneys.push(journey);
    // Draft only until Save with station + direction — do not persist shells.
    // Open immediately; nearest station prefills in the background (no geo gate).
    return openJourneyDetail(journey.id).then(() => {
      const regionAway = isPlanningAwayFromLocation();
      showTemplateRouteCoach({
        templateKey: "custom",
        journey,
        nearest: null,
        configured: false,
        error: null,
        regionAway,
        routeLoading: !regionAway,
      });
      void prefillCustomNearestStation(journey.id).catch((error) => {
        console.warn("Custom nearest prefill failed", error);
      });
    });
  }

  return createJourneyFromPresetTemplate(templateKey);
}

async function prefillCustomNearestStation(journeyId) {
  if (!journeyId) {
    return;
  }

  if (isPlanningAwayFromLocation()) {
    syncDetailNearestStationChrome({ loading: false, error: false, hint: "", regionAway: true });
    if (getTemplateWizardContext()?.templateKey === "custom") {
      updateTemplateRouteCoachState({
        nearest: null,
        configured: false,
        error: null,
        regionAway: true,
        routeLoading: false,
      });
    }
    return;
  }

  syncDetailNearestStationChrome({ loading: true, error: false, hint: "", regionAway: false });

  if (getTemplateWizardContext()?.templateKey === "custom") {
    updateTemplateRouteCoachState({ routeLoading: true });
  }

  let nearest = null;
  let error = null;
  try {
    nearest = await findNearestStation();
  } catch (err) {
    error = err;
  }

  if (journeyDetail().getEditingJourneyId?.() !== journeyId) {
    return;
  }

  const journeyIndex = settingsDraftJourneys.findIndex((entry) => entry.id === journeyId);
  const journey = journeyIndex >= 0 ? settingsDraftJourneys[journeyIndex] : null;
  if (!journey) {
    return;
  }

  const formStation = String(getDetailStationCombobox()?.getValue?.() || "").trim();
  if (formStation || journey.station) {
    if (getTemplateWizardContext()?.templateKey === "custom") {
      updateTemplateRouteCoachState({
        journey,
        routeLoading: false,
        configured: Boolean(journey.station && journey.direction),
      });
    }
    syncDetailNearestStationChrome({ loading: false, error: false, hint: "" });
    return;
  }

  if (isRegionMismatchError(error)) {
    syncDetailNearestStationChrome({ loading: false, error: false, hint: "", regionAway: true });
    if (getTemplateWizardContext()?.templateKey === "custom") {
      updateTemplateRouteCoachState({
        journey,
        nearest: null,
        configured: false,
        error: null,
        regionAway: true,
        routeLoading: false,
      });
    }
    return;
  }

  if (error || !nearest?.station) {
    syncDetailNearestStationChrome({
      loading: false,
      error: true,
      hint: error
        ? locationErrorFrom(error).message
        : "Couldn't find nearest station",
    });
    if (getTemplateWizardContext()?.templateKey === "custom") {
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
  try {
    if (!direction) {
      direction = (await pickDefaultDirection(nearest.station)) || "";
    }

    if (journeyDetail().getEditingJourneyId?.() !== journeyId) {
      return;
    }

    // User may have typed a station while geo was in flight — don't overwrite.
    if (String(getDetailStationCombobox()?.getValue?.() || "").trim()) {
      if (getTemplateWizardContext()?.templateKey === "custom") {
        updateTemplateRouteCoachState({ routeLoading: false });
      }
      syncDetailNearestStationChrome({ loading: false, error: false, hint: "" });
      return;
    }

    const updated = normalizeJourney({
      ...journey,
      station: nearest.station,
      direction,
    });
    settingsDraftJourneys[journeyIndex] = updated;

    const nearestHint = formatNearestDistanceHint(nearest);
    await syncJourneyDetailRouteFields(updated, nearestHint);

    if (getTemplateWizardContext()?.templateKey === "custom") {
      updateTemplateRouteCoachState({
        journey: updated,
        nearest,
        configured: Boolean(updated.station && updated.direction),
        error: null,
        routeLoading: false,
      });
    }
  } catch (routeError) {
    if (journeyDetail().getEditingJourneyId?.() !== journeyId) {
      return;
    }
    syncDetailNearestStationChrome({
      loading: false,
      error: true,
      hint: isRateLimitedError(routeError)
        ? routeError.message
        : "Couldn't load directions for nearest station",
    });
    if (getTemplateWizardContext()?.templateKey === "custom") {
      updateTemplateRouteCoachState({
        journey,
        nearest,
        configured: false,
        error: routeError,
        routeLoading: false,
      });
    }
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

  if (journeyDetail().getEditingJourneyId?.() === journeyId) {
    await syncJourneyDetailRouteFields(journey, nearestHint);
    if (routeResult.regionAway) {
      syncDetailNearestStationChrome({
        regionAway: true,
        loading: false,
        error: false,
        hint: "",
      });
    }
  }

  if (showCoach) {
    updateTemplateRouteCoachState({
      journey,
      nearest: routeResult.nearest,
      configured: routeResult.configured,
      error: routeResult.error,
      regionAway: Boolean(routeResult.regionAway),
      routeLoading: false,
    });
  }
}

async function createJourneyFromPresetTemplate(templateKey) {
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
    cityId: planningCityId(),
  });
  settingsDraftJourneys.push(journey);

  await openJourneyDetail(journey.id, { skipAutoRoute: true });
  await completeTemplateRouteSetup(journey.id, templateKey);
}


function countConfiguredJourneys(journeys) {
  return journeys.filter((journey) => !isUnconfiguredJourney(journey)).length;
}

function countConfiguredJourneyKind(journeys) {
  return journeys.filter(
    (journey) => !isUnconfiguredJourney(journey) && isJourneyKind(journey)
  ).length;
}

function isAtJourneyCap(journeys = settingsDraftJourneys) {
  return countConfiguredJourneyKind(journeys) >= MAX_JOURNEYS;
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

  if (countConfiguredJourneyKind(draftConfigured) > MAX_JOURNEYS) {
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
  journeyDetail().clearEditingState?.();
  showSettingsListView();

  if (journeysDialog?.open) {
    journeysDialog.close();
    journeysDialog.removeAttribute("open");
  }

  clearManualJourneyOverride();
  renderJourneySwitcher();
  if (!hasConfiguredForActiveTab()) {
    renderTravelTabEmptyState();
  } else {
    void applyJourneysMode();
  }
  void window.nextTrainWidget?.syncWidgetSettings?.();
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

function closeJourneysDialog() {
  dismissTemplateRouteCoach();
  journeysTemplatesExpanded = false;

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

  if (isJourneysDialogOpen()) {
    closeJourneysSheet();
  }

  if (!hasConfiguredForActiveTab()) {
    renderTravelTabEmptyState();
    return;
  }

  const activeJourney = getActiveJourney();
  if (activeJourney && isJourneyKind(activeJourney)) {
    chromeTravelTab = "journeys";
  } else if (activeJourney && isRouteJourney(activeJourney)) {
    chromeTravelTab = "routes";
  }

  if (chromeTravelTab === "routes") {
    ensureActiveJourneyForTab("routes");
    clearHeroSetupState();
  } else if (chromeTravelTab === "journeys") {
    ensureActiveJourneyForTab("journeys");
    clearHeroSetupState();
  }

  journeyModeActive = true;
  exitNearbyMode();
  syncChromeMode();
  discardStaleJourneyBoard();
  requestJourneyTargetFaceRestore();
  trainNavigation().restoreJourneyTargetPinFace?.(getActiveJourney());
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
  if (!hasConfiguredForActiveTab()) {
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
  window.nextTrainWidget?.refreshNativeWidgetMenuItems?.();
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

function setFeedbackFooterMode(mode) {
  const isForm = mode === "form";
  if (feedbackSendBtn) {
    feedbackSendBtn.hidden = !isForm;
  }
  if (feedbackCancelBtn) {
    feedbackCancelBtn.hidden = !isForm;
  }
  if (feedbackDoneBtn) {
    feedbackDoneBtn.hidden = isForm;
  }
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
  setFeedbackFooterMode("form");
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
    requestAnimationFrame(() => {
      openMenu();
    });
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
    const response = await fetch(feedbackApiUrl(), {
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
      setFeedbackFooterMode("thanks");
      return;
    }

    const mailto = buildFeedbackMailto({
      ...payload,
      to: data?.mailto || "EvansAppStudio@gmail.com",
    });
    if (feedbackStatusEl) {
      feedbackStatusEl.hidden = false;
      feedbackStatusEl.textContent =
        "Could not reach the feedback inbox. Opening email so you can send it yourself.";
    }
    window.location.href = mailto;
  } catch {
    const mailto = buildFeedbackMailto(payload);
    if (feedbackStatusEl) {
      feedbackStatusEl.hidden = false;
      feedbackStatusEl.textContent =
        "Could not reach the feedback inbox. Opening email so you can send it yourself.";
    }
    window.location.href = mailto;
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
  journeyDetail().clearEditingState?.();
  skipTrains = 0;
  lastApiData = null;
  lastRenderedNext = null;
  leaveAutoAckLastAttemptAt = 0;
  leaveAutoAckLastDeparture = null;
  leaveAutoAckLastPosition = null;
  leaveAutoAckInflight = null;
  onboardingShowTimer = null;
  onboardingPopulatedAt = null;

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.nextTrainAppTheme?.applyAppTheme?.(settings.appTheme);
  renderJourneyListView();
  renderJourneySwitcher();
  applyJourneysMode({ coldStart: true });
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
  openTravelLibrary(chromeTravelTab === "journeys" ? "journeys" : "routes");
}

async function startFirstJourneySetup() {
  if (templateCreateInFlight || isAtJourneyCap()) {
    return;
  }

  completeOnboarding();
  chromeTravelTab = "journeys";
  journeyModeActive = true;
  exitNearbyMode();
  syncChromeMode();
  await startJourneyCreateFromTemplate("custom");
}

function openJourneysForSetup() {
  if (!hasJourneyKind()) {
    void startFirstJourneySetup();
    return;
  }

  completeOnboarding();
  chromeTravelTab = "journeys";
  journeyModeActive = true;
  exitNearbyMode();
  syncChromeMode();
  openJourneys();
}

function openMainScreenFromWidget() {
  prepareMainScreenFromDeepLink();

  if (hasJourneyKind()) {
    if (!journeyModeActive || chromeTravelTab !== "journeys") {
      chromeTravelTab = "journeys";
      journeyModeActive = true;
      exitNearbyMode();
    }
    syncChromeMode();
    clearHeroSetupState();
    ensureActiveJourneyForTab("journeys");
    maybeAutoSelectJourney();
    const journey = getActiveJourney();
    if (journey) {
      setManualJourneyOverride(journey.id);
    }
    if (hasPersistedNearbyPin()) {
      reconcileExclusivePinState({ type: "nearby" });
    } else if (journey && isJourneyTargetPinnedToday(journey)) {
      reconcileExclusivePinState({ type: "journey", journeyId: journey.id });
    } else {
      reconcileExclusivePinState();
    }
    requestJourneyTargetFaceRestore();
    trainNavigation().restoreJourneyTargetPinFace?.(journey);
    renderJourneySwitcher();
    fetchNextTrain();
    return;
  }

  if (hasConfiguredRoute()) {
    if (!journeyModeActive || chromeTravelTab !== "routes") {
      chromeTravelTab = "routes";
      journeyModeActive = true;
      exitNearbyMode();
    }
    syncChromeMode();
    clearHeroSetupState();
    ensureActiveJourneyForTab("routes");
    const journey = getActiveJourney();
    if (journey) {
      setManualJourneyOverride(journey.id);
    }
    skipTrains = readSkipState().count;
    renderJourneySwitcher();
    fetchNextTrain();
    return;
  }

  void enterNearbyMode();
}


routesBtn?.addEventListener("click", () => enterRouteMode());
journeysBtn?.addEventListener("click", () => enterJourneyMode());
journeyEditBtn?.addEventListener("click", () => {
  if (chromeTravelTab === "routes") {
    openRoutesLibrary();
    return;
  }
  if (chromeTravelTab === "journeys") {
    openJourneysLibrary();
    return;
  }
  openJourneys();
});
if (journeyContextRowEl && typeof ResizeObserver !== "undefined") {
  const journeyContextLayoutObserver = new ResizeObserver(() => syncJourneyContextEditOffset());
  journeyContextLayoutObserver.observe(journeyContextRowEl);
  if (journeyContextNameEl) {
    journeyContextLayoutObserver.observe(journeyContextNameEl);
  }
  if (journeySwitcherEl) {
    journeyContextLayoutObserver.observe(journeySwitcherEl);
  }
  if (routeEl) {
    journeyContextLayoutObserver.observe(routeEl);
  }
}
menuBtn?.addEventListener("click", () => openMenu());
menuFeedbackBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  feedbackOpenedFromMenu = true;
  closeMenuDialog();
  void openFeedbackDialog();
});
feedbackForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.submitter?.id === "feedback-cancel-btn") {
    closeFeedbackDialog();
    return;
  }
  void submitFeedback(event);
});
feedbackDialog?.addEventListener("click", (event) => {
  const button = event.target.closest?.("#feedback-cancel-btn, #feedback-done-btn");
  if (!button) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  closeFeedbackDialog();
});
feedbackDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeFeedbackDialog();
});
menuHelpBtn?.addEventListener("click", () => {
  helpOpenedFromMenu = true;
  closeMenuDialog();
  void window.nextTrainWidget?.refreshWidgetDebugPanel?.();
  openAppDialog(helpDialog);
});
helpDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeHelpDialog();
});
helpCloseBtn?.addEventListener("click", () => {
  closeHelpDialog();
});
helpDialog?.addEventListener("click", (event) => {
  if (event.target === helpDialog) {
    closeHelpDialog();
  }
});
leaveAckBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  const ackContext = getLeaveAckContext();
  const next = getLeaveAckTarget();
  if (next) {
    void acknowledgeLeave(next, { ackContext });
  }
});
leaveAlarmOkBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  void handleLeaveAlarmOk();
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

async function startJourneyCreateFromTemplate(templateKey) {
  if (templateCreateInFlight || isAtJourneyCap()) {
    return;
  }

  templateCreateInFlight = true;
  setJourneyTemplateLoading(true);
  openJourneysDialogSync();

  try {
    await createJourneyFromTemplate(templateKey);
  } catch (error) {
    console.warn("Could not create journey from template", error);
  } finally {
    templateCreateInFlight = false;
    setJourneyTemplateLoading(false);
  }
}

journeySaveRouteBtnEl?.addEventListener("click", async () => {
  if (templateCreateInFlight) {
    return;
  }

  templateCreateInFlight = true;
  setJourneyTemplateLoading(true);
  journeyDetail()?.setLibraryKind?.("routes");
  openJourneysDialogSync();

  try {
    await createJourneyFromRoute();
  } catch (error) {
    console.warn("Could not create route journey", error);
  } finally {
    templateCreateInFlight = false;
    setJourneyTemplateLoading(false);
  }
});

journeySetupBtnEl?.addEventListener("click", async () => {
  if (templateCreateInFlight || isAtJourneyCap()) {
    return;
  }

  templateCreateInFlight = true;
  setJourneyTemplateLoading(true);
  journeyDetail()?.setLibraryKind?.("journeys");
  openJourneysDialogSync();
  try {
    await createJourneyFromTemplate("custom");
  } catch (error) {
    console.warn("Could not create custom journey", error);
  } finally {
    templateCreateInFlight = false;
    setJourneyTemplateLoading(false);
  }
});

document.querySelectorAll(".journey-template-chip").forEach((button) => {
  button.addEventListener("click", async () => {
    await startJourneyCreateFromTemplate(button.dataset.template);
  });
});

heroEmptyAddBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (chromeTravelTab === "routes") {
    void createJourneyFromRoute().catch((error) => {
      console.warn("Could not create route journey", error);
    });
    return;
  }
  void createJourneyFromTemplate("custom").catch((error) => {
    console.warn("Could not create custom journey", error);
  });
});

onboardingGotItBtn?.addEventListener("click", (event) => {
  window.dismissNearMeOnboarding(event);
});
onboardingGotItBtn?.addEventListener("pointerup", (event) => {
  window.dismissNearMeOnboarding(event);
});
document.addEventListener(
  "click",
  (event) => {
    if (event.target.closest("#onboarding-got-it-btn")) {
      window.dismissNearMeOnboarding(event);
    }
  },
  true
);

onboardingRoutesGotItBtn?.addEventListener("click", () => {
  clearOnboardingSchedule();
  showOnboardingStep3();
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

function getDeleteJourneyDialogCopy(journey) {
  const isRoute = isRouteJourney(journey);
  const soleConfigured =
    !isUnconfiguredJourney(journey) && countConfiguredJourneys(settingsDraftJourneys) === 1;
  const title = isRoute ? "Delete Route?" : "Delete Journey?";
  let body = isRoute
    ? "Are you sure you want to delete this route? This action cannot be undone."
    : "Are you sure you want to delete this journey? This action cannot be undone.";
  if (soleConfigured) {
    body += " This is your only saved journey.";
  }
  return { title, body };
}

function openDeleteJourneyDialog(journey) {
  if (!deleteJourneyDialog || !journey) {
    return;
  }

  const { title, body } = getDeleteJourneyDialogCopy(journey);
  if (deleteJourneyDialogTitle) {
    deleteJourneyDialogTitle.textContent = title;
  }
  if (deleteJourneyDialogBody) {
    deleteJourneyDialogBody.textContent = body;
  }
  pendingDeleteJourneyId = journey.id;
  openAppDialog(deleteJourneyDialog);
}

function closeDeleteJourneyDialog() {
  pendingDeleteJourneyId = null;
  closeAppDialog(deleteJourneyDialog);
}

function performDeleteJourney(journeyId) {
  if (!journeyId) {
    return;
  }

  settingsDraftJourneys = settingsDraftJourneys.filter((journey) => journey.id !== journeyId);
  journeyDetail().clearEditingState?.();

  const hasConfiguredJourneysLeft = countConfiguredJourneys(settingsDraftJourneys) > 0;
  saveJourneyListToSettings({ allowEmpty: true });
  renderJourneyListView();

  if (!hasConfiguredJourneysLeft) {
    finishAfterAllJourneysDeleted();
    return;
  }

  showSettingsListView();
}

clearAllDataBtn?.addEventListener("click", handleClearAllData);

deleteJourneyBtn?.addEventListener("click", () => {
  if (!journeyDetail().getEditingJourneyId?.()) {
    return;
  }

  const editing = settingsDraftJourneys.find((journey) => journey.id === journeyDetail().getEditingJourneyId?.());
  if (!editing || isUnconfiguredJourney(editing)) {
    return;
  }

  openDeleteJourneyDialog(editing);
});

deleteJourneyCancelBtn?.addEventListener("click", () => {
  closeDeleteJourneyDialog();
});

deleteJourneyConfirmBtn?.addEventListener("click", () => {
  const journeyId = pendingDeleteJourneyId;
  closeDeleteJourneyDialog();
  performDeleteJourney(journeyId);
});

deleteJourneyDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeDeleteJourneyDialog();
});

detailLeaveBeforeInput?.addEventListener("input", () => {
  updateLeaveBeforeLabel();
});


preferredHintEl?.addEventListener("click", () => {
  jumpToTargetTrain();
});

detailUseTargetTrainInput?.addEventListener("change", () => {
  syncDetailTargetMasterVisibility({ seedTime: detailUseTargetTrainInput.checked });
  if (detailUseTargetTrainInput.checked) {
    detailPreferredDisplay?.focus?.();
  }
});

detailUseLeaveBeforeInput?.addEventListener("change", () => {
  syncLeaveBeforeControlsState();
  syncDetailTargetRemindVisibility();
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

journeySwitcherEl?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleJourneySwitcherMenu();
});

journeySwitcherMenuEl?.addEventListener("click", (event) => {
  event.stopPropagation();
});

document.addEventListener("nexttrain:city-changed", (event) => {
  stationCoords = null;
  nearbyCoordsCache.clear();
  nearbyStationNamesCache.clear();
  window.nextTrainStationCombobox?.invalidateStationPickerCaches?.();
  void getStationsList();
  window.NextTrainCitySession?.syncFeedAttribution?.(event.detail?.city || planningCityId());
  if (isNearbyModeActive()) {
    void nearbyMode().refreshNearbyAfterRegionChange?.();
  }
});

let isInitializing = false;
/** Reset+station persist already wrote URL settings this load; don't persist them again. */
let urlSettingsAppliedDuringReset = false;

async function init() {
  if (isInitializing) {
    return;
  }
  isInitializing = true;
  urlSettingsAppliedDuringReset = false;

  if (isNativeApp()) {
    document.body.classList.add("native-app");
    dogfoodOriginCache = await readDogfoodOrigin();
  }

  localStorage.removeItem("nextTrainAdsLoaded");

  const seedApplied = await applyMaestroTestSeedFromDeepLink();
  if (!seedApplied) {
    await applyTestQueryParams();
  }

  settings = readStoredSettings();

  await window.NextTrainCitySession?.init?.();
  stationCoords = null;

  installOnboardingInteractionTracking();
  dismissStaleBlockingLayers();

  if (seedApplied) {
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
    console.log("[init] found urlSettings, entering journey mode");
    journeyModeActive = true;
    // Reset already persisted these params. Re-persisting after the catalog
    // await would clobber a journey seed written between `load` and this point.
    if (!urlSettingsAppliedDuringReset) {
      persistSettings(urlSettings);
    }
    settings = readStoredSettings();
  } else {
    refreshSeconds = settings.refreshSeconds ?? DEFAULT_SETTINGS.refreshSeconds;
  }

  scheduleRefresh();

  initNearbyModeFromModule();

  try {
    await mountNearbyMode();
  } catch (error) {
    console.warn("Nearby mount failed", error);
  }

  if (isNativeApp()) {
    void ensureGeoBridge().catch(() => {});
  }

  // First paint: GPS + nearest + one board. Full catalogs can wait until the first paint is done
  // or until the user opens a picker.
  setTimeout(() => {
    void getStationsList();
    void loadStationCoords();
  }, 100);

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

  // Do not paint Near me over a widget tap. Peek first (does not consume), then apply
  // the deep link after the default screen so a slow bridge cannot be overwritten.
  let skipNearbyDefault = false;
  try {
    const launchUri = await window.nextTrainWidget?.peekLaunchDeepLink?.();
    skipNearbyDefault = Boolean(
      window.nextTrainWidget?.launchDeepLinkOpensSpecificScreen?.(launchUri)
    );
  } catch (error) {
    console.warn("Could not peek widget launch deep link", error);
  }
  await applyJourneysMode({ coldStart: true, skipNearbyDefault });
  await window.nextTrainWidget?.consumeLaunchDeepLink?.();
  window.nextTrainWidget?.syncWidgetSettings?.(settings);
  if (isNativeApp()) {
    void maybeSyncLeaveAlarmFromNative();
  }
  scheduleRegionMismatchPrompt();
}


function getDetailStationCombobox() {
  return window.nextTrainStationCombobox?.getDetailCombobox?.() ?? null;
}

function getNearbyStationCombobox() {
  return window.nextTrainStationCombobox?.getNearbyCombobox?.() ?? null;
}

function getStationsList() {
  return window.nextTrainStationCombobox.getStationsList();
}

function fetchLocalJson(path, timeoutMs) {
  return window.nextTrainStationCombobox.fetchLocalJson(path, timeoutMs);
}

function replaceSelectOptions(selectEl, options) {
  return window.nextTrainStationCombobox.replaceSelectOptions(selectEl, options);
}

function setStationComboboxValue(combobox, station) {
  return window.nextTrainStationCombobox.setStationComboboxValue(combobox, station);
}

function initStationComboboxesFromModule() {
  window.nextTrainStationCombobox?.init?.({
    collapseStationList,
    formatStationLabel,
    detailStationComboboxRoot,
    nearbyStationComboboxRoot,
    detailDirectionSelect,
    loadDirectionsForSelect,
    syncDetailNearestStationChrome,
    getDetailNearestState: () => journeyDetail()?.getDetailNearestState?.(),
    isNearbyModeActive,
    applyNearbyManualStation,
    getNearbyStationsList,
  });
}

const journeyModel = () => window.nextTrainJourneyModel;

function createJourneyId() { return journeyModel().createJourneyId(); }
function createDefaultJourney(overrides = {}) { return journeyModel().createDefaultJourney(overrides); }
function createDefaultStore() { return journeyModel().createDefaultStore(); }
function isUnconfiguredJourney(journey) { return journeyModel().isUnconfiguredJourney(journey); }
function resolveInitialJourneys(rawJourneys = []) { return journeyModel().resolveInitialJourneys(rawJourneys); }
function normalizeJourneyList(rawJourneys = []) { return journeyModel().normalizeJourneyList(rawJourneys); }
function isLegacyTemplateJourneyName(name) { return journeyModel().isLegacyTemplateJourneyName(name); }
function nextAvailableJourneyName(journeys, options) {
  return journeyModel().nextAvailableJourneyName(journeys, options);
}
function findJourneyNameConflict(name, journeys, excludeId) {
  return journeyModel().findJourneyNameConflict(name, journeys, excludeId);
}
function isLegacyBlankDefaultWindow(a, b) { return journeyModel().isLegacyBlankDefaultWindow(a, b); }
function normalizeRemindDays(raw) { return journeyModel().normalizeRemindDays(raw); }
function getJourneyRemindDays(journey) { return journeyModel().getJourneyRemindDays(journey); }
function formatJourneyActiveDays(journey) { return journeyModel().formatJourneyActiveDays(journey); }
function journeyMatchesActiveDay(journey, day) { return journeyModel().journeyMatchesActiveDay(journey, day); }
function journeyMatchesSchedule(journey, minutes, day) {
  const resolvedMinutes = minutes === undefined ? getPerthMinutesSinceMidnight() : minutes;
  const resolvedDay = day === undefined ? getPerthDayOfWeekIso() : day;
  return journeyModel().journeyMatchesSchedule(journey, resolvedMinutes, resolvedDay);
}
function journeyRemindMeEnabled(raw) { return journeyModel().journeyRemindMeEnabled(raw); }
function inferTemplateKey(raw) { return journeyModel().inferTemplateKey(raw); }
function isJourneyKind(journey) { return journeyModel().isJourneyKind(journey); }
function isRouteJourney(journey) { return journeyModel().isRouteJourney(journey); }
function normalizeJourney(raw) { return journeyModel().normalizeJourney(raw); }
function legToJourney(leg, name, from, until) { return journeyModel().legToJourney(leg, name, from, until); }
function pickNearbySettingsFields(raw) { return journeyModel().pickNearbySettingsFields(raw); }
function migrateSettings(raw) { return journeyModel().migrateSettings(raw); }
function getConfiguredJourneys() { return journeyModel().getConfiguredJourneys(); }
function getJourneyById(id) { return journeyModel().getJourneyById(id); }
function getActiveJourney() { return journeyModel().getActiveJourney(); }
function readStoredSettings() { return journeyModel().readStoredSettings(); }
function persistSettings(next) { return journeyModel().persistSettings(next); }
function pad2(value) { return journeyModel().pad2(value); }
function getPerthDateParts(date) { return journeyModel().getPerthDateParts(date); }
function getPerthMinutesSinceMidnight(date) {
  const testMinutes = readTestClockMinutesFromUrl();
  if (testMinutes != null) {
    return testMinutes;
  }
  return journeyModel().getPerthMinutesSinceMidnight(date);
}
function readTestDayFromUrl() {
  if (!isTestMode()) {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  const day = params.get("day");
  return day != null ? Number(day) : null;
}

function getPerthDayOfWeekIso(date = new Date()) {
  const testDay = readTestDayFromUrl();
  if (testDay != null) {
    return testDay;
  }
  return journeyModel().getPerthDayOfWeekIso(date);
}
function getPerthLocalDateKey(date) { return journeyModel().getPerthLocalDateKey(date); }
function hasDefaultWindow(journey) { return journeyModel().hasDefaultWindow(journey); }
function parseTimeToMinutes(time) { return journeyModel().parseTimeToMinutes(time); }
function journeyMatchesTime(journey, minutes) { return journeyModel().journeyMatchesTime(journey, minutes); }





const journeyDetail = () => window.nextTrainJourneyDetail;

function readJourneyNameFromForm(station, direction) {
  return journeyDetail().readJourneyNameFromForm?.(station, direction) ?? "";
}
function resetDetailNearestState() { return journeyDetail().resetDetailNearestState(); }
function syncDetailNearestStationChrome(patch) { return journeyDetail().syncDetailNearestStationChrome(patch); }
function setDetailActiveDayChips(days) { return journeyDetail().setDetailActiveDayChips?.(days); }
function syncDetailActiveDaysHint(journey) { return journeyDetail().syncDetailActiveDaysHint?.(journey); }
function isTargetOutsideActiveWindow(a, b, c) { return journeyDetail().isTargetOutsideActiveWindow(a, b, c); }
function syncDetailComboHints(options) { return journeyDetail().syncDetailComboHints(options); }
function readDetailActiveDays() { return journeyDetail().readDetailActiveDays?.() ?? []; }
function normalizeActiveHoursFieldsForSave() { return journeyDetail().normalizeActiveHoursFieldsForSave?.(); }
function clearPairedActiveHourField(side) { return journeyDetail().clearPairedActiveHourField(side); }
function isDetailTargetMasterOn() { return journeyDetail().isDetailTargetMasterOn(); }
function syncDetailTargetMasterVisibility(options) { return journeyDetail().syncDetailTargetMasterVisibility(options); }
function hasDetailTargetTrain() { return journeyDetail().hasDetailTargetTrain(); }
function syncDetailTargetRemindVisibility() { return journeyDetail().syncDetailTargetRemindVisibility(); }
function journeyDefaultWindowsOverlap(left, right) { return journeyDetail().journeyDefaultWindowsOverlap?.(left, right) ?? false; }
function journeyActiveDaysOverlap(left, right) { return journeyDetail().journeyActiveDaysOverlap?.(left, right) ?? false; }
function findJourneyDefaultWindowConflict(journey, journeys) {
  return journeyDetail().findJourneyDefaultWindowConflict?.(journey, journeys) ?? null;
}
function ensureSettingsDraftLoaded() { return journeyDetail().ensureSettingsDraftLoaded(); }
function fetchDirectionsFromApi(station) { return journeyDetail().fetchDirectionsFromApi(station); }
function loadDirectionsForSelect(selectEl, station, preferredDirection) {
  return journeyDetail().loadDirectionsForSelect(selectEl, station, preferredDirection);
}
function openJourneysDialogSync() {
  if (heroEmptyStateEl) {
    heroEmptyStateEl.hidden = true;
  }
  const impl = journeyDetail()?.openJourneysDialogSync;
  if (typeof impl === "function") {
    return impl();
  }
  const dialog = document.getElementById("journeys-dialog");
  if (!dialog || !dialog.hidden) {
    void ensureDeferredModulesReady();
    return;
  }
  pauseOnboardingForOverlay();
  const backdrop = document.getElementById("journeys-dialog-backdrop");
  if (backdrop) {
    backdrop.hidden = false;
  }
  dialog.hidden = false;
  document.body.classList.add("app-dialog-open");
  notifyAdOverlaySuppression();
  void ensureDeferredModulesReady();
}
function syncJourneysDetailChrome() { return journeyDetail().syncJourneysDetailChrome(); }
function syncJourneysDialogSheetMode() { return journeyDetail().syncJourneysDialogSheetMode(); }
function showSettingsListView() { return journeyDetail()?.showSettingsListView?.(); }
function showSettingsDetailView() { return journeyDetail()?.showSettingsDetailView?.(); }
function cancelJourneyDetailEdit() { return journeyDetail()?.cancelJourneyDetailEdit?.(); }
function syncJourneyDetailRouteFields(journey, nearestHint) {
  return journeyDetail().syncJourneyDetailRouteFields(journey, nearestHint);
}
function formatJourneyOverlapError(updated, conflict) {
  return journeyDetail().formatJourneyOverlapError(updated, conflict);
}
function clearJourneyOverlapError() { return journeyDetail().clearJourneyOverlapError(); }
function showJourneyOverlapError(updated, conflict) { return journeyDetail().showJourneyOverlapError(updated, conflict); }
function applyJourneyOverlapFix() { return journeyDetail().applyJourneyOverlapFix(); }
function revertDetailRemindersForDeniedPermission() { return journeyDetail().revertDetailRemindersForDeniedPermission(); }
function highlightDetailReminderSection() { return journeyDetail().highlightDetailReminderSection(); }
function handleDetailRemindToggleChange() { return journeyDetail().handleDetailRemindToggleChange(); }
function populateDetailReminderFields(journey) { return journeyDetail().populateDetailReminderFields(journey); }
function readJourneyDetailDraft() { return journeyDetail().readJourneyDetailDraft(); }
function updateJourneyTemplatesVisibility() { return journeyDetail().updateJourneyTemplatesVisibility(); }
function renderJourneyListView() { return journeyDetail().renderJourneyListView(); }
function populateJourneyListView() {
  const impl = journeyDetail()?.populateJourneyListView;
  if (typeof impl === "function") {
    return impl();
  }
  return ensureDeferredModulesReady().then(() => journeyDetail()?.populateJourneyListView?.());
}
function populateJourneyDetailForm(journeyId, options) {
  return journeyDetail().populateJourneyDetailForm(journeyId, options);
}
function requireJourneyRouteFromForm() { return journeyDetail().requireJourneyRouteFromForm?.(); }
function saveJourneyDetailFromForm() { return journeyDetail().saveJourneyDetailFromForm(); }
function openJourneyDetail(journeyId, options) {
  return ensureDeferredModulesReady().then(() =>
    journeyDetail().openJourneyDetail(journeyId, options)
  );
}

function initJourneyDetailFromModule() {
  journeyDetail()?.init?.({
    getSettings: () => settings,
    getSettingsDraftJourneys: () => settingsDraftJourneys,
    setSettingsDraftJourneys: (journeys) => {
      settingsDraftJourneys = journeys;
    },
    normalizeJourney,
    normalizeJourneyList,
    isUnconfiguredJourney,
    getJourneyById,
    hasDefaultWindow,
    parseTimeToMinutes,
    formatMinutesAsTime,
    normalizeRemindDays,
    getJourneyRemindDays,
    formatJourneyActiveDays,
    formatJourneyDefaultWindow,
    formatJourneyRoute,
    isJourneyKind,
    isRouteJourney,
    getJourneyTemplatesExpanded: () => journeysTemplatesExpanded,
    formatRouteBasedJourneyName,
    formatStationLabel,
    formatNearestDistanceHint,
    normalizeDirection,
    dedupeDirections,
    getDetailStationCombobox,
    setStationComboboxValue,
    replaceSelectOptions,
    getStationsList,
    fetchJson,
    apiResultError,
    isRateLimitedResult,
    isRateLimitedError,
    apiUrl,
    appendFixtureQuery,
    isTestMode,
    isNativeApp,
    perthStationsHas: (station) => PERTH_STATIONS.has(station),
    getPerthApiStations: () => PERTH_API_STATIONS,
    cityIdForStation,
    pauseOnboardingForOverlay,
    isJourneysDialogOpen,
    notifyAdOverlaySuppression,
    isNearbyModeActive,
    isNearbyFaceReadyForOnboarding,
    hasCompletedOnboarding,
    maybeScheduleOnboarding,
    findNearestStation,
    readPreferenceCity,
    pickDefaultDirection,
    locationErrorFrom,
    isPlanningAwayFromLocation,
    isRegionMismatchError,
    applyDefaultJourneyRoute,
    shouldAutoRouteJourney,
    saveJourneyListToSettings,
    reloadSettingsDraftFromStorage,
    persistSettings,
    readManualJourneyOverride,
    setManualJourneyOverride,
    countConfiguredJourneys,
    countConfiguredJourneyKind,
    getInboundJourney,
    isOutboundJourney,
    markInitialJourneySetup,
    trackProductEvent,
    setOptionalTimeField,
    readOptionalTimeField,
    addMinutesToTimeString,
    updateLeaveBeforeLabel,
    syncLeaveBeforeControlsState,
    isTemplateWizardReminderDemoActive,
    isAtJourneyCap,
    hasJourneyForTemplate,
    getMaxJourneys: () => MAX_JOURNEYS,
    getJourneyCapHint: () => JOURNEY_CAP_HINT,
    findJourneyNameConflict,
    closeJourneysDialog,
  });
  journeyDetail()?.initJourneyDetailListeners?.();
}

const templateWizard = () => window.nextTrainTemplateWizard;

function showTemplateRouteCoach(options) {
  void ensureDeferredModulesReady().then(() => templateWizard()?.showTemplateRouteCoach?.(options));
}
function dismissTemplateRouteCoach() { return templateWizard()?.dismissTemplateRouteCoach?.(); }
function updateTemplateRouteCoachState(patch) { return templateWizard()?.updateTemplateRouteCoachState?.(patch); }
function shouldShowTemplateRouteCoach() { return templateWizard()?.shouldShowTemplateRouteCoach?.() ?? false; }
function hasSkippedTemplateWizard() { return templateWizard()?.hasSkippedTemplateWizard?.() ?? false; }
function hasSeenTemplateWizard() { return templateWizard()?.hasSeenTemplateWizard?.() ?? false; }
function getTemplateWizardContext() { return templateWizard()?.getTemplateWizardContext?.() ?? null; }
function isTemplateWizardReminderDemoActive() {
  return templateWizard()?.isTemplateWizardReminderDemoActive?.() ?? false;
}
function isTemplateWizardActive() { return templateWizard()?.isTemplateWizardActive?.() || false; }

function initDeferredAppModules() {
  initJourneyDetailFromModule();
  initTemplateWizardFromModule();
}

let deferredModulesReadyPromise = null;
let deferredModulesInitialized = false;

function ensureDeferredModulesReady() {
  if (deferredModulesInitialized) {
    return Promise.resolve();
  }
  if (window.nextTrainJourneyDetail && window.nextTrainTemplateWizard) {
    initDeferredAppModules();
    deferredModulesInitialized = true;
    return Promise.resolve();
  }
  if (!deferredModulesReadyPromise) {
    deferredModulesReadyPromise = Promise.resolve()
      .then(() => window.NextTrainDeferred?.load?.())
      .then(() => window.NextTrainDeferred?.whenReady?.())
      .then(() => {
        initDeferredAppModules();
        deferredModulesInitialized = true;
      });
  }
  return deferredModulesReadyPromise;
}

function initTemplateWizardFromModule() {
  templateWizard()?.init?.({
    formatJourneyDefaultWindow,
    formatStationLabel,
    normalizeStation,
    getConfiguredJourneys,
    isPerthCatalogStation: (station) => {
      const normalized = normalizeStation(station);
      return PERTH_STATIONS.has(normalized) || PERTH_STATIONS.has(station);
    },
    openJourneysDialogSync,
    showSettingsDetailView,
    isDetailTargetMasterOn,
    syncDetailTargetMasterVisibility,
    syncDetailTargetRemindVisibility,
    revertDetailRemindersForDeniedPermission,
    detailJourneyNameField,
    detailRouteSection,
    detailRouteCore,
    detailJourneyWindow,
    detailTargetMaster,
    detailPreferredSection,
    detailPreferredField,
    detailRemindControls,
    detailReminderSection,
    leaveBeforeField,
    detailRemindMeInput,
    detailUseTargetTrainInput,
    journeysDialog,
  });
  templateWizard()?.initTemplateWizardListeners?.();
}

const nearbyMode = () => window.nextTrainNearby;

function classifyNearbyError(message) { return nearbyMode().classifyNearbyError(message); }
function setNearbyError(message, kind) { return nearbyMode().setNearbyError(message, kind); }
function clearNearbyError() { return nearbyMode().clearNearbyError(); }
function getNearbyLeaveBeforeMinutes() { return nearbyMode().getNearbyLeaveBeforeMinutes(); }
function updateNearbyLeaveBeforeLabel(minutes) { return nearbyMode().updateNearbyLeaveBeforeLabel(minutes); }
function syncNearbyLeaveBeforeSliderFill(minutes) { return nearbyMode().syncNearbyLeaveBeforeSliderFill(minutes); }
function rescheduleNearbyPinReminders() { return nearbyMode().rescheduleNearbyPinReminders(); }
function dismissNearbyPinLeaveCard() { return nearbyMode().dismissNearbyPinLeaveCard(); }
function clearNearbyPinLeaveCardDismissed() { return nearbyMode().clearNearbyPinLeaveCardDismissed(); }
function isUnsupportedRegion(distanceKm) { return nearbyMode().isUnsupportedRegion(distanceKm); }
function renderUnsupportedRegionBoard() { return nearbyMode().renderUnsupportedRegionBoard(); }
/**
 * CAPACITOR-T: never unwrap nextTrainNearby bare — if the Near me module failed to
 * load or was cleared, reading `.isNearbyModeActive` throws TypeError. Fallback
 * matches nearby-mode.js (`!journeyModeActive`).
 */
function isNearbyModeActive() {
  return nearbyMode()?.isNearbyModeActive?.() ?? !journeyModeActive;
}
function syncChromeMode() { return nearbyMode().syncChromeMode(); }
function syncNearbyChrome() { return nearbyMode().syncNearbyChrome(); }
function formatNearbyRouteLine() { return nearbyMode().formatNearbyRouteLine(); }
function getNearbySkip(direction) { return nearbyMode().getNearbySkip(direction); }
function setNearbySkip(direction, skip) { return nearbyMode().setNearbySkip(direction, skip); }
function getNearbyPin() { return nearbyMode().getNearbyPin(); }
function clearNearbyPin() { return nearbyMode().clearNearbyPin(); }
function syncNearbyPinSettings() { return nearbyMode().syncNearbyPinSettings(); }
function isNearbyPinHolding(pin) { return nearbyMode().isNearbyPinHolding(pin); }
function isNearbyPinShowing(direction) { return nearbyMode().isNearbyPinShowing(direction); }
function setNearbyPinFromTrip(direction, trip) { return nearbyMode().setNearbyPinFromTrip(direction, trip); }
function applyNearbySkip(data, skip) { return nearbyMode().applyNearbySkip(data, skip); }
function getNearbyFocusedEntry() { return nearbyMode().getNearbyFocusedEntry(); }
function renderNearbyBoard(options) { return nearbyMode().renderNearbyBoard(options); }
function fetchNearbyBoard() { return nearbyMode().fetchNearbyBoard(); }
function enterNearbyMode(options) { return nearbyMode().enterNearbyMode(options); }
function exitNearbyMode() { return nearbyMode().exitNearbyMode(); }
function applyNearbyManualStation(station) { return nearbyMode().applyNearbyManualStation(station); }
function handleNearbyNotifyToggle() { return nearbyMode().handleNearbyNotifyToggle(); }
function setNearbyPinNotifyMe(notifyOn) { return nearbyMode().setNearbyPinNotifyMe(notifyOn); }
function shouldShowNearbyLoadingState() { return nearbyMode().shouldShowNearbyLoadingState(); }
function hideNearbyPinLeaveSurfaces() { return nearbyMode().hideNearbyPinLeaveSurfaces(); }
function readLastNearbyStationCache() { return nearbyMode().readLastNearbyStationCache(); }
function writeLastNearbyStationCache(cache) { return nearbyMode().writeLastNearbyStationCache(cache); }
function clearLastNearbyStationCache() { return nearbyMode().clearLastNearbyStationCache(); }

function initNearbyModeFromModule() {
  nearbyMode()?.init?.({
    getSettings: () => settings,
    getJourneyModeActive: () => journeyModeActive,
    setJourneyModeActive: (value) => {
      journeyModeActive = value;
      if (!value) {
        chromeTravelTab = "nearby";
      }
    },
    getChromeTravelTab,
    setChromeTravelTab,
    getLastRenderedNext: () => lastRenderedNext,
    setLastRenderedNext: (value) => {
      lastRenderedNext = value;
    },
    persistSettings,
    formatStationLabel,
    normalizeStation,
    isCatalogStation,
    isStationInActiveCity,
    isStationInNearbyCity,
    readActiveCity,
    readPreferenceCity,
    readNearbyCity,
    getStationsList,
    getNearbyStationsList,
    ensureNearbyCatalog: async (cityId) => {
      const id = String(cityId || "perth").trim().toLowerCase();
      nearbyCityHint = id;
      await Promise.all([loadStationCoordsForCity(id), loadNearbyStationNames(id)]);
    },
    getNearbyStationCombobox,
    setStationComboboxValue,
    isNativeApp,
    ensureGeoBridge,
    locationErrorFrom,
    isTestMode,
    fetchDirectionsFromApi,
    normalizeApiTrainData,
    resolveTripDeparture,
    getLiveTiming,
    formatLeaveBeforeLabel,
    formatLeaveCardLabel,
    formatLeaveCardSubline,
    formatLeaveCardTargetSubline,
    isLeavePhasePastLeaveBy,
    updateLeaveCardState,
    renderLeaveMinutesCountdown,
    buildNextFromFollowing,
    getHeroDepartLabel,
    renderUpcomingDepartureBoard,
    hideUpcomingDepartureBoard,
    formatScheduledLine,
    formatHeroScheduledLine,
    renderStatusDisplay,
    renderDepartureCountdown,
    setRouteDisplay,
    setHeroUrgency,
    clearHeroSetupState,
    updateSwipeHint,
    updateSwipeCues,
    updateLeaveHint,
    maybeScheduleOnboarding,
    apiUrl,
    appendFixtureQuery,
    fetchJson,
    apiResultError,
    isRateLimitedResult,
    isRateLimitedError,
    enrichTrip,
    findNearestStation,
    getGeolocationPosition,
    getAppGeolocationPosition,
    distanceKm,
    isLeaveAcknowledged,
    maybeSyncLeaveAckFromNative,
    syncLeaveAckFromNative,
    maybeSyncLeaveAlarmFromNative,
    syncLeaveAlarmFromNative,
    shouldAutoAckLeavePhase,
    maybeAutoAcknowledgeLeave,
    enterRouteMode,
    enterJourneyMode,
    clearManualJourneyOverride,
    dismissLeaveHint,
    closeJourneySwitcherMenu,
    clearOnboardingSchedule,
    reconcileExclusivePinState,
    isJourneyModeActive,
    getActiveJourney,
    isRouteJourney,
    isRoutePinnedToday,
    getRoutePinnedLeaveBeforeMinutes,
    persistRoutePinSettings,
    renderCurrentJourney: () => {
      if (lastApiData && !isActiveTravelTabEmpty()) {
        render(prepareDisplayData(lastApiData));
      }
    },
    syncHeroPinChrome,
    syncJourneyContextChrome,
    syncNearbyPinChrome,
    isNearbyPinSettingsHolding: (pin) => {
      if (!pin?.departureIso) {
        return false;
      }
      const departureMs = Date.parse(pin.departureIso);
      if (!Number.isFinite(departureMs)) {
        return false;
      }
      const holdUntil =
        typeof pin.holdingUntilMs === "number"
          ? pin.holdingUntilMs
          : departureMs + NEARBY_PIN_HOLD_MS;
      return Date.now() < holdUntil;
    },
    errorEl,
    heroEl,
    heroDepartLabelEl,
    departCountdownEl,
    departDisplayTimeEl,
    heroScheduledTimeEl,
    leaveCardEl,
    leaveCardLabelEl,
    leaveTimeEl,
    leaveCountdownEl,
    leaveCardActionsEl,
    leaveBufferEditBtn,
    platformEl,
    statusEl,
    followingSectionEl,
    updatedEl,
    journeySwitcherEl,
    journeySwitcherMenuEl,
    appEl,
    routesBtn,
    journeysBtn,
    routesChromeAction,
    journeysChromeAction,
  });
  nearbyMode()?.initNearbyListeners?.();
}

async function mountNearbyMode() {
  return nearbyMode()?.mount?.({
    appEl,
    settings,
    journeyModeActive,
    chromeTravelTab,
    lastRenderedNext,
    errorEl,
    heroEl,
    heroDepartLabelEl,
    departCountdownEl,
    departDisplayTimeEl,
    heroScheduledTimeEl,
    leaveCardEl,
    leaveCardLabelEl,
    leaveTimeEl,
    leaveCountdownEl,
    leaveCardActionsEl,
    leaveBufferEditBtn,
    platformEl,
    statusEl,
    followingSectionEl,
    updatedEl,
    attributionEl,
  });
}

const trainNavigation = () => window.nextTrainNavigation;

function skipStorageKey() { return trainNavigation().skipStorageKey(); }
function readSkipState() { return trainNavigation().readSkipState(); }
function saveSkipState(count, skippedUntil, skippedToDeparture) {
  return trainNavigation().saveSkipState(count, skippedUntil, skippedToDeparture);
}
function clearSkipState() { return trainNavigation().clearSkipState(); }
function saveSkipStateForTrip(data, trip) { return trainNavigation().saveSkipStateForTrip(data, trip); }
function getUpcomingTrips(data) { return trainNavigation().getUpcomingTrips(data); }
function getHeroDepartLabel(options) { return trainNavigation().getHeroDepartLabel(options); }
function getNextThenTrain(data, skipCount) { return trainNavigation().getNextThenTrain(data, skipCount); }
function reconcileSkipWithApi(data) { return trainNavigation().reconcileSkipWithApi(data); }
function getSkippedEarlierTrain(data) { return trainNavigation().getSkippedEarlierTrain(data); }
function prepareDisplayData(data) { return trainNavigation().prepareDisplayData(data); }
function preferredMinutesForLiveGlance(journey) { return trainNavigation().preferredMinutesForLiveGlance(journey); }
function liveHorizonMinutes(journey) { return trainNavigation().liveHorizonMinutes(journey); }
function tripMatchesPreferredOrLater(trip, preferredMinutes, horizonMinutes) {
  return trainNavigation().tripMatchesPreferredOrLater(trip, preferredMinutes, horizonMinutes);
}
function leaveByArmedForDisplayedTrip(trip, journey, skipCount) {
  return trainNavigation().leaveByArmedForDisplayedTrip(trip, journey, skipCount);
}
function tripHasDeparted(trip) { return trainNavigation().tripHasDeparted(trip); }
function findTripByDepartureIso(data, departureIso) { return trainNavigation().findTripByDepartureIso(data, departureIso); }
function findTripIndexInUpcoming(data, trip) { return trainNavigation().findTripIndexInUpcoming(data, trip); }
function getTrueNextTrip(data) { return trainNavigation().getTrueNextTrip(data); }
function isJourneyOverrideActiveToday(journey) { return trainNavigation().isJourneyOverrideActiveToday(journey); }
function isJourneyPinDismissedToday(journey) { return trainNavigation().isJourneyPinDismissedToday(journey); }
function isJourneyTargetPinnedToday(journey) { return trainNavigation().isJourneyTargetPinnedToday(journey); }
function sanitizeJourneyPinOverride(journey) { return trainNavigation().sanitizeJourneyPinOverride(journey); }
function sanitizeJourneyPinDismissed(journey) { return trainNavigation().sanitizeJourneyPinDismissed(journey); }
function sanitizeJourneyPinFields(journey) { return trainNavigation().sanitizeJourneyPinFields(journey); }
function resolveJourneyPreferredTargetTrip(data, journey) {
  return trainNavigation().resolveJourneyPreferredTargetTrip(data, journey);
}
function resolveJourneyPinTrip(data, journey) { return trainNavigation().resolveJourneyPinTrip(data, journey); }
function resolveDepartedJourneyTargetTrip(data, journey) {
  return trainNavigation().resolveDepartedJourneyTargetTrip(data, journey);
}
function persistJourneyPinDismissed(journeyId) { return trainNavigation().persistJourneyPinDismissed(journeyId); }
function clearJourneyPinDismissed(journeyId) { return trainNavigation().clearJourneyPinDismissed(journeyId); }
function journeysDepartureMatch(tripA, tripB) { return trainNavigation().journeysDepartureMatch(tripA, tripB); }
function persistJourneyPinOverride(journeyId, departureIso) {
  return trainNavigation().persistJourneyPinOverride(journeyId, departureIso);
}
function clearJourneyPinOverride(journeyId) { return trainNavigation().clearJourneyPinOverride(journeyId); }
function findPreferredTripSkipIndex(data, journey) { return trainNavigation().findPreferredTripSkipIndex(data, journey); }
function isHeroPinLockingSwipe() { return trainNavigation().isHeroPinLockingSwipe(); }
function canSkipToTargetTrain() { return trainNavigation().canSkipToTargetTrain(); }
function skipToTargetTrain() { return trainNavigation().skipToTargetTrain(); }
function buildNextFromFollowing(following, leaveBeforeMinutes, referenceIso) {
  return trainNavigation().buildNextFromFollowing(following, leaveBeforeMinutes, referenceIso);
}
function slimFollowing(trip) { return trainNavigation().slimFollowing(trip); }
function ensureFullNext(trip, leaveBeforeMinutes, referenceIso) {
  return trainNavigation().ensureFullNext(trip, leaveBeforeMinutes, referenceIso);
}
function applyClientSkip(data) { return trainNavigation().applyClientSkip(data); }
function canSkipToNextTrain() { return trainNavigation().canSkipToNextTrain(); }
function canSkipToEarlierTrain() { return trainNavigation().canSkipToEarlierTrain(); }
function shouldAdvanceLeavePinOnSkip() { return trainNavigation().shouldAdvanceLeavePinOnSkip(); }
function advanceLeavePinToNextTrain() { return trainNavigation().advanceLeavePinToNextTrain(); }
function shouldAdvancePinOnNextTrain() { return trainNavigation().shouldAdvancePinOnNextTrain(); }
function advanceNearbyPinToNextTrain() { return trainNavigation().advanceNearbyPinToNextTrain(); }
function skipToNextTrain() { return trainNavigation().skipToNextTrain(); }
function skipToEarlierTrain() { return trainNavigation().skipToEarlierTrain(); }
function previewUpcomingDepartureAtIndex(tripIndex) {
  return trainNavigation().previewUpcomingDepartureAtIndex(tripIndex);
}
function initHeroSwipe() { return trainNavigation().initHeroSwipe(); }
function jumpToTargetTrain() { return trainNavigation().jumpToTargetTrain(); }
function toggleHeroPin() { return trainNavigation().toggleHeroPin(); }

/**
 * At most one pinned train across Near me, journey, and route.
 * @param {{ type: 'nearby' } | { type: 'journey', journeyId: string }} keep
 */
function hasPersistedNearbyPin() {
  const pin = settings.nearbyPin;
  if (!pin?.departureIso) {
    return false;
  }
  const departureMs = Date.parse(pin.departureIso);
  if (!Number.isFinite(departureMs)) {
    return false;
  }
  const holdUntil =
    typeof pin.holdingUntilMs === "number"
      ? pin.holdingUntilMs
      : departureMs + NEARBY_PIN_HOLD_MS;
  return Date.now() < holdUntil;
}

function findActiveJourneyPinId() {
  for (const journey of settings.journeys) {
    if (isJourneyTargetPinnedToday(journey)) {
      return journey.id;
    }
  }
  return null;
}

function findActiveRoutePinId() {
  for (const journey of settings.journeys) {
    if (isRouteJourney(journey) && isRoutePinnedToday(journey)) {
      return journey.id;
    }
  }
  return null;
}

function findActiveCommuteTargetPinId() {
  const pinned = [];
  for (const journey of settings.journeys) {
    if (isRouteJourney(journey)) {
      continue;
    }
    if (isJourneyTargetPinnedToday(journey)) {
      pinned.push(journey);
    }
  }
  if (!pinned.length) {
    return null;
  }
  const inSchedule = pinned.find((journey) => journeyMatchesSchedule(journey));
  return (inSchedule ?? pinned[0]).id;
}

function countActivePins() {
  let count = hasPersistedNearbyPin() ? 1 : 0;
  if (findActiveRoutePinId()) {
    count += 1;
  }
  if (findActiveCommuteTargetPinId()) {
    count += 1;
  }
  return count;
}

function reconcileExclusivePinState(keep) {
  if (countActivePins() <= 1) {
    return;
  }

  if (keep?.type === "nearby") {
    clearOtherPinnedTrains({ type: "nearby" });
    return;
  }

  if (keep?.type === "journey" && keep.journeyId) {
    clearOtherPinnedTrains({ type: "journey", journeyId: keep.journeyId });
    return;
  }

  if (isNearbyModeActive() && (getNearbyPin() || hasPersistedNearbyPin())) {
    clearOtherPinnedTrains({ type: "nearby" });
    return;
  }

  if (journeyModeActive) {
    if (chromeTravelTab === "routes") {
      const routePinId = findActiveRoutePinId() ?? getActiveJourney()?.id;
      if (routePinId) {
        clearOtherPinnedTrains({ type: "journey", journeyId: routePinId });
      }
      return;
    }

    const keepId = findActiveCommuteTargetPinId() ?? findActiveJourneyPinId() ?? getActiveJourney()?.id;
    if (keepId) {
      clearOtherPinnedTrains({ type: "journey", journeyId: keepId });
    }
  }
}

function clearOtherPinnedTrains(keep) {
  if (keep?.type !== "nearby") {
    clearNearbyPin();
  }

  const today = getPerthLocalDateKey();
  const pinningRoute =
    keep?.type === "journey" &&
    settings.journeys.some(
      (entry) => entry.id === keep.journeyId && isRouteJourney(entry)
    );
  const journeys = settings.journeys.map((journey) => {
    const normalized = normalizeJourney(journey);
    let next = sanitizeJourneyPinDismissed(sanitizeJourneyPinOverride(normalized));
    const isKeptJourney = keep?.type === "journey" && journey.id === keep.journeyId;

    if (isKeptJourney) {
      if (pinningRoute && isRouteJourney(next)) {
        return next;
      }
      if (!pinningRoute && !isRouteJourney(next)) {
        return next;
      }
    }

    if (isJourneyOverrideActiveToday(next)) {
      next = normalizeJourney({
        ...next,
        journeyPinOverrideIso: "",
        journeyPinOverrideDate: "",
      });
    }

    if (!isRouteJourney(next)) {
      const fresh = sanitizeJourneyPinDismissed(sanitizeJourneyPinOverride(next));
      if (isJourneyTargetPinnedToday(fresh)) {
        next = normalizeJourney({
          ...fresh,
          journeyPinDismissedDate: today,
        });
      } else {
        next = fresh;
      }
    }

    return next;
  });

  persistSettings({ journeys });
  rescheduleNearbyPinReminders();
}

function initTrainNavigationFromModule() {
  trainNavigation()?.init?.({
    getSkipTrains: () => skipTrains,
    setSkipTrains: (value) => {
      skipTrains = value;
    },
    getLastApiData: () => lastApiData,
    getLastRenderedNext: () => lastRenderedNext,
    getJourneyModeActive: () => journeyModeActive,
    setJourneyModeActive: (value) => {
      journeyModeActive = value;
    },
    getSettings: () => settings,
    getNearbySession: () => nearbyMode().getNearbySession(),
    getNearbyBoard: () => nearbyMode().getNearbyBoard(),
    getActiveJourney,
    normalizeJourney,
    persistSettings,
    normalizeApiTrainData,
    resolveTripDeparture,
    getLiveTiming,
    getEffectiveLeaveBeforeMinutes,
    journeyUsesLeaveBefore,
    getLeaveTripForActiveJourney,
    journeyMatchesSchedule,
    getPerthMinutesSinceMidnight,
    getPerthDayOfWeekIso,
    parseTimeToMinutes,
    getPerthLocalDateKey,
    minutesUntilPerthWallClock,
    minutesUntilPerthClockMinutes,
    isNearbyModeActive,
    getNearbyFocusedEntry,
    getNearbySkip,
    setNearbySkip,
    getNearbyPin,
    isNearbyPinHolding,
    isNearbyPinShowing,
    setNearbyPinFromTrip,
    syncNearbyPinSettings,
    clearNearbyPin,
    clearOtherPinnedTrains,
    syncActiveJourneyForCurrentTab,
    getChromeTravelTab,
    applyNearbySkip,
    render,
    fetchNextTrain,
    renderNearbyBoard,
    fetchNearbyBoard,
    dismissSwipeHint,
    rescheduleNearbyPinReminders,
    isUnconfiguredJourney,
    isRouteJourney,
    clearRoutePinLeaveCardDismissed: () => nearbyMode().clearRoutePinLeaveCardDismissed?.(),
    errorEl,
    heroEl,
    heroPinBtn,
    syncHeroPinChrome,
  });
  initHeroSwipe();
}

function initJourneyModelFromModule() {
  journeyModel()?.init?.({
    getSettings: () => settings,
    setSettings: (next) => {
      settings = next;
    },
    normalizeStation,
    normalizeDirection,
    JOURNEY_TEMPLATE_PRESETS,
    NEARBY_PIN_HOLD_MS,
    onSettingsPersisted: (nextSettings) => {
      refreshSeconds = nextSettings.refreshSeconds;
      renderJourneySwitcher();
      window.nextTrainWidget?.syncWidgetSettings?.(nextSettings);
      window.nextTrainAppTheme?.applyAppTheme?.(nextSettings.appTheme);
      document.dispatchEvent(new CustomEvent("nexttrain:settings-persisted"));
    },
  });
}

function initPinStateFromModule() {
  window.nextTrainPinState?.init?.({
    getPerthLocalDateKey,
    getPerthMinutesSinceMidnight,
    getPerthDayOfWeekIso,
    parseTimeToMinutes,
    normalizeApiTrainData,
    resolveTripDeparture,
    journeyMatchesSchedule,
    preferredMinutesForLiveGlance: (journey) => trainNavigation().preferredMinutesForLiveGlance(journey),
    liveHorizonMinutes: (journey) => trainNavigation().liveHorizonMinutes(journey),
    isNearbyPinHolding: (pin) => nearbyMode().isNearbyPinHolding(pin),
  });
}

initJourneyModelFromModule();
window.nextTrainAppTheme?.init?.();
initPinStateFromModule();
initStationComboboxesFromModule();
initNearbyModeFromModule();
initTrainNavigationFromModule();
syncLeaveBeforeSliderFill();

if (window.NextTrainDeferred) {
  window.NextTrainDeferred.onReady = () => {
    if (!deferredModulesInitialized) {
      initDeferredAppModules();
      deferredModulesInitialized = true;
    }
  };
  if (window.NextTrainDeferred._ready && !deferredModulesInitialized) {
    initDeferredAppModules();
    deferredModulesInitialized = true;
  }
}

init();

window.nextTrainApp = {
  migrateSettings,
  getSettings,
  getSettingsDraftJourneys,
  getConfiguredJourneys,
  formatJourneyRoute,
  persistReminderJourneys,
  persistRoutePinSettings,
  setNearbyPinNotifyMe,
  isJourneyOverrideActiveToday,
  isNearbyPinSettingsHolding: (pin) => {
    if (!pin?.departureIso) {
      return false;
    }
    const departureMs = Date.parse(pin.departureIso);
    if (!Number.isFinite(departureMs)) {
      return false;
    }
    const holdUntil =
      typeof pin.holdingUntilMs === "number"
        ? pin.holdingUntilMs
        : departureMs + NEARBY_PIN_HOLD_MS;
    return Date.now() < holdUntil;
  },
  getPerthDayOfWeekIso,
  getPerthMinutesSinceMidnight,
  journeyMatchesSchedule,
  findScheduledJourneyId,
  pickScheduledJourney,
  getJourneysMatchingSchedule,
  maybeAutoSelectJourney,
  isRouteJourney,
  renderRouteJourney,
  shouldDefaultToNearby,
  getActiveLegJourney() {
    return getActiveJourney();
  },
  getEffectiveLeaveBeforeMinutes(journey = getActiveJourney()) {
    return getEffectiveLeaveBeforeMinutes(journey);
  },
  refreshDisplay() {
    if (lastApiData && !isActiveTravelTabEmpty()) {
      render(prepareDisplayData(lastApiData));
    }
  },
  enterRouteMode,
  enterJourneyMode,
  enterNearbyMode,
  applyNearbyManualStation,
  isLeaveAcknowledged,
  shouldAutoAckLeavePhase,
  maybeAutoAcknowledgeLeave,
  clearOtherPinnedTrains,
  reconcileExclusivePinState,
  openJourneys,
  openRoutesLibrary,
  openJourneysLibrary,
  openJourneyDetail,
  openAppDialog,
  closeAppDialog,
  hasSkippedTemplateWizard,
  switchJourney,
  fetchNextTrain,
  hasJourneyKind,
  hasConfiguredRoute,
  isAtJourneyCap,
  getChromeTravelTab,
  closeMenuDialogOnly,
  closeJourneysDialog,
  prepareMainScreenFromDeepLink,
  openMainScreenFromWidget,
  clearDetailStation() {
    getDetailStationCombobox()?.setValue?.("", { silent: true });
    if (detailDirectionSelect) {
      detailDirectionSelect.innerHTML = "";
      detailDirectionSelect.value = "";
      detailDirectionSelect.disabled = true;
    }
  },
  isUnsupportedRegion,
  UNSUPPORTED_REGION_KM: nearbyMode().UNSUPPORTED_REGION_KM,
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
  skipToTargetTrain,
  canSkipToTargetTrain,
  findPreferredTripSkipIndex,
  shouldAdvanceLeavePinOnSkip,
  advanceLeavePinToNextTrain,
  shouldAdvancePinOnNextTrain,
  advanceNearbyPinToNextTrain,
  syncLeaveAlarmFromNative,
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
    nearbyMode().pauseNearbyRelocateLoop?.();
    return;
  }

  handleAppForeground();
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    handleAppForeground();
  }
});

function subscribeNativeAppForeground() {
  const App = window.Capacitor?.Plugins?.App;
  if (!App?.addListener || subscribeNativeAppForeground.bound) {
    return;
  }
  subscribeNativeAppForeground.bound = true;
  App.addListener("appStateChange", (state) => {
    if (state?.isActive) {
      handleAppForeground();
    }
  });
}

function handleAppForeground() {
  window.NextTrainGeo?.resetLocationPermissionCache?.();
  dismissStaleBlockingLayers();
  maybeScheduleOnboarding();
  void maybeSyncLeaveAlarmFromNative();
  void syncActiveLeaveAckFromNative().then((synced) => {
    if (!synced) {
      return;
    }
    if (isNearbyModeActive()) {
      renderNearbyBoard();
      return;
    }
    if (lastApiData) {
      render(prepareDisplayData(lastApiData));
    }
  });

  void (async () => {
    if (isJourneysDialogOpen() || isOnboardingVisible() || isAppOverlayOpen()) {
      return;
    }

    if (isNearbyModeActive() && nearbyMode().getNearbySession?.()) {
      nearbyMode().refreshNearbyOnForeground?.();
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

    if (journeyModeActive) {
      skipTrains = readSkipState().count;
      refreshLiveDisplay(true);
      if (!hasConfiguredForActiveTab()) {
        renderTravelTabEmptyState();
      } else {
        fetchNextTrain();
      }
      return;
    }

    if (isNearbyModeActive()) {
      refreshLiveDisplay(true);
      if (nearbyMode().getNearbySession?.()) {
        void nearbyMode()
          .fetchNearbyBoard()
          .then(() => nearbyMode().renderNearbyBoard())
          .catch(() => nearbyMode().renderNearbyBoard({ stale: true }));
      } else {
        void enterNearbyMode();
      }
      return;
    }

    void applyJourneysMode();
  })();
}

subscribeNativeAppForeground();
window.addEventListener("load", subscribeNativeAppForeground);
