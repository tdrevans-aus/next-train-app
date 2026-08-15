(function (global) {
  const LAST_NEARBY_STATION_KEY = "nextTrainLastNearbyStation";
  const LAST_NEARBY_STATION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  const LAST_NEARBY_BOARD_MAX_AGE_MS = 15 * 60 * 1000;
  const NEARBY_SOFT_LOCATION_MAX_AGE_MS = 2 * 60 * 1000;
  const NEARBY_PIN_HOLD_MS = 60_000;
  const DEFAULT_LEAVE_BEFORE = { leaveBeforeMinutes: 10 };

  let deps = {};

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
  let nearbyErrorKind = null;

  const nearbyPinLeaveControlsEl = document.getElementById("nearby-pin-leave-controls");
  const nearbyPinLeaveFooterEl = document.getElementById("nearby-pin-leave-footer");
  const nearbyNotifySectionEl = document.getElementById("nearby-notify-section");
  const nearbyLeaveHideBtn = document.getElementById("nearby-leave-hide-btn");
  const nearbyLeaveBeforeInput = document.getElementById("nearby-leave-before-input");
  const nearbyLeaveBeforeValueEl = document.getElementById("nearby-leave-before-value");
  const nearbyNotifyMeInput = document.getElementById("nearby-notify-me");
  const nearbyBtn = document.getElementById("nearby-btn");
  const nearbyChromeAction = document.getElementById("nearby-chrome-action");
  const nearbyDirectionsEl = document.getElementById("nearby-directions");
  const nearbyDirectionsListEl = document.getElementById("nearby-directions-list");
  const nearbyFallbackEl = document.getElementById("nearby-fallback");
  const nearbyFallbackTextEl = document.getElementById("nearby-fallback-text");
  const nearbyStationComboboxRoot = document.getElementById("nearby-station-combobox");
  const nearbyStationInput = document.getElementById("nearby-station-input");
  const nearbyStationBtn = document.getElementById("nearby-station-btn");
  const nearbyDontWaitBtn = document.getElementById("nearby-dont-wait-btn");

  function getSettings() {
    return deps.getSettings?.() ?? {};
  }

  function getJourneyModeActive() {
    return deps.getJourneyModeActive?.() ?? false;
  }

  function setJourneyModeActive(value) {
    deps.setJourneyModeActive?.(value);
  }

  function getLastRenderedNext() {
    return deps.getLastRenderedNext?.() ?? null;
  }

  function setLastRenderedNext(value) {
    deps.setLastRenderedNext?.(value);
  }

  function persistSettings(next) {
    return deps.persistSettings?.(next);
  }

  function formatStationLabel(name) {
    return deps.formatStationLabel?.(name) ?? name;
  }

  function normalizeStation(station) {
    return deps.normalizeStation?.(station) ?? station;
  }

  function isCatalogStation(station) {
    return deps.isCatalogStation?.(station) ?? false;
  }

  function getStationsList() {
    return deps.getStationsList?.();
  }

  function getNearbyStationCombobox() {
    return deps.getNearbyStationCombobox?.() ?? null;
  }

  function setStationComboboxValue(combobox, station) {
    return deps.setStationComboboxValue?.(combobox, station);
  }

  function isNativeApp() {
    return deps.isNativeApp?.() ?? false;
  }

  async function ensureGeoBridge() {
    return deps.ensureGeoBridge?.();
  }

  function locationErrorFrom(error) {
    return deps.locationErrorFrom?.(error) ?? { message: String(error) };
  }

  function isTestMode() {
    return deps.isTestMode?.() ?? false;
  }

  function fetchDirectionsFromApi(station) {
    return deps.fetchDirectionsFromApi?.(station);
  }

  function normalizeApiTrainData(data) {
    return deps.normalizeApiTrainData?.(data) ?? data;
  }

  function resolveTripDeparture(trip, referenceIso) {
    return deps.resolveTripDeparture?.(trip, referenceIso) ?? null;
  }

  function getLiveTiming(next) {
    return deps.getLiveTiming?.(next) ?? {
      minutesUntilDeparture: 0,
      minutesUntilLeave: 0,
      leavePhase: "calm",
      minutesLate: 0,
    };
  }

  function formatLeaveBeforeLabel(minutes) {
    return deps.formatLeaveBeforeLabel?.(minutes) ?? String(minutes);
  }

  function formatLeaveCardLabel(leavePhase, options) {
    return deps.formatLeaveCardLabel?.(leavePhase, options) ?? "";
  }

  function formatLeaveCardSubline(next) {
    return deps.formatLeaveCardSubline?.(next) ?? "";
  }

  function isLeavePhasePastLeaveBy(leavePhase) {
    return deps.isLeavePhasePastLeaveBy?.(leavePhase) ?? false;
  }

  function updateLeaveCardState(leavePhase) {
    return deps.updateLeaveCardState?.(leavePhase);
  }

  function renderLeaveMinutesCountdown(element, next) {
    return deps.renderLeaveMinutesCountdown?.(element, next);
  }

  function buildNextFromFollowing(following, leaveBeforeMinutes, referenceIso) {
    return deps.buildNextFromFollowing?.(following, leaveBeforeMinutes, referenceIso);
  }

  function getHeroDepartLabel(options) {
    return deps.getHeroDepartLabel?.(options) ?? "Next Train";
  }

  function getTrueNextTrip(data) {
    return deps.getTrueNextTrip?.(data) ?? null;
  }

  function renderJourneySecondaryNextLine(trueNextTrip, pinTrip) {
    return deps.renderJourneySecondaryNextLine?.(trueNextTrip, pinTrip) ?? false;
  }

  function renderThenTrains(data, skipCount, options) {
    return deps.renderThenTrains?.(data, skipCount, options);
  }

  function formatScheduledLine(next) {
    return deps.formatScheduledLine?.(next) ?? "";
  }

  function renderStatusDisplay(next) {
    return deps.renderStatusDisplay?.(next);
  }

  function renderDepartureCountdown(element, next) {
    return deps.renderDepartureCountdown?.(element, next);
  }

  function setRouteDisplay(text) {
    return deps.setRouteDisplay?.(text);
  }

  function setHeroUrgency(phase) {
    return deps.setHeroUrgency?.(phase);
  }

  function clearHeroSetupState() {
    return deps.clearHeroSetupState?.();
  }

  function updateSwipeHint() {
    return deps.updateSwipeHint?.();
  }

  function updateSwipeCues() {
    return deps.updateSwipeCues?.();
  }

  function updateLeaveHint() {
    return deps.updateLeaveHint?.();
  }

  function maybeScheduleOnboarding() {
    return deps.maybeScheduleOnboarding?.();
  }

  function apiUrl(path) {
    return deps.apiUrl?.(path) ?? path;
  }

  function appendFixtureQuery(queryString) {
    return deps.appendFixtureQuery?.(queryString) ?? queryString;
  }

  function enrichTrip(trip, referenceIso) {
    return deps.enrichTrip?.(trip, referenceIso) ?? trip;
  }

  function syncNearbyPinChrome() {
    return deps.syncNearbyPinChrome?.();
  }

  function getNearbySession() {
    return nearbySession;
  }

  function getNearbyBoard() {
    return nearbyBoard;
  }
