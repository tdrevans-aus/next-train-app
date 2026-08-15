(function (global) {
  const LAST_NEARBY_STATION_KEY = "nextTrainLastNearbyStation";
  const LAST_NEARBY_STATION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  const LAST_NEARBY_BOARD_MAX_AGE_MS = 15 * 60 * 1000;
  const NEARBY_SOFT_LOCATION_MAX_AGE_MS = 2 * 60 * 1000;
  const NEARBY_PIN_HOLD_MS = 60_000;
  const NEARBY_LOCATE_COPY = "Finding your nearest station…";
  const NEARBY_BOARD_LOADING_COPY = "Loading departures…";
  /** Nearest catalog station farther than this → Perth-rail-only empty state (Near me blocked). */
  const UNSUPPORTED_REGION_KM = 50;
  /** Keep calm on a normal GPS fix (~1–4s). Offer escape only when it is actually slow. */
  const NEARBY_LOCATE_DONT_WAIT_MS = 7000;
  /** While the system permission sheet is up, offer escape sooner so the 7s GPS wait is fair. */
  const NEARBY_LOCATE_PERMISSION_ESCAPE_MS = 2500;
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
function classifyNearbyError(message) {
  const lower = String(message || "").toLowerCase();
  if (
    lower.includes("departures") ||
    lower.includes("times") ||
    lower.includes("board") ||
    lower.includes("directions") ||
    lower.includes("unavailable")
  ) {
    return "board";
  }
  return "location";
}

function setNearbyError(message, kind = null) {
  nearbyError = message;
  nearbyErrorKind = kind || (message ? classifyNearbyError(message) : null);
}

function clearNearbyError() {
  nearbyError = null;
  nearbyErrorKind = null;
}


function getNearbyLeaveBeforeMinutes() {
  return Number(getSettings().nearbyLeaveBeforeMinutes) || DEFAULT_LEAVE_BEFORE.leaveBeforeMinutes;
}

function updateNearbyLeaveBeforeLabel(minutes = nearbyLeaveBeforeInput?.value) {
  if (nearbyLeaveBeforeValueEl) {
    nearbyLeaveBeforeValueEl.textContent = formatLeaveBeforeLabel(minutes);
  }
  syncNearbyLeaveBeforeSliderFill(minutes);
}

function syncNearbyLeaveBeforeSliderFill(minutes = nearbyLeaveBeforeInput?.value) {
  if (!nearbyLeaveBeforeInput) {
    return;
  }
  const min = Number(nearbyLeaveBeforeInput.min) || 1;
  const max = Number(nearbyLeaveBeforeInput.max) || 30;
  const value = Number(minutes);
  const clamped = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
  const pct = max === min ? 0 : ((clamped - min) / (max - min)) * 100;
  nearbyLeaveBeforeInput.style.setProperty("--leave-before-pct", `${pct}%`);
}

function rescheduleNearbyPinReminders() {
  if (!isNativeApp()) {
    return;
  }
  window.nextTrainLeaveReminders?.reschedule?.();
}

function dismissNearbyPinLeaveCard() {
  if (nearbySession) {
    nearbySession.pinLeaveCardHidden = true;
  }
  if (deps.leaveCardEl) {
    deps.leaveCardEl.hidden = true;
  }
  hideNearbyPinLeaveSurfaces();
}

function clearNearbyPinLeaveCardDismissed() {
  if (nearbySession) {
    nearbySession.pinLeaveCardHidden = false;
  }
}

function isUnsupportedRegion(distanceKm) {
  return typeof distanceKm === "number" && distanceKm > UNSUPPORTED_REGION_KM;
}

function renderUnsupportedRegionBoard() {
  setLastRenderedNext(null);
  deps.errorEl.hidden = true;
  setRouteDisplay("Near me");
  deps.updatedEl.textContent = "";
  deps.updatedEl.hidden = true;
  setHeroUrgency("calm");
  deps.heroEl?.classList.remove("locating");
  deps.heroEl.classList.add("hero-setup");

  if (deps.heroDepartLabelEl) {
    deps.heroDepartLabelEl.hidden = true;
  }
  if (deps.departDisplayTimeEl) {
    deps.departDisplayTimeEl.hidden = true;
  }
  if (deps.heroScheduledTimeEl) {
    deps.heroScheduledTimeEl.hidden = true;
  }
  if (deps.leaveCardEl) {
    deps.leaveCardEl.hidden = true;
    deps.leaveCardEl.classList.remove("leave-card--context");
  }
  if (nearbyDirectionsEl) {
    nearbyDirectionsEl.hidden = true;
  }
  if (nearbyFallbackEl) {
    nearbyFallbackEl.hidden = true;
  }
  if (nearbyDirectionsListEl) {
    nearbyDirectionsListEl.innerHTML = "";
  }

  if (deps.departCountdownEl) {
    deps.departCountdownEl.classList.add("hero-setup-message");
    deps.departCountdownEl.replaceChildren();

    const title = document.createElement("span");
    title.className = "hero-empty-title";
    title.textContent = "Perth rail only";

    const text = document.createElement("span");
    text.className = "hero-empty-text";
    text.textContent =
      "Next Train's Near me board works near Transperth stations. You're outside that area right now.";

    const hint = document.createElement("span");
    hint.className = "hero-empty-hint";
    hint.textContent =
      "You can still save journeys under My Journeys for when you're in Perth.";

    const emptyJourneysBtn = document.createElement("button");
    emptyJourneysBtn.type = "button";
    emptyJourneysBtn.className = "btn-primary hero-empty-primary";
    emptyJourneysBtn.textContent = "My Journeys";
    emptyJourneysBtn.addEventListener("click", () => deps.enterJourneyMode?.());

    deps.departCountdownEl.append(title, text, hint, deps.journeysBtn);
  }

  deps.heroEl.removeAttribute("role");
  deps.heroEl.removeAttribute("tabindex");
  deps.heroEl.removeAttribute("aria-label");
  deps.heroEl.onclick = null;
  deps.heroEl.onkeydown = null;
  deps.platformEl.textContent = "—";
  deps.statusEl.textContent = "—";
  deps.followingSectionEl.hidden = true;
  if (deps.journeySwitcherEl) {
    deps.journeySwitcherEl.hidden = true;
  }
  if (deps.journeySwitcherMenuEl) {
    deps.journeySwitcherMenuEl.hidden = true;
  }
  updateSwipeHint();
  updateSwipeCues();
  updateLeaveHint();
}

function isNearbyModeActive() {
  return !getJourneyModeActive();
}

function isNearbyFaceReadyForOnboarding() {
  if (!isNearbyModeActive()) {
    return false;
  }

  if (nearbyLoading || nearbyBoardInflight || shouldShowNearbyLoadingState()) {
    return false;
  }

  if (nearbySession?.gpsRefining) {
    return false;
  }

  if (!nearbySession?.station) {
    if (nearbyLocatePickerVisible && !nearbyUserPickedStation) {
      return true;
    }

    if (
      nearbyError &&
      (nearbyErrorKind === "location" || classifyNearbyError(nearbyError) === "location")
    ) {
      return true;
    }

    return false;
  }

  if (!nearbyBoard || nearbyError) {
    return false;
  }

  return true;
}

function syncChromeMode() {
  const nearbyActive = isNearbyModeActive();
  const journeyActive = isJourneyModeActive();

  deps.appEl?.classList.toggle("nearby-mode", nearbyActive && Boolean(nearbySession));
  deps.appEl?.classList.toggle("journey-mode", journeyActive);

  nearbyChromeAction?.classList.toggle("chrome-action--active", nearbyActive);
  nearbyBtn?.classList.toggle("icon-btn--active", nearbyActive);
  nearbyBtn?.setAttribute("aria-pressed", nearbyActive ? "true" : "false");
  nearbyBtn?.setAttribute("aria-label", "Near me");

  deps.journeysChromeAction?.classList.toggle("chrome-action--active", journeyActive);
  deps.journeysBtn?.classList.toggle("icon-btn--active", journeyActive);
  deps.journeysBtn?.setAttribute("aria-pressed", journeyActive ? "true" : "false");

  syncJourneyContextChrome();
}

function syncNearbyChrome() {
  syncChromeMode();
}

function formatNearbyRouteLine() {
  if (!nearbySession?.station) {
    return "Near you";
  }

  const label = formatStationLabel(nearbySession.station);
  if (typeof nearbySession.distanceKm === "number") {
    return `Near you · ${label} (${nearbySession.distanceKm.toFixed(1)} km)`;
  }
  return `Near you · ${label}`;
}

function readLastNearbyStationCache() {
  try {
    const raw = localStorage.getItem(LAST_NEARBY_STATION_KEY);
    if (!raw) {
      return null;
    }

    const data = JSON.parse(raw);
    if (!data?.station) {
      return null;
    }

    if (
      typeof data.savedAtMs === "number" &&
      Date.now() - data.savedAtMs > LAST_NEARBY_STATION_MAX_AGE_MS
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function readCachedNearbyBoard(cache = readLastNearbyStationCache()) {
  if (!cache?.station || !cache?.board?.entries?.length) {
    return null;
  }
  if (
    typeof cache.boardSavedAtMs !== "number" ||
    Date.now() - cache.boardSavedAtMs > LAST_NEARBY_BOARD_MAX_AGE_MS
  ) {
    return null;
  }
  return cache.board;
}

function writeLastNearbyStationCache({ station, distanceKm = null, board = undefined } = {}) {
  if (!station) {
    return;
  }

  let previous = null;
  try {
    previous = JSON.parse(localStorage.getItem(LAST_NEARBY_STATION_KEY) || "null");
  } catch {
    previous = null;
  }

  const nextBoard = board === undefined ? previous?.board ?? null : board;
  const nextBoardSavedAtMs =
    board === undefined
      ? previous?.boardSavedAtMs ?? null
      : board
        ? Date.now()
        : null;

  const payload = {
    station,
    distanceKm: typeof distanceKm === "number" ? distanceKm : null,
    savedAtMs: Date.now(),
    board: nextBoard,
    boardSavedAtMs: nextBoardSavedAtMs,
  };

  try {
    localStorage.setItem(LAST_NEARBY_STATION_KEY, JSON.stringify(payload));
  } catch {
    // Board snapshots can be large — fall back to station-only so reopen still skips GPS wait.
    try {
      localStorage.setItem(
        LAST_NEARBY_STATION_KEY,
        JSON.stringify({
          station: payload.station,
          distanceKm: payload.distanceKm,
          savedAtMs: payload.savedAtMs,
          board: null,
          boardSavedAtMs: null,
        })
      );
    } catch {
      // Ignore — cache is best-effort.
    }
  }
}

function clearLastNearbyStationCache() {
  localStorage.removeItem(LAST_NEARBY_STATION_KEY);
}

function getNearbySkip(direction) {
  return nearbySession?.skipByDirection?.[direction] ?? 0;
}

function setNearbySkip(direction, skip) {
  if (!nearbySession) {
    return;
  }

  if (!nearbySession.skipByDirection) {
    nearbySession.skipByDirection = {};
  }

  if (skip <= 0) {
    delete nearbySession.skipByDirection[direction];
  } else {
    nearbySession.skipByDirection[direction] = skip;
  }
}

function getNearbyPin() {
  return nearbySession?.pin ?? null;
}

function clearNearbyPin() {
  if (nearbySession) {
    nearbySession.pin = null;
    clearNearbyPinLeaveCardDismissed();
  }
  if (getSettings().nearbyPin) {
    persistSettings({ nearbyPin: null });
    rescheduleNearbyPinReminders();
  }
  syncNearbyPinChrome();
}

function buildNearbyPinSettingsSnapshot() {
  const pin = getNearbyPin();
  if (!pin || !isNearbyPinHolding(pin)) {
    return null;
  }

  return {
    station: pin.station,
    direction: pin.direction,
    departureIso: pin.departureIso,
    notifyMe: nearbySession?.pinNotifyMe === true,
    holdingUntilMs: nearbyPinExpiryMs(pin),
    displayTime: pin.trip?.displayTime ?? "",
    platform: pin.trip?.platform ?? "—",
    status: pin.trip?.status ?? "On Time",
  };
}

function syncNearbyPinSettings() {
  const snapshot = buildNearbyPinSettingsSnapshot();
  const current = getSettings().nearbyPin;
  const same =
    (!snapshot && !current) ||
    (snapshot &&
      current &&
      JSON.stringify(snapshot) === JSON.stringify(current));
  if (!same) {
    persistSettings({ nearbyPin: snapshot });
    rescheduleNearbyPinReminders();
  }
}

function restoreNearbySessionPinFromSettings() {
  const pin = getSettings().nearbyPin;
  if (!pin || !nearbySession?.station || pin.station !== nearbySession.station) {
    return;
  }

  if (!deps.isNearbyPinSettingsHolding?.(pin)) {
    if (getSettings().nearbyPin) {
      persistSettings({ nearbyPin: null });
    }
    return;
  }

  nearbySession.pin = {
    station: pin.station,
    direction: pin.direction,
    departureIso: pin.departureIso,
    trip: {
      displayTime: pin.displayTime,
      departure: pin.departureIso,
      arrival: pin.departureIso,
      platform: pin.platform,
      status: pin.status,
    },
  };
  nearbySession.pinNotifyMe = pin.notifyMe === true;
}

function buildNearbyLeaveNext(trip) {
  return buildNextFromFollowing(trip, getNearbyLeaveBeforeMinutes(), resolveTripDeparture(trip));
}

function hideNearbyPinLeaveSurfaces() {
  if (nearbyPinLeaveControlsEl) {
    nearbyPinLeaveControlsEl.hidden = true;
  }
}

function renderNearbyPinLeaveSurfaces(next, pinned) {
  if (!pinned || !next) {
    if (deps.leaveCardEl) {
      deps.leaveCardEl.hidden = true;
    }
    hideNearbyPinLeaveSurfaces();
    syncNearbyPinChrome();
    return;
  }

  if (nearbySession?.pinLeaveCardHidden) {
    if (deps.leaveCardEl) {
      deps.leaveCardEl.hidden = true;
    }
    syncNearbyPinChrome();
    return;
  }

  const leaveNext = buildNearbyLeaveNext(next);
  const live = getLiveTiming(leaveNext);
  const pastLeaveBy = isLeavePhasePastLeaveBy(live.leavePhase);

  if (deps.leaveCardEl) {
    deps.leaveCardEl.hidden = false;
    deps.leaveCardEl.classList.remove("leave-card--context", "leave-card--acknowledged");
  }
  if (nearbyPinLeaveControlsEl) {
    nearbyPinLeaveControlsEl.hidden = false;
  }
  if (nearbyNotifySectionEl) {
    nearbyNotifySectionEl.hidden = pastLeaveBy;
  }
  if (nearbyPinLeaveFooterEl) {
    nearbyPinLeaveFooterEl.classList.toggle("nearby-pin-leave-footer--hide-only", pastLeaveBy);
  }
  if (nearbyLeaveHideBtn) {
    nearbyLeaveHideBtn.hidden = false;
  }
  if (deps.leaveCardLabelEl) {
    deps.leaveCardLabelEl.textContent = formatLeaveCardLabel(live.leavePhase);
  }
  if (deps.leaveTimeEl) {
    renderLeaveMinutesCountdown(deps.leaveTimeEl, leaveNext);
  }
  if (deps.leaveCountdownEl) {
    deps.leaveCountdownEl.textContent = formatLeaveCardSubline(leaveNext);
  }
  updateLeaveCardState(live.leavePhase);

  const showLateNag = live.leavePhase === "late" || live.leavePhase === "missed";
  if (deps.leaveCardActionsEl) {
    deps.leaveCardActionsEl.hidden = !showLateNag;
    deps.leaveCardActionsEl.classList.toggle("leave-card-actions--visible", showLateNag);
  }
  if (deps.leaveBufferEditBtn) {
    deps.leaveBufferEditBtn.hidden = true;
  }

  if (nearbyLeaveBeforeInput) {
    nearbyLeaveBeforeInput.value = String(getNearbyLeaveBeforeMinutes());
    updateNearbyLeaveBeforeLabel(getNearbyLeaveBeforeMinutes());
  }
  if (nearbyNotifyMeInput) {
    nearbyNotifyMeInput.checked = nearbySession?.pinNotifyMe === true;
  }

  syncNearbyPinChrome();
}


async function handleNearbyNotifyToggle() {
  if (!nearbySession) {
    return;
  }

  const notifyOn = nearbyNotifyMeInput?.checked ?? false;
  nearbySession.pinNotifyMe = notifyOn;

  if (notifyOn) {
    const reminderSettings = await window.nextTrainLeaveReminders?.enableLeaveReminders?.({
      userInitiated: true,
    });
    if (reminderSettings?.permissionGranted === false) {
      nearbySession.pinNotifyMe = false;
      if (nearbyNotifyMeInput) {
        nearbyNotifyMeInput.checked = false;
      }
    }
  }

  if (isNearbyPinHolding()) {
    syncNearbyPinSettings();
  }
}

function nearbyPinExpiryMs(pin = getNearbyPin()) {
  if (!pin?.departureIso) {
    return 0;
  }
  const departureMs = Date.parse(pin.departureIso);
  if (!Number.isFinite(departureMs)) {
    return 0;
  }
  return departureMs + NEARBY_PIN_HOLD_MS;
}

function isNearbyPinHolding(pin = getNearbyPin()) {
  if (!pin || !nearbySession?.station) {
    return false;
  }
  if (pin.station !== nearbySession.station) {
    return false;
  }
  return Date.now() < nearbyPinExpiryMs(pin);
}

function isNearbyPinShowing(direction = nearbySession?.focusedDirection) {
  const pin = getNearbyPin();
  return Boolean(isNearbyPinHolding(pin) && pin.direction === direction);
}

function setNearbyPinFromTrip(direction, trip) {
  if (!nearbySession?.station || !direction || !trip) {
    return;
  }

  const departureIso = resolveTripDeparture(trip);
  if (!departureIso) {
    return;
  }

  nearbySession.pin = {
    station: nearbySession.station,
    direction,
    departureIso,
    trip: {
      ...trip,
      departure: departureIso,
      arrival: departureIso,
      platform: trip.platform ?? "—",
      status: trip.status ?? "On Time",
    },
  };
  clearNearbyPinLeaveCardDismissed();
}

/**
 * When a Near me pin is active for this direction, keep that departure selected
 * (and hold a snapshot for up to 1 minute after it leaves).
 */
function applyNearbyPinToData(direction, data) {
  const pin = getNearbyPin();
  if (!pin || pin.direction !== direction || pin.station !== nearbySession?.station) {
    return applyNearbySkip(data, getNearbySkip(direction));
  }

  if (!isNearbyPinHolding(pin)) {
    clearNearbyPin();
    setNearbySkip(direction, 0);
    return applyNearbySkip(data, 0);
  }

  const normalized = normalizeApiTrainData(data);
  const upcoming = getUpcomingTrips(normalized);
  const idx = upcoming.findIndex(
    (trip) => resolveTripDeparture(trip) === pin.departureIso
  );

  if (idx >= 0) {
    const live = upcoming[idx];
    setNearbySkip(direction, idx);
    nearbySession.pin = {
      ...pin,
      trip: { ...live, departure: pin.departureIso, arrival: pin.departureIso },
    };
    return applyNearbySkip(normalized, idx);
  }

  // Train already dropped from the board — keep showing it through the hold window.
  const snapshot = ensureFullNext(
    pin.trip ?? { departure: pin.departureIso, arrival: pin.departureIso },
    0,
    pin.departureIso
  );
  const realNext = normalized.next;
  return {
    ...normalized,
    next: snapshot,
    following: realNext ? slimFollowing(realNext) : null,
  };
}

function applyNearbySkip(data, skip) {
  if (!data || skip <= 0) {
    return data;
  }

  const normalized = normalizeApiTrainData(data);
  if (!normalized.upcoming?.length) {
    return normalized;
  }

  const cappedSkip = Math.min(skip, normalized.upcoming.length - 1);
  const referenceIso = normalized.next?.departure ?? normalized.next?.arrival;
  const next = ensureFullNext(normalized.upcoming[cappedSkip] ?? normalized.next, 0, referenceIso);
  const followingTrip = normalized.upcoming[cappedSkip + 1] ?? null;
  const following = getNextThenTrain(normalized, cappedSkip) ?? (followingTrip ? slimFollowing(followingTrip) : null);

  return {
    ...normalized,
    next,
    following,
  };
}

async function fetchNearbyDirectionData(station, direction, skip = 0) {
  const pinHolds =
    isNearbyPinHolding() &&
    getNearbyPin()?.direction === direction &&
    getNearbyPin()?.station === station;
  const requestSkip = pinHolds ? 0 : skip;

  const params = new URLSearchParams({
    station,
    direction,
    destination: direction,
    leaveBefore: "0",
    refresh: String(settings.refreshSeconds),
    skipTrains: String(requestSkip),
  });

  const fixture = getActiveFixture() || (isTestMode() ? "normal" : null);
  if (fixture) {
    params.set("fixture", fixture);
  }

  const result = await fetchJson(apiUrl(`/api/next-train?${params}`));
  if (!result.ok) {
    throw new Error(result.data?.error ?? result.error ?? "Could not load train times");
  }

  let payload = result.data;
  if (!Array.isArray(payload?.upcoming) || payload.upcoming.length === 0) {
    const client = window.NextTrainTimes;
    if (client?.getNextTrainData) {
      try {
        payload =
          (await client.getNextTrainData({
            station,
            destination: direction,
            destinationLabel: direction,
            leaveBeforeMinutes: 0,
            refreshSeconds: settings.refreshSeconds,
            skipTrains: requestSkip,
          })) ?? payload;
      } catch (error) {
        console.warn("Nearby live-times fallback failed", error);
      }
    }
  }

  const normalized = normalizeApiTrainData(payload);
  if (pinHolds) {
    return applyNearbyPinToData(direction, normalized);
  }
  return applyNearbySkip(normalized, skip);
}

function pickSoonestNearbyDirection(entries) {
  let best = null;

  for (const entry of entries) {
    if (!entry.data?.next) {
      continue;
    }

    const minutes = getLiveTiming(entry.data.next).minutesUntilDeparture;
    if (!best || minutes < best.minutes) {
      best = { direction: entry.direction, minutes };
    }
  }

  return best?.direction ?? entries[0]?.direction ?? null;
}

function getNearbyFocusedEntry() {
  if (!nearbyBoard?.entries?.length) {
    return null;
  }

  const focused = nearbySession?.focusedDirection;
  const match = nearbyBoard.entries.find((entry) => entry.direction === focused);
  return match ?? nearbyBoard.entries.find((entry) => entry.data?.next) ?? nearbyBoard.entries[0];
}

function formatNearbyDirectionRow(entry) {
  const next = entry.data?.next;
  if (!next) {
    return `to ${entry.direction} · —`;
  }

  const minutes = getLiveTiming(next).minutesUntilDeparture;
  const minuteLabel = minutes <= 0 ? "now" : minutes === 1 ? "1 min" : `${minutes} min`;
  const platform = next.platform ? `Pl ${next.platform}` : "—";
  return `to ${entry.direction} · ${minuteLabel} · ${platform}`;
}

async function ensureNearbyStationOptions({ force = false } = {}) {
  if (!getNearbyStationCombobox()) {
    return;
  }

  if (!force && window.nextTrainStationCombobox?.getStationsCache?.()?.length) {
    setStationComboboxValue(getNearbyStationCombobox(), nearbySession?.station ?? "");
    return;
  }

  await getStationsList();
  setStationComboboxValue(getNearbyStationCombobox(), nearbySession?.station ?? "");
}

function stopNearbyLocateTimers() {
  if (nearbyLocateTimer) {
    clearInterval(nearbyLocateTimer);
    nearbyLocateTimer = null;
  }
  if (nearbyLocateDontWaitTimer) {
    clearTimeout(nearbyLocateDontWaitTimer);
    nearbyLocateDontWaitTimer = null;
  }
}

function syncNearbyDontWaitButton() {
  if (!nearbyDontWaitBtn) {
    return;
  }

  const show = nearbyLoading && nearbyDontWaitVisible && !nearbyLocatePickerVisible;
  nearbyDontWaitBtn.hidden = !show;
}

function showNearbyDontWaitOffer() {
  if (nearbyDontWaitVisible || nearbyLocatePickerVisible) {
    return;
  }

  nearbyDontWaitVisible = true;
  syncNearbyDontWaitButton();
}

function showNearbyEarlyPicker() {
  if (!nearbyDirectionsEl || nearbyLocatePickerVisible) {
    return;
  }

  nearbyLocatePickerVisible = true;
  nearbyDontWaitVisible = false;
  syncNearbyDontWaitButton();
  nearbyDirectionsEl.hidden = false;
  if (nearbyDirectionsListEl) {
    nearbyDirectionsListEl.innerHTML = "";
  }
  const directionsLabel = nearbyDirectionsEl.querySelector(".nearby-directions-label");
  if (directionsLabel) {
    directionsLabel.hidden = true;
  }
  nearbyFallbackEl.hidden = false;
  if (nearbyFallbackTextEl) {
    nearbyFallbackTextEl.textContent = "Choose a station — we’ll show the next train.";
  }
  ensureNearbyStationOptions();
}

function dismissNearbyLocatePicker() {
  nearbyLocatePickerVisible = false;
}

function shouldShowNearbyLoadingState() {
  if (nearbySession?.unsupportedRegion) {
    return false;
  }

  if (nearbyLocatePickerVisible && !nearbySession?.station && !nearbyUserPickedStation) {
    return false;
  }

  if (nearbyError && !nearbySession?.station) {
    return false;
  }

  return (
    nearbyLoading ||
    Boolean(nearbyBoardInflight) ||
    (Boolean(nearbySession?.station) && !nearbyBoard && !nearbyError)
  );
}

function nearbyLoadingRouteCopy() {
  return nearbySession?.station ? formatNearbyRouteLine() : NEARBY_LOCATE_COPY;
}

function nearbyLoadingHeroCopy() {
  return nearbySession?.station ? NEARBY_BOARD_LOADING_COPY : NEARBY_LOCATE_COPY;
}

function startNearbyLocateTimers(delayMs = NEARBY_LOCATE_DONT_WAIT_MS) {
  stopNearbyLocateTimers();
  nearbyLocateStartedAt = Date.now();
  nearbyLocatePickerVisible = false;
  nearbyDontWaitVisible = false;
  syncNearbyDontWaitButton();

  nearbyLocateDontWaitTimer = window.setTimeout(() => {
    nearbyLocateDontWaitTimer = null;
    if (
      !isNearbyModeActive() ||
      !nearbyLoading ||
      nearbyLocatePickerVisible ||
      nearbyUserPickedStation
    ) {
      return;
    }
    showNearbyDontWaitOffer();
    renderNearbyBoard();
  }, delayMs);
}

function isNearbyLocateCurrent(generation) {
  return generation === nearbyLocateGeneration && Boolean(nearbySession);
}

async function locateNearbyInBackground({ forceFresh = false } = {}) {
  const generation = ++nearbyLocateGeneration;
  const previousStation = nearbySession?.station ?? null;

  try {
    // Soft by default: reuse a recent fused fix. Never short-circuit on session station —
    // that's what the optimistic cache paint sets, and we still need a real nearest check.
    const nearest = await deps.findNearestStation?.({
      forceFresh,
      allowSessionShortcut: false,
    });
    // User may have left Near me (or started a newer locate) while GPS resolved.
    if (!isNearbyLocateCurrent(generation)) {
      return;
    }

    if (nearbyUserPickedStation) {
      writeLastNearbyStationCache({
        station: nearbySession?.station,
        distanceKm: nearbySession?.distanceKm,
      });
      stopNearbyLocateTimers();
      nearbyLoading = false;
      setNearbyGpsRefining(false);
      dismissNearbyLocatePicker();
      nearbyDontWaitVisible = false;
      syncNearbyDontWaitButton();
      renderNearbyBoard();
      return;
    }

    if (nearbyLocatePickerVisible) {
      stopNearbyLocateTimers();
      nearbyLoading = false;
      setNearbyGpsRefining(false);
      syncNearbyDontWaitButton();
      renderNearbyBoard();
      return;
    }

    if (isUnsupportedRegion(nearest.distanceKm)) {
      clearLastNearbyStationCache();
      nearbySession.unsupportedRegion = true;
      nearbySession.station = null;
      nearbySession.distanceKm = nearest.distanceKm;
      nearbySession.fromCache = false;
      setNearbyGpsRefining(false);
      nearbyBoard = null;
      nearbyLoading = false;
      stopNearbyLocateTimers();
      nearbyLocatePickerVisible = false;
      nearbyDontWaitVisible = false;
      syncNearbyDontWaitButton();
      renderNearbyBoard();
      return;
    }

    const stationChanged = Boolean(previousStation && nearest.station !== previousStation);

    nearbySession.unsupportedRegion = false;
    nearbySession.fromCache = false;
    setNearbyGpsRefining(false);
    nearbySession.station = nearest.station;
    nearbySession.distanceKm = nearest.distanceKm;
    if (stationChanged) {
      clearNearbyPin();
      nearbySession.refineNotice = "Updated to nearest station";
    }
    writeLastNearbyStationCache({
      station: nearest.station,
      distanceKm: nearest.distanceKm,
    });
    stopNearbyLocateTimers();
    nearbyLocatePickerVisible = false;
    nearbyDontWaitVisible = false;
    syncNearbyDontWaitButton();
    try {
      if (stationChanged || !nearbyBoard) {
        await fetchNearbyBoard();
      }
      if (!isNearbyLocateCurrent(generation)) {
        return;
      }
      clearNearbyError();
    } catch (error) {
      if (!isNearbyLocateCurrent(generation)) {
        return;
      }
      setNearbyError(error.message ?? "Could not load departures for this station", "board");
    } finally {
      if (isNearbyLocateCurrent(generation)) {
        nearbyLoading = false;
      }
    }
    if (!isNearbyLocateCurrent(generation)) {
      return;
    }
    renderNearbyBoard();
  } catch (error) {
    stopNearbyLocateTimers();
    if (!isNearbyLocateCurrent(generation)) {
      return;
    }
    setNearbyGpsRefining(false);
    nearbyLoading = false;
    nearbyDontWaitVisible = false;
    syncNearbyDontWaitButton();
    if (!nearbySession.station && !nearbyUserPickedStation) {
      setNearbyError(locationErrorFrom(error).message, "location");
      renderNearbyBoard();
      return;
    }

    if (nearbySession.station) {
      try {
        if (!nearbyBoard) {
          await fetchNearbyBoard();
        }
        if (!isNearbyLocateCurrent(generation)) {
          return;
        }
        clearNearbyError();
        renderNearbyBoard();
      } catch (fetchError) {
        if (!isNearbyLocateCurrent(generation)) {
          return;
        }
        deps.errorEl.textContent = fetchError.message;
        deps.errorEl.hidden = false;
        renderNearbyBoard({ stale: true });
      }
    }
  }
}

function showNearbyFallback(message) {
  setNearbyError(message);
  nearbyDirectionsEl.hidden = false;
  nearbyDirectionsListEl.innerHTML = "";
  nearbyFallbackEl.hidden = false;
  if (nearbyFallbackTextEl) {
    nearbyFallbackTextEl.textContent = message;
  }
  ensureNearbyStationOptions();
}

function renderNearbyDirectionsList() {
  if (!nearbyDirectionsListEl || !nearbyBoard?.entries?.length) {
    return;
  }

  nearbyFallbackEl.hidden = true;
  nearbyDirectionsListEl.innerHTML = "";
  const directionsLabel = nearbyDirectionsEl?.querySelector(".nearby-directions-label");
  if (directionsLabel) {
    directionsLabel.hidden = false;
  }
  const focused = nearbySession?.focusedDirection;

  for (const entry of nearbyBoard.entries) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nearby-direction-row";
    if (entry.direction === focused) {
      button.classList.add("active");
    }
    button.textContent = formatNearbyDirectionRow(entry);
    button.addEventListener("click", () => {
      focusNearbyDirection(entry.direction);
    });
    item.appendChild(button);
    nearbyDirectionsListEl.appendChild(item);
  }
}

function renderNearbyBoard({ stale = false } = {}) {
  if (!isNearbyModeActive()) {
    return;
  }

  syncNearbyChrome();
  deps.errorEl.hidden = true;
  clearHeroSetupState();

  if (shouldShowNearbyLoadingState()) {
    setLastRenderedNext(null);
    setRouteDisplay(nearbyLoadingRouteCopy());
    setHeroUrgency("calm");
    deps.heroEl?.classList.add("locating");
    if (deps.heroDepartLabelEl) {
      deps.heroDepartLabelEl.textContent = "Next Train";
    }
    if (deps.departCountdownEl) {
      deps.departCountdownEl.innerHTML =
        '<span class="locate-spinner locate-spinner--hero" aria-hidden="true"></span>';
    }
    if (deps.departDisplayTimeEl) {
      deps.departDisplayTimeEl.textContent = nearbyLoadingHeroCopy();
    }
    if (deps.heroScheduledTimeEl) {
      deps.heroScheduledTimeEl.hidden = true;
    }
    if (deps.leaveCardEl) {
      deps.leaveCardEl.hidden = true;
    }
    if (nearbyLocatePickerVisible) {
      nearbyDirectionsEl.hidden = false;
      if (nearbyDirectionsListEl) {
        nearbyDirectionsListEl.innerHTML = "";
      }
      const directionsLabel = nearbyDirectionsEl.querySelector(".nearby-directions-label");
      if (directionsLabel) {
        directionsLabel.hidden = true;
      }
      nearbyFallbackEl.hidden = false;
      if (nearbyFallbackTextEl) {
        nearbyFallbackTextEl.textContent = "Choose a station — we’ll show the next train.";
      }
      void ensureNearbyStationOptions();
    } else {
      nearbyDirectionsEl.hidden = true;
    }
    syncNearbyDontWaitButton();
    deps.followingSectionEl.hidden = true;
    if (nearbySession?.gpsRefining) {
      deps.updatedEl.textContent = "Checking location…";
    } else {
      deps.updatedEl.textContent = "Updating…";
    }
    updateSwipeHint();
    updateSwipeCues();
    return;
  }

  deps.heroEl?.classList.remove("locating");
  nearbyDontWaitVisible = false;
  syncNearbyDontWaitButton();

  if (nearbyLocatePickerVisible && !nearbySession?.station && !nearbyUserPickedStation) {
    setLastRenderedNext(null);
    setRouteDisplay("Near me");
    setHeroUrgency("calm");
    if (deps.heroDepartLabelEl) {
      deps.heroDepartLabelEl.textContent = "Next Train";
    }
    if (deps.departCountdownEl) {
      deps.departCountdownEl.textContent = "—";
    }
    if (deps.departDisplayTimeEl) {
      deps.departDisplayTimeEl.textContent = "Choose a station below";
    }
    if (deps.heroScheduledTimeEl) {
      deps.heroScheduledTimeEl.hidden = true;
    }
    if (deps.leaveCardEl) {
      deps.leaveCardEl.hidden = true;
    }
    nearbyDirectionsEl.hidden = false;
    nearbyFallbackEl.hidden = false;
    if (nearbyFallbackTextEl) {
      nearbyFallbackTextEl.textContent = "Choose a station below";
    }
    void ensureNearbyStationOptions();
    deps.platformEl.textContent = "—";
    deps.statusEl.textContent = "—";
    deps.followingSectionEl.hidden = true;
    deps.updatedEl.textContent = "Choose a station below";
    updateSwipeHint();
    updateSwipeCues();
    maybeScheduleOnboarding();
    return;
  }

  if (nearbySession?.unsupportedRegion) {
    renderUnsupportedRegionBoard();
    maybeScheduleOnboarding();
    return;
  }

  if (nearbyError) {
    setRouteDisplay(formatNearbyRouteLine());
    setHeroUrgency("calm");
    if (deps.heroDepartLabelEl) {
      deps.heroDepartLabelEl.textContent = "Near me";
    }
    if (deps.departCountdownEl) {
      deps.departCountdownEl.textContent = "—";
    }
    if (deps.departDisplayTimeEl) {
      const kind = nearbyErrorKind || classifyNearbyError(nearbyError);
      deps.departDisplayTimeEl.textContent =
        kind === "board" ? "Times unavailable" : "Location needed";
    }
    if (deps.heroScheduledTimeEl) {
      deps.heroScheduledTimeEl.hidden = true;
    }
    if (deps.leaveCardEl) {
      deps.leaveCardEl.hidden = true;
    }
    showNearbyFallback(nearbyError);
    deps.platformEl.textContent = "—";
    deps.statusEl.textContent = "—";
    deps.followingSectionEl.hidden = true;
    deps.updatedEl.textContent = stale ? "Update failed — times may be out of date" : "Choose a station below";
    updateSwipeHint();
    updateSwipeCues();
    maybeScheduleOnboarding();
    return;
  }

  const focusedEntry = getNearbyFocusedEntry();
  let boardData = focusedEntry?.data ?? null;
  if (focusedEntry?.direction && boardData && isNearbyPinShowing(focusedEntry.direction)) {
    // Re-apply pin against the cached board so skip stays locked between fetches.
    boardData = applyNearbyPinToData(focusedEntry.direction, boardData);
    focusedEntry.data = boardData;
  } else if (getNearbyPin() && !isNearbyPinHolding()) {
    const expiredDirection = getNearbyPin()?.direction;
    clearNearbyPin();
    if (expiredDirection) {
      setNearbySkip(expiredDirection, 0);
      void fetchNearbyBoard()
        .then(() => renderNearbyBoard())
        .catch(() => renderNearbyBoard({ stale: true }));
      return;
    }
  }

  const next = boardData?.next ?? null;
  setRouteDisplay(formatNearbyRouteLine());
  if (nearbySession?.refineNotice) {
    deps.updatedEl.textContent = nearbySession.refineNotice;
    nearbySession.refineNotice = null;
  } else if (nearbySession?.gpsRefining) {
    deps.updatedEl.textContent = "Checking location…";
  } else {
    deps.updatedEl.textContent = stale
      ? "Update failed — times may be out of date"
      : nearbyBoard?.lastUpdated
        ? `Updated ${nearbyBoard.lastUpdated}`
        : "Updated just now";
  }

  if (!next) {
    if (shouldShowNearbyLoadingState()) {
      return;
    }

    setLastRenderedNext(null);
    setHeroUrgency("calm");
    if (deps.heroDepartLabelEl) {
      deps.heroDepartLabelEl.textContent = "Next Train";
    }
    if (deps.departCountdownEl) {
      deps.departCountdownEl.textContent = "—";
    }
    if (deps.departDisplayTimeEl) {
      deps.departDisplayTimeEl.textContent = "No upcoming trains";
    }
    if (deps.heroScheduledTimeEl) {
      deps.heroScheduledTimeEl.hidden = true;
    }
    deps.platformEl.textContent = "—";
    deps.statusEl.textContent = "—";
    deps.followingSectionEl.hidden = true;
    nearbyDirectionsEl.hidden = false;
    renderNearbyDirectionsList();
    updateSwipeHint();
    updateSwipeCues();
    maybeScheduleOnboarding();
    return;
  }

  setLastRenderedNext(next);
  setHeroUrgency("calm");
  deps.heroEl?.classList.toggle("stale", stale);

  const pinned = isNearbyPinShowing(focusedEntry?.direction);
  const nearbySkip = getNearbySkip(focusedEntry?.direction);
  if (deps.heroDepartLabelEl) {
    deps.heroDepartLabelEl.textContent = getHeroDepartLabel({
      pinned,
      skipCount: nearbySkip,
    });
  }
  if (deps.departCountdownEl) {
    renderDepartureCountdown(deps.departCountdownEl, next);
  }
  if (deps.departDisplayTimeEl) {
    deps.departDisplayTimeEl.textContent = `${next.displayTime} · towards ${focusedEntry.direction}`;
  }

  const scheduledLine = formatScheduledLine(next);
  if (deps.heroScheduledTimeEl) {
    if (scheduledLine) {
      deps.heroScheduledTimeEl.textContent = scheduledLine;
      deps.heroScheduledTimeEl.hidden = false;
    } else {
      deps.heroScheduledTimeEl.hidden = true;
    }
  }

  deps.platformEl.textContent = next.platform;
  renderStatusDisplay(next);
  if (pinned) {
    const normalizedBoard = normalizeApiTrainData(boardData);
    const trueNextTrip = getTrueNextTrip(normalizedBoard);
    if (!renderJourneySecondaryNextLine(trueNextTrip, next)) {
      renderThenTrains(boardData, nearbySkip);
    }
  } else {
    renderThenTrains(boardData, nearbySkip);
  }
  nearbyDirectionsEl.hidden = false;
  renderNearbyDirectionsList();
  updateSwipeHint();
  updateSwipeCues();
  renderNearbyPinLeaveSurfaces(next, pinned);
  maybeScheduleOnboarding();
}

function nearbyBoardHasDepartures(board = nearbyBoard) {
  return Boolean(board?.entries?.some((entry) => entry.data?.next));
}

function nearbyBoardLooksEmpty(board = nearbyBoard) {
  return Boolean(board?.entries?.length) && !nearbyBoardHasDepartures(board);
}

async function fetchNearbyBoard() {
  if (!nearbySession?.station) {
    return;
  }

  if (nearbyBoardInflight) {
    nearbyBoardRefetchPending = true;
    return nearbyBoardInflight;
  }

  nearbyBoardInflight = fetchNearbyBoardOnce().finally(() => {
    nearbyBoardInflight = null;
    renderNearbyBoard();
    if (nearbyBoardRefetchPending) {
      nearbyBoardRefetchPending = false;
      void fetchNearbyBoard();
    }
  });

  if (nearbyBoardLooksEmpty()) {
    renderNearbyBoard();
  }

  return nearbyBoardInflight;
}

async function fetchNearbyBoardOnce() {
  const station = nearbySession?.station;
  if (!station) {
    return;
  }

  let directions = [];
  try {
    directions = await fetchDirectionsFromApi(station);
  } catch (error) {
    console.warn("Nearby directions lookup failed", error);
    if (isTestMode()) {
      directions = ["Perth", "Mandurah", "Joondalup"];
    } else {
      throw error;
    }
  }
  let fetchFailures = 0;
  const settled = await Promise.all(
    directions.map(async (direction) => {
      try {
        const data = await fetchNearbyDirectionData(station, direction, getNearbySkip(direction));
        return { direction, data };
      } catch (error) {
        fetchFailures += 1;
        console.warn(`Nearby fetch failed for ${direction}`, error);
        return null;
      }
    })
  );
  const entries = settled.filter(Boolean);

  if (!nearbySession || nearbySession.station !== station) {
    return;
  }

  if (!entries.length) {
    if (fetchFailures > 0) {
      throw new Error("Could not load departures for this station");
    }

    // Station known but no live/scheduled trips (overnight). Not a location failure.
    nearbyBoard = {
      lastUpdated: new Date().toLocaleString("en-AU", {
        timeZone: "Australia/Perth",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      entries: directions.map((direction) => ({
        direction,
        data: { next: null, following: [], scheduleSource: "empty" },
      })),
    };
    if (
      !nearbySession.focusedDirection ||
      !directions.includes(nearbySession.focusedDirection)
    ) {
      nearbySession.focusedDirection = directions[0] ?? null;
    }
    writeLastNearbyStationCache({
      station,
      distanceKm: nearbySession.distanceKm,
      board: nearbyBoard,
    });
    return;
  }

  if (
    !nearbySession.focusedDirection ||
    !entries.some((entry) => entry.direction === nearbySession.focusedDirection)
  ) {
    nearbySession.focusedDirection = pickSoonestNearbyDirection(entries);
  }

  nearbyBoard = {
    lastUpdated: new Date().toLocaleString("en-AU", {
      timeZone: "Australia/Perth",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    entries,
  };
  writeLastNearbyStationCache({
    station,
    distanceKm: nearbySession.distanceKm,
    board: nearbyBoard,
  });
}

function focusNearbyDirection(direction) {
  if (!nearbySession || nearbySession.focusedDirection === direction) {
    return;
  }

  nearbySession.focusedDirection = direction;
  renderNearbyBoard();
}

function setNearbyGpsRefining(value) {
  if (nearbySession) {
    nearbySession.gpsRefining = value;
  }
}

async function enterNearbyMode({ station: manualStation, distanceKm = null } = {}) {
  setJourneyModeActive(false);
  deps.clearManualJourneyOverride?.();
  deps.dismissLeaveHint?.();
  deps.closeJourneySwitcherMenu?.();
  stopNearbyLocateTimers();
  deps.clearOnboardingSchedule?.();
  nearbyUserPickedStation = Boolean(manualStation);
  nearbyLocatePickerVisible = false;
  nearbyDontWaitVisible = false;
  nearbyBoard = null;
  clearNearbyError();
  nearbyLoading = true;

  if (manualStation) {
    nearbySession = {
      station: manualStation,
      distanceKm,
      focusedDirection: null,
      skipByDirection: {},
    };
    restoreNearbySessionPinFromSettings();
    syncNearbyChrome();
    renderNearbyBoard();

    try {
      await fetchNearbyBoard();
      clearNearbyError();
      writeLastNearbyStationCache({ station: manualStation, distanceKm });
    } catch (error) {
      setNearbyError(error.message ?? "Could not load departures for this station", "board");
    } finally {
      nearbyLoading = false;
    }
    renderNearbyBoard();
    return;
  }

  // Paint last Near me station (+ board if fresh) immediately — don't wait on GPS / permission.
  // 9/10 visits the station is unchanged; GPS refine swaps if it moved.
  const cachedStation = readLastNearbyStationCache();
  if (cachedStation?.station) {
    const cachedBoard = readCachedNearbyBoard(cachedStation);
    nearbySession = {
      station: cachedStation.station,
      // Don't show a stale km crumb until GPS refine returns.
      distanceKm: null,
      fromCache: true,
      gpsRefining: true,
      focusedDirection: cachedBoard?.focusedDirection ?? null,
      skipByDirection: {},
    };
    restoreNearbySessionPinFromSettings();
    if (cachedBoard) {
      nearbyBoard = {
        lastUpdated: cachedBoard.lastUpdated ?? "just now",
        entries: cachedBoard.entries,
      };
      if (
        !nearbySession.focusedDirection ||
        !nearbyBoard.entries.some((entry) => entry.direction === nearbySession.focusedDirection)
      ) {
        nearbySession.focusedDirection = pickSoonestNearbyDirection(nearbyBoard.entries);
      }
      nearbyLoading = false;
    }
    syncNearbyChrome();
    renderNearbyBoard();

    void (async () => {
      try {
        await fetchNearbyBoard();
        clearNearbyError();
      } catch (error) {
        // Keep a useful cached board; surface failure when the face would be misleading empty.
        if (!nearbyBoardHasDepartures()) {
          setNearbyError(error.message ?? "Could not load departures for this station", "board");
        }
      } finally {
        nearbyLoading = false;
        renderNearbyBoard();
      }
    })();

    void (async () => {
      if (isNativeApp()) {
        try {
          await ensureGeoBridge();
          if (typeof window.NextTrainGeo?.ensureLocationPermission === "function") {
            await window.NextTrainGeo.ensureLocationPermission();
          }
        } catch (error) {
          // Keep cached board; permission / geo failures shouldn't blank a useful face.
          if (nearbySession) {
            setNearbyGpsRefining(false);
          }
          renderNearbyBoard();
          return;
        }
      }
      void locateNearbyInBackground({ forceFresh: false });
    })();
    return;
  }

  // No cache — show locating UI immediately. Don’t wait uses a short delay during
  // permission, then a fresh 7s after permission so GPS wait isn’t “already due”.
  nearbySession = {
    station: null,
    distanceKm: null,
    focusedDirection: null,
    skipByDirection: {},
  };
  syncNearbyChrome();
  renderNearbyBoard();
  startNearbyLocateTimers(NEARBY_LOCATE_PERMISSION_ESCAPE_MS);

  void (async () => {
    if (isNativeApp()) {
      try {
        await ensureGeoBridge();
        if (typeof window.NextTrainGeo?.ensureLocationPermission === "function") {
          await window.NextTrainGeo.ensureLocationPermission();
        }
      } catch (error) {
        if (!isNearbyModeActive()) {
          return;
        }
        nearbyLoading = false;
        stopNearbyLocateTimers();
        setNearbyError(locationErrorFrom(error).message, "location");
        syncNearbyChrome();
        renderNearbyBoard();
        return;
      }
    }

    if (!isNearbyModeActive() || nearbyUserPickedStation || nearbyLocatePickerVisible) {
      return;
    }

    // Permission done — start the real 7s GPS clock unless escape is already up.
    if (!nearbyDontWaitVisible) {
      startNearbyLocateTimers(NEARBY_LOCATE_DONT_WAIT_MS);
    }
    void locateNearbyInBackground();
  })();
}

function exitNearbyMode() {
  clearNearbyPin();
  hideNearbyPinLeaveSurfaces();
  stopNearbyLocateTimers();
  dismissNearbyLocatePicker();
  nearbyDontWaitVisible = false;
  syncNearbyDontWaitButton();
  nearbyUserPickedStation = false;
  nearbyLocateGeneration += 1;
  nearbySession = null;
  nearbyBoard = null;
  nearbyBoardInflight = null;
  nearbyLoading = false;
  clearNearbyError();
  syncNearbyChrome();
  if (nearbyDirectionsEl) {
    nearbyDirectionsEl.hidden = true;
  }
  if (nearbyFallbackEl) {
    nearbyFallbackEl.hidden = true;
  }
  if (nearbyDirectionsListEl) {
    nearbyDirectionsListEl.innerHTML = "";
  }
}

async function applyNearbyManualStation(station) {
  await getStationsList();
  const normalized = normalizeStation(station);
  if (!normalized || !isCatalogStation(station)) {
    return;
  }

  nearbyUserPickedStation = true;
  clearNearbyError();
  clearNearbyPin();
  stopNearbyLocateTimers();
  dismissNearbyLocatePicker();
  nearbyDontWaitVisible = false;
  syncNearbyDontWaitButton();
  nearbySession = {
    station: normalized,
    distanceKm: null,
    focusedDirection: null,
    skipByDirection: {},
  };
  nearbyLoading = true;
  renderNearbyBoard();

  try {
    await fetchNearbyBoard();
    nearbyLoading = false;
    clearNearbyError();
    writeLastNearbyStationCache({ station: normalized });
    renderNearbyBoard();
  } catch (error) {
    nearbyLoading = false;
    setNearbyError(error.message ?? "Could not load departures for this station", "board");
    renderNearbyBoard();
  }
}


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

  function init(nextDeps = {}) {
    deps = { ...nextDeps };
  }

  const api = {
    init,
    applyNearbyManualStation,
    applyNearbyPinToData,
    applyNearbySkip,
    buildNearbyLeaveNext,
    buildNearbyPinSettingsSnapshot,
    classifyNearbyError,
    clearLastNearbyStationCache,
    clearNearbyError,
    clearNearbyPin,
    clearNearbyPinLeaveCardDismissed,
    dismissNearbyLocatePicker,
    dismissNearbyPinLeaveCard,
    ensureNearbyStationOptions,
    enterNearbyMode,
    exitNearbyMode,
    fetchNearbyBoard,
    fetchNearbyBoardOnce,
    fetchNearbyDirectionData,
    focusNearbyDirection,
    formatNearbyDirectionRow,
    formatNearbyRouteLine,
    getNearbyBoard,
    getNearbyFocusedEntry,
    getNearbyLeaveBeforeMinutes,
    getNearbyPin,
    getNearbySession,
    getNearbySkip,
    handleNearbyNotifyToggle,
    hideNearbyPinLeaveSurfaces,
    initNearbyListeners,
    isNearbyLocateCurrent,
    isNearbyFaceReadyForOnboarding,
    isNearbyModeActive,
    isNearbyPinHolding,
    isNearbyPinShowing,
    isUnsupportedRegion,
    locateNearbyInBackground,
    nearbyBoardHasDepartures,
    nearbyBoardLooksEmpty,
    nearbyLoadingHeroCopy,
    nearbyLoadingRouteCopy,
    nearbyPinExpiryMs,
    pickSoonestNearbyDirection,
    readCachedNearbyBoard,
    readLastNearbyStationCache,
    renderNearbyBoard,
    renderNearbyDirectionsList,
    renderNearbyPinLeaveSurfaces,
    renderUnsupportedRegionBoard,
    rescheduleNearbyPinReminders,
    restoreNearbySessionPinFromSettings,
    setNearbyError,
    setNearbyGpsRefining,
    setNearbyPinFromTrip,
    setNearbySkip,
    shouldShowNearbyLoadingState,
    showNearbyDontWaitOffer,
    showNearbyEarlyPicker,
    showNearbyFallback,
    startNearbyLocateTimers,
    stopNearbyLocateTimers,
    syncChromeMode,
    syncNearbyChrome,
    syncNearbyDontWaitButton,
    syncNearbyLeaveBeforeSliderFill,
    syncNearbyPinSettings,
    updateNearbyLeaveBeforeLabel,
    writeLastNearbyStationCache,
    UNSUPPORTED_REGION_KM,
  };

  global.nextTrainNearby = api;
})(window);
