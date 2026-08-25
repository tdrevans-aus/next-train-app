(function (global) {
  const DEFAULT_ACTIVE_DAYS_HINT = "Which days do you travel this journey?";

  let deps = {};

  let directionsRequestId = 0;
  let journeyOverlapState = null;
  let editingJourneyId = null;
  let editingJourneySnapshot = null;

  const detailNearestState = {
    loading: false,
    error: false,
    hint: "",
  };

  const settingsListView = document.getElementById("settings-list-view");
  const settingsDetailView = document.getElementById("settings-detail-view");
  const journeysDetailChrome = document.getElementById("journeys-detail-chrome");
  const journeysDialog = document.getElementById("journeys-dialog");
  const journeysDoneBtn = document.getElementById("journeys-done-btn");
  const journeyListEl = document.getElementById("journey-list");
  const deleteJourneyBtn = document.getElementById("delete-journey-btn");
  const detailJourneyNameInput = document.getElementById("detail-journey-name");
  const detailDirectionSelect = document.getElementById("detail-direction-select");
  const detailLeaveBeforeInput = document.getElementById("detail-leave-before-input");
  const detailUseLeaveBeforeInput = document.getElementById("detail-use-leave-before");
  const detailUseTargetTrainInput = document.getElementById("detail-use-target-train");
  const detailTargetNest = document.getElementById("detail-target-nest");
  const detailTargetMasterHint = document.getElementById("detail-target-master-hint");
  const leaveBeforeField = document.getElementById("leave-before-field");
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
  const journeyTemplatesEl = document.getElementById("journey-templates");
  const journeyTemplatesCapHintEl = document.getElementById("journey-templates-cap-hint");
  const journeyTemplateChipsEl = document.querySelector(".journey-template-chips");
  const journeyTemplatesAddHintEl = document.querySelector(".journey-templates-hint");
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
  const detailLeaveRemindersCommuteStripInput = document.getElementById("leave-reminders-commute-strip");
  const detailPreferredInput = document.getElementById("detail-preferred-input");
  const detailPreferredDisplay = document.getElementById("detail-preferred-display");
  const detailPreferredField = document.getElementById("detail-preferred-field");
  const detailPreferredClear = document.getElementById("detail-preferred-clear");
  const detailJourneyWindow = document.getElementById("detail-journey-window");

  function getSettings() {
    return deps.getSettings?.() ?? {};
  }

  function getSettingsDraftJourneys() {
    return deps.getSettingsDraftJourneys?.() ?? [];
  }

  function setSettingsDraftJourneys(journeys) {
    deps.setSettingsDraftJourneys?.(journeys);
  }

  function normalizeJourney(raw) {
    return deps.normalizeJourney?.(raw) ?? raw;
  }

  function normalizeJourneyList(raw) {
    return deps.normalizeJourneyList?.(raw) ?? raw;
  }

  function isUnconfiguredJourney(journey) {
    return deps.isUnconfiguredJourney?.(journey) ?? false;
  }

  function getJourneyById(id) {
    return deps.getJourneyById?.(id) ?? null;
  }

  function hasDefaultWindow(journey) {
    return deps.hasDefaultWindow?.(journey) ?? false;
  }

  function parseTimeToMinutes(time) {
    return deps.parseTimeToMinutes?.(time) ?? 0;
  }

  function normalizeRemindDays(raw) {
    return deps.normalizeRemindDays?.(raw) ?? [];
  }

  function getJourneyRemindDays(journey) {
    return deps.getJourneyRemindDays?.(journey) ?? [];
  }

  function formatJourneyDefaultWindow(journey) {
    return deps.formatJourneyDefaultWindow?.(journey) ?? "";
  }

  function formatJourneyRoute(journey) {
    return deps.formatJourneyRoute?.(journey) ?? "";
  }

  function formatRouteBasedJourneyName(station, direction) {
    return deps.formatRouteBasedJourneyName?.(station, direction) ?? "";
  }

  function formatStationLabel(name) {
    return deps.formatStationLabel?.(name) ?? name;
  }

  function formatNearestDistanceHint(nearest) {
    return deps.formatNearestDistanceHint?.(nearest) ?? null;
  }

  function normalizeDirection(direction) {
    return deps.normalizeDirection?.(direction) ?? direction;
  }

  function dedupeDirections(directions) {
    return deps.dedupeDirections?.(directions) ?? directions;
  }

  function getDetailStationCombobox() {
    return deps.getDetailStationCombobox?.() ?? null;
  }

  function setStationComboboxValue(combobox, station) {
    return deps.setStationComboboxValue?.(combobox, station);
  }

  function replaceSelectOptions(selectEl, options) {
    return deps.replaceSelectOptions?.(selectEl, options);
  }

  function getStationsList() {
    return deps.getStationsList?.();
  }

  async function fetchJson(url) {
    // CAPACITOR-18: optional deps.fetchJson?.(url) returned undefined when the dep
    // was missing, then primary.ok / fallback.ok threw TypeError.
    if (typeof deps.fetchJson !== "function") {
      return {
        ok: false,
        error: "Couldn't reach live times. Check your connection.",
      };
    }
    return deps.fetchJson(url);
  }

  function apiUrl(path) {
    return deps.apiUrl?.(path) ?? path;
  }

  function appendFixtureQuery(query) {
    return deps.appendFixtureQuery?.(query) ?? query;
  }

  function isTestMode() {
    return deps.isTestMode?.() ?? false;
  }

  function isNativeApp() {
    return deps.isNativeApp?.() ?? false;
  }

  function perthStationsHas(station) {
    return deps.perthStationsHas?.(station) ?? false;
  }

  function getPerthApiStations() {
    return deps.getPerthApiStations?.() ?? [];
  }

  function pauseOnboardingForOverlay() {
    return deps.pauseOnboardingForOverlay?.();
  }

  function isJourneysDialogOpen() {
    return deps.isJourneysDialogOpen?.() ?? false;
  }

  function notifyAdOverlaySuppression() {
    return deps.notifyAdOverlaySuppression?.();
  }

  function isNearbyModeActive() {
    return deps?.isNearbyModeActive?.() ?? false;
  }

  function isNearbyFaceReadyForOnboarding() {
    return deps.isNearbyFaceReadyForOnboarding?.() ?? false;
  }

  function hasCompletedOnboarding() {
    return deps.hasCompletedOnboarding?.() ?? false;
  }

  function maybeScheduleOnboarding() {
    return deps.maybeScheduleOnboarding?.();
  }

  function findNearestStation() {
    return deps.findNearestStation?.();
  }

  function pickPerthDirection(station) {
    return deps.pickPerthDirection?.(station);
  }

  function locationErrorFrom(error) {
    return deps.locationErrorFrom?.(error) ?? { message: String(error) };
  }

  function applyDefaultJourneyRoute(journey) {
    return deps.applyDefaultJourneyRoute?.(journey);
  }

  function shouldAutoRouteJourney(journey) {
    return deps.shouldAutoRouteJourney?.(journey) ?? false;
  }

  function saveJourneyListToSettings(options) {
    return deps.saveJourneyListToSettings?.(options);
  }

  function reloadSettingsDraftFromStorage() {
    return deps.reloadSettingsDraftFromStorage?.();
  }

  function persistSettings(next) {
    return deps.persistSettings?.(next);
  }

  function readManualJourneyOverride() {
    return deps.readManualJourneyOverride?.();
  }

  function setManualJourneyOverride(id) {
    return deps.setManualJourneyOverride?.(id);
  }

  function countConfiguredJourneys(journeys) {
    return deps.countConfiguredJourneys?.(journeys) ?? 0;
  }

  function getInboundJourney(journeys) {
    return deps.getInboundJourney?.(journeys) ?? null;
  }

  function isOutboundCommuteJourney(journey) {
    return deps.isOutboundCommuteJourney?.(journey) ?? false;
  }

  function markInitialJourneySetup() {
    return deps.markInitialJourneySetup?.();
  }

  function trackProductEvent(name, props) {
    return deps.trackProductEvent?.(name, props);
  }

  function setOptionalTimeField(input, display, field, clearBtn, value) {
    return deps.setOptionalTimeField?.(input, display, field, clearBtn, value);
  }

  function readOptionalTimeField(field) {
    return deps.readOptionalTimeField?.(field) ?? "";
  }

  function updateLeaveBeforeLabel(minutes) {
    return deps.updateLeaveBeforeLabel?.(minutes);
  }

  function syncLeaveBeforeControlsState() {
    return deps.syncLeaveBeforeControlsState?.();
  }

  function isTemplateWizardReminderDemoActive() {
    return deps.isTemplateWizardReminderDemoActive?.() ?? false;
  }

  function isAtJourneyCap(journeys) {
    return deps.isAtJourneyCap?.(journeys) ?? false;
  }

  function hasJourneyForTemplate(templateKey) {
    return deps.hasJourneyForTemplate?.(templateKey) ?? false;
  }

  function getMaxJourneys() {
    return deps.getMaxJourneys?.() ?? 6;
  }

  function getJourneyCapHint() {
    return deps.getJourneyCapHint?.() ?? "";
  }
