import fs from "node:fs";
import path from "node:path";

const appPath = path.join("public", "app.js");
let lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

const removeRanges = [
  [7844, 7825],
  [7627, 7564],
  [7604, 7570],
  [5092, 3980],
  [3930, 3630],
  [3624, 3539],
  [2652, 2638],
  [1546, 1518],
  [386, 363],
];

for (const [end, start] of removeRanges) {
  lines.splice(start - 1, end - start + 1);
}

lines = lines.filter((line) => {
  const t = line.trim();
  if (t === 'const LAST_NEARBY_STATION_KEY = "nextTrainLastNearbyStation";') return false;
  if (t.startsWith("const LAST_NEARBY_STATION_MAX_AGE_MS")) return false;
  if (t.startsWith("const LAST_NEARBY_BOARD_MAX_AGE_MS")) return false;
  if (t.startsWith("const NEARBY_SOFT_LOCATION_MAX_AGE_MS")) return false;
  if (t === "const NEARBY_PIN_HOLD_MS = 60_000;") return false;
  if (t.startsWith("let nearbySession")) return false;
  if (t.startsWith("let nearbyBoard")) return false;
  if (t.startsWith("let nearbyLoading")) return false;
  if (t.startsWith("let nearbyBoardInflight")) return false;
  if (t.startsWith("let nearbyBoardRefetchPending")) return false;
  if (t.startsWith("let nearbyLocateStartedAt")) return false;
  if (t.startsWith("let nearbyLocateTimer")) return false;
  if (t.startsWith("let nearbyLocateDontWaitTimer")) return false;
  if (t.startsWith("let nearbyLocateGeneration")) return false;
  if (t.startsWith("let nearbyLocatePickerVisible")) return false;
  if (t.startsWith("let nearbyDontWaitVisible")) return false;
  if (t.startsWith("let nearbyUserPickedStation")) return false;
  if (t.startsWith("let nearbyError")) return false;
  if (t.startsWith("let nearbyErrorKind")) return false;
  if (t.includes("nearbyPinLeaveControlsEl")) return false;
  if (t.includes("nearbyPinLeaveFooterEl")) return false;
  if (t.includes("nearbyNotifySectionEl")) return false;
  if (t.includes("nearbyLeaveHideBtn")) return false;
  if (t.includes("nearbyLeaveBeforeInput")) return false;
  if (t.includes("nearbyLeaveBeforeValueEl")) return false;
  if (t.includes("nearbyNotifyMeInput")) return false;
  if (t === "const nearbyBtn = document.getElementById(\"nearby-btn\");") return false;
  if (t.includes("nearbyChromeAction")) return false;
  if (t.includes("nearbyDirectionsEl")) return false;
  if (t.includes("nearbyDirectionsListEl")) return false;
  if (t.includes("nearbyFallbackEl")) return false;
  if (t.includes("nearbyFallbackTextEl")) return false;
  if (t.includes("nearbyStationComboboxRoot")) return false;
  if (t.includes("nearbyStationInput")) return false;
  if (t.includes("nearbyStationBtn")) return false;
  if (t.includes("nearbyDontWaitBtn")) return false;
  return true;
});

const wrapperMarker = "const trainNavigation = () => window.nextTrainNavigation;";
const wrapperIdx = lines.findIndex((l) => l.startsWith(wrapperMarker));

const wrappers = `
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
function shouldShowNearbyLoadingState() { return nearbyMode().shouldShowNearbyLoadingState(); }

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

`;

if (wrapperIdx >= 0) {
  lines.splice(wrapperIdx, 0, wrappers.trimEnd(), "");
}

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("getNearbySession: () => nearbySession")) {
    lines[i] = "    getNearbySession: () => nearbyMode().getNearbySession(),";
  }
  if (lines[i].includes("getNearbyBoard: () => nearbyBoard")) {
    lines[i] = "    getNearbyBoard: () => nearbyMode().getNearbyBoard(),";
  }
}

const initCall = "initTrainNavigationFromModule();";
const initIdx = lines.findIndex((l) => l.trim() === initCall);
if (initIdx >= 0) {
  lines.splice(initIdx, 0, "initNearbyModeFromModule();");
}

// Fix syncHeroPinChrome nearby session reference
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("Boolean(nearbySession?.station)")) {
    lines[i] = lines[i].replace(
      "Boolean(nearbySession?.station)",
      "Boolean(nearbyMode().getNearbySession()?.station)"
    );
  }
}

// Fix updateLeaveHint nearby pin controls
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === "const hideForNearbyPinControls =") {
    lines[i] =
      "  const hideForNearbyPinControls =\n    isNearbyModeActive() &&\n    document.getElementById(\"nearby-pin-leave-controls\") &&\n    !document.getElementById(\"nearby-pin-leave-controls\").hidden;";
  }
}

const indexPath = path.join("public", "index.html");
let indexHtml = fs.readFileSync(indexPath, "utf8");
if (!indexHtml.includes("nearby-mode.js")) {
  indexHtml = indexHtml.replace(
    "<script src=\"train-navigation.js\"></script>",
    "<script src=\"train-navigation.js\"></script>\n    <script src=\"nearby-mode.js\"></script>"
  );
  fs.writeFileSync(indexPath, indexHtml);
}

fs.writeFileSync(appPath, lines.join("\n"));

// Fix render() if nearby-directions block was stripped
let appJs = fs.readFileSync(appPath, "utf8");
appJs = appJs.replace(
  /hideNearbyPinLeaveSurfaces\(\);\s*\n\s*\}\s*\n\s*if \(!stale\)/,
  `hideNearbyPinLeaveSurfaces();\n\n  const nearbyDirectionsEl = document.getElementById("nearby-directions");\n  if (nearbyDirectionsEl) {\n    nearbyDirectionsEl.hidden = true;\n  }\n\n  if (!stale)`
);
fs.writeFileSync(appPath, appJs);
console.log("Stripped nearby from app.js");
