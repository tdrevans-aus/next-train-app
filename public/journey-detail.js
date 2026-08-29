(function (global) {
  const DEFAULT_ACTIVE_DAYS_HINT = "Which days do you travel this journey?";

  let deps = {};

  let directionsRequestId = 0;
  let journeyOverlapState = null;
  let editingJourneyId = null;
  let editingJourneySnapshot = null;
  /** @type {'routes' | 'journeys'} */
  let libraryKind = "routes";

  const LIBRARY_COPY = {
    routes: {
      title: "Routes",
      hint: "See the next train for a station and direction you check often.",
      back: "← Routes",
    },
    journeys: {
      title: "Journeys",
      hint: "For trips you make regularly — save your station, usual train, and when you travel. We'll remind you when it's time to leave.",
      back: "← Journeys",
    },
  };

  const detailNearestState = {
    loading: false,
    error: false,
    hint: "",
    regionAway: false,
  };

  const settingsListView = document.getElementById("settings-list-view");
  const settingsDetailView = document.getElementById("settings-detail-view");
  const journeysDetailChrome = document.getElementById("journeys-detail-chrome");
  const journeysDialog = document.getElementById("journeys-dialog");
  const journeysDoneBtn = document.getElementById("journeys-done-btn");
  const journeyListEl = document.getElementById("journey-list");
  const deleteJourneyBtn = document.getElementById("delete-journey-btn");
  const detailJourneyNameInput = document.getElementById("detail-journey-name");
  const detailJourneyNameField = document.querySelector(".journey-name-field");
  const detailDirectionSelect = document.getElementById("detail-direction-select");
  const detailLeaveBeforeInput = document.getElementById("detail-leave-before-input");
  const detailUseLeaveBeforeInput = document.getElementById("detail-use-leave-before");
  const detailTargetNest = document.getElementById("detail-target-nest");
  const detailTargetTopRow = document.getElementById("detail-target-top-row");
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
  const journeyTemplateShortcutsEl = document.getElementById("journey-template-shortcuts");
  const journeySaveRouteBtnEl = document.getElementById("journey-save-route-btn");
  const journeySetupBtnEl = document.getElementById("journey-setup-btn");
  const routesCreateActionsEl = document.getElementById("routes-create-actions");
  const journeysCreateActionsEl = document.getElementById("journeys-create-actions");
  const journeysLibraryTitleEl = document.getElementById("journeys-library-title");
  const journeysLibraryHintEl = document.getElementById("journeys-library-hint");
  const settingsBackBtnEl = document.getElementById("settings-back");
  const journeyTemplateChipsEl = document.querySelector(".journey-template-chips");
  const journeyTemplatesAddHintEl = document.querySelector(".journey-templates-hint");
  const detailTimingSectionEl = document.getElementById("detail-timing-section");
  const detailActiveDayChips = document.getElementById("detail-active-day-chips");
  const detailActiveDaysHint = document.querySelector(".detail-active-days-hint");
  const detailActiveHoursErrorEl = document.getElementById("detail-active-hours-error");
  const detailActiveHoursErrorTextEl = document.getElementById("detail-active-hours-error-text");
  const detailActiveHoursFixBtn = document.getElementById("detail-active-hours-fix-btn");
  const detailActiveHoursHint = document.getElementById("detail-active-hours-hint");
  const detailTargetOutsideActiveHint = document.getElementById("detail-target-outside-active-hint");
  const detailReminderSection = document.getElementById("detail-reminder-section");
  const detailRemindControls = document.getElementById("detail-remind-controls");
  const detailRemindMeInput = document.getElementById("detail-remind-me");
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

  function formatJourneyActiveDays(journey) {
    return deps.formatJourneyActiveDays?.(journey) ?? "";
  }

  function formatJourneyDefaultWindow(journey) {
    return deps.formatJourneyDefaultWindow?.(journey) ?? "";
  }

  function formatJourneyRoute(journey) {
    return deps.formatJourneyRoute?.(journey) ?? "";
  }

  function syncLibraryChrome() {
    const copy = LIBRARY_COPY[libraryKind] ?? LIBRARY_COPY.routes;
    if (journeysLibraryTitleEl) {
      journeysLibraryTitleEl.textContent = copy.title;
    }
    if (journeysLibraryHintEl) {
      journeysLibraryHintEl.textContent = copy.hint;
    }
    if (settingsBackBtnEl) {
      settingsBackBtnEl.textContent = copy.back;
    }
    if (routesCreateActionsEl) {
      routesCreateActionsEl.hidden = libraryKind !== "routes";
    }
    if (journeysCreateActionsEl) {
      journeysCreateActionsEl.hidden = libraryKind !== "journeys";
    }
  }

  function setLibraryKind(kind) {
    libraryKind = kind === "journeys" ? "journeys" : "routes";
    syncLibraryChrome();
    renderJourneyListView();
    updateJourneyTemplatesVisibility();
    if (editingJourneyId) {
      const journey =
        getSettingsDraftJourneys().find((entry) => entry.id === editingJourneyId) ??
        getJourneyById(editingJourneyId);
      if (journey) {
        syncDetailFormForJourneyKind(journey);
      }
    }
  }

  function getLibraryKind() {
    return libraryKind;
  }

  function journeyMatchesLibraryKind(journey) {
    return libraryKind === "routes" ? isRouteJourney(journey) : isJourneyKind(journey);
  }

  function isJourneyKind(journey) {
    return deps.isJourneyKind?.(journey) ?? false;
  }

  function isRouteJourney(journey) {
    return deps.isRouteJourney?.(journey) ?? true;
  }

  function formatJourneyListSubtitle(journey) {
    if (isRouteJourney(journey)) {
      if (!journey?.station || !journey?.direction) {
        return "Set up...";
      }

      const station = deps.formatStationLabel?.(journey.station) ?? journey.station;
      return `${station} → ${journey.direction}`;
    }

    const parts = [formatJourneyRoute(journey)];
    const daysLabel = formatJourneyActiveDays(journey);
    if (daysLabel) {
      parts.push(daysLabel);
    }
    if (journey.preferredTrainTime) {
      parts.push(`Target ${journey.preferredTrainTime}`);
    }
    return parts.join(" · ");
  }

  function isRouteEditorContext(journey = null) {
    if (journey) {
      return isRouteJourney(journey);
    }
    return libraryKind === "routes";
  }

  function syncDetailFormForJourneyKind(journey) {
    const route = isRouteEditorContext(journey);

    if (settingsDetailView) {
      settingsDetailView.classList.toggle("settings-detail-view--route", route);
      settingsDetailView.classList.toggle("settings-detail-view--journey", !route);
    }

    if (detailJourneyNameField) {
      detailJourneyNameField.hidden = route;
    }
    if (detailTimingSectionEl) {
      detailTimingSectionEl.hidden = route;
    }
    if (detailPreferredSection) {
      detailPreferredSection.hidden = route;
    }
    if (detailReminderSection) {
      detailReminderSection.hidden = route;
    }
    if (detailJourneyWindow) {
      detailJourneyWindow.hidden = true;
    }
    if (detailRemindControls) {
      detailRemindControls.hidden = route;
    }
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

  function fetchJson(url) {
    return deps.fetchJson?.(url);
  }

  function apiResultError(result, fallback) {
    if (typeof deps.apiResultError === "function") {
      return deps.apiResultError(result, fallback);
    }
    return new Error(result?.data?.error ?? result?.error ?? fallback);
  }

  function isRateLimitedResult(result) {
    if (typeof deps.isRateLimitedResult === "function") {
      return deps.isRateLimitedResult(result);
    }
    return (
      result?.status === 429 ||
      result?.data?.error === "Too many requests" ||
      result?.error === "Too many requests"
    );
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

  function cityIdForStation(station) {
    return deps.cityIdForStation?.(station) ?? "";
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

  function pickDefaultDirection(station) {
    return deps.pickDefaultDirection?.(station) ?? deps.pickPerthDirection?.(station);
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

  function countConfiguredJourneyKind(journeys) {
    return deps.countConfiguredJourneyKind?.(journeys) ?? 0;
  }

  function getInboundJourney(journeys) {
    return deps.getInboundJourney?.(journeys) ?? null;
  }

  function isOutboundJourney(journey) {
    return deps.isOutboundJourney?.(journey) ?? false;
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

  function resetDetailNearestState() {
    detailNearestState.loading = false;
    detailNearestState.error = false;
    detailNearestState.hint = "";
    detailNearestState.regionAway = false;
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

  function clearEditingState() {
    editingJourneyId = null;
    editingJourneySnapshot = null;
  }

function readJourneyNameFromForm(station, direction) {
  if (libraryKind === "routes") {
    return formatRouteBasedJourneyName(station, direction);
  }

  const trimmed = detailJourneyNameInput?.value?.trim() ?? "";
  if (trimmed) {
    return trimmed.slice(0, 40);
  }
  return formatRouteBasedJourneyName(station, direction);
}



function wasEditingConfiguredJourney() {
  return Boolean(editingJourneySnapshot && !isUnconfiguredJourney(editingJourneySnapshot));
}

function shouldShowDetailDeleteButton(journey = null) {
  if (!editingJourneyId) {
    return false;
  }

  const draft =
    journey ??
    getSettingsDraftJourneys().find((entry) => entry.id === editingJourneyId) ??
    getJourneyById(editingJourneyId);
  if (!draft || isUnconfiguredJourney(draft)) {
    return false;
  }

  return libraryKind === "routes" ? isRouteJourney(draft) : isJourneyKind(draft);
}

function syncDetailDeleteChrome(journey = null) {
  if (!deleteJourneyBtn) {
    return;
  }

  const show = shouldShowDetailDeleteButton(journey);
  deleteJourneyBtn.hidden = !show;
  if (!show) {
    return;
  }

  const draft =
    journey ??
    getSettingsDraftJourneys().find((entry) => entry.id === editingJourneyId) ??
    getJourneyById(editingJourneyId);
  const isRoute = libraryKind === "routes" || isRouteJourney(draft);
  deleteJourneyBtn.setAttribute("aria-label", isRoute ? "Delete route" : "Delete journey");
}

function syncDetailNearestStationChrome(patch = {}) {
  if ("loading" in patch) {
    detailNearestState.loading = Boolean(patch.loading);
  }
  if ("error" in patch) {
    detailNearestState.error = Boolean(patch.error);
  }
  if ("hint" in patch) {
    detailNearestState.hint = patch.hint ? String(patch.hint) : "";
  }
  if ("regionAway" in patch) {
    detailNearestState.regionAway = Boolean(patch.regionAway);
  }

  const station = String(getDetailStationCombobox()?.getValue?.() || "").trim();
  const hasStation = Boolean(station);
  const { loading, error, hint, regionAway } = detailNearestState;

  const hideNearest = regionAway || deps.isPlanningAwayFromLocation?.();
  const showButton = !hideNearest && (loading || error || !hasStation);
  const showHint = !hideNearest && (loading || error);
  const nearestLabel = detailNearestBtn?.querySelector(".route-nearest-btn__label");

  if (detailNearestBtn) {
    detailNearestBtn.hidden = !showButton;
    const labelText = wasEditingConfiguredJourney()
      ? "Use my current location"
      : "Use nearest station";
    if (nearestLabel) {
      nearestLabel.textContent = labelText;
    } else {
      detailNearestBtn.textContent = labelText;
    }
  }

  if (detailNearestHint) {
    if (showHint) {
      detailNearestHint.hidden = false;
      detailNearestHint.textContent = loading ? "Finding nearest station…" : hint;
      detailNearestHint.classList.toggle("route-nearest-hint--error", error);
      detailNearestHint.classList.toggle("settings-location-hint--error", error);
    } else {
      detailNearestHint.hidden = true;
      detailNearestHint.classList.remove("route-nearest-hint--error", "settings-location-hint--error");
    }
  }

  const locationRow =
    document.getElementById("detail-nearest-row") || detailNearestBtn?.closest(".route-nearest-row");
  if (locationRow) {
    locationRow.hidden = !showButton && !showHint;
  }
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

function syncDetailActiveDaysHint() {
  if (!detailActiveDaysHint) {
    return;
  }

  detailActiveDaysHint.textContent = DEFAULT_ACTIVE_DAYS_HINT;
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

const JOURNEY_WINDOW_TARGET_START_PADDING_MINUTES = 60;
const JOURNEY_WINDOW_TARGET_END_PADDING_MINUTES = 15;

function journeyWindowAroundTarget(preferredTrainTime) {
  const from =
    deps.addMinutesToTimeString?.(
      preferredTrainTime,
      -JOURNEY_WINDOW_TARGET_START_PADDING_MINUTES
    ) ?? "";
  const until =
    deps.addMinutesToTimeString?.(preferredTrainTime, JOURNEY_WINDOW_TARGET_END_PADDING_MINUTES) ??
    "";
  return { from, until };
}

function setDetailJourneyWindow(from, until) {
  setOptionalTimeField(
    detailDefaultFromInput,
    detailDefaultFromDisplay,
    detailDefaultFromField,
    detailDefaultFromClear,
    from
  );
  setOptionalTimeField(
    detailDefaultUntilInput,
    detailDefaultUntilDisplay,
    detailDefaultUntilField,
    detailDefaultUntilClear,
    until
  );
}

function maybeDefaultJourneyWindowFromTarget(preferredTrainTime) {
  if (!isJourneyDetailEditor() || !preferredTrainTime) {
    return;
  }

  const defaultFrom = readOptionalTimeField(detailDefaultFromField);
  const defaultUntil = readOptionalTimeField(detailDefaultUntilField);
  if (defaultFrom || defaultUntil) {
    return;
  }

  const { from, until } = journeyWindowAroundTarget(preferredTrainTime);
  if (!from || !until) {
    return;
  }

  setDetailJourneyWindow(from, until);
}

function amendJourneyWindowFromTargetIfNeeded(preferredTrainTime) {
  if (!isJourneyDetailEditor() || !preferredTrainTime) {
    return;
  }

  const defaultFrom = readOptionalTimeField(detailDefaultFromField);
  const defaultUntil = readOptionalTimeField(detailDefaultUntilField);
  if (
    !defaultFrom ||
    !defaultUntil ||
    !isTargetOutsideActiveWindow(defaultFrom, defaultUntil, preferredTrainTime)
  ) {
    return;
  }

  const { from, until } = journeyWindowAroundTarget(preferredTrainTime);
  if (!from || !until) {
    return;
  }

  setDetailJourneyWindow(from, until);
}

function syncDetailComboHints({ amendWindowFromTarget = false, skipWindowDefault = false } = {}) {
  const preferredTrainTime = readOptionalTimeField(detailPreferredField);
  if (!skipWindowDefault) {
    maybeDefaultJourneyWindowFromTarget(preferredTrainTime);
  }
  if (amendWindowFromTarget) {
    amendJourneyWindowFromTargetIfNeeded(preferredTrainTime);
  }

  const defaultFrom = readOptionalTimeField(detailDefaultFromField);
  const defaultUntil = readOptionalTimeField(detailDefaultUntilField);

  const outsideTarget = isTargetOutsideActiveWindow(
    defaultFrom,
    defaultUntil,
    preferredTrainTime
  );

  if (detailTargetOutsideActiveHint) {
    const wasHidden = detailTargetOutsideActiveHint.hidden;
    detailTargetOutsideActiveHint.hidden = !outsideTarget;
    if (outsideTarget && wasHidden) {
      detailTargetOutsideActiveHint.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
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

function clearPairedActiveHourField(_clearedSide) {
  setOptionalTimeField(
    detailDefaultFromInput,
    detailDefaultFromDisplay,
    detailDefaultFromField,
    detailDefaultFromClear,
    ""
  );
  setOptionalTimeField(
    detailDefaultUntilInput,
    detailDefaultUntilDisplay,
    detailDefaultUntilField,
    detailDefaultUntilClear,
    ""
  );
  clearJourneyOverlapError();
  syncDetailComboHints({ skipWindowDefault: true });
}

function isJourneyDetailEditor() {
  return !isRouteEditorContext();
}

function isDetailTargetMasterOn() {
  return isJourneyDetailEditor();
}

function defaultPreferredTrainTime() {
  return global.nextTrainJourneyModel?.getDefaultCustomPreferredTrainTime?.() || "07:30";
}

function syncDetailTargetMasterVisibility({ seedTime = false } = {}) {
  if (detailPreferredField) {
    detailPreferredField.hidden = false;
  }
  if (detailTargetNest) {
    detailTargetNest.hidden = false;
  }
  if (detailTargetMasterHint) {
    detailTargetMasterHint.hidden = false;
  }

  if (seedTime && !hasDetailTargetTrain()) {
    const journey =
      getSettingsDraftJourneys().find((entry) => entry.id === editingJourneyId) ??
      editingJourneySnapshot;
    const fallback =
      readOptionalTimeField(detailDefaultFromField) ||
      editingJourneySnapshot?.preferredTrainTime ||
      journey?.preferredTrainTime ||
      editingJourneySnapshot?.defaultFrom ||
      defaultPreferredTrainTime();
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
  const hasTarget = hasDetailTargetTrain();
  const leaveBeforeOn = detailUseLeaveBeforeInput?.checked !== false;
  const showRemind = hasTarget && leaveBeforeOn;

  console.log("[detail] syncDetailTargetRemindVisibility", { hasTarget, leaveBeforeOn, showRemind });

  if (controls) {
    controls.hidden = !showRemind;
  }
  detailTargetTopRow?.classList.toggle("detail-target-top-row--solo", !hasTarget);

  if (!showRemind) {
    if (detailRemindMeInput?.checked) {
      detailRemindMeInput.checked = false;
    }
    return;
  }

  // Gentle pressure: default Remind me on when a target is first set.
  if (
    detailRemindMeInput &&
    !detailRemindMeInput.dataset.userTouched &&
    !isTemplateWizardReminderDemoActive()
  ) {
    detailRemindMeInput.checked = true;
  }
  if (!isTemplateWizardReminderDemoActive()) {
    void window.nextTrainLeaveReminders?.refreshJourneyRemindExtras?.();
    void window.nextTrainLeaveReminders?.ensureLiveCountdownDefaultOn?.();
  }
}

function formatMinutesAsTime(totalMinutes) {
  return (
    deps.formatMinutesAsTime?.(totalMinutes) ??
    global.nextTrainJourneyModel.formatMinutesAsTime(totalMinutes)
  );
}

  function getJourneyWindowRanges(journey) {
    let from, until;

    if (isJourneyKind(journey) && journey.preferredTrainTime) {
      const target = parseTimeToMinutes(journey.preferredTrainTime);
      from = (target - 60 + 24 * 60) % (24 * 60);
      until = (target + 15 + 24 * 60) % (24 * 60);
    } else {
      if (!hasDefaultWindow(journey)) {
        return [];
      }
      from = parseTimeToMinutes(journey.defaultFrom);
      until = parseTimeToMinutes(journey.defaultUntil);
    }

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

async function ensureSettingsDraftLoaded() {
  if (getSettingsDraftJourneys().length > 0) {
    return;
  }

  await populateJourneyListView();
}

async function fetchDirectionsFromApi(station) {
  const bundled = window.NextTrainBrisbaneDogfood?.getDirectionsForStation?.(station) ?? [];
  if (Array.isArray(bundled) && bundled.length) {
    return bundled;
  }

  const query = appendFixtureQuery(`station=${encodeURIComponent(station)}`);
  const primary = await fetchJson(apiUrl(`/api/directions?${query}`));

  if (primary.ok && Array.isArray(primary.data.directions)) {
    return primary.data.directions;
  }

  const fallback = await fetchJson(apiUrl(`/api/destinations?${query}`));
  if (fallback.ok && Array.isArray(fallback.data.destinations)) {
    return fallback.data.destinations;
  }

  if (isRateLimitedResult(primary) || isRateLimitedResult(fallback)) {
    throw apiResultError(
      isRateLimitedResult(primary) ? primary : fallback,
      "Could not load directions"
    );
  }

  throw apiResultError(primary.ok ? fallback : primary, "Could not load directions");
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
    const stationsToQuery = perthStationsHas(station)
      ? getPerthApiStations()
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
  syncLibraryChrome();
  syncJourneysDialogSheetMode();
  updateJourneyTemplatesVisibility();
}

function showSettingsDetailView() {
  settingsListView.hidden = true;
  settingsDetailView.hidden = false;
  syncLibraryChrome();
  syncJourneysDialogSheetMode();
  syncDetailFormForJourneyKind({ kind: libraryKind === "routes" ? "route" : "journey" });
  syncDetailDeleteChrome();
  if (isNativeApp()) {
    void window.NextTrainAds?.hideNativeBanner?.({ force: true });
    notifyAdOverlaySuppression();
  }
}

function cancelJourneyDetailEdit() {
  if (getSettingsDraftJourneys().length === 0) {
    reloadSettingsDraftFromStorage();
  }

  if (editingJourneyId && editingJourneySnapshot) {
    if (isUnconfiguredJourney(editingJourneySnapshot)) {
      // Abandoned create — drop the shell; don't keep "Set up…" rows.
      setSettingsDraftJourneys(getSettingsDraftJourneys().filter(
        (journey) => journey.id !== editingJourneyId
      ));
    } else {
      const index = getSettingsDraftJourneys().findIndex((journey) => journey.id === editingJourneyId);
      if (index >= 0) {
        getSettingsDraftJourneys()[index] = editingJourneySnapshot;
      } else {
        getSettingsDraftJourneys().push(editingJourneySnapshot);
      }
    }
  } else if (editingJourneyId) {
    const draft = getSettingsDraftJourneys().find((journey) => journey.id === editingJourneyId);
    if (draft && isUnconfiguredJourney(draft)) {
      setSettingsDraftJourneys(getSettingsDraftJourneys().filter(
        (journey) => journey.id !== editingJourneyId
      ));
    }
  }

  editingJourneySnapshot = null;
  editingJourneyId = null;
  renderJourneyListView();
  showSettingsListView();
}

async function syncJourneyDetailRouteFields(journey, nearestHint = null) {
  if (!journey) {
    return;
  }

  setStationComboboxValue(getDetailStationCombobox(), journey.station);
  await loadDirectionsForSelect(detailDirectionSelect, journey.station, journey.direction);

  syncDetailNearestStationChrome({
    loading: false,
    error: false,
    hint: nearestHint || "",
  });
}

function formatJourneyOverlapError(updated, conflict) {
  if (conflict.name === updated.name && conflict.id !== updated.id) {
    return `Only one journey can be active at one time. Another ${conflict.name} already uses this schedule.`;
  }

  return `Only one journey can be active at one time. This schedule overlaps ${conflict.name} (${formatJourneyDefaultWindow(conflict)}).`;
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
    if (isJourneyKind(after) && after.preferredTrainTime) {
      if (!before.preferredTrainTime) {
        return 24 * 60 * 4;
      }
      return Math.abs(parseTimeToMinutes(after.preferredTrainTime) - parseTimeToMinutes(before.preferredTrainTime));
    }

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
    if (isJourneyKind(conflict) && conflict.preferredTrainTime) {
      const editingRanges = getJourneyWindowRanges(editing);
      if (editingRanges.length !== 1) {
        // Multi-range (overnight) editing journey: clearing is safer.
        return [{ preferredTrainTime: "" }];
      }
      const [editingStart, editingEnd] = editingRanges[0];
      
      return [
        { preferredTrainTime: formatMinutesAsTime(editingStart - 15) },
        { preferredTrainTime: formatMinutesAsTime(editingEnd + 60) },
        { preferredTrainTime: "" },
      ].filter(c => {
          if (!c.preferredTrainTime) return true;
          const mins = parseTimeToMinutes(c.preferredTrainTime);
          return mins >= 0 && mins < 24 * 60;
      });
    }

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

    for (const fix of buildConflictFixCandidates(editing, conflict)) {
      const proposed = {
        ...conflict,
        ...fix,
      };
      
      // Re-derive defaultFrom/Until for the proposed conflict so overlap check works
      if (proposed.preferredTrainTime) {
          const { from, until } = journeyWindowAroundTarget(proposed.preferredTrainTime);
          proposed.defaultFrom = from;
          proposed.defaultUntil = until;
      }

      if ((proposed.preferredTrainTime || hasDefaultWindow(proposed)) && journeyDefaultWindowsOverlap(editing, proposed)) {
        continue;
      }
      if (conflictFixCreatesOtherClash(proposed, editing, journeys)) {
        continue;
      }

      const score = scoreActiveHoursChange(conflict, proposed);
      const start = proposed.preferredTrainTime 
        ? parseTimeToMinutes(proposed.preferredTrainTime) - 60
        : (hasDefaultWindow(proposed) ? parseTimeToMinutes(proposed.defaultFrom) : Infinity);
      
      if (score < bestScore || (score === bestScore && start < bestStart)) {
        bestScore = score;
        bestStart = start;
        best = {
          ...fix,
          cleared: !proposed.preferredTrainTime && !hasDefaultWindow(proposed),
        };
      }
    }

    return best;
  }

function applyOverlapFixForConflict(editing, conflict) {
  const fix = suggestOverlapFixForConflict(editing, conflict, getSettingsDraftJourneys());
  if (!fix) {
    return false;
  }

  const index = getSettingsDraftJourneys().findIndex((journey) => journey.id === conflict.id);
  if (index < 0) {
    return false;
  }

  const updatedConflict = {
    ...getSettingsDraftJourneys()[index],
    ...fix,
  };

  if (updatedConflict.preferredTrainTime) {
    const { from, until } = journeyWindowAroundTarget(updatedConflict.preferredTrainTime);
    updatedConflict.defaultFrom = from;
    updatedConflict.defaultUntil = until;
  } else {
    updatedConflict.defaultFrom = "";
    updatedConflict.defaultUntil = "";
  }

  getSettingsDraftJourneys()[index] = normalizeJourney(updatedConflict);
  return true;
}

/** Keep the journey being saved; adjust older conflicts in the draft without blocking Save. */
function autoResolveJourneyOverlapConflicts(editing) {
  const maxPasses = getSettingsDraftJourneys().length + 1;

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const conflict = findJourneyDefaultWindowConflict(editing, getSettingsDraftJourneys());
    if (!conflict) {
      return true;
    }

    if (applyOverlapFixForConflict(editing, conflict)) {
      continue;
    }

    const index = getSettingsDraftJourneys().findIndex((journey) => journey.id === conflict.id);
    if (index < 0) {
      return false;
    }

    getSettingsDraftJourneys()[index] = normalizeJourney({
      ...getSettingsDraftJourneys()[index],
      preferredTrainTime: "",
      defaultFrom: "",
      defaultUntil: "",
      remindMe: false,
    });
  }

  return !findJourneyDefaultWindowConflict(editing, getSettingsDraftJourneys());
}

  function applyJourneyOverlapFix() {
    if (!journeyOverlapState?.conflict || !journeyOverlapState?.updated) {
      return;
    }

    const kept = journeyOverlapState.updated;
    const conflict = journeyOverlapState.conflict;
    if (!applyOverlapFixForConflict(kept, conflict)) {
      return;
    }

    const stillConflicts = findJourneyDefaultWindowConflict(kept, getSettingsDraftJourneys());
    if (stillConflicts) {
      showJourneyOverlapError(kept, stillConflicts);
      return;
    }

    const adjusted = getSettingsDraftJourneys().find((journey) => journey.id === conflict.id);
    showJourneyOverlapFixApplied(
      adjusted ?? conflict,
      kept,
      !adjusted?.preferredTrainTime && !hasDefaultWindow(adjusted ?? conflict)
    );
  }

async function revertDetailRemindersForDeniedPermission() {
  if (detailRemindMeInput) {
    detailRemindMeInput.checked = false;
    detailRemindMeInput.dataset.userTouched = "1";
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
  if (!hasDetailTargetTrain()) {
    if (detailRemindMeInput) {
      detailRemindMeInput.checked = false;
    }
    syncDetailTargetMasterVisibility();
    detailPreferredDisplay?.focus();
    return;
  }

  const remindOn = detailRemindMeInput?.checked ?? false;

  if (!remindOn) {
    if (editingJourneyId) {
      const preferredTrainTime = readOptionalTimeField(detailPreferredField);
      await window.nextTrainApp?.persistReminderJourneys?.([
        {
          id: editingJourneyId,
          remindMe: false,
          preferredTrainTime: preferredTrainTime || "",
        },
      ]);
    }
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

  if (editingJourneyId) {
    const preferredTrainTime = readOptionalTimeField(detailPreferredField);
    await window.nextTrainApp?.persistReminderJourneys?.([
      {
        id: editingJourneyId,
        remindMe: true,
        preferredTrainTime: preferredTrainTime || "",
      },
    ]);
  }

  syncDetailTargetRemindVisibility();
  void window.nextTrainLeaveReminders?.refreshJourneyRemindExtras?.();
}

function populateDetailReminderFields(journey) {
  const hasTarget = Boolean(journey?.preferredTrainTime);
  const preferredTrainTime = journey?.preferredTrainTime || defaultPreferredTrainTime();
  const leaveBeforeOn = journey?.useLeaveBefore !== false;
  const remindOn =
    leaveBeforeOn &&
    (journey?.remindMe === true || (Boolean(preferredTrainTime) && journey?.remindMe !== false));

  if (detailUseLeaveBeforeInput) {
    detailUseLeaveBeforeInput.checked = leaveBeforeOn;
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
    preferredTrainTime
  );
  syncDetailTargetMasterVisibility();
  if (remindOn && preferredTrainTime) {
    void window.nextTrainLeaveReminders?.ensureLiveCountdownDefaultOn?.();
  }
}

function readJourneyDetailDraft() {
  if (!editingJourneyId) {
    return null;
  }

  const { station, direction } = requireJourneyRouteFromForm();
  const name = readJourneyNameFromForm(station, direction);
  const existing = getSettingsDraftJourneys().find((entry) => entry.id === editingJourneyId);
  const nameConflict = deps.findJourneyNameConflict?.(
    name,
    getSettingsDraftJourneys(),
    editingJourneyId
  );
  if (nameConflict) {
    detailJourneyNameInput?.focus?.();
    throw new Error(`Another journey is already called "${nameConflict.name}".`);
  }
  const route = existing ? isRouteJourney(existing) : libraryKind === "routes";

  if (route) {
    return normalizeJourney({
      id: editingJourneyId,
      name,
      station,
      direction,
      kind: "route",
      cityId: cityIdForStation(station) || existing?.cityId || deps.readPreferenceCity?.() || "perth",
      templateKey: existing?.templateKey,
      autoRoute: existing?.autoRoute,
    });
  }

  const remindDays = readDetailActiveDays();
  if (!remindDays.length) {
    detailActiveDayChips?.querySelector(".remind-day-chip")?.focus?.();
    throw new Error("Pick at least one active day.");
  }

  const preferredTrainTime = readOptionalTimeField(detailPreferredField);
  const remindWanted = detailRemindMeInput?.checked ?? false;

  if (!preferredTrainTime) {
    detailPreferredDisplay?.focus();
    throw new Error("Choose your target train.");
  }

  const { from: defaultFrom, until: defaultUntil } = journeyWindowAroundTarget(preferredTrainTime);

  const useLeaveBefore = detailUseLeaveBeforeInput?.checked !== false;
  const remindMe = useLeaveBefore ? remindWanted : false;

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
    kind: "journey",
    cityId: cityIdForStation(station) || existing?.cityId || deps.readPreferenceCity?.() || "perth",
    templateKey: existing?.templateKey,
    autoRoute: existing?.autoRoute,
  });
}

function updateJourneyTemplatesVisibility() {
  if (!journeyTemplatesEl) {
    return;
  }

  const atCap = libraryKind === "journeys" && isAtJourneyCap();

  if (journeyTemplatesCapHintEl) {
    journeyTemplatesCapHintEl.textContent = getJourneyCapHint();
    journeyTemplatesCapHintEl.hidden = !atCap;
  }
  if (journeySaveRouteBtnEl) {
    journeySaveRouteBtnEl.hidden = libraryKind !== "routes";
  }
  if (journeySetupBtnEl) {
    journeySetupBtnEl.hidden = atCap || libraryKind !== "journeys";
  }
  if (routesCreateActionsEl) {
    routesCreateActionsEl.hidden = libraryKind !== "routes";
  }
  if (journeysCreateActionsEl) {
    journeysCreateActionsEl.hidden = atCap || libraryKind !== "journeys";
  }

  if (libraryKind === "routes") {
    if (journeyTemplatesAddHintEl) {
      journeyTemplatesAddHintEl.hidden = true;
    }
    if (journeyTemplateShortcutsEl) {
      journeyTemplateShortcutsEl.hidden = true;
    }
    if (journeyTemplateChipsEl) {
      journeyTemplateChipsEl.hidden = true;
    }
    document.querySelectorAll(".journey-template-chip").forEach((chip) => {
      chip.hidden = true;
    });
    journeyTemplatesEl.hidden = false;
    return;
  }

  let anyShortcutVisible = false;
  const showTemplatePicker = libraryKind === "journeys";

  document.querySelectorAll(".journey-template-chip").forEach((chip) => {
    const templateKey = chip.dataset.template;
    if (templateKey === "custom") {
      chip.hidden = true;
      return;
    }

    const taken =
      templateKey === "morning" || templateKey === "evening"
        ? hasJourneyForTemplate(templateKey)
        : false;
    chip.hidden = taken || atCap;
    if (!taken && !atCap) {
      anyShortcutVisible = true;
    }
  });

  if (journeyTemplatesAddHintEl) {
    journeyTemplatesAddHintEl.hidden =
      atCap || !showTemplatePicker || !anyShortcutVisible;
  }
  const showShortcuts = !atCap && showTemplatePicker && anyShortcutVisible;
  if (journeyTemplateShortcutsEl) {
    journeyTemplateShortcutsEl.hidden = !showShortcuts;
  }
  if (journeyTemplateChipsEl) {
    journeyTemplateChipsEl.hidden = !showShortcuts;
  }

  journeyTemplatesEl.hidden = false;
}

function renderJourneyListView() {
  journeyListEl.innerHTML = "";

  for (const journey of getSettingsDraftJourneys()) {
    if (!journeyMatchesLibraryKind(journey)) {
      continue;
    }
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

    const nameRow = document.createElement("span");
    nameRow.className = "journey-list-name-row";

    const routeLabel = formatJourneyListSubtitle(journey);
    const isRouteCard = libraryKind === "routes" || isRouteJourney(journey);
    const nameEl = document.createElement("span");
    nameEl.className = "journey-list-name";
    nameEl.textContent = isRouteCard ? routeLabel : journey.name;

    const badge = document.createElement("span");
    badge.className = `journey-kind-badge journey-kind-badge--${
      isJourneyKind(journey) ? "journey" : "route"
    }`;
    badge.textContent = isJourneyKind(journey) ? "Journey" : "Route";

    const chevron = document.createElement("span");
    chevron.className = "journey-list-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "›";

    nameRow.append(nameEl, badge);
    if (isRouteCard) {
      textStack.append(nameRow);
    } else {
      const route = document.createElement("span");
      route.className = "journey-list-route";
      if (!journey.station || !journey.direction) {
        route.classList.add("journey-list-route--empty");
      }
      route.textContent = routeLabel;
      textStack.append(nameRow, route);
    }
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
  syncLibraryChrome();
  const persisted = normalizeJourneyList(getSettings().journeys);
  const persistedIds = new Set(persisted.map((journey) => journey.id));
  const unsavedDrafts = getSettingsDraftJourneys().filter(
    (journey) => !persistedIds.has(journey.id)
  );
  setSettingsDraftJourneys(
    [...persisted, ...unsavedDrafts].map((journey) => ({
      ...normalizeJourney(journey),
    }))
  );
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
    getSettingsDraftJourneys().find((entry) => entry.id === journeyId) ??
    getJourneyById(journeyId);

  if (!journey) {
    return;
  }

  journey = normalizeJourney(journey);
  editingJourneyId = journey.id;
  editingJourneySnapshot = normalizeJourney({ ...journey });
  syncDetailFormForJourneyKind(journey);
  resetDetailNearestState();
  if (deps.isPlanningAwayFromLocation?.()) {
    syncDetailNearestStationChrome({ regionAway: true, loading: false, error: false, hint: "" });
  }
  clearJourneyOverlapError();
  if (detailJourneyNameInput) {
    detailJourneyNameInput.value = journey.name || "";
  }
  const routeEditor = isRouteEditorContext(journey);
  if (!routeEditor) {
    detailLeaveBeforeInput.value = journey.leaveBeforeMinutes;
    if (detailUseLeaveBeforeInput) {
      detailUseLeaveBeforeInput.checked = journey.useLeaveBefore !== false;
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
  }
  detailDirectionSelect.innerHTML = '<option value="">Loading…</option>';
  detailDirectionSelect.disabled = true;
  syncDetailDeleteChrome(journey);
  setStationComboboxValue(getDetailStationCombobox(), journey.station || "");

  let nearestHint = null;

  if (!skipAutoRoute && shouldAutoRouteJourney(journey) && !deps.isPlanningAwayFromLocation?.()) {
    syncDetailNearestStationChrome({ loading: true, error: false, hint: "" });

    const routeResult = await applyDefaultJourneyRoute(journey);
    if (routeResult.configured && routeResult.journey) {
      const index = getSettingsDraftJourneys().findIndex((entry) => entry.id === journey.id);
      if (index >= 0) {
        getSettingsDraftJourneys()[index] = routeResult.journey;
      }
      journey = routeResult.journey;
      saveJourneyListToSettings();
      if (detailJourneyNameInput && !detailJourneyNameInput.value) {
        detailJourneyNameInput.value = journey.name || "";
      }
      setStationComboboxValue(getDetailStationCombobox(), journey.station || "");
      populateDetailReminderFields(journey);
    }

    if (routeResult.regionAway || deps.isRegionMismatchError?.(routeResult.error)) {
      syncDetailNearestStationChrome({
        loading: false,
        error: false,
        hint: "",
        regionAway: true,
      });
    } else if (routeResult.configured && routeResult.nearest) {
      nearestHint = formatNearestDistanceHint(routeResult.nearest);
      syncDetailNearestStationChrome({ loading: false, error: false, hint: nearestHint });
    } else if (routeResult.error) {
      syncDetailNearestStationChrome({
        loading: false,
        error: true,
        hint: locationErrorFrom(routeResult.error).message,
      });
    } else {
      syncDetailNearestStationChrome({ loading: false, error: false, hint: "" });
    }
  }

  try {
    await getStationsList();
  } catch (error) {
    console.warn("Could not load stations for journey detail", error);
  }

  setStationComboboxValue(getDetailStationCombobox(), journey.station);
  await loadDirectionsForSelect(detailDirectionSelect, journey.station, journey.direction);
  syncDetailNearestStationChrome({ hint: nearestHint || detailNearestState.hint });
  syncDetailFormForJourneyKind(journey);
}

function requireJourneyRouteFromForm() {
  const station = getDetailStationCombobox()?.getValue?.() || "";
  const direction = normalizeDirection(detailDirectionSelect?.value || "");

  if (!station) {
    getDetailStationCombobox()?.focus?.();
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
  if (!isRouteJourney(updated)) {
    autoResolveJourneyOverlapConflicts(updated);
  }

  const wasConfiguredBeforeSave = getSettings().journeys.some(
    (journey) => journey.id === editingJourneyId && !isUnconfiguredJourney(journey)
  );
  const isNewJourneySave = !wasConfiguredBeforeSave;
  if (
    isNewJourneySave &&
    isJourneyKind(updated) &&
    countConfiguredJourneyKind(getSettings().journeys) >= getMaxJourneys()
  ) {
    const capError = new Error(getJourneyCapHint());
    capError.code = "journey-cap";
    throw capError;
  }

  const index = getSettingsDraftJourneys().findIndex((journey) => journey.id === editingJourneyId);
  if (index >= 0) {
    getSettingsDraftJourneys()[index] = updated;
  } else {
    getSettingsDraftJourneys().push(updated);
  }

  // Drop any other unfinished shells so the list stays clean after a real save.
  setSettingsDraftJourneys(getSettingsDraftJourneys().filter(
    (journey) => journey.id === updated.id || !isUnconfiguredJourney(journey)
  ));

  const configuredBeforeSave = countConfiguredJourneys(getSettings().journeys);
  let activeJourneyId = getSettings().activeJourneyId;
  const manualOverride = readManualJourneyOverride();
  if (isNewJourneySave) {
    activeJourneyId = editingJourneyId;
    setManualJourneyOverride(editingJourneyId);
  } else if (manualOverride?.journeyId) {
    activeJourneyId = manualOverride.journeyId;
  } else if (!isOutboundJourney(updated)) {
    activeJourneyId = editingJourneyId;
  } else if (!getSettingsDraftJourneys().some((journey) => journey.id === activeJourneyId)) {
    activeJourneyId = getInboundJourney(getSettingsDraftJourneys())?.id ?? getSettingsDraftJourneys()[0]?.id ?? null;
  }

  if (configuredBeforeSave === 0) {
    markInitialJourneySetup();
    if (!isNewJourneySave) {
      activeJourneyId = getInboundJourney(getSettingsDraftJourneys())?.id ?? activeJourneyId;
    }
    document.dispatchEvent(new CustomEvent("nexttrain:journey-configured-first"));
  }

  if (updated.remindMe === true) {
    window.nextTrainStickinessCoaches?.markCoachDone?.("reminder");
    trackProductEvent("reminder_enabled", { journeyId: updated.id });
  }

  persistSettings({
    journeys: getSettingsDraftJourneys()
      .filter((journey) => !isUnconfiguredJourney(journey))
      .map((journey) => normalizeJourney(journey)),
    activeJourneyId,
  });
  void window.nextTrainLeaveReminders?.healAfterJourneySave?.();
  trackProductEvent("journey_saved", { configuredCount: countConfiguredJourneys(getSettings().journeys) });
  editingJourneySnapshot = null;
}

function openJourneyDetail(journeyId, options = {}) {
  const persistedJourney = getJourneyById(journeyId);
  if (persistedJourney) {
    setLibraryKind(isRouteJourney(persistedJourney) ? "routes" : "journeys");
  }

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

function initJourneyDetailListeners() {
  detailRemindMeInput?.addEventListener("change", () => {
    if (detailRemindMeInput) {
      detailRemindMeInput.dataset.userTouched = "1";
    }
    void handleDetailRemindToggleChange();
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
    if (deps.isPlanningAwayFromLocation?.()) {
      syncDetailNearestStationChrome({
        loading: false,
        error: false,
        hint: "",
        regionAway: true,
      });
      return;
    }
    syncDetailNearestStationChrome({ loading: true, error: false, hint: "" });
    try {
      const { station, distanceKm: km } = await findNearestStation();
      getDetailStationCombobox()?.setValue(station);
      await loadDirectionsForSelect(detailDirectionSelect, station);
      const direction = await pickDefaultDirection(station);
      if (direction) {
        detailDirectionSelect.value = direction;
      }
      syncDetailNearestStationChrome({
        loading: false,
        error: false,
        hint: formatNearestDistanceHint({ distanceKm: km }),
      });
    } catch (error) {
      if (deps.isRegionMismatchError?.(error)) {
        syncDetailNearestStationChrome({
          loading: false,
          error: false,
          hint: "",
          regionAway: true,
        });
        return;
      }
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
  clearEditingState,
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
  setLibraryKind,
  getLibraryKind,
  setDetailActiveDayChips,
  showJourneyOverlapError,
  showSettingsDetailView,
  showSettingsListView,
  syncDetailComboHints,
  syncDetailActiveDaysHint,
  syncDetailNearestStationChrome,
  syncDetailDeleteChrome,
  syncDetailTargetMasterVisibility,
  syncDetailTargetRemindVisibility,
  syncDetailFormForJourneyKind,
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
