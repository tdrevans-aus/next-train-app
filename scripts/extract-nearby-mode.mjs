import fs from "node:fs";
import path from "node:path";

const appPath = path.join("public", "app.js");
const outPath = path.join("public", "nearby-mode.js");
const lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

const extractRanges = [
  [363, 386],
  [1518, 1546],
  [2638, 2652],
  [3539, 3624],
  [3630, 3930],
  [3980, 5092],
  [7570, 7604],
];

const functionNames = [
  "classifyNearbyError",
  "setNearbyError",
  "clearNearbyError",
  "getNearbyLeaveBeforeMinutes",
  "updateNearbyLeaveBeforeLabel",
  "syncNearbyLeaveBeforeSliderFill",
  "rescheduleNearbyPinReminders",
  "dismissNearbyPinLeaveCard",
  "clearNearbyPinLeaveCardDismissed",
  "isUnsupportedRegion",
  "renderUnsupportedRegionBoard",
  "isNearbyModeActive",
  "syncChromeMode",
  "syncNearbyChrome",
  "formatNearbyRouteLine",
  "readLastNearbyStationCache",
  "readCachedNearbyBoard",
  "writeLastNearbyStationCache",
  "clearLastNearbyStationCache",
  "getNearbySkip",
  "setNearbySkip",
  "getNearbyPin",
  "clearNearbyPin",
  "buildNearbyPinSettingsSnapshot",
  "syncNearbyPinSettings",
  "restoreNearbySessionPinFromSettings",
  "buildNearbyLeaveNext",
  "hideNearbyPinLeaveSurfaces",
  "renderNearbyPinLeaveSurfaces",
  "handleNearbyNotifyToggle",
  "nearbyPinExpiryMs",
  "isNearbyPinHolding",
  "isNearbyPinShowing",
  "setNearbyPinFromTrip",
  "applyNearbyPinToData",
  "applyNearbySkip",
  "fetchNearbyDirectionData",
  "pickSoonestNearbyDirection",
  "getNearbyFocusedEntry",
  "formatNearbyDirectionRow",
  "ensureNearbyStationOptions",
  "stopNearbyLocateTimers",
  "syncNearbyDontWaitButton",
  "showNearbyDontWaitOffer",
  "showNearbyEarlyPicker",
  "dismissNearbyLocatePicker",
  "shouldShowNearbyLoadingState",
  "nearbyLoadingRouteCopy",
  "nearbyLoadingHeroCopy",
  "startNearbyLocateTimers",
  "isNearbyLocateCurrent",
  "locateNearbyInBackground",
  "showNearbyFallback",
  "renderNearbyDirectionsList",
  "renderNearbyBoard",
  "nearbyBoardHasDepartures",
  "nearbyBoardLooksEmpty",
  "fetchNearbyBoard",
  "fetchNearbyBoardOnce",
  "focusNearbyDirection",
  "setNearbyGpsRefining",
  "enterNearbyMode",
  "exitNearbyMode",
  "applyNearbyManualStation",
  "initNearbyListeners",
  "getNearbySession",
  "getNearbyBoard",
];

let body = "";
for (const [start, end] of extractRanges) {
  body += lines.slice(start - 1, end).join("\n") + "\n\n";
}

const domRefs = [
  "errorEl",
  "heroEl",
  "heroDepartLabelEl",
  "departCountdownEl",
  "departDisplayTimeEl",
  "heroScheduledTimeEl",
  "leaveCardEl",
  "leaveCardLabelEl",
  "leaveTimeEl",
  "leaveCountdownEl",
  "leaveCardActionsEl",
  "leaveBufferEditBtn",
  "platformEl",
  "statusEl",
  "followingSectionEl",
  "updatedEl",
  "attributionEl",
  "journeySwitcherEl",
  "journeySwitcherMenuEl",
  "appEl",
  "journeysBtn",
  "journeysChromeAction",
];

function transform(code) {
  let out = code
    .replace(/\bjourneyModeActive\s*=\s*false\b/g, "setJourneyModeActive(false)")
    .replace(/\bjourneyModeActive\s*=\s*true\b/g, "setJourneyModeActive(true)")
    .replace(/\bjourneyModeActive\b/g, "getJourneyModeActive()")
    .replace(/\bsettings\.nearby/g, "getSettings().nearby")
    .replace(/\blastRenderedNext\s*=\s*null\b/g, "setLastRenderedNext(null)")
    .replace(/\blastRenderedNext\s*=\s*next\b/g, "setLastRenderedNext(next)")
    .replace(/\blastRenderedNext\b/g, "getLastRenderedNext()")
    .replace(/\benterJourneyMode\(\)/g, "deps.enterJourneyMode?.()")
    .replace(/\bclearManualJourneyOverride\(\)/g, "deps.clearManualJourneyOverride?.()")
    .replace(/\bdismissLeaveHint\(\)/g, "deps.dismissLeaveHint?.()")
    .replace(/\bcloseJourneySwitcherMenu\(\)/g, "deps.closeJourneySwitcherMenu?.()")
    .replace(/\bclearOnboardingSchedule\(\)/g, "deps.clearOnboardingSchedule?.()")
    .replace(/\bfindNearestStation\(/g, "deps.findNearestStation?.(")
    .replace(/\bgetGeolocationPosition\(/g, "deps.getGeolocationPosition?.(")
    .replace(/\bisNearbyPinSettingsHolding\(/g, "deps.isNearbyPinSettingsHolding?.(")
    .replace(/\bDEFAULT_SETTINGS\b/g, "DEFAULT_LEAVE_BEFORE")
    .replace(/const journeysBtn = document\.createElement/g, "const emptyJourneysBtn = document.createElement")
    .replace(/\bjourneysBtn\.(type|className|textContent|addEventListener)/g, "emptyJourneysBtn.$1")
    .replace(/hint, deps\.journeysBtn\)/g, "hint, emptyJourneysBtn)");

  for (const ref of domRefs) {
    out = out.replace(new RegExp(`\\b${ref}\\b`, "g"), `deps.${ref}`);
  }

  return out;
}

body = transform(body);

const header = fs.readFileSync(path.join("scripts", "nearby-mode-header.js"), "utf8");

const listeners = `
function initNearbyListeners() {
  nearbyBtn?.addEventListener("click", () => {
    nearbyBtn?.classList.add("icon-btn--refreshing");
    Promise.resolve(enterNearbyMode()).finally(() => {
      window.setTimeout(() => nearbyBtn?.classList.remove("icon-btn--refreshing"), 300);
    });
  });

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
    const station = getNearbyStationCombobox()?.getValue?.();
    if (!station) {
      if (nearbyFallbackTextEl) {
        nearbyFallbackTextEl.textContent = "Pick a station from the list first.";
      }
      getNearbyStationCombobox()?.focus?.();
      return;
    }
    await applyNearbyManualStation(station);
  });

  nearbyLeaveBeforeInput?.addEventListener("input", () => {
    updateNearbyLeaveBeforeLabel();
    const minutes = Number(nearbyLeaveBeforeInput.value);
    if (!Number.isFinite(minutes)) {
      return;
    }
    persistSettings({ nearbyLeaveBeforeMinutes: minutes });
    if (isNearbyPinHolding()) {
      syncNearbyPinSettings();
      renderNearbyBoard();
    }
  });

  nearbyNotifyMeInput?.addEventListener("change", () => {
    void handleNearbyNotifyToggle();
  });

  nearbyLeaveHideBtn?.addEventListener("click", () => {
    dismissNearbyPinLeaveCard();
  });
}
`;

const exports = functionNames.sort().map((name) => `    ${name},`).join("\n");

const footer = `
  function init(nextDeps = {}) {
    deps = { ...nextDeps };
  }

  function mount(nextDeps = {}) {
    deps = { ...deps, ...nextDeps };
  }

  const api = {
    init,
    mount,
${exports}
  };

  global.nextTrainNearby = api;
})(window);
`;

fs.writeFileSync(outPath, header + body + listeners + footer);
console.log("Wrote", outPath);
