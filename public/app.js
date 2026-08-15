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
const heroPinBtn = document.getElementById("hero-pin-btn");
const platformEl = document.getElementById("platform");
const statusEl = document.getElementById("status");
const followingSectionEl = document.getElementById("following-section");
const followingLabelEl = document.getElementById("following-label");
const followingNextEl = document.getElementById("following-next");
const errorEl = document.getElementById("error");

const menuBtn = document.getElementById("menu-btn");
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
const onboardingGotItBtn = document.getElementById("onboarding-got-it-btn");
const onboardingSetupBtn = document.getElementById("onboarding-setup-btn");
const onboardingLaterBtn = document.getElementById("onboarding-later-btn");
const journeysChromeAction = document.getElementById("journeys-chrome-action");
const journeyTemplatesEl = document.getElementById("journey-templates");
const journeyTemplatesLoadingEl = document.getElementById("journey-templates-loading");
const journeyTemplatesCapHintEl = document.getElementById("journey-templates-cap-hint");
const journeyTemplateChipsEl = document.querySelector(".journey-template-chips");
const journeyTemplatesAddHintEl = document.querySelector(".journey-templates-hint");
const detailJourneyNameField = document.querySelector(".journey-name-field");
const detailRouteSection = document.getElementById("detail-route-section");
const detailRouteCore = document.getElementById("detail-route-core");
const detailJourneyWindow = document.getElementById("detail-journey-window");
const heroEmptyStateEl = document.getElementById("hero-empty-state");
const heroEmptyAddBtn = document.getElementById("hero-empty-add-btn");
const heroEmptyBackBtn = document.getElementById("hero-empty-back-btn");
const detailActiveDayChips = document.getElementById("detail-active-day-chips");
const detailActiveDaysHint = document.querySelector(".detail-active-days-hint");
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

let settings = window.nextTrainJourneyModel.createDefaultStore();
let refreshSeconds = DEFAULT_SETTINGS.refreshSeconds;
let skipTrains = 0;
/** Near me: hold a pinned departure until 1 minute after it leaves. */
const NEARBY_PIN_HOLD_MS = 60_000;
const NEARBY_SOFT_LOCATION_MAX_AGE_MS = 2 * 60 * 1000;
let lastResumeRefreshAt = 0;
let lastRenderedNext = null;
let lastApiData = null;
let stationCoords = null;
let refreshTimer = null;
let countdownTimer = null;
let lastLiveDisplayMinute = null;
let settingsDraftJourneys = [];
let journeySwitcherOpen = false;
let leaveAutoCheckDeparture = null;
let journeyModeActive = false;
let deferJourneyAutoSelect = false;
let onboardingShowTimer = null;
let onboardingPopulatedAt = null;
let onboardingNearbyFaceReady = false;
let templateCreateInFlight = false;
let helpOpenedFromMenu = false;

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
    if (!nearbyMode().getNearbySession()) {
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
    step1Text.textContent = nearbyMode().getNearbySession()?.unsupportedRegion
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

  if (journeyDetail().getEditingJourneyId?.() && !settingsDetailView.hidden) {
    const journey =
      settingsDraftJourneys.find((entry) => entry.id === journeyDetail().getEditingJourneyId?.()) ??
      getJourneyById(journeyDetail().getEditingJourneyId?.());
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

function journeyLeaveCardArmed(journey, pinTrip) {
  if (!pinTrip || !journeyUsesLeaveBefore(journey)) {
    return false;
  }

  const journeyClean = sanitizeJourneyPinDismissed(sanitizeJourneyPinOverride(journey));
  if (!isJourneyTargetPinnedToday(journeyClean)) {
    return false;
  }

  // Manual pin (hero) always arms Leave by — same as Near me pin.
  if (isJourneyOverrideActiveToday(journeyClean)) {
    return true;
  }

  // Default target train pin only within today's active window.
  return journeyMatchesSchedule(journeyClean);
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


function addMinutesToTimeString(time, minutesToAdd) {
  if (!time) {
    return "";
  }
  return formatMinutesAsTime(parseTimeToMinutes(time) + minutesToAdd);
}



function formatJourneyDefaultWindow(journey) {
  if (!hasDefaultWindow(journey)) {
    return "Not set";
  }
  return `${journey.defaultFrom}–${journey.defaultUntil}`;
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


function formatFollowingLine(trip) {
  return trip?.displayTime ?? "—";
}

function formatFollowingSecondaryLine(trip) {
  return trip?.displayTime ?? "—";
}


function renderThenTrains(data, skipCount = skipTrains, options = {}) {
  if (!followingSectionEl || !followingNextEl) {
    return;
  }

  const nextTrain = getNextThenTrain(data, skipCount);

  if (!nextTrain) {
    followingSectionEl.hidden = true;
    followingNextEl.textContent = "";
    return;
  }

  followingSectionEl.hidden = false;
  if (followingLabelEl) {
    followingLabelEl.textContent = options.followingLabel ?? "Then";
  }
  followingNextEl.textContent = formatFollowingLine(nextTrain);
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



function renderJourneySecondaryNextLine(trueNextTrip, pinTrip) {
  if (!followingSectionEl || !followingNextEl) {
    return false;
  }

  const trueDeparture = resolveTripDeparture(trueNextTrip);
  const pinDeparture = resolveTripDeparture(pinTrip);
  if (!trueNextTrip || !pinTrip || !trueDeparture || !pinDeparture || trueDeparture === pinDeparture) {
    return false;
  }

  followingSectionEl.hidden = false;
  if (followingLabelEl) {
    followingLabelEl.textContent = "Then";
  }
  followingNextEl.textContent = formatFollowingSecondaryLine(slimFollowing(trueNextTrip));
  return true;
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
  let response;
  let text;
  try {
    response = await fetch(url);
    text = await response.text();
  } catch {
    return {
      ok: false,
      error: "Couldn't reach live times. Check your connection.",
    };
  }
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


function openLeaveBufferSettings() {
  dismissLeaveHint();
  const journey = getActiveJourney();
  if (!journey) {
    enterJourneyMode();
    openJourneys();
    return;
  }

  openJourneyDetail(journey.id).then(() => {
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


function render(data, { stale = false } = {}) {
  lastLiveDisplayMinute = getPerthMinutesSinceMidnight();
  hideNearbyPinLeaveSurfaces();

  const nearbyDirectionsEl = document.getElementById("nearby-directions");
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
    syncHeroPinChrome();
    renderJourneySwitcher();
    return;
  }

  const pinTrip = resolveJourneyPinTrip(lastApiData ?? data, journey);
  const trueNextTrip = getTrueNextTrip(lastApiData ?? data);
  const heroTrip = skipTrains > 0 ? next : pinTrip ?? next;
  lastRenderedNext = heroTrip;
  const leaveTrip = pinTrip ?? next;
  const live = getLiveTiming(leaveTrip);
  const leaveAcknowledged = isLeaveAcknowledged(leaveTrip);
  const leaveArmed = journeyLeaveCardArmed(journey, pinTrip);
  const showLeaveCard = leaveArmed && !leaveAcknowledged;
  const showLateNag = showLeaveCard && (live.leavePhase === "late" || live.leavePhase === "missed");
  const heroShowsPin =
    pinTrip && journeysDepartureMatch(heroTrip, pinTrip) && skipTrains === 0;
  const leaveForDifferentTrain = showLeaveCard && !journeysDepartureMatch(heroTrip, leaveTrip);

  setHeroUrgency("calm");
  if (heroDepartLabelEl) {
    heroDepartLabelEl.textContent = getHeroDepartLabel({
      heroShowsPin,
      skipCount: skipTrains,
    });
  }
  if (departCountdownEl) {
    renderDepartureCountdown(departCountdownEl, heroTrip);
  }
  if (departDisplayTimeEl) {
    departDisplayTimeEl.textContent = heroTrip.displayTime;
  }

  const scheduledLine = formatScheduledLine(heroTrip);
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
    const showJump =
      pinTrip &&
      preferredMinutesForLiveGlance(journey) >= 0 &&
      !journeysDepartureMatch(heroTrip, pinTrip);
    preferredHintEl.hidden = !showJump;
  }

  if (showLeaveCard) {
    if (leaveCardLabelEl) {
      leaveCardLabelEl.textContent = formatLeaveCardLabel(live.leavePhase, {
        forTarget: leaveForDifferentTrain,
      });
    }
    if (leaveTimeEl) {
      renderLeaveMinutesCountdown(leaveTimeEl, leaveTrip);
    }
    if (leaveCountdownEl) {
      leaveCountdownEl.textContent = leaveForDifferentTrain
        ? formatLeaveCardTargetSubline(leaveTrip)
        : formatLeaveCardSubline(leaveTrip);
    }
    updateLeaveCardState(live.leavePhase);
  }

  if (leaveCardActionsEl) {
    leaveCardActionsEl.hidden = !showLateNag;
    leaveCardActionsEl.classList.toggle("leave-card-actions--visible", showLateNag);
  }

  if (showLateNag) {
    maybeAutoAcknowledgeLeave(leaveTrip);
  }

  platformEl.textContent = heroTrip.platform;
  renderStatusDisplay(heroTrip);

  if (!renderJourneySecondaryNextLine(trueNextTrip, pinTrip)) {
    renderThenTrains(lastApiData ?? data);
  }

  updateSwipeHint();
  updateSwipeCues();
  updateLeaveHint();
  syncHeroPinChrome();
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
  if (allowSessionShortcut && !forceFresh && nearbyMode().getNearbySession()?.station) {
    const session = nearbyMode().getNearbySession();
    return {
      station: session.station,
      distanceKm:
        typeof session.distanceKm === "number" ? session.distanceKm : 0,
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


function isJourneyModeActive() {
  return journeyModeActive;
}

function syncHeroPinChrome() {
  const nearbyActive = isNearbyModeActive();
  const pinHolding = isNearbyPinHolding();
  appEl?.classList.toggle("nearby-pin-active", nearbyActive && pinHolding);

  if (heroPinBtn) {
    if (nearbyActive) {
      const showPin =
        Boolean(nearbyMode().getNearbySession()?.station) &&
        !shouldShowNearbyLoadingState() &&
        Boolean(lastRenderedNext);
      heroPinBtn.hidden = !showPin;
      const entry = getNearbyFocusedEntry();
      const pinActive = isNearbyPinShowing(entry?.direction);
      heroPinBtn.classList.toggle("hero-pin-btn--active", pinActive);
      heroPinBtn.setAttribute("aria-pressed", pinActive ? "true" : "false");
      heroPinBtn.setAttribute("aria-label", pinActive ? "Unpin train" : "Pin train");
    } else {
      const journey = getActiveJourney();
      const showJourneyPin =
        journeyModeActive &&
        journey &&
        !isUnconfiguredJourney(journey) &&
        Boolean(lastRenderedNext);
      heroPinBtn.hidden = !showJourneyPin;
      if (showJourneyPin) {
        const pinTrip = resolveJourneyPinTrip(lastApiData, journey);
        const heroShowsPin =
          pinTrip &&
          journeysDepartureMatch(lastRenderedNext, pinTrip) &&
          skipTrains === 0;
        const pinActive =
          isJourneyTargetPinnedToday(journey) && heroShowsPin && skipTrains === 0;
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
    if (nearbyMode().getNearbySession()?.unsupportedRegion) {
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

  syncDetailNearestStationChrome({ loading: true, error: false, hint: "" });

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
  if (!direction) {
    direction = (await pickPerthDirection(nearest.station)) || "";
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
  journeyDetail().clearEditingState?.();
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
  journeyDetail().clearEditingState?.();
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
  if (!journeyDetail().getEditingJourneyId?.()) {
    return;
  }

  const editing = settingsDraftJourneys.find((journey) => journey.id === journeyDetail().getEditingJourneyId?.());
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

  settingsDraftJourneys = settingsDraftJourneys.filter((journey) => journey.id !== journeyDetail().getEditingJourneyId?.());
  journeyDetail().clearEditingState?.();

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


heroPinBtn?.addEventListener(
  "pointerdown",
  (event) => {
    event.preventDefault();
    event.stopPropagation();
  },
  { capture: true }
);

heroPinBtn?.addEventListener(
  "pointerup",
  (event) => {
    event.stopPropagation();
  },
  { capture: true }
);

heroPinBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  void toggleHeroPin();
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
  syncDetailNearestStationChrome({ loading: true, error: false, hint: "" });

  try {
    const { station, distanceKm: km } = await findNearestStation();
    getDetailStationCombobox()?.setValue(station);
    await loadDirectionsForSelect(detailDirectionSelect, station);
    const direction = await pickPerthDirection(station);
    if (direction) {
      detailDirectionSelect.value = direction;
    }
    syncDetailNearestStationChrome({
      loading: false,
      error: false,
      hint: formatNearestDistanceHint({ distanceKm: km }),
    });
  } catch (error) {
    syncDetailNearestStationChrome({
      loading: false,
      error: true,
      hint: locationErrorFrom(error).message,
    });
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

  localStorage.removeItem("nextTrainAdsLoaded");

  const seedApplied = await applyMaestroTestSeedFromDeepLink();
  if (!seedApplied) {
    applyTestQueryParams();
  }

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
    detailNearestState: journeyDetail().getDetailNearestState?.(),
    isNearbyModeActive,
    applyNearbyManualStation,
  });
}

const journeyModel = () => window.nextTrainJourneyModel;

function createJourneyId() { return journeyModel().createJourneyId(); }
function createDefaultJourney(overrides = {}) { return journeyModel().createDefaultJourney(overrides); }
function createDefaultStore() { return journeyModel().createDefaultStore(); }
function isUnconfiguredJourney(journey) { return journeyModel().isUnconfiguredJourney(journey); }
function resolveInitialJourneys(rawJourneys = []) { return journeyModel().resolveInitialJourneys(rawJourneys); }
function normalizeJourneyList(rawJourneys = []) { return journeyModel().normalizeJourneyList(rawJourneys); }
function isDefaultCommuteJourneyName(name) { return journeyModel().isDefaultCommuteJourneyName(name); }
function isLegacyBlankDefaultWindow(a, b) { return journeyModel().isLegacyBlankDefaultWindow(a, b); }
function normalizeRemindDays(raw) { return journeyModel().normalizeRemindDays(raw); }
function getPerthDayOfWeekIso(date) { return journeyModel().getPerthDayOfWeekIso(date); }
function getJourneyRemindDays(journey) { return journeyModel().getJourneyRemindDays(journey); }
function journeyMatchesActiveDay(journey, day) { return journeyModel().journeyMatchesActiveDay(journey, day); }
function journeyMatchesSchedule(journey, minutes, day) { return journeyModel().journeyMatchesSchedule(journey, minutes, day); }
function journeyRemindMeEnabled(raw) { return journeyModel().journeyRemindMeEnabled(raw); }
function inferTemplateKey(raw) { return journeyModel().inferTemplateKey(raw); }
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
function getPerthMinutesSinceMidnight(date) { return journeyModel().getPerthMinutesSinceMidnight(date); }
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
function syncDetailComboHints() { return journeyDetail().syncDetailComboHints(); }
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
function openJourneysDialogSync() { return journeyDetail().openJourneysDialogSync(); }
function syncJourneysDetailChrome() { return journeyDetail().syncJourneysDetailChrome(); }
function syncJourneysDialogSheetMode() { return journeyDetail().syncJourneysDialogSheetMode(); }
function showSettingsListView() { return journeyDetail().showSettingsListView(); }
function showSettingsDetailView() { return journeyDetail().showSettingsDetailView(); }
function cancelJourneyDetailEdit() { return journeyDetail().cancelJourneyDetailEdit(); }
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
function populateJourneyListView() { return journeyDetail().populateJourneyListView(); }
function populateJourneyDetailForm(journeyId, options) {
  return journeyDetail().populateJourneyDetailForm(journeyId, options);
}
function requireJourneyRouteFromForm() { return journeyDetail().requireJourneyRouteFromForm?.(); }
function saveJourneyDetailFromForm() { return journeyDetail().saveJourneyDetailFromForm(); }
function openJourneyDetail(journeyId, options) { return journeyDetail().openJourneyDetail(journeyId, options); }

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
    normalizeRemindDays,
    getJourneyRemindDays,
    formatJourneyDefaultWindow,
    formatJourneyRoute,
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
    apiUrl,
    appendFixtureQuery,
    isTestMode,
    isNativeApp,
    perthStationsHas: (station) => PERTH_STATIONS.has(station),
    getPerthApiStations: () => PERTH_API_STATIONS,
    pauseOnboardingForOverlay,
    isJourneysDialogOpen,
    notifyAdOverlaySuppression,
    isNearbyModeActive,
    isNearbyFaceReadyForOnboarding,
    hasCompletedOnboarding,
    maybeScheduleOnboarding,
    findNearestStation,
    pickPerthDirection,
    locationErrorFrom,
    applyDefaultJourneyRoute,
    shouldAutoRouteJourney,
    saveJourneyListToSettings,
    reloadSettingsDraftFromStorage,
    persistSettings,
    readManualJourneyOverride,
    setManualJourneyOverride,
    countConfiguredJourneys,
    getInboundJourney,
    isOutboundCommuteJourney,
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
    closeJourneysDialog,
  });
  journeyDetail()?.initJourneyDetailListeners?.();
}

const templateWizard = () => window.nextTrainTemplateWizard;

function showTemplateRouteCoach(options) { return templateWizard().showTemplateRouteCoach(options); }
function dismissTemplateRouteCoach() { return templateWizard().dismissTemplateRouteCoach(); }
function updateTemplateRouteCoachState(patch) { return templateWizard().updateTemplateRouteCoachState(patch); }
function shouldShowTemplateRouteCoach() { return templateWizard().shouldShowTemplateRouteCoach(); }
function hasSkippedTemplateWizard() { return templateWizard().hasSkippedTemplateWizard(); }
function hasSeenTemplateWizard() { return templateWizard().hasSeenTemplateWizard(); }
function getTemplateWizardContext() { return templateWizard().getTemplateWizardContext(); }
function isTemplateWizardReminderDemoActive() { return templateWizard().isTemplateWizardReminderDemoActive(); }

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
    detailLeaveRemindersCommuteStripInput,
    detailLeaveRemindersStripWrap,
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
function isNearbyModeActive() { return nearbyMode().isNearbyModeActive(); }
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
    },
    getLastRenderedNext: () => lastRenderedNext,
    setLastRenderedNext: (value) => {
      lastRenderedNext = value;
    },
    persistSettings,
    formatStationLabel,
    normalizeStation,
    isCatalogStation,
    getStationsList,
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
    isLeavePhasePastLeaveBy,
    updateLeaveCardState,
    renderLeaveMinutesCountdown,
    buildNextFromFollowing,
    getHeroDepartLabel,
    getTrueNextTrip,
    renderJourneySecondaryNextLine,
    renderThenTrains,
    formatScheduledLine,
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
    enrichTrip,
    findNearestStation,
    getGeolocationPosition,
    enterJourneyMode,
    clearManualJourneyOverride,
    dismissLeaveHint,
    closeJourneySwitcherMenu,
    clearOnboardingSchedule,
    isJourneyModeActive,
    syncJourneyContextChrome,
    syncNearbyPinChrome,
    isNearbyPinSettingsHolding: (pin) => {
      const holdingUntil = Number(pin?.holdingUntilMs);
      return Number.isFinite(holdingUntil) && Date.now() < holdingUntil;
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
    journeysBtn,
    journeysChromeAction,
  });
  nearbyMode()?.initNearbyListeners?.();
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
function resolveJourneyPreferredTargetTrip(data, journey) {
  return trainNavigation().resolveJourneyPreferredTargetTrip(data, journey);
}
function resolveJourneyPinTrip(data, journey) { return trainNavigation().resolveJourneyPinTrip(data, journey); }
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
function initHeroSwipe() { return trainNavigation().initHeroSwipe(); }
function jumpToTargetTrain() { return trainNavigation().jumpToTargetTrain(); }
function toggleHeroPin() { return trainNavigation().toggleHeroPin(); }

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
    applyNearbySkip,
    render,
    fetchNextTrain,
    renderNearbyBoard,
    fetchNearbyBoard,
    dismissSwipeHint,
    rescheduleNearbyPinReminders,
    isUnconfiguredJourney,
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
      document.dispatchEvent(new CustomEvent("nexttrain:settings-persisted"));
    },
  });
}

initJourneyModelFromModule();
initJourneyDetailFromModule();
initStationComboboxesFromModule();
initTemplateWizardFromModule();
initNearbyModeFromModule();
initTrainNavigationFromModule();
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
