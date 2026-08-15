import fs from "node:fs";
import path from "node:path";

const appPath = path.join("public", "app.js");
let lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

const removeRanges = [
  [5262, 5244],
  [4862, 4772],
  [4693, 4533],
  [4305, 4273],
  [4245, 4104],
  [4102, 3870],
  [3798, 3766],
  [3764, 3687],
  [3685, 3595],
  [2727, 2721],
  [1774, 1730],
  [1721, 1687],
  [1677, 1672],
  [1548, 1459],
  [1346, 1299],
  [790, 703],
  [650, 600],
  [598, 594],
  [584, 578],
  [5592, 5447],
];

for (const [end, start] of removeRanges) {
  if (start <= end) {
    lines.splice(start - 1, end - start + 1);
  }
}

lines = lines.filter((line) => {
  const t = line.trim();
  if (t === "let directionsRequestId = 0;") return false;
  if (t === "let journeyOverlapState = null;") return false;
  if (t === "let editingJourneyId = null;") return false;
  if (t === "let editingJourneySnapshot = null;") return false;
  if (t === 'const DEFAULT_ACTIVE_DAYS_HINT = "Which days do you travel this journey?";')
    return false;
  if (
    t ===
    'const CUSTOM_ACTIVE_DAYS_HINT = "Starts on today — add more days if this repeats more often.";'
  )
    return false;
  return true;
});

const wrapperMarker = "const templateWizard = () => window.nextTrainTemplateWizard;";
const wrapperIdx = lines.findIndex((l) => l.startsWith(wrapperMarker));

const wrappers = `
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

`;

if (wrapperIdx >= 0) {
  lines.splice(wrapperIdx, 0, wrappers.trimEnd(), "");
}

// Replace editingJourneyId references in remaining app.js
for (let i = 0; i < lines.length; i++) {
  lines[i] = lines[i].replace(/\beditingJourneyId\b/g, "journeyDetail().getEditingJourneyId?.()");
}

const initCall = "initJourneyDetailFromModule();";
const initIdx = lines.findIndex((l) => l.trim() === initCall);
const stationInit = "initStationComboboxesFromModule();";
const stationIdx = lines.findIndex((l) => l.trim() === stationInit);
if (stationIdx >= 0 && initIdx < 0) {
  lines.splice(stationIdx, 0, "initJourneyDetailFromModule();");
}

// Update station combobox init to use module state
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("detailNearestState,")) {
    lines[i] = lines[i].replace(
      "detailNearestState,",
      "detailNearestState: journeyDetail().getDetailNearestState?.(),"
    );
  }
}

const indexPath = path.join("public", "index.html");
let indexHtml = fs.readFileSync(indexPath, "utf8");
if (!indexHtml.includes("journey-detail.js")) {
  indexHtml = indexHtml.replace(
    '<script src="template-wizard.js"></script>',
    '<script src="template-wizard.js"></script>\n    <script src="journey-detail.js"></script>'
  );
  fs.writeFileSync(indexPath, indexHtml);
}

fs.writeFileSync(appPath, lines.join("\n"));
console.log(`Stripped journey detail from app.js (${lines.length} lines)`);
