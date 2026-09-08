(function (global) {
  const LAST_NEARBY_STATION_KEY = "nextTrainLastNearbyStation";
  const LAST_NEARBY_STATION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  const LAST_NEARBY_BOARD_MAX_AGE_MS = 15 * 60 * 1000;
  const NEARBY_SOFT_LOCATION_MAX_AGE_MS = 2 * 60 * 1000;
  const NEARBY_PIN_HOLD_MS = 60_000;
  const NEARBY_LOCATE_COPY = "Locating...";
  const NEARBY_BOARD_LOADING_COPY = "Loading departures…";
  /** Nearest catalog station farther than this → Perth-rail-only empty state (Near me blocked). */
  const UNSUPPORTED_REGION_KM = 50;
  /** Keep calm on a normal GPS fix (~1–4s). Offer escape only when it is actually slow. */
  const NEARBY_LOCATE_DONT_WAIT_MS = 1000;
  /** While the system permission sheet is up, offer escape sooner so the 7s GPS wait is fair. */
  const NEARBY_LOCATE_PERMISSION_ESCAPE_MS = 2500;
  /** Foreground re-locate while Near me is open — idle vs traveling cadence. */
  const NEARBY_RELOCATE_IDLE_MS = 4 * 60 * 1000;
  const NEARBY_RELOCATE_TRAVEL_MS = 45 * 1000;
  const NEARBY_TRAVEL_SPEED_MS = 4;
  const NEARBY_TRAVEL_MOVE_KM = 0.25;
  const NEARBY_RELOCATE_MOVE_KM = 0.15;
  const NEARBY_TRAVEL_QUIET_MOVE_KM = 0.1;
  const NEARBY_TRAVEL_QUIET_SAMPLES = 2;
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
  let nearbyRelocateTimer = null;
  let nearbyTravelMode = false;
  let lastRelocateSample = null;
  let nearbyRelocateQuietSamples = 0;
  let nearbyRelocateTickInflight = false;

  const nearbyPinLeaveControlsEl = document.getElementById("nearby-pin-leave-controls");
  const nearbyPinLeaveFooterEl = document.getElementById("nearby-pin-leave-footer");
  const nearbyNotifySectionEl = document.getElementById("nearby-notify-section");
  const nearbyLeaveBeforeFieldEl = document.getElementById("nearby-leave-before-field");
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

  function isStationInActiveCity(station) {
    return deps.isStationInNearbyCity?.(station) ?? deps.isStationInActiveCity?.(station) ?? isCatalogStation(station);
  }

  function readNearbyCity() {
    return String(deps.readNearbyCity?.() || "perth").trim().toLowerCase();
  }

  function readPreferenceCity() {
    return String(deps.readPreferenceCity?.() || deps.readActiveCity?.() || "perth")
      .trim()
      .toLowerCase();
  }

  function readActiveCity() {
    return readNearbyCity();
  }

  function readActiveTimeZone() {
    const city = readNearbyCity();
    return window.NextTrainCitySession?.regionById?.(city)?.region?.timeZone || "Australia/Perth";
  }

  function applyNearbyBoardParams(params) {
    const city = readNearbyCity();
    if (city && city !== "perth") {
      params.set("city", city);
    }
    return params;
  }

  function isNearbyCacheValid(data) {
    if (!data?.station) {
      return false;
    }
    const cacheCity = String(data.city || "perth").trim().toLowerCase();
    const nearbyCity = readNearbyCity();
    if (cacheCity !== nearbyCity) {
      return false;
    }
    return deps.isStationInNearbyCity?.(data.station, cacheCity) ?? isStationInActiveCity(data.station);
  }

  function regionLocateErrorMessage(error) {
    if (error) {
      console.log("[Nearby] regionLocateErrorMessage raw:", JSON.stringify(error));
    }
    const message = String(error?.message || error || "");
    if (message.includes("nearby station")) {
      return "Location too far — pick a station below.";
    }
    return locationErrorFrom(error).message;
  }

  function getStationsList() {
    return deps.getNearbyStationsList?.() ?? deps.getStationsList?.();
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

  function renderUpcomingDepartureBoard(data, skipCount) {
    return deps.renderUpcomingDepartureBoard?.(data, skipCount);
  }

  function hideUpcomingDepartureBoard() {
    return deps.hideUpcomingDepartureBoard?.();
  }

  function renderTerminusArrivalsBoard(data) {
    return deps.renderTerminusArrivalsBoard?.(data) ?? false;
  }

  function hideTerminusArrivalsBoard() {
    return deps.hideTerminusArrivalsBoard?.();
  }

  function formatScheduledLine(next) {
    return deps.formatScheduledLine?.(next) ?? "";
  }

  function formatHeroScheduledLine(next) {
    return deps.formatHeroScheduledLine?.(next) ?? formatScheduledLine(next);
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

  function fetchJson(url, timeoutMs) {
    // CAPACITOR-18: optional deps.fetchJson?.() returned undefined when the dep
    // was missing, then callers' result.ok reads threw TypeError.
    if (typeof deps.fetchJson !== "function") {
      return {
        ok: false,
        error: "Couldn't reach live times. Check your connection.",
      };
    }
    return deps.fetchJson(url, timeoutMs);
  }

  function apiResultError(result, fallback = "Could not load train times") {
    if (typeof deps.apiResultError === "function") {
      return deps.apiResultError(result, fallback);
    }
    return new Error(result?.data?.error ?? result?.error ?? fallback);
  }

  function isRateLimitedError(error) {
    if (typeof deps.isRateLimitedError === "function") {
      return deps.isRateLimitedError(error);
    }
    return (
      error?.code === "RATE_LIMITED" ||
      /too many requests|live times are busy/i.test(String(error?.message ?? error ?? ""))
    );
  }

  function enrichTrip(trip, referenceIso) {
    return deps.enrichTrip?.(trip, referenceIso) ?? trip;
  }

  function syncNearbyPinChrome() {
    return deps.syncNearbyPinChrome?.();
  }

  function syncJourneyContextChrome() {
    return deps.syncJourneyContextChrome?.();
  }

  function getNearbySession() {
    return nearbySession;
  }

  function getNearbyBoard() {
    return nearbyBoard;
  }
function classifyNearbyError(message) {
  const lower = String(message || "").toLowerCase();
  console.log(`[nearby] classifyNearbyError: "${message}" (lower: "${lower}")`);
  
  // These indicate we HAVE location but the board/network failed, 
  // or it was a temporary GPS failure/timeout (not a permission block).
  if (
    lower.includes("departures") ||
    lower.includes("times") ||
    lower.includes("board") ||
    lower.includes("directions") ||
    lower.includes("unavailable") ||
    lower.includes("fetch") ||
    lower.includes("network") ||
    lower.includes("connect") ||
    lower.includes("offline") ||
    lower.includes("status code") ||
    lower.includes("timeout") ||
    lower.includes("get your location") ||
    lower.includes("mock gps") ||
    lower.includes("location services") ||
    lower.includes("locating") ||
    lower.includes("too far") ||
    lower.includes("invalid response") ||
    lower.includes("npm start") ||
    lower.includes("not be deployed yet")
  ) {
    console.log("[nearby] classifyNearbyError: returning 'board'");
    return "board";
  }
  
  // Default to location (permission) error
  console.log("[nearby] classifyNearbyError: returning 'location'");
  return "location";
}

// jim-brief-feed-unconfirmed-rider-copy: api/board.js now sends short rider
// copy for a known FEED_UNCONFIRMED/PROVIDER_UNAVAILABLE error, but this is
// the last line of defense against the *next* provider leaking a doc path,
// an agent name, or GTFS jargon straight into the hero via a raw
// error.message. Swap it for the existing generic copy and log the original
// for whoever's debugging, rather than painting it for a rider.
const RIDER_UNSAFE_MESSAGE_PATTERN = /docs\/|\.md\b|GTFS/;
function sanitizeRiderErrorMessage(message) {
  const text = String(message ?? "");
  if (!text) {
    return text;
  }
  if (text.length > 160 || RIDER_UNSAFE_MESSAGE_PATTERN.test(text)) {
    console.warn("[nearby] suppressed internal error message from rider-facing copy:", text);
    return "Could not load departures for this station";
  }
  return text;
}

function setNearbyError(message, kind = null) {
  nearbyError = sanitizeRiderErrorMessage(message);
  nearbyErrorKind = kind || (nearbyError ? classifyNearbyError(nearbyError) : null);
}

function keepNearbyBoardWithLocationHint() {
  return (
    nearbyErrorKind === "location" &&
    Boolean(nearbySession?.station) &&
    nearbyBoardHasDepartures()
  );
}

function syncNearbyLocationHint() {
  if (!keepNearbyBoardWithLocationHint() || !nearbyError) {
    return;
  }
  if (nearbyFallbackEl) {
    nearbyFallbackEl.hidden = false;
  }
  if (nearbyFallbackTextEl) {
    nearbyFallbackTextEl.textContent = nearbyError;
  }
  if (deps.updatedEl) {
    deps.updatedEl.textContent = "Location off — tap Near me to update";
  }
  ensureNearbyStationOptions();
}

function clearNearbyError() {
  nearbyError = null;
  nearbyErrorKind = null;
}


function getNearbyLeaveBeforeMinutes() {
  return Number(getSettings().nearbyLeaveBeforeMinutes) || DEFAULT_LEAVE_BEFORE.leaveBeforeMinutes;
}

function getRoutePinLeaveBeforeMinutes(journey = deps.getActiveJourney?.()) {
  return deps.getRoutePinnedLeaveBeforeMinutes?.(journey) ?? getNearbyLeaveBeforeMinutes();
}

function isRoutePinLeaveContext() {
  const journey = deps.getActiveJourney?.();
  return Boolean(
    deps.isJourneyModeActive?.() &&
      deps.isRouteJourney?.(journey) &&
      deps.isRoutePinnedToday?.(journey)
  );
}

let routePinLeaveCardHidden = false;

function clearRoutePinLeaveCardDismissed() {
  routePinLeaveCardHidden = false;
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

async function rescheduleNearbyPinReminders() {
  if (!isNativeApp()) {
    return;
  }
  // Native scheduler reads WidgetSettingsStore — ensure pin notify / walk time are synced first.
  if (typeof window.nextTrainWidget?.syncWidgetSettings === "function") {
    await window.nextTrainWidget.syncWidgetSettings();
  }
  window.nextTrainLeaveReminders?.reschedule?.();
}

function maybeRescheduleOnLeaveByCross(leaveNext, live, ackContext) {
  if (!nearbySession || !isNativeApp() || nearbySession.pinNotifyMe !== true) {
    return;
  }
  if (!isNearbyPinHolding() || deps.isLeaveAcknowledged?.(leaveNext, ackContext)) {
    return;
  }

  nearbySession.lastLeavePhase = live.leavePhase;

  const leaveBy = leaveNext?.leaveBy;
  if (!leaveBy || nearbySession.leaveByRescheduleKey === leaveBy) {
    return;
  }
  nearbySession.leaveByRescheduleKey = leaveBy;
  void rescheduleNearbyPinReminders();
}

function dismissNearbyPinLeaveCard() {
  if (isRoutePinLeaveContext()) {
    routePinLeaveCardHidden = true;
    if (deps.leaveCardEl) {
      deps.leaveCardEl.hidden = true;
    }
    hideNearbyPinLeaveSurfaces();
    deps.syncHeroPinChrome?.();
    return;
  }

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

function regionNameForCity(city) {
  const id = String(city || "").trim().toLowerCase();
  if (!id) {
    return null;
  }
  return window.NextTrainCitySession?.regionById?.(id)?.region?.name || null;
}

/**
 * Out-of-area copy is built from the GPS region, never from a hard-coded city
 * table with a Perth fallthrough — that table is what told a rider standing in
 * Manchester that Near me was "Perth rail only" (6 Sep 2026). Three cases:
 * inside a covered region but far from its nearest catalogued station (name the
 * region and the station), inside a region with no station measured, or outside
 * every region (say so, and point at the region picker).
 */
function unsupportedRegionCopy() {
  const regionName = regionNameForCity(nearbySession?.city);
  const nearestStation = nearbySession?.nearestStation || null;
  const distanceKm = nearbySession?.distanceKm;
  if (regionName) {
    const roundedKm = Number.isFinite(distanceKm) ? Math.round(distanceKm) : null;
    return {
      title: `No ${regionName} station nearby`,
      text:
        nearestStation && roundedKm != null
          ? `Near me works near ${regionName} stations. The closest one we cover is ${nearestStation}, about ${roundedKm} km away.`
          : `Near me works near ${regionName} stations. You're outside that area right now.`,
      hint: "You can still save routes and journeys for when you're near the network.",
      // docs/jim-brief-help-coverage-notes.md — region is known, so the "See what's
      // covered" link can point at that region's coverage notes.
      coverageCityId: nearbySession?.city || null,
    };
  }
  return {
    title: "Outside covered areas",
    text: "Near me works near stations in the regions Next Train covers. You're not in one of them right now.",
    hint: "Choose a region from the menu to browse its stations and save journeys.",
    coverageCityId: null,
  };
}

function renderUnsupportedRegionBoard() {
  const copy = unsupportedRegionCopy();

  setLastRenderedNext(null);
  if (deps.errorEl) {
    deps.errorEl.hidden = true;
  }
  setRouteDisplay("Near me");
  if (deps.updatedEl) {
    deps.updatedEl.textContent = "";
    deps.updatedEl.hidden = true;
  }
  setHeroUrgency("calm");
  deps.heroEl?.classList.remove("locating");
  deps.heroEl?.classList.add("hero-setup");

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
    title.textContent = copy.title;

    const text = document.createElement("span");
    text.className = "hero-empty-text";
    text.textContent = copy.text;

    const hint = document.createElement("span");
    hint.className = "hero-empty-hint";
    hint.textContent = copy.hint;

    const emptyJourneysBtn = document.createElement("button");
    emptyJourneysBtn.type = "button";
    emptyJourneysBtn.className = "btn-primary hero-empty-primary";
    emptyJourneysBtn.textContent = "My Journeys";
    emptyJourneysBtn.addEventListener("click", () => deps.enterJourneyMode?.());

    const children = [title, text, hint];
    if (copy.coverageCityId && window.NextTrainHelpCoverage) {
      const coverageLink = document.createElement("a");
      coverageLink.href = "#";
      coverageLink.className = "hero-empty-coverage-link";
      coverageLink.textContent = "See what's covered";
      coverageLink.addEventListener("click", (event) => {
        event.preventDefault();
        window.NextTrainHelpCoverage.open();
      });
      children.push(coverageLink);
    }
    children.push(emptyJourneysBtn);
    deps.departCountdownEl.append(...children);
  }

  if (deps.heroEl) {
    deps.heroEl.removeAttribute("role");
    deps.heroEl.removeAttribute("tabindex");
    deps.heroEl.removeAttribute("aria-label");
    deps.heroEl.onclick = null;
    deps.heroEl.onkeydown = null;
  }
  if (deps.platformEl) {
    deps.platformEl.textContent = "—";
  }
  if (deps.statusEl) {
    deps.statusEl.textContent = "—";
  }
  if (deps.followingSectionEl) {
    deps.followingSectionEl.hidden = true;
  }
  hideUpcomingDepartureBoard();
  hideTerminusArrivalsBoard();
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

  if (!nearbyBoard) {
    return false;
  }

  if (nearbyError && !keepNearbyBoardWithLocationHint()) {
    return false;
  }

  return true;
}

function syncChromeMode() {
  const nearbyActive = isNearbyModeActive();
  const travelTab = deps.getChromeTravelTab?.() ?? "nearby";
  const routesActive = travelTab === "routes";
  const journeysActive = travelTab === "journeys";
  const journeyActive = routesActive || journeysActive;

  deps.appEl?.classList.toggle("nearby-mode", nearbyActive && Boolean(nearbySession));
  deps.appEl?.classList.toggle("journey-mode", journeyActive);

  nearbyChromeAction?.classList.toggle("chrome-action--active", nearbyActive);
  nearbyBtn?.classList.toggle("icon-btn--active", nearbyActive);
  nearbyBtn?.setAttribute("aria-pressed", nearbyActive ? "true" : "false");
  nearbyBtn?.setAttribute("aria-label", "Near me");

  deps.routesChromeAction?.classList.toggle("chrome-action--active", routesActive);
  deps.routesBtn?.classList.toggle("icon-btn--active", routesActive);
  deps.routesBtn?.setAttribute("aria-pressed", routesActive ? "true" : "false");

  deps.journeysChromeAction?.classList.toggle("chrome-action--active", journeysActive);
  deps.journeysBtn?.classList.toggle("icon-btn--active", journeysActive);
  deps.journeysBtn?.setAttribute("aria-pressed", journeysActive ? "true" : "false");

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

    if (!isNearbyCacheValid(data)) {
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
    city: readActiveCity(),
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
          city: payload.city,
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
    nearbySession.lastLeavePhase = null;
    nearbySession.leaveByRescheduleKey = null;
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
  if (!snapshot && !nearbySession?.pin) {
    return;
  }
  const same =
    (!snapshot && !current) ||
    (snapshot &&
      current &&
      JSON.stringify(snapshot) === JSON.stringify(current));
  if (!same) {
    persistSettings({ nearbyPin: snapshot });
    void rescheduleNearbyPinReminders();
  }
}

async function syncNearbyPinSettingsAndReschedule() {
  const snapshot = buildNearbyPinSettingsSnapshot();
  const current = getSettings().nearbyPin;
  const same =
    (!snapshot && !current) ||
    (snapshot &&
      current &&
      JSON.stringify(snapshot) === JSON.stringify(current));
  if (!same) {
    persistSettings({ nearbyPin: snapshot });
  }
  await rescheduleNearbyPinReminders();
}

function restoreNearbySessionPinFromSettings() {
  const pin = getSettings().nearbyPin;
  if (!pin || !nearbySession?.station || pin.station !== nearbySession.station) {
    return;
  }

  if (!deps.isNearbyPinSettingsHolding?.(pin)) {
    return;
  }

  nearbySession.pin = {
    station: pin.station,
    direction: pin.direction,
    departureIso: pin.departureIso,
    holdingUntilMs: pin.holdingUntilMs,
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

function syncRestoredNearbyPinState() {
  restoreNearbySessionPinFromSettings();
  const pin = getSettings().nearbyPin;
  if (getNearbyPin() || (pin && deps.isNearbyPinSettingsHolding?.(pin))) {
    deps.reconcileExclusivePinState?.({ type: "nearby" });
  }
}

/** Widget / Near me open: keep the pinned trip focused, not the soonest next train. */
function applyHoldingNearbyPinFocus() {
  if (!nearbySession?.station) {
    return false;
  }
  restoreNearbySessionPinFromSettings();
  const pin = getNearbyPin();
  if (!isNearbyPinHolding(pin) || !pin.direction) {
    return false;
  }
  nearbySession.focusedDirection = pin.direction;
  if (nearbyBoard?.entries?.length) {
    const entry = nearbyBoard.entries.find((item) => item.direction === pin.direction);
    if (entry?.data) {
      entry.data = applyNearbyPinToData(pin.direction, entry.data);
    }
  }
  return true;
}

function applyWidgetTapDeparture(direction, data) {
  const iso = nearbySession?.pendingTapDepartureIso;
  if (!iso || !data) {
    return data;
  }
  const normalized = normalizeApiTrainData(data);
  const upcoming = getUpcomingTrips(normalized);
  const idx = upcoming.findIndex((trip) => resolveTripDeparture(trip) === iso);
  if (idx < 0) {
    return data;
  }
  nearbySession.focusedDirection = direction;
  setNearbySkip(direction, idx);
  nearbySession.pendingTapDepartureIso = null;
  return applyNearbySkip(normalized, idx);
}

function buildNearbyLeaveNext(trip) {
  return buildNextFromFollowing(trip, getNearbyLeaveBeforeMinutes(), resolveTripDeparture(trip));
}

function hideNearbyPinLeaveSurfaces() {
  if (nearbyPinLeaveControlsEl) {
    nearbyPinLeaveControlsEl.hidden = true;
  }
}

function renderPinLeaveCardContent(leaveNext, { forTarget = false } = {}) {
  const live = getLiveTiming(leaveNext);
  const pastLeaveBy = isLeavePhasePastLeaveBy(live.leavePhase);

  if (deps.leaveCardEl) {
    deps.leaveCardEl.hidden = false;
    deps.leaveCardEl.classList.remove("leave-card--context", "leave-card--acknowledged");
  }
  if (nearbyPinLeaveControlsEl) {
    nearbyPinLeaveControlsEl.hidden = false;
  }
  // The Time to station slider stays visible and usable through every leave
  // phase (calm/soon/urgent/now/late/missed) — a rider who drags it down
  // into "late" territory must be able to drag it back up without leaving
  // the card (docs/jim-brief-late-leave-slider.md). Only the "Remind me
  // when to leave" toggle keeps the past-leave-by hide: once you're already
  // late there's nothing left to remind you of.
  if (nearbyLeaveBeforeFieldEl) {
    nearbyLeaveBeforeFieldEl.hidden = false;
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
    deps.leaveCardLabelEl.textContent = formatLeaveCardLabel(live.leavePhase, { forTarget });
  }
  if (deps.leaveTimeEl) {
    renderLeaveMinutesCountdown(deps.leaveTimeEl, leaveNext);
  }
  if (deps.leaveCountdownEl) {
    deps.leaveCountdownEl.textContent = forTarget
      ? deps.formatLeaveCardTargetSubline?.(leaveNext) ?? formatLeaveCardSubline(leaveNext)
      : formatLeaveCardSubline(leaveNext);
  }
  deps.updateLeaveCardReason?.(leaveNext);
  updateLeaveCardState(live.leavePhase);

  const showLeaveAckActions =
    live.leavePhase === "now" ||
    live.leavePhase === "late" ||
    live.leavePhase === "missed";
  const shouldAutoAckLeave = deps.shouldAutoAckLeavePhase?.(live.leavePhase) ?? false;
  if (deps.leaveCardActionsEl) {
    deps.leaveCardActionsEl.hidden = !showLeaveAckActions;
    deps.leaveCardActionsEl.classList.toggle("leave-card-actions--visible", showLeaveAckActions);
  }
  if (deps.leaveBufferEditBtn) {
    deps.leaveBufferEditBtn.hidden = true;
  }

  return { live, showLeaveAckActions, shouldAutoAckLeave };
}

function syncPinLeaveControlValues(journey) {
  const leaveBeforeMinutes = isRoutePinLeaveContext()
    ? getRoutePinLeaveBeforeMinutes(journey)
    : getNearbyLeaveBeforeMinutes();
  if (nearbyLeaveBeforeInput) {
    nearbyLeaveBeforeInput.value = String(leaveBeforeMinutes);
    updateNearbyLeaveBeforeLabel(leaveBeforeMinutes);
  }
  if (nearbyNotifyMeInput) {
    nearbyNotifyMeInput.checked = isRoutePinLeaveContext()
      ? journey?.pinNotifyMe === true
      : nearbySession?.pinNotifyMe === true;
  }
}

function renderRoutePinLeaveSurfaces(leaveNext, journey, { forTarget = false } = {}) {
  if (!leaveNext || !journey || routePinLeaveCardHidden) {
    if (deps.leaveCardEl) {
      deps.leaveCardEl.hidden = true;
    }
    hideNearbyPinLeaveSurfaces();
    deps.syncHeroPinChrome?.();
    return;
  }

  const leaveBeforeMinutes = getRoutePinLeaveBeforeMinutes(journey);
  const leaveTrip = buildNextFromFollowing(
    leaveNext,
    leaveBeforeMinutes,
    resolveTripDeparture(leaveNext)
  );

  if (deps.isLeaveAcknowledged?.(leaveTrip)) {
    if (deps.leaveCardEl) {
      deps.leaveCardEl.hidden = true;
    }
    hideNearbyPinLeaveSurfaces();
    deps.syncHeroPinChrome?.();
    return;
  }

  const { shouldAutoAckLeave } = renderPinLeaveCardContent(leaveTrip, { forTarget });
  syncPinLeaveControlValues(journey);
  deps.syncHeroPinChrome?.();
  if (shouldAutoAckLeave) {
    void deps.maybeAutoAcknowledgeLeave?.(leaveTrip, {
      station: journey.station,
    });
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
  const ackContext = { nearbyStation: nearbySession.station };

  deps.maybeSyncLeaveAckFromNative?.(leaveNext, ackContext, () => {
    renderNearbyBoard();
  });

  if (deps.isLeaveAcknowledged?.(leaveNext, ackContext)) {
    if (deps.leaveCardEl) {
      deps.leaveCardEl.hidden = true;
    }
    hideNearbyPinLeaveSurfaces();
    syncNearbyPinChrome();
    return;
  }

  const { shouldAutoAckLeave, live } = renderPinLeaveCardContent(leaveNext);
  syncPinLeaveControlValues();
  syncNearbyPinChrome();
  maybeRescheduleOnLeaveByCross(leaveNext, live, ackContext);
  if (shouldAutoAckLeave) {
    void deps.maybeAutoAcknowledgeLeave?.(leaveNext, {
      station: nearbySession.station,
      ackContext,
    });
  }
}


async function handleNearbyNotifyToggle() {
  if (isRoutePinLeaveContext()) {
    const journey = deps.getActiveJourney?.();
    if (!journey?.id) {
      return;
    }

    const notifyOn = nearbyNotifyMeInput?.checked ?? false;
    deps.persistRoutePinSettings?.(journey.id, { pinNotifyMe: notifyOn });

    if (notifyOn) {
      const reminderSettings = await window.nextTrainLeaveReminders?.enableLeaveReminders?.({
        userInitiated: true,
      });
      if (reminderSettings?.permissionGranted === false) {
        deps.persistRoutePinSettings?.(journey.id, { pinNotifyMe: false });
        if (nearbyNotifyMeInput) {
          nearbyNotifyMeInput.checked = false;
        }
      } else {
        await rescheduleNearbyPinReminders();
      }
    } else {
      await rescheduleNearbyPinReminders();
    }

    deps.renderCurrentJourney?.();
    return;
  }

  if (!nearbySession) {
    return;
  }

  const notifyOn = nearbyNotifyMeInput?.checked ?? false;
  nearbySession.pinNotifyMe = notifyOn;

  if (isNearbyPinHolding()) {
    const snapshot = buildNearbyPinSettingsSnapshot();
    if (snapshot) {
      persistSettings({ nearbyPin: snapshot });
      if (isNativeApp() && typeof window.nextTrainWidget?.syncWidgetSettings === "function") {
        await window.nextTrainWidget.syncWidgetSettings();
      }
    }
  }

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
  } else {
    await window.nextTrainLeaveReminders?.refreshJourneyRemindExtras?.();
  }

  if (isNearbyPinHolding()) {
    await rescheduleNearbyPinReminders();
  }
}

async function setNearbyPinNotifyMe(notifyOn) {
  const on = notifyOn === true;
  if (nearbySession) {
    nearbySession.pinNotifyMe = on;
  }

  const current = getSettings().nearbyPin;
  if (current && deps.isNearbyPinSettingsHolding?.(current)) {
    persistSettings({
      nearbyPin: {
        ...current,
        notifyMe: on,
      },
    });
    if (isNativeApp() && typeof window.nextTrainWidget?.syncWidgetSettings === "function") {
      await window.nextTrainWidget.syncWidgetSettings();
    }
  }

  if (on) {
    const reminderSettings = await window.nextTrainLeaveReminders?.enableLeaveReminders?.({
      userInitiated: true,
    });
    if (reminderSettings?.permissionGranted === false) {
      if (nearbySession) {
        nearbySession.pinNotifyMe = false;
      }
      const pin = getSettings().nearbyPin;
      if (pin) {
        persistSettings({ nearbyPin: { ...pin, notifyMe: false } });
      }
      return false;
    }
  } else {
    await window.nextTrainLeaveReminders?.refreshJourneyRemindExtras?.();
  }

  await rescheduleNearbyPinReminders();
  return true;
}

function nearbyPinExpiryMs(pin = getNearbyPin()) {
  if (!pin) {
    return 0;
  }
  if (typeof pin.holdingUntilMs === "number") {
    return pin.holdingUntilMs;
  }
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
    // Native widget/reminder fetches pass this through as the API city param.
    cityId: nearbySession.city || readNearbyCity() || undefined,
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
  nearbySession.lastLeavePhase = null;
  nearbySession.leaveByRescheduleKey = null;
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

async function fetchNearbyDirectionData(station, direction, _skip = 0) {
  // Always fetch the unskipped board. Skip/pin selection is applied client-side at response
  // time (and again on every render) so a swipe mid-flight cannot flash a stale train.
  const params = new URLSearchParams({
    station,
    direction,
    destination: direction,
    leaveBefore: "0",
    refresh: String(settings.refreshSeconds),
    skipTrains: "0",
  });

  const fixture = getActiveFixture() || (isTestMode() ? "normal" : null);
  if (fixture) {
    params.set("fixture", fixture);
  }
  applyNearbyBoardParams(params);

  const result = await fetchJson(apiUrl(`/api/next-train?${params}`));
  if (!result.ok) {
    throw apiResultError(result, "Could not load train times");
  }

  let payload = result.data;
  if (
    !Array.isArray(payload?.upcoming) ||
    payload.upcoming.length === 0
  ) {
    if (!window.NextTrainBrisbaneDogfood?.isActive?.()) {
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
              skipTrains: 0,
            })) ?? payload;
        } catch (error) {
          console.warn("Nearby live-times fallback failed", error);
        }
      }
    }
  }

  const normalized = normalizeApiTrainData(payload);
  if (
    isNearbyPinHolding() &&
    getNearbyPin()?.direction === direction &&
    getNearbyPin()?.station === station
  ) {
    return applyNearbyPinToData(direction, normalized);
  }
  // Apply the live skip at response time (not the value from when the request started).
  return applyNearbySkip(normalized, getNearbySkip(direction));
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

  if (force) {
    window.nextTrainStationCombobox?.replaceNearbyStationsCache?.(null);
    getNearbyStationCombobox()?.clearLocalStationsCache?.();
  } else if (window.nextTrainStationCombobox?.getNearbyStationsCache?.()?.length) {
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

function resetNearbyRelocateState() {
  nearbyTravelMode = false;
  lastRelocateSample = null;
  nearbyRelocateQuietSamples = 0;
}

function shouldRunNearbyRelocate() {
  if (typeof document !== "undefined" && document.hidden) {
    return false;
  }

  return (
    isNearbyModeActive() &&
    !nearbyUserPickedStation &&
    !nearbySession?.unsupportedRegion &&
    !nearbyLocatePickerVisible
  );
}

function pauseNearbyRelocateLoop() {
  if (nearbyRelocateTimer) {
    clearTimeout(nearbyRelocateTimer);
    nearbyRelocateTimer = null;
  }
}

function stopNearbyRelocateLoop() {
  pauseNearbyRelocateLoop();
  resetNearbyRelocateState();
  nearbyRelocateTickInflight = false;
}

function scheduleNearbyRelocate(delayMs) {
  pauseNearbyRelocateLoop();
  if (!shouldRunNearbyRelocate()) {
    return;
  }

  nearbyRelocateTimer = window.setTimeout(() => {
    nearbyRelocateTimer = null;
    void tickNearbyRelocate();
  }, delayMs);
}

function startNearbyRelocateLoop() {
  stopNearbyRelocateLoop();
  if (!shouldRunNearbyRelocate()) {
    return;
  }

  scheduleNearbyRelocate(NEARBY_RELOCATE_IDLE_MS);
}

/**
 * Reopen / foreground: ask for a new GPS fix immediately (maximumAge: 0) and
 * recompute nearest station. Do not wait for the idle 4 min / travel 45 s loop.
 * Cache-first paint stays; this only refines once the fresh fix lands.
 * Debounce collapses visibilitychange + pageshow + appStateChange firing together.
 */
let lastForegroundFreshLocateAt = 0;
const FOREGROUND_FRESH_LOCATE_DEBOUNCE_MS = 1000;

function refreshNearbyOnForeground() {
  if (!shouldRunNearbyRelocate()) {
    return;
  }

  const now = Date.now();
  if (now - lastForegroundFreshLocateAt >= FOREGROUND_FRESH_LOCATE_DEBOUNCE_MS) {
    lastForegroundFreshLocateAt = now;
    void locateNearbyInBackground({ maximumAge: 0 });
  }

  if (!nearbyRelocateTimer && !nearbyRelocateTickInflight) {
    scheduleNearbyRelocate(
      nearbyTravelMode ? NEARBY_RELOCATE_TRAVEL_MS : NEARBY_RELOCATE_IDLE_MS
    );
  }
}

function sampleMovedKm(current, previous) {
  if (!previous || typeof deps.distanceKm !== "function") {
    return 0;
  }

  return deps.distanceKm(
    previous.latitude,
    previous.longitude,
    current.latitude,
    current.longitude
  );
}

function isQuietTravelSample(speed, movedKm) {
  const speedOk = typeof speed !== "number" || speed < NEARBY_TRAVEL_SPEED_MS;
  return speedOk && movedKm < NEARBY_TRAVEL_QUIET_MOVE_KM;
}

async function maybeAutoAckNearbyPinLeaveFromTick({ latitude, longitude, speed, movedKm }) {
  if (!isNearbyPinHolding() || !nearbySession?.station) {
    return false;
  }

  const focusedEntry = getNearbyFocusedEntry();
  const next = focusedEntry?.data?.next;
  if (!next) {
    return false;
  }

  const leaveNext = buildNearbyLeaveNext(next);
  const { leavePhase } = getLiveTiming(leaveNext);
  if (!deps.shouldAutoAckLeavePhase?.(leavePhase)) {
    return false;
  }

  const ackContext = { nearbyStation: nearbySession.station };
  return (
    (await deps.maybeAutoAcknowledgeLeave?.(leaveNext, {
      station: nearbySession.station,
      ackContext,
      latitude,
      longitude,
      speed,
      movedKm,
    })) ?? false
  );
}

async function tickNearbyRelocate() {
  if (!shouldRunNearbyRelocate()) {
    stopNearbyRelocateLoop();
    return;
  }

  if (nearbyRelocateTickInflight) {
    return;
  }

  nearbyRelocateTickInflight = true;
  const previousTravelMode = nearbyTravelMode;
  let nextDelayMs = NEARBY_RELOCATE_IDLE_MS;

  try {
    const getPosition = deps.getAppGeolocationPosition ?? deps.getGeolocationPosition;
    if (typeof getPosition !== "function") {
      return;
    }

    const position = await getPosition({
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: nearbyTravelMode ? 30_000 : 120_000,
    });

    if (!shouldRunNearbyRelocate()) {
      stopNearbyRelocateLoop();
      return;
    }

    const { latitude, longitude, speed } = position.coords;
    const movedKm = sampleMovedKm({ latitude, longitude }, lastRelocateSample);
    const enteringTravel =
      (typeof speed === "number" && speed >= NEARBY_TRAVEL_SPEED_MS) ||
      movedKm >= NEARBY_TRAVEL_MOVE_KM;

    if (enteringTravel) {
      nearbyTravelMode = true;
      nearbyRelocateQuietSamples = 0;
    } else if (nearbyTravelMode) {
      if (isQuietTravelSample(speed, movedKm)) {
        nearbyRelocateQuietSamples += 1;
        if (nearbyRelocateQuietSamples >= NEARBY_TRAVEL_QUIET_SAMPLES) {
          nearbyTravelMode = false;
          nearbyRelocateQuietSamples = 0;
        }
      } else {
        nearbyRelocateQuietSamples = 0;
      }
    }

    lastRelocateSample = { latitude, longitude, at: Date.now() };

    await maybeAutoAckNearbyPinLeaveFromTick({
      latitude,
      longitude,
      speed,
      movedKm,
    });

    if (movedKm >= NEARBY_RELOCATE_MOVE_KM || nearbyTravelMode) {
      void locateNearbyInBackground({ forceFresh: false });
    }

    nextDelayMs = nearbyTravelMode ? NEARBY_RELOCATE_TRAVEL_MS : NEARBY_RELOCATE_IDLE_MS;
    if (!previousTravelMode && nearbyTravelMode) {
      nextDelayMs = NEARBY_RELOCATE_TRAVEL_MS;
    }
  } catch {
    nextDelayMs = nearbyTravelMode ? NEARBY_RELOCATE_TRAVEL_MS : NEARBY_RELOCATE_IDLE_MS;
  } finally {
    nearbyRelocateTickInflight = false;
    if (shouldRunNearbyRelocate()) {
      scheduleNearbyRelocate(nextDelayMs);
    } else {
      stopNearbyRelocateLoop();
    }
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

function showNearbyEarlyPicker({ text = "Choose a station — we’ll show the next train." } = {}) {
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
    nearbyFallbackTextEl.textContent = text;
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
    (Boolean(nearbyBoardInflight) && !nearbyBoardHasDepartures()) ||
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

async function locateNearbyInBackground({ forceFresh = false, maximumAge } = {}) {
  const generation = ++nearbyLocateGeneration;
  const previousStation = nearbySession?.station ?? null;

  try {
    // Soft by default: reuse a recent fused fix. Open/resume pass maximumAge: 0 so the
    // first refine cannot keep a 45–60s-old Edgewater-era location. Never short-circuit
    // on session station — that's what the optimistic cache paint sets.
    const nearest = await deps.findNearestStation?.({
      forceFresh,
      allowSessionShortcut: false,
      // followGps: Near me ignores the saved region and resolves in the GPS city —
      // otherwise a Perth rider with Netherlands selected stays stuck on the cached station.
      followGps: true,
      ...(typeof maximumAge === "number" ? { maximumAge } : {}),
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

    if (nearest.outsideCoverage || isUnsupportedRegion(nearest.distanceKm)) {
      clearLastNearbyStationCache();
      nearbySession.unsupportedRegion = true;
      nearbySession.station = null;
      // Keep the GPS region (null when outside every region) and the station we
      // measured against so the out-of-area card can say which network it means,
      // instead of always talking about Perth.
      nearbySession.city = nearest.city || null;
      nearbySession.nearestStation = nearest.station || null;
      nearbySession.distanceKm = Number.isFinite(nearest.distanceKm) ? nearest.distanceKm : null;
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

    if (nearest.noCoords && !nearest.station) {
      // GPS puts the rider in a region we cover, but that region's catalog has no
      // coordinates yet, so nobody can pick the nearest station. Offer the region's
      // own station list rather than a dead end (or a card about another city).
      const cityChanged = nearbySession.city && nearbySession.city !== nearest.city;
      clearLastNearbyStationCache();
      nearbySession.unsupportedRegion = false;
      nearbySession.station = null;
      nearbySession.nearestStation = null;
      nearbySession.city = nearest.city;
      nearbySession.lat = nearest.lat ?? null;
      nearbySession.lng = nearest.lng ?? null;
      nearbySession.distanceKm = null;
      nearbySession.fromCache = false;
      setNearbyGpsRefining(false);
      nearbyBoard = null;
      nearbyLoading = false;
      stopNearbyLocateTimers();
      nearbyDontWaitVisible = false;
      syncNearbyDontWaitButton();
      const regionName = regionNameForCity(nearest.city);
      // renderNearbyBoard paints this message in the hero and repeats it above
      // the picker, so it carries the instruction as well as the region.
      setNearbyError(
        regionName
          ? `You're in ${regionName} — choose a station below`
          : "Choose a station below",
        "location"
      );
      if (cityChanged) {
        nearbyLocatePickerVisible = false;
        await ensureNearbyStationOptions({ force: true });
      }
      showNearbyEarlyPicker();
      renderNearbyBoard();
      return;
    }

    const stationChanged = Boolean(
      (previousStation && nearest.station && nearest.station !== previousStation) ||
      (previousStation && !nearest.station && nearest.lat != null) // Might change, let server decide
    );

    nearbySession.unsupportedRegion = false;
    nearbySession.fromCache = false;
    setNearbyGpsRefining(false);
    nearbySession.station = nearest.station ?? null;
    nearbySession.city = nearest.city || readNearbyCity();
    nearbySession.lat = nearest.lat ?? null;
    nearbySession.lng = nearest.lng ?? null;
    nearbySession.distanceKm = nearest.distanceKm;
    if (typeof nearest.lat === "number" && typeof nearest.lng === "number") {
      lastRelocateSample = {
        latitude: nearest.lat,
        longitude: nearest.lng,
        at: Date.now(),
      };
    }

    if (stationChanged) {
      clearNearbyPin();
      if (nearest.station) {
        nearbySession.refineNotice = "Updated to nearest station";
      }
    } else if (nearest.station) {
      restoreNearbySessionPinFromSettings();
      deps.reconcileExclusivePinState?.({ type: "nearby" });
    }
    if (nearest.station) {
      writeLastNearbyStationCache({
        station: nearest.station,
        city: nearest.city || readNearbyCity(),
        distanceKm: nearest.distanceKm,
      });
    }
    stopNearbyLocateTimers();
    nearbyLocatePickerVisible = false;
    nearbyDontWaitVisible = false;
    syncNearbyDontWaitButton();
    try {
      if (stationChanged || !nearbyBoard || !nearbySession.station) {
        const boardPromise = fetchNearbyBoard();
        await boardPromise;
        
        // If server resolved a station name for us, update the session and cache.
        if (!nearbySession.station && nearbyBoard?.entries?.[0]?.data?.station) {
          const resolvedStation = nearbyBoard.entries[0].data.station;
          console.log(`[nearby] Server resolved station: ${resolvedStation}`);
          nearbySession.station = resolvedStation;
          writeLastNearbyStationCache({
            station: resolvedStation,
            distanceKm: nearbySession.distanceKm,
          });
          renderNearbyBoard();
        }
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

    const staleStation =
      nearbySession?.station && !isStationInActiveCity(nearbySession.station);

    if (staleStation) {
      clearLastNearbyStationCache();
      nearbySession.station = null;
      nearbySession.distanceKm = null;
      nearbyBoard = null;
      setNearbyError(regionLocateErrorMessage(error));
      renderNearbyBoard();
      return;
    }

    if (!nearbySession.station && !nearbyUserPickedStation) {
      const message = locationErrorFrom(error).message;
      setNearbyError(message);
      if (Number(error?.code) === 3 || classifyNearbyError(message) === "location") {
        showNearbyEarlyPicker();
      }
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
        // Only show GPS error if we have no board data — if board loaded fine, don't
        // overwrite a working display with a stale location error.
        if (!nearbyBoard || !nearbyBoardHasDepartures()) {
          setNearbyError(locationErrorFrom(error).message);
        }
        renderNearbyBoard();
      } catch (fetchError) {
        if (!isNearbyLocateCurrent(generation)) {
          return;
        }
        clearLastNearbyStationCache();
        nearbySession.station = null;
        nearbySession.distanceKm = null;
        nearbyBoard = null;
        setNearbyError(
          regionLocateErrorMessage(fetchError) || fetchError.message,
          "board"
        );
        if (deps.errorEl) {
          deps.errorEl.textContent = fetchError.message;
          deps.errorEl.hidden = false;
        }
        renderNearbyBoard({ stale: true });
      }
    }
  }
}

function showNearbyFallback(message) {
  setNearbyError(message);
  if (nearbyDirectionsEl) {
    nearbyDirectionsEl.hidden = false;
  }
  if (nearbyDirectionsListEl) {
    nearbyDirectionsListEl.innerHTML = "";
  }
  if (nearbyFallbackEl) {
    nearbyFallbackEl.hidden = false;
  }
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

  window.NextTrainCitySession?.syncFeedAttribution?.(
    nearbySession?.city || window.NextTrainCitySession?.readSavedCity?.()
  );
  syncNearbyChrome();
  if (deps.errorEl) {
    deps.errorEl.hidden = true;
  }
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
      if (nearbyDirectionsEl) {
        nearbyDirectionsEl.hidden = false;
      }
      if (nearbyDirectionsListEl) {
        nearbyDirectionsListEl.innerHTML = "";
      }
      const directionsLabel = nearbyDirectionsEl?.querySelector?.(".nearby-directions-label");
      if (directionsLabel) {
        directionsLabel.hidden = true;
      }
      if (nearbyFallbackEl) {
        nearbyFallbackEl.hidden = false;
      }
      if (nearbyFallbackTextEl) {
        nearbyFallbackTextEl.textContent = "Choose a station — we’ll show the next train.";
      }
      void ensureNearbyStationOptions();
    } else if (nearbyDirectionsEl) {
      nearbyDirectionsEl.hidden = true;
    }
    syncNearbyDontWaitButton();
    if (deps.followingSectionEl) {
      deps.followingSectionEl.hidden = true;
    }
    hideUpcomingDepartureBoard();
    hideTerminusArrivalsBoard();
    if (nearbySession?.gpsRefining) {
      if (deps.updatedEl) {
        deps.updatedEl.textContent = "Checking location…";
      }
    } else if (deps.updatedEl) {
      deps.updatedEl.textContent = "Updating…";
    }
    updateSwipeHint();
    updateSwipeCues();
    if (isNearbyPinHolding()) {
      syncNearbyPinChrome();
    }
    return;
  }

  deps.heroEl?.classList.remove("locating");
  nearbyDontWaitVisible = false;
  syncNearbyDontWaitButton();

  if (nearbyLocatePickerVisible && !nearbySession?.station && !nearbyUserPickedStation) {
    // A location-kind error carries context worth showing over the generic prompt —
    // e.g. "You're in Manchester — choose a station below" when the region has no
    // station coordinates yet.
    const pickerMessage =
      nearbyErrorKind === "location" && nearbyError ? nearbyError : "Choose a station below";
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
      deps.departDisplayTimeEl.textContent = pickerMessage;
    }
    if (deps.heroScheduledTimeEl) {
      deps.heroScheduledTimeEl.hidden = true;
    }
    if (deps.leaveCardEl) {
      deps.leaveCardEl.hidden = true;
    }
    if (nearbyDirectionsEl) {
      nearbyDirectionsEl.hidden = false;
    }
    if (nearbyFallbackEl) {
      nearbyFallbackEl.hidden = false;
    }
    if (nearbyFallbackTextEl) {
      nearbyFallbackTextEl.textContent = pickerMessage;
    }
    void ensureNearbyStationOptions();
    if (deps.platformEl) {
      deps.platformEl.textContent = "—";
    }
    if (deps.statusEl) {
      deps.statusEl.textContent = "—";
    }
    if (deps.followingSectionEl) {
      deps.followingSectionEl.hidden = true;
    }
    hideUpcomingDepartureBoard();
    hideTerminusArrivalsBoard();
    if (deps.updatedEl) {
      deps.updatedEl.textContent = "Choose a station below";
    }
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

  if (nearbyError && !keepNearbyBoardWithLocationHint()) {
    setRouteDisplay(formatNearbyRouteLine());
    setHeroUrgency("calm");
    if (deps.heroDepartLabelEl) {
      deps.heroDepartLabelEl.textContent = "Near me";
    }
    if (deps.departCountdownEl) {
      deps.departCountdownEl.textContent = "—";
    }
    if (deps.departDisplayTimeEl) {
      const kind = nearbyErrorKind || (nearbyError ? classifyNearbyError(nearbyError) : null);
      console.log(`[nearby] renderNearbyBoard error path: kind="${kind}" error="${nearbyError}"`);
      
      let displayError = nearbyError;
      if (kind === "board") {
        displayError = nearbyError || "Times unavailable";
      } else {
        displayError = nearbyError || "Location needed";
      }
      
      deps.departDisplayTimeEl.textContent = displayError;
    }
    if (deps.heroScheduledTimeEl) {
      deps.heroScheduledTimeEl.hidden = true;
    }
    if (deps.leaveCardEl) {
      deps.leaveCardEl.hidden = true;
    }
    showNearbyFallback(nearbyError);
    if (deps.platformEl) {
      deps.platformEl.textContent = "—";
    }
    if (deps.statusEl) {
      deps.statusEl.textContent = "—";
    }
    if (deps.followingSectionEl) {
      deps.followingSectionEl.hidden = true;
    }
    hideUpcomingDepartureBoard();
    hideTerminusArrivalsBoard();
    if (deps.updatedEl) {
      deps.updatedEl.textContent = stale
        ? "Update failed — times may be out of date"
        : "Choose a station below";
    }
    updateSwipeHint();
    updateSwipeCues();
    maybeScheduleOnboarding();
    return;
  }

  const focusedEntry = getNearbyFocusedEntry();
  let boardData = focusedEntry?.data ?? null;

  if (getNearbyPin() && !isNearbyPinHolding()) {
    const settingsPin = getSettings().nearbyPin;
    if (
      settingsPin &&
      deps.isNearbyPinSettingsHolding?.(settingsPin) &&
      nearbySession?.station === settingsPin.station
    ) {
      restoreNearbySessionPinFromSettings();
    } else if (!settingsPin || !deps.isNearbyPinSettingsHolding?.(settingsPin)) {
      const expiredDirection = getNearbyPin()?.direction;
      clearNearbyPin();
      if (expiredDirection) {
        setNearbySkip(expiredDirection, 0);
        void fetchNearbyBoard()
          .then(() => renderNearbyBoard())
          .catch(() => renderNearbyBoard({ stale: true }));
        return;
      }
    } else if (nearbySession) {
      nearbySession.pin = null;
    }
  }

  if (focusedEntry?.direction && boardData) {
    // Always re-apply pin/skip on paint. Optimistic swipes update skip immediately, but an
    // in-flight board fetch may still resolve with an older skip and briefly flash the wrong train.
    boardData = applyNearbyPinToData(focusedEntry.direction, boardData);
    boardData = applyWidgetTapDeparture(focusedEntry.direction, boardData);
    focusedEntry.data = boardData;
  }

  const next = boardData?.next ?? null;
  setRouteDisplay(formatNearbyRouteLine());
  window.NextTrainCitySession?.syncFeedAttribution?.(
    boardData?.regionId || nearbySession?.city || window.NextTrainCitySession?.readSavedCity?.()
  );
  if (deps.updatedEl) {
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
  }

  if (!next) {
    if (shouldShowNearbyLoadingState()) {
      return;
    }

    // docs/jim-brief-terminus-no-published-departures.md: the chosen direction has no
    // upcoming trips, but the board holds real trips terminating here on this line — show
    // those arrivals with the explanation instead of a bare "No upcoming trains". A
    // genuinely empty board (no arrivalsOnly on boardData) falls through unchanged below.
    if (renderTerminusArrivalsBoard(boardData)) {
      if (nearbyDirectionsEl) {
        nearbyDirectionsEl.hidden = false;
      }
      renderNearbyDirectionsList();
      updateSwipeHint();
      updateSwipeCues();
      maybeScheduleOnboarding();
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
    if (deps.platformEl) {
      deps.platformEl.textContent = "—";
    }
    if (deps.statusEl) {
      deps.statusEl.textContent = "—";
    }
    if (deps.followingSectionEl) {
      deps.followingSectionEl.hidden = true;
    }
    hideUpcomingDepartureBoard();
    hideTerminusArrivalsBoard();
    if (nearbyDirectionsEl) {
      nearbyDirectionsEl.hidden = false;
    }
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
    const linePart = next.line ? `${next.line} · ` : "";
    const printed = typeof next.printedDestination === "string" ? next.printedDestination.trim() : "";
    const printedPart = printed && printed !== focusedEntry.direction ? ` · to ${printed}` : "";
    deps.departDisplayTimeEl.textContent = `${next.displayTime} · ${linePart}towards ${focusedEntry.direction}${printedPart}`;
    deps.departDisplayTimeEl.dataset.time = next.displayTime;
  }

  const scheduledLine = formatHeroScheduledLine(next);
  if (deps.heroScheduledTimeEl) {
    if (scheduledLine) {
      deps.heroScheduledTimeEl.textContent = scheduledLine;
      deps.heroScheduledTimeEl.hidden = false;
    } else {
      deps.heroScheduledTimeEl.hidden = true;
    }
  }

  if (deps.platformEl) {
    deps.platformEl.textContent = next.platform;
  }
  renderStatusDisplay(next);
  if (deps.followingSectionEl) {
    deps.followingSectionEl.hidden = true;
  }
  renderUpcomingDepartureBoard(boardData, nearbySkip);
  if (nearbyDirectionsEl) {
    nearbyDirectionsEl.hidden = false;
  }
  renderNearbyDirectionsList();
  updateSwipeHint();
  updateSwipeCues();
  renderNearbyPinLeaveSurfaces(next, pinned);
  syncNearbyPinChrome();
  syncNearbyLocationHint();
  maybeScheduleOnboarding();
}

function nearbyBoardHasDepartures(board = nearbyBoard) {
  return Boolean(board?.entries?.some((entry) => entry.data?.next));
}

function nearbyBoardLooksEmpty(board = nearbyBoard) {
  return Boolean(board?.entries?.length) && !nearbyBoardHasDepartures(board);
}

async function fetchNearbyBoard() {
  if (!nearbySession?.station && (nearbySession?.lat == null || nearbySession?.lng == null)) {
    return;
  }

  if (nearbyBoardInflight) {
    nearbyBoardRefetchPending = true;
    return nearbyBoardInflight;
  }

  nearbyBoardInflight = fetchNearbyBoardOnce()
    .catch((error) => {
      // Rate limits are expected soft-protect responses — never leave them unhandled
      // for fire-and-forget Near me refresh callers (CAPACITOR-1E / CAPACITOR-1D).
      if (isRateLimitedError(error)) {
        return;
      }
      throw error;
    })
    .finally(() => {
      nearbyBoardInflight = null;
      renderNearbyBoard();
      if (nearbyBoardRefetchPending) {
        nearbyBoardRefetchPending = false;
        void fetchNearbyBoard().catch(() => renderNearbyBoard({ stale: true }));
      }
    });

  if (nearbyBoardLooksEmpty()) {
    renderNearbyBoard();
  }

  return nearbyBoardInflight;
}

  async function fetchNearbyBoardLegacy(params) {
    let station = params.get("station");
    const lat = params.get("lat");
    const lng = params.get("lng");
    const city = readNearbyCity();

    if (!station && lat != null && lng != null) {
      if (typeof window.loadStationCoords === "function") {
        await window.loadStationCoords();
      }
      if (typeof window.findNearestStation === "function") {
        const nearest = window.findNearestStation(parseFloat(lat), parseFloat(lng));
        if (!nearest) throw new Error("Could not find a nearby station");
        station = nearest.name;
      }
    }

    if (!station) throw new Error("Missing station");

    const destResult = await fetchJson(apiUrl(`/api/destinations?station=${encodeURIComponent(station)}&city=${city}`));
    if (!destResult.ok) {
      throw apiResultError(destResult, "Could not load directions");
    }
    const directions = destResult.data.destinations || [];

    const entries = await Promise.all(directions.map(async (direction) => {
      const trainResult = await fetchJson(apiUrl(`/api/next-train?station=${encodeURIComponent(station)}&direction=${encodeURIComponent(direction)}&city=${city}`));
      if (trainResult.ok) {
        return { direction, data: normalizeApiTrainData(trainResult.data) };
      }
      return null;
    }));

    return {
      ok: true,
      data: {
        stationName: station,
        lastUpdated: new Date().toISOString(),
        entries: entries.filter(Boolean)
      }
    };
  }

  async function fetchNearbyBoardOnce() {
    const station = nearbySession?.station;
    const lat = nearbySession?.lat;
    const lng = nearbySession?.lng;

    if (!station && (lat == null || lng == null)) {
      console.log("[nearby] fetchNearbyBoardOnce: no station or coords, returning");
      return;
    }

    if (typeof isRateLimitPaused === "function" && isRateLimitPaused()) {
      return;
    }

    const params = new URLSearchParams({
      leaveBefore: "0",
      refresh: String(settings.refreshSeconds),
    });
    if (station) {
      params.set("station", station);
    } else {
      params.set("lat", String(lat));
      params.set("lng", String(lng));
    }

    const fixture = getActiveFixture() || (isTestMode() ? "normal" : null);
    if (fixture) {
      params.set("fixture", fixture);
    }
    applyNearbyBoardParams(params);

    // Race the board fetch against a 15-second hard timeout.
    // CapacitorHttp doesn't honour AbortSignal, so Promise.race is the only
    // reliable way to cap the wait when native HTTP ignores abort.
    const result = await Promise.race([
      fetchJson(apiUrl(`/api/board?${params}`)),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Times unavailable — please try again")), 15000)
      ),
    ]);

    if (!result.ok) {
      // Fallback: if /api/board 404s (e.g. not deployed to Vercel yet), try individual fetches.
      if (result.status === 404) {
        console.warn("[nearby] /api/board not found, falling back to legacy fetches");
        return await fetchNearbyBoardLegacy(params);
      }
      throw apiResultError(result, "Could not load train times");
    }

    const payload = result.data;
    const entries = (payload.entries || []).map(entry => ({
      direction: entry.direction,
      data: normalizeApiTrainData(entry.data)
    }));

    if (!nearbySession || nearbySession.station !== station) {
      return;
    }

    if (!entries.length) {
      // Station known but no live/scheduled trips (overnight). Not a location failure.
      // We'll show an empty board with directions if possible.
      let directions = [];
      try {
        const destResult = await fetchJson(apiUrl(`/api/destinations?${params}`));
        if (destResult.ok) {
          directions = destResult.data.destinations || [];
        }
      } catch {
        /* ignore */
      }

      nearbyBoard = {
        lastUpdated: payload.lastUpdated || new Date().toLocaleString("en-AU", {
          timeZone: readActiveTimeZone(),
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

    if (applyHoldingNearbyPinFocus()) {
      // Keep the pinned direction even if another line has an earlier next train.
    } else if (
      !nearbySession.focusedDirection ||
      !entries.some((entry) => entry.direction === nearbySession.focusedDirection)
    ) {
      nearbySession.focusedDirection = pickSoonestNearbyDirection(entries);
    }

    nearbyBoard = {
      lastUpdated: payload.lastUpdated || new Date().toLocaleString("en-AU", {
        timeZone: readActiveTimeZone(),
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

    // Jim brief: defer non-critical scripts until after first train paint.
    window.NextTrainDeferred?.load?.();
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

async function enterNearbyMode({
  station: manualStation,
  distanceKm = null,
  departureIso = null,
} = {}) {
  deps.setChromeTravelTab?.("nearby");
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
      city: readNearbyCity(),
      distanceKm,
      focusedDirection: null,
      skipByDirection: {},
      pendingTapDepartureIso: departureIso || null,
    };
    syncRestoredNearbyPinState();
    applyHoldingNearbyPinFocus();
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
    await deps.ensureNearbyCatalog?.(cachedStation.city || readNearbyCity());
  }
  if (cachedStation?.station && isNearbyCacheValid(cachedStation)) {
    const cachedBoard = readCachedNearbyBoard(cachedStation);
    nearbySession = {
      station: cachedStation.station,
      city: cachedStation.city || readNearbyCity(),
      // Don't show a km crumb until GPS refine returns.
      distanceKm: cachedStation.distanceKm ?? null,
      fromCache: true,
      gpsRefining: true,
      focusedDirection: cachedBoard?.focusedDirection ?? null,
      skipByDirection: {},
      pendingTapDepartureIso: departureIso || null,
    };
    syncRestoredNearbyPinState();
    if (cachedBoard) {
      nearbyBoard = {
        lastUpdated: cachedBoard.lastUpdated ?? "just now",
        entries: cachedBoard.entries,
      };
      if (!applyHoldingNearbyPinFocus()) {
        if (
          !nearbySession.focusedDirection ||
          !nearbyBoard.entries.some((entry) => entry.direction === nearbySession.focusedDirection)
        ) {
          nearbySession.focusedDirection = pickSoonestNearbyDirection(nearbyBoard.entries);
        }
      }
      nearbyLoading = false;

      // Jim brief: paint cached board immediately on repeat open.
      renderNearbyBoard();
      // Also load deferred scripts if we have a valid board.
      window.NextTrainDeferred?.load?.();
    } else {
      applyHoldingNearbyPinFocus();
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
          if (nearbySession) {
            setNearbyGpsRefining(false);
            setNearbyError(locationErrorFrom(error).message);
          }
          renderNearbyBoard();
          return;
        }
      }
      void locateNearbyInBackground({ maximumAge: 0 });
    })();
    startNearbyRelocateLoop();
    return;
  }

  // No cache — show locating UI immediately. Don’t wait uses a short delay during
  // permission, then a fresh 7s after permission so GPS wait isn’t “already due”.
  nearbySession = {
    station: null,
    distanceKm: null,
    focusedDirection: null,
    skipByDirection: {},
    pendingTapDepartureIso: departureIso || null,
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
        setNearbyError(locationErrorFrom(error).message);
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
    void locateNearbyInBackground({ maximumAge: 0 });
  })();
  startNearbyRelocateLoop();
}

function exitNearbyMode() {
  if (nearbySession) {
    syncNearbyPinSettings();
  }
  hideNearbyPinLeaveSurfaces();
  stopNearbyLocateTimers();
  stopNearbyRelocateLoop();
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
  hideUpcomingDepartureBoard();
  hideTerminusArrivalsBoard();
}

async function applyNearbyManualStation(station) {
  await getStationsList();
  const normalized = normalizeStation(station);
  if (!normalized || !isStationInActiveCity(station)) {
    return;
  }

  nearbyUserPickedStation = true;
  clearNearbyError();
  clearNearbyPin();
  stopNearbyLocateTimers();
  stopNearbyRelocateLoop();
  dismissNearbyLocatePicker();
  nearbyDontWaitVisible = false;
  syncNearbyDontWaitButton();
  nearbySession = {
    station: normalized,
    city: readNearbyCity(),
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
    const refreshInPlace =
      isNearbyModeActive() && nearbySession
        ? locateNearbyInBackground({ forceFresh: true })
        : enterNearbyMode();
    Promise.resolve(refreshInPlace).finally(() => {
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
    if (isRoutePinLeaveContext()) {
      const journey = deps.getActiveJourney?.();
      if (journey?.id) {
        deps.persistRoutePinSettings?.(journey.id, { leaveBeforeMinutes: minutes });
        deps.renderCurrentJourney?.();
      }
      return;
    }
    persistSettings({ nearbyLeaveBeforeMinutes: minutes });
    if (isNearbyPinHolding()) {
      syncNearbyPinSettings();
      if (nearbySession?.pinNotifyMe === true) {
        void rescheduleNearbyPinReminders();
      }
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

async function refreshNearbyAfterRegionChange() {
  const cache = readLastNearbyStationCache();
  if (cache?.station && isNearbyCacheValid(cache)) {
    if (nearbySession) {
      nearbySession.city = cache.city || readNearbyCity();
      nearbySession.station = cache.station;
      nearbySession.distanceKm = cache.distanceKm ?? nearbySession.distanceKm ?? null;
    }
    await ensureNearbyStationOptions({ force: true });
    return;
  }

  await ensureNearbyStationOptions({ force: true });
  void locateNearbyInBackground({ forceFresh: false });
}

async function mount(nextDeps = {}) {
  deps = { ...deps, ...nextDeps };
  if (isNearbyModeActive()) {
    return fetchNearbyBoard();
  }
}

function init(nextDeps = {}) {
  deps = { ...nextDeps };
}

  const api = {
    init,
    mount,
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
    clearRoutePinLeaveCardDismissed,
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
    getNearbyErrorKind: () => nearbyErrorKind,
    getNearbySkip,
    handleNearbyNotifyToggle,
    hideNearbyPinLeaveSurfaces,
    initNearbyListeners,
    isNearbyLocateCurrent,
    isNearbyFaceReadyForOnboarding,
    isNearbyModeActive,
    isNearbyPinHolding,
    isNearbyPinShowing,
    isNearbyRelocateLoopScheduled: () => nearbyRelocateTimer !== null,
    isUnsupportedRegion,
    locateNearbyInBackground,
    pauseNearbyRelocateLoop,
    nearbyBoardHasDepartures,
    nearbyBoardLooksEmpty,
    nearbyLoadingHeroCopy,
    nearbyLoadingRouteCopy,
    nearbyPinExpiryMs,
    pickSoonestNearbyDirection,
    readCachedNearbyBoard,
    readLastNearbyStationCache,
    refreshNearbyOnForeground,
    renderNearbyBoard,
    renderNearbyDirectionsList,
    renderNearbyPinLeaveSurfaces,
    renderRoutePinLeaveSurfaces,
    renderUnsupportedRegionBoard,
    refreshNearbyAfterRegionChange,
    rescheduleNearbyPinReminders,
    restoreNearbySessionPinFromSettings,
    setNearbyError,
    setNearbyGpsRefining,
    setNearbyPinFromTrip,
    setNearbyPinNotifyMe,
    setNearbySkip,
    shouldShowNearbyLoadingState,
    showNearbyDontWaitOffer,
    showNearbyEarlyPicker,
    showNearbyFallback,
    startNearbyLocateTimers,
    startNearbyRelocateLoop,
    stopNearbyLocateTimers,
    stopNearbyRelocateLoop,
    syncChromeMode,
    syncNearbyChrome,
    syncNearbyDontWaitButton,
    syncNearbyLeaveBeforeSliderFill,
    syncNearbyPinSettings,
    tickNearbyRelocate,
    updateNearbyLeaveBeforeLabel,
    writeLastNearbyStationCache,
    UNSUPPORTED_REGION_KM,
  };

  global.nextTrainNearby = api;
})(window);
