import fs from "node:fs";
import path from "node:path";

const appPath = path.join("public", "app.js");
const outPath = path.join("public", "journey-detail.js");
const lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

const extractRanges = [
  [578, 584],
  [600, 650],
  [703, 790],
  [1299, 1346],
  [1459, 1548],
  [1672, 1677],
  [1687, 1721],
  [1730, 1774],
  [2721, 2727],
  [3595, 3764],
  [3766, 3798],
  [3870, 4102],
  [4104, 4245],
  [4273, 4305],
  [4533, 4693],
  [4772, 4862],
  [5244, 5262],
];

let body = "";
for (const [start, end] of extractRanges) {
  body += lines.slice(start - 1, end).join("\n") + "\n\n";
}

function transform(code) {
  let out = code
    .replace(/^const detailNearestState = \{[\s\S]*?\};\r?$/m, "")
    .replace(/^function resetDetailNearestState\(\) \{[\s\S]*?\}\r?$/m, "")
    .replace(/^let directionsRequestId = 0;\r?$/m, "")
    .replace(/^let journeyOverlapState = null;\r?$/m, "")
    .replace(/^let editingJourneyId = null;\r?$/m, "")
    .replace(/^let editingJourneySnapshot = null;\r?$/m, "")
    .replace(/^const DEFAULT_ACTIVE_DAYS_HINT = .*$/m, "")
    .replace(/^const CUSTOM_ACTIVE_DAYS_HINT =[\s\S]*?;$/m, "");

  out = out.replace(/\bsettingsDraftJourneys\s*=\s*(?!\[)/g, "setSettingsDraftJourneys(");
  out = out.replace(/\bsettingsDraftJourneys\b/g, "getSettingsDraftJourneys()");
  out = out.replace(/\bsettings\.journeys\b/g, "getSettings().journeys");
  out = out.replace(/\bsettings\.activeJourneyId\b/g, "getSettings().activeJourneyId");

  out = out.replace(/\bPERTH_STATIONS\.has\(/g, "perthStationsHas(");
  out = out.replace(/\bPERTH_API_STATIONS\b/g, "getPerthApiStations()");

  out = out.replace(/\bMAX_JOURNEYS\b/g, "getMaxJourneys()");
  out = out.replace(/\bJOURNEY_CAP_HINT\b/g, "getJourneyCapHint()");

  return out;
}

body = transform(body);

const header = fs.readFileSync(path.join("scripts", "journey-detail-header.js"), "utf8");

const helpers = `
  function resetDetailNearestState() {
    detailNearestState.loading = false;
    detailNearestState.error = false;
    detailNearestState.hint = "";
  }

  function getEditingJourneyId() {
    return editingJourneyId;
  }

  function getJourneyOverlapState() {
    return journeyOverlapState;
  }

  function getDetailNearestState() {
    return detailNearestState;
  }
`;

const listeners = `
function initJourneyDetailListeners() {
  detailUseTargetTrainInput?.addEventListener("change", () => {
    syncDetailTargetMasterVisibility({ seedTime: detailUseTargetTrainInput.checked });
    if (detailUseTargetTrainInput.checked) {
      detailPreferredDisplay?.focus?.();
    }
  });

  detailUseLeaveBeforeInput?.addEventListener("change", () => {
    if (detailUseTargetTrainInput) {
      detailUseTargetTrainInput.checked = detailUseLeaveBeforeInput.checked;
    }
    syncDetailTargetMasterVisibility({ seedTime: detailUseLeaveBeforeInput.checked });
  });

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
      deps.addMinutesToTimeString?.(fromValue, 180) ?? ""
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
      deps.addMinutesToTimeString?.(fromValue, 180) ?? ""
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
    deps.closeJourneysDialog?.();
  });
}

function init(nextDeps = {}) {
  deps = { ...nextDeps };
}

const api = {
  init,
  applyJourneyOverlapFix,
  cancelJourneyDetailEdit,
  clearJourneyOverlapError,
  clearPairedActiveHourField,
  fetchDirectionsFromApi,
  formatJourneyOverlapError,
  getDetailNearestState,
  getEditingJourneyId,
  getJourneyOverlapState,
  handleDetailRemindToggleChange,
  hasDetailTargetTrain,
  highlightDetailReminderSection,
  isDetailTargetMasterOn,
  isTargetOutsideActiveWindow,
  loadDirectionsForSelect,
  openJourneyDetail,
  openJourneysDialogSync,
  populateDetailReminderFields,
  populateJourneyDetailForm,
  populateJourneyListView,
  readJourneyDetailDraft,
  readJourneyNameFromForm,
  renderJourneyListView,
  requireJourneyRouteFromForm,
  resetDetailNearestState,
  revertDetailRemindersForDeniedPermission,
  saveJourneyDetailFromForm,
  setDetailActiveDayChips,
  showJourneyOverlapError,
  showSettingsDetailView,
  showSettingsListView,
  syncDetailComboHints,
  syncDetailActiveDaysHint,
  syncDetailNearestStationChrome,
  syncDetailTargetMasterVisibility,
  syncDetailTargetRemindVisibility,
  syncJourneyDetailRouteFields,
  syncJourneysDetailChrome,
  syncJourneysDialogSheetMode,
  updateJourneyTemplatesVisibility,
  ensureSettingsDraftLoaded,
  findJourneyDefaultWindowConflict,
  journeyActiveDaysOverlap,
  journeyDefaultWindowsOverlap,
  normalizeActiveHoursFieldsForSave,
  initJourneyDetailListeners,
};

global.nextTrainJourneyDetail = api;
})(window);
`;

const footerStart = header.lastIndexOf("(function (global)");
const headerWithoutIIFE = header.slice(footerStart);

const output =
  headerWithoutIIFE.trimEnd() +
  "\n" +
  helpers.trimEnd() +
  "\n\n" +
  body.trimEnd() +
  "\n\n" +
  listeners.trimStart();

fs.writeFileSync(outPath, output);
console.log(`Wrote ${outPath} (${output.split(/\r?\n/).length} lines)`);
