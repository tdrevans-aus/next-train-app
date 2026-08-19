import fs from "node:fs";
import path from "node:path";

const appPath = path.join("public", "app.js");
const outPath = path.join("public", "train-navigation.js");
const lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

const extractRanges = [
  [2244, 2317], // skip storage + getUpcomingTrips
  [2327, 2358], // getHeroDepartLabel, getNextThenTrain
  [2380, 2422], // reconcile, getSkippedEarlierTrain, prepareDisplayData
  [2424, 2475], // preferred helpers + tripMatchesPreferredOrLater
  [2477, 2492], // leaveByArmedForDisplayedTrip
  [2526, 2756], // pin trip helpers (excludes renderJourneySecondaryNextLine)
  [2777, 2791], // findPreferredTripSkipIndex
  [2793, 2855], // pin lock + skipToTargetTrain
  [2857, 2957], // getLeavePhase, buildNext, slim, ensure, applyClientSkip
  [3071, 3327], // canSkip through skipToEarlier (excludes journey switcher block)
  [3835, 3936], // hero swipe
  [4945, 5027], // jumpToTargetTrain, toggleHeroPin
];

const functionNames = new Set([
  "skipStorageKey",
  "readSkipState",
  "saveSkipState",
  "clearSkipState",
  "saveSkipStateForTrip",
  "getUpcomingTrips",
  "getHeroDepartLabel",
  "getNextThenTrain",
  "reconcileSkipWithApi",
  "getSkippedEarlierTrain",
  "prepareDisplayData",
  "preferredMinutesForLiveGlance",
  "liveHorizonMinutes",
  "tripMatchesPreferredOrLater",
  "leaveByArmedForDisplayedTrip",
  "tripHasDeparted",
  "findTripByDepartureIso",
  "findTripIndexInUpcoming",
  "getTrueNextTrip",
  "isJourneyOverrideActiveToday",
  "isJourneyPinDismissedToday",
  "isJourneyTargetPinnedToday",
  "sanitizeJourneyPinOverride",
  "sanitizeJourneyPinDismissed",
  "resolveJourneyPreferredTargetTrip",
  "resolveJourneyPinTrip",
  "persistJourneyPinDismissed",
  "clearJourneyPinDismissed",
  "journeysDepartureMatch",
  "persistJourneyPinOverride",
  "clearJourneyPinOverride",
  "findPreferredTripSkipIndex",
  "isHeroPinLockingSwipe",
  "canSkipToTargetTrain",
  "skipToTargetTrain",
  "buildNextFromFollowing",
  "slimFollowing",
  "ensureFullNext",
  "applyClientSkip",
  "canSkipToNextTrain",
  "canSkipToEarlierTrain",
  "applyNearbySkipOptimistic",
  "shouldAdvanceLeavePinOnSkip",
  "advanceLeavePinToNextTrain",
  "shouldAdvancePinOnNextTrain",
  "advanceNearbyPinToNextTrain",
  "skipToNextTrain",
  "skipToEarlierTrain",
  "resetHeroSwipePointer",
  "handleHeroSwipeEnd",
  "initHeroSwipe",
  "jumpToTargetTrain",
  "toggleHeroPin",
]);

let body = "";
for (const [start, end] of extractRanges) {
  body += lines.slice(start - 1, end).join("\n") + "\n\n";
}

function transform(code) {
  return code
    .replace(/\bSKIP_KEY\b/g, "SKIP_KEY")
    .replace(/\bskipTrains\s*\+=\s*1\b/g, "setSkipTrains(getSkipTrains() + 1)")
    .replace(/\bskipTrains\s*-=\s*1\b/g, "setSkipTrains(getSkipTrains() - 1)")
    .replace(/\bskipTrains\s*=\s*readSkipState\(\)\.count\b/g, "setSkipTrains(readSkipState().count)")
    .replace(/\bskipTrains\s*=\s*0\b/g, "setSkipTrains(0)")
    .replace(/\bskipTrains\s*=\s*targetIndex\b/g, "setSkipTrains(targetIndex)")
    .replace(/\bskipTrains\s*=\s*Math\.max\(0, count\)/g, "setSkipTrains(Math.max(0, count))")
    .replace(/skipCount = skipTrains\b/g, "skipCount = getSkipTrains()")
    .replace(/skipCount = skipTrains\)/g, "skipCount = getSkipTrains())")
    .replace(/\bskipTrains\b/g, "getSkipTrains()")
    .replace(/\blastApiData\b/g, "getLastApiData()")
    .replace(/\bjourneyModeActive\s*=\s*true\b/g, "deps.setJourneyModeActive?.(true)")
    .replace(/\bjourneyModeActive\b/g, "getJourneyModeActive()")
    .replace(/\bsettings\.journeys\b/g, "getSettings().journeys")
    .replace(/\bsettings\.activeJourneyId\b/g, "getSettings().activeJourneyId")
    .replace(/\bnearbyBoard\b/g, "getNearbyBoard()")
    .replace(/\bnearbySession\b/g, "getNearbySession()")
    .replace(/\berrorEl\b/g, "deps.errorEl")
    .replace(/\bheroPinBtn\b/g, "deps.heroPinBtn")
    .replace(/\bheroEl\b/g, "deps.heroEl")
    .replace(/\blastRenderedNext\b/g, "getLastRenderedNext()")
    .replace(/data = getLastApiData\(\)/g, "data = getLastApiData()");
}

body = transform(body);

const header = `(function (global) {
  const SKIP_KEY = "nextTrainSkip";
  const SWIPE_THRESHOLD_PX = 48;

  let deps = {};
  let swipeStartX = 0;
  let swipeStartY = 0;
  let swipeLastX = 0;
  let swipeLastY = 0;
  let heroSwipePointerId = null;

  function getSkipTrains() {
    return deps.getSkipTrains?.() ?? 0;
  }

  function setSkipTrains(value) {
    deps.setSkipTrains?.(value);
  }

  function getLastApiData() {
    return deps.getLastApiData?.() ?? null;
  }

  function getLastRenderedNext() {
    return deps.getLastRenderedNext?.() ?? null;
  }

  function getJourneyModeActive() {
    return deps.getJourneyModeActive?.() ?? false;
  }

  function setJourneyModeActive(value) {
    deps.setJourneyModeActive?.(value);
  }

  function getSettings() {
    return deps.getSettings?.() ?? { journeys: [] };
  }

  function getNearbySession() {
    return deps.getNearbySession?.() ?? null;
  }

  function getNearbyBoard() {
    return deps.getNearbyBoard?.() ?? null;
  }

  function getActiveJourney() {
    return deps.getActiveJourney?.() ?? null;
  }

  function normalizeJourney(raw) {
    return deps.normalizeJourney?.(raw) ?? raw;
  }

  function persistSettings(next) {
    return deps.persistSettings?.(next);
  }

  function normalizeApiTrainData(data) {
    return deps.normalizeApiTrainData?.(data) ?? data;
  }

  function resolveTripDeparture(trip, referenceIso) {
    return deps.resolveTripDeparture?.(trip, referenceIso) ?? null;
  }

  function getLiveTiming(next) {
    return deps.getLiveTiming?.(next) ?? { minutesUntilDeparture: 0, minutesUntilLeave: 0, leavePhase: "calm", minutesLate: 0 };
  }

  function getEffectiveLeaveBeforeMinutes(journey) {
    return deps.getEffectiveLeaveBeforeMinutes?.(journey) ?? 10;
  }

  function journeyUsesLeaveBefore(journey) {
    return deps.journeyUsesLeaveBefore?.(journey) ?? true;
  }

  function getLeaveTripForActiveJourney(data = getLastApiData()) {
    return deps.getLeaveTripForActiveJourney?.(data) ?? null;
  }

  function journeyMatchesSchedule(journey, minutes, day) {
    return deps.journeyMatchesSchedule?.(journey, minutes, day) ?? false;
  }

  function parseTimeToMinutes(time) {
    return deps.parseTimeToMinutes?.(time) ?? NaN;
  }

  function getPerthLocalDateKey(date) {
    return deps.getPerthLocalDateKey?.(date) ?? "";
  }

  function minutesUntilPerthWallClock(isoString) {
    return deps.minutesUntilPerthWallClock?.(isoString) ?? 0;
  }

  function minutesUntilPerthClockMinutes(targetMinutes) {
    return deps.minutesUntilPerthClockMinutes?.(targetMinutes) ?? 0;
  }

  function isNearbyModeActive() {
    return deps?.isNearbyModeActive?.() ?? false;
  }

  function getNearbyFocusedEntry() {
    return deps.getNearbyFocusedEntry?.() ?? null;
  }

  function getNearbySkip(direction) {
    return deps.getNearbySkip?.(direction) ?? 0;
  }

  function setNearbySkip(direction, skip) {
    deps.setNearbySkip?.(direction, skip);
  }

  function getNearbyPin() {
    return deps.getNearbyPin?.() ?? null;
  }

  function isNearbyPinHolding(pin) {
    return deps.isNearbyPinHolding?.(pin) ?? false;
  }

  function isNearbyPinShowing(direction) {
    return deps.isNearbyPinShowing?.(direction) ?? false;
  }

  function setNearbyPinFromTrip(direction, trip) {
    deps.setNearbyPinFromTrip?.(direction, trip);
  }

  function syncNearbyPinSettings() {
    deps.syncNearbyPinSettings?.();
  }

  function clearNearbyPin() {
    deps.clearNearbyPin?.();
  }

  function applyNearbySkip(data, skip) {
    return deps.applyNearbySkip?.(data, skip) ?? data;
  }

  function render(data, options) {
    return deps.render?.(data, options);
  }

  function fetchNextTrain() {
    return deps.fetchNextTrain?.();
  }

  function renderNearbyBoard(options) {
    return deps.renderNearbyBoard?.(options);
  }

  function fetchNearbyBoard() {
    return deps.fetchNearbyBoard?.();
  }

  function dismissSwipeHint() {
    deps.dismissSwipeHint?.();
  }

  function rescheduleNearbyPinReminders() {
    deps.rescheduleNearbyPinReminders?.();
  }

  function isUnconfiguredJourney(journey) {
    return deps.isUnconfiguredJourney?.(journey) ?? false;
  }

`;

const exports = [...functionNames].sort().map((name) => `    ${name},`).join("\n");

const footer = `
  function init(nextDeps = {}) {
    deps = nextDeps;
  }

  const api = {
    init,
${exports}
  };

  global.nextTrainNavigation = api;
})(window);
`;

fs.writeFileSync(outPath, header + body + footer);

// Remove extracted ranges from app.js (reverse order to preserve line numbers)
const removeRanges = [
  [5027, 4945],
  [3936, 3835],
  [3327, 3071],
  [2957, 2857],
  [2855, 2793],
  [2791, 2777],
  [2756, 2526],
  [2492, 2477],
  [2475, 2424],
  [2422, 2380],
  [2358, 2327],
  [2317, 2244],
];

let appLines = [...lines];
for (const [end, start] of removeRanges) {
  appLines.splice(start - 1, end - start + 1);
}

// Remove SKIP_KEY constant and swipe state vars
appLines = appLines.filter((line, index) => {
  const trimmed = line.trim();
  if (trimmed === 'const SKIP_KEY = "nextTrainSkip";') return false;
  if (trimmed.startsWith("let swipeStartX") || trimmed.startsWith("let swipeStartY")) return false;
  if (trimmed.startsWith("let swipeLastX") || trimmed.startsWith("let swipeLastY")) return false;
  if (trimmed.startsWith("let heroSwipePointerId")) return false;
  return true;
});

// Fix getLeavePhase in app.js - it was removed, need to add back before getLiveTiming
const getLeavePhaseFn = `function getLeavePhase(minutesUntilLeave, minutesUntilDeparture) {
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

`;

const liveTimingIdx = appLines.findIndex((l) => l.startsWith("function getLiveTiming"));
if (liveTimingIdx >= 0 && !appLines.some((l) => l.startsWith("function getLeavePhase"))) {
  appLines.splice(liveTimingIdx, 0, getLeavePhaseFn.trimEnd(), "");
}

// Insert wrappers before initJourneyModelFromModule
const wrapperMarker = "function initJourneyModelFromModule()";
const wrapperIdx = appLines.findIndex((l) => l.startsWith(wrapperMarker));
const wrappers = `
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
    getNearbySession: () => nearbySession,
    getNearbyBoard: () => nearbyBoard,
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
  });
}

`;

if (wrapperIdx >= 0) {
  appLines.splice(wrapperIdx, 0, wrappers.trimEnd(), "");
}

// Add initTrainNavigationFromModule call
const initCallMarker = "initJourneyModelFromModule();";
const initCallIdx = appLines.findIndex((l) => l.trim() === initCallMarker);
if (initCallIdx >= 0) {
  appLines.splice(initCallIdx, 0, "initTrainNavigationFromModule();");
}

fs.writeFileSync(appPath, appLines.join("\n"));
console.log("Wrote", outPath);
console.log("Updated", appPath);
